"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// A systolic array computing C = A·B for fixed 3×3 matrices. The point of the
// animation is the DATAFLOW: A streams in from the left (row i into grid row i),
// B streams in from the top (column j into grid column j), staggered so the
// right operands meet inside each cell. On every clock tick a cell multiplies
// the A value arriving from its left by the B value arriving from its top, adds
// the product to its accumulator, and passes both values on. Each A/B value is
// loaded once at an edge and reused across its whole row/column — no re-fetch.

const A = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
const B = [
  [1, 0, 2],
  [0, 1, 1],
  [1, 1, 0],
];

// Expected result, precomputed for the completion comparison.
const Cexp = [
  [4, 5, 4],
  [10, 11, 13],
  [16, 17, 22],
];

const LAST_TICK = 6; // last cell finishes at t = i+j+2 = 4; a couple extra ticks

// Output-stationary schedule: at tick t, cell (i,j) consumes operand k = t-i-j
// (valid when 0..2), forming A[i][k]·B[k][j].
function kAt(t: number, i: number, j: number): number {
  return t - i - j;
}

// Accumulator of cell (i,j) after `tick` ticks have completed: sum the
// per-tick contributions for every t' ≤ tick whose k lands in range.
function accAt(tick: number, i: number, j: number): number {
  let s = 0;
  for (let t = 0; t <= tick; t++) {
    const k = kAt(t, i, j);
    if (k >= 0 && k <= 2) s += A[i][k] * B[k][j];
  }
  return s;
}

// Geometry.
const CELL = 56;
const GAP = 6;
const STEP = CELL + GAP;
const GRID_X = 150; // left edge of the 3×3 cell grid
const GRID_Y = 78; // top edge of the 3×3 cell grid

