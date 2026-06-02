"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Receptive-field model.
// We stack `depth` 3x3 stride-1 conv layers on top of an input image. The
// receptive field of one neuron in the top layer, measured back on the input,
// grows by 2 per added 3x3 layer: RF = 2*depth + 1.
// A pooling / stride-2 layer (inserted after the first conv) doubles the
// "jump" so every later 3x3 layer then adds 4 instead of 2 — the window
// onto the input widens much faster.
//
// rf(depth, pooling):
//   start jump = 1, rf = 1.
//   layer 1: rf += (3-1)*jump = 2  -> rf = 3
//   if pooling: jump *= 2  (now 2)
//   each later layer: rf += 2*jump
function receptiveField(depth: number, pooling: boolean): number {
  let rf = 1;
  let jump = 1;
  for (let l = 1; l <= depth; l++) {
    rf += 2 * jump; // a 3x3 conv adds (k-1)*jump
    if (pooling && l === 1) jump *= 2; // stride-2 pool right after layer 1
  }
  return rf;
}

// Input grid is GRID x GRID cells. We clamp the shaded region to the grid.
const GRID = 15;
const MAX_DEPTH = 6;

export function VisReceptiveField() {
  // Number of stacked 3x3 conv layers (1..MAX_DEPTH).
  const [depth, setDepth] = useState<number>(1);
  // Insert a stride-2 / pooling layer after the first conv.
  const [pooling, setPooling] = useState<boolean>(false);

  const rfRaw = receptiveField(depth, pooling);
  const rf = Math.min(rfRaw, GRID); // clamp to grid for drawing
  const covered = rfRaw >= GRID; // a deep neuron now sees (almost) everything

  // --- geometry ---
  const W = 460;
  const H = 540;

  // Input grid block (bottom).
  const gridSize = 225; // px square
  const gridX = (W - gridSize) / 2;
  const gridY = 232;
  const cell = gridSize / GRID;

  // Shaded receptive-field region, centered on the grid.
  const half = (rf - 1) / 2;
  const center = (GRID - 1) / 2;
  const lo = center - half;
  const shadeX = gridX + lo * cell;
  const shadeY = gridY + lo * cell;
  const shadeS = rf * cell;

  // Layer stack (above the grid). Each layer is a thin slab; the top slab
  // holds the single highlighted deep neuron.
  const stackTop = 96; // y of the top slab
  const slabH = 12;
  const slabGap = 8;
  const slabW = gridSize;
  const slabX = gridX;
  // Draw `depth` slabs going downward toward the grid (top slab = deepest).
  const slabs = Array.from({ length: depth }, (_, i) => i);

  // Deep neuron marker sits centered on the top slab.
  const neuronX = slabX + slabW / 2;
  const neuronY = stackTop + slabH / 2;

  // Funnel lines: from the deep neuron down to the shaded region corners.
  const lastSlabBottom = stackTop + (depth - 1) * (slabH + slabGap) + slabH;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="How a neuron's receptive field grows as more convolutional layers are stacked"
      >
        {/* ---------- Title band ---------- */}
        <text x={16} y={22} fontSize={13} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          How the Receptive Field Grows With Depth
        </text>
        <text x={16} y={38} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          {depth} stacked 3x3 layer{depth === 1 ? "" : "s"}
          {pooling ? " + stride-2 pool" : ""} — one deep neuron looks back at the input
        </text>

        {/* ---------- Readout band ---------- */}
        <line x1={16} y1={50} x2={W - 16} y2={50} stroke={C.line} strokeWidth={1} />
        <text x={16} y={68} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          receptive field
        </text>
        <text x={150} y={68} fontSize={10} fill={C.blue} fontFamily={MONO} fontWeight={700}>
          {rfRaw} x {rfRaw}
        </text>
        <text x={232} y={68} fontSize={9} fill={C.muted} fontFamily={MONO}>
          {pooling ? "pool doubles later growth" : "(2n+1) x (2n+1)"}
        </text>

        {/* ---------- Deep neuron (top) ---------- */}
        <text
          x={neuronX}
          y={stackTop - 10}
          fontSize={9}
          fill={C.coral}
          fontFamily={MONO}
          fontWeight={700}
          textAnchor="middle"
        >
          one deep neuron
        </text>

        {/* Funnel from neuron to shaded input region (drawn first, behind). */}
        <line
          x1={neuronX}
          y1={lastSlabBottom}
          x2={shadeX}
          y2={gridY}
          stroke={C.coral}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.55}
        />
        <line
          x1={neuronX}
          y1={lastSlabBottom}
          x2={shadeX + shadeS}
          y2={gridY}
          stroke={C.coral}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.55}
        />

        {/* ---------- Layer stack ---------- */}
        {slabs.map((i) => {
          const y = stackTop + i * (slabH + slabGap);
          const isTop = i === 0;
          const isPool = pooling && i === depth - 1; // visual nod to pool layer
          return (
            <g key={`slab-${i}`}>
              <rect
                x={slabX}
                y={y}
                width={slabW}
                height={slabH}
                rx={2}
                fill={isTop ? C.coralFill : C.blueFill}
                stroke={isTop ? C.coral : C.blue}
                strokeWidth={isTop ? 1.4 : 1}
                opacity={isTop ? 1 : 0.9}
              />
              <text
                x={slabX - 6}
                y={y + slabH / 2 + 3}
                fontSize={8}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="end"
              >
                {isTop ? "top" : isPool ? "pool" : `L${depth - i}`}
              </text>
            </g>
          );
        })}

        {/* The single highlighted deep neuron on the top slab. */}
        <rect
          x={neuronX - cell / 2}
          y={neuronY - slabH / 2}
          width={cell}
          height={slabH}
          rx={2}
          fill={C.coral}
        />

        {/* ---------- Input grid ---------- */}
        <text x={gridX} y={gridY - 8} fontSize={9} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          input image
        </text>

        {/* shaded receptive-field region (behind grid lines) */}
        <rect
          x={shadeX}
          y={shadeY}
          width={shadeS}
          height={shadeS}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.6}
        />

        {/* grid lines */}
        {Array.from({ length: GRID + 1 }, (_, i) => {
          const p = i * cell;
          return (
            <g key={`g-${i}`}>
              <line
                x1={gridX + p}
                y1={gridY}
                x2={gridX + p}
                y2={gridY + gridSize}
                stroke={C.grid}
                strokeWidth={1}
              />
              <line
                x1={gridX}
                y1={gridY + p}
                x2={gridX + gridSize}
                y2={gridY + p}
                stroke={C.grid}
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* grid outer border */}
        <rect
          x={gridX}
          y={gridY}
          width={gridSize}
          height={gridSize}
          fill="none"
          stroke={C.line}
          strokeWidth={1.4}
        />

        {/* center cell marker (the pixel the deep neuron is anchored over) */}
        <rect
          x={gridX + center * cell}
          y={gridY + center * cell}
          width={cell}
          height={cell}
          fill={C.coral}
          opacity={0.85}
        />

        {/* ---------- Coverage callout ---------- */}
        <text
          x={W / 2}
          y={gridY + gridSize + 18}
          fontSize={9.5}
          fill={covered ? C.green : C.muted}
          fontFamily={MONO}
          fontWeight={covered ? 700 : 400}
          textAnchor="middle"
        >
          {covered
            ? "this neuron now sees the whole input"
            : `window onto input: ${rf} x ${rf} of ${GRID} x ${GRID} cells`}
        </text>

        {/* ---------- Caption band ---------- */}
        <line x1={16} y1={gridY + gridSize + 28} x2={W - 16} y2={gridY + gridSize + 28} stroke={C.line} strokeWidth={1} />
        <text x={16} y={gridY + gridSize + 46} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          Stack layers and the window onto the input widens —
        </text>
        <text x={16} y={gridY + gridSize + 60} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          until a single deep neuron can see the entire object.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-1.5 font-mono">
          depth
          <input
            type="range"
            min={1}
            max={MAX_DEPTH}
            step={1}
            value={depth}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepth(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{depth} layer{depth === 1 ? "" : "s"}</span>
        </label>

        <button
          type="button"
          onClick={() => setPooling((v: boolean) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={pooling ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {pooling ? "pool: on" : "pool: off"}
        </button>

        <span className="font-mono tabular-nums text-[var(--muted)]">
          RF = {rfRaw} x {rfRaw}
        </span>
      </div>
    </div>
  );
}
