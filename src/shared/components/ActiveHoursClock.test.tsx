import { render } from '@testing-library/react'

import ActiveHoursClock from '@/shared/components/ActiveHoursClock'

const activityWindow = (hours: number[]) =>
  render(<ActiveHoursClock hours={hours} />).container.querySelector('svg')!.getAttribute('aria-label')

it('reports a daytime run as it reads on the clock', () => {
  expect(activityWindow([13, 14, 15, 16])).toBe('주요 활동 시간 13:00–17:00, 총 4시간')
})

it('keeps a run that crosses midnight in one piece', () => {
  expect(activityWindow([22, 23, 0, 1, 2, 3])).toBe('주요 활동 시간 22:00–04:00, 총 6시간')
})

it('prefers the longer run when one wraps and one does not', () => {
  expect(activityWindow([10, 11, 23, 0, 1, 2])).toBe('주요 활동 시간 23:00–03:00, 총 6시간')
})

it('says so when there is nothing recorded', () => {
  expect(activityWindow([])).toBe('주요 활동 시간 기록 없음, 총 0시간')
})

const stripHours = (hours: number[]) =>
  Array.from(
    render(<ActiveHoursClock hours={hours} />).container.querySelectorAll('.activity-timeline-cells span'),
  ).map((cell) => cell.getAttribute('title'))

// 08:00 to 08:00 --- the hour a person's day starts, which is the cut this
// strip is about. The aggregate charts use their own boundary.
it("runs the timeline strip from the start of a player's day", () => {
  const titles = stripHours([])
  expect(titles).toHaveLength(24)
  expect(titles[0]).toBe('08:00')
  expect(titles[23]).toBe('07:00')
})

it('keeps a late-night session contiguous at the end of the strip', () => {
  const active = stripHours([22, 23, 0, 1, 2])
    .map((title, index) => ({ title, index }))
    .filter(({ title }) => ['22:00', '23:00', '00:00', '01:00', '02:00'].includes(title!))
    .map(({ index }) => index)

  // Five adjacent cells, not two groups split across the strip's two ends.
  // 22:00 is 14 hours after the 08:00 the strip opens on.
  expect(active).toEqual([14, 15, 16, 17, 18])
})
