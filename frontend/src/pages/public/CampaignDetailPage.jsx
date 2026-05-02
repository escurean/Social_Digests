import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements, PaymentElement,
  useStripe, useElements,
} from '@stripe/react-stripe-js'
import { content as cmsApi, campaigns as campaignsApi, donations as donationsApi } from '../../services/api.js'
import { normalizeList, getImages, getPrimaryImageUrl } from '../../utils/strapi.js'
import useAuthStore from '../../store/authStore.js'
import useToastStore from '../../store/toastStore.js'

const PRESET_AMOUNTS = [500, 1000, 2500, 5000]

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null

// ── Stripe card form (rendered inside Elements provider) ─────────
function StripeCardForm({ amount, currency, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [cardError, setCardError] = useState('')
  const addToast = useToastStore((s) => s.addToast)

  const handlePay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setCardError('')
    setProcessing(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: window.location.href },
    })

    if (error) {
      setCardError(error.message)
      setProcessing(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      // Tell backend to mark donation completed (fallback for when webhook fires late)
      await donationsApi.confirmStripe({ payment_intent_id: paymentIntent.id }).catch(() => {})
      onSuccess(paymentIntent)
    } else {
      setCardError('Payment did not complete. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handlePay}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {cardError && (
        <p style={{ color: 'var(--color-terracotta)', fontSize: 13, marginTop: 10 }}>{cardError}</p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1, padding: '11px', border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', background: 'white',
            fontSize: 14, cursor: 'pointer', fontWeight: 500,
          }}
        >
          Back
        </button>
        <button
          className="btn-primary"
          type="submit"
          disabled={!stripe || processing}
          style={{ flex: 2, justifyContent: 'center', padding: '11px', fontSize: 14 }}
        >
          {processing ? 'Processing…' : `Pay ${currency} ${amount?.toLocaleString()}`}
        </button>
      </div>
    </form>
  )
}

