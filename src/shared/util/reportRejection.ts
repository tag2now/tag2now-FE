import toast from 'react-hot-toast'
import { AppError } from '@/shared/util/AppError'

/** Shown when an AppError reached here carrying only a status-code string. */
const UNEXPLAINED = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'

/**
 * Shows an unhandled rejection to the user, but only when this app raised it.
 *
 * Anything else on the page — third-party scripts such as analytics, browser
 * extensions — is left alone: without preventDefault() the browser keeps its
 * own console reporting, which is where those belong.
 *
 * An AppError is still claimed even when its message is not fit to show: the
 * app did raise it, so the browser reporting it a second time helps nobody.
 * What the user sees is a Korean line instead of "request failed: 500".
 */
export const reportRejection = (e: PromiseRejectionEvent) => {
  if (!(e.reason instanceof AppError)) return
  e.preventDefault()
  toast.error(e.reason.explained ? e.reason.message : UNEXPLAINED)
}
