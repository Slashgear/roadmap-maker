import { useState, useRef, useEffect } from 'preact/hooks'
import { nanoid } from 'nanoid'
import type { ComponentChildren } from 'preact'
import type { Roadmap, Section, Task, ModalState } from './types'
import { STATUS_COLOR, STATUS_LABEL, TASK_STATUSES, getBarStyle, getDiamondStyle } from './types'
import { slugify, getSlugFromHash, defaultViewDates } from './lib/utils'
import { useExport } from './hooks/useExport'
import { DropdownItem, DropdownSeparator } from './components/Dropdown'
const EXAMPLES: Array<{ slug: string; title: string; subtitle: string | null }> = [
  { slug: 'design-system', title: 'Design System 2.0', subtitle: 'May → Nov 2026' },
  { slug: 'saas-launch', title: 'SaaS Launch', subtitle: 'Mar → Aug 2026' },
  { slug: 'mobile-app', title: 'Mobile App v1.0', subtitle: 'Apr → Oct 2026' },
]

async function loadExample(slug: string): Promise<unknown> {
  switch (slug) {
    case 'design-system':
      return (await import('../../examples/design-system.json')).default
    case 'saas-launch':
      return (await import('../../examples/saas-launch.json')).default
    default:
      return (await import('../../examples/mobile-app.json')).default
  }
}
import GanttChart from './components/GanttChart'
import TaskModal from './components/TaskModal'
import SectionModal from './components/SectionModal'
import RoadmapModal from './components/RoadmapModal'
import ViewRangeControls from './components/ViewRangeControls'
import { getSharedParam, decodeSharedRoadmap, buildShareUrl } from './shareUrl'

const STORAGE_KEY = 'roadmap-maker:roadmaps'

function load(): Roadmap[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Roadmap[]
  } catch {
    return []
  }
}

function save(roadmaps: Roadmap[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmaps))
}

