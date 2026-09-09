import { useState } from 'react'
import { Activity, CalendarDays, Crown, MessageSquareText, RefreshCw, TrendingUp, Trophy, Users } from 'lucide-react'
import DailyChart from '@/shared/components/DailyChart'
import PlayerHistoryPanel from '@/shared/components/PlayerHistoryPanel'
import { panelStatus } from '@/shared/util/panelStatus'
import useOverview, { OVERVIEW_TOP_N } from '@/overview/useOverview'
import { KpiCard, OpenReservations, OverviewSection, RecentPosts, TopFiveList, type TopFiveRow } from '@/overview/component'
import type { LeaderboardEntry } from '@/shared/types'
import type { RoomsData } from '@/match/types'
import type { WeeklyTopPlayer } from '@/stat/types'
import { formatGroupName, GROUP_ORDER } from '@/config/tabConfig'
import { pathOf } from '@/config/routes'

interface OverviewProps {
  rooms: RoomsData | null
  roomsLoading: boolean
  leaderboardEntries?: LeaderboardEntry[]
  leaderboardTotal?: number
}

/** Rooms have not loaded yet — an em dash rather than "0", which would assert
 * emptiness while the fetch is still in flight. Matches the tab-label rule. */
const UNKNOWN = '—'

/** Where both room figures lead. Fixed rather than read from the response: the
 * tab strip renders this group whatever the API returns — room data sets the
 * count in a label, never which tabs exist — and `fetchRoomsAll` shuffles the
 * groups, so the response's own first key would move the target every poll. */
const ROOMS_PATH = pathOf(GROUP_ORDER[0])

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

function todayPeak(daily: { date: string; peak_players: number | null }[]): { value: string; hint: string } {
  const latest = daily.at(-1)
  if (!latest) return { value: UNKNOWN, hint: '기록 없음' }

  const previous = daily.at(-2)
  if (latest.peak_players == null) return { value: UNKNOWN, hint: '최대 접속 기록 없음' }
  const hint = previous?.peak_players != null ? `어제 ${previous.peak_players}명` : latest.date
  return { value: String(latest.peak_players), hint }
}

const charsOf = (entry?: LeaderboardEntry) => ({
  mainChar: entry?.player_info?.main_char_info,
  subChar: entry?.player_info?.sub_char_info,
})

/** No `detail`: the list is the leaderboard's own top five in order, so the
 * rank it would show is the row position the first column already prints. */
const leaderboardRows = (entries: LeaderboardEntry[]): TopFiveRow[] =>
  entries.slice(0, OVERVIEW_TOP_N).map((e) => ({
    key: e.np_id,
    npid: e.np_id,
    name: e.online_name,
    ...charsOf(e),
  }))

/** The weekly endpoint knows match counts, not characters, so the portraits are
 * joined in from the leaderboard by npid — the same pairing the stats tab makes.
 * A player outside the leaderboard simply has no character to show. */
const weeklyRows = (players: WeeklyTopPlayer[], entries: LeaderboardEntry[]): TopFiveRow[] => {
  const byNpid = new Map(entries.map((e) => [e.np_id, e]))
  return players.map((p) => ({
    key: p.npid,
    npid: p.npid,
    name: p.online_name,
    detail: `${p.match_count}판`,
    ...charsOf(byNpid.get(p.npid)),
  }))
}

