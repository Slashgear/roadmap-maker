import type { Database } from 'bun:sqlite'
import type { Roadmap } from '../../client/src/types'
import { getSectionsByRoadmapId } from './sections'
import type { DbResult } from './tasks'

type RoadmapRow = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  start_date: string
  end_date: string
  version: number
}

function rowToRoadmap(row: RoadmapRow, db: Database, withSections = true): Roadmap {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    startDate: row.start_date,
    endDate: row.end_date,
    version: row.version,
    sections: withSections ? getSectionsByRoadmapId(db, row.id) : [],
  }
}

export function getRoadmapList(db: Database): Omit<Roadmap, 'sections'>[] {
  const rows = db.query<RoadmapRow, []>('SELECT * FROM roadmaps ORDER BY created_at').all()
  return rows.map((r) => rowToRoadmap(r, db, false))
}

export function getRoadmapBySlug(db: Database, slug: string): Roadmap | null {
  const row = db.query<RoadmapRow, [string]>('SELECT * FROM roadmaps WHERE slug = ?').get(slug)
  if (!row) return null
  return rowToRoadmap(row, db)
}

export function createRoadmap(
  db: Database,
  data: {
    id: string
    slug: string
    title: string
    subtitle?: string | null
    startDate: string
    endDate: string
  },
): Roadmap {
  db.run(
    'INSERT INTO roadmaps (id, slug, title, subtitle, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [data.id, data.slug, data.title, data.subtitle ?? null, data.startDate, data.endDate],
  )
  return getRoadmapBySlug(db, data.slug)!
}

export function updateRoadmap(
  db: Database,
  slug: string,
  data: {
    title?: string
    subtitle?: string | null
    startDate?: string
    endDate?: string
    newSlug?: string
    version: number
  },
): DbResult<Roadmap> {
  const current = db.query<RoadmapRow, [string]>('SELECT * FROM roadmaps WHERE slug = ?').get(slug)
  if (!current) return { status: 'not_found' }
  if (current.version !== data.version) {
    return { status: 'conflict', current: rowToRoadmap(current, db) }
  }

  db.run(
    `UPDATE roadmaps SET
      title = ?, subtitle = ?, start_date = ?, end_date = ?, slug = ?,
      version = version + 1, updated_at = datetime('now')
     WHERE slug = ? AND version = ?`,
    [
      data.title ?? current.title,
      data.subtitle !== undefined ? (data.subtitle ?? null) : current.subtitle,
      data.startDate ?? current.start_date,
      data.endDate ?? current.end_date,
      data.newSlug ?? current.slug,
      slug,
      data.version,
    ],
  )

  const updatedSlug = data.newSlug ?? slug
  const updated = db
    .query<RoadmapRow, [string]>('SELECT * FROM roadmaps WHERE slug = ?')
    .get(updatedSlug)!
  return { status: 'ok', data: rowToRoadmap(updated, db) }
}

export function deleteRoadmap(db: Database, slug: string): boolean {
  db.run('DELETE FROM roadmaps WHERE slug = ?', [slug])
  return true
}
