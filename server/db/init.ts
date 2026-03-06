import { Database } from 'bun:sqlite'

export function initDb(path?: string): Database {
  const dbPath = path ?? process.env.DB_PATH ?? '/data/roadmaps.db'
  const db = new Database(dbPath, { create: true })

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS roadmaps (
      id         TEXT PRIMARY KEY,
      slug       TEXT UNIQUE NOT NULL,
      title      TEXT NOT NULL,
      subtitle   TEXT,
      start_date TEXT NOT NULL,
      end_date   TEXT NOT NULL,
      version    INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS sections (
      id         TEXT PRIMARY KEY,
      roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
      label      TEXT NOT NULL,
      color      TEXT NOT NULL,
      position   INTEGER NOT NULL,
      version    INTEGER NOT NULL DEFAULT 1
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id            TEXT PRIMARY KEY,
      section_id    TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      label         TEXT NOT NULL,
      start_date    TEXT NOT NULL,
      end_date      TEXT NOT NULL,
      status        TEXT NOT NULL,
      type          TEXT NOT NULL,
      note          TEXT,
      external_link TEXT,
      position      INTEGER NOT NULL,
      version       INTEGER NOT NULL DEFAULT 1
    )
  `)

  return db
}
