"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// --- problem setup --------------------------------------------------------
// True underlying signal the model is trying to recover.
const trueF = (x: number): number => Math.sin(1.4 * x);

const X0 = -3;
const X1 = 3;
const Y_LO = -2.2;
const Y_HI = 2.2;

// Twelve training x positions with a fixed (deterministic) noise offset each,
// so the scatter looks noisy but renders identically on server and client.
const TRAIN_X = [
  -2.8, -2.3, -1.8, -1.3, -0.8, -0.3, 0.4, 0.9, 1.5, 2.0, 2.5, 2.9,
];
const TRAIN_OFF = [
  0.32, -0.41, 0.18, 0.5, -0.28, 0.36, -0.45, 0.22, -0.34, 0.47, -0.2, 0.3,
];

// Five held-out validation points (same trueF + fixed offsets).
const VAL_X = [-2.5, -1.0, 0.2, 1.2, 2.3];
const VAL_OFF = [-0.3, 0.4, -0.38, 0.33, -0.25];

const TRAIN: [number, number][] = TRAIN_X.map((x, i) => [
  x,
  trueF(x) + TRAIN_OFF[i],
]);
const VAL: [number, number][] = VAL_X.map((x, i) => [x, trueF(x) + VAL_OFF[i]]);

// Center/scale x into [-1,1] for a better-conditioned Vandermonde matrix.
const scaleX = (x: number): number => (x - (X0 + X1) / 2) / ((X1 - X0) / 2);

