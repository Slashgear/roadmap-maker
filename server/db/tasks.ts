import type { Database } from 'bun:sqlite'
import type { Task, TaskStatus, TaskType } from '../../client/src/types'

type TaskRow = {
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

function rowToTask(row: TaskRow): Task {
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

export function getTasksBySectionId(db: Database, sectionId: string): Task[] {
  const rows = db
    .query<TaskRow, [string]>('SELECT * FROM tasks WHERE section_id = ? ORDER BY position')
    .all(sectionId)
  return rows.map(rowToTask)
}

export type DbResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'conflict'; current: T }
  | { status: 'not_found' }

export function createTask(
  db: Database,
  sectionId: string,
  data: Omit<Task, 'id' | 'sectionId' | 'position' | 'version'> & { id: string },
): Task {
  const position =
    db
      .query<{ count: number }, [string]>(
        'SELECT COUNT(*) as count FROM tasks WHERE section_id = ?',
      )
      .get(sectionId)?.count ?? 0
  db.run(
    `INSERT INTO tasks (id, section_id, label, start_date, end_date, status, type, note, external_link, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      sectionId,
      data.label,
      data.startDate,
      data.endDate,
      data.status,
      data.type,
      data.note ?? null,
      data.externalLink ?? null,
      position,
    ],
  )
  return rowToTask(db.query<TaskRow, [string]>('SELECT * FROM tasks WHERE id = ?').get(data.id)!)
}

export function updateTask(
  db: Database,
  taskId: string,
  data: Partial<Omit<Task, 'id' | 'sectionId'>> & { version: number },
): DbResult<Task> {
  const current = db.query<TaskRow, [string]>('SELECT * FROM tasks WHERE id = ?').get(taskId)
  if (!current) return { status: 'not_found' }
  if (current.version !== data.version) return { status: 'conflict', current: rowToTask(current) }

  db.run(
    `UPDATE tasks SET
      label = ?, start_date = ?, end_date = ?, status = ?, type = ?, note = ?, external_link = ?,
      version = version + 1
     WHERE id = ? AND version = ?`,
    [
      data.label ?? current.label,
      data.startDate ?? current.start_date,
      data.endDate ?? current.end_date,
      data.status ?? current.status,
      data.type ?? current.type,
      data.note !== undefined ? (data.note ?? null) : current.note,
      data.externalLink !== undefined ? (data.externalLink ?? null) : current.external_link,
      taskId,
      data.version,
    ],
  )

  const updated = db.query<TaskRow, [string]>('SELECT * FROM tasks WHERE id = ?').get(taskId)!
  return { status: 'ok', data: rowToTask(updated) }
}

export function deleteTask(db: Database, taskId: string): boolean {
  db.run('DELETE FROM tasks WHERE id = ?', [taskId])
  return true
}
