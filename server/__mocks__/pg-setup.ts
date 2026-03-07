import postgres from 'postgres'
import type { Sql } from 'postgres'
import { applySchema } from '../db/init'

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://roadmaps:roadmaps@localhost:5432/roadmaps'

/**
 * Creates a Sql instance connected to the test database.
 * Applies the schema (idempotent) and truncates all data for test isolation.
 * Requires a running PostgreSQL instance (docker compose up -d).
 */
export async function createTestSql(): Promise<Sql> {
  const sql = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} })
  await applySchema(sql)
  await sql`TRUNCATE TABLE roadmaps CASCADE`
  return sql
}
