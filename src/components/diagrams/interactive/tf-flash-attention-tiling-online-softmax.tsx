"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// A small, fixed N x N attention problem split into tiles. We walk over the
// key/value tiles one at a time (the "outer" loop of a fixed query block) and
// maintain online-softmax statistics: running max m, running sum l, and an
// accumulating (unnormalized) output. The full N x N score matrix S is never
// stored — only one tile of scores lives in SRAM at a time.
const N_TILES = 4; // number of K/V tiles streamed through SRAM
const GRID = 4; // the standard S matrix is drawn as a GRID x GRID block

// Hard-coded per-tile row max contributions (deterministic, SSR-safe). Each
// value is the max score this tile contributes for the active query block.
const TILE_MAX: readonly number[] = [1.2, 0.7, 2.1, 0.4];
// Sum of exp(score - tilemax) within each tile (the local denominator pieces).
const TILE_LSUM: readonly number[] = [1.8, 1.5, 2.4, 1.3];

// HBM traffic accounting (illustrative round numbers, in "units" of N*d reads).
// Standard: write S (N^2), read S for softmax (N^2), read S again for *V (N^2),
// plus read Q,K,V once each. Flash: read Q,K,V once, write O once — no S I/O.
const STD_RW_PER_TILE = 2; // standard touches HBM ~2x more work per processed tile
const FLASH_RW_PER_TILE = 1;

function fmt(n: number): string {
  return n.toFixed(2);
}

