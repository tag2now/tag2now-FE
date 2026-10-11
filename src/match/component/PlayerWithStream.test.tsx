import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PlayerWithStream from '@/match/component/PlayerWithStream'
import type { RoomUser } from '@/match/types'

const alice: RoomUser = { np_id: 'alice', online_name: 'Alice', avatar_url: '' }
const live = {
  platform: 'chzzk', channel_name: '앨리스 채널', url: 'https://chzzk.naver.com/live/' + 'a'.repeat(32),
  title: 'TTT2 랭크전', viewer_count: 1234,
}

describe('PlayerWithStream', () => {
  it('is just the name when the player is not live', () => {
    render(<PlayerWithStream user={{ ...alice, stream: null }} onSelect={() => {}} />)

    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links a live player to their broadcast in a new tab, before the name', () => {
    const onSelect = vi.fn()
    render(<PlayerWithStream user={{ ...alice, stream: live }} onSelect={onSelect} />)

    const badge = screen.getByRole('link', { name: 'Alice 치지직 방송 보기: TTT2 랭크전 (새 창)' })
    expect(badge).toHaveAttribute('href', live.url)
    expect(badge).toHaveAttribute('target', '_blank')
    expect(badge).toHaveAttribute('rel', 'noopener noreferrer')
    expect(badge).toHaveAttribute('title', 'TTT2 랭크전 · 시청자 1,234명')
    expect(badge).toHaveTextContent('LIVE')

    // The name still opens the record; the badge is not inside it, and comes first.
    const name = screen.getByRole('button', { name: 'Alice' })
    expect(name).not.toContainElement(badge)
    expect(badge.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(name)
    expect(onSelect).toHaveBeenCalledWith('alice')
  })
})
