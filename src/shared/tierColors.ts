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

export const TIER_HEX: Record<string, string> = {
  '액자단': '#00c8d4',
  '녹단': '#4ade80',
  '노랑단': '#facc15',
  '주황단': '#fb923c',
  '빨강단': '#f87171',
  '파랑단': '#60a5fa',
  '보라단': '#c084fc',
  'God': '#c9a84c',
}

export const RANK_COLORS: Record<number, string> = { 1: 'text-secondary-light', 2: 'text-silver', 3: 'text-bronze' }

export const TIER_STYLES: Record<string, CSSProperties> = Object.fromEntries(
  Object.entries(TIER_COLORS).map(([k, v]) => [k, { color: v }]),
)
