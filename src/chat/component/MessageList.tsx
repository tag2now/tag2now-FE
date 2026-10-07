import { useLayoutEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import type { AuthUser } from '@/auth/types'
import type { ChatMessage } from '@/chat/types'
import { kstTimeFormat } from '@/reservation/reservationLabels'

type Props = {
  messages: ChatMessage[]
  /** No snapshot has arrived yet, so an empty list means nothing so far. */
  loading: boolean
  user: AuthUser | null
  onDelete: (id: number) => void
}

/** How far above the bottom still counts as reading the newest line, in px. */
const BOTTOM_SLACK = 24

/** Today's messages, oldest first, following new ones only while the reader
 * is at the bottom: someone scrolled up to read is not yanked back down by
 * every arrival. Their own message is the exception — they just sent it. */
export default function MessageList({ messages, loading, user, onDelete }: Props) {
  const logRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const isMine = (message?: ChatMessage) => !!user && message?.author_username === user.username

  useLayoutEffect(() => {
    const log = logRef.current
    if (!log || !(atBottom.current || isMine(messages.at(-1)))) return
    log.scrollTop = log.scrollHeight
  }, [messages, user])

  const trackBottom = () => {
    const log = logRef.current
    if (log) atBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight <= BOTTOM_SLACK
  }

  return (
    <div ref={logRef} className="chat-log" role="log" aria-label="채팅 메시지" onScroll={trackBottom}>
      {messages.length === 0 && (
        <p className="chat-empty">{loading ? '불러오는 중…' : '오늘 대화가 아직 없습니다.'}</p>
      )}
      <ol>
        {messages.map((message) => (
          <li key={message.id} className={isMine(message) ? 'chat-line is-mine' : 'chat-line'}>
            <div className="chat-line-head">
              <strong>{message.author_online_name}</strong>
              <time dateTime={message.created_at}>{kstTimeFormat.format(new Date(message.created_at))}</time>
              {/* Admins moderate, so they can take down anyone's line. */}
              {user && (isMine(message) || user.admin) && (
                <button
                  type="button"
                  className="chat-line-delete"
                  aria-label={`${message.author_online_name}님의 메시지 삭제`}
                  onClick={() => onDelete(message.id)}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              )}
            </div>
            <p>{message.body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
