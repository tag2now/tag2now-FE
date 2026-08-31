import { GROUP_ORDER, formatGroupName } from '@/config/tabConfig'
import { PlayerMatchTable, RankMatchTable } from '@/match/component'
import type { RankMatchRoom, Room } from '@/match/types'
import LoadingBar from '@/shared/components/LoadingBar'
import useTimeSince from '@/shared/hooks/useTimeSince'
import type { LeaderboardEntry } from '@/shared/types'
import { panelStatus } from '@/shared/util/panelStatus'
import { RefreshCw } from 'lucide-react'

type MatchingOverviewProps = {
  groups: Record<string, Room[]>
  loading: boolean
  refreshing?: boolean
  error: string | null
  onRefresh?: () => void
  lastUpdated?: Date | null
  leaderboardEntries?: LeaderboardEntry[]
}

export default function MatchingOverview({ groups, loading, refreshing, error, onRefresh, lastUpdated, leaderboardEntries }: MatchingOverviewProps) {
  const updatedAgo = useTimeSince(lastUpdated)
  const status = panelStatus(loading, error, '방 목록 불러오는 중...')
  const groupKeys = [
    ...GROUP_ORDER.filter((key) => key in groups),
    ...Object.keys(groups).filter((key) => !GROUP_ORDER.includes(key)),
  ]

  if (status) return status

  return (
    <div className="panel relative space-y-5" aria-live="polite">
      <LoadingBar visible={refreshing} />
      <div className="panel-meta flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold tracking-[0.08em] text-white">매칭 현황</p>
          <p className="mt-1 text-xs text-txt-dim">현재 열려 있는 랭크 · 플레이어 매치</p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAgo && <span className="text-xs text-txt-dim">업데이트 {updatedAgo}</span>}
          {onRefresh && <button className="refresh-btn" aria-label="새로고침" onClick={onRefresh} disabled={refreshing}><RefreshCw size={14} aria-hidden="true" /></button>}
        </div>
      </div>

      {groupKeys.length === 0 ? (
        <p className="state-msg px-4">현재 열려 있는 매칭이 없습니다.</p>
      ) : groupKeys.map((groupKey) => {
        const rooms = groups[groupKey] ?? []
        return (
          <section key={groupKey} className="border border-border-light bg-bg-row">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-lg font-black text-white">{formatGroupName(groupKey)}</h2>
              <span className="text-xs font-bold tracking-[0.08em] text-txt-dim">{rooms.length}개 방</span>
            </header>
            {rooms.length === 0 ? (
              <p className="state-msg px-4">방이 없습니다.</p>
            ) : groupKey === 'rank_match' ? (
              <RankMatchTable rooms={rooms as RankMatchRoom[]} leaderboardEntries={leaderboardEntries} />
            ) : (
              <PlayerMatchTable rooms={rooms} />
            )}
          </section>
        )
      })}
    </div>
  )
}
