import postgres from 'postgres'
import type { Sql } from 'postgres'
export type { Sql }

export async function applySchema(sql: Sql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS roadmaps (
    id         TEXT PRIMARY KEY,
    slug       TEXT UNIQUE NOT NULL,
    title      TEXT NOT NULL,
    subtitle   TEXT,
    start_date TEXT NOT NULL,
    end_date   TEXT NOT NULL,
    version    INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`
  await sql`CREATE TABLE IF NOT EXISTS sections (
    id         TEXT PRIMARY KEY,
    roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
    label      TEXT NOT NULL,
    color      TEXT NOT NULL,
    position   INTEGER NOT NULL,
    version    INTEGER NOT NULL DEFAULT 1
  )`
  await sql`CREATE TABLE IF NOT EXISTS tasks (
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
  )`
  await sql`CREATE INDEX IF NOT EXISTS idx_sections_roadmap_id ON sections(roadmap_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_section_id ON tasks(section_id)`
}

export async function createSql(url?: string): Promise<Sql> {
  const sql = postgres(url ?? process.env.DATABASE_URL ?? 'postgres://localhost/roadmaps', {
    max: 10,
  })
  await applySchema(sql)
  return sql
}
