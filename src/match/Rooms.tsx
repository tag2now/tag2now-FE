import useTimeSince from "@/shared/hooks/useTimeSince";
import { panelStatus} from "@/shared/util/panelStatus";
import type {LeaderboardEntry} from "@/shared/types";
import LoadingBar from "@/shared/components/LoadingBar";
import {RankMatchRoom, Room} from "@/match/types";
import {PlayerMatchTable, RankMatchTable} from "@/match/component";
import { Radio, RefreshCw } from 'lucide-react'

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

export default function Rooms({ data, loading, refreshing, error, onRefresh, groupKey, lastUpdated, leaderboardEntries }: RoomsProps) {
  const updatedAgo = useTimeSince(lastUpdated)
  const s = panelStatus(loading, error, '방 목록 불러오는 중...', onRefresh)
  if (s) return s
  if (!data) return null

  const rooms = data.rooms ?? []

  return (
    <div className="panel relative" aria-live="polite">
      <LoadingBar visible={refreshing} />
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><Radio size={15} aria-hidden="true" /></span>
          <div><h3>실시간 방 목록</h3><p>현재 접속 가능한 매칭 세션</p></div>
        </div>
        <div className="flex items-center gap-3">
          {updatedAgo && (
            <span className="text-txt-dim text-xs">업데이트 {updatedAgo}</span>
          )}
          {onRefresh && (
            <button className="refresh-btn" aria-label="새로고침" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {rooms.length === 0 ? (
        <p className="state-msg px-4">방이 없습니다.</p>
      ) : groupKey === 'rank_match' ? (
        <RankMatchTable rooms={rooms as unknown as RankMatchRoom[]} leaderboardEntries={leaderboardEntries} />
      ) : (
        <PlayerMatchTable rooms={rooms} />
      )}
    </div>
  )
}
