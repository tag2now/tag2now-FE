export default function Rooms({ data, loading, error }) {
  if (loading) return <p>Loading rooms...</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>
  if (!data) return null

  const rooms = data.rooms ?? []

  return (
    <div>
      <p>Total rooms: {data.total ?? rooms.length}</p>
      {rooms.length === 0 ? (
        <p>No active rooms.</p>
      ) : (
        <table border="1" cellPadding="6" cellSpacing="0">
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
                <td>{r.owner_online_name}</td>
                <td>{r.rank}</td>
                <td>{r.max_slots}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
