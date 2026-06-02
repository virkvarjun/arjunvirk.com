"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..30) | 2x2 selectable panels (44..292) |
//   explanation band (304..356) | caption (366..394)
const VW = 520;
const VH = 404;

// 2x2 grid geometry.
const GAP = 14;
const GRID_X = 16;
const GRID_Y = 44;
const COL_W = (VW - 2 * GRID_X - GAP) / 2; // panel width
const ROW_H = 116; // panel height
const HDR_H = 20; // panel header strip

type LimitId = "spatial" | "aspect" | "coarse" | "loss";

type Limit = {
  id: LimitId;
  col: number; // 0 | 1
  row: number; // 0 | 1
  title: string;
  // explanation band lines (each must fit within VW - 24px)
  problem: string;
  fix: string;
};

const LIMITS: Limit[] = [
  {
    id: "spatial",
    col: 0,
    row: 0,
    title: "1. Spatial constraint",
    problem: "Each grid cell predicts one class, so two object centers in a cell collapse to one.",
    fix: "v2+: anchor boxes let a cell emit several boxes with separate classes.",
  },
  {
    id: "aspect",
    col: 1,
    row: 0,
    title: "2. Unusual aspect ratios",
    problem: "Boxes regressed from scratch fit odd shapes poorly (thin, tilted, elongated).",
    fix: "v2+: anchor priors give common width/height ratios to refine from.",
  },
  {
    id: "coarse",
    col: 0,
    row: 1,
    title: "3. Coarse features",
    problem: "A tiny object lands in one large cell with too little detail to localize.",
    fix: "v2+: higher grid S and finer feature maps resolve small objects.",
  },
  {
    id: "loss",
    col: 1,
    row: 1,
    title: "4. Loss vs goal",
    problem: "Sum-squared error treats every box term equally, a proxy for true mAP.",
    fix: "v2+: reweighted, IoU-aware losses align better with the metric.",
  },
];

// Position helpers for a panel given its column/row.
function panelX(col: number): number {
  return GRID_X + col * (COL_W + GAP);
}
function panelY(row: number): number {
  return GRID_Y + row * (ROW_H + GAP);
}

