import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    endSession()
    dismissLoginRequest()
    vi.clearAllMocks()
  })

  it('asks a signed-out visitor to log in, and offers the login', () => {
    render(<Admin />)

    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(getLoginRequest()).toEqual({ reason: '관리자 계정으로 로그인하세요.' })
    expect(screen.queryByLabelText('대상 RPCN 아이디')).not.toBeInTheDocument()
  })

  it('shows a signed-in non-admin no form', () => {
    signIn(false)
    render(<Admin />)

    expect(screen.getByText('관리자 권한이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByLabelText('대상 RPCN 아이디')).not.toBeInTheDocument()
  })

  it('looks an account up with the admin password and shows its standing', async () => {
    signIn(true)
    render(<Admin />)

    lookUp(' Alice ', 'secret')

    await waitFor(() => expect(account().getByText('앨리스')).toBeInTheDocument())
    expect(lookupAccount).toHaveBeenCalledWith('Alice', 'secret')
    expect(account().getByText('정상')).toBeInTheDocument()
    expect(account().getByText('접속 중')).toBeInTheDocument()
    expect(account().getByText('기록 없음')).toBeInTheDocument()
  })

  it('bans the looked-up account after confirmation, with the same password', async () => {
    signIn(true)
    render(<Admin />)
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
    render(<Admin />)
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
    render(<Admin />)

    lookUp()

    expect(await screen.findByRole('alert')).toHaveTextContent('비밀번호가 올바르지 않습니다.')
    expect(screen.getByLabelText('대상 RPCN 아이디')).toBeInTheDocument()
  })

  it('does not offer a ban on an account already banned, or on the admin themself', async () => {
    vi.mocked(lookupAccount).mockResolvedValueOnce({ ...alice, banned: true })
    signIn(true)
    const { unmount } = render(<Admin />)
    lookUp()
    await waitFor(() => expect(account().getByText('밴됨')).toBeInTheDocument())
    expect(account().getByRole('button', { name: '밴' })).toBeDisabled()
    unmount()

    vi.mocked(lookupAccount).mockResolvedValueOnce({ ...alice, username: 'ROOT' })
    render(<Admin />)
    lookUp('ROOT')
    await waitFor(() => expect(account().getByText('자기 계정은 밴할 수 없습니다.')).toBeInTheDocument())
    expect(account().getByRole('button', { name: '밴' })).toBeDisabled()
  })
})
