import { useEffect, useState } from 'react'

/**
 * How long ago `date` was, as a label that keeps counting up on its own.
 *
 * Built for polled data, so it resolves to the second — for a written-at
 * timestamp, use `formatTimeAgo`, which is coarser and does not tick.
 *
 * The elapsed time is derived during render rather than stored: `bump` holds no
 * value and exists only to force a re-render every second. The effect keys on
 * the timestamp in milliseconds because each poll hands over a fresh Date
 * instance, which would restart the interval on every render.
 */
export default function useTimeSince(date: Date | null | undefined): string {
  const [, bump] = useState(0)
  const sinceMs = date?.getTime()

  useEffect(() => {
    if (!sinceMs) return
    const id = setInterval(() => bump((count) => count + 1), 1000)
    return () => clearInterval(id)
  }, [sinceMs])

  if (!sinceMs) return ''
  const seconds = Math.max(1, Math.floor((Date.now() - sinceMs) / 1000))
  if (seconds < 60) return `${seconds}초 전`
  return `${Math.floor(seconds / 60)}분 전`
}
