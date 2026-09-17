import { SERIES_COLOR, seriesName, seriesRank } from '@/shared/components/chartTheme'

/** One entry as Recharts hands it over. Typed here rather than imported from
 * `recharts/types/...`, which is a deep path into the package's internals. */
interface LegendEntry {
  value?: string
  color?: string
  type?: string
  dataKey?: string | number | ((datum: unknown) => unknown)
}

/** The legend, in the order the plot draws its series.
 *
 * Recharts 3 gives no way to state that order through props: it derives the
 * payload itself and ignores the order the `<Line>`/`<Bar>` children are
 * declared in — the daily chart listed 최대 동시 접속 first while drawing the
 * 접속자 수 line above it — and the `payload` prop that used to override it is
 * `Omit`ted from the component's type in this major version. A content
 * renderer is handed the collected payload, so sorting happens here.
 *
 * See `seriesRank` in chartTheme for why the order is a fact about the data
 * rather than a preference.
 */
export default function ChartLegend({ payload = [] }: { payload?: LegendEntry[] }) {
  const items = [...payload].sort((a, b) => seriesRank(keyOf(a)) - seriesRank(keyOf(b)))

  return (
    <ul className="chart-legend">
      {items.map((entry) => {
        const key = keyOf(entry)
        const color = SERIES_COLOR[key] ?? entry.color
        return (
          <li key={key}>
            {/* A bar and a line are different kinds of series, and the composed
                chart draws both — so the swatch says which, the way Recharts'
                own glyphs did. */}
            <span
              className={entry.type === 'line' ? 'chart-legend-line' : 'chart-legend-rect'}
              style={{ '--series': color } as React.CSSProperties}
              aria-hidden="true"
            />
            {seriesName(key)}
          </li>
        )
      })}
    </ul>
  )
}

const keyOf = (entry: LegendEntry): string =>
  String(entry.dataKey ?? entry.value ?? '')
