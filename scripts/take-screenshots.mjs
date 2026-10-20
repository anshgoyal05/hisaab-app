import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ARTIFACT_DIR =
  '/Users/i_anshgoyal/.gemini/antigravity/brain/98d2a68c-ef56-43c9-9727-1787eef42f8a';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting Vite preview server...');
  const server = spawn(
    'pnpm',
    ['--filter', '@hisaab/web', 'preview', '--port', '5173', '--host'],
    {
      cwd: '/Users/i_anshgoyal/Desktop/Hisaab',
      stdio: 'pipe',
    }
  );

  // Wait for server to boot
  await wait(3000);

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // 1. Mobile (390px) - Light Mode
  console.log('Capturing Mobile 390px Light Mode...');
  await page.setViewportSize({ width: 390, height: 844 });
  await wait(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hisaab_mobile_light_390px.png'),
    fullPage: true,
  });

  // 2. Mobile (390px) - Dark Mode
  console.log('Capturing Mobile 390px Dark Mode...');
  // Click theme toggle button
  const themeToggle = page.locator('button[aria-label="Toggle theme"]');
  await themeToggle.click();
  await wait(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hisaab_mobile_dark_390px.png'),
    fullPage: true,
  });

  // Switch back to light mode for tablet
  await themeToggle.click();
  await wait(300);

  // 3. Tablet (768px) - Light Mode
  console.log('Capturing Tablet 768px Light Mode...');
  await page.setViewportSize({ width: 768, height: 1024 });
  await wait(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hisaab_tablet_light_768px.png'),
    fullPage: true,
  });

  // 4. Desktop (1440px) - Light Mode
  console.log('Capturing Desktop 1440px Light Mode...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await wait(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hisaab_desktop_light_1440px.png'),
    fullPage: false,
  });

  // 5. Desktop (1440px) - Dark Mode
  console.log('Capturing Desktop 1440px Dark Mode...');
  await themeToggle.click();
  await wait(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hisaab_desktop_dark_1440px.png'),
    fullPage: false,
  });

  console.log('All screenshots captured successfully!');
  await browser.close();
  server.kill('SIGTERM');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
