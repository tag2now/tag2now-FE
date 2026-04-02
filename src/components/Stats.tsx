import { useState } from 'react'
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
import useWeeklyTop, { type WeeklyTopLimit } from '@/hooks/useWeeklyTop'
import PlayerHistoryPanel from '@/components/PlayerHistoryPanel'
import CharCell from '@/components/CharCell'
import { RANK_COLORS } from '@/shared/tierColors'
import { MEDAL } from '@/shared/medalColors'
import type { HourlyActivity, DailySummary, WeeklyTopPlayer, LeaderboardEntry } from '@/types'

type SubTab = 'stats' | 'weekly_top'

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'stats', label: '접속자 통계' },
  { key: 'weekly_top', label: '주간 철악귀' },
]

const DAY_OPTIONS: { value: StatsDays; label: string }[] = [
  { value: 7, label: '7일' },
  { value: 30, label: '30일' },
  { value: 90, label: '90일' },
]

const LIMIT_OPTIONS: { value: WeeklyTopLimit; label: string }[] = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
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

function WeeklyTopTable({ data, entries, onSelect }: { data: WeeklyTopPlayer[]; entries: LeaderboardEntry[]; onSelect: (npid: string) => void }) {
  if (data.length === 0) return <p className="state-msg">데이터 없음</p>
  const entryByNpid = new Map(entries.map((e) => [e.np_id, e]))
  return (
    <div className="w-full overflow-x-auto">
      <table className="border-collapse w-full min-w-74.25">
        <thead>
          <tr>
            <th scope="col" className="tbl-th w-1/20 sm:w-2/20">#</th>
            <th scope="col" className="tbl-th w-7/20 sm:w-4/20">Player</th>
            <th scope="col" className="tbl-th text-right">매치</th>
            <th scope="col" className="tbl-th w-1/20 sm:w-2/20">랭킹</th>
            <th scope="col" className="tbl-th sm:w-7/20 text-center">Main</th>
            <th scope="col" className="tbl-th sm:w-7/20 text-center">Sub</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => {
            const lb = entryByNpid.get(p.npid)
            const medal = i < 3 ? MEDAL[i] : null
            return (
              <tr
                key={p.npid}
                className="tbl-row"
                style={medal ? { background: medal.bg, borderLeft: `3px solid ${medal.border}` } : undefined}
              >
                <td className="tbl-td font-display text-sm font-black w-11" style={{ color: medal ? medal.color : COLOR_TXT_DIM }}>
                  {medal ? medal.label : i + 1}
                </td>
                <td className="player-name">
                  <button
                    onClick={() => onSelect(p.npid)}
                    className="player-btn"
                    style={medal ? { color: medal.color, borderColor: medal.border } : undefined}
                  >
                    {p.online_name}
                  </button>
                </td>
                <td className="tbl-td text-lg font-bold">{p.match_count}</td>
                <td className={`tbl-td font-display text-xs font-bold w-11 ${lb ? (RANK_COLORS[lb.rank] ?? '') : ''}`} style={lb && !RANK_COLORS[lb.rank] ? { color: COLOR_TXT_DIM } : undefined}>
                  {lb ? lb.rank : '—'}
                </td>
                <td className="char-td">
                  <CharCell
                    name={lb?.player_info?.main_char_info?.name}
                    rankInfo={lb?.player_info?.main_char_info?.rank_info}
                    wins={lb?.player_info?.main_char_info?.wins}
                    losses={lb?.player_info?.main_char_info?.losses}
                  />
                </td>
                <td className="char-td">
                  <CharCell
                    name={lb?.player_info?.sub_char_info?.name}
                    rankInfo={lb?.player_info?.sub_char_info?.rank_info}
                    wins={lb?.player_info?.sub_char_info?.wins}
                    losses={lb?.player_info?.sub_char_info?.losses}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface StatsProps {
  leaderboardEntries?: LeaderboardEntry[]
}

export default function Stats({ leaderboardEntries = [] }: StatsProps) {
  const [subTab, setSubTab] = useState<SubTab>('stats')
  const { hourly, daily, loading, error, days, setDays } = useStats()
  const wt = useWeeklyTop()
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)

  const selectedEntry = selectedNpid
    ? leaderboardEntries.find((e) => e.np_id === selectedNpid)
    : undefined

  return (
    <div className="panel">
      {/* Sub-tab bar */}
      <div className="flex border-b border-border-light mb-5 -mx-4 px-4">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            aria-pressed={subTab === t.key}
            className={`px-4 py-2 text-xs font-bold tracking-[0.1em] uppercase transition-colors cursor-pointer border-b-2 -mb-px ${
              subTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-txt-dim hover:text-txt'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 접속자 통계 */}
      {subTab === 'stats' && (() => {
        const s = panelStatus(loading, error, '통계 로딩 중...')
        if (s) return s
        return (
          <>
            <div className="flex items-center mb-5">
              <ToggleGroup options={DAY_OPTIONS} value={days} onChange={setDays} label="기간" />
            </div>
            <section aria-labelledby="hourly-heading" className="mb-6">
              <h2 id="hourly-heading" className="text-xs font-bold tracking-[0.14em] uppercase text-txt-dim mb-3">
                시간대별 접속자 <span className="text-2xs font-normal opacity-60">(KST)</span>
              </h2>
              <HourlyChart data={hourly} />
            </section>
            <section aria-labelledby="daily-heading" className="mb-6">
              <h2 id="daily-heading" className="text-xs font-bold tracking-[0.14em] uppercase text-txt-dim mb-3">
                일별 접속자
              </h2>
              <DailyChart data={daily} />
            </section>
          </>
        )
      })()}

      {/* 주간 TOP */}
      {subTab === 'weekly_top' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold tracking-[0.14em] uppercase text-txt-dim">이번 주 활동왕</span>
            <ToggleGroup options={LIMIT_OPTIONS} value={wt.limit} onChange={wt.setLimit} />
          </div>
          {wt.loading && <p className="state-msg" role="status">로딩 중...</p>}
          {wt.error && <p className="state-msg error" role="alert">Error: {wt.error}</p>}
          {!wt.loading && !wt.error && (
            <WeeklyTopTable data={wt.data} entries={leaderboardEntries} onSelect={setSelectedNpid} />
          )}
        </>
      )}

      {selectedNpid && (
        <PlayerHistoryPanel
          npid={selectedNpid}
          leaderboardEntry={selectedEntry}
          onClose={() => setSelectedNpid(null)}
        />
      )}
    </div>
  )
}
