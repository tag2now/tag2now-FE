const TIER_COLORS = {
  '액자단': 'var(--color-primary)',
  '녹단': '#4ade80',
  '노랑단': '#facc15',
  '주황단': '#fb923c',
  '빨강단': '#f87171',
  '파랑단': '#60a5fa',
  '보라단': '#c084fc',
  'God': 'var(--color-secondary)',
}

export const TIER_STYLES = Object.fromEntries(
  Object.entries(TIER_COLORS).map(([k, v]) => [k, { color: v }]),
)
