"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// --- Geometry (viewBox 600 x 540) ---
const W = 600;
const H = 540;

// Three tiers, drawn top (deep/objects) to bottom (early/edges) in screen
// space, but the network is read bottom-up: edges -> textures/parts -> objects.
// Tier index: 0 = early (bottom), 1 = middle, 2 = late (top).
type TierIdx = 0 | 1 | 2;

type Unit = {
  id: string;
  label: string; // short caption shown under the thumbnail
  feeds: string[]; // ids in the tier BELOW that compose into this unit
};

type Tier = {
  name: string;
  blurb: string; // what this depth represents
  units: Unit[];
};

// Hard-coded feature data (deterministic; ids referenced across tiers).
const TIERS: Tier[] = [
  // Early layers (bottom row).
  {
    name: "Early layers",
    blurb: "oriented edges, color blobs, simple Gabor-like textures",
    units: [
      { id: "e0", label: "| edge", feeds: [] },
      { id: "e1", label: "/ edge", feeds: [] },
      { id: "e2", label: "- edge", feeds: [] },
      { id: "e3", label: "color", feeds: [] },
      { id: "e4", label: "spot", feeds: [] },
    ],
  },
  // Middle layers (center row): corners, stripes, eye-like, wheel-like parts.
  {
    name: "Middle layers",
    blurb: "corners, stripes, curves — eye-like and wheel-like parts",
    units: [
      { id: "m0", label: "corner", feeds: ["e0", "e2"] },
      { id: "m1", label: "stripes", feeds: ["e1", "e2"] },
      { id: "m2", label: "eye", feeds: ["e3", "e4", "e0"] },
      { id: "m3", label: "wheel", feeds: ["e1", "e4", "e2"] },
    ],
  },
  // Late layers (top row): whole objects.
  {
    name: "Late layers",
    blurb: "whole objects assembled from parts",
    units: [
      { id: "l0", label: "dog face", feeds: ["m2", "m0"] },
      { id: "l1", label: "car", feeds: ["m3", "m1"] },
      { id: "l2", label: "building", feeds: ["m1", "m0"] },
    ],
  },
];

// Layout bands (screen y: smaller = higher = deeper layer).
const TITLE_Y = 22;
const SUBTITLE_Y = 40;

// Tier row geometry. rowY[screenRow] gives the top y of each thumbnail row.
// screenRow 0 = Late (top), 1 = Middle, 2 = Early (bottom).
const ROW_TOP = [66, 196, 326];
const CELL_W = 76;
const CELL_H = 76;
const CELL_GAP = 26;

// Map a tier index (0 early..2 late) to a screen row (0 top..2 bottom).
function screenRow(tier: TierIdx): number {
  return 2 - tier;
}

// Center x of unit i within a row of n units, centered in the viewBox.
function unitCenterX(i: number, n: number): number {
  const total = n * CELL_W + (n - 1) * CELL_GAP;
  const x0 = (W - total) / 2;
  return x0 + i * (CELL_W + CELL_GAP) + CELL_W / 2;
}

// Resolve a unit id to its {tier, indexInTier}.
function locate(id: string): { tier: TierIdx; i: number } | null {
  for (let t = 0; t < TIERS.length; t++) {
    const i = TIERS[t].units.findIndex((u: Unit) => u.id === id);
    if (i >= 0) return { tier: t as TierIdx, i };
  }
  return null;
}

// Center point of a unit by id.
function unitCenter(id: string): { x: number; y: number } | null {
  const loc = locate(id);
  if (!loc) return null;
  const n = TIERS[loc.tier].units.length;
  const x = unitCenterX(loc.i, n);
  const top = ROW_TOP[screenRow(loc.tier)];
  return { x, y: top + CELL_H / 2 };
}

