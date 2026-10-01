import { useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { Eye, Gamepad2, Loader2, RotateCcw, Search } from 'lucide-react'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import Select, { type SelectOption } from '@/shared/components/Select'
import useConfirm from '@/shared/hooks/useConfirm'
import { RANK_ORDER } from '@/reservation/reservationLabels'
import { errorText, formatInstant } from '@/admin/adminText'
import { editSave, fetchSave, fetchSaveBackups, fetchSaveLog } from '@/admin/saveApi'
import type { SaveAuditRecord, SaveBackup, SaveChar, SaveEdit, SaveInfo, SaveWriteResult, SlotState } from '@/admin/types'

/** RANK_ORDER is indexed by the game's rank code. */
const rankName = (code: number) => RANK_ORDER[code] ?? `계급 ${code}`

const rankOptions = (from: number): SelectOption[] =>
  RANK_ORDER.slice(from).map((name, index) => ({ value: String(from + index), label: `${from + index} ${name}` }))

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
export default function SaveAdmin({ password }: { password: string }) {
  const [target, setTarget] = useState('')
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
    if (busy || !name || !password) return
    setLoaded(null)
    setPreview(null)
    run(() => load(name))
  }

  // Always against the save that was looked up, by the name the server gave it.
  const previewEdit = (save: SaveInfo, edit: SaveEdit) => {
    setPreview(null)
    run(async () => setPreview({ edit, answer: await editSave(save.username, password, edit, null) }))
  }

  const apply = async ({ edit, answer }: Preview) => {
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
        <button type="submit" className="btn-primary" disabled={busy || !target.trim() || !password}>
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
        <dt>계정 계급</dt><dd>{rankName(save.account_rank)} ({save.progress}/11)</dd>
        <dt>전적</dt><dd>{save.total}판 {save.wins}승 {save.losses}패</dd>
        <dt>마지막 저장</dt><dd>{formatInstant(save.saved_at)}</dd>
        <dt>RPCS3 접속</dt><dd className={save.online ? 'is-banned' : undefined}>{onlineText(save.online)}</dd>
        <dt>체크섬</dt><dd className={save.checksum_ok ? undefined : 'is-banned'}>{save.checksum_ok ? '정상' : '불일치'}</dd>
      </dl>
    </section>
  )
}

const isUsed = (char: SaveChar) => char.rank > 0 || char.wins + char.losses > 0

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

function SaveCharacters({ chars }: { chars: SaveChar[] }) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? chars : chars.filter(isUsed)

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
                    <td>{char.id} {char.character}</td>
                    <td>{char.rank} {char.rank_name}</td>
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

type Mode = SaveEdit['action']

const MODES: SelectOption<Exclude<Mode, 'restore'>>[] = [
  { value: 'set-rank', label: '캐릭터 계급' },
  { value: 'set-account-rank', label: '계정 계급' },
  { value: 'floor', label: 'floor (최저 계급 올리기)' },
]

