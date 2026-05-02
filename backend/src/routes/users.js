import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as usersController from '../controllers/users.controller.js'

const router = Router()

router.get('/:id', usersController.getProfile)
router.patch('/:id', authenticate, usersController.updateProfile)
router.get('/:id/contributions', usersController.getContributions)
router.get('/:id/donations', authenticate, usersController.getDonations)

export default router
