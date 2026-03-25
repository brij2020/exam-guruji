import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../page-objects/base';

async function loginAsAdmin(page: Page) {
  const loginPage = new LoginPage(page);
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@guruji.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  await loginPage.navigate('/en/login');
  await loginPage.page.waitForLoadState('domcontentloaded');
  
  const emailInput = loginPage.page.locator('input[placeholder*="email" i], input[type="email"]');
  const passwordInput = loginPage.page.locator('input[type="password"]');
  const submitButton = loginPage.page.locator('button:has-text("Sign In")');
  
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill(adminEmail);
    await passwordInput.fill(adminPassword);
    
    const captchaInput = loginPage.page.locator('input[placeholder*="captcha" i]');
    if (await captchaInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      const captchaSpan = loginPage.page.locator('.ant-form-item:has(input[placeholder*="captcha"]) + *, [class*="captcha"]').first();
      const captchaText = await captchaSpan.textContent().catch(() => '');
      if (captchaText) {
        await captchaInput.fill(captchaText.trim());
      }
    }
    
    await submitButton.click();
    await loginPage.page.waitForTimeout(3000);
  }
}

test('@smoke should load login page', async ({ page }) => {
  await page.goto('http://13.203.195.153:3000/en/login');
  await page.waitForLoadState('domcontentloaded');
  
  const emailInput = page.locator('input[placeholder*="email" i]');
  await expect(emailInput).toBeVisible({ timeout: 5000 });
});

test('@smoke should load home page', async ({ page }) => {
  await page.goto('http://13.203.195.153:3000/en');
  await page.waitForLoadState('domcontentloaded');
  
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

test('@smoke should load signup page', async ({ page }) => {
  await page.goto('http://13.203.195.153:3000/en/auth/signUp');
  await page.waitForLoadState('domcontentloaded');
  
  const signupButton = page.locator('button:has-text("Sign Up"), button:has-text("Register")');
  const isSignupVisible = await signupButton.isVisible({ timeout: 3000 }).catch(() => false);
  expect(isSignupVisible).toBeTruthy();
});

test('@smoke should handle 404 gracefully', async ({ page }) => {
  const response = await page.goto('http://13.203.195.153:3000/en/nonexistent-page-xyz');
  expect(response?.status()).toBeLessThan(500);
});
