import { Fragment } from 'react'
import type { Room } from '@/types'

interface PlayerMatchTableProps {
  rooms: Room[]
}

export default function PlayerMatchTable({ rooms }: PlayerMatchTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="border-collapse w-full min-w-85">
        <caption className="sr-only">Player match rooms</caption>
        <thead>
          <tr>
            <th scope="col" className="tbl-th">#</th>
            <th scope="col" className="tbl-th">User</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
            <Fragment key={r.room_id}>
              <tr className="tier-separator">
                <th scope="colgroup" colSpan={2} className="tier-heading py-2">
                  {r.owner_online_name} ({r.users?.length ?? 0})
                </th>
              </tr>
              {(r.users ?? []).map((u, i) => (
                <tr key={u.user_id ?? i} className="tbl-row">
                  <td className="tbl-td">{i + 1}</td>
                  <td className="player-name">{u.online_name}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
