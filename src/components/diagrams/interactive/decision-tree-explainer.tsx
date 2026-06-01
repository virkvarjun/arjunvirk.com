"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// --- Data: ~20 points in two classes over the unit-ish square [0,10]^2 ---
type Pt = { x: number; y: number; c: 0 | 1 }; // c: 0 = coral, 1 = blue
const POINTS: Pt[] = [
  { x: 1.5, y: 2.0, c: 0 },
  { x: 2.4, y: 1.2, c: 0 },
  { x: 1.0, y: 3.6, c: 0 },
  { x: 3.1, y: 2.8, c: 0 },
  { x: 2.0, y: 4.3, c: 0 },
  { x: 4.0, y: 1.6, c: 0 },
  { x: 6.2, y: 1.1, c: 0 },
  { x: 7.4, y: 2.3, c: 0 },
  { x: 8.6, y: 1.8, c: 0 },
  { x: 5.5, y: 3.0, c: 1 }, // a "noisy" blue among the coral lower band
  { x: 8.0, y: 4.0, c: 0 },
  { x: 1.8, y: 7.2, c: 1 },
  { x: 3.0, y: 8.4, c: 1 },
  { x: 2.5, y: 6.1, c: 1 },
  { x: 4.2, y: 7.6, c: 1 },
  { x: 5.8, y: 8.8, c: 1 },
  { x: 6.6, y: 6.4, c: 1 },
  { x: 7.8, y: 7.0, c: 1 },
  { x: 8.8, y: 8.2, c: 1 },
  { x: 6.0, y: 5.4, c: 0 }, // a "noisy" coral among the blue upper band
  { x: 9.2, y: 5.6, c: 1 },
];

// --- Tree / partition types ---
type Rect = { x0: number; y0: number; x1: number; y1: number };
type Split = { axis: "X" | "Y"; at: number };
type Node = {
  rect: Rect;
  pts: Pt[];
  depth: number;
  split: Split | null; // null => leaf
  cls: 0 | 1; // majority class of pts in rect
  left: Node | null; // below / left of split
  right: Node | null; // above / right of split
};

const DOMAIN: Rect = { x0: 0, y0: 0, x1: 10, y1: 10 };

function majority(pts: Pt[]): 0 | 1 {
  let blue = 0;
  for (const p of pts) blue += p.c;
  return blue * 2 >= pts.length ? 1 : 0; // ties -> blue
}

// Recursively partition `rect` by splitting the longer side at the median of
// the points inside it, stopping at `maxDepth` or when a region is pure/empty.
function build(rect: Rect, pts: Pt[], depth: number, maxDepth: number): Node {
  const cls = majority(pts);
  const pure = pts.length > 0 && pts.every((p) => p.c === cls);
  const node: Node = {
    rect,
    pts,
    depth,
    split: null,
    cls,
    left: null,
    right: null,
  };
  if (depth >= maxDepth || pts.length <= 1 || pure) return node;

  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const axis: "X" | "Y" = w >= h ? "X" : "Y";

  // Median-ish split: midpoint of the sorted coordinates of contained points.
  const coords = pts
    .map((p) => (axis === "X" ? p.x : p.y))
    .sort((a, b) => a - b);
  const mid = Math.floor(coords.length / 2);
  let at =
    coords.length % 2 === 0
      ? (coords[mid - 1] + coords[mid]) / 2
      : coords[mid];
  // Robustness: keep the split strictly inside the rectangle.
  const lo = axis === "X" ? rect.x0 : rect.y0;
  const hi = axis === "X" ? rect.x1 : rect.y1;
  if (!(at > lo && at < hi)) at = (lo + hi) / 2;

  const lRect: Rect =
    axis === "X"
      ? { ...rect, x1: at }
      : { ...rect, y1: at };
  const rRect: Rect =
    axis === "X"
      ? { ...rect, x0: at }
      : { ...rect, y0: at };
  const lPts = pts.filter((p) => (axis === "X" ? p.x : p.y) < at);
  const rPts = pts.filter((p) => (axis === "X" ? p.x : p.y) >= at);

  node.split = { axis, at };
  node.left = build(lRect, lPts, depth + 1, maxDepth);
  node.right = build(rRect, rPts, depth + 1, maxDepth);
  return node;
}

