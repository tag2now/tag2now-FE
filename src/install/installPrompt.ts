/** Chromium's install event; not in the DOM typings. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Held outside React: the browser fires the event once, possibly before the app
// has mounted, and never again until the page reloads.
let pending: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function settle(event: BeforeInstallPromptEvent | null): void {
  pending = event
  listeners.forEach((listener) => listener())
}

window.addEventListener('beforeinstallprompt', (event) => {
  // Keeps Chrome's own mini-infobar away; the install sheet offers it instead.
  event.preventDefault()
  settle(event as BeforeInstallPromptEvent)
})
window.addEventListener('appinstalled', () => settle(null))

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The install the browser is offering, or null when it offers none: not
 * installable, already installed, or not a Chromium browser. */
export function pendingInstallPrompt(): BeforeInstallPromptEvent | null {
  return pending
}

/** Opens the browser's install dialog. The event is single-use, so it is
 * dropped whatever the answer; must run inside a click handler. */
export function promptInstall(event: BeforeInstallPromptEvent): Promise<void> {
  const shown = event.prompt()
  settle(null)
  return shown
}
