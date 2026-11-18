import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { apiUrl } from '@/shared/util/api'
import useModalDialog from '@/shared/hooks/useModalDialog'
import { getActivePopups } from '@/popup/popupApi'
import { dismissPopup, isDismissed, type DismissSpan } from '@/popup/popupDismissal'
import type { Popup } from '@/popup/types'

// Every way out stays shut this long, so a notice is seen before it is closed.
const CLOSE_DELAY_SECONDS = 4

function useCountdown(seconds: number) {
  const [endsAt] = useState(() => Date.now() + seconds * 1000)
  const [left, setLeft] = useState(seconds)
  // Read from the deadline, not counted per tick, so a clock that jumps ahead releases it at once.
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(Math.ceil((endsAt - Date.now()) / 1000), 0)), 250)
    return () => clearInterval(timer)
  }, [endsAt])
  return left
}

/** The popups this browser has not dismissed, one at a time. A failed read shows
 * nothing: a notice must never stand between a visitor and the site. */
export default function SitePopups() {
  const [queue, setQueue] = useState<Popup[]>([])

  useEffect(() => {
    let stale = false
    getActivePopups()
      .then((popups) => { if (!stale) setQueue(popups.filter((popup) => !isDismissed(popup.id))) })
      .catch(() => {})
    return () => { stale = true }
  }, [])

  const popup = queue[0]
  if (!popup) return null
  return <PopupDialog key={popup.id} popup={popup} onClose={() => setQueue((rest) => rest.slice(1))} />
}

function PopupDialog({ popup, onClose }: { popup: Popup, onClose: () => void }) {
  const secondsLeft = useCountdown(CLOSE_DELAY_SECONDS)
  const locked = secondsLeft > 0
  const close = () => { if (!locked) onClose() }
  const dialogRef = useModalDialog<HTMLDivElement>(close)
  const titleId = `popup-title-${popup.id}`

  function dismiss(span: DismissSpan) {
    dismissPopup(popup.id, span)
    onClose()
  }

  return (
    <div className="modal-backdrop items-center justify-center" onClick={close} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex flex-col max-h-[calc(100dvh-2rem)] bg-bg-panel border border-border-light rounded-lg max-w-md md:max-w-2xl w-[90%] p-6 shadow-lg outline-none"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={locked}
          className="absolute top-3 right-3 grid place-items-center size-[34px] bg-transparent border-none text-txt-dim hover:text-txt disabled:hover:text-txt-dim text-base font-bold tabular-nums cursor-pointer disabled:cursor-default leading-none p-2"
          aria-label="Close"
        >
          {locked ? <span aria-hidden="true">{secondsLeft}</span> : <X size={18} aria-hidden="true" />}
        </button>

        <h2 id={titleId} className="font-display text-lg md:text-xl font-bold text-secondary m-0 mb-4 pr-8 tracking-wide">
          {popup.title}
        </h2>

        <div className="-mr-3 min-h-0 flex-1 overflow-y-auto pr-3">
          {popup.body && <p className="whitespace-pre-wrap text-txt text-base md:text-md m-0">{popup.body}</p>}
          {popup.image_path && (
            <img
              src={apiUrl(popup.image_path)}
              alt={popup.title}
              className="mt-3 first:mt-0 w-full h-auto rounded-md border border-border-light"
            />
          )}
        </div>

        {(popup.allow_dismiss_day || popup.allow_dismiss_forever) && (
          <div className="flex gap-2 mt-4 shrink-0">
            {popup.allow_dismiss_day && (
              <button onClick={() => dismiss('day')} disabled={locked} className="btn-ghost flex-1">하루 동안 보지 않기</button>
            )}
            {popup.allow_dismiss_forever && (
              <button onClick={() => dismiss('forever')} disabled={locked} className="btn-ghost flex-1">다시 보지 않기</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
