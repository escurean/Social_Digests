import Redis from 'ioredis'
import { logger } from './logger.js'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
})

redis.on('error', (err) => {
  logger.error({ event: 'redis.error', err: err.message }, 'Redis connection error')
})

redis.on('connect', () => {
  logger.info({ event: 'redis.connected' }, 'Redis connected')
})

export async function testRedisConnection() {
  try {
    await redis.ping()
    return true
  } catch {
    return false
  }
}
