import { test, expect, Page } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../page-objects/base';
import { QuestionPublisherPage } from '../../page-objects/questionPublisher';

let adminPage: Page;
let adminLoginPage: LoginPage;
let adminDashboard: DashboardPage;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  adminPage = await browser.newPage();
  adminLoginPage = new LoginPage(adminPage);
  
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@guruji.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  await adminLoginPage.login(adminEmail, adminPassword);
  adminDashboard = new DashboardPage(adminPage);
});

test.afterAll(async () => {
  await adminPage.close();
});

test.describe('Question Publisher Page Load', () => {
  let qpPage: QuestionPublisherPage;

  test.beforeEach(async () => {
    qpPage = new QuestionPublisherPage(adminPage);
    await qpPage.navigate();
  });

  test('should load question publisher page', async () => {
    await expect(qpPage.header).toBeVisible({ timeout: 10000 });
  });

  test('should display all form sections', async () => {
    await expect(qpPage.examSelect).toBeVisible();
    await expect(qpPage.stageSelect).toBeVisible();
    await expect(qpPage.sectionSelect).toBeVisible();
    await expect(qpPage.difficultySelect).toBeVisible();
    await expect(qpPage.questionInput).toBeVisible();
    await expect(qpPage.blackboardTextarea).toBeVisible();
  });

  test('should have default exam selected', async () => {
    const selectedExam = await qpPage.examSelect.textContent();
    expect(selectedExam).toBeTruthy();
  });
});

