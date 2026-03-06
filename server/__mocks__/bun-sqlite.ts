/**
 * bun:sqlite compatibility shim for vitest (Node.js runtime).
 * Maps bun:sqlite API surface to node:sqlite (available in Node.js >= 22.5).
 * Used only in tests — production code uses the native bun:sqlite module.
 */
import { DatabaseSync } from 'node:sqlite'

class QueryProxy<T> {
  constructor(
    private readonly sql: string,
    private readonly db: DatabaseSync,
  ) {}

  all(...params: unknown[]): T[] {
    const stmt = this.db.prepare(this.sql)
    return stmt.all(...params) as T[]
  }

  get(...params: unknown[]): T | null {
    const stmt = this.db.prepare(this.sql)
    const result = stmt.get(...params)
    return (result ?? null) as T | null
  }
}

export class Database {
  private readonly db: DatabaseSync

  constructor(path: string, _options?: { create?: boolean; readonly?: boolean }) {
    this.db = new DatabaseSync(path)
  }

  run(sql: string, params?: unknown[]): void {
    if (params && params.length > 0) {
      this.db.prepare(sql).run(...params)
    } else {
      this.db.exec(sql)
    }
  }

  query<T = Record<string, unknown>, _P extends unknown[] = []>(sql: string): QueryProxy<T> {
    return new QueryProxy<T>(sql, this.db)
  }

  close(): void {
    this.db.close()
  }
}
