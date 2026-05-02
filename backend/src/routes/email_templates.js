import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as templates from '../controllers/email_templates.controller.js'

const router = Router()

router.get('/',              authenticate, requireRole('admin'), templates.list)
router.get('/:key',          authenticate, requireRole('admin'), templates.getOne)
router.patch('/:key',        authenticate, requireRole('admin'), templates.update)
router.post('/:key/toggle',  authenticate, requireRole('admin'), templates.toggle)

export default router
