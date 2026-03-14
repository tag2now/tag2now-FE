const BASE = '/api'

export const fetchLeaderboard = (top = 20) =>
  fetch(`${BASE}/leaderboard?top=${top}`).then((r) => {
    if (!r.ok) throw new Error(`Leaderboard fetch failed: ${r.status}`)
    return r.json()
  })

export const fetchRoomsAll = () =>
  fetch(`${BASE}/rooms/all`).then((r) => {
    if (!r.ok) throw new Error(`Rooms fetch failed: ${r.status}`)
    return r.json()
  })
