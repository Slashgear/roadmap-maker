import { useState } from 'preact/hooks'

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PRESETS = [
  { label: '1M', ariaLabel: '1 month', months: 1 },
  { label: '3M', ariaLabel: '3 months', months: 3 },
  { label: '6M', ariaLabel: '6 months', months: 6 },
  { label: '1Y', ariaLabel: '1 year', months: 12 },
] as const

type PresetLabel = (typeof PRESETS)[number]['label']

export default function ViewRangeControls({
  viewStart,
  viewEnd,
  onStartChange,
  onEndChange,
  onReset,
}: {
  viewStart: string
  viewEnd: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  onReset: () => void
}) {
  const [activePreset, setActivePreset] = useState<PresetLabel | null>(null)

  function applyPreset(months: number, label: PresetLabel) {
    const today = new Date()
    const end = new Date(today)
    end.setMonth(end.getMonth() + months)
    setActivePreset(label)
    onStartChange(localISO(today))
    onEndChange(localISO(end))
  }

  function handleStartChange(v: string) {
    setActivePreset(null)
    onStartChange(v)
  }

  function handleEndChange(v: string) {
    setActivePreset(null)
    onEndChange(v)
  }

  function handleReset() {
    setActivePreset(null)
    onReset()
  }

  return (
    <div
      id="view-range-controls"
      role="group"
      aria-label="View range controls"
      className="flex items-center gap-3 mb-4 text-xs text-gray-300 flex-wrap"
    >
      {/* Segmented control for zoom presets */}
      <div role="group" aria-label="Timeline zoom presets" className="flex">
        {PRESETS.map(({ label, ariaLabel, months }, i) => {
          const isActive = activePreset === label
          const isFirst = i === 0
          const isLast = i === PRESETS.length - 1
          return (
            <button
              key={label}
              onClick={() => applyPreset(months, label)}
              aria-pressed={isActive}
              aria-label={ariaLabel}
              className={[
                'relative border-y border-r px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-colors',
                'focus-visible:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-violet-500',
                isFirst ? 'border-l rounded-l-md' : '',
                isLast ? 'rounded-r-md' : '',
                isActive
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-300 z-[1]'
                  : 'bg-transparent border-app-border text-gray-500 hover:text-app-text hover:bg-white/5',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="view-start" className="sr-only">
          View start date
        </label>
        <input
          id="view-start"
          type="date"
          value={viewStart}
          onChange={(e) => handleStartChange(e.currentTarget.value)}
          style={{ colorScheme: 'dark' }}
        />
        <span aria-hidden="true" className="text-gray-600">
          →
        </span>
        <label htmlFor="view-end" className="sr-only">
          View end date
        </label>
        <input
          id="view-end"
          type="date"
          value={viewEnd}
          onChange={(e) => handleEndChange(e.currentTarget.value)}
          style={{ colorScheme: 'dark' }}
        />
      </div>

      <button
        onClick={handleReset}
        className="bg-transparent border border-app-border rounded-md text-gray-500 px-2.5 py-1 text-[11px] cursor-pointer hover:text-app-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        Reset
      </button>
    </div>
  )
}
