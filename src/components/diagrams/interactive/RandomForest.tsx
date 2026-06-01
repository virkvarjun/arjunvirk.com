"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

type Pt = { x: number; y: number; c: number };

// 24 deterministic points split by a roughly diagonal / curved boundary.
// Class 0 (coral) sits below-left, class 1 (blue) above-right.
const DATA: Pt[] = [
  { x: 1.0, y: 1.4, c: 0 },
  { x: 2.2, y: 1.0, c: 0 },
  { x: 1.6, y: 2.8, c: 0 },
  { x: 3.0, y: 1.8, c: 0 },
  { x: 2.6, y: 3.4, c: 0 },
  { x: 4.0, y: 2.2, c: 0 },
  { x: 3.6, y: 3.8, c: 0 },
  { x: 5.0, y: 2.6, c: 0 },
  { x: 4.6, y: 4.4, c: 0 },
  { x: 6.0, y: 3.0, c: 0 },
  { x: 5.6, y: 4.8, c: 0 },
  { x: 7.0, y: 3.6, c: 0 },
  { x: 3.4, y: 6.2, c: 1 },
  { x: 4.4, y: 7.2, c: 1 },
  { x: 2.6, y: 7.8, c: 1 },
  { x: 5.4, y: 6.6, c: 1 },
  { x: 4.8, y: 8.6, c: 1 },
  { x: 6.4, y: 7.4, c: 1 },
  { x: 5.8, y: 9.0, c: 1 },
  { x: 7.4, y: 6.8, c: 1 },
  { x: 7.0, y: 8.4, c: 1 },
  { x: 8.4, y: 7.6, c: 1 },
  { x: 8.0, y: 9.2, c: 1 },
  { x: 9.0, y: 8.2, c: 1 },
];

// A single decision-stump-ish tree: an axis-aligned threshold whose split value
// wobbles deterministically along the perpendicular axis, producing a jagged
// step boundary. All parameters derive from the tree index i (no randomness).
interface Tree {
  axis: "x" | "y"; // which feature the staircase steps along
  base: number; // nominal threshold in data coords (0..10)
  amp: number; // jaggedness amplitude
  freq: number; // step frequency
  phase: number; // deterministic offset
}

const PLOT = 230; // square panel side in svg units
const OX = 24; // panel origin x
const OY = 8; // panel origin y
const GRID_N = 22; // coarse voting grid
const TREE_MAX = 25;

