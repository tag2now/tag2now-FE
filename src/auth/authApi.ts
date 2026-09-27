import { POST } from '@/shared/util/api'
import { API } from '@/config/endpoints'
import { startSession } from '@/auth/session'
import type { AuthUser, LoginResponse } from '@/auth/types'

/** Sign in with an RPCN account. The backend checks the password with RPCN and
 * answers with a bearer token, which every later request carries.
 * An aborted `signal` never starts a session, even if the answer already arrived. */
export async function login(username: string, password: string, signal?: AbortSignal): Promise<AuthUser> {
  const result: LoginResponse = await POST(API.login().path, { username, password }, signal)
  signal?.throwIfAborted()
  return startSession(result.access_token, result.expires_in, result.user).user
}
