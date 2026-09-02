import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PatchNotes from '@/shared/components/PatchNotes'
import { PATCH_NOTES, recentPatchNotes } from '@/config/patchNotes'

const RECENT = recentPatchNotes()
const OLDER = PATCH_NOTES.slice(RECENT.length)

describe('PatchNotes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('opens on the recent releases only', () => {
    render(<PatchNotes />)

    expect(screen.getByRole('heading', { name: `v${RECENT[0].version}` })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: `v${OLDER[0].version}` })).not.toBeInTheDocument()
  })

  it('reveals the rest of the history on demand', () => {
    render(<PatchNotes />)

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`이전 버전 ${OLDER.length}개`) }))

    expect(screen.getByRole('heading', { name: `v${OLDER.at(-1)!.version}` })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /더보기/ })).not.toBeInTheDocument()
  })

  it('stays shut once dismissed for this version', () => {
    const { unmount } = render(<PatchNotes />)
    fireEvent.click(screen.getByRole('button', { name: '다시 보지 않기' }))
    unmount()

    render(<PatchNotes />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
