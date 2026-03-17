import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Load PDF.js engine
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = "./NB-2024-08-09-11.pdf";

async function parseBPSC() {
  try {
    const data = new Uint8Array(fs.readFileSync(INPUT_PATH));
    const loadingTask = pdfjsLib.getDocument({
      data,
      standardFontDataUrl: pathToFileURL(path.join(__dirname, "node_modules", "pdfjs-dist", "standard_fonts") + path.sep).href,
      cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    let fullText = "";

    // 1. Extract text page by page (Prevents memory crash)
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      fullText += pageText + "\n";
    }

    // 2. Clean Text: Remove BPSC headers/watermarks that break regex
    const cleanedText = fullText
      .replace(/Bihar Public Service Commission|BPSC|Page \d+/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // 3. Robust BPSC Regex: Handles multi-line questions and (E) options
    const questionRegex = /(\d+)\.\s+([\s\S]*?)\s*\(A\)\s+([\s\S]*?)\s*\(B\)\s+([\s\S]*?)\s*\(C\)\s+([\s\S]*?)\s*\(D\)\s+([\s\S]*?)\s*\(E\)\s+([\s\S]*?)(?=\d+\.\s+|$)/gi;

    const questions = [];
    let match;

    while ((match = questionRegex.exec(cleanedText)) !== null) {
      questions.push({
        questionNumber: parseInt(match[1]),
        question: match[2].trim(),
        options: [
          { id: "A", text: match[3].trim() },
          { id: "B", text: match[4].trim() },
          { id: "C", text: match[5].trim() },
          { id: "D", text: match[6].trim() },
          { id: "E", text: match[7].trim() }
        ],
        exam: "BPSC",
        type: "mcq"
      });
    }

    console.log("Total Questions Extracted:", questions.length);
    await fs.writeJson("questions.json", questions, { spaces: 2 });

  } catch (error) {
    console.error("Critical Parsing Error:", error.message);
  }
}

parseBPSC();