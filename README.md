# Human Performance Simulation & Mission Readiness Platform

Defence-focused human-performance simulation and mission-readiness analysis for military training, synthetic combat-operation scenarios, and historical operational learning.

> **We don't just simulate the mission. We simulate the humans who have to execute it.**

Prototype relative indices only — **not** medical, clinical, or scientifically validated physiological measurements.

## Problem

Mission planning often models the environment. Human performance changes with load, altitude, temperature, terrain, duration, and recovery. Those changes also affect team-level capability and what past operations can teach about future scenarios.

## Solution

The platform examines the human dimension of defence scenarios: personnel performance, fatigue, recovery, endurance, mobility, environmental stress, group capability, readiness indicators, and lessons documented in historical records. It does not predict combat outcomes or provide tactical recommendations.

Three connected layers:

1. **Individual human performance** — how simulated state changes over mission time  
2. **Mission + unit simulation** — what that means for role → squad → unit  
3. **Operational learning** — past operations → lessons → similar scenarios → new simulation  

```
PAST → LEARN → MODEL → SIMULATE → COMPARE → PREPARE
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App Router (UI + Route Handlers)               │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────────┐  │
│  │ Dashboard│  │ Simulator  │  │ Ops Learning / AI    │  │
│  │ Soldiers │  │ What-If    │  │ (optional provider)  │  │
│  └────┬─────┘  └─────┬──────┘  └──────────┬──────────┘  │
│       │              │                     │             │
│       └──────────────┼─────────────────────┘             │
│                      ▼                                   │
│         TypeScript Simulation Engine                     │
│         (deterministic factors → snapshots)              │
│                      │                                   │
│                      ▼                                   │
│              Prisma ORM                                  │
└──────────────────────┼──────────────────────────────────┘
                       ▼
              PostgreSQL (Docker)
```

## Tech stack

- Next.js · TypeScript · React · Tailwind CSS  
- PostgreSQL · Prisma ORM  
- Three.js / React Three Fiber · Recharts · Zod · Lucide · Framer Motion  
- Docker Compose · GitHub Actions · Vitest  

## Features

- Soldier library + CSV import  
- Mission configuration with condition sliders  
- Deterministic human-performance simulation engine  
- 3D technical terrain + route visualization (SVG fallback)  
- Replay controls (play / pause / seek / speed)  
- What-if scenario comparison  
- Unit hierarchy map (soldier → role → squad → unit)  
- Operational learning library + report ingestion  
- AI-assisted extraction (OpenAI-compatible) with **deterministic fallback**  
- Scenario similarity matching  
- Simulate-similar-scenario → return to simulator  

## Simulation model

Mission inputs are normalized to factors in `[0, 1]`. Environment stress drives time-stepped fatigue. Mobility, endurance, and performance are derived and clamped to `[0, 100]`.

These are **prototype relative indices** for demonstration and software validation — not medical measurements.

## AI layer

Optional. Configure:

```
HF_API_KEY=
HF_MODEL=
```

`HF_API_KEY` is server-only. `HF_MODEL` specifies the Hugging Face model identifier via Hugging Face's OpenAI-compatible router (`https://router.huggingface.co/v1`).

If `HF_API_KEY` or `HF_MODEL` is missing, report analysis uses a deterministic extractor and shows **AI ANALYSIS: DEMO MODE**. The app never requires AI to run.

## Local development

**Note:** Docker Postgres is mapped to host port **`5435`** (avoids conflicts with local Postgres on 5432/5433/5434).

```bash
docker compose up -d
npm install
npm run prisma:generate
npx prisma migrate dev
npm run demo:seed
npm run dev
```

- App: http://localhost:3000  
- Postgres: `localhost:5435` · db `human_performance` · user/pass `postgres`  

Copy `.env.example` → `.env` and adjust if needed.

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests |
| `npm run prisma:generate` | Generate client |
| `npm run prisma:migrate` | Dev migrate |
| `npm run prisma:seed` | Seed demo data |
| `npm run demo:seed` | Safely create or update only the stable synthetic demo records; preserves unrelated database rows |
| `npm run db:reset` | Destructively reset the database; do not use against a shared or valuable database |

## Demo journey

1. Run `npm run demo:seed`; it is idempotent and labels every added profile and report as synthetic.
2. Open **Organization** to inspect the synthetic Himalayan Training Group → Alpha Company → Alpha Platoon → Bravo Squad and four role-linked fictional profiles.
3. Open **Missions** and choose the synthetic Neelkanth ridge traverse, Marudhara desert circuit, Vanrekha forest egress, or Samata plains relay.
4. Open **Simulator** to view the selected scenario's stylized terrain and replay. Terrain is schematic, not geographic data.
5. Open **What-If**, select terrain for the baseline and alternatives, inspect their terrain previews, then compare the model outputs.
6. Open **Operations** and **Learning** to review pre-approved fictional training reports and the repeated water-point observation pattern.
7. For the document flow, upload `demo-data/synthetic-training-report.txt`, inspect the extracted text, then confirm and review it.

`npm run prisma:seed` delegates to the same non-destructive demo seeder. The demo profiles include one deliberately incomplete optional assessment to demonstrate missing-data handling. All people, operations, conditions, assessments, and outputs are invented. Do not use this dataset as operational or medical guidance.

## Limitations

- Prototype indices only; not clinically validated  
- Synthetic / fictional demo data  
- No authentication, CV, GIS providers, microservices, or K8s  
- AI optional; embeddings similarity only if you extend the provider  
- Terrain surfaces and routes are procedural visualizations; no GIS, elevation, or validated biome data is used  
- Authentication and authorization are required before deployment with real personnel or sensitive records  

## Future extensions (docs only)

Wearables, advanced physiology, computer vision, personalized ML, larger unit sims, org accounts / RBAC, cloud deploy.

## License

Private / hackathon MVP unless otherwise specified.
