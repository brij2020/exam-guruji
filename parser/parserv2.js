
import fs from "fs-extra"
import crypto from "node:crypto"
import zlib from "node:zlib"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"

const QUESTION_MARKER_REGEX = /\b(?:Q(?:uestion)?|Que|Q\.?)\.?\s*(\d{1,4})\s*[.)]/gi
const DIRECTION_HEADER_REGEX =
  /Direct(?:ion|ions)\s*(?:for\s*)?\(?\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*\)?\s*[:.\-]?/gi

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const standardFontDataUrl = pathToFileURL(
  path.join(__dirname, "node_modules", "pdfjs-dist", "standard_fonts") + path.sep
).href

const cMapUrl = pathToFileURL(
  path.join(__dirname, "node_modules", "pdfjs-dist", "cmaps") + path.sep
).href


/* ------------------------------------------------
   LAYOUT RECONSTRUCTION
------------------------------------------------ */

function reconstructPageText(items){

  const lines=[]

  for(const item of items){

    const y=Math.round(item.transform[5])

    let line=lines.find(l=>Math.abs(l.y-y)<4)

    if(!line){
      line={y,text:[]}
      lines.push(line)
    }

    line.text.push({
      x:item.transform[4],
      str:item.str
    })

  }

  lines.sort((a,b)=>b.y-a.y)

  return lines
    .map(line =>
      line.text
        .sort((a,b)=>a.x-b.x)
        .map(t=>t.str)
        .join(" ")
    )
    .join("\n")

}


/* ------------------------------------------------
   SMART PAGE TEXT EXTRACTION
------------------------------------------------ */

async function extractPageText(page){

  const content=await page.getTextContent()

  let text=reconstructPageText(content.items)

  return text

}


/* ------------------------------------------------
   TEXT CLEANING
------------------------------------------------ */

function cleanText(text){

  return text
    .replace(/Adda247/gi,"")
    .replace(/FREE QUIZZES/gi,"")
    .replace(/FREE PDFs/gi,"")
    .replace(/Solutions[\s\S]*/gi,"")
    .replace(/[ \t]+/g," ")
    .replace(/\n{3,}/g,"\n\n")
    .trim()

}

/* ------------------------------------------------
   DIRECTIONS (RC) EXTRACTION
------------------------------------------------ */

function extractDirections(text){
  const ranges=[]
  const regex=
    /Direct(?:ion|ions)\s*(?:for\s*)?\(?\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*\)?\s*[:.\-]?\s*([\s\S]*?)(?=\s*(?:Direct(?:ion|ions)\s*(?:for\s*)?\(?\s*(?:Q(?:uestion)?\.?\s*)?\d{1,3}\s*[-–—]\s*\d{1,3}\s*\)?\s*[:.\-]?|\b(?:Q(?:uestion)?|Que)\.?\s*\d{1,4}\s*[.)]|$))/gi

  let match
  while((match=regex.exec(text))!==null){
    const start=Number(match[1]||0)
    const end=Number(match[2]||0)
    if(!start||!end||end<start) continue
    const passageText=String(match[3]||"").replace(/\s+/g," ").trim()
    if(!passageText) continue
    ranges.push({
      start,
      end,
      groupId:`rc-${start}-${end}`,
      groupTitle:`Direction (${start}-${end})`,
      passageText
    })
  }

  return ranges
}

function resolveRcMeta(questionNumber,directionRanges){
  const q=Number(questionNumber||0)
  if(!q||!Array.isArray(directionRanges)) return {groupType:"none",groupId:"",groupTitle:"",passageText:"",groupOrder:null}
  const matched=directionRanges.find(r=>q>=r.start && q<=r.end && String(r.passageText||"").trim().length>0)
  if(!matched) return {groupType:"none",groupId:"",groupTitle:"",passageText:"",groupOrder:null}
  return {
    groupType:"rc_passage",
    groupId:matched.groupId,
    groupTitle:matched.groupTitle,
    passageText:matched.passageText,
    groupOrder:q-matched.start+1
  }
}