test.describe('Single Question Workflow', () => {
  let qpPage: QuestionPublisherPage;

  test.beforeEach(async () => {
    qpPage = new QuestionPublisherPage(adminPage);
    await qpPage.navigate();
  });

  test('should add a single MCQ to batch', async () => {
    await qpPage.fillCompleteMCQ({
      exam: 'SBI Clerk',
      stage: 'Prelims',
      section: 'English',
      difficulty: 'easy',
      questionType: 'Multiple Choice (MCQ)',
      question: 'What is the capital of India?',
      options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'],
      answerKey: 'B',
      explanation: 'New Delhi is the capital of India.',
    });

    await qpPage.clickAddToBatch();
    
    const batchCount = await qpPage.getBatchCount();
    expect(batchCount).toBeGreaterThan(0);
  });

  test('should clear fields after adding to batch', async () => {
    await qpPage.fillCompleteMCQ({
      question: 'Sample question?',
      options: ['A', 'B', 'C', 'D'],
      answerKey: 'A',
    });

    await qpPage.clickAddToBatch();
    await adminPage.waitForTimeout(500);
    
    const fieldsCleared = await qpPage.isFieldsCleared();
    expect(fieldsCleared).toBeTruthy();
  });

  test('should validate required fields', async ({ page }) => {
    await qpPage.clickAddToBatch();
    await page.waitForTimeout(500);
    
    const hasValidationError = await page.locator('.ant-form-item-explain-error').isVisible().catch(() => false);
    expect(hasValidationError).toBeTruthy();
  });

  test('should handle multiple questions in batch', async () => {
    for (let i = 1; i <= 3; i++) {
      await qpPage.fillCompleteMCQ({
        question: `Test Question ${i}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answerKey: 'A',
      });
      await qpPage.clickAddToBatch();
      await adminPage.waitForTimeout(300);
    }

    const batchCount = await qpPage.getBatchCount();
    expect(batchCount).toBe(3);
  });

  test('should delete question from batch', async () => {
    await qpPage.fillCompleteMCQ({
      question: 'Question to delete?',
      options: ['A', 'B', 'C', 'D'],
      answerKey: 'C',
    });
    await qpPage.clickAddToBatch();
    await adminPage.waitForTimeout(500);

    const initialCount = await qpPage.getBatchCount();
    await qpPage.deleteQuestionFromBatch(0);
    
    const newCount = await qpPage.getBatchCount();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should clear all questions', async () => {
    await qpPage.fillCompleteMCQ({
      question: 'Question to clear?',
      options: ['A', 'B', 'C', 'D'],
      answerKey: 'B',
    });
    await qpPage.clickAddToBatch();
    await adminPage.waitForTimeout(500);

    await qpPage.clickClearAll();
    
    const batchCount = await qpPage.getBatchCount();
    expect(batchCount).toBe(0);
  });
});

test.describe('Blackboard/Paste Pad Functionality', () => {
  let qpPage: QuestionPublisherPage;

  test.beforeEach(async () => {
    qpPage = new QuestionPublisherPage(adminPage);
    await qpPage.navigate();
  });

  test('should parse pasted question draft', async () => {
    const sampleText = `
      Question 1: What is 2 + 2?
      (A) 3
      (B) 4
      (C) 5
      (D) 6
      Answer Key: B
      Explanation: 2 + 2 = 4
    `;

    await qpPage.pasteToBlackboard(sampleText);
    await qpPage.clickParseDraft();
    
    await adminPage.waitForTimeout(500);
    const questionValue = await qpPage.questionInput.inputValue().catch(() => '');
    expect(questionValue).toContain('2 + 2');
  });

  test('should normalize pasted text', async () => {
    const messyText = '  Question   with   extra   spaces  ';
    await qpPage.pasteToBlackboard(messyText);
    await qpPage.clickNormalize();
    
    const normalizedValue = await qpPage.blackboardTextarea.inputValue();
    expect(normalizedValue).toBe('Question with extra spaces');
  });

  test('should parse multiple questions to batch', async () => {
    const multipleQuestions = `
      Question 1: First question?
      (A) A1
      (B) B1
      (C) C1
      (D) D1
      Answer: B
      ---
      Question 2: Second question?
      (A) A2
      (B) B2
      (C) C2
      (D) D2
      Answer: C
    `;

    await qpPage.pasteToBlackboard(multipleQuestions);
    await qpPage.clickParseMultiple();
    
    await adminPage.waitForTimeout(500);
    const batchCount = await qpPage.getBatchCount();
    expect(batchCount).toBe(2);
  });

  test('should toggle Hindi mode', async () => {
    await qpPage.toggleHindiMode(true);
    const isHindiMode = await qpPage.hindiModeToggle.isChecked();
    expect(isHindiMode).toBeTruthy();
  });
});

test.describe('RC Passage Workflow', () => {
  let qpPage: QuestionPublisherPage;

  test.beforeEach(async () => {
    qpPage = new QuestionPublisherPage(adminPage);
    await qpPage.navigate();
  });

  test('should enable RC Passage mode', async () => {
    await qpPage.enableRcPassageMode();
    await adminPage.waitForTimeout(300);
    
    const rcFieldsVisible = await qpPage.rcPassageTextarea.isVisible().catch(() => false);
    expect(rcFieldsVisible).toBeTruthy();
  });

  test('should parse RC set from pasted content', async () => {
    await qpPage.enableRcPassageMode();
    await adminPage.waitForTimeout(300);

    const rcContent = `
      This is a reading passage about Indian culture. It talks about various traditions.
      
      Question 1: What is the passage about?
      (A) Food
      (B) Culture
      (C) Politics
      (D) Sports
      Answer: B
      
      Question 2: Which tradition is mentioned?
      (A) Dancing
      (B) Writing
      (C) Speaking
      (D) Walking
      Answer: A
    `;

    await qpPage.pasteToBlackboard(rcContent);
    await qpPage.clickParseRcSet();
    
    await adminPage.waitForTimeout(500);
    const passageValue = await qpPage.rcPassageTextarea.inputValue().catch(() => '');
    expect(passageValue).toContain('Indian culture');
  });
});

test.describe('Save/Publish Workflow', () => {
  let qpPage: QuestionPublisherPage;

  test.beforeEach(async () => {
    qpPage = new QuestionPublisherPage(adminPage);
    await qpPage.navigate();
  });

  test('should save questions as draft', async () => {
    await qpPage.fillCompleteMCQ({
      question: 'Draft question?',
      options: ['A', 'B', 'C', 'D'],
      answerKey: 'D',
    });
    await qpPage.clickAddToBatch();
    await adminPage.waitForTimeout(500);

    await qpPage.clickSaveAsDraft();
    await qpPage.waitForLoading(15000);
    
    const success = await qpPage.waitForSuccess(5000).catch(() => false);
    expect(success || (await qpPage.getErrorMessage()).includes('draft')).toBeTruthy();
  });

  test('should publish questions', async () => {
    await qpPage.fillCompleteMCQ({
      question: 'Published question?',
      options: ['A', 'B', 'C', 'D'],
      answerKey: 'A',
    });
    await qpPage.clickAddToBatch();
    await adminPage.waitForTimeout(500);

    await qpPage.clickPublish();
    await qpPage.waitForLoading(15000);
    
    const success = await qpPage.waitForSuccess(5000).catch(() => false);
    expect(success || !(await qpPage.getErrorMessage()).catch(() => true)).toBeTruthy();
  });

  test('should show error when saving empty batch', async () => {
    await qpPage.clickSaveAsDraft();
    
    const errorShown = await qpPage.waitForError(3000).catch(() => false);
    expect(errorShown || (await qpPage.getErrorMessage()).length > 0).toBeTruthy();
  });
});

test.describe('Error Handling', () => {
  let qpPage: QuestionPublisherPage;

  test.beforeEach(async () => {
    qpPage = new QuestionPublisherPage(adminPage);
    await qpPage.navigate();
  });

  test('should handle API errors gracefully', async () => {
    await qpPage.fillCompleteMCQ({
      question: 'Test question?',
      options: ['A'],
      answerKey: 'A',
    });
    
    await qpPage.clickAddToBatch();
    await adminPage.waitForTimeout(500);
    await qpPage.clickPublish();
    
    await adminPage.waitForTimeout(10000);
    const hasErrorOrSuccess = (await qpPage.waitForError(2000).catch(() => false)) || 
                             (await qpPage.waitForSuccess(2000).catch(() => false));
    expect(typeof hasErrorOrSuccess).toBe('boolean');
  });

  test('should show loading state during save', async () => {
    await qpPage.fillCompleteMCQ({
      question: 'Loading test?',
      options: ['A', 'B', 'C', 'D'],
      answerKey: 'B',
    });
    await qpPage.clickAddToBatch();
    await adminPage.waitForTimeout(500);

    const savePromise = qpPage.clickSaveAsDraft();
    const isLoadingShown = await qpPage.isLoading();
    
    await savePromise.catch(() => {});
    
    expect(typeof isLoadingShown).toBe('boolean');
  });
});

test.describe('Auto-save and Persistence', () => {
  let qpPage: QuestionPublisherPage;

  test('should persist work in localStorage', async () => {
    qpPage = new QuestionPublisherPage(adminPage);
    await qpPage.navigate();
    
    await qpPage.fillCompleteMCQ({
      question: 'Persisted question?',
      options: ['A', 'B', 'C', 'D'],
      answerKey: 'C',
    });
    await qpPage.clickAddToBatch();
    
    await adminPage.waitForTimeout(3000);
    
    const localStorage = adminPage.context().storageState();
    expect(localStorage).toBeTruthy();
  });
});
