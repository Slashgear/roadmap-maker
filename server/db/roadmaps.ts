import type { Sql } from 'postgres'
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

async function rowToRoadmap(row: RoadmapRow, sql: Sql, withSections = true): Promise<Roadmap> {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    startDate: row.start_date,
    endDate: row.end_date,
    version: row.version,
    sections: withSections ? await getSectionsByRoadmapId(sql, row.id) : [],
  }
}

export async function getRoadmapList(sql: Sql): Promise<Omit<Roadmap, 'sections'>[]> {
  const rows = await sql<RoadmapRow[]>`SELECT * FROM roadmaps ORDER BY created_at`
  return Promise.all(rows.map((r) => rowToRoadmap(r, sql, false)))
}

export async function getRoadmapBySlug(sql: Sql, slug: string): Promise<Roadmap | null> {
  const [row] = await sql<RoadmapRow[]>`SELECT * FROM roadmaps WHERE slug = ${slug}`
  if (!row) return null
  return rowToRoadmap(row, sql)
}

export async function createRoadmap(
  sql: Sql,
  data: {
    id: string
    slug: string
    title: string
    subtitle?: string | null
    startDate: string
    endDate: string
  },
): Promise<Roadmap> {
  await sql`
    INSERT INTO roadmaps (id, slug, title, subtitle, start_date, end_date)
    VALUES (${data.id}, ${data.slug}, ${data.title}, ${data.subtitle ?? null}, ${data.startDate}, ${data.endDate})
  `
  return (await getRoadmapBySlug(sql, data.slug))!
}

export async function updateRoadmap(
  sql: Sql,
  slug: string,
  data: {
    title?: string
    subtitle?: string | null
    startDate?: string
    endDate?: string
    newSlug?: string
    version: number
  },
): Promise<DbResult<Roadmap>> {
  const [current] = await sql<RoadmapRow[]>`SELECT * FROM roadmaps WHERE slug = ${slug}`
  if (!current) return { status: 'not_found' }
  if (current.version !== data.version) {
    return { status: 'conflict', current: await rowToRoadmap(current, sql) }
  }

  await sql`
    UPDATE roadmaps SET
      title      = ${data.title ?? current.title},
      subtitle   = ${data.subtitle !== undefined ? (data.subtitle ?? null) : current.subtitle},
      start_date = ${data.startDate ?? current.start_date},
      end_date   = ${data.endDate ?? current.end_date},
      slug       = ${data.newSlug ?? current.slug},
      version    = version + 1,
      updated_at = NOW()
    WHERE slug = ${slug} AND version = ${data.version}
  `

  const updatedSlug = data.newSlug ?? slug
  const [updated] = await sql<RoadmapRow[]>`SELECT * FROM roadmaps WHERE slug = ${updatedSlug}`
  return { status: 'ok', data: await rowToRoadmap(updated, sql) }
}

export async function deleteRoadmap(sql: Sql, slug: string): Promise<boolean> {
  await sql`DELETE FROM roadmaps WHERE slug = ${slug}`
  return true
}
