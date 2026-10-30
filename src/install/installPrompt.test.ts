import { pendingInstallPrompt, promptInstall, subscribeInstallPrompt, type BeforeInstallPromptEvent } from './installPrompt'

function offerInstall(): BeforeInstallPromptEvent {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
  window.dispatchEvent(event)
  return event
}

afterEach(() => {
  window.dispatchEvent(new Event('appinstalled'))
})

describe('installPrompt', () => {
  it('holds the offer and keeps Chrome from showing its own', () => {
    const event = offerInstall()

    expect(pendingInstallPrompt()).toBe(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('tells subscribers when an offer arrives', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeInstallPrompt(listener)

    offerInstall()
    unsubscribe()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('opens the dialog once and drops the spent offer', async () => {
    const event = offerInstall()

    await promptInstall(event)

    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(pendingInstallPrompt()).toBeNull()
  })

  it('drops the offer once the app is installed', () => {
    offerInstall()

    window.dispatchEvent(new Event('appinstalled'))

    expect(pendingInstallPrompt()).toBeNull()
  })
})
