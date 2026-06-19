"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Windowed + Periodic Global Attention (SAM's ViT-H).
// Most layers use cheap LOCAL windowed attention: the 64x64 patch grid is
// partitioned into windows and each token only attends within its window.
// Every 8th layer is a GLOBAL layer: full attention across the whole grid.
// We draw a coarse 8x8 stand-in for the patch grid so the windows are
// legible; the cost readout uses the real N = 64*64 token count.

// --- Real model numbers (for the cost contrast) ---
const SIDE = 64; // 64 x 64 patch grid
const N = SIDE * SIDE; // 4096 tokens
const NUM_LAYERS = 32; // ViT-H depth (32 transformer blocks)
const GLOBAL_EVERY = 8; // global attention on every 8th layer

// --- Coarse visual grid (8 x 8 patches stands in for 64 x 64) ---
const VSIDE = 8;
const CELLS: { r: number; c: number }[] = [];
for (let r = 0; r < VSIDE; r++) {
  for (let c = 0; c < VSIDE; c++) CELLS.push({ r, c });
}

// Geometry -------------------------------------------------------------
const CELL = 34;
const GAP = 2;
const STEP = CELL + GAP; // 36
const GRID_X = 40;
const GRID_Y = 70;
const GRID_W = VSIDE * STEP - GAP; // 286
const GRID_BOTTOM = GRID_Y + GRID_W; // 356

// Query token sits at visual cell (3,4), middle-ish, away from edges.
const Q_R = 3;
const Q_C = 4;

// Window choices: visual cells per window side. Real model uses 14x14
// windows over 64x64; we map slider 1->2->4 visual cells/side for clarity,
// each mapped to a real window side for the cost math.
const WIN_OPTIONS = [
  { vis: 2, real: 8, label: "8x8" },
  { vis: 4, real: 14, label: "14x14" },
  { vis: 8, real: 64, label: "64x64" },
] as const;

