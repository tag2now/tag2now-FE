import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CreatePostForm from './CreatePostForm'

function setup() {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(<CreatePostForm onSubmit={onSubmit} onCancel={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('게시글 제목'), { target: { value: '공략' } })
  fireEvent.change(screen.getByLabelText('게시글 내용'), { target: { value: '콤보 설명' } })
  return onSubmit
}

describe('video attachment', () => {
  it('previews a link and submits only the video ID', async () => {
    const submit = setup()
    fireEvent.change(screen.getByLabelText(/YouTube 영상 \(선택\)/), { target: { value: 'https://youtu.be/dQw4w9WgXcQ?si=tracking' } })
    expect(screen.getByTitle('첨부된 YouTube 영상 플레이어')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?playsinline=1')
    fireEvent.click(screen.getByRole('button', { name: '작성' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      title: '공략', body: '콤보 설명', postType: '자유', characters: [], youtubeVideoId: 'dQw4w9WgXcQ',
    }))
  })

  it('blocks an invalid link and allows a text-only post after removing it', async () => {
    const submit = setup()
    fireEvent.change(screen.getByLabelText(/YouTube 영상 \(선택\)/), { target: { value: 'https://example.com/video' } })
    expect(screen.getByRole('alert')).toHaveTextContent('올바른 YouTube')
    expect(screen.getByRole('button', { name: '작성' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'YouTube 영상 제거' }))
    expect(screen.queryByTitle('첨부된 YouTube 영상 플레이어')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '작성' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      title: '공략', body: '콤보 설명', postType: '자유', characters: [], youtubeVideoId: undefined,
    }))
  })
})

describe('character tags', () => {
  const pick = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

  // The category and the characters shared one field: choosing Jin used to
  // *replace* 공략, so no post could be both.
  it('keeps the category when characters are tagged', async () => {
    const submit = setup()
    pick('공략')
    pick('Jin')

    fireEvent.click(screen.getByRole('button', { name: /작성/ }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ postType: '공략', characters: ['Jin'] }),
    ))
  })

  it('carries two characters, which is what a tag team needs', async () => {
    const submit = setup()
    pick('Jin')
    pick('Kazuya')

    fireEvent.click(screen.getByRole('button', { name: /작성/ }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ characters: ['Jin', 'Kazuya'] }),
    ))
  })

  // The backend rejects a third, so the form stops before the request does.
  it('goes inert at two rather than swapping an earlier pick out', () => {
    setup()
    pick('Jin')
    pick('Kazuya')

    expect(screen.getByRole('button', { name: 'Lili' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Jin' })).toBeEnabled()
  })

  it('removes a character when its tile is pressed again', async () => {
    const submit = setup()
    pick('Jin')
    pick('Kazuya')
    pick('Jin')

    fireEvent.click(screen.getByRole('button', { name: /작성/ }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ characters: ['Kazuya'] }),
    ))
  })

  it('opens an edit with the characters the post already had', () => {
    render(<CreatePostForm
      initialPost={{ title: 't', body: 'b', post_type: '공략', characters: ['Jin', 'Kazuya'] }}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />)
    expect(screen.getByRole('button', { name: 'Jin' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Kazuya' })).toHaveAttribute('aria-pressed', 'true')
  })
})
