"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Defusing the Trifecta: Architectural Defenses — the three-circle trifecta
// with four defense levers, each visibly removing or shrinking a leg, plus
// three side cards (MCP server trust, scope minimization, audit logging).
// Interactive: toggle each defense and watch which leg it neutralizes and the
// central risk shrink. The defenses are architectural — you can't prompt your
// way out.

type Leg = "data" | "comms" | "untrusted";

const LEGS: { id: Leg; label: string; cx: number; cy: number; color: string }[] = [
  { id: "data", label: "Private data", cx: 150, cy: 96, color: C.blue },
  { id: "comms", label: "External comms", cx: 240, cy: 96, color: C.coral },
  { id: "untrusted", label: "Untrusted content", cx: 195, cy: 162, color: C.green },
];

interface Defense {
  id: string;
  label: string;
  neutralizes: Leg[];
  note: string;
}

const DEFENSES: Defense[] = [
  { id: "readonly", label: "Read-only network", neutralizes: ["comms"], note: "Cuts external comms for any task touching untrusted content." },
  { id: "separate", label: "Separate agents / perms", neutralizes: ["data", "untrusted"], note: "Keeps the web-reading agent away from your secrets." },
  { id: "approval", label: "Human-in-the-loop approval", neutralizes: ["comms"], note: "Gates irreversible actions before they fire." },
  { id: "data-not-instr", label: "Treat output as data", neutralizes: ["untrusted"], note: "Neutralizes injected commands hiding in tool results." },
];

const SIDE_CARDS = [
  { label: "MCP server trust", note: "Vet third-party code you run." },
  { label: "Scope minimization", note: "Narrowest permissions that work." },
  { label: "Audit logging", note: "Record every tool call." },
];

const VB_W = 480;
const VB_H = 250;
const R = 70;

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtDefusingTheTrifectaArchitecturalDefenses() {
  const [active, setActive] = useState<Record<string, boolean>>({});

  const neutralized: Record<Leg, boolean> = {
    data: false,
    comms: false,
    untrusted: false,
  };
  DEFENSES.forEach((d) => {
    if (active[d.id]) d.neutralizes.forEach((leg) => (neutralized[leg] = true));
  });

  const legAlive = (id: Leg) => !neutralized[id];
  const riskAlive = legAlive("data") && legAlive("comms") && legAlive("untrusted");
  const cxC = (LEGS[0].cx + LEGS[1].cx + LEGS[2].cx) / 3;
  const cyC = (LEGS[0].cy + LEGS[1].cy + LEGS[2].cy) / 3;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Defusing the trifecta with architectural defenses">
        <text x={VB_W / 2} y={16} fontSize={12.5} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Defusing the Trifecta: Architectural Defenses
        </text>

        {/* circles */}
        {LEGS.map((l) => {
          const alive = legAlive(l.id);
          return (
            <g key={l.id}>
              <circle
                cx={l.cx}
                cy={l.cy}
                r={alive ? R : R * 0.55}
                fill={alive ? l.color : C.muted}
                fillOpacity={alive ? 0.16 : 0.05}
                stroke={alive ? l.color : C.line}
                strokeWidth={alive ? 2 : 1.2}
                strokeDasharray={alive ? undefined : "4 4"}
              />
              {!alive && (
                <text x={l.cx} y={l.cy + 3} fontSize={8} fill={C.green} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
                  ✓ cut
                </text>
              )}
            </g>
          );
        })}
        {/* leg labels */}
        {LEGS.map((l, i) => {
          const lx = i === 0 ? l.cx - 58 : i === 1 ? l.cx + 60 : l.cx;
          const ly = i === 2 ? l.cy + 56 : l.cy - 50;
          return (
            <text key={`lbl-${l.id}`} x={lx} y={ly} fontSize={8.5} fill={legAlive(l.id) ? l.color : C.muted} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
              {l.label}
            </text>
          );
        })}

        {/* center risk */}
        {riskAlive ? (
          <>
            <circle cx={cxC} cy={cyC} r={14} fill={C.coral} opacity={0.9} />
            <text x={cxC} y={cyC + 3} fontSize={7} fill="var(--background)" fontFamily={MONO} textAnchor="middle" fontWeight={700}>
              RISK
            </text>
          </>
        ) : (
          <text x={cxC} y={cyC + 3} fontSize={8} fill={C.green} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
            ✓ safe
          </text>
        )}

        {/* side cards */}
        {SIDE_CARDS.map((c, i) => {
          const y = 40 + i * 56;
          return (
            <g key={c.label}>
              <rect x={328} y={y} width={142} height={46} rx={6} fill="var(--card)" stroke={C.line} strokeWidth={1.2} />
              <text x={336} y={y + 17} fontSize={8.5} fill={C.ink} fontFamily={MONO} fontWeight={600}>
                {c.label}
              </text>
              <text x={336} y={y + 33} fontSize={7} fill={C.muted} fontFamily={MONO}>
                {c.note}
              </text>
            </g>
          );
        })}
      </svg>

      {/* defense toggles */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[var(--muted)]">defenses:</span>
        {DEFENSES.map((d) => (
          <button
            key={d.id}
            type="button"
            className={btn}
            style={active[d.id] ? { background: C.green, color: "var(--background)" } : undefined}
            onClick={() => setActive((s) => ({ ...s, [d.id]: !s[d.id] }))}
            title={d.note}
          >
            {active[d.id] ? "● " : "○ "}
            {d.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Don&rsquo;t ask the model not to get hacked — prompt-injection bypasses keep being found. Remove a leg structurally:
        cut the network, separate permissions, gate actions, and treat tool output as data. Then vet servers, minimize scope, and
        log everything.
      </p>
    </div>
  );
}
