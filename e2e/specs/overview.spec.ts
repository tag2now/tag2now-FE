import { test, expect } from '@playwright/test'
import { mockAllApis, dismissPatchNotes, reservationAt } from '../helpers/mock-api'

// The overview is a summary, so what is worth asserting is that each card
// reflects its own source and that the links out actually change tabs — not the
// layout, which the visual suite covers.
test.describe('Overview', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, {
      reservations: [
        reservationAt(20, { id: 1, host_display_name: '모집중호스트', capacity: 4, participant_count: 1 }),
        reservationAt(21, { id: 2, host_display_name: '자리없음호스트', capacity: 2, participant_count: 2 }),
      ],
    })
    await page.goto('/')
    await dismissPatchNotes(page)
  })

  test('shows live room figures alongside the historical peak', async ({ page }) => {
    const players = page.getByText('접속자', { exact: true }).locator('..').locator('..')
    await expect(players).toContainText('6')  // rooms fixture: 6 users across both groups

    // The daily fixture ends 55 then 47: today's peak is the last entry, and
    // the hint compares it against the one before.
    await expect(page.getByText('어제 55명')).toBeVisible()
  })

  test('summarises each feature from its own endpoint', async ({ page }) => {
    await expect(page.getByText('132판')).toBeVisible()
    await expect(page.getByText('모집중호스트')).toBeVisible()
  })

  test('joins weekly players to their leaderboard characters', async ({ page }) => {
    const weekly = page.getByRole('region', { name: '주간 철악귀' })

    // TagComboKing tops the weekly fixture and plays Lars/Alisa on the
    // leaderboard; the portraits have to come from that join, not the weekly
    // endpoint, which knows only match counts.
    const top = weekly.locator('.overview-rank-row').first()
    await expect(top.locator('img[alt="Lars"]')).toBeVisible()
    await expect(top.locator('img[alt="Alisa"]')).toBeVisible()

    // A weekly player absent from the leaderboard keeps its columns as dashes.
    const unranked = weekly.locator('.overview-rank-row', { hasText: 'UnrankedPlayer' })
    await expect(unranked.locator('.mini-char.is-empty')).toHaveCount(2)
  })

  test('omits a reservation nobody can still join', async ({ page }) => {
    await expect(page.getByText('모집중호스트')).toBeVisible()
    await expect(page.getByText('자리없음호스트')).toHaveCount(0)
  })

  test('each section links to the tab it summarises', async ({ page }) => {
    const section = page.getByRole('region', { name: '주간 철악귀' })
    await section.getByRole('button', { name: '통계' }).click()

    // Scoped to the main nav: the stats tab has sub-tabs of its own whose names
    // would otherwise match ("접속자 통계").
    const nav = page.getByRole('tablist', { name: 'Main navigation' })
    await expect(nav.getByRole('tab', { name: '통계' })).toHaveAttribute('aria-selected', 'true')
    await expect(nav.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'false')
  })

  test('a failing source costs only its own card', async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await mockAllApis(page, { failEndpoints: ['history'] })
    await page.goto('/')
    await dismissPatchNotes(page)

    // The history endpoints are down, but rooms still are not: the KPI row and
    // the reservation card have to survive their neighbour failing.
    await expect(page.getByRole('heading', { name: '한눈에 보기' })).toBeVisible()
    await expect(page.getByRole('region', { name: '주간 철악귀' })).toContainText('데이터 없음')
  })
})
