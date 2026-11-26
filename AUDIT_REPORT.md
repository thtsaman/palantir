# Phase 0 — Application Audit

**Scope:** Read-only source review of the repository at `D:\palantir`, plus TypeScript, ESLint, Vitest, Prisma schema validation, and production build commands. No source, schema, environment, or database records were intentionally changed. No Hugging Face request was made. The working tree already contained modified `.github/workflows/ci.yml`, `context.md`, `tests/simulation.test.ts`, `tests/validation.test.ts`, and `vitest.config.ts` at audit time; these changes are not attributed to this audit. The production build updated generated `.next` output (gitignored).

## 1. Executive Summary

This is a runnable Next.js prototype with a real Prisma/PostgreSQL data model and meaningful end-to-end slices for soldier creation/import, mission creation and deterministic single-person simulation, report text analysis, persisted lessons, and historical-condition similarity. The project is not yet an operational readiness platform: it has no authentication or authorization, real reports are stored as text rather than uploaded documents, formation simulation is synthetic and disconnected from the persisted unit roster, and the mathematical indices are explicitly heuristic and unvalidated.

Several apparent product capabilities are only display affordances. Dashboard charts have sample fallbacks; the dashboard influence bars are constants; the guided demo toggle has no behavior; selecting an echelon changes a generated illustrative formation rather than calculating that real group's performance; and the operations workflow has no review/approval control. Mission CRUD is create/list/read only; edit and delete are absent. What-if uses the shared model but only generic baseline defaults and does not save results.

Checks: production build passed, TypeScript passed, Prisma schema validation passed, 19 Vitest tests passed, ESLint failed due to one `any` lint error (with 18 warnings). There are no route/database/browser integration tests or 3D interaction tests in the checked-in suite.

## 2. Feature Status Matrix

