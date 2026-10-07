import toast from 'react-hot-toast'
import { AppError } from '@/shared/util/AppError'

/** A failed send or delete, said in a toast: the server's own sentence when it
 * gave one — the 429 for sending too fast reads well as it is — else `fallback`.
 *
 * Caught here rather than left to the global rejection handler, which shows
 * only an AppError: a dropped connection is a TypeError and would be silent. */
export default function showFailure(error: unknown, fallback: string): void {
  toast.error(error instanceof AppError && error.explained ? error.message : fallback)
}
