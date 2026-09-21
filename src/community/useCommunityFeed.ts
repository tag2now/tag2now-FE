import createPolledSource from '@/shared/hooks/createPolledSource'
import type { PolledState } from '@/shared/hooks/usePolledData'
import { POLL } from '@/config/polling'
import { fetchPosts } from '@/community/communityApi'
import type { PostListResponse } from '@/community/types'

/** All the badge can see. A fuller count would cost paging the whole board. */
const FEED_PAGE_SIZE = 20

const NEW_POST_WINDOW_MS = 24 * 60 * 60 * 1000

const useCommunityFeedSource = createPolledSource(() => fetchPosts(1, FEED_PAGE_SIZE))

export default function useCommunityFeed(
  interval: number | null = POLL.communityBackground,
): PolledState<PostListResponse> {
  return useCommunityFeedSource(interval)
}

/** Posts from the last 24 hours, capped at what one page can see. */
export function countRecent(feed: PostListResponse | null, now: number = Date.now()): number {
  if (!feed) return 0
  return feed.posts.filter((post) => now - new Date(post.created_at).getTime() < NEW_POST_WINDOW_MS).length
}

/** True when the count may be an undercount: the page is full and every post on
 * it is recent, so the ones it cut off could be recent too. */
export function isRecentCountCapped(feed: PostListResponse | null, now: number = Date.now()): boolean {
  if (!feed) return false
  return feed.posts.length >= FEED_PAGE_SIZE && countRecent(feed, now) === feed.posts.length
}