// Collect all leaf regions for drawing the carved feature space.
function leaves(n: Node, out: Node[]): void {
  if (!n.split) {
    out.push(n);
    return;
  }
  leaves(n.left!, out);
  leaves(n.right!, out);
}

// Trace the root->leaf path a query point falls through.
function pathFor(n: Node, q: { x: number; y: number }): Node[] {
  const path = [n];
  let cur = n;
  while (cur.split) {
    const v = cur.split.axis === "X" ? q.x : q.y;
    cur = v < cur.split.at ? cur.left! : cur.right!;
    path.push(cur);
  }
  return path;
}

export function DecisionTreeExplainer() {
  const [depth, setDepth] = useState<number>(2);
  const [query, setQuery] = useState<{ x: number; y: number } | null>(null);

  const root = build(DOMAIN, POINTS, 0, depth);
  const regions: Node[] = [];
  leaves(root, regions);
  const path = query ? pathFor(root, query) : [];
  const pathSet = new Set(path);
  const pred = path.length ? path[path.length - 1].cls : null;

  // --- Right view: feature space, square region ---
  const rX0 = 240;
  const rY0 = 20;
  const rSize = 180;
  const fx = (x: number) => rX0 + (x / 10) * rSize;
  const fy = (y: number) => rY0 + (1 - y / 10) * rSize; // y up

  const onPick = (e: React.MouseEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const cx = ((e.clientX - r.left) / r.width) * 440;
    const cy = ((e.clientY - r.top) / r.height) * 250;
    const dx = ((cx - rX0) / rSize) * 10;
    const dy = (1 - (cy - rY0) / rSize) * 10;
    setQuery({
      x: Math.max(0, Math.min(10, dx)),
      y: Math.max(0, Math.min(10, dy)),
    });
  };

  // --- Left view: the tree, laid out by depth (cap rendering at depth 4) ---
  const tX0 = 12;
  const tW = 200;
  const RENDER_CAP = 4;
  const shownDepth = Math.min(depth, RENDER_CAP);
  const truncated = depth > RENDER_CAP;
  const rowGap = 40;
  const tNode = (d: number, idx: number, count: number) => {
    const x = tX0 + ((idx + 0.5) / count) * tW;
    const y = 24 + d * rowGap;
    return { x, y };
  };

  // Walk the tree, emitting drawables for the left view.
  type TLine = { x1: number; y1: number; x2: number; y2: number; on: boolean };
  type TDot = {
    x: number;
    y: number;
    label: string;
    leaf: boolean;
    cls: 0 | 1;
    on: boolean;
  };
  const tLines: TLine[] = [];
  const tDots: TDot[] = [];
  const walk = (n: Node, idx: number, count: number) => {
    const here = tNode(n.depth, idx, count);
    const on = pathSet.has(n);
    const stop = n.depth >= shownDepth || !n.split;
    tDots.push({
      x: here.x,
      y: here.y,
      label: n.split
        ? `${n.split.axis}<${n.split.at.toFixed(1)}`
        : n.cls === 1
          ? "blue"
          : "coral",
      leaf: !n.split || stop,
      cls: n.cls,
      on,
    });
    if (n.split && n.depth < shownDepth) {
      const childCount = count * 2;
      const lc = tNode(n.depth + 1, idx * 2, childCount);
      const rc = tNode(n.depth + 1, idx * 2 + 1, childCount);
      tLines.push({
        x1: here.x,
        y1: here.y,
        x2: lc.x,
        y2: lc.y,
        on: on && pathSet.has(n.left!),
      });
      tLines.push({
        x1: here.x,
        y1: here.y,
        x2: rc.x,
        y2: rc.y,
        on: on && pathSet.has(n.right!),
      });
      walk(n.left!, idx * 2, childCount);
      walk(n.right!, idx * 2 + 1, childCount);
    }
  };
  walk(root, 0, 1);

  const fillFor = (c: 0 | 1) => (c === 1 ? C.blueFill : C.coralFill);
  const inkFor = (c: 0 | 1) => (c === 1 ? C.blue : C.coral);

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Decision tree explainer"
      >
        {/* section titles */}
        <text x={tX0} y={14} fontSize={9} fill={C.muted} fontFamily={MONO}>
          tree
        </text>
        <text x={rX0} y={14} fontSize={9} fill={C.muted} fontFamily={MONO}>
          feature space
        </text>

        {/* LEFT: tree branches */}
        {tLines.map((l, i) => (
          <line
            key={`tl-${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={l.on ? C.ink : C.line}
            strokeWidth={l.on ? 1.8 : 1}
          />
        ))}
        {/* LEFT: tree nodes */}
        {tDots.map((d, i) => (
          <g key={`td-${i}`}>
            <rect
              x={d.x - 21}
              y={d.y - 8}
              width={42}
              height={16}
              rx={3}
              fill={d.leaf ? fillFor(d.cls) : "var(--card)"}
              stroke={d.on ? C.ink : C.line}
              strokeWidth={d.on ? 1.6 : 1}
            />
            <text
              x={d.x}
              y={d.y + 3}
              fontSize={7.5}
              fill={d.leaf ? inkFor(d.cls) : C.ink}
              fontFamily={MONO}
              textAnchor="middle"
            >
              {d.label}
            </text>
          </g>
        ))}
        {truncated && (
          <text
            x={tX0 + tW / 2}
            y={24 + (shownDepth + 1) * rowGap - 10}
            fontSize={8}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            + more (depth {depth})
          </text>
        )}

        {/* RIGHT: carved regions */}
        {regions.map((rg, i) => {
          const onPath = pathSet.has(rg);
          return (
            <rect
              key={`rg-${i}`}
              x={fx(rg.rect.x0)}
              y={fy(rg.rect.y1)}
              width={fx(rg.rect.x1) - fx(rg.rect.x0)}
              height={fy(rg.rect.y0) - fy(rg.rect.y1)}
              fill={rg.pts.length ? fillFor(rg.cls) : "var(--card)"}
              fillOpacity={onPath ? 1 : 0.7}
              stroke={C.line}
              strokeWidth={onPath ? 1.6 : 0.6}
            />
          );
        })}
        {/* RIGHT: outer frame */}
        <rect
          x={rX0}
          y={rY0}
          width={rSize}
          height={rSize}
          fill="none"
          stroke={C.ink}
          strokeWidth={1}
        />
        {/* RIGHT: scatter */}
        {POINTS.map((p, i) => (
          <circle
            key={`p-${i}`}
            cx={fx(p.x)}
            cy={fy(p.y)}
            r={2.8}
            fill={p.c === 1 ? C.blue : C.coral}
          />
        ))}
        {/* RIGHT: query point */}
        {query && (
          <g>
            <circle
              cx={fx(query.x)}
              cy={fy(query.y)}
              r={5}
              fill="var(--background)"
              stroke={pred === 1 ? C.blue : C.coral}
              strokeWidth={2}
            />
            <text
              x={rX0 + rSize}
              y={rY0 + rSize + 14}
              fontSize={9}
              fill={pred === 1 ? C.blue : C.coral}
              fontFamily={MONO}
              textAnchor="end"
            >
              predict: {pred === 1 ? "blue" : "coral"}
            </text>
          </g>
        )}
        {/* RIGHT: clickable overlay (drop a query point) */}
        <rect
          x={rX0}
          y={rY0}
          width={rSize}
          height={rSize}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onClick={onPick}
        />
        {/* axis hints */}
        <text x={rX0} y={rY0 + rSize + 12} fontSize={8} fill={C.muted} fontFamily={MONO}>
          X →
        </text>
        <text
          x={rX0 - 4}
          y={rY0 + 4}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          ↑Y
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">tree depth</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-32 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-8">{depth}</span>
        </label>
        <button
          type="button"
          onClick={() => setQuery(null)}
          className="font-mono text-[var(--muted)] underline-offset-2 hover:underline"
        >
          clear query
        </button>
        <span className="text-[var(--muted)]">
          click the feature space to drop a query point
        </span>
      </div>
    </div>
  );
}
