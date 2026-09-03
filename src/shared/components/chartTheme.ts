/** Design tokens as JS constants.
 *
 * Recharts renders SVG attributes, which cannot read CSS custom properties, so
 * these mirror the `@theme` block in index.css by hand. Keep them in step when
 * a token moves.
 */
export const COLOR_PRIMARY = '#e63946'
export const COLOR_SECONDARY = '#c9a84c'
export const COLOR_BORDER = 'rgba(255,255,255,.10)'
export const COLOR_TXT_DIM = '#a3a3ad'
export const COLOR_BG_PANEL = '#151517'

export const TOOLTIP_STYLE = {
  background: COLOR_BG_PANEL,
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: 4,
  fontSize: 12,
  color: COLOR_TXT_DIM,
}

export const LEGEND_STYLE = { fontSize: 11, color: COLOR_TXT_DIM, paddingTop: 4 }

export function seriesName(key: string) {
	if (key === 'unique_players') return '접속자 수'
  return key === 'peak_players' ? '최대 동시 접속' : '평균'
}
