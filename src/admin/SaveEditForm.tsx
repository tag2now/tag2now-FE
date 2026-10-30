import { useState } from 'react'
import { ChevronDown, Eye, Users } from 'lucide-react'
import CharacterGridPicker from '@/shared/components/CharacterGridPicker'
import type { SelectOption } from '@/shared/components/Select'
import ToggleGroup from '@/shared/components/ToggleGroup'
import RankField from '@/shared/components/RankField'
import { charImageUrl } from '@/shared/characterImage'
import { isUsed } from '@/shared/saveChars'
import usePopover from '@/shared/hooks/usePopover'
import { faceOfSlot } from '@/admin/adminText'
import type { SaveChar, SaveEdit } from '@/admin/types'

/** Floor ranks need floor points, which start at 9th kyu. */
const FLOOR_RANK_FROM = 1

type Mode = Exclude<SaveEdit['action'], 'restore'>

const MODES: SelectOption<Mode>[] = [
  { value: 'set-rank', label: '캐릭터 계급' },
  { value: 'set-account-rank', label: '계정 계급' },
  { value: 'floor', label: 'floor (최저 계급 올리기)' },
]

const ALL = 'all'

/** Points field: blank keeps them, otherwise a whole number the save can hold. */
const parsePoints = (text: string): number | null | undefined => {
  if (text.trim() === '') return undefined
  const n = Number(text)
  return Number.isInteger(n) && n >= 0 && n <= 65535 ? n : null
}

export default function SaveEditForm({ chars, busy, onChange, onPreview }: {
  chars: SaveChar[]
  busy: boolean
  onChange: () => void
  onPreview: (edit: SaveEdit) => void
}) {
  const [mode, setMode] = useState<Mode>('set-rank')
  const [char, setChar] = useState<number | typeof ALL>(chars.find(isUsed)?.id ?? 0)
  const [rank, setRank] = useState(10)
  const [points, setPoints] = useState('')
  // null: the floor rule picks it
  const [floorRank, setFloorRank] = useState<number | null>(null)
  const [fixPoints, setFixPoints] = useState(false)
  const [refloor, setRefloor] = useState(false)

  // Any change makes the shown preview stale.
  const changed = <T,>(set: (value: T) => void) => (value: T) => {
    set(value)
    onChange()
  }

  const everyone = mode === 'set-rank' && char === ALL
  const parsed = parsePoints(points)
  // "all" sets floor points itself and needs a rank that has them.
  const rankFrom = everyone ? FLOOR_RANK_FROM : 0
  const chosenRank = Math.max(rank, rankFrom)

  const edit = (): SaveEdit => {
    if (mode === 'set-account-rank') return { action: mode, rank: chosenRank }
    if (mode === 'floor') return { action: mode, fix_points: fixPoints, refloor, ...(floorRank === null ? {} : { rank: floorRank }) }
    if (char === ALL) return { action: mode, char, rank: chosenRank }
    return { action: mode, char, rank: chosenRank, ...(parsed === undefined ? {} : { points: parsed as number }) }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || parsed === null) return
    onPreview(edit())
  }

  return (
    <form className="save-section save-edit" onSubmit={submit} aria-label="세이브 수정">
      <h3>수정</h3>
      <ToggleGroup label="수정 종류" value={mode} options={MODES} onChange={changed(setMode)} className="save-modes" />
      <div className="save-edit-fields">
        {mode === 'set-rank' && <CharacterField value={char} chars={chars} onChange={changed(setChar)} />}
        {mode !== 'floor' && (
          <RankField label="계급" value={chosenRank} from={rankFrom} onChange={changed((code: number | null) => setRank(code ?? 0))} />
        )}
        {mode === 'set-rank' && !everyone && (
          <label className="admin-field save-points">
            <span className="field-label">점수 (비우면 그대로)</span>
            <input
              className="input-base"
              inputMode="numeric"
              value={points}
              aria-invalid={parsed === null}
              onChange={(event) => changed(setPoints)(event.target.value)}
            />
          </label>
        )}
        {mode === 'floor' && (
          <RankField
            label="floor 계급"
            value={floorRank}
            from={FLOOR_RANK_FROM}
            onChange={changed(setFloorRank)}
            autoLabel="자동 (도달 계급의 두 단계 아래)"
          />
        )}
      </div>
      {mode === 'floor' && (
        <div className="save-checks">
          <label className="save-check">
            <input type="checkbox" checked={fixPoints} onChange={(event) => changed(setFixPoints)(event.target.checked)} />
            floor 계급에 있는 캐릭터의 점수도 채우기
          </label>
          <label className="save-check">
            <input type="checkbox" checked={refloor} onChange={(event) => changed(setRefloor)(event.target.checked)} />
            강등으로 보이는 캐릭터도 올리기
          </label>
        </div>
      )}
      {everyone && <p className="admin-hint">모든 캐릭터와 계정 계급을 이 계급의 floor 점수, 연승 0으로 맞춥니다.</p>}
      {parsed === null && <p className="admin-error">점수는 0에서 65535 사이의 정수여야 합니다.</p>}
      <button type="submit" className="btn-primary" disabled={busy || parsed === null}>
        <Eye size={14} aria-hidden="true" /> 미리보기 &amp; 적용
      </button>
    </form>
  )
}

/** The leaderboard's character filter, as a single choice: a button showing
 * the pick that opens the game-layout grid, with 전체 캐릭터 beside it. */
function CharacterField({ value, chars, onChange }: {
  value: number | typeof ALL
  chars: SaveChar[]
  onChange: (value: number | typeof ALL) => void
}) {
  const [open, setOpen, rootRef] = usePopover()
  const face = value === ALL ? null : faceOfSlot(value, chars)
  const portrait = face ? charImageUrl(face) : null

  const pick = (name: string) => {
    const slot = slotOfFace(name, chars)
    if (slot === undefined) return
    onChange(slot)
    setOpen(false)
  }

  const pickEveryone = () => {
    onChange(ALL)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="save-picker-field">
      <span className="field-label">캐릭터</span>
      <div className="save-picker-row">
        <button
          type="button"
          className={`lb-char-toggle${face ? ' is-active' : ''}`}
          aria-expanded={open}
          aria-controls="save-character-picker"
          aria-label={`캐릭터: ${face ?? '전체 캐릭터'}`}
          onClick={() => setOpen((current) => !current)}
        >
          {portrait ? <img src={portrait} alt="" className="char-art lb-char-toggle-portrait" /> : <Users size={14} aria-hidden="true" />}
          <span>{face ?? '캐릭터 고르기'}</span>
          <ChevronDown size={14} aria-hidden="true" className={open ? 'is-open' : undefined} />
        </button>
        <button
          type="button"
          className={`lb-char-toggle${value === ALL ? ' is-active' : ''}`}
          aria-pressed={value === ALL}
          onClick={pickEveryone}
        >
          전체 캐릭터
        </button>
      </div>
      {open && (
        <div id="save-character-picker" className="lb-picker save-character-picker">
          {/* A pick replaces the current one, so no tile is ever capped:
              the leaderboard's max of 1 would leave every other face dead. */}
          <CharacterGridPicker selected={face ? [face] : []} onToggle={pick} max={Infinity} label="수정할 캐릭터" />
        </div>
      )}
    </div>
  )
}

const slotOfFace = (face: string, chars: SaveChar[]) => chars.find((c) => c.character === face)?.id
