import { Page } from '@playwright/test';

export const testData = {
  exams: [
    { name: 'SBI Clerk', slug: 'sbi-clerk' },
    { name: 'SSC CGL', slug: 'ssc-cgl' },
    { name: 'IBPS PO', slug: 'ibps-po' },
    { name: 'UPSC CSE', slug: 'upsc-cse' },
  ],
  
  stages: [
    { name: 'Prelims', slug: 'prelims' },
    { name: 'Mains', slug: 'mains' },
    { name: 'Tier 1', slug: 'tier-1' },
    { name: 'Tier 2', slug: 'tier-2' },
  ],
  
  difficulties: ['easy', 'medium', 'hard'] as const,
  
  questionTypes: [
    'Multiple Choice (MCQ)',
    'Theory/Concept',
    'Output Prediction',
    'Scenario Based',
  ],
  
  sampleQuestions: {
    english: {
      question: 'Choose the correct synonym of "Benevolent":',
      options: ['Malevolent', 'Kind', 'Neutral', 'Indifferent'],
      answerKey: 'B',
      explanation: 'Benevolent means well-meaning and kindly.',
    },
    quant: {
      question: 'If x + 5 = 10, what is the value of x?',
      options: ['3', '5', '7', '15'],
      answerKey: 'B',
      explanation: 'x + 5 = 10, therefore x = 10 - 5 = 5',
    },
    reasoning: {
      question: 'Find the next number in the series: 2, 4, 8, 16, ?',
      options: ['24', '30', '32', '20'],
      answerKey: 'C',
      explanation: 'Each number is multiplied by 2 to get the next number.',
    },
    rcPassage: {
      passage: 'Technology has revolutionized the way we live and work. From communication to healthcare, digital innovations have transformed every aspect of human life.',
      questions: [
        {
          question: 'What has technology done according to the passage?',
          options: ['Destroyed jobs', 'Revolutionized life', 'Caused problems', 'Stopped evolution'],
          answerKey: 'B',
        },
        {
          question: 'Which areas have been transformed?',
          options: ['Only communication', 'Communication and healthcare', 'Only healthcare', 'Nothing specific'],
          answerKey: 'B',
        },
      ],
    },
  },
};

export const samplePastedContent = {
  singleMCQ: `
    Question 1: What is the capital of France?
    (A) London
    (B) Paris
    (C) Berlin
    (D) Madrid
    Answer Key: B
    Explanation: Paris is the capital and largest city of France.
  `,
  
  multipleMCQs: `
    Question 1: What is 2 + 2?
    (A) 3
    (B) 4
    (C) 5
    (D) 6
    Answer: B
    
    ---
    
    Question 2: Which planet is known as the Red Planet?
    (A) Venus
    (B) Mars
    (C) Jupiter
    (D) Saturn
    Answer: B
    
    ---
    
    Question 3: What is the chemical symbol for water?
    (A) H2O
    (B) CO2
    (C) NaCl
    (D) O2
    Answer: A
  `,
  
  rcPassage: `
    The Internet has become an essential part of modern life. It connects billions of people worldwide, enabling instant communication and access to information. E-commerce has transformed shopping, and online education has made learning accessible to all.
    
    Question 1: What has the Internet become according to the passage?
    (A) A luxury
    (B) An essential part
    (C) A problem
    (D) Unimportant
    Answer: B
    
    Question 2: What has e-commerce transformed?
    (A) Communication
    (B) Education
    (C) Shopping
    (D) Healthcare
    Answer: C
  `,
  
  hindiMCQ: `
    प्रश्न 1: भारत की राजधानी क्या है?
    (क) मुंबई
    (ख) नई दिल्ली
    (ग) कोलकाता
    (घ) चेन्नई
    उत्तर: ख
  `,
};

export async function loginAsAdmin(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@guruji.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  await loginPage.login(adminEmail, adminPassword);
}

export function generateRandomQuestion(): {
  question: string;
  options: string[];
  answerKey: string;
} {
  const num = Math.floor(Math.random() * 1000);
  const options = ['Option A', 'Option B', 'Option C', 'Option D'];
  const answerKeys = ['A', 'B', 'C', 'D'];
  
  return {
    question: `Test Question ${num}?`,
    options,
    answerKey: answerKeys[Math.floor(Math.random() * 4)],
  };
}

export function generateBulkQuestions(count: number): Array<{
  question: string;
  options: string[];
  answerKey: string;
}> {
  return Array.from({ length: count }, (_, i) => ({
    question: `Bulk Test Question ${i + 1}?`,
    options: ['A', 'B', 'C', 'D'],
    answerKey: 'A',
  }));
}

import { LoginPage } from '../page-objects/base';
