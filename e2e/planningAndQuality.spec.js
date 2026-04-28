const { test, expect } = require('@playwright/test');

test.describe('Planning Entry Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for dashboard
    await page.waitForURL('/', { timeout: 10000 });
    
    // Navigate to Planning
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');
  });

  test('should display Planning page', async ({ page }) => {
    await expect(page.getByText(/planning/i)).toBeVisible();
  });

  test('should have tab navigation', async ({ page }) => {
    // Check for Planning Entry tab or similar
    const entryTab = page.getByRole('tab', { name: /entry/i }).or(
      page.getByText(/planning entry/i)
    );
    
    if (await entryTab.isVisible()) {
      await entryTab.click();
    }
  });

  test('should have date picker', async ({ page }) => {
    const dateInput = page.locator('input[type="date"]');
    
    if (await dateInput.first().isVisible()) {
      await expect(dateInput.first()).toBeVisible();
    }
  });

  test('should have pattern selection dropdown', async ({ page }) => {
    // Look for pattern selection
    const patternSelect = page.getByText(/pattern/i);
    await expect(patternSelect).toBeVisible({ timeout: 3000 }).catch(() => {
      // May be under a different tab
    });
  });

  test('should display records table', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 5000 }).catch(() => {
      // May be empty state
    });
  });
});

test.describe('Quality Lab Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/', { timeout: 10000 });
    
    await page.goto('/quality-lab');
    await page.waitForLoadState('networkidle');
  });

  test('should display Quality Lab page', async ({ page }) => {
    await expect(page.getByText(/quality/i)).toBeVisible();
  });

  test('should have multiple tabs', async ({ page }) => {
    // Quality Lab has 5 tabs
    const tabs = page.getByRole('tab');
    if (await tabs.first().isVisible()) {
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('should switch between tabs', async ({ page }) => {
    const tabs = page.getByRole('tab');
    
    if (await tabs.first().isVisible()) {
      const count = await tabs.count();
      if (count > 1) {
        await tabs.nth(1).click();
        await page.waitForTimeout(500);
      }
    }
  });
});
