"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..26) | input grid + filter + output map (44..214) |
//   arithmetic band (232..320) | caption band (330..356)
const VW = 560;
const VH = 360;

// ---- Fixed, deterministic data (no Math.random / Date at runtime) ----
// 5x5 input image: top rows dark, bottom rows bright -> a horizontal edge.
const INPUT: number[][] = [
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [2, 3, 3, 7, 8],
  [2, 4, 4, 8, 9],
  [3, 4, 5, 9, 9],
];

// 3x3 filters. Horizontal-edge: bottom row minus top row.
const H_FILTER: number[][] = [
  [-1, -1, -1],
  [0, 0, 0],
  [1, 1, 1],
];
// Vertical-edge: right column minus left column.
const V_FILTER: number[][] = [
  [-1, 0, 1],
  [-1, 0, 1],
  [-1, 0, 1],
];

type FilterKind = "horizontal" | "vertical";

// 3x3 convolution (valid, no padding, stride 1).
function convolve(input: number[][], filter: number[][]): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: number[] = [];
    for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          s += input[r + i][c + j] * filter[i][j];
        }
      }
      row.push(s);
    }
    out.push(row);
  }
  return out;
}

const H_OUT = convolve(INPUT, H_FILTER); // (0,0)=5, (0,1)=10
const V_OUT = convolve(INPUT, V_FILTER);

// ---- Layout constants ----
const CELL = 26;
const GAP = 2;
const INPUT_X = 30; // left of 5x5 grid
const GRID_Y = 56; // top of grids

const cellX = (base: number, col: number) => base + col * (CELL + GAP);
const cellY = (col: number) => GRID_Y + col * (CELL + GAP);

const FILTER_X = INPUT_X + 5 * (CELL + GAP) + 40; // filter grid left edge
const OUT_X = FILTER_X + 3 * (CELL + GAP) + 60; // output grid left edge

// Color a finished output cell by magnitude (bright = strong edge).
function outFill(value: number, maxAbs: number, active: boolean): string {
  if (!active) return "var(--card)";
  const t = maxAbs === 0 ? 0 : Math.min(1, Math.abs(value) / maxAbs);
  // Blend toward the accent fill as magnitude grows; muted for near-zero.
  return t > 0.66 ? C.greenFill : t > 0.33 ? C.blueFill : "var(--card)";
}

