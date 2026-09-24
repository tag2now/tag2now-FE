import { useCallback, useSyncExternalStore } from 'react'
import { endSession, getLoginRequest, getSession, requestLogin, subscribe } from '@/auth/session'
import type { AuthUser } from '@/auth/types'

/** Who is signed in, and the two things a feature does about it.
 *
 * `requireUser` is the guard in front of every write: it answers the user, or
 * opens the login dialog and answers null so the caller can simply return.
 * It never throws --- the dialog is the message, and a toast on top of it
 * would say the same thing twice.
 */
export default function useAuth() {
  const session = useSyncExternalStore(subscribe, getSession)
  const user = session?.user ?? null

  const requireUser = useCallback((reason?: string): AuthUser | null => {
    const current = getSession()?.user ?? null
    if (!current) requestLogin(reason ?? null)
    return current
  }, [])

  return { user, requireUser, logout: endSession }
}

export function useLoginRequest() {
  return useSyncExternalStore(subscribe, getLoginRequest)
}
