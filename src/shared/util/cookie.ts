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

export function clearUsername() {
  removeCookie(USERNAME_KEY)
  localStorage.removeItem(USERNAME_KEY)
}
