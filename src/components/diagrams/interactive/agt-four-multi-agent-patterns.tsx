"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Four Multi-Agent Patterns, a 2×2 of ReAct, Orchestrator+workers,
// Evaluator+optimizer, and Planner+executor, each with a tiny glyph. Click a
// pattern to expand its description and ideal use case; or pick a task type
// (simple / research / quality-critical / well-structured) and watch the
// matching pattern highlight.

interface Pattern {
  id: string;
  name: string;
  glyph: string;
  use: string;
  taskType: string;
  detail: string;
  color: string;
  fill: string;
}

const PATTERNS: Pattern[] = [
  { id: "react", name: "ReAct", glyph: "think → act ↺", use: "Simple tasks", taskType: "simple", detail: "One agent interleaves reasoning with tool calls. Fewest moving parts, easiest to debug, the right default.", color: C.blue, fill: C.blueFill },
  { id: "orch", name: "Orchestrator + workers", glyph: "lead → ⋔ workers", use: "Research / broad search", taskType: "research", detail: "A lead decomposes the goal and hands sub-tasks to parallel workers, each in its own fresh context, then merges results.", color: C.green, fill: C.greenFill },
  { id: "eval", name: "Evaluator + optimizer", glyph: "gen ⇄ critic", use: "Quality matters", taskType: "quality", detail: "A generator produces output, a critic critiques it, and they loop until the critic approves, translation, writing, code review.", color: C.coral, fill: C.coralFill },
  { id: "plan", name: "Planner + executor", glyph: "plan → execute", use: "Known structure", taskType: "structured", detail: "One pass plans all the steps up front; an executor carries them out in order. Use when you can decompose ahead of time.", color: C.violet, fill: "#e7e3f7" },
];

const TASK_TYPES: { id: string; label: string }[] = [
  { id: "simple", label: "simple" },
  { id: "research", label: "research" },
  { id: "quality", label: "quality-critical" },
  { id: "structured", label: "well-structured" },
];

const VB_W = 480;
const VB_H = 220;
const CARD_W = 220;
const CARD_H = 78;
const GX = 16;
const GY = 36;
const GAP = 8;

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtFourMultiAgentPatterns() {
  const [sel, setSel] = useState<string>("react");
  const active = PATTERNS.find((p) => p.id === sel)!;

  const cardXY = (i: number) => ({
    x: GX + (i % 2) * (CARD_W + GAP),
    y: GY + Math.floor(i / 2) * (CARD_H + GAP),
  });

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Four multi-agent patterns in a 2x2 grid">
        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Four Multi-Agent Patterns
        </text>

        {PATTERNS.map((p, i) => {
          const { x, y } = cardXY(i);
          const isSel = p.id === sel;
          return (
            <g key={p.id} style={{ cursor: "pointer" }} onClick={() => setSel(p.id)}>
              <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={7} fill={isSel ? p.fill : "var(--card)"} stroke={isSel ? p.color : C.line} strokeWidth={isSel ? 2.4 : 1.2} />
              <text x={x + 12} y={y + 22} fontSize={11} fill={p.color} fontFamily={MONO} fontWeight={600}>
                {p.name}
              </text>
              <text x={x + 12} y={y + 42} fontSize={9.5} fill={C.ink} fontFamily={MONO}>
                {p.glyph}
              </text>
              <text x={x + 12} y={y + 62} fontSize={8} fill={C.muted} fontFamily={MONO}>
                best for: {p.use}
              </text>
            </g>
          );
        })}
      </svg>

      {/* task-type selector */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[var(--muted)]">task type:</span>
        {TASK_TYPES.map((t) => {
          const matched = PATTERNS.find((p) => p.taskType === t.id)!;
          const isActive = matched.id === sel;
          return (
            <button
              key={t.id}
              type="button"
              className={btn}
              style={isActive ? { background: C.ink, color: "var(--background)" } : undefined}
              onClick={() => setSel(matched.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* detail */}
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="font-mono text-xs font-semibold" style={{ color: active.color }}>
          {active.name}, {active.use}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{active.detail}</p>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        None is &ldquo;best&rdquo;, pick the structure that fits the task: one loop, parallel workers, a critic loop, or
        plan-then-execute.
      </p>
    </div>
  );
}
