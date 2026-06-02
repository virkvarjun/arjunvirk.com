"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The Whole Agent Picture — capstone arc of the chapter. Seven stages connect
// left to right; two through-lines can be toggled to show where "the agent
// loop" and "just-in-time / files on disk" recur. Click a stage for its
// summary; the final stage expands the trifecta defenses.

type ThreadId = "loop" | "jit";

interface Stage {
  id: string;
  short: string;
  sub: string;
  summary: string;
  threads: ThreadId[];
  color: string;
  fill: string;
}

const STAGES: Stage[] = [
  { id: "loop", short: "Agent loop", sub: "think/act/observe", summary: "The single engine under every framework: reason, call a tool, observe, repeat — until a final answer.", threads: ["loop"], color: C.blue, fill: C.blueFill },
  { id: "levels", short: "Four levels", sub: "chat → agents", summary: "Chat, Tools, Workflows, Agents — each rung adds autonomy and an equal measure of risk to manage.", threads: [], color: C.green, fill: C.greenFill },
  { id: "openclaw", short: "OpenClaw", sub: "files + heartbeat", summary: "A local gateway whose state is plain Markdown files; the agent loop runs each turn and the heartbeat makes it autonomous.", threads: ["loop", "jit"], color: C.coral, fill: C.coralFill },
  { id: "toolcall", short: "Tool call", sub: "JSON → runtime", summary: "The model only emits JSON describing the call; your runtime executes it. That gap is what makes agents auditable.", threads: [], color: C.violet, fill: "#e7e3f7" },
  { id: "mcp", short: "MCP", sub: "N+M standard", summary: "One standard of hosts, clients, and servers (tools, resources, prompts) collapses the N×M integration explosion to N+M.", threads: ["jit"], color: C.blue, fill: C.blueFill },
  { id: "patterns", short: "Patterns + context", sub: "scale a loop", summary: "Multi-agent patterns (ReAct, orchestrator, evaluator, planner) and context management keep one agent sharp over a long horizon.", threads: ["loop", "jit"], color: C.green, fill: C.greenFill },
  { id: "trifecta", short: "Lethal trifecta", sub: "defend by design", summary: "Private data + external comms + untrusted content = exfiltration. Defend architecturally, not with pleading prompts.", threads: [], color: C.coral, fill: C.coralFill },
];

const THREADS: { id: ThreadId; label: string; color: string }[] = [
  { id: "loop", label: "the agent loop", color: C.blue },
  { id: "jit", label: "just-in-time / files on disk", color: C.coral },
];

const DEFENSES = ["Read-only network", "Separate agents / permissions", "Human-in-the-loop approval", "Treat tool output as data"];

const VB_W = 720;
const VB_H = 320;
const MARGIN = 16;
const NODE_W = 150;
const NODE_H = 56;
const ROW0_Y = 70;
const ROW1_Y = 180;
const COLS = 4;
const colGap = (VB_W - 2 * MARGIN - COLS * NODE_W) / (COLS - 1);

function nodePos(i: number): { x: number; y: number; row: number } {
  if (i < COLS) return { x: MARGIN + i * (NODE_W + colGap), y: ROW0_Y, row: 0 };
  const j = i - COLS; // 0..2
  const col = COLS - 1 - j; // 3,2,1
  return { x: MARGIN + col * (NODE_W + colGap), y: ROW1_Y, row: 1 };
}

