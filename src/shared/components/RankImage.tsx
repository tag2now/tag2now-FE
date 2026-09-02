import { useState } from 'react'
import {RoomRankInfo} from "@/match/types";
import {CharRankInfo} from "@/shared/types";

interface RankImageProps {
  rankInfo: CharRankInfo | RoomRankInfo | null | undefined
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

  if (!name || failedName === name) return null
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
