"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// File-Based Memory vs a Vector Database, for the task "forget that Jamie's
// date nights are Thursdays". Left: MEMORY.md, one readable, auditable line to
// delete. Right: a cloud of embeddings where the fact is hard to locate and
// surgically remove. A scale slider grows the fact count and shows the file
// approach getting wasteful (whole file in every prompt) past a few hundred.

const VB_W = 480;
const VB_H = 250;

const FACTS = [
  "Name: Alex. they/them.",
  "Time zone: America/LA.",
  "Spouse: Jamie, date nights Thursdays.",
  "Allergic to penicillin.",
  "Hates morning meetings.",
];
const TARGET = 2; // index of the Jamie fact

// deterministic embedding cloud (the fact is smeared across several vectors)
const DOTS = [
  { x: 300, y: 80, t: false }, { x: 330, y: 70, t: false }, { x: 360, y: 92, t: true },
  { x: 388, y: 76, t: false }, { x: 412, y: 100, t: false }, { x: 318, y: 110, t: true },
  { x: 348, y: 124, t: false }, { x: 378, y: 116, t: false }, { x: 406, y: 134, t: false },
  { x: 300, y: 142, t: false }, { x: 332, y: 152, t: false }, { x: 366, y: 150, t: true },
  { x: 396, y: 162, t: false }, { x: 424, y: 124, t: false }, { x: 344, y: 92, t: false },
];

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtFileBasedMemoryVsAVectorDatabase() {
  const [deleted, setDeleted] = useState(false);
  const [scaleExp, setScaleExp] = useState(1); // 1..4 -> 10..10000 facts

  const factCount = Math.round(10 ** scaleExp);
  // context cost: fraction of a budget the whole file would consume
  const costFrac = Math.min(1, factCount / 4000);
  const costColor = costFrac > 0.7 ? C.coral : costFrac > 0.35 ? "#c79a3a" : C.green;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="File-based memory versus a vector database for forgetting one fact">
        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Forget &ldquo;Jamie&rsquo;s date nights are Thursdays&rdquo;
        </text>

        {/* divider */}
        <line x1={VB_W / 2} y1={30} x2={VB_W / 2} y2={VB_H - 14} stroke={C.line} strokeWidth={1} strokeDasharray="3 3" />

        {/* LEFT: MEMORY.md */}
        <text x={14} y={44} fontSize={10} fill={C.green} fontFamily={MONO} fontWeight={600}>
          MEMORY.md (file)
        </text>
        <rect x={14} y={52} width={210} height={120} rx={6} fill="var(--card)" stroke={C.green} strokeWidth={1.2} />
        {FACTS.map((f, i) => {
          const y = 70 + i * 20;
          const isTarget = i === TARGET;
          const gone = isTarget && deleted;
          return (
            <g key={i}>
              {gone ? (
                <text x={24} y={y} fontSize={8} fill={C.muted} fontFamily={MONO} textDecoration="line-through" opacity={0.4}>
                  - {f}
                </text>
              ) : (
                <text x={24} y={y} fontSize={8} fill={isTarget ? C.coral : C.ink} fontFamily={MONO} fontWeight={isTarget ? 600 : 400}>
                  - {f.length > 30 ? f.slice(0, 29) + "…" : f}
                </text>
              )}
            </g>
          );
        })}
        <text x={119} y={186} fontSize={8} fill={deleted ? C.green : C.muted} fontFamily={MONO} textAnchor="middle">
          {deleted ? "✓ one clean, auditable edit" : "find the line → delete it"}
        </text>

        {/* RIGHT: vector DB */}
        <text x={258} y={44} fontSize={10} fill={C.coral} fontFamily={MONO} fontWeight={600}>
          Vector DB (embeddings)
        </text>
        {DOTS.map((d, i) => {
          const flagged = deleted && d.t;
          return (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={flagged ? 6 : 4}
              fill={flagged ? "none" : C.blue}
              stroke={flagged ? C.coral : "none"}
              strokeWidth={flagged ? 2 : 0}
              opacity={flagged ? 1 : 0.55}
            />
          );
        })}
        <text x={363} y={186} fontSize={8} fill={deleted ? C.coral : C.muted} fontFamily={MONO} textAnchor="middle">
          {deleted ? "which 3 vectors encode it?" : "fact smeared across vectors"}
        </text>

        {/* scale / context-cost meter */}
        <text x={14} y={210} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          file in every prompt, context cost at {factCount.toLocaleString()} facts:
        </text>
        <rect x={14} y={218} width={300} height={12} rx={6} fill="var(--card)" stroke={C.line} />
        <rect x={14} y={218} width={300 * costFrac} height={12} rx={6} fill={costColor} opacity={0.85} />
        <text x={322} y={228} fontSize={8} fill={costColor} fontFamily={MONO}>
          {costFrac > 0.7 ? "wasteful → retrieve" : costFrac > 0.35 ? "getting heavy" : "fine"}
        </text>
      </svg>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <button
          type="button"
          className={btn}
          style={deleted ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setDeleted((d) => !d)}
        >
          {deleted ? "undo delete" : "delete a fact"}
        </button>
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          scale
          <input type="range" min={1} max={4} step={0.1} value={scaleExp} onChange={(e) => setScaleExp(Number(e.target.value))} />
          {factCount.toLocaleString()} facts
        </label>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Plain files are auditable and editable by hand: delete one line and the fact is gone. A vector DB makes you hunt for which
        embeddings encode it. But drag the scale up, past a few thousand facts the whole-file-in-every-prompt approach gets
        wasteful, and you layer on semantic retrieval after all.
      </p>
    </div>
  );
}
