import { useState } from 'preact/hooks'
import Modal, { FormField, ModalActions } from './Modal'
import type { Task, TaskStatus } from '../types'
import { TASK_STATUSES, STATUS_COLOR, STATUS_LABEL } from '../types'

function localISO(offsetDays = 0): string {
  const d = new Date()
  if (offsetDays) d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  task?: Task | null
  sectionId: string
  onSave: (data: Omit<Task, 'id' | 'sectionId' | 'position'>) => void
  onDelete?: () => void
  onClose: () => void
}

export default function TaskModal({
  task,
  sectionId: _sectionId,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const today = localISO()
  const defaultEnd = localISO(7)

  const [label, setLabel] = useState(task?.label ?? '')
  const [startDate, setStartDate] = useState(task?.startDate ?? today)
  const [endDate, setEndDate] = useState(task?.endDate ?? defaultEnd)
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'confirmed')
  const [type, setType] = useState<'bar' | 'milestone'>(task?.type ?? 'bar')
  const [note, setNote] = useState(task?.note ?? '')
  const [externalLink, setExternalLink] = useState(task?.externalLink ?? '')

  function handleSubmit(e: Event) {
    e.preventDefault()
    onSave({
      label: label.trim(),
      startDate,
      endDate,
      status,
      type,
      note: note.trim() || undefined,
      externalLink: externalLink.trim() || undefined,
    })
  }

  function handleDelete() {
    if (!onDelete) return
    if (!confirm('Delete this task?')) return
    onDelete()
  }

  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Name">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            placeholder="Ex: Navigation — Integration"
            required
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <FormField label="Start">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.currentTarget.value)}
            />
          </FormField>
          <FormField label="End">
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.currentTarget.value)}
            />
          </FormField>
        </div>

        <FormField label="Type">
          <div className="flex gap-2">
            {(['bar', 'milestone'] as const).map((t) => (
              <label
                key={t}
                className={`px-4 py-1.5 rounded-md border text-[13px] cursor-pointer select-none ${
                  type === t
                    ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                    : 'border-app-border text-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="task-type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="sr-only"
                />
                {t === 'bar' ? '▬ Bar' : '◆ Milestone'}
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Status">
          <div className="flex gap-2 flex-wrap">
            {TASK_STATUSES.map((s) => {
              const active = status === s
              const color = STATUS_COLOR[s]
              return (
                <label
                  key={s}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] cursor-pointer whitespace-nowrap select-none"
                  style={{
                    border: `1px solid ${active ? color : '#252b3b'}`,
                    background: active ? `${color}22` : 'transparent',
                    color: active ? color : '#d1d5db',
                  }}
                >
                  <input
                    type="radio"
                    name="task-status"
                    value={s}
                    checked={active}
                    onChange={() => setStatus(s)}
                    className="sr-only"
                  />
                  <span
                    className="inline-block w-2 h-2 shrink-0"
                    aria-hidden="true"
                    style={{
                      borderRadius: s === 'pending' ? '50%' : 2,
                      background:
                        s === 'pending' ? 'transparent' : s === 'done' ? `${color}88` : color,
                      border:
                        s === 'pending'
                          ? `2px solid ${color}`
                          : s === 'done'
                            ? `1.5px solid ${color}`
                            : 'none',
                    }}
                  />
                  {STATUS_LABEL[type][s]}
                </label>
              )
            })}
          </div>
        </FormField>

        <div className="mb-4">
          <label
            htmlFor="f-external-link"
            className="block text-[12px] font-medium text-gray-300 mb-1.5"
          >
            External link <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              aria-hidden="true"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <input
              id="f-external-link"
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.currentTarget.value)}
              placeholder="https://…"
              style={{ paddingLeft: 34 }}
            />
          </div>
        </div>

        <FormField label="Note (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            placeholder="Context, decisions, links…"
          />
        </FormField>

        <ModalActions onClose={onClose} onDelete={onDelete ? handleDelete : undefined} />
      </form>
    </Modal>
  )
}
