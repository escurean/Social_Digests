import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error', err)
})

export async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  if (process.env.NODE_ENV !== 'production') {
    console.debug('query', { text, duration: Date.now() - start, rows: res.rowCount })
  }
  return res
}

export default { pool, query }
