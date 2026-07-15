import { expect, test, type Page } from '@playwright/test'

const canExerciseDataBackedRoutes = Boolean(
  process.env.PLAYWRIGHT_BASE_URL ?? process.env.DATABASE_URL
)

const preventTestAccountCreation = async (page: Page) => {
  await page.route('**/api/auth/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    })
  })

  await page.route('https://*.posthog.com/**', async route => {
    await route.abort()
  })
}

test.beforeEach(async ({ page }) => {
  await preventTestAccountCreation(page)
})

test('public discovery page renders its primary path', async ({ page }) => {
  test.skip(
    !canExerciseDataBackedRoutes,
    'Set DATABASE_URL or PLAYWRIGHT_BASE_URL to exercise data-backed discovery'
  )

  const response = await page.goto('/')

  expect(response?.ok()).toBe(true)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /before your next big college decision/i,
    })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /find someone who's been there/i })).toBeVisible()
})

test('public about page renders without mutating application state', async ({ page }) => {
  const response = await page.goto('/about')

  expect(response?.ok()).toBe(true)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /no one should have to figure out college entirely from scratch/i,
    })
  ).toBeVisible()
})

test('sign-in page exposes mentor and student paths without submitting', async ({ page }) => {
  const response = await page.goto('/auth')

  expect(response?.ok()).toBe(true)
  await expect(
    page.getByRole('heading', { level: 1, name: /share what you have learned/i })
  ).toBeVisible()
  await page.getByRole('tab', { name: 'Find guidance' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: /keep your details handy/i })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'href',
    '/privacy'
  )
})
