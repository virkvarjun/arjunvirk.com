"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..28) | plot (PLOT_Y..PLOT_Y+PLOT_H) with D*-axis on the right |
//   axis label (~ below plot) | readout band | caption band
const VW = 480;
const VH = 360;

// Plot box (the 1D density axis lives along the x of this box).
const PLOT_X = 44; // left edge of plot
const PLOT_Y = 48; // top edge of plot
const PLOT_W = 392; // width
const PLOT_H = 168; // height
const PLOT_RIGHT = PLOT_X + PLOT_W;
const PLOT_BOTTOM = PLOT_Y + PLOT_H;

// Domain of x (latent 1D space) and number of samples for the curves.
const X_MIN = -6;
const X_MAX = 6;
const SAMPLES = 96;

// Distribution parameters. p_data is fixed; p_g starts at MU_G_START and the
// slider t in [0,1] linearly moves its mean toward p_data's mean.
const MU_DATA = 1.4;
const SIGMA = 1.1;
const MU_G_START = -2.8;

function gaussian(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

// Map data-space coordinates to SVG.
const sx = (x: number): number =>
  PLOT_X + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
// Density axis: 0 at bottom, DENS_MAX at top.
const DENS_MAX = 0.42;
const syDens = (p: number): number =>
  PLOT_BOTTOM - Math.min(p / DENS_MAX, 1) * PLOT_H;
// D* axis: D in [0,1] mapped to full plot height (0.5 sits in the middle).
const syD = (d: number): number => PLOT_BOTTOM - d * PLOT_H;

// Build a polyline points string for a curve sampled over the x-domain.
function curvePoints(fn: (x: number) => number, toY: (v: number) => number): string {
  const pts: string[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = X_MIN + ((X_MAX - X_MIN) * i) / SAMPLES;
    pts.push(`${sx(x).toFixed(2)},${toY(fn(x)).toFixed(2)}`);
  }
  return pts.join(" ");
}

// Jensen-Shannon divergence (in bits) between p_data and p_g, integrated
// numerically over the x-domain. Minimum (0) is reached when p_g == p_data.
function jsDivergence(muG: number): number {
  let js = 0;
  const dx = (X_MAX - X_MIN) / SAMPLES;
  for (let i = 0; i <= SAMPLES; i++) {
    const x = X_MIN + dx * i;
    const p = gaussian(x, MU_DATA, SIGMA);
    const q = gaussian(x, muG, SIGMA);
    const m = 0.5 * (p + q);
    if (p > 1e-9) js += 0.5 * p * Math.log2(p / m) * dx;
    if (q > 1e-9) js += 0.5 * q * Math.log2(q / m) * dx;
  }
  return Math.max(js, 0);
}

export function TfGanConvergence() {
  // t in [0,100]: training progress. 0 = far apart, 100 = p_g matches p_data.
  const [t, setT] = useState<number>(0);

  const frac = t / 100;
  const muG = MU_G_START + (MU_DATA - MU_G_START) * frac;

  const pData = (x: number): number => gaussian(x, MU_DATA, SIGMA);
  const pG = (x: number): number => gaussian(x, muG, SIGMA);
  // Optimal discriminator D*(x) = p_data / (p_data + p_g).
  const dStar = (x: number): number => {
    const a = pData(x);
    const b = pG(x);
    const denom = a + b;
    return denom < 1e-12 ? 0.5 : a / denom;
  };

  const dataPts = curvePoints(pData, syDens);
  const gPts = curvePoints(pG, syDens);
  const dPts = curvePoints(dStar, syD);

  const js = jsDivergence(muG);
  const converged = js < 0.01;
  const half = syD(0.5);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Why GAN training converges: as the generator distribution p_g moves toward the real data distribution p_data, the optimal discriminator D*(x) = p_data/(p_data+p_g) flattens toward the constant 1/2 and the Jensen-Shannon divergence drops to zero at the Nash equilibrium where the fake and real distributions coincide."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={22}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          Why GAN Training Converges
        </text>

        {/* Plot frame */}
        <rect
          x={PLOT_X}
          y={PLOT_Y}
          width={PLOT_W}
          height={PLOT_H}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* D* = 0.5 reference line (the coin flip) */}
        <line
          x1={PLOT_X}
          y1={half}
          x2={PLOT_RIGHT}
          y2={half}
          stroke={C.grid}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={PLOT_RIGHT - 4}
          y={half - 5}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          D* = 1/2
        </text>

        {/* p_data filled curve (real) */}
        <polyline
          points={`${sx(X_MIN).toFixed(2)},${PLOT_BOTTOM} ${dataPts} ${sx(
            X_MAX,
          ).toFixed(2)},${PLOT_BOTTOM}`}
          fill={C.blueFill}
          stroke="none"
          opacity={0.85}
        />
        <polyline points={dataPts} fill="none" stroke={C.blue} strokeWidth={2} />

        {/* p_g filled curve (fake) */}
        <polyline
          points={`${sx(X_MIN).toFixed(2)},${PLOT_BOTTOM} ${gPts} ${sx(
            X_MAX,
          ).toFixed(2)},${PLOT_BOTTOM}`}
          fill={C.coralFill}
          stroke="none"
          opacity={0.7}
        />
        <polyline points={gPts} fill="none" stroke={C.coral} strokeWidth={2} />

        {/* D*(x) curve (green), drawn last so it sits on top */}
        <polyline
          points={dPts}
          fill="none"
          stroke={C.green}
          strokeWidth={2}
          strokeDasharray="5 3"
        />

        {/* Legend, top-left inside plot (clear of the curves' peaks) */}
        <g fontFamily={MONO} fontSize={9}>
          <line
            x1={PLOT_X + 10}
            y1={PLOT_Y + 14}
            x2={PLOT_X + 26}
            y2={PLOT_Y + 14}
            stroke={C.blue}
            strokeWidth={2}
          />
          <text x={PLOT_X + 30} y={PLOT_Y + 17} fill={C.muted}>
            p_data
          </text>
          <line
            x1={PLOT_X + 86}
            y1={PLOT_Y + 14}
            x2={PLOT_X + 102}
            y2={PLOT_Y + 14}
            stroke={C.coral}
            strokeWidth={2}
          />
          <text x={PLOT_X + 106} y={PLOT_Y + 17} fill={C.muted}>
            p_g
          </text>
          <line
            x1={PLOT_X + 146}
            y1={PLOT_Y + 14}
            x2={PLOT_X + 162}
            y2={PLOT_Y + 14}
            stroke={C.green}
            strokeWidth={2}
            strokeDasharray="5 3"
          />
          <text x={PLOT_X + 166} y={PLOT_Y + 17} fill={C.muted}>
            D*(x)
          </text>
        </g>

        {/* Left axis tick labels for D* */}
        <text
          x={PLOT_X - 6}
          y={syD(1) + 3}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          1
        </text>
        <text
          x={PLOT_X - 6}
          y={syD(0) + 1}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          0
        </text>

        {/* x-axis label below the plot */}
        <text
          x={PLOT_X + PLOT_W / 2}
          y={PLOT_BOTTOM + 18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          x  (1D sample space) →
        </text>

        {/* Readout band */}
        <text
          x={PLOT_X}
          y={PLOT_BOTTOM + 44}
          fontFamily={MONO}
          fontSize={11}
          fill={C.ink}
        >
          D*(x) = p_data / (p_data + p_g)
        </text>
        <text
          x={PLOT_RIGHT}
          y={PLOT_BOTTOM + 44}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={11}
          fill={converged ? C.green : C.coral}
        >
          JSD = {js.toFixed(3)} bits
        </text>
        <text
          x={PLOT_X}
          y={PLOT_BOTTOM + 62}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
        >
          step {t}%
        </text>
        <text
          x={PLOT_RIGHT}
          y={PLOT_BOTTOM + 62}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={10}
          fill={converged ? C.green : C.muted}
        >
          {converged ? "Nash equilibrium reached" : "moving toward equilibrium"}
        </text>

        {/* Caption band */}
        <text
          x={VW / 2}
          y={PLOT_BOTTOM + 90}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          The optimal discriminator becomes a coin flip
        </text>
        <text
          x={VW / 2}
          y={PLOT_BOTTOM + 104}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          exactly when the fakes match reality.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">training step</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={t}
            onChange={(e) => setT(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{t}%</span>
        </label>
        <button type="button" className={btn} onClick={() => setT(0)}>
          reset
        </button>
        <button type="button" className={btn} onClick={() => setT(100)}>
          jump to equilibrium
        </button>
      </div>
    </div>
  );
}
