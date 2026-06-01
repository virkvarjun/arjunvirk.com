"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

interface Point {
  x: number;
  y: number;
}
interface Centroid {
  x: number;
  y: number;
}

// --- Hard-coded data: ~30 points in 3 visible clumps (data coords 0..10). ---
const POINTS: Point[] = [
  // clump A (lower-left)
  { x: 1.4, y: 1.8 },
  { x: 2.1, y: 1.2 },
  { x: 1.0, y: 2.6 },
  { x: 2.6, y: 2.2 },
  { x: 1.8, y: 3.1 },
  { x: 2.9, y: 1.6 },
  { x: 1.2, y: 1.1 },
  { x: 2.3, y: 2.9 },
  { x: 0.8, y: 2.0 },
  { x: 2.0, y: 2.0 },
  // clump B (upper-middle)
  { x: 4.6, y: 8.1 },
  { x: 5.3, y: 8.7 },
  { x: 4.9, y: 7.4 },
  { x: 5.8, y: 8.2 },
  { x: 4.2, y: 7.9 },
  { x: 5.5, y: 7.6 },
  { x: 5.0, y: 8.9 },
  { x: 4.4, y: 8.5 },
  { x: 5.9, y: 7.9 },
  { x: 4.8, y: 8.3 },
  // clump C (lower-right)
  { x: 8.2, y: 2.4 },
  { x: 8.9, y: 1.7 },
  { x: 7.7, y: 2.0 },
  { x: 9.3, y: 2.8 },
  { x: 8.5, y: 3.2 },
  { x: 9.0, y: 2.1 },
  { x: 7.9, y: 1.3 },
  { x: 8.7, y: 2.6 },
  { x: 9.4, y: 1.9 },
  { x: 8.0, y: 2.9 },
];

// --- Fixed initial-centroid layouts ("seeds"). seeds[s][k-2] gives the
//     centroid list for re-seed index s and the current k. Deliberately
//     imperfect so iteration visibly moves them. ---
const SEEDS: Centroid[][][] = [
  // seed 0: a decent-but-offset start
  [
    // k=2
    [
      { x: 2.0, y: 4.5 },
      { x: 7.0, y: 5.0 },
    ],
    // k=3
    [
      { x: 3.5, y: 3.0 },
      { x: 4.0, y: 6.5 },
      { x: 7.5, y: 4.0 },
    ],
    // k=4
    [
      { x: 2.5, y: 3.0 },
      { x: 5.0, y: 6.0 },
      { x: 7.5, y: 3.5 },
      { x: 5.5, y: 4.5 },
    ],
  ],
  // seed 1: a worse start, centroids bunched on one side
  [
    [
      { x: 4.5, y: 7.5 },
      { x: 5.5, y: 8.0 },
    ],
    [
      { x: 4.6, y: 7.8 },
      { x: 5.0, y: 8.4 },
      { x: 5.4, y: 7.4 },
    ],
    [
      { x: 4.4, y: 7.9 },
      { x: 4.9, y: 8.5 },
      { x: 5.3, y: 7.6 },
      { x: 5.7, y: 8.2 },
    ],
  ],
  // seed 2: another skewed start, all near the bottom
  [
    [
      { x: 1.5, y: 1.5 },
      { x: 8.5, y: 2.5 },
    ],
    [
      { x: 1.5, y: 1.8 },
      { x: 8.5, y: 2.0 },
      { x: 5.0, y: 1.0 },
    ],
    [
      { x: 1.6, y: 1.6 },
      { x: 8.6, y: 2.4 },
      { x: 4.8, y: 1.2 },
      { x: 6.0, y: 1.0 },
    ],
  ],
];

const COLORS = [C.coral, C.blue, C.green, C.violet];
const FILLS = [C.coralFill, C.blueFill, C.greenFill, C.card];

// --- Coordinate mapping: data 0..10 -> svg, y flipped. ---
const PADX = 28;
const PADTOP = 18;
const PLOTW = 320 - PADX * 2;
const PLOTH = 230 - PADTOP;
const mapX = (x: number) => PADX + (x / 10) * PLOTW;
const mapY = (y: number) => PADTOP + (1 - y / 10) * PLOTH;

function nearest(p: Point, cs: Centroid[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < cs.length; i++) {
    const d = (p.x - cs[i].x) ** 2 + (p.y - cs[i].y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function assignAll(cs: Centroid[]): number[] {
  return POINTS.map((p) => nearest(p, cs));
}

function wcss(cs: Centroid[], asn: number[]): number {
  let s = 0;
  for (let i = 0; i < POINTS.length; i++) {
    const c = cs[asn[i]];
    s += (POINTS[i].x - c.x) ** 2 + (POINTS[i].y - c.y) ** 2;
  }
  return s;
}

// Move each centroid to the mean of its assigned points (empty -> unchanged).
function updateCentroids(cs: Centroid[], asn: number[]): Centroid[] {
  return cs.map((c, k) => {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let i = 0; i < POINTS.length; i++) {
      if (asn[i] === k) {
        sx += POINTS[i].x;
        sy += POINTS[i].y;
        n++;
      }
    }
    return n === 0 ? c : { x: sx / n, y: sy / n };
  });
}

function moved(a: Centroid[], b: Centroid[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i].x - b[i].x) > 1e-4 || Math.abs(a[i].y - b[i].y) > 1e-4)
      return true;
  }
  return false;
}

