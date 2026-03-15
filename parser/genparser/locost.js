const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

// Use your free API Key from Google AI Studio
const genAI = new GoogleGenerativeAI("YOUR_FREE_API_KEY");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const syllabus = {
  "Numerical Ability": [
    "Simplification with fractions", "Quadratic Equations (Square roots)", 
    "Missing Number Series (Multiplication pattern)", "Wrong Number Series",
    "Profit and Loss (Successive discount)", "Simple and Compound Interest"
  ],
  "Reasoning Ability": [
    "Syllogism (Only a few cases)", "Linear Seating Arrangement (North facing)",
    "Square Table Seating", "Blood Relations (Coded)", "Direction Sense"
  ],
  "English": [
    "Error Spotting (Subject-Verb Agreement)", "Cloze Test (Banking context)",
    "Sentence Rearrangement", "Fillers (Double blanks)"
  ]
};

async function generate() {
  const allQuestions = [];

  for (const [section, topics] of Object.entries(syllabus)) {
    for (const topic of topics) {
      console.log(`📡 Fetching 10 questions for: ${topic}...`);
      
      const prompt = `Return ONLY a JSON array of 10 unique SBI Clerk Prelims PYQs for ${topic} in the ${section} section. 
      Use owner: "69b056cef85b79b029486bf8" and provider: "gemini-free". 
      Follow the exact schema provided earlier. No markdown. No text.`;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, "").trim();
        const batch = JSON.parse(text);
        
        allQuestions.push(...batch);
        
        // Save incrementally so you don't lose data if the script crashes
        fs.writeFileSync("master_bank.json", JSON.stringify(allQuestions, null, 2));

        // CRITICAL: Wait 10 seconds between requests to respect the Free Tier RPM
        console.log("⏸️ Cooling down...");
        await new Promise(r => setTimeout(r, 10000)); 
      } catch (e) {
        console.error(`⚠️ Failed batch ${topic}: ${e.message}`);
      }
    }
  }
  console.log("🎯 Generation Cycle Complete!");
}

generate();