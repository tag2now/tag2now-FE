import * as P from '@/shared/palette'

/** Recharts renders SVG presentation attributes, which cannot read a CSS custom
 * property — so the chart's colours have to reach it as strings. The strings
 * live in `shared/palette.ts` with the tokens they mirror; nothing here is a
 * literal.
 */
export const COLOR_PRIMARY = P.PRIMARY
export const COLOR_BORDER = P.CHART_GRID
export const COLOR_TXT_DIM = P.TXT_DIM
export const COLOR_BG_PANEL = P.BG_PANEL

export const TOOLTIP_STYLE = {
  background: COLOR_BG_PANEL,
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: 4,
  fontSize: 12,
  color: COLOR_TXT_DIM,
}

export function seriesName(key: 'unique_players' | 'peak_players') {
  return key === 'unique_players' ? '접속자 수' : '최대 동시 접속'
}

/** One colour per series, and the same colour in every chart that draws it, so
 * 최대 동시 접속 is the same gold on the hourly chart and the daily one:
 *
 *   접속자 수        the headline figure, so the brand red
 *   최대 동시 접속   a high-water mark, so the gold
 *
 * `--color-accent` (green) is deliberately not used: it already means "a win"
 * in the leaderboard's W/L and "online" in the Live badge.
 */
export const SERIES_COLOR = {
  unique_players: P.PRIMARY,
  peak_players: P.CHART_PEAK,
}
