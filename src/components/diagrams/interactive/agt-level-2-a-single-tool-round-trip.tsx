"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Level 2: A Single Tool Round-Trip — the seed of everything agentic.
// User asks -> model picks a tool -> tool runtime makes a live call -> the
// model answers, now grounded in real data, and the answer returns to the user.
// Interactive: a "run" button advances the round trip stage by stage; a
// failure toggle injects one of grounding's new risks (wrong tool, bad query,
// misread result) so you see what grounding costs as well as what it buys.

type Fail = "none" | "tool" | "query" | "read";

const FAILS: { id: Fail; label: string }[] = [
  { id: "none", label: "clean run" },
  { id: "tool", label: "wrong tool" },
  { id: "query", label: "bad query" },
  { id: "read", label: "misread result" },
];

interface Stage {
  id: string;
  x: number;
  title: string;
  ok: string;
  color: string;
  fill: string;
}

const VB_W = 480;
const VB_H = 250;
const BOX_W = 96;
const BOX_H = 56;
const ROW_Y = 96;

const STAGES: Stage[] = [
  { id: "user", x: 14, title: "User", ok: "\"NVDA price?\"", color: C.muted, fill: "var(--card)" },
  { id: "model", x: 134, title: "Model", ok: "picks a tool", color: C.blue, fill: C.blueFill },
  { id: "tool", x: 254, title: "Tool runtime", ok: "live API call", color: C.coral, fill: C.coralFill },
  { id: "answer", x: 374, title: "Final answer", ok: "grounded", color: C.green, fill: C.greenFill },
];

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-40 disabled:cursor-not-allowed";

export function AgtLevel2ASingleToolRoundTrip() {
  const [stage, setStage] = useState(0); // 0..3 active stage; 4 = returned to user
  const [fail, setFail] = useState<Fail>("none");

  const failAt = (s: Stage): string | null => {
    if (fail === "none") return null;
    if (fail === "tool" && s.id === "model") return "picks web_browse (wrong)";
    if (fail === "query" && s.id === "model") return "query: 'nvidia' (too vague)";
    if (fail === "read" && s.id === "answer") return "misreads: '$13.24'";
    return null;
  };

  const cx = (s: Stage) => s.x + BOX_W / 2;
  const done = stage >= STAGES.length;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Level 2: a single tool round trip">
        <defs>
          <marker id="l2-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.ink} />
          </marker>
          <marker id="l2-head-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.line} />
          </marker>
        </defs>

        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Level 2: A Single Tool Round-Trip
        </text>

        {/* forward arrows */}
        {STAGES.slice(0, -1).map((s, i) => {
          const live = stage > i;
          return (
            <line
              key={`fwd-${i}`}
              x1={s.x + BOX_W}
              y1={ROW_Y + BOX_H / 2}
              x2={STAGES[i + 1].x}
              y2={ROW_Y + BOX_H / 2}
              stroke={live ? C.ink : C.line}
              strokeWidth={live ? 2 : 1.2}
              markerEnd={live ? "url(#l2-head)" : "url(#l2-head-dim)"}
            />
          );
        })}

        {/* loop-back arrow from answer to user */}
        <path
          d={`M ${cx(STAGES[3])} ${ROW_Y + BOX_H} C ${cx(STAGES[3])} ${ROW_Y + BOX_H + 56}, ${cx(STAGES[0])} ${ROW_Y + BOX_H + 56}, ${cx(STAGES[0])} ${ROW_Y + BOX_H + 4}`}
          fill="none"
          stroke={done ? C.green : C.line}
          strokeWidth={done ? 2 : 1.2}
          strokeDasharray="4 3"
          markerEnd={done ? "url(#l2-head)" : "url(#l2-head-dim)"}
        />
        <text x={VB_W / 2} y={ROW_Y + BOX_H + 50} fontSize={8.5} fill={done ? C.green : C.muted} fontFamily={MONO} textAnchor="middle">
          answer returned to user
        </text>

        {/* stage boxes */}
        {STAGES.map((s, i) => {
          const isActive = stage === i;
          const visited = stage > i;
          const err = failAt(s);
          const showErr = err && (visited || isActive);
          return (
            <g key={s.id}>
              <rect
                x={s.x}
                y={ROW_Y}
                width={BOX_W}
                height={BOX_H}
                rx={6}
                fill={isActive || visited ? s.fill : "var(--card)"}
                stroke={showErr ? C.coral : isActive ? s.color : visited ? s.color : C.line}
                strokeWidth={isActive || showErr ? 2.4 : 1.2}
              />
              <text x={cx(s)} y={ROW_Y + 21} fontSize={10.5} fill={s.color === C.muted ? C.ink : s.color} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
                {s.title}
              </text>
              <text x={cx(s)} y={ROW_Y + 38} fontSize={8} fill={showErr ? C.coral : C.muted} fontFamily={MONO} textAnchor="middle">
                {showErr ? err : s.ok}
              </text>
              {showErr && (
                <text x={cx(s)} y={ROW_Y + 50} fontSize={8} fill={C.coral} fontFamily={MONO} textAnchor="middle">
                  ⚠ failure
                </text>
              )}
              <text x={s.x + 6} y={ROW_Y + 12} fontSize={8} fill={C.muted} fontFamily={MONO}>
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* grounding callout */}
        <text x={VB_W / 2} y={ROW_Y - 16} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          the unlock: grounding — the answer is anchored to something real
        </text>
      </svg>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className={btn} onClick={() => setStage((s) => Math.min(s + 1, STAGES.length))} disabled={done}>
          {done ? "complete" : stage === 0 ? "run ▸" : "step ▸"}
        </button>
        <button type="button" className={btn} onClick={() => setStage(0)}>
          reset
        </button>
        <span className="font-mono text-[var(--muted)]">failure mode:</span>
        {FAILS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={btn}
            style={fail === f.id ? { background: f.id === "none" ? C.ink : C.coral, color: "var(--background)" } : undefined}
            onClick={() => {
              setFail(f.id);
              setStage(0);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        One round trip: the model decides, the tool runs, the model answers — now anchored to real data. Grounding kills a whole
        class of hallucinations, but introduces new ways to fail: pick the wrong tool, write a bad query, or misread the result.
      </p>
    </div>
  );
}
