import { render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import DailyChart, { fittedScale } from '@/shared/components/DailyChart'
import type { DailySummary } from '@/stat/types'

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: ({ dataKey, type, dot }: { dataKey: string; type: string; dot: unknown }) => (
    <span data-testid="series" data-curve={type} data-dotted={String(Boolean(dot))}>{dataKey}</span>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="plot">{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: ({ hide }: { hide?: boolean }) => <span data-testid="date-axis" data-hidden={String(Boolean(hide))} />,
  YAxis: () => null,
}))

const days = (count: number): DailySummary[] =>
  Array.from({ length: count }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, '0')}`, peak_players: 10, avg_players: 5, peak_rooms: 5, unique_players: 40,
  }))

it('gives unique players and the concurrent peak a plot each, unique players on top', () => {
  render(<DailyChart data={days(7)} />)

  // One axis per series: on a shared one the peak, about a third of unique
  // players, was pressed into the bottom of the chart and read as flat.
  const plots = screen.getAllByTestId('plot')
  expect(plots.map((plot) => within(plot).getAllByTestId('series').map((series) => series.textContent))).toEqual([
    ['unique_players'],
    ['peak_players'],
  ])
})

it('names each plot, since there is no shared legend to read it from', () => {
  render(<DailyChart data={days(7)} />)

  expect(screen.getByText('접속자 수')).toBeInTheDocument()
  expect(screen.getByText('최대 동시 접속')).toBeInTheDocument()
})

it('prints the dates once, under the bottom plot', () => {
  render(<DailyChart data={days(7)} />)

  expect(screen.getAllByTestId('date-axis').map((axis) => axis.dataset.hidden)).toEqual(['true', 'false'])
})

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

describe('fittedScale', () => {
  // The week the split was made against: on a 0-based axis the line used 23px
  // of a 52px plot and still read as flat.
  it('spans the data with a margin instead of starting at 0', () => {
    const { domain, ticks } = fittedScale([53, 63, 89, 93, 98, 101])

    expect(domain).toEqual([48, 106])
    expect(ticks).toEqual([48, 77, 106])
    // The line now fills most of the plot.
    expect((101 - 53) / (domain[1] - domain[0])).toBeGreaterThan(0.8)
  })

  it('never reaches below zero players', () => {
    expect(fittedScale([0, 3]).domain[0]).toBe(0)
  })

  it('skips days without a figure', () => {
    expect(fittedScale([null, 16, undefined, 35]).domain).toEqual([14, 37])
  })

  it('still draws a scale for a flat or an empty series', () => {
    expect(fittedScale([10, 10])).toEqual({ domain: [9, 11], ticks: [9, 10, 11] })
    expect(fittedScale([null])).toEqual({ domain: [0, 1], ticks: [0, 1] })
  })
})
