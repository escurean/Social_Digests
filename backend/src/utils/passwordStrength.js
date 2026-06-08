import { createRequire } from 'module'

// zxcvbn is a CommonJS module; use createRequire for ESM compatibility
const require = createRequire(import.meta.url)
const zxcvbn = require('zxcvbn')

/**
 * ASVS 5.0 §2.1 compliant password validation.
 * - Minimum 12 characters (raised from 8)
 * - Maximum 128 characters (prevents bcrypt DoS on very long inputs)
 * - Rejects passwords with zxcvbn score < 2 (very weak / commonly known)
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters.' }
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be under 128 characters.' }
  }

  const result = zxcvbn(password)

  if (result.score < 2) {
    const suggestion =
      result.feedback?.suggestions?.length
        ? result.feedback.suggestions[0]
        : 'Try a longer passphrase or a mix of unrelated words.'
    return {
      valid: false,
      error: `Password is too easy to guess. ${suggestion}`,
    }
  }

  return { valid: true }
}
