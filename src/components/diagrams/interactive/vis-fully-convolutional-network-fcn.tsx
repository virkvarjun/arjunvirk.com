"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// Fully Convolutional Network (FCN).
// Top row: a classification CNN. Its tail of fully-connected layers can be
// rewritten as convolutions (an FC layer = a conv whose kernel covers the whole
// input feature map). Once "convolutionalized", a fixed 224x224 input yields a
// 7x7x21 grid of class scores instead of a single 21-way vector.
// Bottom row: that coarse 7x7 grid is upsampled 32x back to 224x224 and an
// argmax over the 21 channels gives a per-pixel mask. The mask is blocky because
// the spatial detail was destroyed by the 32x downsampling. Skip connections
// (FCN-16s, FCN-8s) fuse earlier, finer feature maps to sharpen it a little.

// --- hard-coded coarse 7x7 class grid (values are class ids 0..2 for a tiny
// 3-way palette: 0 = background, 1 = "dog", 2 = "edge"). Deterministic. ---
const COARSE = 7;
const COARSE_MAP: readonly number[] = [
  0, 0, 0, 0, 0, 0, 0,
  0, 0, 1, 1, 1, 0, 0,
  0, 1, 1, 1, 1, 1, 0,
  0, 1, 1, 1, 1, 1, 0,
  0, 1, 1, 1, 1, 0, 0,
  0, 0, 1, 1, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0,
];

// A finer 14x14 "ground-truth-ish" version, used when skip connections are on
// so the upsampled mask can show recovered detail. Deterministic.
const FINE = 14;
const FINE_MAP: readonly number[] = (() => {
  // Upsample COARSE 2x then carve a slightly rounder, more detailed shape.
  const out: number[] = new Array(FINE * FINE).fill(0);
  for (let y = 0; y < FINE; y++) {
    for (let x = 0; x < FINE; x++) {
      const cx = x - 6.5;
      const cy = y - 6.5;
      const r = Math.sqrt(cx * cx + cy * cy);
      out[y * FINE + x] = r < 4.2 ? 1 : r < 5.1 ? 2 : 0;
    }
  }
  return out;
})();

// Class colors (deterministic strings, only C.* / theme allowed).
function classFill(c: number): string {
  if (c === 1) return C.blueFill;
  if (c === 2) return C.coralFill;
  return "var(--background)";
}
function classStroke(c: number): string {
  if (c === 1) return C.blue;
  if (c === 2) return C.coral;
  return C.line;
}