/* ------------------------------------------------
   SPLIT QUESTIONS
------------------------------------------------ */

function splitQuestions(text){

  const blocks=[]
  const markers=[...text.matchAll(QUESTION_MARKER_REGEX)]
  const directionMarkers=[...text.matchAll(DIRECTION_HEADER_REGEX)]
    .map(m=>({index:Number(m.index||0), raw:String(m[0]||"")}))
    .filter(m=>Number.isFinite(m.index) && m.index>=0)
    .sort((a,b)=>a.index-b.index)

  let directionPtr=0

  for(let i=0;i<markers.length;i++){

    const start=markers[i].index+markers[i][0].length
    let end=markers[i+1] ? markers[i+1].index : text.length

    while(directionPtr<directionMarkers.length && directionMarkers[directionPtr].index<=start){
      directionPtr++
    }
    const nextDirection=directionMarkers[directionPtr]
    if(nextDirection && nextDirection.index>start && nextDirection.index<end){
      end=nextDirection.index
    }

    const qNum=Number(markers[i][1])

    const block=text.slice(start,end).trim()

    if(block.length>10){

      blocks.push({
        questionNumber:qNum,
        block
      })

    }

  }

  return blocks

}


/* ------------------------------------------------
   QUESTION TEXT
------------------------------------------------ */

function extractQuestion(block){

  let text = block;

  text = text.replace(/^(?:\d{1,4}\.\s*)+/, '').trim();

  const idx=text.search(/\([a-e]\)/i)

  if(idx>=0)
    return text.slice(0,idx).trim()

  return text.trim()

}


/* ------------------------------------------------
   OPTION EXTRACTION
------------------------------------------------ */

function extractOptions(text){
  const source=String(text||"")
  const options=[]
  const seen=new Set()

  const push=(id,value)=>{
    const normalizedId=String(id||"").trim().toUpperCase()
    if(!["A","B","C","D","E"].includes(normalizedId)) return
    const normalizedText=String(value||"").replace(/\s+/g," ").trim()
    if(!normalizedText) return
    const key=`${normalizedId}:${normalizedText}`
    if(seen.has(key)) return
    seen.add(key)
    options.push({id:normalizedId,text:normalizedText})
  }

  const paren=[...source.matchAll(/\(([a-e])\)\s*([\s\S]*?)(?=\([a-e]\)|$)/gi)]
  for(const opt of paren){
    push(opt[1],opt[2])
  }

  if(options.length===0){
    const letterPunct=[...source.matchAll(/\b([A-E])\b\s*[).:\-]\s*([\s\S]*?)(?=\b[A-E]\b\s*[).:\-]\s*|$)/g)]
    for(const opt of letterPunct){
      push(opt[1],opt[2])
    }
  }

  if(options.length===0){
    const loose=[...source.matchAll(/\b([A-E])\b\s+([\s\S]*?)(?=\b[A-E]\b\s+|$)/g)]
    const temp=[]
    const ids=new Set()
    for(const opt of loose){
      const id=String(opt[1]||"").toUpperCase()
      if(!["A","B","C","D","E"].includes(id)) continue
      ids.add(id)
      temp.push({id,text:opt[2]})
    }
    if(ids.has("A") && ids.has("B") && ids.has("C") && temp.length>=3){
      for(const opt of temp){
        push(opt.id,opt.text)
      }
    }
  }

  const order={A:1,B:2,C:3,D:4,E:5}
  return options.sort((a,b)=>(order[a.id]||99)-(order[b.id]||99)).slice(0,5)
}


/* ------------------------------------------------
   SECTION DETECTION
------------------------------------------------ */

function detectSection(q){

  if(q<=30) return "English Language"
  if(q<=65) return "Numerical Ability"

  return "Reasoning Ability"

}


/* ------------------------------------------------
   QUESTION TYPE DETECTION
------------------------------------------------ */

