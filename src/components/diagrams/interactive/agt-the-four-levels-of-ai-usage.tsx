"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The Four Levels of AI Usage — a ladder where each rung adds autonomy AND
// the risk you have to manage. Click a level to read it and see who's driving
// (human vs AI), what the human's job becomes, and the autonomy/risk meters
// rising together as you climb.

interface Level {
  n: number;
  name: string;
  blurb: string;
  detail: string;
  driver: number; // 0 = all human, 1 = all AI
  humanJob: string;
  color: string;
  fill: string;
}

const LEVELS: Level[] = [
  {
    n: 1,
    name: "Chat",
    blurb: "Ask, copy, paste. Human does everything else.",
    detail: "No memory, no files, no actions — just text. Right when the hard part is thinking, not doing.",
    driver: 0.1,
    humanJob: "integrator",
    color: C.muted,
    fill: "var(--card)",
  },
  {
    n: 2,
    name: "Tools",
    blurb: "Model calls APIs, runs code, fetches data on demand.",
    detail: "One round trip grounds the answer in real data — but adds tool-use failure modes (wrong tool, bad query).",
    driver: 0.35,
    humanJob: "supervisor",
    color: C.green,
    fill: C.greenFill,
  },
  {
    n: 3,
    name: "Workflows",
    blurb: "Predefined chains of steps. AI fills fixed slots.",
    detail: "You design the structure up front; the AI is a smart cog inside a pipeline you built (Zapier, n8n, LangGraph).",
    driver: 0.6,
    humanJob: "designer",
    color: C.coral,
    fill: C.coralFill,
  },
  {
    n: 4,
    name: "Agents",
    blurb: "Loops on its own, decides next step, acts unprompted.",
    detail: "Goal + tools + freedom to choose what, in what order, for how long. The model writes the plan. Real power, real risk.",
    driver: 0.9,
    humanJob: "goal-setter",
    color: C.blue,
    fill: C.blueFill,
  },
];

const VB_W = 480;
const VB_H = 300;

// ladder geometry — bottom (level 1) to top (level 4)
const BAR_X = 70;
const BAR_W = 250;
const BAR_H = 46;
const GAP = 10;
const BASE_Y = 256; // bottom of level 1
const rowY = (i: number) => BASE_Y - BAR_H - i * (BAR_H + GAP);

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtTheFourLevelsOfAiUsage() {
  const [sel, setSel] = useState(0); // index into LEVELS
  const level = LEVELS[sel];

  // meter fill fraction grows with selected level (1..4 -> 0.25..1)
  const meter = (sel + 1) / LEVELS.length;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="The four levels of AI usage as a ladder of rising autonomy and risk">
        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          The Four Levels of AI Usage
        </text>

        {/* rising axis arrow on the left */}
        <line x1={40} y1={BASE_Y} x2={40} y2={28} stroke={C.muted} strokeWidth={1.4} markerEnd="url(#fl-up)" />
        <defs>
          <marker id="fl-up" markerWidth="8" markerHeight="8" refX="3" refY="6" orient="auto">
            <path d="M0,6 L3,0 L6,6 Z" fill={C.muted} />
          </marker>
        </defs>
        <text x={34} y={150} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle" transform="rotate(-90 34 150)">
          autonomy ↑   risk you manage ↑
        </text>

        {/* ladder bars */}
        {LEVELS.map((lv, i) => {
          const y = rowY(i);
          const isSel = i === sel;
          return (
            <g key={lv.n} style={{ cursor: "pointer" }} onClick={() => setSel(i)}>
              <rect
                x={BAR_X}
                y={y}
                width={BAR_W}
                height={BAR_H}
                rx={6}
                fill={isSel ? lv.fill : "var(--card)"}
                stroke={isSel ? lv.color : C.line}
                strokeWidth={isSel ? 2.4 : 1.2}
              />
              <text x={BAR_X + 12} y={y + 19} fontSize={11} fill={lv.color === C.muted ? C.ink : lv.color} fontFamily={MONO} fontWeight={600}>
                {`L${lv.n} · ${lv.name}`}
              </text>
              <text x={BAR_X + 12} y={y + 35} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
                {lv.blurb.length > 46 ? lv.blurb.slice(0, 45) + "…" : lv.blurb}
              </text>
            </g>
          );
        })}

        {/* who's driving + meters panel (right) */}
        <g>
          <text x={345} y={48} fontSize={9} fill={C.muted} fontFamily={MONO}>
            who&apos;s driving?
          </text>
          {/* driver bar: human (left) vs AI (right) */}
          <rect x={345} y={54} width={110} height={12} rx={6} fill="var(--card)" stroke={C.line} />
          <rect x={345} y={54} width={110 * level.driver} height={12} rx={6} fill={C.blue} opacity={0.8} />
          <text x={345} y={80} fontSize={7.5} fill={C.muted} fontFamily={MONO}>
            human
          </text>
          <text x={455} y={80} fontSize={7.5} fill={C.muted} fontFamily={MONO} textAnchor="end">
            AI
          </text>

          {/* autonomy meter */}
          <text x={345} y={108} fontSize={9} fill={C.muted} fontFamily={MONO}>
            autonomy
          </text>
          <rect x={345} y={114} width={110} height={10} rx={5} fill="var(--card)" stroke={C.line} />
          <rect x={345} y={114} width={110 * meter} height={10} rx={5} fill={C.green} opacity={0.8} />

          {/* risk meter */}
          <text x={345} y={140} fontSize={9} fill={C.muted} fontFamily={MONO}>
            risk you manage
          </text>
          <rect x={345} y={146} width={110} height={10} rx={5} fill="var(--card)" stroke={C.line} />
          <rect x={345} y={146} width={110 * meter} height={10} rx={5} fill={C.coral} opacity={0.85} />

          {/* human's job */}
          <text x={345} y={178} fontSize={9} fill={C.muted} fontFamily={MONO}>
            human&apos;s job:
          </text>
          <text x={345} y={194} fontSize={11} fill={level.color === C.muted ? C.ink : level.color} fontFamily={MONO} fontWeight={600}>
            {level.humanJob}
          </text>
        </g>
      </svg>

      {/* level buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {LEVELS.map((lv, i) => (
          <button
            key={lv.n}
            type="button"
            className={btn}
            style={i === sel ? { background: C.ink, color: "var(--background)" } : undefined}
            onClick={() => setSel(i)}
          >
            {`L${lv.n} ${lv.name}`}
          </button>
        ))}
      </div>

      {/* expanded detail */}
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="font-mono text-xs font-semibold" style={{ color: level.color === C.muted ? "var(--foreground)" : level.color }}>
          {`Level ${level.n}: ${level.name}`}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{level.detail}</p>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Each rung hands more of the work to the model — and an equal measure of risk to you. The human shifts from doing the work
        (integrator) to setting the goal and supervising (goal-setter) as you climb.
      </p>
    </div>
  );
}
