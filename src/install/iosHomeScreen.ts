// In-app browsers wrap Safari's engine but have no share sheet to add from.
const IN_APP = /KAKAOTALK|NAVER|DaumApps|Line\/|Instagram|FBAN|FBAV/
// Safari carries Version/…Safari/; Chrome on iOS carries CriOS/. Since iOS 16.4
// both can add a page to the home screen from their share menu.
const SAFARI_OR_CHROME = /Version\/[\d.]+.*Safari\/|CriOS\//

type IosNavigator = Pick<Navigator, 'userAgent' | 'maxTouchPoints'> & { standalone?: boolean }

/** Whether this is an iPhone or iPad browser that can add tag2now to the home
 * screen, and is not already running from there. iOS has no install prompt to
 * call, so this is the only way to know the share-sheet route applies. */
export function canAddToIosHomeScreen(nav: IosNavigator): boolean {
  // iPadOS reports itself as a Mac; touch is what gives it away.
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1)
  return ios && SAFARI_OR_CHROME.test(nav.userAgent) && !IN_APP.test(nav.userAgent) && nav.standalone !== true
}
