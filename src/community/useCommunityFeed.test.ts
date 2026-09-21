import { describe, it, expect } from 'vitest'
import { countRecent, isRecentCountCapped } from '@/community/useCommunityFeed'
import type { PostListResponse } from '@/community/types'

const NOW = new Date('2026-09-21T12:00:00+09:00').getTime()

const post = (id: number, hoursAgo: number) => ({
  id, author: 'Writer', title: `post ${id}`, body: '', post_type: '자유',
  characters: [], thumbs_up: 0, thumbs_down: 0, comment_count: 0,
  created_at: new Date(NOW - hoursAgo * 3_600_000).toISOString(),
})

const feed = (posts: ReturnType<typeof post>[]): PostListResponse =>
  ({ posts, total: posts.length, page: 1, page_size: 20 })

describe('countRecent', () => {
  it('counts posts written within the last 24 hours', () => {
    expect(countRecent(feed([post(3, 0), post(2, 12), post(1, 30)]), NOW)).toBe(2)
  })

  it('excludes a post exactly 24 hours old', () => {
    // The window is "the last day", and a post from this hour yesterday is no
    // longer part of it. An inclusive bound would keep it for one more tick.
    expect(countRecent(feed([post(1, 24)]), NOW)).toBe(0)
  })

  it('counts nothing before the first load settles', () => {
    expect(countRecent(null, NOW)).toBe(0)
  })
})

describe('isRecentCountCapped', () => {
  it('flags a full page where every post is recent', () => {
    const posts = Array.from({ length: 20 }, (_, i) => post(i + 1, 1))

    expect(isRecentCountCapped(feed(posts), NOW)).toBe(true)
  })

  it('does not flag a full page that reaches past the window', () => {
    // The oldest post on the page is already too old, so the posts the page cut
    // off are older still and none of them can be recent.
    const posts = [...Array.from({ length: 19 }, (_, i) => post(i + 2, 1)), post(1, 30)]

    expect(isRecentCountCapped(feed(posts), NOW)).toBe(false)
  })

  it('does not flag a partial page', () => {
    expect(isRecentCountCapped(feed([post(1, 1)]), NOW)).toBe(false)
  })
})
