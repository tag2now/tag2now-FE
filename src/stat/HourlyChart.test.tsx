import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import HourlyChart from '@/stat/HourlyChart'
import { DAY_START_HOUR } from '@/shared/dayBoundary'
import type { HourlyActivity } from '@/stat/types'

vi.mock('recharts', () => ({
  Bar: ({ dataKey }: { dataKey: string }) => <span data-testid="series" data-mark="bar">{dataKey}</span>,
  BarChart: ({ data, children }: { data: HourlyActivity[]; children: React.ReactNode }) => (
    <div data-testid="chart" data-hours={data.map((row) => row.hour).join(',')}>{children}</div>
  ),
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

/** The 24 rows in the order the backend sends them: its statistics day, from 06:00. */
const fromSixAm: HourlyActivity[] = Array.from({ length: 24 }, (_, offset) => ({
  hour: (6 + offset) % 24,
  avg_players: 1,
  peak_players: 2,
}))

it('starts the day at the player day boundary, whatever order the rows arrive in', () => {
  render(<HourlyChart data={fromSixAm} />)

  const hours = screen.getByTestId('chart').dataset.hours!.split(',').map(Number)
  expect(hours).toHaveLength(24)
  expect(hours[0]).toBe(DAY_START_HOUR)
  expect(hours[23]).toBe((DAY_START_HOUR + 23) % 24)
})

it('draws only the peak, as bars, without the average', () => {
  render(<HourlyChart data={fromSixAm} />)

  expect(screen.getAllByTestId('series').map((series) => [series.dataset.mark, series.textContent])).toEqual([
    ['bar', 'peak_players'],
  ])
})

it('says there is no data instead of drawing an empty chart', () => {
  render(<HourlyChart data={[]} />)

  expect(screen.getByText('데이터 없음')).toBeInTheDocument()
  expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
})
