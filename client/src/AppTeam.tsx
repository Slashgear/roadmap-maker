import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import { nanoid } from 'nanoid'
import type { ComponentChildren } from 'preact'
import type { Roadmap, Section, Task } from './types'
import { STATUS_COLOR, STATUS_LABEL, TASK_STATUSES } from './types'
import GanttChart from './components/GanttChart'
import TaskModal from './components/TaskModal'
import SectionModal from './components/SectionModal'
import RoadmapModal from './components/RoadmapModal'
import { api } from './api/client'
import { SSEManager } from './api/sse'

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'create-roadmap' }
  | { type: 'edit-roadmap' }
  | { type: 'add-section' }
  | { type: 'edit-section'; section: Section }
  | { type: 'add-task'; sectionId: string }
  | { type: 'edit-task'; task: Task }
  | null

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getSlugFromHash(): string | null {
  return window.location.hash.slice(1) || null
}

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultViewDates() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 30)
  const end = new Date(today)
  end.setMonth(end.getMonth() + 4)
  return { start: localISO(start), end: localISO(end) }
}

const sseManager = new SSEManager()

// ── Login screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: Event) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { status } = await api.post('/auth', { token })
    setLoading(false)
    if (status === 200) {
      onAuth()
    } else {
      setError('Invalid token. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-app-bg flex items-center justify-center p-4">
      <div className="bg-app-surface border border-app-border rounded-xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-xl font-bold text-white mb-1">Roadmap Maker</h1>
        <p className="text-[13px] text-gray-400 mb-6">Team mode — enter your access token</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="token"
              className="block text-[12px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide"
            >
              Access Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onInput={(e) => setToken(e.currentTarget.value)}
              placeholder="••••••••"
              className="w-full bg-app-bg border border-app-border rounded-lg px-3.5 py-2.5 text-[13px] text-app-text focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-red-400 text-[12px]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-violet-500 border-transparent text-white border rounded-lg px-3.5 py-2 text-[13px] font-medium cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main app ──────────────────────────────────────────────────────────────────

export default function AppTeam() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null) // null = checking
  const [roadmaps, setRoadmaps] = useState<Omit<Roadmap, 'sections'>[]>([])
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [viewStart, setViewStart] = useState(() => defaultViewDates().start)
  const [viewEnd, setViewEnd] = useState(() => defaultViewDates().end)

  // ── Auth check ──────────────────────────────────────────────────────────────

  useEffect(() => {
    api.get<{ ok: boolean }>('/me').then(({ status }) => {
      setAuthenticated(status === 200)
    })
  }, [])

  // ── Load roadmap list after auth ────────────────────────────────────────────

  const loadRoadmapList = useCallback(async () => {
    const { data } = await api.get<Omit<Roadmap, 'sections'>[]>('/roadmaps')
    if (!data) return
    setRoadmaps(data)
    // Auto-select from hash or first
    const slug = getSlugFromHash()
    const target = slug ? data.find((r) => r.slug === slug) : data[0]
    if (target && (!roadmap || roadmap.slug !== target.slug)) {
      loadRoadmap(target.slug)
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (authenticated) void loadRoadmapList()
  }, [authenticated])

  async function loadRoadmap(slug: string) {
    const { data } = await api.get<Roadmap>(`/roadmaps/${slug}`)
    if (!data) return
    setRoadmap(data)
    window.location.hash = '#' + slug
  }

  // ── SSE subscription ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!roadmap) return

    sseManager.connect(roadmap.slug)

    sseManager.on('init', (r) => setRoadmap(r))

    sseManager.on('roadmap_updated', (meta) => {
      setRoadmap((prev) => (prev ? { ...prev, ...meta } : prev))
      setRoadmaps((list) => list.map((r) => (r.id === meta.id ? { ...r, ...meta } : r)))
    })

    sseManager.on('roadmap_deleted', () => {
      setRoadmap(null)
      void loadRoadmapList()
    })

    sseManager.on('section_added', (section) => {
      setRoadmap((prev) => (prev ? { ...prev, sections: [...prev.sections, section] } : prev))
    })

    sseManager.on('section_updated', (section) => {
      setRoadmap((prev) =>
        prev
          ? { ...prev, sections: prev.sections.map((s) => (s.id === section.id ? section : s)) }
          : prev,
      )
    })

    sseManager.on('section_deleted', ({ id }) => {
      setRoadmap((prev) =>
        prev ? { ...prev, sections: prev.sections.filter((s) => s.id !== id) } : prev,
      )
    })

    sseManager.on('task_added', (task) => {
      setRoadmap((prev) =>
        prev
          ? {
              ...prev,
              sections: prev.sections.map((s) =>
                s.id === task.sectionId ? { ...s, tasks: [...s.tasks, task] } : s,
              ),
            }
          : prev,
      )
    })

    sseManager.on('task_updated', (task) => {
      setRoadmap((prev) =>
        prev
          ? {
              ...prev,
              sections: prev.sections.map((s) =>
                s.id === task.sectionId
                  ? { ...s, tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) }
                  : s,
              ),
            }
          : prev,
      )
    })

    sseManager.on('task_deleted', ({ id, sectionId }) => {
      setRoadmap((prev) =>
        prev
          ? {
              ...prev,
              sections: prev.sections.map((s) =>
                s.id === sectionId ? { ...s, tasks: s.tasks.filter((t) => t.id !== id) } : s,
              ),
            }
          : prev,
      )
    })

    return () => sseManager.disconnect()
  }, [roadmap?.slug]) // reconnect only when slug changes

  // ── Roadmap handlers ────────────────────────────────────────────────────────

  async function handleCreateRoadmap(data: {
    title: string
    subtitle?: string
    startDate: string
    endDate: string
    slug?: string
  }) {
    const slug = data.slug || slugify(data.title) || nanoid()
    const { data: created } = await api.post<Roadmap>('/roadmaps', { ...data, slug })
    if (!created) return
    setRoadmaps((list) => [...list, created])
    await loadRoadmap(created.slug)
    setModal(null)
  }

  async function handleUpdateRoadmap(data: {
    title: string
    subtitle?: string
    startDate: string
    endDate: string
    slug?: string
  }) {
    if (!roadmap) return
    const { status } = await api.put(`/roadmaps/${roadmap.slug}`, {
      ...data,
      version: roadmap.version ?? 1,
    })
    if (status === 409) return // SSE will update state
    setModal(null)
  }

  async function handleDeleteRoadmap() {
    if (!roadmap) return
    await api.delete(`/roadmaps/${roadmap.slug}`)
    setModal(null)
    // SSE roadmap_deleted event handles state cleanup
  }

  // ── Section handlers ────────────────────────────────────────────────────────

  async function handleAddSection(data: { label: string; color: string }) {
    if (!roadmap) return
    await api.post(`/roadmaps/${roadmap.slug}/sections`, data)
    setModal(null)
    // SSE section_added event updates state
  }

  async function handleUpdateSection(section: Section, data: { label: string; color: string }) {
    if (!roadmap) return
    const { status } = await api.put(`/roadmaps/${roadmap.slug}/sections/${section.id}`, {
      ...data,
      version: section.version ?? 1,
    })
    if (status === 409) return // SSE will update state
    setModal(null)
  }

  async function handleDeleteSection(section: Section) {
    if (!roadmap) return
    await api.delete(`/roadmaps/${roadmap.slug}/sections/${section.id}`)
    setModal(null)
    // SSE section_deleted event updates state
  }

  // ── Task handlers ───────────────────────────────────────────────────────────

  async function handleAddTask(
    sectionId: string,
    data: Omit<Task, 'id' | 'sectionId' | 'position'>,
  ) {
    if (!roadmap) return
    await api.post(`/roadmaps/${roadmap.slug}/sections/${sectionId}/tasks`, data)
    setModal(null)
    // SSE task_added event updates state
  }

  async function handleUpdateTask(task: Task, data: Omit<Task, 'id' | 'sectionId' | 'position'>) {
    if (!roadmap) return
    const { status } = await api.put(
      `/roadmaps/${roadmap.slug}/sections/${task.sectionId}/tasks/${task.id}`,
      { ...data, version: task.version ?? 1 },
    )
    if (status === 409) return // SSE will update state with server version
    setModal(null)
  }

  async function handleDeleteTask(task: Task) {
    if (!roadmap) return
    await api.delete(`/roadmaps/${roadmap.slug}/sections/${task.sectionId}/tasks/${task.id}`)
    setModal(null)
    // SSE task_deleted event updates state
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  function handleExport() {
    if (!roadmap) return
    const blob = new Blob([JSON.stringify(roadmap, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${roadmap.slug}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function handleExportPng() {
    if (!roadmap) return
    const outer = document.getElementById('main-chart')?.firstElementChild as HTMLElement | null
    if (!outer) return
    const scrollDiv = outer.querySelector<HTMLElement>(':scope > div')
    const prevOuter = outer.style.overflow
    const prevScroll = scrollDiv?.style.overflow ?? ''
    outer.style.overflow = 'visible'
    if (scrollDiv) scrollDiv.style.overflow = 'visible'
    const w = outer.scrollWidth
    const h = outer.scrollHeight
    try {
      const { toPng } = await import('html-to-image')
      const url = await toPng(outer, { pixelRatio: 2, width: w, height: h })
      const a = document.createElement('a')
      a.href = url
      a.download = `${roadmap.slug}-gantt.png`
      a.click()
    } finally {
      outer.style.overflow = prevOuter
      if (scrollDiv) scrollDiv.style.overflow = prevScroll
    }
  }

  function resetView() {
    const { start, end } = defaultViewDates()
    setViewStart(start)
    setViewEnd(end)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (authenticated === null) {
    return (
      <div className="fixed inset-0 bg-app-bg flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    )
  }

  if (!authenticated) {
    return <LoginScreen onAuth={() => setAuthenticated(true)} />
  }

  return (
    <>
      <a
        href="#main-chart"
        className="absolute left-4 top-4 -translate-y-20 focus:translate-y-0 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg z-50 transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to chart
      </a>
      <div className="px-6 pt-8 pb-20 min-h-screen">
        <main className="max-w-[1200px] mx-auto">
          {/* Top bar */}
          <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {roadmaps.length > 0 && (
                <>
                  <label htmlFor="roadmap-picker" className="sr-only">
                    Select roadmap
                  </label>
                  <select
                    id="roadmap-picker"
                    value={roadmap?.slug ?? ''}
                    onChange={(e) => {
                      void loadRoadmap(e.currentTarget.value)
                    }}
                    className="bg-app-surface border border-app-border rounded-lg text-app-text px-2.5 py-1.5 text-[13px] cursor-pointer"
                  >
                    {roadmaps.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {roadmap && (
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white mb-1">
                    {roadmap.title}
                  </h1>
                  {roadmap.subtitle && (
                    <div className="text-[13px] text-gray-500 font-mono">{roadmap.subtitle}</div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0 flex-wrap">
              {roadmap && (
                <>
                  <Btn
                    onClick={() => setModal({ type: 'add-section' })}
                    variant="secondary"
                    testId="btn-new-section"
                  >
                    + Section
                  </Btn>
                  <Btn onClick={() => setModal({ type: 'edit-roadmap' })} variant="ghost">
                    ⚙ Settings
                  </Btn>
                  <Btn onClick={handleExport} variant="ghost">
                    Export
                  </Btn>
                  <Btn onClick={handleExportPng} variant="ghost">
                    Export PNG
                  </Btn>
                </>
              )}
              <Btn
                onClick={() => setModal({ type: 'create-roadmap' })}
                variant="primary"
                testId="btn-new-roadmap"
              >
                + Roadmap
              </Btn>
            </div>
          </div>

          {/* Legend */}
          {roadmap && (
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 mb-6">
              {(['bar', 'milestone'] as const).map((type) =>
                TASK_STATUSES.map((status) => {
                  const color = STATUS_COLOR[status]
                  const isPending = status === 'pending'
                  const barBg = isPending
                    ? `repeating-linear-gradient(-45deg, ${color}55 0px, ${color}55 5px, ${color}aa 5px, ${color}aa 10px)`
                    : color
                  const barBorder = isPending ? `1.5px solid ${color}` : 'none'
                  const diamondBg = isPending ? 'transparent' : color
                  const diamondBorder = isPending ? `1.5px solid ${color}` : 'none'
                  return (
                    <div
                      key={`${type}-${status}`}
                      className="flex items-center gap-1.5 text-xs text-gray-300"
                    >
                      {type === 'milestone' ? (
                        <span
                          className="inline-block w-[9px] h-[9px] rounded-[1px] shrink-0"
                          style={{
                            background: diamondBg,
                            border: diamondBorder,
                            transform: 'rotate(45deg)',
                          }}
                        />
                      ) : (
                        <span
                          className="inline-block w-[18px] h-[9px] rounded-sm shrink-0"
                          style={{ background: barBg, border: barBorder }}
                        />
                      )}
                      {STATUS_LABEL[type][status]}
                    </div>
                  )
                }),
              )}
            </div>
          )}

          {/* View range controls */}
          {roadmap && (
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-300">
              <span aria-hidden="true">View</span>
              <label htmlFor="view-start" className="sr-only">
                View start date
              </label>
              <input
                id="view-start"
                type="date"
                value={viewStart}
                onChange={(e) => setViewStart(e.currentTarget.value)}
                style={{ colorScheme: 'dark' }}
              />
              <span aria-hidden="true">→</span>
              <label htmlFor="view-end" className="sr-only">
                View end date
              </label>
              <input
                id="view-end"
                type="date"
                value={viewEnd}
                onChange={(e) => setViewEnd(e.currentTarget.value)}
                style={{ colorScheme: 'dark' }}
              />
              <button
                onClick={resetView}
                className="bg-transparent border border-app-border rounded-md text-gray-500 px-2.5 py-1 text-[11px] cursor-pointer hover:text-app-text transition-colors"
              >
                Reset
              </button>
            </div>
          )}

          {/* Team mode indicator */}
          <div
            data-testid="team-indicator"
            className="flex items-center gap-1.5 mb-4 text-[11px] text-violet-400"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Team mode — changes sync in real-time
          </div>

          {/* Chart */}
          <div id="main-chart">
            {roadmap ? (
              <GanttChart
                roadmap={roadmap}
                viewStart={viewStart}
                viewEnd={viewEnd}
                onEditSection={(section) => setModal({ type: 'edit-section', section })}
                onAddTask={(sectionId) => setModal({ type: 'add-task', sectionId })}
                onEditTask={(task) => setModal({ type: 'edit-task', task })}
              />
            ) : (
              <TeamEmptyState onCreateRoadmap={() => setModal({ type: 'create-roadmap' })} />
            )}
          </div>
        </main>
        <footer className="mt-10 text-center text-[11px] text-gray-400">
          <a
            href="https://github.com/Slashgear/roadmap-maker"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm"
          >
            Github
          </a>
          {' · '}v{__APP_VERSION__}
          {' · '}
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-200 transition-colors"
          >
            API docs
          </a>
        </footer>
      </div>

      {/* Modals */}
      {modal?.type === 'create-roadmap' && (
        <RoadmapModal onSave={handleCreateRoadmap} onClose={() => setModal(null)} />
      )}

      {modal?.type === 'edit-roadmap' && roadmap && (
        <RoadmapModal
          roadmap={roadmap}
          onSave={handleUpdateRoadmap}
          onDelete={handleDeleteRoadmap}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'add-section' && (
        <SectionModal onSave={handleAddSection} onClose={() => setModal(null)} />
      )}

      {modal?.type === 'edit-section' && (
        <SectionModal
          section={modal.section}
          onSave={(data) => void handleUpdateSection(modal.section, data)}
          onDelete={() => void handleDeleteSection(modal.section)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'add-task' && roadmap && (
        <TaskModal
          sectionId={modal.sectionId}
          roadmap={roadmap}
          onSave={(data) => void handleAddTask(modal.sectionId, data)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'edit-task' && roadmap && (
        <TaskModal
          task={modal.task}
          sectionId={modal.task.sectionId}
          roadmap={roadmap}
          onSave={(data) => void handleUpdateTask(modal.task, data)}
          onDelete={() => void handleDeleteTask(modal.task)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

function Btn({
  children,
  onClick,
  variant = 'secondary',
  testId,
}: {
  children: ComponentChildren
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  testId?: string
}) {
  const variantClass = {
    primary: 'bg-violet-500 border-transparent text-white',
    secondary: 'bg-app-surface border-app-border text-app-text',
    ghost: 'bg-transparent border-app-border text-gray-300',
  }
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`${variantClass[variant]} border rounded-lg px-3.5 py-1.5 text-[13px] font-medium cursor-pointer whitespace-nowrap`}
    >
      {children}
    </button>
  )
}

function TeamEmptyState({ onCreateRoadmap }: { onCreateRoadmap: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center">
      <div style={{ fontSize: 44 }}>🗺️</div>
      <h2 className="text-3xl font-bold text-white mt-4 mb-3">Roadmap Maker</h2>
      <p className="text-gray-300 text-base max-w-md mx-auto mb-6">
        Team mode — create your first roadmap to get started.
      </p>
      <button
        onClick={onCreateRoadmap}
        className="bg-violet-500 border-none text-white rounded-lg px-6 py-2.5 text-sm font-semibold cursor-pointer"
      >
        + Create a roadmap
      </button>
    </div>
  )
}
