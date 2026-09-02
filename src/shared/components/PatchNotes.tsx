import { useState } from 'react'
import { PATCH_NOTES, LATEST_PATCH_VERSION } from '@/config/patchNotes'
import useModalDialog from '@/shared/hooks/useModalDialog'
import { BellRing, X } from 'lucide-react'

const LS_KEY = 'ttt2-patch-dismissed'

export default function PatchNotes() {
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem(LS_KEY) !== LATEST_PATCH_VERSION
  })

  if (!visible) return null
  return <PatchNotesDialog onClose={() => setVisible(false)} />
}

function PatchNotesDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useModalDialog<HTMLDivElement>(onClose)

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
        className="relative bg-bg-panel border border-border-light rounded-lg max-w-md w-[90%] p-6 shadow-lg outline-none"
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

        {PATCH_NOTES.map(note => (
          <div key={note.version} className="mb-4">
            <h2 className="text-primary font-bold text-sm tracking-[0.12em] uppercase m-0 mb-2">
              v{note.version}
            </h2>
            <ul className="list-disc pl-5 m-0 space-y-1">
              {note.items.map((item, i) => (
                <li key={i} className="whitespace-pre-wrap text-txt text-md">{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <button
          onClick={dismiss}
          className="refresh-btn w-full ml-0 mb-0 mt-2 rounded"
        >
          다시 보지 않기
        </button>
      </div>
    </div>
  )
}
