"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..30) | plot + axis labels (50..246) |
//   readout band (260..298) | dead-neuron box (314..352) | caption (380..393)
const VW = 460;
const VH = 404;

// --- Plot geometry ---
const PL_X = 56; // plot left
const PL_Y = 50; // plot top
const PL_W = 348; // plot width
const PL_H = 168; // plot height

// Data domain.
const X_MIN = -4;
const X_MAX = 4;
const Y_MIN = -1.2;
const Y_MAX = 4;

const mapX = (x: number): number =>
  PL_X + ((x - X_MIN) / (X_MAX - X_MIN)) * PL_W;
const mapY = (y: number): number =>
  PL_Y + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * PL_H;

function relu(x: number): number {
  return x > 0 ? x : 0;
}
function leaky(x: number, slope: number): number {
  return x > 0 ? x : slope * x;
}

// Build a polyline `points` string for an activation over the domain.
function curve(fn: (x: number) => number): string {
  const pts: string[] = [];
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const x = X_MIN + ((X_MAX - X_MIN) * i) / N;
    pts.push(`${mapX(x).toFixed(1)},${mapY(fn(x)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function VisLeakyRelu() {
  // Input x marker, stored as integer (x * 10) for clean stepping.
  const [x10, setX10] = useState<number>(-25); // x = -2.5 (negative region by default)
  // Leak slope, stored as integer (slope * 100).
  const [slope100, setSlope100] = useState<number>(10); // 0.10
  const [showDead, setShowDead] = useState<boolean>(true);

  const x = x10 / 10;
  const slope = slope100 / 100;

  const reluOut = relu(x);
  const leakyOut = leaky(x, slope);
  const reluGrad = x > 0 ? 1 : 0;
  const leakyGrad = x > 0 ? 1 : slope;
  const inNeg = x < 0;

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const mx = mapX(x);
  const x0 = mapX(0);
  const y0 = mapY(0);

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="ReLU versus Leaky ReLU plotted on the same axes. ReLU is flat zero for negative inputs so its gradient there is zero and neurons can get stuck dead. Leaky ReLU uses a small negative slope so the gradient stays nonzero. A slider moves an input marker reading off both activation outputs and their gradients, and another slider sets the leak slope."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={22}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
        >
          Leaky ReLU vs ReLU
        </text>

        {/* Plot frame */}
        <rect
          x={PL_X}
          y={PL_Y}
          width={PL_W}
          height={PL_H}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* y axis (at x=0) */}
        <line
          x1={x0}
          y1={PL_Y}
          x2={x0}
          y2={PL_Y + PL_H}
          stroke={C.grid}
          strokeWidth={1}
        />
        {/* x axis (at y=0) */}
        <line
          x1={PL_X}
          y1={y0}
          x2={PL_X + PL_W}
          y2={y0}
          stroke={C.grid}
          strokeWidth={1}
        />

        {/* Shade the negative-input region */}
        <rect
          x={PL_X}
          y={PL_Y}
          width={x0 - PL_X}
          height={PL_H}
          fill={C.coralFill}
          opacity={0.4}
        />
        <text
          x={(PL_X + x0) / 2}
          y={PL_Y + 14}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          x &lt; 0
        </text>

        {/* ReLU curve */}
        <polyline
          points={curve(relu)}
          fill="none"
          stroke={C.blue}
          strokeWidth={2}
        />
        {/* Leaky ReLU curve */}
        <polyline
          points={curve((xx) => leaky(xx, slope))}
          fill="none"
          stroke={C.coral}
          strokeWidth={2}
        />

        {/* Input marker vertical line */}
        <line
          x1={mx}
          y1={PL_Y}
          x2={mx}
          y2={PL_Y + PL_H}
          stroke={C.ink}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {/* Points where marker meets each curve */}
        <circle
          cx={mx}
          cy={mapY(reluOut)}
          r={3.4}
          fill="var(--card)"
          stroke={C.blue}
          strokeWidth={1.6}
        />
        <circle
          cx={mx}
          cy={mapY(leakyOut)}
          r={3.4}
          fill="var(--card)"
          stroke={C.coral}
          strokeWidth={1.6}
        />

        {/* x-axis tick labels */}
        {[-4, -2, 0, 2, 4].map((t) => (
          <text
            key={t}
            x={mapX(t)}
            y={PL_Y + PL_H + 14}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
          >
            {t}
          </text>
        ))}
        <text
          x={PL_X + PL_W / 2}
          y={PL_Y + PL_H + 28}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          input x
        </text>
        {/* y-axis label */}
        <text
          x={PL_X - 40}
          y={PL_Y + PL_H / 2}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          transform={`rotate(-90 ${PL_X - 40} ${PL_Y + PL_H / 2})`}
        >
          output f(x)
        </text>

        {/* Legend (top-right inside plot, clear of curves) */}
        <rect x={PL_X + PL_W - 118} y={PL_Y + 8} width={12} height={3} fill={C.blue} />
        <text
          x={PL_X + PL_W - 102}
          y={PL_Y + 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          ReLU
        </text>
        <rect x={PL_X + PL_W - 64} y={PL_Y + 8} width={12} height={3} fill={C.coral} />
        <text
          x={PL_X + PL_W - 48}
          y={PL_Y + 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Leaky
        </text>

        {/* ---- Readout band ---- */}
        <text
          x={PL_X}
          y={PL_Y + PL_H + 50}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          input x = {x.toFixed(1)}
        </text>
        {/* ReLU readout */}
        <text
          x={PL_X}
          y={PL_Y + PL_H + 66}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
        >
          ReLU: f = {reluOut.toFixed(2)}   grad = {reluGrad.toFixed(2)}
          {inNeg ? "  (dead)" : ""}
        </text>
        {/* Leaky readout */}
        <text
          x={PL_X}
          y={PL_Y + PL_H + 80}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
        >
          Leaky: f = {leakyOut.toFixed(2)}   grad = {leakyGrad.toFixed(2)}
          {inNeg ? "  (alive)" : ""}
        </text>

        {/* ---- Dead-neuron highlight box ---- */}
        {showDead && (
          <g>
            <rect
              x={PL_X}
              y={PL_Y + PL_H + 96}
              width={PL_W}
              height={38}
              rx={5}
              fill={inNeg ? C.greenFill : "var(--card)"}
              stroke={inNeg ? C.green : C.line}
              strokeWidth={1.2}
            />
            <text
              x={PL_X + 10}
              y={PL_Y + PL_H + 113}
              fontFamily={MONO}
              fontSize={9}
              fill={C.ink}
            >
              {inNeg
                ? "Stuck negative: ReLU grad 0 (dead), Leaky " +
                  slope.toFixed(2) +
                  " (learns)"
                : "Move x below 0 to see the dead-neuron region"}
            </text>
            <text
              x={PL_X + 10}
              y={PL_Y + PL_H + 127}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              {inNeg
                ? "Nonzero gradient lets the neuron recover."
                : "ReLU's flat zero side can trap neurons forever."}
            </text>
          </g>
        )}

        {/* ---- Caption ---- */}
        <text
          x={VW / 2}
          y={VH - 26}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          A small negative slope keeps gradients alive, so neurons
        </text>
        <text
          x={VW / 2}
          y={VH - 12}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          don&apos;t get stuck dead at zero.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">input x</span>
          <input
            type="range"
            min={X_MIN * 10}
            max={X_MAX * 10}
            step={1}
            value={x10}
            onChange={(e) => setX10(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{x.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-mono">leak slope</span>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={slope100}
            onChange={(e) => setSlope100(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{slope.toFixed(2)}</span>
        </label>
        <button
          type="button"
          className={btn}
          style={showDead ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setShowDead((v: boolean) => !v)}
        >
          dead-neuron view
        </button>
      </div>
    </div>
  );
}
