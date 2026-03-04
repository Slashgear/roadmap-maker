declare global {
  const __APP_VERSION__: string
}

export type TaskStatus = 'confirmed' | 'started' | 'pending' | 'critical' | 'done'
export type SectionColor =
  | 'orange'
  | 'purple'
  | 'cyan'
  | 'green'
  | 'pink'
  | 'blue'
  | 'amber'
  | 'indigo'
  | 'lime'
  | 'rose'
  | 'teal'
  | 'slate'
export type TaskType = 'bar' | 'milestone'

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
}

export interface Section {
  id: string
  roadmapId: string
  label: string
  color: SectionColor
  position: number
  tasks: Task[]
}

export interface Roadmap {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  startDate: string
  endDate: string
  sections: Section[]
}

export const SECTION_COLORS: SectionColor[] = [
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
]
export const TASK_STATUSES: TaskStatus[] = ['confirmed', 'started', 'pending', 'critical', 'done']

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
