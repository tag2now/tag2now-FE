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

export const LEGEND_STYLE = { fontSize: 11, color: COLOR_TXT_DIM, paddingTop: 4 }

export function seriesName(key: string) {
	if (key === 'unique_players') return '접속자 수'
  return key === 'peak_players' ? '최대 동시 접속' : '평균'
}

/** One colour per series, and the same colour in every chart that draws it.
 *
 * The two charts on the stats tab sit side by side, and red meant 평균 in the
 * left one and 접속자 수 in the right one — so the only thing a reader could do
 * with a colour was match it against the legend of the chart they happened to
 * be looking at. Three series, three colours, no reuse:
 *
 *   접속자 수        the headline figure, so the brand red
 *   최대 동시 접속   a high-water mark, so the gold
 *   평균             the baseline the peak is measured against, so a neutral
 *                   that stays behind it rather than competing with it
 *
 * `--color-accent` (green) is deliberately not used: it already means "a win"
 * in the leaderboard's W/L and "online" in the Live badge.
 */
export const SERIES_COLOR: Record<string, string> = {
  unique_players: P.PRIMARY,
  peak_players: P.CHART_PEAK,
  avg_players: P.CHART_AVG,
}

/** The order the tooltip and the legend list a chart's series in.
 *
 * It has to be stated, twice, because Recharts 3 reads neither from the order
 * the `<Line>`/`<Bar>` children are declared in: it produced 최대 동시 접속
 * above 접속자 수 while drawing the 접속자 수 line above it on the plot. The
 * eye reads a chart top down, and a list that disagrees leaves the reader
 * matching items to lines by colour.
 *
 * Highest first, and the ranking is a fact rather than a preference: a day's
 * unique players cannot be fewer than that day's peak concurrent, and a peak
 * cannot fall below its own average. So this order is also the drawing order,
 * whatever the numbers are.
 */
const SERIES_ORDER = ['unique_players', 'peak_players', 'avg_players']

export const seriesRank = (key: string): number => {
  const index = SERIES_ORDER.indexOf(key)
  return index === -1 ? SERIES_ORDER.length : index
}
