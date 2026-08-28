import CharacterGridPicker from '@/shared/components/CharacterGridPicker'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  character: string
  onCharacterChange: (value: string) => void
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
  collapsed, onToggleCollapsed, collapsible,
  filtering, shown, total,
}: Props) {
  return (
    <div className="mb-3">
      {/* Selecting the active character again clears the filter, so "" is the
          off state the picker falls back to. */}
      <CharacterGridPicker value={character} onChange={onCharacterChange} defaultValue="" />

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <label className="sr-only" htmlFor="lb-search">플레이어 검색</label>
        <input
          id="lb-search"
          type="search"
          className="input-base px-2 py-1 text-sm flex-1 min-w-40"
          placeholder="플레이어 이름 검색"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        {/* While filtering, the whole board is already searched, so the toggle
            would claim to change a result set it cannot affect. */}
        {!filtering && collapsible && (
          <button className="btn-ghost" onClick={onToggleCollapsed} aria-pressed={collapsed}>
            {collapsed ? '전체 보기' : '상위 100위만'}
          </button>
        )}

        <span className="lb-count text-xs font-semibold tracking-[0.12em] text-txt-dim ml-auto">
          {shown} / {total}
        </span>
      </div>
    </div>
  )
}
