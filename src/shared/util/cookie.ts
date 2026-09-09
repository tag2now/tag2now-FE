export const USERNAME_KEY = 'ttt2-username'

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function removeCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

export function getUsername(): string | null {
  return getCookie(USERNAME_KEY) || localStorage.getItem(USERNAME_KEY)
}

export function saveUsername(name: string) {
  localStorage.setItem(USERNAME_KEY, name)
}

/**
 * Whether the backend can carry this username at all.
 *
 * It comes back from POST /community/identity as a Set-Cookie value and is
 * sent on as the X-Community-User header, and HTTP header values are latin-1.
 * Python's http.cookies cannot encode anything above U+00FF into one, so the
 * endpoint answers a bare 500 — no message the UI could show — for a Korean
 * name. Latin-1 names are fine and must stay allowed: the server escapes
 * "café" to "caf\351" and reads it back as "café", which is why this is not
 * an ASCII-only check. The accepted range is printable latin-1: a control
 * character is no more carryable in a header than a Korean one.
 *
 * A stopgap for the caller's sake, not a rule about names. Percent-encoding
 * the cookie on the backend removes the limit, and this function and its two
 * call sites go with it.
 */
export const isTransportableUsername = (name: string) => !/[^ -ÿ]/.test(name)

/** Shown at both call sites, so the wording cannot drift between them. */
export const UNTRANSPORTABLE_USERNAME_MSG =
  '유저명에 한글·이모지는 아직 쓸 수 없습니다. 영문·숫자로 입력해 주세요.'

export function clearUsername() {
  removeCookie(USERNAME_KEY)
  localStorage.removeItem(USERNAME_KEY)
}
