import { Router } from 'express'
import { authenticate, optionalAuth } from '../middleware/auth.js'
import * as contributionsController from '../controllers/contributions.controller.js'

const router = Router()

router.get('/topics/:slug/contributions', optionalAuth, contributionsController.list)
router.post('/topics/:slug/contributions', authenticate, contributionsController.create)
router.patch('/contributions/:id', authenticate, contributionsController.update)
router.delete('/contributions/:id', authenticate, contributionsController.remove)
router.post('/contributions/:id/flag', authenticate, contributionsController.flag)
router.post('/contributions/:id/react', authenticate, contributionsController.react)

export default router
