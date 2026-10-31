import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { apiUrl } from '@/shared/util/api'
import useModalDialog from '@/shared/hooks/useModalDialog'
import { getActivePopups } from '@/popup/popupApi'
import { dismissPopup, isDismissed, type DismissSpan } from '@/popup/popupDismissal'
import type { Popup } from '@/popup/types'

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
  const dialogRef = useModalDialog<HTMLDivElement>(onClose)
  const titleId = `popup-title-${popup.id}`

  function dismiss(span: DismissSpan) {
    dismissPopup(popup.id, span)
    onClose()
  }

  return (
    <div className="modal-backdrop items-center justify-center" onClick={onClose} role="presentation">
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
          className="absolute top-3 right-3 bg-transparent border-none text-txt-dim hover:text-txt text-4xl cursor-pointer leading-none p-2"
          aria-label="Close"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <h2 id={titleId} className="font-display text-lg font-bold text-secondary m-0 mb-4 pr-8 tracking-wide">
          {popup.title}
        </h2>

        <div className="-mr-3 min-h-0 flex-1 overflow-y-auto pr-3">
          {popup.body && <p className="whitespace-pre-wrap text-txt text-sm m-0">{popup.body}</p>}
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
              <button onClick={() => dismiss('day')} className="btn-ghost flex-1">하루 동안 보지 않기</button>
            )}
            {popup.allow_dismiss_forever && (
              <button onClick={() => dismiss('forever')} className="btn-ghost flex-1">다시 보지 않기</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
