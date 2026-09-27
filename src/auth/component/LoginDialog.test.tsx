import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginDialog from './LoginDialog'
import toast from 'react-hot-toast'
import { login } from '@/auth/authApi'
import { dismissLoginRequest, endSession, getLoginRequest, getSession, requestLogin, startSession } from '@/auth/session'
import { AppError } from '@/shared/util/AppError'

vi.mock('@/auth/authApi', () => ({ login: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }))

const user = { username: 'p1', online_name: '철권', avatar_url: '', admin: false }

function fillIn(username = 'p1', password = 'secret') {
  fireEvent.change(screen.getByLabelText('아이디'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: password } })
}

beforeEach(() => vi.clearAllMocks())

afterEach(() => {
  endSession()
  dismissLoginRequest()
})

describe('the login dialog', () => {
  it('stays closed until something asks for a login', () => {
    render(<LoginDialog />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    act(() => requestLogin('로그인하면 예약에 참가할 수 있습니다.'))

    expect(screen.getByRole('dialog', { name: 'RPCN 로그인' })).toHaveTextContent('로그인하면 예약에 참가할 수 있습니다.')
  })

  it('signs in with what was typed, trimming the id but not the password', async () => {
    vi.mocked(login).mockImplementation(async () => startSession('tok', 3600, user).user)
    render(<LoginDialog />)
    act(() => requestLogin())

    fillIn('  p1 ', ' pw ')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(login).toHaveBeenCalledWith('p1', ' pw ', expect.any(AbortSignal)))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the dialog open with the reason when the password is wrong', async () => {
    vi.mocked(login).mockRejectedValue(new AppError('아이디 또는 비밀번호가 올바르지 않습니다.', 401))
    render(<LoginDialog />)
    act(() => requestLogin())

    fillIn()
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('아이디 또는 비밀번호가 올바르지 않습니다.')
    expect(screen.getByLabelText('아이디')).toHaveValue('p1')
    // The password is cleared: it was wrong, and leaving it invites resubmitting it.
    expect(screen.getByLabelText('비밀번호')).toHaveValue('')
  })

  it('answers a transport failure in Korean, not with the browser message', async () => {
    vi.mocked(login).mockRejectedValue(new TypeError('Failed to fetch'))
    render(<LoginDialog />)
    act(() => requestLogin())

    fillIn()
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('로그인하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.')
  })

  it('cannot be submitted empty', () => {
    render(<LoginDialog />)
    act(() => requestLogin())

    expect(screen.getByRole('button', { name: '로그인' })).toBeDisabled()
    fillIn('p1', '')
    expect(screen.getByRole('button', { name: '로그인' })).toBeDisabled()
  })

  it('closes on cancel without signing in', () => {
    render(<LoginDialog />)
    act(() => requestLogin())

    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(getLoginRequest()).toBeNull()
    expect(login).not.toHaveBeenCalled()
  })

  it('abandons a login still in flight when cancelled, so it cannot sign in later', async () => {
    let signal: AbortSignal | undefined
    vi.mocked(login).mockImplementation((_u, _p, given) => {
      signal = given
      return new Promise(() => {})
    })
    render(<LoginDialog />)
    act(() => requestLogin())

    fillIn()
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => expect(signal).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(signal!.aborted).toBe(true)
    expect(getSession()).toBeNull()
  })

  it('shows progress and locks the fields while signing in', async () => {
    vi.mocked(login).mockReturnValue(new Promise(() => {}))
    render(<LoginDialog />)
    act(() => requestLogin())

    fillIn()
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('button', { name: '로그인 중' })).toBeDisabled()
    expect(screen.getByLabelText('아이디')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('readonly')
  })

  it('greets the user once signed in', async () => {
    vi.mocked(login).mockImplementation(async () => startSession('tok', 3600, user).user)
    render(<LoginDialog />)
    act(() => requestLogin())

    fillIn()
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('철권님, 로그인했습니다.'))
  })

  it('reveals the password on request', () => {
    render(<LoginDialog />)
    act(() => requestLogin())

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 보기' }))

    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: '비밀번호 숨기기' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('returns focus to the password after a wrong one', async () => {
    vi.mocked(login).mockRejectedValue(new AppError('아이디 또는 비밀번호가 올바르지 않습니다.', 401, true))
    render(<LoginDialog />)
    act(() => requestLogin())

    fillIn()
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await screen.findByRole('alert')
    expect(screen.getByLabelText('비밀번호')).toHaveFocus()
  })
})
