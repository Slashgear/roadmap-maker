export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getSlugFromHash(): string | null {
  return window.location.hash.slice(1) || null
}

export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function defaultViewDates() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 30)
  const end = new Date(today)
  end.setMonth(end.getMonth() + 4)
  return { start: localISO(start), end: localISO(end) }
}
