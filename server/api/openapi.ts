import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { streamSSE } from 'hono/streaming'
import { swaggerUI } from '@hono/swagger-ui'
import { nanoid } from 'nanoid'
import type { Sql } from 'postgres'
import type { Roadmap, Section, Task } from '../../client/src/types'
import { authMiddleware } from '../middleware/auth'
import {
  getRoadmapList,
  getRoadmapBySlug,
  createRoadmap,
  updateRoadmap,
  deleteRoadmap,
} from '../db/roadmaps'
import { createSection, updateSection, deleteSection } from '../db/sections'
import { createTask, updateTask, deleteTask } from '../db/tasks'

// ── Types ─────────────────────────────────────────────────────────────────────

type PresenceUser = { id: string; name: string; color: string }

type SSEPayload =
  | { type: 'init'; payload: Roadmap }
  | { type: 'roadmap_updated'; payload: Omit<Roadmap, 'sections'> }
  | { type: 'roadmap_deleted' }
  | { type: 'section_added'; payload: Section }
  | { type: 'section_updated'; payload: Section }
  | { type: 'section_deleted'; payload: { id: string } }
  | { type: 'task_added'; payload: Task }
  | { type: 'task_updated'; payload: Task }
  | { type: 'task_deleted'; payload: { id: string; sectionId: string } }
  | { type: 'presence_updated'; payload: { users: PresenceUser[] } }

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createApiRouter(sql: Sql, sessions: Map<string, Date>, authToken: string): Hono {
  const app = new Hono()
  const sseClients = new Map<string, Map<string, (data: string) => void>>()
  const ssePresence = new Map<string, Map<string, PresenceUser>>()

  function broadcast(slug: string, event: SSEPayload) {
    const clients = sseClients.get(slug)
    if (!clients || clients.size === 0) return
    const data = JSON.stringify(event)
    clients.forEach((send) => send(data))
  }

  function broadcastPresence(slug: string) {
    const users = [...(ssePresence.get(slug)?.values() ?? [])]
    broadcast(slug, { type: 'presence_updated', payload: { users } })
  }

  const auth = authMiddleware(sessions)

  // ── Auth ────────────────────────────────────────────────────────────────────

  app.post('/auth', async (c) => {
    const body = await c.req.json<{ token?: string }>()
    if (!body.token || body.token !== authToken) {
      return c.json({ error: 'Invalid token' }, 401)
    }
    const sessionId = nanoid()
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
    sessions.set(sessionId, expiry)
    setCookie(c, 'session', sessionId, {
      httpOnly: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: 24 * 60 * 60,
    })
    return c.json({ ok: true })
  })

  app.get('/me', auth, (c) => {
    return c.json({ ok: true })
  })

  // ── Roadmaps ────────────────────────────────────────────────────────────────

  app.get('/roadmaps', auth, async (c) => {
    return c.json(await getRoadmapList(sql))
  })

  app.post('/roadmaps', auth, async (c) => {
    const body = await c.req.json<{
      title: string
      subtitle?: string
      startDate: string
      endDate: string
      slug?: string
    }>()
    const id = nanoid()
    const slug = body.slug || slugify(body.title) || id
    const roadmap = await createRoadmap(sql, {
      id,
      slug,
      title: body.title,
      subtitle: body.subtitle ?? null,
      startDate: body.startDate,
      endDate: body.endDate,
    })
    return c.json(roadmap, 201)
  })

  app.get('/roadmaps/:slug', auth, async (c) => {
    const slug = c.req.param('slug')
    const roadmap = await getRoadmapBySlug(sql, slug)
    if (!roadmap) return c.json({ error: 'Not found' }, 404)
    return c.json(roadmap)
  })

  app.put('/roadmaps/:slug', auth, async (c) => {
    const slug = c.req.param('slug')
    const body = await c.req.json<{
      title?: string
      subtitle?: string | null
      startDate?: string
      endDate?: string
      slug?: string
      version: number
    }>()
    const result = await updateRoadmap(sql, slug, {
      title: body.title,
      subtitle: body.subtitle,
      startDate: body.startDate,
      endDate: body.endDate,
      newSlug: body.slug,
      version: body.version,
    })
    if (result.status === 'not_found') return c.json({ error: 'Not found' }, 404)
    if (result.status === 'conflict')
      return c.json({ conflict: true, current: result.current }, 409)
    broadcast(result.data.slug, {
      type: 'roadmap_updated',
      payload: { ...result.data, sections: undefined as never },
    })
    return c.json(result.data)
  })

  app.delete('/roadmaps/:slug', auth, async (c) => {
    const slug = c.req.param('slug')
    const exists = await getRoadmapBySlug(sql, slug)
    if (!exists) return c.json({ error: 'Not found' }, 404)
    broadcast(slug, { type: 'roadmap_deleted' })
    await deleteRoadmap(sql, slug)
    return new Response(null, { status: 204 })
  })

  // ── Sections ────────────────────────────────────────────────────────────────

  app.post('/roadmaps/:slug/sections', auth, async (c) => {
    const slug = c.req.param('slug')
    const roadmap = await getRoadmapBySlug(sql, slug)
    if (!roadmap) return c.json({ error: 'Not found' }, 404)
    const body = await c.req.json<{ label: string; color: string }>()
    const section = await createSection(sql, roadmap.id, {
      id: nanoid(),
      label: body.label,
      color: body.color,
    })
    broadcast(slug, { type: 'section_added', payload: section })
    return c.json(section, 201)
  })

  app.put('/roadmaps/:slug/sections/:id', auth, async (c) => {
    const slug = c.req.param('slug')
    const sectionId = c.req.param('id')
    const body = await c.req.json<{ label?: string; color?: string; version: number }>()
    const result = await updateSection(sql, sectionId, body)
    if (result.status === 'not_found') return c.json({ error: 'Not found' }, 404)
    if (result.status === 'conflict')
      return c.json({ conflict: true, current: result.current }, 409)
    broadcast(slug, { type: 'section_updated', payload: result.data })
    return c.json(result.data)
  })

  app.delete('/roadmaps/:slug/sections/:id', auth, async (c) => {
    const slug = c.req.param('slug')
    const sectionId = c.req.param('id')
    await deleteSection(sql, sectionId)
    broadcast(slug, { type: 'section_deleted', payload: { id: sectionId } })
    return new Response(null, { status: 204 })
  })

  // ── Tasks ───────────────────────────────────────────────────────────────────

  app.post('/roadmaps/:slug/sections/:sectionId/tasks', auth, async (c) => {
    const slug = c.req.param('slug')
    const sectionId = c.req.param('sectionId')
    const body = await c.req.json<{
      label: string
      startDate: string
      endDate: string
      status: Task['status']
      type: Task['type']
      note?: string
      externalLink?: string
    }>()
    const task = await createTask(sql, sectionId, { id: nanoid(), ...body })
    broadcast(slug, { type: 'task_added', payload: task })
    return c.json(task, 201)
  })

  app.put('/roadmaps/:slug/sections/:sectionId/tasks/:id', auth, async (c) => {
    const slug = c.req.param('slug')
    const sectionId = c.req.param('sectionId')
    const taskId = c.req.param('id')
    const body = await c.req.json<Partial<Task> & { version: number }>()
    const result = await updateTask(sql, taskId, body)
    if (result.status === 'not_found') return c.json({ error: 'Not found' }, 404)
    if (result.status === 'conflict')
      return c.json({ conflict: true, current: result.current }, 409)
    broadcast(slug, { type: 'task_updated', payload: result.data })
    return c.json(result.data)
  })

  app.delete('/roadmaps/:slug/sections/:sectionId/tasks/:id', auth, async (c) => {
    const slug = c.req.param('slug')
    const sectionId = c.req.param('sectionId')
    const taskId = c.req.param('id')
    await deleteTask(sql, taskId)
    broadcast(slug, { type: 'task_deleted', payload: { id: taskId, sectionId } })
    return new Response(null, { status: 204 })
  })

  // ── SSE ─────────────────────────────────────────────────────────────────────

  app.get('/roadmaps/:slug/events', auth, async (c) => {
    const slug = c.req.param('slug')
    const roadmap = await getRoadmapBySlug(sql, slug)
    if (!roadmap) return c.json({ error: 'Not found' }, 404)

    const clientId = c.req.query('clientId') || nanoid()
    const name = c.req.query('name') || 'Anonymous'
    const color = c.req.query('color') || '#7c3aed'

    return streamSSE(c, async (stream) => {
      const send = (data: string) => {
        stream.writeSSE({ data, event: 'message' })
      }

      if (!sseClients.has(slug)) sseClients.set(slug, new Map())
      if (!ssePresence.has(slug)) ssePresence.set(slug, new Map())
      sseClients.get(slug)!.set(clientId, send)
      ssePresence.get(slug)!.set(clientId, { id: clientId, name, color })
      broadcastPresence(slug)

      // Send retry interval + initial presence + initial state
      await stream.writeSSE({ data: '', retry: 3000 })
      const users = [...(ssePresence.get(slug)?.values() ?? [])]
      await stream.writeSSE({
        data: JSON.stringify({ type: 'presence_updated', payload: { users } }),
        event: 'message',
      })
      await stream.writeSSE({
        data: JSON.stringify({ type: 'init', payload: await getRoadmapBySlug(sql, slug) }),
        event: 'message',
      })

      stream.onAbort(() => {
        sseClients.get(slug)?.delete(clientId)
        ssePresence.get(slug)?.delete(clientId)
        broadcastPresence(slug)
      })

      // Keep-alive ping every 30s
      while (true) {
        await stream.sleep(30000)
        await stream.writeSSE({ data: 'ping', event: 'ping' })
      }
    })
  })

  // ── OpenAPI spec ─────────────────────────────────────────────────────────────

  app.get('/openapi.json', (c) => {
    return c.json(openapiSpec)
  })

  app.get('/docs', swaggerUI({ url: '/api/openapi.json' }))

  return app
}

