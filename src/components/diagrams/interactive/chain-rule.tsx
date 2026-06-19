"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// A small fixed nudge on the input. We watch how it grows or shrinks as it
// passes through each edge, the local derivative scales it every time.
const DX = 0.5;

// Horizontal slots for the boxes. Index 0..3 maps to x, u, v, y. With only
// two links we skip v and route u -> y directly.
const SLOTS = [40, 175, 310, 400];
const CY = 78;
const BW = 46;
const BH = 30;

function fmt(n: number) {
  return (n >= 0 ? " " : "") + n.toFixed(2);
}

// A labeled box (variable node) with a value underneath.
function Node({ cx, name, value }: { cx: number; name: string; value: number }) {
  return (
    <g>
      <rect
        x={cx - BW / 2}
        y={CY - BH / 2}
        width={BW}
        height={BH}
        rx={5}
        fill="var(--card)"
        stroke={C.line}
        strokeWidth={1.2}
      />
      <text x={cx} y={CY - 2} fontSize={13} fill={C.ink} fontFamily={MONO} textAnchor="middle">
        {name}
      </text>
      <text x={cx} y={CY + 11} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
        {value.toFixed(2)}
      </text>
    </g>
  );
}

// One edge: arrow + the local derivative on top, and the propagated nudge
// magnitude drawn as a small bar below so the scaling is visible.
function Edge({
  x1,
  x2,
  deriv,
  derivLabel,
  nudge,
}: {
  x1: number;
  x2: number;
  deriv: number;
  derivLabel: string;
  nudge: number;
}) {
  const mx = (x1 + x2) / 2;
  const len = Math.max(0.5, Math.min(28, Math.abs(nudge) * 30));
  const barColor = nudge >= 0 ? C.blue : C.coral;
  return (
    <g>
      <line x1={x1} y1={CY} x2={x2 - 8} y2={CY} stroke={C.ink} strokeWidth={1.4} />
      <polygon points={`${x2},${CY} ${x2 - 8},${CY - 4} ${x2 - 8},${CY + 4}`} fill={C.ink} />
      <text x={mx} y={CY - 26} fontSize={10} fill={C.violet} fontFamily={MONO} textAnchor="middle">
        {derivLabel}
      </text>
      <text x={mx} y={CY - 14} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="middle">
        {fmt(deriv)}
      </text>
      {/* propagated nudge magnitude after this edge */}
      <rect
        x={mx - len / 2}
        y={CY + 18}
        width={len}
        height={7}
        rx={1.5}
        fill={barColor}
        opacity={0.85}
      />
      <text x={mx} y={CY + 40} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
        {fmt(nudge)}
      </text>
    </g>
  );
}

export function ChainRule() {
  const [a, setA] = useState(1.5);
  const [b, setB] = useState(1.0);
  const [x, setX] = useState(1.0);
  const [threeLinks, setThreeLinks] = useState(false);

  const C3 = 1.0; // fixed coefficient on the optional middle link (v = c*u)

  // Forward pass.
  const u = a * x;
  const v = threeLinks ? C3 * u : u;
  const y = b * v * v;

  // Local derivatives along the path.
  const dudx = a;
  const dvdu = C3; // only present in the 3-link chain
  const dydv = 2 * b * v; // dy/dv = 2*b*v  (also dy/du when no middle link)

  // Running product = total sensitivity dy/dx.
  const dydx = threeLinks ? dydv * dvdu * dudx : dydv * dudx;

  // Nudge propagation: scale Δx by each local derivative in turn.
  const n1 = DX * dudx; // after edge 1
  const n2 = threeLinks ? n1 * dvdu : n1; // after edge 2
  const nOut = threeLinks ? n2 * dydv : n1 * dydv; // arriving at y

  const productLabel = threeLinks
    ? "dy/dx = dy/dv · dv/du · du/dx"
    : "dy/dx = dy/du · du/dx";
  const productValues = threeLinks
    ? `= ${fmt(dydv)} ·${fmt(dvdu)} ·${fmt(dudx)} =${fmt(dydx)}`
    : `= ${fmt(dydv)} ·${fmt(dudx)} =${fmt(dydx)}`;

  const slotX = threeLinks ? SLOTS[1] : SLOTS[1];
  const slotY = threeLinks ? SLOTS[3] : SLOTS[2];

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox="0 0 440 220"
        className="h-auto w-full"
        role="img"
        aria-label="The chain rule"
      >
        {/* nodes */}
        <Node cx={SLOTS[0]} name="x" value={x} />
        <Node cx={slotX} name="u" value={u} />
        {threeLinks && <Node cx={SLOTS[2]} name="v" value={v} />}
        <Node cx={slotY} name="y" value={y} />

        {/* edges + local derivatives + propagated nudges */}
        <Edge x1={SLOTS[0] + BW / 2} x2={slotX - BW / 2} deriv={dudx} derivLabel="du/dx = a" nudge={n1} />
        {threeLinks ? (
          <>
            <Edge x1={slotX + BW / 2} x2={SLOTS[2] - BW / 2} deriv={dvdu} derivLabel="dv/du = c" nudge={n2} />
            <Edge x1={SLOTS[2] + BW / 2} x2={slotY - BW / 2} deriv={dydv} derivLabel="dy/dv = 2bv" nudge={nOut} />
          </>
        ) : (
          <Edge x1={slotX + BW / 2} x2={slotY - BW / 2} deriv={dydv} derivLabel="dy/du = 2bu" nudge={nOut} />
        )}

        {/* input nudge marker */}
        <text x={SLOTS[0]} y={CY + 40} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          {`Δx =${fmt(DX)}`}
        </text>

        {/* running product readout */}
        <text x={220} y={155} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="middle">
          {productLabel}
        </text>
        <text x={220} y={172} fontSize={11} fill={C.violet} fontFamily={MONO} textAnchor="middle">
          {productValues}
        </text>
        <text x={220} y={196} fontSize={9.5} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          {`Δx ⇒ Δy ≈${fmt(nOut)}   (sensitivity is the product of local slopes)`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono">
          a
          <input
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={a}
            onChange={(e) => setA(parseFloat(e.target.value))}
            className="w-24 accent-[var(--foreground)]"
            aria-label="coefficient a"
          />
          <span className="font-mono tabular-nums w-9">{a.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-2 font-mono">
          b
          <input
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={b}
            onChange={(e) => setB(parseFloat(e.target.value))}
            className="w-24 accent-[var(--foreground)]"
            aria-label="coefficient b"
          />
          <span className="font-mono tabular-nums w-9">{b.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-2 font-mono">
          x
          <input
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={x}
            onChange={(e) => setX(parseFloat(e.target.value))}
            className="w-24 accent-[var(--foreground)]"
            aria-label="input value x"
          />
          <span className="font-mono tabular-nums w-9">{x.toFixed(1)}</span>
        </label>
        <button type="button" className={btn} onClick={() => setThreeLinks((t) => !t)}>
          {threeLinks ? "remove third link" : "add a third link"}
        </button>
      </div>
    </div>
  );
}
