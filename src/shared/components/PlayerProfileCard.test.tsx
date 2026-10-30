import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import PlayerProfileCard from '@/shared/components/PlayerProfileCard'

it('displays the supplied player without a session or router and delegates history opening', () => {
  const onOpenHistory = vi.fn()
  render(
    <PlayerProfileCard
      name="Player"
      rank={3}
      characters={[{ name: 'Jin', wins: 3, losses: 1 }]}
      online
      onOpenHistory={onOpenHistory}
    />,
  )

  expect(screen.getByText('Player')).toBeInTheDocument()
  expect(screen.getByText('#3')).toBeInTheDocument()
  expect(screen.getByText('온라인')).toBeInTheDocument()
  expect(screen.getByAltText('Jin')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '내 정보 보기' }))
  expect(onOpenHistory).toHaveBeenCalledOnce()
})

it('shows an unranked offline profile and disables history when no action is supplied', () => {
  render(<PlayerProfileCard name="Player" characters={[]} online={false} />)

  expect(screen.getByText('#UNRANKED')).toBeInTheDocument()
  expect(screen.getByText('오프라인')).toBeInTheDocument()
  expect(screen.queryByLabelText('캐릭터와 계급')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '내 정보 보기' })).toBeDisabled()
})
