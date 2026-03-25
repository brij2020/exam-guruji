import { Page, ConsoleMessage } from '@playwright/test';

export interface ConsoleLogEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  location: string;
}

export async function captureConsoleLogs(page: Page): Promise<ConsoleLogEntry[]> {
  const logs: ConsoleLogEntry[] = [];
  
  page.on('console', (msg: ConsoleMessage) => {
    logs.push({
      type: msg.type() as ConsoleLogEntry['type'],
      message: msg.text(),
      location: msg.location()?.url || '',
    });
  });
  
  return logs;
}

export async function waitForNetworkStable(page: Page, timeout: number = 5000): Promise<void> {
  const startTime = Date.now();
  let lastNetworkActivity = Date.now();
  
  const networkActivityPromise = new Promise<void>((resolve) => {
    page.on('request', () => {
      lastNetworkActivity = Date.now();
    });
    page.on('response', () => {
      lastNetworkActivity = Date.now();
    });
    
    const checkInterval = setInterval(() => {
      if (Date.now() - lastNetworkActivity > 500) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, timeout);
  });
  
  await networkActivityPromise;
}

export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
}

export async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}

export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

export async function setLocalStorage(page: Page, key: string, value: unknown): Promise<void> {
  await page.evaluate(
    ({ k, v }) => {
      localStorage.setItem(k, JSON.stringify(v));
    },
    { k: key, v: value }
  );
}

export async function getLocalStorage(page: Page, key: string): Promise<unknown> {
  return await page.evaluate(
    (k) => {
      const value = localStorage.getItem(k);
      return value ? JSON.parse(value) : null;
    },
    key
  );
}

export async function waitForAntMessage(page: Page, type: 'success' | 'error' | 'info' | 'warning', timeout: number = 5000): Promise<boolean> {
  const selector = `.ant-message-${type}, .ant-message .ant-message-notice-content`;
  
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

export async function dismissAntModal(page: Page): Promise<void> {
  const closeButton = page.locator('.ant-modal-close, .ant-modal-footer button:has-text("Cancel")').first();
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click();
  }
}

export async function getFormErrors(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const errors = document.querySelectorAll('.ant-form-item-explain-error');
    return Array.from(errors).map((el) => el.textContent || '');
  });
}

export async function getApiCalls(page: Page): Promise<Array<{ url: string; method: string; status: number }>> {
  return await page.evaluate(() => {
    const calls = (window as any).__apiCalls || [];
    return calls;
  });
}

export async function setApiCallsTracking(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__apiCalls = [];
    
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = args[1]?.method || 'GET';
      
      const response = await originalFetch.apply(this, args);
      const status = response.status;
      
      (window as any).__apiCalls.push({ url, method, status });
      return response;
    };
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts: number; delay: number }
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < options.maxAttempts) {
        await delay(options.delay);
      }
    }
  }
  
  throw lastError;
}
