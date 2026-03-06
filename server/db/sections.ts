import type { Database } from 'bun:sqlite'
import type { Section, SectionColor } from '../../client/src/types'
import { getTasksBySectionId } from './tasks'
import type { DbResult } from './tasks'

type SectionRow = {
  id: string
  roadmap_id: string
  label: string
  color: string
  position: number
  version: number
}

function rowToSection(row: SectionRow, db: Database): Section {
  return {
    id: row.id,
    roadmapId: row.roadmap_id,
    label: row.label,
    color: row.color as SectionColor,
    position: row.position,
    version: row.version,
    tasks: getTasksBySectionId(db, row.id),
  }
}

export function getSectionsByRoadmapId(db: Database, roadmapId: string): Section[] {
  const rows = db
    .query<SectionRow, [string]>('SELECT * FROM sections WHERE roadmap_id = ? ORDER BY position')
    .all(roadmapId)
  return rows.map((r) => rowToSection(r, db))
}

export function createSection(
  db: Database,
  roadmapId: string,
  data: { id: string; label: string; color: string },
): Section {
  const position =
    db
      .query<{ count: number }, [string]>(
        'SELECT COUNT(*) as count FROM sections WHERE roadmap_id = ?',
      )
      .get(roadmapId)?.count ?? 0
  db.run('INSERT INTO sections (id, roadmap_id, label, color, position) VALUES (?, ?, ?, ?, ?)', [
    data.id,
    roadmapId,
    data.label,
    data.color,
    position,
  ])
  return rowToSection(
    db.query<SectionRow, [string]>('SELECT * FROM sections WHERE id = ?').get(data.id)!,
    db,
  )
}

export function updateSection(
  db: Database,
  sectionId: string,
  data: { label?: string; color?: string; version: number },
): DbResult<Section> {
  const current = db
    .query<SectionRow, [string]>('SELECT * FROM sections WHERE id = ?')
    .get(sectionId)
  if (!current) return { status: 'not_found' }
  if (current.version !== data.version)
    return { status: 'conflict', current: rowToSection(current, db) }

  db.run(
    'UPDATE sections SET label = ?, color = ?, version = version + 1 WHERE id = ? AND version = ?',
    [data.label ?? current.label, data.color ?? current.color, sectionId, data.version],
  )

  const updated = db
    .query<SectionRow, [string]>('SELECT * FROM sections WHERE id = ?')
    .get(sectionId)!
  return { status: 'ok', data: rowToSection(updated, db) }
}

export function deleteSection(db: Database, sectionId: string): boolean {
  db.run('DELETE FROM sections WHERE id = ?', [sectionId])
  return true
}
