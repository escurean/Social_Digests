import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    const migrationsDir = path.join(__dirname, 'migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1', [file]
      )
      if (rows.length) {
        console.log(`[migrate] skip  ${file}`)
        continue
      }

      console.log(`[migrate] apply ${file}`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)', [file]
        )
        await client.query('COMMIT')
        console.log(`[migrate] done  ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`[migrate] FAILED ${file}:`, err.message)
        process.exit(1)
      }
    }

    console.log('[migrate] all migrations applied')
  } finally {
    client.release()
    await pool.end()
  }
}

run()
