import fs from "fs-extra"
import crypto from "node:crypto"
import zlib from "node:zlib"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
let pdfjsLib 

const QUESTION_MARKER_REGEX = /Q(?:uestion)?\.?\s*(\d{1,4})\s*[.)]/gi;
const DIRECTION_HEADER_REGEX =
  /Direct(?:ion|ions)\s*(?:for\s*)?\(?\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*\)?\s*[:.\-]?/gi;

async function loadPdf() {
  pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsLib;
}
await loadPdf()

if (pdfjsLib?.setVerbosityLevel && pdfjsLib?.VerbosityLevel) {
  pdfjsLib.setVerbosityLevel(pdfjsLib.VerbosityLevel.ERRORS);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardFontDataUrl = pathToFileURL(path.join(__dirname, "node_modules", "pdfjs-dist", "standard_fonts") + path.sep).href;
const cMapUrl = pathToFileURL(path.join(__dirname, "node_modules", "pdfjs-dist", "cmaps") + path.sep).href;


const INPUT = "/Users/brijbhan/Downloads/SBI-Clerk-Pre-2024-25-Memory-Based-Paper-22-Feb-2025-1st-shift-English.pdf";
const OUTPUT = "./questions.json";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    input: "",
    output: "",
    jsonStdout: false,
    assetsDir: "",
    extractImages: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--input" && args[i + 1]) {
      parsed.input = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output" && args[i + 1]) {
      parsed.output = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--assets-dir" && args[i + 1]) {
      parsed.assetsDir = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--extract-images") {
      parsed.extractImages = true;
    }
    if (arg === "--json-stdout") {
      parsed.jsonStdout = true;
    }
  }

  return parsed;
}

const crc32 = (buf) => {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const typeBuf = Buffer.from(type, "ascii");
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
};

const encodePngRgba = ({ width, height, rgba }) => {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type 0
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // signature
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
};

const clampByte = (n) => (n < 0 ? 0 : n > 255 ? 255 : n);

const toRgbaBuffer = (image) => {
  if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height)) return null;
  const width = Number(image.width);
  const height = Number(image.height);
  if (width <= 0 || height <= 0) return null;

  const data = image.data || image.bitmap?.data || null;
  if (!data) return null;
  const kind = image.kind ?? image.bitmap?.kind ?? null;

  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

  // pdfjs ImageKind values: 1=GRAYSCALE_1BPP, 2=RGB_24BPP, 3=RGBA_32BPP
  if (kind === 3 && buf.length >= width * height * 4) {
    return { width, height, rgba: buf.subarray(0, width * height * 4) };
  }
  if (kind === 2 && buf.length >= width * height * 3) {
    const out = Buffer.alloc(width * height * 4);
    for (let i = 0, j = 0; i < width * height; i += 1, j += 3) {
      out[i * 4] = buf[j];
      out[i * 4 + 1] = buf[j + 1];
      out[i * 4 + 2] = buf[j + 2];
      out[i * 4 + 3] = 255;
    }
    return { width, height, rgba: out };
  }
  if (kind === 1) {
    // Best-effort: treat as 1 byte per pixel grayscale if it matches.
    if (buf.length >= width * height) {
      const out = Buffer.alloc(width * height * 4);
      for (let i = 0; i < width * height; i += 1) {
        const v = clampByte(buf[i]);
        out[i * 4] = v;
        out[i * 4 + 1] = v;
        out[i * 4 + 2] = v;
        out[i * 4 + 3] = 255;
      }
      return { width, height, rgba: out };
    }
  }

  // Fallback: if it already looks like RGBA, accept it.
  if (buf.length >= width * height * 4) {
    return { width, height, rgba: buf.subarray(0, width * height * 4) };
  }
  return null;
};

const pdfObjGet = async (objs, name) =>
  new Promise((resolve, reject) => {
    if (!objs || typeof objs.get !== "function") return reject(new Error("pdfjs objs.get not available"));
    try {
      if (objs.get.length >= 2) {
        objs.get(name, (obj) => resolve(obj));
        return;
      }
      resolve(objs.get(name));
    } catch (error) {
      reject(error);
    }
  });

const extractQuestionNumbersFromPageText = (pageText) => {
  const text = String(pageText || "");
  const regex = QUESTION_MARKER_REGEX;
  const seen = new Set();
  const out = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    const q = Number(match[1] || 0);
    if (!q || seen.has(q)) continue;
    seen.add(q);
    out.push(q);
  }
  return out;
};

