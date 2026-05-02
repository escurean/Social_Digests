import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as authController from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/google', authController.googleAuth)
router.get('/me', authenticate, authController.me)
router.post('/logout', authenticate, authController.logout)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password', authController.resetPassword)

export default router
