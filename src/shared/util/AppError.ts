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

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AppError'
    this.status = status
  }
}
