import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createTestSql } from '../__mocks__/pg-setup'
import { applySchema } from '../db/init'
import { createApiRouter } from './openapi'

const AUTH_TOKEN = 'test-token'

async function createTestApp() {
  const sql = await createTestSql()
  await applySchema(sql)
  const sessions = new Map<string, Date>()
  const router = createApiRouter(sql, sessions, AUTH_TOKEN)
  const app = new Hono()
  app.route('/api', router)
  return { app, sql, sessions }
}

async function authenticate(app: Hono): Promise<string> {
  const res = await app.request('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: AUTH_TOKEN }),
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/session=([^;]+)/)
  return match ? `session=${match[1]}` : ''
}

// ── Auth ──────────────────────────────────────────────────────────────────────

describe('POST /api/auth', () => {
  it('returns 401 with wrong token', async () => {
    const { app } = await createTestApp()
    const res = await app.request('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong-token' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 and sets session cookie with correct token', async () => {
    const { app } = await createTestApp()
    const res = await app.request('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: AUTH_TOKEN }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('session=')
    expect(res.headers.get('set-cookie')).toContain('HttpOnly')
  })
})

describe('GET /api/me', () => {
  it('returns 401 without session', async () => {
    const { app } = await createTestApp()
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
  })

  it('returns 200 with valid session', async () => {
    const { app } = await createTestApp()
    const cookie = await authenticate(app)
    const res = await app.request('/api/me', { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ── Roadmaps ──────────────────────────────────────────────────────────────────

describe('Roadmaps', () => {
  let app: Hono
  let cookie: string

  beforeEach(async () => {
    ;({ app } = await createTestApp())
    cookie = await authenticate(app)
  })

  it('GET /api/roadmaps returns empty list initially', async () => {
    const res = await app.request('/api/roadmaps', { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('POST /api/roadmaps creates a roadmap', async () => {
    const res = await app.request('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        title: 'My Roadmap',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBe('My Roadmap')
    expect(body.slug).toBe('my-roadmap')
    expect(body.version).toBe(1)
    expect(body.sections).toEqual([])
  })

  it('GET /api/roadmaps/:slug returns the roadmap', async () => {
    await app.request('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Test', startDate: '2026-01-01', endDate: '2026-06-30' }),
    })
    const res = await app.request('/api/roadmaps/test', { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.slug).toBe('test')
  })

  it('GET /api/roadmaps/:slug returns 404 for unknown slug', async () => {
    const res = await app.request('/api/roadmaps/unknown', { headers: { Cookie: cookie } })
    expect(res.status).toBe(404)
  })

  it('PUT /api/roadmaps/:slug updates the roadmap', async () => {
    const create = await app.request('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Old Title', startDate: '2026-01-01', endDate: '2026-06-30' }),
    })
    const created = await create.json()

    const res = await app.request(`/api/roadmaps/${created.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'New Title', version: created.version }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe('New Title')
    expect(body.version).toBe(2)
  })

  it('PUT /api/roadmaps/:slug returns 409 on version conflict', async () => {
    const create = await app.request('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        title: 'Conflict Test',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      }),
    })
    const created = await create.json()

    const res = await app.request(`/api/roadmaps/${created.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Stale Update', version: 999 }),
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.conflict).toBe(true)
    expect(body.current.slug).toBe(created.slug)
  })

  it('DELETE /api/roadmaps/:slug deletes the roadmap', async () => {
    const create = await app.request('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'To Delete', startDate: '2026-01-01', endDate: '2026-06-30' }),
    })
    const created = await create.json()

    const del = await app.request(`/api/roadmaps/${created.slug}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    expect(del.status).toBe(204)

    const get = await app.request(`/api/roadmaps/${created.slug}`, { headers: { Cookie: cookie } })
    expect(get.status).toBe(404)
  })
})

// ── Sections ──────────────────────────────────────────────────────────────────

describe('Sections', () => {
  let app: Hono
  let cookie: string
  let roadmapSlug: string

  beforeEach(async () => {
    ;({ app } = await createTestApp())
    cookie = await authenticate(app)
    const res = await app.request('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        title: 'Sections Test',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      }),
    })
    const roadmap = await res.json()
    roadmapSlug = roadmap.slug
  })

  it('POST /api/roadmaps/:slug/sections creates a section', async () => {
    const res = await app.request(`/api/roadmaps/${roadmapSlug}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ label: 'Frontend', color: 'purple' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.label).toBe('Frontend')
    expect(body.color).toBe('purple')
    expect(body.version).toBe(1)
    expect(body.tasks).toEqual([])
  })

  it('PUT /api/roadmaps/:slug/sections/:id updates a section', async () => {
    const create = await app.request(`/api/roadmaps/${roadmapSlug}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ label: 'Old Label', color: 'blue' }),
    })
    const section = await create.json()

    const res = await app.request(`/api/roadmaps/${roadmapSlug}/sections/${section.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ label: 'New Label', version: section.version }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.label).toBe('New Label')
    expect(body.version).toBe(2)
  })

  it('PUT /api/roadmaps/:slug/sections/:id returns 409 on conflict', async () => {
    const create = await app.request(`/api/roadmaps/${roadmapSlug}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ label: 'Conflict', color: 'cyan' }),
    })
    const section = await create.json()

    const res = await app.request(`/api/roadmaps/${roadmapSlug}/sections/${section.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ label: 'Stale', version: 999 }),
    })
    expect(res.status).toBe(409)
  })

  it('DELETE /api/roadmaps/:slug/sections/:id deletes a section', async () => {
    const create = await app.request(`/api/roadmaps/${roadmapSlug}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ label: 'To Delete', color: 'green' }),
    })
    const section = await create.json()

    const del = await app.request(`/api/roadmaps/${roadmapSlug}/sections/${section.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    expect(del.status).toBe(204)
  })
})

// ── Tasks ─────────────────────────────────────────────────────────────────────

describe('Tasks', () => {
  let app: Hono
  let cookie: string
  let roadmapSlug: string
  let sectionId: string

  beforeEach(async () => {
    ;({ app } = await createTestApp())
    cookie = await authenticate(app)
    const rm = await app.request('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ title: 'Tasks Test', startDate: '2026-01-01', endDate: '2026-12-31' }),
    })
    const roadmap = await rm.json()
    roadmapSlug = roadmap.slug

    const sec = await app.request(`/api/roadmaps/${roadmapSlug}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ label: 'Dev', color: 'blue' }),
    })
    const section = await sec.json()
    sectionId = section.id
  })

  it('POST creates a task', async () => {
    const res = await app.request(`/api/roadmaps/${roadmapSlug}/sections/${sectionId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        label: 'Build feature',
        startDate: '2026-03-01',
        endDate: '2026-03-15',
        status: 'confirmed',
        type: 'bar',
      }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.label).toBe('Build feature')
    expect(body.sectionId).toBe(sectionId)
    expect(body.version).toBe(1)
  })

  it('PUT updates a task', async () => {
    const create = await app.request(`/api/roadmaps/${roadmapSlug}/sections/${sectionId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        label: 'Old task',
        startDate: '2026-03-01',
        endDate: '2026-03-15',
        status: 'pending',
        type: 'bar',
      }),
    })
    const task = await create.json()

    const res = await app.request(
      `/api/roadmaps/${roadmapSlug}/sections/${sectionId}/tasks/${task.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ status: 'confirmed', version: task.version }),
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('confirmed')
    expect(body.version).toBe(2)
  })

  it('PUT returns 409 on version conflict', async () => {
    const create = await app.request(`/api/roadmaps/${roadmapSlug}/sections/${sectionId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        label: 'Conflict task',
        startDate: '2026-03-01',
        endDate: '2026-03-15',
        status: 'pending',
        type: 'bar',
      }),
    })
    const task = await create.json()

    const res = await app.request(
      `/api/roadmaps/${roadmapSlug}/sections/${sectionId}/tasks/${task.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ status: 'done', version: 999 }),
      },
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.conflict).toBe(true)
  })

  it('DELETE removes a task', async () => {
    const create = await app.request(`/api/roadmaps/${roadmapSlug}/sections/${sectionId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        label: 'To delete',
        startDate: '2026-03-01',
        endDate: '2026-03-15',
        status: 'pending',
        type: 'milestone',
      }),
    })
    const task = await create.json()

    const del = await app.request(
      `/api/roadmaps/${roadmapSlug}/sections/${sectionId}/tasks/${task.id}`,
      { method: 'DELETE', headers: { Cookie: cookie } },
    )
    expect(del.status).toBe(204)
  })
})

// ── History ───────────────────────────────────────────────────────────────────

describe('History', () => {
  let app: Hono
  let cookie: string
  let roadmapSlug: string

  beforeEach(async () => {
    ;({ app } = await createTestApp())
    cookie = await authenticate(app)
    const res = await app.request('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        title: 'History Test',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      }),
    })
    const roadmap = await res.json()
    roadmapSlug = roadmap.slug
  })

  it('GET /api/roadmaps/:slug/history returns 404 for unknown slug', async () => {
    const res = await app.request('/api/roadmaps/unknown/history', { headers: { Cookie: cookie } })
    expect(res.status).toBe(404)
  })

  it('GET /api/roadmaps/:slug/history returns roadmap_created event', async () => {
    const res = await app.request(`/api/roadmaps/${roadmapSlug}/history`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const events = await res.json()
    expect(Array.isArray(events)).toBe(true)
    expect(events.length).toBeGreaterThanOrEqual(1)
    const created = events.find((e: { type: string }) => e.type === 'roadmap_created')
    expect(created).toBeDefined()
    expect(created.payload.title).toBe('History Test')
  })

  it('GET /api/roadmaps/:slug/history records section events', async () => {
    await app.request(`/api/roadmaps/${roadmapSlug}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ label: 'Backend', color: 'blue' }),
    })

    const res = await app.request(`/api/roadmaps/${roadmapSlug}/history`, {
      headers: { Cookie: cookie },
    })
    const events = await res.json()
    const sectionAdded = events.find((e: { type: string }) => e.type === 'section_added')
    expect(sectionAdded).toBeDefined()
    expect(sectionAdded.payload.label).toBe('Backend')
  })

  it('GET /api/roadmaps/:slug/history respects limit query param', async () => {
    const res = await app.request(`/api/roadmaps/${roadmapSlug}/history?limit=1`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const events = await res.json()
    expect(events.length).toBeLessThanOrEqual(1)
  })
})

// ── OpenAPI spec ──────────────────────────────────────────────────────────────

describe('OpenAPI', () => {
  it('GET /api/openapi.json returns a valid spec', async () => {
    const { app } = await createTestApp()
    const res = await app.request('/api/openapi.json')
    expect(res.status).toBe(200)
    const spec = await res.json()
    expect(spec.openapi).toBe('3.0.0')
    expect(spec.info.title).toContain('Roadmap Maker')
    expect(spec.paths).toBeDefined()
  })

  it('GET /api/docs returns Swagger UI HTML', async () => {
    const { app } = await createTestApp()
    const res = await app.request('/api/docs')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('swagger')
  })
})
