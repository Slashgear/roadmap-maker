import { test, expect, AUTH_TOKEN } from './fixtures'
import { chromium } from '@playwright/test'

// ── Auth ──────────────────────────────────────────────────────────────────────

test('invalid token shows error message', async ({ page }) => {
  await page.goto('/')
  await page.locator('#token').fill('wrong-token')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Invalid token')).toBeVisible()
})

test('valid token shows team indicator', async ({ authedPage }) => {
  await expect(authedPage.getByTestId('team-indicator')).toBeVisible()
})

// ── Roadmap CRUD ──────────────────────────────────────────────────────────────

test('create a roadmap', async ({ authedPage: page }) => {
  await page.getByTestId('btn-new-roadmap').click()

  await page.locator('#f-title').fill('E2E Test Roadmap')
  await page.locator('#f-start-date').fill('2026-01-01')
  await page.locator('#f-end-date').fill('2026-12-31')
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'E2E Test Roadmap' })).toBeVisible()
  await expect(page.locator('#roadmap-picker')).toContainText('E2E Test Roadmap')
})

test('delete a roadmap returns to empty state', async ({ authedPage: page }) => {
  // Create one first
  await page.getByTestId('btn-new-roadmap').click()
  await page.locator('#f-title').fill('Roadmap To Delete')
  await page.locator('#f-start-date').fill('2026-01-01')
  await page.locator('#f-end-date').fill('2026-12-31')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Roadmap To Delete' })).toBeVisible()

  // Delete it via ··· dropdown
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete' }).click()

  // Should return to empty state
  await expect(page.getByRole('heading', { name: 'Roadmap Maker' })).toBeVisible()
})

// ── Section + Task ────────────────────────────────────────────────────────────

test('add a section appears in the gantt', async ({ authedPage: page }) => {
  // Create roadmap first
  await page.getByTestId('btn-new-roadmap').click()
  await page.locator('#f-title').fill('Section Test Roadmap')
  await page.locator('#f-start-date').fill('2026-01-01')
  await page.locator('#f-end-date').fill('2026-12-31')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Section Test Roadmap' })).toBeVisible()

  // Add section
  await page.getByTestId('btn-new-section').click()
  await page.locator('#f-name').fill('Design')
  await page.getByRole('button', { name: 'Save' }).click()

  // Section label should appear in the gantt
  await expect(page.locator('#main-chart').getByText('Design').first()).toBeVisible()
})

test('add a task appears in the chart', async ({ authedPage: page }) => {
  // Create roadmap
  await page.getByTestId('btn-new-roadmap').click()
  await page.locator('#f-title').fill('Task Test Roadmap')
  await page.locator('#f-start-date').fill('2026-01-01')
  await page.locator('#f-end-date').fill('2026-12-31')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Task Test Roadmap' })).toBeVisible()

  // Add section
  await page.getByTestId('btn-new-section').click()
  await page.locator('#f-name').fill('Engineering')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('#main-chart').getByText('Engineering').first()).toBeVisible()

  // Add task (button appears twice due to sticky layout, use first)
  await page.getByRole('button', { name: 'Add task to Engineering' }).first().click()
  await page.locator('#f-name').fill('Implement login')
  await page.locator('input[type="date"]').first().fill('2026-02-01')
  await page.locator('input[type="date"]').nth(1).fill('2026-02-28')
  await page.getByRole('button', { name: 'Save' }).click()

  // Task label should appear in chart
  await expect(page.locator('#main-chart').getByText('Implement login').first()).toBeVisible()
})

// ── SSE — real-time sync between two tabs ─────────────────────────────────────

test('syncs task creation between two tabs', async ({ browser }) => {
  // Set up two independent browser contexts (distinct sessions)
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()

  const p1 = await ctx1.newPage()
  const p2 = await ctx2.newPage()

  try {
    async function login(page: typeof p1) {
      await page.locator('#token').fill(AUTH_TOKEN)
      await page.getByRole('button', { name: 'Sign in' }).click()
      await expect(page.getByTestId('team-indicator')).toBeVisible()
    }

    // p1 logs in, creates roadmap + section
    await p1.goto('/')
    await login(p1)

    await p1.getByTestId('btn-new-roadmap').click()
    await p1.locator('#f-title').fill('SSE Sync Test')
    await p1.locator('#f-start-date').fill('2026-01-01')
    await p1.locator('#f-end-date').fill('2026-12-31')
    await p1.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(p1.getByRole('heading', { name: 'SSE Sync Test' })).toBeVisible()

    await p1.getByTestId('btn-new-section').click()
    await p1.locator('#f-name').fill('Backend')
    await p1.getByRole('button', { name: 'Save' }).click()
    await expect(p1.locator('#main-chart').getByText('Backend').first()).toBeVisible()

    // Get the slug — p2 navigates to /#slug BEFORE logging in
    // so that when loadRoadmapList fires post-auth, the hash is already set
    const hash = await p1.evaluate(() => window.location.hash)
    const slug = hash.slice(1)

    await p2.goto(`/#${slug}`)
    await login(p2)

    // After auth, the app auto-selects the roadmap from the hash
    await expect(p2.getByRole('heading', { name: 'SSE Sync Test' })).toBeVisible()
    await expect(p2.locator('#main-chart').getByText('Backend').first()).toBeVisible()

    // p1 adds a task
    await p1.getByRole('button', { name: 'Add task to Backend' }).first().click()
    await p1.locator('#f-name').fill('Setup DB')
    await p1.locator('input[type="date"]').first().fill('2026-03-01')
    await p1.locator('input[type="date"]').nth(1).fill('2026-03-15')
    await p1.getByRole('button', { name: 'Save' }).click()
    await expect(p1.locator('#main-chart').getByText('Setup DB').first()).toBeVisible()

    // p2 should receive the task via SSE without reloading
    await expect(p2.locator('#main-chart').getByText('Setup DB').first()).toBeVisible({
      timeout: 5_000,
    })
  } finally {
    await ctx1.close()
    await ctx2.close()
  }
})
