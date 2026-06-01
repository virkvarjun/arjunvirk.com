"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// GEMM tiling: a giant matmul C = A·B is decomposed into a grid of small
// tile-multiplies. Each output tile C[i,j] = Σ_k A[i,k]·B[k,j] is an
// independent accumulation — and each maps onto one tensor core that does a
// whole small matmul per cycle. Many tiles run in parallel.

const N = 4; // 4x4 grid of tiles per matrix
const TILE = 30; // tile side in svg units
const GAP = 2; // gap between tiles
const STEP = TILE + GAP;
const BLOCK = N * STEP - GAP; // full matrix side

// Layout: B sits above C, A sits left of C (classic matmul layout).
const C_X = 230; // left edge of C grid (and of B grid above it)
const C_Y = 95; // top edge of C grid (and of A grid left of it)
const A_X = C_X - BLOCK - 26; // A to the left, small channel between A and C
const B_Y = C_Y - BLOCK - 26; // B above, small channel between B and C

type Sel = { i: number; j: number };

// A small tile structure: which matrix, and its (row, col) block index.
type Tile = { mat: "A" | "B" | "C"; r: number; c: number };

// Deterministic spread of "parallel" tiles across the 16 output positions so
// the all-at-once view reads as a scatter of independent tensor cores.
const CORES: Sel[] = [
  { i: 0, j: 0 },
  { i: 0, j: 3 },
  { i: 1, j: 1 },
  { i: 1, j: 2 },
  { i: 2, j: 0 },
  { i: 2, j: 3 },
  { i: 3, j: 1 },
  { i: 3, j: 2 },
];

function isCore(i: number, j: number): boolean {
  return CORES.some((s) => s.i === i && s.j === j);
}

// Top-left corner (svg coords) of a tile in a given matrix.
function corner(t: Tile): { x: number; y: number } {
  const ox = t.mat === "A" ? A_X : C_X;
  const oy = t.mat === "B" ? B_Y : C_Y;
  return { x: ox + t.c * STEP, y: oy + t.r * STEP };
}

export function GemmTiling() {
  const [sel, setSel] = useState<Sel | null>({ i: 1, j: 2 });
  const [all, setAll] = useState(false);

  const reset = () => {
    setSel({ i: 1, j: 2 });
    setAll(false);
  };

  // Tile fill: depends on whether it is part of the active strips / selection.
  function fillC(i: number, j: number): { fill: string; stroke: string } {
    if (all && isCore(i, j))
      return { fill: C.greenFill, stroke: C.green };
    if (!all && sel && sel.i === i && sel.j === j)
      return { fill: C.greenFill, stroke: C.green };
    return { fill: "var(--card)", stroke: C.grid };
  }
  function fillA(r: number): { fill: string; stroke: string } {
    if (!all && sel && sel.i === r)
      return { fill: C.coralFill, stroke: C.coral };
    return { fill: "var(--card)", stroke: C.grid };
  }
  function fillB(c: number): { fill: string; stroke: string } {
    if (!all && sel && sel.j === c)
      return { fill: C.blueFill, stroke: C.blue };
    return { fill: "var(--card)", stroke: C.grid };
  }

  // Tiles<-rect helper.
  const cells = (n: number) => Array.from({ length: n }, (_, k) => k);

  return (
    <div>
      <svg
        viewBox="0 0 440 240"
        className="h-auto w-full"
        role="img"
        aria-label="GEMM tiling"
      >
        {/* matrix labels */}
        <text x={A_X} y={B_Y - 8} fontSize={11} fill={C.coral} fontFamily={MONO}>
          A (M×K)
        </text>
        <text x={C_X} y={B_Y - 8} fontSize={11} fill={C.blue} fontFamily={MONO}>
          B (K×N)
        </text>
        <text
          x={C_X}
          y={C_Y + BLOCK + 14}
          fontSize={11}
          fill={C.green}
          fontFamily={MONO}
        >
          C = A·B (M×N)
        </text>

        {/* A grid (left of C): rows align with C rows */}
        {cells(N).map((r) =>
          cells(N).map((c) => {
            const { fill, stroke } = fillA(r);
            const p = corner({ mat: "A", r, c });
            return (
              <rect
                key={`A-${r}-${c}`}
                x={p.x}
                y={p.y}
                width={TILE}
                height={TILE}
                rx={2}
                fill={fill}
                stroke={stroke}
                strokeWidth={stroke === C.grid ? 0.8 : 1.6}
              />
            );
          }),
        )}

        {/* B grid (above C): columns align with C columns */}
        {cells(N).map((r) =>
          cells(N).map((c) => {
            const { fill, stroke } = fillB(c);
            const p = corner({ mat: "B", r, c });
            return (
              <rect
                key={`B-${r}-${c}`}
                x={p.x}
                y={p.y}
                width={TILE}
                height={TILE}
                rx={2}
                fill={fill}
                stroke={stroke}
                strokeWidth={stroke === C.grid ? 0.8 : 1.6}
              />
            );
          }),
        )}

        {/* C grid (output): clickable tiles */}
        {cells(N).map((i) =>
          cells(N).map((j) => {
            const { fill, stroke } = fillC(i, j);
            const lit =
              (all && isCore(i, j)) || (!all && sel?.i === i && sel?.j === j);
            const p = corner({ mat: "C", r: i, c: j });
            return (
              <g
                key={`C-${i}-${j}`}
                onClick={() => {
                  setAll(false);
                  setSel({ i, j });
                }}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={p.x}
                  y={p.y}
                  width={TILE}
                  height={TILE}
                  rx={2}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={stroke === C.grid ? 0.8 : 1.6}
                />
                {all && lit && (
                  <text
                    x={p.x + TILE / 2}
                    y={p.y + TILE / 2 + 3}
                    fontSize={7}
                    fill={C.green}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    core
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* annotation for the single selected output tile */}
        {!all && sel && (
          <g>
            <text x={A_X} y={232} fontSize={9.5} fill={C.ink} fontFamily={MONO}>
              {`C[${sel.i + 1},${sel.j + 1}] = Σ A[${sel.i + 1},k]·B[k,${
                sel.j + 1
              }]  (k = 1..${N})`}
            </text>
            <text x={A_X} y={244} fontSize={9} fill={C.muted} fontFamily={MONO}>
              {`accumulate: D = A·B + C  →  ${N} tile-products summed into one accumulator`}
            </text>
          </g>
        )}
        {all && (
          <text x={A_X} y={232} fontSize={9.5} fill={C.ink} fontFamily={MONO}>
            {`${CORES.length} output tiles compute at once — each tile-multiply on its own tensor core`}
          </text>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">
          click an output tile, or:
        </span>
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {all ? "show one tile" : "compute all (parallel)"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        A giant matmul is many small tile-multiplies done in parallel and
        summed. Each tile maps onto one tensor core — a unit that does a whole
        small matmul per cycle, which is why it is such a win.
      </p>
    </div>
  );
}
