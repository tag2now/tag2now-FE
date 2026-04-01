import {
  ComposedChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { panelStatus } from '@/panelStatus'
import useStats, { type StatsDays } from '@/hooks/useStats'
import type { HourlyActivity, DailySummary } from '@/types'

const DAY_OPTIONS: { value: StatsDays; label: string }[] = [
  { value: 7, label: '7일' },
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
]

// Design tokens as JS constants (CSS vars can't be used directly in Recharts SVG fills)
const COLOR_PRIMARY = '#00c8d4'
const COLOR_SECONDARY = '#c9a84c'
const COLOR_BORDER = '#1e1e32'
const COLOR_TXT_DIM = '#9ba3cc'
const COLOR_BG_PANEL = '#0d0d1c'

const TOOLTIP_STYLE = {
  background: COLOR_BG_PANEL,
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: 4,
  fontSize: 12,
  color: COLOR_TXT_DIM,
}

const LEGEND_STYLE = { fontSize: 11, color: COLOR_TXT_DIM, paddingTop: 4 }

function seriesName(key: string) {
  return key === 'peak_players' ? '최대' : '평균'
}

function HourlyChart({ data }: { data: HourlyActivity[] }) {
  if (data.length === 0) return <p className="state-msg">데이터 없음</p>

  return (
    <ResponsiveContainer width="100%" height={176}>
      <ComposedChart data={data} margin={{ top: 16, right: 8, left: -20, bottom: 0 }} barCategoryGap="20%">
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
          formatter={(v, key) => [v, seriesName(String(key))]}
        />
        <Legend wrapperStyle={LEGEND_STYLE} formatter={seriesName} />
        <Bar dataKey="avg_players" fill={COLOR_PRIMARY} fillOpacity={0.75} radius={[2, 2, 0, 0]} maxBarSize={20} />
        <Line
          type="monotone"
          dataKey="peak_players"
          stroke={COLOR_SECONDARY}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
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
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(label) => `날짜: ${label}`}
          formatter={(v, key) => [v, seriesName(String(key))]}
        />
        <Legend wrapperStyle={LEGEND_STYLE} formatter={seriesName} />
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

  const s = panelStatus(loading, error, '통계 로딩 중...')
  if (s) return s

  return (
    <div className="panel">
      {/* Controls row */}
      <div className="flex items-center mb-5">
        <ToggleGroup options={DAY_OPTIONS} value={days} onChange={setDays} label="기간" />
      </div>

      {/* Hourly chart */}
      <section aria-labelledby="hourly-heading" className="mb-6">
        <h2 id="hourly-heading" className="text-xs font-bold tracking-[0.14em] uppercase text-txt-dim mb-3">
          시간대별 접속자 <span className="text-2xs font-normal opacity-60">(KST)</span>
        </h2>
        <HourlyChart data={hourly} />
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
