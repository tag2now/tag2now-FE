import { useCallback, useRef, useState } from 'react'
import type { ConfirmRequest } from '@/shared/components/ConfirmDialog'

/** `confirm()`'s ergonomics without `confirm()`.
 *
 * The reason the native dialog kept getting reached for is that it returns an
 * answer inline — `if (!confirm(...)) return` reads in one line, while a modal
 * normally forces the caller to split into "open it" and "what to do when it
 * comes back". This keeps the one-line shape by handing back a promise that
 * settles when the user picks, so the call site stays:
 *
 *     if (!await confirm({ title: '…' })) return
 *
 * A second request while one is open replaces it and answers the first `false`,
 * so a caller awaiting the old one always unblocks rather than hanging.
 */
export default function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const pending = useRef<((answer: boolean) => void) | null>(null)

  const confirm = useCallback((next: ConfirmRequest): Promise<boolean> => {
    pending.current?.(false)
    setRequest(next)
    return new Promise<boolean>((resolve) => { pending.current = resolve })
  }, [])

  const settle = useCallback((answer: boolean) => {
    pending.current?.(answer)
    pending.current = null
    setRequest(null)
  }, [])

  return {
    /** Ask, and await the answer. */
    confirm,
    /** Render `<ConfirmDialog>` while this is non-null. */
    request,
    onConfirm: useCallback(() => settle(true), [settle]),
    onCancel: useCallback(() => settle(false), [settle]),
  }
}
