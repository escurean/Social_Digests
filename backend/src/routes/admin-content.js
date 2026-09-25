import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as topics from '../controllers/topics.controller.js'
import * as campaigns from '../controllers/campaigns.controller.js'

// Admin-only reads that include drafts. Writes use the regular
// POST/PATCH/DELETE routes on /api/topics and /api/campaigns.
const router = Router()
router.use(authenticate, requireRole('admin'))

router.get('/topics',           topics.adminList)
router.get('/topics/:slug',     topics.adminGetOne)
router.get('/campaigns',        campaigns.adminList)
router.get('/campaigns/:slug',  campaigns.adminGetOne)

export default router
