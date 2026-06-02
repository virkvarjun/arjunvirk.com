"use client";

import { useMemo, useState } from "react";
import { C, MONO } from "../frame";

// ViT patch tokenization for SAM's image encoder.
// A 1024x1024 image is sliced into a grid of fixed-size patches; each patch is
// flattened and linearly projected (a stride-P conv) into a 1280-dim token.

const IMG = 1024; // image side in pixels
const EMBED = 1280; // SAM ViT-H embedding dim

type PatchSize = 8 | 16 | 32;
const PATCH_SIZES: PatchSize[] = [8, 16, 32];

// Grid columns drawn in the diagram per patch size (visual only — the real grid
// is IMG/P which is too dense to draw, so we draw a representative grid).
const DRAW_COLS: Record<PatchSize, number> = { 8: 12, 16: 8, 32: 5 };

// Selected patch (row,col) in the *drawn* grid, fixed for determinism.
const SEL_ROW = 2;
const SEL_COL = 3;

export function VisVitPatchTokenization() {
  const [patch, setPatch] = useState<PatchSize>(16);

  // Real token grid side and counts (depend on patch size, not the drawn grid).
  const stats = useMemo(() => {
    const side = IMG / patch; // tokens per row
    const tokens = side * side; // total tokens
    const flatDim = 3 * patch * patch; // flattened patch length (3 channels)
    return { side, tokens, flatDim };
  }, [patch]);

  // --- Layout ---------------------------------------------------------------
  const W = 480;

  const titleY = 22;

  // Image grid box (left).
  const imgX = 18;
  const imgY = 52;
  const imgSide = 168;
  const cols = DRAW_COLS[patch];
  const cell = imgSide / cols;

  // Selected patch rect (in drawn grid).
  const selX = imgX + SEL_COL * cell;
  const selY = imgY + SEL_ROW * cell;

  // Flatten / project column (right).
  const flatX = 300; // x of the flattened-vector strip
  const flatTop = imgY + 6;
  const flatH = 78;
  const flatW = 20;

  const tokTop = flatTop + flatH + 40; // token vector strip top
  const tokH = 56;
  const tokW = 20;

  // Bands below the drawing.
  const drawBottom = imgY + imgSide; // ~220
  const trailY = drawBottom + 50; // shape-trail band
  const readoutY = trailY + 40; // counts / attention band
  const captionY = readoutY + 64; // caption band
  const H = captionY + 18;

  // Cells of the flattened patch strip (representative, 8 rows).
  const flatRows = 8;
  const flatCellH = flatH / flatRows;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Vision Transformer patch tokenization: a 1024 by 1024 image is sliced into a grid of fixed-size patches; each patch is flattened and linearly projected into a 1280-dimensional token embedding, producing a sequence of tokens for a transformer."
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
          ViT Patch Tokenization (SAM's encoder)
        </text>

        {/* --- Image (left) --- */}
        <text
          x={imgX}
          y={imgY - 8}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="start"
          fill={C.muted}
        >
          {`image (3, ${IMG}, ${IMG})`}
        </text>
        <rect
          x={imgX}
          y={imgY}
          width={imgSide}
          height={imgSide}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        {/* Patch grid lines */}
        {Array.from({ length: cols - 1 }, (_, i) => i + 1).map((i) => (
          <g key={`gl-${i}`}>
            <line
              x1={imgX + i * cell}
              y1={imgY}
              x2={imgX + i * cell}
              y2={imgY + imgSide}
              stroke={C.blue}
              strokeWidth={0.6}
              opacity={0.5}
            />
            <line
              x1={imgX}
              y1={imgY + i * cell}
              x2={imgX + imgSide}
              y2={imgY + i * cell}
              stroke={C.blue}
              strokeWidth={0.6}
              opacity={0.5}
            />
          </g>
        ))}
        {/* Selected patch */}
        <rect
          x={selX}
          y={selY}
          width={cell}
          height={cell}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={2}
        />
        {/* patch-size label under image */}
        <text
          x={imgX + imgSide / 2}
          y={imgY + imgSide + 16}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          {`${patch}x${patch} patches · grid ${stats.side}x${stats.side}`}
        </text>

        {/* Connector: patch -> flatten strip */}
        <line
          x1={selX + cell}
          y1={selY + cell / 2}
          x2={flatX - 6}
          y2={flatTop + flatH / 2}
          stroke={C.coral}
          strokeWidth={1.4}
          strokeDasharray="3 3"
        />

        {/* --- Flatten strip --- */}
        <text
          x={flatX + flatW / 2}
          y={flatTop - 10}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.coral}
          fontWeight={600}
        >
          flatten
        </text>
        <rect
          x={flatX}
          y={flatTop}
          width={flatW}
          height={flatH}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.4}
        />
        {Array.from({ length: flatRows - 1 }, (_, i) => i + 1).map((i) => (
          <line
            key={`fr-${i}`}
            x1={flatX}
            y1={flatTop + i * flatCellH}
            x2={flatX + flatW}
            y2={flatTop + i * flatCellH}
            stroke={C.coral}
            strokeWidth={0.6}
            opacity={0.5}
          />
        ))}
        <text
          x={flatX + flatW + 8}
          y={flatTop + flatH / 2 + 3}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="start"
          fill={C.muted}
        >
          {`${stats.flatDim}-dim`}
        </text>

        {/* Connector: flatten -> project -> token */}
        <line
          x1={flatX + flatW / 2}
          y1={flatTop + flatH}
          x2={flatX + flatW / 2}
          y2={tokTop}
          stroke={C.violet}
          strokeWidth={1.4}
        />
        <text
          x={flatX + flatW + 8}
          y={flatTop + flatH + (tokTop - flatTop - flatH) / 2 + 3}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="start"
          fill={C.violet}
          fontWeight={600}
        >
          project
        </text>
        <text
          x={flatX + flatW + 8}
          y={flatTop + flatH + (tokTop - flatTop - flatH) / 2 + 16}
          fontSize={8}
          fontFamily={MONO}
          textAnchor="start"
          fill={C.muted}
        >
          (stride-P conv)
        </text>

        {/* --- Token vector --- */}
        <rect
          x={flatX}
          y={tokTop}
          width={tokW}
          height={tokH}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1.4}
        />
        {Array.from({ length: 5 }, (_, i) => i + 1).map((i) => (
          <line
            key={`tr-${i}`}
            x1={flatX}
            y1={tokTop + (i * tokH) / 6}
            x2={flatX + tokW}
            y2={tokTop + (i * tokH) / 6}
            stroke={C.green}
            strokeWidth={0.6}
            opacity={0.5}
          />
        ))}
        <text
          x={flatX + tokW + 8}
          y={tokTop + tokH / 2 - 3}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="start"
          fill={C.green}
          fontWeight={600}
        >
          token
        </text>
        <text
          x={flatX + tokW + 8}
          y={tokTop + tokH / 2 + 11}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="start"
          fill={C.muted}
        >
          {`${EMBED}-dim`}
        </text>

        {/* --- Shape trail band --- */}
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
        >
          {`(3, ${IMG}, ${IMG})  ->  patch embed  ->  (${EMBED}, ${stats.side}, ${stats.side})`}
        </text>
        <text
          x={W / 2}
          y={trailY + 15}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.green}
          fontWeight={600}
        >
          {`->  sequence of ${stats.tokens.toLocaleString("en-US")} tokens`}
        </text>

        {/* --- Readout band: token count + attention cost --- */}
        <line
          x1={12}
          y1={readoutY - 16}
          x2={W - 12}
          y2={readoutY - 16}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={W / 2}
          y={readoutY}
          fontSize={10}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          {`${stats.tokens.toLocaleString("en-US")} tokens -> ${stats.tokens.toLocaleString("en-US")} x ${stats.tokens.toLocaleString("en-US")} attention`}
        </text>
        <text
          x={W / 2}
          y={readoutY + 15}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.coral}
        >
          {`attention cost grows as tokens^2 = ${stats.tokens.toLocaleString("en-US")}^2`}
        </text>

        {/* --- Caption band --- */}
        <line
          x1={12}
          y1={captionY - 30}
          x2={W - 12}
          y2={captionY - 30}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={W / 2}
          y={captionY - 16}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          Chop the image into 16x16 patches, project each to a token —
        </text>
        <text
          x={W / 2}
          y={captionY - 2}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          4096 tokens for a 1024x1024 image.
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
            value={PATCH_SIZES.indexOf(patch)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPatch(PATCH_SIZES[Number(e.target.value)])
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{`${patch}x${patch}`}</span>
        </label>
        {PATCH_SIZES.map((p: PatchSize) => (
          <button
            key={p}
            type="button"
            onClick={() => setPatch(p)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              patch === p
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            {`${p}x${p}`}
          </button>
        ))}
        <span className="font-mono tabular-nums" style={{ color: C.muted }}>
          {`${stats.tokens.toLocaleString("en-US")} tokens`}
        </span>
      </div>
    </div>
  );
}
