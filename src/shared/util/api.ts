declare global {
  interface Window {
    __ENV__?: { API_BASE?: string }
  }
}

const BASE = window.__ENV__?.API_BASE ?? '/api'

/** The API reports failures as { detail: string }; fall back if that is missing. */
const throwIfFailed = async (res: Response) => {
    if (res.ok) return
    const detail = await res.json().then((body) => body?.detail).catch(() => null)
    throw new Error(typeof detail === 'string' ? detail : `request failed: ${res.status}`)
}

export const request = async (path: string, option: RequestInit) => {
    const res = await fetch(`${BASE}/${path}`, { credentials: 'include', ...option });
    await throwIfFailed(res)
    return res.json()
}

export const GET = async (path: string, params?: any) => {
    const queries = new URLSearchParams(params);
    return await request(`${path}?${queries}`, { method: 'GET'})
}

export const POST = async (path: string, data: any, headers?: HeadersInit) => {
    return await request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(data),
    })
}

export const PATCH = async (path: string, data: any, headers?: HeadersInit) => {
    return await request(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(data),
    })
}

export const DELETE = async (path: string, headers?: HeadersInit) => {
    const res = await fetch(`${BASE}/${path}`, { credentials: 'include', method: 'DELETE', headers });
    await throwIfFailed(res)
    if (res.status === 204) return undefined
    return res.json()
}
