import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { DailySummary } from '@/stat/types'
import { COLOR_BORDER, COLOR_TXT_DIM, SERIES_COLOR, TOOLTIP_STYLE, seriesName } from '@/shared/components/chartTheme'

/** Marks each day while there are few enough to tell apart. At 90 days the
 * dots touch and become a second, thicker line. */
const MAX_DOTTED_DAYS = 31

const pointDot = (data: DailySummary[], color: string) =>
  data.length <= MAX_DOTTED_DAYS && { r: 2.5, strokeWidth: 0, fill: color }

/** Height of the date row, which only the bottom plot draws. */
const DATE_AXIS_HEIGHT = 20
const PLOT_GAP = 4
/** The lower half of the bottom tick label. The bottom plot has the date row
 * under its baseline; the top plot has nothing there, so without this room
 * that label would be cut in half by the edge of the SVG. */
const BASELINE_LABEL_ROOM = 8

/** One series' Y scale: its own range with a margin, not 0 to its maximum.
 *
 * Splitting the chart halved each plot's height, and a 0 baseline then left
 * each line in the top half of that — 53 to 101 players moved 23px of a 52px
 * plot. A line is read for its trend, so the scale starts near the data; the
 * three labels (bottom, middle, top) say where it starts, so the offset is on
 * the page rather than hidden. Days without a figure are skipped. */
export function fittedScale(values: (number | null | undefined)[]) {
  const present = values.filter((value): value is number => value != null)
  const known = present.length > 0 ? present : [0]
  const min = Math.min(...known)
  const max = Math.max(...known)
  const margin = Math.max(1, Math.ceil((max - min) * 0.1))
  const low = Math.max(0, min - margin)
  const high = max + margin
  return {
    domain: [low, high] as [number, number],
    ticks: [...new Set([low, Math.round((low + high) / 2), high])],
  }
}

/** Top to bottom. Each series gets a plot of its own: unique players run at
 * about three times the peak, and on one shared axis the peak line sat in the
 * bottom third and read as flat while it doubled. */
const SERIES = ['unique_players', 'peak_players'] as const
type DailySeries = (typeof SERIES)[number]

type Row = DailySummary & { label: string }

/** `axisGutter` pulls the plot toward the Y axis to buy width for the line.
 * It defaulted to -20, which is past the point where the tick labels still fit:
 * the stats tab took the default and rendered its Y axis as a column of clipped
 * glyphs. 0 is the honest default — a caller that has measured its own panel
 * and wants the tighter gutter can still ask for it.
 *
 * `height` is the whole block, both plots and the dates: the stats tab sets
 * this chart beside the hourly one, and the row is only level if the two
 * charts are the same height. */
export default function DailyChart({ data, height = 176, axisGutter = 0 }: { data: DailySummary[]; height?: number; axisGutter?: number }) {
  if (data.length === 0) return <p className="state-msg">데이터 없음</p>

  const rows: Row[] = data.map((d) => ({ ...d, label: d.date.slice(5) })) // "MM-DD"
  const plotHeight = Math.floor((height - DATE_AXIS_HEIGHT - PLOT_GAP) / 2)

  return (
    <div className="daily-chart" style={{ gap: PLOT_GAP }}>
      {SERIES.map((series, index) => {
        const withDates = index === SERIES.length - 1
        return (
          <SeriesPlot
            key={series}
            series={series}
            rows={rows}
            height={plotHeight + (withDates ? DATE_AXIS_HEIGHT : 0)}
            withDates={withDates}
            axisGutter={axisGutter}
          />
        )
      })}
    </div>
  )
}

function SeriesPlot({ series, rows, height, withDates, axisGutter }: {
  series: DailySeries
  rows: Row[]
  height: number
  withDates: boolean
  axisGutter: number
}) {
  const color = SERIES_COLOR[series]
  const interval = Math.max(0, Math.floor(rows.length / 7) - 1)
  const scale = fittedScale(rows.map((row) => row[series]))

  return (
    <div className="daily-chart-plot">
      {/* In the plot's top margin rather than a legend row below it, so the
          two plots cost no more height than the one chart they replace. */}
      <span className="daily-chart-label">
        <span className="chart-legend-line" style={{ '--series': color } as React.CSSProperties} aria-hidden="true" />
        {seriesName(series)}
      </span>
      <ResponsiveContainer width="100%" height={height}>
        {/* syncId: hovering a day in one plot marks the same day in the other,
            which is what keeps two plots readable as one chart. */}
        <LineChart data={rows} syncId="daily-players" margin={{ top: 16, right: 8, left: axisGutter, bottom: withDates ? 0 : BASELINE_LABEL_ROOM }}>
          <CartesianGrid vertical={false} stroke={COLOR_BORDER} strokeOpacity={0.8} />
          {/* The top plot keeps a hidden axis with the same padding, so its
              points sit exactly above the dates drawn under the bottom one. */}
          <XAxis
            dataKey="label"
            hide={!withDates}
            height={DATE_AXIS_HEIGHT}
            tickLine={false}
            axisLine={false}
            tick={{ fill: COLOR_TXT_DIM, fontSize: 11 }}
            interval={interval}
            // The last tick sits on the plot's right edge, so half of "09-15"
            // rendered past it and the label read "09-1" — a date that does not
            // exist. The padding is the room the end labels need to stay whole.
            padding={{ left: 12, right: 12 }}
            tickMargin={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: COLOR_TXT_DIM, fontSize: 11 }}
            domain={scale.domain}
            ticks={scale.ticks}
            // Every tick, not Recharts' default `preserveEnd`: at this height
            // that thinned the top plot's three ticks to two and dropped the
            // bottom one, leaving no label to say where the scale starts.
            interval={0}
            width={30}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(label) => `날짜: ${label}`}
            formatter={(v) => [v, seriesName(series)]}
          />
          {/* Straight segments, not a smoothed curve: each point is one finished
              day, and a curve draws values for the time between them that
              nobody measured. */}
          <Line type="linear" dataKey={series} stroke={color} strokeWidth={2} dot={pointDot(rows, color)} activeDot={{ r: 4 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