// ── OpenAPI specification ─────────────────────────────────────────────────────

const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Roadmap Maker Team API',
    version: '1.0.0',
    description: `
Team mode API for the Roadmap Maker application.

## Authentication
Authentication uses an httpOnly session cookie. POST \`/api/auth\` with the shared \`AUTH_TOKEN\` to receive a session cookie valid for 24 hours.

## Optimistic Locking
All PUT endpoints require a \`version\` field matching the current entity version. A mismatch returns **409 Conflict** with the current server entity in \`{ conflict: true, current: <entity> }\`.

## Real-time Updates
Subscribe to \`GET /api/roadmaps/:slug/events\` (SSE) to receive live updates. The stream sends named events (\`message\`) with JSON payloads describing each mutation.
    `.trim(),
    contact: {
      name: 'GitHub Repository',
      url: 'https://github.com/Slashgear/roadmap-maker',
    },
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },
  servers: [{ url: '/api', description: 'Current server' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'session' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string', example: 'Not found' } },
      },
      ConflictError: {
        type: 'object',
        properties: {
          conflict: { type: 'boolean', example: true },
          current: { $ref: '#/components/schemas/Roadmap' },
        },
      },
      Task: {
        type: 'object',
        required: [
          'id',
          'sectionId',
          'label',
          'startDate',
          'endDate',
          'status',
          'type',
          'position',
          'version',
        ],
        properties: {
          id: { type: 'string', example: 'abc123' },
          sectionId: { type: 'string', example: 'sec456' },
          label: { type: 'string', example: 'Design review' },
          startDate: { type: 'string', format: 'date', example: '2026-04-01' },
          endDate: { type: 'string', format: 'date', example: '2026-04-15' },
          status: { type: 'string', enum: ['confirmed', 'started', 'pending', 'critical', 'done'] },
          type: { type: 'string', enum: ['bar', 'milestone'] },
          note: { type: 'string', nullable: true },
          externalLink: { type: 'string', format: 'uri', nullable: true },
          position: { type: 'integer', example: 0 },
          version: { type: 'integer', example: 1 },
        },
      },
      Section: {
        type: 'object',
        required: ['id', 'roadmapId', 'label', 'color', 'position', 'version', 'tasks'],
        properties: {
          id: { type: 'string', example: 'sec456' },
          roadmapId: { type: 'string', example: 'rm789' },
          label: { type: 'string', example: 'Frontend' },
          color: {
            type: 'string',
            enum: [
              'orange',
              'purple',
              'cyan',
              'green',
              'pink',
              'blue',
              'amber',
              'indigo',
              'lime',
              'rose',
              'teal',
              'slate',
            ],
          },
          position: { type: 'integer', example: 0 },
          version: { type: 'integer', example: 1 },
          tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
        },
      },
      Roadmap: {
        type: 'object',
        required: ['id', 'slug', 'title', 'startDate', 'endDate', 'version', 'sections'],
        properties: {
          id: { type: 'string', example: 'rm789' },
          slug: { type: 'string', example: 'my-roadmap' },
          title: { type: 'string', example: 'Q2 2026 Roadmap' },
          subtitle: { type: 'string', nullable: true, example: 'Apr → Jun 2026' },
          startDate: { type: 'string', format: 'date', example: '2026-04-01' },
          endDate: { type: 'string', format: 'date', example: '2026-06-30' },
          version: { type: 'integer', example: 1 },
          sections: { type: 'array', items: { $ref: '#/components/schemas/Section' } },
        },
      },
      RoadmapMeta: {
        type: 'object',
        required: ['id', 'slug', 'title', 'startDate', 'endDate', 'version'],
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          title: { type: 'string' },
          subtitle: { type: 'string', nullable: true },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          version: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/auth': {
      post: {
        tags: ['auth'],
        summary: 'Authenticate with shared token',
        description: 'Exchange the shared AUTH_TOKEN for a session cookie valid 24 hours.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: { token: { type: 'string', example: 'my-secret-token' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authenticated — session cookie set',
            headers: {
              'Set-Cookie': { schema: { type: 'string' }, description: 'HttpOnly session cookie' },
            },
            content: {
              'application/json': {
                schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
              },
            },
          },
          401: {
            description: 'Invalid token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/me': {
      get: {
        tags: ['auth'],
        summary: 'Check session validity',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Session is valid',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/roadmaps': {
      get: {
        tags: ['roadmaps'],
        summary: 'List all roadmaps',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'List of roadmaps',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RoadmapMeta' } },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      post: {
        tags: ['roadmaps'],
        summary: 'Create a roadmap',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'startDate', 'endDate'],
                properties: {
                  title: { type: 'string', example: 'Q2 2026 Roadmap' },
                  subtitle: { type: 'string' },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  slug: {
                    type: 'string',
                    description: 'Optional custom slug; auto-generated from title if omitted',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Roadmap' } } },
          },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/roadmaps/{slug}': {
      get: {
        tags: ['roadmaps'],
        summary: 'Get a roadmap with all sections and tasks',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Roadmap found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Roadmap' } } },
          },
          404: {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      put: {
        tags: ['roadmaps'],
        summary: 'Update a roadmap',
        description: 'Requires the current `version`. Returns 409 on version conflict.',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['version'],
                properties: {
                  title: { type: 'string' },
                  subtitle: { type: 'string', nullable: true },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  slug: { type: 'string', description: 'New slug' },
                  version: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Roadmap' } } },
          },
          404: {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          409: {
            description: 'Version conflict',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ConflictError' } },
            },
          },
        },
      },
      delete: {
        tags: ['roadmaps'],
        summary: 'Delete a roadmap',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Deleted' },
          404: {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/roadmaps/{slug}/sections': {
      post: {
        tags: ['sections'],
        summary: 'Add a section to a roadmap',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['label', 'color'],
                properties: {
                  label: { type: 'string', example: 'Frontend' },
                  color: {
                    type: 'string',
                    enum: [
                      'orange',
                      'purple',
                      'cyan',
                      'green',
                      'pink',
                      'blue',
                      'amber',
                      'indigo',
                      'lime',
                      'rose',
                      'teal',
                      'slate',
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Section' } } },
          },
          404: {
            description: 'Roadmap not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/roadmaps/{slug}/sections/{id}': {
      put: {
        tags: ['sections'],
        summary: 'Update a section',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['version'],
                properties: {
                  label: { type: 'string' },
                  color: { type: 'string' },
                  version: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Section' } } },
          },
          404: {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          409: {
            description: 'Version conflict',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ConflictError' } },
            },
          },
        },
      },
      delete: {
        tags: ['sections'],
        summary: 'Delete a section',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          204: { description: 'Deleted' },
        },
      },
    },
    '/roadmaps/{slug}/sections/{sectionId}/tasks': {
      post: {
        tags: ['tasks'],
        summary: 'Add a task to a section',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'sectionId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['label', 'startDate', 'endDate', 'status', 'type'],
                properties: {
                  label: { type: 'string' },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  status: {
                    type: 'string',
                    enum: ['confirmed', 'started', 'pending', 'critical', 'done'],
                  },
                  type: { type: 'string', enum: ['bar', 'milestone'] },
                  note: { type: 'string' },
                  externalLink: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } },
          },
          404: {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/roadmaps/{slug}/sections/{sectionId}/tasks/{id}': {
      put: {
        tags: ['tasks'],
        summary: 'Update a task',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'sectionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['version'],
                properties: {
                  label: { type: 'string' },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  status: {
                    type: 'string',
                    enum: ['confirmed', 'started', 'pending', 'critical', 'done'],
                  },
                  type: { type: 'string', enum: ['bar', 'milestone'] },
                  note: { type: 'string', nullable: true },
                  externalLink: { type: 'string', format: 'uri', nullable: true },
                  version: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } },
          },
          404: {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          409: {
            description: 'Version conflict',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ConflictError' } },
            },
          },
        },
      },
      delete: {
        tags: ['tasks'],
        summary: 'Delete a task',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'sectionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          204: { description: 'Deleted' },
        },
      },
    },
    '/roadmaps/{slug}/events': {
      get: {
        tags: ['realtime'],
        summary: 'Subscribe to real-time updates (SSE)',
        description: `Server-Sent Events stream for a roadmap. Sends named events (\`message\`) with JSON payload:
- \`init\` — full roadmap state on connection
- \`roadmap_updated\` — roadmap metadata changed
- \`roadmap_deleted\` — roadmap was deleted
- \`section_added\` / \`section_updated\` / \`section_deleted\`
- \`task_added\` / \`task_updated\` / \`task_deleted\`

The stream sends a \`ping\` event every 30 seconds to keep the connection alive. EventSource reconnects automatically (retry: 3000ms).`,
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'SSE stream',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
          },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          404: {
            description: 'Roadmap not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
} as const