export function TfFlashAttention() {
  // How many K/V tiles have been processed so far (0..N_TILES).
  const [done, setDone] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const frame = useRef<number>(0);

  // Auto-advance while playing.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      frame.current += 1;
      setDone((d) => {
        if (d >= N_TILES) {
          setPlaying(false);
          return d;
        }
        return d + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [playing]);

  // --- online softmax running statistics over the processed tiles ----------
  // m = running max, l = running normalizer (rescaled as new maxima appear).
  let m = -Infinity;
  let l = 0;
  for (let i = 0; i < done; i++) {
    const mNew = Math.max(m, TILE_MAX[i]);
    const scale = m === -Infinity ? 0 : Math.exp(m - mNew);
    l = l * scale + TILE_LSUM[i] * Math.exp(TILE_MAX[i] - mNew);
    m = mNew;
  }
  const runMax = m === -Infinity ? 0 : m;

  // HBM traffic counters.
  const stdRW = done * STD_RW_PER_TILE + (done > 0 ? GRID : 0);
  const flashRW = done * FLASH_RW_PER_TILE;

  // --- geometry ------------------------------------------------------------
  const W = 520;
  const Hh = 470;
  const cell = 22;
  const cgap = 3;

  // Left (standard) panel.
  const stdX = 28;
  const matTop = 120;

  // Right (flash) panel.
  const flashX = 300;
  const tileTop = 120;
  const tileW = 26;
  const tileGap = 8;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${Hh}`}
        className="h-auto w-full"
        role="img"
        aria-label="Flash Attention: tiling and online softmax stream tiles through SRAM without materializing the full attention matrix"
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
          Flash Attention: Tiling + Online Softmax
        </text>
        <text x={16} y={38} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          processed {done}/{N_TILES} K/V tiles — same math, far less HBM traffic
        </text>

        {/* ---------- Panel headers ---------- */}
        <text
          x={stdX}
          y={66}
          fontSize={11}
          fill={C.coral}
          fontFamily={MONO}
          fontWeight={700}
        >
          standard
        </text>
        <text x={stdX} y={79} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          build full N×N S in HBM
        </text>

        <text
          x={flashX}
          y={66}
          fontSize={11}
          fill={C.green}
          fontFamily={MONO}
          fontWeight={700}
        >
          flash
        </text>
        <text x={flashX} y={79} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          stream tiles through SRAM
        </text>

        {/* ---------- Memory labels ---------- */}
        <text x={stdX} y={102} fontSize={9} fill={C.coral} fontFamily={MONO}>
          HBM (slow, large)
        </text>
        <text x={flashX} y={102} fontSize={9} fill={C.green} fontFamily={MONO}>
          SRAM (fast, tiny)
        </text>

        {/* ---------- Left: full N×N score matrix S in HBM ---------- */}
        {Array.from({ length: GRID }, (_, r) =>
          Array.from({ length: GRID }, (_, c) => {
            const x = stdX + c * (cell + cgap);
            const y = matTop + r * (cell + cgap);
            // Standard "materializes" the whole matrix once any work begins.
            const filled = done > 0;
            return (
              <rect
                key={`s-${r}-${c}`}
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx={2}
                fill={filled ? C.coralFill : C.card}
                stroke={C.coral}
                strokeWidth={1}
                opacity={filled ? 1 : 0.4}
              />
            );
          }),
        )}
        <text
          x={stdX}
          y={matTop + GRID * (cell + cgap) + 14}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          S = QKᵀ : N×N stored
        </text>
        <text
          x={stdX}
          y={matTop + GRID * (cell + cgap) + 28}
          fontSize={8.5}
          fill={C.coral}
          fontFamily={MONO}
        >
          write S → read S → read S
        </text>
        <text
          x={stdX}
          y={matTop + GRID * (cell + cgap) + 42}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          O(N²) memory, heavy I/O
        </text>

        {/* ---------- Right: K/V tiles streaming through SRAM ---------- */}
        {/* One small tile window: the active tile sits in SRAM, earlier tiles
            are shown as already-consumed, later ones still in HBM. */}
        {Array.from({ length: N_TILES }, (_, i) => {
          const x = flashX + i * (tileW + tileGap);
          const isDone = i < done;
          const isActive = i === done && done < N_TILES;
          const fill = isActive
            ? C.greenFill
            : isDone
              ? C.card
              : C.card;
          const stroke = isActive ? C.green : isDone ? C.line : C.line;
          return (
            <g key={`tile-${i}`}>
              <rect
                x={x}
                y={tileTop}
                width={tileW}
                height={tileW}
                rx={2}
                fill={fill}
                stroke={stroke}
                strokeWidth={isActive ? 2 : 1}
                opacity={isDone || isActive ? 1 : 0.45}
              />
              <text
                x={x + tileW / 2}
                y={tileTop + tileW / 2 + 3}
                fontSize={8}
                fill={isActive ? C.green : isDone ? C.muted : C.muted}
                fontFamily={MONO}
                textAnchor="middle"
              >
                K{i + 1}
              </text>
              {/* tick under consumed tiles */}
              {isDone && (
                <text
                  x={x + tileW / 2}
                  y={tileTop + tileW + 12}
                  fontSize={8}
                  fill={C.green}
                  fontFamily={MONO}
                  textAnchor="middle"
                >
                  ✓
                </text>
              )}
            </g>
          );
        })}
        <text
          x={flashX}
          y={tileTop + tileW + 30}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          one tile of S in SRAM at a time
        </text>
        <text
          x={flashX}
          y={tileTop + tileW + 44}
          fontSize={8.5}
          fill={C.green}
          fontFamily={MONO}
        >
          full S never materialized
        </text>

        {/* ---------- Online softmax running stats box ---------- */}
        <rect
          x={flashX}
          y={tileTop + tileW + 56}
          width={196}
          height={86}
          rx={4}
          fill={C.card}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={flashX + 8}
          y={tileTop + tileW + 73}
          fontSize={9}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={700}
        >
          online softmax state
        </text>
        <text
          x={flashX + 8}
          y={tileTop + tileW + 90}
          fontSize={9}
          fill={C.violet}
          fontFamily={MONO}
        >
          running max  m = {fmt(runMax)}
        </text>
        <text
          x={flashX + 8}
          y={tileTop + tileW + 105}
          fontSize={9}
          fill={C.blue}
          fontFamily={MONO}
        >
          running sum  ℓ = {fmt(l)}
        </text>
        <text
          x={flashX + 8}
          y={tileTop + tileW + 120}
          fontSize={9}
          fill={C.green}
          fontFamily={MONO}
        >
          O += exp(S−m)·V, rescaled
        </text>

        {/* ---------- HBM traffic counters (own band) ---------- */}
        <line
          x1={16}
          y1={320}
          x2={W - 16}
          y2={320}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={16}
          y={340}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={700}
        >
          HBM accesses (lower is better)
        </text>

        {/* standard bar */}
        <text x={16} y={362} fontSize={9.5} fill={C.coral} fontFamily={MONO}>
          standard
        </text>
        <rect
          x={92}
          y={353}
          width={Math.max(2, stdRW * 22)}
          height={12}
          rx={2}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1}
        />
        <text
          x={92 + Math.max(2, stdRW * 22) + 6}
          y={363}
          fontSize={9}
          fill={C.coral}
          fontFamily={MONO}
        >
          {stdRW} units
        </text>

        {/* flash bar */}
        <text x={16} y={384} fontSize={9.5} fill={C.green} fontFamily={MONO}>
          flash
        </text>
        <rect
          x={92}
          y={375}
          width={Math.max(2, flashRW * 22)}
          height={12}
          rx={2}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1}
        />
        <text
          x={92 + Math.max(2, flashRW * 22) + 6}
          y={385}
          fontSize={9}
          fill={C.green}
          fontFamily={MONO}
        >
          {flashRW} units
        </text>

        <text x={16} y={408} fontSize={9} fill={C.muted} fontFamily={MONO}>
          {done === N_TILES
            ? "done: flash output is bit-for-bit the same math as standard."
            : "flash skips all read/write of the N×N S matrix in HBM."}
        </text>

        {/* ---------- Caption band ---------- */}
        <line
          x1={16}
          y1={426}
          x2={W - 16}
          y2={426}
          stroke={C.line}
          strokeWidth={1}
        />
        <text x={16} y={446} fontSize={9} fill={C.ink} fontFamily={MONO}>
          Never build the full attention matrix —
        </text>
        <text x={16} y={460} fontSize={9} fill={C.ink} fontFamily={MONO}>
          stream tiles through fast on-chip memory instead.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setDone((d) => Math.min(N_TILES, d + 1));
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          next tile →
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            playing ? { background: C.ink, color: "var(--background)" } : undefined
          }
        >
          {playing ? "pause" : "play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setDone(0);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
        <span className="font-mono tabular-nums">
          tile {done}/{N_TILES}
        </span>
      </div>
    </div>
  );
}
