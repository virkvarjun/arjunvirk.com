"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// LoRA: Low-Rank Decomposition of the Update.
// A frozen weight matrix W (d x d) is adapted by a tiny low-rank update
// delta-W = (alpha / r) * B * A, where B is (d x r) and A is (r x d).
// Only B and A are trainable: 2*d*r params instead of d^2. Slide r to watch
// the trainable count grow/shrink against the frozen d^2.

const D = 2048; // model dimension (matrices are d x d)

// Frozen baseline: d^2 params.
const FROZEN = D * D; // 4,194,304

// Format an integer with thousands separators (deterministic, no locale calls).
function group(n: number): string {
  const s = String(n);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return out;
}

export function TfLora() {
  const [r, setR] = useState<number>(16);

  // Trainable LoRA params = 2 * d * r; frozen W contributes d^2 (not trained).
  const trainable = 2 * D * r;
  const pct = (trainable / FROZEN) * 100;

  // --- layout ---
  const VW = 480;
  const VH = 388;

  // ROW 1 (top): the conceptual sum  W' = W + ΔW  (three square boxes).
  const sq = 84; // side of a d x d square box
  const row1Y = 78; // top of row-1 boxes
  const wX = 60; // frozen W
  const dwX = 220; // ΔW (the update)
  const r1Mid = row1Y + sq / 2;

  // ROW 2 (middle): the factorization  ΔW = B · A.
  const row2Y = 226; // top of B (and vertical center reference for A)
  const bH = 60; // height of B (represents the d dimension)
  const dwX2 = 40; // small ΔW glyph at the start of row 2
  const dwGlyph = 30; // side of that small square glyph
  const r2Mid = row2Y + bH / 2;

  // B is tall+skinny (d x r): width grows with r. A is wide+skinny (r x d):
  // height grows with r. Clamp so labels still fit and nothing overflows.
  const thin = (rank: number): number => Math.round(8 + (rank / 64) * 26); // 8..34
  const skinny = thin(r);

  const bX = 150; // B left edge
  const bW = skinny;
  const aX = bX + bW + 28; // A left edge (after B and the "·")
  const aW = 150; // A width (represents the d dimension)
  const aH = skinny;

  // ROW 3 (bottom): parameter comparison bars.
  const cmpTop = 312;
  const cmpX = 12;
  const cmpMaxW = 250;
  const frozenW = cmpMaxW; // full bar = d^2
  const loraW = Math.max(2, Math.round((trainable / FROZEN) * cmpMaxW));

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="LoRA: a frozen d-by-d weight matrix W plus a low-rank update delta-W equal to B times A, where B is d-by-r and A is r-by-d; trainable params equal 2 d r instead of d squared"
      >
        {/* Title band */}
        <text x={cmpX} y={22} fontFamily={MONO} fontSize={13} fill={C.ink}>
          LoRA: Low-Rank Decomposition of the Update
        </text>
        <text x={cmpX} y={40} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          W{"'"} = W + (alpha / r) {"·"} B {"·"} A
        </text>

        {/* ================= ROW 1 : W' = W + ΔW ================= */}
        {/* Frozen W */}
        <rect
          x={wX}
          y={row1Y}
          width={sq}
          height={sq}
          rx={3}
          fill={C.grid}
          stroke={C.line}
          strokeWidth={1.4}
        />
        <text
          x={wX + sq / 2}
          y={r1Mid - 4}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          textAnchor="middle"
        >
          W
        </text>
        <text
          x={wX + sq / 2}
          y={r1Mid + 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {D}×{D}
        </text>
        <text
          x={wX + sq / 2}
          y={row1Y - 9}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          frozen
        </text>
        <text
          x={wX + sq / 2}
          y={row1Y + sq + 15}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {group(FROZEN)}
        </text>

        {/* plus sign */}
        <text
          x={(wX + sq + dwX) / 2}
          y={r1Mid + 5}
          fontFamily={MONO}
          fontSize={16}
          fill={C.ink}
          textAnchor="middle"
        >
          +
        </text>

        {/* ΔW (the update, same d x d shape) */}
        <rect
          x={dwX}
          y={row1Y}
          width={sq}
          height={sq}
          rx={3}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.4}
          strokeDasharray="4 3"
        />
        <text
          x={dwX + sq / 2}
          y={r1Mid - 4}
          fontFamily={MONO}
          fontSize={12}
          fill={C.coral}
          textAnchor="middle"
        >
          ΔW
        </text>
        <text
          x={dwX + sq / 2}
          y={r1Mid + 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
          textAnchor="middle"
        >
          {D}×{D}
        </text>
        <text
          x={dwX + sq / 2}
          y={row1Y - 9}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.coral}
          textAnchor="middle"
        >
          the update
        </text>

        {/* annotation to the right of row 1 */}
        <text
          x={dwX + sq + 16}
          y={r1Mid - 4}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="start"
        >
          ΔW = (alpha/r)
        </text>
        <text
          x={dwX + sq + 16}
          y={r1Mid + 12}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="start"
        >
          {"· "}B {"·"} A
        </text>

        {/* ================= ROW 2 : ΔW = B · A ================= */}
        {/* small ΔW glyph */}
        <rect
          x={dwX2}
          y={r2Mid - dwGlyph / 2}
          width={dwGlyph}
          height={dwGlyph}
          rx={2}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.2}
          strokeDasharray="3 2"
        />
        <text
          x={dwX2 + dwGlyph / 2}
          y={r2Mid + 4}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
          textAnchor="middle"
        >
          ΔW
        </text>
        {/* equals sign */}
        <text
          x={(dwX2 + dwGlyph + bX) / 2}
          y={r2Mid + 5}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          textAnchor="middle"
        >
          =
        </text>

        {/* "trainable" tag over B·A */}
        <text
          x={(bX + aX + aW) / 2}
          y={row2Y - 12}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.blue}
          textAnchor="middle"
        >
          trainable
        </text>

        {/* B : tall skinny (d x r) */}
        <rect
          x={bX}
          y={row2Y}
          width={bW}
          height={bH}
          rx={2}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <text
          x={bX + bW / 2}
          y={r2Mid + 4}
          fontFamily={MONO}
          fontSize={11}
          fill={C.blue}
          textAnchor="middle"
        >
          B
        </text>
        <text
          x={bX + bW / 2}
          y={row2Y + bH + 14}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
          textAnchor="middle"
        >
          {D}×{r}
        </text>

        {/* dot between B and A */}
        <text
          x={(bX + bW + aX) / 2}
          y={r2Mid + 4}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          textAnchor="middle"
        >
          {"·"}
        </text>

        {/* A : wide skinny (r x d) */}
        <rect
          x={aX}
          y={r2Mid - aH / 2}
          width={aW}
          height={aH}
          rx={2}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <text
          x={aX + aW / 2}
          y={r2Mid + 4}
          fontFamily={MONO}
          fontSize={11}
          fill={C.blue}
          textAnchor="middle"
        >
          A
        </text>
        <text
          x={aX + aW / 2}
          y={r2Mid + aH / 2 + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
          textAnchor="middle"
        >
          {r}×{D}
        </text>

        {/* ================= ROW 3 : parameter bars ================= */}
        <text x={cmpX} y={cmpTop - 8} fontFamily={MONO} fontSize={10} fill={C.ink}>
          trainable params
        </text>

        {/* frozen baseline bar (d^2) */}
        <rect
          x={cmpX}
          y={cmpTop}
          width={frozenW}
          height={12}
          rx={2}
          fill={C.grid}
          stroke={C.line}
          strokeWidth={1.2}
        />
        <text
          x={cmpX + frozenW + 6}
          y={cmpTop + 10}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="start"
        >
          d² = {group(FROZEN)}
        </text>

        {/* LoRA bar (2 d r) */}
        <rect
          x={cmpX}
          y={cmpTop + 20}
          width={loraW}
          height={12}
          rx={2}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.2}
        />
        <text
          x={cmpX + Math.max(loraW, 40) + 6}
          y={cmpTop + 30}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
          textAnchor="start"
        >
          2·d·r = {group(trainable)} ({pct.toFixed(2)}%)
        </text>

        {/* Caption band (very bottom) */}
        <text
          x={cmpX}
          y={cmpTop + 54}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          Freeze W, learn a tiny low-rank correction B·A — its real
        </text>
        <text
          x={cmpX}
          y={cmpTop + 68}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          information fits in a small subspace.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
          rank r
          <input
            type="range"
            min={1}
            max={64}
            step={1}
            value={r}
            onChange={(e) => setR(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{r}</span>
        </label>
        <span className="font-mono text-[var(--muted)]">
          smaller r = smaller adapter, faster, less capacity
        </span>
      </div>
    </div>
  );
}
