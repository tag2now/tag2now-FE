import { useState } from 'react'
import { createPortal } from 'react-dom'
import { UserSearch } from 'lucide-react'
import useAuth from '@/auth/useAuth'
import CurrentRankHolders from '@/match/component/CurrentRankHolders'
import useCurrentRankHolders, { useOwnPlayedRank } from '@/match/useCurrentRankHolders'
import type { LeaderboardEntry } from '@/shared/types'
import type { RoomUser } from '@/match/types'

interface FinderProps {
  roomUsers: RoomUser[]
  leaderboardEntries?: LeaderboardEntry[]
  currentRankEntries?: LeaderboardEntry[]
}

/** 같은 계급 상대 찾기, beside the room list's title. The rank picked is kept
 * across openings; nothing is asked until the dialog is open. */
export default function CurrentRankHoldersButton(props: FinderProps) {
  const [open, setOpen] = useState(false)
  const [chosenRank, setChosenRank] = useState<number | null>(null)

  return (
    <>
      <button type="button" className="btn-primary holder-open-btn" onClick={() => setOpen(true)}>
        <UserSearch size={14} aria-hidden="true" /> 같은 계급 상대 찾기
      </button>
      {/* Out of the title bar it opens from, whose phone rules hide its paragraphs. */}
      {open && createPortal(
        <Finder {...props} chosenRank={chosenRank} onRankChange={setChosenRank} onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  )
}

/** A signed-in player's opens on the highest rank they play at; a rank someone
 * picks wins over it, even arriving late. */
function Finder({ roomUsers, leaderboardEntries, currentRankEntries, chosenRank, onRankChange, onClose }: FinderProps & {
  chosenRank: number | null
  onRankChange: (rank: number) => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const ownRank = useOwnPlayedRank(user?.username)
  const rank = chosenRank ?? ownRank
  const { state, retry } = useCurrentRankHolders(rank)

  return (
    <CurrentRankHolders
      rank={rank}
      onRankChange={onRankChange}
      state={state}
      onRetry={retry}
      onClose={onClose}
      roomUsers={roomUsers}
      leaderboardEntries={leaderboardEntries}
      currentRankEntries={currentRankEntries}
      ownUsername={user?.username}
    />
  )
}
