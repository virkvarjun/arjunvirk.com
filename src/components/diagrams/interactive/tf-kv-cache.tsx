"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Worked 70B example (defaults). Cache bytes per token (all layers) =
//   2 (K and V) * num_layers * num_kv_heads * head_dim * bytes_per_param
// then multiplied by seq_len for the full cache.
// For a 70B model with GQA: head_dim 128, num_layers 80, num_kv_heads 8,
// seq_len 8192, bytes 2 (fp16):
//   2 * 80 * 8 * 128 * 2 = 327,680 bytes/token -> * 8192 ≈ 2.5 GB/seq.
// The "~32 GB" figure is the cache for a serving batch (~13 concurrent seqs).
const HEAD_DIM = 128;
const BATCH = 13; // concurrent sequences in the serving example

function cacheBytes(
  layers: number,
  kvHeads: number,
  seqLen: number,
  bytes: number,
): number {
  // K and V, all layers, all kv heads, head_dim, for the whole sequence.
  return 2 * layers * kvHeads * HEAD_DIM * seqLen * bytes;
}

function fmtGB(bytesTotal: number): string {
  const gb = bytesTotal / 1024 ** 3;
  if (gb >= 100) return `${gb.toFixed(0)} GB`;
  if (gb >= 10) return `${gb.toFixed(1)} GB`;
  return `${gb.toFixed(2)} GB`;
}

const MAX_STEP = 6; // sequence positions shown in the visual

