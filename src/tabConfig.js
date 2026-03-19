export const GROUP_LABELS = {
  player_match: '플매',
  rank_match: '랭크매치',
}

export const GROUP_ORDER = ['rank_match', 'player_match']

export function formatGroupName(key) {
  return GROUP_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
