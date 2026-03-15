import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

async function generateQuestionsFromPDF(filePath) {
  // 1. EXTRACTION: Load the PDF
  const loader = new PDFLoader(filePath);
  const rawDocs = await loader.load();

  // 2. CHUNKING: Split text into manageable pieces for the AI
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 200,
  });
  const docs = await splitter.splitDocuments(rawDocs);

  // 3. AI MODEL: Initialize Gemini (or OpenAI/Ollama)
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
  });

  // 4. PROMPT: Ask the AI to generate questions
  const context = docs.map(d => d.pageContent).join("\n\n");
  const response = await model.invoke([
    ["system", "You are an educator. Create 5 multiple-choice questions based ONLY on the provided text."],
    ["human", context]
  ]);

  console.log("Generated Questions:", response.content);
}