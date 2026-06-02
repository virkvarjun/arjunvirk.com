"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// A ViT splits a 224x224 image into (img/patch)^2 non-overlapping patches, each
// becoming one token. Self-attention builds an N x N attention matrix, so its
// compute scales with N^2 = (img/patch)^4. Halving the patch quadruples N and
// raises attention cost ~16x. All figures are hard-coded for determinism.
type PatchOption = {
  patch: number; // patch edge in pixels
  grid: number; // patches per side = 224 / patch
  tokens: number; // N = grid^2
  costX: number; // attention cost relative to patch=16 (N=196), N^2 ratio
  costLabel: string; // pre-formatted multiplier string
};

const IMG = 224;

const OPTIONS: PatchOption[] = [
  { patch: 32, grid: 7, tokens: 49, costX: 0.0625, costLabel: "1/16x" },
  { patch: 16, grid: 14, tokens: 196, costX: 1, costLabel: "1x" },
  { patch: 8, grid: 28, tokens: 784, costX: 16, costLabel: "~16x" },
  { patch: 4, grid: 56, tokens: 3136, costX: 256, costLabel: "~256x" },
];

const DEFAULT_INDEX = 1; // patch = 16, the ViT default / baseline

export function VisPatchSizeCost() {
  // Index into OPTIONS, driven by both the slider and the patch buttons.
  const [sel, setSel] = useState<number>(2);

  const o = OPTIONS[sel];

  // --- geometry ---
  const W = 480;
  const H = 470;

  // Left panel: the patch grid drawn over a fixed image square.
  const gridX = 28;
  const gridY = 96;
  const gridSize = 150;
  const cell = gridSize / o.grid;

  // Right panel: the N x N attention matrix as a growing square.
  // Its drawn edge scales with sqrt(N) so AREA tracks N (token count); we cap so
  // the largest case still fits with margin.
  const attnMaxEdge = 150;
  const attnRefTokens = OPTIONS[OPTIONS.length - 1].tokens; // largest N
  const attnEdge = attnMaxEdge * Math.sqrt(o.tokens / attnRefTokens);
  const attnCx = 360;
  const attnBottom = gridY + gridSize; // share baseline with the image grid
  const attnX = attnCx - attnEdge / 2;
  const attnY = attnBottom - attnEdge;

  // Cost bar band (relative attention cost, log-ish via fixed stops).
  const barX = 28;
  const barW = 424;
  const barY = 360;
  const barH = 16;
  // Map cost multiplier onto bar width using log2 so 1/16..256 spreads evenly.
  const logMin = Math.log2(OPTIONS[0].costX); // -4
  const logMax = Math.log2(OPTIONS[OPTIONS.length - 1].costX); // 8
  const logCur = Math.log2(o.costX);
  const barFill = ((logCur - logMin) / (logMax - logMin)) * barW;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Smaller ViT patches produce more tokens and grow self-attention cost quadratically"
      >
        {/* ---------- Title band ---------- */}
        <text x={16} y={22} fontSize={13} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          Why Patch Size Matters: Quadratic Attention Cost
        </text>
        <text x={16} y={38} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          224x224 image, patch {o.patch}x{o.patch} grid {o.grid}x{o.grid}
        </text>

        {/* ---------- Readout band (its own clear strip) ---------- */}
        <line x1={16} y1={50} x2={464} y2={50} stroke={C.line} strokeWidth={1} />
        <text x={16} y={68} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          tokens N
        </text>
        <text x={86} y={68} fontSize={11} fill={C.blue} fontFamily={MONO} fontWeight={700}>
          {o.tokens}
        </text>
        <text x={150} y={68} fontSize={9} fill={C.muted} fontFamily={MONO}>
          = (224/{o.patch})^2
        </text>
        <text x={272} y={68} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          attn cost
        </text>
        <text x={350} y={68} fontSize={11} fill={C.coral} fontFamily={MONO} fontWeight={700}>
          {o.costLabel}
        </text>

        {/* ---------- Left section header ---------- */}
        <text x={gridX} y={88} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          patches = tokens
        </text>

        {/* image square */}
        <rect
          x={gridX}
          y={gridY}
          width={gridSize}
          height={gridSize}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        {/* patch grid lines */}
        {Array.from({ length: o.grid - 1 }, (_, i) => {
          const p = gridX + (i + 1) * cell;
          return (
            <line
              key={`gv-${i}`}
              x1={p}
              y1={gridY}
              x2={p}
              y2={gridY + gridSize}
              stroke={C.blue}
              strokeWidth={0.5}
              opacity={0.6}
            />
          );
        })}
        {Array.from({ length: o.grid - 1 }, (_, i) => {
          const p = gridY + (i + 1) * cell;
          return (
            <line
              key={`gh-${i}`}
              x1={gridX}
              y1={p}
              x2={gridX + gridSize}
              y2={p}
              stroke={C.blue}
              strokeWidth={0.5}
              opacity={0.6}
            />
          );
        })}
        <text
          x={gridX + gridSize / 2}
          y={gridY + gridSize + 16}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {o.tokens} patches
        </text>

        {/* ---------- Right section header ---------- */}
        <text x={282} y={88} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          attention NxN
        </text>

        {/* baseline ghost (largest matrix outline) */}
        <rect
          x={attnCx - attnMaxEdge / 2}
          y={attnBottom - attnMaxEdge}
          width={attnMaxEdge}
          height={attnMaxEdge}
          fill="none"
          stroke={C.line}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {/* growing attention matrix (area ~ N) */}
        <rect
          x={attnX}
          y={attnY}
          width={attnEdge}
          height={attnEdge}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.4}
        />
        <text
          x={attnCx}
          y={attnBottom + 16}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {o.tokens}x{o.tokens} scores
        </text>

        {/* ---------- ViT sweet-spot marker ---------- */}
        <text x={gridX} y={300} fontSize={9} fill={sel === DEFAULT_INDEX ? C.green : C.muted} fontFamily={MONO} fontWeight={700}>
          {sel === DEFAULT_INDEX ? "16x16: ViT default - the sweet spot" : "16x16 is the ViT default sweet spot"}
        </text>

        {/* ---------- Cost band ---------- */}
        <text x={barX} y={344} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          relative attention cost  (cost ~ N^2)
        </text>
        <rect x={barX} y={barY} width={barW} height={barH} rx={3} fill={C.card} stroke={C.line} strokeWidth={1} />
        <rect x={barX} y={barY} width={Math.max(2, barFill)} height={barH} rx={3} fill={C.coral} opacity={0.85} />
        {/* tick labels for each option */}
        {OPTIONS.map((opt, i) => {
          const lx = barX + ((Math.log2(opt.costX) - logMin) / (logMax - logMin)) * barW;
          return (
            <g key={`tick-${i}`}>
              <line x1={lx} y1={barY} x2={lx} y2={barY + barH} stroke={C.muted} strokeWidth={0.75} />
              <text
                x={lx}
                y={barY + barH + 12}
                fontSize={8}
                fill={i === sel ? C.coral : C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={i === sel ? 700 : 400}
              >
                {opt.costLabel}
              </text>
            </g>
          );
        })}

        {/* ---------- Escape-hatch + caption band ---------- */}
        <line x1={16} y1={402} x2={464} y2={402} stroke={C.line} strokeWidth={1} />
        <text x={16} y={420} fontSize={8.5} fill={C.violet} fontFamily={MONO} fontWeight={700}>
          escape hatch:
        </text>
        <text x={104} y={420} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          windowed attention (Swin / SAM) limits scores to local windows.
        </text>
        <text x={16} y={440} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          Halving the patch quadruples the tokens and ~16x&apos;s the
        </text>
        <text x={16} y={454} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          attention cost - why 16x16 is the default.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono">patch</span>
        {OPTIONS.map((opt, i) => (
          <button
            key={opt.patch}
            type="button"
            onClick={() => setSel(i)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={i === sel ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {opt.patch}
          </button>
        ))}

        <label className="flex items-center gap-1.5 font-mono">
          patch size
          <input
            type="range"
            min={0}
            max={OPTIONS.length - 1}
            step={1}
            value={sel}
            onChange={(e) => setSel(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{o.patch}px</span>
        </label>

        <span className="font-mono tabular-nums">
          N={o.tokens} · cost {o.costLabel}
        </span>
      </div>
    </div>
  );
}
