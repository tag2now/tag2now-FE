import { useState } from 'react'
import { RANK_COLORS } from '@/shared/tierColors'
import { MEDAL } from '@/shared/medalColors'
import LoadingBar from "@/shared/components/LoadingBar";
import CharCell from "@/shared/components/CharCell";
import PlayerHistoryPanel from "@/shared/components/PlayerHistoryPanel";
import {panelStatus} from "@/shared/util/panelStatus";
import {LeaderboardData} from "@/shared/types";

interface LeaderboardProps {
  data: LeaderboardData | null
  loading: boolean
  refreshing?: boolean
  error: string | null
  onRefresh?: () => void
}

export default function Leaderboard({ data, loading, refreshing, error, onRefresh }: LeaderboardProps) {
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)
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
            {data.entries.map((e, i) => {
              const medal = i < 3 ? MEDAL[i] : null
              const rankCls = medal ? '' : (RANK_COLORS[e.rank] ?? '')
              const rowStyle = medal ? { background: medal.bg, borderLeft: '3px solid ' + medal.border } : undefined
              const cellStyle = medal ? { color: medal.color } : undefined
              return (
                <tr key={e.np_id} className="tbl-row" style={rowStyle}>
                  <td className={`tbl-td font-display text-sm font-black w-11 ${rankCls}`} style={cellStyle}>
                    {medal ? medal.label : e.rank}
                  </td>
                  <td className="player-name" style={cellStyle}>
                    <button onClick={() => setSelectedNpid(e.np_id)} className="player-btn" style={cellStyle}>
                      {e.online_name}
                    </button>
                  </td>
                  <td className="char-td">
                    <CharCell name={e.player_info?.main_char_info?.name} rankInfo={e.player_info?.main_char_info?.rank_info} wins={e.player_info?.main_char_info?.wins} losses={e.player_info?.main_char_info?.losses} />
                  </td>
                  <td className="char-td">
                    <CharCell name={e.player_info?.sub_char_info?.name} rankInfo={e.player_info?.sub_char_info?.rank_info} wins={e.player_info?.sub_char_info?.wins} losses={e.player_info?.sub_char_info?.losses} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {selectedNpid && (
        <PlayerHistoryPanel npid={selectedNpid} leaderboardEntry={data?.entries.find(e => e.np_id === selectedNpid)} onClose={() => setSelectedNpid(null)} />
      )}
    </div>
  )
}
