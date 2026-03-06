import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { join } from 'path'

const ROOT = join(import.meta.dir, '../public')
const PORT = Number(process.env.PORT ?? 8080)

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests",
}

const app = new Hono()

// Security headers on all responses
app.use('*', async (c, next) => {
  await next()
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) c.res.headers.set(k, v)
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