export function VisWorkedConvolution() {
  const [kind, setKind] = useState<FilterKind>("horizontal");
  const [step, setStep] = useState<number>(1); // 1..9 positions computed so far

  const filter = kind === "horizontal" ? H_FILTER : V_FILTER;
  const output = kind === "horizontal" ? H_OUT : V_OUT;
  const maxAbs = Math.max(
    ...output.flat().map((v) => Math.abs(v)),
    1,
  );

  // Current position index (0..8) is step-1; row/col in output space.
  const idx = step - 1;
  const curR = Math.floor(idx / 3);
  const curC = idx % 3;

  // Products for the current patch, in reading order (9 terms).
  const products: { iv: number; fv: number; prod: number }[] = [];
  let running = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const iv = INPUT[curR + i][curC + j];
      const fv = filter[i][j];
      const prod = iv * fv;
      running += prod;
      products.push({ iv, fv, prod });
    }
  }
  const curValue = output[curR][curC];

  const setFilter = (k: FilterKind): void => {
    setKind(k);
    setStep(1);
  };

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  // Patch-overlay rectangle (covers a 3x3 region of the input).
  const patchX = cellX(INPUT_X, curC) - 2;
  const patchY = cellY(curR) - 2;
  const patchW = 3 * CELL + 2 * GAP + 4;
  const patchH = 3 * CELL + 2 * GAP + 4;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="A worked convolution: a 5x5 input image is convolved with a 3x3 edge filter. Stepping through each of the 9 output positions shows the nine element-wise products and their sum forming one output cell, e.g. output(0,0)=5 and output(0,1)=10. A toggle swaps the horizontal-edge filter for a vertical-edge filter to show a different feature map."
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
          Worked Convolution Example (5x5 input, 3x3 edge filter)
        </text>

        {/* ---- Section labels ---- */}
        <text
          x={INPUT_X + (5 * (CELL + GAP) - GAP) / 2}
          y={GRID_Y - 8}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          5×5 input
        </text>
        <text
          x={FILTER_X + (3 * (CELL + GAP) - GAP) / 2}
          y={GRID_Y - 8}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          {kind === "horizontal" ? "3×3 H-edge" : "3×3 V-edge"}
        </text>
        <text
          x={OUT_X + (3 * (CELL + GAP) - GAP) / 2}
          y={GRID_Y - 8}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          output map
        </text>

        {/* ---- Patch overlay behind input cells ---- */}
        <rect
          x={patchX}
          y={patchY}
          width={patchW}
          height={patchH}
          rx={4}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.6}
        />

        {/* ---- 5x5 input grid ---- */}
        {INPUT.map((rowArr, r) =>
          rowArr.map((v, c) => {
            const inPatch =
              r >= curR && r < curR + 3 && c >= curC && c < curC + 3;
            return (
              <g key={`in-${r}-${c}`}>
                <rect
                  x={cellX(INPUT_X, c)}
                  y={cellY(r)}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill="var(--card)"
                  stroke={inPatch ? C.coral : C.line}
                  strokeWidth={inPatch ? 1.3 : 1}
                />
                <text
                  x={cellX(INPUT_X, c) + CELL / 2}
                  y={cellY(r) + CELL / 2 + 3}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={10}
                  fill={inPatch ? C.ink : C.muted}
                >
                  {v}
                </text>
              </g>
            );
          }),
        )}

        {/* ---- 3x3 filter ---- */}
        {filter.map((rowArr, r) =>
          rowArr.map((v, c) => (
            <g key={`f-${r}-${c}`}>
              <rect
                x={cellX(FILTER_X, c)}
                y={cellY(r)}
                width={CELL}
                height={CELL}
                rx={3}
                fill={C.blueFill}
                stroke={C.blue}
                strokeWidth={1}
              />
              <text
                x={cellX(FILTER_X, c) + CELL / 2}
                y={cellY(r) + CELL / 2 + 3}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={10}
                fill={C.ink}
              >
                {v > 0 ? `+${v}` : v}
              </text>
            </g>
          )),
        )}

        {/* multiply glyph between input and filter */}
        <text
          x={(INPUT_X + 5 * (CELL + GAP) - GAP + FILTER_X) / 2}
          y={cellY(1) + CELL / 2 + 4}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={14}
          fill={C.muted}
        >
          ⊛
        </text>

        {/* ---- 3x3 output map ---- */}
        {output.map((rowArr, r) =>
          rowArr.map((v, c) => {
            const done = r * 3 + c < step;
            const isCur = r === curR && c === curC;
            return (
              <g key={`o-${r}-${c}`}>
                <rect
                  x={cellX(OUT_X, c)}
                  y={cellY(r)}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill={outFill(v, maxAbs, done)}
                  stroke={isCur ? C.coral : done ? C.green : C.line}
                  strokeWidth={isCur ? 1.6 : 1}
                />
                <text
                  x={cellX(OUT_X, c) + CELL / 2}
                  y={cellY(r) + CELL / 2 + 3}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={10}
                  fill={done ? C.ink : C.line}
                >
                  {done ? v : ""}
                </text>
              </g>
            );
          }),
        )}

        {/* equals glyph between filter and output */}
        <text
          x={(FILTER_X + 3 * (CELL + GAP) - GAP + OUT_X) / 2}
          y={cellY(1) + CELL / 2 + 4}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={14}
          fill={C.muted}
        >
          =
        </text>

        {/* ---- Arithmetic band (own clear band below the drawing) ---- */}
        <text
          x={INPUT_X}
          y={232}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          output({curR},{curC}): element-wise products
        </text>

        {/* 9 products laid out in a 3-column grid (3 rows x 3 cols) */}
        {products.map((p, k) => {
          const pr = Math.floor(k / 3);
          const pc = k % 3;
          const tx = INPUT_X + pc * 118;
          const ty = 250 + pr * 16;
          const fvStr = p.fv > 0 ? `+${p.fv}` : `${p.fv}`;
          return (
            <text
              key={`p-${k}`}
              x={tx}
              y={ty}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
            >
              {`${p.iv} × ${fvStr} = ${p.prod}`}
            </text>
          );
        })}

        {/* running sum -> output value */}
        <text
          x={INPUT_X}
          y={310}
          fontFamily={MONO}
          fontSize={11}
          fill={C.green}
        >
          {`sum = ${curValue}  →  output(${curR},${curC}) = ${curValue}`}
        </text>

        {/* step readout, right-aligned in the arithmetic band */}
        <text
          x={VW - 30}
          y={232}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
        >
          step {step} / 9
        </text>

        {/* ---- Caption band ---- */}
        <text
          x={VW / 2}
          y={338}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Big positive output where the bottom of the patch is brighter than
        </text>
        <text
          x={VW / 2}
          y={352}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          the top, that&apos;s a horizontal edge being detected.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          onClick={() => setStep((s: number) => (s < 9 ? s + 1 : s))}
        >
          step ▶
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => setStep(1)}
        >
          reset
        </button>
        <button
          type="button"
          className={btn}
          style={
            kind === "horizontal"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => setFilter("horizontal")}
        >
          horizontal edge
        </button>
        <button
          type="button"
          className={btn}
          style={
            kind === "vertical"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => setFilter("vertical")}
        >
          vertical edge
        </button>
        <span className="font-mono tabular-nums">
          pos ({curR},{curC})
        </span>
      </div>
    </div>
  );
}
