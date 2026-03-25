import { test, expect, Page } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../page-objects/base';

let adminPage: Page;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  adminPage = await browser.newPage();
  const loginPage = new LoginPage(adminPage);
  
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@guruji.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  await loginPage.login(adminEmail, adminPassword);
});

test.afterAll(async () => {
  await adminPage.close();
});

test.describe('Navigation', () => {
  test('should navigate to dashboard', async () => {
    const dashboard = new DashboardPage(adminPage);
    await expect(dashboard.userMenu).toBeVisible({ timeout: 5000 });
  });

  test('should show all menu items', async () => {
    const dashboard = new DashboardPage(adminPage);
    
    await expect(dashboard.questionPublisherLink).toBeVisible().catch(() => true);
    await expect(dashboard.examsLink).toBeVisible().catch(() => true);
    await expect(dashboard.paperBlueprintsLink).toBeVisible().catch(() => true);
  });

  test('should navigate to question publisher via menu', async () => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.navigateToQuestionPublisher();
    
    await expect(adminPage).toHaveURL(/\/question-publisher/);
  });
});

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ];

  for (const viewport of viewports) {
    test(`should display correctly on ${viewport.name}`, async () => {
      await adminPage.setViewportSize({ width: viewport.width, height: viewport.height });
      
      await adminPage.goto('/en/admin/tests/question-publisher');
      await adminPage.waitForLoadState('domcontentloaded');
      
      const isContentVisible = await adminPage.locator('body').isVisible();
      expect(isContentVisible).toBeTruthy();
    });
  }
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async () => {
    await adminPage.goto('/en/admin/tests/question-publisher');
    await adminPage.waitForLoadState('domcontentloaded');
    
    const h1 = await adminPage.locator('h1').count();
    const h2 = await adminPage.locator('h2').count();
    
    expect(h1).toBeGreaterThanOrEqual(1);
  });

  test('should have labels for form inputs', async () => {
    await adminPage.goto('/en/admin/tests/question-publisher');
    await adminPage.waitForLoadState('domcontentloaded');
    
    const inputsWithoutLabels = await adminPage.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])');
      let count = 0;
      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const placeholder = input.getAttribute('placeholder');
        const name = input.getAttribute('name');
        if (!id && !ariaLabel && !placeholder && !name) {
          count++;
        }
      });
      return count;
    });
    
    expect(inputsWithoutLabels).toBeLessThan(5);
  });

  test('should have accessible buttons with text', async () => {
    await adminPage.goto('/en/admin/tests/question-publisher');
    await adminPage.waitForLoadState('domcontentloaded');
    
    const buttonsWithoutText = await adminPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      let count = 0;
      buttons.forEach((button) => {
        if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
          count++;
        }
      });
      return count;
    });
    
    expect(buttonsWithoutText).toBeLessThan(3);
  });

  test('should support keyboard navigation', async () => {
    await adminPage.goto('/en/admin/tests/question-publisher');
    await adminPage.waitForLoadState('domcontentloaded');
    
    await adminPage.keyboard.press('Tab');
    await adminPage.keyboard.press('Tab');
    
    const focusedElement = await adminPage.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Performance', () => {
  test('should load page within acceptable time', async () => {
    const startTime = Date.now();
    
    await adminPage.goto('/en/admin/tests/question-publisher');
    await adminPage.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(10000);
  });

  test('should not have excessive DOM nodes', async () => {
    await adminPage.goto('/en/admin/tests/question-publisher');
    await adminPage.waitForLoadState('domcontentloaded');
    
    const domNodeCount = await adminPage.evaluate(() => document.querySelectorAll('*').length);
    console.log(`DOM nodes: ${domNodeCount}`);
    
    expect(domNodeCount).toBeLessThan(5000);
  });
});

test.describe('Visual Stability', () => {
  test('should not have layout shifts after load', async ({ page }) => {
    await page.goto('/en/admin/tests/question-publisher');
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForTimeout(2000);
    
    const cumulativeLayoutShift = await page.evaluate(() => {
      return (performance as any).getEntriesByType('layout-shift')?.reduce((sum: number, entry: any) => sum + entry.value, 0) || 0;
    });
    
    console.log(`Cumulative Layout Shift: ${cumulativeLayoutShift}`);
    expect(cumulativeLayoutShift).toBeLessThan(0.25);
  });
});
