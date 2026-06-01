"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// Two-panel loss explorer. LEFT: regression squared error against a fixed
// true value y = 0. RIGHT: classification cross-entropy −log(p). Each panel
// has its own slider; the two are kept independent.
const Y_TRUE = 0;

// Plot box, shared geometry for both panels.
const TOP = 30; // y for the maximum loss of a panel
const BASE = 200; // y for loss = 0
const PLOT_H = BASE - TOP;

// MSE panel x-range: predictions in [-3, 3].
const MSE_X0 = 14;
const MSE_X1 = 206;
const MSE_LMAX = 9; // (3 − 0)^2

// Cross-entropy panel x-range: p in (0, 1].
const CE_X0 = 234;
const CE_X1 = 426;
const CE_LMAX = 4.6; // ≈ −log(0.01)
const CE_CLAMP = 0.01; // avoid log(0) → ∞

export function LossExplorer() {
  const [yhat, setYhat] = useState<number>(1.5);
  const [p, setP] = useState<number>(0.6);

  // --- MSE panel mappings ---
  const mseMapX = (x: number) => MSE_X0 + ((x - -3) / 6) * (MSE_X1 - MSE_X0);
  const mseMapY = (l: number) => BASE - (Math.min(l, MSE_LMAX) / MSE_LMAX) * PLOT_H;
  const mseLoss = (pred: number) => (pred - Y_TRUE) * (pred - Y_TRUE);
  const lMse = mseLoss(yhat);

  // --- Cross-entropy panel mappings ---
  const ceMapX = (x: number) => CE_X0 + x * (CE_X1 - CE_X0);
  const ceMapY = (l: number) => BASE - (Math.min(l, CE_LMAX) / CE_LMAX) * PLOT_H;
  const ceLoss = (prob: number) => -Math.log(Math.max(prob, CE_CLAMP));
  const lCe = ceLoss(p);

  const mseCurve = plotCurve(mseLoss, -3, 3, 120, mseMapX, mseMapY);
  const ceCurve = plotCurve(ceLoss, CE_CLAMP, 1, 120, ceMapX, ceMapY);

  // Current marker positions.
  const msePtX = mseMapX(yhat);
  const msePtY = mseMapY(lMse);
  const cePtX = ceMapX(p);
  const cePtY = ceMapY(lCe);

  return (
    <div>
      <svg
        viewBox="0 0 440 240"
        className="h-auto w-full"
        role="img"
        aria-label="Loss explorer"
      >
        {/* ===== LEFT PANEL: MSE ===== */}
        <text
          x={(MSE_X0 + MSE_X1) / 2}
          y={18}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          MSE
        </text>

        {/* y-axis + x-axis */}
        <line x1={MSE_X0} y1={TOP} x2={MSE_X0} y2={BASE} stroke={C.line} strokeWidth={1} />
        <line x1={MSE_X0} y1={BASE} x2={MSE_X1} y2={BASE} stroke={C.line} strokeWidth={1} />

        {/* true value y on the prediction number line */}
        <circle cx={mseMapX(Y_TRUE)} cy={BASE} r={3} fill={C.ink} />
        <text
          x={mseMapX(Y_TRUE)}
          y={BASE + 14}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          y
        </text>

        {/* squared-error parabola */}
        <polyline points={mseCurve} fill="none" stroke={C.blue} strokeWidth={1.6} />

        {/* drop line from current prediction to the curve */}
        <line
          x1={msePtX}
          y1={BASE}
          x2={msePtX}
          y2={msePtY}
          stroke={C.coral}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle cx={msePtX} cy={BASE} r={3} fill={C.coral} />
        <circle cx={msePtX} cy={msePtY} r={4} fill={C.coral} />

        <text
          x={MSE_X0}
          y={BASE + 28}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="start"
        >
          {`L = (ŷ − y)² = ${lMse.toFixed(2)}`}
        </text>

        {/* ===== RIGHT PANEL: Cross-entropy ===== */}
        <text
          x={(CE_X0 + CE_X1) / 2}
          y={18}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Cross-entropy
        </text>

        <line x1={CE_X0} y1={TOP} x2={CE_X0} y2={BASE} stroke={C.line} strokeWidth={1} />
        <line x1={CE_X0} y1={BASE} x2={CE_X1} y2={BASE} stroke={C.line} strokeWidth={1} />

        {/* p = 1 reference (loss eases to 0) */}
        <circle cx={ceMapX(1)} cy={BASE} r={3} fill={C.ink} />
        <text
          x={ceMapX(1)}
          y={BASE + 14}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          1
        </text>
        <text
          x={CE_X0}
          y={BASE + 14}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          0
        </text>

        {/* −log(p) curve */}
        <polyline points={ceCurve} fill="none" stroke={C.violet} strokeWidth={1.6} />

        <line
          x1={cePtX}
          y1={BASE}
          x2={cePtX}
          y2={cePtY}
          stroke={C.coral}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle cx={cePtX} cy={BASE} r={3} fill={C.coral} />
        <circle cx={cePtX} cy={cePtY} r={4} fill={C.coral} />

        <text
          x={CE_X0}
          y={BASE + 28}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="start"
        >
          {`L = −log(p) = ${lCe.toFixed(2)}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">ŷ</span>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={yhat}
            onChange={(e) => setYhat(Number(e.target.value))}
            className="w-32 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{yhat.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-mono">p</span>
          <input
            type="range"
            min={0.01}
            max={1.0}
            step={0.01}
            value={p}
            onChange={(e) => setP(Number(e.target.value))}
            className="w-32 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{p.toFixed(2)}</span>
        </label>
      </div>
    </div>
  );
}
