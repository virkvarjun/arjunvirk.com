"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The Agent Loop — the engine underneath every agent framework.
// Goal in -> LLM reasons -> either calls a tool or emits a final answer.
// A tool call produces an observation that feeds back into the reasoner;
// the loop ends only when the model emits a final answer instead of a tool.
//
// Interactive: a "step" button walks one pass at a time, highlighting the
// active node and appending an action/observation line to the log; a turn
// counter tracks reason->act->observe cycles; a "decide it's done" toggle
// makes the next reason exit the loop to the final answer.

type NodeId = "goal" | "reason" | "tool" | "observe" | "final";

interface NodeDef {
  id: NodeId;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  color: string;
  fill: string;
}

const VB_W = 480;
const VB_H = 300;

const NODES: NodeDef[] = [
  { id: "goal", x: 24, y: 28, w: 150, h: 48, title: "User goal", sub: "initial instruction", color: C.muted, fill: "var(--card)" },
  { id: "reason", x: 165, y: 118, w: 150, h: 56, title: "LLM reasoner", sub: "plans next step", color: C.blue, fill: C.blueFill },
  { id: "tool", x: 330, y: 28, w: 126, h: 48, title: "Tool call", sub: "API, code, search", color: C.coral, fill: C.coralFill },
  { id: "observe", x: 330, y: 200, w: 126, h: 48, title: "Observation", sub: "result fed back", color: C.green, fill: C.greenFill },
  { id: "final", x: 24, y: 200, w: 150, h: 48, title: "Final answer", sub: "goal achieved", color: C.violet, fill: "var(--card)" },
];

const POS = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<NodeId, NodeDef>;
const cx = (n: NodeDef) => n.x + n.w / 2;
const cy = (n: NodeDef) => n.y + n.h / 2;

// One simulated turn's flavor text, cycled as the loop runs.
const TURN_FLAVOR = [
  { tool: "web_search('NVDA price')", obs: "$132.40, +1.2% today" },
  { tool: "read_file('notes.md')", obs: "found 3 open TODOs" },
  { tool: "run_shell('git status')", obs: "2 files changed" },
];

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-40 disabled:cursor-not-allowed";

interface LogLine {
  kind: "goal" | "reason" | "tool" | "observe" | "final";
  text: string;
}

