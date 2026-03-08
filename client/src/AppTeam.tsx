import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import { nanoid } from 'nanoid'
import type { ComponentChildren } from 'preact'
import type { Roadmap, Section, Task, ModalState } from './types'

type RoadmapEvent = {
  id: string
  roadmapId: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
}
import { STATUS_COLOR, STATUS_LABEL, TASK_STATUSES, getBarStyle, getDiamondStyle } from './types'
import { slugify, getSlugFromHash, defaultViewDates } from './lib/utils'
import { useExport } from './hooks/useExport'
import { DropdownItem, DropdownSeparator } from './components/Dropdown'
import GanttChart from './components/GanttChart'
import TaskModal from './components/TaskModal'
import SectionModal from './components/SectionModal'
import RoadmapModal from './components/RoadmapModal'
import { api } from './api/client'
import { SSEManager } from './api/sse'
import type { PresenceUser } from './api/sse'
import ViewRangeControls from './components/ViewRangeControls'

const sseManager = new SSEManager()

// ── Presence helpers ───────────────────────────────────────────────────────────

const PRESENCE_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#9333ea',
  '#16a34a',
  '#ea580c',
  '#db2777',
]

function presenceColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PRESENCE_COLORS[h % PRESENCE_COLORS.length]
}

// ── Login screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [token, setToken] = useState('')
  const [name, setName] = useState(() => localStorage.getItem('presence_name') ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: Event) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { status } = await api.post('/auth', { token })
    setLoading(false)
    if (status === 200) {
      localStorage.setItem('presence_name', name.trim() || 'Anonymous')
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
          <div>
            <label
              htmlFor="display-name"
              className="block text-[12px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide"
            >
              Display name <span className="normal-case font-normal text-gray-500">(optional)</span>
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="Your name"
              maxLength={32}
              className="w-full bg-app-bg border border-app-border rounded-lg px-3.5 py-2.5 text-[13px] text-app-text focus:outline-none focus:ring-2 focus:ring-violet-500"
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
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
  const [clientId] = useState(() => {
    let id = localStorage.getItem('presence_client_id')
    if (!id) {
      id = nanoid()
      localStorage.setItem('presence_client_id', id)
    }
    return id
  })
  const [viewStart, setViewStart] = useState(() => defaultViewDates().start)
  const [viewEnd, setViewEnd] = useState(() => defaultViewDates().end)
  const [importError, setImportError] = useState('')
  const [conflictNotice, setConflictNotice] = useState(false)
  const [sseConnected, setSseConnected] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)
  const { isExporting, handleExport, handleExportPng, handleExportSvg } = useExport(roadmap)
  const [roadmapSearch, setRoadmapSearch] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyEvents, setHistoryEvents] = useState<RoadmapEvent[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    function onMouse(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [moreOpen])

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

  async function openHistory() {
    if (!roadmap) return
    const { data } = await api.get<RoadmapEvent[]>(`/roadmaps/${roadmap.slug}/history`)
    setHistoryEvents(data ?? [])
    setHistoryOpen(true)
  }

  // ── SSE subscription ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!roadmap) return

    const name = localStorage.getItem('presence_name') || 'Anonymous'
    const color = presenceColor(clientId)
    sseManager.onError = () => setSseConnected(false)
    sseManager.onOpen = () => setSseConnected(true)
    sseManager.connect(roadmap.slug, { clientId, name, color })

    sseManager.on('presence_updated', ({ users }) => setPresenceUsers(users))
    sseManager.on('init', (r) => {
      setRoadmap(r)
      setSseConnected(true)
    })

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

    sseManager.on('sections_reordered', ({ ids }) => {
      setRoadmap((prev) => {
        if (!prev) return prev
        const map = new Map(prev.sections.map((s) => [s.id, s]))
        const reordered = ids.flatMap((id) => (map.has(id) ? [{ ...map.get(id)! }] : []))
        return { ...prev, sections: reordered }
      })
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

    return () => {
      sseManager.disconnect()
      setPresenceUsers([])
    }
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
    setModal(null)
    if (status === 409) setConflictNotice(true)
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
    setModal(null)
    if (status === 409) setConflictNotice(true)
  }

  async function handleDeleteSection(section: Section) {
    if (!roadmap) return
    await api.delete(`/roadmaps/${roadmap.slug}/sections/${section.id}`)
    setModal(null)
    // SSE section_deleted event updates state
  }

  async function handleMoveSection(sectionId: string, direction: 'up' | 'down') {
    if (!roadmap) return
    const sections = [...roadmap.sections]
    const idx = sections.findIndex((s) => s.id === sectionId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sections.length) return
    ;[sections[idx], sections[swapIdx]] = [sections[swapIdx], sections[idx]]
    await api.put(`/roadmaps/${roadmap.slug}/sections/reorder`, { ids: sections.map((s) => s.id) })
    // SSE sections_reordered event updates state
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
    setModal(null)
    if (status === 409) setConflictNotice(true)
  }

  async function handleDeleteTask(task: Task) {
    if (!roadmap) return
    await api.delete(`/roadmaps/${roadmap.slug}/sections/${task.sectionId}/tasks/${task.id}`)
    setModal(null)
    // SSE task_deleted event updates state
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImport(file: File) {
    setImportError('')
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const { RoadmapSchema } = await import('./schemas')
      const result = RoadmapSchema.safeParse(json)
      if (!result.success) {
        console.error('[import] Validation failed:', result.error.issues)
        setImportError(
          'Invalid roadmap file — make sure it was exported from roadmap-maker and has not been manually edited.',
        )
        return
      }
      const imported = result.data as Roadmap
      const { data: created } = await api.post<Roadmap>('/roadmaps', {
        title: imported.title,
        subtitle: imported.subtitle ?? null,
        startDate: imported.startDate,
        endDate: imported.endDate,
        slug: imported.slug,
      })
      if (!created) {
        setImportError('Failed to create roadmap. The slug may already exist.')
        return
      }
      for (const section of imported.sections) {
        const { data: createdSection } = await api.post<Section>(
          `/roadmaps/${created.slug}/sections`,
          { label: section.label, color: section.color },
        )
        if (!createdSection) continue
        for (const task of section.tasks) {
          await api.post(`/roadmaps/${created.slug}/sections/${createdSection.id}/tasks`, {
            label: task.label,
            startDate: task.startDate,
            endDate: task.endDate,
            status: task.status,
            type: task.type,
            note: task.note ?? null,
            externalLink: task.externalLink ?? null,
          })
        }
      }
      setRoadmaps((list) => [...list, created])
      await loadRoadmap(created.slug)
    } catch {
      setImportError('Failed to parse JSON file')
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
      <a
        href="#view-range-controls"
        className="absolute left-40 top-4 -translate-y-20 focus:translate-y-0 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg z-50 transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to date range
      </a>
      <div className="px-3 pt-6 pb-20 min-h-screen sm:px-6 sm:pt-8">
        <main className="max-w-[1200px] mx-auto">
          {/* Top bar */}
          <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {roadmaps.length > 0 && (
                <>
                  {roadmaps.length > 5 && (
                    <input
                      type="search"
                      placeholder="Search roadmaps…"
                      value={roadmapSearch}
                      onInput={(e) => setRoadmapSearch(e.currentTarget.value)}
                      className="bg-app-surface border border-app-border rounded-lg text-app-text px-2.5 py-1.5 text-[13px] w-40 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  )}
                  <label htmlFor="roadmap-picker" className="sr-only">
                    Select roadmap
                  </label>
                  <select
                    id="roadmap-picker"
                    value={roadmap?.slug ?? ''}
                    onChange={(e) => {
                      void loadRoadmap(e.currentTarget.value)
                      setRoadmapSearch('')
                    }}
                    className="bg-app-surface border border-app-border rounded-lg text-app-text px-2.5 py-1.5 text-[13px] cursor-pointer"
                  >
                    {roadmaps
                      .filter((r) =>
                        roadmapSearch
                          ? r.title.toLowerCase().includes(roadmapSearch.toLowerCase())
                          : true,
                      )
                      .map((r) => (
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
                <Btn
                  onClick={() => setModal({ type: 'add-section' })}
                  variant="secondary"
                  testId="btn-new-section"
                >
                  + Section
                </Btn>
              )}

              {/* Unified dropdown */}
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setMoreOpen((o) => !o)}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  aria-label="More actions"
                  className="border border-app-border bg-transparent text-gray-300 rounded-lg px-3.5 py-1.5 text-[13px] font-medium cursor-pointer whitespace-nowrap hover:text-app-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  ···
                </button>
                {moreOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 bg-app-surface border border-app-border rounded-lg shadow-xl z-50 py-1 min-w-[200px]"
                  >
                    {roadmap && (
                      <>
                        <DropdownItem
                          onClick={() => {
                            setMoreOpen(false)
                            setModal({ type: 'edit-roadmap' })
                          }}
                        >
                          Settings
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => {
                            setMoreOpen(false)
                            void openHistory()
                          }}
                        >
                          History
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem
                          onClick={() => {
                            setMoreOpen(false)
                            handleExport()
                          }}
                        >
                          Export JSON
                        </DropdownItem>
                        <DropdownItem
                          disabled={isExporting}
                          onClick={() => {
                            setMoreOpen(false)
                            void handleExportPng()
                          }}
                        >
                          {isExporting ? 'Exporting…' : 'Export PNG'}
                        </DropdownItem>
                        <DropdownItem
                          disabled={isExporting}
                          onClick={() => {
                            setMoreOpen(false)
                            void handleExportSvg()
                          }}
                        >
                          {isExporting ? 'Exporting…' : 'Export SVG'}
                        </DropdownItem>
                        <DropdownSeparator />
                      </>
                    )}
                    <DropdownItem
                      onClick={() => {
                        setMoreOpen(false)
                        fileInputRef.current?.click()
                      }}
                    >
                      Import JSON
                    </DropdownItem>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0]
                  if (file) void handleImport(file)
                  e.currentTarget.value = ''
                }}
              />
              <Btn
                onClick={() => setModal({ type: 'create-roadmap' })}
                variant="primary"
                testId="btn-new-roadmap"
              >
                + Roadmap
              </Btn>
            </div>
          </div>

          {/* Import error */}
          {importError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
              {importError}
              <button
                onClick={() => setImportError('')}
                className="ml-auto cursor-pointer bg-transparent border-none text-red-400 hover:text-red-200"
              >
                ✕
              </button>
            </div>
          )}

          {/* Legend */}
          {roadmap && (
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 mb-6">
              {(['bar', 'milestone'] as const).map((type) =>
                TASK_STATUSES.map((status) => {
                  const color = STATUS_COLOR[status]
                  const { background: barBg, border: barBorder } = getBarStyle(status, color)
                  const { background: diamondBg, border: diamondBorder } = getDiamondStyle(
                    status,
                    color,
                  )
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
            <ViewRangeControls
              viewStart={viewStart}
              viewEnd={viewEnd}
              onStartChange={setViewStart}
              onEndChange={setViewEnd}
              onReset={resetView}
            />
          )}

          {/* SSE reconnecting notice */}
          {!sseConnected && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3.5 py-2.5 text-[13px] text-yellow-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
              Connection lost — reconnecting…
            </div>
          )}

          {/* Conflict notice */}
          {conflictNotice && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-amber-400">
              Your changes conflicted with another edit — the latest version has been loaded.
              <button
                onClick={() => setConflictNotice(false)}
                className="ml-auto cursor-pointer bg-transparent border-none text-amber-400 hover:text-amber-200"
              >
                ✕
              </button>
            </div>
          )}

          {/* Team mode indicator + presence */}
          <div data-testid="team-indicator" className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-[11px] text-violet-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Team mode — changes sync in real-time
            </div>
            {presenceUsers.length > 0 && (
              <PresenceAvatars users={presenceUsers} currentClientId={clientId} />
            )}
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
                onMoveSection={handleMoveSection}
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

      {historyOpen && <HistoryPanel events={historyEvents} onClose={() => setHistoryOpen(false)} />}
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

function PresenceAvatars({
  users,
  currentClientId,
}: {
  users: PresenceUser[]
  currentClientId: string
}) {
  const MAX_VISIBLE = 4
  const visible = users.slice(0, MAX_VISIBLE)
  const overflow = users.length - MAX_VISIBLE

  return (
    <div
      className="flex items-center gap-2"
      aria-label={`${users.length} user${users.length > 1 ? 's' : ''} online`}
    >
      <span className="text-[11px] text-gray-500">{users.length} online</span>
      <div className="flex -space-x-1.5">
        {visible.map((u) => {
          const isMe = u.id === currentClientId
          return (
            <div
              key={u.id}
              title={isMe ? `${u.name} (you)` : u.name}
              aria-label={isMe ? `${u.name} (you)` : u.name}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 select-none"
              style={{
                background: u.color,
                boxShadow: isMe ? `0 0 0 2px #1e1e2e, 0 0 0 3.5px ${u.color}` : '0 0 0 2px #1e1e2e',
              }}
            >
              {u.name.slice(0, 2).toUpperCase()}
            </div>
          )
        })}
        {overflow > 0 && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gray-600 select-none"
            style={{ boxShadow: '0 0 0 2px #1e1e2e' }}
            title={`${overflow} more`}
            aria-label={`${overflow} more users`}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  )
}

const EVENT_LABELS: Record<string, string> = {
  roadmap_created: 'Roadmap created',
  roadmap_updated: 'Roadmap updated',
  roadmap_deleted: 'Roadmap deleted',
  section_added: 'Section added',
  section_updated: 'Section updated',
  section_deleted: 'Section deleted',
  task_added: 'Task added',
  task_updated: 'Task updated',
  task_deleted: 'Task deleted',
}

function eventDescription(event: RoadmapEvent): string {
  const label = EVENT_LABELS[event.type] ?? event.type
  const name =
    (event.payload.label as string | undefined) ?? (event.payload.title as string | undefined)
  return name ? `${label}: "${name}"` : label
}

function HistoryPanel({ events, onClose }: { events: RoadmapEvent[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden="true" />
      {/* Panel */}
      <div className="w-full max-w-sm bg-app-surface border-l border-app-border flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <h2 className="text-[14px] font-semibold text-white">Modification history</h2>
          <button
            onClick={onClose}
            aria-label="Close history"
            className="text-gray-400 hover:text-white bg-transparent border-none cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-gray-500 text-[13px] text-center py-10">No events recorded yet.</p>
          ) : (
            <ul className="divide-y divide-app-border">
              {events.map((ev) => (
                <li key={ev.id} className="px-5 py-3">
                  <p className="text-[13px] text-app-text">{eventDescription(ev)}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {new Date(ev.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
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
