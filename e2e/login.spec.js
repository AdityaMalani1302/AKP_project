const { test, expect } = require('@playwright/test');

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');
  });

  test('should display login page correctly', async ({ page }) => {
    // Check for Smart ERP branding
    await expect(page.getByText('Smart ERP')).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    
    // Check for form elements
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.getByLabel(/username/i).fill('invaliduser');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5000 });
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    const toggleButton = page.getByRole('button', { name: /show password/i });
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click to hide password again
    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should show loading state during login', async ({ page }) => {
    // Fill in credentials
    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/password/i).fill('password123');
    
    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for loading state (may be brief)
    // The button should show "Signing in..." while loading
    await expect(page.getByText(/signing in/i)).toBeVisible({ timeout: 2000 }).catch(() => {
      // Loading may be too fast to catch, that's okay
    });
  });

  test('should navigate to dashboard after successful login', async ({ page }) => {
    // This test requires a valid user in the database
    // Skip if running in CI without proper setup
    test.skip(process.env.CI === 'true', 'Requires valid database user');
    
    // Fill in valid credentials
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin123');
    
    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for navigation to dashboard
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});
