"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// 1x1 Convolution: Cheap Channel Mixing.
// At a single spatial position a feature vector of C_in channels is remixed
// into C_out channels by a per-pixel fully-connected layer (no spatial
// neighbors). A 3x3 conv instead reads a 3x3 neighborhood. The cost readout
// shows that shrinking depth with a 1x1 first makes a later 3x3 much cheaper.

// Fixed channel depths (hard-coded for SSR determinism).
const C_IN = 512;

// Output-channel choices for the slider (dimensionality reduction).
const OUT_CHOICES: readonly number[] = [64, 128, 256, 384, 512];

// Vertical sample of input channels shown as a stack (we draw a few rungs,
// not all 512, the label states the true count).
const IN_RUNGS = 8;
const OUT_RUNGS = 5;

type Mode = "1x1" | "3x3";

export function VisOneByOneConv() {
  const [mode, setMode] = useState<Mode>("1x1");
  const [outIdx, setOutIdx] = useState<number>(2); // index into OUT_CHOICES

  const cOut: number = OUT_CHOICES[outIdx];

  // --- channel-stack layout (center) ---
  const stackTop = 96;
  const rungH = 13;
  const inX = 150;
  const outX = 320;
  const colW = 30;

  const inStackH = IN_RUNGS * rungH;
  const outStackH = OUT_RUNGS * rungH;
  const inMidY = stackTop + inStackH / 2;
  const outMidY = stackTop + outStackH / 2;

  // --- spatial grid (left): which input cells feed the output pixel ---
  const gridX = 34;
  const gridTop = 110;
  const cell = 22;
  // For 1x1 only the center cell contributes; for 3x3 all 9 contribute.
  const isLit = (r: number, col: number): boolean =>
    mode === "1x1" ? r === 1 && col === 1 : true;

  // --- cost numbers (params for a conv: k*k * C_in * C_out) ---
  // Compare: one 3x3 over full depth  vs  1x1 reduce then 3x3 on reduced depth.
  const full3x3 = 9 * C_IN * C_IN; // 3x3 on 512 -> 512
  const reduce1x1 = 1 * C_IN * cOut; // 1x1: 512 -> cOut
  const then3x3 = 9 * cOut * cOut; // 3x3 on cOut -> cOut
  const cheap = reduce1x1 + then3x3;
  const ratio = (full3x3 / cheap).toFixed(1);

  const fmtM = (n: number): string => `${(n / 1e6).toFixed(2)}M`;

  // bar widths for the cost comparison (normalize to full3x3)
  const barMaxW = 150;
  const fullBarW = barMaxW;
  const cheapBarW = Math.max(6, Math.round((cheap / full3x3) * barMaxW));

  return (
    <div>
      <svg
        viewBox="0 0 480 412"
        className="h-auto w-full"
        role="img"
        aria-label="A 1x1 convolution remixes channels at one pixel, cheaply shrinking depth from 512 to fewer channels before a costly 3x3 convolution"
      >
        {/* Title band */}
        <text x={16} y={24} fontFamily={MONO} fontSize={13} fill={C.ink}>
          1x1 Convolution: Cheap Channel Mixing
        </text>
        <text x={16} y={42} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          per-pixel fully-connected layer across channels
        </text>

        {/* Section labels */}
        <text x={gridX} y={84} fontFamily={MONO} fontSize={9.5} fill={C.ink}>
          input map H x W
        </text>
        <text
          x={inX + colW / 2}
          y={84}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.ink}
          textAnchor="middle"
        >
          C_in = {C_IN}
        </text>
        <text
          x={outX + colW / 2}
          y={84}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.ink}
          textAnchor="middle"
        >
          C_out = {cOut}
        </text>

        {/* Spatial grid: receptive field at one pixel */}
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((col) => {
            const lit = isLit(r, col);
            return (
              <rect
                key={`g${r}-${col}`}
                x={gridX + col * cell}
                y={gridTop + r * cell}
                width={cell - 2}
                height={cell - 2}
                rx={2}
                fill={lit ? C.blueFill : "var(--card)"}
                stroke={lit ? C.blue : C.line}
                strokeWidth={lit ? 1.6 : 1}
              />
            );
          }),
        )}
        {/* mark the output pixel (center) */}
        <text
          x={gridX + cell + (cell - 2) / 2}
          y={gridTop + cell + (cell - 2) / 2 + 3.5}
          fontFamily={MONO}
          fontSize={9}
          fill={mode === "1x1" ? C.blue : C.ink}
          textAnchor="middle"
        >
          p
        </text>
        <text
          x={gridX}
          y={gridTop + 3 * cell + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          {mode === "1x1" ? "1 cell -> pixel p" : "9 cells -> pixel p"}
        </text>
        <text
          x={gridX}
          y={gridTop + 3 * cell + 30}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          {mode === "1x1" ? "no neighbors" : "3x3 neighborhood"}
        </text>

        {/* Input channel stack */}
        {Array.from({ length: IN_RUNGS }, (_, i) => (
          <rect
            key={`in${i}`}
            x={inX}
            y={stackTop + i * rungH}
            width={colW}
            height={rungH - 2}
            rx={1.5}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1}
          />
        ))}
        <text
          x={inX + colW / 2}
          y={stackTop + inStackH + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          channels
        </text>

        {/* Mixing connectors: every input -> every output (dense across depth) */}
        {Array.from({ length: IN_RUNGS }, (_, i) =>
          Array.from({ length: OUT_RUNGS }, (_, j) => (
            <line
              key={`mix${i}-${j}`}
              x1={inX + colW}
              y1={stackTop + i * rungH + (rungH - 2) / 2}
              x2={outX}
              y2={stackTop + j * rungH + (rungH - 2) / 2}
              stroke={C.line}
              strokeWidth={0.5}
              opacity={0.7}
            />
          )),
        )}

        {/* Output channel stack */}
        {Array.from({ length: OUT_RUNGS }, (_, j) => (
          <rect
            key={`out${j}`}
            x={outX}
            y={stackTop + j * rungH}
            width={colW}
            height={rungH - 2}
            rx={1.5}
            fill={C.coralFill}
            stroke={C.coral}
            strokeWidth={1}
          />
        ))}

        {/* Mixing label between the stacks */}
        <text
          x={(inX + colW + outX) / 2}
          y={stackTop - 2}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
          textAnchor="middle"
        >
          mix
        </text>
        <text
          x={(inX + colW + outX) / 2}
          y={Math.max(inMidY, outMidY) + 70}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          W: {cOut}x{C_IN}
        </text>

        {/* H x W preserved note under the output stack */}
        <text
          x={outX + colW / 2}
          y={stackTop + outStackH + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          same H x W
        </text>

        {/* Divider above cost band */}
        <line
          x1={16}
          y1={272}
          x2={464}
          y2={272}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* Cost readout band */}
        <text x={16} y={292} fontFamily={MONO} fontSize={10} fill={C.ink}>
          params: 3x3 on full depth vs 1x1-reduce then 3x3
        </text>

        {/* full 3x3 bar */}
        <rect
          x={150}
          y={302}
          width={fullBarW}
          height={14}
          rx={2}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.2}
        />
        <text x={16} y={313} fontFamily={MONO} fontSize={9} fill={C.muted}>
          3x3 @512
        </text>
        <text
          x={150 + fullBarW + 6}
          y={313}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
        >
          {fmtM(full3x3)}
        </text>

        {/* cheap (1x1 then 3x3) bar */}
        <rect
          x={150}
          y={324}
          width={cheapBarW}
          height={14}
          rx={2}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.2}
        />
        <text x={16} y={335} fontFamily={MONO} fontSize={9} fill={C.muted}>
          1x1 + 3x3
        </text>
        <text
          x={150 + cheapBarW + 6}
          y={335}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
        >
          {fmtM(cheap)}
        </text>

        {/* ratio + breakdown */}
        <text x={16} y={356} fontFamily={MONO} fontSize={9.5} fill={C.ink}>
          1x1 reduce {fmtM(reduce1x1)} + 3x3 {fmtM(then3x3)} = {fmtM(cheap)}
        </text>
        <text x={16} y={370} fontFamily={MONO} fontSize={9.5} fill={C.green}>
          {ratio}x cheaper than the plain 3x3
        </text>

        {/* Caption (split to fit width) */}
        <text x={16} y={392} fontFamily={MONO} fontSize={9} fill={C.muted}>
          A 1x1 conv remixes channels at each pixel - the cheap
        </text>
        <text x={16} y={406} fontFamily={MONO} fontSize={9} fill={C.muted}>
          way to shrink depth before a pricey 3x3.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          onClick={() => setMode("1x1")}
          aria-pressed={mode === "1x1"}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            mode === "1x1"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          1x1 (channels)
        </button>
        <button
          onClick={() => setMode("3x3")}
          aria-pressed={mode === "3x3"}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            mode === "3x3"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          3x3 (neighborhood)
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono text-[var(--muted)]">C_out</span>
          <input
            type="range"
            min={0}
            max={OUT_CHOICES.length - 1}
            step={1}
            value={outIdx}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setOutIdx(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{cOut}</span>
        </label>
      </div>
    </div>
  );
}
