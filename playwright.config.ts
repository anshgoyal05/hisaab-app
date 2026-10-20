import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @hisaab/api dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'pnpm --filter @hisaab/web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
  projects: [
    {
      name: 'mobile-390px',
      use: {
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    },
    {
      name: 'tablet-768px',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'desktop-1440px',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
