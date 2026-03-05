import { cloneElement, isValidElement, toChildArray } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface ModalProps {
  title: string
  onClose: () => void
  children: ComponentChildren
}

export default function Modal({
  title,
  onClose,
  children,
  width = 480,
}: ModalProps & { width?: number }) {
  const titleId = 'modal-title'
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-app-surface border border-app-border rounded-xl w-full p-6"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="text-base font-bold text-white tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-transparent border-none text-gray-500 cursor-pointer text-xl leading-none px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
          >
            ×
          </button>
        </div>
        {children as any}
      </div>
    </div>
  )
}

export function FormField({ label, children }: { label: string; children: ComponentChildren }) {
  // Derive a stable id from the label text
  const id =
    'f-' +
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const childArr = toChildArray(children)
  const first = childArr[0]
  const isDirectInput =
    isValidElement(first) &&
    ((first as VNode).type === 'input' || (first as VNode).type === 'textarea')

  if (isDirectInput) {
    return (
      <div className="mb-4">
        <label htmlFor={id} className="block text-[12px] font-medium text-gray-300 mb-1.5">
          {label}
        </label>
        {cloneElement(first as VNode<{ id: string }>, { id })}
        {childArr.slice(1)}
      </div>
    )
  }

  // Button groups and custom pickers: use fieldset/legend for proper grouping
  return (
    <div className="mb-4">
      <fieldset className="border-none p-0 m-0 min-w-0">
        <legend className="block text-[12px] font-medium text-gray-300 mb-1.5 w-full">
          {label}
        </legend>
        {children}
      </fieldset>
    </div>
  )
}

export function ColorPicker({
  colors,
  value,
  onChange,
  labels,
  hexMap,
}: {
  colors: string[]
  value: string
  onChange: (color: string) => void
  labels: Record<string, string>
  hexMap: Record<string, string>
}) {
  return (
    <div className="flex gap-2 flex-wrap" role="group">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={labels[c]}
          aria-pressed={value === c}
          className="w-7 h-7 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          style={{
            background: hexMap[c],
            border: value === c ? '2px solid #fff' : '2px solid transparent',
            outline: value === c ? '2px solid #8b5cf6' : 'none',
            outlineOffset: 2,
          }}
        />
      ))}
    </div>
  )
}

export function ModalActions({
  onClose,
  onDelete,
  loading,
  submitLabel = 'Save',
}: {
  onClose: () => void
  onDelete?: () => void
  loading?: boolean
  submitLabel?: string
}) {
  return (
    <div className="flex justify-between items-center mt-6 pt-4 border-t border-app-border">
      <div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="bg-transparent border border-red-500 text-red-500 rounded-md px-3.5 py-1.5 text-[13px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Delete
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="bg-transparent border border-app-border text-gray-300 rounded-md px-3.5 py-1.5 text-[13px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-violet-500 border-none text-white rounded-md px-[18px] py-1.5 text-[13px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {loading ? '…' : submitLabel}
        </button>
      </div>
    </div>
  )
}
