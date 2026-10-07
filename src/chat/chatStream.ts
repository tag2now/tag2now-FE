import { getSession } from '@/auth/session'
import { streamUrl } from '@/chat/chatApi'
import type { ChatMessage } from '@/chat/types'

/** The lobby chat, held outside React so the whole page shares one connection.
 *
 * The connection opens with the first subscriber and closes with the last, and
 * is also dropped while the tab is hidden: a background tab would otherwise
 * hold a stream open on the one backend process for nobody to read.
 *
 * Every connection opens with a `snapshot` of today's chat, which **replaces**
 * the list. Nothing is resumed: the backend keeps its messages in memory and
 * numbers them from 1 on every start, so `Last-Event-ID` would name the wrong
 * message after a deploy, and a deletion missed while disconnected only shows
 * up in a whole new list.
 *
 * The backend subscribes a reader before it reads the snapshot, so a message
 * posted in between arrives twice — in the snapshot and as a `message` event.
 * Messages are therefore kept by id.
 */

/** `connecting` until the first snapshot of a connection, `retrying` after it
 * failed. The list keeps what it had through both. */
export type Connection = 'connecting' | 'open' | 'retrying'

export type ChatState = {
  messages: ChatMessage[]
  /** Messages from other people that arrived while nobody was reading. */
  unread: number
  connection: Connection
}

/** `MAX_KEPT_MESSAGES` in tag2now-BE: a snapshot never holds more. */
export const MAX_KEPT = 500

/** Waits before reopening a stream the browser gave up on, by attempt. */
export const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 60_000]

const INITIAL: ChatState = { messages: [], unread: 0, connection: 'connecting' }

let state = INITIAL
let source: EventSource | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let failures = 0
// The first snapshot is the backlog, not news; later ones can carry news.
let snapshotSeen = false
let reading = false
const listeners = new Set<() => void>()

function update(next: Partial<ChatState>) {
  state = { ...state, ...next }
  listeners.forEach((notify) => notify())
}

const isMine = (message: ChatMessage) => message.author_username === getSession()?.user.username

const newestAt = (messages: ChatMessage[]) =>
  messages.reduce((newest, message) => Math.max(newest, Date.parse(message.created_at)), -Infinity)

const unreadWith = (arrived: ChatMessage[]) =>
  reading ? 0 : state.unread + arrived.filter((message) => !isMine(message)).length

function onSnapshot(messages: ChatMessage[]) {
  // Ids restart with the backend, so what is new is told by time, not by id.
  const heldUntil = newestAt(state.messages)
  const missed = snapshotSeen ? messages.filter((message) => Date.parse(message.created_at) > heldUntil) : []
  snapshotSeen = true
  failures = 0
  update({ messages: messages.slice(-MAX_KEPT), unread: unreadWith(missed), connection: 'open' })
}

function onMessage(message: ChatMessage) {
  if (state.messages.some((held) => held.id === message.id)) return
  // A POST answer can land after a later message the stream already delivered.
  const messages = [...state.messages, message].sort((a, b) => a.id - b.id).slice(-MAX_KEPT)
  update({ messages, unread: unreadWith([message]) })
}

function onDelete(id: number) {
  update({ messages: state.messages.filter((message) => message.id !== id) })
}

const parsed = <T>(event: Event): T => JSON.parse((event as MessageEvent<string>).data)

function close() {
  source?.close()
  source = null
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = null
}

function open() {
  close()
  const next = new EventSource(streamUrl())
  next.addEventListener('snapshot', (event) => onSnapshot(parsed(event)))
  next.addEventListener('message', (event) => onMessage(parsed(event)))
  next.addEventListener('delete', (event) => onDelete(parsed<{ id: number }>(event).id))
  next.onerror = () => onError(next)
  source = next
}

/** A dropped connection is reopened by the browser itself. One it refused to
 * keep — a 502 while the backend restarts, say — is CLOSED and stays closed,
 * so that one is reopened here, backing off. */
function onError(failed: EventSource) {
  update({ connection: 'retrying' })
  if (failed.readyState !== EventSource.CLOSED) return
  close()
  const delay = RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)]
  failures += 1
  retryTimer = setTimeout(open, delay)
}

function onVisibilityChange() {
  if (document.hidden) close()
  else if (!source) open()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) start()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stop()
  }
}

function start() {
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (!document.hidden) open()
}

/** Nobody is left to read it, so nothing is kept: the next reader starts from a snapshot. */
function stop() {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  close()
  state = INITIAL
  failures = 0
  snapshotSeen = false
  reading = false
}

export const getChatState = (): ChatState => state

/** A message the client learned of outside the stream: the answer to its own
 * post, which shows the sender their line even while the stream is down. */
export const receive = (message: ChatMessage): void => onMessage(message)

/** A message the client deleted itself; the stream's `delete` may follow. */
export const forget = (id: number): void => onDelete(id)

/** While someone has the chat open, nothing counts as unread. */
export function setReading(value: boolean): void {
  reading = value
  if (value && state.unread > 0) update({ unread: 0 })
}
