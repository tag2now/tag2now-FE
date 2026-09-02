import type { ReactElement } from 'react'
import { RefreshCw } from 'lucide-react'

/** Shared loading/error panel.
 *
 * The error state names a way out rather than only reporting the failure: every
 * caller polls, so "try again" is genuinely the fix, and `onRetry` puts the
 * control in the panel the user is already looking at instead of making them
 * hunt for the toolbar behind the error.
 */
export function panelStatus(loading: boolean, error: string | null, loadingMsg?: string, onRetry?: () => void): ReactElement | null {
  if (loading) return <div className="panel"><p className="state-msg px-4" role="status">{loadingMsg}</p></div>
  if (error) return (
    <div className="panel">
      <div className="state-msg error px-4" role="alert">
        <p>불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        <p className="state-msg-detail">{error}</p>
        {onRetry && <button type="button" className="btn-ghost mt-3" onClick={onRetry}><RefreshCw size={14} aria-hidden="true" /> 다시 시도</button>}
      </div>
    </div>
  )
  return null
}
