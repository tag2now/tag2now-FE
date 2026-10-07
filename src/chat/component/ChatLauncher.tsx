import type { Ref } from 'react'
import { MessagesSquare } from 'lucide-react'

type Props = {
  unread: number
  onOpen: () => void
  ref?: Ref<HTMLButtonElement>
}

/** Past this the badge stops counting; the exact figure is in the label. */
const BADGE_CAP = 99

export default function ChatLauncher({ unread, onOpen, ref }: Props) {
  return (
    <button
      ref={ref}
      type="button"
      className="chat-launcher"
      // The whole badge in one name: split across elements it is read as
      // "채팅 3", which does not say what the 3 counts.
      aria-label={unread > 0 ? `채팅 열기, 새 메시지 ${unread}개` : '채팅 열기'}
      onClick={onOpen}
    >
      <MessagesSquare size={18} aria-hidden="true" />
      <span className="chat-launcher-label" aria-hidden="true">채팅</span>
      {unread > 0 && (
        <span className="chat-launcher-badge" aria-hidden="true">
          {unread > BADGE_CAP ? `${BADGE_CAP}+` : unread}
        </span>
      )}
    </button>
  )
}