export function VisYoloLimitations() {
  const [active, setActive] = useState<LimitId>("spatial");

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const current = LIMITS.find((l): boolean => l.id === active) ?? LIMITS[0];

  // --- Mini illustration for one panel, drawn inside its body box. ---
  // bx/by = body top-left; bw/bh = body width/height.
  const renderIllo = (
    id: LimitId,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    on: boolean,
  ) => {
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const stroke = on ? C.coral : C.line;
    const ink = on ? C.ink : C.muted;

    if (id === "spatial") {
      // One highlighted cell within a small grid, holding two centers.
      const gx = cx - 36;
      const gy = cy - 27;
      const cell = 24;
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <line
              key={`v${i}`}
              x1={gx + i * cell}
              y1={gy}
              x2={gx + i * cell}
              y2={gy + 2 * cell}
              stroke={C.line}
              strokeWidth={1}
            />
          ))}
          <line x1={gx + 3 * cell} y1={gy} x2={gx + 3 * cell} y2={gy + 2 * cell} stroke={C.line} strokeWidth={1} />
          {[0, 1, 2].map((i) => (
            <line
              key={`h${i}`}
              x1={gx}
              y1={gy + i * cell}
              x2={gx + 3 * cell}
              y2={gy + i * cell}
              stroke={C.line}
              strokeWidth={1}
            />
          ))}
          {/* highlighted cell (top-middle) */}
          <rect x={gx + cell} y={gy} width={cell} height={cell} fill={on ? C.coralFill : "var(--background)"} stroke={stroke} strokeWidth={1.4} />
          {/* two centers in that cell */}
          <circle cx={gx + cell + 8} cy={gy + 9} r={3} fill={C.blue} />
          <circle cx={gx + cell + 16} cy={gy + 15} r={3} fill={C.green} />
          <text x={gx + 3 * cell + 6} y={gy + 11} fontFamily={MONO} fontSize={9} fill={ink}>
            person
          </text>
          <text x={gx + 3 * cell + 6} y={gy + 24} fontFamily={MONO} fontSize={9} fill={ink}>
            bird
          </text>
          <text x={cx} y={by + bh - 6} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={ink}>
            1 cell - 1 class
          </text>
        </g>
      );
    }

    if (id === "aspect") {
      // A tilted thin object with a poorly-fitting axis-aligned box.
      const ox = cx - 4;
      const oy = cy - 4;
      return (
        <g>
          {/* loose predicted box */}
          <rect x={cx - 34} y={cy - 26} width={68} height={44} fill="none" stroke={stroke} strokeWidth={1.4} strokeDasharray="4 3" />
          {/* tilted elongated object */}
          <rect
            x={ox - 26}
            y={oy - 4}
            width={52}
            height={8}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1.4}
            transform={`rotate(-32 ${ox} ${oy})`}
          />
          <text x={cx} y={by + bh - 6} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={ink}>
            box fits poorly
          </text>
        </g>
      );
    }

    if (id === "coarse") {
      // One big 64x64 cell with a tiny object inside.
      const s = 52;
      const gx = cx - s / 2;
      const gy = cy - s / 2 - 4;
      return (
        <g>
          <rect x={gx} y={gy} width={s} height={s} fill={on ? C.coralFill : "var(--background)"} stroke={stroke} strokeWidth={1.4} />
          <text x={gx + s / 2} y={gy - 5} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={ink}>
            64x64 / cell
          </text>
          {/* tiny object */}
          <circle cx={gx + s * 0.66} cy={gy + s * 0.62} r={3.5} fill={C.blue} />
          <text x={gx + s / 2} y={gy + s + 13} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={ink}>
            tiny - too coarse
          </text>
        </g>
      );
    }

    // id === "loss": a balance scale, SSE vs mAP, tilted (not matching).
    const beamCx = cx;
    const beamCy = cy - 10;
    const tilt = 6; // pixels of imbalance
    return (
      <g>
        {/* pivot post */}
        <line x1={beamCx} y1={beamCy} x2={beamCx} y2={beamCy + 30} stroke={ink} strokeWidth={1.4} />
        <rect x={beamCx - 12} y={beamCy + 30} width={24} height={4} fill={ink} />
        {/* beam (slightly tilted) */}
        <line x1={beamCx - 38} y1={beamCy - tilt} x2={beamCx + 38} y2={beamCy + tilt} stroke={stroke} strokeWidth={1.6} />
        {/* left pan: SSE (heavier / lower) */}
        <line x1={beamCx - 38} y1={beamCy - tilt} x2={beamCx - 38} y2={beamCy - tilt + 12} stroke={C.line} strokeWidth={1} />
        <rect x={beamCx - 54} y={beamCy - tilt + 12} width={32} height={12} rx={2} fill={C.blueFill} stroke={C.blue} strokeWidth={1.2} />
        <text x={beamCx - 38} y={beamCy - tilt + 21} textAnchor="middle" fontFamily={MONO} fontSize={8} fill={C.ink}>
          SSE
        </text>
        {/* right pan: mAP (higher) */}
        <line x1={beamCx + 38} y1={beamCy + tilt} x2={beamCx + 38} y2={beamCy + tilt + 12} stroke={C.line} strokeWidth={1} />
        <rect x={beamCx + 22} y={beamCy + tilt + 12} width={32} height={12} rx={2} fill={C.greenFill} stroke={C.green} strokeWidth={1.2} />
        <text x={beamCx + 38} y={beamCy + tilt + 21} textAnchor="middle" fontFamily={MONO} fontSize={8} fill={C.ink}>
          mAP
        </text>
        <text x={cx} y={by + bh - 6} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={ink}>
          proxy != metric
        </text>
      </g>
    );
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="YOLO's four limitations shown as four selectable panels: spatial constraint of one class per cell, poor fit for unusual aspect ratios, coarse features that miss tiny objects, and a sum-squared-error loss that only proxies mean average precision. Selecting a panel reveals the problem and how YOLO v2 and later addressed it."
      >
        {/* Title band */}
        <text x={VW / 2} y={22} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={C.ink}>
          YOLO&apos;s Four Limitations
        </text>

        {/* ---- 2x2 selectable panels ---- */}
        {LIMITS.map((l) => {
          const x = panelX(l.col);
          const y = panelY(l.row);
          const on = active === l.id;
          const bodyY = y + HDR_H;
          const bodyH = ROW_H - HDR_H;
          return (
            <g key={l.id} onClick={() => setActive(l.id)} style={{ cursor: "pointer" }}>
              {/* outer frame */}
              <rect
                x={x}
                y={y}
                width={COL_W}
                height={ROW_H}
                rx={5}
                fill={on ? C.coralFill : "var(--card)"}
                stroke={on ? C.coral : C.line}
                strokeWidth={on ? 1.8 : 1}
              />
              {/* header strip */}
              <line x1={x} y1={y + HDR_H} x2={x + COL_W} y2={y + HDR_H} stroke={on ? C.coral : C.line} strokeWidth={1} />
              <text x={x + 8} y={y + 14} fontFamily={MONO} fontSize={10.5} fill={C.ink}>
                {l.title}
              </text>
              {/* illustration in the body */}
              {renderIllo(l.id, x, bodyY, COL_W, bodyH, on)}
            </g>
          );
        })}

        {/* ---- Explanation band ---- */}
        <rect
          x={GRID_X}
          y={304}
          width={VW - 2 * GRID_X}
          height={54}
          rx={5}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.2}
        />
        <text x={GRID_X + 10} y={320} fontFamily={MONO} fontSize={10} fill={C.ink}>
          {current.title}
        </text>
        <text x={GRID_X + 10} y={335} fontFamily={MONO} fontSize={9} fill={C.muted}>
          {current.problem}
        </text>
        <text x={GRID_X + 10} y={350} fontFamily={MONO} fontSize={9} fill={C.green}>
          {current.fix}
        </text>

        {/* ---- Caption ---- */}
        <text x={VW / 2} y={376} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={C.muted}>
          Two boxes and one class per cell, coarse features, and a proxy loss -
        </text>
        <text x={VW / 2} y={390} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={C.muted}>
          the exact things v2+ set out to fix.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {LIMITS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={btn}
            style={active === l.id ? { background: C.ink, color: "var(--background)" } : undefined}
            onClick={() => setActive(l.id)}
          >
            {l.title}
          </button>
        ))}
      </div>
    </div>
  );
}
