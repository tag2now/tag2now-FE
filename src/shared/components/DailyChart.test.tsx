import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import DailyChart from '@/shared/components/DailyChart'

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Legend: () => null,
  Line: ({ dataKey }: { dataKey: string }) => <span data-testid="series">{dataKey}</span>,
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
