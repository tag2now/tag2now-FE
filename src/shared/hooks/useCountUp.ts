import { useEffect, useRef, useState } from 'react'

/** Long enough for a three-digit figure to read as counting, short enough that
 * it always settles before the 5s room poll can hand it a new target. */
const DURATION_MS = 600

/**
 * Whether to skip the count entirely.
 *
 * The stylesheet's `prefers-reduced-motion` block cannot reach this one: it
 * kills CSS animations and transitions, and this counts in JavaScript. So the
 * preference has to be read here as well.
 *
 * A missing `matchMedia` counts as "skip". Every browser has had it for over a
 * decade, so the only thing running without one is a test renderer, and
 * standing still is the safe answer when the preference cannot be asked for.
 */
const prefersReducedMotion = () =>
  typeof window.matchMedia !== 'function'
  || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Fast off the mark, settling into the final figure rather than arriving at
 * full speed. Cubic, so a 3-digit jump still reads as counting near the end. */
const easeOut = (progress: number) => 1 - (1 - progress) ** 3

/**
 * Counts from the last figure shown up to `target`.
 *
 * `null` is "nothing countable" — the em dash the KPIs show while rooms are in
 * flight — and passes straight through, so a failed fetch never animates down
 * to zero as though the server had emptied.
 */
export default function useCountUp(target: number | null): number | null {
  const [shown, setShown] = useState<number | null>(target === null ? null : 0)
  const from = useRef(0)

  useEffect(() => {
    if (target === null) {
      setShown(null)
      return
    }
    // Nothing to travel: the first paint of a figure counts from zero, and a
    // poll that returned the same number should not replay the animation.
    if (prefersReducedMotion() || from.current === target) {
      setShown(target)
      from.current = target
      return
    }

    const start = from.current
    // The origin is the first frame's own timestamp, not performance.now().
    // The two are not promised to share a time origin, and where they do not
    // the elapsed time comes out negative — which this easing turns into a
    // figure below `start`, so the count begins by running backwards.
    let began = 0
    let frame = requestAnimationFrame(function step(now: number) {
      began ||= now
      const progress = Math.min((now - began) / DURATION_MS, 1)
      setShown(Math.round(start + (target - start) * easeOut(progress)))
      if (progress < 1) frame = requestAnimationFrame(step)
      else from.current = target
    })
    return () => cancelAnimationFrame(frame)
  }, [target])

  return shown
}
