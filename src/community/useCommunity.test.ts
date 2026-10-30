import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPostDetail, fetchPosts } from '@/community/communityApi'
import type { PostDetail, PostSummary } from '@/community/types'
import useCommunity from '@/community/useCommunity'

vi.mock('@/community/communityApi', () => ({ fetchPosts: vi.fn(), fetchPostDetail: vi.fn() }))

const post: PostSummary = {
  id: 1, author: 'Writer', title: '제목', body: '본문', post_type: '자유', characters: [],
  thumbs_up: 0, thumbs_down: 0, created_at: '2026-10-30T00:00:00Z', comment_count: 0,
}
const detail: PostDetail = { ...post, comments: [] }

beforeEach(() => vi.resetAllMocks())

// Pre-refactor safety net: exercise public list/detail actions and keep post content after a failed reread.
describe('useCommunity', () => {
  it('loads a filtered page and keeps the server pagination', async () => {
    vi.mocked(fetchPosts).mockResolvedValue({ posts: [post], total: 41, page: 2, page_size: 20 })
    const { result } = renderHook(() => useCommunity())

    await act(async () => { await result.current.loadPosts(2, '공략', ['Jin']) })

    expect(fetchPosts).toHaveBeenCalledWith(2, 20, '공략', ['Jin'])
    expect(result.current).toMatchObject({ posts: [post], total: 41, page: 2, loading: false, error: null })
  })

  it('opens and closes a post', async () => {
    vi.mocked(fetchPostDetail).mockResolvedValue(detail)
    const { result } = renderHook(() => useCommunity())

    await act(async () => { await result.current.openPost(1) })
    expect(result.current).toMatchObject({ selectedPost: detail, detailLoading: false, detailError: null })

    act(() => result.current.closePost())
    expect(result.current.selectedPost).toBeNull()
  })

  it.each([new Error('서버 오류'), { message: '서버 오류' }, '서버 오류'])('keeps list and detail failures separate: %j', async (error) => {
    vi.mocked(fetchPosts).mockRejectedValue(error)
    vi.mocked(fetchPostDetail).mockRejectedValue(error)
    const { result } = renderHook(() => useCommunity())

    await act(async () => { await result.current.loadPosts(1) })
    expect(result.current).toMatchObject({ error: '서버 오류', loading: false, detailError: null })

    await act(async () => { await result.current.openPost(1) })
    expect(result.current).toMatchObject({ detailError: '서버 오류', detailLoading: false, selectedPost: null })
  })

  it('propagates a failed reread without replacing the open post', async () => {
    const error = new Error('다시 읽기 실패')
    vi.mocked(fetchPostDetail).mockResolvedValueOnce(detail).mockRejectedValueOnce(error)
    const { result } = renderHook(() => useCommunity())

    await act(async () => { await result.current.openPost(1) })
    await act(async () => { await expect(result.current.refreshDetail()).rejects.toBe(error) })

    expect(result.current.selectedPost).toEqual(detail)
    expect(result.current.detailError).toBeNull()
  })
})