// ---- Tiny deterministic thumbnail glyphs (pure SVG, per unit id) ----
function Thumb({ id, x, y, on }: { id: string; x: number; y: number; on: boolean }) {
  // x,y = top-left of an inner 56x44 glyph area.
  const s = on ? C.coral : C.ink;
  const w = on ? 2 : 1.4;
  const cx = x + 28;
  const cy = y + 22;
  switch (id) {
    case "e0": // vertical edge
      return <line x1={cx} y1={y + 2} x2={cx} y2={y + 42} stroke={s} strokeWidth={w} />;
    case "e1": // diagonal edge
      return <line x1={x + 4} y1={y + 42} x2={x + 52} y2={y + 2} stroke={s} strokeWidth={w} />;
    case "e2": // horizontal edge
      return <line x1={x + 2} y1={cy} x2={x + 54} y2={cy} stroke={s} strokeWidth={w} />;
    case "e3": // color blob
      return <rect x={x + 12} y={y + 6} width={32} height={32} rx={6} fill={on ? C.coralFill : C.grid} stroke={s} strokeWidth={w} />;
    case "e4": // spot
      return <circle cx={cx} cy={cy} r={10} fill={on ? C.coralFill : C.grid} stroke={s} strokeWidth={w} />;
    case "m0": // corner
      return (
        <path d={`M ${x + 6} ${y + 6} L ${x + 6} ${y + 38} L ${x + 50} ${y + 38}`} fill="none" stroke={s} strokeWidth={w} />
      );
    case "m1": // stripes
      return (
        <g stroke={s} strokeWidth={w}>
          <line x1={x + 8} y1={y + 6} x2={x + 8} y2={y + 38} />
          <line x1={x + 20} y1={y + 6} x2={x + 20} y2={y + 38} />
          <line x1={x + 32} y1={y + 6} x2={x + 32} y2={y + 38} />
          <line x1={x + 44} y1={y + 6} x2={x + 44} y2={y + 38} />
        </g>
      );
    case "m2": // eye-like
      return (
        <g fill="none" stroke={s} strokeWidth={w}>
          <ellipse cx={cx} cy={cy} rx={20} ry={11} />
          <circle cx={cx} cy={cy} r={5} fill={on ? C.coral : C.ink} stroke="none" />
        </g>
      );
    case "m3": // wheel-like
      return (
        <g fill="none" stroke={s} strokeWidth={w}>
          <circle cx={cx} cy={cy} r={16} />
          <circle cx={cx} cy={cy} r={5} />
          <line x1={cx} y1={cy - 16} x2={cx} y2={cy + 16} />
          <line x1={cx - 16} y1={cy} x2={cx + 16} y2={cy} />
        </g>
      );
    case "l0": // dog face
      return (
        <g fill="none" stroke={s} strokeWidth={w}>
          <circle cx={cx} cy={cy + 2} r={15} />
          <path d={`M ${cx - 14} ${cy - 12} L ${cx - 18} ${cy - 22} L ${cx - 8} ${cy - 14} Z`} fill={on ? C.coralFill : C.grid} />
          <path d={`M ${cx + 14} ${cy - 12} L ${cx + 18} ${cy - 22} L ${cx + 8} ${cy - 14} Z`} fill={on ? C.coralFill : C.grid} />
          <circle cx={cx - 5} cy={cy} r={2} fill={s} stroke="none" />
          <circle cx={cx + 5} cy={cy} r={2} fill={s} stroke="none" />
          <circle cx={cx} cy={cy + 7} r={2.5} fill={s} stroke="none" />
        </g>
      );
    case "l1": // car
      return (
        <g fill="none" stroke={s} strokeWidth={w}>
          <path d={`M ${x + 4} ${cy + 6} L ${x + 4} ${cy - 2} L ${x + 16} ${cy - 2} L ${x + 22} ${cy - 12} L ${x + 40} ${cy - 12} L ${x + 50} ${cy + 6} Z`} fill={on ? C.coralFill : C.grid} />
          <circle cx={x + 16} cy={cy + 8} r={6} />
          <circle cx={x + 42} cy={cy + 8} r={6} />
        </g>
      );
    case "l2": // building
      return (
        <g fill="none" stroke={s} strokeWidth={w}>
          <rect x={x + 14} y={y + 4} width={28} height={38} fill={on ? C.coralFill : C.grid} />
          <line x1={x + 22} y1={y + 12} x2={x + 22} y2={y + 12} />
          <rect x={x + 19} y={y + 10} width={6} height={6} />
          <rect x={x + 31} y={y + 10} width={6} height={6} />
          <rect x={x + 19} y={y + 22} width={6} height={6} />
          <rect x={x + 31} y={y + 22} width={6} height={6} />
        </g>
      );
    default:
      return null;
  }
}

