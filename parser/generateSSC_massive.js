
import fs from "fs"
import crypto from "crypto"

// ===== CONFIG =====
const TOTAL = 1000   // change if needed
const OWNER = "69b056cef85b79b029486bf8"

const DOMAIN = "Government Exam - SSC CGL"
const EXAM = "ssc-cgl"
const STAGE = "tier-1"

// ===== UTILS =====

function sha(text){
  return crypto.createHash("sha1").update(text).digest("hex")
}

function rand(min,max){
  return Math.floor(Math.random()*(max-min+1))+min
}

function random(arr){
  return arr[Math.floor(Math.random()*arr.length)]
}

function shuffle(arr){
  return arr.sort(()=>Math.random()-0.5)
}

function base(){
  const now=new Date().toISOString()

  return{
    fingerprint:"",
    owner:OWNER,
    __v:0,
    answer:"",
    answerKey:"",
    assets:[],
    complexity:"",
    createdAt:now,
    difficulty:random(["easy","medium","hard"]),
    domain:DOMAIN,
    examSlug:EXAM,
    explanation:"",
    groupId:"",
    groupOrder:0,
    groupTitle:"",
    groupType:"",
    hasVisual:false,
    inputOutput:"",
    keyConsiderations:[],
    lastUsedAt:now,
    optionObjects:[],
    options:[],
    passageText:"",
    promptContext:"SSC massive generator",
    provider:"node-generator",
    question:"",
    questionNumber:0,
    reviewStatus:"draft",
    reviewedAt:null,
    reviewedBy:null,
    sampleSolution:"",
    section:"",
    solutionApproach:"",
    source:{},
    sourceAttempt:null,
    stageSlug:STAGE,
    tags:[],
    testId:"ssc-auto-massive",
    testTitle:"SSC CGL Massive Generated",
    timesSeen:0,
    topic:"General",
    type:"mcq",
    updatedAt:now
  }
}

function buildOptions(opts,answer){
  const o=shuffle([...opts])
  const key=["A","B","C","D"][o.indexOf(answer)]
  return {options:o.map(String),key}
}

// ===== QUANT =====

function percentage(i){
  const q=base()
  const n=rand(100,500)
  const p=random([5,10,12,15,20,25])

  const ans=(n*p)/100

  const opts=[ans,ans+5,ans-5,ans+10]

  const {options,key}=buildOptions(opts,ans)

  q.question=`What is ${p}% of ${n}?`
  q.options=options
  q.answer=ans.toString()
  q.answerKey=key
  q.section="quantitative-aptitude"
  q.topic="Percentage"
  q.questionNumber=i

  q.fingerprint=sha(q.question+options.join(","))

  return q
}

function ratio(i){

  const q=base()

  const a=random([2,3,4,5])
  const b=random([3,4,5,6])

  const k=random([8,10,12])

  const sum=(a+b)*k

  const larger=Math.max(a,b)*k

  const opts=[larger,larger+5,larger-5,larger+10]

  const {options,key}=buildOptions(opts,larger)

  q.question=`If the ratio of two numbers is ${a}:${b} and their sum is ${sum}, find the larger number.`
  q.options=options
  q.answer=larger.toString()
  q.answerKey=key
  q.section="quantitative-aptitude"
  q.topic="Ratio"
  q.questionNumber=i

  q.fingerprint=sha(q.question+options.join(","))

  return q
}

function profitLoss(i){

  const q=base()

  const cp=rand(100,500)

  const profit=random([10,15,20,25])

  const sp=cp*(1+profit/100)

  const opts=[sp,sp+20,sp-20,sp+10]

  const {options,key}=buildOptions(opts,sp)

  q.question=`A shopkeeper gains ${profit}% on a product costing ${cp}. What is the selling price?`
  q.options=options
  q.answer=sp.toString()
  q.answerKey=key
  q.section="quantitative-aptitude"
  q.topic="Profit and Loss"
  q.questionNumber=i

  q.fingerprint=sha(q.question+options.join(","))

  return q
}

