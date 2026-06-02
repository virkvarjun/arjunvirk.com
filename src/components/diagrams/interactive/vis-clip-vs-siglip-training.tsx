"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// A small batch of N image-text pairs. Image i is the true match for text i,
// so the diagonal cells are the positive pairs.
const N = 4;

// Hard-coded cosine-similarity logits between image i (row) and text j (col),
// in roughly [-1, 1]. Diagonal is high (true pairs), off-diagonal lower.
const SIM: number[][] = [
  [0.92, 0.18, -0.22, 0.05], // img 0
  [0.12, 0.88, 0.27, -0.1], // img 1
  [-0.15, 0.31, 0.9, 0.2], // img 2
  [0.08, -0.05, 0.22, 0.86], // img 3
];

// CLIP temperature (logit scale). Higher => sharper softmax.
const TAU = 4;

// SigLIP learned bias term b (shifts the sigmoid decision boundary).
const SIG_BIAS = -2;
const SIG_SCALE = 6; // logit scale for the sigmoid

function expv(x: number): number {
  return Math.exp(x);
}

// CLIP: softmax of one row across the whole batch (temperature TAU).
function clipRowProb(row: number[]): number[] {
  const z = row.map((v: number) => v * TAU);
  const m = Math.max(...z);
  const ex = z.map((v: number) => expv(v - m));
  const s = ex.reduce((a: number, b: number) => a + b, 0);
  return ex.map((v: number) => v / s);
}

// SigLIP: independent sigmoid per cell. Returns P(match) in (0,1).
function siglipProb(sim: number): number {
  return 1 / (1 + expv(-(sim * SIG_SCALE + SIG_BIAS)));
}

// Accuracy-vs-batch-size curves (hard-coded, deterministic).
// CLIP needs large batches to give enough negatives; SigLIP is flat-high.
// Index maps to batch sizes BATCHES[i].
const BATCHES: number[] = [256, 1024, 4096, 16384, 32768, 65536];
const CLIP_ACC: number[] = [0.41, 0.55, 0.68, 0.78, 0.82, 0.83];
const SIG_ACC: number[] = [0.74, 0.79, 0.82, 0.83, 0.84, 0.84];

// --- Geometry (viewBox 620 x 478) ---
const W = 620;
const H = 478;

const CELL = 34;
const GRID_W = N * CELL;

// Left matrix (CLIP) and right matrix (SigLIP).
const TOP = 104; // top edge of cells
const CLIP_X = 70;
const SIG_X = 360;
const cellX = (base: number, j: number): number => base + j * CELL;
const cellY = (i: number): number => TOP + i * CELL;

