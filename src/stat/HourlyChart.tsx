import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { HourlyActivity } from '@/stat/types'
import { orderByDayStart } from '@/shared/dayBoundary'
import { COLOR_BORDER, COLOR_PRIMARY, COLOR_TXT_DIM, SERIES_COLOR, TOOLTIP_STYLE, seriesName } from '@/shared/components/chartTheme'

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
      <BarChart data={ordered} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
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
        <Tooltip
          cursor={{ fill: COLOR_PRIMARY, fillOpacity: 0.06 }}
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(h) => `${h}시`}
          formatter={(v) => [v, seriesName('peak_players')]}
        />
        {/* The peak alone. An average over every 30-second sample counts the
            empty ones too, so it sat well below what anyone online saw and
            was the first thing the eye read. Bars, not a line: each hour is a
            separate bucket, and a bar from 0 cannot overstate it. */}
        <Bar dataKey="peak_players" fill={SERIES_COLOR.peak_players} radius={[2, 2, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
