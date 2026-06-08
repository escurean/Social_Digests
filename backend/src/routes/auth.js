import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../middleware/rateLimiters.js'
import * as authController from '../controllers/auth.controller.js'

const router = Router()

router.post('/register',            registerLimiter,        authController.register)
router.post('/login',               loginLimiter,           authController.login)
router.post('/refresh',                                     authController.refresh)
router.post('/google',              loginLimiter,           authController.googleAuth)
router.get('/me',                   authenticate,           authController.me)
router.post('/logout',              authController.logout)
router.get('/verify-email',                                 authController.verifyEmail)         // FIX #9
router.post('/resend-verification', authenticate,           authController.resendVerification)  // FIX #9
router.post('/forgot-password',     forgotPasswordLimiter,  authController.forgotPassword)      // FIX #10
router.post('/reset-password',                              authController.resetPassword)       // FIX #10

export default router
