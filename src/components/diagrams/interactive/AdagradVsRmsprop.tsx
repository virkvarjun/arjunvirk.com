"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Deterministic stream of squared gradients: mostly steady, a little variation.
const G2_PATTERN = [1.0, 0.8, 1.2, 0.9, 1.1] as const;
const ETA = 0.5;
const EPS = 1e-8;
const T = 120;

function g2At(t: number): number {
  // t is 1-based; index into the repeating pattern.
  return G2_PATTERN[(t - 1) % G2_PATTERN.length];
}

interface Series {
  G: number[]; // AdaGrad accumulator G_t
  v: number[]; // RMSProp accumulator v_t
  adaEff: number[]; // AdaGrad effective rate
  rmsEff: number[]; // RMSProp effective rate
}

function simulate(beta: number): Series {
  const G: number[] = [];
  const v: number[] = [];
  const adaEff: number[] = [];
  const rmsEff: number[] = [];
  let Gacc = 0;
  let vacc = 0;
  for (let t = 1; t <= T; t++) {
    const g2 = g2At(t);
    Gacc += g2;
    vacc = beta * vacc + (1 - beta) * g2;
    G.push(Gacc);
    v.push(vacc);
    adaEff.push(ETA / Math.sqrt(Gacc + EPS));
    rmsEff.push(ETA / Math.sqrt(vacc + EPS));
  }
  return { G, v, adaEff, rmsEff };
}

export function AdagradVsRmsprop() {
  const [beta, setBeta] = useState<number>(0.9);

  const s = simulate(beta);

  // --- SVG layout ---
  const plotLeft = 38;
  const plotRight = 332;
  const plotW = plotRight - plotLeft;

  // Top plot (accumulators) and bottom plot (effective rates).
  const topY0 = 24;
  const topY1 = 108;
  const botY0 = 142;
  const botY1 = 226;

  const accMax = Math.max(s.G[T - 1], ...s.v) * 1.05;
  const effMax = Math.max(s.adaEff[0], s.rmsEff[0]) * 1.05;

  const mapX = (t: number) => plotLeft + (plotW * (t - 1)) / (T - 1);
  const mapTop = (y: number) => topY1 - (topY1 - topY0) * (y / accMax);
  const mapBot = (y: number) => botY1 - (botY1 - botY0) * (y / effMax);

  // Sample the series into a polyline points string.
  const poly = (arr: number[], mapY: (y: number) => number): string => {
    const STEP = 2;
    const pts: string[] = [];
    for (let i = 0; i < arr.length; i += STEP) {
      pts.push(`${mapX(i + 1).toFixed(1)},${mapY(arr[i]).toFixed(1)}`);
    }
    pts.push(`${mapX(T).toFixed(1)},${mapY(arr[T - 1]).toFixed(1)}`);
    return pts.join(" ");
  };

  const vLevel = s.v[T - 1];
  const note =
    "Forgetting old gradients keeps RMSProp alive where AdaGrad freezes.";

  const axis = (y0: number, y1: number) => (
    <>
      <line x1={plotLeft} y1={y1} x2={plotRight} y2={y1} stroke={C.line} strokeWidth={1.2} />
      <line x1={plotLeft} y1={y0} x2={plotLeft} y2={y1} stroke={C.line} strokeWidth={1.2} />
    </>
  );

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="AdaGrad vs RMSProp"
      >
        {/* ---- TOP: accumulators ---- */}
        {axis(topY0, topY1)}
        <text x={plotLeft} y={topY0 - 8} fontSize={10} fill={C.ink} fontFamily={MONO}>
          accumulator
        </text>
        <text
          x={plotLeft - 5}
          y={topY1 + 3}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          0
        </text>
        <polyline points={poly(s.G, mapTop)} fill="none" stroke={C.coral} strokeWidth={1.8} />
        <polyline points={poly(s.v, mapTop)} fill="none" stroke={C.blue} strokeWidth={1.8} />
        <text
          x={mapX(T) + 2}
          y={mapTop(s.G[T - 1]) + 3}
          fontSize={8}
          fill={C.coral}
          fontFamily={MONO}
        >
          {`G=${s.G[T - 1].toFixed(0)}`}
        </text>
        <text
          x={mapX(T) + 2}
          y={mapTop(vLevel) + 3}
          fontSize={8}
          fill={C.blue}
          fontFamily={MONO}
        >
          {`v=${vLevel.toFixed(2)}`}
        </text>

        {/* ---- BOTTOM: effective learning rates ---- */}
        {axis(botY0, botY1)}
        <text x={plotLeft} y={botY0 - 8} fontSize={10} fill={C.ink} fontFamily={MONO}>
          effective rate
        </text>
        <text
          x={plotLeft - 5}
          y={botY1 + 3}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          0
        </text>
        <polyline points={poly(s.adaEff, mapBot)} fill="none" stroke={C.coral} strokeWidth={1.8} />
        <polyline points={poly(s.rmsEff, mapBot)} fill="none" stroke={C.blue} strokeWidth={1.8} />
        <text
          x={mapX(T) + 2}
          y={mapBot(s.adaEff[T - 1]) + 3}
          fontSize={8}
          fill={C.coral}
          fontFamily={MONO}
        >
          {s.adaEff[T - 1].toFixed(3)}
        </text>
        <text
          x={mapX(T) + 2}
          y={mapBot(s.rmsEff[T - 1]) + 3}
          fontSize={8}
          fill={C.blue}
          fontFamily={MONO}
        >
          {s.rmsEff[T - 1].toFixed(3)}
        </text>

        {/* step axis label */}
        <text
          x={(plotLeft + plotRight) / 2}
          y={246}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {`step t  (1 .. ${T})`}
        </text>

        {/* legend */}
        <g>
          <line x1={356} y1={36} x2={372} y2={36} stroke={C.coral} strokeWidth={2.2} />
          <text x={376} y={39} fontSize={9} fill={C.ink} fontFamily={MONO}>
            AdaGrad
          </text>
          <line x1={356} y1={52} x2={372} y2={52} stroke={C.blue} strokeWidth={2.2} />
          <text x={376} y={55} fontSize={9} fill={C.ink} fontFamily={MONO}>
            RMSProp
          </text>
        </g>

        {/* takeaway note */}
        <text x={356} y={92} fontSize={8} fill={C.muted} fontFamily={MONO}>
          AdaGrad G_t grows
        </text>
        <text x={356} y={104} fontSize={8} fill={C.muted} fontFamily={MONO}>
          without bound;
        </text>
        <text x={356} y={116} fontSize={8} fill={C.muted} fontFamily={MONO}>
          RMSProp v_t levels
        </text>
        <text x={356} y={128} fontSize={8} fill={C.muted} fontFamily={MONO}>
          off → rate holds.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">β (RMSProp)</span>
          <input
            type="range"
            min={0.5}
            max={0.99}
            step={0.01}
            value={beta}
            onChange={(e) => setBeta(Number(e.target.value))}
            className="w-32 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-12">{beta.toFixed(2)}</span>
        </label>
        <span className="font-mono text-[var(--muted)]">{note}</span>
      </div>
    </div>
  );
}
