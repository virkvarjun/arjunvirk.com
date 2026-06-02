"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..28) | method sublabel (~46) | grids (60..230) |
//   per-method note (~250) | caption band (300..330)
const VW = 480;
const VH = 356;

// Input is a fixed 3x3; output is doubled to 6x6.
const IN_N = 3;
const OUT_N = 6;

// Fixed input activations (deterministic, no Math.random).
const INPUT: number[][] = [
  [0.9, 0.2, 0.8],
  [0.1, 0.7, 0.3],
  [0.6, 0.4, 0.9],
];

// Input grid (left) geometry.
const IN_CELL = 26;
const IN_GAP = 3;
const IN_X = 30;
const IN_Y = 70;

// Output grid (right) geometry.
const OUT_CELL = 22;
const OUT_GAP = 2;
const OUT_X = 250;
const OUT_Y = 70;

const inX = (c: number) => IN_X + c * (IN_CELL + IN_GAP);
const inY = (r: number) => IN_Y + r * (IN_CELL + IN_GAP);
const outX = (c: number) => OUT_X + c * (OUT_CELL + OUT_GAP);
const outY = (r: number) => OUT_Y + r * (OUT_CELL + OUT_GAP);

type Method = "transposed" | "interp";

// Clamp helper.
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

// Bilinear-ish interpolation: smoothly resample INPUT to OUT_N x OUT_N.
function interpOutput(): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < OUT_N; r++) {
    const row: number[] = [];
    const fr = ((r + 0.5) / OUT_N) * IN_N - 0.5;
    const r0 = Math.max(0, Math.min(IN_N - 1, Math.floor(fr)));
    const r1 = Math.min(IN_N - 1, r0 + 1);
    const wr = fr - r0;
    for (let c = 0; c < OUT_N; c++) {
      const fc = ((c + 0.5) / OUT_N) * IN_N - 0.5;
      const c0 = Math.max(0, Math.min(IN_N - 1, Math.floor(fc)));
      const c1 = Math.min(IN_N - 1, c0 + 1);
      const wc = fc - c0;
      const top = INPUT[r0][c0] * (1 - wc) + INPUT[r0][c1] * wc;
      const bot = INPUT[r1][c0] * (1 - wc) + INPUT[r1][c1] * wc;
      row.push(clamp01(top * (1 - wr) + bot * wr));
    }
    out.push(row);
  }
  return out;
}

// Transposed conv: each input pixel scatters into a kernel-sized patch with a
// fixed weight stamp, accumulated at stride spacing. When kernel is not a
// multiple of stride, overlap is uneven -> checkerboard intensity gain.
function transposedOutput(stride: number, kernel: number): number[][] {
  // Coverage count per output cell (how many input stamps land on it).
  const cover: number[][] = Array.from({ length: OUT_N }, () =>
    Array.from({ length: OUT_N }, () => 0),
  );
  const acc: number[][] = Array.from({ length: OUT_N }, () =>
    Array.from({ length: OUT_N }, () => 0),
  );
  for (let ir = 0; ir < IN_N; ir++) {
    for (let ic = 0; ic < IN_N; ic++) {
      const baseR = ir * stride;
      const baseC = ic * stride;
      for (let kr = 0; kr < kernel; kr++) {
        for (let kc = 0; kc < kernel; kc++) {
          const orow = baseR + kr;
          const ocol = baseC + kc;
          if (orow >= 0 && orow < OUT_N && ocol >= 0 && ocol < OUT_N) {
            acc[orow][ocol] += INPUT[ir][ic];
            cover[orow][ocol] += 1;
          }
        }
      }
    }
  }
  // Normalize by the average coverage so values stay in a comparable range,
  // but keep the per-cell coverage imbalance visible (that's the artifact).
  let total = 0;
  let cells = 0;
  for (let r = 0; r < OUT_N; r++)
    for (let c = 0; c < OUT_N; c++) {
      if (cover[r][c] > 0) {
        total += cover[r][c];
        cells += 1;
      }
    }
  const avgCover = cells > 0 ? total / cells : 1;
  const out: number[][] = [];
  for (let r = 0; r < OUT_N; r++) {
    const row: number[] = [];
    for (let c = 0; c < OUT_N; c++) {
      const cov = cover[r][c];
      const val = cov > 0 ? (acc[r][c] / cov) * (cov / avgCover) : 0;
      row.push(clamp01(val));
    }
    out.push(row);
  }
  return out;
}

// Map a 0..1 activation to a green fill opacity for the cell.
const fillFor = (v: number): string => `rgba(61,153,112,${(0.12 + 0.78 * v).toFixed(3)})`;

