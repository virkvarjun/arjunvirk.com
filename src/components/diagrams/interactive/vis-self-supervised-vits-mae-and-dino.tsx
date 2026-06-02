"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Self-Supervised ViTs: MAE and DINO.
// Two recipes for learning image features with no labels.
//   MAE: mask ~75% of patches, encode the visible 25%, a small decoder rebuilds
//        the missing pixels. Throw the decoder away; keep the encoder. "Vision BERT".
//   DINO: two augmented views of one image go to a student and a teacher. The
//         student matches the teacher's output; the teacher is an EMA of the
//         student (no labels). Attention emerges that segments the object.

type Mode = "mae" | "dino";

// A 6x6 patch grid. Each cell's value 0..1 drives a gray shade. The object is a
// rough blob in the middle so masking / attention have something to land on.
const GRID = 6;
const IMG: readonly number[] = [
  0.10, 0.12, 0.18, 0.20, 0.14, 0.10,
  0.12, 0.45, 0.70, 0.66, 0.30, 0.12,
  0.18, 0.70, 0.95, 0.92, 0.60, 0.16,
  0.20, 0.66, 0.92, 0.95, 0.64, 0.18,
  0.14, 0.34, 0.60, 0.64, 0.40, 0.14,
  0.10, 0.13, 0.18, 0.20, 0.15, 0.10,
];

// Deterministic mask pattern: a fixed shuffle of patch indices 0..35. Patches
// whose rank < (ratio * 36) are masked. Hard-coded so SSR is stable.
const MASK_ORDER: readonly number[] = [
  14, 2, 27, 9, 33, 5, 20, 16, 1, 30, 11, 24,
  7, 35, 18, 3, 22, 13, 29, 6, 31, 10, 25, 0,
  17, 34, 8, 21, 12, 28, 4, 19, 32, 15, 23, 26,
];

function gray(v: number): string {
  const g = Math.round(245 - v * 200); // 245 light -> 45 dark
  return `rgb(${g},${g},${g})`;
}

// Attention strength 0..1 per patch: high on the object boundary / interior.
// Hard-coded "emergent segmentation" map for the DINO panel.
const ATTN: readonly number[] = [
  0.05, 0.10, 0.15, 0.15, 0.10, 0.05,
  0.10, 0.55, 0.80, 0.78, 0.40, 0.10,
  0.15, 0.80, 0.95, 0.93, 0.70, 0.15,
  0.15, 0.78, 0.93, 0.95, 0.72, 0.15,
  0.10, 0.45, 0.70, 0.72, 0.50, 0.10,
  0.05, 0.10, 0.15, 0.15, 0.10, 0.05,
];

function attnFill(v: number): string {
  // Light coral -> deep coral as attention grows.
  const r = Math.round(246 - v * 60);
  const g = Math.round(224 - v * 130);
  const b = Math.round(214 - v * 150);
  return `rgb(${r},${g},${b})`;
}

