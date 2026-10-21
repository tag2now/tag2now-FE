import { useState } from 'react'
import { UserSearch, X } from 'lucide-react'
import RankField, { rankName } from '@/shared/components/RankField'
import RankImage from '@/shared/components/RankImage'
import PlayerHistoryPanel from '@/shared/components/PlayerHistoryPanel'
import { TableSkeleton } from '@/shared/components/Skeleton'
import useModalDialog from '@/shared/hooks/useModalDialog'
import { charImageUrl } from '@/shared/characterImage'
import { statusBody } from '@/shared/util/panelStatus'
import { formatTimeAgo } from '@/shared/util/timeFormat'
import type { LeaderboardEntry } from '@/shared/types'
import type { CurrentRankHolder, RoomUser } from '@/match/types'
import { MIN_HOLDER_RANK, type HoldersState } from '@/match/useCurrentRankHolders'

// Some play every character at a rank, all 59 at once; a phone row holds five.
const MAX_PORTRAITS = 5

interface CurrentRankHoldersProps {
  rank: number | null
  onRankChange: (rank: number) => void
  state: HoldersState
  onRetry: () => void
  onClose: () => void
  roomUsers: RoomUser[]
  leaderboardEntries?: LeaderboardEntry[]
  /** The current-rank board, whose place each holder is shown with. */
  currentRankEntries?: LeaderboardEntry[]
  /** The signed-in player, who is not someone to find. */
  ownUsername?: string
}

/** Players to play now at a rank, in a dialog over the match tab: who played a
 * character there in the last 30 days, those in a room right now first, then
 * the backend's order. */
export default function CurrentRankHolders({
  rank, onRankChange, state, onRetry, onClose, roomUsers, leaderboardEntries, currentRankEntries, ownUsername,
}: CurrentRankHoldersProps) {
  const dialogRef = useModalDialog<HTMLDivElement>(onClose)
  const [selectedNpid, setSelectedNpid] = useState<string | null>(null)
  const entryByNpid = new Map(leaderboardEntries?.map((e) => [e.np_id, e]) ?? [])
  const roomUserByNpid = new Map(roomUsers.map((u) => [u.np_id, u]))
  const placeByNpid = new Map(currentRankEntries?.map((e) => [e.np_id, e.rank]) ?? [])
  const holders = state.kind === 'loaded'
    ? inRoomFirst(state.holders.entries.filter((h) => h.username !== ownUsername), roomUserByNpid)
    : []

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="holder-dialog-title" className="confirm-dialog holder-dialog">
        <div className="confirm-dialog-head">
          <span className="confirm-dialog-icon" aria-hidden="true"><UserSearch size={18} /></span>
          <h2 id="holder-dialog-title">같은 계급 상대 찾기</h2>
          <button type="button" className="holder-dialog-close" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="confirm-dialog-body">최근 30일 안에 그 계급 캐릭터로 플레이한 유저입니다. 지금 방에 있는 유저가 먼저 나옵니다.</p>
        <div className="holder-dialog-controls">
          <RankField
            label="계급"
            value={rank}
            from={MIN_HOLDER_RANK}
            placeholder="계급 선택"
            onChange={(code) => { if (code !== null) onRankChange(code) }}
          />
          {state.kind === 'loaded' && <p className="holder-summary" aria-live="polite">{summary(state, holders, roomUserByNpid)}</p>}
        </div>
        {state.kind === 'loaded' && holders.length > 0 ? (
          <ul className="holder-list" aria-label={`${state.holders.rank_name} 상대 목록`}>
            {holders.map((h) => (
              <HolderRow
                key={h.username}
                holder={h}
                // A save knows only the RPCN id; a room or the score board knows the name.
                name={entryByNpid.get(h.username)?.online_name ?? roomUserByNpid.get(h.username)?.online_name ?? h.username}
                place={placeByNpid.get(h.username)}
                inRoom={roomUserByNpid.has(h.username)}
                onSelect={setSelectedNpid}
              />
            ))}
          </ul>
        ) : (
          <HoldersBody state={state} onRetry={onRetry} />
        )}
      </div>
      {selectedNpid !== null && (
        <PlayerHistoryPanel
          npid={selectedNpid}
          leaderboardEntry={entryByNpid.get(selectedNpid)}
          leaderboardEntries={leaderboardEntries}
          onClose={() => setSelectedNpid(null)}
        />
      )}
    </div>
  )
}

// A stable sort, so the backend's order holds within each half.
const inRoomFirst = (holders: CurrentRankHolder[], inRoom: Map<string, RoomUser>) =>
  [...holders].sort((a, b) => Number(inRoom.has(b.username)) - Number(inRoom.has(a.username)))

function summary(state: Extract<HoldersState, { kind: 'loaded' }>, holders: CurrentRankHolder[], inRoom: Map<string, RoomUser>): string {
  const playingNow = holders.filter((h) => inRoom.has(h.username)).length
  const shown = state.holders.total > state.holders.entries.length
    ? `${holders.length}명 표시 · 전체 ${state.holders.total}명`
    : `${holders.length}명`
  return playingNow > 0 ? `${shown} · 방에 있음 ${playingNow}` : shown
}

function HoldersBody({ state, onRetry }: { state: HoldersState, onRetry: () => void }) {
  if (state.kind === 'idle') return (
    <div className="empty-state" role="status">
      <p className="empty-state-title">계급을 선택하세요</p>
    </div>
  )
  if (state.kind === 'failed') return statusBody(false, state.message, { onRetry })
  if (state.kind === 'loading') return statusBody(true, null, {
    skeleton: <TableSkeleton rows={4} columns={3} label="상대 목록을 불러오는 중" />,
  })
  return (
    <div className="empty-state" role="status">
      <p className="empty-state-title">최근 30일 동안 {state.holders.rank_name} 캐릭터로 플레이한 유저가 없습니다</p>
    </div>
  )
}

function HolderRow({ holder, name, place, inRoom, onSelect }: {
  holder: CurrentRankHolder, name: string, place?: number, inRoom: boolean, onSelect: (npid: string) => void
}) {
  const shown = holder.chars.slice(0, MAX_PORTRAITS)
  const hidden = holder.chars.slice(MAX_PORTRAITS)
  return (
    <li className="holder-row">
      {/* The community's byline: the highest rank reached (account rank, never
          demoted), then the place on the current-rank board. */}
      <span className="holder-name">
        <RankImage rankInfo={{ name: rankName(holder.account_rank) }} className="author-badge-rank" />
        {place !== undefined && <span className="author-badge-place">#{place}</span>}
        <button type="button" className="player-btn" onClick={() => onSelect(holder.username)}>{name}</button>
        {inRoom && <span className="holder-in-room">방에 있음</span>}
      </span>
      <span className="holder-chars">
        {shown.map((c) => {
          const url = charImageUrl(c.character)
          return url
            ? <img key={c.id} src={url} alt={c.character} title={c.character} className="char-art holder-char" loading="lazy" />
            : <span key={c.id} className="holder-char-name">{c.character}</span>
        })}
        {hidden.length > 0 && (
          <span className="holder-char-more" title={hidden.map((c) => c.character).join(', ')} aria-label={`캐릭터 ${hidden.length}명 더`}>
            +{hidden.length}
          </span>
        )}
      </span>
      <span className="holder-seen">{formatTimeAgo(holder.saved_at)}</span>
    </li>
  )
}