| Feature | Status | Existing Implementation | Missing Work |
|---|---|---|---|
| Dashboard / overview | Partial | `src/app/dashboard/page.tsx` reads scenarios, runs, snapshots and operation counts from Prisma. | Several fallbacks are presented as real: default metric values, mock chart snapshots, `opCount || 5`, `recentRuns.length || 5`; fixed scenario metadata and influence percentages. Distinguish empty/demo state and make the displayed timeline/condition data derive from selected records. |
| Soldier management | Partial | List and create in `src/app/soldiers/page.tsx`, `SoldiersClient.tsx`, `src/app/api/soldiers/route.ts`; role hierarchy loaded from DB. CSV preview/import implemented via Papa Parse and `/api/soldiers/import`. | No edit or delete endpoints/UI. Import has no row-count/body-size cap, no transaction, partial success possible, role lookup by ambiguous role name only, no upload MIME/size check. |
| Soldier profile | Partial | `src/app/soldiers/[id]/page.tsx` queries profile, hierarchy, mission run history; baseline chart and history components. | Only experience, five baseline/load fields, status, role are stored; no physical measurements, readiness history independent of runs, injuries, sleep, hydration, sex/age/body composition or validation/clinical provenance. No profile edit. Some profile visual copy/defaults are demo-oriented. |
| Mission management | Partial | `src/app/missions/new/MissionBuilder.tsx` creates a persisted scenario and executes a simulation; mission list/details and source-operation link exist. Schema stores terrain, altitude, temperature, load, distance, duration, rest, time-of-day, optional soldier and source operation. | No scenario edit/delete. No persisted formation assignment. Weather is not a mission input. No mission scheduling, waypoints or user-specified route. |
| Human performance engine | Partial | `src/lib/simulation/{factors,simulation}.ts` provides deterministic time-series outputs with optional stored soldier baseline. | Heuristic prototype only; no physiological validation, calibration, confidence/uncertainty, workload pace model, real periodic rest schedule, measured human inputs, or model version/provenance. See Section 4. |
| 3D terrain | Partial | `MissionTerrain.tsx`, `terrain/TerrainMesh.tsx`: WebGL terrain mesh generated from a fixed trigonometric height surface; route is generated from fixed coordinates. Topographic fallback is SVG. | Not based on selected terrain type, altitude, actual elevation data, route, or mission environment; the SVG view has illustrative contours/route. |
| Soldier model / animation | Partial | `SoldierModel.tsx` loads `/models/soldier/soldier.glb`, clones skeleton, starts available idle/walk-like clips and transitions based on playback state; GLB exists in `public/models/soldier/soldier.glb`. | Asset/clip correctness has not been interactively/browser verified. Movement is scene translation from route progress, not animation-driven locomotion; animation is binary idle/moving, no fatigue-dependent movement or gait. |
| Formation simulation | Partial | `FormationLayer.tsx` creates fixed layouts for 1, 5, 15, 45, or 135 rendered models by echelon. | These are synthetic counts/offsets, not loaded roster, organizational hierarchy or assignment; no individual variation, injuries, spacing/task roles, or formation persistence. |
| Echelon selection | Partial | Controls switch the generated soldier count/layout. | Doesn't aggregate the represented roster nor alter unit hierarchy; breadcrumbs are hardcoded demo strings. Guided-demo button only toggles its label/state. |
| Camera controls | Partial | `CameraController.tsx` creates OrbitControls; FOLLOW tracks target and TOP/OVERVIEW set camera. | TOP/OVERVIEW effect omits `targetPosition` dependency; changing time while in those modes does not re-center there. No explicit camera preset for “other” modes beyond three. ESLint flags the dependency. |
| Playback / timeline | Working (prototype) | `SimulatorClient.tsx` shares playback time with scrubber, chart cursor, terrain route position and moving animation; pause/reset/speed (1×/2×/4×)/seek are wired. Metrics are interpolated from server-provided snapshots. | Playback is a visual replay; model is precomputed. Terrain route progress is quantized; rest marker is simply halfway, not linked to restMinutes. Browser behavior/performance not covered by tests. |
| Group aggregation | Partial | `aggregateCapability()` arithmetic mean; unit view (`src/app/missions/[id]/unit/page.tsx`, `UnitMapClient.tsx`) aggregates latest per-soldier runs or baseline mean. | Uses each soldier's latest run regardless of selected scenario; falls back to baseline for absent run. No performance snapshots per group/time or role weighting; groups with no soldiers can display zero. Not connected to formation sim. |
| What-if analysis | Partial | UI in `src/app/what-if/WhatIfClient.tsx` compares scenarios with same `compareScenarios()` engine; timeline chart and final deltas update after button press. API `/api/scenarios/compare` also exists and accepts an optional soldier ID. | UI computes locally with generic defaults; does not load scenario from `scenarioId`, select soldier, call API, persist comparisons, or explain factor contributions beyond changed parameter list. |
| Historical report ingestion | Partial | Text is pasted into UI, validated (20–100,000 characters), optionally HF analyzed/fallback extracted, and saved with structured fields/lessons. | No file upload/storage, file type extraction, source attachment/blob, page/document metadata, ingestion queue, deduplication, or review-before-save step. Raw text is persisted in database. |
| Operations library | Partial | `src/app/operations/page.tsx` lists persisted records and lesson count; details show extracted fields, observations and lessons. Similar scenario and simulate-similar actions exist. | No search/filter controls. No edit/delete. No provenance references or ability to inspect/compare report text systematically. |
| Learning library | Partial | `src/app/learning/page.tsx` shows counts/recent records and a workflow map; lessons are stored as `OperationLesson`, surfaced on operation details. | No standalone searchable lesson library, filters, lesson feedback, deduplication, source-attributed evidence, human review/approval action. Flow map is mostly navigation/story UI. |
| Similarity discovery | Partial | `scenarioSimilarity()` ranks DB historical operations by terrain, altitude/temp bands, duration, day/night, and defaulted load/rest; UI displays percentages. | Hand-tuned weighted normalized distance, not ML/embedding or evidence-based recommendation; operation records contain no actual load/rest so both are hardcoded 18 kg/15 min. No rationale per match, threshold, evaluation or user feedback. |
| Hugging Face integration | Partial | `src/lib/ai/index.ts` posts to HF OpenAI-compatible router, `HF_API_KEY` and `HF_MODEL`, validates JSON with Zod, retries once for invalid shape, then falls back. | No request timeout, explicit token/output budget, rate limiting, retry/backoff for transient provider failures, provider/model availability preflight, robust fenced-JSON parsing, or unit tests mocking provider response/error. Raw report up to 12,000 chars sent to provider when enabled. |
| Authentication / authorization | Missing | No auth library, middleware, user/tenant model, route authorization or ownership checks found. | Required before real soldier and operational records are used. All APIs and pages are otherwise directly accessible to whoever can reach the app. |
| Tests | Partial | Vitest has 19 unit tests for core model, validation and fallback extractor. | No integration tests for Prisma/API, UI/browser tests, file handling tests, 3D tests, authorization/security tests or model validation against observed data. |
| Docker / CI | Partial | Compose provides Postgres 16; Dockerfile uses standalone Next build; CI provisions Postgres and runs migration/seed/lint/typecheck/tests/build. | CI's seed command deletes all rows before reseeding (safe only against disposable CI DB); do not reuse against local/prod. Docker Compose does not include app service or migrations. No production deployment workflow/backup/secrets policy. |