const SKIP_Y0 = ROW0_Y + NODE_H + 12;
const SKIP_Y1 = ROW1_Y + NODE_H + 12;

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtTheWholeAgentPicture() {
  const [sel, setSel] = useState<string>("loop");
  const [threadsOn, setThreadsOn] = useState<Record<ThreadId, boolean>>({ loop: false, jit: false });

  const active = STAGES.find((s) => s.id === sel)!;
  const toggleThread = (id: ThreadId) => setThreadsOn((p) => ({ ...p, [id]: !p[id] }));

  const threadPoints = (id: ThreadId): string =>
    STAGES.map((s, i) => ({ s, i }))
      .filter(({ s }) => s.threads.includes(id))
      .map(({ i }) => {
        const p = nodePos(i);
        return `${p.x + NODE_W / 2},${p.row === 0 ? SKIP_Y0 : SKIP_Y1}`;
      })
      .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="The whole agent picture: the chapter as one connected arc">
        <text x={VB_W / 2} y={22} fontSize={14} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          The Whole Agent Picture
        </text>
        <text x={VB_W / 2} y={40} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          click a stage; toggle the two recurring threads
        </text>

        {/* threads */}
        {THREADS.map((t) =>
          threadsOn[t.id] ? (
            <polyline key={`th-${t.id}`} points={threadPoints(t.id)} fill="none" stroke={t.color} strokeWidth={2.5} strokeDasharray="2 4" strokeLinecap="round" opacity={0.85} />
          ) : null,
        )}
        {THREADS.map((t) =>
          threadsOn[t.id]
            ? STAGES.map((s, i) => {
                if (!s.threads.includes(t.id)) return null;
                const p = nodePos(i);
                return <circle key={`m-${t.id}-${s.id}`} cx={p.x + NODE_W / 2} cy={p.row === 0 ? SKIP_Y0 : SKIP_Y1} r={3} fill={t.color} />;
              })
            : null,
        )}

        {/* arrows between consecutive stages */}
        {STAGES.slice(0, -1).map((_, i) => {
          const a = nodePos(i);
          const b = nodePos(i + 1);
          if (a.row === b.row) {
            const y = a.y + NODE_H / 2;
            return <path key={`ar-${i}`} d={`M ${a.x + NODE_W} ${y} L ${b.x - 4} ${y}`} stroke={C.line} strokeWidth={1.4} fill="none" markerEnd="url(#wp-h)" />;
          }
          const x = a.x + NODE_W / 2;
          return <path key={`ar-${i}`} d={`M ${x} ${a.y + NODE_H} L ${x} ${b.y - 4}`} stroke={C.line} strokeWidth={1.4} fill="none" markerEnd="url(#wp-v)" />;
        })}
        <defs>
          <marker id="wp-h" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.line} />
          </marker>
          <marker id="wp-v" markerWidth="8" markerHeight="8" refX="3" refY="6" orient="auto">
            <path d="M0,6 L3,0 L6,6 Z" fill={C.line} />
          </marker>
        </defs>

        {/* nodes */}
        {STAGES.map((s, i) => {
          const p = nodePos(i);
          const isSel = s.id === sel;
          return (
            <g key={s.id} style={{ cursor: "pointer" }} onClick={() => setSel(s.id)}>
              <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={7} fill={isSel ? s.fill : "var(--card)"} stroke={isSel ? s.color : C.line} strokeWidth={isSel ? 2.4 : 1.2} />
              <text x={p.x + NODE_W / 2} y={p.y + 24} fontSize={11} fill={s.color} fontFamily={MONO} textAnchor="middle" fontWeight={600} style={{ pointerEvents: "none" }}>
                {s.short}
              </text>
              <text x={p.x + NODE_W / 2} y={p.y + 41} fontSize={8.5} fill={C.muted} fontFamily={MONO} textAnchor="middle" style={{ pointerEvents: "none" }}>
                {s.sub}
              </text>
              <text x={p.x + 7} y={p.y + 13} fontSize={8} fill={C.muted} fontFamily={MONO} style={{ pointerEvents: "none" }}>
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* readout */}
        <rect x={MARGIN} y={250} width={VB_W - 2 * MARGIN} height={56} rx={6} fill={active.fill} stroke={active.color} strokeWidth={1.2} />
        <text x={MARGIN + 12} y={270} fontSize={11} fill={active.color} fontFamily={MONO} fontWeight={600}>
          {active.short}
        </text>
        <text x={MARGIN + 12} y={288} fontSize={9} fill={C.ink} fontFamily={MONO}>
          {active.summary.length > 92 ? active.summary.slice(0, 91) + "…" : active.summary}
        </text>
        {active.id === "trifecta" && (
          <text x={MARGIN + 12} y={301} fontSize={8} fill={C.coral} fontFamily={MONO}>
            {`defenses: ${DEFENSES.join(" · ")}`}
          </text>
        )}
      </svg>

      {/* stage buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {STAGES.map((s) => (
          <button key={s.id} type="button" className={btn} style={s.id === sel ? { background: C.ink, color: "var(--background)" } : undefined} onClick={() => setSel(s.id)}>
            {s.short}
          </button>
        ))}
      </div>

      {/* thread toggles */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[var(--muted)]">threads:</span>
        {THREADS.map((t) => (
          <button key={t.id} type="button" className={btn} style={threadsOn[t.id] ? { background: t.color, color: "var(--background)" } : undefined} onClick={() => toggleThread(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        One loop, four levels of autonomy, a files-on-disk agent, a standardized tool layer, and the security you build before you
        trust it. Toggle the threads to see the agent loop and the just-in-time/files-on-disk idea recur across the whole chapter.
      </p>
    </div>
  );
}
