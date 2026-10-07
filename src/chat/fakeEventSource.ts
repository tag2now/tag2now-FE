/** A stand-in for the browser's EventSource, which jsdom does not implement.
 *
 * `test-setup.ts` installs it for every test file, so anything that mounts the
 * chat — App included — renders without a real stream. A test that drives the
 * chat reaches the connection it opened through `latest()` and plays the
 * server's side with `emit` and `fail`.
 */
export default class FakeEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2

  static instances: FakeEventSource[] = []

  /** The connection opened most recently. */
  static latest(): FakeEventSource {
    const latest = FakeEventSource.instances.at(-1)
    if (!latest) throw new Error('no EventSource was opened')
    return latest
  }

  /** The connections nothing has closed yet. */
  static open(): FakeEventSource[] {
    return FakeEventSource.instances.filter((source) => source.readyState !== FakeEventSource.CLOSED)
  }

  static reset(): void {
    FakeEventSource.instances = []
  }

  readonly url: string
  readyState = FakeEventSource.CONNECTING
  onerror: ((event: Event) => void) | null = null
  private readonly handlers = new Map<string, ((event: MessageEvent) => void)[]>()

  constructor(url: string | URL) {
    this.url = String(url)
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler])
  }

  close(): void {
    this.readyState = FakeEventSource.CLOSED
  }

  /** The server sends one event, its data serialised as the backend does. */
  emit(type: string, data: unknown): void {
    this.readyState = FakeEventSource.OPEN
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    this.handlers.get(type)?.forEach((handler) => handler(event))
  }

  /** The connection fails. `refused` is the browser giving up for good, as it
   * does on an HTTP error; otherwise it is reconnecting on its own. */
  fail({ refused }: { refused: boolean }): void {
    this.readyState = refused ? FakeEventSource.CLOSED : FakeEventSource.CONNECTING
    this.onerror?.(new Event('error'))
  }
}
