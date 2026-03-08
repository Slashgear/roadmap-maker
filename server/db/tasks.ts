import type { Sql } from 'postgres'
import type { Task, TaskStatus, TaskType } from '../../client/src/types'

export type TaskRow = {
  id: string
  section_id: string
  label: string
  start_date: string
  end_date: string
  status: string
  type: string
  note: string | null
  external_link: string | null
  position: number
  version: number
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    sectionId: row.section_id,
    label: row.label,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as TaskStatus,
    type: row.type as TaskType,
    note: row.note ?? undefined,
    externalLink: row.external_link ?? undefined,
    position: row.position,
    version: row.version,
  }
}

export async function getTasksBySectionId(sql: Sql, sectionId: string): Promise<Task[]> {
  const rows = await sql<
    TaskRow[]
  >`SELECT * FROM tasks WHERE section_id = ${sectionId} ORDER BY position`
  return rows.map(rowToTask)
}

export type DbResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'conflict'; current: T }
  | { status: 'not_found' }

export async function createTask(
  sql: Sql,
  sectionId: string,
  data: Omit<Task, 'id' | 'sectionId' | 'position' | 'version'> & { id: string },
): Promise<Task> {
  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM tasks WHERE section_id = ${sectionId}
  `
  const position = count
  await sql`
    INSERT INTO tasks (id, section_id, label, start_date, end_date, status, type, note, external_link, position)
    VALUES (
      ${data.id}, ${sectionId}, ${data.label}, ${data.startDate}, ${data.endDate},
      ${data.status}, ${data.type}, ${data.note ?? null}, ${data.externalLink ?? null}, ${position}
    )
  `
  const [row] = await sql<TaskRow[]>`SELECT * FROM tasks WHERE id = ${data.id}`
  return rowToTask(row)
}

export async function updateTask(
  sql: Sql,
  taskId: string,
  data: Partial<Omit<Task, 'id' | 'sectionId'>> & { version: number },
): Promise<DbResult<Task>> {
  const [current] = await sql<TaskRow[]>`SELECT * FROM tasks WHERE id = ${taskId}`
  if (!current) return { status: 'not_found' }
  if (current.version !== data.version) return { status: 'conflict', current: rowToTask(current) }

  await sql`
    UPDATE tasks SET
      label = ${data.label ?? current.label},
      start_date = ${data.startDate ?? current.start_date},
      end_date = ${data.endDate ?? current.end_date},
      status = ${data.status ?? current.status},
      type = ${data.type ?? current.type},
      note = ${data.note !== undefined ? (data.note ?? null) : current.note},
      external_link = ${data.externalLink !== undefined ? (data.externalLink ?? null) : current.external_link},
      version = version + 1
    WHERE id = ${taskId} AND version = ${data.version}
  `

  const [updated] = await sql<TaskRow[]>`SELECT * FROM tasks WHERE id = ${taskId}`
  return { status: 'ok', data: rowToTask(updated) }
}

export async function deleteTask(sql: Sql, taskId: string): Promise<boolean> {
  await sql`DELETE FROM tasks WHERE id = ${taskId}`
  return true
}
