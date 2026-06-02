"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// ---------------------------------------------------------------------------
// Per-Pixel Training and Class Imbalance
//
// Segmentation trains a loss at EVERY pixel. When one class (background) fills
// most of the image, a naive per-pixel cross-entropy is dominated by the easy
// background pixels: a model can score ~99% pixel accuracy by predicting "all
// background" while detecting none of the tiny object. We show how weighted-CE,
// focal loss and Dice loss rebalance the objective toward the rare class.
// ---------------------------------------------------------------------------

// Grid dimensions for the segmentation image (deterministic, hard-coded).
const COLS = 18;
const ROWS = 12;
const TOTAL = COLS * ROWS; // 216 pixels

type Mode = "ce" | "wce" | "focal" | "dice";

const MODES: { key: Mode; label: string }[] = [
  { key: "ce", label: "plain CE" },
  { key: "wce", label: "weighted-CE" },
  { key: "focal", label: "focal" },
  { key: "dice", label: "Dice" },
];

// Slider value -> fraction of pixels that are foreground (the object).
// We expose a percentage 1..40; the object is a centered disc covering that
// fraction of the grid. Deterministic geometry, no randomness.
function objectMask(fgPct: number): boolean[] {
  // Target number of foreground pixels.
  const target = Math.max(1, Math.round((fgPct / 100) * TOTAL));
  // Grow a disc from the center until we reach `target` pixels.
  const cx = (COLS - 1) / 2;
  const cy = (ROWS - 1) / 2;
  // Distance of every cell from center.
  const cells: { i: number; d: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dx = (c - cx) / 1.0;
      const dy = (r - cy) * 1.4; // squash so the disc reads round on a wide grid
      cells.push({ i: r * COLS + c, d: Math.sqrt(dx * dx + dy * dy) });
    }
  }
  cells.sort((a, b) => a.d - b.d);
  const mask = new Array<boolean>(TOTAL).fill(false);
  for (let k = 0; k < target; k++) mask[cells[k].i] = true;
  return mask;
}

function fmtPct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function fmt2(x: number): string {
  return x.toFixed(2);
}

