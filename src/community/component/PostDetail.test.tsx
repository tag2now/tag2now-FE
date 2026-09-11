import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PostDetail from './PostDetail'
import { updatePost } from '@/community/communityApi'

vi.mock('@/community/communityApi', () => ({ updatePost: vi.fn(), createComment: vi.fn(), thumbPost: vi.fn(), deletePost: vi.fn() }))
const post = { id: 1, author: 'owner', title: '원래 제목', body: '원래 본문', post_type: '자유', youtube_video_id: 'M7lc1UVf-VE', thumbs_up: 0, thumbs_down: 0, created_at: '2026-09-11T00:00:00Z', comments: [] }
function setup(username = 'owner') {
  const refresh = vi.fn()
  render(<PostDetail post={post} username={username} onBack={vi.fn()} onRefresh={refresh} ensureIdentity={vi.fn().mockResolvedValue(username)} onDeleted={vi.fn()} />)
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
    await waitFor(() => expect(updatePost).toHaveBeenCalledWith(1, '새 제목', post.body, '자유', undefined))
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
