import { render, screen } from '@testing-library/react'
import ActiveHoursTimeline from '@/shared/components/ActiveHoursTimeline'

it('keeps one activity band across midnight with readable endpoints', () => {
  render(<ActiveHoursTimeline hours={[0, 1, 15, 16, 17, 18, 19, 20, 21, 22, 23]} />)

  const range = '오후 3시부터 다음 날 새벽 2시까지'
  expect(screen.getByRole('img', { name: `한국 시간 기준 주요 활동 시간대. ${range}` })).toBeInTheDocument()
  expect(screen.getByTitle(range)).toHaveStyle({ left: '12.5%', width: `${11 / 24 * 100}%` })
  expect(screen.getByText('오후 3시')).toBeVisible()
  expect(screen.getByText('자정')).toBeVisible()
  expect(screen.getByText('새벽 2시')).toBeVisible()
  expect(screen.getByText('하루 중 주요 활동 구간 · 11시간')).toBeVisible()
})

it('reports separate activity bands and counts each hour once', () => {
  render(<ActiveHoursTimeline hours={[22, 8, 9, 22]} />)

  expect(screen.getByRole('img')).toHaveAccessibleName(
    '한국 시간 기준 주요 활동 시간대. 오후 10시부터 오후 11시까지, 오전 8시부터 오전 10시까지',
  )
  expect(screen.getByTitle('오후 10시부터 오후 11시까지')).toBeInTheDocument()
  expect(screen.getByTitle('오전 8시부터 오전 10시까지')).toBeInTheDocument()
  expect(screen.getByText('하루 중 주요 활동 구간 · 3시간')).toBeVisible()
})

it('fills the timeline when every hour is active', () => {
  render(<ActiveHoursTimeline hours={Array.from({ length: 24 }, (_, hour) => hour)} />)

  expect(screen.getByTitle('정오부터 다음 날 정오까지')).toHaveStyle({ left: '0%', width: '100%' })
  expect(screen.getByText('하루 중 주요 활동 구간 · 24시간')).toBeVisible()
})

it('shows the empty state when there are no valid hours', () => {
  render(<ActiveHoursTimeline hours={[-1, 0.5, 24]} />)

  expect(screen.getByText('활동 시간 데이터가 아직 없습니다.')).toBeVisible()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})
