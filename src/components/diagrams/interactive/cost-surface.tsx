"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// Shared viewBox geometry.
const VW = 440;

// 1-weight curve panel.
const PX0 = 48;
const PX1 = 392;
const PY0 = 30;
const PY1 = 170;
const WMIN = -3;
const WMAX = 3;
const cost1 = (w: number): number => 0.4 * (w - 0.7) * (w - 0.7) + 0.15;
const CY_MIN = 0.15;
const CY_MAX = cost1(WMIN); // largest cost on the panel
const c1x = (w: number): number =>
  PX0 + ((w - WMIN) / (WMAX - WMIN)) * (PX1 - PX0);
const c1y = (c: number): number =>
  PY1 - ((c - CY_MIN) / (CY_MAX - CY_MIN)) * (PY1 - PY0);

// 2-weight bowl panel: an isometric floor centered at the minimum.
const CX = 220; // floor center x
const CY = 150; // floor center y (front of bowl)
const AX = 150; // floor half-width (w1 axis)
const AY = 46; // floor half-depth (w2 axis, foreshortened)
const LIFT = 0.5; // how much radius maps to vertical height cue

// Project a floor point (u,v in [-1,1]) plus a height into screen space.
const floorPt = (u: number, v: number): [number, number] => [
  CX + u * AX + v * (AX * 0.22),
  CY + v * AY - u * (AY * 0.18),
];

type SliderProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
};

function Slider({ label, value, onChange, min = -1, max = 1 }: SliderProps) {
  return (
    <label className="flex items-center gap-2 font-mono">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-28 accent-[var(--foreground)]"
        aria-label={label}
      />
      <span className="font-mono tabular-nums w-9">{value.toFixed(2)}</span>
    </label>
  );
}

