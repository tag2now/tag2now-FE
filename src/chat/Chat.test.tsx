import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { dismissLoginRequest, endSession, getLoginRequest, startSession } from '@/auth/session'
import Chat, { DOCKED_QUERY } from '@/chat/Chat'
import { deleteMessage, postMessage } from '@/chat/chatApi'
import { getChatState } from '@/chat/chatStream'
import FakeEventSource from '@/chat/fakeEventSource'
import type { ChatMessage } from '@/chat/types'
import { AppError } from '@/shared/util/AppError'

vi.mock('@/chat/chatApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/chat/chatApi')>()),
  postMessage: vi.fn(),
  deleteMessage: vi.fn(),
}))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))

const line = (id: number, author = 'rival', body = `메시지 ${id}`): ChatMessage => ({
  id,
  author_username: author,
  author_online_name: `${author}-name`,
  body,
  created_at: new Date(Date.UTC(2026, 9, 7, 12, id)).toISOString(),
})

const server = (type: string, data: unknown) => act(() => FakeEventSource.latest().emit(type, data))

const signInAs = (username: string, admin = false) =>
  startSession('tok', 3600, { username, online_name: `${username}-name`, avatar_url: '', admin })

const openChat = () => fireEvent.click(screen.getByRole('button', { name: /^채팅 열기/ }))
const chatLog = () => screen.getByRole('log', { name: '채팅 메시지' })

beforeEach(() => {
  vi.clearAllMocks()
  FakeEventSource.reset()
})

afterEach(() => {
  endSession()
  dismissLoginRequest()
  vi.unstubAllGlobals()
})

/** A viewport wide enough for the chat column. jsdom has no matchMedia, so
 * every other test here sees the narrow layout. */
const wideScreen = () => vi.stubGlobal('matchMedia', (query: string) => ({
  matches: query === DOCKED_QUERY,
  addEventListener: () => {},
  removeEventListener: () => {},
}))

describe('the lobby chat', () => {
  it('counts new messages on the launcher until the chat is opened', () => {
    render(<Chat />)
    server('snapshot', [line(1)])
    server('message', line(2))
    server('message', line(3))

    expect(screen.getByRole('button', { name: '채팅 열기, 새 메시지 2개' })).toBeInTheDocument()
    openChat()

    expect(within(chatLog()).getAllByRole('listitem')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: '채팅 닫기' }))
    expect(screen.getByRole('button', { name: '채팅 열기' })).toBeInTheDocument()
  })

  it('shows the chat to a reader who is not signed in, and asks them to log in to write', () => {
    render(<Chat />)
    server('snapshot', [line(1)])
    openChat()

    expect(chatLog()).toHaveTextContent('메시지 1')
    expect(screen.queryByLabelText('메시지')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '로그인하고 채팅하기' }))

    expect(getLoginRequest()).toEqual({ reason: '로그인하면 채팅에 참여할 수 있습니다.' })
  })

  it('sends the trimmed text and shows the line without waiting for the stream', async () => {
    signInAs('me')
    vi.mocked(postMessage).mockResolvedValue(line(2, 'me', '안녕하세요'))
    render(<Chat />)
    server('snapshot', [line(1)])
    openChat()

    fireEvent.change(screen.getByLabelText('메시지'), { target: { value: '  안녕하세요  ' } })
    fireEvent.click(screen.getByRole('button', { name: '보내기' }))

    expect(await within(chatLog()).findByText('안녕하세요')).toBeInTheDocument()
    expect(postMessage).toHaveBeenCalledWith('안녕하세요')
    expect(screen.getByLabelText('메시지')).toHaveValue('')
  })

  it('keeps the text when the server refuses it, and says why', async () => {
    signInAs('me')
    vi.mocked(postMessage).mockRejectedValue(new AppError('메시지를 너무 빨리 보내고 있습니다. 잠시 후 다시 보내 주세요.', 429))
    render(<Chat />)
    server('snapshot', [])
    openChat()

    fireEvent.change(screen.getByLabelText('메시지'), { target: { value: '또 보냄' } })
    fireEvent.click(screen.getByRole('button', { name: '보내기' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('메시지를 너무 빨리 보내고 있습니다. 잠시 후 다시 보내 주세요.'))
    expect(screen.getByLabelText('메시지')).toHaveValue('또 보냄')
  })

  it('offers to delete my own lines only', async () => {
    signInAs('me')
    vi.mocked(deleteMessage).mockResolvedValue(undefined)
    render(<Chat />)
    server('snapshot', [line(1, 'rival'), line(2, 'me')])
    openChat()

    expect(screen.queryByRole('button', { name: 'rival-name님의 메시지 삭제' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'me-name님의 메시지 삭제' }))

    await waitFor(() => expect(within(chatLog()).getAllByRole('listitem')).toHaveLength(1))
    expect(deleteMessage).toHaveBeenCalledWith(2)
  })

  it("lets an admin delete anyone's line", () => {
    signInAs('mod', true)
    render(<Chat />)
    server('snapshot', [line(1, 'rival'), line(2, 'other')])
    openChat()

    expect(screen.getAllByRole('button', { name: /님의 메시지 삭제$/ })).toHaveLength(2)
  })

  it('says so while the stream is down, and stops once it is back', () => {
    render(<Chat />)
    server('snapshot', [line(1)])
    openChat()

    act(() => FakeEventSource.latest().fail({ refused: false }))
    expect(screen.getByRole('region', { name: '채팅' })).toHaveTextContent('연결이 끊겼습니다')
    expect(chatLog()).toHaveTextContent('메시지 1')

    server('snapshot', [line(1)])
    expect(screen.getByRole('region', { name: '채팅' })).not.toHaveTextContent('연결이 끊겼습니다')
  })

  it('closes on Escape and puts focus back on the launcher', () => {
    render(<Chat />)
    server('snapshot', [])
    openChat()

    fireEvent.keyDown(screen.getByRole('region', { name: '채팅' }), { key: 'Escape' })

    expect(screen.queryByRole('region', { name: '채팅' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '채팅 열기' })).toHaveFocus()
  })
})

describe('the lobby chat on a wide screen', () => {
  it('stands open as a column, with no launcher and nothing to close', () => {
    wideScreen()
    render(<Chat />)
    server('snapshot', [line(1)])

    expect(chatLog()).toHaveTextContent('메시지 1')
    expect(screen.queryByRole('button', { name: /^채팅 열기/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '채팅 닫기' })).not.toBeInTheDocument()
  })

  it('leaves focus where it was when the page loads', () => {
    wideScreen()
    render(<Chat />)

    expect(screen.getByRole('region', { name: '채팅' })).not.toHaveFocus()
  })

  it('counts nothing as unread, since it is always in view', () => {
    wideScreen()
    render(<Chat />)
    server('snapshot', [])
    server('message', line(1))

    expect(getChatState().unread).toBe(0)
  })
})
