"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

type Point = { x: number; y: number };

// --- Hard-coded, deterministic cigar-shaped cloud -------------------------
// Each point sits along a tilted axis (cos30, sin30) at parameter t, plus a
// small fixed perpendicular jitter taken from a hard-coded array.
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);
const JITTER = [
  0.3, -0.5, 0.2, 0.6, -0.3, -0.7, 0.4, 0.1, -0.2, 0.55, -0.45, 0.25, -0.6,
  0.35, 0.05, -0.35, 0.5, -0.15, 0.65, -0.55, 0.15, 0.45, -0.25, -0.65, 0.4,
  -0.1, 0.6, -0.4, 0.2, -0.3,
];

const DATA: Point[] = Array.from({ length: 30 }, (_, i) => {
  const t = (i / 29 - 0.5) * 8;
  const j = JITTER[i] * 1.4;
  return {
    x: COS30 * t - SIN30 * j,
    y: SIN30 * t + COS30 * j,
  };
});

// --- Linear algebra on the cloud ------------------------------------------
function centroidOf(pts: Point[]): Point {
  let sx = 0;
  let sy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}

const CENTROID = centroidOf(DATA);

// Covariance matrix [[a,b],[b,d]]
function covariance(pts: Point[], c: Point) {
  let a = 0;
  let b = 0;
  let d = 0;
  for (const p of pts) {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    a += dx * dx;
    b += dx * dy;
    d += dy * dy;
  }
  const n = pts.length;
  return { a: a / n, b: b / n, d: d / n };
}

const COV = covariance(DATA, CENTROID);

// Closed-form symmetric 2x2 eigendecomposition.
function eigen(a: number, b: number, d: number) {
  const half = (a + d) / 2;
  const diff = (a - d) / 2;
  const root = Math.sqrt(diff * diff + b * b);
  const l1 = half + root; // larger eigenvalue
  const l2 = half - root;
  let v1: Point;
  if (Math.abs(b) > 1e-9) {
    v1 = { x: l1 - d, y: b };
  } else {
    v1 = a >= d ? { x: 1, y: 0 } : { x: 0, y: 1 };
  }
  const n1 = Math.hypot(v1.x, v1.y) || 1;
  v1 = { x: v1.x / n1, y: v1.y / n1 };
  const v2 = { x: -v1.y, y: v1.x }; // perpendicular
  return { l1, l2, v1, v2 };
}

const { l1, l2, v1, v2 } = eigen(COV.a, COV.b, COV.d);

// Variance of the data projected onto a unit direction u.
function projectedVariance(u: Point): number {
  let s = 0;
  for (const p of DATA) {
    const dx = p.x - CENTROID.x;
    const dy = p.y - CENTROID.y;
    const proj = dx * u.x + dy * u.y;
    s += proj * proj;
  }
  return s / DATA.length;
}

// --- Mapping data coords into the viewport --------------------------------
const VIEW_W = 320;
const VIEW_H = 300;
const SCALE = 24; // data units -> px (1 unit of std ~ SCALE px)
const ORIGIN_X = VIEW_W / 2;
const ORIGIN_Y = VIEW_H / 2;

function mapX(x: number): number {
  return ORIGIN_X + (x - CENTROID.x) * SCALE;
}
function mapY(y: number): number {
  return ORIGIN_Y - (y - CENTROID.y) * SCALE; // flip y so positive points up
}

const CX = mapX(CENTROID.x);
const CY = mapY(CENTROID.y);

// PC1 angle in degrees (0..180), measured the same way the slider angle is.
const PC1_ANGLE = ((Math.atan2(v1.y, v1.x) * 180) / Math.PI + 180) % 180;

// Arrow lengths scale with the standard deviation (sqrt of eigenvalue) so they
// match the cloud's spread, with a floor so PC2 stays visible.
const LEN1 = Math.max(Math.sqrt(l1) * SCALE, 24);
const LEN2 = Math.max(Math.sqrt(l2) * SCALE, 16);

// Small arrowhead helper (returns polygon points string).
function head(x1: number, y1: number, x2: number, y2: number, s = 7): string {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a1 = ang + Math.PI - 0.4;
  const a2 = ang + Math.PI + 0.4;
  return `${x2},${y2} ${x2 + s * Math.cos(a1)},${y2 + s * Math.sin(a1)} ${x2 + s * Math.cos(a2)},${y2 + s * Math.sin(a2)}`;
}

