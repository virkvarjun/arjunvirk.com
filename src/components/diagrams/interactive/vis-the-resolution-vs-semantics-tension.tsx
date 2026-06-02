"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The Resolution vs Semantics Tension.
// A classification CNN funnels a 224x224 image down through stride-2 stages to a
// 7x7 feature grid. Going deeper builds strong, abstract SEMANTICS but throws
// away spatial RESOLUTION. A depth slider sweeps the stages: as depth grows the
// spatial grid collapses (224 -> 7) and semantic richness rises. Upsampling that
// tiny label map back to full size gives a blocky mask (each label paints a big
// patch). The "need both" target zone is the goal: deep semantics AND pixels.

// One downsampling stage per slider step. Stage 0 = the raw input.
type Stage = {
  readonly depth: number; // slider index
  readonly side: number; // spatial side length (224..7)
  readonly grid: number; // small preview grid we draw (cells per side)
  readonly patch: number; // px each output label covers when upsampled
};

// Hard-coded stages (deterministic). side halves each stage; patch = 224/side.
const STAGES: readonly Stage[] = [
  { depth: 0, side: 224, grid: 8, patch: 1 },
  { depth: 1, side: 112, grid: 7, patch: 2 },
  { depth: 2, side: 56, grid: 6, patch: 4 },
  { depth: 3, side: 28, grid: 5, patch: 8 },
  { depth: 4, side: 14, grid: 4, patch: 16 },
  { depth: 5, side: 7, grid: 3, patch: 32 },
];

const MAX_DEPTH = STAGES.length - 1;

// A hard-coded "ground-truth" object mask on an 8x8 grid (1 = object pixel).
// Used to show how upsampling a coarse prediction blurs the silhouette.
const MASK8: readonly number[] = [
  0, 0, 1, 1, 1, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 0, 0,
  1, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 0,
  0, 1, 1, 1, 1, 1, 0, 0,
  0, 0, 1, 1, 1, 0, 0, 0,
  0, 0, 0, 1, 0, 0, 0, 0,
];

// Downsample the 8x8 mask to a gxg grid by majority vote, then upsample back to
// 8x8 (each coarse cell paints its whole block). Coarser g -> blockier mask.
function blockyMask(g: number): number[] {
  const out: number[] = new Array(64).fill(0);
  const block = 8 / g; // cells of the 8x8 grid per coarse cell
  for (let cy = 0; cy < g; cy++) {
    for (let cx = 0; cx < g; cx++) {
      let sum = 0;
      let count = 0;
      for (let dy = 0; dy < block; dy++) {
        for (let dx = 0; dx < block; dx++) {
          const yy = Math.min(7, Math.floor(cy * block) + dy);
          const xx = Math.min(7, Math.floor(cx * block) + dx);
          sum += MASK8[yy * 8 + xx];
          count++;
        }
      }
      const on = sum / count >= 0.5 ? 1 : 0;
      for (let dy = 0; dy < block; dy++) {
        for (let dx = 0; dx < block; dx++) {
          const yy = Math.min(7, Math.floor(cy * block) + dy);
          const xx = Math.min(7, Math.floor(cx * block) + dx);
          out[yy * 8 + xx] = on;
        }
      }
    }
  }
  return out;
}

