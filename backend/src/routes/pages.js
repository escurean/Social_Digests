import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as pages from '../controllers/pages.controller.js'

const router = Router()

router.get('/',           pages.list)
router.get('/:slug',      pages.getOne)
router.post('/',          authenticate, requireRole('admin'), pages.create)
router.patch('/:slug',    authenticate, requireRole('admin'), pages.update)
router.delete('/:slug',   authenticate, requireRole('admin'), pages.remove)

export default router