const extractImagesFromPage = async ({ page, pageNumber, assetsDir }) => {
  const opList = await page.getOperatorList();
  const paintOps = new Set([
    pdfjsLib.OPS.paintImageXObject,
    pdfjsLib.OPS.paintJpegXObject,
    pdfjsLib.OPS.paintInlineImageXObject,
  ]);

  const names = [];
  for (let i = 0; i < opList.fnArray.length; i += 1) {
    const fn = opList.fnArray[i];
    if (!paintOps.has(fn)) continue;
    const args = opList.argsArray[i] || [];
    const name = args[0];
    if (typeof name === "string") names.push(name);
  }

  const uniqueNames = Array.from(new Set(names));
  const extracted = [];
  const seenHashes = new Set();

  for (let i = 0; i < uniqueNames.length; i += 1) {
    const name = uniqueNames[i];
    let obj = null;
    try {
      obj = await pdfObjGet(page.objs, name);
    } catch {
      try {
        obj = await pdfObjGet(page.commonObjs, name);
      } catch {
        obj = null;
      }
    }
    if (!obj) continue;

    // Some pdfjs builds surface pre-encoded data URIs.
    if (typeof obj.src === "string" && obj.src.startsWith("data:image/")) {
      const src = obj.src;
      const base64Index = src.indexOf("base64,");
      if (base64Index > 0) {
        const mime = src.slice("data:".length, src.indexOf(";"));
        const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : mime.includes("png") ? "png" : "bin";
        const bytes = Buffer.from(src.slice(base64Index + "base64,".length), "base64");
        const hash = crypto.createHash("sha1").update(bytes).digest("hex");
        if (seenHashes.has(hash)) continue;
        seenHashes.add(hash);
        const fileName = `p${pageNumber}-img-${i + 1}-${hash.slice(0, 10)}.${ext}`;
        await fs.writeFile(path.join(assetsDir, fileName), bytes);
        extracted.push({
          fileName,
          width: Number(obj.width || null),
          height: Number(obj.height || null),
          sourcePage: pageNumber,
          sha1: hash,
        });
        continue;
      }
    }

    const normalized = toRgbaBuffer(obj);
    if (!normalized) continue;
    const { width, height, rgba } = normalized;

    // Filter tiny images (logos, bullets) that aren't useful for questions.
    if (width * height < 12_000) continue;

    const png = encodePngRgba({ width, height, rgba });
    const hash = crypto.createHash("sha1").update(png).digest("hex");
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);

    const fileName = `p${pageNumber}-img-${i + 1}-${hash.slice(0, 10)}.png`;
    await fs.writeFile(path.join(assetsDir, fileName), png);
    extracted.push({
      fileName,
      width,
      height,
      sourcePage: pageNumber,
      sha1: hash,
    });
  }

  return extracted;
};

async function extractText(pdfPath) {

  const data = new Uint8Array(await fs.readFile(pdfPath));
  const pdf = await pdfjsLib.getDocument({
    data,
    verbosity: pdfjsLib?.VerbosityLevel?.ERRORS ?? 0,
    standardFontDataUrl,
    cMapUrl,
    cMapPacked: true,
  }).promise;

  let fullText = "";
  const pageTexts = [];
  const questionNumbersByPage = [];

  for (let i = 1; i <= pdf.numPages; i++) {

    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str)
      .join(" ");

    pageTexts.push(pageText);
    questionNumbersByPage.push(extractQuestionNumbersFromPageText(pageText));
    fullText += pageText + "\n";
  }

  return { pdf, fullText, pageTexts, questionNumbersByPage };
}

function cleanText(text) {

  return text
    .replace(/Adda247/gi, "")
    .replace(/FREE QUIZZES/gi, "")
    .replace(/FREE PDFs/gi, "")
    .replace(/Test Prime/gi, "")
    .replace(/Solutions[\s\S]*/gi, "")
    .replace(/\s+/g," ")
    .trim();

}

function splitQuestions(text){

  const blocks = [];
  const markers = Array.from(text.matchAll(QUESTION_MARKER_REGEX));
  if (markers.length === 0) return blocks;

  const directionMarkers = Array.from(text.matchAll(DIRECTION_HEADER_REGEX))
    .map((match) => ({
      index: Number(match.index || 0),
      start: Number(match[1] || 0),
      end: Number(match[2] || 0),
      raw: String(match[0] || ""),
    }))
    .filter((item) => item.index >= 0 && item.start > 0 && item.end >= item.start)
    .sort((a, b) => a.index - b.index);
  let directionPtr = 0;

  for (let i = 0; i < markers.length; i += 1) {
    const current = markers[i];
    const next = markers[i + 1];
    const markerText = String(current[0] || "");
    const start = Number(current.index || 0) + markerText.length;
    let end = next ? Number(next.index || text.length) : text.length;

    while (directionPtr < directionMarkers.length && directionMarkers[directionPtr].index <= start) {
      directionPtr += 1;
    }
    const nextDirection = directionMarkers[directionPtr];
    if (nextDirection && nextDirection.index > start && nextDirection.index < end) {
      end = nextDirection.index;
    }

    const block = String(text.slice(start, end) || "").trim();
    const questionNumber = Number(current[1] || i + 1);
    if (!block) continue;
    blocks.push({ questionNumber, block });
  }

  return blocks;

}

