import { STORAGE_KEYS, readItem, writeItem } from '@/shared/util/storage'

export type DismissSpan = 'forever' | 'day'

/** By popup id: 'forever', or the epoch milliseconds it stays hidden until. */
type Dismissals = Record<string, 'forever' | number>

const DAY_MS = 24 * 60 * 60 * 1000

/** A value this code did not write reads as nothing dismissed, not as a crash on load. */
function readDismissals(): Dismissals {
  try {
    const stored: unknown = JSON.parse(readItem(STORAGE_KEYS.dismissedPopups) ?? '{}')
    return typeof stored === 'object' && stored !== null ? stored as Dismissals : {}
  } catch {
    return {}
  }
}

const stillHidden = (until: 'forever' | number | undefined, now: number) =>
  until === 'forever' || (typeof until === 'number' && until > now)

export function isDismissed(id: number, now = Date.now()): boolean {
  return stillHidden(readDismissals()[id], now)
}

/** Expired entries go with each write, so the record does not grow forever. */
export function dismissPopup(id: number, span: DismissSpan, now = Date.now()): void {
  const kept = Object.entries(readDismissals()).filter(([, until]) => stillHidden(until, now))
  const until = span === 'forever' ? 'forever' : now + DAY_MS
  writeItem(STORAGE_KEYS.dismissedPopups, JSON.stringify({ ...Object.fromEntries(kept), [id]: until }))
}
