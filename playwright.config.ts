import { defineConfig, devices } from '@playwright/test'

const E2E_PORT = 8099
const AUTH_TOKEN = 'e2e-secret'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${E2E_PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `PUBLIC_DIR=./public-team AUTH_TOKEN=${AUTH_TOKEN} STORAGE=postgres DATABASE_URL=${process.env.DATABASE_URL ?? 'postgres://roadmaps:roadmaps@localhost:5432/roadmaps'} PORT=${E2E_PORT} bun run server/index.ts`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
  reporter: [['html', { open: 'never' }], ['list']],
})
