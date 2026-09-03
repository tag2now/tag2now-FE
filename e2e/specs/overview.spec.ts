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
    // A real link, not a button: middle-click opens it in a tab and the back
    // button undoes the jump, neither of which a click handler would give.
    await section.getByRole('link', { name: '통계' }).click()

    await expect(page).toHaveURL(/\/stats$/)
    // Scoped to the main nav: the stats tab has sub-tabs of its own whose names
    // would otherwise match ("접속자 통계").
    const nav = page.getByRole('tablist', { name: 'Main navigation' })
    await expect(nav.getByRole('tab', { name: '통계' })).toHaveAttribute('aria-selected', 'true')
    await expect(nav.getByRole('tab', { name: '개요' })).toHaveAttribute('aria-selected', 'false')
  })

  // The summary rows are entry points, not just readouts: clicking one opens
  // the item it describes rather than dropping the reader at a list.
  test('a post row opens that post', async ({ page }) => {
    const section = page.getByRole('region', { name: '최신 게시글' })
    // Not .getByRole('link').first() — that is the header's link to the tab.
    await section.getByRole('listitem').first().getByRole('link').click()

    await expect(page).toHaveURL(/\/community\/\d+$/)
    await expect(page.getByRole('button', { name: /목록/ })).toBeVisible()
  })

  test('a reservation row opens that reservation', async ({ page }) => {
    const section = page.getByRole('region', { name: '모집 중인 예약' })
    await section.getByRole('link', { name: /모집중호스트/ }).click()

    await expect(page).toHaveURL(/\/reservation\/1$/)
    const nav = page.getByRole('tablist', { name: 'Main navigation' })
    await expect(nav.getByRole('tab', { name: /^예약/ })).toHaveAttribute('aria-selected', 'true')
  })

  // Deep links are the reason the tabs became routes at all: a shared link has
  // to open on the post itself, cold, with no click path behind it.
  test('a post link opens the post directly', async ({ page }) => {
    await page.goto('/community/1')
    await dismissPatchNotes(page)

    await expect(page.getByRole('button', { name: /목록/ })).toBeVisible()
    const nav = page.getByRole('tablist', { name: 'Main navigation' })
    await expect(nav.getByRole('tab', { name: '커뮤니티' })).toHaveAttribute('aria-selected', 'true')
  })

  test('the back button undoes a row click', async ({ page }) => {
    await page.getByRole('region', { name: '최신 게시글' }).getByRole('listitem').first().getByRole('link').click()
    await expect(page).toHaveURL(/\/community\/\d+$/)

    await page.goBack()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: '한눈에 보기' })).toBeVisible()
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
