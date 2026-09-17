import { useState } from 'react'
import { ChevronDown, Users, X } from 'lucide-react'
import CharacterGridPicker from '@/shared/components/CharacterGridPicker'
import { charImageUrl } from '@/shared/characterImage'
import { TIER_HEX } from '@/shared/tierColors'
import type { SortKey } from '@/shared/util/leaderboardFilter'

const SORTS: { key: SortKey, label: string }[] = [
  { key: 'rank', label: '순위' },
  { key: 'winRate', label: '승률' },
  { key: 'matches', label: '판수' },
]

interface Props {
  search: string
  onSearchChange: (value: string) => void
  character: string
  onCharacterChange: (value: string) => void
  tier: string
  onTierChange: (value: string) => void
  /** Bands actually present on the board, in promotion order. */
  tiers: string[]
  sort: SortKey
  onSortChange: (value: SortKey) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  /** False when the board is short enough that collapsing it would change nothing. */
  collapsible: boolean
  filtering: boolean
  shown: number
  total: number
}

export default function LeaderboardControls({
  search, onSearchChange,
  character, onCharacterChange,
  tier, onTierChange, tiers,
  sort, onSortChange,
  collapsed, onToggleCollapsed, collapsible,
  filtering, shown, total,
}: Props) {
  // The grid is 60 portraits with no heading, and it used to open the page:
  // before you reached the ranking you scrolled past three dense rows of faces
  // that never said what they were for. It is a filter, so it behaves like one
  // — folded away, with its state on the button that opens it.
  const [pickerOpen, setPickerOpen] = useState(false)
  const portrait = character ? charImageUrl(character) : null

  return (
    <div className="lb-controls">
      <div className="lb-toolbar">
        <label className="sr-only" htmlFor="lb-search">플레이어 검색</label>
        <input
          id="lb-search"
          type="search"
          className="input-base lb-search"
          placeholder="플레이어 이름 검색"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <button
          type="button"
          className={`lb-char-toggle${character ? ' is-active' : ''}`}
          aria-expanded={pickerOpen}
          aria-controls="lb-character-picker"
          // The visible label is the character's name once one is picked, which
          // on its own is indistinguishable from that character's tile inside
          // the grid. The name still contains the visible text, so it satisfies
          // Label in Name while saying what the control actually does.
          aria-label={character ? `캐릭터 필터: ${character}` : '캐릭터 필터'}
          onClick={() => setPickerOpen((open) => !open)}
        >
          {portrait
            ? <img src={portrait} alt="" className="char-art lb-char-toggle-portrait" />
            : <Users size={14} aria-hidden="true" />}
          <span>{character || '캐릭터'}</span>
          <ChevronDown size={14} aria-hidden="true" className={pickerOpen ? 'is-open' : undefined} />
        </button>

        {/* Clearing is its own control rather than a second trip through the
            grid: with the grid folded away, deselecting had no reachable UI. */}
        {character && (
          <button type="button" className="lb-char-clear" aria-label={`${character} 필터 해제`} onClick={() => onCharacterChange('')}>
            <X size={13} aria-hidden="true" />
          </button>
        )}

        {/* Ordering, not filtering: every row stays, the sequence changes.
            Collapsing applies after the sort, so "top 100 by 승률" is the
            hundred best win rates rather than the top hundred ranks reshuffled. */}
        <div className="lb-sort" role="group" aria-label="정렬 기준">
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              className={sort === key ? 'is-active' : undefined}
              onClick={() => onSortChange(key)}
            >{label}</button>
          ))}
        </div>

        {/* While filtering, the whole board is already searched, so the toggle
            would claim to change a result set it cannot affect. */}
        {!filtering && collapsible && (
          <button className="btn-ghost" onClick={onToggleCollapsed} aria-pressed={collapsed}>
            {collapsed ? '전체 보기' : '상위 100위만'}
          </button>
        )}

        <span className="lb-count">{shown} / {total}</span>
      </div>

      {/* One chip per band actually on the board. Colour repeats the band's own
          hue, and the label names it, so the filter is not colour alone. */}
      {tiers.length > 1 && (
        <div className="lb-tiers" role="group" aria-label="계급으로 거르기">
          <button
            type="button"
            aria-pressed={tier === ''}
            className={`lb-tier${tier === '' ? ' is-active' : ''}`}
            onClick={() => onTierChange('')}
          >전체</button>
          {tiers.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={tier === name}
              className={`lb-tier${tier === name ? ' is-active' : ''}`}
              style={{ '--tier': TIER_HEX[name] ?? 'var(--color-txt-dim)' } as React.CSSProperties}
              onClick={() => onTierChange(tier === name ? '' : name)}
            >{name}</button>
          ))}
        </div>
      )}

      {pickerOpen && (
        <div id="lb-character-picker" className="lb-picker">
          {/* One at a time here, and pressing the chosen tile again clears it. */}
          <CharacterGridPicker
            selected={character ? [character] : []}
            onToggle={(name) => onCharacterChange(character === name ? '' : name)}
          />
        </div>
      )}
    </div>
  )
}
