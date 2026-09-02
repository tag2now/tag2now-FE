import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // One worker was the Playwright template's default, not a response to any
  // observed problem, and it left three of ubuntu-latest's four cores idle.
  // Match the core count: the dev server this shares the box with only serves
  // static files — every backend call is intercepted — so it does not need a
  // core reserved for it. `retries: 1` absorbs the occasional parallel flake.
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
