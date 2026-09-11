import { test, expect } from '@playwright/test'
import { dismissPatchNotes, mockAllApis, reservationAt } from '../helpers/mock-api'

test('shows the completed reservation roster in the detail panel', async ({ page }) => {
  const reservation = {
    ...reservationAt(21, { capacity: 2, participant_count: 2, status: 'matched' }),
    participants: [{ id: 1, display_name: 'TTT2_Master' }, { id: 2, display_name: 'KingOfIronFist' }],
  }
  await mockAllApis(page, { reservations: [reservation] })
  await page.goto('/reservation/1')
  await dismissPatchNotes(page)
  const detail = page.getByRole('complementary', { name: '선택한 예약 상세' })
  const roster = detail.getByRole('region', { name: '참가자 명단' })
  await roster.scrollIntoViewIfNeeded()
  await expect(roster).toContainText('참가자 2/2명')
  await expect(roster.getByRole('listitem', { name: 'TTT2_Master', exact: true })).toBeVisible()
  await expect(roster.getByRole('listitem', { name: 'KingOfIronFist', exact: true })).toBeVisible()
  await expect(detail.getByRole('button', { name: '모집 완료' })).toBeDisabled()
  await expect(roster.getByText('TTT2_Master', { exact: true })).toBeInViewport()
  const player = roster.getByRole('listitem', { name: 'KingOfIronFist', exact: true })
  await expect(player.getByLabel('리더보드 2위', { exact: true })).toBeVisible()
  await expect(player.getByLabel('최고 계급 Destroyer', { exact: true })).toBeVisible()
  const badge = player.getByRole('img', { name: 'Destroyer', exact: true })
  await expect.poll(() => badge.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await page.screenshot({ path: test.info().outputPath('reservation-roster.png'), fullPage: true })
})
