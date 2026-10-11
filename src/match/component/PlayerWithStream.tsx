import type { RoomUser } from '@/match/types'

/** A player's name, and before it a link to their broadcast when they are live:
 * left of the name on desktop, above it on a phone (match.css).
 *
 * The badge is a sibling of the name button, never inside it: the name opens
 * the player's record, the badge leaves for Chzzk, and a link nested in a
 * button is neither. It comes first in the DOM too, so focus and reading order
 * follow what is seen. Players who are not live render exactly as before. */
export default function PlayerWithStream({ user, onSelect }: { user: RoomUser, onSelect: (npid: string) => void }) {
  const name = <button type="button" className="player-btn" onClick={() => onSelect(user.np_id)}>{user.online_name}</button>
  const stream = user.stream
  if (!stream) return name
  return (
    <span className="player-stream">
      <a
        href={stream.url}
        target="_blank"
        rel="noopener noreferrer"
        className="stream-badge"
        title={`${stream.title} · 시청자 ${stream.viewer_count.toLocaleString('ko-KR')}명`}
        aria-label={`${user.online_name} 치지직 방송 보기: ${stream.title} (새 창)`}
      >
        LIVE
      </a>
      {name}
    </span>
  )
}