export function VisUpsampling() {
  const [method, setMethod] = useState<Method>("transposed");
  const [stride, setStride] = useState<number>(2);
  const [kernel, setKernel] = useState<number>(2);

  const isTransposed = method === "transposed";

  // Checkerboard occurs when kernel size is not divisible by stride.
  const checkerboard = isTransposed && kernel % stride !== 0;

  const out = isTransposed ? transposedOutput(stride, kernel) : interpOutput();

  const inGridW = IN_N * IN_CELL + (IN_N - 1) * IN_GAP;
  const inGridH = IN_N * IN_CELL + (IN_N - 1) * IN_GAP;
  const outGridW = OUT_N * OUT_CELL + (OUT_N - 1) * OUT_GAP;

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Two ways to double a grid's spatial size: a learnable transposed convolution, which can produce checkerboard artifacts when kernel size is not a multiple of stride, versus a fixed interpolation upsample followed by a refining convolution, which stays smooth. A toggle switches between methods and sliders adjust the transposed-conv stride and kernel size."
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
          Upsampling: Transposed Conv vs Interpolation + Conv
        </text>

        {/* Method sublabel */}
        <text
          x={VW / 2}
          y={42}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={isTransposed ? C.coral : C.blue}
        >
          {isTransposed
            ? "transposed conv: learned weights scatter each pixel"
            : "interpolation + conv: resize, then refine (smooth)"}
        </text>

        {/* Input grid label */}
        <text
          x={IN_X + inGridW / 2}
          y={IN_Y - 10}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          input 3×3
        </text>

        {/* Input cells */}
        {INPUT.map((rowArr, r) =>
          rowArr.map((v, c) => (
            <g key={`in-${r}-${c}`}>
              <rect
                x={inX(c)}
                y={inY(r)}
                width={IN_CELL}
                height={IN_CELL}
                rx={3}
                fill={fillFor(v)}
                stroke={C.line}
                strokeWidth={1}
              />
              <text
                x={inX(c) + IN_CELL / 2}
                y={inY(r) + IN_CELL / 2 + 3}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={9}
                fill={C.ink}
              >
                {v.toFixed(1)}
              </text>
            </g>
          )),
        )}

        {/* Arrow from input to output */}
        <line
          x1={IN_X + inGridW + 12}
          y1={IN_Y + inGridH / 2}
          x2={OUT_X - 12}
          y2={OUT_Y + outGridW / 2}
          stroke={C.muted}
          strokeWidth={1.4}
        />
        <polygon
          points={`${OUT_X - 12},${OUT_Y + outGridW / 2} ${OUT_X - 20},${OUT_Y + outGridW / 2 - 4} ${OUT_X - 20},${OUT_Y + outGridW / 2 + 4}`}
          fill={C.muted}
        />
        <text
          x={(IN_X + inGridW + OUT_X) / 2}
          y={IN_Y + inGridH / 2 - 8}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          ×2
        </text>

        {/* Output grid label */}
        <text
          x={OUT_X + outGridW / 2}
          y={OUT_Y - 10}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          output 6×6
        </text>

        {/* Output cells (no per-cell numbers: cells are small; color = value) */}
        {out.map((rowArr, r) =>
          rowArr.map((v, c) => (
            <rect
              key={`out-${r}-${c}`}
              x={outX(c)}
              y={outY(r)}
              width={OUT_CELL}
              height={OUT_CELL}
              rx={2}
              fill={fillFor(v)}
              stroke={C.line}
              strokeWidth={0.8}
            />
          )),
        )}

        {/* Per-method status note, in its own band below the grids */}
        <text
          x={IN_X}
          y={OUT_Y + outGridW + 26}
          textAnchor="start"
          fontFamily={MONO}
          fontSize={10}
          fill={
            isTransposed ? (checkerboard ? C.coral : C.green) : C.green
          }
        >
          {isTransposed
            ? checkerboard
              ? `kernel ${kernel} not divisible by stride ${stride}`
              : `kernel ${kernel} divides evenly by stride ${stride}`
            : "fixed resize: uniform coverage"}
        </text>
        <text
          x={IN_X}
          y={OUT_Y + outGridW + 42}
          textAnchor="start"
          fontFamily={MONO}
          fontSize={10}
          fill={
            isTransposed ? (checkerboard ? C.coral : C.green) : C.green
          }
        >
          {isTransposed
            ? checkerboard
              ? "→ uneven overlap → checkerboard artifacts"
              : "→ even overlap → clean output"
            : "→ no overlap math → no checkerboard"}
        </text>

        {/* Caption band (two lines, each fits within VW - 24) */}
        <text
          x={VW / 2}
          y={326}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Two ways to double resolution: learnable transposed
        </text>
        <text
          x={VW / 2}
          y={340}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          conv (watch for checkerboards) or upsample + conv (clean).
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={
            isTransposed
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => setMethod("transposed")}
        >
          Transposed conv
        </button>
        <button
          type="button"
          className={btn}
          style={
            !isTransposed
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => setMethod("interp")}
        >
          Interpolation + conv
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono">stride</span>
          <input
            type="range"
            min={1}
            max={3}
            step={1}
            value={stride}
            disabled={!isTransposed}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setStride(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{stride}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-mono">kernel</span>
          <input
            type="range"
            min={2}
            max={4}
            step={1}
            value={kernel}
            disabled={!isTransposed}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setKernel(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{kernel}</span>
        </label>
      </div>
    </div>
  );
}
