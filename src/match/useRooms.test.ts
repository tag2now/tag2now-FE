import { afterEach, expect, it, vi } from 'vitest'
import { fetchRoomsAll } from '@/match/useRooms'
import type { RoomsResponse } from '@/match/types'

afterEach(() => vi.unstubAllGlobals())

// Pre-refactor safety net for the backend-to-UI room mapping.
it('maps RPCN ids while retaining room data, live streams and totals', async () => {
  const stream = { platform: 'chzzk', channel_name: 'Player', url: 'https://example.com/live', title: 'Live', viewer_count: 2 }
  const rank = { id: 1, name: '1st dan', tier: '나무단' }
  const response: RoomsResponse = {
    rank_match: [{ room_id: 1, rank_info: rank, users: [{ npid: 'p1', online_name: 'Player', avatar_url: '', stream }] }],
    player_match: [{ room_id: 2, users: [] }],
    custom_mode: [{ room_id: 3, users: [] }],
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => response,
  }))

  const result = await fetchRoomsAll()

  expect(result.total).toBe(3)
  expect(result.totalUsers).toBe(1)
  expect(result.groups.rank_match?.[0]).toMatchObject({ rank_info: rank, users: [{ np_id: 'p1', npid: 'p1', online_name: 'Player', stream }] })
  expect(result.groups.player_match[0]).toEqual({ room_id: 2, users: [] })
  expect(result.groups.custom_mode[0]).toEqual({ room_id: 3, users: [] })
})

it('accepts an empty room response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))

  expect(await fetchRoomsAll()).toEqual({ groups: {}, total: 0, totalUsers: 0 })
})
