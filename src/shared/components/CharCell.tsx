import { charImageUrl } from '@/shared/characterImage'
import RankImage from './RankImage'
import {CharRankInfo} from "@/shared/types";

export interface CharCellProps {
  name?: string
  rankInfo?: CharRankInfo
  wins?: number
  losses?: number
  compact?: boolean
}

export default function CharCell({ name, rankInfo, wins, losses, compact = false }: CharCellProps) {
  if (!name) return <div className="char-td" aria-label="캐릭터 없음">—</div>
  const url = charImageUrl(name)
  const total = (wins ?? 0) + (losses ?? 0)
  const winRate = total > 0 ? Math.round((wins ?? 0) / total * 100) : null
  return (
    // Portrait, then rank, then record — left to right in one line at every
    // width. The old cell stacked on mobile and wrapped the rank banner above
    // the portrait, which is what made the row 100px tall there.
    <div className={`char-cell${compact ? ' char-cell--compact' : ''}`}>
      {url && <img src={url} alt={name} className="char-art char-cell-portrait" />}
      <div className="char-cell-meta char-cell-content">
        <RankImage rankInfo={rankInfo} className="char-cell-rank" />
        {/* The rate leads and the raw record rides behind it, in both variants.
            The compact one briefly did the opposite --- "445W 328L" then
            "WR:58%" --- which put two emphases on one figure within a single
            screen: the sidebar card led with the record, the leaderboard two
            clicks away led with the rate. `compact` changes the arrangement,
            never which number is the point. No "WR:" label either: a bare
            percentage beside a W/L is not something a reader has to be told
            the name of. */}
        {winRate != null && (
          <span className="char-cell-record">
            <span className="char-cell-wr">{winRate}%</span>
            <span className="char-cell-wl">{wins}<span>W</span> {losses}<span>L</span></span>
          </span>
        )}
      </div>
    </div>
  )
}
