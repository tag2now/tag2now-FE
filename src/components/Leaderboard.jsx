export default function Leaderboard({ data, loading, error }) {
  if (loading) return <p>Loading leaderboard...</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>
  if (!data) return null

  return (
    <div>
      <p>Total records: {data.total_records}</p>
      <table border="1" cellPadding="6" cellSpacing="0">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Score</th>
            <th>Main</th>
            <th>Sub</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((e) => (
            <tr key={e.np_id}>
              <td>{e.rank}</td>
              <td>{e.online_name}</td>
              <td>{e.score}</td>
              <td>{e.player_info?.main_char_info?.name ?? '—'}</td>
              <td>{e.player_info?.sub_char_info?.name ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
