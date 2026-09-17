import { useState } from 'react'
import PlayerHistoryPanel from '@/shared/components/PlayerHistoryPanel'
import type { LeaderboardEntry } from '@/shared/types'
import type { Room } from '@/match/types'

interface PlayerMatchTableProps {
  rooms: Room[]
  leaderboardEntries?: LeaderboardEntry[]
}

/** One lobby per row — the same thing a row means on the rank tab.
 *
 * It used to be one *person* per row, grouped under a band carrying the host's
 * name, and almost nothing about that survived contact with the tab beside it:
 *
 *   - "방 2개" in the toolbar sat above three rows, because the rows were people
 *   - the host appeared twice, once as the band and once as row 1
 *   - the `#` column counted 1, 2 within each room, which is not a fact about
 *     anything a reader can use
 *   - the headings were `#` and `User` while the rank tab's were 랭크 and
 *     플레이어 1, in an otherwise Korean UI
 *   - a name opened that player's history on the rank tab and did nothing here
 *
 * Both tables sit behind one tab strip. Switching between them should not mean
 * relearning what a row is.
 *
 * No tier bands here, and that is not an inconsistency: the rank tab groups by
 * rank because its rooms have one. A lobby does not, so there is nothing to
 * group by and a band would be decoration standing in for structure.
 *
 * Deliberately not `memo`: `TimeSinceIsolation.test.tsx` spies on this export
 * to prove the elapsed-time ticker does not re-render the table under it, and
 * a memo wrapper is what that spy would be wrapping instead.
 */
export default function PlayerMatchTable({ rooms, leaderboardEntries }: PlayerMatchTableProps) {
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)
  const entryByNpid = new Map(leaderboardEntries?.map(e => [e.np_id, e]) ?? [])
  const selectedEntry = selectedNpid !== null ? entryByNpid.get(selectedNpid) : undefined

  return (
    <div className="data-table-wrap">
      <table className="match-table border-collapse w-full">
        <caption className="sr-only">플레이어 매치 방 목록</caption>
        <colgroup>
          <col className="w-52" />
          <col />
          <col className="w-24" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="tbl-th">호스트</th>
            <th scope="col" className="tbl-th">참가자</th>
            <th scope="col" className="tbl-th">인원</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => {
            const users = room.users ?? []
            // The host is in `users` as well as in `owner_online_name`, so they
            // are matched up rather than listed twice. A room whose owner is
            // absent from the roster still names them — the column is about who
            // opened the lobby, not about who the payload happens to list.
            const host = users.find((u) => u.online_name === room.owner_online_name)
            const guests = users.filter((u) => u !== host)
            const capacity = room.max_slots ?? 0
            return (
              // Same `is-searching` treatment the rank tab gives a room with
              // nobody in it yet: one signal for one state across both tables.
              <tr key={room.room_id} className={`tbl-row${guests.length === 0 ? ' is-searching' : ''}`}>
                <td className="player-name">
                  {host
                    ? <button type="button" className="player-btn" onClick={() => setSelectedNpid(host.np_id)}>{host.online_name}</button>
                    : room.owner_online_name || '—'}
                </td>
                <td className="tbl-td room-guests">
                  {guests.length > 0
                    ? guests.map((guest) => (
                        <button key={guest.np_id} type="button" className="player-btn" onClick={() => setSelectedNpid(guest.np_id)}>
                          {guest.online_name}
                        </button>
                      ))
                    : <span className="waiting-slot">참가자 대기 중</span>}
                </td>
                <td className="tbl-td">
                  {/* The slot count is what a reader is deciding on — whether
                      there is room for them — and it was not shown at all. */}
                  <span className="room-capacity">
                    {users.length}
                    {capacity > 0 && <i>/{capacity}</i>}
                    <span className="sr-only">명 참가 중{capacity > 0 && `, 정원 ${capacity}명`}</span>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {selectedNpid !== null && (
        <PlayerHistoryPanel npid={selectedNpid} leaderboardEntry={selectedEntry} leaderboardEntries={leaderboardEntries} onClose={() => setSelectedNpid(null)} />
      )}
    </div>
  )
}