## 3. Database Architecture

The Prisma datasource is PostgreSQL via `DATABASE_URL` (`prisma/schema.prisma`). There is one checked-in migration, `prisma/migrations/20261001091754_init/migration.sql`. Models:

| Model | Stored data and links |
|---|---|
| `Unit` | Name/code (code unique); owns squads. |
| `Squad` | Name/code (code unique); required unit FK, cascade on unit deletion; owns roles. |
| `Role` | Name/code (code unique); required squad FK, cascade on squad deletion; owns soldiers. |
| `Soldier` | Unique soldierCode, role FK (delete restrict), experienceYears, baseline mobility/endurance/strength/recovery, typical load, free-form status; links to scenarios and runs. |
| `MissionScenario` | Terrain enum, altitude, temperature, load, distance, duration, rest, time-of-day, description; optional soldier/source-operation links (set null on deletion); owns runs. |
| `MissionRun` | Required scenario (cascade), optional soldier (set null), enum status/timestamps/final fatigue/mobility/endurance/performance; owns snapshots. |
| `PerformanceSnapshot` | Required run FK (cascade), time and four indices; compound index `(missionRunId,timeMinutes)`. |
| `HistoricalOperation` | Structured text condition bands, summaries, optional rawReport/aiSummary, status enum, `isDemo`; owns lessons/scenarios. |
| `OperationLesson` | Required operation FK (cascade), title, description, free-form category. |

Enums: `TerrainType` (FLAT, ROLLING, MOUNTAIN, STEEP_MOUNTAIN, MIXED), `TimeOfDay` (DAY/NIGHT), `MissionRunStatus` (PENDING/RUNNING/COMPLETED/FAILED), `OperationStatus` (DRAFT/STRUCTURED/REVIEWED). IDs use Prisma `cuid()`; timestamps are present as applicable. Unique constraints: unit/squad/role codes and soldierCode. Other than snapshot lookup, no explicit indexes on common FK/list/filter fields. Prisma validation passed.

Product fit gaps: no user/tenant/audit trail; no physical/medical/source fields and consent/retention policy; no persisted formation/group assignment or per-scenario group run; no mission waypoints/elevation/weather/time windows; no document/blob/source record; no lesson evidence/approval actor/timestamp; `isDemo` is ambiguous as a provenance scheme; status is free-form on Soldier and lesson categories are free-form. No unique constraint prevents duplicate snapshot times within a run. Current schema allows histories via multiple runs but no links from a run to a scenario version/model version beyond the mutable scenario FK. Foreign-key delete behavior is explicit as above. The audit did not connect to or inspect live PostgreSQL records; schema only was validated. No migrations run.

## 4. Simulation Engine

`normalizeFactors()` in `src/lib/simulation/factors.ts` clamps inputs and computes:

- `loadFactor = clamp((loadKg−5)/35)`; altitude `(meters−500)/4500`; temperature `abs(C−15)/40`.
- Terrain constants: flat .15, rolling .35, mountain .65, steep .9, mixed .5.
- Duration `(minutes−60)/(840−60)`; distance `(km−2)/28`; recovery `restMinutes/60`; night `.25`, day `0`.
- `environmentStress = clamp(.22 load + .18 altitude + .14 temp + .18 terrain + .12 duration + .08 distance + .08 night − .20 recovery)`.

