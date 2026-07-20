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

test('question-first path reaches clean discovery without exposing the question', async ({
  page,
}) => {
  test.skip(
    !canExerciseDataBackedRoutes,
    'Set DATABASE_URL or PLAYWRIGHT_BASE_URL to exercise data-backed discovery'
  )

  const response = await page.goto('/')

  expect(response?.ok()).toBe(true)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /what are you trying to decide/i,
    })
  ).toBeVisible()

  const question = 'Should I switch majors before recruiting starts?'
  await page.getByRole('textbox', { name: /what are you trying to decide/i }).fill(question)
  await page.getByRole('button', { name: 'Find a mentor' }).click()
  await page.waitForURL(url => url.pathname === '/find')

  const discoveryUrl = new URL(page.url())
  expect(discoveryUrl.searchParams.has('decisionQuestion')).toBe(false)
  expect(discoveryUrl.searchParams.has('question')).toBe(false)
  expect(page.url()).not.toContain(encodeURIComponent(question))
  await expect(page.getByRole('paragraph').filter({ hasText: question })).toBeVisible()
})

test('homepage keeps one clear question action', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.ok()).toBe(true)

  const composer = page.locator('#decision-composer')
  await expect(composer).toBeVisible()
  await expect(composer.getByRole('button', { name: 'Find a mentor' })).toHaveCount(1)
})

test('public about page renders without mutating application state', async ({ page }) => {
  const response = await page.goto('/about')

  expect(response?.ok()).toBe(true)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /the facts are only part of the choice/i,
    })
  ).toBeVisible()
})

test('sign-in page exposes mentor and student paths without submitting', async ({ page }) => {
  const response = await page.goto('/auth')

  expect(response?.ok()).toBe(true)
  await expect(page.getByRole('heading', { level: 1, name: 'Mentor sign in' })).toBeVisible()
  await page.getByRole('tab', { name: 'Student' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Discuno' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'href',
    '/privacy'
  )
})
