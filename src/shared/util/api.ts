import { AppError } from '@/shared/util/AppError'
import { endSession, getAccessToken, requestLogin } from '@/auth/session'

declare global {
  interface Window {
    __ENV__?: { API_BASE?: string }
  }
}

const BASE = window.__ENV__?.API_BASE ?? '/api'

/** The API reports failures as { detail: string }; fall back if that is missing. */
const throwIfFailed = async (res: Response, sentToken: boolean) => {
    if (res.ok) return
    const detail = await res.json().then((body) => body?.detail).catch(() => null)
    const explained = typeof detail === 'string'
    const message = explained ? detail : `request failed: ${res.status}`
    // The token was refused: it expired, or the server's key changed. Keeping it
    // would fail every later write the same way, so drop it and ask again.
    if (res.status === 401 && sentToken) {
        endSession()
        requestLogin(explained ? detail : null)
    }
    throw new AppError(message, res.status, explained)
}

/** Every call carries the signed-in user's token when there is one. Reads do
 * not need it, but sending it costs nothing and keeps one code path. */
const send = async (path: string, option: RequestInit) => {
    const token = getAccessToken()
    const headers = new Headers(option.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const res = await fetch(`${BASE}/${path}`, { ...option, headers })
    await throwIfFailed(res, token !== null)
    return res
}

export const request = async (path: string, option: RequestInit) => {
    const res = await send(path, option)
    return res.json()
}

export const GET = async (path: string, params?: any) => {
    const queries = new URLSearchParams(params);
    return await request(`${path}?${queries}`, { method: 'GET'})
}

export const POST = async (path: string, data: any) => {
    return await request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
}

export const PATCH = async (path: string, data: any) => {
    return await request(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
}

export const DELETE = async (path: string) => {
    const res = await send(path, { method: 'DELETE' })
    if (res.status === 204) return undefined
    return res.json()
}
