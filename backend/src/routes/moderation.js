import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as moderationController from '../controllers/moderation.controller.js'

const router = Router()

router.use(authenticate, requireRole('admin'))

router.get('/stats',         moderationController.getStats)
router.get('/queue',         moderationController.getQueue)
router.get('/users',         moderationController.getUsers)
router.post('/:id/dismiss',  moderationController.dismiss)
router.post('/:id/remove',   moderationController.remove)
router.post('/:id/warn',     moderationController.warn)
router.post('/:id/ban',      moderationController.ban)
router.post('/users/:userId/ban',    moderationController.banUser)
router.post('/users/:userId/unban',  moderationController.unbanUser)
router.post('/users/:userId/warn',   moderationController.warnUser)

export default router
