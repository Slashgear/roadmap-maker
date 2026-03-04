import { useState } from 'preact/hooks'
import { Temporal } from 'temporal-polyfill'
import Modal, { FormField, ModalActions } from './Modal'
import type { Task, Roadmap, TaskStatus } from '../types'
import { TASK_STATUSES, STATUS_COLOR, STATUS_LABEL } from '../types'

interface Props {
  task?: Task | null
  sectionId: string
  roadmap: Roadmap
  onSave: (data: Omit<Task, 'id' | 'sectionId' | 'position'>) => void
  onDelete?: () => void
  onClose: () => void
}

export default function TaskModal({
  task,
  sectionId: _sectionId,
  roadmap,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const today = Temporal.Now.plainDateISO().toString()
  const defaultEnd = Temporal.Now.plainDateISO().add({ days: 7 }).toString()

  const [label, setLabel] = useState(task?.label ?? '')
  const [startDate, setStartDate] = useState(task?.startDate ?? today)
  const [endDate, setEndDate] = useState(task?.endDate ?? defaultEnd)
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'confirmed')
  const [type, setType] = useState<'bar' | 'milestone'>(task?.type ?? 'bar')
  const [note, setNote] = useState(task?.note ?? '')
  const [externalLink, setExternalLink] = useState(task?.externalLink ?? '')
  const [error, setError] = useState('')

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (!label.trim()) return setError('Name is required')
    setError('')
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
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <FormField label="Start">
            <input
              type="date"
              value={startDate}
              min={roadmap.startDate}
              max={roadmap.endDate}
              onChange={(e) => setStartDate(e.currentTarget.value)}
            />
          </FormField>
          <FormField label="End">
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={roadmap.endDate}
              onChange={(e) => setEndDate(e.currentTarget.value)}
            />
          </FormField>
        </div>

        <FormField label="Type">
          <div className="flex gap-2">
            {(['bar', 'milestone'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-4 py-1.5 rounded-md border text-[13px] cursor-pointer ${
                  type === t
                    ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                    : 'border-app-border bg-transparent text-gray-300'
                }`}
                aria-pressed={type === t}
              >
                {t === 'bar' ? '▬ Bar' : '◆ Milestone'}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Status">
          <div className="flex gap-2 flex-wrap">
            {TASK_STATUSES.map((s) => {
              const active = status === s
              const color = STATUS_COLOR[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] cursor-pointer whitespace-nowrap"
                  aria-pressed={active}
                  style={{
                    border: `1px solid ${active ? color : '#252b3b'}`,
                    background: active ? `${color}22` : 'transparent',
                    color: active ? color : '#d1d5db',
                  }}
                >
                  <span
                    className="inline-block w-2 h-2 shrink-0"
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
                </button>
              )
            })}
          </div>
        </FormField>

        <FormField label="External link (optional)">
          <input
            type="url"
            value={externalLink}
            onChange={(e) => setExternalLink(e.currentTarget.value)}
            placeholder="https://yourorg.atlassian.net/browse/PROJ-42"
          />
        </FormField>

        <FormField label="Note (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            placeholder="Context, decisions, links…"
          />
        </FormField>

        {error && <p className="text-red-500 text-[13px] mb-2">{error}</p>}

        <ModalActions onClose={onClose} onDelete={onDelete ? handleDelete : undefined} />
      </form>
    </Modal>
  )
}
