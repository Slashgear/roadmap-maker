import { useMemo, useState, useEffect, useRef } from 'preact/hooks'
import type { Roadmap, Section, Task } from '../types'
import {
  COLOR_HEX,
  SECTION_BG,
  STATUS_COLOR,
  STATUS_LABEL,
  STATUS_TEXT,
  getBarStyle,
  getDiamondStyle,
} from '../types'

const MIN_CHART_W = 700

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}
const ROW_H = 34
const SECTION_H = 32
const HEADER_H = 48

interface Props {
  roadmap: Roadmap
  viewStart: string
  viewEnd: string
  onEditSection: (section: Section) => void
  onAddSection?: () => void
  onAddTask: (sectionId: string) => void
  onEditTask: (task: Task) => void
  onUpdateTask?: (task: Task, updates: { startDate: string; endDate: string }) => void
  onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void
}

function TimelineOverlay({ weekGrids, todayPct }: { weekGrids: number[]; todayPct: number }) {
  return (
    <>
      {weekGrids.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${p}%`,
            width: 1,
            background: '#252b3b',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${todayPct}%`,
          width: 2,
          background: '#0052cc',
          opacity: 0.85,
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />
    </>
  )
}

// Shared sticky class for all left-column cells
const STICKY = 'sticky left-0 z-10'

function msToDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

type DragPreview = { taskId: string; startMs: number; endMs: number }

export default function GanttChart({
  roadmap,
  viewStart,
  viewEnd,
  onEditSection,
  onAddSection,
  onAddTask,
  onEditTask,
  onUpdateTask,
  onMoveSection,
}: Props) {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const labelW = isMobile ? 140 : 240
  const start = useMemo(() => new Date(viewStart), [viewStart])
  const end = useMemo(() => new Date(viewEnd), [viewEnd])
  const totalMs = end.getTime() - start.getTime()

  function pct(date: Date) {
    return Math.max(0, Math.min(100, ((date.getTime() - start.getTime()) / totalMs) * 100))
  }

  const todayPct = pct(new Date())

  const months = useMemo(() => {
    const result: Date[] = []
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur < end) {
      result.push(new Date(cur))
      cur.setMonth(cur.getMonth() + 1)
    }
    return result
  }, [start, end])

  const visibleMonths = useMemo(() => {
    const MIN_GAP = 4 // minimum % gap between labels to avoid overlap
    const total = end.getTime() - start.getTime()
    const result: Date[] = []
    let lastPct = -Infinity
    for (const m of months) {
      const p = Math.max(0, Math.min(100, ((m.getTime() - start.getTime()) / total) * 100))
      if (p - lastPct >= MIN_GAP) {
        result.push(m)
        lastPct = p
      }
    }
    return result
  }, [months, start, end])

  const weekGrids = useMemo(() => {
    const result: number[] = []
    let w = new Date(start)
    while (w.getDay() !== 1) w = new Date(w.getTime() + 86400000)
    while (w < end) {
      result.push(pct(w))
      w = new Date(w.getTime() + 7 * 86400000)
    }
    return result
  }, [start, end])

  // ── Drag & Resize ──────────────────────────────────────────────────────────
  const [preview, setPreview] = useState<DragPreview | null>(null)
  const dragRef = useRef<{
    type: 'move' | 'resize'
    task: Task
    startX: number
    origStartMs: number
    origEndMs: number
    didMove: boolean
  } | null>(null)
  const previewRef = useRef<DragPreview | null>(null)
  const chartColRef = useRef<HTMLDivElement>(null)
  const totalMsRef = useRef(totalMs)
  const onUpdateTaskRef = useRef(onUpdateTask)
  const lastDragDidMoveRef = useRef(false)

  useEffect(() => {
    totalMsRef.current = totalMs
  }, [totalMs])
  useEffect(() => {
    onUpdateTaskRef.current = onUpdateTask
  }, [onUpdateTask])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current || !chartColRef.current) return
      const dr = dragRef.current
      const rect = chartColRef.current.getBoundingClientRect()
      const deltaX = e.clientX - dr.startX
      if (Math.abs(deltaX) > 3) {
        if (!dr.didMove) {
          dr.didMove = true
          document.body.style.cursor = dr.type === 'move' ? 'grabbing' : 'ew-resize'
          document.body.style.userSelect = 'none'
        }
      }
      if (!dr.didMove) return

      const deltaPct = deltaX / rect.width
      const rawDeltaMs = deltaPct * totalMsRef.current
      const deltaMs = Math.round(rawDeltaMs / 86400000) * 86400000

      let newStartMs = dr.origStartMs
      let newEndMs = dr.origEndMs

      if (dr.type === 'move') {
        newStartMs = dr.origStartMs + deltaMs
        newEndMs = dr.origEndMs + deltaMs
      } else {
        newEndMs = Math.max(dr.origEndMs + deltaMs, dr.origStartMs + 86400000)
      }

      const p: DragPreview = { taskId: dr.task.id, startMs: newStartMs, endMs: newEndMs }
      previewRef.current = p
      setPreview(p)
    }

    function onMouseUp() {
      if (!dragRef.current) return
      const dr = dragRef.current
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      lastDragDidMoveRef.current = dr.didMove
      if (dr.didMove && previewRef.current && onUpdateTaskRef.current) {
        onUpdateTaskRef.current(dr.task, {
          startDate: msToDate(previewRef.current.startMs),
          endDate: msToDate(previewRef.current.endMs),
        })
      }
      previewRef.current = null
      setPreview(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function handleBarMouseDown(e: MouseEvent, task: Task) {
    if (!onUpdateTask || isMobile) return
    // Only left button
    if (e.button !== 0) return
    e.stopPropagation()
    dragRef.current = {
      type: 'move',
      task,
      startX: e.clientX,
      origStartMs: new Date(task.startDate).getTime(),
      origEndMs: new Date(task.endDate).getTime(),
      didMove: false,
    }
  }

  function handleResizeMouseDown(e: MouseEvent, task: Task) {
    if (!onUpdateTask || isMobile) return
    if (e.button !== 0) return
    e.stopPropagation()
    dragRef.current = {
      type: 'resize',
      task,
      startX: e.clientX,
      origStartMs: new Date(task.startDate).getTime(),
      origEndMs: new Date(task.endDate).getTime(),
      didMove: false,
    }
  }

  return (
    // Clip wrapper: border-radius + overflow:hidden clips inner content to rounded corners
    <div className="overflow-hidden border border-app-border rounded-xl bg-app-surface">
      {/* Scroll wrapper: horizontal scroll without breaking the clip above */}
      <div className="overflow-x-auto">
        {/* Grid: min-width prevents the chart area from collapsing */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${labelW}px 1fr`,
            minWidth: labelW + MIN_CHART_W,
          }}
        >
          {/* ── Header ── */}
          <div
            className="sticky left-0 top-0 z-[30] flex items-end pb-2.5 px-3.5 text-[11px] font-semibold uppercase tracking-[.06em] text-gray-500 border-b border-r border-app-border bg-app-surface"
            style={{ height: HEADER_H }}
          >
            Task
          </div>
          <div
            ref={chartColRef}
            className="sticky top-0 z-20 overflow-hidden border-b border-app-border bg-app-surface"
            style={{ height: HEADER_H }}
          >
            {visibleMonths.map((m, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: 0,
                  height: '100%',
                  left: `${pct(m)}%`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  paddingBottom: 10,
                  paddingLeft: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#e8eaf0',
                  opacity: 0.7,
                  pointerEvents: 'none',
                }}
              >
                {m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()}
              </div>
            ))}
            {todayPct >= 0 && todayPct <= 100 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${todayPct}%`,
                  background: '#0052cc',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: 'DM Mono, monospace',
                  padding: '1px 4px',
                  borderRadius: 2,
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  zIndex: 25,
                }}
              >
                Today
              </div>
            )}
            <TimelineOverlay weekGrids={weekGrids} todayPct={todayPct} />
          </div>

          {/* ── Sections ── */}
          {/* ── Empty chart placeholder ── */}
          {roadmap.sections.length === 0 && onAddSection && (
            <>
              <div
                className={`${STICKY} border-r border-app-border bg-app-surface`}
                style={{ height: 80 }}
              />
              <div className="relative border-app-border" style={{ height: 80 }}>
                <TimelineOverlay weekGrids={weekGrids} todayPct={todayPct} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={onAddSection}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-600 text-gray-400 text-[13px] hover:border-violet-500 hover:text-violet-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    <span className="text-base leading-none">+</span>
                    Add your first section
                  </button>
                </div>
              </div>
            </>
          )}

          {roadmap.sections.map((section, index) => {
            const isCollapsed = collapsed.has(section.id)
            const isFirst = index === 0
            const isLast = index === roadmap.sections.length - 1
            return (
              <>
                {/* Section header row */}
                <div
                  className={`${STICKY} flex items-center border-b border-r border-app-border`}
                  style={{
                    height: SECTION_H,
                    background: SECTION_BG[section.color] ?? SECTION_BG.green,
                  }}
                >
                  <button
                    onClick={() => toggleCollapsed(section.id)}
                    aria-expanded={!isCollapsed}
                    aria-label={
                      isCollapsed
                        ? `Expand section ${section.label}`
                        : `Collapse section ${section.label}`
                    }
                    className="flex items-center justify-center w-7 h-full shrink-0 text-gray-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      aria-hidden="true"
                      style={{
                        transform: isCollapsed ? 'none' : 'rotate(90deg)',
                        transition: 'transform 150ms',
                      }}
                    >
                      <path
                        d="M3 1.5l4 3.5-4 3.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEditSection(section)}
                    aria-label={`Edit section: ${section.label}`}
                    className="flex-1 flex items-center gap-2 pr-3 h-full text-[11px] font-bold uppercase tracking-[.07em] cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ background: COLOR_HEX[section.color] ?? COLOR_HEX.green }}
                    />
                    <span style={{ color: COLOR_HEX[section.color] ?? COLOR_HEX.green }}>
                      {section.label}
                    </span>
                    {isCollapsed && section.tasks.length > 0 && (
                      <span className="text-[10px] text-gray-500 font-normal normal-case tracking-normal">
                        ({section.tasks.length})
                      </span>
                    )}
                  </button>
                  {onMoveSection && (
                    <div className="flex flex-col shrink-0 mr-1">
                      <button
                        onClick={() => {
                          onMoveSection(section.id, 'up')
                          requestAnimationFrame(() => {
                            document
                              .querySelector<HTMLButtonElement>(
                                `[data-section-move="${section.id}-up"]`,
                              )
                              ?.focus()
                          })
                        }}
                        disabled={isFirst}
                        data-section-move={`${section.id}-up`}
                        aria-label={`Move section ${section.label} up`}
                        className="flex items-center justify-center w-5 h-4 bg-transparent border-none text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-default cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 rounded-sm"
                      >
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden="true">
                          <path d="M4 1L7 5H1L4 1Z" fill="currentColor" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          onMoveSection(section.id, 'down')
                          requestAnimationFrame(() => {
                            document
                              .querySelector<HTMLButtonElement>(
                                `[data-section-move="${section.id}-down"]`,
                              )
                              ?.focus()
                          })
                        }}
                        disabled={isLast}
                        data-section-move={`${section.id}-down`}
                        aria-label={`Move section ${section.label} down`}
                        className="flex items-center justify-center w-5 h-4 bg-transparent border-none text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-default cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 rounded-sm"
                      >
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden="true">
                          <path d="M4 5L1 1H7L4 5Z" fill="currentColor" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className="relative overflow-hidden border-b border-app-border"
                  style={{
                    height: SECTION_H,
                    background: SECTION_BG[section.color] ?? SECTION_BG.green,
                  }}
                  aria-hidden="true"
                >
                  <TimelineOverlay weekGrids={weekGrids} todayPct={todayPct} />
                </div>

                {/* Task rows */}
                {!isCollapsed &&
                  section.tasks.map((task) => {
                    const isPreview = preview?.taskId === task.id
                    const taskStartMs = isPreview
                      ? preview!.startMs
                      : new Date(task.startDate).getTime()
                    const taskEndMs = isPreview ? preview!.endMs : new Date(task.endDate).getTime()
                    const taskStart = new Date(taskStartMs)
                    const taskEnd = new Date(taskEndMs)
                    const left = pct(taskStart)
                    const width = Math.max(pct(taskEnd) - left, 0.8)
                    const color = STATUS_COLOR[task.status]
                    const textColor = STATUS_TEXT[task.status]
                    const isPending = task.status === 'pending'

                    const { background: barBg, border: barBorder } = getBarStyle(task.status, color)
                    const barColor = isPending ? color : textColor
                    const { background: diamondBg, border: diamondBorder } = getDiamondStyle(
                      task.status,
                      color,
                    )

                    const canDrag = !!onUpdateTask && !isMobile

                    return (
                      <>
                        <button
                          className={`${STICKY} w-full flex items-center gap-1.5 pr-2 pl-[22px] text-[12.5px] text-app-text bg-app-surface border-r border-b border-app-border text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500`}
                          style={{ height: ROW_H }}
                          onClick={() => onEditTask(task)}
                          aria-label={[
                            task.label,
                            STATUS_LABEL[task.type][task.status],
                            `${new Date(task.startDate).toLocaleDateString('en-US')} → ${new Date(task.endDate).toLocaleDateString('en-US')}`,
                            task.note ? `Note: ${task.note}` : null,
                            task.externalLink ? `Link: ${task.externalLink}` : null,
                          ]
                            .filter(Boolean)
                            .join(' — ')}
                        >
                          <span className="truncate flex-1">{task.label}</span>
                          {task.externalLink && (
                            <a
                              href={task.externalLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={task.externalLink}
                              aria-label="Open external link"
                              className="shrink-0 text-gray-500 hover:text-violet-400 transition-colors"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                              >
                                <path
                                  d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7"
                                  stroke="currentColor"
                                  stroke-width="1.25"
                                  stroke-linecap="round"
                                />
                                <path
                                  d="M7.5 1H11v3.5M11 1 6 6"
                                  stroke="currentColor"
                                  stroke-width="1.25"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                />
                              </svg>
                            </a>
                          )}
                        </button>
                        <div
                          className="relative overflow-hidden border-b border-app-border"
                          style={{
                            height: ROW_H,
                            background: SECTION_BG[section.color] ?? 'transparent',
                          }}
                          onClick={() => {
                            if (lastDragDidMoveRef.current) {
                              lastDragDidMoveRef.current = false
                              return
                            }
                            onEditTask(task)
                          }}
                          aria-hidden="true"
                        >
                          <TimelineOverlay weekGrids={weekGrids} todayPct={todayPct} />

                          {task.type === 'milestone' ? (
                            <div
                              className="hover:brightness-125 transition-[filter] duration-150 absolute top-1/2 -translate-y-1/2 rotate-45 rounded-[2px] z-[5]"
                              style={{
                                width: 14,
                                height: 14,
                                left: `calc(${left}% - 7px)`,
                                background: diamondBg,
                                border: diamondBorder,
                                cursor: canDrag ? 'grab' : 'pointer',
                                opacity: isPreview ? 0.75 : 1,
                              }}
                              title={task.label}
                              onMouseDown={(e) =>
                                handleBarMouseDown(e as unknown as MouseEvent, task)
                              }
                            />
                          ) : (
                            <div
                              className="hover:brightness-125 transition-[filter] duration-150 absolute top-1/2 -translate-y-1/2 rounded-[4px] flex items-center px-2 text-[10.5px] font-medium whitespace-nowrap overflow-hidden z-[5]"
                              style={{
                                height: 20,
                                left: `${left}%`,
                                width: `${width}%`,
                                background: barBg,
                                border: barBorder,
                                color: barColor,
                                fontFamily: 'DM Mono, monospace',
                                cursor: canDrag ? 'grab' : 'pointer',
                                opacity: isPreview ? 0.75 : 1,
                                ...(task.note
                                  ? {
                                      outline: '2px dashed rgba(255,255,255,0.35)',
                                      outlineOffset: -2,
                                    }
                                  : {}),
                              }}
                              title={`${task.label}\n${taskStart.toLocaleDateString('en-US')} → ${taskEnd.toLocaleDateString('en-US')}${task.note ? '\n\n📝 ' + task.note : ''}`}
                              onMouseDown={(e) =>
                                handleBarMouseDown(e as unknown as MouseEvent, task)
                              }
                            >
                              {canDrag && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: 8,
                                    cursor: 'ew-resize',
                                    zIndex: 10,
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation()
                                    handleResizeMouseDown(e as unknown as MouseEvent, task)
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )
                  })}

                {/* Add task row */}
                {!isCollapsed && section.tasks.length > 0 && (
                  <>
                    <div
                      className={`${STICKY} flex items-center px-3.5 bg-app-surface border-r border-b border-app-border`}
                      style={{ height: 36 }}
                    >
                      <button
                        onClick={() => onAddTask(section.id)}
                        aria-label={`Add task to ${section.label}`}
                        className="bg-transparent border-none text-gray-300 cursor-pointer text-[13px] flex items-center gap-1 px-1 py-2 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
                      >
                        + Add task
                      </button>
                    </div>
                    <div
                      className="relative overflow-hidden border-b border-app-border"
                      style={{ height: 36, background: SECTION_BG[section.color] ?? 'transparent' }}
                      aria-hidden="true"
                    >
                      <TimelineOverlay weekGrids={weekGrids} todayPct={todayPct} />
                    </div>
                  </>
                )}

                {/* Empty section placeholder */}
                {!isCollapsed && section.tasks.length === 0 && (
                  <>
                    <div
                      className={`${STICKY} flex items-center px-3.5 bg-app-surface border-r border-b border-app-border`}
                      style={{ height: 64 }}
                    />
                    <div
                      className="relative overflow-hidden border-b border-app-border"
                      style={{ height: 64, background: SECTION_BG[section.color] ?? 'transparent' }}
                    >
                      <TimelineOverlay weekGrids={weekGrids} todayPct={todayPct} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={() => onAddTask(section.id)}
                          aria-label={`Add task to ${section.label}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-600 text-gray-400 text-[13px] hover:border-violet-500 hover:text-violet-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                          <span className="text-base leading-none">+</span>
                          Add your first task
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )
          })}
        </div>
      </div>
    </div>
  )
}
