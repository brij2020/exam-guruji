# AI Mock Test Platform - Implementation Plan (Discussion-Driven)

## Goal
Build a resilient Gov Exam mock test platform that works at scale, serves quiz papers from MongoDB first, and safely falls back to AI generation when needed.

This plan is intentionally phase-based so we implement one step at a time and review together before moving forward.

---

## Current State (from repo)
- DB-backed `question_bank` exists with retrieval endpoint: `POST /api/v1/question-bank/similar`
- Gov Step 7 UI currently calls DB first
- AI generation path exists via test-attempt start flow
- Basic fallback logic exists, but data quality and lifecycle controls need hardening

---

## Target Architecture
1. DB-first question serving
2. AI top-up for missing/invalid inventory
3. Write-back of AI outputs into bank with dedupe + validation
4. Blueprint-based paper assembly (exam/stage/section distributions)
5. Quality scoring + moderation workflow
6. Monitoring and SLOs for latency, empty-result rate, AI fallback rate

---

## Delivery Strategy
We will execute in **8 phases**.
After each phase:
- demo behavior
- verify API responses
- discuss tradeoffs
- then continue

---

## Phase 0 - Baseline & Guardrails
### Scope
- Add feature flags/env controls for retrieval strategy
- Add structured diagnostics in responses/logs
- Add smoke tests for current endpoints

### Deliverables
- `QUESTION_BANK_MODE=db_first|hybrid|ai_only`
- `QUESTION_BANK_MIN_VALID_FIELDS` validation gate
- Response diagnostics fields standardized

### Acceptance Criteria
- Can switch modes without code changes
- Diagnostics visible for each Step 7 launch

### Discussion Checkpoint
- Confirm preferred default mode (`hybrid` recommended)

---

## Phase 1 - Data Model Hardening
### Scope
- Finalize question schema for long-term scale
- Add required metadata and indexes
- Add migration-safe defaults

### Proposed Schema Fields
- identity: `_id`, `owner`, `sourceAttempt`, `profileId`, `fingerprint`
- taxonomy: `exam`, `stage`, `section`, `topic`, `tags`
- content: `questionType`, `question`, `options`, `correctAnswer`, `explanation`
- quality: `qualityScore`, `validationStatus`, `moderationStatus`
- usage: `stats.attempts`, `stats.correct`, `stats.avgTime`
- audit: `source`, `model`, `promptHash`, `createdAt`, `updatedAt`

### Indexes
- unique: `{ owner, fingerprint }`
- retrieval: `{ owner, exam, stage, section, difficulty, questionType }`
- quality: `{ owner, validationStatus, qualityScore }`
- analytics: `{ exam, stage, topic }`

### Acceptance Criteria
- Schema supports required query patterns without full scans

### Discussion Checkpoint
- Confirm whether to keep owner-only isolation or allow org-shared pools

---

## Phase 2 - Retrieval Engine v2 (Deterministic + Fallback)
### Scope
- Implement ranked retrieval pipeline
- Strict -> relaxed -> global fallback ladder
- Filter out invalid/incomplete docs

### Query Ladder
1. owner + exam/stage + difficulty + style + topic
2. owner + exam/stage + style
3. owner + exam + style
4. owner + style
5. global equivalents (optional controlled fallback)

### Acceptance Criteria
- Empty result rate drops significantly
- `matchedBy` always explains chosen query path

### Discussion Checkpoint
- Decide if global fallback remains enabled in production

---

## Phase 3 - Hybrid Serve Pipeline (DB + AI Top-up)
### Scope
- If DB returns fewer than requested, AI generates only missing count
- Merge + dedupe + return complete paper
- Auto-write AI top-up into question bank

### Acceptance Criteria
- User always gets quiz paper unless both DB and AI fail
- Fallback reason logged with counts: `dbCount`, `aiTopupCount`

### Discussion Checkpoint
- Confirm top-up thresholds and timeout budget

---

## Phase 4 - Blueprint-Based Paper Assembly
### Scope
- Add exam blueprint config for section/question/difficulty mix
- Assemble papers by blueprint instead of random flat sampling

### Example
- SBI Clerk Prelims:
  - English: 30
  - Numerical Ability: 35
  - Reasoning: 35
  - Difficulty mix and timing rules

### Acceptance Criteria
- Generated paper follows section + difficulty constraints

### Discussion Checkpoint
- Confirm blueprint source (`examHierarchy` vs new collection)

---

## Phase 5 - AI Generation Pipeline for Bulk (10,000+)
### Scope
- Job queue for async generation
- Chunked generation workers
- Validation + dedupe + retry + dead-letter

### Components
- `ai_generation_jobs`
- `ai_generation_outputs`
- worker (BullMQ/SQS)

### Acceptance Criteria
- Can generate 10k questions in controlled batches with observability

### Discussion Checkpoint
- Choose queue tech and deployment model

### Implementation Status (Current)
- Implemented Mongo-backed async job pipeline (no Redis dependency yet):
  - `POST /api/v1/ai-generation-jobs` create bulk generation job
  - `GET /api/v1/ai-generation-jobs` list jobs with progress
  - `GET /api/v1/ai-generation-jobs/:jobId` job detail + recent batch outputs
  - `POST /api/v1/ai-generation-jobs/process-next` process one queued batch
- Added collections:
  - `ai_generation_jobs` (job lifecycle + counters + retry state)
  - `ai_generation_outputs` (per-batch execution logs)
- Processing flow:
  - claim queued job -> generate next batch via AI -> ingest into `question_bank` -> persist batch result -> update job state
- Guardrails:
  - admin-only endpoints
  - bounded batch size and retry limits
  - deterministic progress fields for monitoring

---

## Phase 6 - Quality & Moderation Layer
### Scope
- Auto quality checks
- Human review workflow for low-confidence items
- Promote/reject versioning

### Acceptance Criteria
- Only validated questions served in production mode

### Discussion Checkpoint
- Define moderation roles and thresholds

---

## Phase 7 - Student Attempt Feedback Loop
### Scope
- Update question stats from attempt outcomes
- Adaptive ranking based on real performance data

### Acceptance Criteria
- Retrieval prioritizes high-quality, stable questions

### Discussion Checkpoint
- Confirm re-ranking formula and fairness constraints

---

## Phase 8 - Scale & Reliability
### Scope
- Caching, sharding strategy, SLO dashboards
- Error budgets and failover policy

### KPIs
- P95 paper build latency
- Empty-result rate
- AI fallback rate
- Cost per paper

### Discussion Checkpoint
- Final production rollout checklist

---

## Testing Plan (applies to all phases)
- unit tests for validators/retrieval logic
- integration tests for API paths
- synthetic load tests for paper generation endpoints
- regression snapshots for payload compatibility with UI

---

## Risks
- Owner/data isolation mistakes -> false empty results
- Over-relaxed fallback -> irrelevant questions
- AI JSON inconsistency -> ingest failures
- Missing blueprint coverage -> poor exam realism

Mitigations are embedded per phase.

---

## Execution Contract
For each phase:
1. I propose exact file-level changes
2. you approve/review
3. I implement
4. we validate in API + UI together
5. we lock phase and move to next

---

## Recommendation: Start Now with Phase 0 + Phase 1
This gives immediate stability and clean foundation for hybrid serving.
