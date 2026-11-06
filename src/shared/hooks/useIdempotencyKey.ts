import { useCallback, useRef } from 'react'

/**
 * One Idempotency-Key per thing the user is trying to create.
 *
 * `keyFor(content)` answers the same key while the content stays the same, so a
 * retry after a lost response replays the first result instead of creating a
 * second row; changed content gets a fresh key, since the server refuses a key
 * reused for a different request. `reset()` after success lets the same text be
 * sent again on purpose.
 */
export default function useIdempotencyKey() {
  const last = useRef<{ content: string; key: string } | null>(null)

  const keyFor = useCallback((content: unknown): string => {
    const serialized = JSON.stringify(content)
    if (last.current?.content !== serialized) last.current = { content: serialized, key: crypto.randomUUID() }
    return last.current.key
  }, [])

  const reset = useCallback(() => { last.current = null }, [])

  return { keyFor, reset }
}
