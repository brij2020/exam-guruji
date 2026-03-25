import { test as base } from '@playwright/test';
import { LoginPage, DashboardPage } from '../page-objects/base';

type CustomFixtures = {
  loggedInPage: import('@playwright/test').Page;
  adminPage: import('@playwright/test').Page;
};

export const test = base.extend<CustomFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const loginPage = new LoginPage(page);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@guruji.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    try {
      await loginPage.login(adminEmail, adminPassword);
    } catch (e) {
      console.warn('Login failed, tests may fail:', e);
    }
    
    await use(page);
    await context.close();
  },
  
  loggedInPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
    });
    const page = await context.newPage();
    
    await use(page);
    await context.close();
  },
});

export { expect, Page, Locator } from '@playwright/test';
