import { test, expect, type Page } from '@playwright/test'
import { mockAllApis, skipPatchNotes } from '../helpers/mock-api'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

const sheet = (page: Page) => page.getByRole('complementary', { name: '앱 설치 안내' })

/** Plays Chrome deciding the site is installable. The real event needs an
 * install-eligible browser, which a test runner is not; `prompt` records the
 * call instead of opening a dialog. */
async function offerInstall(page: Page) {
  await expect(page.getByRole('tablist', { name: 'Main navigation' })).toBeVisible()
  await page.evaluate(() => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: () => {
        (window as unknown as { prompted: number }).prompted = 1
        return Promise.resolve()
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    window.dispatchEvent(event)
  })
}

test.describe('App install sheet', () => {
  test.beforeEach(async ({ page }) => {
    await skipPatchNotes(page)
    await mockAllApis(page)
  })

  test('installs through the browser and does not come back', async ({ page }) => {
    await page.goto('/')
    await offerInstall(page)

    await sheet(page).getByRole('button', { name: '설치' }).click()

    await expect(sheet(page)).toHaveCount(0)
    expect(await page.evaluate(() => (window as unknown as { prompted?: number }).prompted)).toBe(1)

    await page.reload()
    await offerInstall(page)
    await expect(sheet(page)).toHaveCount(0)
  })

  test('stays closed after 닫기', async ({ page }) => {
    await page.goto('/')
    await offerInstall(page)

    await sheet(page).getByRole('button', { name: '닫기' }).click()
    await page.reload()
    await offerInstall(page)

    await expect(sheet(page)).toHaveCount(0)
  })

  test.describe('on an iPhone', () => {
    test.use({ userAgent: IPHONE_SAFARI })

    test('explains the share-sheet route', async ({ page }) => {
      await page.goto('/')

      await expect(sheet(page)).toContainText('홈 화면에 추가')
      await expect(sheet(page).getByRole('button', { name: '설치' })).toHaveCount(0)
    })
  })
})

test('waits out a visit that opens on the patch notes', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/')
  await expect(page.locator('[aria-labelledby="patch-notes-title"]')).toBeVisible()

  await offerInstall(page)

  await expect(sheet(page)).toHaveCount(0)
})
