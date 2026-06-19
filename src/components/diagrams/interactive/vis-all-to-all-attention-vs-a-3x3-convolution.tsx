"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..28) | panel labels (~44) | two grids (60..280) |
//   readout band (~300..318) | caption band (~330..344)
const VW = 480;
const VH = 348;

// Both architectures act on the SAME patch grid. We draw a 7x7 grid (49 cells)
// for visual clarity; the caption refers to the 14x14 = 196-token ViT case.
const N = 7; // cells per side
const CELL = 22;
const GAP = 2;
const STEP = CELL + GAP;
const GRID_W = N * CELL + (N - 1) * GAP;

// Two grids side by side, each in its own horizontal half.
const LEFT_X = 24;
const RIGHT_X = VW - 24 - GRID_W;
const GRID_Y = 60;

const cellX = (originX: number, col: number) => originX + col * STEP;
const cellY = (row: number) => GRID_Y + row * STEP;
const cellCx = (originX: number, col: number) => cellX(originX, col) + CELL / 2;
const cellCy = (row: number) => cellY(row) + CELL / 2;

// Default query: center patch.
const DEFAULT_R = 3;
const DEFAULT_C = 3;

type Query = { r: number; c: number };

export function VisAttentionVsConv() {
  const [query, setQuery] = useState<Query>({ r: DEFAULT_R, c: DEFAULT_C });
  // Conv "stack layers" depth: each 3x3 conv layer grows the receptive field
  // by one ring (radius = depth). Depth 1 == a single 3x3 layer.
  const [depth, setDepth] = useState<number>(1);

  const select = (r: number, c: number): void => setQuery({ r, c });

  // Conv receptive field after `depth` stacked 3x3 layers: Chebyshev radius.
  const convReach = (r: number, c: number): boolean =>
    Math.abs(r - query.r) <= depth && Math.abs(c - query.c) <= depth;

  // Count of positions read under each architecture (excluding the query).
  const total = N * N;
  let convCount = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!(r === query.r && c === query.c) && convReach(r, c)) convCount++;
    }
  }
  const attnCount = total - 1; // attention reads every other position

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  // Render one grid of cells with a per-cell "reads" predicate + accent color.
  const renderGrid = (
    originX: number,
    reads: (r: number, c: number) => boolean,
    accent: string,
    accentFill: string,
  ): React.ReactNode => {
    const cells: React.ReactNode[] = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const isQuery = r === query.r && c === query.c;
        const isRead = !isQuery && reads(r, c);
        const fill = isQuery
          ? accent
          : isRead
            ? accentFill
            : "var(--card)";
        const stroke = isQuery || isRead ? accent : C.line;
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={cellX(originX, c)}
            y={cellY(r)}
            width={CELL}
            height={CELL}
            rx={3}
            fill={fill}
            stroke={stroke}
            strokeWidth={isQuery ? 1.8 : isRead ? 1.2 : 1}
            style={{ cursor: "pointer" }}
            onClick={() => select(r, c)}
          />,
        );
      }
    }
    return cells;
  };

  // Attention: draw thin lines from query to every other position (all-to-all).
  const attnLines: React.ReactNode[] = [];
  const qx = cellCx(LEFT_X, query.c);
  const qy = cellCy(query.r);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (r === query.r && c === query.c) continue;
      attnLines.push(
        <line
          key={`a-${r}-${c}`}
          x1={qx}
          y1={qy}
          x2={cellCx(LEFT_X, c)}
          y2={cellCy(r)}
          stroke={C.blue}
          strokeWidth={0.4}
          opacity={0.45}
        />,
      );
    }
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="On the same patch grid, a 3x3 convolution connects only a local neighborhood while self-attention connects every position to every other. Click a query position to compare the two receptive fields; a slider stacks conv layers to grow its field."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={20}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          All-to-All Attention vs a 3x3 Convolution
        </text>

        {/* Panel labels */}
        <text
          x={LEFT_X + GRID_W / 2}
          y={44}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={C.blue}
        >
          ViT layer, attention
        </text>
        <text
          x={RIGHT_X + GRID_W / 2}
          y={44}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={C.coral}
        >
          Conv layer, 3x3
        </text>

        {/* Attention all-to-all lines (behind cells) */}
        {attnLines}

        {/* Left grid: attention reads every position */}
        {renderGrid(LEFT_X, () => true, C.blue, C.blueFill)}

        {/* Right grid: conv reads only its (depth-grown) neighborhood */}
        {renderGrid(RIGHT_X, convReach, C.coral, C.coralFill)}

        {/* Per-panel readout band (own clear horizontal band below grids) */}
        <text
          x={LEFT_X + GRID_W / 2}
          y={GRID_Y + GRID_W + 18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.blue}
        >
          reads {attnCount} / {total - 1} (global)
        </text>
        <text
          x={RIGHT_X + GRID_W / 2}
          y={GRID_Y + GRID_W + 18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.coral}
        >
          reads {convCount} / {total - 1} (local)
        </text>
        <text
          x={RIGHT_X + GRID_W / 2}
          y={GRID_Y + GRID_W + 32}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          {depth} layer{depth === 1 ? "" : "s"} stacked
        </text>

        {/* Caption band */}
        <text
          x={VW / 2}
          y={VH - 16}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          One ViT layer sees the whole image; one conv layer sees a 3x3 patch.
        </text>
        <text
          x={VW / 2}
          y={VH - 4}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Global reasoning vs sample efficiency.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          onClick={() => select(DEFAULT_R, DEFAULT_C)}
          style={
            query.r === DEFAULT_R && query.c === DEFAULT_C
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          center query
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => select(0, 0)}
          style={
            query.r === 0 && query.c === 0
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          corner query
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono">stack conv layers</span>
          <input
            type="range"
            min={1}
            max={N - 1}
            step={1}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{depth}</span>
        </label>
      </div>
    </div>
  );
}
