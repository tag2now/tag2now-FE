/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test'

// Not part of the test suite: a recorder run by hand around a stylesheet
// change. It starts no server; point BASE_URL at the build to record.
export default defineConfig({
  testDir: '.',
  testMatch: 'capture.ts',
  outputDir: '../test-results/style-snapshot',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:5173' },
  projects: [
    { name: 'wide', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
})
