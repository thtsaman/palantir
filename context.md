# Human Performance Simulation & Mission Readiness Platform

> **Central context file — update on every meaningful change.**
> Working product name. Demo environment. Prototype relative indices only.

## Role

Lead full-stack / product / UI-UX / simulation / DevOps engineer.
Build a complete polished production-style MVP in ~8 hours.
Single Next.js full-stack app. No microservices. No auth. No CV. No K8s.

## Product Principle

```
PAST → LEARN → MODEL → SIMULATE → COMPARE → PREPARE
```

Three layers:
1. **Individual human performance** — How does this soldier change as the mission progresses?
2. **Mission + unit simulation** — What does that changing state mean for mission/team?
3. **Operational learning** — What can previous operations teach for similar future scenarios?

Core idea: *"We don't just simulate the mission. We simulate the humans who have to execute it."*

## Constraints (hard)

- Next.js + TS + React + PostgreSQL + Prisma + Tailwind + R3F + Recharts + Zod + Lucide + Docker Compose + GH Actions
- Deterministic simulation (no ML for human performance)
- AI optional (OpenAI-compatible); fallback when no `AI_API_KEY`
- Synthetic/demo data only — no real PII / classified / biometric data
- No medical claims — "Simulated Performance Index" / "PROTOTYPE SIMULATION"

## Design System

| Token | Value |
|-------|-------|
| Primary (Ink) | `#0B1220` |
| Secondary (Signal Cyan) | `#55D8F5` |
| Neutrals | white / off-white / gray scale only |
| Fonts | Inter (UI) + IBM Plex Mono (data) |
| Radius | 4–8px cards, ~10px major panels |
| Sidebar | 220–240px |
| Icons | Lucide 14–20px, 1.5–1.75 stroke |

**Forbidden:** neon, glassmorphism, rainbow charts, multi-accent hues, camouflage, cyberpunk, excessive gradients/glow/rounded pills.

## Routes

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Landing | ✅ |
| `/dashboard` | Mission Readiness | ✅ |
| `/soldiers` | Soldier library + CSV | ✅ |
| `/soldiers/[id]` | Soldier detail | ✅ |
| `/missions` | Scenario list | ✅ |
| `/missions/new` | Mission builder | ✅ |
| `/missions/[id]/unit` | Unit hierarchy | ✅ |
| `/simulator` | Scenario picker | ✅ |
| `/simulator/[id]` | Main wow screen | ✅ |
| `/what-if` | A vs B comparison | ✅ |
| `/operations` | Ops learning library | ✅ |
| `/operations/[id]` | Operation detail | ✅ |
| `/operations/new` | Report ingest | ✅ |
| `/learning` | Operational memory | ✅ |
| `/settings` | DB / sim / AI status | ✅ |

## Local Dev (current machine)

- Docker Postgres: **`localhost:5435`** (ports 5432–5434 occupied by other local services)
- `.env` / `.env.example` use `5435`
- `docker compose up -d` → container `hps-postgres`
- App: `npm run dev` → http://localhost:3000

```
docker compose up -d
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

## Implementation Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Inspect repo | ✅ | Greenfield |
| 2 Scaffold | ✅ | Next 16, TS, Tailwind 4 |
| 3 Schema + migrate + seed | ✅ | 12 soldiers, 5 scenarios, 5 ops |
| 4 Design system + layout | ✅ | AppShell, Sidebar, primitives |
| 5 Dashboard | ✅ | |
| 6 Soldiers + CSV | ✅ | |
| 7 Mission builder | ✅ | |
| 8 Simulation engine + tests | ✅ | 13 unit tests passing |
| 9–10 Simulator 3D + charts + replay | ✅ | R3F + 2D fallback |
| 11 What-If | ✅ | |
| 12 Unit view | ✅ | |
| 13–15 Ops + AI + similarity | ✅ | Fallback demo mode |
| 16–17 CI + README + polish | ✅ | Build + typecheck pass |

## Verification (2026-10-01)

- `npm test` — 13/13 pass
- `npm run typecheck` — pass
- `npm run build` — pass (all routes)
- `npm run lint` — fixed React compiler lint issues in ReportIngest + SimulatorClient
- Prisma migrate + seed on port 5435 — pass

## Demo Story

1. High Altitude Patrol (3500m, -5°C, 18kg, 12km, 8h, 15min rest, Night, Mountain)
2. Watch performance degrade in `/simulator/[id]`
3. What-If: load 18→14kg, rest 15→30min
4. Ops → similar scenario → simulate → back to simulator

## Decisions Log

- 2026-10-01: Greenfield; App Router; `src/` layout; npm; Vitest; Prisma 5.22
- Docker host port **5435** to avoid conflicts with local Postgres/other containers
- AI provider-agnostic; deterministic fallback required
- Simulation logic isolated in `src/lib/simulation/`

## Active Work

MVP feature surface complete. Polish / demo walkthrough as needed.
