import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/primitives";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--off-white)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-6 md:px-10">
        <div className="text-[13px] font-semibold tracking-tight text-[var(--white)]">
          Human Performance Simulation
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge tone="muted">DEMO ENVIRONMENT</StatusBadge>
          <Button href="/dashboard" size="sm">
            Open Console
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 opacity-[0.35]" aria-hidden>
          <TerrainBackdrop />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:py-24">
          <div>
            <div className="label-xs mb-4">Mission Readiness Platform</div>
            <h1 className="max-w-xl text-[42px] font-bold leading-[1.05] tracking-tight text-[var(--white)] md:text-[52px]">
              Simulate the human.
              <br />
              Simulate the mission.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--gray-300)]">
              A human-performance simulation platform that models how mission
              conditions influence the simulated human state over time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/simulator">Open Simulation</Button>
              <Button href="/dashboard" variant="secondary">
                Mission Readiness
              </Button>
            </div>
            <p className="mt-4 text-[11px] text-[var(--gray-500)]">
              Prototype relative indices. Not clinical or medically validated
              measurements.
            </p>
          </div>

          <div className="panel-lg relative flex min-h-[280px] flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <StatusBadge tone="cyan">Live Model</StatusBadge>
              <span className="mono text-[11px] text-[var(--gray-500)]">
                HIGH ALTITUDE PATROL
              </span>
            </div>
            <div className="my-6">
              <MiniRouteVisual />
            </div>
            <div className="grid grid-cols-4 gap-3 border-t border-[var(--border)] pt-4">
              <Metric label="Fatigue" value="58" />
              <Metric label="Mobility" value="72" />
              <Metric label="Endurance" value="64" />
              <Metric label="Performance" value="69" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-10">
        <div className="label-xs mb-2">The Problem</div>
        <h2 className="max-w-2xl text-[24px] font-semibold text-[var(--white)]">
          Mission planning can model the environment. Human performance changes
          with it.
        </h2>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--ink-panel)]">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-10">
          <div className="label-xs mb-2">The Platform</div>
          <h2 className="mb-8 text-[24px] font-semibold text-[var(--white)]">
            One connected loop
          </h2>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { t: "Human", d: "Baseline profile and relative indices" },
              { t: "Mission", d: "Conditions that drive the simulation" },
              { t: "Unit", d: "Role → squad → unit aggregation" },
              { t: "Learning", d: "Past operations → future scenarios" },
            ].map((item) => (
              <div key={item.t} className="border border-[var(--border)] bg-[var(--ink)] p-4 rounded-[6px]">
                <div className="text-[14px] font-semibold text-[var(--cyan)]">
                  {item.t}
                </div>
                <p className="mt-2 text-[12px] text-[var(--gray-300)]">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-10">
        <div className="label-xs mb-2">How it works</div>
        <h2 className="mb-8 text-[24px] font-semibold text-[var(--white)]">
          Past → Learn → Model → Simulate
        </h2>
        <ol className="grid gap-0 md:grid-cols-4">
          {[
            { n: "01", t: "Ingest", d: "Structure operational reports into conditions and lessons." },
            { n: "02", t: "Configure", d: "Set load, altitude, terrain, duration, and recovery." },
            { n: "03", t: "Simulate", d: "Watch relative human state change across mission time." },
            { n: "04", t: "Compare", d: "Run what-if alternatives and reuse similar scenarios." },
          ].map((s, i) => (
            <li
              key={s.n}
              className="relative border border-[var(--border)] p-4 md:border-l-0 first:md:border-l"
              style={{ borderRadius: i === 0 ? "6px 0 0 6px" : i === 3 ? "0 6px 6px 0" : 0 }}
            >
              <div className="mono text-[11px] text-[var(--cyan)]">{s.n}</div>
              <div className="mt-2 text-[15px] font-semibold text-[var(--white)]">
                {s.t}
              </div>
              <p className="mt-2 text-[12px] text-[var(--gray-300)]">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <Button href="/dashboard">Enter Mission Readiness</Button>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 py-6 text-[11px] text-[var(--gray-500)] md:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>Human Performance Simulation · Prototype</span>
          <Link href="/settings" className="hover:text-[var(--gray-300)]">
            System status
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div className="mono tabular mt-1 text-[20px] text-[var(--cyan)]">{value}</div>
    </div>
  );
}

function MiniRouteVisual() {
  return (
    <svg viewBox="0 0 420 140" className="h-auto w-full" aria-hidden>
      {[20, 40, 60, 80].map((y) => (
        <path
          key={y}
          d={`M0 ${y + 40} Q 105 ${y + 10}, 210 ${y + 35} T 420 ${y + 20}`}
          fill="none"
          stroke="rgba(154,163,178,0.2)"
          strokeWidth="1"
        />
      ))}
      <path
        d="M24 110 C 90 95, 140 70, 200 78 S 300 50, 380 36"
        fill="none"
        stroke="#55D8F5"
        strokeWidth="2"
      />
      {[0.25, 0.55, 0.8].map((t, i) => (
        <circle
          key={i}
          cx={24 + t * 356}
          cy={110 - t * 70}
          r={3.5}
          fill="#55D8F5"
        />
      ))}
      <circle cx={200} cy={78} r={5} fill="#F5F7FA" />
    </svg>
  );
}

function TerrainBackdrop() {
  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 600" aria-hidden>
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B1220" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0B1220" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="600" fill="#0B1220" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1={i * 50}
          y1="0"
          x2={i * 50}
          y2="600"
          stroke="rgba(232,236,241,0.04)"
        />
      ))}
      <path
        d="M0 420 L150 360 L280 390 L420 300 L560 340 L720 250 L900 310 L1100 220 L1200 260 L1200 600 L0 600 Z"
        fill="#111827"
        opacity="0.7"
      />
      <path
        d="M0 480 L200 430 L380 460 L560 390 L780 430 L1000 360 L1200 400 L1200 600 L0 600 Z"
        fill="#0f1724"
      />
      <rect width="1200" height="600" fill="url(#fade)" />
    </svg>
  );
}
