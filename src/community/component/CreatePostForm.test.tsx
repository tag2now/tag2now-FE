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
    await waitFor(() => expect(submit).toHaveBeenCalledWith('공략', '콤보 설명', '자유', 'dQw4w9WgXcQ'))
  })

  it('blocks an invalid link and allows a text-only post after removing it', async () => {
    const submit = setup()
    fireEvent.change(screen.getByLabelText(/YouTube 영상 \(선택\)/), { target: { value: 'https://example.com/video' } })
    expect(screen.getByRole('alert')).toHaveTextContent('올바른 YouTube')
    expect(screen.getByRole('button', { name: '작성' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'YouTube 영상 제거' }))
    expect(screen.queryByTitle('첨부된 YouTube 영상 플레이어')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '작성' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith('공략', '콤보 설명', '자유', undefined))
  })
})
