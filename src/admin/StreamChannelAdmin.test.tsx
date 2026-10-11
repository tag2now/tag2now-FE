import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StreamChannelAdmin from './StreamChannelAdmin'
import { listChannels, removeChannel } from '@/streaming/streamingApi'
import type { AdminStreamChannel } from '@/streaming/types'

vi.mock('@/streaming/streamingApi', () => ({
  listChannels: vi.fn(),
  removeChannel: vi.fn(),
}))

const alice: AdminStreamChannel = {
  username: 'Alice', platform: 'chzzk', channel_id: 'a'.repeat(32), channel_name: '앨리스 채널',
  channel_url: 'https://chzzk.naver.com/live/' + 'a'.repeat(32), registered_at: '2026-10-11T00:00:00Z',
}

describe('StreamChannelAdmin', () => {
  afterEach(() => vi.clearAllMocks())

  it('says so when no channel is connected', async () => {
    vi.mocked(listChannels).mockResolvedValue([])
    render(<StreamChannelAdmin />)

    expect(await screen.findByText('연결된 채널이 없습니다.')).toBeInTheDocument()
  })

  it('removes a channel after confirming, then reloads the list', async () => {
    vi.mocked(listChannels).mockResolvedValueOnce([alice]).mockResolvedValueOnce([])
    vi.mocked(removeChannel).mockResolvedValue(undefined)
    render(<StreamChannelAdmin />)

    const list = within(await screen.findByRole('list', { name: '연결된 방송 채널' }))
    expect(list.getByRole('link', { name: '앨리스 채널' })).toHaveAttribute('href', alice.channel_url)
    fireEvent.click(list.getByRole('button', { name: 'Alice의 채널 연결 삭제' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '삭제' }))

    expect(await screen.findByText('연결된 채널이 없습니다.')).toBeInTheDocument()
    expect(removeChannel).toHaveBeenCalledWith('Alice')
  })

  it('removes nothing when the confirmation is cancelled', async () => {
    vi.mocked(listChannels).mockResolvedValue([alice])
    render(<StreamChannelAdmin />)

    fireEvent.click(await screen.findByRole('button', { name: 'Alice의 채널 연결 삭제' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(removeChannel).not.toHaveBeenCalled()
  })
})
