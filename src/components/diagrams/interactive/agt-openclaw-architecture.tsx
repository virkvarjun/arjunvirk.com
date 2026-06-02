"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// OpenClaw Architecture — one local gateway process with five subsystems;
// the model is the only external dependency. Messaging channels (and a
// heartbeat timer) feed in on the left; local files (workspace, memory,
// skills) sit along the bottom; the agent runtime reaches out to a single
// Model API. Click a subsystem for its one-line job, or trace a message
// through the five stages.

interface Sub {
  id: string;
  title: string;
  job: string;
  x: number;
  y: number;
}

const VB_W = 480;
const VB_H = 320;

// gateway interior box
const GW_X = 120;
const GW_Y = 44;
const GW_W = 280;
const GW_H = 200;

const SUB_W = 120;
const SUB_H = 30;

const SUBS: Sub[] = [
  { id: "adapters", title: "Channel adapters", job: "Normalize inbound messages to one internal format; serialize replies back out.", x: GW_X + 16, y: GW_Y + 30 },
  { id: "session", title: "Session manager", job: "Resolve who's talking and in what context — DMs collapse to one session, group chats get their own.", x: GW_X + 16, y: GW_Y + 70 },
  { id: "queue", title: "Queue", job: "Serialize runs per session so messages arriving mid-run don't cause race conditions.", x: GW_X + 16, y: GW_Y + 110 },
  { id: "runtime", title: "Agent runtime", job: "The heart: assemble context from the Markdown files and run the agent loop until done.", x: GW_X + 144, y: GW_Y + 50 },
  { id: "control", title: "Control plane", job: "A WebSocket API (port 18789) every client connects to: CLI, macOS app, web UI, mobile.", x: GW_X + 144, y: GW_Y + 110 },
];

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtOpenclawArchitecture() {
  const [sel, setSel] = useState<string>("runtime");
  const active = SUBS.find((s) => s.id === sel) ?? SUBS[0];

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="OpenClaw architecture: one gateway process, five subsystems, the model as the only external dependency">
        <defs>
          <marker id="oc-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.muted} />
          </marker>
        </defs>

        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          OpenClaw Architecture
        </text>

        {/* left: channels + heartbeat */}
        {["WhatsApp", "Telegram", "Slack", "Heartbeat"].map((ch, i) => {
          const y = GW_Y + 24 + i * 42;
          const isTimer = ch === "Heartbeat";
          return (
            <g key={ch}>
              <rect x={10} y={y} width={92} height={30} rx={5} fill="var(--card)" stroke={isTimer ? C.coral : C.line} strokeWidth={1.2} strokeDasharray={isTimer ? "3 2" : undefined} />
              <text x={56} y={y + 19} fontSize={9} fill={isTimer ? C.coral : C.ink} fontFamily={MONO} textAnchor="middle">
                {isTimer ? "⏱ " + ch : ch}
              </text>
              <line x1={102} y1={y + 15} x2={GW_X} y2={y + 15} stroke={C.line} strokeWidth={1.2} markerEnd="url(#oc-head)" />
            </g>
          );
        })}

        {/* gateway box */}
        <rect x={GW_X} y={GW_Y} width={GW_W} height={GW_H} rx={9} fill="var(--background)" stroke={C.ink} strokeWidth={1.6} />
        <text x={GW_X + 10} y={GW_Y + 17} fontSize={9.5} fill={C.ink} fontFamily={MONO} fontWeight={600}>
          Gateway process (local)
        </text>

        {/* subsystems */}
        {SUBS.map((s) => {
          const isSel = s.id === sel;
          return (
            <g key={s.id} style={{ cursor: "pointer" }} onClick={() => setSel(s.id)}>
              <rect
                x={s.x}
                y={s.y}
                width={SUB_W}
                height={SUB_H}
                rx={5}
                fill={isSel ? C.blueFill : "var(--card)"}
                stroke={isSel ? C.blue : C.line}
                strokeWidth={isSel ? 2.2 : 1.2}
              />
              <text x={s.x + SUB_W / 2} y={s.y + 19} fontSize={8.5} fill={isSel ? C.blue : C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={isSel ? 600 : 400}>
                {s.title}
              </text>
            </g>
          );
        })}

        {/* local files strip */}
        <rect x={GW_X + 16} y={GW_Y + GW_H - 34} width={GW_W - 32} height={24} rx={5} fill={C.greenFill} stroke={C.green} strokeWidth={1.2} />
        <text x={GW_X + GW_W / 2} y={GW_Y + GW_H - 18} fontSize={8} fill={C.green} fontFamily={MONO} textAnchor="middle">
          Local files: workspace · memory · skills (Markdown + YAML on disk)
        </text>

        {/* external Model API */}
        <rect x={410} y={GW_Y + 50} width={62} height={50} rx={6} fill={C.coralFill} stroke={C.coral} strokeWidth={2} />
        <text x={441} y={GW_Y + 70} fontSize={9} fill={C.coral} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Model
        </text>
        <text x={441} y={GW_Y + 84} fontSize={8} fill={C.coral} fontFamily={MONO} textAnchor="middle">
          API
        </text>
        <text x={441} y={GW_Y + 96} fontSize={6.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          cloud/local
        </text>
        {/* runtime -> model link */}
        <line x1={SUBS[3].x + SUB_W} y1={SUBS[3].y + SUB_H / 2} x2={410} y2={GW_Y + 75} stroke={C.coral} strokeWidth={1.6} markerEnd="url(#oc-head)" />
        <text x={400} y={GW_Y + 40} fontSize={7.5} fill={C.coral} fontFamily={MONO} textAnchor="end">
          only external dep
        </text>

        {/* selected job readout */}
        <rect x={GW_X} y={GW_Y + GW_H + 14} width={GW_W} height={44} rx={6} fill="var(--card)" stroke={C.blue} strokeWidth={1.2} />
        <text x={GW_X + 10} y={GW_Y + GW_H + 30} fontSize={9.5} fill={C.blue} fontFamily={MONO} fontWeight={600}>
          {active.title}
        </text>
      </svg>

      {/* job text below (wraps cleanly in HTML) */}
      <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="font-mono text-xs font-semibold" style={{ color: C.blue }}>
          {active.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{active.job}</p>
      </div>

      {/* subsystem buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={btn}
            style={s.id === sel ? { background: C.ink, color: "var(--background)" } : undefined}
            onClick={() => setSel(s.id)}
          >
            {s.title}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Five subsystems in one local process. The model is the only thing that lives off your machine — channels, memory, state,
        and skills all stay on your hardware as plain files.
      </p>
    </div>
  );
}
