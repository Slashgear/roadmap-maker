import { nanoid } from 'nanoid'
import type { Sql } from 'postgres'

export type RoadmapEvent = {
  id: string
  roadmapId: string
  type: string
  payload: unknown
  createdAt: string
}

type EventRow = {
  id: string
  roadmap_id: string
  type: string
  payload: unknown
  created_at: string
}

function rowToEvent(row: EventRow): RoadmapEvent {
  return {
    id: row.id,
    roadmapId: row.roadmap_id,
    type: row.type,
    payload: row.payload,
    createdAt: row.created_at,
  }
}

export async function recordEvent(
  sql: Sql,
  roadmapId: string,
  type: string,
  payload: unknown,
): Promise<void> {
  await sql`
    INSERT INTO roadmap_events (id, roadmap_id, type, payload)
    VALUES (${nanoid()}, ${roadmapId}, ${type}, ${sql.json(payload as Record<string, unknown>)})
  `
}

export async function getEventsByRoadmapId(
  sql: Sql,
  roadmapId: string,
  limit = 50,
): Promise<RoadmapEvent[]> {
  const rows = await sql<EventRow[]>`
    SELECT * FROM roadmap_events
    WHERE roadmap_id = ${roadmapId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return rows.map(rowToEvent)
}