// --- tiny linear algebra: ridge least-squares polynomial fit --------------
// Solve (VᵀV + λI) w = Vᵀy via Gaussian elimination with partial pivoting.
function fitPoly(
  pts: [number, number][],
  degree: number,
  lambda: number,
): number[] {
  const m = degree + 1;
  // Vandermonde rows on scaled x.
  const V = pts.map(([x]) => {
    const row: number[] = [];
    let p = 1;
    const xs = scaleX(x);
    for (let j = 0; j < m; j++) {
      row.push(p);
      p *= xs;
    }
    return row;
  });
  // Normal equations A = VᵀV + λI, b = Vᵀy.
  const A: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0));
  const b: number[] = new Array<number>(m).fill(0);
  for (let r = 0; r < V.length; r++) {
    const y = pts[r][1];
    for (let i = 0; i < m; i++) {
      b[i] += V[r][i] * y;
      for (let j = 0; j < m; j++) A[i][j] += V[r][i] * V[r][j];
    }
  }
  for (let i = 0; i < m; i++) A[i][i] += lambda;

  // Gaussian elimination on the augmented [A | b].
  for (let c = 0; c < m; c++) {
    let piv = c;
    for (let r = c + 1; r < m; r++)
      if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (piv !== c) {
      [A[c], A[piv]] = [A[piv], A[c]];
      [b[c], b[piv]] = [b[piv], b[c]];
    }
    const d = A[c][c];
    if (Math.abs(d) < 1e-12) continue; // guard singular pivot
    for (let r = 0; r < m; r++) {
      if (r === c) continue;
      const f = A[r][c] / d;
      if (f === 0) continue;
      for (let k = c; k < m; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const w = new Array<number>(m).fill(0);
  for (let i = 0; i < m; i++) {
    const d = A[i][i];
    w[i] = Math.abs(d) < 1e-12 ? 0 : b[i] / d;
  }
  return w;
}

const evalPoly = (w: number[], x: number): number => {
  const xs = scaleX(x);
  let p = 1;
  let s = 0;
  for (let i = 0; i < w.length; i++) {
    s += w[i] * p;
    p *= xs;
  }
  return s;
};

const mse = (w: number[], pts: [number, number][]): number => {
  let s = 0;
  for (const [x, y] of pts) {
    const e = evalPoly(w, x) - y;
    s += e * e;
  }
  return s / pts.length;
};

const MAX_D = 15;

// Precompute train/val error across all degrees for a given lambda.
function errorCurves(lambda: number): { train: number[]; val: number[] } {
  const train: number[] = [];
  const val: number[] = [];
  for (let d = 1; d <= MAX_D; d++) {
    const w = fitPoly(TRAIN, d, lambda);
    train.push(mse(w, TRAIN));
    val.push(mse(w, VAL));
  }
  return { train, val };
}

// --- main plot geometry ---------------------------------------------------
const PX0 = 40;
const PX1 = 280;
const PY0 = 16;
const PY1 = 196;
const mapX = (x: number): number => PX0 + ((x - X0) / (X1 - X0)) * (PX1 - PX0);
const mapY = (y: number): number =>
  PY1 - ((y - Y_LO) / (Y_HI - Y_LO)) * (PY1 - PY0);
const clampY = (y: number): number => Math.max(Y_LO, Math.min(Y_HI, y));

// --- error panel geometry (right side) ------------------------------------
const EX0 = 318;
const EX1 = 426;
const EY0 = 30;
const EY1 = 150;
const emX = (d: number): number =>
  EX0 + ((d - 1) / (MAX_D - 1)) * (EX1 - EX0);

export function OverUnderfitting() {
  const [degree, setDegree] = useState(3);
  const [lambda, setLambda] = useState(0);

  const w = fitPoly(TRAIN, degree, lambda);
  const { train, val } = errorCurves(lambda);
  const trainErr = train[degree - 1];
  const valErr = val[degree - 1];

  // Shared log-ish vertical scale for the error panel.
  const maxErr = Math.max(0.001, ...train, ...val);
  const emY = (e: number): number =>
    EY1 - (Math.min(e, maxErr) / maxErr) * (EY1 - EY0);

  const errPath = (arr: number[]): string =>
    arr.map((e, i) => `${emX(i + 1).toFixed(1)},${emY(e).toFixed(1)}`).join(" ");

  const regime =
    degree <= 2 ? "underfitting" : degree >= 9 ? "overfitting" : "balanced";

  return (
    <div>
      <svg
        viewBox="0 0 440 260"
        className="h-auto w-full"
        role="img"
        aria-label="Underfitting vs overfitting"
      >
        {/* ---- left: data + fitted curve ---- */}
        <rect
          x={PX0}
          y={PY0}
          width={PX1 - PX0}
          height={PY1 - PY0}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {[-2, -1, 0, 1, 2].map((ty) => (
          <line
            key={`gy${ty}`}
            x1={PX0}
            x2={PX1}
            y1={mapY(ty)}
            y2={mapY(ty)}
            stroke={ty === 0 ? C.line : C.grid}
            strokeWidth={ty === 0 ? 1.2 : 1}
          />
        ))}
        {[-3, -2, -1, 0, 1, 2, 3].map((tx) => (
          <text
            key={`gx${tx}`}
            x={mapX(tx)}
            y={PY1 + 12}
            fontSize={8}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {tx}
          </text>
        ))}

        {/* true underlying curve (faint dashed) */}
        <polyline
          fill="none"
          stroke={C.muted}
          strokeWidth={1.4}
          strokeDasharray="4 3"
          points={plotCurve(trueF, X0, X1, 120, mapX, mapY)}
        />

        {/* fitted polynomial (clamped to view) */}
        <polyline
          fill="none"
          stroke={C.blue}
          strokeWidth={2.2}
          points={plotCurve(
            (x) => clampY(evalPoly(w, x)),
            X0,
            X1,
            200,
            mapX,
            mapY,
          )}
        />

        {/* held-out validation points (rings) */}
        {VAL.map(([x, y], i) => (
          <circle
            key={`v${i}`}
            cx={mapX(x)}
            cy={mapY(clampY(y))}
            r={3.2}
            fill="none"
            stroke={C.coral}
            strokeWidth={1.4}
          />
        ))}
        {/* training points (dots) */}
        {TRAIN.map(([x, y], i) => (
          <circle
            key={`t${i}`}
            cx={mapX(x)}
            cy={mapY(clampY(y))}
            r={3}
            fill={C.ink}
          />
        ))}

        <text
          x={PX0 + 4}
          y={PY0 + 11}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          true (dashed) · fit deg {degree}
        </text>
        <text
          x={(PX0 + PX1) / 2}
          y={PY1 + 24}
          fontSize={9}
          fill={C.line}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {regime}
        </text>

        {/* ---- right: generalization (train vs val) error vs degree ---- */}
        <rect
          x={EX0}
          y={EY0}
          width={EX1 - EX0}
          height={EY1 - EY0}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <text x={EX0} y={EY0 - 6} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          error vs degree d
        </text>
        {/* current-degree marker */}
        <line
          x1={emX(degree)}
          x2={emX(degree)}
          y1={EY0}
          y2={EY1}
          stroke={C.violet}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        {/* train error: keeps dropping */}
        <polyline
          fill="none"
          stroke={C.green}
          strokeWidth={1.8}
          points={errPath(train)}
        />
        {/* validation error: U-shaped */}
        <polyline
          fill="none"
          stroke={C.coral}
          strokeWidth={1.8}
          points={errPath(val)}
        />
        <circle cx={emX(degree)} cy={emY(trainErr)} r={2.6} fill={C.green} />
        <circle cx={emX(degree)} cy={emY(valErr)} r={2.6} fill={C.coral} />
        {[1, 5, 10, 15].map((d) => (
          <text
            key={`ed${d}`}
            x={emX(d)}
            y={EY1 + 11}
            fontSize={7.5}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {d}
          </text>
        ))}
        <text x={EX0} y={EY1 + 26} fontSize={8} fill={C.green} fontFamily={MONO}>
          ■ train {trainErr.toFixed(3)}
        </text>
        <text x={EX0} y={EY1 + 38} fontSize={8} fill={C.coral} fontFamily={MONO}>
          ■ val {valErr.toFixed(3)}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          degree d
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={degree}
            onChange={(e) => setDegree(Number(e.target.value))}
            className="w-32 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{degree}</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          λ (ridge)
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={lambda}
            onChange={(e) => setLambda(Number(e.target.value))}
            className="w-32 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{lambda.toFixed(2)}</span>
        </label>
        <span className="font-mono text-[var(--muted)]">
          low d underfits · high d overfits · λ tames wiggle
        </span>
      </div>
    </div>
  );
}
