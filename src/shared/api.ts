declare global {
  interface Window {
    __ENV__?: { API_BASE?: string }
  }
}

const BASE = window.__ENV__?.API_BASE ?? '/api'

export const request = async (path: string, option: RequestInit) => {
    const res = await fetch(`${BASE}/${path}`, option);
    if (!res.ok) throw new Error(`request failed: ${res.body}`)
    return res.json()
}

export const GET = async (path: string, params?: any) => {
    const queries = new URLSearchParams(params);
    return await request(`${path}?${queries}`, { method: 'GET'})
}

export const POST = async (path: string, data: any) => {
    return await request('path', { method: 'POST', body: JSON.stringify(data) })
}
