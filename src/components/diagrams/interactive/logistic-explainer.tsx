"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// Logistic (sigmoid) link.
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

// Hard-coded 2D scatter, two roughly-separable classes (~12 points).
// X, Y live in feature space ~[-3, 3]; cls is 0 (coral) or 1 (blue).
type Pt = { x: number; y: number; cls: 0 | 1 };
const POINTS: Pt[] = [
  { x: -2.4, y: -1.8, cls: 0 },
  { x: -1.6, y: -2.4, cls: 0 },
  { x: -2.0, y: 0.4, cls: 0 },
  { x: -0.9, y: -1.2, cls: 0 },
  { x: -1.4, y: 1.1, cls: 0 },
  { x: -2.6, y: -0.6, cls: 0 },
  { x: 2.2, y: 1.7, cls: 1 },
  { x: 1.4, y: 2.3, cls: 1 },
  { x: 2.5, y: 0.5, cls: 1 },
  { x: 0.9, y: 1.3, cls: 1 },
  { x: 1.8, y: -0.4, cls: 1 },
  { x: 2.7, y: 2.4, cls: 1 },
];

// The highlighted point fed through the shared weights on the right panel.
const HILITE = 6; // index into POINTS

export function LogisticExplainer() {
  const [s0, setS0] = useState<number>(1.2); // left-panel raw score
  const [w1, setW1] = useState<number>(1.6);
  const [w2, setW2] = useState<number>(1.2);
  const [b, setB] = useState<number>(-0.4);

  // --- Layout ---
  const L0 = 28; // left panel x-min (after axis margin)
  const L1 = 200; // left panel x-max
  const R0 = 248; // right panel x-min
  const R1 = 428; // right panel x-max
  const TOP = 40;
  const BOT = 196;

  // Left panel: score axis (-6..6) -> probability (0..1).
  const SMIN = -6;
  const SMAX = 6;
  const lMapX = (s: number) => L0 + ((s - SMIN) / (SMAX - SMIN)) * (L1 - L0);
  const lMapY = (p: number) => BOT - p * (BOT - TOP);

  const p0 = sigmoid(s0);
  const px = lMapX(s0);
  const py = lMapY(p0);

  // Right panel: feature space X,Y in [-3,3].
  const FMIN = -3;
  const FMAX = 3;
  const rMapX = (x: number) => R0 + ((x - FMIN) / (FMAX - FMIN)) * (R1 - R0);
  const rMapY = (y: number) => BOT - ((y - FMIN) / (FMAX - FMIN)) * (BOT - TOP);

  // Coarse 12x12 probability shading grid.
  const NG = 12;
  const cellW = (R1 - R0) / NG;
  const cellH = (BOT - TOP) / NG;
  const cells: { x: number; y: number; fill: string }[] = [];
  for (let gi = 0; gi < NG; gi++) {
    for (let gj = 0; gj < NG; gj++) {
      const fx = FMIN + ((gi + 0.5) / NG) * (FMAX - FMIN);
      const fy = FMAX - ((gj + 0.5) / NG) * (FMAX - FMIN);
      const p = sigmoid(w1 * fx + w2 * fy + b);
      // Blend coralFill (p->0) to blueFill (p->1).
      cells.push({
        x: R0 + gi * cellW,
        y: TOP + gj * cellH,
        fill: mix(C.coralFill, C.blueFill, p),
      });
    }
  }

  // Decision boundary: w1*X + w2*Y + b = 0  =>  Y = -(w1*X + b)/w2.
  // Compute its two endpoints clipped to the panel.
  const boundary = boundaryEndpoints(w1, w2, b, FMIN, FMAX);

  // Highlighted point's score under the shared weights.
  const hp = POINTS[HILITE];
  const hScore = w1 * hp.x + w2 * hp.y + b;
  const hProb = sigmoid(hScore);

  return (
    <div>
      <svg
        viewBox="0 0 440 240"
        className="h-auto w-full"
        role="img"
        aria-label="Logistic regression explainer"
      >
        {/* ===== LEFT PANEL: score -> probability ===== */}
        <text x={L0} y={22} fontSize={11} fill={C.ink} fontFamily={MONO}>
          score → probability
        </text>

        {/* axes */}
        <line x1={L0} y1={BOT} x2={L1} y2={BOT} stroke={C.ink} strokeWidth={1.3} />
        <line x1={L0} y1={TOP} x2={L0} y2={BOT} stroke={C.line} strokeWidth={1} />

        {/* p = 0.5 threshold (horizontal) */}
        <line
          x1={L0}
          y1={lMapY(0.5)}
          x2={L1}
          y2={lMapY(0.5)}
          stroke={C.muted}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {/* score = 0 threshold (vertical) */}
        <line
          x1={lMapX(0)}
          y1={TOP}
          x2={lMapX(0)}
          y2={BOT}
          stroke={C.muted}
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* sigmoid curve */}
        <polyline
          points={plotCurve(
            (s) => sigmoid(s),
            SMIN,
            SMAX,
            60,
            lMapX,
            lMapY,
          )}
          fill="none"
          stroke={C.blue}
          strokeWidth={2}
        />

        {/* y-axis tick labels */}
        <text x={L0 - 4} y={lMapY(1) + 3} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">1</text>
        <text x={L0 - 4} y={lMapY(0.5) + 3} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">.5</text>
        <text x={L0 - 4} y={lMapY(0) + 3} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">0</text>
        <text x={lMapX(0)} y={BOT + 12} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">0</text>
        <text x={L1} y={BOT + 12} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">score</text>

        {/* highlighted score point */}
        <line x1={px} y1={py} x2={px} y2={BOT} stroke={C.coral} strokeWidth={1} strokeDasharray="2 2" />
        <line x1={L0} y1={py} x2={px} y2={py} stroke={C.coral} strokeWidth={1} strokeDasharray="2 2" />
        <circle cx={px} cy={py} r={4} fill={C.coral} />

        <text x={L0} y={BOT + 28} fontSize={10} fill={C.ink} fontFamily={MONO}>
          {`P = σ(${s0.toFixed(1)}) = ${p0.toFixed(3)}`}
        </text>

        {/* ===== RIGHT PANEL: feature space ===== */}
        <text x={R0} y={22} fontSize={11} fill={C.ink} fontFamily={MONO}>
          feature space
        </text>

        {/* shading grid */}
        {cells.map((c, i) => (
          <rect key={i} x={c.x} y={c.y} width={cellW + 0.5} height={cellH + 0.5} fill={c.fill} />
        ))}

        {/* panel frame */}
        <rect x={R0} y={TOP} width={R1 - R0} height={BOT - TOP} fill="none" stroke={C.line} strokeWidth={1} />

        {/* decision boundary (0.5 contour) */}
        {boundary && (
          <line
            x1={rMapX(boundary.x1)}
            y1={rMapY(boundary.y1)}
            x2={rMapX(boundary.x2)}
            y2={rMapY(boundary.y2)}
            stroke={C.ink}
            strokeWidth={1.8}
          />
        )}

        {/* scatter points */}
        {POINTS.map((pt, i) => {
          const cx = rMapX(pt.x);
          const cy = rMapY(pt.y);
          const isHi = i === HILITE;
          const stroke = pt.cls === 1 ? C.blue : C.coral;
          const fill = pt.cls === 1 ? C.blueFill : C.coralFill;
          return (
            <g key={i}>
              {isHi && <circle cx={cx} cy={cy} r={6.5} fill="none" stroke={C.ink} strokeWidth={1.4} />}
              <circle cx={cx} cy={cy} r={4} fill={fill} stroke={stroke} strokeWidth={1.6} />
            </g>
          );
        })}

        {/* highlighted point readout */}
        <text x={R0} y={BOT + 28} fontSize={10} fill={C.ink} fontFamily={MONO}>
          {`pt: σ(w·x+b) = ${hProb.toFixed(3)}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">score</span>
          <input
            type="range"
            min={-6}
            max={6}
            step={0.1}
            value={s0}
            onChange={(e) => setS0(Number(e.target.value))}
            className="w-24 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{s0.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-mono">w1</span>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={w1}
            onChange={(e) => setW1(Number(e.target.value))}
            className="w-24 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{w1.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-mono">w2</span>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={w2}
            onChange={(e) => setW2(Number(e.target.value))}
            className="w-24 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{w2.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-mono">b</span>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={b}
            onChange={(e) => setB(Number(e.target.value))}
            className="w-24 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{b.toFixed(1)}</span>
        </label>
        <span className="text-[var(--muted)]">
          the boundary in feature space is the 0.5 contour of the sigmoid.
        </span>
      </div>
    </div>
  );
}

// --- helpers ---

// Parse a #rrggbb hex into [r,g,b].
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Linear blend between two hex colors; t in [0,1].
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

// Endpoints of w1*X + w2*Y + b = 0, clipped to the [min,max] square.
function boundaryEndpoints(
  w1: number,
  w2: number,
  b: number,
  min: number,
  max: number,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const pts: { x: number; y: number }[] = [];
  const within = (v: number) => v >= min - 1e-6 && v <= max + 1e-6;
  // Intersections with vertical edges X=min, X=max.
  if (Math.abs(w2) > 1e-6) {
    for (const X of [min, max]) {
      const Y = -(w1 * X + b) / w2;
      if (within(Y)) pts.push({ x: X, y: Y });
    }
  }
  // Intersections with horizontal edges Y=min, Y=max.
  if (Math.abs(w1) > 1e-6) {
    for (const Y of [min, max]) {
      const X = -(w2 * Y + b) / w1;
      if (within(X)) pts.push({ x: X, y: Y });
    }
  }
  if (pts.length < 2) return null;
  // Pick the two most-separated points.
  let best: [number, number] = [0, 1];
  let bestD = -1;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = (pts[i].x - pts[j].x) ** 2 + (pts[i].y - pts[j].y) ** 2;
      if (d > bestD) {
        bestD = d;
        best = [i, j];
      }
    }
  }
  return {
    x1: pts[best[0]].x,
    y1: pts[best[0]].y,
    x2: pts[best[1]].x,
    y2: pts[best[1]].y,
  };
}
