import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PostList from './PostList'
import type { PostSummary } from '@/community/types'

const post = (id: number, title: string, postType = '자유'): PostSummary => ({
  id, author: 'alice', title, body: '', post_type: postType, characters: [],
  thumbs_up: 0, thumbs_down: 0, created_at: new Date().toISOString(), comment_count: 0,
})

function renderList(notices: PostSummary[], onSelectPost = vi.fn()) {
  render(
    <PostList
      posts={[post(1, '일반 글')]}
      notices={notices}
      total={1}
      page={2}
      pageSize={20}
      loading={false}
      error={null}
      postType="공략"
      onPostTypeChange={vi.fn()}
      characters={[]}
      onCharactersChange={vi.fn()}
      onPageChange={vi.fn()}
      onSelectPost={onSelectPost}
      onRefresh={vi.fn()}
      onWrite={vi.fn()}
    />,
  )
  return onSelectPost
}

describe('pinned notices', () => {
  // Page 2 under a 공략 filter: a notice stays pinned whatever the list shows.
  it('pins every notice above the posts, past the first page and under a filter', () => {
    renderList([post(7, '점검 안내', '공지'), post(8, '규칙 안내', '공지')])

    const pinned = screen.getByRole('region', { name: '공지' })
    expect(within(pinned).getAllByRole('button').map((row) => row.textContent)).toEqual([
      expect.stringContaining('점검 안내'),
      expect.stringContaining('규칙 안내'),
    ])
    const firstPost = screen.getByRole('button', { name: /일반 글/ })
    expect(pinned.compareDocumentPosition(firstPost) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('opens a notice like any post', () => {
    const select = renderList([post(7, '점검 안내', '공지')])

    fireEvent.click(within(screen.getByRole('region', { name: '공지' })).getByRole('button'))

    expect(select).toHaveBeenCalledWith(7)
  })

  it('leaves no empty pinned block when there are no notices', () => {
    renderList([])

    expect(screen.queryByRole('region', { name: '공지' })).not.toBeInTheDocument()
  })
})
