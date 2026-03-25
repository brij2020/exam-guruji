import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/base';

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('should display login page correctly', async () => {
    await loginPage.navigate('/en/login');
    
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toHaveText(/login|sign in|submit/i);
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await loginPage.navigate('/en/login');
    await loginPage.submitButton.click();
    
    await page.waitForTimeout(500);
    const hasError = await page.locator('.ant-form-item-explain-error, [class*="error"]').isVisible().catch(() => false);
    expect(hasError).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await loginPage.navigate('/en/login');
    await loginPage.emailInput.fill('invalid@example.com');
    await loginPage.passwordInput.fill('wrongpassword');
    await loginPage.submitButton.click();
    
    await page.waitForTimeout(2000);
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toMatch(/invalid|incorrect|wrong|failed/i);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@guruji.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    await loginPage.navigate('/en/login');
    await loginPage.emailInput.fill(adminEmail);
    await loginPage.passwordInput.fill(adminPassword);
    await loginPage.submitButton.click();
    
    await page.waitForURL(/\/(admin|dashboard|profile)/, { timeout: 15000 });
    
    const isOnDashboard = !(await page.locator('text=Login').isVisible().catch(() => true));
    expect(isOnDashboard).toBeTruthy();
  });

  test('should remember me functionality', async ({ page }) => {
    await loginPage.navigate('/en/login');
    await loginPage.rememberMe.check();
    
    const isChecked = await loginPage.rememberMe.isChecked();
    expect(isChecked).toBeTruthy();
  });

  test('should show password toggle visibility', async ({ page }) => {
    await loginPage.navigate('/en/login');
    const passwordInput = page.locator('input[type="password"]');
    
    const toggleButton = page.locator('.ant-input-password-icon, button[aria-label*="eye"]');
    if (await toggleButton.isVisible().catch(() => false)) {
      await toggleButton.click();
      const inputType = await passwordInput.getAttribute('type');
      expect(inputType).toBe('text');
    }
  });
});

test.describe('Logout Flow', () => {
  test('should logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@guruji.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    await loginPage.login(adminEmail, adminPassword);
    
    const dashboard = new (await import('../../page-objects/base')).DashboardPage(page);
    await dashboard.logout();
    
    await expect(page).toHaveURL(/\/login/);
  });
});