In `runSimulation()` (`src/lib/simulation/simulation.ts`), unspecified soldier input is synthetic baseline `{mobility:85,endurance:82,strength:80,recovery:78,experience:4,typicalLoad:18}`. Experience buffer is `min(.15, years×.015)`. Starting fatigue is `8 + environmentStress×12`. Step is 15 minutes for duration ≤360, else 30; total is at least one step. Work rate is `18×load + 14×terrain + 10×altitude + 8×temperature + 6×night + 6×distance` factors. Each step adds `workRate×(.35 + progress×.65)×step/60`, subtracts a recovery pulse (sinusoidal threshold based on `restMinutes`, scaled by recovery factor, baseline recovery and step/30), and `experienceBuffer×2`; fatigue is clamped 0–100.

Mobility = baseline − `.42×fatigue` − `12×terrain` − `8×load` + `20×experienceBuffer`; endurance = baseline − `.38×fatigue` − `10×load` − `14×duration×progress` − `6×altitude` + `15×experienceBuffer`; strength available = baseline strength − `10×load + .2×fatigue + 5×terrain`; performance = `.30×mobility + .35×endurance + .15×strengthAvailable + .20×(100−fatigue)`. Outputs are clamped to 0–100, rounded to one decimal, and snapshots are interpolated to exact duration. Explanations are threshold-based strings, not causal attribution.

Inputs come from persisted scenario settings and, where linked, stored soldier baseline fields; default baseline is hardcoded. `typicalLoadKg` is stored but not used by the formula. Work/rest timing is not modeled as actual schedule; rest minutes control a sine-derived cadence, not discrete rests. No pace, slope, weather, sleep, hydration, acclimatization, body characteristics, health, uncertainty, calibration or empirical outcome is represented. Terrain factor is a fixed category constant; displayed terrain mesh has independent geometry. This is a deterministic software heuristic, not a scientific/medical readiness estimate (README labels it relative prototype indices). Group aggregation is an unweighted arithmetic mean unless caller supplies weights; current UI passes none.

Data categories: seeded `prisma/seed.ts` records and report/lesson text are explicitly synthetic demo data; user-entered soldier/scenario/report text is persisted as entered; model outputs are deterministic mathematical indices; HF output is generated text when configured; fallback extraction is pattern/rule-based and synthesizes generic lessons/observations. Dashboard includes additional hardcoded illustrative values.

## 5. AI Architecture

Only report analysis invokes external AI. `src/lib/ai/index.ts` reads `HF_API_KEY`, `HF_MODEL`, and `NEXT_PUBLIC_ENABLE_AI` (disable only when exactly `false`), posts to `https://router.huggingface.co/v1/chat/completions`, requests JSON, uses temperature .2 and truncates report text to 12,000 characters. It validates via `operationAnalysisResultSchema`; on schema failure it makes one stricter second call; errors/invalid output fall back to `fallbackExtract()`. `/api/operations/analyze` can persist extraction and lessons. `/api/ai/analyze-operation` is an alias. Other simulation, what-if and similarity logic is conventional deterministic code, not AI.

`.env.example` documents `HF_API_KEY` and `HF_MODEL`, while repository code uses exactly those names. No old OpenAI/Anthropic variable or SDK reference found in source/docs search; README describes the HF compatible router. Secrets are not included in this report; `.env` is gitignored. The settings page shows key presence/model name but not key value. AI caveats: the fallback invents generic “lessons” and default fields when absent, while resulting operation is marked `isDemo: true`; UI labels show demo mode but there is no source-level field attribution. HTTP non-OK throws and falls back; there is no timeout/token budget or model-availability distinction. Provider output can be untrusted text; schema controls shape but not factual support. No external request was made for this audit.

## 6. UI and User Workflow

