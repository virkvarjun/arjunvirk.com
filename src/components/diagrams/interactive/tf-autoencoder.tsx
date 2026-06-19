"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Autoencoder.
// x (image grid) -> Encoder f (narrowing trapezoid) -> latent code z (a few
// nodes, much smaller than x) -> Decoder g (widening trapezoid) -> x_hat
// (reconstruction). A reconstruction loss ||x - x_hat||^2 trains both halves.
// Shrinking z forces the network to keep only the essentials; growing z toward
// the input size makes reconstruction near-perfect but the code "learns nothing".

// An 8x8 grayscale target image (0..1), hard-coded for determinism.
// It depicts a rough diagonal blob so detail loss is visible.
const GRID = 8;
const X_PIXELS: readonly number[] = [
  0.1, 0.1, 0.2, 0.3, 0.3, 0.2, 0.1, 0.1,
  0.1, 0.3, 0.6, 0.7, 0.6, 0.4, 0.2, 0.1,
  0.2, 0.6, 0.9, 0.95, 0.8, 0.6, 0.3, 0.1,
  0.3, 0.7, 0.95, 1.0, 0.95, 0.7, 0.4, 0.2,
  0.2, 0.6, 0.85, 0.95, 0.9, 0.65, 0.35, 0.15,
  0.15, 0.4, 0.6, 0.7, 0.65, 0.45, 0.25, 0.1,
  0.1, 0.2, 0.35, 0.45, 0.4, 0.25, 0.15, 0.1,
  0.1, 0.1, 0.15, 0.2, 0.2, 0.15, 0.1, 0.1,
];

const FULL_DIM = GRID * GRID; // 64 "input pixels"

// Deterministic reconstruction model: with a latent of size `z`, the network can
// keep roughly z principal blocks of the image. We emulate this by averaging the
// image into a coarse grid of bxb blocks (b grows as z shrinks), a small z gives
// a blurry, blocky reconstruction; a large z reproduces fine detail.
function reconstruct(z: number): number[] {
  // Map latent size 1..64 to a block size 8..1 (more compression -> bigger blocks).
  // z>=49 -> block 1 (near-perfect); z<=1 -> block 8 (single average).
  let block: number;
  if (z >= 49) block = 1;
  else if (z >= 25) block = 2;
  else if (z >= 12) block = 3;
  else if (z >= 6) block = 4;
  else if (z >= 3) block = 6;
  else block = 8;

  const out: number[] = new Array(FULL_DIM).fill(0);
  for (let by = 0; by < GRID; by += block) {
    for (let bx = 0; bx < GRID; bx += block) {
      let sum = 0;
      let count = 0;
      for (let dy = 0; dy < block && by + dy < GRID; dy++) {
        for (let dx = 0; dx < block && bx + dx < GRID; dx++) {
          sum += X_PIXELS[(by + dy) * GRID + (bx + dx)];
          count++;
        }
      }
      const avg = sum / count;
      for (let dy = 0; dy < block && by + dy < GRID; dy++) {
        for (let dx = 0; dx < block && bx + dx < GRID; dx++) {
          out[(by + dy) * GRID + (bx + dx)] = avg;
        }
      }
    }
  }
  return out;
}

// Mean squared error between target and reconstruction.
function mse(recon: number[]): number {
  let s = 0;
  for (let i = 0; i < FULL_DIM; i++) {
    const d = X_PIXELS[i] - recon[i];
    s += d * d;
  }
  return s / FULL_DIM;
}

// Render an image grid as nested <rect>s. Value 0..1 -> light..ink.
function pixelFill(v: number): string {
  // Blend background (light) toward ink by darkening; use opacity via rgba-like
  // grays. We pick from a small fixed ramp so only deterministic strings appear.
  const g = Math.round(245 - v * 200); // 245 (light) -> 45 (dark)
  return `rgb(${g},${g},${g})`;
}

