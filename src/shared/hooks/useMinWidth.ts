import { useEffect, useState } from 'react'

/** Whether an element is at least `min` pixels wide, kept up to date as it
 * resizes.
 *
 * Measured on the element, not the window: the panel is what constrains a
 * layout, and the same viewport gives it a different width on a tab with a
 * sidebar than on one without. For layouts whose choice JS has to know — the
 * render order, a chart's props — which a `@container` query cannot tell it.
 *
 * A callback ref rather than a ref object, so an element that mounts after the
 * component does (behind an empty state, say) is still observed.
 *
 * Starts `false`: the narrow form is the one that is readable at any width,
 * and jsdom has no ResizeObserver, so tests stay there. */
export default function useMinWidth<T extends HTMLElement>(min: number) {
  const [element, setElement] = useState<T | null>(null)
  const [wide, setWide] = useState(false)

  useEffect(() => {
    if (!element || typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(([entry]) => {
      setWide(entry.contentRect.width >= min)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, min])

  return [setElement, wide] as const
}
