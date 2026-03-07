import { useMemo, useState, useEffect } from 'preact/hooks'
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
  onAddTask: (sectionId: string) => void
  onEditTask: (task: Task) => void
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

export default function GanttChart({
  roadmap,
  viewStart,
  viewEnd,
  onEditSection,
  onAddTask,
  onEditTask,
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
          {roadmap.sections.map((section) => {
            const isCollapsed = collapsed.has(section.id)
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
                    const taskStart = new Date(task.startDate)
                    const taskEnd = new Date(task.endDate)
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

                    return (
                      <>
                        <button
                          className={`${STICKY} w-full flex items-center gap-1.5 pr-2 pl-[22px] text-[12.5px] text-app-text bg-app-surface border-r border-b border-app-border text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500`}
                          style={{ height: ROW_H }}
                          onClick={() => onEditTask(task)}
                          aria-label={[
                            task.label,
                            STATUS_LABEL[task.type][task.status],
                            `${taskStart.toLocaleDateString('en-US')} → ${taskEnd.toLocaleDateString('en-US')}`,
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
                          className="relative overflow-hidden border-b border-app-border cursor-pointer"
                          style={{
                            height: ROW_H,
                            background: SECTION_BG[section.color] ?? 'transparent',
                          }}
                          onClick={() => onEditTask(task)}
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
                              }}
                              title={task.label}
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
                                ...(task.note
                                  ? {
                                      outline: '2px dashed rgba(255,255,255,0.35)',
                                      outlineOffset: -2,
                                    }
                                  : {}),
                              }}
                              title={`${task.label}\n${taskStart.toLocaleDateString('en-US')} → ${taskEnd.toLocaleDateString('en-US')}${task.note ? '\n\n📝 ' + task.note : ''}`}
                            />
                          )}
                        </div>
                      </>
                    )
                  })}

                {/* Add task row */}
                {!isCollapsed && (
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
              </>
            )
          })}
        </div>
      </div>
    </div>
  )
}
