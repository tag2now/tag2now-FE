import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import PlayerProfileCard from './PlayerProfileCard'
import { dismissLoginRequest, endSession, getLoginRequest, getSession, startSession } from '@/auth/session'
import type { LeaderboardEntry } from '@/shared/types'

function renderProfile(leaderboardEntries: LeaderboardEntry[] = [], roomUsers: Parameters<typeof PlayerProfileCard>[0]['roomUsers'] = []) {
  return render(<PlayerProfileCard leaderboardEntries={leaderboardEntries} roomUsers={roomUsers} />, { wrapper: MemoryRouter })
}

/** RPCN usernames are the leaderboard's np_id; the online name is what shows. */
const signInAs = (username = 'p1', onlineName = 'TestPlayer', admin = false) =>
  startSession('token', 3600, { username, online_name: onlineName, avatar_url: '', admin })

function CurrentPath() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

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

  it('offers a login in the header, and opens the dialog from it, while signed out', () => {
    const header = mountHeaderSlot()
    renderProfile()

    fireEvent.click(header.getByRole('button', { name: '로그인' }))

    expect(getLoginRequest()).toEqual({ reason: null })
  })

  // The card is the profile, and there is no profile to show for nobody.
  it('renders no sidebar card while signed out', () => {
    renderProfile()

    expect(screen.queryByRole('region', { name: '내 파이터 정보' })).not.toBeInTheDocument()
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

  // Signing out is the header's, at every width; the card only shows who.
  it('leaves signing out to the header', () => {
    signInAs()
    renderProfile()

    const card = within(screen.getByRole('region', { name: '내 파이터 정보' }))
    expect(card.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument()
  })

  it('stays signed in when the sign-out is cancelled', async () => {
    signInAs()
    const header = mountHeaderSlot()
    renderProfile()

    fireEvent.click(header.getByRole('button', { name: 'TestPlayer 계정 메뉴' }))
    fireEvent.click(header.getByRole('menuitem', { name: '로그아웃' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(getSession()).not.toBeNull()
  })

  it('follows a login that happens after it rendered', () => {
    renderProfile()

    act(() => { signInAs() })

    expect(screen.getByText('TestPlayer')).toBeInTheDocument()
  })

  // Tapping your own name used to sign you out on the spot. It opens a menu
  // now, and signing out from it still asks first.
  it('opens an account menu from the header name instead of signing out', async () => {
    signInAs()
    const header = mountHeaderSlot()
    renderProfile()

    fireEvent.click(header.getByRole('button', { name: 'TestPlayer 계정 메뉴' }))
    expect(getSession()).not.toBeNull()

    fireEvent.click(header.getByRole('menuitem', { name: '로그아웃' }))
    expect(header.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '로그아웃' }))

    await waitFor(() => expect(getSession()).toBeNull())
    expect(header.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('takes an admin to the account-management page from the menu', () => {
    signInAs('p1', 'TestPlayer', true)
    const header = mountHeaderSlot()
    render(
      <MemoryRouter>
        <PlayerProfileCard />
        <Routes><Route path="*" element={<CurrentPath />} /></Routes>
      </MemoryRouter>,
    )

    fireEvent.click(header.getByRole('button', { name: 'TestPlayer 계정 메뉴' }))
    fireEvent.click(header.getByRole('menuitem', { name: '계정 관리' }))

    expect(screen.getByTestId('path')).toHaveTextContent('/admin')
    expect(header.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('offers account management to admins only', () => {
    signInAs()
    const header = mountHeaderSlot()
    renderProfile()

    fireEvent.click(header.getByRole('button', { name: 'TestPlayer 계정 메뉴' }))

    expect(header.queryByRole('menuitem', { name: '계정 관리' })).not.toBeInTheDocument()
  })

  it('closes the account menu on Escape', () => {
    signInAs()
    const header = mountHeaderSlot()
    renderProfile()

    fireEvent.click(header.getByRole('button', { name: 'TestPlayer 계정 메뉴' }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(header.queryByRole('menu')).not.toBeInTheDocument()
    expect(header.getByRole('button', { name: 'TestPlayer 계정 메뉴' })).toHaveFocus()
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
