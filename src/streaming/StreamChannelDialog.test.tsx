import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StreamChannelDialog from '@/streaming/StreamChannelDialog'
import { getMyChannel, registerChannel, unregisterChannel } from '@/streaming/streamingApi'
import type { StreamChannel } from '@/streaming/types'
import { AppError } from '@/shared/util/AppError'

vi.mock('@/streaming/streamingApi', () => ({
  getMyChannel: vi.fn(),
  registerChannel: vi.fn(),
  unregisterChannel: vi.fn(),
}))

const CHANNEL_ID = 'a'.repeat(32)
const channel: StreamChannel = {
  platform: 'chzzk', channel_id: CHANNEL_ID, channel_name: '앨리스 채널',
  channel_url: `https://chzzk.naver.com/live/${CHANNEL_ID}`, registered_at: '2026-10-11T00:00:00Z',
}

const address = () => screen.getByLabelText(/치지직 채널 주소|다른 채널로 바꾸기/)

describe('StreamChannelDialog', () => {
  afterEach(() => vi.clearAllMocks())

  it('connects a pasted address and then shows the channel', async () => {
    vi.mocked(getMyChannel).mockResolvedValue(null)
    vi.mocked(registerChannel).mockResolvedValue(channel)
    render(<StreamChannelDialog onClose={() => {}} />)
    await waitFor(() => expect(screen.queryByText('불러오는 중')).not.toBeInTheDocument())

    fireEvent.change(address(), { target: { value: `  https://chzzk.naver.com/${CHANNEL_ID}  ` } })
    fireEvent.click(screen.getByRole('button', { name: '연결' }))

    expect(await screen.findByRole('link', { name: '앨리스 채널' })).toHaveAttribute('href', channel.channel_url)
    expect(registerChannel).toHaveBeenCalledWith(`https://chzzk.naver.com/${CHANNEL_ID}`)
    expect(screen.getByRole('button', { name: '바꾸기' })).toBeInTheDocument()
  })

  it("shows the server's reason when the address is refused", async () => {
    vi.mocked(getMyChannel).mockResolvedValue(null)
    vi.mocked(registerChannel).mockRejectedValue(new AppError('치지직에서 찾을 수 없는 채널입니다.', 400))
    render(<StreamChannelDialog onClose={() => {}} />)

    fireEvent.change(address(), { target: { value: CHANNEL_ID } })
    fireEvent.click(screen.getByRole('button', { name: '연결' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('치지직에서 찾을 수 없는 채널입니다.')
  })

  it('asks for an address instead of sending an empty one', async () => {
    vi.mocked(getMyChannel).mockResolvedValue(null)
    render(<StreamChannelDialog onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: '연결' }))

    expect(screen.getByRole('alert')).toHaveTextContent('치지직 채널 주소를 입력해 주세요.')
    expect(document.activeElement).toBe(address())
    expect(registerChannel).not.toHaveBeenCalled()
  })

  it('disconnects the current channel', async () => {
    vi.mocked(getMyChannel).mockResolvedValue(channel)
    vi.mocked(unregisterChannel).mockResolvedValue(undefined)
    render(<StreamChannelDialog onClose={() => {}} />)

    fireEvent.click(await screen.findByRole('button', { name: '연결 해제' }))

    await waitFor(() => expect(screen.queryByRole('link', { name: '앨리스 채널' })).not.toBeInTheDocument())
    expect(unregisterChannel).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '연결' })).toBeInTheDocument()
  })

  it('closes from its button', async () => {
    vi.mocked(getMyChannel).mockResolvedValue(null)
    const onClose = vi.fn()
    render(<StreamChannelDialog onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
