import { useState, useSyncExternalStore } from 'react'
import { hasUnseenPatchNotes } from '@/shared/components/PatchNotes'
import { STORAGE_KEYS, readItem, writeItem } from '@/shared/util/storage'
import { canAddToIosHomeScreen } from './iosHomeScreen'
import { pendingInstallPrompt, promptInstall, subscribeInstallPrompt } from './installPrompt'

/** `prompt`: the browser can install, behind a button. `ios`: only the share
 * sheet can, so the sheet explains the route. */
export type InstallSheetKind = 'prompt' | 'ios'

export interface InstallSheetState {
  kind: InstallSheetKind | null
  install: () => void
  dismiss: () => void
}

/** Decides whether the install sheet shows, and which one. It waits out a visit
 * that opened on the patch notes, so a first look never has two overlays to
 * close, and once closed or used it stays closed. */
export default function useInstallSheet(): InstallSheetState {
  const offer = useSyncExternalStore(subscribeInstallPrompt, pendingInstallPrompt, () => null)
  const [ios] = useState(() => canAddToIosHomeScreen(navigator))
  const [suppressed, setSuppressed] = useState(
    () => hasUnseenPatchNotes() || readItem(STORAGE_KEYS.installSheetDismissed) !== null,
  )

  const dismiss = () => {
    writeItem(STORAGE_KEYS.installSheetDismissed, '1')
    setSuppressed(true)
  }
  // Whatever the dialog's answer, the sheet has done its job: an install
  // leaves nothing to offer, and a "no" there is a no here too.
  const install = () => {
    promptInstall(offer!)
    dismiss()
  }

  const kind = offer ? 'prompt' : ios ? 'ios' : null
  return { kind: suppressed ? null : kind, install, dismiss }
}
