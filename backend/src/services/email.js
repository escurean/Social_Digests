const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337'
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN

async function fetchTemplate(key) {
  const url = `${STRAPI_URL}/api/email-templates?filters[key][$eq]=${key}&filters[is_active][$eq]=true`
  const headers = STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}
  const res = await fetch(url, { headers })
  const data = await res.json()
  return data.data?.[0]?.attributes || null
}

function interpolate(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export async function sendEmail({ to, subject, html }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[Email] Would send to ${to} — subject: "${subject}"`)
    return { mock: true }
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.EMAIL_FROM || 'no-reply@socialdigests.com' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  })
  return res.ok ? { sent: true } : { sent: false, status: res.status }
}

export async function sendFromTemplate({ to, templateKey, variables = {} }) {
  const template = await fetchTemplate(templateKey)
  if (!template) {
    console.warn(`[Email] Template "${templateKey}" not found or inactive`)
    return null
  }
  return sendEmail({
    to,
    subject: interpolate(template.subject, variables),
    html: interpolate(template.body_html, variables),
  })
}
