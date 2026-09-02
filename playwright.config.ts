import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // One worker was the Playwright template's default, not a response to any
  // observed problem, and it serialised a suite that has no reason to be.
  //
  // 4 is deliberate oversubscription: ubuntu-latest is a 2-core runner, and
  // these specs spend most of their wall time waiting — on navigation, on
  // `expect` polling, on the browser — not burning CPU. Every backend call is
  // intercepted and the dev server only serves static files, so nothing here
  // needs a core held back for it. `retries: 1` absorbs the occasional
  // parallel flake.
  //
  // Leaving this unset is not equivalent: Playwright's default is "50%" of
  // the cores, which on a 2-core runner resolves to a single worker — the
  // very thing this replaced. Locally it happens to coincide (8 cores → 4),
  // which is why the difference only shows up in CI.
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { outputFolder: 'e2e/playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
