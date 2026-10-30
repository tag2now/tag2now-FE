import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { reloadPage } from '@/shared/util/reloadPage'

const CHECK_INTERVAL = 5 * 60_000
const TOAST_ID = 'app-update'
// Per tab, so another tab's reload does not count as this one's.
const RELOADED_FOR_KEY = 'ttt2-reloaded-for-build'

/** The deployed build when it is not this one; null while current or unreachable. */
async function fetchNewerBuild(): Promise<string | null> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' })
    const { buildId } = await res.json()
    return typeof buildId === 'string' && buildId !== __BUILD_ID__ ? buildId : null
  } catch {
    return null
  }
}

/** Anything typed into a field — a post, a chat line, the admin password — dies with a reload. */
function hasTypedInput(): boolean {
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'textarea, input:not([type]), input[type="text"], input[type="search"], input[type="password"]',
  )
  return Array.from(fields).some((field) => field.value.trim() !== '')
}

function offerReload(): void {
  toast(() => (
    <span className="flex items-center gap-3">
      새 버전이 있습니다.
      <button type="button" className="btn-primary" onClick={reloadPage}>새로고침</button>
    </span>
  ), { id: TOAST_ID, duration: Infinity })
}

function readReloadedFor(): string | null {
  try {
    return sessionStorage.getItem(RELOADED_FOR_KEY)
  } catch {
    return null
  }
}

function writeReloadedFor(build: string): void {
  try {
    sessionStorage.setItem(RELOADED_FOR_KEY, build)
  } catch {
    // Without the marker a stale cache can cost one extra reload per navigation, nothing worse.
  }
}

/** Reloads into `build` unless that would lose typing, or a reload for it already
 * came back old — a browser serving a cached page would otherwise reload on every move. */
function reloadWhenSafe(build: string): void {
  if (hasTypedInput() || readReloadedFor() === build) return offerReload()
  writeReloadedFor(build)
  reloadPage()
}

/** Keeps a long-open tab on the deployed build. Mobile browsers revive tabs
 * without refetching, and the SPA never reloads itself, so without this a tab
 * runs the build it was opened on indefinitely. Reloads silently where the
 * screen changes anyway — a route change, a return from the background — and
 * otherwise offers a toast. */
export default function useAppUpdate(): void {
  const location = useLocation()
  const newerBuild = useRef<string | null>(null)

  useEffect(() => {
    const check = async () => {
      newerBuild.current = await fetchNewerBuild() ?? newerBuild.current
      return newerBuild.current
    }
    const onInterval = async () => {
      if (await check()) offerReload()
    }
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      const build = await check()
      if (build) reloadWhenSafe(build)
    }
    const timer = setInterval(onInterval, CHECK_INTERVAL)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (newerBuild.current) reloadWhenSafe(newerBuild.current)
  }, [location.key])
}