export function TfKvCache() {
  // Generation stepper: how many tokens generated so far (1..MAX_STEP).
  const [step, setStep] = useState<number>(3);

  // Size-formula sliders (defaults ≈ 70B serving → ~32 GB).
  const [layers, setLayers] = useState<number>(80);
  const [kvHeads, setKvHeads] = useState<number>(8);
  const [seqLen, setSeqLen] = useState<number>(8192);
  const [bytes, setBytes] = useState<number>(2);

  const perSeq = cacheBytes(layers, kvHeads, seqLen, bytes);
  const total = perSeq * BATCH;

  // --- visual geometry -------------------------------------------------
  const cell = 26; // K/V cell size
  const gap = 4;

  // Left (naive) panel: triangle of recomputed K,V cells.
  const naiveX = 34;
  const gridTop = 102;

  // Right (cached) panel: a growing column of cached K and V rows.
  const cacheX = 286;

  return (
    <div>
      <svg
        viewBox="0 0 480 470"
        className="h-auto w-full"
        role="img"
        aria-label="KV cache: caching past keys and values during autoregressive decoding"
      >
        {/* ---------- Title band ---------- */}
        <text
          x={16}
          y={22}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={700}
        >
          KV Cache
        </text>
        <text x={16} y={38} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          step {step}: generating token at position {step}
        </text>

        {/* ---------- Panel headers ---------- */}
        <text
          x={naiveX}
          y={64}
          fontSize={11}
          fill={C.coral}
          fontFamily={MONO}
          fontWeight={700}
        >
          naive, recompute
        </text>
        <text x={naiveX} y={77} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          all K,V every step
        </text>

        <text
          x={cacheX}
          y={64}
          fontSize={11}
          fill={C.green}
          fontFamily={MONO}
          fontWeight={700}
        >
          cached, reuse
        </text>
        <text x={cacheX} y={77} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          K,V for new token only
        </text>

        {/* ---------- Left: naive recompute triangle ---------- */}
        {/* For each generation step s (1..step), a row of s cells is recomputed.
            This grows as a triangle → O(n^2) total, all of it redundant. */}
        {Array.from({ length: step }, (_, s) => {
          const rowY = gridTop + s * (cell + gap);
          const cols = s + 1;
          return (
            <g key={`naive-${s}`}>
              {Array.from({ length: cols }, (_, c) => {
                const x = naiveX + c * (cell + gap);
                const isNew = c === cols - 1;
                return (
                  <rect
                    key={c}
                    x={x}
                    y={rowY}
                    width={cell}
                    height={cell}
                    rx={3}
                    fill={C.coralFill}
                    stroke={isNew ? C.coral : C.coral}
                    strokeWidth={isNew ? 1 : 1}
                    opacity={isNew ? 1 : 0.55}
                  />
                );
              })}
              {/* step label to the left of each row */}
              <text
                x={naiveX - 8}
                y={rowY + cell / 2 + 3}
                fontSize={8.5}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="end"
              >
                t{s + 1}
              </text>
            </g>
          );
        })}
        {/* complexity label under the naive panel */}
        <text
          x={naiveX}
          y={gridTop + step * (cell + gap) + 16}
          fontSize={9}
          fill={C.coral}
          fontFamily={MONO}
          fontWeight={700}
        >
          O(n²), mostly redundant
        </text>

        {/* ---------- Right: growing K/V cache ---------- */}
        {/* Two stacked columns of rows: stored K rows and stored V rows.
            Each step appends exactly ONE new row to each (computed now);
            all earlier rows are read straight from the cache. */}
        {(["K", "V"] as const).map((which, colIdx) => {
          const colX = cacheX + colIdx * (cell + gap + 22);
          return (
            <g key={`cache-${which}`}>
              <text
                x={colX + cell / 2}
                y={gridTop - 6}
                fontSize={9.5}
                fill={C.ink}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={700}
              >
                {which}-cache
              </text>
              {Array.from({ length: step }, (_, s) => {
                const rowY = gridTop + s * (cell + gap);
                const isNew = s === step - 1;
                return (
                  <g key={s}>
                    <rect
                      x={colX}
                      y={rowY}
                      width={cell}
                      height={cell}
                      rx={3}
                      fill={isNew ? C.greenFill : C.card}
                      stroke={isNew ? C.green : C.line}
                      strokeWidth={isNew ? 2 : 1}
                    />
                    <text
                      x={colX + cell / 2}
                      y={rowY + cell / 2 + 3}
                      fontSize={8}
                      fill={isNew ? C.green : C.muted}
                      fontFamily={MONO}
                      textAnchor="middle"
                    >
                      {which.toLowerCase()}
                      {s + 1}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* legend for the cache columns */}
        <g>
          <rect
            x={cacheX}
            y={gridTop + step * (cell + gap) + 8}
            width={11}
            height={11}
            rx={2}
            fill={C.greenFill}
            stroke={C.green}
            strokeWidth={1.6}
          />
          <text
            x={cacheX + 16}
            y={gridTop + step * (cell + gap) + 17}
            fontSize={8.5}
            fill={C.ink}
            fontFamily={MONO}
          >
            new (computed)
          </text>
          <rect
            x={cacheX}
            y={gridTop + step * (cell + gap) + 24}
            width={11}
            height={11}
            rx={2}
            fill={C.card}
            stroke={C.line}
          />
          <text
            x={cacheX + 16}
            y={gridTop + step * (cell + gap) + 33}
            fontSize={8.5}
            fill={C.muted}
            fontFamily={MONO}
          >
            cached (reused)
          </text>
        </g>
        <text
          x={cacheX}
          y={gridTop + step * (cell + gap) + 51}
          fontSize={9}
          fill={C.green}
          fontFamily={MONO}
          fontWeight={700}
        >
          O(n) per step
        </text>

        {/* ---------- Formula / readout band (own clear strip) ---------- */}
        <line
          x1={16}
          y1={362}
          x2={464}
          y2={362}
          stroke={C.line}
          strokeWidth={1}
        />
        <text x={16} y={380} fontSize={9} fill={C.muted} fontFamily={MONO}>
          cache = 2 · layers · kv_heads · head_dim · seq_len · bytes
        </text>
        <text x={16} y={398} fontSize={9} fill={C.ink} fontFamily={MONO}>
          = 2 · {layers} · {kvHeads} · {HEAD_DIM} · {seqLen.toLocaleString()} ·{" "}
          {bytes}B
        </text>

        <text
          x={16}
          y={422}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={700}
        >
          per sequence: {fmtGB(perSeq)}
        </text>
        <text x={16} y={438} fontSize={9} fill={C.muted} fontFamily={MONO}>
          × {BATCH} concurrent seqs (70B serving) →
        </text>
        <text
          x={232}
          y={438}
          fontSize={11}
          fill={C.coral}
          fontFamily={MONO}
          fontWeight={700}
        >
          ≈ {fmtGB(total)}
        </text>

        <text x={16} y={458} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          Cache K and V once, reuse them every step. The cache size is why serving
          is hard.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(MAX_STEP, s + 1))}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          generate token →
        </button>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
        <span className="font-mono tabular-nums">
          step {step}/{MAX_STEP}
        </span>

        <label className="flex items-center gap-1.5 font-mono">
          layers
          <input
            type="range"
            min={1}
            max={96}
            step={1}
            value={layers}
            onChange={(e) => setLayers(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{layers}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          kv_heads
          <input
            type="range"
            min={1}
            max={64}
            step={1}
            value={kvHeads}
            onChange={(e) => setKvHeads(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{kvHeads}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          seq_len
          <input
            type="range"
            min={512}
            max={32768}
            step={512}
            value={seqLen}
            onChange={(e) => setSeqLen(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{seqLen.toLocaleString()}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          bytes/param
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={bytes}
            onChange={(e) => setBytes(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{bytes}</span>
        </label>
      </div>
    </div>
  );
}
