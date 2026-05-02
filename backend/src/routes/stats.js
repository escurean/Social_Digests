import { Router } from 'express'
import { query } from '../config/db.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const { rows: [row] } = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM topics WHERE status = 'active')          AS active_topics,
        (SELECT COUNT(*)::int FROM users)                                    AS total_users,
        (SELECT COUNT(*)::int FROM contributions)                            AS total_contributions,
        (SELECT COALESCE(SUM(raised_amount), 0)::bigint FROM campaigns)     AS total_raised_kes
    `)
    res.json(row)
  } catch (err) {
    next(err)
  }
})

export default router
