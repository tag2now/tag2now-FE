import { useMemo, useState } from 'react'
import { RANK_COLORS } from '@/shared/tierColors'
import { MEDAL } from '@/shared/medalColors'
import LoadingBar from "@/shared/components/LoadingBar";
import CharCell from "@/shared/components/CharCell";
import PlayerHistoryPanel from "@/shared/components/PlayerHistoryPanel";
import LeaderboardControls from "@/shared/components/LeaderboardControls";
import {panelStatus} from "@/shared/util/panelStatus";
import {filterEntries, COLLAPSED_VISIBLE} from "@/shared/util/leaderboardFilter";
import {LeaderboardData} from "@/shared/types";
import { RefreshCw, Trophy } from 'lucide-react'

interface LeaderboardProps {
  data: LeaderboardData | null
  loading: boolean
  refreshing?: boolean
  error: string | null
  onRefresh?: () => void
}

export default function Leaderboard({ data, loading, refreshing, error, onRefresh }: LeaderboardProps) {
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [character, setCharacter] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const entries = data?.entries ?? []
  const visible = useMemo(
    () => filterEntries(entries, { search, character, collapsed }),
    [entries, search, character, collapsed],
  )

  const s = panelStatus(loading, error, 'Loading leaderboard...')
  if (s) return s
  if (!data) return null

  return (
    <div className="panel relative" aria-live="polite">
      <LoadingBar visible={refreshing} />
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><Trophy size={15} aria-hidden="true" /></span>
          <div><h3>전체 랭킹</h3><p>등록 플레이어 {data.total_records}명</p><span className="sr-only">Total records: {data.total_records}</span></div>
        </div>
        {onRefresh && (
          <button className="refresh-btn" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <LeaderboardControls
        search={search}
        onSearchChange={setSearch}
        character={character}
        onCharacterChange={setCharacter}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        collapsible={entries.length > COLLAPSED_VISIBLE}
        filtering={search.trim() !== '' || character !== ''}
        shown={visible.length}
        total={entries.length}
      />
      <div className="data-table-wrap">
        <table className="ranking-table leaderboard-table">
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
            {visible.map((e) => {
              // Keyed off the true rank, not the row index: a filtered view must
              // not award a medal to whoever happens to land in the top rows.
              const medal = e.rank <= 3 ? MEDAL[e.rank - 1] : null
              const rankCls = medal ? '' : (RANK_COLORS[e.rank] ?? '')
              const rowStyle = medal ? { borderLeft: '3px solid ' + medal.border } : undefined
              const cellStyle = medal ? { color: medal.color } : undefined
              return (
                <tr key={e.np_id} className="tbl-row" style={rowStyle}>
                  <td className={`tbl-td rank-cell ${rankCls}`} style={cellStyle}>
                    <span className={`rank-position ${medal ? `is-podium podium-${i + 1}` : ''}`}>{medal ? medal.label : e.rank}</span>
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
        {visible.length === 0 && entries.length > 0 && (
          <p className="state-msg">검색 결과가 없습니다</p>
        )}
      </div>
      {selectedNpid && (
        <PlayerHistoryPanel npid={selectedNpid} leaderboardEntry={data?.entries.find(e => e.np_id === selectedNpid)} onClose={() => setSelectedNpid(null)} />
      )}
    </div>
  )
}
