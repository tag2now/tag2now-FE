import { Fragment, useState } from 'react'
import { TIER_STYLES, TIER_HEX } from '@/shared/tierColors'
import type { CSSProperties } from 'react'
import type {LeaderboardEntry} from "@/shared/types";
import RankImage from "@/shared/components/RankImage";
import PlayerHistoryPanel from './PlayerHistoryPanel'
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
  const selectUser = (u: { np_id: string; online_name: string }) =>
    setSelectedNpid(u.np_id || u.online_name)
  const sorted = rooms.sort((a, b) => (a.rank_info.id ?? 0) - (b.rank_info.id ?? 0)).reverse()
  const tierGroups: [string, RankMatchRoom[]][] = []
  const seen = new Map<string, RankMatchRoom[]>()
  for (const r of sorted) {
    const tier = r.rank_info.tier ?? '—'
    if (!seen.has(tier)) { seen.set(tier, []); tierGroups.push([tier, seen.get(tier)!]) }
    seen.get(tier)!.push(r)
    // seen.getOrInsertComputed();
  }


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
                {(() => {
                  // Group all rooms by rank id, sorted by rank desc
                  const rankGroups = new Map<number, RankMatchRoom[]>()
                  for (const r of tierRooms) {
                    const id = r.rank_info.id ?? -1
                    if (!rankGroups.has(id)) rankGroups.set(id, [])
                    rankGroups.get(id)!.push(r)
                  }
                  return [...rankGroups.entries()]
                    .sort(([a], [b]) => b - a)
                    .flatMap(([, rooms]) => {
                      const inGame = rooms.filter(r => r.users?.length === 2)
                      const searching = rooms.filter(r => r.users?.length !== 2)
                      return [
                        ...inGame.map(r => (
                          <tr key={r.room_id} className="tbl-row" style={rowAccentStyle}>
                            <td className="tbl-td">
                              <RankImage rankInfo={r.rank_info} className="min-w-19.75 h-9 w-auto mx-auto" />
                            </td>
                            <td className="player-name">
                              {r.users?.[0] ? <button onClick={() => selectUser(r.users![0])} className="player-btn">{r.users[0].online_name}</button> : '—'}
                            </td>
                            <td className="tbl-td px-1">
                              <span className="inline-flex items-center" title="게임 중" aria-label="게임 중">
                                {VsLabel}
                              </span>
                            </td>
                            <td className="player-name">
                              {r.users?.[1] ? <button onClick={() => selectUser(r.users![1])} className="player-btn">{r.users[1].online_name}</button> : '—'}
                            </td>
                          </tr>
                        )),
                        ...(searching.length > 0 ? [(
                          <tr key={'s-' + rooms[0].rank_info.id} className="tbl-row" style={rowAccentStyle}>
                            <td colSpan={4} className="px-3 py-1.5">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="shrink-0 text-tier-yellow">{IconSearch}</span>
                                <RankImage rankInfo={searching[0].rank_info} className="h-7 w-auto shrink-0" />
                                {searching.map(r => (
                                  r.users?.[0] ? (
                                    <button key={r.room_id} onClick={() => selectUser(r.users![0])} className="player-btn">
                                      {r.users[0].online_name}
                                    </button>
                                  ) : (
                                    <span key={r.room_id} className="text-sm font-semibold text-txt-dim">—</span>
                                  )
                                ))}
                              </div>
                            </td>
                          </tr>
                        )] : []),
                      ]
                    })
                })()}
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
