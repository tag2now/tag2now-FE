import { canAddToIosHomeScreen } from './iosHomeScreen'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1'
const IPHONE_FIREFOX = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15'
const IPHONE_KAKAOTALK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.5'
const IPHONE_NAVER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/605.1 NAVER(inapp; search; 2000; 12.10.0; 15PRO)'
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'

describe('canAddToIosHomeScreen', () => {
  it.each([
    ['Safari on an iPhone', IPHONE_SAFARI],
    ['Chrome on an iPhone', IPHONE_CHROME],
  ])('offers the share-sheet route in %s', (_, userAgent) => {
    expect(canAddToIosHomeScreen({ userAgent, maxTouchPoints: 5 })).toBe(true)
  })

  it('recognises an iPad, which reports itself as a Mac', () => {
    expect(canAddToIosHomeScreen({ userAgent: MAC_SAFARI, maxTouchPoints: 5 })).toBe(true)
  })

  it.each([
    ['a Mac', MAC_SAFARI, 0],
    ['Android', ANDROID_CHROME, 5],
    ['Firefox on an iPhone', IPHONE_FIREFOX, 5],
    ['KakaoTalk', IPHONE_KAKAOTALK, 5],
    ['the Naver app', IPHONE_NAVER, 5],
  ])('stays out of %s', (_, userAgent, maxTouchPoints) => {
    expect(canAddToIosHomeScreen({ userAgent, maxTouchPoints })).toBe(false)
  })

  it('stays out once launched from the home screen', () => {
    expect(canAddToIosHomeScreen({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5, standalone: true })).toBe(false)
  })
})
