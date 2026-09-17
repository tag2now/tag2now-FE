import { MEDAL_BRONZE, MEDAL_GOLD, MEDAL_SILVER } from '@/shared/palette'

/** Gold, silver, bronze — for first, second and third place.
 *
 * `label` used to be here too ('1ST'/'2ND'/'3RD') and the leaderboard printed
 * it inside a bordered box while every other row showed a bare number in a
 * grey box. Two shapes and two vocabularies for one column. The number is the
 * rank at every position now and the medal is carried by colour alone, which
 * is also the only treatment that survives being put in a 20px-wide summary
 * card beside the same list on the overview.
 *
 * The values are in `shared/palette.ts` with the tokens they mirror. There was
 * a second, older set (#c0c0c0 / #cd7f32) reached through a RANK_COLORS table,
 * so "what colour is second place" had two answers; the array order here is
 * the only one now.
 */
export const MEDAL = [
  { color: MEDAL_GOLD },
  { color: MEDAL_SILVER },
  { color: MEDAL_BRONZE },
]
