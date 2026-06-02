"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// ---- Static, deterministic data (no random/date at module load) ----
//
// A YOLO-style cell predicts, per cell: B=2 boxes (each with a single
// "objectness" confidence) and ONE shared 20-way class-probability vector.
// Final per-class score for a box = class_prob[c] * box_confidence.
// Across a 7x7 grid with 2 boxes each that is 98 candidate boxes; only the
// few whose best class score clears the threshold survive.

const GRID = 7; // 7x7 cells
const BOXES_PER_CELL = 2; // -> 98 candidate boxes

// 20 PASCAL-VOC-style class names (shortened to fit labels).
const CLASSES: string[] = [
  "person",
  "car",
  "dog",
  "cat",
  "bird",
  "horse",
  "sheep",
  "cow",
  "bike",
  "bus",
  "train",
  "boat",
  "plane",
  "chair",
  "sofa",
  "table",
  "plant",
  "tv",
  "bottle",
  "phone",
];

// The "focus" cell's shared class-probability vector (sums ~1.0).
const FOCUS_PROBS: number[] = [
  0.55, 0.05, 0.18, 0.04, 0.02, 0.01, 0.01, 0.01, 0.02, 0.01,
  0.01, 0.0, 0.0, 0.02, 0.01, 0.01, 0.0, 0.0, 0.01, 0.0,
];

// The focus cell's two box objectness confidences.
const FOCUS_CONF: number[] = [0.9, 0.35];

// Per-box data for every one of the 98 candidate boxes (deterministic).
// Each box has: a best-class index, the class prob for that class, and the
// box objectness confidence. Final score = prob * conf. Most are weak.
interface Box {
  cell: number; // 0..48
  slot: number; // 0..1
  col: number;
  row: number;
  classIdx: number;
  prob: number;
  conf: number;
}

// Build the 98 boxes deterministically from a small seeded pattern so a
// handful stand out and the rest are faint. No Math.random used.
function buildBoxes(): Box[] {
  const out: Box[] = [];
  // Hand-picked "strong" detections: cell index -> {slot, classIdx, prob, conf}
  const strong: Record<number, { slot: number; classIdx: number; prob: number; conf: number }> = {
    24: { slot: 0, classIdx: 0, prob: 0.55, conf: 0.9 }, // person, center cell
    16: { slot: 1, classIdx: 2, prob: 0.62, conf: 0.82 }, // dog
    38: { slot: 0, classIdx: 1, prob: 0.7, conf: 0.78 }, // car
    10: { slot: 0, classIdx: 8, prob: 0.5, conf: 0.74 }, // bike
    32: { slot: 1, classIdx: 3, prob: 0.48, conf: 0.66 }, // cat (borderline)
  };
  for (let cell = 0; cell < GRID * GRID; cell++) {
    const col = cell % GRID;
    const row = Math.floor(cell / GRID);
    for (let slot = 0; slot < BOXES_PER_CELL; slot++) {
      const s = strong[cell];
      if (s && s.slot === slot) {
        out.push({ cell, slot, col, row, classIdx: s.classIdx, prob: s.prob, conf: s.conf });
      } else {
        // Weak, deterministic clutter derived from indices.
        const h = (cell * 7 + slot * 13) % 20;
        const prob = 0.06 + ((cell * 3 + slot * 5) % 9) * 0.012; // ~0.06..0.16
        const conf = 0.08 + ((cell * 5 + slot * 11) % 7) * 0.03; // ~0.08..0.26
        out.push({ cell, slot, col, row, classIdx: h, prob, conf });
      }
    }
  }
  return out;
}

const BOXES: Box[] = buildBoxes();

// ---- Geometry ----
const W = 640;
const H = 500;

const MARGIN = 14;

// Left panel: the focus cell breakdown (probs x conf).
const L_X = MARGIN + 4; // 18
const BAR_X = L_X + 64; // start of bars
const BAR_W = 132; // max bar width
const ROW_Y0 = 112; // first class row baseline area
const ROW_H = 15; // line spacing per class (>=14)
const SHOWN = 8; // top classes shown in the breakdown

// Right panel: the 7x7 image grid of 98 boxes.
const GRID_X = 372;
const GRID_Y = 96;
const GRID_W = 238;
const CELL = GRID_W / GRID; // ~34

// Readout band (bottom).
const READ_Y = 408;

// ---- Helpers (pure / deterministic) ----
function score(b: Box): number {
  return b.prob * b.conf;
}

function maxScoreForCell(): Map<number, number> {
  const m = new Map<number, number>();
  for (const b of BOXES) {
    const s = score(b);
    const cur = m.get(b.cell) ?? 0;
    if (s > cur) m.set(b.cell, s);
  }
  return m;
}
const CELL_MAX: Map<number, number> = maxScoreForCell();

