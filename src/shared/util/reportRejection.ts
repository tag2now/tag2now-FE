import toast from 'react-hot-toast'
import { AppError } from '@/shared/util/AppError'

/**
 * Shows an unhandled rejection to the user, but only when this app raised it.
 *
 * Anything else on the page — third-party scripts such as analytics, browser
 * extensions — is left alone: without preventDefault() the browser keeps its
 * own console reporting, which is where those belong.
 */
export const reportRejection = (e: PromiseRejectionEvent) => {
  if (!(e.reason instanceof AppError)) return
  e.preventDefault()
  toast.error(e.reason.message)
}
