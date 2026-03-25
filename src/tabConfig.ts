export const GROUP_LABELS: Record<string, string> = {
  player_match: '플매',
  rank_match: '랭매',
}

export const GROUP_ORDER: readonly string[] = ['rank_match', 'player_match']

export function formatGroupName(key: string): string {
  return GROUP_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
