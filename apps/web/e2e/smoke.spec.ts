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
      name: /what are you deciding/i,
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

test('public about page renders without mutating application state', async ({ page }) => {
  const response = await page.goto('/about')

  expect(response?.ok()).toBe(true)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /college decisions need context/i,
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
