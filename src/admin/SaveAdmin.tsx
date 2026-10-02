import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { ChevronDown, Eye, Gamepad2, Loader2, RotateCcw, Search, Users } from 'lucide-react'
import CharacterGridPicker from '@/shared/components/CharacterGridPicker'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import RankImage from '@/shared/components/RankImage'
import type { SelectOption } from '@/shared/components/Select'
import ToggleGroup from '@/shared/components/ToggleGroup'
import { charImageUrl } from '@/shared/characterImage'
import { rankBands, type RankBand as RankBandRows } from '@/shared/rankTiers'
import { tierHex } from '@/shared/tierColors'
import useConfirm from '@/shared/hooks/useConfirm'
import { RANK_ORDER } from '@/reservation/reservationLabels'
import { errorText, formatInstant, warnEmpty } from '@/admin/adminText'
import { editSave, fetchSave, fetchSaveBackups, fetchSaveLog } from '@/admin/saveApi'
import type { SaveAuditRecord, SaveBackup, SaveChar, SaveEdit, SaveInfo, SaveWriteResult, SlotState } from '@/admin/types'

/** RANK_ORDER is indexed by the game's rank code. */
const rankName = (code: number) => RANK_ORDER[code] ?? `계급 ${code}`

/** A character's portrait; the name stays as its alt text and tooltip. */
function Portrait({ name }: { name: string }) {
  const url = charImageUrl(name)
  if (!url) return <span>{name}</span>
  return <img src={url} alt={name} title={name} className="char-art save-portrait" loading="lazy" />
}

/** A rank's banner by name. RankImage draws a plate for ranks with no art. */
const Rank = ({ name }: { name: string }) => <RankImage rankInfo={{ name }} className="save-rank" />

const RankCode = ({ code }: { code: number }) => <Rank name={rankName(code)} />

/** Floor ranks need floor points, which start at 9th kyu. */
const FLOOR_RANK_FROM = 1

type Loaded = { save: SaveInfo, backups: SaveBackup[], log: SaveAuditRecord[] }

/** A preview, and the edit that produced it --- applying sends that edit, not
 * whatever the form says by then. */
type Preview = { edit: SaveEdit, answer: SaveWriteResult }

/** A player's TTT2 save: look it up, preview an edit, apply it.
 *
 * Every write is two requests. The preview answers what would change and the
 * save's sha256; the write sends that sha256 back, and the server refuses it if
 * the game saved in between. */