// ===== REASONING =====

function analogy(i){

  const q=base()

  const data=random([
    ["Bird","Nest","Dog","Kennel"],
    ["Bee","Hive","Lion","Den"],
    ["Cow","Calf","Cat","Kitten"]
  ])

  const opts=[data[3],"Cub","Baby","Puppy"]

  const {options,key}=buildOptions(opts,data[3])

  q.question=`${data[0]} : ${data[1]} :: ${data[2]} : ?`
  q.options=options
  q.answer=data[3]
  q.answerKey=key
  q.section="reasoning"
  q.topic="Analogy"
  q.questionNumber=i

  q.fingerprint=sha(q.question+options.join(","))

  return q
}

function bloodRelation(i){

  const q=base()

  const ans="Brother"

  const opts=["Brother","Father","Uncle","Grandfather"]

  const {options,key}=buildOptions(opts,ans)

  q.question="A is the brother of B and B is the sister of C. How is A related to C?"

  q.options=options
  q.answer=ans
  q.answerKey=key
  q.section="reasoning"
  q.topic="Blood Relation"
  q.questionNumber=i

  q.fingerprint=sha(q.question+options.join(","))

  return q
}

function direction(i){

  const q=base()

  const ans="North"

  const opts=["North","South","East","West"]

  const {options,key}=buildOptions(opts,ans)

  q.question="If you face the rising sun, which direction are you facing?"

  q.options=options
  q.answer=ans
  q.answerKey=key
  q.section="reasoning"
  q.topic="Direction Sense"
  q.questionNumber=i

  q.fingerprint=sha(q.question+options.join(","))

  return q
}

// ===== ENGLISH =====

function synonym(i){

  const q=base()

  const data=random([
    ["Happy","Joyful"],
    ["Big","Large"],
    ["Quick","Rapid"],
    ["Small","Tiny"]
  ])

  const opts=[data[1],"Sad","Weak","Slow"]

  const {options,key}=buildOptions(opts,data[1])

  q.question=`Select the synonym of "${data[0]}".`
  q.options=options
  q.answer=data[1]
  q.answerKey=key
  q.section="english"
  q.topic="Synonym"
  q.questionNumber=i

  q.fingerprint=sha(q.question+options.join(","))

  return q
}

function errorDetection(i){

  const q=base()

  const ans="He does not know the answer."

  const opts=[
    "He do not know the answer.",
    "He does not know the answer.",
    "He doing not know the answer.",
    "He did not knows the answer."
  ]

  const {options,key}=buildOptions(opts,ans)

  q.question="Identify the correct sentence."

  q.options=options
  q.answer=ans
  q.answerKey=key
  q.section="english"
  q.topic="Error Detection"
  q.questionNumber=i

  q.fingerprint=sha(q.question+options.join(","))

  return q
}

// ===== GENERATOR =====

function generate(total){

  const list=[]

  let i=1

  while(list.length<total){

    const type=random([
      "percentage",
      "ratio",
      "profit",
      "analogy",
      "blood",
      "direction",
      "synonym",
      "error"
    ])

    if(type==="percentage") list.push(percentage(i++))
    else if(type==="ratio") list.push(ratio(i++))
    else if(type==="profit") list.push(profitLoss(i++))
    else if(type==="analogy") list.push(analogy(i++))
    else if(type==="blood") list.push(bloodRelation(i++))
    else if(type==="direction") list.push(direction(i++))
    else if(type==="synonym") list.push(synonym(i++))
    else if(type==="error") list.push(errorDetection(i++))

  }

  return list.slice(0,total)
}

// ===== RUN =====

const data=generate(TOTAL)

fs.writeFileSync(
  "ssc_cgl_massive_dataset.json",
  JSON.stringify(data,null,2)
)

console.log("Generated:",data.length)
console.log("Output file: ssc_cgl_massive_dataset.json")
