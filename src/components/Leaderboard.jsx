import { charImageUrl } from '../characterImage'
import { panelStatus } from '../panelStatus'
import LoadingBar from './LoadingBar'
import { TIER_STYLES } from '../tierColors'

function CharCell({ name, rankInfo, wins, losses }) {
  if (!name) return <td className="char-td">—</td>
  const url = charImageUrl(name)
  const total = (wins ?? 0) + (losses ?? 0)
  const winRate = total > 0 ? Math.round((wins ?? 0) / total * 100) : null
  return (
    <td className="char-td">
      <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-1 sm:gap-2 sm:w-auto mx-auto">
        <div className="flex flex-1 justify-center flex-col sm:flex-row items-center gap-1">
          {rankInfo?.name && <span className="char-rank sm:max-w-none sm:w-3/10" style={TIER_STYLES[rankInfo.tier]}>{rankInfo.name}</span>}
          {url && <img src={url} alt={name} className="w-13 h-13 sm:w-15 sm:h-15 object-contain" />}
        {winRate != null && (
            <div className="hidden w-3/10 sm:block text-[1rem] leading-tight whitespace-nowrap text-left">
                <span className="text-green-700">W </span>{wins} <span className="text-red-700">L </span>{losses}
                <br />
                <span className="text-gray-600">WR:</span>{winRate}%
            </div>
        )}
        </div>
      </div>
    </td>
  )
}

const RANK_COLORS = { 1: 'text-secondary-light', 2: 'text-silver', 3: 'text-bronze' }

export default function Leaderboard({ data, loading, refreshing, error, onRefresh }) {
  const s = panelStatus(loading, error, 'Loading leaderboard...')
  if (s) return s
  if (!data) return null

  return (
    <div className="panel relative">
      <LoadingBar visible={refreshing} />
      <div className="panel-meta flex items-center justify-between px-4">
        <span>Total records: {data.total_records}</span>
        {onRefresh && (
          <button className="refresh-btn" aria-label="Refresh" onClick={onRefresh}>
            ↻ Refresh
          </button>
        )}
      </div>
      <div className="w-full overflow-x-auto">
        <table className="border-collapse w-full min-w-74.25">
          <thead>
            <tr>
              <th className="tbl-th w-1/20 sm:w-2/20">#</th>
              <th className="tbl-th w-7/20 sm:w-5/20">Player</th>
              <th className="tbl-th sm:w-7/20 text-center">Main</th>
              <th className="tbl-th sm:w-7/20 text-center">Sub</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.np_id} className="tbl-row">
                <td className={`tbl-td font-display text-[0.78rem] font-bold w-11 ${RANK_COLORS[e.rank] ?? ''}`}>
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
