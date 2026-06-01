"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Plot panel geometry within the 420x240 viewBox.
const PX0 = 44; // left edge of plot
const PX1 = 396; // right edge
const PY0 = 20; // top edge
const PY1 = 196; // bottom edge
const XMIN = 0;
const XMAX = 10;
const YMIN = 0;
const YMAX = 18;

const mapX = (x: number): number =>
  PX0 + ((x - XMIN) / (XMAX - XMIN)) * (PX1 - PX0);
const mapY = (y: number): number =>
  PY1 - ((y - YMIN) / (YMAX - YMIN)) * (PY1 - PY0);

// Hard-coded scatter: roughly y = 2 + 1.3x with small fixed offsets.
const DATA: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.5, y: 3.1 },
  { x: 1.5, y: 3.6 },
  { x: 2.5, y: 5.8 },
  { x: 3.5, y: 6.1 },
  { x: 4.5, y: 8.4 },
  { x: 5.5, y: 8.7 },
  { x: 6.5, y: 11.2 },
  { x: 7.5, y: 11.4 },
  { x: 8.5, y: 13.6 },
  { x: 9.5, y: 14.1 },
];

// Closed-form least-squares fit from the hard-coded points.
function solveLS(): { m: number; b: number } {
  const n = DATA.length;
  let sx = 0;
  let sy = 0;
  for (const p of DATA) {
    sx += p.x;
    sy += p.y;
  }
  const xbar = sx / n;
  const ybar = sy / n;
  let num = 0;
  let den = 0;
  for (const p of DATA) {
    num += (p.x - xbar) * (p.y - ybar);
    den += (p.x - xbar) * (p.x - xbar);
  }
  const m = num / den;
  const b = ybar - m * xbar;
  return { m, b };
}

function mse(m: number, b: number): number {
  let s = 0;
  for (const p of DATA) {
    const r = p.y - (m * p.x + b);
    s += r * r;
  }
  return s / DATA.length;
}

const OPT = solveLS();
const OPT_MSE = mse(OPT.m, OPT.b);

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  digits: number;
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  digits,
}: SliderProps) {
  return (
    <label className="flex items-center gap-2 font-mono">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-28 accent-[var(--foreground)]"
        aria-label={label}
      />
      <span className="font-mono tabular-nums w-12">{value.toFixed(digits)}</span>
    </label>
  );
}

export function LinregFit() {
  const [m, setM] = useState<number>(0.6);
  const [b, setB] = useState<number>(1.0);
  const [showSquares, setShowSquares] = useState<boolean>(false);

  const lineAt = (x: number): number => m * x + b;
  const currentMSE = mse(m, b);

  // Line endpoints clamped to plot for drawing.
  const x0 = XMIN;
  const x1 = XMAX;
  const ly0 = lineAt(x0);
  const ly1 = lineAt(x1);

  const solve = (): void => {
    setM(OPT.m);
    setB(OPT.b);
  };

  return (
    <div>
      <svg
        viewBox="0 0 420 240"
        className="h-auto w-full"
        role="img"
        aria-label="Fit the line"
      >
        {/* Axes */}
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY1} stroke={C.line} strokeWidth={1} />
        <line x1={PX0} y1={PY1} x2={PX1} y2={PY1} stroke={C.line} strokeWidth={1} />
        <text x={PX0 - 6} y={PY0 + 8} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">
          y
        </text>
        <text x={PX1} y={PY1 + 14} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">
          x
        </text>

        {/* Squared-residual areas (drawn under everything else). */}
        {showSquares &&
          DATA.map((p, i) => {
            const py = mapY(p.y);
            const ly = mapY(lineAt(p.x));
            const side = Math.min(Math.abs(py - ly), 60);
            const top = Math.min(py, ly);
            const px = mapX(p.x);
            return (
              <rect
                key={`sq-${i}`}
                x={px}
                y={top}
                width={side}
                height={side}
                fill={C.coralFill}
                stroke={C.coral}
                strokeWidth={0.6}
                opacity={0.7}
              />
            );
          })}

        {/* Residual segments. */}
        {DATA.map((p, i) => {
          const px = mapX(p.x);
          return (
            <line
              key={`res-${i}`}
              x1={px}
              y1={mapY(p.y)}
              x2={px}
              y2={mapY(lineAt(p.x))}
              stroke={C.coral}
              strokeWidth={1}
            />
          );
        })}

        {/* Current fit line. */}
        <line
          x1={mapX(x0)}
          y1={mapY(ly0)}
          x2={mapX(x1)}
          y2={mapY(ly1)}
          stroke={C.blue}
          strokeWidth={2}
        />

        {/* Data points. */}
        {DATA.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={mapX(p.x)}
            cy={mapY(p.y)}
            r={3.5}
            fill={C.ink}
          />
        ))}

        {/* MSE readout. */}
        <text x={PX0} y={14} fontSize={13} fill={C.ink} fontFamily={MONO} fontWeight={600}>
          {`MSE = ${currentMSE.toFixed(3)}`}
        </text>
        <text x={PX1} y={14} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="end">
          {`optimal MSE = ${OPT_MSE.toFixed(3)}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <Slider
          label="slope m"
          value={m}
          min={-1}
          max={4}
          step={0.05}
          onChange={setM}
          digits={2}
        />
        <Slider
          label="intercept b"
          value={b}
          min={-5}
          max={10}
          step={0.1}
          onChange={setB}
          digits={1}
        />
        <button
          type="button"
          onClick={() => setShowSquares((v) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {showSquares ? "hide squared residuals" : "show squared residuals"}
        </button>
        <button
          type="button"
          onClick={solve}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Solve
        </button>
      </div>
    </div>
  );
}
