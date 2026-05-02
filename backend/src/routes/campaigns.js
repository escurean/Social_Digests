import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as campaigns from '../controllers/campaigns.controller.js'

const router = Router()

router.get('/',          campaigns.list)
router.get('/:slug',     campaigns.getOne)
router.get('/:slug/stats', campaigns.getStats)
router.post('/',         authenticate, requireRole('admin'), campaigns.create)
router.patch('/:slug',   authenticate, requireRole('admin'), campaigns.update)
router.delete('/:slug',  authenticate, requireRole('admin'), campaigns.remove)

export default router
