import { test as base, Page, Locator, Expectation } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://13.203.195.153:3000';
  }

  async navigate(path: string = '') {
    await this.page.goto(`${this.baseURL}${path}`, { waitUntil: 'networkidle' });
  }

  async waitForSelector(selector: string, options?: { state?: 'visible' | 'hidden' | 'attached'; timeout?: number }) {
    await this.page.waitForSelector(selector, {
      state: options?.state || 'visible',
      timeout: options?.timeout || 30000,
    });
  }

  async click(selector: string, options?: { force?: boolean; timeout?: number }) {
    await this.waitForSelector(selector);
    await this.page.click(selector, { force: options?.force || false });
  }

  async fill(selector: string, value: string) {
    await this.waitForSelector(selector);
    await this.page.fill(selector, value);
  }

  async getText(selector: string): Promise<string> {
    await this.waitForSelector(selector);
    return await this.page.textContent(selector) || '';
  }

  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector);
  }

  async isEnabled(selector: string): Promise<boolean> {
    return await this.page.isEnabled(selector);
  }

  async selectOption(selector: string, value: string | string[]) {
    await this.waitForSelector(selector);
    await this.page.selectOption(selector, value);
  }

  async waitForNetworkIdle(timeout?: number) {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async getInputValue(selector: string): Promise<string> {
    return await this.page.inputValue(selector);
  }

  async countElements(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }
}

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly captchaInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly rememberMe: Locator;
  readonly captchaText: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.captchaInput = page.locator('input[placeholder*="captcha" i], input[name="captcha"]');
    this.captchaText = page.locator('text=/^[A-Z0-9]{5,6}$/').first();
    this.submitButton = page.locator('button[type="submit"], button:has-text("Sign In")');
    this.errorMessage = page.locator('.ant-alert, .ant-message-error, [role="alert"], [class*="error"]');
    this.rememberMe = page.locator('input[type="checkbox"]');
  }

  async login(email: string, password: string, rememberMe: boolean = false) {
    await this.navigate('/en/login');
    await this.page.waitForLoadState('networkidle');
    
    await this.emailInput.fill(email);
    if (rememberMe) await this.rememberMe.check();
    await this.passwordInput.fill(password);
    
    const captchaVisible = await this.captchaInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (captchaVisible) {
      const captchaText = await this.getCaptchaText();
      if (captchaText) {
        await this.captchaInput.fill(captchaText);
      }
    }
    
    await this.submitButton.click();
    await this.page.waitForURL(/\/(admin|dashboard|profile|tests)/, { timeout: 15000 }).catch(() => {});
  }

  async getCaptchaText(): Promise<string> {
    try {
      const captchaElement = this.page.locator('.captcha-text, [class*="captcha"] span').first();
      if (await captchaElement.isVisible({ timeout: 2000 })) {
        const text = await captchaElement.textContent();
        if (text) return text.trim();
      }
    } catch {}
    return '';
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async isLoginPage(): Promise<boolean> {
    return await this.submitButton.isVisible();
  }
}

export class DashboardPage extends BasePage {
  readonly sidebar: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly questionPublisherLink: Locator;
  readonly examsLink: Locator;
  readonly paperBlueprintsLink: Locator;
  readonly profileLink: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = page.locator('nav, .sidebar, [class*="sidebar"], aside');
    this.userMenu = page.locator('[class*="user"], [class*="avatar"], button:has-text("admin")');
    this.logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a[href*="logout"]');
    this.questionPublisherLink = page.locator('a[href*="question-publisher"], a:has-text("Question Publisher")');
    this.examsLink = page.locator('a[href*="/exams"], a:has-text("Exams")');
    this.paperBlueprintsLink = page.locator('a[href*="paper-blueprints"], a:has-text("Paper Blueprints")');
    this.profileLink = page.locator('a[href*="profile"], a:has-text("Profile")');
  }

  async navigateToQuestionPublisher() {
    await this.questionPublisherLink.click();
    await this.page.waitForURL(/\/question-publisher/, { timeout: 10000 });
  }

  async navigateToExams() {
    await this.examsLink.click();
    await this.page.waitForURL(/\/exams/, { timeout: 10000 });
  }

  async navigateToPaperBlueprints() {
    await this.paperBlueprintsLink.click();
    await this.page.waitForURL(/\/paper-blueprints/, { timeout: 10000 });
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.page.waitForURL(/\/login/, { timeout: 10000 });
  }

  async isAuthenticated(): Promise<boolean> {
    return await this.submitButton.isHidden() || await this.userMenu.isVisible();
  }

  async getUserName(): Promise<string> {
    return await this.userMenu.textContent() || '';
  }
}

export { expect } from '@playwright/test';
