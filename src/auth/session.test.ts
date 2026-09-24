import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dismissLoginRequest, endSession, getAccessToken, getLoginRequest, getSession,
  requestLogin, restoreSession, startSession, subscribe,
} from './session'
import { STORAGE_KEYS } from '@/shared/util/storage'

const user = { username: 'p1', online_name: '철권', avatar_url: '', admin: false }

afterEach(() => {
  endSession()
  dismissLoginRequest()
  vi.useRealTimers()
  localStorage.clear()
})

describe('the session store', () => {
  it('holds the token and the user once signed in, and persists them', () => {
    startSession('tok', 3600, user)

    expect(getAccessToken()).toBe('tok')
    expect(getSession()?.user).toEqual(user)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.session)!).token).toBe('tok')
  })

  it('forgets everything on sign-out', () => {
    startSession('tok', 3600, user)

    endSession()

    expect(getSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull()
  })

  it('survives a reload', () => {
    startSession('tok', 3600, user)

    restoreSession()

    expect(getAccessToken()).toBe('tok')
  })

  it('does not restore an expired session, and clears it from storage', () => {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ token: 'old', expiresAt: Date.now() - 1, user }))

    restoreSession()

    expect(getSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull()
  })

  it('ignores a stored value it cannot read', () => {
    localStorage.setItem(STORAGE_KEYS.session, '{not json')

    restoreSession()

    expect(getSession()).toBeNull()
  })

  it('signs itself out when the token expires', () => {
    vi.useFakeTimers()
    startSession('tok', 60, user)

    vi.advanceTimersByTime(59_000)
    expect(getSession()).not.toBeNull()
    vi.advanceTimersByTime(1_000)
    expect(getSession()).toBeNull()
  })

  it('notifies subscribers of every change', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    startSession('tok', 3600, user)
    endSession()
    unsubscribe()
    startSession('tok', 3600, user)

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('closes a pending login request once signed in', () => {
    requestLogin('로그인하세요')
    expect(getLoginRequest()).toEqual({ reason: '로그인하세요' })

    startSession('tok', 3600, user)

    expect(getLoginRequest()).toBeNull()
  })

  it('follows a sign-out made in another tab', () => {
    startSession('tok', 3600, user)

    localStorage.removeItem(STORAGE_KEYS.session)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.session }))

    expect(getSession()).toBeNull()
  })
})
