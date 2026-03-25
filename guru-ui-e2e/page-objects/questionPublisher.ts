import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base';

export class QuestionPublisherPage extends BasePage {
  readonly header: Locator;
  readonly examSelect: Locator;
  readonly stageSelect: Locator;
  readonly sectionSelect: Locator;
  readonly topicSelect: Locator;
  readonly difficultySelect: Locator;
  readonly questionTypeSelect: Locator;
  readonly questionInput: Locator;
  readonly optionsInputs: Locator[];
  readonly answerInput: Locator;
  readonly answerKeySelect: Locator;
  readonly explanationInput: Locator;
  readonly blackboardTextarea: Locator;
  readonly addToBatchButton: Locator;
  readonly saveAsDraftButton: Locator;
  readonly publishButton: Locator;
  readonly clearAllButton: Locator;
  readonly previewButton: Locator;
  readonly batchList: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingIndicator: Locator;
  readonly parseDraftButton: Locator;
  readonly parseMultipleButton: Locator;
  readonly normalizeButton: Locator;
  readonly hindiModeToggle: Locator;
  readonly mathSymbolButtons: Locator;
  readonly groupTypeSelect: Locator;
  readonly rcPassageTextarea: Locator;
  readonly parseRcSetButton: Locator;
  readonly addRcToBatchButton: Locator;
  readonly assetUploadButton: Locator;
  readonly assetLibraryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.header = page.locator('h1:has-text("Question Publisher"), h2:has-text("Question Publisher")');
    this.examSelect = page.locator('label:has-text("Exam"), select[name="examSlug"], .ant-select:has-text("SBI Clerk")').first();
    this.stageSelect = page.locator('label:has-text("Stage"), select[name="stageSlug"]').first();
    this.sectionSelect = page.locator('label:has-text("Section"), select[name="section"]').first();
    this.topicSelect = page.locator('label:has-text("Topic"), select[name="topic"]').first();
    this.difficultySelect = page.locator('label:has-text("Difficulty"), select[name="difficulty"]').first();
    this.questionTypeSelect = page.locator('label:has-text("Question Type"), select[name="questionType"]').first();
    this.questionInput = page.locator('textarea[name="question"], .ql-editor, [placeholder*="question" i]').first();
    this.optionsInputs = [
      page.locator('input[name="options[0]"], input[placeholder*="Option A"], input[aria-label*="Option 1"]').first(),
      page.locator('input[name="options[1]"], input[placeholder*="Option B"], input[aria-label*="Option 2"]').first(),
      page.locator('input[name="options[2]"], input[placeholder*="Option C"], input[aria-label*="Option 3"]').first(),
      page.locator('input[name="options[3]"], input[placeholder*="Option D"], input[aria-label*="Option 4"]').first(),
    ];
    this.answerInput = page.locator('input[name="answer"], input[placeholder*="answer" i]').first();
    this.answerKeySelect = page.locator('input[name="answerKey"], select[name="answerKey"]').first();
    this.explanationInput = page.locator('textarea[name="explanation"], input[name="explanation"]').first();
    this.blackboardTextarea = page.locator('textarea[placeholder*="paste" i], textarea[placeholder*="blackboard" i]').first();
    this.addToBatchButton = page.locator('button:has-text("Add to Batch"), button:has-text("Add Question")').first();
    this.saveAsDraftButton = page.locator('button:has-text("Save as Draft"), button:has-text("Draft")').first();
    this.publishButton = page.locator('button:has-text("Publish"), button:has-text("Publish All")').first();
    this.clearAllButton = page.locator('button:has-text("Clear All"), button:has-text("Clear")').first();
    this.previewButton = page.locator('button:has-text("Preview")').first();
    this.batchList = page.locator('[class*="batch"], [class*="question-list"], table').first();
    this.successMessage = page.locator('.ant-message-success, [class*="success"]').first();
    this.errorMessage = page.locator('.ant-message-error, [class*="error"], .ant-alert-error').first();
    this.loadingIndicator = page.locator('.ant-spin, .ant-loading, [class*="loading"]').first();
    this.parseDraftButton = page.locator('button:has-text("Parse Draft")').first();
    this.parseMultipleButton = page.locator('button:has-text("Parse Multiple")').first();
    this.normalizeButton = page.locator('button:has-text("Normalize")').first();
    this.hindiModeToggle = page.locator('input[type="checkbox"][name*="hindi"], button:has-text("Hindi")').first();
    this.mathSymbolButtons = page.locator('button[title*="symbol"], button[title*="math"]');
    this.groupTypeSelect = page.locator('label:has-text("Group Type"), select[name="groupType"]').first();
    this.rcPassageTextarea = page.locator('textarea[name="passageText"], textarea[placeholder*="passage" i]').first();
    this.parseRcSetButton = page.locator('button:has-text("Parse RC Set")').first();
    this.addRcToBatchButton = page.locator('button:has-text("Add RC to Batch")').first();
    this.assetUploadButton = page.locator('button:has-text("Upload Asset"), button:has-text("Add Asset")').first();
    this.assetLibraryButton = page.locator('button:has-text("Asset Library")').first();
  }

  async navigate(path?: string) {
    await super.navigate(path || '/en/admin/tests/question-publisher');
  }

  async selectExam(examValue: string) {
    await this.examSelect.click();
    await this.page.locator(`.ant-select-dropdown:visible >> text=${examValue}`).first().click();
  }

  async selectStage(stageValue: string) {
    await this.stageSelect.click();
    await this.page.locator(`.ant-select-dropdown:visible >> text=${stageValue}`).first().click();
  }

  async selectSection(sectionValue: string) {
    await this.sectionSelect.click();
    await this.page.locator(`.ant-select-dropdown:visible >> text=${sectionValue}`).first().click();
  }

  async selectDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
    await this.difficultySelect.click();
    await this.page.locator(`.ant-select-dropdown:visible >> text=${difficulty}`).first().click();
  }

  async selectQuestionType(type: string) {
    await this.questionTypeSelect.click();
    await this.page.locator(`.ant-select-dropdown:visible >> text=${type}`).first().click();
  }

  async fillQuestion(question: string) {
    await this.questionInput.fill(question);
  }

  async fillOption(index: number, value: string) {
    if (index >= 0 && index < this.optionsInputs.length) {
      await this.optionsInputs[index].fill(value);
    }
  }

  async fillAllOptions(options: string[]) {
    for (let i = 0; i < Math.min(options.length, this.optionsInputs.length); i++) {
      await this.fillOption(i, options[i]);
    }
  }

  async selectAnswerKey(key: string) {
    await this.answerKeySelect.click();
    await this.page.locator(`.ant-select-dropdown:visible >> text=${key}`).first().click();
  }

  async fillExplanation(explanation: string) {
    await this.explanationInput.fill(explanation);
  }

  async pasteToBlackboard(content: string) {
    await this.blackboardTextarea.fill(content);
  }

  async clickAddToBatch() {
    await this.addToBatchButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickSaveAsDraft() {
    await this.saveAsDraftButton.click();
    await this.waitForPopconfirm()?.confirm();
  }

  async clickPublish() {
    await this.publishButton.click();
    await this.waitForPopconfirm()?.confirm();
  }

  async clickClearAll() {
    await this.clearAllButton.click();
    await this.waitForPopconfirm()?.confirm();
  }

  async clickParseDraft() {
    await this.parseDraftButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickParseMultiple() {
    await this.parseMultipleButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickNormalize() {
    await this.normalizeButton.click();
    await this.page.waitForTimeout(300);
  }

  async toggleHindiMode(enable: boolean = true) {
    const currentState = await this.hindiModeToggle.isChecked();
    if (currentState !== enable) {
      await this.hindiModeToggle.click();
    }
  }

  async insertMathSymbol(symbol: string) {
    await this.page.locator(`button[title="${symbol}"]`).click();
  }

  async enableRcPassageMode() {
    await this.groupTypeSelect.click();
    await this.page.locator('.ant-select-dropdown:visible >> text="RC Passage"').first().click();
  }

  async clickParseRcSet() {
    await this.parseRcSetButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickAddRcToBatch() {
    await this.addRcToBatchButton.click();
    await this.page.waitForTimeout(500);
  }

  async waitForPopconfirm(): Promise<{ confirm: () => Promise<void>; cancel: () => Promise<void> } | null> {
    const popconfirm = this.page.locator('.ant-popconfirm').first();
    if (await popconfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      return {
        confirm: async () => {
          await this.page.locator('.ant-popconfirm button:has-text("OK"), .ant-popconfirm button:has-text("Yes")').first().click();
          await this.page.waitForTimeout(500);
        },
        cancel: async () => {
          await this.page.locator('.ant-popconfirm button:has-text("Cancel"), .ant-popconfirm button:has-text("No")').first().click();
        },
      };
    }
    return null;
  }

  async getBatchCount(): Promise<number> {
    const rows = this.page.locator('[class*="batch"] tr, [class*="question-list"] > div');
    return await rows.count();
  }

  async deleteQuestionFromBatch(index: number) {
    await this.page.locator(`button[aria-label="Delete"]:nth-child(${index + 1}), [class*="batch"] tr:nth-child(${index + 1}) button`).first().click();
    await this.page.waitForTimeout(300);
  }

  async editQuestionFromBatch(index: number) {
    await this.page.locator(`[class*="batch"] tr:nth-child(${index + 1}) button:has-text("Edit")`).first().click();
    await this.page.waitForTimeout(500);
  }

  async waitForSuccess(timeout: number = 5000): Promise<boolean> {
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async waitForError(timeout: number = 5000): Promise<boolean> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
  }

  async waitForLoading(timeout: number = 10000) {
    const startTime = Date.now();
    while (await this.isLoading() && Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(100);
    }
  }

  async getSuccessMessage(): Promise<string> {
    return await this.successMessage.textContent() || '';
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async isFieldsCleared(): Promise<boolean> {
    const questionValue = await this.questionInput.inputValue().catch(() => '');
    const optionValues = await Promise.all(this.optionsInputs.map(async (input) => input.inputValue().catch(() => '')));
    return questionValue === '' && optionValues.every((v) => v === '');
  }

  async fillCompleteMCQ(data: {
    exam?: string;
    stage?: string;
    section?: string;
    topic?: string;
    difficulty?: string;
    questionType?: string;
    question: string;
    options: string[];
    answerKey: string;
    explanation?: string;
  }) {
    if (data.exam) await this.selectExam(data.exam);
    if (data.stage) await this.selectStage(data.stage);
    if (data.section) await this.selectSection(data.section);
    if (data.difficulty) await this.selectDifficulty(data.difficulty as 'easy' | 'medium' | 'hard');
    if (data.questionType) await this.selectQuestionType(data.questionType);
    
    await this.fillQuestion(data.question);
    await this.fillAllOptions(data.options);
    await this.selectAnswerKey(data.answerKey);
    if (data.explanation) await this.fillExplanation(data.explanation);
  }
}
