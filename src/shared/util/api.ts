import { AppError } from '@/shared/util/AppError'
import { endSession, getAccessToken, requestLogin } from '@/auth/session'

declare global {
  interface Window {
    __ENV__?: { API_BASE?: string }
  }
}

const BASE = window.__ENV__?.API_BASE ?? '/api'

export type QueryParams = URLSearchParams | Readonly<Record<string, string | number | boolean>>
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | {
    readonly [key: string]: JsonValue | undefined
}

/** Where a backend path lives. Exported for the one caller that cannot go
 * through `fetch`: an EventSource opens its own request. */
export const apiUrl = (path: string): string => `${BASE}/${path}`

/** The API reports failures as { detail: string }; fall back if that is missing. */
const throwIfFailed = async (res: Response, sentToken: boolean) => {
    if (res.ok) return
    const body: unknown = await res.json().catch(() => null)
    const detail = typeof body === 'object' && body !== null && 'detail' in body ? body.detail : undefined
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
    const res = await fetch(apiUrl(path), { ...option, headers })
    await throwIfFailed(res, token !== null)
    return res
}

/** T describes the endpoint contract; it does not validate the JSON at runtime. */
export const request = async <T = unknown>(path: string, option: RequestInit): Promise<T> => {
    const res = await send(path, option)
    const body: unknown = await res.json()
    return body as T
}

export const GET = async <T = unknown>(path: string, params?: QueryParams): Promise<T> => {
    const queries = new URLSearchParams(params instanceof URLSearchParams || params === undefined
        ? params
        : Object.entries(params).map(([key, value]) => [key, String(value)]));
    return await request<T>(`${path}?${queries}`, { method: 'GET'})
}

export const POST = async <T = unknown>(path: string, data: JsonValue, signal?: AbortSignal): Promise<T> => {
    return await request<T>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal,
    })
}

export const PUT = async <T = unknown>(path: string, data: JsonValue): Promise<T> => {
    return await request<T>(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
}

export const PATCH = async <T = unknown>(path: string, data: JsonValue): Promise<T> => {
    return await request<T>(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
}

/** No-content endpoints return void; JSON endpoints supply their response type. */
export function DELETE(path: string): Promise<void>
export function DELETE<T>(path: string): Promise<T>
export async function DELETE(path: string): Promise<unknown> {
    const res = await send(path, { method: 'DELETE' })
    if (res.status === 204) return undefined
    const body: unknown = await res.json()
    return body
}
