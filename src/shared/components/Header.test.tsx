import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PlayerProfileCard from './PlayerProfileCard'
import { dismissLoginRequest, endSession, getLoginRequest, getSession, startSession } from '@/auth/session'
import type { LeaderboardEntry } from '@/shared/types'

function renderProfile(leaderboardEntries: LeaderboardEntry[] = [], roomUsers: Parameters<typeof PlayerProfileCard>[0]['roomUsers'] = []) {
  return render(<PlayerProfileCard leaderboardEntries={leaderboardEntries} roomUsers={roomUsers} />, { wrapper: MemoryRouter })
}

/** RPCN usernames are the leaderboard's np_id; the online name is what shows. */
const signInAs = (username = 'p1', onlineName = 'TestPlayer') =>
  startSession('token', 3600, { username, online_name: onlineName, avatar_url: '', admin: false })

function mountHeaderSlot() {
  const headerTarget = document.createElement('div')
  headerTarget.id = 'headerProfileSlot'
  document.body.append(headerTarget)
  return within(headerTarget)
}

const ranked: LeaderboardEntry = {
  np_id: 'p1',
  rank: 1,
  // Deliberately not the signed-in online name: the record is found by id.
  online_name: 'SomeoneElsesName',
  player_info: {
    main_char_info: { name: 'Jin', rank_info: { name: 'Destroyer', tier: 'Destroyer' }, wins: 250, losses: 80 },
    sub_char_info: { name: 'Heihachi', rank_info: { name: 'Vanquisher', tier: 'Vanquisher' }, wins: 180, losses: 60 },
  },
}

describe('Player profile', () => {
  afterEach(() => {
    endSession()
    dismissLoginRequest()
    document.getElementById('headerProfileSlot')?.remove()
  })

  it('offers a login, and opens the dialog from it, while signed out', () => {
    renderProfile()

    fireEvent.click(screen.getByRole('button', { name: 'RPCN 로그인' }))

    expect(getLoginRequest()).toEqual({ reason: null })
  })

  it('shows the signed-in online name', () => {
    signInAs()
    renderProfile()

    expect(screen.getByText('TestPlayer')).toBeInTheDocument()
    expect(screen.getByText('#UNRANKED')).toBeInTheDocument()
  })

  it('finds the leaderboard record by account id, not by name', () => {
    signInAs()
    renderProfile([ranked, { ...ranked, np_id: 'p2', rank: 2, online_name: 'TestPlayer', player_info: null }])

    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내 정보 보기' })).toBeEnabled()
  })

  it('shows both character portraits and ranks without visible role or character-name text', () => {
    signInAs()
    renderProfile([ranked])

    expect(screen.getByAltText('Jin')).toBeInTheDocument()
    expect(screen.getByAltText('Heihachi')).toBeInTheDocument()
    expect(screen.getByAltText('Destroyer')).toBeInTheDocument()
    expect(screen.getByAltText('Vanquisher')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.queryByText('MAIN')).not.toBeInTheDocument()
    expect(screen.queryByText('Jin')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.char-cell--compact')).toHaveLength(2)
    const records = document.querySelectorAll('.char-cell--compact .char-cell-record')
    expect(records).toHaveLength(2)
    // Rate first, raw record behind it --- the same emphasis the leaderboard
    // gives the same figure.
    expect(records[0]).toHaveTextContent('76%250W 80L')
    expect(records[1]).toHaveTextContent('75%180W 60L')
  })

  it('reports presence by account id', () => {
    signInAs()
    renderProfile([], [{ np_id: 'p1', online_name: 'whatever' } as never])

    expect(screen.getByText('온라인')).toBeInTheDocument()
  })

  it('signs out from the sidebar', () => {
    signInAs()
    renderProfile()

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(getSession()).toBeNull()
    expect(screen.getByRole('button', { name: 'RPCN 로그인' })).toBeInTheDocument()
  })

  it('follows a login that happens after it rendered', () => {
    renderProfile()

    act(() => { signInAs() })

    expect(screen.getByText('TestPlayer')).toBeInTheDocument()
  })

  it('carries the same account into the header slot, with its own sign-out', () => {
    signInAs()
    const header = mountHeaderSlot()
    renderProfile()

    fireEvent.click(header.getByRole('button', { name: 'TestPlayer 로그아웃' }))

    expect(getSession()).toBeNull()
    expect(header.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  // Phones hide the sidebar card and its 내 정보 보기, so the header carries a
  // way in of its own (CSS shows it only there). It follows the sidebar's rule:
  // there is a record to open only for an account the leaderboard knows.
  it('offers 내 정보 in the header, open only for a ranked account', () => {
    signInAs()
    const header = mountHeaderSlot()
    const { rerender } = renderProfile()

    expect(header.getByRole('button', { name: '내 정보' })).toBeDisabled()

    rerender(<PlayerProfileCard leaderboardEntries={[{ np_id: 'p1', rank: 1, online_name: 'TestPlayer', player_info: null }]} />)
    expect(header.getByRole('button', { name: '내 정보' })).toBeEnabled()
  })
})