function detectType(q){

  if(/Directions/i.test(q)) return "reading_comprehension"

  if(/ratio|speed|distance|profit|average/i.test(q))
    return "quant"

  if(/arrangement|puzzle|sitting|box/i.test(q))
    return "reasoning_puzzle"

  if(/dice|cube|faces|opposite|folded|unfolded|net of|figure|rotation|mirror/i.test(q))
    return "reasoning_dice_cube"

  return "mcq"

}


/* ------------------------------------------------
   DUPLICATE DETECTION
------------------------------------------------ */

function fingerprint(text){

  return crypto
    .createHash("sha1")
    .update(text.replace(/\s+/g,""))
    .digest("hex")

}


/* ------------------------------------------------
   BUILD QUESTION OBJECT
------------------------------------------------ */

function buildQuestion(entry){

  const questionText=extractQuestion(entry.block)

  const options=extractOptions(entry.block)
  const rcMeta=resolveRcMeta(entry.questionNumber, entry.directionRanges || [])

  return{

    questionNumber: entry.questionNumber,

    section:detectSection(entry.questionNumber),

    type:detectType(questionText),

    question:questionText,

    options,

    answer:"",
    explanation:"",

    groupType: rcMeta.groupType,
    groupId: rcMeta.groupId,
    groupTitle: rcMeta.groupTitle,
    passageText: rcMeta.passageText,
    groupOrder: rcMeta.groupOrder,

    hasVisual:false,
    assets:[]

  }

}


/* ------------------------------------------------
   MAIN PARSER
------------------------------------------------ */

export async function parsePDF(pdfPath){

  const data=new Uint8Array(await fs.readFile(pdfPath))

  const pdf=await pdfjsLib.getDocument({
    data,
    verbosity: pdfjsLib?.VerbosityLevel?.ERRORS ?? 0,
    standardFontDataUrl,
    cMapUrl,
    cMapPacked:true
  }).promise

  let text=""

  for(let i=1;i<=pdf.numPages;i++){

    const page=await pdf.getPage(i)

    const pageText=await extractPageText(page)

    text+=pageText+"\n"

  }

  text=cleanText(text)

  const directionRanges=extractDirections(text)
  const blocks=splitQuestions(text)

  const questions=blocks.map(entry=>buildQuestion({...entry,directionRanges}))

  const seen=new Set()

  const unique=questions.filter(q=>{

    const fp=fingerprint(q.question)

    if(seen.has(fp)) return false

    seen.add(fp)

    return true

  })

  return unique

}

/* ------------------------------------------------
   CLI (for Question Factory API route)
------------------------------------------------ */

function parseArgs() {
  const args = process.argv.slice(2)
  const parsed = { input: "", output: "", jsonStdout: false }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === "--input" && args[i + 1]) {
      parsed.input = args[i + 1]
      i += 1
      continue
    }
    if (arg === "--output" && args[i + 1]) {
      parsed.output = args[i + 1]
      i += 1
      continue
    }
    if (arg === "--json-stdout") {
      parsed.jsonStdout = true
    }
  }

  return parsed
}

async function runCli() {
  const cli = parseArgs()
  const inputPath = cli.input
  if (!inputPath) {
    const usage = "Usage: node parserv2.js --input file.pdf [--output out.json] [--json-stdout]"
    if (cli.jsonStdout) {
      process.stdout.write(JSON.stringify({ error: usage }))
    } else {
      console.error(usage)
    }
    process.exit(1)
  }

  const questions = await parsePDF(inputPath)
  const result = {
    examSlug: "",
    stageSlug: "",
    domain: "",
    provider: "pdf-import",
    testId: "",
    testTitle: "",
    promptContext: "Parsed automatically from PDF (parserv2)",
    questions,
  }

  if (cli.output) {
    await fs.writeFile(cli.output, JSON.stringify(result, null, 2))
  }

  if (cli.jsonStdout) {
    process.stdout.write(JSON.stringify(result))
  } else {
    console.log("Done. Questions extracted:", questions.length)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    const message = typeof error === "object" && error && "message" in error ? String(error.message || "") : "Unknown error"
    process.stderr.write(message + "\n")
    process.exit(1)
  })
}
