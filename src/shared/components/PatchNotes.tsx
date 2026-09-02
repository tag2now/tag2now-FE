import { useState } from 'react'
import { PATCH_NOTES, LATEST_PATCH_VERSION, recentPatchNotes } from '@/config/patchNotes'
import useModalDialog from '@/shared/hooks/useModalDialog'
import { BellRing, ChevronDown, X } from 'lucide-react'

const LS_KEY = 'ttt2-patch-dismissed'

export default function PatchNotes() {
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem(LS_KEY) !== LATEST_PATCH_VERSION
  })

  if (!visible) return null
  return <PatchNotesDialog onClose={() => setVisible(false)} />
}

const RECENT_NOTES = recentPatchNotes()
const OLDER_COUNT = PATCH_NOTES.length - RECENT_NOTES.length

function PatchNotesDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useModalDialog<HTMLDivElement>(onClose)
  const [showAll, setShowAll] = useState(false)
  const notes = showAll ? PATCH_NOTES : RECENT_NOTES

  function dismiss() {
    localStorage.setItem(LS_KEY, LATEST_PATCH_VERSION)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patch-notes-title"
        tabIndex={-1}
        className="relative flex flex-col max-h-[80dvh] bg-bg-panel border border-border-light rounded-lg max-w-md w-[90%] p-6 shadow-lg outline-none"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-transparent border-none text-txt-dim hover:text-txt text-4xl cursor-pointer leading-none p-2"
          aria-label="Close"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <h2 id="patch-notes-title" className="font-display text-lg font-bold text-secondary m-0 mb-4 tracking-wide uppercase">
          <span className="inline-flex items-center gap-2"><BellRing size={17} /> Patch Notes</span>
        </h2>

        {/* Only the version list scrolls: the title and the dismiss button stay
            reachable however many releases accumulate below. */}
        <div className="-mr-3 min-h-0 flex-1 overflow-y-auto pr-3">
          {notes.map(note => (
            <div key={note.version} className="mb-4 last:mb-0">
              <h3 className="text-primary-text font-bold text-sm tracking-[0.12em] uppercase m-0 mb-2">
                v{note.version}
              </h3>
              <ul className="list-disc pl-5 m-0 space-y-1">
                {note.items.map((item, i) => (
                  <li key={i} className="whitespace-pre-wrap text-txt text-sm">{item}</li>
                ))}
              </ul>
            </div>
          ))}

          {OLDER_COUNT > 0 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 inline-flex items-center gap-1 bg-transparent border-none p-0 text-txt-dim hover:text-txt text-sm cursor-pointer"
            >
              이전 버전 {OLDER_COUNT}개 더보기
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          onClick={dismiss}
          className="btn-ghost w-full mt-4 shrink-0"
        >
          다시 보지 않기
        </button>
      </div>
    </div>
  )
}
