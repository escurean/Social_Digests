import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as settings from '../controllers/settings.controller.js'

const router = Router()

router.get('/',          settings.get)
router.patch('/',        authenticate, requireRole('admin'), settings.update)
router.post('/logo',     authenticate, requireRole('admin'), settings.uploadLogo)

export default router