// Deterministic small fractional hash in [0,1) from an integer.
function hash01(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function makeTree(i: number, subsets: boolean): Tree {
  // Decorrelate: with random-feature-subsets ON, some trees split on x, some
  // on y (chosen by i). OFF, every tree steps along x for a common bias.
  const axis: "x" | "y" = subsets && i % 3 === 0 ? "x" : "y";
  // Boundary roughly tracks the data's diagonal divide near the middle.
  const base = 4.8 + Math.sin(i * 1.3) * 0.9 + (hash01(i) - 0.5) * 0.8;
  const amp = 1.1 + Math.abs(Math.sin(i * 2.1)) * 0.9;
  const freq = 1.6 + (i % 4) * 0.55 + hash01(i + 7) * 0.6;
  const phase = i * 0.7 + hash01(i + 3) * 2.0;
  return { axis, base, amp, freq, phase };
}

// The jagged threshold of a tree, evaluated at the point's perpendicular coord.
function treeThreshold(t: Tree, along: number): number {
  return t.base + Math.sin(along * t.freq + t.phase) * t.amp;
}

// Predict class for a point under one tree. The boundary is diagonal-ish:
// class 1 (blue) lies "above" the stepped threshold line.
function predictTree(t: Tree, x: number, y: number): number {
  if (t.axis === "y") {
    // staircase steps along x; threshold is on y
    return y > treeThreshold(t, x) ? 1 : 0;
  }
  // staircase steps along y; threshold is on x (mirrored so blue is upper-right)
  return x < treeThreshold(t, y) ? 1 : 0;
}

// data coord -> svg
const sx = (x: number) => OX + (x / 10) * PLOT;
const sy = (y: number) => OY + (1 - y / 10) * PLOT;

export function RandomForest() {
  const [trees, setTrees] = useState(1);
  const [subsets, setSubsets] = useState(false);

  const active: Tree[] = [];
  for (let i = 1; i <= trees; i++) active.push(makeTree(i, subsets));

  // Faint per-tree boundaries: sample each tree's stepped threshold as a path.
  const faintPaths = active.map((t) => {
    const pts: string[] = [];
    const N = 48;
    for (let k = 0; k <= N; k++) {
      const along = (k / N) * 10;
      const thr = Math.max(0, Math.min(10, treeThreshold(t, along)));
      const px = t.axis === "y" ? sx(along) : sx(thr);
      const py = t.axis === "y" ? sy(thr) : sy(along);
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return pts.join(" ");
  });

  // Ensemble vote on a coarse grid: each cell predicted by majority across trees.
  const cell = PLOT / GRID_N;
  const cells: { gx: number; gy: number; c: number }[] = [];
  const vote: number[][] = [];
  for (let gy = 0; gy < GRID_N; gy++) {
    vote[gy] = [];
    for (let gx = 0; gx < GRID_N; gx++) {
      const dx = ((gx + 0.5) / GRID_N) * 10;
      const dy = (1 - (gy + 0.5) / GRID_N) * 10;
      let ones = 0;
      for (const t of active) ones += predictTree(t, dx, dy);
      const c = ones * 2 >= active.length ? 1 : 0;
      vote[gy][gx] = c;
      cells.push({ gx, gy, c });
    }
  }

  // Bold ensemble boundary: draw cell edges between differing votes.
  const edges: string[] = [];
  for (let gy = 0; gy < GRID_N; gy++) {
    for (let gx = 0; gx < GRID_N; gx++) {
      const c = vote[gy][gx];
      if (gx + 1 < GRID_N && vote[gy][gx + 1] !== c) {
        const ex = OX + (gx + 1) * cell;
        edges.push(`M${ex.toFixed(1)},${(OY + gy * cell).toFixed(1)} v${cell.toFixed(1)}`);
      }
      if (gy + 1 < GRID_N && vote[gy + 1][gx] !== c) {
        const ey = OY + (gy + 1) * cell;
        edges.push(`M${(OX + gx * cell).toFixed(1)},${ey.toFixed(1)} h${cell.toFixed(1)}`);
      }
    }
  }

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Random forest variance reduction"
      >
        {/* ensemble shading */}
        {cells.map((cl) => (
          <rect
            key={`c${cl.gx}-${cl.gy}`}
            x={OX + cl.gx * cell}
            y={OY + cl.gy * cell}
            width={cell + 0.5}
            height={cell + 0.5}
            fill={cl.c === 1 ? C.blueFill : C.coralFill}
            opacity={0.6}
          />
        ))}

        {/* panel frame */}
        <rect
          x={OX}
          y={OY}
          width={PLOT}
          height={PLOT}
          fill="none"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* faint individual tree boundaries piling up */}
        {faintPaths.map((p, i) => (
          <polyline
            key={`f${i}`}
            points={p}
            fill="none"
            stroke={C.line}
            strokeWidth={1}
            opacity={0.35}
          />
        ))}

        {/* bold voted ensemble boundary */}
        <path d={edges.join(" ")} fill="none" stroke={C.ink} strokeWidth={2} />

        {/* data points */}
        {DATA.map((p, i) => (
          <circle
            key={`p${i}`}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={3.6}
            fill={p.c === 1 ? C.blue : C.coral}
            stroke="var(--card)"
            strokeWidth={1}
          />
        ))}

        {/* legend / readout */}
        <text x={OX + PLOT + 12} y={OY + 18} fontSize={11} fill={C.ink} fontFamily={MONO}>
          trees: {trees}
        </text>
        <text x={OX + PLOT + 12} y={OY + 40} fontSize={10} fill={C.muted} fontFamily={MONO}>
          faint = each
        </text>
        <text x={OX + PLOT + 12} y={OY + 53} fontSize={10} fill={C.muted} fontFamily={MONO}>
          tree&apos;s split
        </text>
        <text x={OX + PLOT + 12} y={OY + 75} fontSize={10} fill={C.ink} fontFamily={MONO}>
          bold = vote
        </text>
        <circle cx={OX + PLOT + 18} cy={OY + 96} r={3.6} fill={C.coral} />
        <text x={OX + PLOT + 26} y={OY + 100} fontSize={10} fill={C.muted} fontFamily={MONO}>
          class A
        </text>
        <circle cx={OX + PLOT + 18} cy={OY + 114} r={3.6} fill={C.blue} />
        <text x={OX + PLOT + 26} y={OY + 118} fontSize={10} fill={C.muted} fontFamily={MONO}>
          class B
        </text>
        <text x={OX + PLOT + 12} y={OY + 150} fontSize={9} fill={C.muted} fontFamily={MONO}>
          subsets:
        </text>
        <text x={OX + PLOT + 12} y={OY + 163} fontSize={9} fill={C.ink} fontFamily={MONO}>
          {subsets ? "on" : "off"}
        </text>
        <text x={OX + PLOT + 12} y={OY + 200} fontSize={9} fill={C.muted} fontFamily={MONO}>
          more trees
        </text>
        <text x={OX + PLOT + 12} y={OY + 212} fontSize={9} fill={C.muted} fontFamily={MONO}>
          {"→ smoother"}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span>number of trees</span>
          <input
            type="range"
            min={1}
            max={TREE_MAX}
            step={1}
            value={trees}
            onChange={(e) => setTrees(Number(e.target.value))}
            className="w-32 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-8">{trees}</span>
        </label>

        <button
          type="button"
          onClick={() => setSubsets((s) => !s)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          random feature subsets: {subsets ? "on" : "off"}
        </button>

        <span className="text-[var(--muted)]">
          Subsets make trees split on different features, decorrelating their errors so the vote
          averages out faster.
        </span>
      </div>
    </div>
  );
}
