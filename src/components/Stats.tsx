import { useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { panelStatus } from '@/panelStatus'
import useStats, { type StatsDays } from '@/hooks/useStats'
import type { HourlyActivity, DailySummary } from '@/types'

const DAY_OPTIONS: { value: StatsDays; label: string }[] = [
  { value: 7, label: '7일' },
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
]

const METRIC_OPTIONS: { value: 'avg_players' | 'peak_players'; label: string }[] = [
  { value: 'avg_players', label: '평균' },
  { value: 'peak_players', label: '최대' },
]

// Design tokens as JS constants (CSS vars can't be used directly in Recharts SVG fills)
const COLOR_PRIMARY = '#00c8d4'
const COLOR_SECONDARY = '#c9a84c'
const COLOR_BORDER = '#1e1e32'
const COLOR_TXT_DIM = '#9ba3cc'
const COLOR_BG_PANEL = '#0d0d1c'

interface HourlyChartProps {
  data: HourlyActivity[]
  metric: 'avg_players' | 'peak_players'
}

function HourlyChart({ data, metric }: HourlyChartProps) {
  if (data.length === 0) return <p className="state-msg">데이터 없음</p>

  const peakVal = data.reduce((m, d) => Math.max(m, d[metric]), 0)

  return (
    <ResponsiveContainer width="100%" height={176}>
      <BarChart data={data} margin={{ top: 16, right: 4, left: -20, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke={COLOR_BORDER} strokeOpacity={0.8} />
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          tick={{ fill: COLOR_TXT_DIM, fontSize: 11 }}
          tickFormatter={(h) => (h % 6 === 0 ? String(h) : '')}
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
          contentStyle={{
            background: COLOR_BG_PANEL,
            border: `1px solid ${COLOR_BORDER}`,
            borderRadius: 4,
            fontSize: 12,
            color: COLOR_TXT_DIM,
          }}
          labelFormatter={(h) => `${h}시`}
          formatter={(v) => [v ?? 0, metric === 'avg_players' ? '평균' : '최대']}
        />
        {peakVal > 0 && (
          <ReferenceLine
            y={peakVal}
            stroke={COLOR_SECONDARY}
            strokeDasharray="4 3"
            strokeOpacity={0.5}
            label={{ value: `최대 ${peakVal}`, position: 'insideTopRight', fill: COLOR_SECONDARY, fontSize: 11 }}
          />
        )}
        <Bar dataKey={metric} radius={[2, 2, 0, 0]} maxBarSize={24}>
          {data.map((d) => (
            <Cell
              key={d.hour}
              fill={d[metric] === peakVal && peakVal > 0 ? COLOR_SECONDARY : COLOR_PRIMARY}
              fillOpacity={d[metric] === peakVal && peakVal > 0 ? 1 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DailyChart({ data }: { data: DailySummary[] }) {
  if (data.length === 0) return <p className="state-msg">데이터 없음</p>

  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // "MM-DD"
  }))

  const interval = Math.max(0, Math.floor(data.length / 7) - 1)

  return (
    <ResponsiveContainer width="100%" height={176}>
      <LineChart data={formatted} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
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
          contentStyle={{
            background: COLOR_BG_PANEL,
            border: `1px solid ${COLOR_BORDER}`,
            borderRadius: 4,
            fontSize: 12,
            color: COLOR_TXT_DIM,
          }}
          labelFormatter={(label) => `날짜: ${label}`}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: COLOR_TXT_DIM, paddingTop: 4 }}
          formatter={(value) => (value === 'peak_players' ? '최대' : '평균')}
        />
        <Line
          type="monotone"
          dataKey="peak_players"
          stroke={COLOR_SECONDARY}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="avg_players"
          stroke={COLOR_PRIMARY}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          strokeOpacity={0.8}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-txt-dim font-semibold tracking-wide uppercase">{label}</span>}
      <div className="flex rounded border border-border-light overflow-hidden">
        {options.map((opt, i) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`px-3 py-1 text-xs font-bold tracking-[0.1em] uppercase transition-colors cursor-pointer ${
              i > 0 ? 'border-l border-border-light' : ''
            } ${
              value === opt.value
                ? 'bg-primary text-bg-deep'
                : 'text-txt-dim hover:text-txt hover:bg-primary-hover'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Stats() {
  const { hourly, daily, loading, error, days, setDays } = useStats()
  const [metric, setMetric] = useState<'avg_players' | 'peak_players'>('avg_players')

  const s = panelStatus(loading, error, '통계 로딩 중...')
  if (s) return s

  return (
    <div className="panel">
      {/* Controls row */}
      <div className="flex items-center justify-between mb-5">
        <ToggleGroup options={DAY_OPTIONS} value={days} onChange={setDays} label="기간" />
        <ToggleGroup options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
      </div>

      {/* Hourly chart */}
      <section aria-labelledby="hourly-heading" className="mb-6">
        <h2 id="hourly-heading" className="text-xs font-bold tracking-[0.14em] uppercase text-txt-dim mb-3">
          시간대별 접속자 <span className="text-2xs font-normal opacity-60">(KST)</span>
        </h2>
        <HourlyChart data={hourly} metric={metric} />
      </section>

      {/* Daily chart */}
      <section aria-labelledby="daily-heading">
        <h2 id="daily-heading" className="text-xs font-bold tracking-[0.14em] uppercase text-txt-dim mb-3">
          일별 접속자
        </h2>
        <DailyChart data={daily} />
      </section>
    </div>
  )
}
