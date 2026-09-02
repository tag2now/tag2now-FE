import { describe, it, expect } from 'vitest'
import { PATCH_NOTE_LINE_BUDGET, PATCH_NOTES, recentPatchNotes, type PatchNote } from '@/config/patchNotes'

const note = (version: string, itemCount: number): PatchNote => ({
  version,
  items: Array.from({ length: itemCount }, (_, i) => `item ${i}`),
})

const lineCount = (notes: PatchNote[]) =>
  notes.reduce((sum, n) => sum + 1 + n.items.length, 0)

describe('recentPatchNotes', () => {
  it('keeps taking versions while they fit the budget', () => {
    // 3 + 3 + 3 = 9 lines; a fourth would reach 12.
    const notes = [note('3', 2), note('2', 2), note('1', 2), note('0', 2)]

    expect(recentPatchNotes(notes).map(n => n.version)).toEqual(['3', '2', '1'])
  })

  it('drops a version that would overrun the budget rather than splitting it', () => {
    // The second version costs 9 lines on its own and cannot be part-rendered.
    const notes = [note('2', 2), note('1', 8)]

    expect(recentPatchNotes(notes).map(n => n.version)).toEqual(['2'])
  })

  it('keeps the newest version whole even when it alone exceeds the budget', () => {
    // Collapsing to an empty dialog would be worse than overshooting once.
    const notes = [note('2', PATCH_NOTE_LINE_BUDGET + 5)]

    expect(recentPatchNotes(notes)).toHaveLength(1)
  })

  it('returns everything when the whole history fits', () => {
    const notes = [note('2', 1), note('1', 1)]

    expect(recentPatchNotes(notes)).toEqual(notes)
  })

  it('holds the real patch notes to the budget', () => {
    const recent = recentPatchNotes()

    expect(recent.length).toBeGreaterThan(0)
    expect(lineCount(recent)).toBeLessThanOrEqual(PATCH_NOTE_LINE_BUDGET)
    expect(recent[0]).toEqual(PATCH_NOTES[0])
  })
})
