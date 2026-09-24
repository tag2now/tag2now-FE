import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PostDetail from './PostDetail'
import { updatePost } from '@/community/communityApi'

vi.mock('@/community/communityApi', () => ({ updatePost: vi.fn(), createComment: vi.fn(), thumbPost: vi.fn(), deletePost: vi.fn() }))
const post = { id: 1, author: 'owner', title: '원래 제목', body: '원래 본문', post_type: '자유', characters: [], youtube_video_id: 'M7lc1UVf-VE', thumbs_up: 0, thumbs_down: 0, created_at: '2026-09-11T00:00:00Z', comments: [] }
function setup(username = 'owner') {
  const refresh = vi.fn()
  render(<PostDetail post={post} username={username} onBack={vi.fn()} onRefresh={refresh} requireUser={() => ({ username })} onDeleted={vi.fn()} />)
  return refresh
}

describe('edit post', () => {
  it('only shows edit for the author', () => {
    setup('other')
    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
  })
  it('prefills the form and discards changes on cancel', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    expect(screen.getByLabelText('게시글 제목')).toHaveValue(post.title)
    expect(screen.getByLabelText(/YouTube 영상 \(선택\)/)).toHaveValue('https://www.youtube.com/watch?v=M7lc1UVf-VE')
    fireEvent.change(screen.getByLabelText('게시글 제목'), { target: { value: '취소 내용' } })
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.getByRole('heading', { name: post.title })).toBeInTheDocument()
    expect(updatePost).not.toHaveBeenCalled()
  })
  it('saves edited fields and removes the video', async () => {
    vi.mocked(updatePost).mockResolvedValue({})
    const refresh = setup()
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    fireEvent.change(screen.getByLabelText('게시글 제목'), { target: { value: '새 제목' } })
    fireEvent.click(screen.getByRole('button', { name: 'YouTube 영상 제거' }))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(updatePost).toHaveBeenCalledWith(1, {
      title: '새 제목', body: post.body, postType: '자유', characters: [], youtubeVideoId: undefined,
    }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })
  it('retains entered values when saving fails', async () => {
    vi.mocked(updatePost).mockRejectedValue(new Error('수정 권한이 없습니다.'))
    setup()
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    fireEvent.change(screen.getByLabelText('게시글 제목'), { target: { value: '보존할 제목' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('수정 권한이 없습니다.'))
    expect(screen.getByLabelText('게시글 제목')).toHaveValue('보존할 제목')
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled()
  })
})

describe('signed out', () => {
  it('asks for a login instead of sending a thumb or a comment', async () => {
    const { thumbPost, createComment } = await import('@/community/communityApi')
    const requireUser = vi.fn().mockReturnValue(null)
    render(<PostDetail post={post} username={null} onBack={vi.fn()} onRefresh={vi.fn()} requireUser={requireUser} onDeleted={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '추천 0' }))
    fireEvent.change(screen.getByLabelText('댓글 입력'), { target: { value: '좋은 글' } })
    fireEvent.click(screen.getByRole('button', { name: '작성' }))

    expect(requireUser).toHaveBeenCalledWith('로그인하면 추천할 수 있습니다.')
    expect(requireUser).toHaveBeenCalledWith('로그인하면 댓글을 남길 수 있습니다.')
    expect(thumbPost).not.toHaveBeenCalled()
    expect(createComment).not.toHaveBeenCalled()
    // Nothing was sent, so nothing is left looking busy.
    expect(screen.getByRole('button', { name: '추천 0' })).toBeEnabled()
  })

  it('offers no edit or delete, whoever wrote the post', () => {
    render(<PostDetail post={post} username={null} onBack={vi.fn()} onRefresh={vi.fn()} requireUser={() => null} onDeleted={vi.fn()} />)

    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
  })
})
