import { useState, useCallback } from 'react'
import { fetchPosts, fetchPostDetail} from "@/community/communityApi";
import type { PostSummary, PostDetail} from "@/community/types";

const PAGE_SIZE = 20

interface CommunityState {
  posts: PostSummary[]
  total: number
  page: number
  loading: boolean
  error: string | null
  selectedPost: PostDetail | null
  detailLoading: boolean
  detailError: string | null
}

export default function useCommunity() {
  const [state, setState] = useState<CommunityState>({
    posts: [],
    total: 0,
    page: 1,
    loading: false,
    error: null,
    selectedPost: null,
    detailLoading: false,
    detailError: null,
  })

  const loadPosts = useCallback(async (page: number, postType?: string, characters: string[] = []) => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetchPosts(page, PAGE_SIZE, postType, characters)
      setState((s) => ({ ...s, posts: res.posts, total: res.total, page: res.page, loading: false }))
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message }))
    }
  }, [])

  const openPost = useCallback(async (id: number) => {
    setState((s) => ({ ...s, detailLoading: true, detailError: null }))
    try {
      const detail = await fetchPostDetail(id)
      setState((s) => ({ ...s, selectedPost: detail, detailLoading: false }))
    } catch (e: any) {
      setState((s) => ({ ...s, detailLoading: false, detailError: e.message }))
    }
  }, [])

  const closePost = useCallback(() => {
    setState((s) => ({ ...s, selectedPost: null, detailError: null }))
  }, [])

  /** Re-reads the open post after a write (a comment, a thumb).
   *
   * A failure here must not replace the post on screen with an error — the
   * reader is still looking at it, and the write may well have succeeded. But
   * it must not be silent either: `catch {}` meant a comment that never
   * appeared looked exactly like a comment the server had rejected. Re-throwing
   * hands it to the global unhandledrejection handler, which toasts the reason
   * over content that stays put. */
  const refreshDetail = useCallback(async () => {
    const postId = state.selectedPost?.id
    if (postId == null) return
    const detail = await fetchPostDetail(postId)
    setState((s) => ({ ...s, selectedPost: detail }))
  }, [state.selectedPost?.id])

  return {
    ...state,
    pageSize: PAGE_SIZE,
    loadPosts,
    openPost,
    closePost,
    refreshDetail,
  }
}
