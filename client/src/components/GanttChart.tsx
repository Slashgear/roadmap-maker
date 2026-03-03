import { useMemo } from 'preact/hooks'
import type { Roadmap, Section, Task } from '../types'
import { COLOR_HEX, SECTION_BG, STATUS_COLOR, STATUS_LABEL, STATUS_TEXT } from '../types'

const LABEL_W = 240
const MIN_CHART_W = 700
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
            gridTemplateColumns: `${LABEL_W}px 1fr`,
            minWidth: LABEL_W + MIN_CHART_W,
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
          {roadmap.sections.map((section) => (
            <>
              {/* Section header row */}
              <button
                className={`${STICKY} w-full flex items-center gap-2 px-3.5 text-[11px] font-bold uppercase tracking-[.07em] cursor-pointer select-none border-b border-r border-app-border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500`}
                style={{
                  height: SECTION_H,
                  background: SECTION_BG[section.color] ?? SECTION_BG.green,
                }}
                onClick={() => onEditSection(section)}
                aria-label={`Edit section: ${section.label}`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: COLOR_HEX[section.color] ?? COLOR_HEX.green }}
                />
                <span style={{ color: COLOR_HEX[section.color] ?? COLOR_HEX.green }}>
                  {section.label}
                </span>
              </button>
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
              {section.tasks.map((task) => {
                const taskStart = new Date(task.startDate)
                const taskEnd = new Date(task.endDate)
                const left = pct(taskStart)
                const width = Math.max(pct(taskEnd) - left, 0.8)
                const color = STATUS_COLOR[task.status]
                const textColor = STATUS_TEXT[task.status]
                const isPending = task.status === 'pending'
                const isDone = task.status === 'done'

                // Bar visuals per status
                const barBg = isPending
                  ? `repeating-linear-gradient(-45deg, ${color}55 0px, ${color}55 5px, ${color}aa 5px, ${color}aa 10px)`
                  : isDone
                    ? `${color}88`
                    : color
                const barBorder = isPending
                  ? `1.5px solid ${color}`
                  : isDone
                    ? `1.5px solid ${color}`
                    : 'none'
                const barColor = isPending ? color : textColor

                // Milestone visuals per status
                const diamondBg = isPending ? 'transparent' : isDone ? `${color}88` : color
                const diamondBorder = isPending
                  ? `2px solid ${color}`
                  : isDone
                    ? `2px solid ${color}88`
                    : 'none'

                return (
                  <>
                    <button
                      className={`${STICKY} w-full flex items-center pr-3.5 pl-[22px] text-[12.5px] text-app-text bg-app-surface border-r border-b border-app-border text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500`}
                      style={{ height: ROW_H }}
                      onClick={() => onEditTask(task)}
                      aria-label={[
                        task.label,
                        STATUS_LABEL[task.type][task.status],
                        `${taskStart.toLocaleDateString('en-US')} → ${taskEnd.toLocaleDateString('en-US')}`,
                        task.note ? `Note: ${task.note}` : null,
                      ]
                        .filter(Boolean)
                        .join(' — ')}
                    >
                      <span className="truncate">{task.label}</span>
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
                              ? { outline: '2px dashed rgba(255,255,255,0.35)', outlineOffset: -2 }
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
          ))}
        </div>
      </div>
    </div>
  )
}
