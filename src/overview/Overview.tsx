import { useState } from 'react'
import { CalendarDays, Crown, MessageSquareText, RefreshCw, TrendingUp, Trophy, Users } from 'lucide-react'
import DailyChart from '@/shared/components/DailyChart'
import PlayerHistoryPanel from '@/shared/components/PlayerHistoryPanel'
import { panelStatus } from '@/shared/util/panelStatus'
import useOverview, { OVERVIEW_TOP_N } from '@/overview/useOverview'
import { KpiCard, OpenReservations, OverviewSection, RecentPosts } from '@/overview/component'
import RankList, { type RankRow } from '@/shared/components/RankList'
import type { LeaderboardEntry } from '@/shared/types'
import type { RoomsData } from '@/match/types'
import type { WeeklyTopPlayer } from '@/stat/types'
import { formatGroupName, GROUP_ORDER } from '@/config/tabConfig'
import { pathOf } from '@/config/routes'
import { totals } from '@/shared/util/leaderboardFilter'
import { CardGridSkeleton, ListSkeleton } from '@/shared/components/Skeleton'

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

/** One card, not two.
 *
 * "접속자" and "활성 방" were the same fact told twice — with a room per
 * player they printed the same number side by side — and the header's Live
 * badge told it a third time. The players are the figure a live dashboard is
 * asked for, so that stays the value; the rooms it takes to hold them are a
 * detail about it, which is what a hint is for. */
function roomsKpi(rooms: RoomsData | null, loading: boolean): { players: string; breakdown: string } {
  if (!rooms) return { players: UNKNOWN, breakdown: loading ? '불러오는 중' : '연결 실패' }

  // fetchRoomsAll shuffles the groups so neither match type is always shown
  // first in the tab strip. A KPI hint that reorders itself every 5s poll is
  // just noise, so read it back in the fixed GROUP_ORDER.
  const ordered = [...Object.entries(rooms.groups)]
    .sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))
  const breakdown = ordered
    .map(([key, list]) => `${formatGroupName(key)} ${list.length}`)
    .join(' · ')
  return { players: String(rooms.totalUsers), breakdown: `방 ${rooms.total}개 · ${breakdown}` }
}

/** The third card: how many players this site knows about.
 *
 * It used to count the reservations still taking people — but the section
 * below it is 모집 중인 예약, listing those same reservations with their times
 * and their free seats, so the card was the same fact twice on one screen and
 * the weaker copy of it. A registered total is the one figure here that is not
 * about right now, which is the whole reason it belongs beside two that are.
 *
 * `App` already holds it: the leaderboard response heads with `total_records`,
 * so this adds no request. It is absent only while that first load is in
 * flight. */
function registeredPlayersKpi(total?: number): { value: string; hint: string } {
  if (total == null) return { value: UNKNOWN, hint: '불러오는 중' }
  return { value: String(total), hint: '리더보드에 오른 플레이어' }
}

/** 그날 한 번이라도 접속한 인원(unique_players). 동시 접속 피크는 이보다 작아 KPI로 쓰지 않는다. */
function todayPlayers(daily: { date: string; unique_players?: number }[]): { value: string; hint: string } {
  const latest = daily.at(-1)
  if (!latest) return { value: UNKNOWN, hint: '기록 없음' }

  const previous = daily.at(-2)
  if (latest.unique_players == null) return { value: UNKNOWN, hint: '접속 기록 없음' }
  const hint = previous?.unique_players != null ? `어제 ${previous.unique_players}명` : latest.date
  return { value: String(latest.unique_players), hint }
}

const charsOf = (entry?: LeaderboardEntry) => ({
  mainChar: entry?.player_info?.main_char_info,
  subChar: entry?.player_info?.sub_char_info,
})

/** No `detail`: the list is the leaderboard's own top five in order, so the
 * rank it would show is the row position the first column already prints. */
