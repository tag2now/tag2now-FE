import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { Megaphone, Pencil, Save, Trash2, X } from 'lucide-react'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import useConfirm from '@/shared/hooks/useConfirm'
import { apiUrl } from '@/shared/util/api'
import { errorText, formatInstant, warnEmpty } from '@/admin/adminText'
import { createPopup, deletePopup, listPopups, updatePopup } from '@/popup/popupApi'
import type { AdminPopup, PopupDraft } from '@/popup/types'

const MAX_TITLE_LENGTH = 100
const MAX_BODY_LENGTH = 2000
/** The backend's limit. Checked here too: past nginx's limit the answer is a page, not a sentence. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif'

/** The popups visitors see on opening the site, and writing them. No password: it
 * touches only this site's records. */
export default function PopupAdmin() {
  const [popups, setPopups] = useState<AdminPopup[] | null>(null)
  const [editing, setEditing] = useState<AdminPopup | null>(null)
  // A new key after each save empties the form, the chosen file included.
  const [saves, setSaves] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { confirm, request: confirmRequest, onConfirm, onCancel } = useConfirm()

  const load = useCallback(async () => {
    try {
      setPopups(await listPopups())
      setError(null)
    } catch (caught) {
      setError(errorText(caught))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
      await load()
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  const save = (draft: PopupDraft) => run(async () => {
    if (editing) await updatePopup(editing.id, draft)
    else await createPopup(draft)
    toast.success(editing ? '팝업을 수정했습니다.' : '팝업을 만들었습니다.')
    setEditing(null)
    setSaves((count) => count + 1)
  })

  const remove = async (popup: AdminPopup) => {
    const agreed = await confirm({
      title: `"${popup.title}" 팝업을 삭제할까요?`,
      body: '방문자에게 더 이상 보이지 않고, 이미지도 함께 지워집니다. 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
    })
    if (!agreed) return
    run(async () => {
      await deletePopup(popup.id)
      toast.success('팝업을 삭제했습니다.')
      if (editing?.id === popup.id) setEditing(null)
    })
  }

  return (
    <div className="panel">
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><Megaphone size={15} aria-hidden="true" /></span>
          <div><h2>팝업</h2><p>사이트에 접속하면 바로 뜨는 메시지를 만듭니다</p></div>
        </div>
      </div>
      <p className="admin-hint">이 사이트의 기록만 바꾸므로 비밀번호를 묻지 않습니다.</p>

      <PopupForm
        key={`${editing?.id ?? 'new'}-${saves}`}
        popup={editing}
        busy={busy}
        onSubmit={save}
        onCancel={() => setEditing(null)}
        onInvalid={setError}
      />

      {error && <p role="alert" className="admin-error">{error}</p>}
      {popups?.length === 0 && <p className="admin-notice mt-3">만든 팝업이 없습니다.</p>}
      {popups && popups.length > 0 && (
        <ul className="mt-3 divide-y divide-border" aria-label="만든 팝업" aria-busy={busy}>
          {popups.map((popup) => (
            <li key={popup.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-txt">{popup.title}</p>
                <p className="truncate text-xs text-txt-dim">
                  {popup.active ? '활성' : '비활성'}
                  {popup.image_path && ' · 이미지 있음'}
                  {' · '}{popup.created_by}{' · '}{formatInstant(popup.updated_at)}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost shrink-0"
                onClick={() => setEditing(popup)}
                disabled={busy}
                aria-label={`${popup.title} 팝업 수정`}
              >
                <Pencil size={14} aria-hidden="true" /> 수정
              </button>
              <button
                type="button"
                className="btn-danger shrink-0"
                onClick={() => remove(popup)}
                disabled={busy}
                aria-label={`${popup.title} 팝업 삭제`}
              >
                <Trash2 size={14} aria-hidden="true" /> 삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirmRequest && createPortal(
        <ConfirmDialog request={confirmRequest} onConfirm={onConfirm} onCancel={onCancel} />,
        document.body,
      )}
    </div>
  )
}

/** The form for a new popup, or for `popup` when one is being edited. */
function PopupForm({ popup, busy, onSubmit, onCancel, onInvalid }: {
  popup: AdminPopup | null
  busy: boolean
  onSubmit: (draft: PopupDraft) => void
  onCancel: () => void
  onInvalid: (message: string) => void
}) {
  const [title, setTitle] = useState(popup?.title ?? '')
  const [body, setBody] = useState(popup?.body ?? '')
  const [allowForever, setAllowForever] = useState(popup?.allow_dismiss_forever ?? true)
  const [allowDay, setAllowDay] = useState(popup?.allow_dismiss_day ?? true)
  const [active, setActive] = useState(popup?.active ?? true)
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const titleField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!image) return setPreview(null)
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const chooseImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null
    if (chosen && chosen.size > MAX_IMAGE_BYTES) {
      event.target.value = ''
      setImage(null)
      return onInvalid('이미지는 5MB를 넘을 수 없습니다.')
    }
    setImage(chosen)
    setRemoveImage(false)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!title.trim()) return warnEmpty(titleField.current, '제목을 입력하세요.')
    onSubmit({
      title,
      body,
      allow_dismiss_forever: allowForever,
      allow_dismiss_day: allowDay,
      active,
      image,
      remove_image: removeImage,
    })
  }

  const storedImage = popup?.image_path && !image && !removeImage ? apiUrl(popup.image_path) : null
  const shownImage = preview ?? storedImage

  return (
    <form className="popup-form" onSubmit={submit} aria-busy={busy} aria-label={popup ? '팝업 수정' : '새 팝업'}>
      <label className="admin-field">
        <span className="field-label">제목</span>
        <input
          ref={titleField}
          className="input-base"
          maxLength={MAX_TITLE_LENGTH}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="admin-field">
        <span className="field-label">내용 (이미지만 띄우려면 비워 두세요)</span>
        <textarea
          className="input-base resize-y"
          rows={4}
          maxLength={MAX_BODY_LENGTH}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <label className="admin-field">
        <span className="field-label">이미지 (PNG, JPEG, WebP, GIF, 5MB까지)</span>
        <input type="file" className="input-base" accept={IMAGE_TYPES} onChange={chooseImage} />
      </label>
      {shownImage && <img src={shownImage} alt="팝업 이미지 미리보기" className="popup-form-preview" />}
      {popup?.image_path && !image && (
        <label className="save-check">
          <input type="checkbox" checked={removeImage} onChange={(event) => setRemoveImage(event.target.checked)} />
          저장된 이미지 삭제
        </label>
      )}

      <div className="save-checks">
        <label className="save-check">
          <input type="checkbox" checked={allowDay} onChange={(event) => setAllowDay(event.target.checked)} />
          하루 동안 보지 않기 버튼
        </label>
        <label className="save-check">
          <input type="checkbox" checked={allowForever} onChange={(event) => setAllowForever(event.target.checked)} />
          다시 보지 않기 버튼
        </label>
        <label className="save-check">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          활성
        </label>
      </div>
      <p className="admin-hint">버튼을 둘 다 끄면 X로만 닫히고, 다음 접속 때 다시 뜹니다.</p>

      <div className="save-actions">
        <button type="submit" className="btn-primary" disabled={busy}>
          <Save size={14} aria-hidden="true" /> {popup ? '수정 저장' : '팝업 만들기'}
        </button>
        {popup && (
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
            <X size={14} aria-hidden="true" /> 취소
          </button>
        )}
      </div>
    </form>
  )
}
