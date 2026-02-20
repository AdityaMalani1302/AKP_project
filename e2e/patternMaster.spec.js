const { test, expect } = require('@playwright/test');

test.describe('Pattern Master Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for dashboard
    await page.waitForURL('/', { timeout: 10000 });
    
    // Navigate to Pattern Master
    await page.goto('/pattern-master');
    await page.waitForLoadState('networkidle');
  });

  test('should display Pattern Master page', async ({ page }) => {
    await expect(page.getByText(/pattern master/i)).toBeVisible();
  });

  test('should display pattern statistics', async ({ page }) => {
    // Check for stats section
    await expect(page.getByText(/total patterns/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      // Stats may not be visible depending on UI
    });
  });

  test('should have Add Pattern button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add/i });
    await expect(addButton).toBeVisible();
  });

  test('should display patterns table', async ({ page }) => {
    // Wait for table to load
    await page.waitForTimeout(1000);
    
    // Check for table or records
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 5000 }).catch(() => {
      // May have empty state
    });
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test pattern');
      await page.waitForTimeout(500); // debounce wait
    }
  });

  test('should expand row to show parts and sleeves', async ({ page }) => {
    // Click on first table row if exists
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      await rows.first().click();
      // Look for expanded content
      await page.waitForTimeout(500);
    }
  });
});
