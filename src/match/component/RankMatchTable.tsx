import RankImage from '@/shared/components/RankImage'
import { Fragment, memo, useState } from 'react'
import { TIER_STYLES, TIER_HEX } from '@/shared/tierColors'
import type { CSSProperties } from 'react'
import type {LeaderboardEntry} from "@/shared/types";
import PlayerHistoryPanel from "@/shared/components/PlayerHistoryPanel";
import {RankMatchRoom} from "@/match/types";
import { Search } from 'lucide-react'

const VsLabel = <span aria-hidden="true" className="vs-label">VS</span>

interface RankMatchTableProps {
  rooms: RankMatchRoom[]
  leaderboardEntries?: LeaderboardEntry[]
}

export default memo(function RankMatchTable({ rooms, leaderboardEntries }: RankMatchTableProps) {
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)
  const entryByNpid = new Map(leaderboardEntries?.map(e => [e.np_id, e]) ?? [])
  const selectedEntry = selectedNpid !== null ? entryByNpid.get(selectedNpid) : undefined

  const sortedRoom = rooms.sort((a,b) => a.rank_info.id - b.rank_info.id).reverse()
  const tierGroups = Array.from(Map.groupBy(sortedRoom, room => room.rank_info.tier))

  return (
    <div className="data-table-wrap">
      <table className="match-table border-collapse w-full">
        <caption className="sr-only">랭크 매치 방 목록</caption>
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
            {/* Not an empty header. A column with no name is read out as
                "column 3" and its cells carry the room's state. */}
            <th scope="col" className="tbl-th"><span className="sr-only">상태</span></th>
            <th scope="col" className="tbl-th">플레이어 2</th>
          </tr>
        </thead>
        <tbody>
          {tierGroups.map(([tier, tierRooms]) => {
            const hex = TIER_HEX[tier]
            // The band used to paint a flat tint across the full 806px of the
            // table under a heading three characters long, which read as a row
            // of data rather than a label on the rows below it. `--tier` hands
            // the colour to the stylesheet, which fades the tint out across the
            // width and keeps the label at the left edge where the accent is.
            // A near-black ground is what sets the alphas: 12%/16% tints landed
            // within a few values of the ground and were simply invisible.
            const separatorStyle: CSSProperties = hex
              ? { ...TIER_STYLES[tier], '--tier': hex } as CSSProperties
              : TIER_STYLES[tier]
            const rowAccentStyle: CSSProperties = hex
              ? { borderLeft: `4px solid ${hex}40` }
              : {}
            const inGame = tierRooms.filter(r => r.users?.length === 2)
            // One row per room, like the matches above them. These used to be
            // grouped by rank into a single full-width `colSpan={4}` cell with
            // its own layout and its own banner size, so the waiting players
            // broke every column the rest of the table had established.
            const searching = tierRooms.filter(r => r.users?.length !== 2)
            return (
              <Fragment key={tier}>
                <tr className="tier-separator">
                  <th scope="colgroup" colSpan={4} className="tier-heading" style={separatorStyle}>
                    {/* The count sits beside the band, not at the far edge: a
                        figure 800px from the word it belongs to is a second
                        column, and this row has no columns. */}
                    <span className="tier-heading-inner">
                      <span className="tier-heading-name">{tier}</span>
                      <span className="tier-heading-count">{tierRooms.length}개 방</span>
                    </span>
                  </th>
                </tr>
                {inGame.map((r) => (
                  <tr key={r.room_id} className="tbl-row" style={rowAccentStyle}>
                    <td className="tbl-td">
                      <RankImage rankInfo={r.rank_info} className="rank-art" />
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
                {searching.map((r) => {
                  const waiting = r.users?.[0]
                  if (!waiting) return null
                  return (
                    <tr key={'s-' + waiting.np_id} className="tbl-row is-searching" style={rowAccentStyle}>
                      <td className="tbl-td">
                        <RankImage rankInfo={r.rank_info} className="rank-art" />
                      </td>
                      <td className="player-name">
                        <button onClick={() => setSelectedNpid(waiting.np_id)} className="player-btn">
                          {waiting.online_name}
                        </button>
                      </td>
                      <td className="tbl-td px-1">
                        <span className="searching-icon" title="상대 찾는 중" aria-label="상대 찾는 중">
                          <Search size={14} aria-hidden="true" />
                        </span>
                      </td>
                      <td className="tbl-td waiting-slot">상대 찾는 중</td>
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      {selectedNpid !== null && (
        <PlayerHistoryPanel npid={selectedNpid} leaderboardEntry={selectedEntry} leaderboardEntries={leaderboardEntries} onClose={() => setSelectedNpid(null)} />
      )}
    </div>
  )
})
