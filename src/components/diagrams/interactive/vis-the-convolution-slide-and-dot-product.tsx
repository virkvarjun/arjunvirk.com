"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..30) | drawing: input grid (left) + output map (right) (54..) |
//   dot-product readout band | caption band (bottom)
const VW = 540;
const VH = 392;

// Input image is 5x5, filter is 3x3, valid convolution -> 3x3 output.
const IN = 5;
const K = 3;
const OUT = IN - K + 1; // 3

const CELL = 30;
const GAP = 3;
const STEP = CELL + GAP;

const IN_X = 22;
const IN_Y = 58;
const IN_W = IN * CELL + (IN - 1) * GAP; // 162

// Output map placed on the right with a clear gap.
const OUT_X = 392;
const OUT_Y = 58;

// Readout band y-positions (own clear horizontal band below the drawing).
const READ_Y = 250;

// Fixed input image (deterministic, a diagonal-ish bright streak so an edge
// detector produces a visible response). Values are small integers 0..9.
const IMG: number[][] = [
  [0, 1, 1, 0, 0],
  [1, 9, 9, 1, 0],
  [1, 9, 9, 9, 1],
  [0, 1, 9, 9, 1],
  [0, 0, 1, 1, 0],
];

// Preset 3x3 filters the user can choose between. "custom" means the user has
// edited a weight and we no longer match a named preset.
type Preset = "edge" | "blur" | "ident" | "custom";
const PRESETS: Record<"edge" | "blur" | "ident", number[][]> = {
  // Laplacian-style edge detector.
  edge: [
    [-1, -1, -1],
    [-1, 8, -1],
    [-1, -1, -1],
  ],
  // Box blur (integer weights; we don't normalize, kept simple).
  blur: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  // Identity: passes the center pixel straight through.
  ident: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ],
};

const BIAS = 0;

type Kernel = number[][];

const inCellX = (col: number): number => IN_X + col * STEP;
const inCellY = (row: number): number => IN_Y + row * STEP;
const outCellX = (col: number): number => OUT_X + col * STEP;
const outCellY = (row: number): number => OUT_Y + row * STEP;

// Compute the dot product (plus bias) for the patch whose TOP-LEFT input cell
// is (row, col) in output coordinates.
function dotAt(kernel: Kernel, oRow: number, oCol: number): number {
  let sum = 0;
  for (let kr = 0; kr < K; kr++) {
    for (let kc = 0; kc < K; kc++) {
      sum += IMG[oRow + kr][oCol + kc] * kernel[kr][kc];
    }
  }
  return sum + BIAS;
}

// Full output feature map for a kernel.
function computeOutput(kernel: Kernel): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < OUT; r++) {
    const row: number[] = [];
    for (let c = 0; c < OUT; c++) row.push(dotAt(kernel, r, c));
    out.push(row);
  }
  return out;
}

const TOTAL = OUT * OUT; // 9 positions

