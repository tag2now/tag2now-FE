/** TTT2 ranks in ascending promotion order; indexes are save rank codes. */
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
  'Majin', 'Toshin', 'Emperor', 'Tekken Lord',
  'Tekken Emperor', 'Tekken God', 'True Tekken God',
]

const rankIndex = new Map(RANK_ORDER.map((rank, index) => [rank, index]))

export const rankName = (code: number): string => RANK_ORDER[code] ?? `계급 ${code}`

/** Unknown names have no promotion position. */
export const indexOfRank = (rank: string): number => rankIndex.get(rank) ?? -1

/** Highest first, with unknown ranks last and the supplied array unchanged. */
export const sortRanksDescending = (ranks: string[]) =>
  [...ranks].sort((left, right) => {
    const a = indexOfRank(left)
    const b = indexOfRank(right)
    if (a === b) return left.localeCompare(right)
    if (a === -1) return 1
    if (b === -1) return -1
    return b - a
  })
