/**
 * An error this app raised deliberately, with a message meant for the user.
 *
 * The global unhandledrejection handler shows only these. Anything else on the
 * page — third-party scripts, browser extensions — is left to the browser's own
 * console reporting rather than surfaced as an app toast.
 */
export class AppError extends Error {
  /** HTTP status, when the failure came from an API response. */
  readonly status?: number

  /**
   * Whether `message` is fit to show a user.
   *
   * True by default: raising an AppError is itself the claim that the message
   * was written for a user, which is what the four call sites outside api.ts
   * do. The exception is the status-code fallback in `throwIfFailed` — when a
   * response carries no { detail }, "request failed: 500" is all there is, and
   * a caller that would otherwise print it needs to know to substitute its own
   * wording. Without the flag the only way to tell is to pattern-match on the
   * string.
   */
  readonly explained: boolean

  constructor(message: string, status?: number, explained = true) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.explained = explained
  }
}
