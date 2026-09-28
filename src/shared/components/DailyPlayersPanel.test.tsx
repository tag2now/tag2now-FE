import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import DailyPlayersPanel from '@/shared/components/DailyPlayersPanel'
import { statDayOf } from '@/shared/util/completedDays'
import type { DailySummary } from '@/stat/types'

vi.mock('@/shared/components/DailyChart', () => ({
  default: ({ data }: { data: DailySummary[] }) => <span data-testid="daily-chart">{data.map((row) => row.date).join(',')}</span>,
}))

it('draws the daily chart under an h4, for the page to head with its own h3', () => {
  render(<DailyPlayersPanel data={[]} />)

  expect(screen.getByRole('region', { name: /일별 접속자/ })).toContainElement(screen.getByTestId('daily-chart'))
  expect(screen.getByRole('heading', { name: /일별 접속자/, level: 4 })).toBeInTheDocument()
})

it('leaves the statistics day in progress out of the chart', () => {
  const today = statDayOf(new Date())
  const daily: DailySummary[] = [
    { date: '2026-01-01', peak_players: 10, avg_players: 5, unique_players: 40 },
    { date: today, peak_players: 2, avg_players: 1, unique_players: 3 },
  ]

  render(<DailyPlayersPanel data={daily} />)

  expect(screen.getByTestId('daily-chart')).toHaveTextContent(/^2026-01-01$/)
})