- `/` is a product landing page. `/dashboard` is the DB-backed overview with hardcoded fallback/dashboard presentation values.
- `/soldiers` lists profiles and exposes add plus CSV import; row links open `/soldiers/[id]`. Details show baseline and run history. No edit/delete controls.
- `/missions` lists saved mission scenarios and latest stored run. `/missions/new` optionally binds a soldier using `?soldierId=`, then “Run Simulation” creates scenario + run + snapshots and opens `/simulator/[scenarioId]`. No mission edit/delete.
- `/simulator` lists stored scenarios. `/simulator/[id]` loads latest stored run, else computes in-memory from scenario/soldier without creating a run. Replay controls work against provided snapshots. Echelon is a visual preset; fixed synthetic terrain and route do not reflect scenario fields.
- `/missions/[id]/unit` renders database unit hierarchy and calculates a readiness-like average from each soldier's latest run or baseline values. It is not restricted to the selected scenario. Clicking nodes navigates/inspects client-side, but aggregation is not time-synchronized.
- `/what-if` has editable A/B values and invokes the same local `compareScenarios` function. It does not use query `scenarioId` or persist results.
- `/operations` lists records and embeds paste-text ingestion; `/operations/new` offers same ingestion. Analysis saves immediately on the UI's request (`save:true`); there is no review gate. `/operations/[id]` shows report data, lessons, similar records, and simulate-similar action. No library search/filter/approval action.
- `/learning` shows database counts/recent records and flow/navigation cards, not an independent learning search interface.
- `/settings` probes DB with `SELECT 1`, shows environment variable names/presence and AI readiness without rendering secret values.

## 7. Security and Technical Debt

1. **Critical product security gap:** no authentication/authorization on routes or pages. Sensitive soldier and operational data can be read/created by any reachable client. No tenant isolation or audit history.
2. **Report handling:** pasted raw report text stored in DB and optionally sent to external HF service. No data classification/consent/retention/redaction controls, source file access controls, rate limits, or content-specific safeguards.
3. **CSV import:** JSON request includes unbounded row array; sequential non-transactional inserts allow partial imports; errors include soldier identifiers. Client PapaParse preview is not a security boundary. No request/file size ceiling.
4. **API reliability:** most handlers catch all exceptions and return generic 500, obscuring actionable operational diagnosis; errors are not logged consistently. Analysis catches provider errors and falls back, but no timeout/retry for network failures.
5. **Model integrity:** no version/provenance record for formulas or AI prompt/model. Runs are labeled completed immediately for synchronous computation. Snapshot times lack uniqueness constraint. Derived group data mixes latest results across scenarios.
6. **UI truthfulness:** dashboard false fallback counts and fixed influence metrics can look like live records; mission list uses SIMULATED badge even for a scenario with no run. Some demo controls/breadcrumbs do not drive meaningful behavior.
7. **Code health:** one lint error and 18 warnings, including `CameraController` effect missing dependencies. `InfluenceFactorPanel` also has hardcoded influence percentages and is not formula-driven. Tests are unit-level only.
8. **Production:** Dockerfile is multi-stage standalone and build succeeds. Compose only starts database; no app or migration service. CI relies on destructive seed (`deleteMany` for all major tables), appropriately against ephemeral service but dangerous if workflow is repurposed. No auth/secret controls or deployment/backup workflow reviewed.

## 8. Phase-Wise Development Recommendations

Paths below are likely change locations, not commitments to redesign existing code.

### Phase 1: Advanced Soldier Intelligence
- Completed: role/squad/unit relation; soldier create/list/CSV import; baseline mobility/endurance/strength/recovery, experience, typical load; profile and run history.
- Partial: validation and imported baseline data; capability fields are prototype scalar indices.
- Missing: edit/delete, additional capability/provenance/measurement data, assessment dates, permissions/audit.
- Likely files: `src/app/soldiers/**`, `src/app/api/soldiers/**`, `src/lib/validation/schemas.ts`, `prisma/schema.prisma`.
- DB changes: only after agreeing data definitions, provenance, privacy and retention.
- Dependencies: auth/data governance before sensitive real records.
- Testing: soldier CRUD/API validation, import limits/duplicates/partial failure, role hierarchy, access control.

### Phase 2: Human Performance Simulation Engine
- Completed: deterministic factors, time snapshots, baseline inputs, output clamping, tests for monotonic expectations/determinism.
- Partial: formulas and explanations are prototype heuristics.
- Missing: validated/calibrated model, real time-based rest/activity inputs, uncertainty and versioning.
- Likely files: `src/lib/simulation/{factors,simulation,types}.ts`, tests, run persistence in `/api/simulations`.
- DB changes: model/version and input provenance if required.
- Dependencies: Phase 1 inputs and domain validation.
- Testing: domain edge cases, property/contract tests, calibration datasets and independent review; current unit tests are not scientific validation.

