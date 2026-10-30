import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { Gamepad2, Loader2, Search } from 'lucide-react'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import useConfirm from '@/shared/hooks/useConfirm'
import { errorText, warnEmpty } from '@/admin/adminText'
import { editSave, fetchSave, fetchSaveBackups, fetchSaveLog } from '@/admin/saveApi'
import SaveEditForm from '@/admin/SaveEditForm'
import SavePreviewCard from '@/admin/SavePreviewCard'
import { SaveSummary, SaveCharacters, BackupList, AuditLog } from '@/admin/SaveDetails'
import type { SaveAuditRecord, SaveBackup, SaveEdit, SaveInfo, SavePreview, SaveWriteResult } from '@/admin/types'

type Loaded = { save: SaveInfo, backups: SaveBackup[], log: SaveAuditRecord[] }

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
  const [preview, setPreview] = useState<SavePreview | null>(null)
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

  const apply = async ({ edit, answer }: SavePreview) => {
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
          <SaveEditForm
            key={loaded.save.username}
            chars={loaded.save.chars}
            busy={busy}
            onChange={() => setPreview(null)}
            onPreview={(edit) => previewEdit(loaded.save, edit)}
          />
          {preview && (
            <SavePreviewCard
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
