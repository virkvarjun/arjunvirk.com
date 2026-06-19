"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// A single Jacobian factor in the chain: a (rows x cols) matrix block whose
// drawn size is proportional to its dimensions. The label letters name the
// dimensions symbolically (e.g. rows "m", cols "k").
interface Block {
  rows: number;
  cols: number;
  rowLabel: string;
  colLabel: string;
  tag: string; // e.g. "dy/du"
}

const CELL = 9; // px per matrix cell (drawn dimension)
const MIN = 1;
const MAX = 5;

// Render a matrix block as a grid of small cells. The inner (shared) dimension
// of a product is highlighted in coral; surviving outer dimensions in blue.
function MatrixBlock({
  x,
  y,
  block,
  topInner,
  leftInner,
}: {
  x: number;
  y: number;
  block: Block;
  topInner: boolean; // highlight columns as the inner/shared dim
  leftInner: boolean; // highlight rows as the inner/shared dim
}) {
  const w = block.cols * CELL;
  const h = block.rows * CELL;
  const cells = [];
  for (let r = 0; r < block.rows; r++) {
    for (let c = 0; c < block.cols; c++) {
      const colInner = topInner && c === block.cols - 1;
      const rowInner = leftInner && r === 0;
      const fill =
        colInner || rowInner
          ? C.coralFill
          : "var(--card)";
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={x + c * CELL}
          y={y + r * CELL}
          width={CELL}
          height={CELL}
          fill={fill}
          stroke={C.grid}
          strokeWidth={0.6}
        />,
      );
    }
  }
  return (
    <g>
      {cells}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke={C.ink}
        strokeWidth={1.2}
      />
      <text
        x={x + w / 2}
        y={y - 6}
        fontSize={9}
        fill={C.muted}
        fontFamily={MONO}
        textAnchor="middle"
      >
        {block.tag}
      </text>
      <text
        x={x + w / 2}
        y={y + h + 12}
        fontSize={9}
        fill={C.ink}
        fontFamily={MONO}
        textAnchor="middle"
      >
        {block.rowLabel} × {block.colLabel}
      </text>
    </g>
  );
}

export function JacobianChainShapes() {
  const [n, setN] = useState(3); // size of x  (cols of last block)
  const [k, setK] = useState(2); // size of u
  const [m, setM] = useState(4); // size of y  (rows of first block)
  const [p, setP] = useState(2); // size of g  (extra layer)
  const [layers, setLayers] = useState(2); // 2 = [m×k][k×n], 3 = [m×p][p×k][k×n]

  // Build the chain from output (left) to input (right).
  const blocks: Block[] = [];
  if (layers >= 3) {
    blocks.push({ rows: m, cols: p, rowLabel: "m", colLabel: "p", tag: "∂y/∂g" });
    blocks.push({ rows: p, cols: k, rowLabel: "p", colLabel: "k", tag: "∂g/∂u" });
  } else {
    blocks.push({ rows: m, cols: k, rowLabel: "m", colLabel: "k", tag: "∂y/∂u" });
  }
  blocks.push({ rows: k, cols: n, rowLabel: "k", colLabel: "n", tag: "∂u/∂x" });

  // Lay blocks out left to right, vertically centered on a common baseline.
  const baseY = 70;
  const gap = 26;
  let cursorX = 18;
  const placed = blocks.map((b) => {
    const w = b.cols * CELL;
    const h = b.rows * CELL;
    const x = cursorX;
    const y = baseY - h / 2;
    cursorX += w + gap;
    return { b, x, y, w, h };
  });

  // Result block: m × n
  const resW = n * CELL;
  const resH = m * CELL;
  const resX = cursorX + 6;
  const resY = baseY - resH / 2;

  const dotY = baseY;

  return (
    <div>
      <svg
        viewBox="0 0 440 240"
        className="h-auto w-full"
        role="img"
        aria-label="Jacobian chain rule shapes"
      >
        {/* Outer dimensions m and n survive, highlight bar under result. */}
        {placed.map((pl, i) => {
          const result = (
            <MatrixBlock
              key={i}
              x={pl.x}
              y={pl.y}
              block={pl.b}
              topInner={i < placed.length - 1}
              leftInner={i > 0}
            />
          );
          return result;
        })}

        {/* Multiplication dots between factors. */}
        {placed.slice(0, -1).map((pl, i) => (
          <text
            key={`dot-${i}`}
            x={pl.x + pl.w + gap / 2}
            y={dotY + 3}
            fontSize={14}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="middle"
          >
            ·
          </text>
        ))}

        {/* Equals sign before the result. */}
        <text
          x={cursorX - gap / 2 + 2}
          y={dotY + 3}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          =
        </text>

        {/* Result block ∂y/∂x sized m × n. */}
        <g>
          <rect
            x={resX}
            y={resY}
            width={resW}
            height={resH}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1.4}
          />
          <text
            x={resX + resW / 2}
            y={resY - 6}
            fontSize={9}
            fill={C.blue}
            fontFamily={MONO}
            textAnchor="middle"
          >
            ∂y/∂x
          </text>
          <text
            x={resX + resW / 2}
            y={resY + resH + 12}
            fontSize={9}
            fill={C.blue}
            fontFamily={MONO}
            textAnchor="middle"
          >
            m × n
          </text>
        </g>

        {/* Inner-dimension annotation. */}
        <text x={18} y={118} fontSize={9} fill={C.coral} fontFamily={MONO}>
          inner {layers >= 3 ? "p, k" : "k"} must match → cancels
        </text>
        {/* Outer-dimension annotation. */}
        <text x={18} y={132} fontSize={9} fill={C.blue} fontFamily={MONO}>
          outer m, n survive into ∂y/∂x
        </text>

        {/* Shape summary line. */}
        <text x={18} y={156} fontSize={9} fill={C.ink} fontFamily={MONO}>
          {placed.map((pl) => `[${pl.b.rowLabel}×${pl.b.colLabel}]`).join(" · ")}{" "}
          = [m×n]
        </text>

        {/* Backprop note. */}
        <text x={18} y={186} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          a network is a deep composition, backprop multiplies this
        </text>
        <text x={18} y={198} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          chain of Jacobians from output back to input.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-1.5">
          <span className="font-mono">n (x)</span>
          <input
            type="range"
            min={MIN}
            max={MAX}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-20 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-6">{n}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-mono">k (u)</span>
          <input
            type="range"
            min={MIN}
            max={MAX}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="w-20 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-6">{k}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-mono">m (y)</span>
          <input
            type="range"
            min={MIN}
            max={MAX}
            value={m}
            onChange={(e) => setM(Number(e.target.value))}
            className="w-20 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-6">{m}</span>
        </label>
        {layers >= 3 && (
          <label className="flex items-center gap-1.5">
            <span className="font-mono">p (g)</span>
            <input
              type="range"
              min={MIN}
              max={MAX}
              value={p}
              onChange={(e) => setP(Number(e.target.value))}
              className="w-20 accent-[var(--foreground)]"
            />
            <span className="font-mono tabular-nums w-6">{p}</span>
          </label>
        )}
        <button
          type="button"
          onClick={() => setLayers((l) => (l >= 3 ? 2 : 3))}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {layers >= 3 ? "− one layer" : "+ one more layer"}
        </button>
      </div>
    </div>
  );
}
