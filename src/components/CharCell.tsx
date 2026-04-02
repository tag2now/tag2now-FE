import { charImageUrl } from '@/shared/characterImage'
import RankImage from './RankImage'
import type { CharRankInfo } from '@/types'

export interface CharCellProps {
  name?: string
  rankInfo?: CharRankInfo
  wins?: number
  losses?: number
}

export default function CharCell({ name, rankInfo, wins, losses }: CharCellProps) {
  if (!name) return <td className="char-td" aria-label="캐릭터 없음">—</td>
  const url = charImageUrl(name)
  const total = (wins ?? 0) + (losses ?? 0)
  const winRate = total > 0 ? Math.round((wins ?? 0) / total * 100) : null
  return (
    <td className="char-td">
      <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-1 sm:gap-2 sm:w-auto mx-auto">
        <div className="flex flex-1 justify-center flex-col sm:flex-row items-center gap-1">
          <RankImage rankInfo={rankInfo} className="char-rank h-8 w-auto" />
          {url && <img src={url} alt={name} className="w-13 h-13 sm:w-15 sm:h-15 object-contain" />}
          {winRate != null && (
            <div className="hidden w-3/10 sm:block text-md leading-tight whitespace-nowrap text-left">
              <span className="text-primary">W </span>{wins} <span className="text-accent">L </span>{losses}
              <br />
              <span className="text-txt-dim">WR:</span>{winRate}%
            </div>
          )}
        </div>
      </div>
    </td>
  )
}
