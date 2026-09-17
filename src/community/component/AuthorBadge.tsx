import RankImage from '@/shared/components/RankImage'
import type { LeaderboardEntry} from "@/shared/types";

interface AuthorBadgeProps {
  name: string
  entries?: LeaderboardEntry[]
  className?: string
}

/** Who wrote it: their rank banner, their place on the board, and their name.
 *
 * The name is the part a reader is actually matching against, so it is the
 * only part set at full strength; the rank is context and rides quieter. All
 * three used to be the same weight, which made a row of these read as six
 * loose fragments rather than one byline.
 *
 * `display` is left to the caller on purpose: `hidden` and `inline-flex` have
 * equal specificity, so hardcoding one here would beat whatever a call site
 * passes, decided only by the order Tailwind emits the rules.
 */
export default function AuthorBadge({ name, entries, className }: AuthorBadgeProps) {
  const entry = entries?.find(e => e.online_name === name)
  const rankInfo = entry?.player_info?.main_char_info?.rank_info

  return (
    <span className={`author-badge ${className ?? ''}`}>
      <RankImage rankInfo={rankInfo} className="author-badge-rank" />
      {entry && <span className="author-badge-place">#{entry.rank}</span>}
      <span className="author-badge-name">{name}</span>
    </span>
  )
}
