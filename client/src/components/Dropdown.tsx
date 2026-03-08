import type { ComponentChildren } from 'preact'

export function DropdownItem({
  children,
  onClick,
  disabled = false,
}: {
  children: ComponentChildren
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left px-4 py-2.5 text-[13px] text-app-text hover:bg-white/5 cursor-pointer bg-transparent flex flex-col focus-visible:outline-none focus-visible:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <div role="separator" className="h-px bg-app-border my-1 mx-2" />
}