export function VisConvolutionSlide() {
  const [preset, setPreset] = useState<Preset>("edge");
  const [kernel, setKernel] = useState<Kernel>(() =>
    PRESETS.edge.map((row) => row.slice()),
  );
  // pos in [0..TOTAL]; pos cells are "painted". The CURRENT patch is at `pos`
  // (clamped to last when pos===TOTAL, but then nothing new is highlighted).
  const [pos, setPos] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);

  const playRef = useRef<boolean>(playing);
  playRef.current = playing;

  const out = computeOutput(kernel);

  // Range of the output for color scaling (deterministic per kernel).
  let lo = Infinity;
  let hi = -Infinity;
  for (let r = 0; r < OUT; r++) {
    for (let c = 0; c < OUT; c++) {
      lo = Math.min(lo, out[r][c]);
      hi = Math.max(hi, out[r][c]);
    }
  }
  const span = hi - lo || 1;

  const step = useCallback(() => {
    setPos((p) => {
      if (p >= TOTAL) {
        setPlaying(false);
        return p;
      }
      const next = p + 1;
      if (next >= TOTAL) setPlaying(false);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    setPos(0);
  }, []);

  const choose = useCallback((p: "edge" | "blur" | "ident") => {
    setPreset(p);
    setKernel(PRESETS[p].map((row) => row.slice()));
    setPlaying(false);
    setPos(0);
  }, []);

  const editWeight = useCallback((r: number, c: number, v: number) => {
    setKernel((k) => {
      const next = k.map((row) => row.slice());
      next[r][c] = v;
      return next;
    });
    setPreset("custom");
    setPlaying(false);
    setPos(0);
  }, []);

  // Auto-play sweep: advance one position per tick while `playing`.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (!playRef.current) return;
      step();
    }, 650);
    return () => clearInterval(id);
  }, [playing, step]);

  // Current patch (if not finished), top-left output coords.
  const active = pos < TOTAL;
  const curRow = Math.floor(pos / OUT);
  const curCol = pos % OUT;

  // Painted output cells: a cell (r,c) is painted if r*OUT+c < pos.
  const isPainted = (r: number, c: number): boolean => r * OUT + c < pos;

  // Build the multiply terms for the current patch.
  const terms: { iv: number; kv: number; prod: number }[] = [];
  if (active) {
    for (let kr = 0; kr < K; kr++) {
      for (let kc = 0; kc < K; kc++) {
        const iv = IMG[curRow + kr][curCol + kc];
        const kv = kernel[kr][kc];
        terms.push({ iv, kv, prod: iv * kv });
      }
    }
  }
  const curSum = active ? dotAt(kernel, curRow, curCol) : 0;

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  // Color a painted output cell by magnitude (blue fill ramp).
  const outFill = (v: number): string => {
    const t = (v - lo) / span; // 0..1
    return t > 0.66 ? C.blue : t > 0.33 ? C.blueFill : "var(--card)";
  };
  const outTextFill = (v: number): string => {
    const t = (v - lo) / span;
    return t > 0.66 ? "var(--background)" : C.ink;
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="A 3 by 3 filter slides over a 5 by 5 input image. At each position it multiplies the nine overlapping input values by the nine filter weights and sums them, writing one value into the output feature map. Step through positions or auto-play the full sweep, and edit the filter weights to see the feature map change."
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
          The Convolution: Slide and Dot-Product
        </text>

        {/* Section labels */}
        <text
          x={IN_X}
          y={IN_Y - 10}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          input image (5×5)
        </text>
        <text
          x={OUT_X}
          y={OUT_Y - 10}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          feature map (3×3)
        </text>

        {/* Input grid cells */}
        {IMG.map((rowArr, r) =>
          rowArr.map((v, c) => {
            // Is this input cell under the current 3x3 window?
            const under =
              active &&
              r >= curRow &&
              r < curRow + K &&
              c >= curCol &&
              c < curCol + K;
            return (
              <g key={`in-${r}-${c}`}>
                <rect
                  x={inCellX(c)}
                  y={inCellY(r)}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill="var(--card)"
                  stroke={C.line}
                  strokeWidth={1}
                />
                <text
                  x={inCellX(c) + CELL / 2}
                  y={inCellY(r) + CELL / 2 + 3.5}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={10}
                  fill={under ? C.ink : C.muted}
                >
                  {v}
                </text>
              </g>
            );
          }),
        )}

        {/* Sliding 3x3 window outline + faint highlight */}
        {active && (
          <>
            <rect
              x={inCellX(curCol) - 2}
              y={inCellY(curRow) - 2}
              width={K * CELL + (K - 1) * GAP + 4}
              height={K * CELL + (K - 1) * GAP + 4}
              rx={4}
              fill={C.coralFill}
              fillOpacity={0.5}
              stroke={C.coral}
              strokeWidth={2}
            />
            {/* Re-draw the under-window numbers on top of the highlight */}
            {Array.from({ length: K }).map((_, kr) =>
              Array.from({ length: K }).map((_, kc) => {
                const r = curRow + kr;
                const c = curCol + kc;
                return (
                  <text
                    key={`win-${kr}-${kc}`}
                    x={inCellX(c) + CELL / 2}
                    y={inCellY(r) + CELL / 2 + 3.5}
                    textAnchor="middle"
                    fontFamily={MONO}
                    fontSize={10}
                    fill={C.coral}
                  >
                    {IMG[r][c]}
                  </text>
                );
              }),
            )}
          </>
        )}

        {/* Arrow from window to the target output cell */}
        {active && (
          <line
            x1={inCellX(curCol) + (K * CELL + (K - 1) * GAP) / 2}
            y1={inCellY(curRow) - 2}
            x2={outCellX(curCol) + CELL / 2}
            y2={outCellY(curRow) - 2}
            stroke={C.coral}
            strokeWidth={1.2}
            strokeDasharray="3 3"
            opacity={0.7}
          />
        )}

        {/* Output feature map cells */}
        {Array.from({ length: OUT }).map((_, r) =>
          Array.from({ length: OUT }).map((_, c) => {
            const painted = isPainted(r, c);
            const isCur = active && r === curRow && c === curCol;
            const v = out[r][c];
            return (
              <g key={`out-${r}-${c}`}>
                <rect
                  x={outCellX(c)}
                  y={outCellY(r)}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill={painted ? outFill(v) : "var(--card)"}
                  stroke={isCur ? C.coral : painted ? C.blue : C.line}
                  strokeWidth={isCur ? 2 : 1}
                  strokeDasharray={isCur && !painted ? "3 2" : undefined}
                />
                {painted && (
                  <text
                    x={outCellX(c) + CELL / 2}
                    y={outCellY(r) + CELL / 2 + 3.5}
                    textAnchor="middle"
                    fontFamily={MONO}
                    fontSize={10}
                    fill={outTextFill(v)}
                  >
                    {v}
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* Filter weights mini-panel (between input and output) */}
        <text
          x={228}
          y={IN_Y - 10}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          filter (3×3)
        </text>
        {kernel.map((rowArr, r) =>
          rowArr.map((v, c) => {
            const fx = 228 + c * 34;
            const fy = IN_Y + 24 + r * 34;
            return (
              <g key={`k-${r}-${c}`}>
                <rect
                  x={fx}
                  y={fy}
                  width={30}
                  height={30}
                  rx={3}
                  fill={C.greenFill}
                  stroke={C.green}
                  strokeWidth={1}
                />
                <text
                  x={fx + 15}
                  y={fy + 19}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={10}
                  fill={C.ink}
                >
                  {v}
                </text>
              </g>
            );
          }),
        )}

        {/* Dot-product readout band (own clear horizontal band) */}
        <line
          x1={IN_X}
          y1={READ_Y - 16}
          x2={VW - IN_X}
          y2={READ_Y - 16}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={IN_X}
          y={READ_Y}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          {active
            ? `position ${pos + 1} / ${TOTAL}  →  output cell [${curRow},${curCol}]`
            : `sweep complete: ${TOTAL} / ${TOTAL} cells painted`}
        </text>

        {/* The element-wise multiply-and-sum, wrapped over two lines if needed */}
        {active && (
          <>
            <text
              x={IN_X}
              y={READ_Y + 20}
              fontFamily={MONO}
              fontSize={10}
              fill={C.muted}
            >
              {terms
                .slice(0, 5)
                .map((t) => `${t.iv}·${t.kv}`)
                .join("  +  ")}
              {"  +"}
            </text>
            <text
              x={IN_X}
              y={READ_Y + 38}
              fontFamily={MONO}
              fontSize={10}
              fill={C.muted}
            >
              {terms
                .slice(5)
                .map((t) => `${t.iv}·${t.kv}`)
                .join("  +  ")}
              {`   + bias(${BIAS})`}
            </text>
            <text
              x={IN_X}
              y={READ_Y + 60}
              fontFamily={MONO}
              fontSize={12}
              fill={C.blue}
            >
              = {curSum}
            </text>
          </>
        )}

        {/* Caption band */}
        <text
          x={VW / 2}
          y={VH - 26}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          One filter slides over the image, dotting itself with each patch,
        </text>
        <text
          x={VW / 2}
          y={VH - 12}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          painting a feature map of where its pattern appears.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          onClick={step}
          disabled={!active}
          style={!active ? { opacity: 0.5 } : undefined}
        >
          step ▸
        </button>
        <button
          type="button"
          className={btn}
          style={playing ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setPlaying((p) => !p)}
          disabled={!active && !playing}
        >
          {playing ? "pause" : "play ▶"}
        </button>
        <button type="button" className={btn} onClick={reset}>
          reset ↺
        </button>
        <span className="font-mono text-[var(--muted)]">filter:</span>
        <button
          type="button"
          className={btn}
          style={preset === "edge" ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => choose("edge")}
        >
          edge
        </button>
        <button
          type="button"
          className={btn}
          style={preset === "blur" ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => choose("blur")}
        >
          blur
        </button>
        <button
          type="button"
          className={btn}
          style={preset === "ident" ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => choose("ident")}
        >
          identity
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono">center weight</span>
          <input
            type="range"
            min={-4}
            max={12}
            step={1}
            value={kernel[1][1]}
            onChange={(e) => editWeight(1, 1, Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{kernel[1][1]}</span>
        </label>
      </div>
    </div>
  );
}
