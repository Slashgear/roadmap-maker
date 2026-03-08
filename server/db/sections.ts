import type { Sql } from 'postgres'
import type { Section, SectionColor } from '../../client/src/types'
import { getTasksBySectionId, rowToTask } from './tasks'
import type { DbResult, TaskRow } from './tasks'

type SectionRow = {
  id: string
  roadmap_id: string
  label: string
  color: string
  position: number
  version: number
}

async function rowToSection(row: SectionRow, sql: Sql): Promise<Section> {
  return {
    id: row.id,
    roadmapId: row.roadmap_id,
    label: row.label,
    color: row.color as SectionColor,
    position: row.position,
    version: row.version,
    tasks: await getTasksBySectionId(sql, row.id),
  }
}

export async function getSectionsByRoadmapId(sql: Sql, roadmapId: string): Promise<Section[]> {
  const sectionRows = await sql<
    SectionRow[]
  >`SELECT * FROM sections WHERE roadmap_id = ${roadmapId} ORDER BY position`
  if (sectionRows.length === 0) return []

  const sectionIds = sectionRows.map((s) => s.id)
  const taskRows = await sql<
    TaskRow[]
  >`SELECT * FROM tasks WHERE section_id = ANY(${sectionIds}) ORDER BY position`

  const tasksBySection = new Map<string, ReturnType<typeof rowToTask>[]>()
  for (const row of taskRows) {
    const list = tasksBySection.get(row.section_id) ?? []
    list.push(rowToTask(row))
    tasksBySection.set(row.section_id, list)
  }

  return sectionRows.map((row) => ({
    id: row.id,
    roadmapId: row.roadmap_id,
    label: row.label,
    color: row.color as SectionColor,
    position: row.position,
    version: row.version,
    tasks: tasksBySection.get(row.id) ?? [],
  }))
}

export async function createSection(
  sql: Sql,
  roadmapId: string,
  data: { id: string; label: string; color: string },
): Promise<Section> {
  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM sections WHERE roadmap_id = ${roadmapId}
  `
  const position = count
  await sql`
    INSERT INTO sections (id, roadmap_id, label, color, position)
    VALUES (${data.id}, ${roadmapId}, ${data.label}, ${data.color}, ${position})
  `
  const [row] = await sql<SectionRow[]>`SELECT * FROM sections WHERE id = ${data.id}`
  return rowToSection(row, sql)
}

export async function updateSection(
  sql: Sql,
  sectionId: string,
  data: { label?: string; color?: string; version: number },
): Promise<DbResult<Section>> {
  const [current] = await sql<SectionRow[]>`SELECT * FROM sections WHERE id = ${sectionId}`
  if (!current) return { status: 'not_found' }
  if (current.version !== data.version)
    return { status: 'conflict', current: await rowToSection(current, sql) }

  await sql`
    UPDATE sections
    SET label = ${data.label ?? current.label}, color = ${data.color ?? current.color}, version = version + 1
    WHERE id = ${sectionId} AND version = ${data.version}
  `

  const [updated] = await sql<SectionRow[]>`SELECT * FROM sections WHERE id = ${sectionId}`
  return { status: 'ok', data: await rowToSection(updated, sql) }
}

export async function deleteSection(sql: Sql, sectionId: string): Promise<boolean> {
  await sql`DELETE FROM sections WHERE id = ${sectionId}`
  return true
}

export async function reorderSections(sql: Sql, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) => sql`UPDATE sections SET position = ${index} WHERE id = ${id}`),
  )
}