interface State {
  centroids: Centroid[];
  asn: number[];
  phase: "assign" | "update"; // the step that was just performed
  iter: number;
  converged: boolean;
}

function freshState(seed: number, k: number): State {
  const centroids = SEEDS[seed][k - 2].map((c) => ({ ...c }));
  return {
    centroids,
    asn: assignAll(centroids),
    phase: "update", // so the next Step is an assignment
    iter: 0,
    converged: false,
  };
}

export function KmeansMotion() {
  const [k, setK] = useState(3);
  const [seed, setSeed] = useState(0);
  const [running, setRunning] = useState(false);
  const [st, setSt] = useState<State>(() => freshState(0, 3));

  const stRef = useRef<State>(st);
  stRef.current = st;

  // One alternating half-step: assign, then update, then assign...
  function step(prev: State): State {
    if (prev.converged) return prev;
    if (prev.phase === "update") {
      // Do an ASSIGNMENT against current centroids.
      const asn = assignAll(prev.centroids);
      return { ...prev, asn, phase: "assign" };
    }
    // Do an UPDATE: move centroids to cluster means.
    const next = updateCentroids(prev.centroids, prev.asn);
    const stayed = !moved(prev.centroids, next);
    return {
      centroids: next,
      asn: prev.asn,
      phase: "update",
      iter: prev.iter + 1,
      converged: stayed,
    };
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const next = step(stRef.current);
      setSt(next);
      if (next.converged) setRunning(false);
    }, 700);
    return () => clearInterval(id);
  }, [running]);

  function onStep(): void {
    const next = step(stRef.current);
    setSt(next);
    if (next.converged) setRunning(false);
  }
  function onReset(): void {
    setRunning(false);
    setSt(freshState(seed, k));
  }
  function onReseed(): void {
    setRunning(false);
    const s = (seed + 1) % SEEDS.length;
    setSeed(s);
    setSt(freshState(s, k));
  }
  function onK(v: number): void {
    setRunning(false);
    setK(v);
    setSt(freshState(seed, v));
  }

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  // WCSS uses the live assignment so it reflects what's shown.
  const liveAsn = st.phase === "assign" ? st.asn : assignAll(st.centroids);
  const cost = wcss(st.centroids, liveAsn);
  const showLines = st.phase === "assign";

  return (
    <div>
      <svg
        viewBox="0 0 320 300"
        className="h-auto w-full"
        role="img"
        aria-label="k-means in motion"
      >
        <rect
          x={PADX}
          y={PADTOP}
          width={PLOTW}
          height={PLOTH}
          fill="var(--card)"
          stroke={C.line}
        />

        {/* assignment lines from points to their centroid */}
        {showLines &&
          POINTS.map((p, i) => {
            const c = st.centroids[st.asn[i]];
            return (
              <line
                key={`l${i}`}
                x1={mapX(p.x)}
                y1={mapY(p.y)}
                x2={mapX(c.x)}
                y2={mapY(c.y)}
                stroke={COLORS[st.asn[i]]}
                strokeWidth={0.6}
                opacity={0.5}
              />
            );
          })}

        {/* data points, colored by current (or live) assignment */}
        {POINTS.map((p, i) => (
          <circle
            key={`p${i}`}
            cx={mapX(p.x)}
            cy={mapY(p.y)}
            r={3.4}
            fill={COLORS[liveAsn[i]]}
          />
        ))}

        {/* centroids as large ringed markers */}
        {st.centroids.map((c, j) => (
          <g key={`c${j}`}>
            <circle
              cx={mapX(c.x)}
              cy={mapY(c.y)}
              r={7.5}
              fill={FILLS[j]}
              stroke={C.ink}
              strokeWidth={2}
            />
            <circle cx={mapX(c.x)} cy={mapY(c.y)} r={3} fill={COLORS[j]} />
          </g>
        ))}

        {/* status readout */}
        <text x={PADX} y={262} fontSize={11} fill={C.muted} fontFamily={MONO}>
          {`iter ${st.iter}   next: ${st.phase === "update" ? "assign" : "update"}`}
        </text>
        <text x={PADX} y={278} fontSize={11} fill={C.ink} fontFamily={MONO}>
          {`WCSS ${cost.toFixed(2)}`}
        </text>
        <text
          x={320 - PADX}
          y={278}
          fontSize={11}
          fill={st.converged ? C.green : C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {st.converged ? "converged" : `seed ${seed}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={() => setRunning((p) => !p)}>
          {running ? "Pause" : "Play"}
        </button>
        <button type="button" className={btn} onClick={onStep}>
          Step
        </button>
        <button type="button" className={btn} onClick={onReset}>
          Reset
        </button>
        <button type="button" className={btn} onClick={onReseed}>
          Re-seed
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono">k</span>
          <input
            type="range"
            min={2}
            max={4}
            step={1}
            value={k}
            onChange={(e) => onK(Number(e.target.value))}
            className="w-24 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-6">{k}</span>
        </label>
      </div>
    </div>
  );
}
