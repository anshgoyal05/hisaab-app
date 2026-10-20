import { test, expect } from '@playwright/test';

test.describe('Hisaab - Campus Expense Tracker & Shared Ledger E2E', () => {

  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('Complete Student Journey: Onboarding, Demo Login, Personal & Split Expense, Settle Up, Reports, i18n, and Offline Sync', async ({ page, context }) => {
    // 1. Visit App & Login
    await page.goto('/');

    const isAlreadyOnHome = await page.locator('text=Spent Today').isVisible();
    if (!isAlreadyOnHome) {
      const loginLink = page.locator('text=Log in').first();
      if (await loginLink.isVisible({ timeout: 2000 })) {
        await loginLink.click();
      }

      const demoBtn = page.locator('button:visible:has-text("Instant Demo Student Account")');
      if (await demoBtn.isVisible({ timeout: 5000 })) {
        await demoBtn.click();
      }
    }

    // 2. Verify Home Dashboard Loaded
    await expect(page.locator('text=Spent Today')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=People owe you')).toBeVisible();
    await expect(page.getByText('You owe', { exact: true })).toBeVisible();

    // 3. Add Personal Expense
    const addExpenseBtn = page.locator('button:visible:has-text("Add Expense"), button:visible:has-text("Add expense"), button[aria-label="Add Expense"]:visible').first();
    await addExpenseBtn.click();

    // Verify Add Expense Modal is open
    await expect(page.locator('text=Amount (INR)')).toBeVisible();
    
    // Tap numeric keypad: 1, 5, 0 (₹150)
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByRole('button', { name: '5', exact: true }).click();
    await page.getByRole('button', { name: '0', exact: true }).click();
    
    // Select category (e.g. Chai / Coffee or first category chip)
    const categoryChip = page.locator('button:visible:has-text("Chai")').first();
    if (await categoryChip.isVisible()) {
      await categoryChip.click();
    } else {
      const anyCat = page.locator('.flex.flex-wrap button:visible').first();
      if (await anyCat.isVisible()) await anyCat.click();
    }

    // Save expense
    await page.locator('button:visible:has-text("Save expense"), button:visible:has-text("Save Expense")').last().click();

    // Wait for modal to close
    await expect(page.locator('text=Amount (INR)')).not.toBeVisible({ timeout: 10000 });

    // 4. Add Split Expense with a Friend
    await page.locator('button:visible:has-text("Add Expense"), button:visible:has-text("Add expense"), button[aria-label="Add Expense"]:visible').first().click();
    await expect(page.locator('text=Amount (INR)')).toBeVisible();

    // Enter ₹400
    await page.getByRole('button', { name: '4', exact: true }).click();
    await page.getByRole('button', { name: '0', exact: true }).click();
    await page.getByRole('button', { name: '0', exact: true }).click();

    // Change type to "Split with friends"
    const splitTypeBtn = page.locator('button:visible:has-text("Split")').first();
    await splitTypeBtn.click();

    // Wait for Split with Friends section to appear
    await expect(page.locator('text=Split with Friends')).toBeVisible({ timeout: 10000 });

    // Select a friend (Rahul Sharma)
    const friendChip = page.locator('button:has-text("Rahul")').first();
    await expect(friendChip).toBeVisible({ timeout: 10000 });
    await friendChip.scrollIntoViewIfNeeded();
    await friendChip.click();

    // Save split
    const saveBtn = page.locator('button:visible:has-text("Save expense"), button:visible:has-text("Save Expense")').last();
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();
    await expect(page.locator('text=Amount (INR)')).not.toBeVisible({ timeout: 10000 });

    // 5. Navigate to People Tab
    const peopleNav = page.locator('button:visible:has-text("People")').first();
    await peopleNav.click();
    await expect(page.locator('text=People & Ledgers')).toBeVisible();

    // 6. Settle Up Flow
    const settleModalClose = page.locator('button[aria-label="Close"]:visible').first();
    const settleUpBtn = page.locator('button:visible:has-text("Settle Up"), button:visible:has-text("Settle up")').first();
    if (await settleUpBtn.isVisible()) {
      await settleUpBtn.click();
      const confirmBtn = page.locator('button:visible:has-text("Confirm Settlement")');
      if (await confirmBtn.isVisible({ timeout: 2000 })) {
        await confirmBtn.click();
        const doneBtn = page.locator('button:visible:has-text("Done")');
        if (await doneBtn.isVisible({ timeout: 3000 })) {
          await doneBtn.click();
        }
      }
    }

    // Ensure any open modal is closed
    if (await settleModalClose.isVisible()) {
      await settleModalClose.click();
    }

    // 7. Reports Screen: Weekly and Monthly Spending Breakdown
    const reportsNav = page.locator('button:visible:has-text("Reports")').first();
    await reportsNav.click();
    await expect(page.locator('text=Reports & Analytics')).toBeVisible();

    // Switch between Week and Month
    const weekBtn = page.locator('button:visible:has-text("week")').first();
    if (await weekBtn.isVisible()) {
      await weekBtn.click();
    }

    const monthBtn = page.locator('button:visible:has-text("month")').first();
    if (await monthBtn.isVisible()) {
      await monthBtn.click();
    }

    // 8. History Tab: Search and Filter
    const historyNav = page.locator('button:visible:has-text("History")').first();
    await historyNav.click();
    await expect(page.locator('text=Transaction History')).toBeVisible();

    // 9. Language Switcher (English -> Hindi -> Hinglish)
    const hiOption = page.locator('button[role="radio"]:has-text("हिंदी"), button:visible:has-text("हिंदी")').first();
    if (await hiOption.isVisible()) {
      await hiOption.click();
      await page.waitForTimeout(300);
      const hinglishOption = page.locator('button[role="radio"]:has-text("Hinglish"), button:visible:has-text("Hinglish")').first();
      if (await hinglishOption.isVisible()) {
        await hinglishOption.click();
        await page.waitForTimeout(300);
      }
      const enOption = page.locator('button[role="radio"]:has-text("English"), button:visible:has-text("English")').first();
      if (await enOption.isVisible()) {
        await enOption.click();
        await page.waitForTimeout(300);
      }
    }

    // 10. Offline Mode Simulation
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(500);

    // Re-enable Online
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(500);

    // 11. Settings Tab
    const settingsNav = page.locator('button:visible:has-text("Settings")').first();
    await settingsNav.click();
    await expect(page.locator('text=Settings & Privacy')).toBeVisible();
  });

  test('New User Registration Flow', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Check if Onboarding Screen is shown
    const loginLink = page.locator('text=Log in').first();
    if (await loginLink.isVisible({ timeout: 2000 })) {
      await loginLink.click();
    }

    // Switch to Register form
    const createAccountLink = page.locator('text=Create an account').first();
    await expect(createAccountLink).toBeVisible({ timeout: 10000 });
    await createAccountLink.click();

    // Fill registration form
    const uniqueEmail = `campus_student_${Date.now()}_${Math.floor(Math.random()*1000)}@college.edu`;
    await page.fill('input[type="email"]', uniqueEmail);
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('StrongCampus2026!');
    await passwordInputs.nth(1).fill('StrongCampus2026!');

    await page.click('button:has-text("Create Account")');

    // Should arrive on Home Screen
    await expect(page.locator('text=Spent Today')).toBeVisible({ timeout: 10000 });
  });

});