export function TfAutoencoder() {
  const [z, setZ] = useState<number>(4);

  const recon = reconstruct(z);
  const err = mse(recon);

  const tooLarge = z >= 49;
  const compressionPct = Math.round((1 - z / FULL_DIM) * 100);

  // --- layout ---
  const W = 480;
  const H = 360;
  const cellInput = 8; // px per image pixel
  const gridPx = cellInput * GRID; // 64

  // Vertical center for the pipeline.
  const midY = 168;

  // Input image (left).
  const inX = 16;
  const inY = midY - gridPx / 2;

  // Encoder trapezoid: from input column to latent column.
  const encX1 = inX + gridPx + 8; // right edge of input
  const encX2 = 222; // left edge of latent
  const inHalf = gridPx / 2; // 32

  // Latent code column (center).
  const latX = encX2;
  const latW = 18;
  const latNodes = Math.min(z, 10); // cap drawn nodes at 10 for legibility
  const latNodeR = 5;
  const latNodeGap = 14;
  const latStackH = latNodes * latNodeGap;
  const latHalf = Math.max(10, latStackH / 2);

  // Decoder trapezoid: latent to reconstruction.
  const decX1 = latX + latW;
  const decX2 = 360; // left edge of reconstruction

  // Reconstruction image (right).
  const outX = decX2;
  const outY = midY - gridPx / 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Autoencoder: input image is squeezed through a small latent code and rebuilt; smaller codes lose detail"
      >
        {/* Title band */}
        <text x={16} y={24} fontFamily={MONO} fontSize={13} fill={C.ink}>
          Autoencoder
        </text>
        <text x={16} y={42} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          x &rarr; encode f &rarr; latent z &rarr; decode g &rarr; x&#770;
        </text>

        {/* Encoder trapezoid (narrowing) */}
        <polygon
          points={`${encX1},${midY - inHalf} ${encX2},${midY - latHalf} ${encX2},${midY + latHalf} ${encX1},${midY + inHalf}`}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        {/* Decoder trapezoid (widening) */}
        <polygon
          points={`${decX1},${midY - latHalf} ${decX2},${midY - inHalf} ${decX2},${midY + inHalf} ${decX1},${midY + latHalf}`}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1.4}
        />

        {/* Input image grid */}
        <g>
          {X_PIXELS.map((v, i) => {
            const cx = i % GRID;
            const cy = Math.floor(i / GRID);
            return (
              <rect
                key={`in-${i}`}
                x={inX + cx * cellInput}
                y={inY + cy * cellInput}
                width={cellInput}
                height={cellInput}
                fill={pixelFill(v)}
              />
            );
          })}
          <rect
            x={inX}
            y={inY}
            width={gridPx}
            height={gridPx}
            fill="none"
            stroke={C.ink}
            strokeWidth={1.2}
          />
        </g>
        <text
          x={inX + gridPx / 2}
          y={inY - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
        >
          x
        </text>
        <text
          x={inX + gridPx / 2}
          y={inY + gridPx + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          784-px input
        </text>

        {/* Encoder label */}
        <text
          x={(encX1 + encX2) / 2}
          y={midY - inHalf - 12}
          fontFamily={MONO}
          fontSize={10}
          fill={C.blue}
          textAnchor="middle"
        >
          encoder f
        </text>

        {/* Latent code nodes */}
        <g>
          {Array.from({ length: latNodes }).map((_, i) => {
            const ny = midY - latStackH / 2 + latNodeGap / 2 + i * latNodeGap;
            return (
              <circle
                key={`z-${i}`}
                cx={latX + latW / 2}
                cy={ny}
                r={latNodeR}
                fill={tooLarge ? C.coralFill : C.violet}
                stroke={tooLarge ? C.coral : C.violet}
                strokeWidth={1.2}
              />
            );
          })}
        </g>
        <text
          x={latX + latW / 2}
          y={midY - latHalf - 12}
          fontFamily={MONO}
          fontSize={10}
          fill={tooLarge ? C.coral : C.violet}
          textAnchor="middle"
        >
          z = {z}
        </text>
        <text
          x={latX + latW / 2}
          y={midY + latHalf + 16}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          latent
        </text>
        {z > latNodes && (
          <text
            x={latX + latW / 2}
            y={midY + latHalf + 28}
            fontFamily={MONO}
            fontSize={8}
            fill={C.muted}
            textAnchor="middle"
          >
            ({z} dims)
          </text>
        )}

        {/* Decoder label */}
        <text
          x={(decX1 + decX2) / 2}
          y={midY - inHalf - 12}
          fontFamily={MONO}
          fontSize={10}
          fill={C.green}
          textAnchor="middle"
        >
          decoder g
        </text>

        {/* Reconstruction image grid */}
        <g>
          {recon.map((v, i) => {
            const cx = i % GRID;
            const cy = Math.floor(i / GRID);
            return (
              <rect
                key={`out-${i}`}
                x={outX + cx * cellInput}
                y={outY + cy * cellInput}
                width={cellInput}
                height={cellInput}
                fill={pixelFill(v)}
              />
            );
          })}
          <rect
            x={outX}
            y={outY}
            width={gridPx}
            height={gridPx}
            fill="none"
            stroke={C.ink}
            strokeWidth={1.2}
          />
        </g>
        <text
          x={outX + gridPx / 2}
          y={outY - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
        >
          x&#770;
        </text>
        <text
          x={outX + gridPx / 2}
          y={outY + gridPx + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          reconstruction
        </text>

        {/* Loss feedback band (below the drawing) */}
        <line
          x1={inX + gridPx / 2}
          y1={inY + gridPx + 26}
          x2={inX + gridPx / 2}
          y2={inY + gridPx + 40}
          stroke={C.coral}
          strokeWidth={1.2}
        />
        <line
          x1={outX + gridPx / 2}
          y1={outY + gridPx + 26}
          x2={outX + gridPx / 2}
          y2={outY + gridPx + 40}
          stroke={C.coral}
          strokeWidth={1.2}
        />
        <line
          x1={inX + gridPx / 2}
          y1={inY + gridPx + 40}
          x2={outX + gridPx / 2}
          y2={outY + gridPx + 40}
          stroke={C.coral}
          strokeWidth={1.2}
        />
        <rect
          x={W / 2 - 78}
          y={inY + gridPx + 30}
          width={156}
          height={20}
          rx={3}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.2}
        />
        <text
          x={W / 2}
          y={inY + gridPx + 44}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.coral}
          textAnchor="middle"
        >
          loss = ||x &minus; x&#770;||&sup2; = {err.toFixed(3)}
        </text>

        {/* Readout band (bottom) */}
        <text
          x={16}
          y={H - 30}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          compression: {compressionPct}% smaller than the {FULL_DIM}-dim input
        </text>
        <text
          x={16}
          y={H - 14}
          fontFamily={MONO}
          fontSize={9.5}
          fill={tooLarge ? C.coral : err > 0.02 ? C.violet : C.green}
        >
          {tooLarge
            ? "z ~ input size: near-perfect copy, but learns nothing"
            : err > 0.02
              ? "tight code: detail is dropped, only essentials survive"
              : "balanced code: keeps the structure that matters"}
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
          latent z
          <input
            type="range"
            min={1}
            max={FULL_DIM}
            step={1}
            value={z}
            onChange={(e) => setZ(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{z}</span>
        </label>
        <span className="font-mono text-[var(--muted)]">
          squeeze the input through a small code and rebuild it
        </span>
      </div>
    </div>
  );
}
