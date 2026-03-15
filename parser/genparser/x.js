const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const crypto = require("crypto");

// --- CONFIGURATION ---
const API_KEY = "YOUR_FREE_GEMINI_API_KEY";
const BACKEND_URL = "http://localhost:1337/api/questions"; // Update to your Strapi/Express URL
const OWNER_ID = "69b056cef85b79b029486bf8";

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 100 Question Paper Blueprint
const modules = [
  { section: "English", topic: "Reading Comprehension", count: 10, qStart: 1 },
  { section: "English", topic: "Error Spotting & Cloze Test", count: 20, qStart: 11 },
  { section: "Numerical Ability", topic: "Simplification & Approximation", count: 15, qStart: 31 },
  { section: "Numerical Ability", topic: "Data Interpretation & Series", count: 10, qStart: 46 },
  { section: "Numerical Ability", topic: "Arithmetic Word Problems", count: 10, qStart: 56 },
  { section: "Reasoning Ability", topic: "Puzzles & Seating Arrangement", count: 20, qStart: 66 },
  { section: "Reasoning Ability", topic: "Syllogism, Inequality & Misc", count: 15, qStart: 86 }
];

// --- LOGIC ---

async function uploadToDatabase(questionData) {
  try {
    // If using Strapi, data usually needs to be wrapped in a { data: ... } object
    await axios.post(BACKEND_URL, { data: questionData });
    return true;
  } catch (err) {
    console.error("❌ DB Upload Failed:", err.response?.data || err.message);
    return false;
  }
}

async function generateModule(mod) {
  const prompt = `You are a Government Exam Question Authoring Engine.



Task:

Generate exactly 25 high-quality SBI Clerk Prelims MCQs aligned to real exam style.



Output rules (strict):

- Return ONLY valid JSON (no markdown, no explanation).

- Root must be an object with key "questions".

- "questions" must be an array of exactly 25 items.

- Each item must match this schema exactly:

{

  "question": "string",

  "options": ["string","string","string","string"],

  "answerKey": "A|B|C|D",

  "answer": "string",

  "explanation": "string",

  "difficulty": "easy|medium|hard",

  "section": "english-language|numerical-ability|reasoning-ability",

  "topic": "string",

  "type": "mcq",

  "examSlug": "sbi-clerk",

  "stageSlug": "prelims",

  "domain": "Government Exam - SBI Clerk",

  "reviewStatus": "draft",

  "source": "chatgpt-manual"

}



Quality constraints:

- Exam realism: must feel like SBI Clerk Prelims.

- Section distribution:

  - english-language: 8

  - numerical-ability: 9

  - reasoning-ability: 8

- Difficulty mix:

  - easy: 10

  - medium: 11

  - hard: 4

- No duplicate questions.

- No ambiguous correct answer.

- "answer" must exactly match the option text referenced by "answerKey".

- Keep explanations concise (1-2 lines).

- Avoid controversial/current-affairs questions.

- Use clear, student-friendly wording.



Validation before final output:

- Ensure 25 questions exactly.

- Ensure each has exactly 4 options.

- Ensure answerKey maps correctly to answer text.

- Ensure all fields are present in every object.



Return JSON only in this shape:

{

  "questions": [ ...25 objects... ]

}`
  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json|```/g, "").trim();
    const questions = JSON.parse(text);
    
    return questions.map(q => ({
      ...q,
      fingerprint: crypto.createHash('sha1').update(q.question).digest('hex'),
      createdAt: new Date().toISOString(),
      reviewStatus: "approved",
      testId: `sbi-clerk-full-set-${Date.now()}`
    }));
  } catch (e) {
    return null;
  }
}

async function runWorkflow() {
  console.log("🚀 Startup Content Engine Started...");

  for (const mod of modules) {
    let batch = null;
    while (!batch) {
      batch = await generateModule(mod);
      if (!batch) {
        console.log(`⏳ API Busy. Retrying ${mod.topic} in 20s...`);
        await new Promise(r => setTimeout(r, 20000));
      }
    }

    // Upload each question in the batch
    for (const q of batch) {
      const success = await uploadToDatabase(q);
      if (success) console.log(`✅ Uploaded Q#${q.questionNumber}: ${q.topic}`);
    }

    // Free Tier Throttle
    await new Promise(r => setTimeout(r, 15000));
  }
  console.log("🎯 Full 100-Question Set Synced to Database.");
}

runWorkflow();