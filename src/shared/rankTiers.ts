import { RANK_ORDER } from '@/reservation/reservationLabels'

/** Which colour band each rank belongs to, and how the picker lays them out.
 *
 * Ten bands over 43 ranks, boundaries confirmed against the game:
 *
 *   숫자급  0–9   (10)  Beginner … 1st kyu
 *   숫자단 10–12  (3)   1st dan … 3rd dan
 *   액자단 13–16  (4)   Disciple … Grand Master
 *   녹단   17–20  (4)   Brawler … Berserker
 *   노랑단 21–24  (4)   Warrior … Pugilist
 *   주황단 25–28  (4)   Vanquisher … Savior
 *   빨강단 29–32  (4)   Genbu … Suzaku
 *   파랑단 33–37  (5)   Fujin … Toshin
 *   보라단 38–40  (3)   Emperor … Tekken Emperor
 *   황금단 41–42  (2)   Tekken God, True Tekken God
 *
 * The backend disagrees about the bottom: it answers 숫자단 for everything from
 * Beginner to 3rd dan, collapsing the kyu climb into the dan band. This table
 * is the authority on ranks it names, so the API cannot overwrite it — see
 * `rememberTier`, which only records bands for ranks this table has never
 * heard of. That is what keeps the split between 급 and 단 while still letting
 * a rank added later arrive with its own colour.
 */
export type Tier = string

/** First index of each band in `RANK_ORDER`, lowest band first. */
const BAND_STARTS: ReadonlyArray<readonly [start: number, tier: Tier]> = [
  [0, '숫자급'],
  [10, '숫자단'],
  [13, '액자단'],
  [17, '녹단'],
  [21, '노랑단'],
  [25, '주황단'],
  [29, '빨강단'],
  [33, '파랑단'],
  [38, '보라단'],
  [41, '황금단'],
]

/** For a rank no table and no payload has placed. */
export const UNCONFIRMED_BAND = '상위 계급'

/** Bands the API taught us, for ranks this build does not know. Consulted only
 * after the static table, so a backend that lumps the kyu ranks in with the dan
 * ranks cannot undo the split above. */
const learned = new Map<string, Tier>()

const byName = new Map<string, Tier>(
  RANK_ORDER.map((rank, index) => {
    const band = [...BAND_STARTS].reverse().find(([start]) => index >= start)!
    return [rank, band[1]] as const
  }),
)

/** Record what the API said a rank's band is.
 *
 * This is how a rank the backend adds later gets a real colour rather than the
 * neutral one. Ranks already in the table are ignored: their band is a decision
 * this app has made, and a payload is not an argument against it. */
export function rememberTier(rank: string | undefined | null, tier: string | undefined | null): void {
  if (!rank || !tier) return
  if (byName.has(rank)) return
  if (learned.get(rank) === tier) return
  learned.set(rank, tier)
}

/** The band a rank belongs to. */
export const tierOfRank = (name: string | undefined | null): Tier =>
  (name && (byName.get(name) ?? learned.get(name))) || UNCONFIRMED_BAND

/** True when the band came from a table or a payload rather than a fallback. */
export const isConfirmedTier = (tier: Tier): boolean => tier !== UNCONFIRMED_BAND

const COLUMNS = 4

export interface RankBand {
  tier: Tier
  /** Rows of `COLUMNS` cells, highest row first. `null` is a spacer. */
  rows: (string | null)[][]
}

/** Contiguous runs of equal band, highest rank first. Built from the table
 * rather than from `CONFIRMED_BANDS` directly so that a rank taught a band at
 * runtime lands in the right group without this needing to know about it. */
function bandRuns(): { tier: Tier, ranks: string[] }[] {
  const runs: { tier: Tier, ranks: string[] }[] = []
  for (const rank of RANK_ORDER) {
    const tier = tierOfRank(rank)
    const last = runs[runs.length - 1]
    if (last && last.tier === tier) last.ranks.push(rank)
    else runs.push({ tier, ranks: [rank] })
  }
  return runs.reverse()
}

/** The picker's layout: strongest band first, strongest rank first.
 *
 * Reading order decides this. Korean runs left to right and top to bottom, so
 * "highest first" means the top-LEFT cell, not the top-right — every row
 * descends from its strongest rank and a short band is padded on the *right*
 * so the left edge stays flush.
 *
 * Every band also gets its own rows, so a colour never straddles a row
 * boundary. Chunking the flat list by four had put Suzaku (빨강단) on the same
 * line as the 파랑단 ranks, which made the strongest row look like a fourth
 * colour.
 */
export function rankBands(): RankBand[] {
  return bandRuns().map(({ tier, ranks }) => {
    const descending = [...ranks].reverse()
    const rows: (string | null)[][] = []
    for (let start = 0; start < descending.length; start += COLUMNS) {
      const row = descending.slice(start, start + COLUMNS)
      rows.push([...row, ...Array(COLUMNS - row.length).fill(null)])
    }
    return { tier, rows }
  })
}
