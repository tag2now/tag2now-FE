import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Escape must reach only the innermost dialog. Every open dialog pushes itself
// here on mount and pops on unmount, so the nested reservation pickers close
// before the form they sit inside rather than both closing at once.
const openDialogs: symbol[] = []

function focusableWithin(container: HTMLElement): HTMLElement[] {
  // checkVisibility skips display:none and hidden subtrees. jsdom has no layout
  // engine and does not implement it, so treat everything as visible there —
  // the selector already excludes disabled controls.
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter((el) => el.checkVisibility?.() ?? true)
}

function trapTab(event: KeyboardEvent, dialog: HTMLElement) {
  const focusable = focusableWithin(dialog)
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const target = event.shiftKey
    ? (document.activeElement === first ? last : null)
    : (document.activeElement === last ? first : null)
  if (!target) return
  event.preventDefault()
  target.focus()
}

/**
 * Wires an open modal dialog to the keyboard: moves focus in, keeps Tab inside,
 * closes on Escape and restores focus to whatever opened it.
 *
 * The dialog is assumed mounted only while open — every caller renders it behind
 * a condition — so there is no `isOpen` argument. Attach the returned ref to the
 * element carrying `role="dialog"`.
 */
export default function useModalDialog<T extends HTMLElement = HTMLElement>(onClose: () => void) {
  const dialogRef = useRef<T>(null)
  // Read through a ref so a caller passing an inline arrow does not re-run the effect.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousFocus = document.activeElement as HTMLElement | null
    const id = Symbol('dialog')
    openDialogs.push(id)

    const initial = focusableWithin(dialog)[0]
    if (initial) initial.focus()
    else {
      dialog.tabIndex = -1
      dialog.focus()
    }

    const handler = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== id) return
      if (event.key === 'Escape') { event.stopPropagation(); onCloseRef.current(); return }
      if (event.key === 'Tab') trapTab(event, dialog)
    }

    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      openDialogs.splice(openDialogs.indexOf(id), 1)
      previousFocus?.focus()
    }
  }, [])

  return dialogRef
}