function fmt(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

export function VisWindowedAttention() {
  const [layer, setLayer] = useState<number>(2); // 1..NUM_LAYERS
  const [winIdx, setWinIdx] = useState<number>(1); // index into WIN_OPTIONS

  const win = WIN_OPTIONS[winIdx];
  const isGlobal = layer % GLOBAL_EVERY === 0;

  // Window the query belongs to, in visual coords.
  const wq_r = Math.floor(Q_R / win.vis);
  const wq_c = Math.floor(Q_C / win.vis);

  // Which visual cells are "attended" by the query this layer.
  const attended = (r: number, c: number): boolean => {
    if (isGlobal) return true;
    return Math.floor(r / win.vis) === wq_r && Math.floor(c / win.vis) === wq_c;
  };

  // Cost math (multiply-adds, ~ pairwise scores) -------------------------
  const W2 = win.real * win.real; // tokens per window
  const windowedCost = N * W2; // O(N * W^2)
  const globalCost = N * N; // O(N^2)
  const layerCost = isGlobal ? globalCost : windowedCost;

  // Whole-stack cost: (most) windowed + a few global layers.
  const numGlobal = Math.floor(NUM_LAYERS / GLOBAL_EVERY);
  const numWindowed = NUM_LAYERS - numGlobal;
  const stackCost = numWindowed * windowedCost + numGlobal * globalCost;
  const naiveCost = NUM_LAYERS * globalCost;
  const savePct = Math.round((1 - stackCost / naiveCost) * 100);

  const accent = isGlobal ? C.coral : C.blue;
  const accentFill = isGlobal ? C.coralFill : C.blueFill;

  return (
    <div>
      <svg
        viewBox="0 0 480 470"
        className="h-auto w-full"
        role="img"
        aria-label="Windowed plus periodic global attention: most layers attend only within local windows, while every eighth layer attends globally across the whole patch grid"
      >
        {/* Title band */}
        <text
          x={240}
          y={24}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Windowed + Periodic Global Attention
        </text>

        {/* Layer-type readout, its own band under the title */}
        <text
          x={240}
          y={46}
          fontSize={11}
          fill={accent}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {isGlobal
            ? `layer ${layer}/${NUM_LAYERS}  GLOBAL  full attention`
            : `layer ${layer}/${NUM_LAYERS}  windowed  local only`}
        </text>

        {/* Window-boundary backing tiles (only meaningful when windowed) */}
        {!isGlobal &&
          Array.from({ length: Math.ceil(VSIDE / win.vis) }, (_, wr) =>
            Array.from({ length: Math.ceil(VSIDE / win.vis) }, (_, wc) => {
              const x = GRID_X + wc * win.vis * STEP;
              const y = GRID_Y + wr * win.vis * STEP;
              const w = Math.min(win.vis, VSIDE - wc * win.vis) * STEP - GAP;
              const h = Math.min(win.vis, VSIDE - wr * win.vis) * STEP - GAP;
              const isQWin = wr === wq_r && wc === wq_c;
              return (
                <rect
                  key={`win-${wr}-${wc}`}
                  x={x - 1}
                  y={y - 1}
                  width={w + 2}
                  height={h + 2}
                  rx={5}
                  fill="none"
                  stroke={isQWin ? C.blue : C.line}
                  strokeWidth={isQWin ? 2 : 1.2}
                  strokeDasharray={isQWin ? undefined : "4 3"}
                />
              );
            }),
          )}

        {/* Patch cells */}
        {CELLS.map(({ r, c }) => {
          const x = GRID_X + c * STEP;
          const y = GRID_Y + r * STEP;
          const isQuery = r === Q_R && c === Q_C;
          const att = attended(r, c);

          let fill: string = "var(--card)";
          let stroke: string = C.grid;
          let sw = 1;

          if (isQuery) {
            fill = accent;
            stroke = accent;
            sw = 1.5;
          } else if (att) {
            fill = accentFill;
            stroke = accent;
            sw = 1.2;
          }

          return (
            <rect
              key={`p-${r}-${c}`}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={4}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          );
        })}

        {/* Query marker dot */}
        <circle
          cx={GRID_X + Q_C * STEP + CELL / 2}
          cy={GRID_Y + Q_R * STEP + CELL / 2}
          r={5}
          fill="var(--background)"
          stroke={accent}
          strokeWidth={2}
        />

        {/* Caption / legend band below the grid */}
        <g>
          <rect
            x={GRID_X}
            y={GRID_BOTTOM + 14}
            width={13}
            height={13}
            rx={3}
            fill={accentFill}
            stroke={accent}
          />
          <text
            x={GRID_X + 19}
            y={GRID_BOTTOM + 24}
            fontSize={10}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="start"
          >
            {isGlobal ? "attends every token (4096)" : "attends only its window"}
          </text>

          <circle
            cx={GRID_X + 6}
            cy={GRID_BOTTOM + 41}
            r={5}
            fill="var(--background)"
            stroke={accent}
            strokeWidth={2}
          />
          <text
            x={GRID_X + 19}
            y={GRID_BOTTOM + 45}
            fontSize={10}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="start"
          >
            query token
          </text>
        </g>

        {/* Cost-contrast band */}
        <text
          x={GRID_X}
          y={GRID_BOTTOM + 70}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="start"
        >
          this layer cost:
        </text>
        <text
          x={GRID_X + 110}
          y={GRID_BOTTOM + 70}
          fontSize={10}
          fill={accent}
          fontFamily={MONO}
          textAnchor="start"
        >
          {isGlobal
            ? `O(N^2) = ${fmt(layerCost)} pairs`
            : `O(N*W^2) = ${fmt(layerCost)} pairs`}
        </text>

        <text
          x={GRID_X}
          y={GRID_BOTTOM + 86}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="start"
        >
          full O(N^2) would be:
        </text>
        <text
          x={GRID_X + 130}
          y={GRID_BOTTOM + 86}
          fontSize={10}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="start"
        >
          {fmt(globalCost)} pairs
        </text>

        <text
          x={GRID_X}
          y={GRID_BOTTOM + 102}
          fontSize={10}
          fill={C.green}
          fontFamily={MONO}
          textAnchor="start"
        >
          {`stack: ${numWindowed} windowed + ${numGlobal} global -> ${savePct}% cheaper`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setLayer((l: number) => (l <= 1 ? 1 : l - 1))}
          disabled={layer <= 1}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-40"
        >
          prev layer
        </button>
        <button
          type="button"
          onClick={() =>
            setLayer((l: number) => (l >= NUM_LAYERS ? NUM_LAYERS : l + 1))
          }
          disabled={layer >= NUM_LAYERS}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-40"
        >
          next layer
        </button>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">layer</span>
          <input
            type="range"
            min={1}
            max={NUM_LAYERS}
            step={1}
            value={layer}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setLayer(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{layer}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">window</span>
          <input
            type="range"
            min={0}
            max={WIN_OPTIONS.length - 1}
            step={1}
            value={winIdx}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setWinIdx(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{win.label}</span>
        </label>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Cheap local windows most layers, occasional global mixing, global
        reasoning without paying O(N^2) everywhere.
      </p>
    </div>
  );
}
