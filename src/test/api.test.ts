import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchLeaderboard, fetchRoomsAll } from '@/shared/api'

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
  it('calls GET /api/leaderboard?top=20 by default and returns parsed JSON', async () => {
    const payload = { total_records: 2, entries: [] }
    mockFetch(payload)

    const result = await fetchLeaderboard()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('/api/leaderboard?top=20')
    expect(result).toEqual(payload)
  })

  it('calls with top=5 when argument is 5', async () => {
    mockFetch({ total_records: 1, entries: [] })

    await fetchLeaderboard(5)

    expect(fetch).toHaveBeenCalledWith('/api/leaderboard?top=5')
  })

  it('throws on non-OK response (500)', async () => {
    mockFetch(null, false, 500)

    await expect(fetchLeaderboard()).rejects.toThrow('Leaderboard fetch failed: 500')
  })
})

describe('fetchRoomsAll', () => {
  it('calls GET /api/rooms/all and returns normalised { rooms, total }', async () => {
    const rawPayload = {
      '1': [{ id: 1, users: [{ online_name: 'A', user_id: 'a' }] }],
      '2': [
        { id: 2, users: [{ online_name: 'B', user_id: 'b' }, { online_name: 'C', user_id: 'c' }] },
        { id: 3, users: [] },
      ],
    }
    mockFetch(rawPayload)

    const result = await fetchRoomsAll()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('/api/rooms/all')
    expect(result).toEqual({ groups: rawPayload, total: 3, totalUsers: 3 })
  })

  it('throws on non-OK response', async () => {
    mockFetch(null, false, 404)

    await expect(fetchRoomsAll()).rejects.toThrow('Rooms fetch failed: 404')
  })
})
