import { useState, useEffect } from 'react'
import { panelStatus } from '@/panelStatus'
import type {Room, LeaderboardEntry, RankMatchRoom} from '@/types'
import LoadingBar from './LoadingBar'
import RankMatchTable from './RankMatchTable'
import PlayerMatchTable from './PlayerMatchTable'

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

function useRelativeTime(date: Date | null | undefined): string {
  const [, tick] = useState(0)
  const ts = date?.getTime()
  useEffect(() => {
    if (!ts) return
    const id = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [ts])
  if (!ts) return ''
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 5) return '방금'
  if (secs < 60) return `${secs}초 전`
  return `${Math.floor(secs / 60)}분 전`
}

export default function Rooms({ data, loading, refreshing, error, onRefresh, groupKey, lastUpdated, leaderboardEntries }: RoomsProps) {
  const relativeTime = useRelativeTime(lastUpdated)
  const s = panelStatus(loading, error, '방 목록 불러오는 중...')
  if (s) return s
  if (!data) return null

  const rooms = data.rooms ?? []

  return (
    <div className="panel relative" aria-live="polite">
      <LoadingBar visible={refreshing} />
      <div className="panel-meta flex items-center justify-between">
        <span>{rooms.length}개 방</span>
        <div className="flex items-center gap-3">
          {relativeTime && (
            <span className="text-txt-dim text-xs">업데이트 {relativeTime}</span>
          )}
          {onRefresh && (
            <button className="refresh-btn" aria-label="새로고침" onClick={onRefresh} disabled={refreshing}>
              ↻
            </button>
          )}
        </div>
      </div>
      {rooms.length === 0 ? (
        <p className="state-msg px-4">활성화된 방이 없습니다.</p>
      ) : groupKey === 'rank_match' ? (
        <RankMatchTable rooms={rooms as unknown as RankMatchRoom[]} leaderboardEntries={leaderboardEntries} />
      ) : (
        <PlayerMatchTable rooms={rooms} />
      )}
    </div>
  )
}