export function VisFeatureHierarchy() {
  // Selected high-level / any unit whose feeder chain is traced. Default: dog.
  const [selected, setSelected] = useState<string>("l0");
  // Depth focus: 0 early, 1 middle, 2 late. Dims tiers other than the focus.
  const [depth, setDepth] = useState<TierIdx>(2);

  // Compute the full set of ancestor ids feeding `selected` (transitively),
  // plus the directed edges in that subtree.
  const traceIds = new Set<string>();
  const traceEdges: { from: string; to: string }[] = [];
  const visit = (id: string): void => {
    if (traceIds.has(id)) return;
    traceIds.add(id);
    const loc = locate(id);
    if (!loc) return;
    const unit = TIERS[loc.tier].units[loc.i];
    for (const f of unit.feeds) {
      traceEdges.push({ from: f, to: id });
      visit(f);
    }
  };
  visit(selected);

  const selLoc = locate(selected);
  const selName = selLoc ? TIERS[selLoc.tier].units[selLoc.i].label : "";

  // Readout band geometry.
  const READOUT_Y = 432;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="The emergent feature hierarchy of a convolutional network: early layers detect edges, color blobs and simple textures; middle layers compose those into corners, stripes and parts such as eyes and wheels; late layers assemble parts into whole objects like dog faces, cars and buildings. Selecting an object traces the parts and edges that feed it."
      >
        {/* Title band */}
        <text x={W / 2} y={TITLE_Y} fontFamily={MONO} fontSize={14} fill={C.ink} fontWeight={600} textAnchor="middle">
          The Emergent Feature Hierarchy
        </text>
        <text x={W / 2} y={SUBTITLE_Y} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="middle">
          features compose up the stack as a CNN gets deeper
        </text>

        {/* ----- Feeder edges (drawn first, under the cells) ----- */}
        {traceEdges.map((e: { from: string; to: string }, k: number) => {
          const a = unitCenter(e.from);
          const b = unitCenter(e.to);
          if (!a || !b) return null;
          // a (lower tier) sits BELOW b on screen; draw from top of a to bottom of b.
          const ax = a.x;
          const ay = a.y - CELL_H / 2 - 2; // top of the feeder cell
          const bx = b.x;
          const by = b.y + CELL_H / 2 + 2; // bottom of the receiving cell
          const midY = (ay + by) / 2;
          const d = `M ${ax} ${ay} C ${ax} ${midY}, ${bx} ${midY}, ${bx} ${by}`;
          return <path key={`te${k}`} d={d} fill="none" stroke={C.coral} strokeWidth={1.8} opacity={0.9} />;
        })}

        {/* ----- Tiers & thumbnail cells ----- */}
        {TIERS.map((tier: Tier, t: number) => {
          const tier_i = t as TierIdx;
          const row = screenRow(tier_i);
          const top = ROW_TOP[row];
          const n = tier.units.length;
          const dim = depth !== tier_i ? 0.5 : 1;
          // Tier label sits to the LEFT of the row, vertically centered.
          return (
            <g key={`tier${t}`}>
              {/* Tier name label (left gutter, stacked 2 lines) */}
              <text
                x={14}
                y={top + CELL_H / 2 - 4}
                fontFamily={MONO}
                fontSize={10}
                fill={depth === tier_i ? C.ink : C.muted}
                fontWeight={600}
                textAnchor="start"
                opacity={dim}
              >
                {tier.name.split(" ")[0]}
              </text>
              <text
                x={14}
                y={top + CELL_H / 2 + 10}
                fontFamily={MONO}
                fontSize={10}
                fill={depth === tier_i ? C.ink : C.muted}
                fontWeight={600}
                textAnchor="start"
                opacity={dim}
              >
                layers
              </text>

              {tier.units.map((u: Unit, i: number) => {
                const cx = unitCenterX(i, n);
                const x0 = cx - CELL_W / 2;
                const on = traceIds.has(u.id);
                const isSel = u.id === selected;
                return (
                  <g key={u.id} opacity={dim} style={{ cursor: "pointer" }} onClick={() => setSelected(u.id)}>
                    <rect
                      x={x0}
                      y={top}
                      width={CELL_W}
                      height={CELL_H}
                      rx={6}
                      fill={on ? C.coralFill : "var(--card)"}
                      stroke={isSel ? C.coral : on ? C.coral : C.line}
                      strokeWidth={isSel ? 2.4 : on ? 1.8 : 1.2}
                    />
                    {/* Glyph area: 56 wide centered, starting 12px below top */}
                    <Thumb id={u.id} x={x0 + 10} y={top + 8} on={on} />
                    {/* Label inside the cell, bottom strip (fits: <= 8 chars @ 9px) */}
                    <text
                      x={cx}
                      y={top + CELL_H - 8}
                      fontFamily={MONO}
                      fontSize={9}
                      fill={on ? C.coral : C.ink}
                      textAnchor="middle"
                      fontWeight={isSel ? 600 : 400}
                    >
                      {u.label}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Upward "compose" arrow on the right gutter */}
        <g>
          <line x1={W - 22} y1={ROW_TOP[2] + CELL_H} x2={W - 22} y2={ROW_TOP[0] + 6} stroke={C.muted} strokeWidth={1.4} />
          <polygon
            points={`${W - 22},${ROW_TOP[0] - 2} ${W - 26},${ROW_TOP[0] + 8} ${W - 18},${ROW_TOP[0] + 8}`}
            fill={C.muted}
          />
          <text
            x={W - 12}
            y={(ROW_TOP[0] + ROW_TOP[2] + CELL_H) / 2}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
            transform={`rotate(-90 ${W - 12} ${(ROW_TOP[0] + ROW_TOP[2] + CELL_H) / 2})`}
          >
            compose
          </text>
        </g>

        {/* ----- Readout band (own clear horizontal band) ----- */}
        <line x1={14} y1={READOUT_Y - 16} x2={W - 14} y2={READOUT_Y - 16} stroke={C.line} strokeWidth={1} />
        <text x={14} y={READOUT_Y} fontFamily={MONO} fontSize={10} fill={C.coral} fontWeight={600} textAnchor="start">
          {`selected: "${selName}"`}
        </text>
        <text x={14} y={READOUT_Y + 18} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="start">
          {`traces back through ${traceIds.size - 1} feeding features`}
        </text>
        <text x={14} y={READOUT_Y + 36} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="start">
          {`depth focus: ${TIERS[depth].name} — ${TIERS[depth].blurb.slice(0, 44)}`}
        </text>

        {/* ----- Caption band (very bottom, split to fit W-24) ----- */}
        <text x={W / 2} y={H - 26} fontFamily={MONO} fontSize={9.5} fill={C.ink} textAnchor="middle">
          Edges -&gt; textures -&gt; parts -&gt; objects.
        </text>
        <text x={W / 2} y={H - 12} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="middle">
          The hierarchy is never programmed; it emerges from training.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">object:</span>
        {TIERS[2].units.map((u: Unit) => (
          <button
            key={`sel-${u.id}`}
            type="button"
            onClick={() => {
              setSelected(u.id);
              setDepth(2);
            }}
            aria-pressed={selected === u.id}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={selected === u.id ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {u.label}
          </button>
        ))}

        <span className="ml-2 font-mono text-[var(--muted)]">depth:</span>
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value) as TierIdx)}
          className="w-28 accent-[var(--foreground)]"
        />
        <span className="font-mono tabular-nums">{depth}</span>
        <span className="font-mono text-[var(--muted)]">{TIERS[depth].name}</span>
      </div>
    </div>
  );
}
