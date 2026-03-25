import RankImage from '../RankImage'
import type { LeaderboardEntry } from '@/types'

interface AuthorBadgeProps {
  name: string
  entries?: LeaderboardEntry[]
  className?: string
}

export default function AuthorBadge({ name, entries, className }: AuthorBadgeProps) {
  const entry = entries?.find(e => e.online_name === name)
  const rankInfo = entry?.player_info?.main_char_info?.rank_info

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <RankImage rankInfo={rankInfo} className="h-4 w-auto" />
      {entry && <span className="text-accent font-bold">#{entry.rank}</span>}
      <span className="font-bold truncate max-w-20 sm:max-w-none">{name}</span>
    </span>
  )
}
