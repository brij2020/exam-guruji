
import crypto from "crypto"

import fs from "fs-extra"
let pdfjsLib 


async function loadPdf() {
  pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsLib;
}
await loadPdf()



const OWNER = "6996175eb1eeb83ad5862e63"

function fingerprint(text){
  return crypto.createHash("sha1").update(text).digest("hex")
}

function normalize(text){
  return text
    .replace(/\r/g,"")
    .replace(/\s+/g," ")
    .replace(/ \./g,".")
}

function detectDirections(line){
  const m=line.match(/Directions\s*\((\d+)\s*-\s*(\d+)\)/i)
  if(!m) return null
  return {start:parseInt(m[1]),end:parseInt(m[2])}
}

function extractOptions(block){

  const options=[]
  const regex=/(\d+)\.\s*(.*?)(?=\s*\d+\.|$)/g

  let m
  while((m=regex.exec(block))){
    options.push({
      id:m[1],
      text:m[2].trim()
    })
  }

  return options
}

function extractAnswer(block,options){

  const m=block.match(/Correct Option\s*-\s*(\d+)/i)

  if(!m) return ""

  const index=parseInt(m[1])-1

  return options[index]?options[index].text:""
}

function parseQuestions(text){

  const lines=text.split("\n").map(x=>x.trim()).filter(Boolean)

  const questions=[]

  let passage=""
  let range=null

  for(let i=0;i<lines.length;i++){

    const line=lines[i]

    const dir=detectDirections(line)

    if(dir){

      range=dir
      passage=line

      i++

      while(i<lines.length && !/^Que\.|\d+\./.test(lines[i])){
        passage+=" "+lines[i]
        i++
      }

      i--
      continue
    }

    if(/^Que\.\s*\d+/.test(line)){

      let block=line
      i++

      while(
        i<lines.length &&
        !/^Que\.\s*\d+/.test(lines[i]) &&
        !detectDirections(lines[i])
      ){
        block+=" "+lines[i]
        i++
      }

      i--

      const qNum=parseInt(block.match(/Que\.\s*(\d+)/)[1])

      const questionText=block
        .replace(/Que\.\s*\d+/,"")
        .split(/\d+\./)[0]
        .trim()

      const options=extractOptions(block)

      const answer=extractAnswer(block,options)

      const context=
        range && qNum>=range.start && qNum<=range.end
          ? passage
          : ""

      questions.push({

        fingerprint:fingerprint(questionText),

        owner:OWNER,

        __v:0,

        provider:"pdf-import",

        type:"mcq",

        domain:"Government Exam - SBI Clerk",

        examSlug:"sbi-clerk",

        stageSlug:"prelims",

        question:questionText,

        promptContext:context,

        options:options,

        answer:answer,

        difficulty:"medium",

        complexity:"",

        topic:"",

        section:"",

        explanation:"",

        inputOutput:"",

        sampleSolution:"",

        solutionApproach:"",

        keyConsiderations:[],

        tags:["sbi-clerk"],

        sourceAttempt:null,

        timesSeen:0,

        createdAt:new Date(),

        updatedAt:new Date(),

        lastUsedAt:new Date(),

        testId:"gov-sbi-clerk-prelims-speed-test-daily-45m",

        testTitle:"SBI Clerk Prelims - Speed Test"
      })
    }
  }

  return questions
}

async function extractText(file){

  const data=new Uint8Array(fs.readFileSync(file))

  const pdf=await pdfjsLib.getDocument({data}).promise

  let text=""

  for(let i=1;i<=pdf.numPages;i++){

    const page=await pdf.getPage(i)

    const content=await page.getTextContent()

    const strings=content.items.map(item=>item.str)

    text+=strings.join(" ")+"\n"
  }

  return normalize(text)
}

async function run(){

//   const file= process.argv[2]
const file = "/Users/brijbhan/Downloads/SBI-Clerk-Pre-2024-25-Memory-Based-Paper-22-Feb-2025-1st-shift-English.pdf";
const OUTPUT = "./questions.json";

  if(!file){
    console.log("Usage: node parser.js input.pdf")
    return
  }

  const text=await extractText(file)

  const questions=parseQuestions(text)

  fs.writeFileSync(
    "questions.json",
    JSON.stringify(questions,null,2)
  )

  console.log("Parsed questions:",questions.length)
}

run()