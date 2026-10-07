import { useEffect, useRef } from 'react'
import { LogIn, MessagesSquare, X } from 'lucide-react'
import useAuth from '@/auth/useAuth'
import { deleteMessage } from '@/chat/chatApi'
import { forget, type ChatState } from '@/chat/chatStream'
import showFailure from '@/chat/showFailure'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

type Props = {
  chat: ChatState
  /** Given when the reader opened the panel from the launcher, and can close
   * it again. Without it the panel is the docked column, always open. */
  onClose?: () => void
}

/** The open chat, docked as a column or floating over the page. Never a
 * modal: the page beside it stays usable, so focus is not trapped.
 *
 * A floating panel takes focus when it opens and closes on Escape from
 * anywhere inside. The docked column does neither — it is on screen from the
 * moment the page loads, and taking focus then would pull it off the page. */
export default function ChatPanel({ chat, onClose }: Props) {
  const { user, requireUser } = useAuth()
  const panelRef = useRef<HTMLElement>(null)
  const floating = onClose !== undefined

  // The panel itself, not the field: focusing the field would raise a phone's
  // keyboard over the messages the reader opened the chat to see.
  useEffect(() => {
    if (floating) panelRef.current?.focus()
  }, [floating])

  const remove = async (id: number) => {
    try {
      await deleteMessage(id)
      forget(id)
    } catch (error) {
      showFailure(error, '메시지를 삭제하지 못했습니다.')
    }
  }

  return (
    <section
      ref={panelRef}
      className={floating ? 'chat-panel chat-floating' : 'chat-panel chat-docked'}
      aria-labelledby="chat-title"
      tabIndex={-1}
      onKeyDown={(event) => event.key === 'Escape' && onClose?.()}
    >
      <header className="chat-panel-head">
        <h2 id="chat-title">
          <MessagesSquare size={15} aria-hidden="true" />
          채팅
        </h2>
        <span className="chat-panel-note">매일 06:00 초기화</span>
        {floating && (
          <button type="button" className="chat-panel-close" aria-label="채팅 닫기" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </header>
      {/* Always mounted, so the notice is announced when it appears: a live
          region added together with its text is often not read at all. A
          plain live region rather than role="status", which the page's
          toasts already answer to. */}
      <p className="chat-status" aria-live="polite">
        {chat.connection === 'retrying' ? '연결이 끊겼습니다. 다시 연결하는 중…' : ''}
      </p>
      <MessageList messages={chat.messages} loading={chat.connection === 'connecting'} user={user} onDelete={remove} />
      {/* Signed out, the composer would be a field with nothing behind it;
          the button that fixes that stands in its place, as on the
          reservation comments. */}
      {user ? <MessageInput /> : (
        <button type="button" className="btn-ghost chat-login" onClick={() => requireUser('로그인하면 채팅에 참여할 수 있습니다.')}>
          <LogIn size={14} aria-hidden="true" /> 로그인하고 채팅하기
        </button>
      )}
    </section>
  )
}
