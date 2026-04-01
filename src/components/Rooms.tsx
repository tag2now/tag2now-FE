import { useState, useEffect } from 'react'
import { panelStatus } from '@/panelStatus'
import type { Room } from '@/types'
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
  if (secs < 5) return 'just now'
  if (secs < 60) return `${secs}s ago`
  return `${Math.floor(secs / 60)}m ago`
}

export default function Rooms({ data, loading, refreshing, error, onRefresh, groupKey, lastUpdated }: RoomsProps) {
  const relativeTime = useRelativeTime(lastUpdated)
  const s = panelStatus(loading, error, 'Loading rooms...')
  if (s) return s
  if (!data) return null

  const rooms = data.rooms ?? []

  return (
    <div className="panel relative" aria-live="polite">
      <LoadingBar visible={refreshing} />
      <div className="panel-meta flex items-center justify-between">
        <span>{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-3">
          {relativeTime && (
            <span className="text-txt-dim text-xs">Updated {relativeTime}</span>
          )}
          {onRefresh && (
            <button className="refresh-btn" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
              ↻ Refresh
            </button>
          )}
        </div>
      </div>
      {rooms.length === 0 ? (
        <p className="state-msg px-4">No active rooms.</p>
      ) : groupKey === 'rank_match' ? (
        <RankMatchTable rooms={rooms} />
      ) : (
        <PlayerMatchTable rooms={rooms} />
      )}
    </div>
  )
}
