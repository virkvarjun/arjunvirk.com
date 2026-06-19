"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The Heartbeat Loop, what makes OpenClaw autonomous. A timer fires (every
// 30 min), the agent reads HEARTBEAT.md, decides act-or-skip, and either takes
// action (messages you) or replies the sentinel HEARTBEAT_OK, which the gateway
// silently drops. Interactive: tick the timer; toggle checklist items between
// "needs action" and "fine" and watch the branch taken; the clock advances so
// ticks happen "while you're away".

interface Item {
  id: string;
  label: string;
}

const ITEMS: Item[] = [
  { id: "email", label: "Unread urgent email?" },
  { id: "digest", label: "Monday 9am, post digest?" },
  { id: "issues", label: "New GitHub issues to triage?" },
  { id: "rent", label: "Rent due in 3 days?" },
];

const VB_W = 480;
const VB_H = 210;

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

function fmtClock(ticks: number): string {
  // start 08:00, +30 min per tick
  const total = 8 * 60 + ticks * 30;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function AgtTheHeartbeatLoop() {
  const [needs, setNeeds] = useState<Record<string, boolean>>({});
  const [ticks, setTicks] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const anyAction = ITEMS.some((it) => needs[it.id]);

  const tick = () => {
    const t = ticks + 1;
    setTicks(t);
    const triggered = ITEMS.filter((it) => needs[it.id]).map((it) => it.label);
    if (triggered.length > 0) {
      setLog((l) => [`${fmtClock(t)}  →  message sent: ${triggered.length} item(s) need action`, ...l].slice(0, 6));
    } else {
      setLog((l) => [`${fmtClock(t)}  →  HEARTBEAT_OK (dropped, you sleep on)`, ...l].slice(0, 6));
    }
  };

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="The heartbeat loop: tick, read checklist, act or emit HEARTBEAT_OK">
        <defs>
          <marker id="hb-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.muted} />
          </marker>
        </defs>

        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          The Heartbeat Loop
        </text>

        {/* timer */}
        <rect x={14} y={70} width={96} height={50} rx={8} fill={C.coralFill} stroke={C.coral} strokeWidth={1.4} />
        <text x={62} y={92} fontSize={10} fill={C.coral} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          ⏱ Timer
        </text>
        <text x={62} y={107} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          every 30 min
        </text>

        {/* read checklist */}
        <rect x={134} y={70} width={96} height={50} rx={8} fill="var(--card)" stroke={C.line} strokeWidth={1.2} />
        <text x={182} y={90} fontSize={9} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Read
        </text>
        <text x={182} y={104} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          HEARTBEAT.md
        </text>

        {/* decide */}
        <rect x={254} y={70} width={96} height={50} rx={8} fill={C.blueFill} stroke={C.blue} strokeWidth={1.4} />
        <text x={302} y={90} fontSize={9} fill={C.blue} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Decide
        </text>
        <text x={302} y={104} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          act or skip?
        </text>

        {/* branches */}
        <rect x={374} y={36} width={98} height={40} rx={7} fill={anyAction ? C.greenFill : "var(--card)"} stroke={anyAction ? C.green : C.line} strokeWidth={anyAction ? 2.2 : 1.2} />
        <text x={423} y={52} fontSize={8.5} fill={anyAction ? C.green : C.muted} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Take action
        </text>
        <text x={423} y={65} fontSize={7.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          message you
        </text>

        <rect x={374} y={112} width={98} height={40} rx={7} fill={!anyAction ? C.coralFill : "var(--card)"} stroke={!anyAction ? C.coral : C.line} strokeWidth={!anyAction ? 2.2 : 1.2} opacity={!anyAction ? 1 : 0.5} />
        <text x={423} y={128} fontSize={8} fill={!anyAction ? C.coral : C.muted} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          HEARTBEAT_OK
        </text>
        <text x={423} y={141} fontSize={7} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          silently dropped
        </text>

        {/* flow arrows */}
        <line x1={110} y1={95} x2={134} y2={95} stroke={C.muted} strokeWidth={1.2} markerEnd="url(#hb-head)" />
        <line x1={230} y1={95} x2={254} y2={95} stroke={C.muted} strokeWidth={1.2} markerEnd="url(#hb-head)" />
        <line x1={350} y1={88} x2={374} y2={62} stroke={anyAction ? C.green : C.line} strokeWidth={anyAction ? 2 : 1.2} markerEnd="url(#hb-head)" />
        <line x1={350} y1={102} x2={374} y2={128} stroke={!anyAction ? C.coral : C.line} strokeWidth={!anyAction ? 2 : 1.2} markerEnd="url(#hb-head)" />
        {/* return to timer */}
        <path d={`M 62 120 C 62 175, 423 178, 423 152`} fill="none" stroke={C.line} strokeWidth={1.2} strokeDasharray="3 3" markerEnd="url(#hb-head)" />
        <text x={240} y={188} fontSize={7.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          back to sleep until the next tick
        </text>

        {/* clock */}
        <text x={VB_W - 10} y={16} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="end">
          {fmtClock(ticks)}
        </text>
      </svg>

      {/* checklist toggles */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[var(--muted)]">checklist:</span>
        {ITEMS.map((it) => (
          <button
            key={it.id}
            type="button"
            className={btn}
            style={needs[it.id] ? { background: C.green, color: "var(--background)" } : undefined}
            onClick={() => setNeeds((n) => ({ ...n, [it.id]: !n[it.id] }))}
          >
            {needs[it.id] ? "● " : "○ "}
            {it.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className={btn} onClick={tick}>
          tick ▸
        </button>
        <button type="button" className={btn} onClick={() => { setTicks(0); setLog([]); }}>
          reset
        </button>
      </div>

      {/* tick log */}
      {log.length > 0 && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          {log.map((l, i) => (
            <p key={i} className="font-mono text-[11px] leading-relaxed" style={{ color: l.includes("OK") ? C.coral : C.green }}>
              {l}
            </p>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-[var(--muted)]">
        On every tick the agent reads its checklist and decides. Silence, the exact string <code className="font-mono">HEARTBEAT_OK</code>, is
        dropped; anything else reaches you. Toggle an item to &ldquo;needs action&rdquo; and tick again to see it surface a message.
      </p>
    </div>
  );
}
