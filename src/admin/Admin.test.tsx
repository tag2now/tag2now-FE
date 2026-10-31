import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Admin from './Admin'
import { banAccount, lookupAccount } from './adminApi'
import type { AccountStatus } from './types'
import { dismissLoginRequest, endSession, getLoginRequest, startSession } from '@/auth/session'
import { AppError } from '@/shared/util/AppError'

vi.mock('./adminApi', () => ({
  lookupAccount: vi.fn(),
  banAccount: vi.fn(),
}))

// The stream section loads on mount; its own tests cover it.
vi.mock('@/streaming/streamingApi', () => ({
  listChannels: vi.fn().mockResolvedValue([]),
  removeChannel: vi.fn(),
}))

// As does the popup section.
vi.mock('@/popup/popupApi', () => ({
  listPopups: vi.fn().mockResolvedValue([]),
}))

const signIn = (admin: boolean, username = 'root') =>
  startSession('token', 3600, { username, online_name: '운영자', avatar_url: '', admin })

const alice: AccountStatus = {
  username: 'Alice',
  online_name: '앨리스',
  avatar_url: '',
  admin: false,
  banned: false,
  online: true,
  created_at: '2023-11-14T22:13:20Z',
  last_login_at: null,
}

function Path() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

function renderAdmin(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Path />
      <Routes>
        <Route path="/admin/:section?" element={<Admin />} />
      </Routes>
    </MemoryRouter>,
  )
}

function lookUp(username = 'Alice', password = 'pw') {
  fireEvent.change(screen.getByLabelText('대상 RPCN 아이디'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('내 비밀번호 (확인용)'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: '조회' }))
}

const account = () => within(screen.getByRole('region', { name: '조회한 계정' }))

