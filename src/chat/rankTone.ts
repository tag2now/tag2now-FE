/** The colour band a leaderboard place falls in, as the class that paints it
 * (chat.css). Unranked authors get no mark at all, so this is never asked
 * about them. */
export function rankTone(rank: number): string {
  if (rank === 1) return 'is-first'
  if (rank <= 10) return 'is-top10'
  if (rank <= 30) return 'is-top30'
  if (rank <= 100) return 'is-top100'
  return 'is-ranked'
}
