"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// An Inbound Message's Journey Through OpenClaw — a single message travels
// the five subsystems in order: adapter (normalize) -> session manager (which
// conversation?) -> queue (run now or hold?) -> agent runtime (think/act/
// observe) -> reply serialized back out the adapter.
// Interactive: step the journey; pick DM vs group chat to see session routing;
// fire a second message mid-run and watch the queue hold it.

interface Stop {
  id: string;
  title: string;
  x: number;
}

const VB_W = 480;
const VB_H = 250;
const BOX_W = 84;
const BOX_H = 54;
const ROW_Y = 96;

const STOPS: Stop[] = [
  { id: "adapter", title: "Adapter", x: 8 },
  { id: "session", title: "Session mgr", x: 104 },
  { id: "queue", title: "Queue", x: 200 },
  { id: "runtime", title: "Runtime", x: 296 },
  { id: "reply", title: "Reply out", x: 392 },
];

const SUB: Record<string, string> = {
  adapter: "normalize",
  session: "which convo?",
  queue: "run or hold?",
  runtime: "think/act/obs",
  reply: "serialize",
};

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-40 disabled:cursor-not-allowed";

export function AgtAnInboundMessageSJourneyThroughOpenclaw() {
  const [stage, setStage] = useState(0); // 0..5
  const [isGroup, setIsGroup] = useState(false);
  const [secondMsg, setSecondMsg] = useState(false);

  const cx = (s: Stop) => s.x + BOX_W / 2;
  const done = stage >= STOPS.length;
  // the second message is "held" while the runtime stage is active/being processed
  const held = secondMsg && stage >= 3 && stage < STOPS.length;

  const subFor = (s: Stop): string => {
    if (s.id === "session" && stage > 1) return isGroup ? "→ group session" : "→ main session";
    if (s.id === "queue" && stage > 2) return held ? "holds #2" : "run now";
    return SUB[s.id];
  };

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="An inbound message's journey through OpenClaw's five subsystems">
        <defs>
          <marker id="jn-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.ink} />
          </marker>
          <marker id="jn-head-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.line} />
          </marker>
        </defs>

        <text x={VB_W / 2} y={16} fontSize={12.5} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          An Inbound Message&apos;s Journey
        </text>

        {/* incoming message badge */}
        <text x={cx(STOPS[0])} y={ROW_Y - 26} fontSize={9} fill={stage > 0 ? C.green : C.muted} fontFamily={MONO} textAnchor="middle">
          {stage > 0 ? "📨 message in" : "📨 waiting"}
        </text>

        {/* arrows */}
        {STOPS.slice(0, -1).map((s, i) => {
          const live = stage > i + 1;
          return (
            <line
              key={`a-${i}`}
              x1={s.x + BOX_W}
              y1={ROW_Y + BOX_H / 2}
              x2={STOPS[i + 1].x}
              y2={ROW_Y + BOX_H / 2}
              stroke={live ? C.ink : C.line}
              strokeWidth={live ? 2 : 1.2}
              markerEnd={live ? "url(#jn-head)" : "url(#jn-head-dim)"}
            />
          );
        })}

        {/* stops */}
        {STOPS.map((s, i) => {
          const active = stage === i + 1;
          const visited = stage > i + 1;
          return (
            <g key={s.id}>
              <rect
                x={s.x}
                y={ROW_Y}
                width={BOX_W}
                height={BOX_H}
                rx={6}
                fill={active || visited ? C.blueFill : "var(--card)"}
                stroke={active ? C.blue : visited ? C.blue : C.line}
                strokeWidth={active ? 2.6 : 1.2}
              />
              <text x={cx(s)} y={ROW_Y + 23} fontSize={9} fill={active || visited ? C.blue : C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
                {s.title}
              </text>
              <text x={cx(s)} y={ROW_Y + 39} fontSize={7.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
                {subFor(s)}
              </text>
            </g>
          );
        })}

        {/* held second message badge above the queue */}
        {held && (
          <g>
            <rect x={STOPS[2].x} y={ROW_Y - 34} width={BOX_W} height={22} rx={5} fill={C.coralFill} stroke={C.coral} strokeWidth={1.4} />
            <text x={cx(STOPS[2])} y={ROW_Y - 19} fontSize={7.5} fill={C.coral} fontFamily={MONO} textAnchor="middle">
              msg #2 held
            </text>
          </g>
        )}

        {/* runtime loop hint */}
        {stage >= 4 && (
          <text x={cx(STOPS[3])} y={ROW_Y + BOX_H + 18} fontSize={7.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
            ↻ loop runs
          </text>
        )}

        {/* return path */}
        {done && (
          <>
            <path
              d={`M ${cx(STOPS[4])} ${ROW_Y + BOX_H} C ${cx(STOPS[4])} ${ROW_Y + BOX_H + 48}, ${cx(STOPS[0])} ${ROW_Y + BOX_H + 48}, ${cx(STOPS[0])} ${ROW_Y + BOX_H + 4}`}
              fill="none"
              stroke={C.green}
              strokeWidth={2}
              strokeDasharray="4 3"
              markerEnd="url(#jn-head)"
            />
            <text x={VB_W / 2} y={ROW_Y + BOX_H + 42} fontSize={8} fill={C.green} fontFamily={MONO} textAnchor="middle">
              reply back out the same adapter
            </text>
          </>
        )}
      </svg>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className={btn} onClick={() => setStage((s) => Math.min(s + 1, STOPS.length))} disabled={done}>
          {done ? "replied" : stage === 0 ? "send message ▸" : "step ▸"}
        </button>
        <button type="button" className={btn} onClick={() => setStage(0)}>
          reset
        </button>
        <label className="flex items-center gap-1.5 font-mono text-[var(--muted)]">
          <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} />
          group chat
        </label>
        <label className="flex items-center gap-1.5 font-mono text-[var(--muted)]">
          <input type="checkbox" checked={secondMsg} onChange={(e) => setSecondMsg(e.target.checked)} />
          fire a 2nd message
        </label>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Normalize, identify the conversation, serialize the run, loop — then reply back through the same adapter. A DM collapses
        into the main session; a group chat gets its own. A message arriving mid-run is held by the queue instead of racing.
      </p>
    </div>
  );
}
