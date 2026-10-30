import { afterEach, expect, it, vi } from 'vitest'
import { fetchRoomsAll } from '@/match/useRooms'

afterEach(() => vi.unstubAllGlobals())

// Pre-refactor safety net for the backend-to-UI room mapping.
it('maps RPCN ids while retaining room data, live streams and totals', async () => {
  const stream = { platform: 'chzzk', channel_name: 'Player', url: 'https://example.com/live', title: 'Live', viewer_count: 2 }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      rank_match: [{ room_id: 1, users: [{ npid: 'p1', online_name: 'Player', avatar_url: '', stream }] }],
      player_match: [{ room_id: 2, users: [] }],
    }),
  }))

  const result = await fetchRoomsAll()

  expect(result.total).toBe(2)
  expect(result.totalUsers).toBe(1)
  expect(result.groups.rank_match[0].users[0]).toMatchObject({ np_id: 'p1', npid: 'p1', online_name: 'Player', stream })
  expect(result.groups.player_match[0]).toEqual({ room_id: 2, users: [] })
})

it('accepts an empty room response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))

  expect(await fetchRoomsAll()).toEqual({ groups: {}, total: 0, totalUsers: 0 })
})
