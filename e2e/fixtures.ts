import { test as base, expect, type Page } from '@playwright/test'

export const AUTH_TOKEN = 'e2e-secret'

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await page.goto('/')
    await page.locator('#token').fill(AUTH_TOKEN)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByTestId('team-indicator')).toBeVisible()
    await use(page)
  },
})

export { expect }
