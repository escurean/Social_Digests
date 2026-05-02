import { query } from '../config/db.js'
import { createPaymentIntent, verifyWebhookSignature } from '../services/stripe.js'
import { stkPush } from '../services/mpesa.js'

export async function initiate(req, res, next) {
  try {
    const { campaign_slug, amount, currency = 'KES', method, phone } = req.body

    if (!campaign_slug) return res.status(400).json({ error: 'campaign_slug is required.' })
    if (!amount || isNaN(amount) || parseInt(amount) < 1)
      return res.status(400).json({ error: 'amount must be a positive number.' })

    // Normalise method name for DB ('card' is an alias for 'stripe')
    const dbMethod = method === 'card' ? 'stripe' : method
    if (!['stripe', 'mpesa'].includes(dbMethod))
      return res.status(400).json({ error: 'method must be mpesa or card.' })
    if (dbMethod === 'mpesa' && !phone?.trim())
      return res.status(400).json({ error: 'phone is required for M-Pesa.' })

    const { rows: [campaign] } = await query(
      "SELECT id, title, goal_amount, raised_amount, currency AS camp_currency FROM campaigns WHERE slug = $1 AND status = 'active'",
      [campaign_slug]
    )
    if (!campaign) return res.status(404).json({ error: 'Campaign not found or not active.' })

    const parsedAmount = parseInt(amount)
    const usedCurrency = currency || campaign.camp_currency || 'KES'

    const { rows: [donation] } = await query(
      `INSERT INTO donations (user_id, campaign_id, amount, currency, method, status)
       VALUES ($1,$2,$3,$4,$5,'pending')
       RETURNING id, amount, currency, method, status, created_at`,
      [req.user.id, campaign.id, parsedAmount, usedCurrency, dbMethod]
    )

    // ── Stripe ────────────────────────────────────────────────────
    if (dbMethod === 'stripe') {
      if (!process.env.STRIPE_SECRET_KEY) {
        await query("UPDATE donations SET status='failed' WHERE id=$1", [donation.id])
        return res.status(503).json({ error: 'Card payments are not configured on this server.' })
      }

      const intent = await createPaymentIntent(parsedAmount, usedCurrency.toLowerCase(), {
        donation_id: String(donation.id),
        campaign_slug,
        user_id: String(req.user.id),
      })

      await query('UPDATE donations SET gateway_reference=$1 WHERE id=$2', [intent.id, donation.id])

      return res.status(201).json({
        ...donation,
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
        campaign_slug,
        campaign_title: campaign.title,
      })
    }

    // ── M-Pesa ────────────────────────────────────────────────────
    const normalizedPhone = phone.trim()
      .replace(/^\+?254/, '254')
      .replace(/^07/, '2547')
      .replace(/^01/, '2541')

    const stkResult = await stkPush({
      phone: normalizedPhone,
      amount: parsedAmount,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
    })

    const checkoutId = stkResult.CheckoutRequestID || stkResult.CheckoutRequestId
    await query('UPDATE donations SET gateway_reference=$1 WHERE id=$2', [checkoutId, donation.id])

    // Mock mode (no real Daraja credentials) — auto-complete immediately
    if (checkoutId?.startsWith('mock_')) {
      await query('UPDATE campaigns SET raised_amount=raised_amount+$1 WHERE id=$2', [parsedAmount, campaign.id])
      await query("UPDATE donations SET status='completed' WHERE id=$1", [donation.id])
      await query(
        `INSERT INTO notifications (user_id,type,message,link) VALUES ($1,'donation_confirmed',$2,$3)`,
        [req.user.id,
         `Your donation of ${usedCurrency} ${parsedAmount.toLocaleString()} to "${campaign.title}" was received. Thank you!`,
         `/campaigns/${campaign_slug}`]
      )
      return res.status(201).json({
        ...donation,
        status: 'completed',
        mock: true,
        checkout_request_id: checkoutId,
        campaign_slug,
        campaign_title: campaign.title,
      })
    }

    res.status(201).json({
      ...donation,
      checkout_request_id: checkoutId,
      campaign_slug,
      campaign_title: campaign.title,
    })
  } catch (err) {
    next(err)
  }
}

export async function getDonationStatus(req, res, next) {
  try {
    const { id } = req.params
    const { rows: [donation] } = await query(
      'SELECT id, status, amount, currency, method FROM donations WHERE id=$1 AND user_id=$2',
      [id, req.user.id]
    )
    if (!donation) return res.status(404).json({ error: 'Donation not found.' })
    res.json(donation)
  } catch (err) {
    next(err)
  }
}