export function VisResolutionSemantics() {
  const [depth, setDepth] = useState<number>(0);

  const stage = STAGES[depth];
  // Semantics rises with depth (0..1); resolution falls with depth (0..1).
  const semantics = depth / MAX_DEPTH;
  const resolution = (MAX_DEPTH - depth) / MAX_DEPTH;
  // The target zone: deep enough for semantics, but resolution recovered.
  const inTarget = depth >= MAX_DEPTH - 1;

  const mask = blockyMask(STAGES[Math.min(depth, MAX_DEPTH)].grid);

  // --- layout ---
  const W = 480;
  const H = 408;

  // Feature grid preview (the CNN's current spatial map).
  const fgX = 24;
  const fgY = 72;
  const fgPx = 84; // total drawn size of the preview block
  const g = stage.grid;
  const cell = fgPx / g;

  // Upsampled mask preview (right side).
  const upX = W - 24 - 84;
  const upY = 72;
  const upPx = 84;
  const upCell = upPx / 8;

  // Bars band for semantics vs resolution.
  const barX = 24;
  const barW = W - 48;
  const semBarY = 210;
  const resBarY = 234;
  const barFillW = barW - 92; // leave room for the right-hand value label

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="The resolution vs semantics tension: downsampling deep in a CNN builds semantics but shrinks spatial resolution, giving blocky masks"
      >
        {/* Title band */}
        <text x={24} y={26} fontFamily={MONO} fontSize={13} fill={C.ink}>
          The Resolution vs Semantics Tension
        </text>
        <text x={24} y={44} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          deeper = stronger semantics, but the spatial grid collapses
        </text>

        {/* Feature-grid preview (left) */}
        <text
          x={fgX + fgPx / 2}
          y={fgY - 10}
          fontFamily={MONO}
          fontSize={10}
          fill={C.blue}
          textAnchor="middle"
        >
          feature grid
        </text>
        <g>
          {Array.from({ length: g * g }).map((_, i) => {
            const cx = i % g;
            const cy = Math.floor(i / g);
            return (
              <rect
                key={`fg-${i}`}
                x={fgX + cx * cell}
                y={fgY + cy * cell}
                width={cell}
                height={cell}
                fill={C.blueFill}
                stroke={C.blue}
                strokeWidth={0.8}
              />
            );
          })}
        </g>
        <text
          x={fgX + fgPx / 2}
          y={fgY + fgPx + 16}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
        >
          {stage.side}x{stage.side}
        </text>
        <text
          x={fgX + fgPx / 2}
          y={fgY + fgPx + 29}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          stage {depth} of {MAX_DEPTH}
        </text>

        {/* Arrow: upsample to full res */}
        <line
          x1={fgX + fgPx + 14}
          y1={fgY + fgPx / 2}
          x2={upX - 14}
          y2={upY + upPx / 2}
          stroke={C.coral}
          strokeWidth={1.4}
        />
        <polygon
          points={`${upX - 14},${upY + upPx / 2} ${upX - 22},${upY + upPx / 2 - 4} ${upX - 22},${upY + upPx / 2 + 4}`}
          fill={C.coral}
        />
        <text
          x={(fgX + fgPx + upX) / 2}
          y={fgY + fgPx / 2 - 10}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
          textAnchor="middle"
        >
          upsample
        </text>
        <text
          x={(fgX + fgPx + upX) / 2}
          y={fgY + fgPx / 2 + 4}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
          textAnchor="middle"
        >
          to 224x224
        </text>
        <text
          x={(fgX + fgPx + upX) / 2}
          y={fgY + fgPx / 2 + 20}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          {stage.patch}px/label
        </text>

        {/* Upsampled mask preview (right) */}
        <text
          x={upX + upPx / 2}
          y={upY - 10}
          fontFamily={MONO}
          fontSize={10}
          fill={C.green}
          textAnchor="middle"
        >
          output mask
        </text>
        <g>
          {mask.map((v, i) => {
            const cx = i % 8;
            const cy = Math.floor(i / 8);
            return (
              <rect
                key={`up-${i}`}
                x={upX + cx * upCell}
                y={upY + cy * upCell}
                width={upCell}
                height={upCell}
                fill={v ? C.greenFill : "var(--card)"}
                stroke={C.green}
                strokeWidth={0.5}
              />
            );
          })}
          <rect
            x={upX}
            y={upY}
            width={upPx}
            height={upPx}
            fill="none"
            stroke={C.green}
            strokeWidth={1.2}
          />
        </g>
        <text
          x={upX + upPx / 2}
          y={upY + upPx + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={inTarget ? C.green : C.coral}
          textAnchor="middle"
        >
          {depth === 0 ? "sharp" : inTarget ? "crisp" : "blocky"}
        </text>

        {/* Semantics vs resolution bars band */}
        <text x={barX} y={semBarY - 8} fontFamily={MONO} fontSize={9.5} fill={C.ink}>
          semantic richness
        </text>
        <rect
          x={barX}
          y={semBarY}
          width={barFillW}
          height={12}
          rx={2}
          fill={C.grid}
        />
        <rect
          x={barX}
          y={semBarY}
          width={Math.max(2, barFillW * semantics)}
          height={12}
          rx={2}
          fill={C.violet}
        />
        <text
          x={barX + barFillW + 8}
          y={semBarY + 10}
          fontFamily={MONO}
          fontSize={9}
          fill={C.violet}
        >
          {Math.round(semantics * 100)}%
        </text>

        <text x={barX} y={resBarY - 8 + 26} fontFamily={MONO} fontSize={9.5} fill={C.ink}>
          spatial resolution
        </text>
        <rect
          x={barX}
          y={resBarY + 26}
          width={barFillW}
          height={12}
          rx={2}
          fill={C.grid}
        />
        <rect
          x={barX}
          y={resBarY + 26}
          width={Math.max(2, barFillW * resolution)}
          height={12}
          rx={2}
          fill={C.coral}
        />
        <text
          x={barX + barFillW + 8}
          y={resBarY + 36}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
        >
          {Math.round(resolution * 100)}%
        </text>

        {/* Target-zone readout band */}
        <rect
          x={barX}
          y={300}
          width={barW}
          height={42}
          rx={4}
          fill={inTarget ? C.greenFill : "var(--background)"}
          stroke={inTarget ? C.green : C.line}
          strokeWidth={1.2}
        />
        <text
          x={W / 2}
          y={317}
          fontFamily={MONO}
          fontSize={10}
          fill={inTarget ? C.green : C.muted}
          textAnchor="middle"
        >
          {inTarget ? "target: deep semantics + recovered pixels" : "need both"}
        </text>
        <text
          x={W / 2}
          y={333}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {inTarget
            ? "keep abstraction, undo the spatial loss"
            : "low depth keeps pixels; high depth keeps meaning"}
        </text>

        {/* Caption band (split to fit width) */}
        <text x={24} y={364} fontFamily={MONO} fontSize={9} fill={C.muted}>
          Classification can throw away resolution; segmentation
        </text>
        <text x={24} y={378} fontFamily={MONO} fontSize={9} fill={C.muted}>
          can&apos;t. The whole game is keeping semantics AND pixels.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
          downsample depth
          <input
            type="range"
            min={0}
            max={MAX_DEPTH}
            step={1}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{depth}</span>
        </label>
        <button
          type="button"
          onClick={() => setDepth(MAX_DEPTH)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={depth === MAX_DEPTH ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          go deep (7x7)
        </button>
        <button
          type="button"
          onClick={() => setDepth(0)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={depth === 0 ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          full res (224)
        </button>
      </div>
    </div>
  );
}
