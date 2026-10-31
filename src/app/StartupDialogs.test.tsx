import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StartupDialogs from '@/app/StartupDialogs'
import { LATEST_PATCH_VERSION } from '@/config/patchNotes'
import { getActivePopups } from '@/popup/popupApi'
import { STORAGE_KEYS } from '@/shared/util/storage'

vi.mock('@/popup/popupApi', () => ({ getActivePopups: vi.fn() }))

describe('StartupDialogs', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(getActivePopups).mockResolvedValue([{
      id: 1, title: '이벤트 안내', body: '', image_path: null, allow_dismiss_forever: true, allow_dismiss_day: true,
    }])
  })
  afterEach(() => vi.clearAllMocks())

  it('opens the patch notes first and the popups only once they close', async () => {
    render(<StartupDialogs />)

    expect(screen.getByRole('dialog', { name: 'Patch Notes' })).toBeInTheDocument()
    expect(getActivePopups).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(await screen.findByRole('dialog', { name: '이벤트 안내' })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('goes straight to the popups when the patch notes are already dismissed', async () => {
    localStorage.setItem(STORAGE_KEYS.seenPatchVersion, LATEST_PATCH_VERSION)
    render(<StartupDialogs />)

    expect(await screen.findByRole('dialog', { name: '이벤트 안내' })).toBeInTheDocument()
  })
})