export default function SaveAdmin({ password, onMissingPassword }: {
  password: string
  /** Every request carries the password; without it, the page says so instead. */
  onMissingPassword: () => void
}) {
  const [target, setTarget] = useState('')
  const targetField = useRef<HTMLInputElement>(null)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { confirm, request: confirmRequest, onConfirm, onCancel } = useConfirm()

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  const load = async (username: string) => {
    const [save, backups, log] = await Promise.all([
      fetchSave(username, password), fetchSaveBackups(username, password), fetchSaveLog(username, password),
    ])
    setLoaded({ save, backups, log })
  }

  const lookup = (event: React.FormEvent) => {
    event.preventDefault()
    const name = target.trim()
    if (busy) return
    if (!name) return warnEmpty(targetField.current, '플레이어 아이디를 입력하세요.')
    if (!password) return onMissingPassword()
    setLoaded(null)
    setPreview(null)
    run(() => load(name))
  }

  // Always against the save that was looked up, by the name the server gave it.
  const previewEdit = (save: SaveInfo, edit: SaveEdit) => {
    if (!password) return onMissingPassword()
    setPreview(null)
    run(async () => setPreview({ edit, answer: await editSave(save.username, password, edit, null) }))
  }

  const apply = async ({ edit, answer }: Preview) => {
    if (!password) return onMissingPassword()
    const agreed = await confirm({
      title: `${answer.username} 세이브에 적용할까요?`,
      body: '쓰기 직전의 세이브를 백업합니다. 아래 백업 목록에서 되돌릴 수 있습니다.',
      confirmLabel: '적용',
      tone: 'danger',
    })
    if (!agreed) return
    run(async () => {
      const done = await editSave(answer.username, password, edit, answer.sha256)
      setPreview(null)
      reportWrite(done)
      await load(answer.username)
    })
  }

  return (
    <div className="panel">
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><Gamepad2 size={15} aria-hidden="true" /></span>
          <div><h2>세이브 관리</h2><p>TTT2 세이브의 계급을 조회하고 고칩니다</p></div>
        </div>
      </div>

      <form className="admin-lookup" onSubmit={lookup} aria-busy={busy}>
        <label className="admin-field">
          <span className="field-label">플레이어 아이디</span>
          <input
            ref={targetField}
            className="input-base"
            placeholder="대소문자 무관"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={64}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </label>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <Loader2 size={14} aria-hidden="true" className="animate-spin" /> : <Search size={14} aria-hidden="true" />}
          세이브 조회
        </button>
      </form>

      {error && <p role="alert" className="admin-error">{error}</p>}

      {loaded && (
        <>
          <SaveSummary save={loaded.save} />
          <SaveCharacters chars={loaded.save.chars} />
          <EditForm
            key={loaded.save.username}
            chars={loaded.save.chars}
            busy={busy}
            onChange={() => setPreview(null)}
            onPreview={(edit) => previewEdit(loaded.save, edit)}
          />
          {preview && (
            <PreviewCard
              preview={preview}
              chars={loaded.save.chars}
              busy={busy}
              onApply={() => apply(preview)}
              onDiscard={() => setPreview(null)}
            />
          )}
          <BackupList backups={loaded.backups} busy={busy} onRestore={(label) => previewEdit(loaded.save, { action: 'restore', label })} />
          <AuditLog records={loaded.log} />
        </>
      )}

      {confirmRequest && createPortal(
        <ConfirmDialog request={confirmRequest} onConfirm={onConfirm} onCancel={onCancel} />,
        document.body,
      )}
    </div>
  )
}

function reportWrite(done: SaveWriteResult) {
  if (!done.result) {
    toast('바뀌는 것이 없어 쓰지 않았습니다.')
    return
  }
  if (!done.result.landed) {
    toast.error('쓰는 사이 게임이 저장해서 수정이 반영되지 않았습니다. 다시 조회해 주세요.')
    return
  }
  toast.success(`적용했습니다. 이전 세이브는 ${done.result.backup} 백업에 있습니다.`)
}

function onlineText(online: boolean | null): string {
  if (online === null) return '확인할 수 없음'
  return online ? '접속 중 (수정할 수 없음)' : '오프라인'
}

function SaveSummary({ save }: { save: SaveInfo }) {
  return (
    <section className="admin-account" aria-label="조회한 세이브">
      <h3>{save.username} <small>data_id {save.data_id}</small></h3>
      <dl>
        <dt>계정 계급</dt><dd className="save-inline"><RankCode code={save.account_rank} /> {save.progress}/11</dd>
        <dt>전적</dt><dd>{save.total}판 {save.wins}승 {save.losses}패</dd>
        <dt>마지막 저장</dt><dd>{formatInstant(save.saved_at)}</dd>
        <dt>RPCS3 접속</dt><dd className={save.online ? 'is-banned' : undefined}>{onlineText(save.online)}</dd>
        <dt>체크섬</dt><dd className={save.checksum_ok ? undefined : 'is-banned'}>{save.checksum_ok ? '정상' : '불일치'}</dd>
      </dl>
    </section>
  )
}

const isUsed = (char: SaveChar) => char.rank > 0 || char.wins + char.losses > 0

/** Highest rank first; within a rank, more points, then more matches played. */
const byRank = (a: SaveChar, b: SaveChar) =>
  b.rank - a.rank || b.points - a.points || (b.wins + b.losses) - (a.wins + a.losses) || a.id - b.id

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

