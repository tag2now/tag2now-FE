import { AlertTriangle } from 'lucide-react'
import useModalDialog from '@/shared/hooks/useModalDialog'

export interface ConfirmRequest {
  /** Heading, and the accessible name of the dialog. */
  title: string
  /** What the user is agreeing to. Consequences belong here, not in the title. */
  body?: string
  /** Label of the button that goes through with it. */
  confirmLabel?: string
  /** Destructive actions paint the confirm button as a danger control. */
  tone?: 'danger' | 'default'
}

/** The app's own confirmation, replacing `window.confirm`.
 *
 * `confirm()` was doing this job in two places, and it is the wrong control
 * here for reasons that are not cosmetic: it is rendered by the browser, so it
 * ignores the theme entirely, prefixes the message with the site's hostname on
 * mobile, blocks the main thread while it is open, and cannot be styled to
 * distinguish "delete this" from "are you sure?". It is also untestable except
 * by stubbing a global.
 *
 * This shares `useModalDialog` with the reservation form, so it inherits the
 * focus trap, Escape handling and focus restoration — including the nesting
 * rule that closes the innermost dialog first, which matters because this can
 * open on top of the reservation editor.
 */
export default function ConfirmDialog({ request, onConfirm, onCancel }: {
  request: ConfirmRequest
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef = useModalDialog<HTMLDivElement>(onCancel)
  const danger = request.tone !== 'default'

  return (
    <div className="modal-backdrop">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={request.body ? 'confirm-dialog-body' : undefined}
        className="confirm-dialog"
      >
        <div className="confirm-dialog-head">
          <span className={`confirm-dialog-icon${danger ? ' is-danger' : ''}`} aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <h2 id="confirm-dialog-title">{request.title}</h2>
        </div>
        {request.body && <p id="confirm-dialog-body" className="confirm-dialog-body">{request.body}</p>}
        <div className="confirm-dialog-actions">
          {/* Cancel first in the DOM so it takes initial focus: the dialog only
              appears in front of an action that cannot be undone, and the safe
              choice is the one a stray Enter should land on. */}
          <button type="button" className="btn-ghost" onClick={onCancel}>취소</button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            {request.confirmLabel ?? '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}
