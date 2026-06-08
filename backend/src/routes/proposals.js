import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { proposalLimiter } from '../middleware/rateLimiters.js'
import * as proposalsController from '../controllers/proposals.controller.js'

const router = Router()

router.post('/', authenticate, proposalLimiter, proposalsController.submit)
router.get('/', authenticate, requireRole('admin'), proposalsController.list)
router.post('/:id/approve', authenticate, requireRole('admin'), proposalsController.approve)
router.post('/:id/reject', authenticate, requireRole('admin'), proposalsController.reject)

export default router
