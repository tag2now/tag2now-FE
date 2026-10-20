import { act, fireEvent, render, screen } from '@testing-library/react'
import InstallSheet from './InstallSheet'
import type { BeforeInstallPromptEvent } from './installPrompt'
import { LATEST_PATCH_VERSION } from '@/config/patchNotes'
import { STORAGE_KEYS } from '@/shared/util/storage'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

function offerInstall(): BeforeInstallPromptEvent {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
  act(() => { window.dispatchEvent(event) })
  return event
}

function onIphone() {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_SAFARI)
}

beforeEach(() => {
  localStorage.setItem(STORAGE_KEYS.seenPatchVersion, LATEST_PATCH_VERSION)
})

afterEach(() => {
  act(() => { window.dispatchEvent(new Event('appinstalled')) })
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('InstallSheet', () => {
  it('offers the browser install where there is one', () => {
    render(<InstallSheet />)
    const event = offerInstall()

    fireEvent.click(screen.getByRole('button', { name: '설치' }))

    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('complementary', { name: '앱 설치 안내' })).not.toBeInTheDocument()
  })

  it('explains the share-sheet route on an iPhone, with nothing to press but close', () => {
    onIphone()
    render(<InstallSheet />)

    expect(screen.getByText('홈 화면에 추가')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '설치' })).not.toBeInTheDocument()
  })

  it('shows nothing where the site cannot be installed', () => {
    render(<InstallSheet />)

    expect(screen.queryByRole('complementary', { name: '앱 설치 안내' })).not.toBeInTheDocument()
  })

  it('stays closed once closed', () => {
    onIphone()
    const { unmount } = render(<InstallSheet />)
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    unmount()

    render(<InstallSheet />)

    expect(screen.queryByRole('complementary', { name: '앱 설치 안내' })).not.toBeInTheDocument()
  })

  it('stays closed once used', () => {
    const { unmount } = render(<InstallSheet />)
    offerInstall()
    fireEvent.click(screen.getByRole('button', { name: '설치' }))
    unmount()

    render(<InstallSheet />)
    offerInstall()

    expect(screen.queryByRole('complementary', { name: '앱 설치 안내' })).not.toBeInTheDocument()
  })

  it('waits out a visit that opens on the patch notes', () => {
    localStorage.removeItem(STORAGE_KEYS.seenPatchVersion)
    onIphone()

    render(<InstallSheet />)

    expect(screen.queryByRole('complementary', { name: '앱 설치 안내' })).not.toBeInTheDocument()
  })
})
