/**
 * Simple text to JSON parser for exam questions
 * Usage: node textParser.js --file path/to/file.txt
 *        node textParser.js --stdin < questions.txt
 */

import fs from "fs";

function parseInlineOptions(line) {
  const opts = [];
  const matches = line.matchAll(/\(([a-d])\)\s*([^\(]+)/gi);
  for (const match of matches) {
    opts.push({
      id: match[1].toLowerCase(),
      text: match[2].trim()
    });
  }
  return opts;
}

function parseTextToJson(text) {
  const questions = [];
  const cleanText = text.replace(/\r\n/g, "\n").trim();
  const lines = cleanText.split("\n");
  
  let currentQuestion = {
    question: "",
    options: []
  };
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      // Empty line - flush current question if we have one
      if (currentQuestion.question || currentQuestion.options.length > 0) {
        questions.push({ ...currentQuestion, answer: null, explanation: null });
        currentQuestion = { question: "", options: [] };
      }
      continue;
    }
    
    // Check if it's inline options like "(a) 1335 (b) 1775 (c) 1575 (d) 1375"
    const inlineOpts = parseInlineOptions(line);
    if (inlineOpts.length >= 2) {
      currentQuestion.options = inlineOpts;
      continue;
    }
    
    // Check if it's an option line (starts with (a), (b), (c), (d))
    const parenOptMatch = line.match(/^\(([a-d])\)\s*(.+)/i);
    if (parenOptMatch) {
      currentQuestion.options.push({
        id: parenOptMatch[1].toLowerCase(),
        text: parenOptMatch[2].trim()
      });
      continue;
    }
    
    // Check if it's a numbered question
    const qMatch = line.match(/^(\d+)[.)]\s*(.+)/);
    if (qMatch) {
      // Flush previous question
      if (currentQuestion.question || currentQuestion.options.length > 0) {
        questions.push({ ...currentQuestion, answer: null, explanation: null });
      }
      currentQuestion = { question: qMatch[2], options: [] };
      continue;
    }
    
    // Otherwise it's continuation of question text
    if (currentQuestion.question) {
      currentQuestion.question += " " + line;
    } else {
      currentQuestion.question = line;
    }
  }
  
  // Don't forget last question
  if (currentQuestion.question || currentQuestion.options.length > 0) {
    questions.push({ ...currentQuestion, answer: null, explanation: null });
  }
  
  return questions;
}

async function main() {
  const args = process.argv.slice(2);
  
  let inputText = "";
  
  if (args[0] === "--file" && args[1]) {
    inputText = fs.readFileSync(args[1], "utf-8");
  } else if (args[0] === "--stdin") {
    inputText = fs.readFileSync(0, "utf-8");
  } else {
    console.log("Usage:");
    console.log("  node textParser.js --file path/to/file.txt");
    console.log("  node textParser.js --stdin < questions.txt");
    process.exit(1);
  }
  
  const questions = parseTextToJson(inputText);
  console.log(JSON.stringify(questions, null, 2));
}

main().catch(console.error);
