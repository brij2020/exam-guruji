import { execSync } from "child_process"
import fs from "fs-extra"
import Tesseract from "tesseract.js"
import sharp from "sharp"
import puppeteer from "puppeteer"
import crypto from "crypto"

const INPUT="./pdf/30 Yearwise SSC CGL Solved Paper (English) 2024 (1).pdf"

function normalize(t){
 return t
  .toLowerCase()
  .replace(/[^\w\s]/g,"")
  .replace(/\s+/g," ")
  .trim()
}

function fingerprint(question,options){

 const txt =
   normalize(question) +
   Object.values(options)
    .map(o=>normalize(o))
    .sort()
    .join(" ")

 return crypto.createHash("sha1").update(txt).digest("hex")
}

async function convertPDF(){

 fs.emptyDirSync("pages")

 execSync(`pdftoppm -png -r 300 "${INPUT}" pages/page`)
}

async function splitColumns(){

 fs.ensureDirSync("columns")

 const files = fs.readdirSync("pages")

 for(const f of files){

  const imgPath = `pages/${f}`

  const meta = await sharp(imgPath).metadata()

  const width = meta.width
  const height = meta.height

  const leftWidth = Math.floor(width / 2)
  const rightWidth = width - leftWidth

  const base = f.replace(".png","")

  const leftPath = `columns/${base}-L.png`
  const rightPath = `columns/${base}-R.png`

  // LEFT column
  await sharp(imgPath)
   .extract({
     left:0,
     top:0,
     width:leftWidth,
     height:height
   })
   .toFile(leftPath)

  // RIGHT column
  await sharp(imgPath)
   .extract({
     left:leftWidth,
     top:0,
     width:rightWidth,
     height:height
   })
   .toFile(rightPath)

 }
}

async function runOCR(){

 const files=fs.readdirSync("columns")
   .sort()

 let text=""

 for(const f of files){

  console.log("OCR:",f)

  const {data}=await Tesseract.recognize(
    `columns/${f}`,
    "eng"
  )

  text+=data.text+"\n"
 }

 fs.writeFileSync("raw.txt",text)

 return text
}

function parseQuestions(text){

 const lines=text.split("\n")

 let questions=[]
 let current=null

 for(let line of lines){

  line=line.trim()

  if(!line) continue

  if(/^\d+\.\s/.test(line)){

   if(current) questions.push(current)

   current={
    question:line.replace(/^\d+\.\s*/,""),
    options:{}
   }

   continue
  }

  const opts=line.match(/\([a-d]\)[^()]+/ig)

  if(opts && current){

   opts.forEach(o=>{

    const key=o.match(/[a-d]/i)[0].toUpperCase()

    const val=o.replace(/\([a-d]\)/i,"").trim()

    current.options[key]=val
   })
  }
 }

 if(current) questions.push(current)

 questions.forEach(q=>{
  q.fingerprint=fingerprint(q.question,q.options)
 })

 return questions
}

function buildHTML(questions){

 let html=`
<html>
<head>
<style>

body{font-family:Arial;margin:40px}

.header{
 text-align:center;
 font-size:24px;
 margin-bottom:20px
}

.question{
 margin-top:20px;
 font-weight:bold
}

.option{
 margin-left:20px
}

</style>
</head>

<body>

<div class="header">
SSC CGL Previous Year Paper
</div>
`

 questions.forEach((q,i)=>{

  html+=`<div class="question">Q${i+1}. ${q.question}</div>`

  Object.entries(q.options).forEach(([k,v])=>{
   html+=`<div class="option">(${k}) ${v}</div>`
  })
 })

 html+="</body></html>"

 return html
}

async function generatePDF(html){

 const browser=await puppeteer.launch()

 const page=await browser.newPage()

 await page.setContent(html)

 await page.pdf({
  path:"rebuilt_adda247.pdf",
  format:"A4",
  printBackground:true
 })

 await browser.close()
}

async function main(){

 await convertPDF()

 await splitColumns()

 const text=await runOCR()

 const questions=parseQuestions(text)

 console.log("Questions:",questions.length)

 fs.writeJsonSync(
  "questions.json",
  questions,
  {spaces:2}
 )

 const html=buildHTML(questions)

 await generatePDF(html)

 console.log("DONE")
}

main()