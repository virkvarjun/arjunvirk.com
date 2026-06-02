"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// N×M vs N+M: The Integration Explosion — without a standard, N apps each need
// a custom connector to M systems (N×M lines). With MCP, each connects once to
// a central hub (N+M). Interactive: sliders for N apps and M systems; the left
// panel's crisscross grows as N×M while the right grows as N+M, with a live
// readout (e.g. 10 × 50 = 500 vs 60).

const VB_W = 480;
const VB_H = 250;

const btn =
  "rounded border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

// drawing caps (we draw up to 4 nodes per side; the readout uses true N, M)
const DRAW = 4;

export function AgtNXMVsNMTheIntegrationExplosion() {
  const [n, setN] = useState(3); // apps
  const [m, setM] = useState(3); // systems

  const dn = Math.min(n, DRAW);
  const dm = Math.min(m, DRAW);

  const appLabels = ["App A", "App B", "App C", "App D"];
  const sysLabels = ["GitHub", "Postgres", "Slack", "Drive"];

  // panel geometry
  const colY = (i: number, count: number, top: number, h: number) => top + (h / (count + 1)) * (i + 1);

  // LEFT panel (N×M)
  const LX_APP = 24;
  const LX_SYS = 196;
  const TOP = 56;
  const PH = 150;

  // RIGHT panel (N+M)
  const RX_APP = 270;
  const RX_HUB = 372;
  const RX_SYS = 446;

  const truncated = n > DRAW || m > DRAW;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="N times M versus N plus M integration explosion">
        <text x={VB_W / 2} y={16} fontSize={12.5} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          N×M vs N+M: The Integration Explosion
        </text>

        {/* panel titles */}
        <text x={110} y={40} fontSize={9.5} fill={C.coral} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          Before MCP (N×M)
        </text>
        <text x={358} y={40} fontSize={9.5} fill={C.green} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          With MCP (N+M)
        </text>

        {/* LEFT crisscross */}
        {Array.from({ length: dn }).map((_, i) =>
          Array.from({ length: dm }).map((__, j) => (
            <line
              key={`l-${i}-${j}`}
              x1={LX_APP + 36}
              y1={colY(i, dn, TOP, PH)}
              x2={LX_SYS}
              y2={colY(j, dm, TOP, PH)}
              stroke={C.coral}
              strokeWidth={0.8}
              opacity={0.5}
            />
          )),
        )}
        {Array.from({ length: dn }).map((_, i) => (
          <g key={`la-${i}`}>
            <rect x={LX_APP} y={colY(i, dn, TOP, PH) - 9} width={40} height={18} rx={4} fill={C.blueFill} stroke={C.blue} strokeWidth={1} />
            <text x={LX_APP + 20} y={colY(i, dn, TOP, PH) + 3} fontSize={7} fill={C.blue} fontFamily={MONO} textAnchor="middle">
              {appLabels[i]}
            </text>
          </g>
        ))}
        {Array.from({ length: dm }).map((_, j) => (
          <g key={`ls-${j}`}>
            <rect x={LX_SYS} y={colY(j, dm, TOP, PH) - 9} width={48} height={18} rx={4} fill="var(--card)" stroke={C.line} strokeWidth={1} />
            <text x={LX_SYS + 24} y={colY(j, dm, TOP, PH) + 3} fontSize={7} fill={C.ink} fontFamily={MONO} textAnchor="middle">
              {sysLabels[j]}
            </text>
          </g>
        ))}

        {/* RIGHT hub */}
        <rect x={RX_HUB - 6} y={TOP + PH / 2 - 26} width={40} height={52} rx={6} fill={C.greenFill} stroke={C.green} strokeWidth={1.6} />
        <text x={RX_HUB + 14} y={TOP + PH / 2 - 2} fontSize={8} fill={C.green} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          MCP
        </text>
        <text x={RX_HUB + 14} y={TOP + PH / 2 + 10} fontSize={7} fill={C.green} fontFamily={MONO} textAnchor="middle">
          hub
        </text>
        {Array.from({ length: dn }).map((_, i) => (
          <g key={`ra-${i}`}>
            <line x1={RX_APP + 36} y1={colY(i, dn, TOP, PH)} x2={RX_HUB - 6} y2={TOP + PH / 2} stroke={C.green} strokeWidth={0.9} opacity={0.6} />
            <rect x={RX_APP} y={colY(i, dn, TOP, PH) - 9} width={40} height={18} rx={4} fill={C.blueFill} stroke={C.blue} strokeWidth={1} />
            <text x={RX_APP + 20} y={colY(i, dn, TOP, PH) + 3} fontSize={7} fill={C.blue} fontFamily={MONO} textAnchor="middle">
              {appLabels[i]}
            </text>
          </g>
        ))}
        {Array.from({ length: dm }).map((_, j) => (
          <g key={`rs-${j}`}>
            <line x1={RX_HUB + 34} y1={TOP + PH / 2} x2={RX_SYS} y2={colY(j, dm, TOP, PH)} stroke={C.green} strokeWidth={0.9} opacity={0.6} />
            <rect x={RX_SYS} y={colY(j, dm, TOP, PH) - 9} width={30} height={18} rx={4} fill="var(--card)" stroke={C.line} strokeWidth={1} />
            <text x={RX_SYS + 15} y={colY(j, dm, TOP, PH) + 3} fontSize={6} fill={C.ink} fontFamily={MONO} textAnchor="middle">
              {sysLabels[j].slice(0, 4)}
            </text>
          </g>
        ))}

        {/* readout */}
        <text x={110} y={TOP + PH + 26} fontSize={11} fill={C.coral} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          {`${n} × ${m} = ${n * m}`}
        </text>
        <text x={358} y={TOP + PH + 26} fontSize={11} fill={C.green} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
          {`${n} + ${m} = ${n + m}`}
        </text>
        {truncated && (
          <text x={VB_W / 2} y={TOP + PH + 40} fontSize={7} fill={C.muted} fontFamily={MONO} textAnchor="middle">
            (diagram shows up to {DRAW} per side; counts are exact)
          </text>
        )}
      </svg>

      {/* sliders */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          apps (N)
          <input type="range" min={1} max={10} value={n} onChange={(e) => setN(Number(e.target.value))} />
          {n}
        </label>
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          systems (M)
          <input type="range" min={1} max={50} value={m} onChange={(e) => setM(Number(e.target.value))} />
          {m}
        </label>
        <button type="button" className={btn} onClick={() => { setN(10); setM(50); }}>
          real scale (10×50)
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Standardize the connector and N×M bespoke integrations collapse to N+M — at 10 apps × 50 tools that&rsquo;s{" "}
        <strong>500 versus 60</strong>. Once a server exists, any MCP-compatible client gets it for free, so the savings compound.
      </p>
    </div>
  );
}