### Phase 3: Group and Formation Intelligence
- Completed: hierarchy storage, unit tree, simple mean aggregation and visual hierarchy.
- Partial: unit view uses latest run per soldier, not current mission.
- Missing: group-run data model, roster-backed formations, role weights, time-synchronized aggregates, scale/performance rules.
- Likely files: `aggregation.ts`, `src/app/missions/[id]/unit/**`, `FormationLayer.tsx`, simulator routes.
- DB changes: formation membership, group run and group snapshots likely needed.
- Dependencies: stable individual engine and soldier/role model.
- Testing: aggregation edge cases, scenario consistency, roster/formation mappings, large formations.

### Phase 4: Mission Configuration and 3D Simulation
- Completed: scenario creation/storage; controls; GLB/Three.js scene; procedural height mesh; route preview.
- Partial: fixed terrain/route and binary animation; camera presets.
- Missing: editable mission, real terrain/elevation/waypoints and condition-linked visuals, robust grounding, route/formation data binding.
- Likely files: `MissionBuilder.tsx`, `MissionTerrain.tsx`, `TerrainMesh.tsx`, `SoldierModel.tsx`, `FormationLayer.tsx`, camera and simulator client.
- DB changes: route/waypoint/elevation and environment details if product requires them.
- Dependencies: Phase 2 outputs and Phase 3 roster/formation mapping.
- Testing: browser/WebGL checks, asset/animation checks, camera/playback synchronization, terrain grounding and performance at target echelons.

### Phase 5: What-If Analysis
- Completed: same engine comparison utility and responsive graph/table.
- Partial: API endpoint can compare supplied inputs and soldier baseline.
- Missing: load real scenario/soldier in UI, save/label comparisons, repeatable explanations and provenance.
- Likely files: `WhatIfClient.tsx`, `/api/scenarios/compare`, comparison library.
- DB changes: optional comparison record/result persistence.
- Dependencies: Phase 2 formula stability and Phase 4 mission identity.
- Testing: API/UI roundtrip, model parity, changed factors and persistence.

### Phase 6: Historical Operations and Report Intelligence
- Completed: paste text, HF/fallback extraction, validation, structured record + lesson persistence.
- Partial: HF JSON extraction and source raw text.
- Missing: file uploads/parsing, source document object, review before save, secure retention, robust extraction observability.
- Likely files: operations ingestion UI/routes, `src/lib/ai/**`, validation schemas, Prisma models.
- DB changes: document/source record, extraction status/provider/model, provenance/review fields as agreed.
- Dependencies: auth/privacy controls; agree supported formats and source retention first.
- Testing: parser/type/size validation, malicious content handling, provider success/error/timeout/schema fallback, access policies.

### Phase 7: Operational Learning Library
- Completed: lessons persist under operations and appear in detail/recent views.
- Partial: learning page is a metrics/flow page.
- Missing: lesson search/filter, approval/rejection/change history, evidence citation and traceability to report passages.
- Likely files: `/learning`, operations detail, APIs, schema.
- DB changes: review actors/timestamps, citations and lifecycle history.
- Dependencies: Phase 6 source provenance and authentication.
- Testing: search/filter, lesson-operation attribution, approval access and audit behavior.

### Phase 8: Similarity Discovery and Contextual Recommendations
- Completed: weighted condition-distance ranking of stored operation records; similar operation link and simulate-similar workflow.
- Partial: numeric bands parsed from strings; load/rest hardcoded for all candidates.
- Missing: actual comparable features, explanation, thresholding, user feedback and evaluation set.
- Likely files: `similarity.ts`, `/api/scenarios/similar`, operation details/actions, operation schema.
- DB changes: canonical numeric condition/load/rest, recommendation feedback if warranted.
- Dependencies: Phase 6 normalized extraction and Phase 7 vetted content.
- Testing: ranking fixtures, missing/invalid band handling, quality evaluation, no-leakage and recommendation rationale.

