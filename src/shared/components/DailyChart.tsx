import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DailySummary } from '@/stat/types'
import { COLOR_BORDER, COLOR_TXT_DIM, LEGEND_STYLE, SERIES_COLOR, TOOLTIP_STYLE, seriesName, seriesRank } from '@/shared/components/chartTheme'
import ChartLegend from '@/shared/components/ChartLegend'

/** `axisGutter` pulls the plot toward the Y axis to buy width for the line.
 * It defaulted to -20, which is past the point where the tick labels still fit:
 * the stats tab took the default and rendered its Y axis as a column of clipped
 * glyphs. 0 is the honest default — a caller that has measured its own panel
 * and wants the tighter gutter can still ask for it. */
export default function DailyChart({ data, height = 176, axisGutter = 0 }: { data: DailySummary[]; height?: number; axisGutter?: number }) {
  if (data.length === 0) return <p className="state-msg">데이터 없음</p>

  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) })) // "MM-DD"
  const interval = Math.max(0, Math.floor(data.length / 7) - 1)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 16, right: 8, left: axisGutter, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={COLOR_BORDER} strokeOpacity={0.8} />
        {/* 20, not Recharts' default 30: the 11px dates need no more, and the
            slack sat between the plot and the legend as dead footer. */}
        <XAxis
          dataKey="label"
          height={20}
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_TXT_DIM, fontSize: 11 }}
          interval={interval}
          // The last tick sits on the plot's right edge, so half of "09-15"
          // rendered past it and the label read "09-1" — a date that does not
          // exist. `preserveStartEnd` keeps both ends, and the padding is the
          // room the end labels need to stay whole.
          padding={{ left: 12, right: 12 }}
          tickMargin={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_TXT_DIM, fontSize: 11 }}
          allowDecimals={false}
          width={30}
        />
        {/* Sorted and payloaded rather than left to Recharts: it listed
            최대 동시 접속 above 접속자 수 while drawing the 접속자 수 line
            above it, so the tooltip's top row named the chart's bottom line. */}
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(label) => `날짜: ${label}`}
          formatter={(v, key) => [v, seriesName(String(key))]}
          itemSorter={(item) => seriesRank(String(item.dataKey))}
        />
        <Legend wrapperStyle={LEGEND_STYLE} content={<ChartLegend />} />
        <Line type="monotone" dataKey="unique_players" stroke={SERIES_COLOR.unique_players} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="peak_players" stroke={SERIES_COLOR.peak_players} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
