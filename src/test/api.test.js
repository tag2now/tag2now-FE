import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchLeaderboard, fetchRoomsAll } from '../api'

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetch(body, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  })
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
  it('calls GET /api/rooms/all and returns parsed JSON', async () => {
    const payload = { total: 3, rooms: [] }
    mockFetch(payload)

    const result = await fetchRoomsAll()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('/api/rooms/all')
    expect(result).toEqual(payload)
  })

  it('throws on non-OK response', async () => {
    mockFetch(null, false, 404)

    await expect(fetchRoomsAll()).rejects.toThrow('Rooms fetch failed: 404')
  })
})
