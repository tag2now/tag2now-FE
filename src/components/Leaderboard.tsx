import { panelStatus } from '@/panelStatus'
import { RANK_COLORS } from '@/shared/tierColors'
import type { LeaderboardData } from '@/types'
import LoadingBar from './LoadingBar'
import CharCell from './CharCell'

interface LeaderboardProps {
  data: LeaderboardData | null
  loading: boolean
  refreshing?: boolean
  error: string | null
  onRefresh?: () => void
}

export default function Leaderboard({ data, loading, refreshing, error, onRefresh }: LeaderboardProps) {
  const s = panelStatus(loading, error, 'Loading leaderboard...')
  if (s) return s
  if (!data) return null

  return (
    <div className="panel relative" aria-live="polite">
      <LoadingBar visible={refreshing} />
      <div className="panel-meta flex items-center justify-between">
        <span>Total records: {data.total_records}</span>
        {onRefresh && (
          <button className="refresh-btn" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
            ↻ Refresh
          </button>
        )}
      </div>
      <div className="w-full overflow-x-auto">
        <table className="border-collapse w-full min-w-74.25">
          <caption className="sr-only">Leaderboard rankings</caption>
          <thead>
            <tr>
              <th scope="col" className="tbl-th w-1/20 sm:w-2/20">#</th>
              <th scope="col" className="tbl-th w-7/20 sm:w-4/20">Player</th>
              <th scope="col" className="tbl-th sm:w-7/20 text-center">Main</th>
              <th scope="col" className="tbl-th sm:w-7/20 text-center">Sub</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.np_id} className="tbl-row">
                <td className={`tbl-td font-display text-xs font-bold w-11 ${RANK_COLORS[e.rank] ?? ''}`}>
                  {e.rank}
                </td>
                <td className="player-name">{e.online_name}</td>
                <CharCell name={e.player_info?.main_char_info?.name} rankInfo={e.player_info?.main_char_info?.rank_info} wins={e.player_info?.main_char_info?.wins} losses={e.player_info?.main_char_info?.losses} />
                <CharCell name={e.player_info?.sub_char_info?.name} rankInfo={e.player_info?.sub_char_info?.rank_info} wins={e.player_info?.sub_char_info?.wins} losses={e.player_info?.sub_char_info?.losses} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
