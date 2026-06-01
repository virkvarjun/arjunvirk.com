"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

const ETA = 0.5;
const EPS = 1e-8;

// Deterministic gradient streams (no randomness).
// busy: large gradient every step. sparse: gradient only every 8th step.
function gBusy(t: number): number {
  return t >= 1 ? 1.0 : 0;
}
function gSparse(t: number): number {
  return t >= 1 && t % 8 === 0 ? 1.0 : 0;
}

// Accumulated sum of squared gradients up to and including step t.
function sumSq(g: (t: number) => number, t: number): number {
  let acc = 0;
  for (let s = 1; s <= t; s++) acc += g(s) * g(s);
  return acc;
}

function effRate(G: number): number {
  // Guard G = 0 (t = 0): denominator is sqrt(eps), rate ~ eta / sqrt(eps).
  return ETA / Math.sqrt(G + EPS);
}

export function AdagradRates() {
  const [T, setT] = useState(60);

  // Plot geometry.
  const padL = 38;
  const padR = 12;
  const plotW = 440 - padL - padR;
  const topY0 = 24;
  const topH = 78;
  const botY0 = 140;
  const botH = 78;

  const mapX = (t: number) => padL + (plotW * t) / Math.max(1, T);

  // --- Top plot: G_t. Find max over both for scaling. ---
  const Gmax = Math.max(sumSq(gBusy, T), 1);
  const mapGY = (g: number) => topY0 + topH - (topH * g) / Gmax;

  // --- Bottom plot: eff_t. Max effective rate (ignoring the spike at G=0). ---
  // At t=1, busy G=1 -> eff ~ eta. Use eta as a stable visual ceiling.
  const effMax = ETA;
  const mapEffY = (e: number) =>
    botY0 + botH - (botH * Math.min(e, effMax)) / effMax;

  const busyG = plotCurve(
    (t) => sumSq(gBusy, Math.round(t)),
    1,
    T,
    Math.min(T - 1, 160),
    mapX,
    mapGY,
  );
  const sparseG = plotCurve(
    (t) => sumSq(gSparse, Math.round(t)),
    1,
    T,
    Math.min(T - 1, 160),
    mapX,
    mapGY,
  );
  const busyEff = plotCurve(
    (t) => effRate(sumSq(gBusy, Math.round(t))),
    1,
    T,
    Math.min(T - 1, 160),
    mapX,
    mapEffY,
  );
  const sparseEff = plotCurve(
    (t) => effRate(sumSq(gSparse, Math.round(t))),
    1,
    T,
    Math.min(T - 1, 160),
    mapX,
    mapEffY,
  );

  // Current end-state read-outs.
  const GbusyNow = sumSq(gBusy, T);
  const GsparseNow = sumSq(gSparse, T);
  const effBusyNow = effRate(GbusyNow);
  const effSparseNow = effRate(GsparseNow);

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="AdaGrad per-parameter learning rate"
      >
        {/* Top plot frame */}
        <rect
          x={padL}
          y={topY0}
          width={plotW}
          height={topH}
          fill="var(--card)"
          stroke={C.line}
        />
        <text x={padL} y={topY0 - 6} fontSize={9} fontFamily={MONO} fill={C.muted}>
          G_t (Σ g²)
        </text>
        <text
          x={padL - 4}
          y={topY0 + 8}
          fontSize={8}
          fontFamily={MONO}
          fill={C.line}
          textAnchor="end"
        >
          {Gmax.toFixed(0)}
        </text>
        <text
          x={padL - 4}
          y={topY0 + topH}
          fontSize={8}
          fontFamily={MONO}
          fill={C.line}
          textAnchor="end"
        >
          0
        </text>
        <polyline points={busyG} fill="none" stroke={C.coral} strokeWidth={1.8} />
        <polyline points={sparseG} fill="none" stroke={C.blue} strokeWidth={1.8} />

        {/* Bottom plot frame */}
        <rect
          x={padL}
          y={botY0}
          width={plotW}
          height={botH}
          fill="var(--card)"
          stroke={C.line}
        />
        <text x={padL} y={botY0 - 6} fontSize={9} fontFamily={MONO} fill={C.muted}>
          eff_t = η / √(G_t + ε)
        </text>
        <text
          x={padL - 4}
          y={botY0 + 8}
          fontSize={8}
          fontFamily={MONO}
          fill={C.line}
          textAnchor="end"
        >
          {effMax.toFixed(1)}
        </text>
        <text
          x={padL - 4}
          y={botY0 + botH}
          fontSize={8}
          fontFamily={MONO}
          fill={C.line}
          textAnchor="end"
        >
          0
        </text>
        <polyline points={busyEff} fill="none" stroke={C.coral} strokeWidth={1.8} />
        <polyline
          points={sparseEff}
          fill="none"
          stroke={C.blue}
          strokeWidth={1.8}
        />

        {/* Step axis label */}
        <text
          x={padL + plotW}
          y={botY0 + botH + 12}
          fontSize={8}
          fontFamily={MONO}
          fill={C.line}
          textAnchor="end"
        >
          step t → {T}
        </text>
        <text x={padL} y={botY0 + botH + 12} fontSize={8} fontFamily={MONO} fill={C.line}>
          0
        </text>

        {/* Punchline note */}
        <text
          x={padL}
          y={botY0 + botH + 26}
          fontSize={8.5}
          fontFamily={MONO}
          fill={C.muted}
        >
          G only grows → eff → 0 → learning freezes (motivates RMSProp)
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span style={{ color: C.muted }}>steps T</span>
          <input
            type="range"
            min={5}
            max={200}
            step={1}
            value={T}
            onChange={(e) => setT(Number(e.target.value))}
            className="w-32 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-12">{T}</span>
        </label>
        <span style={{ color: C.coral }} className="font-mono tabular-nums">
          busy: G={GbusyNow.toFixed(0)} eff={effBusyNow.toFixed(3)}
        </span>
        <span style={{ color: C.blue }} className="font-mono tabular-nums">
          sparse: G={GsparseNow.toFixed(0)} eff={effSparseNow.toFixed(3)}
        </span>
      </div>
    </div>
  );
}