function cleanPassageText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDirections(text) {
  const ranges = [];
  const regex =
    /Direct(?:ion|ions)\s*(?:for\s*)?\(?\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*\)?\s*[:.\-]?\s*([\s\S]*?)(?=\s*(?:Direct(?:ion|ions)\s*(?:for\s*)?\(?\s*(?:Q(?:uestion)?\.?\s*)?\d{1,3}\s*[-–—]\s*\d{1,3}\s*\)?\s*[:.\-]?|Q(?:uestion)?\.?\s*\d{1,4}\s*[.)]|$))/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const start = Number(match[1] || 0);
    const end = Number(match[2] || 0);
    if (!start || !end || end < start) continue;
    const passageText = cleanPassageText(match[3] || "");
    ranges.push({
      start,
      end,
      groupId: `rc-${start}-${end}`,
      groupTitle: `Directions (${start}-${end})`,
      passageText,
    });
  }
  return ranges;
}

function resolveRcMeta(questionNumber, directionRanges) {
  if (!Number.isInteger(questionNumber) || questionNumber <= 0 || !Array.isArray(directionRanges)) {
    return {
      groupType: "none",
      groupId: "",
      groupTitle: "",
      passageText: "",
      groupOrder: null,
    };
  }
  const matched = directionRanges.find(
    (range) => questionNumber >= range.start && questionNumber <= range.end && cleanPassageText(range.passageText).length > 0
  );
  if (!matched) {
    return {
      groupType: "none",
      groupId: "",
      groupTitle: "",
      passageText: "",
      groupOrder: null,
    };
  }
  return {
    groupType: "rc_passage",
    groupId: matched.groupId,
    groupTitle: matched.groupTitle,
    passageText: matched.passageText,
    groupOrder: questionNumber - matched.start + 1,
  };
}

function extractQuestion(block){

  const raw = String(block || "");
  const parenIdx = raw.search(/\([a-e]\)/i);
  if (parenIdx >= 0) return raw.slice(0, parenIdx).trim();

  // Look for the start of an A/B/C option run; avoid cutting on sentences like "A person..."
  const aRegex = /\bA\b\s*[).:\-]?\s+/g;
  let match;
  while ((match = aRegex.exec(raw)) !== null) {
    const idx = Number(match.index || 0);
    const lookahead = raw.slice(idx, idx + 600);
    const hasB = /\bB\b\s*[).:\-]?\s+/.test(lookahead);
    const hasC = /\bC\b\s*[).:\-]?\s+/.test(lookahead);
    if (hasB && hasC) {
      return raw.slice(0, idx).trim();
    }
  }

  return raw.trim();

}

function extractOptions(block){

  const text = String(block || "");
  const options = [];
  const seen = new Set();

  const push = (id, value) => {
    const normalizedId = String(id || "").trim().toUpperCase();
    if (!["A", "B", "C", "D", "E"].includes(normalizedId)) return;
    const normalizedText = String(value || "").replace(/\s+/g, " ").trim();
    if (!normalizedText) return;
    const key = `${normalizedId}:${normalizedText}`;
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ id: normalizedId, text: normalizedText });
  };

  // (a) style
  const paren = Array.from(text.matchAll(/\(([a-e])\)\s*([\s\S]*?)(?=\([a-e]\)|$)/gi));
  for (const opt of paren) {
    push(opt[1], opt[2]);
  }

  // A) / A. / A: style
  if (options.length === 0) {
    const letterPunct = Array.from(text.matchAll(/\b([A-E])\b\s*[).:\-]\s*([\s\S]*?)(?=\b[A-E]\b\s*[).:\-]\s*|$)/g));
    for (const opt of letterPunct) {
      push(opt[1], opt[2]);
    }
  }

  // Loose fallback: "E None of these" (requires at least A,B,C present)
  if (options.length === 0) {
    const loose = Array.from(text.matchAll(/\b([A-E])\b\s+([\s\S]*?)(?=\b[A-E]\b\s+|$)/g));
    const temp = [];
    const ids = new Set();
    for (const opt of loose) {
      const id = String(opt[1] || "").toUpperCase();
      const value = String(opt[2] || "");
      if (!["A", "B", "C", "D", "E"].includes(id)) continue;
      ids.add(id);
      temp.push({ id, text: value });
    }
    if (ids.has("A") && ids.has("B") && ids.has("C") && temp.length >= 3) {
      for (const opt of temp) push(opt.id, opt.text);
    }
  }

  // Keep stable ordering A->E
  const order = { A: 1, B: 2, C: 3, D: 4, E: 5 };
  return options
    .sort((a, b) => (order[a.id] || 99) - (order[b.id] || 99))
    .slice(0, 5);

}

