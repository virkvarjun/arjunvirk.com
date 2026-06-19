"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Where Does Your Agent Live?, four Level-4 agents plotted on runs-locally ↔
// hosted (x) and you-own-state ↔ vendor-owns-state (y). Click an agent to
// expand its table row; toggle the convenience-vs-control lens to shade the
// local (private, you're the sysadmin) and hosted (easy, vendor holds data)
// halves.

interface AgentInfo {
  id: string;
  name: string;
  x: number; // 0 local .. 1 hosted
  y: number; // 0 you own .. 1 vendor owns
  color: string;
  open: string;
  runs: string;
  talk: string;
  owns: string;
  autonomy: string;
}

const AGENTS: AgentInfo[] = [
  { id: "openclaw", name: "OpenClaw", x: 0.12, y: 0.1, color: C.green, open: "Yes (MIT)", runs: "Your machine", talk: "Messaging apps", owns: "You (files on disk)", autonomy: "Heartbeat daemon" },
  { id: "claude", name: "Claude Code", x: 0.22, y: 0.58, color: C.blue, open: "No", runs: "Your machine", talk: "Terminal, IDE", owns: "Anthropic account", autonomy: "On-demand only" },
  { id: "chatgpt", name: "ChatGPT Agent", x: 0.84, y: 0.82, color: C.coral, open: "No", runs: "OpenAI cloud", talk: "ChatGPT app", owns: "OpenAI account", autonomy: "Per-task" },
  { id: "manus", name: "Manus", x: 0.9, y: 0.66, color: C.violet, open: "No", runs: "Manus cloud", talk: "Web dashboard", owns: "Manus account", autonomy: "Per-task" },
];

const VB_W = 480;
const VB_H = 300;
const PX = 74; // plot left (leaves room for the y-axis labels)
const PY = 40; // plot top
const PW = 348;
const PH = 200;
const mapX = (x: number) => PX + x * PW;
const mapY = (y: number) => PY + y * PH;

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtWhereDoesYourAgentLive() {
  const [sel, setSel] = useState<string>("openclaw");
  const [lens, setLens] = useState(false);
  const active = AGENTS.find((a) => a.id === sel)!;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Where your agent lives: local vs hosted, who owns state">
        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Where Does Your Agent Live?
        </text>

        {/* convenience/control shading */}
        {lens && (
          <>
            <rect x={PX} y={PY} width={PW / 2} height={PH} fill={C.greenFill} opacity={0.4} />
            <rect x={PX + PW / 2} y={PY} width={PW / 2} height={PH} fill={C.coralFill} opacity={0.4} />
            <text x={PX + PW / 4} y={PY + 16} fontSize={8.5} fill={C.green} fontFamily={MONO} textAnchor="middle">
              control (you sysadmin)
            </text>
            <text x={PX + (3 * PW) / 4} y={PY + 16} fontSize={8.5} fill={C.coral} fontFamily={MONO} textAnchor="middle">
              convenience (vendor holds data)
            </text>
          </>
        )}

        {/* axes */}
        <rect x={PX} y={PY} width={PW} height={PH} fill="none" stroke={C.line} strokeWidth={1} />
        {/* x axis labels */}
        <text x={PX} y={PY + PH + 16} fontSize={8} fill={C.muted} fontFamily={MONO}>
          runs locally
        </text>
        <text x={PX + PW} y={PY + PH + 16} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="end">
          hosted in cloud
        </text>
        {/* y axis labels */}
        <text x={PX - 6} y={PY + 8} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="end">
          vendor owns
        </text>
        <text x={PX - 6} y={PY + PH} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="end">
          you own
        </text>

        {/* points */}
        {AGENTS.map((a) => {
          const isSel = a.id === sel;
          return (
            <g key={a.id} style={{ cursor: "pointer" }} onClick={() => setSel(a.id)}>
              <circle cx={mapX(a.x)} cy={mapY(a.y)} r={isSel ? 9 : 6} fill={a.color} opacity={isSel ? 1 : 0.7} stroke={isSel ? C.ink : "none"} strokeWidth={isSel ? 1.5 : 0} />
              <text
                x={mapX(a.x) + (a.x > 0.6 ? -12 : 12)}
                y={mapY(a.y) + 4}
                fontSize={9}
                fill={isSel ? a.color : C.muted}
                fontFamily={MONO}
                textAnchor={a.x > 0.6 ? "end" : "start"}
                fontWeight={isSel ? 600 : 400}
              >
                {a.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* agent buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={btn}
            style={a.id === sel ? { background: C.ink, color: "var(--background)" } : undefined}
            onClick={() => setSel(a.id)}
          >
            {a.name}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1.5 font-mono text-[var(--muted)]">
          <input type="checkbox" checked={lens} onChange={(e) => setLens(e.target.checked)} />
          convenience vs control
        </label>
      </div>

      {/* expanded row */}
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="font-mono text-xs font-semibold" style={{ color: active.color }}>
          {active.name}
        </p>
        <dl className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {[
            ["Open source", active.open],
            ["Where it runs", active.runs],
            ["Where you talk to it", active.talk],
            ["Who owns state", active.owns],
            ["Autonomy mode", active.autonomy],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 font-mono text-[11px]">
              <dt className="text-[var(--muted)]">{k}</dt>
              <dd className="text-right text-[var(--foreground)]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        The real axis isn&rsquo;t features, it&rsquo;s where the agent runs and who owns what it learns about you. Hosted agents are
        an easy start but the vendor holds your data; local agents are private and controllable but make you the sysadmin.
      </p>
    </div>
  );
}
