import usePolledData, { type PolledState } from '@/shared/hooks/usePolledData'
import { fetchNotices } from '@/community/communityApi'
import type { PostSummary } from '@/community/types'

/** The board's pinned notices, fetched once; `refresh` after a write. */
export default function useNotices(): PolledState<PostSummary[]> {
  return usePolledData(fetchNotices, null)
}
