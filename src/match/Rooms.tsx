import TimeSince from "@/shared/components/TimeSince";
import { panelStatus} from "@/shared/util/panelStatus";
import type {LeaderboardEntry} from "@/shared/types";
import LoadingBar from "@/shared/components/LoadingBar";
import {RankMatchRoom, Room} from "@/match/types";
import {PlayerMatchTable, RankMatchTable} from "@/match/component";
import { Radio, RefreshCw, SearchX } from 'lucide-react'
import { formatGroupName } from '@/config/tabConfig'
import { POLL } from '@/config/polling'
import { TableSkeleton } from '@/shared/components/Skeleton'

interface RoomsProps {
  data: { rooms?: Room[] } | null
  loading: boolean
  refreshing?: boolean
  error: string | null
  onRefresh?: () => void
  groupKey?: string
  lastUpdated?: Date | null
  leaderboardEntries?: LeaderboardEntry[]
}

/** What the list adds up to, in the line that used to read "현재 접속 가능한
 * 매칭 세션" on every tab and every poll.
 *
 * A rank room holds a match or a player waiting for one, and those are the two
 * things a reader is here to tell apart — counting rows is how they had to do
 * it. A player match is a lobby instead, so it is summarised by heads, not by
 * games. The static line is kept for the moment before the first room lands. */
function roomsSummary(rooms: Room[], groupKey?: string): string {
  if (rooms.length === 0) return '현재 접속 가능한 매칭 세션'
  if (groupKey === 'rank_match') {
    const playing = rooms.filter((r) => r.users?.length === 2).length
    return `게임 중 ${playing} · 상대 찾는 중 ${rooms.length - playing}`
  }
  const heads = rooms.reduce((sum, r) => sum + (r.users?.length ?? 0), 0)
  return `방 ${rooms.length}개 · 참가자 ${heads}명`
}

export default function Rooms({ data, loading, refreshing, error, onRefresh, groupKey, lastUpdated, leaderboardEntries }: RoomsProps) {
  const s = panelStatus(loading, error, {
    loadingMsg: '방 목록을 불러오는 중',
    onRetry: onRefresh,
    skeleton: <TableSkeleton rows={6} columns={5} label="방 목록을 불러오는 중" />,
  })
  if (s) return s
  if (!data) return null

  const rooms = data.rooms ?? []

  return (
    <div className="panel relative" aria-live="polite">
      <LoadingBar visible={refreshing} />
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><Radio size={15} aria-hidden="true" /></span>
          <div><h3>실시간 방 목록</h3><p>{roomsSummary(rooms, groupKey)}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <TimeSince date={lastUpdated} />
          {onRefresh && (
            <button className="refresh-btn" aria-label="새로고침" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {rooms.length === 0 ? (
        /* "방이 없습니다." in a dashed box said what was absent and nothing
           else — not which mode it meant, and not that the page is watching.
           A user on a live tab with an empty list needs to know whether to wait
           or to go and do something, so the poll is what the copy leads with. */
        <div className="empty-state" role="status">
          <span className="empty-state-icon" aria-hidden="true"><SearchX size={22} /></span>
          <p className="empty-state-title">
            지금 열린 {groupKey ? formatGroupName(groupKey) : '매칭'} 방이 없습니다
          </p>
          <p className="empty-state-hint">
            {Math.round(POLL.rooms / 1000)}초마다 자동으로 확인하고 있어요. 방이 열리면 바로 나타납니다.
          </p>
        </div>
      ) : groupKey === 'rank_match' ? (
        <RankMatchTable rooms={rooms as unknown as RankMatchRoom[]} leaderboardEntries={leaderboardEntries} />
      ) : (
        <PlayerMatchTable rooms={rooms} leaderboardEntries={leaderboardEntries} />
      )}
    </div>
  )
}
