import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as topics from '../controllers/topics.controller.js'

const router = Router()

router.get('/',          topics.list)
router.get('/:slug',     topics.getOne)
router.post('/',         authenticate, requireRole('admin'), topics.create)
router.patch('/:slug',   authenticate, requireRole('admin'), topics.update)
router.delete('/:slug',  authenticate, requireRole('admin'), topics.remove)

export default router
