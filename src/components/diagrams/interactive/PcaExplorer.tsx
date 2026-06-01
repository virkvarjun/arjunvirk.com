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
  // Eigenvector for l1. If b ~ 0 the matrix is diagonal; pick axis.
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

// --- Mapping data coords into the 320x300 viewport ------------------------
const VIEW_W = 320;
const VIEW_H = 300;
const SCALE = 22; // data units -> px
const ORIGIN_X = VIEW_W / 2;
const ORIGIN_Y = VIEW_H / 2 + 8;

function mapX(x: number): number {
  return ORIGIN_X + (x - CENTROID.x) * SCALE;
}
function mapY(y: number): number {
  // flip y so positive points up
  return ORIGIN_Y - (y - CENTROID.y) * SCALE;
}

const CX = mapX(CENTROID.x);
const CY = mapY(CENTROID.y);

// PC1 angle in degrees (0..180), measured the same way the slider angle is.
const PC1_ANGLE = ((Math.atan2(v1.y, v1.x) * 180) / Math.PI + 180) % 180;

export function PcaExplorer() {
  const [theta, setTheta] = useState(60);
  const [projectOn, setProjectOn] = useState(false);

  const rad = (theta * Math.PI) / 180;
  const u = { x: Math.cos(rad), y: Math.sin(rad) };
  const candVar = projectedVariance(u);

  // Arrow lengths scaled by eigenvalue (variance), in px.
  const lenScale = 6;
  const len1 = Math.sqrt(l1) * lenScale + 14;
  const len2 = Math.sqrt(l2) * lenScale + 14;

  // PC arrow endpoints (drawn in screen space; note y flips).
  const pc1End = { x: CX + v1.x * len1, y: CY - v1.y * len1 };
  const pc2End = { x: CX + v2.x * len2, y: CY - v2.y * len2 };

  // Candidate dashed line across the cloud (screen space).
  const candLen = 130;
  const candA = { x: CX + u.x * candLen, y: CY - u.y * candLen };
  const candB = { x: CX - u.x * candLen, y: CY + u.y * candLen };

  const nearPc1 = Math.abs(theta - PC1_ANGLE) <= 4;

  // Small arrowhead helper (returns polygon points string).
  const head = (x1: number, y1: number, x2: number, y2: number, s = 7) => {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const a1 = ang + Math.PI - 0.4;
    const a2 = ang + Math.PI + 0.4;
    return `${x2},${y2} ${x2 + s * Math.cos(a1)},${y2 + s * Math.sin(a1)} ${x2 + s * Math.cos(a2)},${y2 + s * Math.sin(a2)}`;
  };

  return (
    <div>
      <svg
        viewBox="0 0 320 300"
        className="h-auto w-full"
        role="img"
        aria-label="Principal components"
      >
        {/* frame */}
        <rect
          x={0.5}
          y={0.5}
          width={VIEW_W - 1}
          height={VIEW_H - 1}
          fill="var(--card)"
          stroke={C.line}
        />

        {/* connector segments + projected points (when toggle is ON) */}
        {projectOn &&
          DATA.map((p, i) => {
            const dx = p.x - CENTROID.x;
            const dy = p.y - CENTROID.y;
            const t = dx * v1.x + dy * v1.y; // coordinate along PC1
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
                opacity={0.55}
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

        {/* projected (1D) points sitting on the PC1 line */}
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

        {/* PC2 arrow (blue) */}
        <g stroke={C.blue} fill={C.blue}>
          <line x1={CX} y1={CY} x2={pc2End.x} y2={pc2End.y} strokeWidth={2} />
          <polygon
            stroke="none"
            points={head(CX, CY, pc2End.x, pc2End.y)}
          />
        </g>

        {/* PC1 arrow (coral) */}
        <g stroke={C.coral} fill={C.coral}>
          <line x1={CX} y1={CY} x2={pc1End.x} y2={pc1End.y} strokeWidth={2.4} />
          <polygon
            stroke="none"
            points={head(CX, CY, pc1End.x, pc1End.y, 8)}
          />
        </g>

        {/* centroid */}
        <circle cx={CX} cy={CY} r={2.4} fill={C.ink} />

        {/* labels */}
        <text
          x={pc1End.x + 4}
          y={pc1End.y - 4}
          fontSize={10}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="start"
        >
          {`PC1 (var = ${l1.toFixed(1)})`}
        </text>
        <text
          x={pc2End.x + 4}
          y={pc2End.y - 2}
          fontSize={10}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="start"
        >
          {`PC2 (var = ${l2.toFixed(2)})`}
        </text>
        <text
          x={candA.x + 4}
          y={candA.y}
          fontSize={10}
          fill={C.green}
          fontFamily={MONO}
          textAnchor="start"
        >
          {`θ = ${theta}°`}
        </text>

        {/* readout */}
        <text
          x={10}
          y={20}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="start"
        >
          {`projected variance = ${candVar.toFixed(2)}`}
        </text>
        {nearPc1 && (
          <text
            x={10}
            y={34}
            fontSize={10}
            fill={C.green}
            fontFamily={MONO}
            textAnchor="start"
          >
            ≈ PC1: maximum variance
          </text>
        )}
        {projectOn && (
          <text
            x={10}
            y={VIEW_H - 10}
            fontSize={10}
            fill={C.coral}
            fontFamily={MONO}
            textAnchor="start"
          >
            2D → 1D: kept var = {l1.toFixed(1)}, lost = {l2.toFixed(2)}
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
          onClick={() => setProjectOn((v) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {projectOn ? "show 2D cloud" : "project onto PC1"}
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          var = {candVar.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
