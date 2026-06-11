import { Router } from 'express'
import { strapiWebhook } from '../controllers/webhooks.controller.js'

const router = Router()

router.post('/strapi', strapiWebhook)

export default router
