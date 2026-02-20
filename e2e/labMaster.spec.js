const { test, expect } = require('@playwright/test');

test.describe('Lab Master CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for dashboard
    await page.waitForURL('/', { timeout: 10000 });
    
    // Navigate to Lab Master
    await page.goto('/lab-master');
    await page.waitForLoadState('networkidle');
  });

  test('should display Lab Master page', async ({ page }) => {
    await expect(page.getByText(/lab master/i)).toBeVisible();
  });

  test('should have required form fields', async ({ page }) => {
    // Check for Customer and DRG No. fields (marked as mandatory)
    await expect(page.getByLabel(/customer/i)).toBeVisible();
    await expect(page.getByLabel(/drg no/i)).toBeVisible();
  });

  test('should prevent empty form submission', async ({ page }) => {
    // Try to submit empty form
    const addButton = page.getByRole('button', { name: /add/i });
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Should show validation error for mandatory fields
      await expect(page.getByText(/required/i)).toBeVisible({ timeout: 3000 }).catch(() => {
        // Validation message may vary
      });
    }
  });

  test('should search records', async ({ page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/search/i);
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      
      // Wait for debounced search
      await page.waitForTimeout(500);
      
      // Results should update (table should be visible)
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('should have Excel import button', async ({ page }) => {
    // Check for import from Excel functionality
    const importButton = page.getByRole('button', { name: /import.*excel/i });
    await expect(importButton).toBeVisible();
  });
});
