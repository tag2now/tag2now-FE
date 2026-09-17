import type { CSSProperties } from 'react'
import * as P from '@/shared/palette'

/** The colour each rank band is painted in.
 *
 * Ten bands. The two numeric ones stay grey on purpose — 급 and 단 are the
 * climb before a colour is earned, and giving them a hue would imply a standing
 * they do not carry; 숫자급 is the dimmer of the two because it sits below.
 *
 * `보라단` and `황금단` cover the ranks above Toshin. The backend does not
 * report those yet, so the colours are here for the day it does rather than
 * leaving Tekken God grey.
 */
const TIER_COLORS: Record<string, string> = {
  '숫자급': 'var(--color-txt-faint)',
  '숫자단': 'var(--color-txt-dim)',
  '액자단': 'var(--color-tier-teal)',
  '녹단': 'var(--color-tier-green)',
  '노랑단': 'var(--color-tier-yellow)',
  '주황단': 'var(--color-tier-orange)',
  '빨강단': 'var(--color-tier-red)',
  '파랑단': 'var(--color-tier-blue)',
  '보라단': 'var(--color-tier-purple)',
  '황금단': 'var(--color-tier-gold)',
}

/** The neutral for a band we have not confirmed — see UNCONFIRMED_BAND. */
export const TIER_NEUTRAL = P.TXT_FAINT

/** A band's colour, or the neutral for one we do not know. Callers should use
 * this rather than indexing TIER_HEX, which returns undefined for a band the
 * backend adds later and paints the element with nothing at all. */
export const tierHex = (tier: string | null | undefined): string =>
  (tier && TIER_HEX[tier]) || TIER_NEUTRAL

/** The same ten bands as TIER_COLORS, as strings rather than `var()`. Both are
 * needed: the CSS form is what a stylesheet can cascade, and the string is what
 * `color-mix()` can resolve out of an inline `--tier`. Values come from
 * `shared/palette.ts`, so the two forms cannot name different colours. */
export const TIER_HEX: Record<string, string> = {
  '숫자급': P.TXT_FAINT,
  '숫자단': P.TXT_DIM,
  '액자단': P.TIER_TEAL,
  '녹단': P.TIER_GREEN,
  '노랑단': P.TIER_YELLOW,
  '주황단': P.TIER_ORANGE,
  '빨강단': P.TIER_RED,
  '파랑단': P.TIER_BLUE,
  '보라단': P.TIER_PURPLE,
  '황금단': P.TIER_GOLD,
}

/** The CSS variable for a band, or the neutral for one we have no colour for. */
export const tierColor = (tier: string | null | undefined): string =>
  (tier && TIER_COLORS[tier]) || 'var(--color-txt-dim)'

export const TIER_STYLES: Record<string, CSSProperties> = Object.fromEntries(
  Object.entries(TIER_COLORS).map(([k, v]) => [k, { color: v }]),
)
