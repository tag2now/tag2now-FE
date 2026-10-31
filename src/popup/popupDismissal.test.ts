import { beforeEach, describe, expect, it } from 'vitest'
import { dismissPopup, isDismissed } from '@/popup/popupDismissal'
import { STORAGE_KEYS } from '@/shared/util/storage'

const NOON = Date.UTC(2026, 9, 31, 12)
const HOUR = 60 * 60 * 1000

describe('popup dismissal', () => {
  beforeEach(() => localStorage.clear())

  it('remembers nothing until asked', () => {
    expect(isDismissed(1)).toBe(false)
  })

  it('hides a popup for 24 hours from the moment it was dismissed', () => {
    dismissPopup(1, 'day', NOON)

    expect(isDismissed(1, NOON + 24 * HOUR - 1)).toBe(true)
    expect(isDismissed(1, NOON + 24 * HOUR)).toBe(false)
  })

  it('hides a popup for good', () => {
    dismissPopup(1, 'forever', NOON)

    expect(isDismissed(1, NOON + 10_000 * 24 * HOUR)).toBe(true)
  })

  it('keeps one record per popup', () => {
    dismissPopup(1, 'forever', NOON)
    dismissPopup(2, 'day', NOON)

    expect(isDismissed(1, NOON)).toBe(true)
    expect(isDismissed(2, NOON)).toBe(true)
    expect(isDismissed(3, NOON)).toBe(false)
  })

  it('drops expired records on the next write', () => {
    dismissPopup(1, 'day', NOON)
    dismissPopup(2, 'forever', NOON + 25 * HOUR)

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.dismissedPopups)!)).toEqual({ 2: 'forever' })
  })

  it.each(['not json', 'null', '7'])('reads a stored %s as nothing dismissed', (stored) => {
    localStorage.setItem(STORAGE_KEYS.dismissedPopups, stored)

    expect(isDismissed(1)).toBe(false)
  })
})
