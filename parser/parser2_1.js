import crypto from "crypto"
import fs from "fs-extra"

let pdfjsLib

async function loadPdf(){
  pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
}
await loadPdf()

const OWNER="6996175eb1eeb83ad5862e63"

function fingerprint(text){
  return crypto.createHash("sha1").update(text).digest("hex")
}

function normalize(text){

  return text
  .replace(/\r/g,"")
  .replace(/[ \t]+/g," ")
  .replace(/\n\s+/g,"\n")
  .replace(/\s+\n/g,"\n")

}

function isQuestion(line){

  return /^(Que\.?|Q)?\s*\d+\./i.test(line)

}

function detectDirections(line){

  const m=line.match(/Directions\s*\((\d+)\s*-\s*(\d+)\)/i)

  if(!m) return null

  return {
    start:Number(m[1]),
    end:Number(m[2])
  }

}

function extractOptions(block){

  const options=[]

  const regex=/\(?([a-d])\)?[\).\s]+([\s\S]*?)(?=\(?[a-d]\)?[\).\s]+|$)/gi

  let m

  while((m=regex.exec(block))){

    options.push({

      key:m[1].toUpperCase(),

      text:m[2].trim()

    })

  }

  return options

}

function extractAnswer(block,options){

  const m=block.match(/Correct\s*Option\s*[-:]\s*(\d+)/i)

  if(!m) return ""

  const idx=parseInt(m[1])-1

  if(!options[idx]) return ""

  return options[idx].text

}

function parseQuestions(text){

  const lines=text
  .split("\n")
  .map(x=>x.trim())
  .filter(Boolean)

  let passage=""
  let range=null

  const questions=[]

  for(let i=0;i<lines.length;i++){

    const line=lines[i]

    const dir=detectDirections(line)

    if(dir){

      range=dir
      passage=line

      i++

      while(i<lines.length && !isQuestion(lines[i])){

        passage+=" "+lines[i]
        i++

      }

      i--
      continue

    }

    if(isQuestion(line)){

      let block=line
      i++

      while(

        i<lines.length &&
        !isQuestion(lines[i]) &&
        !detectDirections(lines[i])

      ){

        block+=" "+lines[i]
        i++

      }

      i--

      const qNum=parseInt(block.match(/(\d+)\./)[1])

      const questionText=block
      .replace(/^(Que\.?|Q)?\s*\d+\./i,"")
      .split(/\(?[a-d]\)?[\).\s]/i)[0]
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

        examSlug:"sbi-clerk",

        stageSlug:"prelims",

        domain:"Government Exam",

        question:questionText,

        promptContext:context,

        options:options,

        answer:answer,

        difficulty:"medium",

        complexity:"",

        topic:"",

        section:"",

        explanation:"",

        tags:["sbi-clerk"],

        createdAt:new Date(),

        updatedAt:new Date()

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

    const strings=content.items.map(i=>i.str)

    text+=strings.join(" ")+"\n"

  }

  return normalize(text)

}

async function processPDF(file){

  const text=await extractText(file)

  const questions=parseQuestions(text)

  return questions

}

async function processFolder(folder){

  const files=fs.readdirSync(folder)

  let all=[]

  for(const file of files){

    if(!file.endsWith(".pdf")) continue

    const path=folder+"/"+file

    const questions=await processPDF(path)

    console.log(file,"→",questions.length)

    all=[...all,...questions]

  }

  return all

}

async function run(){

  const input="/Users/brijbhan/Downloads"

  const OUTPUT="./questions.json"

  const questions=await processFolder(input)

  fs.writeFileSync(

    OUTPUT,
    JSON.stringify(questions,null,2)

  )

  console.log("Total Questions:",questions.length)

}

run()
