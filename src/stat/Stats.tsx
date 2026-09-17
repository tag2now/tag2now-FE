import { useState } from 'react'
import RankList from '@/shared/components/RankList'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { panelStatus, statusBody } from "@/shared/util/panelStatus";
import useStats, { type StatsDays} from "@/stat/useStats";
import useWeeklyTop, { type WeeklyTopLimit} from "@/stat/useWeeklyTop";
import PlayerHistoryPanel from "@/shared/components/PlayerHistoryPanel";
import type { HourlyActivity, WeeklyTopPlayer } from '@/stat/types'
import DailyChart from '@/shared/components/DailyChart'
import { DAY_START_HOUR, hourLabel, orderByDayStart } from '@/shared/dayBoundary'
import { COLOR_BORDER, COLOR_PRIMARY, COLOR_TXT_DIM, LEGEND_STYLE, SERIES_COLOR, TOOLTIP_STYLE, seriesName, seriesRank } from '@/shared/components/chartTheme'
import ChartLegend from '@/shared/components/ChartLegend'
import type {LeaderboardEntry} from "@/shared/types";
import { Activity, Crown } from 'lucide-react'
import { TableSkeleton } from '@/shared/components/Skeleton'

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

function HourlyChart({ data }: { data: HourlyActivity[] }) {
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
      <div className="segmented-control">
        {options.map((opt, i) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`transition-colors cursor-pointer ${
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
  const entryByNpid = new Map(entries.map((e) => [e.np_id, e]))
  // The home page's ranking row, the same one the leaderboard tab runs at full
  // length. This was a six-column table --- 매치 and 랭킹 on tracks of their
  // own --- which made it the one ranking on the site with a shape nothing
  // else used. The pair share a cell now: what they did this week, with where
  // they stand overall behind it.
  return (
    <RankList
      rows={data.map((p) => {
        const lb = entryByNpid.get(p.npid)
        return {
          key: p.npid,
          npid: p.npid,
          name: p.online_name,
          detail: `${p.match_count}판`,
          detailSub: lb ? `#${lb.rank}` : undefined,
          mainChar: lb?.player_info?.main_char_info,
          subChar: lb?.player_info?.sub_char_info,
        }
      })}
      label="이번 주 활동왕"
      detailLabel="판수"
      emptyMsg="데이터 없음"
      onSelect={onSelect}
    />
  )
}

interface StatsProps {
  leaderboardEntries?: LeaderboardEntry[]
}

export default function Stats({ leaderboardEntries = [] }: StatsProps) {
  const { hourly, daily, loading, error, days, setDays } = useStats()
  const wt = useWeeklyTop()
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)

  const selectedEntry = selectedNpid
    ? leaderboardEntries.find((e) => e.np_id === selectedNpid)
    : undefined

  return (
    <div className="panel">
      {/* One page, not two tabs. The second tab held a single table that the
          home screen already shows in full, and the first held two charts — too
          little to hide behind a control nobody knows to press. Stacked, one
          scroll reaches everything. */}
      {(() => {
        const s = panelStatus(loading, error, {
          loadingMsg: '통계를 불러오는 중',
          skeleton: <TableSkeleton rows={6} columns={4} label="통계를 불러오는 중" />,
        })
        if (s) return s
        return (
          <>
            <div className="section-toolbar compact-toolbar">
              <div className="section-title">
                <span className="section-icon"><Activity size={15} /></span>
                <div><h3>접속자 흐름</h3><p>시간대와 날짜별 활성 사용자</p></div>
              </div>
              <ToggleGroup options={DAY_OPTIONS} value={days} onChange={setDays} label="기간" />
            </div>
            <div className="chart-grid">
              <section aria-labelledby="hourly-heading" className="chart-panel">
                <h4 id="hourly-heading">
                  시간대별 접속자 <span className="text-2xs font-medium opacity-60">(KST {hourLabel(DAY_START_HOUR)}시 ~ 익일 {hourLabel((DAY_START_HOUR + 23) % 24)}시)</span>
                </h4>
                <HourlyChart data={hourly} />
              </section>
              <section aria-labelledby="daily-heading" className="chart-panel">
                {/* 06시, not the 08시 above it: these rows arrive already bucketed by
                      the backend's statistics day, so the label reports what the
                      data is rather than what this app would prefer. */}
                <h4 id="daily-heading">일별 접속자 <span className="text-2xs font-medium opacity-60">(서버 집계 기준 06시)</span></h4>
                <DailyChart data={daily} />
              </section>
            </div>
          </>
        )
      })()}

      <div className="section-toolbar compact-toolbar stats-section-break">
        <div className="section-title"><span className="section-icon"><Crown size={15} /></span><div><h3>이번 주 활동왕</h3><p>최근 7일 매치 참여 순위</p></div></div>
        <ToggleGroup options={LIMIT_OPTIONS} value={wt.limit} onChange={wt.setLimit} />
      </div>
      {statusBody(wt.loading, wt.error, {
        loadingMsg: '활동왕을 불러오는 중',
        skeleton: <TableSkeleton rows={5} columns={4} label="활동왕을 불러오는 중" />,
      })}
      {!wt.loading && !wt.error && (
        <WeeklyTopTable data={wt.data} entries={leaderboardEntries} onSelect={setSelectedNpid} />
      )}

      {selectedNpid && (
        <PlayerHistoryPanel
          npid={selectedNpid}
          leaderboardEntry={selectedEntry}
          leaderboardEntries={leaderboardEntries}
          onClose={() => setSelectedNpid(null)}
        />
      )}
    </div>
  )
}
