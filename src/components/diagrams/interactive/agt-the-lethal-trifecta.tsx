"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The Lethal Trifecta — three overlapping circles (private data, external
// comms, untrusted content). Their three-way overlap is the exfiltration risk.
// Interactive: toggle each leg on/off. With all three present the center lights
// up and an attack path appears (injected instruction → take private data →
// ship it out). Remove any one leg and the risk collapses.

type Leg = "data" | "comms" | "untrusted";

const LEGS: { id: Leg; label: string; sub: string; cx: number; cy: number; color: string }[] = [
  { id: "data", label: "Private data", sub: "email, files, secrets", cx: 180, cy: 126, color: C.blue },
  { id: "comms", label: "External comms", sub: "HTTP, send messages", cx: 300, cy: 126, color: C.coral },
  { id: "untrusted", label: "Untrusted content", sub: "web pages, emails read", cx: 240, cy: 194, color: C.green },
];

const VB_W = 480;
const VB_H = 322;
const R = 72;

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function AgtTheLethalTrifecta() {
  const [on, setOn] = useState<Record<Leg, boolean>>({ data: true, comms: true, untrusted: true });
  const allOn = on.data && on.comms && on.untrusted;

  // centroid of the three circles for the risk label
  const cxC = (LEGS[0].cx + LEGS[1].cx + LEGS[2].cx) / 3;
  const cyC = (LEGS[0].cy + LEGS[1].cy + LEGS[2].cy) / 3;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="The lethal trifecta as three overlapping circles">
        <text x={VB_W / 2} y={18} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          The Lethal Trifecta
        </text>

        {/* circles */}
        {LEGS.map((l) => (
          <circle
            key={l.id}
            cx={l.cx}
            cy={l.cy}
            r={R}
            fill={on[l.id] ? l.color : "none"}
            fillOpacity={on[l.id] ? 0.16 : 0}
            stroke={on[l.id] ? l.color : C.line}
            strokeWidth={on[l.id] ? 2 : 1.2}
            strokeDasharray={on[l.id] ? undefined : "4 4"}
          />
        ))}

        {/* labels — placed outside each circle (top two above, bottom one below) */}
        {LEGS.map((l, i) => {
          // i=2 (untrusted) sits below its circle; the top two sit above theirs
          const ly = i === 2 ? l.cy + R + 18 : l.cy - R - 14;
          return (
            <g key={`lbl-${l.id}`}>
              <text x={l.cx} y={ly} fontSize={9.5} fill={on[l.id] ? l.color : C.muted} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
                {l.label}
              </text>
              <text x={l.cx} y={ly + 12} fontSize={7.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
                {l.sub}
              </text>
            </g>
          );
        })}

        {/* center risk */}
        {allOn ? (
          <>
            <circle cx={cxC} cy={cyC} r={16} fill={C.coral} opacity={0.9} />
            <text x={cxC} y={cyC - 2} fontSize={8} fill="var(--background)" fontFamily={MONO} textAnchor="middle" fontWeight={700}>
              EXFIL
            </text>
            <text x={cxC} y={cyC + 8} fontSize={6.5} fill="var(--background)" fontFamily={MONO} textAnchor="middle">
              risk
            </text>
          </>
        ) : (
          <text x={cxC} y={cyC + 3} fontSize={8} fill={C.green} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
            ✓ defused
          </text>
        )}

        {/* attack path note */}
        <text x={VB_W / 2} y={314} fontSize={8} fill={allOn ? C.coral : C.green} fontFamily={MONO} textAnchor="middle">
          {allOn
            ? "injected instruction → reads private data → ships it to an attacker"
            : "remove any one leg and the attack can't complete"}
        </text>
      </svg>

      {/* toggles */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[var(--muted)]">legs:</span>
        {LEGS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={btn}
            style={on[l.id] ? { background: l.color, color: "var(--background)" } : undefined}
            onClick={() => setOn((s) => ({ ...s, [l.id]: !s[l.id] }))}
          >
            {on[l.id] ? "● " : "○ "}
            {l.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Private data + external comms + untrusted content = exfiltration. A malicious instruction hidden in content the agent
        reads can hijack it into taking your data and shipping it out. Remove any one leg and the risk collapses.
      </p>
    </div>
  );
}
