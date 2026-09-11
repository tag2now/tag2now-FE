const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])

export function isYouTubeVideoId(value: string): boolean {
  return value.length === 11 && VIDEO_ID.test(value)
}

/** Accept video links only; never use user input as an iframe URL. */
export function parseYouTubeVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null
    let id: string | null = null
    if (url.hostname === 'youtu.be') {
      id = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null
    } else if (YOUTUBE_HOSTS.has(url.hostname)) {
      id = url.pathname === '/watch'
        ? url.searchParams.get('v')
        : /^\/(?:shorts|embed|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null
    }
    return id && isYouTubeVideoId(id) ? id : null
  } catch {
    return null
  }
}
