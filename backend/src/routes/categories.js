import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as categories from '../controllers/categories.controller.js'

const router = Router()

router.get('/',         categories.list)
router.post('/',        authenticate, requireRole('admin'), categories.create)
router.patch('/:slug',  authenticate, requireRole('admin'), categories.update)
router.delete('/:slug', authenticate, requireRole('admin'), categories.remove)

export default router
