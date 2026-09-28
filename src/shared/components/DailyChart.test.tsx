import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import DailyChart from '@/shared/components/DailyChart'
import type { DailySummary } from '@/stat/types'

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Legend: () => null,
  Line: ({ dataKey, type, dot }: { dataKey: string; type: string; dot: unknown }) => (
    <span data-testid="series" data-curve={type} data-dotted={String(Boolean(dot))}>{dataKey}</span>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

it('renders both concurrent-peak and daily unique-player series', () => {
  render(<DailyChart data={[{ date: '2026-09-03', peak_players: 2, avg_players: 1, unique_players: 7 }]} />)

  // Unique players is declared first because it is the larger series and the
  // one drawn on top — recharts takes the legend and tooltip order from this,
  // so the two used to list the series in the opposite order to the eye.
  expect(screen.getAllByTestId('series')).toHaveLength(2)
  expect(screen.getAllByTestId('series').map((series) => series.textContent)).toEqual(['unique_players', 'peak_players'])
})

const days = (count: number): DailySummary[] =>
  Array.from({ length: count }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, '0')}`, peak_players: 10, avg_players: 5, peak_rooms: 5, unique_players: 40,
  }))

it('joins the days with straight segments, not a smoothed curve', () => {
  render(<DailyChart data={days(7)} />)

  expect(screen.getAllByTestId('series').map((series) => series.dataset.curve)).toEqual(['linear', 'linear'])
})

it('marks each day on a week or a month, and drops the marks at 90 days', () => {
  const { unmount } = render(<DailyChart data={days(30)} />)
  expect(screen.getAllByTestId('series').map((series) => series.dataset.dotted)).toEqual(['true', 'true'])
  unmount()

  render(<DailyChart data={days(90)} />)
  expect(screen.getAllByTestId('series').map((series) => series.dataset.dotted)).toEqual(['false', 'false'])
})
