const BASE = window.__ENV__?.API_BASE ?? '/api'

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
    const groups = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => Array.isArray(v))
    )
    const { total, totalUsers } = Object.values(groups).reduce(
      (acc, arr) => ({
        total: acc.total + arr.length,
        totalUsers: acc.totalUsers + arr.reduce((s, r) => s + (r.users?.length ?? 0), 0),
      }), { total: 0, totalUsers: 0 }
    )
    return { groups, total, totalUsers }
  })
