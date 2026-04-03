import { Fragment, useState } from 'react'
import { TIER_STYLES, TIER_HEX } from '@/shared/tierColors'
import type { CSSProperties } from 'react'
import type {LeaderboardEntry} from "@/shared/types";
import RankImage from "@/shared/components/RankImage";
import PlayerHistoryPanel from "@/shared/components/PlayerHistoryPanel";
import {RankMatchRoom} from "@/match/types";

const VsLabel = <span aria-hidden="true" className="vs-label">VS</span>

const IconSearch = (
  <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

interface RankMatchTableProps {
  rooms: RankMatchRoom[]
  leaderboardEntries?: LeaderboardEntry[]
}

export default function RankMatchTable({ rooms, leaderboardEntries }: RankMatchTableProps) {
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)
  const entryByNpid = new Map(leaderboardEntries?.map(e => [e.np_id, e]) ?? [])
  const selectedEntry = selectedNpid !== null ? entryByNpid.get(selectedNpid) : undefined

  const sortedRoom = rooms.sort((a,b) => a.rank_info.id - b.rank_info.id).reverse()
  const tierGroups = Array.from(Map.groupBy(sortedRoom, room => room.rank_info.tier))

  return (
    <div className="w-full overflow-x-auto">
      <table className="border-collapse w-full min-w-85">
        <caption className="sr-only">Rank match rooms</caption>
        <colgroup>
          <col className="w-32" />
          <col />
          <col className="w-16" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="tbl-th">랭크</th>
            <th scope="col" className="tbl-th">플레이어 1</th>
            <th scope="col" className="tbl-th"></th>
            <th scope="col" className="tbl-th">플레이어 2</th>
          </tr>
        </thead>
        <tbody>
          {tierGroups.map(([tier, tierRooms]) => {
            const hex = TIER_HEX[tier]
            const separatorStyle: CSSProperties = hex
              ? { ...TIER_STYLES[tier], borderLeft: `3px solid ${hex}`, background: `${hex}12` }
              : TIER_STYLES[tier]
            const rowAccentStyle: CSSProperties = hex
              ? { borderLeft: `2px solid ${hex}28` }
              : {}
            const inGame = tierRooms.filter(r => r.users?.length === 2)
            const searching = tierRooms.filter(r => r.users?.length !== 2)
            const groupedSearching = Array.from(Map.groupBy(searching, s => s.rank_info.id))
            return (
              <Fragment key={tier}>
                <tr className="tier-separator">
                  <th scope="colgroup" colSpan={4}
                    className="tier-heading py-1.5 px-3 text-left"
                    style={separatorStyle}
                  >
                    <span className="tracking-widest">{tier}</span>
                  </th>
                </tr>
                {inGame.map((r,i) => (
                  <tr key={i} className="tbl-row" style={rowAccentStyle}>
                    <td className="tbl-td">
                      <RankImage rankInfo={r.rank_info} className="min-w-19.75 h-9 w-auto mx-auto" />
                    </td>
                    <td className="player-name">
                      {r.users?.[0] ? <button onClick={() => setSelectedNpid(r.users![0].np_id)} className="player-btn">{r.users[0].online_name}</button> : '—'}
                    </td>
                    <td className="tbl-td px-1">
                            <span className="inline-flex items-center" title="게임 중" aria-label="게임 중">
                              {VsLabel}
                            </span>
                    </td>
                    <td className="player-name">
                      {r.users?.[1] ? <button onClick={() => setSelectedNpid(r.users![1].np_id)} className="player-btn">{r.users[1].online_name}</button> : '—'}
                    </td>
                  </tr>
                ))}
                {groupedSearching.map(([rankId, searching]) => (
                  <tr key={'s-' + rankId} className="tbl-row" style={rowAccentStyle}>
                    <td colSpan={4} className="px-3 py-1.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="searching-icon shrink-0 text-tier-yellow">{IconSearch}</span>
                        <RankImage rankInfo={searching[0].rank_info} className="h-7 w-auto shrink-0" />
                        {searching.map(({users: searchUsers}) => (
                          <button key={searchUsers[0].np_id} onClick={() => setSelectedNpid(searchUsers[0].np_id)} className="player-btn">
                            {searchUsers[0].online_name}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      {selectedNpid !== null && (
        <PlayerHistoryPanel npid={selectedNpid} leaderboardEntry={selectedEntry} onClose={() => setSelectedNpid(null)} />
      )}
    </div>
  )
}
