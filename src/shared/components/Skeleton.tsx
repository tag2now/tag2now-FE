/** Placeholders shaped like the content that is coming.
 *
 * The loading state was a 150px dashed box with a line of uppercase text in it,
 * for panels whose real content is a table of 42px rows. The panel therefore
 * jumped by hundreds of pixels the moment data arrived, and on a poll-driven
 * site that happens on every cold load of every tab.
 *
 * These reserve the real height instead, so the arrival of data changes what is
 * in the rows rather than where everything below them sits.
 *
 * They are decorative: the row count is a guess at the payload, not a claim
 * about it, so the placeholder itself is `aria-hidden`. A screen reader hears
 * the `label`, not sixty empty table cells.
 *
 * `label` is optional *because* it becomes a live region. A panel that stacks
 * two of these — the overview shows cards above a list — must label only one,
 * or the same load is announced twice.
 */

export function TableSkeleton({ rows = 8, columns = 4, label }: {
  rows?: number
  columns?: number
  label?: string
}) {
  return (
    <div className="skeleton-wrap">
      {label && <p className="sr-only" role="status">{label}</p>}
      <div className="data-table-wrap" aria-hidden="true">
        <div className="skeleton-table">
          <div className="skeleton-row is-head">
            {Array.from({ length: columns }, (_, index) => (
              <span key={index} className="skeleton-cell" />
            ))}
          </div>
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="skeleton-row">
              {Array.from({ length: columns }, (_, index) => (
                <span key={index} className="skeleton-cell" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 4, label }: { rows?: number, label?: string }) {
  return (
    <div className="skeleton-wrap">
      {label && <p className="sr-only" role="status">{label}</p>}
      <div className="skeleton-list" aria-hidden="true">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="skeleton-list-row">
            <span className="skeleton-cell skeleton-avatar" />
            <span className="skeleton-lines">
              <span className="skeleton-cell" />
              <span className="skeleton-cell is-short" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardGridSkeleton({ cards = 4, label }: { cards?: number, label?: string }) {
  return (
    <div className="skeleton-wrap">
      {label && <p className="sr-only" role="status">{label}</p>}
      <div className="skeleton-cards" aria-hidden="true">
        {Array.from({ length: cards }, (_, card) => (
          <div key={card} className="skeleton-card">
            <span className="skeleton-cell is-short" />
            <span className="skeleton-cell skeleton-figure" />
          </div>
        ))}
      </div>
    </div>
  )
}
