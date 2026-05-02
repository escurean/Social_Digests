import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as proxy from '../controllers/cms-proxy.controller.js'

const router = Router()
const admin = [authenticate, requireRole('admin')]

// ── Media upload (proxied to Strapi — keeps token server-side) ─
router.post('/upload', ...admin, proxy.uploadFile)

// ── Topics ────────────────────────────────────────────────────
router.get('/topics',         ...admin, proxy.listTopics)
router.get('/topics/:slug',   ...admin, proxy.getTopic)
router.post('/topics',        ...admin, proxy.createTopic)
router.put('/topics/:slug',   ...admin, proxy.updateTopic)
router.delete('/topics/:slug',...admin, proxy.deleteTopic)

// ── Campaigns ─────────────────────────────────────────────────
router.get('/campaigns',          ...admin, proxy.listCampaigns)
router.get('/campaigns/:slug',    ...admin, proxy.getCampaign)
router.post('/campaigns',         ...admin, proxy.createCampaign)
router.put('/campaigns/:slug',    ...admin, proxy.updateCampaign)
router.delete('/campaigns/:slug', ...admin, proxy.deleteCampaign)

export default router
