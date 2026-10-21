import { useLayoutEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import RankImage from '@/shared/components/RankImage'
import { SaveRank } from '@/shared/components/SaveCharTable'
import usePopover from '@/shared/hooks/usePopover'
import { rankBands, type RankBand as RankBandRows } from '@/shared/rankTiers'
import { tierHex } from '@/shared/tierColors'
import { RANK_ORDER } from '@/reservation/reservationLabels'

/** RANK_ORDER is indexed by the game's rank code. */
export const rankName = (code: number) => RANK_ORDER[code] ?? `계급 ${code}`

export const RankCode = ({ code }: { code: number }) => <SaveRank name={rankName(code)} />

/** Slides an open panel left until it ends inside the form or dialog holding
 * it, for a field far enough right that the panel would hang off it. The panel
 * is never wider than that box (100cqw), so it always fits. */
function useInsideBox(open: boolean) {
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!open || !panel) return
    const box = panel.closest('form, [role="dialog"]')!.getBoundingClientRect()
    const overhang = panel.getBoundingClientRect().right - box.right
    if (overhang > 0) panel.style.left = `${-overhang}px`
  }, [open])

  return panelRef
}

/** The reservation form's rank picker, as a single choice: bands strongest
 * first, each rank drawn. Ranks below `from` are shown but not offered. */
export default function RankField({ label, value, from, onChange, autoLabel, placeholder }: {
  label: string
  value: number | null
  from: number
  onChange: (value: number | null) => void
  /** Offers "no rank" under this name, answered as null. */
  autoLabel?: string
  /** Shown while nothing is chosen, without offering it as a choice. */
  placeholder?: string
}) {
  const [open, setOpen, rootRef] = usePopover()
  const panelRef = useInsideBox(open)
  const choose = (code: number | null) => {
    onChange(code)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="rank-field">
      <span className="field-label">{label}</span>
      <button
        type="button"
        className="input-base rank-field-toggle"
        aria-expanded={open}
        aria-label={`${label}: ${value === null ? autoLabel ?? placeholder : rankName(value)}`}
        onClick={() => setOpen((current) => !current)}
      >
        {value === null ? <span>{autoLabel ?? placeholder}</span> : <RankCode code={value} />}
        <ChevronDown size={15} aria-hidden="true" className={`text-primary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div ref={panelRef} className="rank-picker-panel rank-field-panel">
          {autoLabel && (
            <button
              type="button"
              className={`rank-field-auto${value === null ? ' is-active' : ''}`}
              aria-pressed={value === null}
              onClick={() => choose(null)}
            >
              {autoLabel}
            </button>
          )}
          <div className="rank-picker-bands max-h-72 overflow-y-auto pr-1">
            {rankBands().map((band) => <RankBand key={band.tier} band={band} value={value} from={from} onChoose={choose} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function RankBand({ band, value, from, onChoose }: {
  band: RankBandRows
  value: number | null
  from: number
  onChoose: (code: number) => void
}) {
  return (
    <div className="rank-band" style={{ '--tier': tierHex(band.tier) } as React.CSSProperties}>
      <span className="rank-band-label">{band.tier}</span>
      <div className="rank-band-grid">
        {band.rows.flat().map((rank, cell) => (rank === null
          ? <span key={`gap-${cell}`} aria-hidden="true" />
          : <RankOption key={rank} rank={rank} value={value} from={from} onChoose={onChoose} />))}
      </div>
    </div>
  )
}

function RankOption({ rank, value, from, onChoose }: {
  rank: string
  value: number | null
  from: number
  onChoose: (code: number) => void
}) {
  const code = RANK_ORDER.indexOf(rank)
  const selected = code === value
  const offered = code >= from
  return (
    <button
      type="button"
      aria-label={rank}
      aria-pressed={selected}
      disabled={!offered}
      onClick={() => onChoose(code)}
      className={`rank-option${selected ? ' selected' : ''}${offered ? '' : ' opacity-40'}`}
    >
      <RankImage rankInfo={{ name: rank }} className="rank-option-art" />
      <span className={`truncate text-[11px] tracking-[0.03em] ${selected ? 'text-primary-text' : 'text-txt-dim'}`}>{rank}</span>
    </button>
  )
}