export function CostSurface() {
  const [stage, setStage] = useState<1 | 2>(1);
  const [w, setW] = useState<number>(-1.6);
  const [u, setU] = useState<number>(-0.55); // w1 on floor, [-1,1]
  const [v, setV] = useState<number>(0.45); // w2 on floor, [-1,1]

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";
  const sel = (on: boolean) =>
    on ? { background: C.ink, color: "var(--background)" } : undefined;

  // --- Stage 1 derived geometry ---
  const curvePts = plotCurve(cost1, WMIN, WMAX, 120, c1x, c1y);
  const ballX = c1x(w);
  const ballY = c1y(cost1(w));
  const bestX = c1x(0.7);
  const bestY = c1y(cost1(0.7));

  // --- Stage 2 derived geometry ---
  const radius = Math.sqrt(u * u + v * v); // 0 at center, ~1.41 at corner
  const ang = Math.atan2(v, u);
  const [bx, by] = floorPt(u, v);
  const ballLift = radius * radius * AY * LIFT; // bowl height cue
  const ballYTop = by - ballLift;
  // steepest ascent points outward from center; downhill is its negative.
  const dirLen = 30;
  const dirN = radius < 0.001 ? 0 : 1 / radius;
  const upX = bx + u * dirN * dirLen;
  const upY = ballYTop + v * dirN * dirLen * 0.42 - dirLen * 0.18;
  const downX = bx - u * dirN * dirLen;
  const downY = ballYTop - v * dirN * dirLen * 0.42 + dirLen * 0.18;

  // five nested contour ellipses.
  const contours = [1, 0.78, 0.56, 0.34, 0.14];

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="The cost as a surface"
      >
        {stage === 1 ? (
          <>
            <rect
              x={PX0}
              y={PY0}
              width={PX1 - PX0}
              height={PY1 - PY0}
              fill="var(--background)"
              stroke={C.line}
              strokeWidth={1}
            />
            {/* axes */}
            <line x1={PX0} y1={PY1} x2={PX1} y2={PY1} stroke={C.line} strokeWidth={1} />
            <line x1={PX0} y1={PY0} x2={PX0} y2={PY1} stroke={C.line} strokeWidth={1} />
            <text x={PX1} y={PY1 + 14} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="end">
              weight w
            </text>
            <text x={PX0} y={PY0 - 10} fontSize={10} fill={C.muted} fontFamily={MONO}>
              cost
            </text>

            {/* the cost curve */}
            <polyline points={curvePts} fill="none" stroke={C.blue} strokeWidth={2.2} />

            {/* best (minimum) marker */}
            <circle cx={bestX} cy={bestY} r={5.5} fill="none" stroke={C.green} strokeWidth={1.6} />
            <line x1={bestX} y1={bestY + 6} x2={bestX} y2={PY1} stroke={C.green} strokeWidth={1} strokeDasharray="3 3" />
            <text x={bestX + 8} y={bestY - 6} fontSize={10} fill={C.green} fontFamily={MONO}>
              best
            </text>

            {/* current weight: vertical guide + ball */}
            <line x1={ballX} y1={ballY} x2={ballX} y2={PY1} stroke={C.coral} strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={ballX} cy={ballY} r={5.5} fill={C.coral} />
            <text x={ballX} y={PY1 + 14} fontSize={10} fill={C.coral} fontFamily={MONO} textAnchor="middle">
              {`w = ${w.toFixed(2)}`}
            </text>

            <text x={VW / 2} y={206} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="middle">
              one weight → cost is a curve; training finds the bottom
            </text>
          </>
        ) : (
          <>
            {/* faint floor parallelogram (the 2-weight plane) */}
            <polygon
              points={[floorPt(-1, -1), floorPt(1, -1), floorPt(1, 1), floorPt(-1, 1)]
                .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
                .join(" ")}
              fill="var(--background)"
              stroke={C.line}
              strokeWidth={1}
            />
            {/* floor axes */}
            <line
              x1={floorPt(-1, 0)[0]} y1={floorPt(-1, 0)[1]}
              x2={floorPt(1, 0)[0]} y2={floorPt(1, 0)[1]}
              stroke={C.line} strokeWidth={1} strokeDasharray="3 3"
            />
            <line
              x1={floorPt(0, -1)[0]} y1={floorPt(0, -1)[1]}
              x2={floorPt(0, 1)[0]} y2={floorPt(0, 1)[1]}
              stroke={C.line} strokeWidth={1} strokeDasharray="3 3"
            />
            <text x={floorPt(1, 0)[0] + 4} y={floorPt(1, 0)[1] + 4} fontSize={10} fill={C.muted} fontFamily={MONO}>
              w₁
            </text>
            <text x={floorPt(0, 1)[0] - 4} y={floorPt(0, 1)[1] + 14} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="end">
              w₂
            </text>

            {/* nested contour ellipses lifted into a bowl */}
            {contours.map((rr, i) => {
              const cy = CY - rr * rr * AY * LIFT;
              return (
                <ellipse
                  key={i}
                  cx={CX}
                  cy={cy}
                  rx={rr * AX}
                  ry={rr * AY}
                  fill="none"
                  stroke={i === contours.length - 1 ? C.green : C.line}
                  strokeWidth={i === contours.length - 1 ? 1.6 : 1.1}
                />
              );
            })}
            {/* center / lowest valley marker */}
            <circle cx={CX} cy={CY - AY * LIFT} r={3} fill={C.green} />
            <text x={CX} y={CY - AY * LIFT - 8} fontSize={10} fill={C.green} fontFamily={MONO} textAnchor="middle">
              best
            </text>

            {/* highlighted contour ring the ball currently sits on */}
            <ellipse
              cx={CX}
              cy={CY - radius * radius * AY * LIFT}
              rx={radius * AX}
              ry={radius * AY}
              fill="none"
              stroke={C.coral}
              strokeWidth={1.4}
              strokeDasharray="4 3"
            />

            {/* the rolling ball */}
            <line x1={bx} y1={by} x2={bx} y2={ballYTop} stroke={C.coral} strokeWidth={1} strokeDasharray="2 2" />
            <circle cx={bx} cy={ballYTop} r={6} fill={C.coral} />

            {/* gradient: steepest ascent (faint) and the downhill −∇ step */}
            <line x1={bx} y1={ballYTop} x2={upX} y2={upY} stroke={C.muted} strokeWidth={1.4} />
            <Arrow x1={bx} y1={ballYTop} x2={downX} y2={downY} />
            <text x={downX} y={downY - 6} fontSize={10} fill={C.coral} fontFamily={MONO} textAnchor="middle">
              −∇ step
            </text>

            <text x={VW / 2} y={222} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="middle">
              two weights → cost is a surface; roll the ball to the lowest valley
            </text>
          </>
        )}

        {/* fixed note shown in both stages */}
        <text x={VW / 2} y={240} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          a real network has millions of weights, same downhill logic, just more directions
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <button type="button" className={btn} style={sel(stage === 1)} onClick={() => setStage(1)}>
          1 weight
        </button>
        <button type="button" className={btn} style={sel(stage === 2)} onClick={() => setStage(2)}>
          2 weights
        </button>
        {stage === 1 ? (
          <Slider label="w" value={w} onChange={setW} min={-3} max={3} />
        ) : (
          <>
            <Slider label="w₁" value={u} onChange={setU} />
            <Slider label="w₂" value={v} onChange={setV} />
          </>
        )}
      </div>
    </div>
  );
}

// Small inline arrowhead-tipped segment (downhill step), coral-colored.
function Arrow({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 7;
  const a1 = a + Math.PI - 0.4;
  const a2 = a + Math.PI + 0.4;
  return (
    <g stroke={C.coral} fill={C.coral}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2} />
      <polygon
        stroke="none"
        points={`${x2},${y2} ${x2 + h * Math.cos(a1)},${y2 + h * Math.sin(a1)} ${x2 + h * Math.cos(a2)},${y2 + h * Math.sin(a2)}`}
      />
    </g>
  );
}
