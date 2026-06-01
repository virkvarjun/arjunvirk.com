"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// A regression STUMP: split x at `threshold`, predict `left` below it and
// `right` at/above it. A boosting ensemble is round-0 constant + sum of stumps.
interface Stump {
  threshold: number;
  left: number;
  right: number;
}

// Hard-coded data: y = sin(0.6x) over x in [0,12] with small fixed per-point
// offsets so the curve is smooth-but-noisy and fully deterministic (no RNG).
const OFFSETS = [
  0.06, -0.09, 0.04, 0.11, -0.05, 0.08, -0.1, 0.03, 0.07, -0.06, 0.05, -0.08,
  0.09, -0.04, 0.06, -0.07,
];
const DATA: { x: number; y: number }[] = OFFSETS.map((o, i) => {
  const x = (12 * i) / (OFFSETS.length - 1);
  return { x, y: Math.sin(0.6 * x) + o };
});

const LR = 0.5; // learning rate (shrinkage)
const MAX_ROUNDS = 10;

const BASE = DATA.reduce((s, d) => s + d.y, 0) / DATA.length; // round-0 constant

// Greedily fit one stump to residuals: try each interior data x as a split
// threshold, pick the one minimizing total squared error, with each side's
// constant = mean residual on that side. Deterministic.
function fitStump(xs: number[], res: number[]): Stump {
  let best: Stump = { threshold: xs[0], left: 0, right: 0 };
  let bestErr = Infinity;
  for (let s = 1; s < xs.length; s++) {
    const threshold = xs[s];
    let lSum = 0;
    let lN = 0;
    let rSum = 0;
    let rN = 0;
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] < threshold) {
        lSum += res[i];
        lN++;
      } else {
        rSum += res[i];
        rN++;
      }
    }
    const left = lN ? lSum / lN : 0;
    const right = rN ? rSum / rN : 0;
    let err = 0;
    for (let i = 0; i < xs.length; i++) {
      const p = xs[i] < threshold ? left : right;
      err += (res[i] - p) ** 2;
    }
    if (err < bestErr) {
      bestErr = err;
      best = { threshold, left, right };
    }
  }
  return best;
}

// Build the list of stumps for the first `rounds` boosting rounds.
function buildStumps(rounds: number): Stump[] {
  const xs = DATA.map((d) => d.x);
  const stumps: Stump[] = [];
  // running prediction starts at the constant base
  const pred = DATA.map(() => BASE);
  for (let r = 0; r < rounds; r++) {
    const res = DATA.map((d, i) => d.y - pred[i]);
    const stump = fitStump(xs, res);
    stumps.push(stump);
    for (let i = 0; i < DATA.length; i++) {
      pred[i] += LR * (xs[i] < stump.threshold ? stump.left : stump.right);
    }
  }
  return stumps;
}

function ensemblePredict(x: number, stumps: Stump[]): number {
  let p = BASE;
  for (const s of stumps) p += LR * (x < s.threshold ? s.left : s.right);
  return p;
}

// Plot geometry: data x in [0,12], y in [-1.4,1.4] mapped into the SVG.
const PX0 = 36;
const PX1 = 424;
const PY0 = 20;
const PY1 = 196;
const XMIN = 0;
const XMAX = 12;
const YMIN = -1.4;
const YMAX = 1.4;

const mapX = (x: number) => PX0 + ((x - XMIN) / (XMAX - XMIN)) * (PX1 - PX0);
const mapY = (y: number) => PY1 - ((y - YMIN) / (YMAX - YMIN)) * (PY1 - PY0);

export function BoostingRounds() {
  const [rounds, setRounds] = useState(0);

  const stumps = buildStumps(rounds);
  const sse = DATA.reduce(
    (s, d) => s + (d.y - ensemblePredict(d.x, stumps)) ** 2,
    0,
  );

  const curve = plotCurve(
    (x) => ensemblePredict(x, stumps),
    XMIN,
    XMAX,
    240,
    mapX,
    mapY,
  );

  const yZero = mapY(0);

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Boosting fixes its own mistakes"
      >
        {/* light axes */}
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY1} stroke={C.line} strokeWidth={1} />
        <line
          x1={PX0}
          y1={PY1}
          x2={PX1}
          y2={PY1}
          stroke={C.line}
          strokeWidth={1}
        />
        <line
          x1={PX0}
          y1={yZero}
          x2={PX1}
          y2={yZero}
          stroke={C.line}
          strokeWidth={1}
          strokeDasharray="2 3"
        />

        {/* residual segments: point -> current prediction */}
        {DATA.map((d, i) => {
          const py = mapY(d.y);
          const ph = mapY(ensemblePredict(d.x, stumps));
          return (
            <line
              key={`r${i}`}
              x1={mapX(d.x)}
              y1={py}
              x2={mapX(d.x)}
              y2={ph}
              stroke={C.coral}
              strokeWidth={1.6}
            />
          );
        })}

        {/* current ensemble prediction (piecewise-constant) */}
        <polyline points={curve} fill="none" stroke={C.blue} strokeWidth={2} />

        {/* data points */}
        {DATA.map((d, i) => (
          <circle
            key={`d${i}`}
            cx={mapX(d.x)}
            cy={mapY(d.y)}
            r={3.2}
            fill={C.ink}
          />
        ))}

        {/* axis labels */}
        <text
          x={PX0}
          y={PY1 + 16}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          0
        </text>
        <text
          x={PX1}
          y={PY1 + 16}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          12
        </text>
        <text x={PX0 + 4} y={PY0 + 6} fontSize={10} fill={C.muted} fontFamily={MONO}>
          y
        </text>

        {/* readout */}
        <text x={PX1} y={PY0 + 6} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="end">
          {`round ${rounds} / ${MAX_ROUNDS}`}
        </text>
        <text x={PX1} y={PY0 + 22} fontSize={11} fill={C.coral} fontFamily={MONO} textAnchor="end">
          {`SSE ${sse.toFixed(3)}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setRounds((r) => Math.min(MAX_ROUNDS, r + 1))}
          disabled={rounds >= MAX_ROUNDS}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Next round
        </button>
        <button
          type="button"
          onClick={() => setRounds((r) => Math.min(MAX_ROUNDS, r + 3))}
          disabled={rounds >= MAX_ROUNDS}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Run +3
        </button>
        <button
          type="button"
          onClick={() => setRounds(0)}
          disabled={rounds === 0}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <span className="font-mono text-[var(--muted)]">
          bagging averages independent models at once; boosting adds models in
          sequence, each correcting the last.
        </span>
      </div>
    </div>
  );
}
