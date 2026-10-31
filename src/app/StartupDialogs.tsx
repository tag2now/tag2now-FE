import { useState } from 'react'
import PatchNotes, { hasUnseenPatchNotes } from '@/shared/components/PatchNotes'
import SitePopups from '@/popup/SitePopups'

/** One overlay at a time on opening the site: the patch notes, then the popups. */
export default function StartupDialogs() {
  const [patchNotesOpen, setPatchNotesOpen] = useState(hasUnseenPatchNotes)

  if (patchNotesOpen) return <PatchNotes onClose={() => setPatchNotesOpen(false)} />
  return <SitePopups />
}
