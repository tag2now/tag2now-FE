import RankImage from '@/shared/components/RankImage'
import { sortRanksDescending } from '@/reservation/reservationLabels'

interface RankSummaryProps {
  ranks: string[]
  imageClassName?: string
  max?: number
  className?: string
}

/** Ranks highest-first, with whatever does not fit counted in a badge.
 *
 * The badge sits in the flex flow rather than at `left-full`: the reservation
 * card clips its overflow, so a badge outside the icon's own box was cut away
 * and a five-rank post looked exactly like a one-rank post.
 *
 * Renders nothing for an empty list, which is what lets a caller drop it into a
 * row without asking whether the reservation is a rank match — a player match
 * simply leaves the slot empty. */
export default function RankSummary({ ranks, imageClassName = 'h-8', max = Infinity, className = 'justify-center' }: RankSummaryProps) {
  if (ranks.length === 0) return null
  const sortedRanks = sortRanksDescending(ranks)
  const shown = sortedRanks.slice(0, max)
  const hidden = sortedRanks.length - shown.length
  return <span className={`flex min-w-0 flex-wrap items-center gap-1 ${className}`} aria-label={sortedRanks.join(', ')}>
    {shown.map((rank) => <RankImage key={rank} rankInfo={{ name: rank, tier: rank }} className={`${imageClassName} w-auto shrink-0 object-contain`} />)}
    {hidden > 0 && <span aria-label={`추가 계급 ${hidden}개`} className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-primary-dim bg-primary/10 px-1 text-xs font-black text-primary-text">+{hidden}</span>}
  </span>
}
