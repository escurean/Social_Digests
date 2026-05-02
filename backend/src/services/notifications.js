import { query } from '../config/db.js'

export const NOTIFICATION_TYPES = {
  TOPIC_REPLY: 'topic_reply',
  PROPOSAL_APPROVED: 'proposal_approved',
  PROPOSAL_REJECTED: 'proposal_rejected',
  CAMPAIGN_GOAL_REACHED: 'campaign_goal_reached',
  CAMPAIGN_UPDATE: 'campaign_update',
}

export async function createNotification({ userId, type, message, link = null }) {
  const result = await query(
    'INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, type, message, link]
  )
  return result.rows[0]
}
