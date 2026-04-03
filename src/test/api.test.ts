import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchLeaderboard } from '@/hooks/useLeaderboard'
import { fetchRoomsAll} from '@/hooks/useRooms'

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetch(body: unknown, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch
}

describe('fetchLeaderboard', () => {
  it('calls GET /api/leaderboard?top=100 and returns parsed JSON', async () => {
    const payload = { total_records: 2, entries: [] }
    mockFetch(payload)

    const result = await fetchLeaderboard()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('/api/leaderboard?top=100', { credentials: 'include', method: 'GET' })
    expect(result).toMatchObject({ total_records: 2, entries: [] })
  })

  it('throws on non-OK response (500)', async () => {
    mockFetch(null, false, 500)

    await expect(fetchLeaderboard()).rejects.toThrow('request failed: 500')
  })
})

describe('fetchRoomsAll', () => {
  it('calls GET /api/rooms/all and returns normalised { groups, total, totalUsers }', async () => {
    const rawPayload = {
      '1': [{ id: 1, users: [{ online_name: 'A', np_id: 'a' }] }],
      '2': [
        { id: 2, users: [{ online_name: 'B', np_id: 'b' }, { online_name: 'C', np_id: 'c' }] },
        { id: 3, users: [] },
      ],
    }
    mockFetch(rawPayload)

    const result = await fetchRoomsAll()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('/api/rooms/all?', { credentials: 'include', method: 'GET' })
    expect(result).toEqual({ groups: rawPayload, total: 3, totalUsers: 3 })
  })

  it('throws on non-OK response', async () => {
    mockFetch(null, false, 404)

    await expect(fetchRoomsAll()).rejects.toThrow('request failed: 404')
  })
})
