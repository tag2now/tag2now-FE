import type { KeyboardEvent } from 'react'

/**
 * An Enter that means "send": not Shift+Enter, and not the Enter that ends a
 * Hangul composition. Some IMEs report that one with keyCode 229 rather than
 * `isComposing`, and handling it sends the text without its last syllable ---
 * then the real Enter sends it again.
 */
export const isSubmitEnter = (event: KeyboardEvent): boolean =>
  event.key === 'Enter'
  && !event.shiftKey
  && !event.nativeEvent.isComposing
  && event.nativeEvent.keyCode !== 229
