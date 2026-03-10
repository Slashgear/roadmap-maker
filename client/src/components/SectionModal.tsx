import { useState } from 'preact/hooks'
import Modal, { FormField, ColorPicker, ModalActions } from './Modal'
import type { Section, SectionColor } from '../types'
import { SECTION_COLORS, COLOR_HEX, COLOR_LABELS } from '../types'

interface Props {
  section?: Section | null
  onSave: (data: { label: string; color: string }) => void
  onDelete?: () => void
  onClose: () => void
}

export default function SectionModal({ section, onSave, onDelete, onClose }: Props) {
  const [label, setLabel] = useState(section?.label ?? '')
  const [color, setColor] = useState(section?.color ?? 'tech')
  const [error, setError] = useState('')

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (!label.trim()) return setError('Name is required')
    setError('')
    onSave({ label: label.trim(), color })
  }

  function handleDelete() {
    if (!onDelete) return
    if (!confirm('Delete this section and all its tasks?')) return
    onDelete()
  }

  return (
    <Modal title={section ? 'Edit section' : 'New section'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Name">
          <input
            type="text"
            defaultValue={label}
            onInput={(e) => setLabel(e.currentTarget.value)}
            placeholder="Ex: 🎨 Design"
            autoFocus
          />
        </FormField>

        <FormField label="Color">
          <ColorPicker
            colors={SECTION_COLORS}
            value={color}
            onChange={(color) => setColor(color as SectionColor)}
            labels={COLOR_LABELS}
            hexMap={COLOR_HEX}
          />
        </FormField>

        {error && <p className="text-red-500 text-[13px] mb-2">{error}</p>}

        <ModalActions onClose={onClose} onDelete={onDelete ? handleDelete : undefined} />
      </form>
    </Modal>
  )
}
