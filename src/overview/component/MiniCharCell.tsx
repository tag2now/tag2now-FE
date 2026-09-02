import { charImageUrl } from '@/shared/characterImage'
import RankImage from '@/shared/components/RankImage'
import type { CharInfo } from '@/shared/types'

/** The overview's row-sized counterpart to CharCell.
 *
 * CharCell is built for a table cell — a 60px portrait, a rank badge and a
 * win/loss column. A summary row has no space for that, so this keeps the two
 * things that identify a player at a glance (portrait and rank) and drops the
 * stats, which the leaderboard tab is one click away for.
 */
export default function MiniCharCell({ char, label }: { char?: CharInfo | null; label: string }) {
  if (!char?.name) return <span className="mini-char is-empty" aria-label={`${label} 없음`}>—</span>

  const url = charImageUrl(char.name)
  const rank = char.rank_info?.name
  const title = rank ? `${label}: ${char.name} (${rank})` : `${label}: ${char.name}`

  return (
    <span className="mini-char" title={title}>
      <RankImage rankInfo={char.rank_info} className="mini-char-rank" />
      {url
        ? <img src={url} alt={char.name} className="mini-char-portrait" loading="lazy" />
        : <span className="mini-char-name">{char.name}</span>}
    </span>
  )
}
