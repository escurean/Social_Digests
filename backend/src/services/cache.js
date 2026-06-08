import { redis } from './redis.js'

export async function getCache(key) {
  const val = await redis.get(key)
  return val ? JSON.parse(val) : null
}

export async function setCache(key, value, ttlSeconds) {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

export async function invalidate(pattern) {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) await redis.del(...keys)
}

export async function deleteCache(key) {
  await redis.del(key)
}
