import { useState, useEffect, useRef } from 'react'
import {APP_VERSION} from "@/config/version";

const LS_KEY = 'ttt2-patch-dismissed'

const NOTES: { version: string; items: string[] }[] = [
  {
    version: '1.1',
    items: [
      '유저 이름 클릭 시 플레이어 히스토리 패널 오픈\n(리더보드, 랭크매치, 주간 철악귀)',
      '플레이어 히스토리에 활동 시간대 차트 추가',
    ],
  },
  {
    version: '1.0.7',
    items: ['글쓰기 에러 수정'],
  },
  {
    version: '1.0.6',
    items: ['커뮤니티 게시판 추가\n(글쓰기, 댓글, 추천/비추천, 현재는 단순 텍스트만 가능)'],
  },
  {
    version: '1.0.5',
    items: [
      '랭크 이미지 추가',
      '1p 2p 랜덤 표시'
    ],
  },
  {
    version: '1.0.4',
    items: ['상단바에 유저 설정 가능, 설정 시 해당 유저 계급 표시'],
  }
]

export default function PatchNotes() {
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem(LS_KEY) !== APP_VERSION
  })

  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!visible) return
    previousFocusRef.current = document.activeElement as HTMLElement
    const dialog = dialogRef.current
    dialog?.focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab' || !dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible])

  if (!visible) return null

  function close() {
    setVisible(false)
    previousFocusRef.current?.focus()
  }

  function dismiss() {
    localStorage.setItem(LS_KEY, APP_VERSION)
    setVisible(false)
    previousFocusRef.current?.focus()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={close} role="presentation">
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
          onClick={close}
          className="absolute top-3 right-3 bg-transparent border-none text-txt-dim hover:text-txt text-4xl cursor-pointer leading-none p-2"
          aria-label="Close"
        >
          &times;
        </button>

        <h2 id="patch-notes-title" className="font-display text-lg font-bold text-secondary m-0 mb-4 tracking-wide uppercase">
          Patch Notes
        </h2>

        {NOTES.map(note => (
          <div key={note.version} className="mb-4">
            <h3 className="text-primary font-bold text-sm tracking-[0.12em] uppercase m-0 mb-2">
              v{note.version}
            </h3>
            <ul className="list-disc pl-5 m-0 space-y-1">
              {note.items.map((item, i) => (
                <li key={i} className="whitespace-pre-wrap text-txt text-sm">{item}</li>
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
