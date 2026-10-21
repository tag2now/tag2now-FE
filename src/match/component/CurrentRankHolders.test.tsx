import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import CurrentRankHolders from '@/match/component/CurrentRankHolders'
import type { CurrentRankHolder, CurrentRankHolders as Holders, RoomUser } from '@/match/types'
import type { HoldersState } from '@/match/useCurrentRankHolders'
import type { LeaderboardEntry } from '@/shared/types'

const holder = (username: string, ...characters: string[]): CurrentRankHolder => ({
  username,
  saved_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  account_rank: 25,
  chars: characters.map((character, id) => ({ id, character })),
})

const loaded = (entries: CurrentRankHolder[], total = entries.length): HoldersState => ({
  kind: 'loaded',
  holders: { rank: 20, rank_name: 'Berserker', total, entries } satisfies Holders,
})

const roomUser = (np_id: string, online_name = np_id): RoomUser => ({ np_id, online_name, avatar_url: '' })

const lbEntry = (np_id: string, online_name: string, rank = 1): LeaderboardEntry => ({ np_id, online_name, rank })

function renderHolders(props: Partial<Parameters<typeof CurrentRankHolders>[0]> = {}) {
  const onRankChange = vi.fn()
  const onRetry = vi.fn()
  const onClose = vi.fn()
  render(
    <CurrentRankHolders
      rank={20}
      onRankChange={onRankChange}
      state={{ kind: 'idle' }}
      onRetry={onRetry}
      onClose={onClose}
      roomUsers={[]}
      {...props}
    />,
  )
  return { onRankChange, onRetry, onClose }
}

const rows = () => within(screen.getByRole('list')).getAllByRole('listitem')
const names = () => rows().map((row) => within(row).getByRole('button').textContent)

describe('CurrentRankHolders', () => {
  it('is a dialog that asks for a rank before anything is chosen', () => {
    renderHolders({ rank: null })
    expect(screen.getByRole('dialog', { name: '같은 계급 상대 찾기' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('계급을 선택하세요')
    expect(screen.getByRole('button', { name: '계급: 계급 선택' })).toBeInTheDocument()
  })

  it('offers ranks from 1st dan up and answers the code chosen', () => {
    const { onRankChange } = renderHolders({ rank: null })
    fireEvent.click(screen.getByRole('button', { name: '계급: 계급 선택' }))
    expect(screen.getByRole('button', { name: '1st kyu' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '1st dan' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Mentor' }))
    expect(onRankChange).toHaveBeenCalledWith(14)
  })

  // The point of the finder: someone in a room can be asked for a game right now.
  it('lists players in a room first, keeping the backend order within each half', () => {
    renderHolders({
      state: loaded([holder('a'), holder('b'), holder('c'), holder('d')]),
      roomUsers: [roomUser('d'), roomUser('b')],
    })
    expect(names()).toEqual(['b', 'd', 'a', 'c'])
    expect(rows().map((row) => within(row).queryByText('방에 있음') !== null)).toEqual([true, true, false, false])
  })

  it('leaves the signed-in player off their own list', () => {
    renderHolders({ state: loaded([holder('me'), holder('other')]), ownUsername: 'me' })
    expect(names()).toEqual(['other'])
  })

  // A save knows only the RPCN id.
  it('names a player from the score board, else from their room, else by id', () => {
    renderHolders({
      state: loaded([holder('ranked'), holder('roomed'), holder('unknown')]),
      leaderboardEntries: [lbEntry('ranked', '랭커')],
      roomUsers: [roomUser('roomed', '방주인')],
    })
    expect(names()).toEqual(['방주인', '랭커', 'unknown'])
  })

  it('bylines each name with the highest rank reached and the place on the current-rank board', () => {
    renderHolders({
      state: loaded([holder('placed'), holder('unplaced')]),
      currentRankEntries: [lbEntry('placed', 'placed', 7)],
    })
    const [placed, unplaced] = rows()
    expect(within(placed).getByRole('img', { name: 'Vanquisher' })).toBeInTheDocument()
    expect(placed).toHaveTextContent('#7')
    expect(unplaced).not.toHaveTextContent('#')
  })

  it('shows five characters and counts the rest', () => {
    renderHolders({ state: loaded([holder('a', 'Paul', 'Law', 'Lei', 'King', 'Jun', 'Lars', 'Bob')]) })
    expect(document.querySelectorAll('.holder-char')).toHaveLength(5)
    expect(screen.getByLabelText('캐릭터 2명 더')).toHaveTextContent('+2')
  })

  it('says how many it shows of how many were found', () => {
    renderHolders({ state: loaded([holder('a'), holder('b')], 242), roomUsers: [roomUser('a')] })
    expect(screen.getByText('2명 표시 · 전체 242명 · 방에 있음 1')).toBeInTheDocument()
  })

  it('names the rank when no one played it lately', () => {
    renderHolders({ state: loaded([]) })
    expect(screen.getByRole('status')).toHaveTextContent('최근 30일 동안 Berserker 캐릭터로 플레이한 유저가 없습니다')
  })

  it('offers a retry when the request fails', () => {
    const { onRetry } = renderHolders({ state: { kind: 'failed', message: 'down' } })
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('closes from its X', () => {
    const { onClose } = renderHolders()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
