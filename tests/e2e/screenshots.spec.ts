import { test } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = '/Users/i_anshgoyal/.gemini/antigravity/brain/98d2a68c-ef56-43c9-9727-1787eef42f8a';

test('Capture Live High-Res Screenshots for Verification', async ({ page, context }) => {
  await page.goto('/');

  // 1. Log in with Demo Student Account
  const loginLink = page.locator('text=Log in').first();
  if (await loginLink.isVisible({ timeout: 2000 })) {
    await loginLink.click();
  }
  const demoBtn = page.locator('button:visible:has-text("Instant Demo Student Account")');
  if (await demoBtn.isVisible({ timeout: 3000 })) {
    await demoBtn.click();
  }
  await page.waitForSelector('text=Spent Today', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Determine viewport width
  const size = page.viewportSize();
  const width = size?.width || 1440;

  if (width <= 480) {
    // Mobile 390px Viewport
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_mobile_home_390px.png') });

    // Open Add Expense Modal
    const addBtn = page.locator('button[aria-label="Add Expense"]').first();
    await addBtn.click();
    await page.waitForSelector('text=Amount (INR)', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_mobile_add_expense_390px.png') });
  } else if (width <= 1000) {
    // Tablet 768px Viewport
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_tablet_home_768px.png') });

    // Navigate to People tab
    await page.locator('button:visible:has-text("People")').first().click();
    await page.waitForSelector('text=People & Ledgers', { timeout: 5000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_tablet_people_768px.png') });

    // Navigate to Reports tab
    await page.locator('button:visible:has-text("Reports")').first().click();
    await page.waitForSelector('text=Reports & Analytics', { timeout: 5000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_tablet_reports_768px.png') });
  } else {
    // Desktop 1440px Viewport
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_desktop_home_1440px.png') });

    // Navigate to History tab
    await page.locator('button:visible:has-text("History")').first().click();
    await page.waitForSelector('text=Transaction History', { timeout: 5000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_desktop_history_1440px.png') });

    // Navigate to Budgets tab
    await page.locator('button:visible:has-text("Budgets")').first().click();
    await page.waitForSelector('text=Monthly Budgets', { timeout: 5000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'live_desktop_budgets_1440px.png') });
  }
});
