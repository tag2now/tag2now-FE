import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endSession, startSession } from '@/auth/session'
import FakeEventSource from '@/chat/fakeEventSource'
import { forget, getChatState, MAX_KEPT, receive, RETRY_DELAYS_MS, setReading, subscribe } from '@/chat/chatStream'
import type { ChatMessage } from '@/chat/types'

/** Message `id`, said by `author` at 12:`minute` UTC — by default at minute `id`. */
const line = (id: number, author = 'rival', minute = id): ChatMessage => ({
  id,
  author_username: author,
  author_online_name: author,
  body: `메시지 ${id}`,
  created_at: new Date(Date.UTC(2026, 9, 7, 12, minute)).toISOString(),
})

const ids = () => getChatState().messages.map((message) => message.id)
const server = () => FakeEventSource.latest()

let readers: (() => void)[] = []
/** A component on the page that reads the chat. */
const read = () => readers.push(subscribe(() => {}))
const leaveAll = () => {
  readers.forEach((stop) => stop())
  readers = []
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

const signInAs = (username: string) =>
  startSession('tok', 3600, { username, online_name: username, avatar_url: '', admin: false })

beforeEach(() => FakeEventSource.reset())

afterEach(() => {
  leaveAll()
  endSession()
  setHidden(false)
  vi.useRealTimers()
})

describe('the chat connection', () => {
  it('is one stream for every reader on the page, closed with the last', () => {
    read()
    read()
    expect(FakeEventSource.open()).toHaveLength(1)
    expect(server().url).toBe('/api/chat/stream')

    leaveAll()

    expect(FakeEventSource.open()).toHaveLength(0)
  })

  it('keeps nothing once nobody reads, so the next reader starts from a snapshot', () => {
    read()
    server().emit('snapshot', [line(1)])

    leaveAll()

    expect(getChatState()).toEqual({ messages: [], unread: 0, connection: 'connecting' })
  })

  it('leaves a dropped stream for the browser to reconnect', () => {
    read()
    server().emit('snapshot', [line(1)])

    server().fail({ refused: false })

    expect(getChatState().connection).toBe('retrying')
    expect(ids()).toEqual([1])
    expect(FakeEventSource.instances).toHaveLength(1)
    server().emit('snapshot', [line(1), line(2)])
    expect(getChatState().connection).toBe('open')
  })

  it('reopens a stream the browser refused, waiting longer after each refusal', () => {
    vi.useFakeTimers()
    read()

    server().fail({ refused: true })
    vi.advanceTimersByTime(RETRY_DELAYS_MS[0] - 1)
    expect(FakeEventSource.open()).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(FakeEventSource.open()).toHaveLength(1)

    server().fail({ refused: true })
    vi.advanceTimersByTime(RETRY_DELAYS_MS[0])
    expect(FakeEventSource.open()).toHaveLength(0)
    vi.advanceTimersByTime(RETRY_DELAYS_MS[1] - RETRY_DELAYS_MS[0])
    expect(FakeEventSource.open()).toHaveLength(1)
  })

  it('waits the shortest time again once a stream has worked', () => {
    vi.useFakeTimers()
    read()
    server().fail({ refused: true })
    vi.advanceTimersByTime(RETRY_DELAYS_MS[0])
    server().emit('snapshot', [])

    server().fail({ refused: true })
    vi.advanceTimersByTime(RETRY_DELAYS_MS[0])

    expect(FakeEventSource.open()).toHaveLength(1)
  })

  it('lets go of the stream while the tab is hidden, and opens a new one when it is shown', () => {
    read()

    setHidden(true)
    expect(FakeEventSource.open()).toHaveLength(0)

    setHidden(false)
    expect(FakeEventSource.open()).toHaveLength(1)
    expect(FakeEventSource.instances).toHaveLength(2)
  })

  it('does not connect from a tab that opens hidden until it is shown', () => {
    setHidden(true)
    read()
    expect(FakeEventSource.instances).toHaveLength(0)

    setHidden(false)

    expect(FakeEventSource.open()).toHaveLength(1)
  })
})

describe('the chat list', () => {
  it("starts from today's snapshot and takes each message after it", () => {
    read()
    server().emit('snapshot', [line(1), line(2)])
    server().emit('message', line(3))

    expect(ids()).toEqual([1, 2, 3])
    expect(getChatState().connection).toBe('open')
  })

  it('is replaced by every snapshot, so a deletion missed while away is gone too', () => {
    read()
    server().emit('snapshot', [line(1), line(2)])
    server().fail({ refused: false })

    server().emit('snapshot', [line(2), line(3)])

    expect(ids()).toEqual([2, 3])
  })

  it('keeps a message posted while the snapshot was read once, though it arrives twice', () => {
    read()
    server().emit('snapshot', [line(1), line(2)])
    server().emit('message', line(2))

    expect(ids()).toEqual([1, 2])
  })

  it('puts the answer to my own post in order, even after a later message', () => {
    read()
    server().emit('snapshot', [line(1)])
    server().emit('message', line(3))

    receive(line(2))
    server().emit('message', line(2))

    expect(ids()).toEqual([1, 2, 3])
  })

  it('drops a deleted message, whether the stream or this client deleted it', () => {
    read()
    server().emit('snapshot', [line(1), line(2), line(3)])

    server().emit('delete', { id: 1 })
    forget(2)

    expect(ids()).toEqual([3])
  })

  it('holds no more than the backend keeps', () => {
    read()
    const full = Array.from({ length: MAX_KEPT }, (_, index) => line(index + 1))
    server().emit('snapshot', full)

    server().emit('message', line(MAX_KEPT + 1))

    expect(ids()).toHaveLength(MAX_KEPT)
    expect(ids()[0]).toBe(2)
  })
})

describe('the unread count', () => {
  it('counts what other people say, never my own lines', () => {
    signInAs('me')
    read()
    server().emit('snapshot', [line(1)])

    server().emit('message', line(2, 'rival'))
    server().emit('message', line(3, 'me'))
    receive(line(4, 'me'))

    expect(getChatState().unread).toBe(1)
  })

  it('does not count the backlog the first snapshot brings', () => {
    read()
    server().emit('snapshot', [line(1), line(2), line(3)])

    expect(getChatState().unread).toBe(0)
  })

  it('counts what a reconnect brings that the list did not hold', () => {
    signInAs('me')
    read()
    server().emit('snapshot', [line(1), line(2)])
    server().fail({ refused: false })

    server().emit('snapshot', [line(1), line(2), line(3, 'rival'), line(4, 'me')])

    expect(getChatState().unread).toBe(1)
  })

  it('counts by time, so a backend that restarted and numbers from 1 again still counts', () => {
    read()
    server().emit('snapshot', [line(7), line(8)])
    server().fail({ refused: false })

    server().emit('snapshot', [line(1, 'rival', 30)])

    expect(getChatState().unread).toBe(1)
  })

  it('counts nothing while the chat is open, and clears when it is opened', () => {
    read()
    server().emit('snapshot', [])

    setReading(true)
    server().emit('message', line(1))
    expect(getChatState().unread).toBe(0)

    setReading(false)
    server().emit('message', line(2))
    expect(getChatState().unread).toBe(1)

    setReading(true)
    expect(getChatState().unread).toBe(0)
  })
})
