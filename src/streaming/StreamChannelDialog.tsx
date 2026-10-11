import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Tv } from 'lucide-react'
import useModalDialog from '@/shared/hooks/useModalDialog'
import { AppError } from '@/shared/util/AppError'
import { getMyChannel, registerChannel, unregisterChannel } from '@/streaming/streamingApi'
import type { StreamChannel } from '@/streaming/types'

function errorText(error: unknown): string {
  if (error instanceof AppError && error.explained) return error.message
  return '요청하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'
}

/** Connect the signed-in account's Chzzk channel, so the rooms list can mark
 * them live while they are in a room. Opened from the account menu. */
export default function StreamChannelDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useModalDialog<HTMLFormElement>(onClose)
  const addressField = useRef<HTMLInputElement>(null)
  // undefined while the current channel is still loading.
  const [current, setCurrent] = useState<StreamChannel | null | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    getMyChannel()
      .then((channel) => { if (live) setCurrent(channel) })
      .catch((caught) => { if (live) setLoadError(errorText(caught)) })
    return () => { live = false }
  }, [])

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

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    const text = address.trim()
    if (!text) {
      setError('치지직 채널 주소를 입력해 주세요.')
      addressField.current?.focus()
      return
    }
    run(async () => {
      setCurrent(await registerChannel(text))
      setAddress('')
      toast.success('치지직 채널을 연결했습니다.')
    })
  }

  const disconnect = () => run(async () => {
    await unregisterChannel()
    setCurrent(null)
    toast.success('채널 연결을 해제했습니다.')
  })

  return (
    <div className="modal-backdrop">
      <form
        ref={dialogRef}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stream-dialog-title"
        aria-describedby="stream-dialog-body"
        aria-busy={busy}
        className="confirm-dialog"
      >
        <div className="confirm-dialog-head">
          <span className="confirm-dialog-icon" aria-hidden="true"><Tv size={18} /></span>
          <h2 id="stream-dialog-title">방송 채널</h2>
        </div>
        <p id="stream-dialog-body" className="confirm-dialog-body">
          치지직 채널을 연결하면 매칭 중일 때 이름 옆에 LIVE가 표시되고, 누르면 방송으로 이동합니다.
        </p>

        {current === undefined && !loadError && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-txt-dim">
            <Loader2 size={14} aria-hidden="true" className="animate-spin" /> 불러오는 중
          </p>
        )}
        {loadError && <p role="alert" className="mt-3 text-sm font-bold text-error">{loadError}</p>}
        {current && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-border-light px-3 py-2">
            <a
              href={current.channel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate text-sm font-bold text-txt hover:underline"
            >
              {current.channel_name}
            </a>
            <button type="button" className="btn-ghost shrink-0" onClick={disconnect} disabled={busy}>연결 해제</button>
          </div>
        )}

        <label className="mt-3 block">
          <span className="field-label">{current ? '다른 채널로 바꾸기' : '치지직 채널 주소'}</span>
          <input
            ref={addressField}
            className="input-base w-full"
            placeholder="https://chzzk.naver.com/채널ID"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={200}
            readOnly={busy}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        {error && <p role="alert" className="mt-3 text-sm font-bold text-error">{error}</p>}

        <div className="confirm-dialog-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>닫기</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Loader2 size={14} aria-hidden="true" className="animate-spin" />}
            {current ? '바꾸기' : '연결'}
          </button>
        </div>
      </form>
    </div>
  )
}
