"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Anatomy of a Tool Call, five stages between the Model and Your runtime.
// The model only ever describes the call as JSON; your runtime executes it.
// A boundary line marks that the model never crosses into running code, and a
// safety-checkpoint marker sits on stage 3. Interactive: step the five stages,
// see each message's JSON, and watch the tool_use_id link step 2 to step 4.

interface Step {
  n: number;
  side: "runtime" | "model";
  title: string;
  json: string;
  checkpoint?: boolean;
}

const STEPS: Step[] = [
  { n: 1, side: "runtime", title: "runtime → model: tool schema", json: '{ "name": "get_weather",\n  "input_schema": { "city": "string" } }' },
  { n: 2, side: "model", title: "model → runtime: tool_use", json: '{ "type": "tool_use", "id": "toolu_01A",\n  "name": "get_weather",\n  "input": { "city": "Tokyo" } }' },
  { n: 3, side: "runtime", title: "runtime executes the real fn", json: 'get_weather("Tokyo")\n  → "18°C, cloudy"', checkpoint: true },
  { n: 4, side: "runtime", title: "runtime → model: tool_result", json: '{ "type": "tool_result",\n  "tool_use_id": "toolu_01A",\n  "content": "18°C, cloudy" }' },
  { n: 5, side: "model", title: "model continues, now grounded", json: '"It\'s 18°C and cloudy in Tokyo."' },
];

const VB_W = 480;
const VB_H = 250;
const MID = 240; // boundary x
const COL_W = 150;
const LEFT_X = 30; // runtime column
const RIGHT_X = MID + 60; // model column

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-40 disabled:cursor-not-allowed";

export function AgtAnatomyOfAToolCall() {
  const [stage, setStage] = useState(0); // 0..5 (0 = nothing yet)
  const current = stage >= 1 ? STEPS[stage - 1] : null;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Anatomy of a tool call across the model/runtime boundary">
        <defs>
          <marker id="tc-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.ink} />
          </marker>
        </defs>

        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Anatomy of a Tool Call
        </text>

        {/* column headers */}
        <rect x={LEFT_X} y={30} width={COL_W} height={26} rx={6} fill={C.greenFill} stroke={C.green} strokeWidth={1.2} />
        <text x={LEFT_X + COL_W / 2} y={47} fontSize={10} fill={C.green} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Your runtime
        </text>
        <rect x={RIGHT_X} y={30} width={COL_W} height={26} rx={6} fill={C.blueFill} stroke={C.blue} strokeWidth={1.2} />
        <text x={RIGHT_X + COL_W / 2} y={47} fontSize={10} fill={C.blue} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Model
        </text>

        {/* boundary line (stops above the labels so it doesn't strike through them) */}
        <line x1={MID} y1={62} x2={MID} y2={196} stroke={C.coral} strokeWidth={1.4} strokeDasharray="4 3" />
        <text x={MID} y={228} fontSize={7.5} fill={C.coral} fontFamily={MONO} textAnchor="middle">
          model never crosses
        </text>

        {/* step rows */}
        {STEPS.map((s, i) => {
          const y = 70 + i * 30;
          const isDone = stage >= s.n;
          const isCur = stage === s.n;
          const onLeft = s.side === "runtime";
          const dotX = onLeft ? LEFT_X + COL_W : RIGHT_X;
          return (
            <g key={s.n} opacity={isDone ? 1 : 0.3}>
              {/* step badge */}
              <circle cx={onLeft ? LEFT_X - 14 : RIGHT_X + COL_W + 14} cy={y} r={9} fill={isCur ? C.ink : "var(--card)"} stroke={isCur ? C.ink : C.line} strokeWidth={1.4} />
              <text x={onLeft ? LEFT_X - 14 : RIGHT_X + COL_W + 14} y={y + 3} fontSize={9} fill={isCur ? "var(--background)" : C.muted} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
                {s.n}
              </text>
              {/* label */}
              <text x={onLeft ? LEFT_X : RIGHT_X} y={y + 3} fontSize={8} fill={isCur ? C.ink : C.muted} fontFamily={MONO}>
                {s.title.length > 30 ? s.title.slice(0, 29) + "…" : s.title}
              </text>
              {/* arrow across boundary for transfer steps */}
              {(s.n === 1 || s.n === 2 || s.n === 4 || s.n === 5) && isDone && (
                <line
                  x1={s.n === 2 || s.n === 5 ? RIGHT_X : dotX}
                  y1={y + 12}
                  x2={s.n === 2 || s.n === 5 ? MID + 4 : MID - 4}
                  y2={y + 12}
                  stroke={C.line}
                  strokeWidth={1.2}
                  markerEnd="url(#tc-head)"
                />
              )}
              {/* checkpoint marker */}
              {s.checkpoint && isDone && (
                <text x={LEFT_X + COL_W + 6} y={y + 3} fontSize={7.5} fill={C.coral} fontFamily={MONO}>
                  🔒 safety checkpoint
                </text>
              )}
            </g>
          );
        })}

        {/* tool_use_id link highlight when result returns */}
        {stage >= 4 && (
          <text x={VB_W / 2} y={212} fontSize={8} fill={C.violet} fontFamily={MONO} textAnchor="middle">
            tool_use_id &ldquo;toolu_01A&rdquo; links step 2 → step 4
          </text>
        )}
      </svg>

      {/* JSON panel */}
      <div className="mt-3 min-h-[64px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        {current ? (
          <>
            <p className="font-mono text-[11px] font-semibold" style={{ color: current.side === "model" ? C.blue : C.green }}>
              {`step ${current.n}, ${current.title}`}
            </p>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--foreground)]">{current.json}</pre>
          </>
        ) : (
          <p className="font-mono text-[11px] text-[var(--muted)]">Press &ldquo;step&rdquo; to walk the five stages.</p>
        )}
      </div>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className={btn} onClick={() => setStage((s) => Math.min(s + 1, STEPS.length))} disabled={stage >= STEPS.length}>
          {stage >= STEPS.length ? "complete" : "step ▸"}
        </button>
        <button type="button" className={btn} onClick={() => setStage(0)}>
          reset
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        The model only describes the call as JSON; your runtime executes it. That gap, the checkpoint at stage 3 where your code
        decides whether to really run it, is what makes tool use safe, auditable, and gate-able.
      </p>
    </div>
  );
}
