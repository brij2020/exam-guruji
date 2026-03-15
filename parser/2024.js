import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

async function parseExamPDF(filePath) {

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);

    let text = data.text;

    // normalize spaces
    text = text.replace(/\r/g, "");
    text = text.replace(/\n+/g, "\n");
    text = text.replace(/[ ]{2,}/g, " ");

    const parts = text.split(/EXPLANATIONS/i);

    const questionsPart = parts[0];
    const explanationsPart = parts[1] || "";

    const questions = [];

    const questionRegex =
        /(\d+)\.\s*([\s\S]*?)\(\s*a\s*\)\s*([\s\S]*?)\(\s*b\s*\)\s*([\s\S]*?)\(\s*c\s*\)\s*([\s\S]*?)\(\s*d\s*\)\s*([\s\S]*?)(?=\n\d+\.|$)/gi;

    let match;

    while ((match = questionRegex.exec(questionsPart)) !== null) {

        const id = parseInt(match[1]);

        const expRegex = new RegExp(
            `${id}\\.\\s*\\(([a-d])\\)\\s*([\\s\\S]*?)(?=\\n\\d+\\.|$)`,
            "i"
        );

        const expMatch = explanationsPart.match(expRegex);

        questions.push({
            id,
            text: match[2].trim(),
            options: {
                a: match[3].trim(),
                b: match[4].trim(),
                c: match[5].trim(),
                d: match[6].trim()
            },
            answerKey: expMatch ? expMatch[1].toUpperCase() : "",
            explanation: expMatch ? expMatch[2].trim() : ""
        });

        if (questions.length === 100) break;
    }

    return JSON.stringify({
        exam: "SSC CGL TIER-I 2024",
        total: questions.length,
        questions
    }, null, 2);
}

parseExamPDF(
"/Users/brijbhan/Downloads/30 Yearwise SSC CGL Solved Paper (English) 2024.pdf"
).then(json => {

    fs.writeFileSync("questions_bank.json", json);

    console.log("Extraction Complete");
});