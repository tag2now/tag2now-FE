import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes } from '../helpers/mock-api'

test.describe('Community', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/')
    await dismissPatchNotes(page)
    await page.locator('button.tab-btn', { hasText: '커뮤니티' }).click()
  })

  test('post list renders with titles', async ({ page }) => {
    await expect(page.locator('text=Best tag combos for Jin/Devil Jin')).toBeVisible()
    await expect(page.locator('text=Looking for sparring partners')).toBeVisible()
    await expect(page.locator('text=Lars wall carry nerfed?')).toBeVisible()
  })

  test('filter buttons are visible', async ({ page }) => {
    await expect(page.locator('button', { hasText: '전체' })).toBeVisible()
    await expect(page.locator('button', { hasText: '자유' })).toBeVisible()
    await expect(page.locator('button', { hasText: '랭매구인' })).toBeVisible()
  })

  test('clicking filter button triggers API call with post_type', async ({ page }) => {
    const requestPromise = page.waitForRequest((req) =>
      req.url().includes('/api/community/posts') && req.url().includes('post_type')
    )
    await page.locator('button', { hasText: '자유' }).click()
    await requestPromise
  })

  test('clicking a post opens detail view', async ({ page }) => {
    await page.locator('button', { hasText: 'Best tag combos for Jin/Devil Jin' }).click()

    // Wait for the back button to appear (signals detail view loaded)
    await page.locator('button', { hasText: '목록' }).waitFor({ timeout: 10_000 })

    // Post detail shows title and body
    await expect(page.locator('text=Best tag combos for Jin/Devil Jin')).toBeVisible()
    await expect(page.locator('text=Mishima-style moves')).toBeVisible()
  })

  test('post detail shows comments', async ({ page }) => {
    await page.locator('button', { hasText: 'Best tag combos for Jin/Devil Jin' }).click()
    await page.locator('button', { hasText: '목록' }).waitFor({ timeout: 10_000 })

    await expect(page.locator('text=Great guide! EWGF into tag assault is devastating.')).toBeVisible()
    await expect(page.locator('text=What are the best wall carry routes?')).toBeVisible()
  })

  test('post detail shows nested reply', async ({ page }) => {
    await page.locator('button', { hasText: 'Best tag combos for Jin/Devil Jin' }).click()
    await page.locator('button', { hasText: '목록' }).waitFor({ timeout: 10_000 })

    await expect(page.locator('text=Thanks! Yeah the damage scaling is really favorable.')).toBeVisible()
  })

  test('write button opens create post form', async ({ page }) => {
    await page.locator('button', { hasText: '글쓰기' }).click()

    // CreatePostForm should have title/body inputs and submit
    await expect(page.locator('input, textarea').first()).toBeVisible()
  })
})
