import type { CSSProperties } from 'react'

const TIER_COLORS: Record<string, string> = {
  '액자단': 'var(--color-primary)',
  '녹단': 'var(--color-tier-green)',
  '노랑단': 'var(--color-tier-yellow)',
  '주황단': 'var(--color-tier-orange)',
  '빨강단': 'var(--color-tier-red)',
  '파랑단': 'var(--color-tier-blue)',
  '보라단': 'var(--color-tier-purple)',
  'God': 'var(--color-secondary)',
}

export const TIER_STYLES: Record<string, CSSProperties> = Object.fromEntries(
  Object.entries(TIER_COLORS).map(([k, v]) => [k, { color: v }]),
)
