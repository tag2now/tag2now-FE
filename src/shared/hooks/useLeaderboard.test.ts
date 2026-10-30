import { afterEach, expect, it, vi } from 'vitest'
import { fetchLeaderboard } from '@/shared/hooks/useLeaderboard'

afterEach(() => vi.unstubAllGlobals())

// Pre-refactor safety net: server ranks win, and omitted ranks use list place.
it('preserves tied server ranks and supplies a rank only where one was omitted', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ total_records: 3, entries: [
      { np_id: 'p1', online_name: 'One', rank: 1 },
      { np_id: 'p2', online_name: 'Two', rank: 1 },
      { np_id: 'p3', online_name: 'Three' },
    ] }),
  }))

  const result = await fetchLeaderboard()

  expect(result.total_records).toBe(3)
  expect(result.entries.map(entry => [entry.np_id, entry.rank])).toEqual([['p1', 1], ['p2', 1], ['p3', 3]])
})

it('retains the empty-list fallback for a response without entries', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ total_records: 0 }) }))

  expect(await fetchLeaderboard()).toEqual({ total_records: 0, entries: [] })
})
