import type { ReactNode } from 'react'
import { act, renderHook, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import useAppUpdate from './useAppUpdate'
import { reloadPage } from '@/shared/util/reloadPage'

vi.mock('@/shared/util/reloadPage', () => ({ reloadPage: vi.fn() }))

const NEWER = `${__BUILD_ID__}-next`

function deploy(buildId: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ buildId }) }))
}

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}<Toaster /></MemoryRouter>
}

function renderApp() {
  return renderHook(() => {
    useAppUpdate()
    return useNavigate()
  }, { wrapper })
}

async function returnToTab() {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

function typeIntoField(text: string) {
  const field = document.createElement('textarea')
  field.value = text
  document.body.append(field)
}

// The Toaster asks for reduced motion, and jsdom has no matchMedia.
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.mocked(reloadPage).mockClear()
  act(() => toast.remove())
  sessionStorage.clear()
  document.querySelectorAll('textarea').forEach((field) => field.remove())
})

describe('useAppUpdate', () => {
  it('reloads when the tab returns on an outdated build', async () => {
    deploy(NEWER)
    renderApp()

    await returnToTab()

    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1))
  })

  it('leaves a current tab alone', async () => {
    deploy(__BUILD_ID__)
    renderApp()

    await returnToTab()

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(reloadPage).not.toHaveBeenCalled()
  })

  it('offers a reload instead of discarding typed text', async () => {
    deploy(NEWER)
    typeIntoField('작성 중인 글')
    renderApp()

    await returnToTab()

    fireEvent.click(await screen.findByRole('button', { name: '새로고침' }))
    expect(reloadPage).toHaveBeenCalledTimes(1)
  })

  it('offers a reload from the periodic check, then reloads on the next route change', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    deploy(NEWER)
    const { result } = renderApp()

    await act(() => vi.advanceTimersByTimeAsync(5 * 60_000))

    expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument()
    expect(reloadPage).not.toHaveBeenCalled()

    act(() => result.current('/stats'))

    expect(reloadPage).toHaveBeenCalledTimes(1)
  })

  it('does not reload again for a build a reload already failed to reach', async () => {
    deploy(NEWER)
    sessionStorage.setItem('ttt2-reloaded-for-build', NEWER)
    renderApp()

    await returnToTab()

    expect(await screen.findByRole('button', { name: '새로고침' })).toBeInTheDocument()
    expect(reloadPage).not.toHaveBeenCalled()
  })

  it('stays quiet when the version cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderApp()

    await returnToTab()

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(reloadPage).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '새로고침' })).not.toBeInTheDocument()
  })
})