export async function confirmStripePayment(req, res, next) {
  try {
    const { payment_intent_id } = req.body
    if (!payment_intent_id) return res.status(400).json({ error: 'payment_intent_id is required.' })

    const { rows: [donation] } = await query(
      "SELECT * FROM donations WHERE gateway_reference=$1 AND status='pending'",
      [payment_intent_id]
    )
    if (!donation) return res.status(404).json({ error: 'Pending donation not found.' })

    await query("UPDATE donations SET status='completed' WHERE id=$1", [donation.id])
    await query('UPDATE campaigns SET raised_amount=raised_amount+$1 WHERE id=$2',
      [donation.amount, donation.campaign_id])

    const { rows: [campaign] } = await query('SELECT slug, title FROM campaigns WHERE id=$1', [donation.campaign_id])
    await query(
      `INSERT INTO notifications (user_id,type,message,link) VALUES ($1,'donation_confirmed',$2,$3)`,
      [donation.user_id,
       `Your card donation of ${donation.currency} ${Number(donation.amount).toLocaleString()} to "${campaign?.title}" was received. Thank you!`,
       `/campaigns/${campaign?.slug || ''}`]
    )

    res.json({ status: 'completed' })
  } catch (err) {
    next(err)
  }
}

export async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = verifyWebhookSignature(req.body, sig)
  } catch {
    return res.status(400).send('Webhook signature verification failed.')
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object
      const donationId = intent.metadata?.donation_id
      if (donationId) {
        const { rows: [donation] } = await query(
          "SELECT * FROM donations WHERE id=$1 AND status='pending'", [donationId]
        )
        if (donation) {
          await query("UPDATE donations SET status='completed' WHERE id=$1", [donationId])
          await query('UPDATE campaigns SET raised_amount=raised_amount+$1 WHERE id=$2',
            [donation.amount, donation.campaign_id])
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const donationId = event.data.object.metadata?.donation_id
      if (donationId) await query("UPDATE donations SET status='failed' WHERE id=$1", [donationId])
    }
  } catch { /* non-fatal — logged by Morgan */ }

  res.json({ received: true })
}

export async function mpesaCallback(req, res) {
  try {
    const callback = req.body?.Body?.stkCallback
    if (!callback) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

    const { CheckoutRequestID, ResultCode } = callback

    const { rows: [donation] } = await query(
      "SELECT * FROM donations WHERE gateway_reference=$1 AND status='pending'",
      [CheckoutRequestID]
    )
    if (!donation) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

    if (ResultCode === 0) {
      await query("UPDATE donations SET status='completed' WHERE id=$1", [donation.id])
      await query('UPDATE campaigns SET raised_amount=raised_amount+$1 WHERE id=$2',
        [donation.amount, donation.campaign_id])

      const { rows: [campaign] } = await query('SELECT slug, title FROM campaigns WHERE id=$1', [donation.campaign_id])
      await query(
        `INSERT INTO notifications (user_id,type,message,link) VALUES ($1,'donation_confirmed',$2,$3)`,
        [donation.user_id,
         `Your M-Pesa donation of ${donation.currency} ${Number(donation.amount).toLocaleString()} to "${campaign?.title}" was received. Thank you!`,
         `/campaigns/${campaign?.slug || ''}`]
      )
    } else {
      await query("UPDATE donations SET status='failed' WHERE id=$1", [donation.id])
    }
  } catch { /* non-fatal */ }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}

export async function getCampaignStats(req, res, next) {
  try {
    const { slug } = req.params
    const { rows: [campaign] } = await query(
      `SELECT c.id, c.slug, c.title, c.goal_amount, c.raised_amount, c.currency,
              c.deadline, c.status, c.beneficiary_name, c.description,
              CASE WHEN c.goal_amount > 0 THEN ROUND((c.raised_amount::numeric / c.goal_amount) * 100, 1) ELSE 0 END AS progress_pct,
              COUNT(DISTINCT d.id)::int AS donor_count
       FROM campaigns c
       LEFT JOIN donations d ON d.campaign_id = c.id AND d.status = 'completed'
       WHERE c.slug = $1
       GROUP BY c.id`,
      [slug]
    )
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' })
    res.json(campaign)
  } catch (err) {
    next(err)
  }
}
