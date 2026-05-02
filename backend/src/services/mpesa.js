const DARAJA_BASE = 'https://sandbox.safaricom.co.ke'

export async function getAccessToken() {
  if (!process.env.MPESA_CONSUMER_KEY) {
    console.warn('[M-Pesa] No credentials configured — returning mock token')
    return 'mock_access_token'
  }
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')

  const response = await fetch(
    `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  )
  const data = await response.json()
  return data.access_token
}

export async function stkPush({ phone, amount, campaignId, campaignTitle }) {
  if (!process.env.MPESA_CONSUMER_KEY) {
    console.warn('[M-Pesa] No credentials configured — returning mock STK push response')
    return { CheckoutRequestID: `mock_${Date.now()}`, ResponseCode: '0' }
  }

  const token = await getAccessToken()
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64')

  const body = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: `CAMPAIGN-${campaignId}`,
    TransactionDesc: campaignTitle?.slice(0, 13) || 'Donation',
  }

  const response = await fetch(
    `${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  return response.json()
}
