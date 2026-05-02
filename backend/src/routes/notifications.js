import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as notificationsController from '../controllers/notifications.controller.js'

const router = Router()

router.use(authenticate)

router.get('/', notificationsController.list)
router.patch('/read-all', notificationsController.markAllRead)
router.patch('/:id/read', notificationsController.markRead)

export default router
