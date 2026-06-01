"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// Plot panel geometry within the 420x240 viewBox.
const PX0 = 44; // left edge of plot
const PX1 = 396; // right edge
const PY0 = 24; // top edge
const PY1 = 196; // bottom edge
const XMIN = -3;
const XMAX = 3;
const YMIN = -6;
const YMAX = 6;

const mapX = (x: number): number =>
  PX0 + ((x - XMIN) / (XMAX - XMIN)) * (PX1 - PX0);
const mapY = (y: number): number =>
  PY1 - ((y - YMIN) / (YMAX - YMIN)) * (PY1 - PY0);

const relu = (t: number): number => (t > 0 ? t : 0);

type SliderProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

function Slider({ label, value, onChange }: SliderProps) {
  return (
    <label className="flex items-center gap-2 font-mono">
      {label}
      <input
        type="range"
        min={-2}
        max={2}
        step={0.1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24 accent-[var(--foreground)]"
        aria-label={label}
      />
      <span className="font-mono tabular-nums w-9">{value.toFixed(1)}</span>
    </label>
  );
}

export function LinearCollapse() {
  const [w1, setW1] = useState<number>(1.4);
  const [b1, setB1] = useState<number>(-0.8);
  const [w2, setW2] = useState<number>(-1.2);
  const [b2, setB2] = useState<number>(1.1);
  const [relUOn, setRelUOn] = useState<boolean>(false);

  // The composed two-layer map.
  const composed = (x: number): number => {
    const h = w1 * x + b1;
    const a = relUOn ? relu(h) : h;
    return w2 * a + b2;
  };

  // The single linear unit's live-collapsed parameters.
  const W = w2 * w1;
  const B = w2 * b1 + b2;
  const single = (x: number): number => W * x + B;

  const composedPts = plotCurve(composed, XMIN, XMAX, 120, mapX, mapY);
  const singlePts = plotCurve(single, XMIN, XMAX, 120, mapX, mapY);

  const x0 = mapX(0);
  const y0 = mapY(0);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox="0 0 420 240"
        className="h-auto w-full"
        role="img"
        aria-label="Two linear layers collapse into one"
      >
        {/* plot frame */}
        <rect
          x={PX0}
          y={PY0}
          width={PX1 - PX0}
          height={PY1 - PY0}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* axes through the origin */}
        <line x1={PX0} y1={y0} x2={PX1} y2={y0} stroke={C.line} strokeWidth={1} />
        <line x1={x0} y1={PY0} x2={x0} y2={PY1} stroke={C.line} strokeWidth={1} />
        <text x={PX1 - 2} y={y0 - 4} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">
          x
        </text>
        <text x={x0 + 4} y={PY0 + 9} fontSize={9} fill={C.muted} fontFamily={MONO}>
          y
        </text>

        {/* curve B: single linear unit (dashed coral) */}
        <polyline
          points={singlePts}
          fill="none"
          stroke={C.coral}
          strokeWidth={2.4}
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
        {/* curve A: two-layer composition (solid blue) */}
        <polyline
          points={composedPts}
          fill="none"
          stroke={C.blue}
          strokeWidth={1.8}
        />

        {/* legend */}
        <g>
          <line x1={PX0 + 8} y1={PY0 + 12} x2={PX0 + 30} y2={PY0 + 12} stroke={C.blue} strokeWidth={1.8} />
          <text x={PX0 + 34} y={PY0 + 15} fontSize={9} fill={C.ink} fontFamily={MONO}>
            f(x) = w₂·a(w₁x+b₁)+b₂
          </text>
          <line
            x1={PX0 + 8}
            y1={PY0 + 26}
            x2={PX0 + 30}
            y2={PY0 + 26}
            stroke={C.coral}
            strokeWidth={2.4}
            strokeDasharray="5 4"
          />
          <text x={PX0 + 34} y={PY0 + 29} fontSize={9} fill={C.ink} fontFamily={MONO}>
            g(x) = Wx + B
          </text>
        </g>

        {/* live collapsed parameters */}
        <text x={PX0} y={PY1 + 18} fontSize={10} fill={C.ink} fontFamily={MONO}>
          {`W = w₂·w₁ = ${W.toFixed(2)}`}
        </text>
        <text x={PX0} y={PY1 + 32} fontSize={10} fill={C.ink} fontFamily={MONO}>
          {`B = w₂·b₁ + b₂ = ${B.toFixed(2)}`}
        </text>
        <text
          x={PX1}
          y={PY1 + 18}
          fontSize={10}
          fill={relUOn ? C.coral : C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`nonlinearity: ${relUOn ? "on" : "off"}`}
        </text>
        <text
          x={PX1}
          y={PY1 + 32}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {relUOn ? "curves diverge — can't collapse" : "curves coincide exactly"}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <Slider label="w₁" value={w1} onChange={setW1} />
        <Slider label="b₁" value={b1} onChange={setB1} />
        <Slider label="w₂" value={w2} onChange={setW2} />
        <Slider label="b₂" value={b2} onChange={setB2} />
        <button type="button" className={btn} onClick={() => setRelUOn((r) => !r)}>
          {relUOn ? "remove ReLU between layers" : "insert ReLU between layers"}
        </button>
      </div>
    </div>
  );
}
