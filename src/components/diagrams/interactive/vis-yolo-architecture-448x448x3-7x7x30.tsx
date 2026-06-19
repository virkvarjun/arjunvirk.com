"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// YOLO (You Only Look Once) detection backbone.
// A 448x448x3 image is squeezed by 24 conv layers (+ 2 fully-connected layers)
// into a 7x7x30 prediction grid: each of the 49 cells emits 30 numbers =
// B*5 + C = 2 boxes * (x,y,w,h,conf) + 20 class scores. As we move right the
// spatial size shrinks (448 -> 7) while channel depth grows (3 -> 1024).

// --- the stage table (spatial side, channels, layer note) ---
type Stage = {
  readonly id: number;
  readonly w: number; // spatial side (px)
  readonly h: number; // channels
  readonly label: string; // shape readout, e.g. "448x448x3"
  readonly note: string; // layer config line 1
  readonly note2: string; // layer config line 2
  readonly kind: "input" | "conv" | "fc" | "out";
};

const STAGES: readonly Stage[] = [
  {
    id: 0,
    w: 448,
    h: 3,
    label: "448x448x3",
    note: "input RGB image",
    note2: "no conv yet",
    kind: "input",
  },
  {
    id: 1,
    w: 112,
    h: 192,
    label: "112x112x192",
    note: "7x7/2 conv, maxpool",
    note2: "then 3x3 conv block",
    kind: "conv",
  },
  {
    id: 2,
    w: 56,
    h: 256,
    label: "56x56x256",
    note: "1x1 + 3x3 convs",
    note2: "maxpool /2",
    kind: "conv",
  },
  {
    id: 3,
    w: 28,
    h: 512,
    label: "28x28x512",
    note: "4x (1x1 then 3x3)",
    note2: "maxpool /2",
    kind: "conv",
  },
  {
    id: 4,
    w: 14,
    h: 1024,
    label: "14x14x1024",
    note: "2x (1x1 then 3x3)",
    note2: "maxpool /2",
    kind: "conv",
  },
  {
    id: 5,
    w: 7,
    h: 1024,
    label: "7x7x1024",
    note: "4x 3x3 convs",
    note2: "stride-2 downsample",
    kind: "conv",
  },
  {
    id: 6,
    w: 7,
    h: 1024,
    label: "4096 (FC)",
    note: "flatten -> FC 4096",
    note2: "dropout, leaky relu",
    kind: "fc",
  },
  {
    id: 7,
    w: 7,
    h: 30,
    label: "7x7x30",
    note: "FC -> reshape",
    note2: "the prediction grid",
    kind: "out",
  },
];

// The 30-vector breakdown for ONE chosen cell. Hard-coded per-cell so the
// readout is deterministic. 5 cells provide distinct example numbers.
type CellVec = {
  readonly box1: readonly [number, number, number, number, number];
  readonly box2: readonly [number, number, number, number, number];
  readonly topClass: string;
  readonly topProb: number;
};

const CELLS: readonly CellVec[] = [
  {
    box1: [0.51, 0.62, 0.34, 0.71, 0.92],
    box2: [0.48, 0.55, 0.18, 0.4, 0.31],
    topClass: "dog",
    topProb: 0.88,
  },
  {
    box1: [0.22, 0.4, 0.55, 0.6, 0.81],
    box2: [0.3, 0.45, 0.2, 0.25, 0.22],
    topClass: "car",
    topProb: 0.74,
  },
  {
    box1: [0.7, 0.3, 0.25, 0.5, 0.66],
    box2: [0.65, 0.35, 0.4, 0.3, 0.41],
    topClass: "person",
    topProb: 0.91,
  },
  {
    box1: [0.4, 0.8, 0.6, 0.3, 0.58],
    box2: [0.45, 0.7, 0.2, 0.6, 0.49],
    topClass: "bike",
    topProb: 0.63,
  },
  {
    box1: [0.15, 0.15, 0.7, 0.7, 0.85],
    box2: [0.2, 0.2, 0.3, 0.35, 0.37],
    topClass: "cat",
    topProb: 0.79,
  },
];

// 5 example class scores (of the 20) to draw as a mini bar group.
const CLASS_NAMES: readonly string[] = ["dog", "car", "person", "bike", "cat"];
const CELL_CLASS_SCORES: readonly (readonly number[])[] = [
  [0.88, 0.02, 0.05, 0.01, 0.04],
  [0.05, 0.74, 0.08, 0.1, 0.03],
  [0.03, 0.02, 0.91, 0.01, 0.03],
  [0.04, 0.18, 0.1, 0.63, 0.05],
  [0.06, 0.03, 0.07, 0.05, 0.79],
];

const W = 720;
const H = 492;

// pick a chosen cell index from a (col,row) in the 7x7 grid -> 0..4 example.
function cellExample(col: number, row: number): number {
  return (col * 3 + row * 2) % CELLS.length;
}