export default function App() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>(() => {
    const list = load()
    const slug = getSlugFromHash()
    if (slug) {
      const found = list.find((r) => r.slug === slug)
      if (found) return list
    }
    return list
  })

  const [roadmap, setRoadmap] = useState<Roadmap | null>(() => {
    const list = load()
    const slug = getSlugFromHash()
    if (slug) {
      const found = list.find((r) => r.slug === slug)
      if (found) return found
    }
    return list[0] ?? null
  })

  const [modal, setModal] = useState<ModalState>(null)
  const [viewStart, setViewStart] = useState(() => defaultViewDates().start)
  const [viewEnd, setViewEnd] = useState(() => defaultViewDates().end)
  const [importError, setImportError] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [copyDone, setCopyDone] = useState(false)
  const { isExporting, handleExport, handleExportPng, handleExportSvg } = useExport(roadmap)
  const [roadmapSearch, setRoadmapSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  type HistoryEntry = { roadmaps: Roadmap[]; roadmap: Roadmap | null }
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const canUndo = past.length > 0
  const canRedo = future.length > 0

  useEffect(() => {
    if (!moreOpen) return
    function onMouseDown(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [moreOpen])

  const MAX_HISTORY = 50

  function updateRoadmaps(updated: Roadmap[], active: Roadmap | null) {
    setPast((prev) => {
      const next = [...prev, { roadmaps, roadmap }]
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
    })
    setFuture([])
    save(updated)
    setRoadmaps(updated)
    setRoadmap(active)
    if (active) window.location.hash = '#' + active.slug
  }

  function undo() {
    if (past.length === 0) return
    const prev = past[past.length - 1]
    setPast((p) => p.slice(0, -1))
    setFuture((f) => [{ roadmaps, roadmap }, ...f])
    save(prev.roadmaps)
    setRoadmaps(prev.roadmaps)
    setRoadmap(prev.roadmap)
    window.location.hash = prev.roadmap ? '#' + prev.roadmap.slug : ''
  }

  function redo() {
    if (future.length === 0) return
    const next = future[0]
    setFuture((f) => f.slice(1))
    setPast((p) => [...p, { roadmaps, roadmap }])
    save(next.roadmaps)
    setRoadmaps(next.roadmaps)
    setRoadmap(next.roadmap)
    window.location.hash = next.roadmap ? '#' + next.roadmap.slug : ''
  }

  // Keyboard shortcuts for undo/redo — stable handler via refs
  const undoRef = useRef(undo)
  const redoRef = useRef(redo)
  undoRef.current = undo
  redoRef.current = redo

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        undoRef.current()
      }
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault()
        redoRef.current()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function resetView() {
    const { start, end } = defaultViewDates()
    setViewStart(start)
    setViewEnd(end)
  }

  // ── Shared URL import ─────────────────────────────────────────────────────

  useEffect(() => {
    const param = getSharedParam()
    if (!param) return
    void decodeSharedRoadmap(param).then((imported) => {
      if (!imported) return
      setRoadmaps((prev) => {
        const without = prev.filter((r) => r.slug !== imported.slug)
        const updated = [...without, imported]
        save(updated)
        return updated
      })
      setRoadmap(imported)
      const url = new URL(window.location.href)
      url.search = ''
      url.hash = '#' + imported.slug
      window.history.replaceState({}, '', url.toString())
    })
  }, [])

  async function handleCopyLink() {
    if (!roadmap) return
    const url = await buildShareUrl(roadmap)
    await navigator.clipboard.writeText(url)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }

  // ── Roadmap handlers ──────────────────────────────────────────────────────

  function handleCreateRoadmap(data: {
    title: string
    subtitle?: string
    startDate: string
    endDate: string
    slug?: string
  }) {
    const id = nanoid()
    const slug = data.slug || slugify(data.title) || id
    const created: Roadmap = {
      id,
      slug,
      title: data.title,
      subtitle: data.subtitle ?? null,
      startDate: data.startDate,
      endDate: data.endDate,
      sections: [],
    }
    const updated = [...roadmaps, created]
    updateRoadmaps(updated, created)
    setModal(null)
  }

  function handleUpdateRoadmap(data: {
    title: string
    subtitle?: string
    startDate: string
    endDate: string
    slug?: string
  }) {
    if (!roadmap) return
    const updated: Roadmap = {
      ...roadmap,
      title: data.title,
      subtitle: data.subtitle ?? null,
      startDate: data.startDate,
      endDate: data.endDate,
      slug: data.slug || roadmap.slug,
    }
    const updatedList = roadmaps.map((r) => (r.id === roadmap.id ? updated : r))
    updateRoadmaps(updatedList, updated)
    setModal(null)
  }

  function handleDeleteRoadmap() {
    if (!roadmap) return
    const updatedList = roadmaps.filter((r) => r.id !== roadmap.id)
    const next = updatedList[0] ?? null
    updateRoadmaps(updatedList, next)
    setModal(null)
  }

  // ── Section handlers ──────────────────────────────────────────────────────

  function handleAddSection(data: { label: string; color: string }) {
    if (!roadmap) return
    const section: Section = {
      id: nanoid(),
      roadmapId: roadmap.id,
      label: data.label,
      color: data.color as Section['color'],
      position: roadmap.sections.length,
      tasks: [],
    }
    const updated: Roadmap = { ...roadmap, sections: [...roadmap.sections, section] }
    const updatedList = roadmaps.map((r) => (r.id === roadmap.id ? updated : r))
    updateRoadmaps(updatedList, updated)
    setModal(null)
  }

  function handleUpdateSection(section: Section, data: { label: string; color: string }) {
    if (!roadmap) return
    const updatedSection: Section = {
      ...section,
      label: data.label,
      color: data.color as Section['color'],
    }
    const updated: Roadmap = {
      ...roadmap,
      sections: roadmap.sections.map((s) => (s.id === section.id ? updatedSection : s)),
    }
    const updatedList = roadmaps.map((r) => (r.id === roadmap.id ? updated : r))
    updateRoadmaps(updatedList, updated)
    setModal(null)
  }

  function handleDeleteSection(section: Section) {
    if (!roadmap) return
    const updated: Roadmap = {
      ...roadmap,
      sections: roadmap.sections.filter((s) => s.id !== section.id),
    }
    const updatedList = roadmaps.map((r) => (r.id === roadmap.id ? updated : r))
    updateRoadmaps(updatedList, updated)
    setModal(null)
  }

  function handleMoveSection(sectionId: string, direction: 'up' | 'down') {
    if (!roadmap) return
    const sections = [...roadmap.sections]
    const idx = sections.findIndex((s) => s.id === sectionId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sections.length) return
    ;[sections[idx], sections[swapIdx]] = [sections[swapIdx], sections[idx]]
    const reordered = sections.map((s, i) => ({ ...s, position: i }))
    const updated: Roadmap = { ...roadmap, sections: reordered }
    updateRoadmaps(
      roadmaps.map((r) => (r.id === roadmap.id ? updated : r)),
      updated,
    )
  }

  // ── Task handlers ─────────────────────────────────────────────────────────

  function sortedByStartDate(tasks: Task[]): Task[] {
    return tasks
      .toSorted((a, b) => a.startDate.localeCompare(b.startDate))
      .map((t, i) => ({ ...t, position: i }))
  }

  function handleAddTask(sectionId: string, data: Omit<Task, 'id' | 'sectionId' | 'position'>) {
    if (!roadmap) return
    const task: Task = {
      id: nanoid(),
      sectionId,
      position: roadmap.sections.find((s) => s.id === sectionId)?.tasks.length ?? 0,
      ...data,
    }
    const updated: Roadmap = {
      ...roadmap,
      sections: roadmap.sections.map((s) =>
        s.id === sectionId ? { ...s, tasks: sortedByStartDate([...s.tasks, task]) } : s,
      ),
    }
    const updatedList = roadmaps.map((r) => (r.id === roadmap.id ? updated : r))
    updateRoadmaps(updatedList, updated)
    setModal(null)
  }

  function handleUpdateTask(task: Task, data: Omit<Task, 'id' | 'sectionId' | 'position'>) {
    if (!roadmap) return
    const updatedTask: Task = { ...task, ...data }
    const updated: Roadmap = {
      ...roadmap,
      sections: roadmap.sections.map((s) =>
        s.id === task.sectionId
          ? {
              ...s,
              tasks: sortedByStartDate(s.tasks.map((t) => (t.id === task.id ? updatedTask : t))),
            }
          : s,
      ),
    }
    const updatedList = roadmaps.map((r) => (r.id === roadmap.id ? updated : r))
    updateRoadmaps(updatedList, updated)
    setModal(null)
  }

  function handleMoveTask(task: Task, updates: { startDate: string; endDate: string }) {
    if (!roadmap) return
    const updatedTask: Task = { ...task, ...updates }
    const updated: Roadmap = {
      ...roadmap,
      sections: roadmap.sections.map((s) =>
        s.id === task.sectionId
          ? { ...s, tasks: sortedByStartDate(s.tasks.map((t) => (t.id === task.id ? updatedTask : t))) }
          : s,
      ),
    }
    updateRoadmaps(roadmaps.map((r) => (r.id === roadmap.id ? updated : r)), updated)
  }

  function handleDeleteTask(task: Task) {
    if (!roadmap) return
    const updated: Roadmap = {
      ...roadmap,
      sections: roadmap.sections.map((s) =>
        s.id === task.sectionId ? { ...s, tasks: s.tasks.filter((t) => t.id !== task.id) } : s,
      ),
    }
    const updatedList = roadmaps.map((r) => (r.id === roadmap.id ? updated : r))
    updateRoadmaps(updatedList, updated)
    setModal(null)
  }

  // ── Import / Export ───────────────────────────────────────────────────────

  async function handleImport(file: File) {
    setImportError('')
    try {
      const json = JSON.parse(await file.text())
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
      const without = roadmaps.filter((r) => r.slug !== imported.slug)
      updateRoadmaps([...without, imported], imported)
    } catch {
      setImportError('Failed to parse JSON file')
    }
  }

  async function handleLoadExample(slug: string) {
    setImportError('')
    const [data, { RoadmapSchema }] = await Promise.all([loadExample(slug), import('./schemas')])
    const result = RoadmapSchema.safeParse(data)
    if (!result.success) return
    const imported = result.data as Roadmap
    const without = roadmaps.filter((r) => r.slug !== imported.slug)
    updateRoadmaps([...without, imported], imported)
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
              {/* Roadmap picker */}
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
                      const r = roadmaps.find((r) => r.slug === e.currentTarget.value)
                      if (r) {
                        setRoadmap(r)
                        window.location.hash = '#' + r.slug
                        setRoadmapSearch('')
                      }
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
            <div className="flex items-center gap-2 shrink-0">
              {/* Undo / Redo */}
              {roadmap && (
                <>
                  <Btn onClick={undo} variant="ghost" disabled={!canUndo} title="Ctrl+Z">
                    <span aria-hidden="true">↺</span> Undo
                  </Btn>
                  <Btn onClick={redo} variant="ghost" disabled={!canRedo} title="Ctrl+Y">
                    <span aria-hidden="true">↻</span> Redo
                  </Btn>
                </>
              )}

              {/* + Section */}
              {roadmap && (
                <Btn onClick={() => setModal({ type: 'add-section' })} variant="secondary">
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
                            void handleCopyLink()
                          }}
                        >
                          {copyDone ? 'Copied!' : 'Copy link'}
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
                    <DropdownSeparator />
                    <div className="px-4 py-1.5 text-[11px] text-gray-500 uppercase tracking-wide font-semibold select-none">
                      Examples
                    </div>
                    {EXAMPLES.map((ex) => (
                      <DropdownItem
                        key={ex.slug}
                        onClick={() => {
                          setMoreOpen(false)
                          void handleLoadExample(ex.slug)
                        }}
                      >
                        <span className="font-medium">{ex.title}</span>
                        {ex.subtitle && (
                          <span className="text-[11px] text-gray-400 mt-0.5">{ex.subtitle}</span>
                        )}
                      </DropdownItem>
                    ))}
                  </div>
                )}
              </div>

              <Btn onClick={() => setModal({ type: 'create-roadmap' })} variant="primary">
                + Roadmap
              </Btn>
            </div>
          </div>

          {/* Import error */}
          {importError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-[13px] px-3.5 py-2.5 mb-4 flex justify-between items-center">
              {importError}
              <button
                onClick={() => setImportError('')}
                className="bg-transparent border-none text-red-500 cursor-pointer text-base leading-none px-1"
              >
                ×
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              if (file) void handleImport(file)
              e.currentTarget.value = ''
            }}
          />

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
                onUpdateTask={handleMoveTask}
                onMoveSection={handleMoveSection}
              />
            ) : (
              <EmptyState
                onCreateRoadmap={() => setModal({ type: 'create-roadmap' })}
                onLoadExample={handleLoadExample}
              />
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
          onSave={(data) => handleUpdateSection(modal.section, data)}
          onDelete={() => handleDeleteSection(modal.section)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'add-task' && roadmap && (
        <TaskModal
          sectionId={modal.sectionId}
          onSave={(data) => handleAddTask(modal.sectionId, data)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'edit-task' && roadmap && (
        <TaskModal
          task={modal.task}
          sectionId={modal.task.sectionId}
          onSave={(data) => handleUpdateTask(modal.task, data)}
          onDelete={() => handleDeleteTask(modal.task)}
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
  disabled = false,
  'aria-label': ariaLabel,
  title,
}: {
  children: ComponentChildren
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  'aria-label'?: string
  title?: string
}) {
  const variantClass = {
    primary: 'bg-violet-500 border-transparent text-white',
    secondary: 'bg-app-surface border-app-border text-app-text',
    ghost: 'bg-transparent border-app-border text-gray-300',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`${variantClass[variant]} border rounded-lg px-3.5 py-1.5 text-[13px] font-medium cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}
    >
      {children}
    </button>
  )
}

function EmptyState({
  onCreateRoadmap,
  onLoadExample,
}: {
  onCreateRoadmap: () => void
  onLoadExample: (slug: string) => Promise<void>
}) {
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center">
      <div style={{ fontSize: 44 }}>🗺️</div>
      <h2 className="text-3xl font-bold text-white mt-4 mb-3">Roadmap Maker</h2>
      <p className="text-gray-300 text-base max-w-md mx-auto mb-6">
        Build clear Gantt timelines for your projects. Plan, share and export — entirely in your
        browser.
      </p>
      <button
        onClick={onCreateRoadmap}
        className="bg-violet-500 border-none text-white rounded-lg px-6 py-2.5 text-sm font-semibold cursor-pointer"
      >
        + Create a roadmap
      </button>

      <section className="mt-14 max-w-2xl w-full mx-auto">
        <h3 className="text-base font-semibold text-white mb-5">Why use this tool?</h3>
        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="bg-white/5 rounded-lg p-4 border border-violet-500/20">
            <h4 className="font-medium text-violet-200 mb-1.5">No account, no server</h4>
            <p className="text-sm text-gray-400">
              Everything is stored locally in your browser. No signup, no backend, no data sent
              anywhere. Need team collaboration?{' '}
              <a
                href="https://github.com/Slashgear/roadmap-maker#team-mode"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-300 hover:text-violet-100 underline"
              >
                Try the team mode.
              </a>
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-violet-500/20">
            <h4 className="font-medium text-violet-200 mb-1.5">
              Free, open-source &amp; self-hostable
            </h4>
            <p className="text-sm text-gray-400">
              No premium tier, no limits.{' '}
              <a
                href="https://github.com/Slashgear/roadmap-maker/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-300 hover:text-violet-100 underline"
              >
                MIT licensed
              </a>
              , deployable with a single Docker image.
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-violet-500/20">
            <h4 className="font-medium text-violet-200 mb-1.5">Export as PNG</h4>
            <p className="text-sm text-gray-400">
              Download your Gantt chart as a high-resolution image, ready to paste into any doc or
              presentation.
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-violet-500/20">
            <h4 className="font-medium text-violet-200 mb-1.5">Privacy-first, hosted in Europe</h4>
            <p className="text-sm text-gray-400">
              No tracking, no analytics, no data sold. This instance runs on{' '}
              <a
                href="https://www.scaleway.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-300 hover:text-violet-100 underline"
              >
                Scaleway
              </a>{' '}
              servers in Europe.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3 w-full max-w-2xl mt-10">
        <div className="flex-1 h-px bg-app-border" />
        <span className="text-[12px] text-gray-500">or try an example</span>
        <div className="flex-1 h-px bg-app-border" />
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-2xl mt-4">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.slug}
            onClick={() => void onLoadExample(ex.slug)}
            className="bg-app-surface border border-app-border rounded-lg p-3 text-left cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <div className="text-[13px] font-medium text-white">{ex.title}</div>
            {ex.subtitle && <div className="text-[11px] text-gray-400 mt-0.5">{ex.subtitle}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}
