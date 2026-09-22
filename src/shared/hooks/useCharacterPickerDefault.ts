import { useState } from 'react'

/** The character grid opens itself on a screen with room for it.
 *
 * Both pickers — the community board's and the leaderboard's — are sixty
 * portraits about 380px tall, folded away because opening one used to fill the
 * screen before the reader saw a single post or rank. That is still true on a
 * phone, so the fold stays there.
 *
 * A desktop is not automatically roomy: the width says the layout is wide, and
 * the height says whether the list survives the grid. At 1280x900 the first row
 * clears the fold with 263px to spare; at 1280x720 it has 83px, and at 640 tall
 * it is off-screen entirely. Both axes therefore have to agree before the grid
 * opens on its own.
 */
const ROOMY = '(min-width: 761px) and (min-height: 800px)'

export function prefersOpenPicker(): boolean {
  // jsdom has no matchMedia, and a test that never asked about the viewport
  // should get the folded default rather than a crash.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(ROOMY).matches
}

/** Open/closed state for a character grid, defaulting to open on a roomy
 * screen. Read once on mount: resizing mid-session does not fold a grid the
 * reader opened, or reopen one they closed. */
export default function useCharacterPickerDefault() {
  return useState(prefersOpenPicker)
}
