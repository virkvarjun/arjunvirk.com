"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

type Pt = { x: number; y: number; c: number };

// 24 deterministic training points in two roughly-separated clusters with a
// little overlap. Class 0 (coral) skews lower-left; class 1 (blue) upper-right.
const TRAIN: Pt[] = [
  { x: 1.5, y: 2.0, c: 0 },
  { x: 2.3, y: 1.2, c: 0 },
  { x: 1.0, y: 3.4, c: 0 },
  { x: 2.8, y: 2.7, c: 0 },
  { x: 3.5, y: 1.6, c: 0 },
  { x: 1.8, y: 4.2, c: 0 },
  { x: 3.1, y: 3.8, c: 0 },
  { x: 4.2, y: 2.4, c: 0 },
  { x: 2.5, y: 5.1, c: 0 },
  { x: 4.0, y: 4.6, c: 0 },
  { x: 5.0, y: 3.2, c: 0 },
  { x: 5.4, y: 5.0, c: 0 }, // overlap into blue territory
  { x: 8.6, y: 8.2, c: 1 },
  { x: 7.8, y: 9.0, c: 1 },
  { x: 9.1, y: 6.8, c: 1 },
  { x: 7.1, y: 7.6, c: 1 },
  { x: 6.4, y: 8.6, c: 1 },
  { x: 8.2, y: 6.0, c: 1 },
  { x: 6.8, y: 6.4, c: 1 },
  { x: 9.4, y: 8.8, c: 1 },
  { x: 5.8, y: 7.2, c: 1 },
  { x: 7.4, y: 5.4, c: 1 },
  { x: 6.0, y: 5.6, c: 1 }, // overlap into coral territory
  { x: 8.8, y: 7.4, c: 1 },
];

const PAD = 24;
const SIZE = 300;
const PLOT = SIZE - PAD * 2;
const GRID_N = 24; // coarse decision-boundary grid (24x24 = 576 cells)

// data 0..10 -> svg pixels
const mapX = (x: number) => PAD + (PLOT * x) / 10;
const mapY = (y: number) => PAD + PLOT - (PLOT * y) / 10; // y up

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// Indices of the k nearest training points to (qx, qy), sorted by distance.
function nearestIdx(qx: number, qy: number, k: number): number[] {
  const order = TRAIN.map((p, i) => ({ i, d: dist2(qx, qy, p.x, p.y) }));
  order.sort((a, b) => a.d - b.d);
  return order.slice(0, k).map((o) => o.i);
}

// Predict class at (qx, qy): returns winning class (tie -> 1).
function predict(qx: number, qy: number, k: number): number {
  const idx = nearestIdx(qx, qy, k);
  let v1 = 0;
  for (const i of idx) v1 += TRAIN[i].c;
  return v1 * 2 >= idx.length ? 1 : 0;
}

export function KnnPlayground() {
  const [k, setK] = useState(5);
  const [query, setQuery] = useState<{ x: number; y: number }>({ x: 5, y: 5 });
  const [showBoundary, setShowBoundary] = useState(false);

  const kk = Math.min(k, TRAIN.length);
  const idx = nearestIdx(query.x, query.y, kk);
  const votes0 = idx.filter((i) => TRAIN[i].c === 0).length;
  const votes1 = kk - votes0;
  const winner = votes1 >= votes0 ? 1 : 0;
  const wHi = Math.max(votes0, votes1);
  const wLo = Math.min(votes0, votes1);

  // Radius reaches the k-th (farthest of the k) nearest neighbour.
  const farthest = idx[idx.length - 1];
  const radiusData = farthest
    ? Math.sqrt(dist2(query.x, query.y, TRAIN[farthest].x, TRAIN[farthest].y))
    : 0;
  const radiusPx = (radiusData / 10) * PLOT;

  const highlighted = new Set(idx);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    // Read geometry only inside the handler (SSR-safe).
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * SIZE;
    const py = ((e.clientY - rect.top) / rect.height) * SIZE;
    let dx = ((px - PAD) / PLOT) * 10;
    let dy = ((PAD + PLOT - py) / PLOT) * 10;
    dx = Math.max(0, Math.min(10, dx));
    dy = Math.max(0, Math.min(10, dy));
    setQuery({ x: dx, y: dy });
  }

  // Decision-boundary cells (only built when toggled on).
  const cellW = PLOT / GRID_N;
  const boundaryCells = showBoundary
    ? Array.from({ length: GRID_N * GRID_N }, (_, n) => {
        const gx = n % GRID_N;
        const gy = Math.floor(n / GRID_N);
        const cx = ((gx + 0.5) / GRID_N) * 10;
        const cy = ((gy + 0.5) / GRID_N) * 10;
        const cls = predict(cx, cy, kk);
        return {
          key: n,
          x: PAD + gx * cellW,
          y: PAD + PLOT - (gy + 1) * cellW,
          fill: cls === 0 ? C.coralFill : C.blueFill,
        };
      })
    : [];

  const qpx = mapX(query.x);
  const qpy = mapY(query.y);

  return (
    <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <svg
        viewBox="0 0 300 300"
        className="h-auto w-full"
        role="img"
        aria-label="k-nearest neighbours playground"
        onClick={handleClick}
        style={{ cursor: "crosshair" }}
      >
        {/* plot background */}
        <rect
          x={PAD}
          y={PAD}
          width={PLOT}
          height={PLOT}
          fill="var(--background)"
          stroke={C.line}
        />

        {/* decision-boundary shading */}
        {boundaryCells.map((cell) => (
          <rect
            key={cell.key}
            x={cell.x}
            y={cell.y}
            width={cellW + 0.5}
            height={cellW + 0.5}
            fill={cell.fill}
          />
        ))}

        {/* neighbourhood radius circle */}
        {radiusPx > 0 && (
          <circle
            cx={qpx}
            cy={qpy}
            r={radiusPx}
            fill="none"
            stroke={winner === 1 ? C.blue : C.coral}
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
        )}

        {/* training points */}
        {TRAIN.map((p, i) => {
          const cx = mapX(p.x);
          const cy = mapY(p.y);
          const col = p.c === 0 ? C.coral : C.blue;
          return (
            <g key={i}>
              {highlighted.has(i) && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6.5}
                  fill="none"
                  stroke={C.ink}
                  strokeWidth={1.6}
                />
              )}
              <circle cx={cx} cy={cy} r={3.5} fill={col} />
            </g>
          );
        })}

        {/* query point */}
        <g>
          <line
            x1={qpx - 6}
            y1={qpy}
            x2={qpx + 6}
            y2={qpy}
            stroke={C.ink}
            strokeWidth={1.5}
          />
          <line
            x1={qpx}
            y1={qpy - 6}
            x2={qpx}
            y2={qpy + 6}
            stroke={C.ink}
            strokeWidth={1.5}
          />
          <circle
            cx={qpx}
            cy={qpy}
            r={4}
            fill="var(--card)"
            stroke={C.ink}
            strokeWidth={1.5}
          />
        </g>

        {/* readout */}
        <text
          x={PAD}
          y={16}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="start"
        >
          {`k=${kk} -> class ${winner} wins ${wHi}-${wLo}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">k</span>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="w-32 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-8">{k}</span>
        </label>

        <button
          type="button"
          onClick={() => setShowBoundary((s) => !s)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {showBoundary ? "hide decision boundary" : "show decision boundary"}
        </button>

        <span className="font-mono text-[var(--muted)]">click plot to move query</span>
      </div>
    </div>
  );
}
