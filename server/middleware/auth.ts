import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'

export function authMiddleware(sessions: Map<string, Date>) {
  return async (c: Context, next: Next) => {
    const sessionId = getCookie(c, 'session')
    if (!sessionId || !sessions.has(sessionId)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const expiry = sessions.get(sessionId)!
    if (expiry < new Date()) {
      sessions.delete(sessionId)
      return c.json({ error: 'Session expired' }, 401)
    }
    await next()
  }
}