export function VisPerPixelImbalance() {
  // Foreground (object) fraction as a percent of the image, 1..40.
  const [fgPct, setFgPct] = useState<number>(4);
  // Which loss is active.
  const [mode, setMode] = useState<Mode>("ce");

  const mask = objectMask(fgPct);
  const fgCount = mask.reduce<number>((n, m) => n + (m ? 1 : 0), 0);
  const bgCount = TOTAL - fgCount;
  const fgFrac = fgCount / TOTAL;
  const bgFrac = bgCount / TOTAL;

  // "Predict all background" baseline.
  // Pixel accuracy = fraction of pixels correctly labelled = background fraction.
  const pixelAcc = bgFrac;
  // Dice on the rare class = 2|A∩B| / (|A|+|B|). Predicting nothing => 0 overlap.
  const diceAllBg = 0;

  // --- How much of the per-pixel loss each class contributes, by mode. ---
  // We model a stylised "loss share" between background (easy) and foreground
  // (hard) pixels. Plain CE weights every pixel equally, so background dominates
  // purely by count. The other modes rebalance that share toward foreground.
  let bgShare: number;
  if (mode === "ce") {
    // Equal per-pixel weight -> share tracks pixel counts.
    bgShare = bgFrac;
  } else if (mode === "wce") {
    // Weight each class inversely to its frequency -> ~50/50 regardless of size.
    bgShare = 0.5;
  } else if (mode === "focal") {
    // Down-weight easy (well-classified) background by (1-p)^gamma.
    // Background pixels are "easy" so their effective weight shrinks ~10x.
    const bgW = bgFrac * 0.12;
    bgShare = bgW / (bgW + fgFrac);
  } else {
    // Dice optimises overlap of the rare class directly; background barely
    // enters the gradient.
    bgShare = 0.18;
  }
  const fgShare = 1 - bgShare;

  // ---------------- geometry ----------------
  const W = 600;
  const H = 470;

  // Image grid (left).
  const gridX = 16;
  const gridY = 92;
  const cell = 13;
  const gridW = COLS * cell; // 234
  const gridH = ROWS * cell; // 156

  // Loss-share bar (left, under grid).
  const shareBarX = gridX;
  const shareBarY = gridY + gridH + 48;
  const shareBarW = gridW;
  const shareBarH = 20;

  // Right column panels.
  const rx = 300;
  const rw = W - rx - 16; // right panel width (284)

  // Pixel-accuracy bar (right top).
  const accY = 108;
  const accBarX = rx;
  const accBarW = rw;
  const accBarH = 18;

  // Dice bar (right).
  const diceY = 168;

  // Loss readout band (bottom).
  const bandY = 364;

  const activeLabel = MODES.find((m) => m.key === mode)!.label;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Per-pixel training and class imbalance: a tiny object is drowned by background pixels under plain cross-entropy, and weighted, focal, or Dice loss rebalance the objective."
      >
        {/* ---------- Title band ---------- */}
        <text x={16} y={24} fontSize={14} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          Per-Pixel Training and Class Imbalance
        </text>
        <text x={16} y={42} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          segmentation scores a loss at every pixel — a sea of background can swamp the signal
        </text>
        <line x1={16} y1={54} x2={W - 16} y2={54} stroke={C.line} strokeWidth={1} />

        {/* ================= LEFT: image grid ================= */}
        <text x={gridX} y={74} fontSize={10.5} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          ground-truth mask
        </text>
        <text x={gridX + gridW} y={74} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="end">
          {fgCount}/{TOTAL} px object
        </text>

        {/* grid cells */}
        {mask.map((isFg, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          return (
            <rect
              key={`px-${i}`}
              x={gridX + c * cell}
              y={gridY + r * cell}
              width={cell - 1}
              height={cell - 1}
              fill={isFg ? C.coralFill : "var(--card)"}
              stroke={isFg ? C.coral : C.grid}
              strokeWidth={isFg ? 1 : 0.75}
            />
          );
        })}

        {/* object callout */}
        <text x={gridX} y={gridY + gridH + 16} fontSize={9} fill={C.coral} fontFamily={MONO}>
          object {fmtPct(fgFrac)}
        </text>
        <text
          x={gridX + gridW}
          y={gridY + gridH + 16}
          fontSize={9}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="end"
        >
          background {fmtPct(bgFrac)}
        </text>

        {/* per-pixel loss-share bar */}
        <text x={shareBarX} y={shareBarY - 8} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          where the loss comes from — {activeLabel}
        </text>
        <rect
          x={shareBarX}
          y={shareBarY}
          width={shareBarW}
          height={shareBarH}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {/* background share */}
        <rect
          x={shareBarX}
          y={shareBarY}
          width={shareBarW * bgShare}
          height={shareBarH}
          fill={C.blueFill}
        />
        {/* foreground share */}
        <rect
          x={shareBarX + shareBarW * bgShare}
          y={shareBarY}
          width={shareBarW * fgShare}
          height={shareBarH}
          fill={C.coralFill}
        />
        <line
          x1={shareBarX + shareBarW * bgShare}
          y1={shareBarY}
          x2={shareBarX + shareBarW * bgShare}
          y2={shareBarY + shareBarH}
          stroke={C.coral}
          strokeWidth={1.4}
        />
        {/* share legend below bar */}
        <text x={shareBarX} y={shareBarY + shareBarH + 14} fontSize={9} fill={C.blue} fontFamily={MONO}>
          bg {Math.round(bgShare * 100)}%
        </text>
        <text
          x={shareBarX + shareBarW}
          y={shareBarY + shareBarH + 14}
          fontSize={9}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="end"
        >
          object {Math.round(fgShare * 100)}%
        </text>

        {/* ================= RIGHT: metrics ================= */}
        <text x={rx} y={74} fontSize={10.5} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          shortcut: predict all background
        </text>

        {/* pixel accuracy */}
        <text x={rx} y={accY - 8} fontSize={9.5} fill={C.ink} fontFamily={MONO}>
          pixel accuracy
        </text>
        <rect
          x={accBarX}
          y={accY}
          width={accBarW}
          height={accBarH}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <rect
          x={accBarX}
          y={accY}
          width={Math.max(1, accBarW * pixelAcc)}
          height={accBarH}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1}
        />
        <text
          x={accBarX + accBarW}
          y={accY + accBarH + 13}
          fontSize={9.5}
          fill={C.green}
          fontFamily={MONO}
          textAnchor="end"
          fontWeight={700}
        >
          {fmtPct(pixelAcc)} — looks great
        </text>

        {/* dice */}
        <text x={rx} y={diceY - 8} fontSize={9.5} fill={C.ink} fontFamily={MONO}>
          Dice score (object overlap)
        </text>
        <rect
          x={accBarX}
          y={diceY}
          width={accBarW}
          height={accBarH}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <rect
          x={accBarX}
          y={diceY}
          width={Math.max(1, accBarW * diceAllBg)}
          height={accBarH}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1}
        />
        <text
          x={accBarX}
          y={diceY + accBarH + 13}
          fontSize={9.5}
          fill={C.coral}
          fontFamily={MONO}
          fontWeight={700}
        >
          {fmt2(diceAllBg)} — detects nothing
        </text>

        {/* explanation lines under metrics */}
        <text x={rx} y={diceY + 50} fontSize={9} fill={C.muted} fontFamily={MONO}>
          Accuracy rewards the {fmtPct(bgFrac)} of pixels
        </text>
        <text x={rx} y={diceY + 64} fontSize={9} fill={C.muted} fontFamily={MONO}>
          that are background, so it stays high
        </text>
        <text x={rx} y={diceY + 78} fontSize={9} fill={C.muted} fontFamily={MONO}>
          even when the object is missed entirely.
        </text>

        {/* ================= BOTTOM: loss readout band ================= */}
        <line x1={16} y1={bandY - 14} x2={W - 16} y2={bandY - 14} stroke={C.line} strokeWidth={1} />

        <text x={16} y={bandY} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          active loss: {activeLabel}
        </text>
        <text x={16} y={bandY + 16} fontSize={9} fill={C.muted} fontFamily={MONO}>
          {mode === "ce" &&
            "plain CE weights every pixel equally — background dominates by sheer count"}
          {mode === "wce" &&
            "weighted-CE scales each class by inverse frequency — about 50/50 either way"}
          {mode === "focal" &&
            "focal loss down-weights easy background pixels with a (1-p)^gamma factor"}
          {mode === "dice" &&
            "Dice loss optimises object overlap directly — size-invariant, ignores easy bg"}
        </text>

        {/* object-loss emphasis readout */}
        <text x={16} y={bandY + 38} fontSize={9.5} fill={C.ink} fontFamily={MONO}>
          object now drives
        </text>
        <text x={150} y={bandY + 38} fontSize={9.5} fill={C.coral} fontFamily={MONO} fontWeight={700}>
          {Math.round(fgShare * 100)}%
        </text>
        <text x={196} y={bandY + 38} fontSize={9.5} fill={C.ink} fontFamily={MONO}>
          of the gradient
        </text>
        <text x={320} y={bandY + 38} fontSize={9} fill={C.muted} fontFamily={MONO}>
          {fgShare > 0.4 ? "rebalanced toward the rare class" : "still drowned by background"}
        </text>

        {/* caption */}
        <text x={16} y={bandY + 60} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          Per-pixel cross-entropy, plus Dice / focal / weighting so a tiny object
        </text>
        <text x={16} y={bandY + 73} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          isn&apos;t drowned out by a sea of background.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono">loss</span>
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={mode === m.key ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {m.label}
          </button>
        ))}

        <label className="flex items-center gap-1.5 font-mono">
          object size
          <input
            type="range"
            min={1}
            max={40}
            step={1}
            value={fgPct}
            onChange={(e) => setFgPct(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{fgPct}%</span>
        </label>
      </div>
    </div>
  );
}
