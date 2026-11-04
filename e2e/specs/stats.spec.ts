import { test, expect } from '@playwright/test'
import { mockAllApis, skipPatchNotes } from '../helpers/mock-api'

test.beforeEach(async ({ page }) => {
  await mockAllApis(page)
  await skipPatchNotes(page)
  await page.goto('/stats')
})

test('opens with named, independent period and player-count choices', async ({ page }) => {
  const period = page.getByRole('group', { name: '통계 기간' })
  const limit = page.getByRole('group', { name: '주간 순위 표시 개수' })
  await expect(period.getByRole('radio', { name: '14일' })).toBeChecked()
  await expect(limit.getByRole('radio', { name: '25', exact: true })).toBeChecked()
})

test('keyboard period selection requests both charts for the selected days', async ({ page }) => {
  const period = page.getByRole('group', { name: '통계 기간' })
  await period.getByRole('radio', { name: '14일' }).focus()
  const hourly = page.waitForRequest((request) => {
    const url = new URL(request.url())
    return url.pathname === '/api/history/stats' && url.searchParams.get('days') === '30'
  })
  const daily = page.waitForRequest((request) => {
    const url = new URL(request.url())
    return url.pathname === '/api/history/stats/daily' && url.searchParams.get('days') === '30'
  })
  await page.keyboard.press('ArrowRight')
  await Promise.all([hourly, daily])
  await expect(period.getByRole('radio', { name: '30일' })).toBeChecked()
  await expect(page.getByRole('group', { name: '주간 순위 표시 개수' }).getByRole('radio', { name: '25', exact: true })).toBeChecked()
})

test('keyboard player-count selection leaves the chart period unchanged', async ({ page }) => {
  const limit = page.getByRole('group', { name: '주간 순위 표시 개수' })
  await limit.getByRole('radio', { name: '25', exact: true }).focus()
  const weekly = page.waitForRequest((request) => {
    const url = new URL(request.url())
    return url.pathname === '/api/records/weekly-top' && url.searchParams.get('limit') === '50'
  })
  await page.keyboard.press('ArrowRight')
  await weekly
  await expect(limit.getByRole('radio', { name: '50', exact: true })).toBeChecked()
  await expect(page.getByRole('group', { name: '통계 기간' }).getByRole('radio', { name: '14일' })).toBeChecked()
})

test('selection groups fit the viewport and retain visible focus', async ({ page, isMobile }, testInfo) => {
  const period = page.getByRole('group', { name: '통계 기간' })
  const limit = page.getByRole('group', { name: '주간 순위 표시 개수' })
  await expect(period).toBeVisible()
  await expect(limit).toBeVisible()
  for (const group of [period, limit]) {
    const box = await group.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    if (isMobile) {
      const choice = await group.locator('label').first().boundingBox()
      expect(choice!.height).toBeGreaterThanOrEqual(42)
    }
  }
  const selected = period.getByRole('radio', { name: '14일' })
  await selected.focus()
  await expect(selected).toBeFocused()
  await expect(selected.locator('..')).toHaveCSS('outline-style', 'solid')
  await page.screenshot({ path: testInfo.outputPath('stats-selections.png'), fullPage: true })
})
