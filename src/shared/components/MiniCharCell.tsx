import RankImage from '@/shared/components/RankImage'
import { charImageUrl } from '@/shared/characterImage'
import type { CharInfo } from '@/shared/types'

/** The row-sized counterpart to CharCell.
 *
 * CharCell is built for a 60px table row. A ranking row is tighter, so this
 * draws the same four things — portrait, rank badge, win rate, record — at the
 * size a row has for them. It is the cell every ranking on the site uses, so
 * `role` is passed through: RankList gives the grid its table semantics, and
 * an extra wrapper to carry that role would add a sixth child to a
 * five-column row. */
export default function MiniCharCell({ char, label, role }: { char?: CharInfo | null; label: string; role?: string }) {
  if (!char?.name) return <span role={role} className="mini-char is-empty" aria-label={`${label} 없음`}>—</span>

  const url = charImageUrl(char.name)
  const rank = char.rank_info?.name
  const title = rank ? `${label}: ${char.name} (${rank})` : `${label}: ${char.name}`
  // The figure the leaderboard leads with, so the summary of it says the same
  // thing. It used to show a portrait and a rank and no numbers at all, which
  // made the two lists look like different data about the same players.
  const played = (char.wins ?? 0) + (char.losses ?? 0)
  const winRate = played > 0 ? Math.round((char.wins ?? 0) / played * 100) : null

  return (
    <span role={role} className="mini-char" title={title}>
      {/* Portrait then rank, the order CharCell uses on the leaderboard. */}
      {url
        ? <img src={url} alt={char.name} className="char-art mini-char-portrait" loading="lazy" />
        : <span className="mini-char-name">{char.name}</span>}
      <span className="mini-char-meta">
        <RankImage rankInfo={char.rank_info} className="mini-char-rank" />
        {winRate != null && (
          <span className="mini-char-record">
            <span className="mini-char-wr">{winRate}%</span>
            <span className="mini-char-wl">{char.wins}<span>W</span> {char.losses}<span>L</span></span>
          </span>
        )}
      </span>
    </span>
  )
}
