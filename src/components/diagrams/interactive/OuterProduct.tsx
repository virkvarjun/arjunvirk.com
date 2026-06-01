"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// BP4-vec outer product: the weight-gradient matrix dC/dW = delta a^T.
// delta is a column vector (length 3), a is a row vector (length 4), and
// every entry of the 3x4 result is exactly one delta_j times one a_k.

const ROWS = 3;
const COLS = 4;

// Geometry: top row of a-cells, left column of delta-cells, matrix grid below-right.
const CELL = 40;
const GAP = 6;
const STEP = CELL + GAP;
const MAT_X = 110; // left edge of the matrix grid (and the top a-row)
const MAT_Y = 70; // top edge of the matrix grid (and the left delta-column)

function fmt(n: number): string {
  return n.toFixed(2);
}

// Map a signed product to a fill: blue for positive, coral for negative,
// with alpha scaled by magnitude (clamped). Zero-ish reads as the card color.
function fillFor(v: number): string {
  const t = Math.min(1, Math.abs(v) / 4); // products span roughly -4..4
  if (Math.abs(v) < 0.005) return "var(--card)";
  return v > 0 ? C.blueFill : C.coralFill;
}
function fillOpacity(v: number): number {
  return Math.min(1, 0.2 + Math.abs(v) / 4);
}

export function OuterProduct() {
  const [delta, setDelta] = useState<number[]>([0.5, -1.0, 0.8]);
  const [a, setA] = useState<number[]>([1.0, 2.0, -0.5, 1.5]);
  const [hover, setHover] = useState<number[] | null>(null); // [j, k]

  const setDeltaAt = (j: number, v: number) =>
    setDelta((prev) => prev.map((x, i) => (i === j ? v : x)));
  const setAAt = (k: number, v: number) =>
    setA((prev) => prev.map((x, i) => (i === k ? v : x)));

  const hj = hover ? hover[0] : -1;
  const hk = hover ? hover[1] : -1;

  return (
    <div>
      <svg
        viewBox="0 0 420 250"
        className="h-auto w-full"
        role="img"
        aria-label="Outer product visualizer for BP4"
      >
        {/* heading marks */}
        <text x={MAT_X} y={22} fontSize={12} fill={C.muted} fontFamily={MONO}>
          aᵀ (row)
        </text>
        <text x={8} y={MAT_Y - 16} fontSize={12} fill={C.muted} fontFamily={MONO}>
          δ (col)
        </text>

        {/* top row: a_k cells */}
        {a.map((v, k) => {
          const x = MAT_X + k * STEP;
          const on = k === hk;
          return (
            <g key={`a-${k}`}>
              <rect
                x={x}
                y={MAT_Y - STEP}
                width={CELL}
                height={CELL}
                fill="var(--card)"
                stroke={on ? C.coral : C.line}
                strokeWidth={on ? 2 : 1}
                rx={3}
              />
              <text
                x={x + CELL / 2}
                y={MAT_Y - STEP + CELL / 2 + 4}
                fontSize={12}
                fill={C.ink}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {fmt(v)}
              </text>
              <text
                x={x + CELL / 2}
                y={MAT_Y - STEP - 5}
                fontSize={10}
                fill={on ? C.coral : C.muted}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {`a_${k + 1}`}
              </text>
            </g>
          );
        })}

        {/* left column: delta_j cells */}
        {delta.map((v, j) => {
          const y = MAT_Y + j * STEP;
          const on = j === hj;
          return (
            <g key={`d-${j}`}>
              <rect
                x={MAT_X - STEP}
                y={y}
                width={CELL}
                height={CELL}
                fill="var(--card)"
                stroke={on ? C.coral : C.line}
                strokeWidth={on ? 2 : 1}
                rx={3}
              />
              <text
                x={MAT_X - STEP + CELL / 2}
                y={y + CELL / 2 + 4}
                fontSize={12}
                fill={C.ink}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {fmt(v)}
              </text>
              <text
                x={MAT_X - STEP - 6}
                y={y + CELL / 2 + 4}
                fontSize={10}
                fill={on ? C.coral : C.muted}
                fontFamily={MONO}
                textAnchor="end"
              >
                {`δ_${j + 1}`}
              </text>
            </g>
          );
        })}

        {/* matrix grid: cell (j,k) = delta_j * a_k */}
        {delta.map((dv, j) =>
          a.map((av, k) => {
            const prod = dv * av;
            const x = MAT_X + k * STEP;
            const y = MAT_Y + j * STEP;
            const on = j === hj && k === hk;
            return (
              <g
                key={`m-${j}-${k}`}
                onMouseEnter={() => setHover([j, k])}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  fill={fillFor(prod)}
                  fillOpacity={fillOpacity(prod)}
                  stroke={on ? C.ink : C.grid}
                  strokeWidth={on ? 2 : 0.8}
                  rx={3}
                />
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 4}
                  fontSize={11}
                  fill={C.ink}
                  fontFamily={MONO}
                  textAnchor="middle"
                >
                  {fmt(prod)}
                </text>
              </g>
            );
          }),
        )}

        {/* readout */}
        <text x={8} y={238} fontSize={11} fill={C.ink} fontFamily={MONO}>
          {hover
            ? `cell (${hj + 1},${hk + 1}) = δ_${hj + 1}·a_${hk + 1} = (${fmt(
                delta[hj],
              )})·(${fmt(a[hk])}) = ${fmt(delta[hj] * a[hk])}`
            : "hover a matrix cell to see one δ times one activation"}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {delta.map((v, j) => (
          <label key={`ds-${j}`} className="flex items-center gap-1">
            <span className="font-mono">{`δ_${j + 1}`}</span>
            <input
              type="range"
              min={-2}
              max={2}
              step={0.1}
              value={v}
              onChange={(e) => setDeltaAt(j, Number(e.target.value))}
              className="w-20 accent-[var(--foreground)]"
            />
            <span className="font-mono tabular-nums w-9">{fmt(v)}</span>
          </label>
        ))}
        {a.map((v, k) => (
          <label key={`as-${k}`} className="flex items-center gap-1">
            <span className="font-mono">{`a_${k + 1}`}</span>
            <input
              type="range"
              min={-2}
              max={2}
              step={0.1}
              value={v}
              onChange={(e) => setAAt(k, Number(e.target.value))}
              className="w-20 accent-[var(--foreground)]"
            />
            <span className="font-mono tabular-nums w-9">{fmt(v)}</span>
          </label>
        ))}
        <button
          type="button"
          onClick={() => {
            setDelta([0.5, -1.0, 0.8]);
            setA([1.0, 2.0, -0.5, 1.5]);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        BP4-vec: ∂C/∂W = δ aᵀ — every entry is one δ times one activation.
      </p>
    </div>
  );
}