describe('Admin page', () => {
  beforeEach(() => {
    vi.mocked(lookupAccount).mockResolvedValue(alice)
    vi.mocked(banAccount).mockResolvedValue({ username: 'Alice', banned: true, kicked: true })
  })

  afterEach(() => {
    // Unmount first: RTL's own cleanup runs after this hook, and ending the
    // session would re-render the mounted tree outside act.
    cleanup()
    endSession()
    dismissLoginRequest()
    vi.clearAllMocks()
  })

  it('asks a signed-out visitor to log in, and offers the login', () => {
    renderAdmin()

    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(getLoginRequest()).toEqual({ reason: '관리자 계정으로 로그인하세요.' })
    expect(screen.queryByLabelText('대상 RPCN 아이디')).not.toBeInTheDocument()
  })

  it('asks for the admin password, and puts the cursor in it, instead of looking up without it', async () => {
    signIn(true)
    renderAdmin()
    // The stream section loads on mount; let it land before the test ends.
    await screen.findByText('연결된 채널이 없습니다.')
    fireEvent.change(screen.getByLabelText('대상 RPCN 아이디'), { target: { value: 'Alice' } })

    // pressing the button and pressing Enter in the field both submit the form
    fireEvent.click(screen.getByRole('button', { name: '조회' }))
    fireEvent.submit(screen.getByLabelText('대상 RPCN 아이디').closest('form')!)

    expect(lookupAccount).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByLabelText('내 비밀번호 (확인용)'))
  })

  it('shows a signed-in non-admin no form', () => {
    signIn(false)
    renderAdmin()

    expect(screen.getByText('관리자 권한이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByLabelText('대상 RPCN 아이디')).not.toBeInTheDocument()
  })

  it('looks an account up with the admin password and shows its standing', async () => {
    signIn(true)
    renderAdmin()

    lookUp(' Alice ', 'secret')

    await waitFor(() => expect(account().getByText('앨리스')).toBeInTheDocument())
    expect(lookupAccount).toHaveBeenCalledWith('Alice', 'secret')
    expect(account().getByText('정상')).toBeInTheDocument()
    expect(account().getByText('접속 중')).toBeInTheDocument()
    expect(account().getByText('기록 없음')).toBeInTheDocument()
  })

  it('bans the looked-up account after confirmation, with the same password', async () => {
    signIn(true)
    renderAdmin()
    lookUp('Alice', 'secret')
    await waitFor(() => expect(account().getByRole('button', { name: '밴' })).toBeEnabled())

    // Editing the field afterwards must not change whom the ban hits.
    fireEvent.change(screen.getByLabelText('대상 RPCN 아이디'), { target: { value: 'Bob' } })
    fireEvent.click(account().getByRole('button', { name: '밴' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '밴' }))

    await waitFor(() => expect(account().getByText('밴됨')).toBeInTheDocument())
    expect(banAccount).toHaveBeenCalledWith('Alice', 'secret')
    expect(account().getByText('오프라인')).toBeInTheDocument()
    expect(account().getByRole('button', { name: '밴' })).toBeDisabled()
  })

  it('does not ban when the confirmation is cancelled', async () => {
    signIn(true)
    renderAdmin()
    lookUp()
    await waitFor(() => expect(account().getByRole('button', { name: '밴' })).toBeEnabled())

    fireEvent.click(account().getByRole('button', { name: '밴' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(banAccount).not.toHaveBeenCalled()
  })

  it('shows the server reason inline, keeping the session', async () => {
    vi.mocked(lookupAccount).mockRejectedValue(new AppError('비밀번호가 올바르지 않습니다.', 400))
    signIn(true)
    renderAdmin()

    lookUp()

    expect(await screen.findByRole('alert')).toHaveTextContent('비밀번호가 올바르지 않습니다.')
    expect(screen.getByLabelText('대상 RPCN 아이디')).toBeInTheDocument()
  })

  it('does not offer a ban on an account already banned, or on the admin themself', async () => {
    vi.mocked(lookupAccount).mockResolvedValueOnce({ ...alice, banned: true })
    signIn(true)
    const { unmount } = renderAdmin()
    lookUp()
    await waitFor(() => expect(account().getByText('밴됨')).toBeInTheDocument())
    expect(account().getByRole('button', { name: '밴' })).toBeDisabled()
    unmount()

    vi.mocked(lookupAccount).mockResolvedValueOnce({ ...alice, username: 'ROOT' })
    renderAdmin()
    lookUp('ROOT')
    await waitFor(() => expect(account().getByText('자기 계정은 밴할 수 없습니다.')).toBeInTheDocument())
    expect(account().getByRole('button', { name: '밴' })).toBeDisabled()
  })

  it('opens on the accounts section, also for a section that does not exist', () => {
    signIn(true)
    renderAdmin('/admin/nope')

    expect(screen.getByRole('tab', { name: '계정' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: '계정' })).toBeVisible()
    expect(screen.queryByRole('tabpanel', { name: '팝업' })).not.toBeInTheDocument()
  })

  it('opens the section the address names', () => {
    signIn(true)
    renderAdmin('/admin/popups')

    expect(screen.getByRole('tab', { name: '팝업' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('tabpanel', { name: '팝업' })).getByRole('form', { name: '새 팝업' })).toBeVisible()
  })

  it('moves between sections by click and by arrow key, wrapping at the ends', () => {
    signIn(true)
    renderAdmin()

    fireEvent.click(screen.getByRole('tab', { name: '세이브' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/saves')

    fireEvent.keyDown(screen.getByRole('tab', { name: '세이브' }), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('tab', { name: '계정' }), { key: 'ArrowLeft' })

    expect(screen.getByTestId('path')).toHaveTextContent('/admin/popups')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: '팝업' }))
  })

  it('asks for the password only where it is used, and keeps it across a switch', () => {
    signIn(true)
    renderAdmin()
    fireEvent.change(screen.getByLabelText('내 비밀번호 (확인용)'), { target: { value: 'secret' } })

    fireEvent.click(screen.getByRole('tab', { name: '방송 채널' }))
    expect(screen.queryByLabelText('내 비밀번호 (확인용)')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '세이브' }))
    expect(screen.getByLabelText('내 비밀번호 (확인용)')).toHaveValue('secret')
  })

  it('keeps a looked-up account across a switch', async () => {
    signIn(true)
    renderAdmin()
    lookUp()
    await waitFor(() => expect(account().getByText('앨리스')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: '팝업' }))
    fireEvent.click(screen.getByRole('tab', { name: '계정' }))

    expect(account().getByText('앨리스')).toBeVisible()
  })
})
