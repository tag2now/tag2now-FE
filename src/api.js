const BASE = '/api'

export const fetchLeaderboard = (top = 20) =>
  fetch(`${BASE}/leaderboard?top=${top}`).then((r) => {
    if (!r.ok) throw new Error(`Leaderboard fetch failed: ${r.status}`)
    return r.json()
  }).then((data) => ({
    ...data,
    entries: (data.entries ?? []).map((e, i) => ({ rank: i + 1, ...e })),
  }))

export const fetchRoomsAll = () =>
  fetch(`${BASE}/rooms/all`).then((r) => {
    if (!r.ok) throw new Error(`Rooms fetch failed: ${r.status}`)
    return r.json()
  }).then((raw) => {
    const rooms = Object.values(raw).flat()
    return { rooms, total: rooms.length }
  })
