import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as banners from '../controllers/banners.controller.js'

const router = Router()

router.get('/',              banners.list)
router.get('/active',        banners.listActive)
router.post('/',             authenticate, requireRole('admin'), banners.create)
router.patch('/:id',         authenticate, requireRole('admin'), banners.update)
router.post('/:id/toggle',   authenticate, requireRole('admin'), banners.toggle)
router.delete('/:id',        authenticate, requireRole('admin'), banners.remove)

export default router
