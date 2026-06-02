"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Just-in-Time Skill Loading — the agent keeps only a lightweight index of
// skill names + descriptions; when a task matches, it loads that one SKILL.md
// into context and executes. Interactive: pick a user message and watch the
// index match a skill (or none); toggle "load all vs JIT" to see the context
// meter stay lean (JIT) or blow past its limit (all).

interface Skill {
  id: string;
  name: string;
  desc: string;
  weight: number; // approx context cost when loaded (arbitrary units)
}

const SKILLS: Skill[] = [
  { id: "car", name: "car-negotiation", desc: "buy a vehicle, beat dealer quotes", weight: 26 },
  { id: "inbox", name: "inbox-triage", desc: "classify + route incoming email", weight: 22 },
  { id: "research", name: "deep-research", desc: "multi-source research reports", weight: 30 },
  { id: "deploy", name: "deploy-site", desc: "build and ship a landing page", weight: 24 },
];

const MESSAGES: { text: string; match: string | null }[] = [
  { text: "Buy me a 2026 Palisade", match: "car" },
  { text: "Sort my inbox", match: "inbox" },
  { text: "Research RISC-V adoption", match: "research" },
  { text: "What's 2 + 2?", match: null },
];

const VB_W = 480;
const VB_H = 230;
const INDEX_FRACTION = 4; // index costs ~1/4 of a single skill body

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtJustInTimeSkillLoading() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [loadAll, setLoadAll] = useState(false);

  const msg = MESSAGES[msgIdx];
  const matched = msg.match ? SKILLS.find((s) => s.id === msg.match)! : null;

  const LIMIT = 60; // context budget units
  const indexCost = SKILLS.reduce((a, s) => a + s.weight, 0) / INDEX_FRACTION; // lightweight listing
  const loadedCost = loadAll
    ? SKILLS.reduce((a, s) => a + s.weight, 0)
    : matched
      ? matched.weight
      : 0;
  const total = indexCost + loadedCost;
  const frac = Math.min(1, total / LIMIT);
  const over = total > LIMIT;
  const meterColor = over ? C.coral : frac > 0.7 ? "#c79a3a" : C.green;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Just-in-time skill loading keeps the context window lean">
        <defs>
          <marker id="jit-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.muted} />
          </marker>
        </defs>

        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Just-in-Time Skill Loading
        </text>

        {/* user message */}
        <rect x={14} y={34} width={150} height={34} rx={6} fill="var(--card)" stroke={C.line} strokeWidth={1.2} />
        <text x={22} y={48} fontSize={7.5} fill={C.muted} fontFamily={MONO}>
          user message
        </text>
        <text x={22} y={61} fontSize={8.5} fill={C.ink} fontFamily={MONO}>
          &ldquo;{msg.text.length > 24 ? msg.text.slice(0, 23) + "…" : msg.text}&rdquo;
        </text>

        {/* skill index */}
        <text x={14} y={90} fontSize={9} fill={C.blue} fontFamily={MONO} fontWeight={600}>
          Skill index (names + descriptions only)
        </text>
        {SKILLS.map((s, i) => {
          const y = 98 + i * 28;
          const isMatch = matched?.id === s.id;
          const isLoaded = loadAll || isMatch;
          return (
            <g key={s.id}>
              <rect x={14} y={y} width={210} height={24} rx={5} fill={isMatch ? C.blueFill : "var(--card)"} stroke={isMatch ? C.blue : C.line} strokeWidth={isMatch ? 2 : 1} />
              <text x={22} y={y + 15} fontSize={8.5} fill={isMatch ? C.blue : C.ink} fontFamily={MONO} fontWeight={isMatch ? 600 : 400}>
                {s.name}
              </text>
              {isLoaded && (
                <text x={216} y={y + 15} fontSize={7.5} fill={loadAll && !isMatch ? C.coral : C.green} fontFamily={MONO} textAnchor="end">
                  loaded
                </text>
              )}
            </g>
          );
        })}

        {/* match -> load -> execute */}
        <line x1={224} y1={150} x2={250} y2={150} stroke={C.muted} strokeWidth={1.2} markerEnd="url(#jit-head)" />
        <rect x={250} y={120} width={104} height={28} rx={6} fill={matched ? C.greenFill : "var(--card)"} stroke={matched ? C.green : C.line} strokeWidth={matched ? 2 : 1.2} />
        <text x={302} y={138} fontSize={8.5} fill={matched ? C.green : C.muted} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          {matched ? "Load SKILL.md" : "no match"}
        </text>
        <rect x={250} y={156} width={104} height={28} rx={6} fill="var(--card)" stroke={C.line} strokeWidth={1.2} opacity={matched ? 1 : 0.4} />
        <text x={302} y={174} fontSize={8.5} fill={matched ? C.ink : C.muted} fontFamily={MONO} textAnchor="middle">
          Execute procedure
        </text>

        {/* context meter */}
        <text x={366} y={98} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          context window
        </text>
        <rect x={366} y={104} width={20} height={80} rx={4} fill="var(--card)" stroke={C.line} />
        <rect x={366} y={104 + 80 * (1 - frac)} width={20} height={80 * frac} rx={4} fill={meterColor} opacity={0.85} />
        {/* limit line */}
        <line x1={362} y1={104} x2={390} y2={104} stroke={C.coral} strokeWidth={1} strokeDasharray="2 2" />
        <text x={394} y={108} fontSize={7} fill={C.coral} fontFamily={MONO}>
          limit
        </text>
        <text x={376} y={196} fontSize={7.5} fill={meterColor} fontFamily={MONO} textAnchor="middle">
          {over ? "over!" : "lean"}
        </text>
      </svg>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[var(--muted)]">message:</span>
        {MESSAGES.map((m, i) => (
          <button
            key={i}
            type="button"
            className={btn}
            style={i === msgIdx ? { background: C.ink, color: "var(--background)" } : undefined}
            onClick={() => setMsgIdx(i)}
          >
            {m.text.length > 20 ? m.text.slice(0, 19) + "…" : m.text}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5 font-mono text-[var(--muted)]">
          <input type="checkbox" checked={loadAll} onChange={(e) => setLoadAll(e.target.checked)} />
          load all skills (instead of just-in-time)
        </label>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Keep a lightweight index of skills; pull the full SKILL.md into context only when a task matches — the same trick Claude
        Code uses. Flip to &ldquo;load all&rdquo; and the context meter blows past its limit; just-in-time keeps it comfortable.
      </p>
    </div>
  );
}