export default function Overview({ rooms, roomsLoading, leaderboardEntries = [], leaderboardTotal }: OverviewProps) {
  const { data, loading, error, refreshing, refresh } = useOverview()
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)

  // The panel wants the leaderboard row when there is one; a weekly-top player
  // outside the leaderboard simply opens without it, as it does on the stats tab.
  const selectedEntry = selectedNpid
    ? leaderboardEntries.find((e) => e.np_id === selectedNpid)
    : undefined

  // "불러오는 중", not "로딩 중": the KPI hint below already says the first and
  // the match and history panels say it too, so this was the odd one out.
  const status = panelStatus(loading, error, '개요를 불러오는 중...', refresh)
  if (status) return status

  const kpi = roomsKpi(rooms, roomsLoading)
  const peak = todayPeak(data?.daily ?? [])

  return (
    <div className="panel overview-panel">
      <div className="section-toolbar compact-toolbar">
        <div className="section-title">
          <span className="section-icon"><TrendingUp size={15} aria-hidden="true" /></span>
          {/* h2, not h3: this names the whole panel, and the cards below are
              h3. The h2 that used to sit above it went with .content-heading,
              which left the page jumping h1 to h3. */}
          <div><h2>한눈에 보기</h2><p>지금 서버에서 벌어지는 일</p></div>
        </div>
        {/* Four requests go out and nothing already on screen changes until all
            of them land, so without a state here the click reads as ignored.
            The reduced-motion rule freezes the spinner, which is why the
            disabled dimming carries the signal rather than merely echoing it. */}
        <button type="button" className="btn-ghost" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={14} aria-hidden="true" className={refreshing ? 'animate-spin' : undefined} /> 새로고침
        </button>
      </div>

      <div className="kpi-grid">
        <KpiCard icon={Users} label="접속자" value={kpi.players} hint="지금 방에 있는 인원" live linkLabel="매치" to={ROOMS_PATH} />
        <KpiCard icon={Activity} label="활성 방" value={kpi.active} hint={kpi.breakdown} live linkLabel="매치" to={ROOMS_PATH} />
        <KpiCard icon={TrendingUp} label="오늘 최대 접속" value={peak.value} hint={peak.hint} linkLabel="통계" to={pathOf('stats')} />
        <KpiCard icon={Trophy} label="등록 플레이어" value={leaderboardTotal != null ? String(leaderboardTotal) : UNKNOWN} hint="리더보드 집계" linkLabel="리더보드" to={pathOf('leaderboard')} />
      </div>

      {/* The two cards that expire, above the chart rather than below it. Both
          carry something the reader can still act on --- a reservation with a
          seat left, a post nobody has answered --- and the chart is a seven-day
          trend that reads the same tomorrow. Sitting behind its 244px they were
          the last thing reached on a phone, which is backwards for the only
          part of this page with a deadline. */}
      <div className="overview-grid">
        <OverviewSection icon={CalendarDays} title="모집 중인 예약" subtitle="아직 자리가 남은 약속" linkLabel="예약" to={pathOf('reservation')}>
          <OpenReservations reservations={data?.reservations ?? []} />
        </OverviewSection>

        <OverviewSection icon={MessageSquareText} title="최신 게시글" subtitle="커뮤니티에 올라온 글" linkLabel="커뮤니티" to={pathOf('community')}>
          <RecentPosts posts={data?.posts ?? []} />
        </OverviewSection>
      </div>

      <section className="chart-panel overview-chart" aria-labelledby="overview-daily-heading">
        {/* A sibling of the four card sections, so it takes their level. */}
        <h3 id="overview-daily-heading">최근 7일 접속자 추이</h3>
        <DailyChart data={data?.daily ?? []} height={200} axisGutter={0} />
      </section>

      {/* Kept below the chart: a ranking is slow-moving reference data with a
          tab of its own one click away, and these two lists are twice the
          height of the cards above (5 x 66px rows). */}
      <div className="overview-grid">
        <OverviewSection icon={Trophy} title="리더보드 TOP 5" subtitle="현재 상위 랭커" linkLabel="리더보드" to={pathOf('leaderboard')}>
          {/* Names what is missing rather than "데이터". The list is empty both
              before the leaderboard lands and when its fetch failed, so the
              copy stops at what is absent and claims no reason for it. */}
          <TopFiveList rows={leaderboardRows(leaderboardEntries)} emptyMsg="리더보드 순위 없음" onSelect={setSelectedNpid} />
        </OverviewSection>

        <OverviewSection icon={Crown} title="주간 철악귀" subtitle="최근 7일 매치 참여" linkLabel="통계" to={pathOf('stats')}>
          {/* MATCH, not 매치: the header row is otherwise #/Player/Main/Sub, and
              this app sets Latin caps as a motif elsewhere (PLAYER INSIGHTS,
              ANY MATCH). One Korean word mid-row read as an oversight. */}
          <TopFiveList rows={weeklyRows(data?.weeklyTop ?? [], leaderboardEntries)} detailLabel="MATCH" emptyMsg="주간 기록 없음" onSelect={setSelectedNpid} />
        </OverviewSection>
      </div>

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
