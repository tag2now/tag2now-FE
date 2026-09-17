import { useEffect, useRef, useState } from 'react'
import { CHARACTER_GRID, charImageUrl } from '@/shared/characterImage'

interface CharacterGridPickerProps {
  /** Currently chosen characters. Single-select callers pass zero or one. */
  selected: string[]
  /** Called with the tile pressed; the caller decides add, remove or replace. */
  onToggle: (name: string) => void
  /** How many may be held at once. At the cap, unselected tiles go inert
   * rather than silently dropping someone's earlier pick. */
  max?: number
}

const COLUMNS = Math.max(...CHARACTER_GRID.map((row) => row.length))

/** Below this the game's 23 columns stop being worth having: a track falls
 * under 30px and the portraits become unreadable smudges.
 *
 * Measured on the picker, not the window — the panel is what constrains the
 * grid, and the same viewport gives it a different width on a tab with a
 * sidebar than on one without. It used to be a `@container` query, which put
 * the decision in CSS where JS could not see it; the arrangement now decides
 * the *order the tiles are rendered in*, so it has to be known here. */
const GAME_LAYOUT_MIN_WIDTH = 700

/** Every character once, A to Z. */
const ROSTER = [...new Set(CHARACTER_GRID.flat().filter((name): name is string => !!name))]
  .sort((a, b) => a.localeCompare(b))

/** The character filter.
 *
 * Given room, the tiles are laid out in the game's own select-screen
 * arrangement — 23 columns, three rows, and the blank cells the game itself
 * leaves (including the centre column it fills with a random-select `?`, which
 * has no meaning in a filter and is rendered as a plain spacer). A face is
 * where a player already expects it.
 *
 * Without room the arrangement is dropped, and with it the only reason to keep
 * the game's order: a roster that is neither positional nor sorted is a list
 * you have to read end to end. So the narrow form is alphabetical, and shows
 * names, because nothing else says which face is which.
 *
 * The order is chosen here rather than with CSS `order` so that the tab order
 * and the visual order stay the same list. Either way the tiles hold the art's
 * real 204:329 ratio and nothing scrolls sideways.
 */
export default function CharacterGridPicker({ selected, onToggle, max = 1 }: CharacterGridPickerProps) {
  const full = selected.length >= max
  const gridRef = useRef<HTMLDivElement>(null)
  // Starts narrow: a roster is readable at any width, where the game grid is
  // only readable above one. jsdom has no ResizeObserver and stays here.
  const [gameLayout, setGameLayout] = useState(false)

  useEffect(() => {
    const element = gridRef.current
    if (!element || typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(([entry]) => {
      setGameLayout(entry.contentRect.width >= GAME_LAYOUT_MIN_WIDTH)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const tile = (name: string) => {
    const url = charImageUrl(name)
    if (!url) return null
    const active = selected.includes(name)
    // At the cap the remaining tiles go dead rather than replacing an earlier
    // pick, which is the same rule the reservation rank picker follows — a
    // silent swap loses a choice the user made on purpose.
    const capped = full && !active
    return (
      <button
        key={name}
        type="button"
        onClick={() => onToggle(name)}
        disabled={capped}
        aria-pressed={active}
        aria-label={name}
        className={`char-grid-tile${active ? ' is-active' : ''}${capped ? ' is-capped' : ''}`}
        title={name}
      >
        <img src={url} alt="" />
        <span className="char-grid-name">{name}</span>
      </button>
    )
  }

  return (
    <div
      ref={gridRef}
      className={`char-grid${gameLayout ? ' is-game-layout' : ''}`}
      role="group"
      aria-label="캐릭터로 거르기"
      style={{ '--char-grid-columns': COLUMNS } as React.CSSProperties}
    >
      {gameLayout
        ? CHARACTER_GRID.flatMap((row, rowIndex) =>
            Array.from({ length: COLUMNS }, (_, column) => {
              const name = row[column]
              return (name && tile(name))
                || <span key={`gap-${rowIndex}-${column}`} className="char-grid-gap" aria-hidden="true" />
            }),
          )
        : ROSTER.map(tile)}
    </div>
  )
}
