"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Level 3: A Fixed Workflow — the human designs the chain; the AI fills fixed
// slots. A support-inbox pipeline: trigger (new email) -> AI classify ->
// route to a Slack channel -> AI draft a reply. The two AI slots are marked
// distinctly from the human-defined structure around them.
// Interactive: pick a sample email and "send" it through the fixed stages
// (AI slots light up as they act); swapping the category changes the routing
// while the pipeline shape stays identical.

interface Sample {
  id: string;
  category: string;
  subject: string;
  channel: string;
  draft: string;
}

const SAMPLES: Sample[] = [
  { id: "bug", category: "bug report", subject: "App crashes on upload", channel: "#engineering", draft: "Thanks for the report — we're on it." },
  { id: "billing", category: "billing", subject: "Charged twice this month", channel: "#billing", draft: "Sorry! Refunding the duplicate now." },
  { id: "feature", category: "feature request", subject: "Please add dark mode", channel: "#product", draft: "Great idea — logged for the team." },
];

interface Slot {
  id: string;
  x: number;
  title: string;
  ai: boolean; // true = AI fills this slot
}

const VB_W = 480;
const VB_H = 240;
const BOX_W = 102;
const BOX_H = 60;
const ROW_Y = 78;

const SLOTS: Slot[] = [
  { id: "trigger", x: 10, title: "Trigger", ai: false },
  { id: "classify", x: 130, title: "AI classify", ai: true },
  { id: "route", x: 250, title: "Route", ai: false },
  { id: "draft", x: 370, title: "AI draft", ai: true },
];

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-40 disabled:cursor-not-allowed";

export function AgtLevel3AFixedWorkflow() {
  const [selIdx, setSelIdx] = useState(0);
  const [stage, setStage] = useState(0); // 0..4
  const sample = SAMPLES[selIdx];

  const cx = (s: Slot) => s.x + BOX_W / 2;
  const done = stage >= SLOTS.length;

  const subFor = (s: Slot): string => {
    switch (s.id) {
      case "trigger":
        return "new email";
      case "classify":
        return stage > 1 ? sample.category : "category?";
      case "route":
        return stage > 2 ? sample.channel : "Slack channel";
      case "draft":
        return stage > 3 ? "reply ready" : "reply text";
      default:
        return "";
    }
  };

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Level 3: a fixed workflow pipeline">
        <defs>
          <marker id="l3-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.ink} />
          </marker>
          <marker id="l3-head-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.line} />
          </marker>
        </defs>

        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Level 3: A Fixed Workflow
        </text>
        <text x={VB_W / 2} y={32} fontSize={8.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          structure fixed by the human; AI fills two specific slots
        </text>

        {/* arrows */}
        {SLOTS.slice(0, -1).map((s, i) => {
          const live = stage > i + 1;
          return (
            <line
              key={`a-${i}`}
              x1={s.x + BOX_W}
              y1={ROW_Y + BOX_H / 2}
              x2={SLOTS[i + 1].x}
              y2={ROW_Y + BOX_H / 2}
              stroke={live ? C.ink : C.line}
              strokeWidth={live ? 2 : 1.2}
              markerEnd={live ? "url(#l3-head)" : "url(#l3-head-dim)"}
            />
          );
        })}

        {/* slots */}
        {SLOTS.map((s, i) => {
          const active = stage === i + 1;
          const visited = stage > i + 1;
          const accent = s.ai ? C.violet : C.muted;
          const accentFill = s.ai ? "#e7e3f7" : "var(--card)";
          return (
            <g key={s.id}>
              <rect
                x={s.x}
                y={ROW_Y}
                width={BOX_W}
                height={BOX_H}
                rx={6}
                fill={active || visited ? accentFill : "var(--card)"}
                stroke={active ? accent : visited ? accent : s.ai ? C.violet : C.line}
                strokeWidth={active ? 2.6 : s.ai ? 1.8 : 1.2}
                strokeDasharray={s.ai ? undefined : undefined}
              />
              {s.ai && (
                <text x={s.x + BOX_W - 8} y={ROW_Y + 13} fontSize={7.5} fill={C.violet} fontFamily={MONO} textAnchor="end" fontWeight={600}>
                  AI
                </text>
              )}
              <text x={cx(s)} y={ROW_Y + 26} fontSize={10.5} fill={s.ai ? C.violet : C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
                {s.title}
              </text>
              <text x={cx(s)} y={ROW_Y + 43} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="middle">
                {subFor(s)}
              </text>
            </g>
          );
        })}

        {/* legend */}
        <rect x={150} y={ROW_Y + BOX_H + 22} width={11} height={11} rx={2} fill="var(--card)" stroke={C.violet} strokeWidth={1.8} />
        <text x={167} y={ROW_Y + BOX_H + 31} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          AI slot
        </text>
        <rect x={230} y={ROW_Y + BOX_H + 22} width={11} height={11} rx={2} fill="var(--card)" stroke={C.line} strokeWidth={1.2} />
        <text x={247} y={ROW_Y + BOX_H + 31} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          human-defined
        </text>
      </svg>

      {/* email + controls */}
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="font-mono text-[11px] text-[var(--muted)]">
          inbound: <span className="text-[var(--foreground)]">&ldquo;{sample.subject}&rdquo;</span>
          {stage > 3 && (
            <>
              {" "}→ <span style={{ color: C.violet }}>draft: &ldquo;{sample.draft}&rdquo;</span>
            </>
          )}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className={btn} onClick={() => setStage((s) => Math.min(s + 1, SLOTS.length))} disabled={done}>
          {done ? "delivered" : stage === 0 ? "send email ▸" : "step ▸"}
        </button>
        <button type="button" className={btn} onClick={() => setStage(0)}>
          reset
        </button>
        <span className="font-mono text-[var(--muted)]">category:</span>
        {SAMPLES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={btn}
            style={i === selIdx ? { background: C.ink, color: "var(--background)" } : undefined}
            onClick={() => {
              setSelIdx(i);
              setStage(0);
            }}
          >
            {s.category}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Swap the category and the routing changes — but the pipeline&rsquo;s shape never does. The AI is a smart component, not the
        driver: it fills the classify and draft slots inside a structure the human fixed in advance.
      </p>
    </div>
  );
}
