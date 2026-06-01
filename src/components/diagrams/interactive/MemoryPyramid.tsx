"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

interface Level {
  name: string;
  note: string;
  latency: number; // relative latency, registers = 1
}

const LEVELS: Level[] = [
  { name: "Registers", note: "fastest · ~256 KB/SM", latency: 1 },
  { name: "Shared / L1", note: "on-SM · ~228 KB/SM", latency: 1 },
  { name: "L2 cache", note: "on-chip · ~50 MB", latency: 10 },
  { name: "HBM (VRAM)", note: "main mem · ~80 GB", latency: 100 },
  { name: "Host RAM", note: "PCIe · ~32–64 GB/s", latency: 1000 },
];

// Color ramp: fast (green) → blue → slow (coral), top to bottom.
const RAMP = [
  { fill: C.greenFill, stroke: C.green },
  { fill: C.greenFill, stroke: C.green },
  { fill: C.blueFill, stroke: C.blue },
  { fill: C.coralFill, stroke: C.coral },
  { fill: C.coralFill, stroke: C.coral },
];

// Pyramid band geometry. Bands widen going down (more capacity).
const BAND_H = 30;
const BAND_GAP = 4;
const TOP_Y = 18;
const CX = 158; // pyramid horizontal center
const MIN_HALF = 34; // half-width of top band
const MAX_HALF = 132; // half-width of bottom band

function bandHalfWidth(i: number): number {
  const t = LEVELS.length === 1 ? 0 : i / (LEVELS.length - 1);
  return MIN_HALF + (MAX_HALF - MIN_HALF) * t;
}

function bandY(i: number): number {
  return TOP_Y + i * (BAND_H + BAND_GAP);
}

// Log-scaled width for a latency cost bar so 1× and 1000× both render readably.
function costWidth(latency: number, maxPx: number): number {
  const frac = Math.log10(latency * 10) / Math.log10(10000); // 1→0.25, 1000→1
  return Math.max(3, maxPx * frac);
}

export function MemoryPyramid() {
  const [selected, setSelected] = useState(3); // default: HBM
  const [compare, setCompare] = useState(false);

  const sel = LEVELS[selected];

  // Cost-bar panel on the right.
  const barX = 308;
  const barMaxW = 120;
  const costW = costWidth(sel.latency, barMaxW);

  // Compare panel: total cost for two access patterns (relative units).
  // Pattern A: load once, then reuse from shared mem (1 HBM trip + reuse).
  // Pattern B: re-fetch from HBM on every use (many HBM trips).
  const reuseCount = 8;
  const totalA = LEVELS[3].latency + reuseCount * LEVELS[1].latency; // 100 + 8
  const totalB = reuseCount * LEVELS[3].latency; // 800
  const totalMax = Math.max(totalA, totalB);
  const cmpBarMaxW = 96;
  const aW = (totalA / totalMax) * cmpBarMaxW;
  const bW = (totalB / totalMax) * cmpBarMaxW;

  return (
    <div>
      <svg
        viewBox="0 0 440 260"
        className="h-auto w-full"
        role="img"
        aria-label="GPU memory hierarchy"
      >
        {/* Headline note */}
        <text x={8} y={12} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          registers &amp; shared memory ≈ 100× faster than HBM
        </text>

        {/* Pyramid bands */}
        {LEVELS.map((lvl, i) => {
          const half = bandHalfWidth(i);
          const y = bandY(i);
          const isSel = i === selected;
          const c = RAMP[i];
          return (
            <g
              key={lvl.name}
              onClick={() => setSelected(i)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={CX - half}
                y={y}
                width={half * 2}
                height={BAND_H}
                rx={3}
                fill={c.fill}
                stroke={isSel ? C.ink : c.stroke}
                strokeWidth={isSel ? 2 : 1}
              />
              <text
                x={CX}
                y={y + 13}
                fontSize={11}
                fill={C.ink}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={isSel ? 700 : 500}
              >
                {lvl.name}
              </text>
              <text
                x={CX}
                y={y + 24}
                fontSize={8}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {lvl.note} · {lvl.latency}×
              </text>
            </g>
          );
        })}

        {/* Capacity axis hint */}
        <text
          x={8}
          y={bandY(0) + 14}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
        >
          fast
        </text>
        <text
          x={8}
          y={bandY(LEVELS.length - 1) + 18}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
        >
          slow
        </text>

        {/* Right panel: selected latency cost OR compare patterns */}
        {!compare ? (
          <g>
            <text x={barX} y={28} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
              fetch cost
            </text>
            <text
              x={barX}
              y={42}
              fontSize={11}
              fill={C.ink}
              fontFamily={MONO}
              fontWeight={700}
            >
              {sel.name}
            </text>
            {/* track */}
            <rect
              x={barX}
              y={50}
              width={barMaxW}
              height={14}
              rx={3}
              fill={C.grid}
            />
            {/* fill, proportional (log) to relative latency */}
            <rect
              x={barX}
              y={50}
              width={costW}
              height={14}
              rx={3}
              fill={sel.latency >= 100 ? C.coral : sel.latency >= 10 ? C.blue : C.green}
              style={{ transition: "width 400ms ease" }}
            />
            <text
              x={barX}
              y={80}
              fontSize={12}
              fill={C.ink}
              fontFamily={MONO}
              fontWeight={700}
            >
              {sel.latency}× latency
            </text>
            <text
              x={barX}
              y={96}
              fontSize={8}
              fill={C.muted}
              fontFamily={MONO}
            >
              relative to registers
            </text>
            <text
              x={barX}
              y={118}
              fontSize={8}
              fill={C.muted}
              fontFamily={MONO}
            >
              click a band to fetch
            </text>
          </g>
        ) : (
          <g>
            <text x={barX} y={28} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
              total cost · 8 uses
            </text>

            {/* Pattern A */}
            <text x={barX} y={48} fontSize={9} fill={C.ink} fontFamily={MONO}>
              A: reuse hot
            </text>
            <rect x={barX} y={52} width={cmpBarMaxW} height={12} rx={2} fill={C.grid} />
            <rect x={barX} y={52} width={aW} height={12} rx={2} fill={C.green} />
            <text
              x={barX + cmpBarMaxW + 4}
              y={61}
              fontSize={9}
              fill={C.green}
              fontFamily={MONO}
            >
              {totalA}×
            </text>

            {/* Pattern B */}
            <text x={barX} y={84} fontSize={9} fill={C.ink} fontFamily={MONO}>
              B: re-fetch HBM
            </text>
            <rect x={barX} y={88} width={cmpBarMaxW} height={12} rx={2} fill={C.grid} />
            <rect x={barX} y={88} width={bW} height={12} rx={2} fill={C.coral} />
            <text
              x={barX + cmpBarMaxW + 4}
              y={97}
              fontSize={9}
              fill={C.coral}
              fontFamily={MONO}
            >
              {totalB}×
            </text>

            <text x={barX} y={118} fontSize={8} fill={C.muted} fontFamily={MONO}>
              keep data hot →
            </text>
            <text x={barX} y={128} fontSize={8} fill={C.muted} fontFamily={MONO}>
              minimize HBM trips
            </text>
          </g>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.name}
            type="button"
            onClick={() => setSelected(i)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              i === selected
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            {lvl.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCompare((v) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            compare ? { background: C.ink, color: "var(--background)" } : undefined
          }
        >
          compare access patterns
        </button>
      </div>
    </div>
  );
}