export function AgtTheAgentLoop() {
  const [active, setActive] = useState<NodeId>("goal");
  const [turn, setTurn] = useState(0);
  const [done, setDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const [log, setLog] = useState<LogLine[]>([
    { kind: "goal", text: "goal: \"check the NVDA price and summarize my notes\"" },
  ]);

  const push = (line: LogLine) => setLog((l) => [...l, line]);

  const step = () => {
    if (finished) return;
    switch (active) {
      case "goal": {
        setActive("reason");
        push({ kind: "reason", text: "reason: what do I need to do first?" });
        break;
      }
      case "reason": {
        if (done) {
          setActive("final");
          setFinished(true);
          push({ kind: "final", text: "final answer: emitted — loop exits. ✓" });
        } else {
          setActive("tool");
          const f = TURN_FLAVOR[turn % TURN_FLAVOR.length];
          push({ kind: "tool", text: `tool call: ${f.tool}` });
        }
        break;
      }
      case "tool": {
        setActive("observe");
        const f = TURN_FLAVOR[turn % TURN_FLAVOR.length];
        push({ kind: "observe", text: `observation: ${f.obs}` });
        break;
      }
      case "observe": {
        setActive("reason");
        setTurn((t) => t + 1);
        push({ kind: "reason", text: "reason: that's done — what's next?" });
        break;
      }
      default:
        break;
    }
  };

  const reset = () => {
    setActive("goal");
    setTurn(0);
    setDone(false);
    setFinished(false);
    setLog([{ kind: "goal", text: "goal: \"check the NVDA price and summarize my notes\"" }]);
  };

  // arrow helper between node edges
  const edge = (a: NodeId, b: NodeId, dim: boolean) => {
    const na = POS[a];
    const nb = POS[b];
    return (
      <line
        x1={cx(na)}
        y1={cy(na)}
        x2={cx(nb)}
        y2={cy(nb)}
        stroke={dim ? C.line : C.ink}
        strokeWidth={dim ? 1.2 : 2}
        opacity={dim ? 0.5 : 1}
        markerEnd={dim ? "url(#al-head-dim)" : "url(#al-head)"}
      />
    );
  };

  // is this directed edge currently "live" (just traversed)?
  const liveEdge = (a: NodeId, b: NodeId) => {
    if (a === "goal" && b === "reason") return active === "reason" && turn === 0;
    if (a === "reason" && b === "tool") return active === "tool";
    if (a === "tool" && b === "observe") return active === "observe";
    if (a === "observe" && b === "reason") return active === "reason" && turn > 0;
    if (a === "reason" && b === "final") return active === "final";
    return false;
  };

  const colorFor = (k: LogLine["kind"]) =>
    k === "tool" ? C.coral : k === "observe" ? C.green : k === "final" ? C.violet : k === "reason" ? C.blue : C.muted;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="The agent loop: think, act, observe, repeat">
        <defs>
          <marker id="al-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.ink} />
          </marker>
          <marker id="al-head-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.line} />
          </marker>
        </defs>

        <text x={VB_W / 2} y={16} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          The Agent Loop
        </text>

        {/* edges */}
        {edge("goal", "reason", !liveEdge("goal", "reason"))}
        {edge("reason", "tool", !liveEdge("reason", "tool"))}
        {edge("tool", "observe", !liveEdge("tool", "observe"))}
        {edge("observe", "reason", !liveEdge("observe", "reason"))}
        {edge("reason", "final", !liveEdge("reason", "final"))}

        {/* edge labels */}
        <text x={cx(POS.reason) + 70} y={cy(POS.reason) - 28} fontSize={8.5} fill={C.coral} fontFamily={MONO} textAnchor="middle">
          act
        </text>
        <text x={cx(POS.reason) - 78} y={cy(POS.reason) + 24} fontSize={8.5} fill={C.violet} fontFamily={MONO} textAnchor="middle">
          done? exit
        </text>
        <text x={cx(POS.observe) + 6} y={cy(POS.observe) - 22} fontSize={8.5} fill={C.green} fontFamily={MONO} textAnchor="start">
          observe
        </text>

        {/* nodes */}
        {NODES.map((n) => {
          const isActive = n.id === active;
          const isFinalDimmed = n.id === "final" && !done && !finished;
          return (
            <g key={n.id} opacity={isFinalDimmed ? 0.45 : 1}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={7}
                fill={isActive ? n.fill : "var(--card)"}
                stroke={isActive ? n.color : C.line}
                strokeWidth={isActive ? 2.4 : 1.2}
              />
              <text x={cx(n)} y={n.y + 21} fontSize={11} fill={n.color === C.muted ? C.ink : n.color} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
                {n.title}
              </text>
              <text x={cx(n)} y={n.y + 36} fontSize={8.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
                {n.sub}
              </text>
            </g>
          );
        })}
      </svg>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className={btn} onClick={step} disabled={finished}>
          {finished ? "loop ended" : "step ▸"}
        </button>
        <button type="button" className={btn} onClick={reset}>
          reset
        </button>
        <label className="flex items-center gap-1.5 font-mono text-[var(--muted)]">
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} disabled={finished} />
          model decides it&apos;s done
        </label>
        <span className="font-mono text-[var(--muted)]">
          turn {turn}
          {finished ? " · finished" : ""}
        </span>
      </div>

      {/* log panel */}
      <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        {log.map((l, i) => (
          <p key={i} className="font-mono text-[11px] leading-relaxed" style={{ color: colorFor(l.kind) }}>
            {l.text}
          </p>
        ))}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Think, act, observe, repeat. Toggle &ldquo;decides it&rsquo;s done&rdquo; and step once more from the reasoner: instead of
        another tool call, the model emits a final answer and the loop exits. The loop is the whole idea.
      </p>
    </div>
  );
}
