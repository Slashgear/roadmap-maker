import { useState } from 'preact/hooks'
import Modal, { FormField, ModalActions } from './Modal'
import type { Roadmap } from '../types'

interface Props {
  roadmap?: Roadmap | null
  onSave: (data: {
    title: string
    subtitle?: string
    startDate: string
    endDate: string
    slug?: string
  }) => void
  onDelete?: () => void
  onClose: () => void
}

export default function RoadmapModal({ roadmap, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(roadmap?.title ?? '')
  const [subtitle, setSubtitle] = useState(roadmap?.subtitle ?? '')
  const [startDate, setStartDate] = useState(roadmap?.startDate ?? '')
  const [endDate, setEndDate] = useState(roadmap?.endDate ?? '')
  const [slug, setSlug] = useState(roadmap?.slug ?? '')
  const [error, setError] = useState('')

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (!title.trim() || !startDate || !endDate) {
      return setError('Title, start date and end date are required')
    }
    setError('')
    onSave({
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      startDate,
      endDate,
      slug: slug.trim() || undefined,
    })
  }

  function handleDelete() {
    if (!onDelete) return
    if (!confirm('Delete this roadmap and all its data?')) return
    onDelete()
  }

  return (
    <Modal title={roadmap ? 'Edit roadmap' : 'New roadmap'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.currentTarget.value)
              if (!roadmap) setSlug(autoSlug(e.currentTarget.value))
            }}
            placeholder="Ex: Website Roadmap 2026"
            autoFocus
          />
        </FormField>

        <FormField label="Subtitle (optional)">
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.currentTarget.value)}
            placeholder="Ex: February → June 2026"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <FormField label="Start date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.currentTarget.value)}
            />
          </FormField>
          <FormField label="End date">
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.currentTarget.value)}
            />
          </FormField>
        </div>

        <FormField label="URL Slug">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(autoSlug(e.currentTarget.value))}
            placeholder="my-project"
          />
          <p className="text-[11px] text-gray-400 mt-1">Accessible at #{slug || 'my-project'}</p>
        </FormField>

        {error && <p className="text-red-500 text-[13px] mb-2">{error}</p>}

        <ModalActions
          onClose={onClose}
          onDelete={onDelete ? handleDelete : undefined}
          submitLabel={roadmap ? 'Save' : 'Create'}
        />
      </form>
    </Modal>
  )
}
