"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// RoPE: a 2D dimension-pair of a query/key vector is rotated by an angle that
// grows with the token's position, theta(pos) = pos * THETA0. Two tokens at
// positions m and n are each rotated by their own angle; the dot product of the
// rotated vectors depends only on the angle difference (m - n), i.e. relative
// distance. We use a fixed unit base vector so the score is exactly cos(m - n).

const THETA0 = 0.5; // radians of rotation per unit of position

// Geometry of the two rotation circles.
const CX_M = 130;
const CX_N = 330;
const CY = 150;
const R = 60;

// Map a math-space unit vector at angle `ang` (CCW from +x) to SVG endpoint on
// a circle of radius `R` centered at (cx, cy). SVG y grows downward, so negate.
function tip(cx: number, ang: number): { x: number; y: number } {
  return { x: cx + R * Math.cos(ang), y: CY - R * Math.sin(ang) };
}

function fmt(n: number): string {
  return n.toFixed(2);
}

// SVG arc path from the +x axis sweeping CCW to `ang`, at a small radius, to
// annotate the rotation angle. CCW in math == negative sweep in SVG y-down.
function anglePath(cx: number, ang: number, ar: number): string {
  const sx = cx + ar;
  const sy = CY;
  const ex = cx + ar * Math.cos(ang);
  const ey = CY - ar * Math.sin(ang);
  const large = ang > Math.PI ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${ar} ${ar} 0 ${large} 0 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function Circle({
  cx,
  pos,
  color,
  fill,
  label,
}: {
  cx: number;
  pos: number;
  color: string;
  fill: string;
  label: string;
}) {
  const ang = pos * THETA0;
  const t = tip(cx, ang);
  const ahead = 8;
  const a1 = ang + Math.PI - 0.4;
  const a2 = ang + Math.PI + 0.4;
  // arrowhead in SVG space (negate the y component of the math direction)
  const head = `${t.x},${t.y} ${t.x + ahead * Math.cos(a1)},${t.y - ahead * Math.sin(a1)} ${t.x + ahead * Math.cos(a2)},${t.y - ahead * Math.sin(a2)}`;
  return (
    <g>
      {/* circle */}
      <circle cx={cx} cy={CY} r={R} fill={fill} fillOpacity={0.25} stroke={C.line} strokeWidth={1} />
      {/* axes (kept inside the circle, clear of labels) */}
      <line x1={cx - R} y1={CY} x2={cx + R} y2={CY} stroke={C.grid} strokeWidth={1} />
      <line x1={cx} y1={CY - R} x2={cx} y2={CY + R} stroke={C.grid} strokeWidth={1} />
      {/* faint base (un-rotated) vector for reference */}
      <line x1={cx} y1={CY} x2={cx + R} y2={CY} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />
      {/* rotation-angle arc */}
      <path d={anglePath(cx, ang, 22)} fill="none" stroke={C.muted} strokeWidth={1.2} />
      {/* rotated vector */}
      <line x1={cx} y1={CY} x2={t.x} y2={t.y} stroke={color} strokeWidth={2.4} />
      <polygon points={head} fill={color} />
      <circle cx={cx} cy={CY} r={2.4} fill={C.ink} />
      {/* angle label, placed below the circle, clear of the vector */}
      <text x={cx} y={CY + R + 26} fontSize={11} fill={C.muted} fontFamily={MONO} textAnchor="middle">
        {`θ=${fmt(ang)} rad`}
      </text>
      {/* token label above the circle */}
      <text x={cx} y={CY - R - 12} fontSize={12} fill={color} fontFamily={MONO} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

export function TfRope() {
  const [m, setM] = useState<number>(2);
  const [n, setN] = useState<number>(5);

  const angM = m * THETA0;
  const angN = n * THETA0;
  const rel = m - n; // relative position
  const relAng = angM - angN; // (m - n) * THETA0
  // unit query rotated by angM, unit key rotated by angN -> dot = cos(angM-angN)
  const score = Math.cos(relAng);

  return (
    <div>
      <svg
        viewBox="0 0 460 380"
        className="h-auto w-full"
        role="img"
        aria-label="RoPE rotary positional embedding: rotating query and key vectors by position-dependent angles"
      >
        {/* title band */}
        <text x={230} y={26} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle">
          RoPE: Rotary Positional Embedding
        </text>

        {/* two rotation circles */}
        <Circle cx={CX_M} pos={m} color={C.blue} fill={C.blueFill} label="query @ pos m" />
        <Circle cx={CX_N} pos={n} color={C.coral} fill={C.coralFill} label="key @ pos n" />

        {/* rotation matrix band (left) */}
        <text x={24} y={258} fontSize={11} fill={C.muted} fontFamily={MONO}>
          R_θ =
        </text>
        <text x={68} y={252} fontSize={11} fill={C.ink} fontFamily={MONO}>
          [ cos θ  −sin θ ]
        </text>
        <text x={68} y={266} fontSize={11} fill={C.ink} fontFamily={MONO}>
          [ sin θ   cos θ ]
        </text>

        {/* relative-angle / score readout band */}
        <text x={24} y={300} fontSize={11} fill={C.ink} fontFamily={MONO}>
          {`relative position  (m − n) = ${rel}`}
        </text>
        <text x={24} y={318} fontSize={11} fill={C.ink} fontFamily={MONO}>
          {`relative angle  (m − n)·θ₀ = ${fmt(relAng)} rad`}
        </text>
        <text x={24} y={340} fontSize={11} fill={C.ink} fontFamily={MONO}>
          {`score  q·k = cos((m − n)·θ₀) = ${fmt(score)}`}
        </text>
        <text x={24} y={358} fontSize={10} fill={C.muted} fontFamily={MONO}>
          depends only on (m − n), not on m or n alone
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-1">
          <span className="font-mono">pos m</span>
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={m}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setM(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-6">{m}</span>
        </label>
        <label className="flex items-center gap-1">
          <span className="font-mono">pos n</span>
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={n}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setN(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-6">{n}</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setM(2);
            setN(5);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Rotate Q and K by a position-dependent angle; the dot product then sees
        only relative distance.
      </p>
    </div>
  );
}