function cellX(j: number): number {
  return GRID_X + j * STEP;
}
function cellY(i: number): number {
  return GRID_Y + i * STEP;
}

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function SystolicArrayAnim() {
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // 1..3, larger = faster

  // Hold the live tick in a ref so the interval reads fresh state.
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const done = tick >= LAST_TICK;

  useEffect(() => {
    if (!playing) return;
    const ms = speed === 1 ? 950 : speed === 2 ? 600 : 360;
    const id = setInterval(() => {
      const next = tickRef.current + 1;
      if (next >= LAST_TICK) {
        setTick(LAST_TICK);
        setPlaying(false);
      } else {
        setTick(next);
      }
    }, ms);
    return () => clearInterval(id);
  }, [playing, speed]);

  function onStep(): void {
    setTick((t) => Math.min(LAST_TICK, t + 1));
  }
  function onReset(): void {
    setPlaying(false);
    setTick(0);
  }

  return (
    <div>
      <svg
        viewBox="0 0 440 300"
        className="h-auto w-full"
        role="img"
        aria-label="Systolic array"
      >
        {/* ---- reference: source matrix B above the grid ---- */}
        <text x={GRID_X} y={20} fontSize={11} fill={C.blue} fontFamily={MONO}>
          B (streams ↓)
        </text>
        {B.map((row, r) =>
          row.map((v, c) => (
            <text
              key={`bsrc-${r}-${c}`}
              x={cellX(c) + CELL / 2 + (c - 1) * 0}
              y={36 + r * 12}
              fontSize={10}
              fill={C.muted}
              fontFamily={MONO}
              textAnchor="middle"
            >
              {String(v)}
            </text>
          )),
        )}

        {/* ---- reference: source matrix A left of the grid ---- */}
        <text x={14} y={GRID_Y - 8} fontSize={11} fill={C.coral} fontFamily={MONO}>
          A (streams →)
        </text>
        {A.map((row, r) =>
          row.map((v, c) => (
            <text
              key={`asrc-${r}-${c}`}
              x={20 + c * 14}
              y={cellY(r) + CELL / 2 + 4}
              fontSize={10}
              fill={C.muted}
              fontFamily={MONO}
              textAnchor="middle"
            >
              {String(v)}
            </text>
          )),
        )}

        {/* ---- the 3×3 grid of multiply-accumulate cells ---- */}
        {[0, 1, 2].map((i) =>
          [0, 1, 2].map((j) => {
            const x = cellX(j);
            const y = cellY(i);
            const k = kAt(tick, i, j);
            const active = !done && k >= 0 && k <= 2;
            const acc = accAt(tick, i, j);
            const finished = accAt(LAST_TICK, i, j) === acc && tick >= i + j + 2;
            return (
              <g key={`cell-${i}-${j}`}>
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={4}
                  fill={active ? C.greenFill : "var(--card)"}
                  stroke={active ? C.green : finished ? C.green : C.line}
                  strokeWidth={active ? 1.8 : finished ? 1.4 : 1}
                />
                {/* running accumulator (the stationary output) */}
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 7}
                  fontSize={20}
                  fill={C.ink}
                  fontFamily={MONO}
                  textAnchor="middle"
                  fontWeight={600}
                >
                  {String(acc)}
                </text>
                {/* incoming A operand, entering from the left this tick */}
                {active && (
                  <text
                    x={x - 9}
                    y={y + CELL / 2 + 4}
                    fontSize={11}
                    fill={C.coral}
                    fontFamily={MONO}
                    textAnchor="end"
                  >
                    {String(A[i][k])}
                  </text>
                )}
                {/* incoming B operand, entering from the top this tick */}
                {active && (
                  <text
                    x={x + CELL / 2}
                    y={y - 6}
                    fontSize={11}
                    fill={C.blue}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    {String(B[k][j])}
                  </text>
                )}
                {/* the product being added this tick */}
                {active && (
                  <text
                    x={x + CELL - 5}
                    y={y + CELL - 6}
                    fontSize={9}
                    fill={C.green}
                    fontFamily={MONO}
                    textAnchor="end"
                  >
                    {`+${A[i][k] * B[k][j]}`}
                  </text>
                )}
                {/* index hint, top-left of each cell */}
                <text
                  x={x + 5}
                  y={y + 13}
                  fontSize={8}
                  fill={C.muted}
                  fontFamily={MONO}
                >
                  {`C${i}${j}`}
                </text>
              </g>
            );
          }),
        )}

        {/* ---- dataflow arrows feeding the grid ---- */}
        {/* A: one arrow per row entering the left edge */}
        {[0, 1, 2].map((i) => {
          const y = cellY(i) + CELL / 2;
          return (
            <g key={`aflow-${i}`} stroke={C.coral} fill={C.coral}>
              <line
                x1={GRID_X - 40}
                y1={y}
                x2={GRID_X - 4}
                y2={y}
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
              <polygon
                stroke="none"
                points={`${GRID_X - 4},${y} ${GRID_X - 11},${y - 4} ${GRID_X - 11},${y + 4}`}
              />
            </g>
          );
        })}
        {/* B: one arrow per column entering the top edge */}
        {[0, 1, 2].map((j) => {
          const x = cellX(j) + CELL / 2;
          return (
            <g key={`bflow-${j}`} stroke={C.blue} fill={C.blue}>
              <line
                x1={x}
                y1={GRID_Y - 30}
                x2={x}
                y2={GRID_Y - 4}
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
              <polygon
                stroke="none"
                points={`${x},${GRID_Y - 4} ${x - 4},${GRID_Y - 11} ${x + 4},${GRID_Y - 11}`}
              />
            </g>
          );
        })}

        {/* ---- tick counter ---- */}
        <text x={GRID_X + 3 * STEP - GAP} y={20} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="end">
          {`tick t = ${tick}`}
        </text>

        {/* ---- status line / completion confirmation ---- */}
        {done ? (
          <g>
            <text x={GRID_X} y={284} fontSize={12} fill={C.green} fontFamily={MONO} fontWeight={600}>
              {`✓ C = A×B`}
            </text>
            <text x={GRID_X} y={297} fontSize={9} fill={C.muted} fontFamily={MONO}>
              {`expected: [${Cexp[0].join(" ")}] [${Cexp[1].join(" ")}] [${Cexp[2].join(" ")}]`}
            </text>
          </g>
        ) : (
          <text x={GRID_X} y={290} fontSize={10} fill={C.muted} fontFamily={MONO}>
            {`cell (i,j) adds A[i][k]·B[k][j],  k = t−i−j`}
          </text>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className={btn} onClick={onStep}>
          Step
        </button>
        <button type="button" className={btn} onClick={onReset}>
          Reset
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono">speed</span>
          <input
            type="range"
            min={1}
            max={3}
            step={1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-24 accent-[var(--foreground)]"
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Each A value enters once on the left and walks rightward across its row;
        each B value enters once on the top and walks down its column. A cell
        multiplies the pair currently passing through it and adds it to a
        running total — so every value is loaded once and reused across the
        whole grid with no memory re-fetch. That reuse is the systolic
        array&apos;s advantage.
      </p>
    </div>
  );
}
