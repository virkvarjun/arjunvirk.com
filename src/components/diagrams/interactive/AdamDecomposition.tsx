"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Plot region in SVG space.
const X0 = 60;
const X1 = 420;

// Three stacked tracks: each occupies a horizontal band.
const TRACKS = [
  { y0: 30, y1: 86 }, // (1) first moment m_t
  { y0: 110, y1: 166 }, // (2) second moment v_t
  { y0: 190, y1: 246 }, // (3) final Adam step
] as const;

const T = 60;

// Adam hyperparameters.
const B1 = 0.9;
const B2 = 0.999;
const EPS = 1e-8;

// Deterministic gradient stream: a decaying oscillation with a small bias.
function gradAt(t: number) {
  return Math.cos(t * 0.4) * Math.exp(-t * 0.02) + 0.3;
}

type Series = {
  g: number[];
  m: number[];
  v: number[];
  mHat: number[];
  vHat: number[];
};

// Run the standard Adam recursion once; reused for all draw modes.
function runAdam(): Series {
  const g: number[] = [];
  const m: number[] = [];
  const v: number[] = [];
  const mHat: number[] = [];
  const vHat: number[] = [];
  let mPrev = 0;
  let vPrev = 0;
  for (let i = 0; i < T; i++) {
    const t = i + 1; // bias correction uses 1-indexed step count
    const gt = gradAt(i);
    const mt = B1 * mPrev + (1 - B1) * gt;
    const vt = B2 * vPrev + (1 - B2) * gt * gt;
    g.push(gt);
    m.push(mt);
    v.push(vt);
    mHat.push(mt / (1 - Math.pow(B1, t)));
    vHat.push(vt / (1 - Math.pow(B2, t)));
    mPrev = mt;
    vPrev = vt;
  }
  return { g, m, v, mHat, vHat };
}

const S = runAdam();

// The final step depends on which pieces are switched on.
function stepSeries(useM: boolean, useV: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < T; i++) {
    if (useM && useV) out.push(S.mHat[i] / (Math.sqrt(S.vHat[i]) + EPS));
    else if (useM) out.push(S.mHat[i]); // momentum only
    else if (useV) out.push(S.g[i] / (Math.sqrt(S.vHat[i]) + EPS)); // RMSProp-like
    else out.push(S.g[i]); // raw gradient
  }
  return out;
}

function mapX(i: number) {
  return X0 + (i / (T - 1)) * (X1 - X0);
}

// Map a value series into a track band, with a symmetric-ish vertical scale
// derived from the series' own extent so each track fills its band.
function bandMapper(vals: number[], y0: number, y1: number) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of vals) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (hi - lo < 1e-9) hi = lo + 1;
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const zeroY = y1 - ((0 - lo) / (hi - lo)) * (y1 - y0);
  return {
    y: (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0),
    zeroY: Math.max(y0, Math.min(y1, zeroY)),
  };
}

function poly(vals: number[], y: (v: number) => number) {
  const pts: string[] = [];
  for (let i = 0; i < T; i++) pts.push(`${mapX(i).toFixed(2)},${y(vals[i]).toFixed(2)}`);
  return pts.join(" ");
}

export function AdamDecomposition() {
  const [useM, setUseM] = useState(true);
  const [useV, setUseV] = useState(true);

  const step = stepSeries(useM, useV);

  const m1 = bandMapper(S.mHat, TRACKS[0].y0, TRACKS[0].y1);
  const m2 = bandMapper(S.v, TRACKS[1].y0, TRACKS[1].y1);
  const m3 = bandMapper(step, TRACKS[2].y0, TRACKS[2].y1);

  const stepLabel = useM && useV ? "Adam" : useM ? "→ momentum only" : useV ? "→ RMSProp only" : "→ raw gradient";

  const btnClass =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox="0 0 440 270"
        className="h-auto w-full"
        role="img"
        aria-label="Adam = momentum + RMSProp"
      >
        {/* track 1: first moment m_t (momentum part) */}
        <line x1={X0} y1={m1.zeroY} x2={X1} y2={m1.zeroY} stroke={C.grid} strokeWidth={1} />
        {/* bias correction: raw m_t (dashed) vs corrected m_hat (solid) */}
        <polyline
          points={poly(S.m, m1.y)}
          fill="none"
          stroke={C.blue}
          strokeWidth={1.4}
          strokeDasharray="3 3"
          opacity={0.55}
        />
        <polyline points={poly(S.mHat, m1.y)} fill="none" stroke={C.blue} strokeWidth={2} />
        <text x={X0} y={TRACKS[0].y0 - 6} fontSize={10} fill={C.blue} fontFamily={MONO}>
          first moment m_t — the momentum part: which direction, smoothed
        </text>
        <text x={mapX(6)} y={m1.y(S.m[6]) + 14} fontSize={9} fill={C.blue} fontFamily={MONO} opacity={0.8}>
          m_t (raw, starts ~0)
        </text>
        <text x={mapX(10)} y={m1.y(S.mHat[10]) - 6} fontSize={9} fill={C.blue} fontFamily={MONO}>
          m̂_t (bias-corrected ↑)
        </text>

        {/* track 2: second moment v_t (RMSProp part) */}
        <line x1={X0} y1={m2.zeroY} x2={X1} y2={m2.zeroY} stroke={C.grid} strokeWidth={1} />
        <polyline points={poly(S.v, m2.y)} fill="none" stroke={C.coral} strokeWidth={2} />
        <text x={X0} y={TRACKS[1].y0 - 6} fontSize={10} fill={C.coral} fontFamily={MONO}>
          second moment v_t — the RMSProp part: how big the gradients have been
        </text>

        {/* track 3: final step */}
        <line x1={X0} y1={m3.zeroY} x2={X1} y2={m3.zeroY} stroke={C.grid} strokeWidth={1} />
        <polyline points={poly(step, m3.y)} fill="none" stroke={C.green} strokeWidth={2} />
        <text x={X0} y={TRACKS[2].y0 - 6} fontSize={10} fill={C.green} fontFamily={MONO}>
          {`step_t  ${stepLabel}`}
        </text>

        {/* shared step axis */}
        <line x1={X0} y1={251} x2={X1} y2={251} stroke={C.line} strokeWidth={1} />
        <text x={X0} y={263} fontSize={9} fill={C.muted} fontFamily={MONO}>
          t = 0
        </text>
        <text x={X1} y={263} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">
          {`t = ${T - 1}  (step →)`}
        </text>

        {/* note */}
        <text x={(X0 + X1) / 2} y={263} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          two previous ideas running at once
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setUseM((s) => !s)}
          className={btnClass}
          style={useM ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          first moment
        </button>
        <button
          type="button"
          onClick={() => setUseV((s) => !s)}
          className={btnClass}
          style={useV ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          second moment
        </button>
        <span className="font-mono text-[var(--muted)]">
          Adam isn&apos;t a new idea — it&apos;s the two previous ideas running at once.
        </span>
      </div>
    </div>
  );
}
