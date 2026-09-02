import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import useModalDialog from './useModalDialog'

function Dialog({ onClose, label = '대화상자' }: { onClose: () => void; label?: string }) {
  const ref = useModalDialog<HTMLDivElement>(onClose)
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={label}>
      <button>첫 번째</button>
      <button>두 번째</button>
    </div>
  )
}

function Harness({ onClose }: { onClose?: () => void } = {}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>열기</button>
      {open && <Dialog onClose={() => { setOpen(false); onClose?.() }} />}
    </>
  )
}

describe('useModalDialog', () => {
  it('closes on Escape', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('moves focus into the dialog on open', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))

    // Focus used to stay on the trigger, leaving keyboard users to tab through
    // the whole page before reaching the dialog they just opened.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '첫 번째' }))
  })

  it('restores focus to the trigger on close', () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: '열기' })
    trigger.focus()
    fireEvent.click(trigger)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(document.activeElement).toBe(trigger)
  })

  it('wraps Tab from the last control back to the first', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    const last = screen.getByRole('button', { name: '두 번째' })
    last.focus()

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '첫 번째' }))
  })

  it('wraps Shift+Tab from the first control back to the last', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '두 번째' }))
  })

  it('closes only the innermost dialog on Escape', () => {
    function Nested() {
      const [outer, setOuter] = useState(true)
      const [inner, setInner] = useState(true)
      return (
        <>
          {outer && <Dialog onClose={() => setOuter(false)} label="바깥" />}
          {inner && <Dialog onClose={() => setInner(false)} label="안쪽" />}
        </>
      )
    }
    render(<Nested />)

    fireEvent.keyDown(document, { key: 'Escape' })

    // The reservation form nests a time picker inside itself. One Escape must
    // dismiss the picker and leave the form the user was filling in open.
    expect(screen.queryByRole('dialog', { name: '안쪽' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '바깥' })).toBeInTheDocument()
  })
})
