import { vi } from 'vitest'
import { fetchOverview, OVERVIEW_NOTICES } from '@/overview/useOverview'
import { DEFAULT_STATS_DAYS } from '@/stat/useStats'
import { API } from '@/config/endpoints'
import { GET } from '@/shared/util/api'
import { fetchNotices } from '@/community/communityApi'

vi.mock('@/shared/util/api', () => ({ GET: vi.fn().mockResolvedValue([]) }))
vi.mock('@/community/communityApi', () => ({
  fetchPosts: vi.fn().mockResolvedValue({ posts: [] }),
  fetchNotices: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/reservation/reservationApi', () => ({ fetchReservations: vi.fn().mockResolvedValue([]) }))

// The home screen draws the stats tab's daily panel, so it reads the days that
// tab opens on --- a change to the stats default carries here by itself.
it('reads the same days of daily stats the stats tab opens on', async () => {
  await fetchOverview()

  expect(GET).toHaveBeenCalledWith(API.dailyStats().path, { days: DEFAULT_STATS_DAYS })
})

it('asks for only the newest notices', async () => {
  await fetchOverview()

  expect(fetchNotices).toHaveBeenCalledWith(OVERVIEW_NOTICES)
})

it('drops the notices, not the page, when they fail to load', async () => {
  vi.mocked(fetchNotices).mockRejectedValueOnce(new Error('down'))

  const data = await fetchOverview()

  expect(data.notices).toEqual([])
  expect(data.posts).toEqual([])
})
