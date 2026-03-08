declare global {
  const __APP_VERSION__: string
  const __APP_MODE__: string
}

export const TASK_STATUSES = ['confirmed', 'started', 'pending', 'critical', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const SECTION_COLORS = [
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
] as const
export type SectionColor = (typeof SECTION_COLORS)[number]

export const TASK_TYPES = ['bar', 'milestone'] as const
export type TaskType = (typeof TASK_TYPES)[number]

export interface Task {
  id: string
  sectionId: string
  label: string
  startDate: string
  endDate: string
  status: TaskStatus
  type: TaskType
  note?: string
  externalLink?: string
  position: number
  version?: number
}

export interface Section {
  id: string
  roadmapId: string
  label: string
  color: SectionColor
  position: number
  tasks: Task[]
  version?: number
}

export interface Roadmap {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  startDate: string
  endDate: string
  sections: Section[]
  version?: number
}

export const COLOR_HEX: Record<SectionColor, string> = {
  orange: '#f97316',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  green: '#22c55e',
  pink: '#ec4899',
  blue: '#3b82f6',
  amber: '#f59e0b',
  indigo: '#6366f1',
  lime: '#84cc16',
  rose: '#e11d48',
  teal: '#0d9488',
  slate: '#64748b',
}

export const SECTION_BG: Record<SectionColor, string> = {
  orange: 'rgba(249,115,22,.08)',
  purple: 'rgba(139,92,246,.08)',
  cyan: 'rgba(6,182,212,.08)',
  green: 'rgba(34,197,94,.08)',
  pink: 'rgba(236,72,153,.08)',
  blue: 'rgba(59,130,246,.08)',
  amber: 'rgba(245,158,11,.08)',
  indigo: 'rgba(99,102,241,.08)',
  lime: 'rgba(132,204,22,.08)',
  rose: 'rgba(225,29,72,.08)',
  teal: 'rgba(13,148,136,.08)',
  slate: 'rgba(100,116,139,.08)',
}

export const COLOR_LABELS: Record<SectionColor, string> = {
  orange: 'Orange',
  purple: 'Purple',
  cyan: 'Cyan',
  green: 'Green',
  pink: 'Pink',
  blue: 'Blue',
  amber: 'Amber',
  indigo: 'Indigo',
  lime: 'Lime',
  rose: 'Rose',
  teal: 'Teal',
  slate: 'Slate',
}

// Task status colors and labels
export const STATUS_COLOR: Record<TaskStatus, string> = {
  confirmed: '#22c55e',
  started: '#3b82f6',
  pending: '#f97316',
  critical: '#ef4444',
  done: '#6b7280',
}

export const STATUS_TEXT: Record<TaskStatus, string> = {
  confirmed: '#071a0e',
  started: '#fff',
  pending: '#1a0e00',
  critical: '#fff',
  done: '#fff',
}

// Labels differ between bar and milestone for the same status
// Visual style helpers — ensure status is never conveyed by color alone (WCAG 1.4.1)
export function getBarStyle(
  status: TaskStatus,
  color: string,
): { background: string; border: string } {
  if (status === 'started')
    return {
      background: [
        `repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0px, rgba(255,255,255,.22) 3px, transparent 3px, transparent 9px)`,
        color,
      ].join(', '),
      border: 'none',
    }
  if (status === 'pending')
    return {
      background: `repeating-linear-gradient(-45deg, ${color}55 0px, ${color}55 5px, ${color}aa 5px, ${color}aa 10px)`,
      border: `1.5px dashed ${color}`,
    }
  if (status === 'critical')
    return {
      background: [
        `repeating-linear-gradient(45deg, rgba(0,0,0,.2) 0px, rgba(0,0,0,.2) 2px, transparent 2px, transparent 8px)`,
        `repeating-linear-gradient(-45deg, rgba(0,0,0,.2) 0px, rgba(0,0,0,.2) 2px, transparent 2px, transparent 8px)`,
        color,
      ].join(', '),
      border: 'none',
    }
  if (status === 'done') return { background: `${color}88`, border: `1.5px solid ${color}` }
  // confirmed — solid, no border
  return { background: color, border: 'none' }
}

export function getDiamondStyle(
  status: TaskStatus,
  color: string,
): { background: string; border: string } {
  if (status === 'started') return { background: color, border: `2px solid rgba(255,255,255,.6)` }
  if (status === 'pending') return { background: 'transparent', border: `2px dashed ${color}` }
  if (status === 'critical')
    return { background: color, border: `2.5px solid rgba(255,255,255,.85)` }
  if (status === 'done') return { background: `${color}88`, border: `2px solid ${color}88` }
  // confirmed — solid, no border
  return { background: color, border: 'none' }
}

export const STATUS_LABEL: Record<TaskType, Record<TaskStatus, string>> = {
  bar: {
    confirmed: 'Confirmed',
    started: 'In progress',
    pending: 'On hold',
    critical: 'Critical',
    done: 'Done',
  },
  milestone: {
    confirmed: 'Confirmed',
    started: 'In progress',
    pending: 'Pending',
    critical: 'Critical',
    done: 'Done',
  },
}
