"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

type Target = "w2" | "w1";

// The forward chain as a horizontal line of nodes. Each consecutive pair of
// nodes is an EDGE carrying a local derivative; the chain rule multiplies the
// edges along the path from the chosen weight to the cost C.
const NODES = [
  { id: "x", label: "x" },
  { id: "z1", label: "z1" },
  { id: "a1", label: "a1" },
  { id: "z2", label: "z2" },
  { id: "a2", label: "a2" },
  { id: "C", label: "C" },
] as const;

// Edge i connects NODES[i] -> NODES[i+1].
const EDGES = [
  { from: "x", to: "z1", deriv: "∂z1/∂w1 = x" },
  { from: "z1", to: "a1", deriv: "∂a1/∂z1 = σ'(z1)" },
  { from: "a1", to: "z2", deriv: "∂z2/∂a1 = w2" },
  { from: "z2", to: "a2", deriv: "∂a2/∂z2 = σ'(z2)" },
  { from: "a2", to: "C", deriv: "∂C/∂a2 = a2 − y" },
] as const;

// Which edge indices each gradient multiplies along its path.
const PATHS: Record<Target, number[]> = {
  // w2 enters at the a1->z2 edge: edges 2,3,4.
  w2: [2, 3, 4],
  // w1 enters at the x->z1 edge: the full chain, edges 0..4.
  w1: [0, 1, 2, 3, 4],
};

// The two edges holding the shared reusable error signal δ = (a2 − y)·σ'(z2):
// a2->C (edge 4) and z2->a2 (edge 3).
const SHARED_EDGES = new Set([3, 4]);

// Assembled product terms, in left-to-right reading order, with a flag marking
// the shared green factors so the same factor is highlighted in both targets.
const PRODUCTS: Record<Target, { text: string; shared: boolean }[]> = {
  w2: [
    { text: "(a2 − y)", shared: true },
    { text: "·σ'(z2)", shared: true },
    { text: "·a1", shared: false },
  ],
  w1: [
    { text: "(a2 − y)", shared: true },
    { text: "·σ'(z2)", shared: true },
    { text: "·w2", shared: false },
    { text: "·σ'(z1)", shared: false },
    { text: "·x", shared: false },
  ],
};

export function ChainRuleWalk() {
  const [target, setTarget] = useState<Target>("w2");

  // --- SVG layout ---
  const chainY = 78;
  const x0 = 34;
  const x1 = 414;
  const step = (x1 - x0) / (NODES.length - 1);
  const nodeX = (i: number) => x0 + i * step;
  const r = 15;

  const activeEdges = new Set(PATHS[target]);
  const product = PRODUCTS[target];

  const targetLabel = target === "w2" ? "∂C/∂w2" : "∂C/∂w1";

  return (
    <div>
      <svg
        viewBox="0 0 440 230"
        className="h-auto w-full"
        role="img"
        aria-label="Chain rule walk on a two-layer network"
      >
        {/* Edges (drawn under nodes) */}
        {EDGES.map((e, i) => {
          const xa = nodeX(i) + r;
          const xb = nodeX(i + 1) - r;
          const active = activeEdges.has(i);
          const shared = SHARED_EDGES.has(i);
          const color = !active ? C.line : shared ? C.green : C.blue;
          const w = active ? 2.4 : 1.4;
          const mid = (xa + xb) / 2;
          return (
            <g key={`edge-${i}`}>
              <line
                x1={xa}
                y1={chainY}
                x2={xb - 6}
                y2={chainY}
                stroke={color}
                strokeWidth={w}
              />
              <polygon
                points={`${xb},${chainY} ${xb - 7},${chainY - 4} ${xb - 7},${chainY + 4}`}
                fill={color}
              />
              {/* local derivative label above the edge */}
              <text
                x={mid}
                y={chainY - 12}
                fontSize={9.5}
                fontFamily={MONO}
                textAnchor="middle"
                fill={active ? (shared ? C.green : C.ink) : C.muted}
                fontWeight={active ? 600 : 400}
              >
                {e.deriv}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((n, i) => {
          const cx = nodeX(i);
          const onPath =
            activeEdges.has(i) || activeEdges.has(i - 1); // touched by an active edge
          return (
            <g key={n.id}>
              <circle
                cx={cx}
                cy={chainY}
                r={r}
                fill="var(--card)"
                stroke={onPath ? C.ink : C.line}
                strokeWidth={onPath ? 1.8 : 1.2}
              />
              <text
                x={cx}
                y={chainY + 4}
                fontSize={11}
                fontFamily={MONO}
                textAnchor="middle"
                fill={C.ink}
                fontWeight={600}
              >
                {n.label}
              </text>
            </g>
          );
        })}

        {/* Boxed result */}
        <rect
          x={20}
          y={128}
          width={400}
          height={40}
          rx={6}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1.2}
        />
        <text
          x={32}
          y={153}
          fontSize={12}
          fontFamily={MONO}
          fill={C.ink}
          fontWeight={600}
        >
          <tspan>{targetLabel} = </tspan>
          {product.map((p, i) => (
            <tspan key={i} fill={p.shared ? C.green : C.ink}>
              {p.text}
            </tspan>
          ))}
        </text>

        {/* Shared-factor note */}
        <rect
          x={20}
          y={178}
          width={400}
          height={42}
          rx={6}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1}
        />
        <text x={32} y={195} fontSize={9.5} fontFamily={MONO} fill={C.green}>
          the shared green factors are the reusable error signal
        </text>
        <text x={32} y={209} fontSize={9.5} fontFamily={MONO} fill={C.green}>
          δ = (a2 − y)·σ'(z2) — this is what backprop saves and propagates.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span style={{ color: C.muted, fontFamily: MONO }}>target:</span>
        {(["w2", "w1"] as Target[]).map((t) => {
          const active = target === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
              style={
                active
                  ? { background: C.ink, color: "var(--background)" }
                  : undefined
              }
            >
              {t === "w2" ? "∂C/∂w2" : "∂C/∂w1"}
            </button>
          );
        })}
        <span style={{ color: C.green, fontFamily: MONO }}>
          green = shared δ (reused across both gradients)
        </span>
      </div>
    </div>
  );
}
