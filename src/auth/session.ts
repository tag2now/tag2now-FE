import { readItem, removeItem, STORAGE_KEYS, writeItem } from '@/shared/util/storage'
import type { AuthUser } from '@/auth/types'

/** The signed-in account, held outside React so `api.ts` can read the token.
 *
 * The backend's token is stateless: it is valid until `expiresAt` and nothing
 * on the server can end it sooner. Signing out is therefore just forgetting it
 * here, and an expired session is forgotten on a timer rather than discovered
 * by the next write failing.
 *
 * Components read this through `useAuth`, which subscribes with
 * `useSyncExternalStore`; the store also listens for `storage` events, so
 * signing in or out in one tab is reflected in every other one.
 */

export type Session = {
  token: string
  /** Epoch milliseconds. */
  expiresAt: number
  user: AuthUser
}

/** Why the login dialog is open, shown as its lead line. `null` when closed. */
export type LoginRequest = { reason: string | null } | null

const KEY = STORAGE_KEYS.session
// setTimeout counts in a signed 32-bit int; a longer delay fires at once.
const MAX_TIMER_MS = 2 ** 31 - 1

let session: Session | null = null
let loginRequest: LoginRequest = null
let expiryTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((notify) => notify())

function parse(raw: string | null): Session | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Session
    if (typeof value?.token !== 'string' || typeof value.expiresAt !== 'number' || !value.user?.username) return null
    return value.expiresAt > Date.now() ? value : null
  } catch {
    return null
  }
}

function arm(next: Session | null) {
  if (expiryTimer) clearTimeout(expiryTimer)
  expiryTimer = null
  if (!next) return
  expiryTimer = setTimeout(endSession, Math.min(next.expiresAt - Date.now(), MAX_TIMER_MS))
}

function adopt(next: Session | null) {
  session = next
  arm(next)
  emit()
}

export function startSession(token: string, expiresInSeconds: number, user: AuthUser): Session {
  const next = { token, expiresAt: Date.now() + expiresInSeconds * 1000, user }
  writeItem(KEY, JSON.stringify(next))
  loginRequest = null
  adopt(next)
  return next
}

export function endSession(): void {
  removeItem(KEY)
  if (session) adopt(null)
}

export const getSession = (): Session | null => session

export const getAccessToken = (): string | null => session?.token ?? null

/** Ask whatever renders the login dialog to open it. */
export function requestLogin(reason: string | null = null): void {
  loginRequest = { reason }
  emit()
}

export function dismissLoginRequest(): void {
  if (!loginRequest) return
  loginRequest = null
  emit()
}

export const getLoginRequest = (): LoginRequest => loginRequest

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Load the stored session. Called once at import, and again by tests. */
export function restoreSession(): void {
  const stored = parse(readItem(KEY))
  if (!stored) removeItem(KEY)
  loginRequest = null
  adopt(stored)
}

restoreSession()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) adopt(parse(readItem(KEY)))
  })
}