const leaderboardRows = (entries: LeaderboardEntry[]): RankRow[] =>
  entries.slice(0, OVERVIEW_TOP_N).map((e) => {
    // Across both characters, which is what the leaderboard itself sorts by —
    // the per-character rates sit in the two cells to the right, and neither
    // of them answers "how does this player do".
    const { winRate, matches } = totals(e)
    return {
      key: e.np_id,
      npid: e.np_id,
      name: e.online_name,
      detail: winRate === null ? undefined : `${Math.round(winRate * 100)}%`,
      detailSub: matches > 0 ? `${matches}판` : undefined,
      ...charsOf(e),
    }
  })

/** The weekly endpoint knows match counts, not characters, so the portraits are
 * joined in from the leaderboard by npid — the same pairing the stats tab makes.
 * A player outside the leaderboard simply has no character to show. */
const weeklyRows = (players: WeeklyTopPlayer[], entries: LeaderboardEntry[]): RankRow[] => {
  const byNpid = new Map(entries.map((e) => [e.np_id, e]))
  return players.map((p) => {
    const entry = byNpid.get(p.npid)
    return {
      key: p.npid,
      npid: p.npid,
      name: p.online_name,
      detail: `${p.match_count}판`,
      // Where they stand overall, behind what they did this week --- the same
      // pair the stats tab's table sets, so the summary and the full list read
      // the same way.
      detailSub: entry ? `#${entry.rank}` : undefined,
      ...charsOf(entry),
    }
  })
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
  const status = panelStatus(loading, error, {
    loadingMsg: '현황을 불러오는 중',
    onRetry: refresh,
    skeleton: <><CardGridSkeleton cards={4} label="현황을 불러오는 중" /><ListSkeleton rows={4} /></>,
  })
  if (status) return status

  const kpi = roomsKpi(rooms, roomsLoading)
  const today = todayPlayers(data?.daily ?? [])
  const registered = registeredPlayersKpi(leaderboardTotal)

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

      {/* 지금 → 오늘 → 전체. Three figures on three spans, each named in its
          own label, so no two cards can be read as the same fact. */}
      <div className="kpi-grid">
        <KpiCard icon={Users} label="지금 접속" value={kpi.players} hint={kpi.breakdown} live linkLabel="매치" to={ROOMS_PATH} />
        <KpiCard icon={TrendingUp} label="오늘 접속자" value={today.value} hint={today.hint} linkLabel="통계" to={pathOf('stats')} />
        <KpiCard icon={Trophy} label="등록 플레이어" value={registered.value} hint={registered.hint} linkLabel="리더보드" to={pathOf('leaderboard')} />
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
        <DailyChart data={data?.daily ?? []} height={200} />
      </section>

      {/* Kept below the chart: a ranking is slow-moving reference data with a
          tab of its own one click away, and these two lists are twice the
          height of the cards above (5 x 66px rows).
          Stacked, not side by side: each row carries a name, two portraits,
          two rank banners and two records, and splitting the width between two
          cards left the name 84px --- "yeheonhoofamily" rendered as "yehe...".
          Full width gives it ~490px, and the pair are read one after the other
          anyway. */}
      <div className="overview-grid is-stacked">
        <OverviewSection icon={Trophy} title="리더보드 TOP 5" subtitle="현재 상위 랭커" linkLabel="리더보드" to={pathOf('leaderboard')}>
          {/* Names what is missing rather than "데이터". The list is empty both
              before the leaderboard lands and when its fetch failed, so the
              copy stops at what is absent and claims no reason for it. */}
          <RankList rows={leaderboardRows(leaderboardEntries)} label="리더보드 상위 5명" detailLabel="전적" emptyMsg="리더보드 순위 없음" onSelect={setSelectedNpid} />
        </OverviewSection>

        <OverviewSection icon={Crown} title="주간 철악귀" subtitle="최근 7일 매치 참여" linkLabel="통계" to={pathOf('stats')}>
          {/* MATCH, not 매치: the header row is otherwise #/Player/Main/Sub, and
              this app sets Latin caps as a motif elsewhere (PLAYER INSIGHTS,
              ANY MATCH). One Korean word mid-row read as an oversight. */}
          <RankList rows={weeklyRows(data?.weeklyTop ?? [], leaderboardEntries)} label="주간 상위 5명" detailLabel="판수" emptyMsg="주간 기록 없음" onSelect={setSelectedNpid} />
        </OverviewSection>
      </div>

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
