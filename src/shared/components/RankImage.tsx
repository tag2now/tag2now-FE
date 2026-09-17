import { useState } from 'react'
import {RoomRankInfo} from "@/match/types";
import {CharRankInfo} from "@/shared/types";
import { rememberTier, tierOfRank } from '@/shared/rankTiers';
import { tierHex } from '@/shared/tierColors';

interface RankImageProps {
  /** `tier` is optional because two callers have only a rank *name* — the
   * reservation form and its summary, where a host picks from a list. They
   * used to fill the gap with `tier: rank`, which is a lie the type accepted:
   * once anything started reading that field it learned a band per rank. */
  rankInfo: CharRankInfo | RoomRankInfo | { name?: string, tier?: string } | null | undefined
  className?: string
}

export default function RankImage({ rankInfo, className }: RankImageProps) {
  // Not every rank the API reports has artwork under /ranks — 'Tekken Lord' and
  // 'Initiate' among them. Without this the browser paints its broken-image
  // glyph, which reads as a bug rather than a missing asset.
  // Keyed by name, not a bare boolean: React reuses this element across rows as
  // a list re-renders, and a stale `true` would blank a rank that does have art.
  const [failedName, setFailedName] = useState<string | null>(null)
  const name = rankInfo?.name

  // Every payload that carries a rank also carries its band, and this component
  // sees all of them. Recording it here is what lets a rank the backend adds
  // later pick up its real colour without a release — the static table only has
  // to be right about the ranks that existed when it was written.
  rememberTier(name, (rankInfo as { tier?: string } | null | undefined)?.tier)

  if (!name) return null

  // No banner ships for the seven ranks above Toshin, and the API may add more.
  // A missing image used to remove itself, leaving a hole the same size as the
  // art beside it — so a 황금단 tile was an empty box. This is the same frame
  // filled with the rank's name in its band's colour: one element, no asset,
  // and it covers whatever gets added next.
  if (failedName === name) {
    return (
      <span className={`rank-plate${className ? ` ${className}` : ''}`}
        style={{ '--tier': tierHex(tierOfRank(name)) } as React.CSSProperties}
        title={name}
        role="img"
        aria-label={name}
      >{name}</span>
    )
  }

  return (
    <img
      src={`/ranks/${name.replace(/ /g, "_")}.png`}
      alt={name}
      title={name}
      className={className}
      onError={() => setFailedName(name)}
    />
  )
}
