"use client";

import { useMemo, useState } from "react";
import { C, MONO } from "../frame";

// --- Patch-size options ---------------------------------------------------
// A 224x224 image split into PxP patches => (224/P)^2 patches, each P*P*3 long.
type PatchSize = 8 | 16 | 32;

const PATCH_OPTIONS: { size: PatchSize; grid: number; count: number }[] = [
  { size: 8, grid: 28, count: 784 },
  { size: 16, grid: 14, count: 196 },
  { size: 32, grid: 7, count: 49 },
];

const IMG = 224; // logical image side
const D = 768; // token embedding dimension

// A small deterministic palette so each patch gets a stable "color", no RNG.
// Cycles through soft fills/strokes from the C.* palette.
const PATCH_COLORS: { fill: string; stroke: string }[] = [
  { fill: C.blueFill, stroke: C.blue },
  { fill: C.coralFill, stroke: C.coral },
  { fill: C.greenFill, stroke: C.green },
];

export function VisImageToPatchTokens() {
  const [sizeIdx, setSizeIdx] = useState<number>(1); // default 16x16
  const [hover, setHover] = useState<number | null>(null); // hovered patch index

  const opt = PATCH_OPTIONS[sizeIdx];
  const pixels = opt.size * opt.size * 3; // flattened length per patch

  // The selected patch to "pull out": the hovered one, else a fixed example.
  const exampleIdx = useMemo<number>(() => {
    const mid = Math.floor(opt.grid / 2);
    return mid * opt.grid + mid;
  }, [opt.grid]);
  const selected = hover ?? exampleIdx;
  const selRow = Math.floor(selected / opt.grid);
  const selCol = selected % opt.grid;

  // --- Layout ---------------------------------------------------------------
  const W = 480;

  const titleY = 22;

  // Image block (left)
  const imgX = 24;
  const imgY = 56;
  const imgSide = 176;
  const cell = imgSide / opt.grid; // on-screen cell size

  // Right column anchors
  const colX = imgX + imgSide + 40; // left edge of the right column

  // Flatten strip (a short horizontal bar of sample pixel cells)
  const stripY = imgY + 6;
  const stripCells = 8; // visual sample count for the flattened vector
  const stripCellW = 18;
  const stripX = colX;

  // Token column (the projected D-dim embedding)
  const tokenY = stripY + 70;
  const tokenCells = 6;
  const tokenCellH = 13;
  const tokenX = colX + 8;

  // Bands below the drawing
  const imgBottom = imgY + imgSide;
  const trailY = imgBottom + 34; // shape-trail band
  const captionY = trailY + 56; // caption band
  const H = captionY + 24;

  const selColor = PATCH_COLORS[selected % PATCH_COLORS.length];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="An image is split into a grid of patches; one patch is flattened and linearly projected into a token embedding, producing the patch-token sequence used by a Vision Transformer."
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={titleY}
          fontSize={12}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          Image to Patch Tokens
        </text>

        {/* Image label */}
        <text
          x={imgX}
          y={imgY - 10}
          fontSize={9}
          fontFamily={MONO}
          fill={C.muted}
        >
          image (3, {IMG}, {IMG})
        </text>

        {/* Image outer frame */}
        <rect
          x={imgX}
          y={imgY}
          width={imgSide}
          height={imgSide}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.2}
        />

        {/* Patch grid */}
        {Array.from({ length: opt.grid * opt.grid }).map((_, i) => {
          const r = Math.floor(i / opt.grid);
          const c = i % opt.grid;
          const pc = PATCH_COLORS[i % PATCH_COLORS.length];
          const isSel = i === selected;
          return (
            <rect
              key={`patch-${i}`}
              x={imgX + c * cell}
              y={imgY + r * cell}
              width={cell}
              height={cell}
              fill={isSel ? pc.fill : "var(--card)"}
              stroke={isSel ? pc.stroke : C.grid}
              strokeWidth={isSel ? 1.6 : 0.6}
              opacity={isSel ? 1 : 0.9}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {/* Caption under image: grid + patch size */}
        <text
          x={imgX + imgSide / 2}
          y={imgBottom + 16}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
        >
          {opt.grid}x{opt.grid} grid of {opt.size}x{opt.size} = {opt.count}{" "}
          patches
        </text>

        {/* Arrow: selected patch -> flatten strip */}
        <line
          x1={imgX + selCol * cell + cell}
          y1={imgY + selRow * cell + cell / 2}
          x2={stripX - 8}
          y2={stripY + stripCellW / 2}
          stroke={selColor.stroke}
          strokeWidth={1.3}
        />
        <polygon
          points={`${stripX - 8},${stripY + stripCellW / 2} ${stripX - 14},${stripY + stripCellW / 2 - 4} ${stripX - 14},${stripY + stripCellW / 2 + 4}`}
          fill={selColor.stroke}
        />

        {/* Flatten strip label */}
        <text
          x={stripX}
          y={stripY - 8}
          fontSize={9}
          fontFamily={MONO}
          fill={C.muted}
        >
          flatten → {pixels} pixels
        </text>

        {/* Flatten strip: sample cells then an ellipsis */}
        {Array.from({ length: stripCells }).map((_, i) => (
          <rect
            key={`strip-${i}`}
            x={stripX + i * stripCellW}
            y={stripY}
            width={stripCellW - 2}
            height={stripCellW}
            fill={selColor.fill}
            stroke={selColor.stroke}
            strokeWidth={0.8}
          />
        ))}
        <text
          x={stripX + stripCells * stripCellW + 6}
          y={stripY + stripCellW - 5}
          fontSize={11}
          fontFamily={MONO}
          fill={C.muted}
        >
          …
        </text>

        {/* Projection arrow + label between strip and token */}
        <line
          x1={stripX + 20}
          y1={stripY + stripCellW + 6}
          x2={tokenX + tokenCellH}
          y2={tokenY - 8}
          stroke={C.muted}
          strokeWidth={1.2}
        />
        <polygon
          points={`${tokenX + tokenCellH},${tokenY - 8} ${tokenX + tokenCellH - 5},${tokenY - 14} ${tokenX + tokenCellH + 3},${tokenY - 13}`}
          fill={C.muted}
        />
        <text
          x={stripX + 92}
          y={stripY + stripCellW + 26}
          fontSize={9}
          fontFamily={MONO}
          fill={C.violet}
          fontWeight={600}
        >
          linear projection
        </text>
        <text
          x={stripX + 92}
          y={stripY + stripCellW + 40}
          fontSize={8.5}
          fontFamily={MONO}
          fill={C.muted}
        >
          W: {pixels}×{D}
        </text>

        {/* Token label */}
        <text
          x={tokenX}
          y={tokenY - 14}
          fontSize={9}
          fontFamily={MONO}
          fill={C.muted}
        >
          token ({D}-dim)
        </text>

        {/* Token: vertical stack of cells (the embedding) */}
        {Array.from({ length: tokenCells }).map((_, i) => (
          <rect
            key={`tok-${i}`}
            x={tokenX}
            y={tokenY + i * tokenCellH}
            width={26}
            height={tokenCellH - 1}
            fill={C.violet}
            opacity={0.35 + (i / tokenCells) * 0.5}
            stroke={C.violet}
            strokeWidth={0.6}
          />
        ))}
        <text
          x={tokenX + 13}
          y={tokenY + tokenCells * tokenCellH + 12}
          fontSize={11}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          ⋮
        </text>

        {/* Selected-patch readout */}
        <text
          x={colX}
          y={tokenY + tokenCells * tokenCellH + 30}
          fontSize={9}
          fontFamily={MONO}
          fill={C.ink}
        >
          patch ({selRow},{selCol}) of {opt.count}
        </text>

        {/* --- Shape-trail band --------------------------------------- */}
        <line
          x1={12}
          y1={trailY - 16}
          x2={W - 12}
          y2={trailY - 16}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={W / 2}
          y={trailY}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          (3,{IMG},{IMG}) → {opt.count} patches → flatten ({opt.count},{pixels})
        </text>
        <text
          x={W / 2}
          y={trailY + 16}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.violet}
          fontWeight={600}
        >
          → linear project → ({opt.count}, {D}) token embeddings
        </text>
        <text
          x={W / 2}
          y={trailY + 32}
          fontSize={8.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          attention cost ∝ tokens², smaller patches cost much more
        </text>

        {/* --- Caption band ------------------------------------------- */}
        <line
          x1={12}
          y1={captionY - 18}
          x2={W - 12}
          y2={captionY - 18}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={W / 2}
          y={captionY - 4}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          Chop into 16×16 patches, flatten, linearly project, the
        </text>
        <text
          x={W / 2}
          y={captionY + 10}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          image is now a 196-token sequence (also how SAM&apos;s encoder sees it).
        </text>
      </svg>

      {/* Controls row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono">
          <span style={{ color: C.muted }}>patch size</span>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={sizeIdx}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSizeIdx(Number(e.target.value));
              setHover(null);
            }}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">
            {opt.size}×{opt.size}
          </span>
        </label>
        <span className="font-mono tabular-nums" style={{ color: C.muted }}>
          {opt.count} tokens
        </span>
      </div>
    </div>
  );
}
