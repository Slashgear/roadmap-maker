import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Map bun:sqlite to a Node.js-compatible shim when running under vitest
      'bun:sqlite': resolve(import.meta.dirname, 'server/__mocks__/bun-sqlite.ts'),
    },
  },
  test: {
    include: ['server/**/*.test.ts'],
  },
})