export function VisMaeDino() {
  const [mode, setMode] = useState<Mode>("mae");
  const [ratio, setRatio] = useState<number>(75); // MAE mask ratio %
  const [ema, setEma] = useState<boolean>(true); // DINO: show EMA teacher update

  const W = 520;
  const H = 392;

  // Number of masked patches for the current ratio.
  const nMasked = Math.round((ratio / 100) * GRID * GRID);
  const masked: boolean[] = MASK_ORDER.map((rank) => rank < nMasked);

  // Reconstruction quality: more masking -> blurrier recovered patches.
  // Hidden patches are filled with a coarse average pulled toward the mean.
  const meanV = IMG.reduce((a, b) => a + b, 0) / IMG.length;
  const quality = 1 - ratio / 100; // 1 = easy, 0 = impossible
  const recon: number[] = IMG.map((v, i) => {
    if (!masked[i]) return v;
    // recovered = blend of true value and global mean; blend worsens with ratio.
    return v * quality + meanV * (1 - quality);
  });

  // Layout bands.
  const cell = 22;
  const gridPx = cell * GRID; // 132
  const drawTop = 76; // below title + toggle band
  const midY = drawTop + gridPx / 2; // vertical center of imagery

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Self-supervised vision transformers: MAE masks and reconstructs patches, DINO matches two views with an EMA teacher, both without labels"
      >
        {/* Title band */}
        <text x={16} y={24} fontFamily={MONO} fontSize={13} fill={C.ink}>
          Self-Supervised ViTs: MAE and DINO
        </text>
        <text x={16} y={42} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          learn rich image features with zero labels
        </text>

        {mode === "mae" ? (
          /* ---------------------------- MAE PANEL ---------------------------- */
          <g>
            {/* Masked input image (left) */}
            <g>
              {IMG.map((v, i) => {
                const cx = i % GRID;
                const cy = Math.floor(i / GRID);
                return (
                  <rect
                    key={`mae-in-${i}`}
                    x={16 + cx * cell}
                    y={drawTop + cy * cell}
                    width={cell}
                    height={cell}
                    fill={masked[i] ? "var(--card)" : gray(v)}
                    stroke={masked[i] ? C.line : "none"}
                    strokeWidth={masked[i] ? 1 : 0}
                    strokeDasharray={masked[i] ? "2 2" : undefined}
                  />
                );
              })}
              <rect
                x={16}
                y={drawTop}
                width={gridPx}
                height={gridPx}
                fill="none"
                stroke={C.ink}
                strokeWidth={1.2}
              />
            </g>
            <text
              x={16 + gridPx / 2}
              y={drawTop - 8}
              fontFamily={MONO}
              fontSize={10}
              fill={C.ink}
              textAnchor="middle"
            >
              mask {ratio}% of patches
            </text>
            <text
              x={16 + gridPx / 2}
              y={drawTop + gridPx + 16}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
              textAnchor="middle"
            >
              keep visible {100 - ratio}%
            </text>

            {/* Encoder (sees only visible patches) */}
            <polygon
              points={`${16 + gridPx + 10},${midY - 44} ${16 + gridPx + 58},${midY - 24} ${16 + gridPx + 58},${midY + 24} ${16 + gridPx + 10},${midY + 44}`}
              fill={C.blueFill}
              stroke={C.blue}
              strokeWidth={1.4}
            />
            <text
              x={16 + gridPx + 34}
              y={midY - 2}
              fontFamily={MONO}
              fontSize={9}
              fill={C.blue}
              textAnchor="middle"
            >
              ViT
            </text>
            <text
              x={16 + gridPx + 34}
              y={midY + 10}
              fontFamily={MONO}
              fontSize={9}
              fill={C.blue}
              textAnchor="middle"
            >
              enc
            </text>
            <text
              x={16 + gridPx + 34}
              y={midY - 52}
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.muted}
              textAnchor="middle"
            >
              keep
            </text>

            {/* small Decoder */}
            <polygon
              points={`${16 + gridPx + 80},${midY - 24} ${16 + gridPx + 116},${midY - 40} ${16 + gridPx + 116},${midY + 40} ${16 + gridPx + 80},${midY + 24}`}
              fill={C.greenFill}
              stroke={C.green}
              strokeWidth={1.4}
            />
            <text
              x={16 + gridPx + 98}
              y={midY}
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.green}
              textAnchor="middle"
            >
              dec
            </text>
            <text
              x={16 + gridPx + 98}
              y={midY - 48}
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.coral}
              textAnchor="middle"
            >
              drop
            </text>

            {/* Reconstruction image (right) */}
            <g>
              {recon.map((v, i) => {
                const cx = i % GRID;
                const cy = Math.floor(i / GRID);
                const rx = 16 + gridPx + 132;
                return (
                  <rect
                    key={`mae-out-${i}`}
                    x={rx + cx * cell}
                    y={drawTop + cy * cell}
                    width={cell}
                    height={cell}
                    fill={gray(v)}
                    stroke={masked[i] ? C.coral : "none"}
                    strokeWidth={masked[i] ? 0.8 : 0}
                  />
                );
              })}
              <rect
                x={16 + gridPx + 132}
                y={drawTop}
                width={gridPx}
                height={gridPx}
                fill="none"
                stroke={C.ink}
                strokeWidth={1.2}
              />
            </g>
            <text
              x={16 + gridPx + 132 + gridPx / 2}
              y={drawTop - 8}
              fontFamily={MONO}
              fontSize={10}
              fill={C.ink}
              textAnchor="middle"
            >
              reconstruct pixels
            </text>
            <text
              x={16 + gridPx + 132 + gridPx / 2}
              y={drawTop + gridPx + 16}
              fontFamily={MONO}
              fontSize={9}
              fill={ratio >= 80 ? C.coral : C.muted}
              textAnchor="middle"
            >
              {ratio >= 80
                ? "very hard: detail lost"
                : ratio <= 40
                  ? "easy: too little hidden"
                  : "sweet spot near 75%"}
            </text>

            {/* "vision BERT" tag */}
            <text
              x={16}
              y={drawTop + gridPx + 40}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.violet}
            >
              vision BERT: predict the masked-out content
            </text>
          </g>
        ) : (
          /* --------------------------- DINO PANEL --------------------------- */
          <g>
            {/* Two augmented views (left, stacked) */}
            <text
              x={16 + gridPx / 2}
              y={drawTop - 8}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.ink}
              textAnchor="middle"
            >
              two augmented views
            </text>
            {/* view A (smaller crop, top) */}
            <g>
              {IMG.map((v, i) => {
                const cx = i % GRID;
                const cy = Math.floor(i / GRID);
                const c2 = 13;
                return (
                  <rect
                    key={`viewA-${i}`}
                    x={16 + cx * c2}
                    y={drawTop + cy * c2}
                    width={c2}
                    height={c2}
                    fill={gray(v)}
                  />
                );
              })}
              <rect
                x={16}
                y={drawTop}
                width={13 * GRID}
                height={13 * GRID}
                fill="none"
                stroke={C.coral}
                strokeWidth={1.2}
              />
            </g>
            <text
              x={16 + 13 * GRID + 8}
              y={drawTop + 13 * GRID / 2}
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.coral}
            >
              view 1
            </text>
            {/* view B (other crop, bottom) */}
            <g>
              {IMG.map((v, i) => {
                const cx = i % GRID;
                const cy = Math.floor(i / GRID);
                const c2 = 13;
                const vy = drawTop + 13 * GRID + 18;
                // flip horizontally as a second augmentation.
                const fx = GRID - 1 - cx;
                return (
                  <rect
                    key={`viewB-${i}`}
                    x={16 + fx * c2}
                    y={vy + cy * c2}
                    width={c2}
                    height={c2}
                    fill={gray(v)}
                  />
                );
              })}
              <rect
                x={16}
                y={drawTop + 13 * GRID + 18}
                width={13 * GRID}
                height={13 * GRID}
                fill="none"
                stroke={C.blue}
                strokeWidth={1.2}
              />
            </g>
            <text
              x={16 + 13 * GRID + 8}
              y={drawTop + 13 * GRID + 18 + 13 * GRID / 2}
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.blue}
            >
              view 2
            </text>

            {/* Student network (top path) */}
            <rect
              x={186}
              y={drawTop + 6}
              width={66}
              height={36}
              rx={4}
              fill={C.coralFill}
              stroke={C.coral}
              strokeWidth={1.4}
            />
            <text
              x={219}
              y={drawTop + 21}
              fontFamily={MONO}
              fontSize={9}
              fill={C.coral}
              textAnchor="middle"
            >
              student
            </text>
            <text
              x={219}
              y={drawTop + 33}
              fontFamily={MONO}
              fontSize={8}
              fill={C.coral}
              textAnchor="middle"
            >
              ViT (train)
            </text>

            {/* Teacher network (bottom path) */}
            <rect
              x={186}
              y={drawTop + 13 * GRID + 18 + 12}
              width={66}
              height={36}
              rx={4}
              fill={C.blueFill}
              stroke={C.blue}
              strokeWidth={1.4}
            />
            <text
              x={219}
              y={drawTop + 13 * GRID + 18 + 27}
              fontFamily={MONO}
              fontSize={9}
              fill={C.blue}
              textAnchor="middle"
            >
              teacher
            </text>
            <text
              x={219}
              y={drawTop + 13 * GRID + 18 + 39}
              fontFamily={MONO}
              fontSize={8}
              fill={C.blue}
              textAnchor="middle"
            >
              EMA copy
            </text>

            {/* EMA update arrow (dashed, student -> teacher) */}
            {ema && (
              <g>
                <line
                  x1={219}
                  y1={drawTop + 42}
                  x2={219}
                  y2={drawTop + 13 * GRID + 18 + 12}
                  stroke={C.violet}
                  strokeWidth={1.4}
                  strokeDasharray="4 3"
                />
                <polygon
                  points={`219,${drawTop + 13 * GRID + 18 + 12} 215,${drawTop + 13 * GRID + 18 + 4} 223,${drawTop + 13 * GRID + 18 + 4}`}
                  fill={C.violet}
                />
                <text
                  x={228}
                  y={drawTop + 13 * GRID / 2 + 22}
                  fontFamily={MONO}
                  fontSize={8.5}
                  fill={C.violet}
                >
                  EMA
                </text>
              </g>
            )}

            {/* match loss between outputs (student -> teacher target) */}
            <line
              x1={252}
              y1={drawTop + 24}
              x2={296}
              y2={midY}
              stroke={C.muted}
              strokeWidth={1.1}
            />
            <line
              x1={252}
              y1={drawTop + 13 * GRID + 18 + 30}
              x2={296}
              y2={midY}
              stroke={C.muted}
              strokeWidth={1.1}
            />
            <rect
              x={296}
              y={midY - 13}
              width={70}
              height={26}
              rx={4}
              fill="var(--card)"
              stroke={C.violet}
              strokeWidth={1.3}
            />
            <text
              x={331}
              y={midY + 3}
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.violet}
              textAnchor="middle"
            >
              match outputs
            </text>

            {/* Emergent attention map (right) */}
            <g>
              {ATTN.map((v, i) => {
                const cx = i % GRID;
                const cy = Math.floor(i / GRID);
                const rx = 376;
                return (
                  <rect
                    key={`attn-${i}`}
                    x={rx + cx * cell}
                    y={drawTop + cy * cell}
                    width={cell}
                    height={cell}
                    fill={attnFill(v)}
                  />
                );
              })}
              <rect
                x={376}
                y={drawTop}
                width={gridPx}
                height={gridPx}
                fill="none"
                stroke={C.ink}
                strokeWidth={1.2}
              />
            </g>
            <text
              x={376 + gridPx / 2}
              y={drawTop - 8}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.ink}
              textAnchor="middle"
            >
              emergent attention
            </text>
            <text
              x={376 + gridPx / 2}
              y={drawTop + gridPx + 16}
              fontFamily={MONO}
              fontSize={9}
              fill={C.coral}
              textAnchor="middle"
            >
              segments object, no labels
            </text>

            <text
              x={16}
              y={H - 78}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.violet}
            >
              self-distillation: student chases an EMA teacher
            </text>
          </g>
        )}

        {/* Caption band (bottom, two lines, each fits W - 24) */}
        <line
          x1={16}
          y1={H - 56}
          x2={W - 16}
          y2={H - 56}
          stroke={C.line}
          strokeWidth={1}
        />
        <text x={16} y={H - 38} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          Reconstruct hidden patches (MAE) or match two views with an
        </text>
        <text x={16} y={H - 24} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          EMA teacher (DINO) - rich features, zero labels.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("mae")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            mode === "mae"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          MAE
        </button>
        <button
          type="button"
          onClick={() => setMode("dino")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            mode === "dino"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          DINO
        </button>

        {mode === "mae" ? (
          <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
            mask ratio
            <input
              type="range"
              min={25}
              max={90}
              step={5}
              value={ratio}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRatio(Number(e.target.value))
              }
              className="w-28 accent-[var(--foreground)]"
            />
            <span className="font-mono tabular-nums">{ratio}% (75% works)</span>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setEma((v: boolean) => !v)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              ema ? { background: C.ink, color: "var(--background)" } : undefined
            }
          >
            {ema ? "EMA update: on" : "EMA update: off"}
          </button>
        )}
      </div>
    </div>
  );
}
