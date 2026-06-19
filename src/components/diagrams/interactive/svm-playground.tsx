"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// --- Data model -------------------------------------------------------------
// Points live in an abstract data space [0,10] x [0,10]; we map into the svg
// plot rect below. Class +1 (blue) sits lower-left, class -1 (coral) upper-right.

type Pt = { x: number; y: number };

const INITIAL_POS: Pt[] = [
  { x: 1.6, y: 2.2 }, // 0  +1
  { x: 2.4, y: 4.1 }, // 1  +1
  { x: 1.2, y: 5.4 }, // 2  +1
  { x: 3.3, y: 2.9 }, // 3  +1
  { x: 0.9, y: 3.4 }, // 4  +1
  { x: 4.0, y: 4.6 }, // 5  +1  (near boundary)
];
const INITIAL_NEG: Pt[] = [
  { x: 6.4, y: 6.0 }, // 0  -1  (near boundary)
  { x: 7.8, y: 7.6 }, // 1  -1
  { x: 8.6, y: 5.9 }, // 2  -1
  { x: 6.9, y: 8.4 }, // 3  -1
  { x: 9.1, y: 7.2 }, // 4  -1
  { x: 7.5, y: 5.2 }, // 5  -1
];

// Plot geometry inside the 320x280 viewBox.
const PLOT = { x0: 38, y0: 14, x1: 304, y1: 250 };
const DATA = { lo: 0, hi: 10 };

const mapX = (x: number) =>
  PLOT.x0 + ((x - DATA.lo) / (DATA.hi - DATA.lo)) * (PLOT.x1 - PLOT.x0);
const mapY = (y: number) =>
  PLOT.y1 - ((y - DATA.lo) / (DATA.hi - DATA.lo)) * (PLOT.y1 - PLOT.y0);

// Inverse maps (used only inside pointer handlers, from getBoundingClientRect).
const invX = (px: number) =>
  DATA.lo + ((px - PLOT.x0) / (PLOT.x1 - PLOT.x0)) * (DATA.hi - DATA.lo);
const invY = (py: number) =>
  DATA.lo + ((PLOT.y1 - py) / (PLOT.y1 - PLOT.y0)) * (DATA.hi - DATA.lo);

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

type Selected = { cls: 1 | -1; idx: number } | null;

// Closest opposing pair → max-margin boundary (perpendicular bisector).
type Solution = {
  pos: number; // index of support vector in pos class
  neg: number; // index of support vector in neg class
  // Boundary written as n·p = c, with unit normal n pointing pos→neg.
  nx: number;
  ny: number;
  cMid: number; // offset of boundary (midpoint)
  cPos: number; // offset of +1 margin line (through pos SV)
  cNeg: number; // offset of -1 margin line (through neg SV)
  margin: number; // full margin width in data units
};

function solve(pos: Pt[], neg: Pt[]): Solution {
  let best = Infinity;
  let bi = 0;
  let bj = 0;
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < neg.length; j++) {
      const dx = neg[j].x - pos[i].x;
      const dy = neg[j].y - pos[i].y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) {
        best = d2;
        bi = i;
        bj = j;
      }
    }
  }
  const p = pos[bi];
  const q = neg[bj];
  let nx = q.x - p.x;
  let ny = q.y - p.y;
  const len = Math.hypot(nx, ny) || 1; // guard degenerate / vertical bisector
  nx /= len;
  ny /= len;
  // Offsets: project each support vector onto the unit normal.
  const cPos = nx * p.x + ny * p.y;
  const cNeg = nx * q.x + ny * q.y;
  const cMid = (cPos + cNeg) / 2;
  return {
    pos: bi,
    neg: bj,
    nx,
    ny,
    cMid,
    cPos,
    cNeg,
    margin: Math.abs(cNeg - cPos),
  };
}

// Endpoints of the line n·p = c clipped to the data box [0,10]^2.
function lineEndpoints(nx: number, ny: number, c: number): [Pt, Pt] {
  const hits: Pt[] = [];
  const lo = DATA.lo;
  const hi = DATA.hi;
  // Intersections with the four box edges.
  if (Math.abs(ny) > 1e-9) {
    const yA = (c - nx * lo) / ny; // x = lo
    if (yA >= lo - 1e-9 && yA <= hi + 1e-9) hits.push({ x: lo, y: yA });
    const yB = (c - nx * hi) / ny; // x = hi
    if (yB >= lo - 1e-9 && yB <= hi + 1e-9) hits.push({ x: hi, y: yB });
  }
  if (Math.abs(nx) > 1e-9) {
    const xA = (c - ny * lo) / nx; // y = lo
    if (xA >= lo - 1e-9 && xA <= hi + 1e-9) hits.push({ x: xA, y: lo });
    const xB = (c - ny * hi) / nx; // y = hi
    if (xB >= lo - 1e-9 && xB <= hi + 1e-9) hits.push({ x: xB, y: hi });
  }
  if (hits.length < 2) {
    // Fallback: degenerate, return a tiny segment to avoid NaN paths.
    return [
      { x: lo, y: lo },
      { x: hi, y: hi },
    ];
  }
  return [hits[0], hits[1]];
}

