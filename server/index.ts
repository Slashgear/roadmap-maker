import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { join, resolve } from 'path'
import type { Sql } from 'postgres'

const ROOT = process.env.PUBLIC_DIR
  ? resolve(process.env.PUBLIC_DIR)
  : join(import.meta.dir, '../public')
const PORT = Number(process.env.PORT ?? 8080)
const STORAGE_MODE = process.env.STORAGE ?? 'static'

if (STORAGE_MODE === 'postgres') {
  const missing = ['AUTH_TOKEN', 'DATABASE_URL'].filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(
      `[server] Missing required environment variables for postgres mode:\n${missing.map((k) => `  - ${k}`).join('\n')}`,
    )
    process.exit(1)
  }
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
}

const app = new Hono()

if (process.env.NODE_ENV !== 'test') {
  app.use('*', logger())
}

// Security headers on all responses
app.use('*', async (c, next) => {
  await next()
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) c.res.headers.set(k, v)
})

// API routes — team mode only (dynamic import keeps postgres out of static bundle)
let sql: Sql | null = null

if (STORAGE_MODE === 'postgres') {
  const authToken = process.env.AUTH_TOKEN!

  const { createSql } = await import('./db/init')
  const { createApiRouter } = await import('./api/openapi')

  sql = await createSql()
  const sessions = new Map<string, Date>()
  const apiRouter = createApiRouter(sql, sessions, authToken)

  app.route('/api', apiRouter)
  console.log(
    `[server] Team mode — PostgreSQL at ${process.env.DATABASE_URL ?? 'postgres://localhost/roadmaps'}`,
  )

  process.on('SIGTERM', async () => {
    await sql!.end()
    process.exit(0)
  })
}

// Healthcheck — verifies DB connectivity in team mode
app.get('/health', async (c) => {
  if (sql) {
    try {
      await sql`SELECT 1`
      return c.json({ status: 'ok', db: 'ok' })
    } catch {
      return c.json({ status: 'error', db: 'unreachable' }, 503)
    }
  }
  return c.json({ status: 'ok' })
})

// Static files with precompressed (br > zstd > gzip) + cache headers
app.use(
  '*',
  serveStatic({
    root: ROOT,
    precompressed: true,
    onFound: (path, c) => {
      const cache = path.includes('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache, must-revalidate'
      c.header('Cache-Control', cache)
    },
  }),
)

// SPA fallback
app.use(
  '*',
  serveStatic({
    root: ROOT,
    path: 'index.html',
    precompressed: true,
    onFound: (_path, c) => {
      c.header('Cache-Control', 'no-cache, must-revalidate')
    },
  }),
)

export default { port: PORT, fetch: app.fetch }
