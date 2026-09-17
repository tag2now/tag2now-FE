import type { ApiReservation } from '@/reservation/reservationApi'

/** Presentation-only, kept out of reservationApi so it survives that module
 * being mocked wholesale in tests — and so the overview and the reservation tab
 * name a match the same way rather than each holding its own table. */
export const MATCH_TYPE_LABELS: Record<ApiReservation['match_type'], string> = {
  rank_match: '랭크매치',
  player_match: '플레이어 매치',
  any: '상관없음',
}

export const kstTimeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })

/** Still taking people: open, and not yet full.
 *
 * Three places ask this — the sidebar badge, the overview's KPI and the
 * overview's list — and each held its own copy of the rule. A `matched`
 * reservation is not joinable even though it is not cancelled either, which is
 * exactly the kind of detail one of three copies forgets. Here rather than in
 * `useReservations` because two of the three callers are not that hook. */
export const isJoinable = (r: Pick<ApiReservation, 'status' | 'participant_count' | 'capacity'>): boolean =>
  r.status === 'open' && r.participant_count < r.capacity
// en-CA writes a date as YYYY-MM-DD, which Date.parse reads back as UTC
// midnight — so two of them subtract to a whole number of days.
export const kstDateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })
const kstMonthDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })
const RELATIVE_DAYS: Record<number, string> = { [-1]: '어제', 0: '오늘', 1: '내일' }

/** Which Seoul day a start falls on, relative to now.
 *
 * The listing runs from an hour ago to the next 06:00, so everything it returns
 * is yesterday, today or tomorrow — and a bare time cannot tell tonight's 23:00
 * from the 01:00 after it. Anything further out is not something the server
 * sends, but it is outside data, so it gets a plain M/D rather than a lie.
 */
export function kstDayLabel(startAt: Date, now: Date): string {
  const days = (Date.parse(kstDateKey.format(startAt)) - Date.parse(kstDateKey.format(now))) / 86_400_000
  return RELATIVE_DAYS[days] ?? kstMonthDay.format(startAt)
}

/** Every TTT2 rank, lowest first — the order the game itself promotes through,
 * which is the only thing that makes "highest rank" a meaningful phrase. Here
 * rather than in the tab because the overview ranks the same list.
 *
 * All 43 of them. The list used to stop at Yaksa (26단); the seven above it are
 * real ranks a player can hold and reach us as a name we did not know, which
 * sorted them *below* Beginner — `rankIndex.get()` missing means -1. Verified
 * against the Tekken wiki's ranking list and two independent rank tables.
 *
 * The live backend reports only as far as Yaksa today, so the top seven appear
 * here without artwork under /ranks and without a confirmed colour band. That
 * is deliberate: knowing the order is what stops them sorting wrong, and it
 * costs nothing to know it before the backend catches up.
 */
export const RANK_ORDER = [
  'Beginner', '9th kyu', '8th kyu', '7th kyu',
  '6th kyu', '5th kyu', '4th kyu', '3rd kyu',
  '2nd kyu', '1st kyu', '1st dan', '2nd dan',
  '3rd dan', 'Disciple', 'Mentor', 'Master',
  'Grand Master', 'Brawler', 'Marauder', 'Fighter',
  'Berserker', 'Warrior', 'Avenger', 'Duelist',
  'Pugilist', 'Vanquisher', 'Destroyer', 'Conqueror',
  'Savior', 'Genbu', 'Byakko', 'Seiryu',
  'Suzaku', 'Fujin', 'Raijin', 'Yaksa',
  // 27단 and above. No banner art ships for these yet.
  'Majin', 'Toshin', 'Emperor', 'Tekken Lord',
  'Tekken Emperor', 'Tekken God', 'True Tekken God',
]

const rankIndex = new Map(RANK_ORDER.map((rank, index) => [rank, index]))

/** Where a rank sits, or -1 for one this build has not heard of. */
export const indexOfRank = (rank: string): number => rankIndex.get(rank) ?? -1

/** Highest first.
 *
 * A rank the list does not know sorts *last* rather than throwing the order
 * out. It used to land below Beginner, which is a specific wrong answer — an
 * unknown rank is far more likely to be one added above the current top than a
 * new bottom, and either way claiming it is the weakest is a guess. Last is the
 * honest place for "we do not know where this goes". */
export const sortRanksDescending = (ranks: string[]) =>
  [...ranks].sort((left, right) => {
    const a = indexOfRank(left)
    const b = indexOfRank(right)
    if (a === b) return left.localeCompare(right)
    if (a === -1) return 1
    if (b === -1) return -1
    return b - a
  })
