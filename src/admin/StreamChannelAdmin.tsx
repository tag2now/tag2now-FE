import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { Trash2, Tv } from 'lucide-react'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import useConfirm from '@/shared/hooks/useConfirm'
import { errorText, formatInstant } from '@/admin/adminText'
import { listChannels, removeChannel } from '@/streaming/streamingApi'
import type { AdminStreamChannel } from '@/streaming/types'

/** Every connected Chzzk channel, and removing one --- say, a channel someone
 * registered that is not theirs. No password: it touches only this site's records. */
export default function StreamChannelAdmin() {
  const [channels, setChannels] = useState<AdminStreamChannel[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { confirm, request: confirmRequest, onConfirm, onCancel } = useConfirm()

  const load = useCallback(async () => {
    try {
      setChannels(await listChannels())
      setError(null)
    } catch (caught) {
      setError(errorText(caught))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const remove = async (channel: AdminStreamChannel) => {
    const agreed = await confirm({
      title: `${channel.username}의 방송 채널 연결을 삭제할까요?`,
      body: `${channel.channel_name} 채널이 이 계정에서 떨어집니다. 본인은 언제든 다시 연결할 수 있습니다.`,
      confirmLabel: '삭제',
    })
    if (!agreed) return
    setBusy(true)
    try {
      await removeChannel(channel.username)
      toast.success(`${channel.username}의 채널 연결을 삭제했습니다.`)
      await load()
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="section-toolbar">
        <div className="section-title">
          <span className="section-icon"><Tv size={15} aria-hidden="true" /></span>
          <div><h2>방송 채널</h2><p>계정에 연결된 치지직 채널을 확인하고 삭제합니다</p></div>
        </div>
      </div>
      <p className="admin-hint">이 사이트의 기록만 지우므로 비밀번호를 묻지 않습니다.</p>

      {error && <p role="alert" className="admin-error">{error}</p>}
      {channels?.length === 0 && <p className="admin-notice mt-3">연결된 채널이 없습니다.</p>}
      {channels && channels.length > 0 && (
        <ul className="mt-3 divide-y divide-border" aria-label="연결된 방송 채널" aria-busy={busy}>
          {channels.map((channel) => (
            <li key={channel.username} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-txt">{channel.username}</p>
                <p className="truncate text-xs text-txt-dim">
                  <a href={channel.channel_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {channel.channel_name}
                  </a>
                  {' · '}{formatInstant(channel.registered_at)}
                </p>
              </div>
              <button
                type="button"
                className="btn-danger shrink-0"
                onClick={() => remove(channel)}
                disabled={busy}
                aria-label={`${channel.username}의 채널 연결 삭제`}
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