// ── M-Pesa waiting panel ─────────────────────────────────────────
function MpesaWaiting({ donationId, amount, currency, phone, onDone, onCancel }) {
  const [status, setStatus] = useState('waiting') // waiting | completed | failed
  const addToast = useToastStore((s) => s.addToast)
  const pollRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Start polling every 3 seconds
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await donationsApi.getStatus(donationId)
        if (data.status === 'completed') {
          setStatus('completed')
          clearInterval(pollRef.current)
          clearTimeout(timeoutRef.current)
          onDone()
        } else if (data.status === 'failed') {
          setStatus('failed')
          clearInterval(pollRef.current)
          clearTimeout(timeoutRef.current)
        }
      } catch { /* ignore */ }
    }, 3000)

    // Auto-timeout after 2 minutes
    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current)
      setStatus('failed')
    }, 120_000)

    return () => {
      clearInterval(pollRef.current)
      clearTimeout(timeoutRef.current)
    }
  }, [donationId])

  if (status === 'completed') {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-sage)', marginBottom: 6 }}>Payment received!</div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          Your donation of {currency} {amount?.toLocaleString()} was confirmed.
        </p>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ color: 'var(--color-terracotta)', marginBottom: 16, fontSize: 14 }}>
          M-Pesa payment was not completed. You can try again.
        </p>
        <button className="btn-primary" style={{ fontSize: 14, padding: '10px 24px' }} onClick={onCancel}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid var(--color-border)', borderTopColor: 'var(--color-terracotta)',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
      }} />
      <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
        Check your phone
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
        A payment request of <strong>{currency} {amount?.toLocaleString()}</strong> has been sent to{' '}
        <strong>{phone}</strong>.<br />Enter your M-Pesa PIN to confirm.
      </p>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16 }}>
        Waiting for confirmation…
      </p>
      <button
        onClick={onCancel}
        style={{
          marginTop: 16, background: 'none', border: 'none',
          color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function CampaignDetailPage() {
  const { slug } = useParams()
  const [campaign, setCampaign]             = useState(null)
  const [stats, setStats]                   = useState(null)
  const [loading, setLoading]               = useState(true)
  const [method, setMethod]                 = useState('mpesa')
  const [selectedAmount, setSelectedAmount] = useState(1000)
  const [customAmount, setCustomAmount]     = useState('')
  const [phone, setPhone]                   = useState('')
  const [donating, setDonating]             = useState(false)

  // donation stage: 'form' | 'mpesa_waiting' | 'card_confirm' | 'done'
  const [stage, setStage]                   = useState('form')
  const [pendingDonation, setPendingDonation] = useState(null)
  const [clientSecret, setClientSecret]     = useState(null)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const addToast = useToastStore((s) => s.addToast)

  const loadStats = async (campaignSlug) => {
    try {
      const { data } = await campaignsApi.stats(campaignSlug)
      setStats(data)
    } catch { /* stats unavailable */ }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      cmsApi.campaigns.get(slug),
      campaignsApi.stats(slug).catch(() => null),
    ]).then(([campRes, statsRes]) => {
      const campaigns = normalizeList(campRes.data)
      if (!campaigns.length) {
        addToast({ message: 'Campaign not found.', type: 'error' })
        return
      }
      setCampaign(campaigns[0])
      if (statsRes) setStats(statsRes.data)
    }).catch(() => {
      addToast({ message: 'Failed to load campaign.', type: 'error' })
    }).finally(() => setLoading(false))
  }, [slug])

  const amount = customAmount ? parseInt(customAmount, 10) : selectedAmount

  const handleDonate = async () => {
    if (!amount || amount < 1) return addToast({ message: 'Enter a valid amount.', type: 'error' })
    if (method === 'mpesa' && !phone.trim())
      return addToast({ message: 'Enter your M-Pesa phone number.', type: 'error' })

    setDonating(true)
    try {
      const { data } = await donationsApi.initiate({
        campaign_slug: slug,
        amount,
        currency: campaign?.currency || 'KES',
        method,
        phone: phone.trim(),
      })

      if (method === 'mpesa') {
        if (data.status === 'completed') {
          // Mock mode — already done
          addToast({ message: `Thank you! Your donation of KES ${amount.toLocaleString()} has been received.`, type: 'success' })
          await loadStats(slug)
          setPhone('')
          setCustomAmount('')
        } else {
          setPendingDonation(data)
          setStage('mpesa_waiting')
        }
      } else {
        // Stripe — show Elements form
        if (!data.client_secret) {
          addToast({ message: data.error || 'Card payment unavailable.', type: 'error' })
          return
        }
        setPendingDonation(data)
        setClientSecret(data.client_secret)
        setStage('card_confirm')
      }
    } catch (err) {
      addToast({ message: err.response?.data?.error || 'Donation failed. Please try again.', type: 'error' })
    } finally {
      setDonating(false)
    }
  }

  const handleDonationDone = async () => {
    setStage('done')
    await loadStats(slug)
  }

  const resetForm = () => {
    setStage('form')
    setPendingDonation(null)
    setClientSecret(null)
  }

  if (loading) {
    return <div className="page-enter" style={{ padding: 80, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
  }

  if (!campaign) {
    return (
      <div className="page-enter" style={{ padding: 80, textAlign: 'center' }}>
        Campaign not found. <Link to="/campaigns">Browse campaigns</Link>
      </div>
    )
  }

  const raisedAmount = stats?.raised_amount ?? 0
  const goalAmount   = Number(campaign.goal_amount)
  const pct          = Math.min(goalAmount > 0 ? Math.round((raisedAmount / goalAmount) * 100 * 10) / 10 : 0, 100)
  const donorCount   = stats?.donor_count ?? 0
  const daysLeft     = campaign.deadline
    ? Math.max(0, Math.ceil((new Date(campaign.deadline) - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const images  = getImages(campaign)
  const heroImg = getPrimaryImageUrl(campaign, 'large')
  const currency = campaign?.currency || 'KES'

  return (
    <div className="page-enter">
      {heroImg ? (
        <img src={heroImg} alt={campaign.title} style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          height: 260, background: 'var(--color-sage-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-sage)', fontSize: 14,
        }}>
          Campaign cover photo
        </div>
      )}

      <div className="container" style={{ paddingTop: 32, paddingBottom: 56 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className={`status-badge badge-${campaign.status}`}>{campaign.status}</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 16, lineHeight: 1.3 }}>{campaign.title}</h1>

            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
              <div className="progress-bar" style={{ marginBottom: 12 }}>
                <div className="progress-bar-inner" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
                {[
                  [`${currency} ${raisedAmount.toLocaleString()}`, 'Raised'],
                  [`${currency} ${goalAmount.toLocaleString()}`, 'Goal'],
                  [daysLeft !== null ? `${daysLeft} days` : '—', 'Remaining'],
                ].map(([val, label]) => (
                  <div key={label}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{val}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
                  </div>
                ))}
              </div>
              {donorCount > 0 && (
                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 12 }}>
                  {donorCount} donor{donorCount !== 1 ? 's' : ''} so far
                </div>
              )}
            </div>

            {campaign.description && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>About this campaign</h2>
                <p style={{ lineHeight: 1.7, fontSize: 14 }}>
                  {typeof campaign.description === 'string'
                    ? campaign.description
                    : campaign.description?.replace?.(/[#*_`>[\]]/g, '').trim()}
                </p>
              </div>
            )}

            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
                {images.slice(1).map((img) => (
                  <img key={img.id} src={img.formats?.small?.url ?? img.url} alt=""
                    style={{ height: 100, width: 150, objectFit: 'cover', borderRadius: 8 }} />
                ))}
              </div>
            )}

            {campaign.beneficiary_name && (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Beneficiary: <strong>{campaign.beneficiary_name}</strong>
              </div>
            )}
            {campaign.beneficiary_details && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.6 }}>
                {campaign.beneficiary_details}
              </p>
            )}
          </div>

          {/* ── Donation card ── */}
          <aside style={{ position: 'sticky', top: 88 }}>
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Donate to this campaign</h2>

              {/* ── Stage: form ── */}
              {stage === 'form' && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Select amount ({currency})</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
                      {PRESET_AMOUNTS.map((a) => (
                        <button
                          key={a}
                          onClick={() => { setSelectedAmount(a); setCustomAmount('') }}
                          style={{
                            padding: '10px',
                            border: `1.5px solid ${selectedAmount === a && !customAmount ? 'var(--color-turquoise)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-md)',
                            background: selectedAmount === a && !customAmount ? 'rgba(64,224,208,0.1)' : 'white',
                            fontWeight: 600, fontSize: 14, cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          {a.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <input
                      className="form-input" type="number" min="1"
                      placeholder="Custom amount"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Payment method</div>
                    <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', overflow: 'hidden' }}>
                      {[['mpesa', 'M-Pesa'], ['card', 'Card']].map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setMethod(val)}
                          style={{
                            flex: 1, padding: '9px',
                            background: method === val ? 'var(--color-terracotta)' : 'white',
                            color: method === val ? 'white' : 'var(--color-text)',
                            fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer',
                            transition: 'background-color var(--transition-fast)',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {method === 'mpesa' ? (
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">M-Pesa phone number</label>
                      <input
                        className="form-input" type="tel"
                        placeholder="07XXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                      Your card details will be entered on the next step.
                    </p>
                  )}

                  {campaign.status !== 'active' && (
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, textAlign: 'center' }}>
                      This campaign is no longer accepting donations.
                    </p>
                  )}

                  {isAuthenticated ? (
                    <button
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '12px' }}
                      disabled={donating || campaign.status !== 'active'}
                      onClick={handleDonate}
                    >
                      {donating ? 'Processing…' : `Donate ${currency} ${amount?.toLocaleString() || '—'}`}
                    </button>
                  ) : (
                    <Link
                      to="/auth/login"
                      className="btn-primary"
                      style={{ display: 'flex', width: '100%', justifyContent: 'center', fontSize: 15, padding: '12px' }}
                    >
                      Sign in to donate
                    </Link>
                  )}
                </>
              )}

              {/* ── Stage: M-Pesa waiting ── */}
              {stage === 'mpesa_waiting' && (
                <MpesaWaiting
                  donationId={pendingDonation?.id}
                  amount={amount}
                  currency={currency}
                  phone={phone}
                  onDone={handleDonationDone}
                  onCancel={resetForm}
                />
              )}

              {/* ── Stage: Stripe card form ── */}
              {stage === 'card_confirm' && clientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <StripeCardForm
                    amount={amount}
                    currency={currency}
                    onSuccess={handleDonationDone}
                    onCancel={resetForm}
                  />
                </Elements>
              )}

              {stage === 'card_confirm' && !stripePromise && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 }}>
                    Card payments are not configured. Please use M-Pesa.
                  </p>
                  <button className="btn-primary" style={{ fontSize: 14, padding: '10px 24px' }} onClick={resetForm}>
                    Go back
                  </button>
                </div>
              )}

              {/* ── Stage: done ── */}
              {stage === 'done' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-sage)', marginBottom: 6 }}>
                    Thank you!
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                    Your donation of {currency} {amount?.toLocaleString()} has been received.
                  </p>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 14, padding: '10px 24px' }}
                    onClick={resetForm}
                  >
                    Donate again
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          div[style*="grid-template-columns: 1fr 360px"] { grid-template-columns: 1fr !important; }
          aside {
            position: fixed !important; bottom: 0; left: 0; right: 0;
            top: auto !important; border-radius: 12px 12px 0 0;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
            max-height: 70vh; overflow-y: auto;
          }
        }
      `}</style>
    </div>
  )
}