function detectSection(index){

  if(index <= 30) return "English Language";
  if(index <= 65) return "Numerical Ability";

  return "Reasoning Ability";

}

function buildQuestion(entry,index,directionRanges){

  const block = String(entry?.block || "");
  const questionNumber = Number(entry?.questionNumber || index + 1);

  const options = extractOptions(block);
  const rcMeta = resolveRcMeta(questionNumber, directionRanges);

  return {

    questionNumber,

    source:{
      exam:"SBI Clerk",
      year:2025,
      shift:1,
      type:"memory-based"
    },

    section:detectSection(index),
    topic:"General",
    difficulty:"medium",

    type:"mcq",

    question:extractQuestion(block),
    groupType: rcMeta.groupType,
    groupId: rcMeta.groupId,
    groupTitle: rcMeta.groupTitle,
    passageText: rcMeta.passageText,
    groupOrder: rcMeta.groupOrder,

    options,

    answerKey:"A",
    answer:options.length ? options[0].text : "",

    explanation:""

  };

}

async function run(){
  const cli = parseArgs();
  const inputPath = cli.input || INPUT;
  const outputPath = cli.output || OUTPUT;
  const log = (...args) => {
    if (!cli.jsonStdout) {
      console.log(...args);
    }
  };

  log("Reading PDF...");

  const { pdf, fullText, questionNumbersByPage } = await extractText(inputPath);
  let text = fullText;

  log("Cleaning text...");

  text = cleanText(text);
  const directionRanges = extractDirections(text);

  log("Splitting questions...");

  const blocks = splitQuestions(text);

  const questions = blocks.map((entry, index) => buildQuestion(entry, index, directionRanges));

  let extractedImages = [];
  if (cli.extractImages && cli.assetsDir) {
    log("Extracting images...");
    await fs.ensureDir(cli.assetsDir);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const images = await extractImagesFromPage({ page, pageNumber, assetsDir: cli.assetsDir });
      if (images.length > 0) {
        extractedImages.push({
          pageNumber,
          questionNumbers: questionNumbersByPage[pageNumber - 1] || [],
          images,
        });
      }
    }
  }

  if (extractedImages.length > 0) {
    // Best-effort mapping: assign images to questions on the same page in order.
    const assetsByQuestionNumber = new Map();
    for (const pageEntry of extractedImages) {
      const qNums = Array.isArray(pageEntry.questionNumbers) ? pageEntry.questionNumbers : [];
      const imgs = Array.isArray(pageEntry.images) ? pageEntry.images : [];
      for (let i = 0; i < imgs.length; i += 1) {
        const qNum = qNums[i] || null;
        if (!qNum) continue;
        const list = assetsByQuestionNumber.get(qNum) || [];
        list.push({
          kind: "image",
          url: "",
          fileName: imgs[i].fileName,
          width: imgs[i].width || null,
          height: imgs[i].height || null,
          sourcePage: imgs[i].sourcePage || null,
          alt: "",
          caption: "",
        });
        assetsByQuestionNumber.set(qNum, list);
      }
    }

    for (const q of questions) {
      const qNum = Number(q.questionNumber || 0);
      const assets = qNum ? assetsByQuestionNumber.get(qNum) || [] : [];
      if (assets.length > 0) {
        q.hasVisual = true;
        q.assets = assets;
      } else {
        q.hasVisual = false;
        q.assets = [];
      }
    }
  } else {
    for (const q of questions) {
      q.hasVisual = false;
      q.assets = [];
    }
  }

  const result = {

    examSlug:"sbi-clerk",
    stageSlug:"prelims",
    domain:"Government Exam - SBI Clerk",
    provider:"manual-chatgpt",

    testId:"sbi-clerk-prelims-2025-shift1",
    testTitle:"SBI Clerk Prelims 2025 Memory Based",

    promptContext:"Parsed automatically from PDF",

    questions,
    assetsMeta: cli.extractImages && cli.assetsDir ? { assetsDir: cli.assetsDir } : null

  };

  await fs.writeFile(
    outputPath,
    JSON.stringify(result,null,2)
  );

  if (cli.jsonStdout) {
    process.stdout.write(JSON.stringify(result));
  } else {
    console.log("Done. Questions extracted:",questions.length);
    console.log("Saved:", outputPath);
  }

}

run();