const ALL = 'all'
const AUTO = 'auto'

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
  const [mode, setMode] = useState<Exclude<Mode, 'restore'>>('set-rank')
  const [char, setChar] = useState(String(chars.find(isUsed)?.id ?? 0))
  const [rank, setRank] = useState('10')
  const [points, setPoints] = useState('')
  const [floorRank, setFloorRank] = useState(AUTO)
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
  const chosenRank = Math.max(Number(rank), rankFrom)

  const edit = (): SaveEdit => {
    if (mode === 'set-account-rank') return { action: mode, rank: chosenRank }
    if (mode === 'floor') {
      return { action: mode, fix_points: fixPoints, refloor, ...(floorRank === AUTO ? {} : { rank: Number(floorRank) }) }
    }
    if (everyone) return { action: mode, char: ALL, rank: chosenRank }
    return { action: mode, char: Number(char), rank: chosenRank, ...(parsed === undefined ? {} : { points: parsed as number }) }
  }

  const charOptions: SelectOption[] = [
    { value: ALL, label: '전체 캐릭터 (계정 계급 포함)' },
    ...chars.map((c) => ({ value: String(c.id), label: `${c.id} ${c.character}` })),
  ]

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || parsed === null) return
    onPreview(edit())
  }

  return (
    <form className="save-section save-edit" onSubmit={submit} aria-label="세이브 수정">
      <h3>수정</h3>
      <div className="save-edit-fields">
        <Select label="수정 종류" value={mode} options={MODES} onChange={changed(setMode)} />
        {mode === 'set-rank' && <Select label="캐릭터" value={char} options={charOptions} onChange={changed(setChar)} />}
        {mode !== 'floor' && (
          <Select label="계급" value={String(chosenRank)} options={rankOptions(rankFrom)} onChange={changed(setRank)} />
        )}
        {mode === 'set-rank' && !everyone && (
          <label className="admin-field">
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
          <>
            <Select
              label="floor 계급"
              value={floorRank}
              options={[{ value: AUTO, label: '자동 (도달 계급의 두 단계 아래)' }, ...rankOptions(FLOOR_RANK_FROM)]}
              onChange={changed(setFloorRank)}
            />
            <label className="save-check">
              <input type="checkbox" checked={fixPoints} onChange={(event) => changed(setFixPoints)(event.target.checked)} />
              floor 계급에 있는 캐릭터의 점수도 채우기
            </label>
            <label className="save-check">
              <input type="checkbox" checked={refloor} onChange={(event) => changed(setRefloor)(event.target.checked)} />
              강등으로 보이는 캐릭터도 올리기
            </label>
          </>
        )}
      </div>
      {everyone && <p className="admin-hint">모든 캐릭터와 계정 계급을 이 계급의 floor 점수, 연승 0으로 맞춥니다.</p>}
      {parsed === null && <p className="admin-error">점수는 0에서 65535 사이의 정수여야 합니다.</p>}
      <button type="submit" className="btn-ghost" disabled={busy || parsed === null}>
        <Eye size={14} aria-hidden="true" /> 미리보기
      </button>
    </form>
  )
}

const charLabel = (char: number | 'all', chars: SaveChar[]) =>
  char === ALL ? '전체 캐릭터' : chars.find((c) => c.id === char)?.character ?? `캐릭터 ${char}`

function describeEdit(edit: SaveEdit, chars: SaveChar[]): string {
  switch (edit.action) {
    case 'set-rank':
      return `${charLabel(edit.char, chars)} → ${rankName(edit.rank)}`
    case 'set-account-rank':
      return `계정 계급 → ${rankName(edit.rank)}`
    case 'floor':
      return edit.rank === undefined ? 'floor (자동)' : `floor → ${rankName(edit.rank)}`
    case 'restore':
      return `${edit.label} 백업으로 복원`
  }
}

const slotText = (slot: SlotState) => `${slot.rank_name} · ${slot.points}점 · ${signed(slot.streak)}`

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
      <h3>미리보기 <small>{describeEdit(edit, chars)}</small></h3>
      {answer.floor && (
        <p className="admin-notice">
          도달 {rankName(answer.floor.reached)} → floor {rankName(answer.floor.floor)}, {answer.floor.raised}칸 올림
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
                    <td>{rankName(changes.account_rank.before)}</td>
                    <td>{rankName(changes.account_rank.after)}</td>
                  </tr>
                )}
                {changes.chars.map((change) => (
                  <tr key={change.id}>
                    <td>{change.id} {change.character}</td>
                    <td>{slotText(change.before)}</td>
                    <td>{slotText(change.after)}</td>
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
                <span className="save-backup-meta">
                  {backup.total === null ? '크기가 맞지 않는 파일' : `${backup.total}판 · 계정 ${rankName(backup.account_rank ?? 0)}`}
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