// Map a probability in [0,1] -> blue heat (light blueFill -> deep blue).
function heatFill(p: number): string {
  const t = Math.max(0, Math.min(1, p));
  const a = [0xdd, 0xe3, 0xf8];
  const b = [0x3f, 0x5f, 0xd6];
  const ch = a.map((c: number, k: number) => Math.round(c + (b[k] - c) * t));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

type Cell = { i: number; j: number };

export function VisClipVsSiglip() {
  const [batchIdx, setBatchIdx] = useState<number>(2);
  const [sel, setSel] = useState<Cell>({ i: 1, j: 1 });
  // focus: "both" | "clip" | "siglip" — which loss to emphasise.
  const [focus, setFocus] = useState<"both" | "clip" | "siglip">("both");

  const clipProbs: number[][] = SIM.map((row: number[]) => clipRowProb(row));
  const sigProbs: number[][] = SIM.map((row: number[]) =>
    row.map((v: number) => siglipProb(v)),
  );

  const clipAcc: number = CLIP_ACC[batchIdx];
  const sigAcc: number = SIG_ACC[batchIdx];
  const batch: number = BATCHES[batchIdx];

  const selSim: number = SIM[sel.i][sel.j];
  const selClip: number = clipProbs[sel.i][sel.j];
  const selSig: number = sigProbs[sel.i][sel.j];
  const isPos: boolean = sel.i === sel.j;

  const showClip: boolean = focus !== "siglip";
  const showSig: boolean = focus !== "clip";

  // Render one matrix. probs gives the per-cell value to display/colour.
  const renderMatrix = (
    base: number,
    probs: number[][],
    kind: "clip" | "siglip",
    dim: boolean,
  ) =>
    probs.map((row: number[], i: number) =>
      row.map((p: number, j: number) => {
        const diag = i === j;
        const isSel = sel.i === i && sel.j === j;
        return (
          <g key={`${kind}-${i}-${j}`}>
            <rect
              x={cellX(base, j)}
              y={cellY(i)}
              width={CELL}
              height={CELL}
              fill={heatFill(p)}
              stroke={isSel ? C.coral : diag ? C.green : "var(--card)"}
              strokeWidth={isSel ? 2.4 : diag ? 2 : 1}
              opacity={dim ? 0.32 : 1}
              style={{ cursor: "pointer" }}
              onClick={() => setSel({ i, j })}
            />
            <text
              x={cellX(base, j) + CELL / 2}
              y={cellY(i) + CELL / 2 + 3.5}
              fontFamily={MONO}
              fontSize={9.5}
              fill={p > 0.5 ? "var(--card)" : C.ink}
              textAnchor="middle"
              opacity={dim ? 0.4 : 1}
              style={{ pointerEvents: "none" }}
            >
              {p.toFixed(2)}
            </text>
          </g>
        );
      }),
    );

  // Column / row labels for one matrix.
  const renderLabels = (base: number) => (
    <>
      {Array.from({ length: N }, (_, j: number) => (
        <text
          key={`col-${base}-${j}`}
          x={cellX(base, j) + CELL / 2}
          y={TOP - 6}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {`T${j}`}
        </text>
      ))}
      {Array.from({ length: N }, (_, i: number) => (
        <text
          key={`row-${base}-${i}`}
          x={base - 8}
          y={cellY(i) + CELL / 2 + 3.5}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="end"
        >
          {`I${i}`}
        </text>
      ))}
    </>
  );

  const GRID_BOT = TOP + N * CELL;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="CLIP versus SigLIP training. Two image-text similarity matrices over a batch of four pairs. CLIP applies a softmax across each whole row of the batch with a temperature, so the matched diagonal pair competes against all other texts and needs huge batches. SigLIP judges every cell independently with a sigmoid as match or no-match, so it works at small and huge batch sizes. A batch-size slider shows CLIP accuracy climbing then plateauing while SigLIP stays high across the range."
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={22}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          CLIP vs SigLIP Training
        </text>
        <text
          x={W / 2}
          y={40}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          N×N image–text similarity over a batch · diagonal = true pairs
        </text>
        <line
          x1={20}
          y1={52}
          x2={W - 20}
          y2={52}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* ---- CLIP side ---- */}
        <text
          x={CLIP_X + GRID_W / 2}
          y={68}
          fontFamily={MONO}
          fontSize={11}
          fill={showClip ? C.blue : C.muted}
          fontWeight={600}
          textAnchor="middle"
        >
          CLIP
        </text>
        <text
          x={CLIP_X + GRID_W / 2}
          y={82}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          softmax across the row (÷τ)
        </text>
        {renderLabels(CLIP_X)}
        {renderMatrix(CLIP_X, clipProbs, "clip", !showClip)}
        {/* row-sum annotation: CLIP rows are a probability distribution */}
        {Array.from({ length: N }, (_, i: number) => (
          <text
            key={`csum-${i}`}
            x={CLIP_X + GRID_W + 6}
            y={cellY(i) + CELL / 2 + 3}
            fontFamily={MONO}
            fontSize={8}
            fill={showClip ? C.blue : C.muted}
            textAnchor="start"
            opacity={showClip ? 1 : 0.4}
          >
            Σ=1
          </text>
        ))}

        {/* ---- SigLIP side ---- */}
        <text
          x={SIG_X + GRID_W / 2}
          y={68}
          fontFamily={MONO}
          fontSize={11}
          fill={showSig ? C.green : C.muted}
          fontWeight={600}
          textAnchor="middle"
        >
          SigLIP
        </text>
        <text
          x={SIG_X + GRID_W / 2}
          y={82}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          sigmoid per cell (no softmax)
        </text>
        {renderLabels(SIG_X)}
        {renderMatrix(SIG_X, sigProbs, "siglip", !showSig)}
        {/* each cell judged independently as +1 / -1 */}
        {Array.from({ length: N }, (_, i: number) => (
          <text
            key={`ssum-${i}`}
            x={SIG_X + GRID_W + 6}
            y={cellY(i) + CELL / 2 + 3}
            fontFamily={MONO}
            fontSize={8}
            fill={showSig ? C.green : C.muted}
            textAnchor="start"
            opacity={showSig ? 1 : 0.4}
          >
            ±1
          </text>
        ))}

        {/* divider between the two matrices */}
        <line
          x1={(CLIP_X + GRID_W + SIG_X) / 2 + 12}
          y1={62}
          x2={(CLIP_X + GRID_W + SIG_X) / 2 + 12}
          y2={GRID_BOT + 6}
          stroke={C.line}
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* ---- Selected-cell readout band ---- */}
        <line
          x1={20}
          y1={GRID_BOT + 16}
          x2={W - 20}
          y2={GRID_BOT + 16}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={28}
          y={GRID_BOT + 34}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="start"
        >
          {`cell (I${sel.i}, T${sel.j}) — ${
            isPos ? "POSITIVE pair" : "negative pair"
          }   sim = ${selSim.toFixed(2)}`}
        </text>
        <text
          x={28}
          y={GRID_BOT + 50}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.blue}
          textAnchor="start"
        >
          {`CLIP  : row-softmax → ${selClip.toFixed(
            2,
          )}  (competes vs other texts)`}
        </text>
        <text
          x={28}
          y={GRID_BOT + 64}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.green}
          textAnchor="start"
        >
          {`SigLIP: σ(sim) → ${selSig.toFixed(2)}  (independent ${
            selSig > 0.5 ? "match" : "no-match"
          })`}
        </text>

        {/* ---- Batch-size / accuracy readout band ---- */}
        <text
          x={W - 28}
          y={GRID_BOT + 34}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="end"
        >
          {`batch = ${batch.toLocaleString("en-US")}`}
        </text>
        <text
          x={W - 28}
          y={GRID_BOT + 50}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.blue}
          textAnchor="end"
        >
          {`CLIP acc   ${(clipAcc * 100).toFixed(0)}%${
            batch < 16384 ? "  (too few negatives)" : ""
          }`}
        </text>
        <text
          x={W - 28}
          y={GRID_BOT + 64}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.green}
          textAnchor="end"
        >
          {`SigLIP acc ${(sigAcc * 100).toFixed(0)}%  (stable across batch)`}
        </text>

        {/* caption (split across two fitted lines) */}
        <line
          x1={20}
          y1={H - 40}
          x2={W - 20}
          y2={H - 40}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={W / 2}
          y={H - 24}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          CLIP softmaxes each row across the batch; SigLIP judges every pair
        </text>
        <text
          x={W / 2}
          y={H - 10}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          independently — freeing it from giant batches.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">show:</span>
        {(["both", "clip", "siglip"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFocus(mode)}
            aria-pressed={focus === mode}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              focus === mode
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            {mode}
          </button>
        ))}

        <span className="font-mono text-[var(--muted)]">batch size:</span>
        <input
          type="range"
          min={0}
          max={BATCHES.length - 1}
          step={1}
          value={batchIdx}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setBatchIdx(Number(e.target.value))
          }
          className="w-28 accent-[var(--foreground)]"
          aria-label="batch size"
        />
        <span className="font-mono tabular-nums">
          {BATCHES[batchIdx].toLocaleString("en-US")}
        </span>
      </div>

      <p className="mt-2 font-mono text-xs text-[var(--muted)]">
        Click a cell to compare how CLIP (row-normalized) and SigLIP
        (independent) score that image–text pair.
      </p>
    </div>
  );
}
