import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PostDetail from './PostDetail'
import type { CommentOut, PostDetail as Post } from '@/community/types'
import { deleteComment, updatePost } from '@/community/communityApi'

vi.mock('@/community/communityApi', () => ({ updatePost: vi.fn(), createComment: vi.fn(), thumbPost: vi.fn(), deletePost: vi.fn(), deleteComment: vi.fn() }))
const post = { id: 1, author: 'owner', title: '원래 제목', body: '원래 본문', post_type: '자유', characters: [], youtube_video_id: 'M7lc1UVf-VE', thumbs_up: 0, thumbs_down: 0, created_at: '2026-09-11T00:00:00Z', comments: [] }
const notice = { ...post, author: 'root', post_type: '공지' }
const signedIn = (username: string, admin = false) => ({ username, online_name: username, avatar_url: '', admin })
function setup(user = signedIn('owner'), shown: Post = post) {
  const refresh = vi.fn()
  render(<PostDetail post={shown} user={user} onBack={vi.fn()} onRefresh={refresh} requireUser={() => user} onDeleted={vi.fn()} />)
  return refresh
}

describe('edit post', () => {
  it('only shows edit for the author', () => {
    setup(signedIn('other'))
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
    vi.mocked(updatePost).mockResolvedValue({ ...post, title: '새 제목', youtube_video_id: null, comment_count: 0 })
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

// A notice is every admin's to manage, not only its author's; anything else
// stays its author's, admin or not.
describe('who manages a post', () => {
  it('offers another admin edit and delete on a notice', () => {
    setup(signedIn('second', true), notice)

    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
  })

  it("offers an admin neither on a player's post", () => {
    setup(signedIn('second', true))

    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('offers a player neither on a notice', () => {
    setup(signedIn('alice'), notice)

    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })
})

const comment = (id: number, author: string, overrides: Partial<CommentOut> = {}): CommentOut => ({
  id, post_id: 1, parent_id: null, author, body: `${author}의 댓글`, created_at: '2026-09-11T00:00:00Z', replies: [], ...overrides,
})
const reply = comment(2, 'bob', { parent_id: 1 })
const thread = { ...post, comments: [comment(1, 'alice', { replies: [reply] }), comment(3, 'carol')] }

// Its author, or any admin: the board's moderators clear what breaks its rules.
describe('deleting a comment', () => {
  it('offers an admin delete on every comment, replies included', () => {
    setup(signedIn('root', true), thread)

    for (const author of ['alice', 'bob', 'carol']) {
      expect(screen.getByRole('button', { name: `${author}님의 댓글 삭제` })).toBeInTheDocument()
    }
  })

  it('offers a player delete on their own comment only', () => {
    setup(signedIn('bob'), thread)

    expect(screen.getAllByRole('button', { name: /님의 댓글 삭제$/ }).map((b) => b.getAttribute('aria-label')))
      .toEqual(['bob님의 댓글 삭제'])
  })

  it('offers no delete to a signed-out reader', () => {
    render(<PostDetail post={thread} user={null} onBack={vi.fn()} onRefresh={vi.fn()} requireUser={() => null} onDeleted={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /댓글 삭제/ })).not.toBeInTheDocument()
  })

  it('deletes after the confirmation and reloads the post', async () => {
    vi.mocked(deleteComment).mockResolvedValue(undefined)
    const refresh = setup(signedIn('root', true), thread)

    fireEvent.click(screen.getByRole('button', { name: 'carol님의 댓글 삭제' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deleteComment).toHaveBeenCalledWith(1, 3))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('warns that the replies stay when the comment has some', () => {
    setup(signedIn('alice'), thread)

    fireEvent.click(screen.getByRole('button', { name: 'alice님의 댓글 삭제' }))

    expect(screen.getByRole('alertdialog')).toHaveTextContent('답글은 남고')
  })

  it('sends nothing when the confirmation is cancelled', () => {
    vi.mocked(deleteComment).mockClear()
    setup(signedIn('carol'), thread)

    fireEvent.click(screen.getByRole('button', { name: 'carol님의 댓글 삭제' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }))

    expect(deleteComment).not.toHaveBeenCalled()
  })

  it('shows a deleted comment as a placeholder above its replies, with nothing to press', () => {
    const tombstoned = { ...post, comments: [comment(1, 'alice', { body: '', deleted: true, replies: [reply] })] }
    setup(signedIn('root', true), tombstoned)

    expect(screen.getByText('삭제된 댓글입니다.')).toBeInTheDocument()
    expect(screen.getByText('bob의 댓글')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'alice님의 댓글 삭제' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /답글/ })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: '댓글 (0)' })).toBeInTheDocument()
  })
})

describe('signed out', () => {
  it('asks for a login instead of sending a thumb or a comment', async () => {
    const { thumbPost, createComment } = await import('@/community/communityApi')
    const requireUser = vi.fn().mockReturnValue(null)
    render(<PostDetail post={post} user={null} onBack={vi.fn()} onRefresh={vi.fn()} requireUser={requireUser} onDeleted={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '추천 0' }))
    fireEvent.change(screen.getByLabelText('댓글 입력'), { target: { value: '좋은 글' } })
    fireEvent.click(screen.getByRole('button', { name: '작성' }))

    expect(requireUser).toHaveBeenCalledWith('로그인하면 추천할 수 있습니다.', expect.any(Function))
    expect(requireUser).toHaveBeenCalledWith('로그인하면 댓글을 남길 수 있습니다.', expect.any(Function))
    expect(thumbPost).not.toHaveBeenCalled()
    expect(createComment).not.toHaveBeenCalled()
    // Nothing was sent, so nothing is left looking busy.
    expect(screen.getByRole('button', { name: '추천 0' })).toBeEnabled()
  })

  it('offers no edit or delete, whoever wrote the post', () => {
    render(<PostDetail post={post} user={null} onBack={vi.fn()} onRefresh={vi.fn()} requireUser={() => null} onDeleted={vi.fn()} />)

    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
  })
})
