import { panelStatus } from '../panelStatus'

export default function Rooms({ data, loading, error }) {
  const s = panelStatus(loading, error, 'Loading rooms...')
  if (s) return s
  if (!data) return null

  const rooms = data.rooms ?? []

  return (
    <div className="panel">
      <p className="panel-meta">Total rooms: {data.total ?? rooms.length}</p>
      {rooms.length === 0 ? (
        <p className="state-msg">No active rooms.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Room ID</th>
                <th>Owner</th>
                <th>Rank</th>
                <th>Slots</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.room_id}>
                  <td>{r.room_id}</td>
                  <td className="player-name">{r.owner_online_name}</td>
                  <td>{r.rank}</td>
                  <td>{r.max_slots}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
