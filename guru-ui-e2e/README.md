# Guru AI E2E Tests

End-to-end UX automation tests for the Guru AI exam preparation platform using Playwright.

## Features

- **Multi-browser testing** - Chrome, Firefox, Safari, Mobile
- **Page Object Models** - Maintainable, readable test code
- **Custom fixtures** - Pre-configured admin login
- **CI/CD ready** - GitHub Actions workflow included
- **Comprehensive coverage** - Auth, Question Publisher, Admin flows
- **Visual reports** - HTML, JSON, and console reports

## Quick Start

```bash
# Install dependencies and browsers
npm install
npx playwright install --with-deps

# Run tests
npm test

# Run with UI
npm run test:ui

# Run specific test file
npm run test:question-publisher
```

## Test Structure

```
guru-ui-e2e/
├── page-objects/          # Page Object Models
│   ├── base.ts           # BasePage, LoginPage, DashboardPage
│   └── questionPublisher.ts
├── tests/
│   ├── flows/            # Test specifications
│   │   ├── auth.spec.ts
│   │   ├── questionPublisher.spec.ts
│   │   └── admin.spec.ts
│   └── utils/            # Test utilities
│       ├── fixtures.ts
│       ├── helpers.ts
│       └── testData.ts
├── playwright.config.ts  # Playwright configuration
└── package.json
```

## Running Tests

### Local Development

```bash
# All browsers
npm test

# Single browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Mobile browsers
npm run test:mobile
```

### Specific Test Suites

```bash
# Authentication tests
npm run test:auth

# Question Publisher tests
npm run test:question-publisher

# Admin tests
npm run test:admin
```

### Debug Mode

```bash
# Open browser UI
npm run test:headed

# Debug with Playwright inspector
npm run test:debug
```

## Reports

```bash
# Open HTML report
npm run report

# View JSON results
npm run report:json
```

## Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
BASE_URL=http://13.203.195.153:3000
API_BASE_URL=http://13.203.195.153:4000
ADMIN_EMAIL=admin@guruji.com
ADMIN_PASSWORD=admin123
```

## CI/CD Integration

The project includes GitHub Actions workflow (`.github/workflows/e2e-tests.yml`).

### Secrets to configure:

- `BASE_URL` - Application URL
- `ADMIN_EMAIL` - Test admin email
- `ADMIN_PASSWORD` - Test admin password

## Writing Tests

### Basic Test Example

```typescript
import { test, expect } from '@playwright/test';
import { QuestionPublisherPage } from '../../page-objects/questionPublisher';

test('should add question to batch', async ({ adminPage }) => {
  const qpPage = new QuestionPublisherPage(adminPage);
  await qpPage.navigate();
  
  await qpPage.fillCompleteMCQ({
    question: 'What is 2+2?',
    options: ['3', '4', '5', '6'],
    answerKey: 'B',
  });
  
  await qpPage.clickAddToBatch();
  const batchCount = await qpPage.getBatchCount();
  expect(batchCount).toBe(1);
});
```

### Using Test Data

```typescript
import { testData, samplePastedContent } from '../utils/testData';

test('should parse pasted content', async ({ adminPage }) => {
  const qpPage = new QuestionPublisherPage(adminPage);
  await qpPage.navigate();
  
  await qpPage.pasteToBlackboard(samplePastedContent.singleMCQ);
  await qpPage.clickParseDraft();
});
```

## Tags

Use tags to run specific test subsets:

```typescript
test('@smoke should login successfully', async ({ page }) => {
  // ...
});

test('@regression should handle edge cases', async ({ page }) => {
  // ...
});
```

Run tagged tests:

```bash
npm run test:smoke    # Only smoke tests
npm run test:regression  # Only regression tests
```

## Troubleshooting

### Browser not launching

```bash
npx playwright install --with-deps
```

### Tests failing due to network

Ensure the application is running:

```bash
curl http://13.203.195.153:3000
```

### Authentication failures

Check credentials in `.env` file match your deployed application.

## License

MIT
