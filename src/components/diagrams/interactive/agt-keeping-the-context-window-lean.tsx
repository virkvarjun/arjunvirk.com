"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Keeping the Context Window Lean — a meter fills as a long task runs, with a
// danger zone at 50–80% (degraded performance) and a 95% auto-compaction line.
// Four techniques pull the meter back down. Interactive: run the task to climb
// the meter; apply a technique to drop it; performance indicators worsen in the
// danger zone and recover after intervention.

interface Technique {
  id: string;
  name: string;
  drop: number; // how much it pulls the meter down (percentage points)
  note: string;
  color: string;
}

const TECHNIQUES: Technique[] = [
  { id: "compact", name: "Compaction", drop: 35, note: "Summarize old turns; keep file paths and errors verbatim.", color: C.blue },
  { id: "subagent", name: "Sub-agents", drop: 45, note: "Offload focused work to a clean context; return only a summary.", color: C.green },
  { id: "external", name: "External memory", drop: 30, note: "Write state to disk (scratchpad, todo, notes); read on demand.", color: C.coral },
  { id: "jit", name: "Just-in-time retrieval", drop: 25, note: "Pull only what's needed via search/read tools (MCP resources).", color: C.violet },
];

const VB_W = 480;
const VB_H = 210;
const BAR_X = 40;
const BAR_Y = 36;
const BAR_W = 56;
const BAR_H = 150;

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtKeepingTheContextWindowLean() {
  const [fill, setFill] = useState(20); // percent
  const [lastNote, setLastNote] = useState<string>("");

  const inDanger = fill >= 50 && fill < 95;
  const critical = fill >= 95;
  const meterColor = critical ? C.coral : inDanger ? "#c79a3a" : C.green;

  const yFor = (pct: number) => BAR_Y + BAR_H * (1 - pct / 100);

  const run = () => {
    setFill((f) => Math.min(100, f + 22));
    setLastNote("task runs: tool results, observations, and retries pile up…");
  };
  const apply = (t: Technique) => {
    setFill((f) => Math.max(8, f - t.drop));
    setLastNote(`${t.name}: ${t.note}`);
  };

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Keeping the context window lean with four techniques">
        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Keeping the Context Window Lean
        </text>

        {/* danger zone band 50-80 */}
        <rect x={BAR_X} y={yFor(80)} width={BAR_W} height={yFor(50) - yFor(80)} fill={C.coral} opacity={0.12} />
        {/* meter frame */}
        <rect x={BAR_X} y={BAR_Y} width={BAR_W} height={BAR_H} rx={6} fill="var(--card)" stroke={C.line} />
        {/* fill */}
        <rect x={BAR_X} y={yFor(fill)} width={BAR_W} height={BAR_Y + BAR_H - yFor(fill)} rx={4} fill={meterColor} opacity={0.85} />
        {/* 50-80 markers */}
        <line x1={BAR_X - 4} y1={yFor(50)} x2={BAR_X + BAR_W} y2={yFor(50)} stroke={C.coral} strokeWidth={0.8} strokeDasharray="2 2" />
        <line x1={BAR_X - 4} y1={yFor(80)} x2={BAR_X + BAR_W} y2={yFor(80)} stroke={C.coral} strokeWidth={0.8} strokeDasharray="2 2" />
        <text x={BAR_X + BAR_W + 6} y={yFor(65) + 3} fontSize={7.5} fill={C.coral} fontFamily={MONO}>
          50–80%: degraded
        </text>
        {/* 95 line */}
        <line x1={BAR_X - 4} y1={yFor(95)} x2={BAR_X + BAR_W} y2={yFor(95)} stroke={C.ink} strokeWidth={1} />
        <text x={BAR_X + BAR_W + 6} y={yFor(95) + 3} fontSize={7.5} fill={C.ink} fontFamily={MONO}>
          95%: auto-compact
        </text>
        {/* current value */}
        <text x={BAR_X + BAR_W / 2} y={BAR_Y - 4} fontSize={10} fill={meterColor} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          {Math.round(fill)}%
        </text>

        {/* performance indicators */}
        <text x={250} y={50} fontSize={9} fill={C.muted} fontFamily={MONO}>
          performance:
        </text>
        {[
          { label: "instruction-following", good: !inDanger && !critical },
          { label: "tool-call accuracy", good: !inDanger && !critical },
          { label: "time-to-first-token", good: !inDanger && !critical },
        ].map((p, i) => (
          <g key={p.label}>
            <circle cx={256} cy={68 + i * 22} r={5} fill={p.good ? C.green : C.coral} />
            <text x={268} y={71 + i * 22} fontSize={8.5} fill={C.ink} fontFamily={MONO}>
              {p.label}
            </text>
            <text x={462} y={71 + i * 22} fontSize={8} fill={p.good ? C.green : C.coral} fontFamily={MONO} textAnchor="end">
              {p.good ? "ok" : "worse"}
            </text>
          </g>
        ))}
        <text x={250} y={150} fontSize={8} fill={C.muted} fontFamily={MONO}>
          {critical ? "critical — compaction kicks in" : inDanger ? "in the danger zone" : "lean and on-task"}
        </text>
      </svg>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <button type="button" className={btn} onClick={run}>
          run task ▸
        </button>
        <span className="font-mono text-[var(--muted)]">apply:</span>
        {TECHNIQUES.map((t) => (
          <button key={t.id} type="button" className={btn} onClick={() => apply(t)} style={{ borderColor: t.color }}>
            {t.name}
          </button>
        ))}
        <button type="button" className={btn} onClick={() => { setFill(20); setLastNote(""); }}>
          reset
        </button>
      </div>

      {lastNote && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="font-mono text-[11px] leading-relaxed text-[var(--muted)]">{lastNote}</p>
        </div>
      )}

      <p className="mt-2 text-xs text-[var(--muted)]">
        Past ~50–80% full, agents get worse: slower first token, weaker instruction-following, hallucinated tool calls. Compact,
        spin off sub-agents, offload to disk, and retrieve just in time to pull the meter back down.
      </p>
    </div>
  );
}
