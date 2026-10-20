import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ARTIFACT_DIR =
  '/Users/i_anshgoyal/.gemini/antigravity/brain/98d2a68c-ef56-43c9-9727-1787eef42f8a';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const server = spawn(
    'pnpm',
    ['--filter', '@hisaab/web', 'preview', '--port', '5174', '--host'],
    {
      cwd: '/Users/i_anshgoyal/Desktop/Hisaab',
      stdio: 'pipe',
    }
  );

  await wait(2500);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  // Switch to Hindi
  const hindiBtn = page.locator('button:has-text("हिंदी")');
  await hindiBtn.click();
  await wait(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hisaab_mobile_hindi_390px.png'),
    fullPage: true,
  });

  // Switch to Hinglish
  const hinglishBtn = page.locator('button:has-text("Hinglish")');
  await hinglishBtn.click();
  await wait(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hisaab_mobile_hinglish_390px.png'),
    fullPage: true,
  });

  // Open Bottom Sheet in English
  const englishBtn = page.locator('button:has-text("English")');
  await englishBtn.click();
  await wait(300);
  const addBtn = page.locator('button:has-text("Save expense")');
  await addBtn.click();
  await wait(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hisaab_mobile_sheet_390px.png'),
    fullPage: false,
  });

  await browser.close();
  server.kill('SIGTERM');
  console.log('i18n and sheet screenshots done!');
}

main().catch(console.error);
