"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Hard-coded local derivative values so the abstract chain rule has concrete
// numbers. Path products: path1 = 3 * 2 = 6, path2 = 4 * -1 = -4, total = 2.
const D = {
  u1x: 2, // du1/dx
  u2x: -1, // du2/dx
  yu1: 3, // dy/du1
  yu2: 4, // dy/du2
} as const;

const P1 = D.yu1 * D.u1x; // 6
const P2 = D.yu2 * D.u2x; // -4
const TOTAL = P1 + P2; // 2

// Node positions in the 440x230 viewBox.
const NX = { x: 56, u1: 220, u2: 220, y: 384 };
const NY = { x: 110, u1: 58, u2: 162, y: 110 };
const R = 17;

type Sel = "none" | "1" | "2" | "both";

function on1(s: Sel): boolean {
  return s === "1" || s === "both";
}
function on2(s: Sel): boolean {
  return s === "2" || s === "both";
}

// Edge as a line that stops short of node circles, ending in an arrowhead.
function Edge({
  x1,
  y1,
  x2,
  y2,
  active,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active: boolean;
}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const sx = x1 + Math.cos(ang) * R;
  const sy = y1 + Math.sin(ang) * R;
  const ex = x2 - Math.cos(ang) * R;
  const ey = y2 - Math.sin(ang) * R;
  const color = active ? C.coral : C.line;
  const w = active ? 2.6 : 1.4;
  const head = 7;
  const a1 = ang + Math.PI - 0.4;
  const a2 = ang + Math.PI + 0.4;
  return (
    <g stroke={color} fill={color}>
      <line x1={sx} y1={sy} x2={ex} y2={ey} strokeWidth={w} />
      <polygon
        stroke="none"
        points={`${ex},${ey} ${ex + head * Math.cos(a1)},${ey + head * Math.sin(a1)} ${ex + head * Math.cos(a2)},${ey + head * Math.sin(a2)}`}
      />
    </g>
  );
}

function Node({
  cx,
  cy,
  label,
  active,
  onClick,
}: {
  cx: number;
  cy: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <g style={{ cursor: "pointer" }} onClick={onClick}>
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill={active ? C.coralFill : "var(--card)"}
        stroke={active ? C.coral : C.line}
        strokeWidth={active ? 2.2 : 1.4}
      />
      <text
        x={cx}
        y={cy + 4}
        fontSize={13}
        fill={C.ink}
        fontFamily={MONO}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

export function SumOverPathsGraph() {
  const [sel, setSel] = useState<Sel>("both");

  const a1 = on1(sel);
  const a2 = on2(sel);

  // Status line beneath the graph.
  let status: string;
  if (sel === "1") {
    status = `path 1: (dy/du1)(du1/dx) = (${D.yu1})(${D.u1x}) = ${P1}`;
  } else if (sel === "2") {
    status = `path 2: (dy/du2)(du2/dx) = (${D.yu2})(${D.u2x}) = ${P2}`;
  } else if (sel === "both") {
    status = `dy/dx = (dy/du1)(du1/dx) + (dy/du2)(du2/dx) = ${P1} + (${P2}) = ${TOTAL}`;
  } else {
    status = "select a path to light it up and read off its product";
  }

  return (
    <div>
      <svg
        viewBox="0 0 440 230"
        className="h-auto w-full"
        role="img"
        aria-label="Sum over paths"
      >
        {/* Edges (drawn under nodes). */}
        <Edge x1={NX.x} y1={NY.x} x2={NX.u1} y2={NY.u1} active={a1} />
        <Edge x1={NX.x} y1={NY.x} x2={NX.u2} y2={NY.u2} active={a2} />
        <Edge x1={NX.u1} y1={NY.u1} x2={NX.y} y2={NY.y} active={a1} />
        <Edge x1={NX.u2} y1={NY.u2} x2={NX.y} y2={NY.y} active={a2} />

        {/* Edge labels: symbol on top, numeric value below. */}
        <g fontFamily={MONO} textAnchor="middle">
          <text x={122} y={74} fontSize={10} fill={a1 ? C.coral : C.muted}>
            du1/dx
          </text>
          <text x={122} y={86} fontSize={9} fill={a1 ? C.coral : C.muted}>
            = {D.u1x}
          </text>
          <text x={120} y={150} fontSize={10} fill={a2 ? C.coral : C.muted}>
            du2/dx
          </text>
          <text x={120} y={162} fontSize={9} fill={a2 ? C.coral : C.muted}>
            = {D.u2x}
          </text>
          <text x={312} y={74} fontSize={10} fill={a1 ? C.coral : C.muted}>
            ∂y/∂u1
          </text>
          <text x={312} y={86} fontSize={9} fill={a1 ? C.coral : C.muted}>
            = {D.yu1}
          </text>
          <text x={314} y={150} fontSize={10} fill={a2 ? C.coral : C.muted}>
            ∂y/∂u2
          </text>
          <text x={314} y={162} fontSize={9} fill={a2 ? C.coral : C.muted}>
            = {D.yu2}
          </text>
        </g>

        {/* Nodes, clicking selects the path(s) through them. */}
        <Node
          cx={NX.x}
          cy={NY.x}
          label="x"
          active={sel !== "none"}
          onClick={() => setSel("both")}
        />
        <Node
          cx={NX.u1}
          cy={NY.u1}
          label="u1"
          active={a1}
          onClick={() => setSel("1")}
        />
        <Node
          cx={NX.u2}
          cy={NY.u2}
          label="u2"
          active={a2}
          onClick={() => setSel("2")}
        />
        <Node
          cx={NX.y}
          cy={NY.y}
          label="y"
          active={sel !== "none"}
          onClick={() => setSel("both")}
        />

        {/* Status / running sum. */}
        <text
          x={220}
          y={208}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {status}
        </text>
        <text
          x={220}
          y={224}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          total sensitivity = sum of per-path products
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setSel("1")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          path 1
        </button>
        <button
          type="button"
          onClick={() => setSel("2")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          path 2
        </button>
        <button
          type="button"
          onClick={() => setSel("both")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          both
        </button>
        <span className="font-mono text-[var(--muted)]">
          x reaches y by two routes, dy/dx sums them, just like a neuron feeding
          many downstream neurons.
        </span>
      </div>
    </div>
  );
}
