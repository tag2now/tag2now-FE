import { Activity, CalendarDays, Crown, MessageSquareText, RefreshCw, TrendingUp, Trophy, Users } from 'lucide-react'
import DailyChart from '@/shared/components/DailyChart'
import { panelStatus } from '@/shared/util/panelStatus'
import useOverview, { OVERVIEW_TOP_N } from '@/overview/useOverview'
import { KpiCard, OpenReservations, OverviewSection, RecentPosts, TopFiveList, type TopFiveRow } from '@/overview/component'
import type { LeaderboardEntry } from '@/shared/types'
import type { RoomsData } from '@/match/types'
import type { WeeklyTopPlayer } from '@/stat/types'
import { formatGroupName, GROUP_ORDER } from '@/config/tabConfig'

interface OverviewProps {
  rooms: RoomsData | null
  roomsLoading: boolean
  leaderboardEntries?: LeaderboardEntry[]
  leaderboardTotal?: number
  /** Jumps to the tab a section summarises. */
  onNavigate: (tab: string) => void
}

/** Rooms have not loaded yet — an em dash rather than "0", which would assert
 * emptiness while the fetch is still in flight. Matches the tab-label rule. */
const UNKNOWN = '—'

function roomsKpi(rooms: RoomsData | null, loading: boolean): { players: string; active: string; breakdown: string } {
  if (!rooms) return { players: UNKNOWN, active: UNKNOWN, breakdown: loading ? '불러오는 중' : '연결 실패' }

  // fetchRoomsAll shuffles the groups so neither match type is always shown
  // first in the tab strip. A KPI hint that reorders itself every 5s poll is
  // just noise, so read it back in the fixed GROUP_ORDER.
  const ordered = [...Object.entries(rooms.groups)]
    .sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))
  const breakdown = ordered
    .map(([key, list]) => `${formatGroupName(key)} ${list.length}`)
    .join(' · ')
  return { players: String(rooms.totalUsers), active: String(rooms.total), breakdown }
}

function todayPeak(daily: { date: string; peak_players: number }[]): { value: string; hint: string } {
  const latest = daily.at(-1)
  if (!latest) return { value: UNKNOWN, hint: '기록 없음' }

  const previous = daily.at(-2)
  const hint = previous ? `어제 ${previous.peak_players}명` : latest.date
  return { value: String(latest.peak_players), hint }
}

const charsOf = (entry?: LeaderboardEntry) => ({
  mainChar: entry?.player_info?.main_char_info,
  subChar: entry?.player_info?.sub_char_info,
})

const leaderboardRows = (entries: LeaderboardEntry[]): TopFiveRow[] =>
  entries.slice(0, OVERVIEW_TOP_N).map((e) => ({
    key: e.np_id,
    name: e.online_name,
    detail: String(e.rank),
    ...charsOf(e),
  }))

/** The weekly endpoint knows match counts, not characters, so the portraits are
 * joined in from the leaderboard by npid — the same pairing the stats tab makes.
 * A player outside the leaderboard simply has no character to show. */
const weeklyRows = (players: WeeklyTopPlayer[], entries: LeaderboardEntry[]): TopFiveRow[] => {
  const byNpid = new Map(entries.map((e) => [e.np_id, e]))
  return players.map((p) => ({
    key: p.npid,
    name: p.online_name,
    detail: `${p.match_count}판`,
    ...charsOf(byNpid.get(p.npid)),
  }))
}

export default function Overview({ rooms, roomsLoading, leaderboardEntries = [], leaderboardTotal, onNavigate }: OverviewProps) {
  const { data, loading, error, refresh } = useOverview()

  const status = panelStatus(loading, error, '개요 로딩 중...', refresh)
  if (status) return status

  const kpi = roomsKpi(rooms, roomsLoading)
  const peak = todayPeak(data?.daily ?? [])

  return (
    <div className="panel overview-panel">
      <div className="section-toolbar compact-toolbar">
        <div className="section-title">
          <span className="section-icon"><TrendingUp size={15} aria-hidden="true" /></span>
          <div><h3>한눈에 보기</h3><p>지금 서버에서 벌어지는 일</p></div>
        </div>
        <button type="button" className="btn-ghost" onClick={refresh}>
          <RefreshCw size={14} aria-hidden="true" /> 새로고침
        </button>
      </div>

      <div className="kpi-grid">
        <KpiCard icon={Users} label="접속자" value={kpi.players} hint="지금 방에 있는 인원" live />
        <KpiCard icon={Activity} label="활성 방" value={kpi.active} hint={kpi.breakdown} live />
        <KpiCard icon={TrendingUp} label="오늘 최대 접속" value={peak.value} hint={peak.hint} />
        <KpiCard icon={Trophy} label="등록 플레이어" value={leaderboardTotal != null ? String(leaderboardTotal) : UNKNOWN} hint="리더보드 집계" />
      </div>

      <section className="chart-panel overview-chart" aria-labelledby="overview-daily-heading">
        <h4 id="overview-daily-heading">최근 7일 접속자 추이</h4>
        <DailyChart data={data?.daily ?? []} height={200} axisGutter={0} />
      </section>

      <div className="overview-grid">
        <OverviewSection icon={Trophy} title="리더보드 TOP 5" subtitle="현재 상위 랭커" linkLabel="리더보드" onNavigate={() => onNavigate('leaderboard')}>
          <TopFiveList rows={leaderboardRows(leaderboardEntries)} detailLabel="랭킹" />
        </OverviewSection>

        <OverviewSection icon={Crown} title="주간 철악귀" subtitle="최근 7일 매치 참여" linkLabel="통계" onNavigate={() => onNavigate('stats')}>
          <TopFiveList rows={weeklyRows(data?.weeklyTop ?? [], leaderboardEntries)} detailLabel="매치" />
        </OverviewSection>

        <OverviewSection icon={CalendarDays} title="모집 중인 예약" subtitle="아직 자리가 남은 약속" linkLabel="예약" onNavigate={() => onNavigate('reservation')}>
          <OpenReservations reservations={data?.reservations ?? []} />
        </OverviewSection>

        <OverviewSection icon={MessageSquareText} title="최신 게시글" subtitle="커뮤니티에 올라온 글" linkLabel="커뮤니티" onNavigate={() => onNavigate('community')}>
          <RecentPosts posts={data?.posts ?? []} />
        </OverviewSection>
      </div>
    </div>
  )
}
