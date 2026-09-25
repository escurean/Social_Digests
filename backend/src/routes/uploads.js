import { Router } from 'express'
import multer from 'multer'
import { authenticate, requireRole } from '../middleware/auth.js'
import { uploadImage } from '../services/cloudinary.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true)
    cb(Object.assign(new Error('Only JPEG, PNG, WebP or GIF images are allowed.'), { status: 400 }))
  },
})

// POST /api/uploads  (multipart, field "file") → image object for topics/campaigns `images`
router.post('/', authenticate, requireRole('admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An image file is required.' })
    res.status(201).json(await uploadImage(req.file))
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be under 5 MB.' })
    next(err)
  }
})

export default router