export function VisYoloArchitecture() {
  const [hover, setHover] = useState<number | null>(null);
  const [highlightAlt, setHighlightAlt] = useState<boolean>(false);
  // chosen output cell, expressed as col,row in the 7x7 grid.
  const [cell, setCell] = useState<readonly [number, number]>([3, 4]);

  const exIdx = cellExample(cell[0], cell[1]);
  const vec = CELLS[exIdx];
  const classScores = CELL_CLASS_SCORES[exIdx];

  // --- layout for the stage sequence ---
  const seqY = 133; // vertical center of the volume row
  const seqMaxH = 86; // tallest drawn volume height (px)
  const x0 = 18; // left margin for first volume
  const slot = (W - x0 - 18) / STAGES.length; // horizontal slot per stage
  const maxSide = 448;

  // drawn box height for a volume: scale spatial side -> 22..seqMaxH.
  const sideToH = (side: number): number =>
    22 + (seqMaxH - 22) * (side / maxSide);

  // active stage for the readout (hover wins, else output stage).
  const active = hover !== null ? STAGES[hover] : STAGES[STAGES.length - 1];

  // --- output cell-explosion layout ---
  const gridX = 36;
  const gridY = 296;
  const gridCell = 18;
  const gridSize = gridCell * 7; // 126

  // panel for the 30-vector breakdown (right of the grid).
  const panelX = gridX + gridSize + 30;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="YOLO architecture: 24 conv layers squeeze a 448x448x3 image into a 7x7x30 prediction grid; each cell holds two boxes and twenty class scores"
      >
        {/* Title band */}
        <text x={18} y={24} fontFamily={MONO} fontSize={13} fill={C.ink}>
          YOLO Architecture: 448x448x3 -&gt; 7x7x30
        </text>
        <text x={18} y={42} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          24 conv layers + 2 FC layers; spatial shrinks, channels grow
        </text>

        {/* Shape readout band (own band, below title) */}
        <rect
          x={18}
          y={52}
          width={W - 36}
          height={20}
          rx={3}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1}
        />
        <text
          x={26}
          y={66}
          fontFamily={MONO}
          fontSize={10}
          fill={C.blue}
        >
          stage {active.id}: {active.label}
        </text>
        <text
          x={W - 26}
          y={66}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="end"
        >
          {active.note}
        </text>

        {/* Stage sequence (the conv stack) */}
        {STAGES.map((st, i) => {
          const cx = x0 + i * slot + slot / 2;
          const bh = sideToH(st.w);
          const bw = Math.min(slot - 14, 30);
          const top = seqY - bh / 2;
          const isHover = hover === i;
          const fill =
            st.kind === "out"
              ? C.coralFill
              : st.kind === "fc"
                ? C.greenFill
                : st.kind === "input"
                  ? "var(--card)"
                  : C.blueFill;
          const stroke =
            st.kind === "out"
              ? C.coral
              : st.kind === "fc"
                ? C.green
                : st.kind === "input"
                  ? C.line
                  : C.blue;
          // alternation highlight: conv stages that use 1x1->3x3 blocks.
          const altStage =
            highlightAlt &&
            (st.note.indexOf("1x1") >= 0 || st.note2.indexOf("1x1") >= 0);
          return (
            <g
              key={st.id}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              {/* generous transparent hit area */}
              <rect
                x={cx - slot / 2}
                y={seqY - seqMaxH / 2 - 12}
                width={slot}
                height={seqMaxH + 24}
                fill="transparent"
              />
              <rect
                x={cx - bw / 2}
                y={top}
                width={bw}
                height={bh}
                rx={2}
                fill={fill}
                stroke={altStage ? C.violet : stroke}
                strokeWidth={isHover || altStage ? 2 : 1.2}
              />
              {/* depth (channels) tick on the right edge */}
              <text
                x={cx}
                y={top - 6}
                fontFamily={MONO}
                fontSize={8}
                fill={C.muted}
                textAnchor="middle"
              >
                {st.h}ch
              </text>
              {/* shape label below each volume (stacked, no touching) */}
              <text
                x={cx}
                y={seqY + seqMaxH / 2 + 16}
                fontFamily={MONO}
                fontSize={7.5}
                fill={isHover ? C.ink : C.muted}
                textAnchor="middle"
              >
                {st.w === 4096 ? "4096" : `${st.w}x${st.w}`}
              </text>
            </g>
          );
        })}

        {/* flow arrows between volumes */}
        {STAGES.slice(0, -1).map((st, i) => {
          const cxA = x0 + i * slot + slot / 2;
          const cxB = x0 + (i + 1) * slot + slot / 2;
          const bwA = Math.min(slot - 14, 30);
          return (
            <line
              key={`arr-${st.id}`}
              x1={cxA + bwA / 2 + 1}
              y1={seqY}
              x2={cxB - bwA / 2 - 1}
              y2={seqY}
              stroke={C.line}
              strokeWidth={1}
            />
          );
        })}

        {/* divider before the output detail */}
        <line
          x1={18}
          y1={266}
          x2={W - 18}
          y2={266}
          stroke={C.line}
          strokeWidth={1}
        />
        <text x={18} y={284} fontFamily={MONO} fontSize={11} fill={C.ink}>
          Output tensor 7x7x30, click a cell to read its 30 numbers
        </text>

        {/* 7x7 prediction grid (clickable) */}
        {Array.from({ length: 7 }).map((_, r) =>
          Array.from({ length: 7 }).map((__, c) => {
            const sel = cell[0] === c && cell[1] === r;
            return (
              <rect
                key={`g-${c}-${r}`}
                x={gridX + c * gridCell}
                y={gridY + r * gridCell}
                width={gridCell}
                height={gridCell}
                fill={sel ? C.coral : C.coralFill}
                stroke={C.coral}
                strokeWidth={sel ? 1.6 : 0.6}
                style={{ cursor: "pointer" }}
                onClick={() => setCell([c, r])}
              />
            );
          }),
        )}
        <text
          x={gridX + gridSize / 2}
          y={gridY + gridSize + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          7x7 grid &middot; cell ({cell[0]},{cell[1]})
        </text>
        <text
          x={gridX + gridSize / 2}
          y={gridY + gridSize + 30}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          30 = B*5 + C = 2*5 + 20
        </text>

        {/* arrow grid -> panel */}
        <line
          x1={gridX + gridSize + 4}
          y1={gridY + gridSize / 2}
          x2={panelX - 6}
          y2={gridY + gridSize / 2}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* 30-vector breakdown panel */}
        <text
          x={panelX}
          y={gridY + 2}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          cell ({cell[0]},{cell[1]}) -&gt; 30 numbers
        </text>

        {/* box 1 (5 numbers) */}
        <text
          x={panelX}
          y={gridY + 22}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
        >
          box1 x,y,w,h,conf:
        </text>
        <text
          x={panelX + 130}
          y={gridY + 22}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
        >
          {vec.box1.map((n) => n.toFixed(2)).join(" ")}
        </text>

        {/* box 2 (5 numbers) */}
        <text
          x={panelX}
          y={gridY + 38}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
        >
          box2 x,y,w,h,conf:
        </text>
        <text
          x={panelX + 130}
          y={gridY + 38}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
        >
          {vec.box2.map((n) => n.toFixed(2)).join(" ")}
        </text>

        {/* 20 class scores (show 5 example bars) */}
        <text
          x={panelX}
          y={gridY + 58}
          fontFamily={MONO}
          fontSize={9}
          fill={C.green}
        >
          20 class scores (5 shown):
        </text>
        {CLASS_NAMES.map((nm, i) => {
          const bx = panelX + i * 56;
          const by = gridY + 70;
          const barMax = 36;
          const bv = classScores[i];
          const barH = 6 + bv * barMax;
          return (
            <g key={`cls-${nm}`}>
              <rect
                x={bx}
                y={by + (6 + barMax) - barH}
                width={20}
                height={barH}
                fill={C.greenFill}
                stroke={C.green}
                strokeWidth={1}
              />
              <text
                x={bx + 10}
                y={by + (6 + barMax) + 12}
                fontFamily={MONO}
                fontSize={7.5}
                fill={C.muted}
                textAnchor="middle"
              >
                {nm}
              </text>
              <text
                x={bx + 10}
                y={by + (6 + barMax) - barH - 4}
                fontFamily={MONO}
                fontSize={7.5}
                fill={C.green}
                textAnchor="middle"
              >
                {bv.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* per-cell conclusion line */}
        <text
          x={panelX}
          y={gridY + 138}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.coral}
        >
          best: {vec.topClass} ({vec.topProb.toFixed(2)}) from box1
        </text>

        {/* Caption band (bottom) */}
        <text
          x={18}
          y={H - 14}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          24 convs squeeze the image to a 7x7x30 grid: two boxes + twenty class
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setHighlightAlt((v: boolean) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            highlightAlt
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          highlight 1x1-&gt;3x3 blocks
        </button>
        <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
          cell col
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={cell[0]}
            onChange={(e) =>
              setCell([Number(e.target.value), cell[1]] as const)
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{cell[0]}</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
          cell row
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={cell[1]}
            onChange={(e) =>
              setCell([cell[0], Number(e.target.value)] as const)
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{cell[1]}</span>
        </label>
        <span className="font-mono text-[var(--muted)]">
          hover a stage for its shape; click a grid cell for its 30 numbers
        </span>
      </div>
    </div>
  );
}
