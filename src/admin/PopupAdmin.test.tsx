import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PopupAdmin from './PopupAdmin'
import { createPopup, deletePopup, listPopups, updatePopup } from '@/popup/popupApi'
import type { AdminPopup } from '@/popup/types'
import { AppError } from '@/shared/util/AppError'

vi.mock('@/popup/popupApi', () => ({
  listPopups: vi.fn(),
  createPopup: vi.fn(),
  updatePopup: vi.fn(),
  deletePopup: vi.fn(),
}))

const stored: AdminPopup = {
  id: 7, title: '이벤트 안내', body: '본문', image_path: 'popups/7/image?v=abc',
  allow_dismiss_forever: false, allow_dismiss_day: true, active: true,
  created_by: 'root', created_at: '2026-10-30T00:00:00Z', updated_at: '2026-10-31T00:00:00Z',
}

const file = (size: number) => new File([new Uint8Array(size)], 'photo.png', { type: 'image/png' })
const fileInput = () => screen.getByLabelText(/^이미지/) as HTMLInputElement

describe('PopupAdmin', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.clearAllMocks())

  it('says so when no popup exists', async () => {
    vi.mocked(listPopups).mockResolvedValue([])
    render(<PopupAdmin />)

    expect(await screen.findByText('만든 팝업이 없습니다.')).toBeInTheDocument()
  })

  it('lists what each popup is set to', async () => {
    vi.mocked(listPopups).mockResolvedValue([{ ...stored, active: false }])
    render(<PopupAdmin />)

    const list = within(await screen.findByRole('list', { name: '만든 팝업' }))
    expect(list.getByText('이벤트 안내')).toBeInTheDocument()
    expect(list.getByText(/비활성 · 이미지 있음 · root/)).toBeInTheDocument()
  })

  it('creates a popup with its image and dismiss buttons, then empties the form', async () => {
    vi.mocked(listPopups).mockResolvedValueOnce([]).mockResolvedValue([stored])
    vi.mocked(createPopup).mockResolvedValue(stored)
    render(<PopupAdmin />)
    await screen.findByText('만든 팝업이 없습니다.')

    const image = file(10)
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 소식' } })
    fireEvent.change(screen.getByLabelText(/^내용/), { target: { value: '본문입니다' } })
    fireEvent.change(fileInput(), { target: { files: [image] } })
    fireEvent.click(screen.getByLabelText('다시 보지 않기 버튼'))
    expect(screen.getByRole('img', { name: '팝업 이미지 미리보기' })).toHaveAttribute('src', 'blob:preview')
    fireEvent.click(screen.getByRole('button', { name: '팝업 만들기' }))

    await screen.findByRole('list', { name: '만든 팝업' })
    expect(createPopup).toHaveBeenCalledWith({
      title: '새 소식', body: '본문입니다', allow_dismiss_forever: false, allow_dismiss_day: true,
      active: true, image, remove_image: false,
    })
    expect(screen.getByLabelText('제목')).toHaveValue('')
  })

  it('asks for a title before sending anything', async () => {
    vi.mocked(listPopups).mockResolvedValue([])
    render(<PopupAdmin />)
    await screen.findByText('만든 팝업이 없습니다.')

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '팝업 만들기' }))

    expect(createPopup).not.toHaveBeenCalled()
    expect(screen.getByLabelText('제목')).toHaveFocus()
  })

  it('refuses an image over the limit without sending it', async () => {
    vi.mocked(listPopups).mockResolvedValue([])
    render(<PopupAdmin />)
    await screen.findByText('만든 팝업이 없습니다.')

    fireEvent.change(fileInput(), { target: { files: [file(5 * 1024 * 1024 + 1)] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('이미지는 5MB를 넘을 수 없습니다.')
    expect(screen.queryByRole('img', { name: '팝업 이미지 미리보기' })).not.toBeInTheDocument()
  })

  it('edits a popup, showing and keeping its stored image', async () => {
    vi.mocked(listPopups).mockResolvedValue([stored])
    vi.mocked(updatePopup).mockResolvedValue(stored)
    render(<PopupAdmin />)

    fireEvent.click(await screen.findByRole('button', { name: '이벤트 안내 팝업 수정' }))

    expect(screen.getByLabelText('제목')).toHaveValue('이벤트 안내')
    expect(screen.getByLabelText('다시 보지 않기 버튼')).not.toBeChecked()
    expect(screen.getByRole('img', { name: '팝업 이미지 미리보기' })).toHaveAttribute('src', '/api/popups/7/image?v=abc')

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '고친 제목' } })
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(updatePopup).toHaveBeenCalledWith(7, expect.objectContaining({
      title: '고친 제목', image: null, remove_image: false,
    })))
    expect(await screen.findByRole('button', { name: '팝업 만들기' })).toBeInTheDocument()
  })

  it('removes a stored image when asked', async () => {
    vi.mocked(listPopups).mockResolvedValue([stored])
    vi.mocked(updatePopup).mockResolvedValue(stored)
    render(<PopupAdmin />)

    fireEvent.click(await screen.findByRole('button', { name: '이벤트 안내 팝업 수정' }))
    fireEvent.click(screen.getByLabelText('저장된 이미지 삭제'))

    expect(screen.queryByRole('img', { name: '팝업 이미지 미리보기' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(updatePopup).toHaveBeenCalledWith(7, expect.objectContaining({ remove_image: true })))
  })

  it('leaves the edit without saving', async () => {
    vi.mocked(listPopups).mockResolvedValue([stored])
    render(<PopupAdmin />)

    fireEvent.click(await screen.findByRole('button', { name: '이벤트 안내 팝업 수정' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.getByLabelText('제목')).toHaveValue('')
    expect(updatePopup).not.toHaveBeenCalled()
  })

  it('deletes after confirming, then reloads the list', async () => {
    vi.mocked(listPopups).mockResolvedValueOnce([stored]).mockResolvedValueOnce([])
    vi.mocked(deletePopup).mockResolvedValue(undefined)
    render(<PopupAdmin />)

    fireEvent.click(await screen.findByRole('button', { name: '이벤트 안내 팝업 삭제' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '삭제' }))

    expect(await screen.findByText('만든 팝업이 없습니다.')).toBeInTheDocument()
    expect(deletePopup).toHaveBeenCalledWith(7)
  })

  it("keeps the form and reports the server's sentence when a save fails", async () => {
    vi.mocked(listPopups).mockResolvedValue([])
    vi.mocked(createPopup).mockRejectedValue(new AppError('PNG, JPEG, WebP, GIF 이미지만 올릴 수 있습니다.', 400, true))
    render(<PopupAdmin />)
    await screen.findByText('만든 팝업이 없습니다.')

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 소식' } })
    fireEvent.click(screen.getByRole('button', { name: '팝업 만들기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('PNG, JPEG, WebP, GIF 이미지만 올릴 수 있습니다.')
    expect(screen.getByLabelText('제목')).toHaveValue('새 소식')
  })
})
