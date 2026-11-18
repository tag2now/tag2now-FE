import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SitePopups from '@/popup/SitePopups'
import { getActivePopups } from '@/popup/popupApi'
import type { Popup } from '@/popup/types'

vi.mock('@/popup/popupApi', () => ({ getActivePopups: vi.fn() }))

const popup = (overrides: Partial<Popup> = {}): Popup => ({
  id: 1,
  title: '이벤트 안내',
  body: '첫 줄\n둘째 줄',
  image_path: null,
  allow_dismiss_forever: true,
  allow_dismiss_day: true,
  ...overrides,
})

const show = (...popups: Popup[]) => {
  vi.mocked(getActivePopups).mockResolvedValue(popups)
  return render(<SitePopups />)
}

const waitOutCloseLock = () => act(() => { vi.advanceTimersByTime(4000) })

describe('SitePopups', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('opens with the title and the body as written', async () => {
    show(popup())

    expect(await screen.findByRole('dialog', { name: '이벤트 안내' })).toBeInTheDocument()
    expect(screen.getByText(/첫 줄/)).toHaveClass('whitespace-pre-wrap')
  })

  it('shows the image from the API, named by the title', async () => {
    show(popup({ image_path: 'popups/1/image?v=abc' }))

    expect(await screen.findByRole('img', { name: '이벤트 안내' })).toHaveAttribute('src', '/api/popups/1/image?v=abc')
  })

  it('shows nothing when no popup is active', async () => {
    show()

    await waitFor(() => expect(getActivePopups).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows nothing when the list cannot be read', async () => {
    vi.mocked(getActivePopups).mockRejectedValue(new Error('down'))
    render(<SitePopups />)

    await waitFor(() => expect(getActivePopups).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    [{ allow_dismiss_forever: true, allow_dismiss_day: true }, ['하루 동안 보지 않기', '다시 보지 않기']],
    [{ allow_dismiss_forever: false, allow_dismiss_day: true }, ['하루 동안 보지 않기']],
    [{ allow_dismiss_forever: true, allow_dismiss_day: false }, ['다시 보지 않기']],
    [{ allow_dismiss_forever: false, allow_dismiss_day: false }, []],
  ])('offers only the buttons the admin turned on: %j', async (flags, labels) => {
    show(popup(flags))

    await screen.findByRole('dialog')
    expect(screen.queryAllByRole('button', { name: /보지 않기/ }).map((button) => button.textContent)).toEqual(labels)
  })

  it('keeps every way out shut for the first 4 seconds, counting down', async () => {
    show(popup())
    const dialog = await screen.findByRole('dialog')
    const close = screen.getByRole('button', { name: 'Close' })

    expect(close).toHaveTextContent('4')
    expect(close).toBeDisabled()
    expect(screen.getByRole('button', { name: '다시 보지 않기' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(dialog.parentElement!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(3000) })
    expect(close).toHaveTextContent('1')
    expect(close).toBeDisabled()

    act(() => { vi.advanceTimersByTime(1000) })
    expect(close).toBeEnabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['하루 동안 보지 않기', '다시 보지 않기'])('stays shut on the next load after %s', async (label) => {
    const { unmount } = show(popup())
    const button = await screen.findByRole('button', { name: label })
    waitOutCloseLock()
    fireEvent.click(button)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()

    show(popup())

    await waitFor(() => expect(getActivePopups).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('comes back on the next load when only closed', async () => {
    const { unmount } = show(popup())
    const close = await screen.findByRole('button', { name: 'Close' })
    waitOutCloseLock()
    fireEvent.click(close)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()

    show(popup())

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('shows several one at a time, in the order they came', async () => {
    show(popup({ id: 2, title: '둘째' }), popup({ id: 1, title: '첫째' }))

    expect(await screen.findByRole('dialog', { name: '둘째' })).toBeInTheDocument()
    waitOutCloseLock()
    fireEvent.click(screen.getByRole('button', { name: '다시 보지 않기' }))

    expect(screen.getByRole('dialog', { name: '첫째' })).toBeInTheDocument()
    waitOutCloseLock()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
