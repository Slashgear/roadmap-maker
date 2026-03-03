import { useState, useRef, useEffect } from 'preact/hooks'
import { nanoid } from 'nanoid'
import { Temporal } from 'temporal-polyfill'
import type { ComponentChildren } from 'preact'
import type { Roadmap, Section, Task } from './types'
import { STATUS_COLOR, STATUS_LABEL, TASK_STATUSES } from './types'
import { RoadmapSchema } from './schemas'
import designSystem from '../../examples/design-system.json'
import saasLaunch from '../../examples/saas-launch.json'
import mobileApp from '../../examples/mobile-app.json'

const EXAMPLES: Array<{ slug: string; title: string; subtitle: string | null }> = [
  designSystem,
  saasLaunch,
  mobileApp,
]
import GanttChart from './components/GanttChart'
import TaskModal from './components/TaskModal'
import SectionModal from './components/SectionModal'
import RoadmapModal from './components/RoadmapModal'

type ModalState =
  | { type: 'create-roadmap' }
  | { type: 'edit-roadmap' }
  | { type: 'add-section' }
  | { type: 'edit-section'; section: Section }
  | { type: 'add-task'; sectionId: string }
  | { type: 'edit-task'; task: Task }
  | null

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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getSlugFromHash(): string | null {
  return window.location.hash.slice(1) || null
}

function defaultViewDates() {
  const today = Temporal.Now.plainDateISO()
  return {
    start: today.subtract({ days: 30 }).toString(),
    end: today.add({ months: 4 }).toString(),
  }
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
  const [examplesOpen, setExamplesOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const examplesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!examplesOpen) return
    function handler(e: MouseEvent) {
      if (examplesRef.current && !examplesRef.current.contains(e.target as Node)) {
        setExamplesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [examplesOpen])

  function updateRoadmaps(updated: Roadmap[], active: Roadmap | null) {
    save(updated)
    setRoadmaps(updated)
    setRoadmap(active)
    if (active) {
      window.location.hash = '#' + active.slug
    }
  }

  function resetView() {
    const { start, end } = defaultViewDates()
    setViewStart(start)
    setViewEnd(end)
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

  function importRoadmapData(json: unknown): boolean {
    const result = RoadmapSchema.safeParse(json)
    if (!result.success) {
      setImportError('Invalid roadmap file: ' + result.error.issues[0]?.message)
      return false
    }
    const imported = result.data as Roadmap
    const without = roadmaps.filter((r) => r.slug !== imported.slug)
    updateRoadmaps([...without, imported], imported)
    return true
  }

  async function handleImport(file: File) {
    setImportError('')
    try {
      importRoadmapData(JSON.parse(await file.text()))
    } catch {
      setImportError('Failed to parse JSON file')
    }
  }

  function handleLoadExample(data: unknown) {
    setImportError('')
    importRoadmapData(data)
    setExamplesOpen(false)
  }

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

  // ── Render ────────────────────────────────────────────────────────────────

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
              {/* Roadmap picker */}
              {roadmaps.length > 0 && (
                <>
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
                      }
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
                  <Btn onClick={() => setModal({ type: 'add-section' })} variant="secondary">
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
              <Btn onClick={() => fileInputRef.current?.click()} variant="ghost">
                Import
              </Btn>
              <div ref={examplesRef} className="relative">
                <Btn onClick={() => setExamplesOpen((o) => !o)} variant="ghost">
                  Examples
                </Btn>
                {examplesOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-app-surface border border-app-border rounded-lg shadow-xl z-50 overflow-hidden min-w-[220px]">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex.slug}
                        onClick={() => handleLoadExample(ex)}
                        className="w-full text-left px-4 py-3 text-[13px] text-app-text hover:bg-white/5 border-b border-app-border last:border-0 cursor-pointer bg-transparent"
                      >
                        <div className="font-medium">{ex.title}</div>
                        {ex.subtitle && (
                          <div className="text-[11px] text-gray-400 mt-0.5">{ex.subtitle}</div>
                        )}
                      </button>
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
              if (file) handleImport(file)
              e.currentTarget.value = ''
            }}
          />

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
              <EmptyState
                onCreateRoadmap={() => setModal({ type: 'create-roadmap' })}
                onLoadExample={handleLoadExample}
              />
            )}
          </div>
        </main>
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
          roadmap={roadmap}
          onSave={(data) => handleAddTask(modal.sectionId, data)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'edit-task' && roadmap && (
        <TaskModal
          task={modal.task}
          sectionId={modal.task.sectionId}
          roadmap={roadmap}
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
}: {
  children: ComponentChildren
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  const variantClass = {
    primary: 'bg-violet-500 border-transparent text-white',
    secondary: 'bg-app-surface border-app-border text-app-text',
    ghost: 'bg-transparent border-app-border text-gray-300',
  }
  return (
    <button
      onClick={onClick}
      className={`${variantClass[variant]} border rounded-lg px-3.5 py-1.5 text-[13px] font-medium cursor-pointer whitespace-nowrap`}
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
  onLoadExample: (data: unknown) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 border border-dashed border-app-border rounded-xl gap-4 text-center">
      <div style={{ fontSize: 40 }}>🗺️</div>
      <h2 className="text-lg font-bold text-white">No roadmaps yet</h2>
      <p className="text-gray-400 text-sm max-w-[360px]">
        Create your first roadmap to visualize your projects as a Gantt timeline.
      </p>
      <button
        onClick={onCreateRoadmap}
        className="bg-violet-500 border-none text-white rounded-lg px-6 py-2.5 text-sm font-semibold cursor-pointer"
      >
        + Create a roadmap
      </button>

      <div className="flex items-center gap-3 w-full max-w-[480px] mt-2">
        <div className="flex-1 h-px bg-app-border" />
        <span className="text-[12px] text-gray-500">or try an example</span>
        <div className="flex-1 h-px bg-app-border" />
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[480px]">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.slug}
            onClick={() => onLoadExample(ex)}
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
