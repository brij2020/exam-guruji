# Question Generation System (10,000+ Scale)

This system is designed for stable, repeatable question-bank growth with quality and dedupe controls.

## 1) Target Architecture

1. Ingest sources:
- PDF PYQ papers (memory-based papers, coaching sheets, scanned books after OCR).
- AI generation jobs (batch-based).
- Manual editor/review UI.

2. Normalize + dedupe:
- Normalize question text/options.
- Fingerprint-based dedupe (`owner + fingerprint` unique).
- Batch dedupe before DB writes.

3. Validate:
- Schema validation (`type`, `difficulty`, options, answer, explanation).
- Review status defaults to `draft`.

4. Human review:
- Admin `Question Review Queue` edits and approves trusted items.

5. Serve:
- `assemble-paper` picks section-wise by blueprint.
- Serve only approved items in production mode.

## 2) PDF Pipeline (Upgraded `quiz.py`)

File: `guru-api/pyscript/quiz.py`

Prerequisites:

```bash
python3 -m pip install pdfplumber tqdm
```

What it now does:
- CLI-driven extractor for large folders of PDFs.
- Robust block parser (question numbering + multiline options).
- Supports options labels up to `E`.
- Adds metadata (`questionNumber`, `section`, `topic`, `source`).
- Dedupes within run using SHA1 fingerprint.
- Writes chunked import-ready JSON files (default 1000/question-file).
- Writes extraction report JSON.

### Run

```bash
cd guru-api
npm run extract:pyq -- \
  --paper-folder ./papers/sbi-prelims \
  --output-folder ./output/sbi-prelims \
  --exam-slug sbi-clerk \
  --stage-slug prelims \
  --domain "Government Exam - SBI Clerk" \
  --test-id-prefix sbi-clerk-pyq \
  --test-title-prefix "SBI Clerk PYQ Set" \
  --chunk-size 1000
```

## 3) Import Pipeline

Import each generated JSON chunk:

```bash
cd guru-api
node scripts/importQuestionBankJson.js ./output/sbi-prelims/sbi-clerk-pyq-part-001.json
```

Repeat for all parts.

## 4) AI Batch Pipeline (for 10k growth)

Recommended generation strategy:
- Batch size: `10-25`
- Total per campaign: `500-2000`
- Daily campaigns: multiple small jobs
- Wait between jobs: `1200ms` (already set in your UI)
- Provider fallback enabled

Quality controls:
- `duplicatesSkipped` tracking on ingest/import.
- Review queue approval before serving.
- Coverage dashboard to fill section/difficulty gaps.

## 5) Practical Rollout Plan to Reach 10,000

1. Seed metadata + blueprint:
- exam/stage blueprint with exact section counts.

2. Load PYQ base:
- Import 2,000-4,000 from PDFs/books.

3. AI top-up:
- Generate targeted gap sets by section + difficulty until 10k.

4. Review sprint:
- Approve only trusted items.

5. Serve mode:
- Enable approved-only serving in production.

## 6) Quality Gates (Required)

- Duplicate rate per campaign < 20%.
- Approved ratio > 70% from reviewed.
- Coverage gaps = 0 for blueprint targets.
- Paper assembly success = 100% without AI fallback for core tests.

## 7) Notes

- Exact duplicate protection is active at DB level and service level.
- Near-duplicate semantic checks can be added next (recommended as phase-2).
