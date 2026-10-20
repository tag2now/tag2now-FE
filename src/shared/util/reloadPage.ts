// Its own module so tests can replace it: jsdom's location.reload cannot be spied on.
export function reloadPage(): void {
  window.location.reload()
}