export function PcaExplorer() {
  const [theta, setTheta] = useState(95);
  const [projectOn, setProjectOn] = useState(false);

  const rad = (theta * Math.PI) / 180;
  const u = { x: Math.cos(rad), y: Math.sin(rad) };
  const candVar = projectedVariance(u);

  // PC arrow endpoints (screen space; y flips).
  const pc1End = { x: CX + v1.x * LEN1, y: CY - v1.y * LEN1 };
  const pc2End = { x: CX + v2.x * LEN2, y: CY - v2.y * LEN2 };

  // Candidate dashed line across the cloud (screen space).
  const candLen = 120;
  const candA = { x: CX + u.x * candLen, y: CY - u.y * candLen };
  const candB = { x: CX - u.x * candLen, y: CY + u.y * candLen };

  const nearPc1 = Math.min(
    Math.abs(theta - PC1_ANGLE),
    180 - Math.abs(theta - PC1_ANGLE),
  ) <= 4;

  // Short tags sit a little beyond each arrow tip.
  const tag1 = { x: CX + v1.x * (LEN1 + 14), y: CY - v1.y * (LEN1 + 14) };
  const tag2 = { x: CX + v2.x * (LEN2 + 14), y: CY - v2.y * (LEN2 + 14) };

  return (
    <div>
      <svg
        viewBox="0 0 320 300"
        className="h-auto w-full"
        role="img"
        aria-label="Principal components"
      >
        <rect
          x={0.5}
          y={0.5}
          width={VIEW_W - 1}
          height={VIEW_H - 1}
          fill="var(--card)"
          stroke={C.line}
        />

        {/* connector segments to PC1 (projection mode) */}
        {projectOn &&
          DATA.map((p, i) => {
            const dx = p.x - CENTROID.x;
            const dy = p.y - CENTROID.y;
            const t = dx * v1.x + dy * v1.y;
            const px = CENTROID.x + v1.x * t;
            const py = CENTROID.y + v1.y * t;
            return (
              <line
                key={`c${i}`}
                x1={mapX(p.x)}
                y1={mapY(p.y)}
                x2={mapX(px)}
                y2={mapY(py)}
                stroke={C.coral}
                strokeWidth={0.8}
                opacity={0.5}
              />
            );
          })}

        {/* original data points */}
        {DATA.map((p, i) => (
          <circle
            key={`p${i}`}
            cx={mapX(p.x)}
            cy={mapY(p.y)}
            r={3}
            fill={projectOn ? C.muted : C.ink}
            opacity={projectOn ? 0.5 : 1}
          />
        ))}

        {/* projected (1D) points on the PC1 line */}
        {projectOn &&
          DATA.map((p, i) => {
            const dx = p.x - CENTROID.x;
            const dy = p.y - CENTROID.y;
            const t = dx * v1.x + dy * v1.y;
            const px = CENTROID.x + v1.x * t;
            const py = CENTROID.y + v1.y * t;
            return (
              <circle
                key={`pp${i}`}
                cx={mapX(px)}
                cy={mapY(py)}
                r={3}
                fill={C.coral}
              />
            );
          })}

        {/* candidate direction (dashed green) */}
        <line
          x1={candA.x}
          y1={candA.y}
          x2={candB.x}
          y2={candB.y}
          stroke={C.green}
          strokeWidth={1.6}
          strokeDasharray="5 4"
        />
        <text
          x={candA.x + (u.x >= 0 ? 5 : -5)}
          y={candA.y + (u.y >= 0 ? -5 : 12)}
          fontSize={10}
          fill={C.green}
          fontFamily={MONO}
          textAnchor={u.x >= 0 ? "start" : "end"}
        >
          {`θ=${theta}°`}
        </text>

        {/* PC2 arrow (blue) */}
        <g stroke={C.blue} fill={C.blue}>
          <line x1={CX} y1={CY} x2={pc2End.x} y2={pc2End.y} strokeWidth={2} />
          <polygon stroke="none" points={head(CX, CY, pc2End.x, pc2End.y)} />
        </g>
        <text
          x={tag2.x}
          y={tag2.y}
          fontSize={10}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="middle"
        >
          PC2
        </text>

        {/* PC1 arrow (coral) */}
        <g stroke={C.coral} fill={C.coral}>
          <line x1={CX} y1={CY} x2={pc1End.x} y2={pc1End.y} strokeWidth={2.4} />
          <polygon stroke="none" points={head(CX, CY, pc1End.x, pc1End.y, 8)} />
        </g>
        <text
          x={tag1.x}
          y={tag1.y}
          fontSize={10}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="middle"
        >
          PC1
        </text>

        {/* centroid */}
        <circle cx={CX} cy={CY} r={2.6} fill={C.ink} />

        {/* readout, in the empty upper-left corner */}
        <text x={12} y={22} fontSize={10} fill={C.coral} fontFamily={MONO}>
          {`PC1 variance = ${l1.toFixed(2)}`}
        </text>
        <text x={12} y={37} fontSize={10} fill={C.blue} fontFamily={MONO}>
          {`PC2 variance = ${l2.toFixed(2)}`}
        </text>
        <text x={12} y={52} fontSize={10} fill={C.green} fontFamily={MONO}>
          {`candidate var = ${candVar.toFixed(2)}`}
        </text>
        {nearPc1 && (
          <text x={12} y={67} fontSize={10} fill={C.ink} fontFamily={MONO}>
            ≈ PC1 — maximum variance
          </text>
        )}

        {projectOn && (
          <text
            x={VIEW_W / 2}
            y={VIEW_H - 12}
            fontSize={10}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {`2D → 1D onto PC1:  kept ${l1.toFixed(2)},  lost ${l2.toFixed(2)}`}
          </text>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">candidate θ</span>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={theta}
            onChange={(e) => setTheta(Number(e.target.value))}
            className="w-40 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-12">{theta}°</span>
        </label>
        <button
          type="button"
          onClick={() => setProjectOn((value) => !value)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {projectOn ? "show 2D cloud" : "project onto PC1"}
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          proj var = {candVar.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
