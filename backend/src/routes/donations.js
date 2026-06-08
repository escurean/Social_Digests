import { Router } from 'express'
import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { donationInitiateLimiter } from '../middleware/rateLimiters.js'
import * as donationsController from '../controllers/donations.controller.js'

const router = Router()

router.post('/initiate',        authenticate, donationInitiateLimiter, donationsController.initiate)
router.get('/:id/status',       authenticate, donationsController.getDonationStatus)
router.post('/stripe/confirm',  authenticate, donationsController.confirmStripePayment)
router.post('/stripe/webhook',  express.raw({ type: 'application/json' }), donationsController.stripeWebhook)
router.post('/mpesa/callback',  donationsController.mpesaCallback)
router.get('/campaigns/:id',    donationsController.getCampaignStats)

export default router