function SaveCharacters({ chars }: { chars: SaveChar[] }) {
  const [showAll, setShowAll] = useState(false)
  const shown = (showAll ? [...chars] : chars.filter(isUsed)).sort(byRank)

  return (
    <section className="save-section" aria-label="캐릭터 목록">
      <div className="save-section-head">
        <h3>캐릭터</h3>
        <label className="save-check">
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
          전체 {chars.length}칸 보기
        </label>
      </div>
      {shown.length === 0
        ? <p className="admin-notice">계급이 있거나 대전한 캐릭터가 없습니다.</p>
        : (
          <div className="save-table-wrap">
            <table className="save-table">
              <thead><tr><th scope="col">캐릭터</th><th scope="col">계급</th><th scope="col">점수</th><th scope="col">연승</th><th scope="col">전적</th></tr></thead>
              <tbody>
                {shown.map((char) => (
                  <tr key={char.id}>
                    <td><Portrait name={faceOf(char)} /></td>
                    <td><Rank name={char.rank_name} /></td>
                    <td>{char.points}</td>
                    <td>{signed(char.streak)}</td>
                    <td>{char.wins}승 {char.losses}패</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </section>
  )
}

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

function EditForm({ chars, busy, onChange, onPreview }: {
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
      <button type="submit" className="btn-ghost" disabled={busy || parsed === null}>
        <Eye size={14} aria-hidden="true" /> 미리보기
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

/** A picker that drops over the form rather than pushing it down. It closes on
 * a press outside it or on Escape, which hands focus back to its toggle --- the
 * first button in it. */
function usePopover() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      rootRef.current?.querySelector('button')?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return [open, setOpen, rootRef] as const
}

/** Slides an open panel left until it ends inside the edit form, for a field
 * far enough right that the panel would hang off it. The panel is never wider
 * than the form, so it always fits. */
function useInsideForm(open: boolean) {
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!open || !panel) return
    const form = panel.closest('form')!.getBoundingClientRect()
    const overhang = panel.getBoundingClientRect().right - form.right
    if (overhang > 0) panel.style.left = `${-overhang}px`
  }, [open])

  return panelRef
}

/** The reservation form's rank picker, as a single choice: bands strongest
 * first, each rank drawn. Ranks below `from` are shown but not offered. */
function RankField({ label, value, from, onChange, autoLabel }: {
  label: string
  value: number | null
  from: number
  onChange: (value: number | null) => void
  /** Offers "no rank" under this name, answered as null. */
  autoLabel?: string
}) {
  const [open, setOpen, rootRef] = usePopover()
  const panelRef = useInsideForm(open)
  const choose = (code: number | null) => {
    onChange(code)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="save-picker-field save-rank-field">
      <span className="field-label">{label}</span>
      <button
        type="button"
        className="input-base save-rank-toggle"
        aria-expanded={open}
        aria-label={`${label}: ${value === null ? autoLabel : rankName(value)}`}
        onClick={() => setOpen((current) => !current)}
      >
        {value === null ? <span>{autoLabel}</span> : <RankCode code={value} />}
        <ChevronDown size={15} aria-hidden="true" className={`text-primary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div ref={panelRef} className="rank-picker-panel save-rank-panel">
          {autoLabel && (
            <button
              type="button"
              className={`save-rank-auto${value === null ? ' is-active' : ''}`}
              aria-pressed={value === null}
              onClick={() => choose(null)}
            >
              {autoLabel}
            </button>
          )}
          <div className="rank-picker-bands max-h-72 overflow-y-auto pr-1">
            {rankBands().map((band) => <RankBand key={band.tier} band={band} value={value} from={from} onChoose={choose} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function RankBand({ band, value, from, onChoose }: {
  band: RankBandRows
  value: number | null
  from: number
  onChoose: (code: number) => void
}) {
  return (
    <div className="rank-band" style={{ '--tier': tierHex(band.tier) } as React.CSSProperties}>
      <span className="rank-band-label">{band.tier}</span>
      <div className="rank-band-grid">
        {band.rows.flat().map((rank, cell) => (rank === null
          ? <span key={`gap-${cell}`} aria-hidden="true" />
          : <RankOption key={rank} rank={rank} value={value} from={from} onChoose={onChoose} />))}
      </div>
    </div>
  )
}

function RankOption({ rank, value, from, onChoose }: {
  rank: string
  value: number | null
  from: number
  onChoose: (code: number) => void
}) {
  const code = RANK_ORDER.indexOf(rank)
  const selected = code === value
  const offered = code >= from
  return (
    <button
      type="button"
      aria-label={rank}
      aria-pressed={selected}
      disabled={!offered}
      onClick={() => onChoose(code)}
      className={`rank-option${selected ? ' selected' : ''}${offered ? '' : ' opacity-40'}`}
    >
      <RankImage rankInfo={{ name: rank }} className="rank-option-art" />
      <span className={`truncate text-[11px] tracking-[0.03em] ${selected ? 'text-primary-text' : 'text-txt-dim'}`}>{rank}</span>
    </button>
  )
}

/* The backend and the save tool both name slot 0x33 "Michelle" a second time
 * (0x2E is the first). The grid has one Michelle and one face no slot is named
 * after, Angel, so that is the face slot 0x33 gets. Not yet confirmed in game. */
const ANGEL_SLOT = 0x33

/** The face the grid and the tables draw for a slot. */
const faceOf = (char: { id: number, character: string }) => (char.id === ANGEL_SLOT ? 'Angel' : char.character)

const faceOfSlot = (slot: number, chars: SaveChar[]) => {
  const char = chars.find((c) => c.id === slot)
  return char ? faceOf(char) : `캐릭터 ${slot}`
}

const slotOfFace = (face: string, chars: SaveChar[]) => chars.find((c) => faceOf(c) === face)?.id

/** What is being changed: who, then the rank they go to. */
function EditTarget({ edit, chars }: { edit: SaveEdit, chars: SaveChar[] }) {
  switch (edit.action) {
    case 'set-rank':
      return edit.char === ALL
        ? <>전체 캐릭터 → <RankCode code={edit.rank} /></>
        : <><Portrait name={faceOfSlot(edit.char, chars)} /> → <RankCode code={edit.rank} /></>
    case 'set-account-rank':
      return <>계정 계급 → <RankCode code={edit.rank} /></>
    case 'floor':
      return edit.rank === undefined ? <>floor (자동)</> : <>floor → <RankCode code={edit.rank} /></>
    case 'restore':
      return <>{edit.label} 백업으로 복원</>
  }
}

function Slot({ slot }: { slot: SlotState }) {
  return <span className="save-inline"><Rank name={slot.rank_name} /> {slot.points}점 · {signed(slot.streak)}</span>
}

/** Why the server would refuse this write, so the button is not offered for it. */
function blocker(answer: SaveWriteResult): string | null {
  if (answer.online) return '게임에 접속 중인 계정은 수정할 수 없습니다. 접속을 끊은 뒤 다시 미리보기 하세요.'
  if (answer.floor?.likely_demoted) return '이전 floor 뒤에 강등된 캐릭터로 보입니다. 그래도 올리려면 "강등으로 보이는 캐릭터도 올리기"를 선택하세요.'
  return null
}

function PreviewCard({ preview: { edit, answer }, chars, busy, onApply, onDiscard }: {
  preview: Preview
  chars: SaveChar[]
  busy: boolean
  onApply: () => void
  onDiscard: () => void
}) {
  const { changes } = answer
  const nothing = !changes.account_rank && changes.chars.length === 0
  const refused = blocker(answer)

  return (
    <section className="save-section save-preview" aria-label="미리보기">
      <h3>미리보기 <small className="save-inline"><EditTarget edit={edit} chars={chars} /></small></h3>
      {answer.floor && (
        <p className="admin-notice save-inline">
          도달 <RankCode code={answer.floor.reached} /> → floor <RankCode code={answer.floor.floor} />, {answer.floor.raised}칸 올림
          {answer.floor.points_fixed > 0 && `, ${answer.floor.points_fixed}칸 점수 보정`}
        </p>
      )}
      {answer.online === null && <p className="save-warning">접속 여부를 확인하지 못했습니다. 적용하면 거부될 수 있습니다.</p>}
      {refused && <p className="save-warning">{refused}</p>}
      {nothing
        ? <p className="admin-notice">바뀌는 것이 없습니다.</p>
        : (
          <div className="save-table-wrap">
            <table className="save-table">
              <thead><tr><th scope="col">대상</th><th scope="col">지금</th><th scope="col">바뀐 뒤</th></tr></thead>
              <tbody>
                {changes.account_rank && (
                  <tr>
                    <td>계정 계급</td>
                    <td><RankCode code={changes.account_rank.before} /></td>
                    <td><RankCode code={changes.account_rank.after} /></td>
                  </tr>
                )}
                {changes.chars.map((change) => (
                  <tr key={change.id}>
                    <td><Portrait name={faceOf(change)} /></td>
                    <td><Slot slot={change.before} /></td>
                    <td><Slot slot={change.after} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <div className="save-actions">
        <button type="button" className="btn-danger" onClick={onApply} disabled={busy || nothing || refused !== null}>적용</button>
        <button type="button" className="btn-ghost" onClick={onDiscard} disabled={busy}>닫기</button>
      </div>
    </section>
  )
}

function BackupList({ backups, busy, onRestore }: {
  backups: SaveBackup[]
  busy: boolean
  onRestore: (label: string) => void
}) {
  // Labels are timestamps or names given on the command line; newest first
  // reads best for the automatic ones, which are most of them.
  const newestFirst = [...backups].reverse()

  return (
    <section className="save-section" aria-label="백업">
      <h3>백업 <small>{backups.length}개</small></h3>
      {newestFirst.length === 0
        ? <p className="admin-notice">백업이 없습니다. 수정할 때마다 하나씩 생깁니다.</p>
        : (
          <ul className="save-backups">
            {newestFirst.map((backup) => (
              <li key={backup.label}>
                <span className="save-backup-label">{backup.label}</span>
                <span className="save-backup-meta save-inline">
                  {backup.total === null
                    ? '크기가 맞지 않는 파일'
                    : <>{backup.total}판 · 계정 <RankCode code={backup.account_rank ?? 0} /></>}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onRestore(backup.label)}
                  disabled={busy || backup.total === null}
                  aria-label={`${backup.label} 복원 미리보기`}
                >
                  <RotateCcw size={14} aria-hidden="true" /> 복원 미리보기
                </button>
              </li>
            ))}
          </ul>
        )}
    </section>
  )
}

// Integrity fields every write records; they say nothing an admin acts on.
const QUIET_DETAILS = new Set(['data_id', 'md5_before', 'md5_after', 'checksum', 'verified'])

const detailText = (details: Record<string, unknown>) =>
  Object.entries(details)
    .filter(([key, value]) => !QUIET_DETAILS.has(key) && value !== null)
    .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' ')

function AuditLog({ records }: { records: SaveAuditRecord[] }) {
  return (
    <section className="save-section" aria-label="수정 기록">
      <h3>수정 기록 <small>최근 {records.length}건</small></h3>
      {records.length === 0
        ? <p className="admin-notice">기록이 없습니다.</p>
        : (
          <div className="save-table-wrap">
            <table className="save-table">
              <thead><tr><th scope="col">시각</th><th scope="col">누가</th><th scope="col">작업</th><th scope="col">내용</th></tr></thead>
              <tbody>
                {[...records].reverse().map((record, index) => (
                  <tr key={`${record.ts}-${index}`}>
                    <td>{record.ts.replace('T', ' ')}</td>
                    <td>{record.user}</td>
                    <td>{record.action}</td>
                    <td className="save-detail">{detailText(record.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </section>
  )
}