export function SvmPlayground() {
  const [pos, setPos] = useState<Pt[]>(INITIAL_POS);
  const [neg, setNeg] = useState<Pt[]>(INITIAL_NEG);
  const [sel, setSel] = useState<Selected>(null);

  const sol = solve(pos, neg);

  const reset = () => {
    setPos(INITIAL_POS);
    setNeg(INITIAL_NEG);
    setSel(null);
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!sel) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Convert client px → viewBox units → data units.
    const vx = ((e.clientX - rect.left) / rect.width) * 320;
    const vy = ((e.clientY - rect.top) / rect.height) * 280;
    const dx = clamp(invX(vx), DATA.lo, DATA.hi);
    const dy = clamp(invY(vy), DATA.lo, DATA.hi);
    const next = { x: dx, y: dy };
    if (sel.cls === 1) {
      setPos((prev) => prev.map((p, i) => (i === sel.idx ? next : p)));
    } else {
      setNeg((prev) => prev.map((p, i) => (i === sel.idx ? next : p)));
    }
  };

  const release = () => setSel(null);

  const [aMid, bMid] = lineEndpoints(sol.nx, sol.ny, sol.cMid);
  const [aPos, bPos] = lineEndpoints(sol.nx, sol.ny, sol.cPos);
  const [aNeg, bNeg] = lineEndpoints(sol.nx, sol.ny, sol.cNeg);

  // Margin band as a filled quad between the two margin lines.
  const band = `${mapX(aPos.x)},${mapY(aPos.y)} ${mapX(bPos.x)},${mapY(
    bPos.y,
  )} ${mapX(bNeg.x)},${mapY(bNeg.y)} ${mapX(aNeg.x)},${mapY(aNeg.y)}`;

  const renderPt = (p: Pt, cls: 1 | -1, idx: number) => {
    const isSV =
      (cls === 1 && idx === sol.pos) || (cls === -1 && idx === sol.neg);
    const fill = cls === 1 ? C.blue : C.coral;
    const cx = mapX(p.x);
    const cy = mapY(p.y);
    const active = sel?.cls === cls && sel.idx === idx;
    return (
      <g
        key={`${cls}-${idx}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          setSel({ cls, idx });
        }}
        style={{ cursor: "grab" }}
      >
        {isSV && (
          <circle
            cx={cx}
            cy={cy}
            r={8.5}
            fill="none"
            stroke={C.green}
            strokeWidth={2}
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={isSV ? 5.5 : 4.5}
          fill={fill}
          stroke={active ? C.ink : "var(--card)"}
          strokeWidth={active ? 1.6 : 1}
        />
      </g>
    );
  };

  return (
    <div>
      <svg
        viewBox="0 0 320 280"
        className="h-auto w-full"
        role="img"
        aria-label="Maximum margin SVM"
        onPointerMove={onMove}
        onPointerUp={release}
        onPointerLeave={release}
        style={{ touchAction: "none" }}
      >
        {/* plot frame */}
        <rect
          x={PLOT.x0}
          y={PLOT.y0}
          width={PLOT.x1 - PLOT.x0}
          height={PLOT.y1 - PLOT.y0}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />
        {/* grid */}
        {[2, 4, 6, 8].map((g) => (
          <g key={g}>
            <line
              x1={mapX(g)}
              y1={PLOT.y0}
              x2={mapX(g)}
              y2={PLOT.y1}
              stroke={C.grid}
              strokeWidth={1}
            />
            <line
              x1={PLOT.x0}
              y1={mapY(g)}
              x2={PLOT.x1}
              y2={mapY(g)}
              stroke={C.grid}
              strokeWidth={1}
            />
          </g>
        ))}

        {/* margin band */}
        <polygon points={band} fill={C.greenFill} opacity={0.55} />

        {/* margin lines (dashed parallels) */}
        <line
          x1={mapX(aPos.x)}
          y1={mapY(aPos.y)}
          x2={mapX(bPos.x)}
          y2={mapY(bPos.y)}
          stroke={C.blue}
          strokeWidth={1.4}
          strokeDasharray="5 4"
        />
        <line
          x1={mapX(aNeg.x)}
          y1={mapY(aNeg.y)}
          x2={mapX(bNeg.x)}
          y2={mapY(bNeg.y)}
          stroke={C.coral}
          strokeWidth={1.4}
          strokeDasharray="5 4"
        />

        {/* decision boundary (solid) */}
        <line
          x1={mapX(aMid.x)}
          y1={mapY(aMid.y)}
          x2={mapX(bMid.x)}
          y2={mapY(bMid.y)}
          stroke={C.ink}
          strokeWidth={2}
        />

        {/* points */}
        {pos.map((p, i) => renderPt(p, 1, i))}
        {neg.map((p, i) => renderPt(p, -1, i))}

        {/* axis labels */}
        <text x={PLOT.x0} y={272} fontSize={10} fill={C.muted} fontFamily={MONO}>
          x1
        </text>
        <text
          x={14}
          y={PLOT.y0 + 8}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
        >
          x2
        </text>

        {/* margin readout */}
        <text x={PLOT.x0} y={10} fontSize={11} fill={C.ink} fontFamily={MONO}>
          margin = {sol.margin.toFixed(2)}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset points
        </button>
        <span className="font-mono" style={{ color: C.blue }}>
          class +1
        </span>
        <span className="font-mono" style={{ color: C.coral }}>
          class -1
        </span>
        <span className="font-mono" style={{ color: C.green }}>
          support vectors (ringed)
        </span>
        <span className="font-mono text-[var(--muted)]">
          drag any point, the support vectors alone fix the boundary.
        </span>
      </div>
    </div>
  );
}
