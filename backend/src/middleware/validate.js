import { validationResult } from 'express-validator'

export function validate(schema) {
  return async (req, res, next) => {
    await Promise.all(schema.map((check) => check.run(req)))
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  }
}