export function VisFcn() {
  // Mode: "fc" = classifier with FC head; "conv" = fully convolutional.
  const [mode, setMode] = useState<"fc" | "conv">("conv");
  // Upsample progress 0..1 (drives how the 7x7 grid grows to full res).
  const [up, setUp] = useState<number>(1);
  // Skip connections on/off (FCN-16s / FCN-8s sharpening).
  const [skip, setSkip] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(false);
  const frame = useRef<number>(0);

  // Animate the upsample when playing.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      frame.current += 1;
      const t = (frame.current % 60) / 59; // 0..1 ramp
      setUp(t);
    }, 40);
    return () => clearInterval(id);
  }, [playing]);

  const isConv = mode === "conv";

  // --- layout ---
  const W = 560;
  const H = 460;
  const M = 14; // margin

  // Bands.
  const titleY = 24;
  const subY = 42;

  // Top pipeline row (the CNN + convolutionalized head).
  const topY = 96; // vertical center of top row
  const imgX = M + 4;
  const imgPx = 56;
  const imgY = topY - imgPx / 2;

  // Conv stack blocks (downsampling tower).
  const stackX = imgX + imgPx + 18;
  const blocks: { w: number; h: number; label: string }[] = [
    { w: 16, h: 48, label: "112" },
    { w: 14, h: 38, label: "56" },
    { w: 12, h: 28, label: "28" },
    { w: 11, h: 20, label: "14" },
  ];
  let bx = stackX;
  const blockGeom = blocks.map((b) => {
    const g = { x: bx, y: topY - b.h / 2, w: b.w, h: b.h, label: b.label };
    bx += b.w + 8;
    return g;
  });
  const lastBlock = blockGeom[blockGeom.length - 1];
  const headX = lastBlock.x + lastBlock.w + 18;

  // The "head": either FC layers (vector) or a 7x7x21 conv grid.
  const headBoxW = 92;
  const headBoxX = headX;
  const headBoxH = 64;
  const headBoxY = topY - headBoxH / 2;

  // Bottom row: upsample 7x7 -> 224 mask.
  const botY = 300; // vertical center of bottom row
  const smallPx = 7; // px per coarse cell at small size
  const smallGridX = M + 4;
  const smallGridSize = COARSE * smallPx; // 49
  const smallGridY = botY - smallGridSize / 2;

  // Big mask grid.
  const bigSize = 112;
  const bigX = W - M - bigSize - 4;
  const bigY = botY - bigSize / 2;

  // Effective render resolution of the mask: interpolate between coarse (7)
  // and full. Skip connections let it reach the finer 14-grid; otherwise it
  // stays blocky (7-grid). `up` scales how much of bigSize is filled.
  const targetGrid = skip ? FINE : COARSE;
  const targetMap = skip ? FINE_MAP : COARSE_MAP;
  // Number of cells currently shown along each axis as upsample progresses.
  const shownCells =
    Math.max(2, Math.round(2 + (targetGrid - 2) * up)) | 0;
  const filled = bigSize * Math.max(0.18, up);
  const cellPx = filled / shownCells;
  const maskOriginX = bigX + (bigSize - filled) / 2;
  const maskOriginY = bigY + (bigSize - filled) / 2;

  // Sample the target map at a given (cx,cy) in shownCells space.
  function sampleMask(cx: number, cy: number): number {
    const sx = Math.min(targetGrid - 1, Math.floor((cx / shownCells) * targetGrid));
    const sy = Math.min(targetGrid - 1, Math.floor((cy / shownCells) * targetGrid));
    return targetMap[sy * targetGrid + sx];
  }

  const pct = Math.round(up * 100);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Fully convolutional network: replace the classifier's fully-connected head with convolutions to output a 7x7 score grid, then upsample 32x to a coarse per-pixel mask"
      >
        {/* Title band */}
        <text x={M} y={titleY} fontFamily={MONO} fontSize={13} fill={C.ink}>
          Fully Convolutional Network (FCN)
        </text>
        <text x={M} y={subY} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          FC head = conv with input-sized kernel &rarr; spatial scores, not one label
        </text>

        {/* ---------- TOP ROW: CNN + convolutionalized head ---------- */}
        {/* input image */}
        <rect
          x={imgX}
          y={imgY}
          width={imgPx}
          height={imgPx}
          fill={C.blueFill}
          stroke={C.ink}
          strokeWidth={1.2}
        />
        <text
          x={imgX + imgPx / 2}
          y={imgY - 6}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
          textAnchor="middle"
        >
          224x224
        </text>
        <text
          x={imgX + imgPx / 2}
          y={imgY + imgPx + 13}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          input
        </text>

        {/* downsampling conv tower */}
        {blockGeom.map((g, i) => (
          <g key={`blk-${i}`}>
            <rect
              x={g.x}
              y={g.y}
              width={g.w}
              height={g.h}
              fill={C.grid}
              stroke={C.line}
              strokeWidth={1}
            />
            <text
              x={g.x + g.w / 2}
              y={topY + g.h / 2 + 11}
              fontFamily={MONO}
              fontSize={7.5}
              fill={C.muted}
              textAnchor="middle"
            >
              {g.label}
            </text>
          </g>
        ))}
        {/* arrow from image into tower */}
        <line
          x1={imgX + imgPx}
          y1={topY}
          x2={stackX - 4}
          y2={topY}
          stroke={C.muted}
          strokeWidth={1.2}
        />
        <text
          x={(imgX + imgPx + stackX) / 2}
          y={topY - 34}
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
          textAnchor="middle"
        >
          conv +
        </text>
        <text
          x={(imgX + imgPx + stackX) / 2}
          y={topY - 24}
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
          textAnchor="middle"
        >
          pool
        </text>

        {/* arrow from tower into head */}
        <line
          x1={lastBlock.x + lastBlock.w}
          y1={topY}
          x2={headBoxX - 4}
          y2={topY}
          stroke={C.muted}
          strokeWidth={1.2}
        />

        {/* head box: FC vector OR 7x7 conv grid */}
        {isConv ? (
          <g>
            {/* 7x7 score grid (depth-21 implied) */}
            {COARSE_MAP.map((c, i) => {
              const gx = i % COARSE;
              const gy = Math.floor(i / COARSE);
              const cs = 8;
              const ox = headBoxX + (headBoxW - COARSE * cs) / 2;
              const oy = headBoxY + (headBoxH - COARSE * cs) / 2;
              return (
                <rect
                  key={`hg-${i}`}
                  x={ox + gx * cs}
                  y={oy + gy * cs}
                  width={cs}
                  height={cs}
                  fill={classFill(c)}
                  stroke={classStroke(c)}
                  strokeWidth={0.6}
                />
              );
            })}
            <rect
              x={headBoxX}
              y={headBoxY}
              width={headBoxW}
              height={headBoxH}
              fill="none"
              stroke={C.green}
              strokeWidth={1.4}
            />
            <text
              x={headBoxX + headBoxW / 2}
              y={headBoxY + headBoxH + 12}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.green}
              textAnchor="middle"
            >
              7x7x21 scores
            </text>
            <text
              x={headBoxX + headBoxW / 2}
              y={headBoxY + headBoxH + 25}
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.green}
              textAnchor="middle"
            >
              1x1 conv head
            </text>
          </g>
        ) : (
          <g>
            {/* FC layers as stacked node columns -> single vector */}
            {[0, 1].map((col) => {
              const cxp = headBoxX + 14 + col * 26;
              return (
                <g key={`fc-${col}`}>
                  {[0, 1, 2, 3].map((n) => (
                    <circle
                      key={`fcn-${col}-${n}`}
                      cx={cxp}
                      cy={headBoxY + 12 + n * 13}
                      r={3.4}
                      fill={C.coralFill}
                      stroke={C.coral}
                      strokeWidth={1}
                    />
                  ))}
                </g>
              );
            })}
            {/* single output vector */}
            <rect
              x={headBoxX + headBoxW - 18}
              y={headBoxY + 10}
              width={10}
              height={headBoxH - 20}
              fill={C.coralFill}
              stroke={C.coral}
              strokeWidth={1.2}
            />
            <text
              x={headBoxX + headBoxW / 2}
              y={headBoxY + headBoxH + 12}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.coral}
              textAnchor="middle"
            >
              FC layers
            </text>
            <text
              x={headBoxX + headBoxW / 2}
              y={headBoxY + headBoxH + 25}
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.coral}
              textAnchor="middle"
            >
              1 label vector
            </text>
          </g>
        )}

        {/* convolutionalize annotation between head styles */}
        <text
          x={headBoxX + headBoxW / 2}
          y={topY - 40}
          fontFamily={MONO}
          fontSize={8}
          fill={isConv ? C.green : C.coral}
          textAnchor="middle"
        >
          {isConv ? "convolutionalized" : "classifier head"}
        </text>

        {/* divider between rows */}
        <line
          x1={M}
          y1={184}
          x2={W - M}
          y2={184}
          stroke={C.line}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={M}
          y={202}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          Upsample the score grid back to input resolution &rarr; per-pixel mask
        </text>

        {/* ---------- BOTTOM ROW: upsample 7x7 -> mask ---------- */}
        {/* small 7x7 grid */}
        {COARSE_MAP.map((c, i) => {
          const gx = i % COARSE;
          const gy = Math.floor(i / COARSE);
          return (
            <rect
              key={`sm-${i}`}
              x={smallGridX + gx * smallPx}
              y={smallGridY + gy * smallPx}
              width={smallPx}
              height={smallPx}
              fill={classFill(c)}
              stroke={classStroke(c)}
              strokeWidth={0.5}
            />
          );
        })}
        <rect
          x={smallGridX}
          y={smallGridY}
          width={smallGridSize}
          height={smallGridSize}
          fill="none"
          stroke={C.ink}
          strokeWidth={1.1}
        />
        <text
          x={smallGridX + smallGridSize / 2}
          y={smallGridY - 6}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
          textAnchor="middle"
        >
          7x7
        </text>
        <text
          x={smallGridX + smallGridSize / 2}
          y={smallGridY + smallGridSize + 13}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          scores
        </text>

        {/* upsample arrow */}
        <line
          x1={smallGridX + smallGridSize + 6}
          y1={botY}
          x2={bigX - 8}
          y2={botY}
          stroke={C.muted}
          strokeWidth={1.2}
        />
        <text
          x={(smallGridX + smallGridSize + bigX) / 2}
          y={botY - 16}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          {skip ? "upsample + skips" : "32x upsample"}
        </text>
        <text
          x={(smallGridX + smallGridSize + bigX) / 2}
          y={botY + 22}
          fontFamily={MONO}
          fontSize={8.5}
          fill={skip ? C.green : C.muted}
          textAnchor="middle"
        >
          argmax
        </text>

        {/* big upsampled mask (blocky) */}
        <rect
          x={bigX}
          y={bigY}
          width={bigSize}
          height={bigSize}
          fill="var(--background)"
          stroke={C.ink}
          strokeWidth={1.2}
        />
        {Array.from({ length: shownCells }).flatMap((_, cy) =>
          Array.from({ length: shownCells }).map((__, cx) => {
            const c = sampleMask(cx, cy);
            if (c === 0) return null;
            return (
              <rect
                key={`big-${cx}-${cy}`}
                x={maskOriginX + cx * cellPx}
                y={maskOriginY + cy * cellPx}
                width={cellPx + 0.5}
                height={cellPx + 0.5}
                fill={classFill(c)}
              />
            );
          }),
        )}
        <text
          x={bigX + bigSize / 2}
          y={bigY - 6}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
          textAnchor="middle"
        >
          224x224 mask
        </text>
        <text
          x={bigX + bigSize / 2}
          y={bigY + bigSize + 13}
          fontFamily={MONO}
          fontSize={8.5}
          fill={skip ? C.green : C.coral}
          textAnchor="middle"
        >
          {skip ? "FCN-8s: sharper" : "coarse / blocky"}
        </text>

        {/* readout band */}
        <text
          x={M}
          y={H - 56}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          upsample {pct}% &middot; effective grid {shownCells}x{shownCells} &middot;{" "}
          {skip ? "skips: FCN-16s/8s fuse finer maps" : "no skips: detail already gone"}
        </text>

        {/* caption band (split to fit width) */}
        <text
          x={M}
          y={H - 32}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.ink}
        >
          Turn the classifier fully convolutional, upsample to a mask,
        </text>
        <text
          x={M}
          y={H - 18}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.ink}
        >
          it works, but coarse, because the detail was already gone.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("fc")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={!isConv ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          FC classifier
        </button>
        <button
          type="button"
          onClick={() => setMode("conv")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={isConv ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          fully convolutional
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p: boolean) => !p)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={playing ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {playing ? "stop" : "animate upsample"}
        </button>
        <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
          upsample
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(up * 100)}
            onChange={(e) => {
              setPlaying(false);
              setUp(Number(e.target.value) / 100);
            }}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{pct}%</span>
        </label>
        <button
          type="button"
          onClick={() => setSkip((s: boolean) => !s)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={skip ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          skip connections
        </button>
      </div>
    </div>
  );
}
