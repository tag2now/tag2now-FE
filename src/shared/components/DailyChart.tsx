import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DailySummary } from '@/stat/types'
import { COLOR_BORDER, COLOR_PRIMARY, COLOR_SECONDARY, COLOR_TXT_DIM, LEGEND_STYLE, TOOLTIP_STYLE, seriesName } from '@/shared/components/chartTheme'

export default function DailyChart({ data, height = 176, axisGutter = -20 }: { data: DailySummary[]; height?: number; axisGutter?: number }) {
  if (data.length === 0) return <p className="state-msg">데이터 없음</p>

  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) })) // "MM-DD"
  const interval = Math.max(0, Math.floor(data.length / 7) - 1)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 16, right: 8, left: axisGutter, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={COLOR_BORDER} strokeOpacity={0.8} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_TXT_DIM, fontSize: 11 }}
          interval={interval}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_TXT_DIM, fontSize: 11 }}
          allowDecimals={false}
          width={30}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(label) => `날짜: ${label}`}
          formatter={(v, key) => [v, seriesName(String(key))]}
        />
        <Legend wrapperStyle={LEGEND_STYLE} formatter={seriesName} />
        <Line type="monotone" dataKey="peak_players" stroke={COLOR_SECONDARY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="avg_players" stroke={COLOR_PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeOpacity={0.8} />
      </LineChart>
    </ResponsiveContainer>
  )
}
