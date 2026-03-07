import type { Roadmap, Section, Task } from '../types'

export type PresenceUser = { id: string; name: string; color: string }

export type SSEEvent =
  | { type: 'init'; payload: Roadmap }
  | { type: 'roadmap_updated'; payload: Omit<Roadmap, 'sections'> }
  | { type: 'roadmap_deleted' }
  | { type: 'section_added'; payload: Section }
  | { type: 'section_updated'; payload: Section }
  | { type: 'section_deleted'; payload: { id: string } }
  | { type: 'task_added'; payload: Task }
  | { type: 'task_updated'; payload: Task }
  | { type: 'task_deleted'; payload: { id: string; sectionId: string } }
  | { type: 'presence_updated'; payload: { users: PresenceUser[] } }

type Handler<T> = (payload: T) => void
type HandlerMap = {
  [K in SSEEvent['type']]: Handler<
    Extract<SSEEvent, { type: K }> extends { payload: infer P } ? P : never
  >[]
}

export class SSEManager {
  private es: EventSource | null = null
  private handlers: Partial<HandlerMap> = {}

  connect(slug: string, opts?: { clientId?: string; name?: string; color?: string }) {
    this.disconnect()
    const params = new URLSearchParams()
    if (opts?.clientId) params.set('clientId', opts.clientId)
    if (opts?.name) params.set('name', opts.name)
    if (opts?.color) params.set('color', opts.color)
    const qs = params.toString()
    this.es = new EventSource(`/api/roadmaps/${slug}/events${qs ? '?' + qs : ''}`)
    this.es.addEventListener('message', (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as SSEEvent
        const list = this.handlers[event.type] as Handler<unknown>[] | undefined
        if (list) {
          const payload = 'payload' in event ? event.payload : undefined
          list.forEach((h) => h(payload))
        }
      } catch {
        // ignore malformed events
      }
    })
  }

  on<T extends SSEEvent['type']>(
    type: T,
    handler: Handler<Extract<SSEEvent, { type: T }> extends { payload: infer P } ? P : never>,
  ) {
    if (!this.handlers[type]) {
      ;(this.handlers as Record<string, Handler<unknown>[]>)[type] = []
    }
    ;(this.handlers[type] as Handler<unknown>[]).push(handler as Handler<unknown>)
  }

  off<T extends SSEEvent['type']>(
    type: T,
    handler: Handler<Extract<SSEEvent, { type: T }> extends { payload: infer P } ? P : never>,
  ) {
    const list = this.handlers[type] as Handler<unknown>[] | undefined
    if (list) {
      const idx = list.indexOf(handler as Handler<unknown>)
      if (idx !== -1) list.splice(idx, 1)
    }
  }

  disconnect() {
    this.es?.close()
    this.es = null
  }
}
