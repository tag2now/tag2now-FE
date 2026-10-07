import { useCallback, useSyncExternalStore } from 'react'

const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

/** Whether a media query matches the viewport, kept up to date as it changes.
 *
 * For a choice JS has to make — what to render, not just how it looks — which
 * a CSS media query cannot tell it. `useMinWidth` is the one to reach for when
 * the measure is an element rather than the viewport.
 *
 * jsdom has no matchMedia; there it answers false, so tests get the narrow
 * form unless they install one. */
export default function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((notify: () => void) => {
    if (!hasMatchMedia()) return () => {}
    const list = window.matchMedia(query)
    list.addEventListener('change', notify)
    return () => list.removeEventListener('change', notify)
  }, [query])

  return useSyncExternalStore(subscribe, () => hasMatchMedia() && window.matchMedia(query).matches)
}
