import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { HourlyActivity } from '@/stat/types'
import { orderByDayStart } from '@/shared/dayBoundary'
import { COLOR_BORDER, COLOR_PRIMARY, COLOR_TXT_DIM, LEGEND_STYLE, SERIES_COLOR, TOOLTIP_STYLE, seriesName, seriesRank } from '@/shared/components/chartTheme'
import ChartLegend from '@/shared/components/ChartLegend'

export default function HourlyChart({ data }: { data: HourlyActivity[] }) {
  if (data.length === 0) return <p className="state-msg">데이터 없음</p>

  // Rotated to start at the day boundary rather than at 00:00, so an evening
  // that runs past midnight is one block at the right-hand end instead of two
  // stubs pinned to opposite edges. The buckets arrive per hour, so this is a
  // reordering --- nothing is recomputed.
  const ordered = orderByDayStart(data, (row) => row.hour)

  return (
    <ResponsiveContainer width="100%" height={176}>
      {/* left: 0, not -20. A negative gutter pulls the plot over its own tick
          labels — the same thing that rendered the daily chart's Y axis as a
          column of clipped glyphs. */}
      <ComposedChart data={ordered} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke={COLOR_BORDER} strokeOpacity={0.8} />
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_TXT_DIM, fontSize: 11 }}
          tickFormatter={(h) => String(h)}
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_TXT_DIM, fontSize: 11 }}
          allowDecimals={false}
          width={30}
        />
        {/* 최대 동시 접속 first: the line is above the bars by definition, so
            that is the order the eye reads them in. See chartTheme. */}
        <Tooltip
          cursor={{ fill: COLOR_PRIMARY, fillOpacity: 0.06 }}
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(h) => `${h}시`}
          formatter={(v, key) => [v, seriesName(String(key))]}
          itemSorter={(item) => seriesRank(String(item.dataKey))}
        />
        <Legend wrapperStyle={LEGEND_STYLE} content={<ChartLegend />} />
        {/* Not the brand red any more: red is 접속자 수 in the chart beside
            this one, and one colour cannot name two different series on the
            same screen. */}
        <Bar dataKey="avg_players" fill={SERIES_COLOR.avg_players} radius={[2, 2, 0, 0]} maxBarSize={20} />
        <Line
          type="monotone"
          dataKey="peak_players"
          stroke={SERIES_COLOR.peak_players}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