### Phase 9: Complete Product Integration and Validation
- Completed: Next App Router pages/routes, Prisma, PostgreSQL Compose, CI workflow and standalone production build.
- Partial: integration journeys are present; tests/checks run locally.
- Missing: auth/permissions, integration/E2E/3D coverage, monitoring, backup/restore, documented deployment/security and model governance.
- Likely files: app-wide middleware/routes, tests, Docker/Compose, CI workflow, settings/readme.
- DB changes: audit/identity and domain changes from earlier phases.
- Dependencies: all phases; release gate includes validated model and sensitive data governance.
- Testing: full CI on disposable Postgres, E2E workflows, access tests, container smoke test, backup restore and production config validation.

## 9. Recommended Implementation Order

1. Establish authentication, authorization, audit logging, data handling and demo-vs-real provenance before onboarding sensitive records.
2. Specify and validate soldier baseline inputs and the human model; version the model before more consumers depend on its scores.
3. Fix current data correctness: scenario-scoped group aggregation, truthful dashboard empty states, source provenance, and distinguish computed from persisted runs.
4. Add roster-backed group/time aggregation and connect it to formations.
5. Make mission configuration editable and bind actual route/terrain/condition data to the simulator scene.
6. Connect what-if to saved scenarios and soldier baselines, then add persistence if users need durable comparisons.
7. Secure and extend operations ingestion for files and source tracking, with human review before records/lessons become reusable.
8. Build learning search/review atop approved structured records; improve similarity only after canonical data/evaluation exists.
9. Add integration/E2E, browser/WebGL, security, operational monitoring and deployment validation across the complete flow.

This order preserves existing working CRUD, simulator and extraction code and tightens their inputs/integration instead of proposing wholesale replacement.

## 10. Final Verdict

1. **Approximate engineering estimate: 35% of intended product implemented.** This is a subjective feature-weighted estimate: UI coverage is broad, but data fidelity, security, validated modeling, real terrain/formation integration, review workflow and production readiness are substantially incomplete.
2. Working today: database-backed soldier creation/list and CSV import; mission creation and persisted deterministic run snapshots; replay of precomputed metrics; unit hierarchy visualization with simple aggregation; paste-text report extraction/save with deterministic fallback; operation/lesson listing; mathematical similarity ranking; production build and core unit tests.
3. Incomplete: CRUD lifecycle, richer soldier intelligence, validated simulation, scenario-specific group state, real mission terrain/route, what-if integration/persistence, document ingestion, learning search/review, AI hardening, and comprehensive verification.
4. Entirely missing: authentication/authorization, genuine uploaded report file handling, approval action/workflow, real sensor/physiology data, validated scientific model, production-like group simulation tied to real roster and mission-specific geospatial terrain.
5. Biggest risks: exposure of sensitive data without access control; false confidence from unvalidated indices and hardcoded/demo outputs; report text privacy and external AI transmission; group metrics mixing unrelated latest runs; weak upload/import limits and lack of integration testing.
6. Implement first: access control/data governance, then model/input validation and scenario-scoped group data correctness. These are prerequisites for real users and credible downstream recommendations.
7. Avoid rebuilding: existing Prisma hierarchy and CRUD foundations, CSV parser/create flow, mission scenario/run/snapshot persistence, deterministic simulation function, replay controls/chart, report text extraction/fallback, operation/lesson persistence, similarity utility, and current CI/build structure. Improve and connect them in place.

## Verification Results

| Check | Result | Notes |
|---|---|---|
| `npm run typecheck` | Pass | `tsc --noEmit`, exit 0. |
| `npm run lint` | Fail | 1 error: `src/components/soldier/SimulationHistoryList.tsx:105` uses explicit `any`; 18 warnings, including unused imports/props and missing `CameraController` effect dependencies. |
| `npm test` | Pass | 3 files, 19 tests passed. Vite emitted CJS Node API deprecation warning. |
| `npx prisma validate` | Pass | Schema valid; environment loaded, no secret values printed. |
| `npm run build` | Pass | Next.js 16.3.8/Turbopack; compilation, TypeScript, static page generation and optimization completed. Generated `.next` output may have changed. |
| Live database/data | Not inspected | Schema validated only; no migration, seed, reset, or live DB query executed by audit. |
| Hugging Face API | Not called | Source inspection and fallback tests only. |

