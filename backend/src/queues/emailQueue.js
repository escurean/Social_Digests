import Bull from 'bull'
import { sendFromTemplate, sendEmail } from '../services/email.js'
import { logger } from '../services/logger.js'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const emailQueue = new Bull('emails', { redis: redisUrl })

emailQueue.process('donation_receipt', async (job) => {
  const { to, templateKey, variables } = job.data
  const result = await sendFromTemplate({ to, templateKey, variables })
  logger.info({ event: 'email.sent', job: job.id, to, templateKey }, 'Receipt email sent')
  return result
})

emailQueue.process('welcome', async (job) => {
  const { to, name } = job.data
  const result = await sendFromTemplate({ to, templateKey: 'welcome', variables: { name } })
  logger.info({ event: 'email.sent', job: job.id, to }, 'Welcome email sent')
  return result
})

emailQueue.process('generic', async (job) => {
  const { to, subject, html } = job.data
  const result = await sendEmail({ to, subject, html })
  logger.info({ event: 'email.sent', job: job.id, to }, 'Generic email sent')
  return result
})

emailQueue.on('failed', (job, err) => {
  logger.error(
    { event: 'email.failed', job: job.id, err: err.message, data: job.data },
    'Email job failed'
  )
})

emailQueue.on('stalled', (job) => {
  logger.warn({ event: 'email.stalled', job: job.id }, 'Email job stalled')
})