export function VisCellPredictionsToScores() {
  const [threshold, setThreshold] = useState<number>(0.3);
  const [selected, setSelected] = useState<number | null>(24); // selected cell index

  // Surviving boxes: best-class score >= threshold.
  const surviving: Box[] = BOXES.filter((b: Box) => score(b) >= threshold);
  const survivingCells: Set<number> = new Set(surviving.map((b: Box) => b.cell));

  // The currently selected cell's boxes (for the breakdown panel).
  const selBoxes: Box[] = selected === null ? [] : BOXES.filter((b: Box) => b.cell === selected);

  // Build the breakdown rows for the selected cell: for each of its boxes,
  // show class_prob * conf for the top classes of the focus probability vector.
  // We display the shared focus class vector multiplied by each box conf.
  const focusOrder: number[] = FOCUS_PROBS
    .map((p: number, i: number): [number, number] => [i, p])
    .sort((a: [number, number], b: [number, number]) => b[1] - a[1])
    .slice(0, SHOWN)
    .map((t: [number, number]) => t[0]);

  // Confidence values to use for the breakdown: pull from the selected cell's
  // boxes if available, else the focus defaults.
  const confA: number = selBoxes[0]?.conf ?? FOCUS_CONF[0];
  const confB: number = selBoxes[1]?.conf ?? FOCUS_CONF[1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="From cell predictions to final scores: each grid cell predicts boxes with an objectness confidence and a shared class-probability vector; multiplying class probability by box confidence gives per-class detection scores, and thresholding keeps only the strong detections across all 98 candidate boxes."
      >
        {/* ---- Title band ---- */}
        <text x={W / 2} y={26} fontFamily={MONO} fontSize={14} fill={C.ink} fontWeight={600} textAnchor="middle">
          From Cell Predictions to Final Scores
        </text>
        <text x={W / 2} y={44} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="middle">
          score = class_prob &#215; box_confidence, then threshold
        </text>

        {/* ============ LEFT: per-class breakdown for selected cell ============ */}
        <text x={L_X} y={70} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="start">
          1. one cell: prob &#215; conf
        </text>

        {/* Box-confidence chips for the two boxes of this cell */}
        <text x={L_X} y={86} fontFamily={MONO} fontSize={8.5} fill={C.coral} textAnchor="start">
          box A conf {confA.toFixed(2)}
        </text>
        <text x={L_X + 110} y={86} fontFamily={MONO} fontSize={8.5} fill={C.violet} textAnchor="start">
          box B conf {confB.toFixed(2)}
        </text>

        {/* Column header for the bars */}
        <text x={BAR_X} y={ROW_Y0 - 6} fontFamily={MONO} fontSize={8} fill={C.muted} textAnchor="start">
          class score = prob &#215; conf
        </text>

        {/* Per-class rows: label + bar(A) overlaid with bar(B) */}
        {focusOrder.map((ci: number, i: number) => {
          const p: number = FOCUS_PROBS[ci];
          const sA: number = p * confA;
          const sB: number = p * confB;
          const y: number = ROW_Y0 + i * ROW_H;
          const wA: number = Math.max(1, sA * BAR_W * 1.6);
          const wB: number = Math.max(1, sB * BAR_W * 1.6);
          const survives: boolean = sA >= threshold;
          return (
            <g key={ci}>
              {/* class label (fits in 60px column) */}
              <text x={L_X} y={y + 8} fontFamily={MONO} fontSize={8.5} fill={C.ink} textAnchor="start">
                {CLASSES[ci]}
              </text>
              {/* track */}
              <rect x={BAR_X} y={y} width={BAR_W} height={10} rx={2} fill="var(--card)" stroke={C.line} strokeWidth={0.8} />
              {/* box A score bar */}
              <rect x={BAR_X} y={y} width={Math.min(BAR_W, wA)} height={10} rx={2} fill={survives ? C.coral : C.coralFill} />
              {/* box B score bar (thinner, on top) */}
              <rect x={BAR_X} y={y + 2.5} width={Math.min(BAR_W, wB)} height={5} rx={1.5} fill={C.violet} opacity={0.85} />
              {/* numeric score (box A), to the right of the track */}
              <text x={BAR_X + BAR_W + 6} y={y + 8} fontFamily={MONO} fontSize={8} fill={survives ? C.coral : C.muted} textAnchor="start">
                {sA.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* threshold line marker over the bars */}
        {(() => {
          const tx: number = BAR_X + Math.min(BAR_W, threshold * BAR_W * 1.6);
          const top: number = ROW_Y0 - 2;
          const bot: number = ROW_Y0 + SHOWN * ROW_H - 4;
          return (
            <g>
              <line x1={tx} y1={top} x2={tx} y2={bot} stroke={C.green} strokeWidth={1.2} strokeDasharray="3 2" />
              <text x={tx} y={bot + 11} fontFamily={MONO} fontSize={8} fill={C.green} textAnchor="middle">
                thr {threshold.toFixed(2)}
              </text>
            </g>
          );
        })()}

        {/* ============ RIGHT: 7x7 grid of 98 candidate boxes ============ */}
        <text x={GRID_X} y={70} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="start">
          2. all 98 boxes (7&#215;7&#215;2)
        </text>
        <text x={GRID_X} y={86} fontFamily={MONO} fontSize={8.5} fill={C.muted} textAnchor="start">
          brightness = best class score
        </text>

        {/* grid background */}
        <rect x={GRID_X} y={GRID_Y} width={GRID_W} height={GRID_W} fill="var(--background)" stroke={C.line} strokeWidth={1} />

        {/* grid cells */}
        {Array.from({ length: GRID * GRID }, (_: unknown, cell: number) => {
          const col: number = cell % GRID;
          const row: number = Math.floor(cell / GRID);
          const x: number = GRID_X + col * CELL;
          const y: number = GRID_Y + row * CELL;
          const m: number = CELL_MAX.get(cell) ?? 0;
          const isSurv: boolean = survivingCells.has(cell);
          const isSel: boolean = selected === cell;
          // faint fill scaled by max score; survivors get a coral box
          const op: number = Math.min(0.85, 0.06 + m * 1.3);
          return (
            <g key={cell} onClick={() => setSelected(cell)} style={{ cursor: "pointer" }}>
              <rect x={x} y={y} width={CELL} height={CELL} fill="none" stroke={C.grid} strokeWidth={0.6} />
              {/* score heat dot */}
              <rect
                x={x + CELL / 2 - 5}
                y={y + CELL / 2 - 5}
                width={10}
                height={10}
                rx={2}
                fill={isSurv ? C.coral : C.ink}
                opacity={isSurv ? 0.9 : op * 0.5}
              />
              {isSurv && (
                <rect
                  x={x + 3}
                  y={y + 3}
                  width={CELL - 6}
                  height={CELL - 6}
                  rx={2}
                  fill="none"
                  stroke={C.coral}
                  strokeWidth={1.6}
                />
              )}
              {isSel && (
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={CELL - 2}
                  height={CELL - 2}
                  rx={2}
                  fill="none"
                  stroke={C.blue}
                  strokeWidth={1.6}
                  strokeDasharray="3 2"
                />
              )}
            </g>
          );
        })}

        {/* survivor count, placed clear below the grid */}
        <text x={GRID_X} y={GRID_Y + GRID_W + 16} fontFamily={MONO} fontSize={9} fill={C.coral} textAnchor="start">
          {surviving.length} of 98 survive
        </text>
        <text x={GRID_X + GRID_W} y={GRID_Y + GRID_W + 16} fontFamily={MONO} fontSize={8.5} fill={C.blue} textAnchor="end">
          click a cell to inspect
        </text>

        {/* ============ READOUT BAND (bottom, its own clear band) ============ */}
        <line x1={MARGIN} y1={READ_Y - 14} x2={W - MARGIN} y2={READ_Y - 14} stroke={C.line} strokeWidth={1} />
        {(() => {
          const cellLabel: string = selected === null ? "-" : `cell ${selected}`;
          const top: Box | undefined = selBoxes
            .slice()
            .sort((a: Box, b: Box) => score(b) - score(a))[0];
          if (!top) {
            return (
              <text x={MARGIN} y={READ_Y + 4} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="start">
                click a cell to see its class-specific score breakdown
              </text>
            );
          }
          const s: number = score(top);
          const slotName: string = top.slot === 0 ? "A" : "B";
          const passes: boolean = s >= threshold;
          return (
            <g>
              <text x={MARGIN} y={READ_Y + 2} fontFamily={MONO} fontSize={9.5} fill={C.ink} textAnchor="start">
                {cellLabel} &#183; best box {slotName} &#183; class {CLASSES[top.classIdx]}
              </text>
              <text x={MARGIN} y={READ_Y + 18} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="start">
                score = {top.prob.toFixed(2)} &#215; {top.conf.toFixed(2)} = {s.toFixed(3)}
              </text>
              <text
                x={MARGIN}
                y={READ_Y + 34}
                fontFamily={MONO}
                fontSize={9.5}
                fill={passes ? C.green : C.coral}
                textAnchor="start"
              >
                {passes
                  ? `>= ${threshold.toFixed(2)} : kept as a detection`
                  : `<  ${threshold.toFixed(2)} : pruned`}
              </text>
            </g>
          );
        })()}

        {/* ---- Caption band (very bottom, split to fit width) ---- */}
        <text x={W / 2} y={H - 24} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
          98 boxes from one pass; multiply class prob by confidence, threshold,
        </text>
        <text x={W / 2} y={H - 11} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
          and only real detections survive.
        </text>
      </svg>

      {/* ---- Controls row ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          threshold
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.01}
            value={threshold}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setThreshold(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{threshold.toFixed(2)}</span>
        </label>
        <button
          type="button"
          onClick={() => setThreshold(0.3)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset thr
        </button>
        <button
          type="button"
          onClick={() => setSelected(24)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={selected === 24 ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          focus center cell
        </button>
      </div>
    </div>
  );
}
