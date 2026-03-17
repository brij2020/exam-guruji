import fs from "fs"
import { createRequire } from "module"



const require = createRequire(import.meta.url)

const pdfModule = require("pdf-parse")
const pdf = pdfModule.default || pdfModule

const data = await pdf(fs.readFileSync("./NB-2024-08-09-11.pdf"))

const text = data.text

const questionRegex =
/(\d+)\.\s([\s\S]*?)\n\s*\(A\)\s([\s\S]*?)\n\s*\(B\)\s([\s\S]*?)\n\s*\(C\)\s([\s\S]*?)\n\s*\(D\)\s([\s\S]*?)\n\s*\(E\)\s([\s\S]*?)(?=\n\d+\.|\n[A-Z]-\d+\.|$)/g

let match
const questions=[]

while((match = questionRegex.exec(text)) !== null){

  const qNumber = match[1]

  const q = {
    questionNumber: qNumber,
    question: match[2].trim(),
    options: [
      match[3].trim(),
      match[4].trim(),
      match[5].trim(),
      match[6].trim(),
      match[7].trim()
    ]
  }

  questions.push(q)
}

console.log("Total Questions:", questions.length)

fs.writeFileSync(
  "questions.json",
  JSON.stringify(questions,null,2)
)