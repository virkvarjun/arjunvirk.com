"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Four precision levels. `levels` = number of representable steps shown on the
// quantization grid (a deliberately small, illustrative count, real formats
// have far more, but the point is "fewer bits -> coarser grid"). `bytes` is the
// real per-weight storage cost used for the 70B memory figure.
type Precision = {
  key: string;
  bits: number;
  bytes: number;
  levels: number; // grid steps drawn across the value range
  fits: string; // hardware that the 70B model then fits on
};

const PRECISIONS: Precision[] = [
  { key: "FP32", bits: 32, bytes: 4, levels: 33, fits: "multi-GPU node" },
  { key: "FP16", bits: 16, bytes: 2, levels: 17, fits: "2x 80GB GPU" },
  { key: "FP8", bits: 8, bytes: 1, levels: 9, fits: "1x 80GB GPU" },
  { key: "INT4", bits: 4, bytes: 0.5, levels: 5, fits: "1x 40GB GPU" },
];

const PARAMS_70B = 70e9; // 70 billion weights

// The true (continuous) weight value we are quantizing, in [0, 1].
const TRUE_VALUE = 0.62;

function fmtGB(bytesTotal: number): string {
  const gb = bytesTotal / 1e9;
  if (gb >= 100) return `${gb.toFixed(0)} GB`;
  return `${gb.toFixed(1)} GB`;
}

// Round TRUE_VALUE onto the nearest grid point for `levels` steps over [0,1].
function quantize(levels: number): { value: number; index: number } {
  const steps = levels - 1;
  const index = Math.round(TRUE_VALUE * steps);
  return { value: index / steps, index };
}

export function TfQuantization() {
  // Selected precision (index into PRECISIONS).
  const [sel, setSel] = useState<number>(1);
  // Training method toggle.
  const [qat, setQat] = useState<boolean>(false);

  const p = PRECISIONS[sel];
  const q = quantize(p.levels);
  const error = Math.abs(TRUE_VALUE - q.value);

  // 70B footprint at this precision.
  const memBytes = PARAMS_70B * p.bytes;
  const fp16Bytes = PARAMS_70B * 2; // reference baseline

  // --- geometry ---
  const W = 480;
  const H = 470;

  // Number-line for the quantization grid.
  const lineX0 = 40;
  const lineX1 = 440;
  const lineSpan = lineX1 - lineX0;
  const lineY = 196;

  // True value and quantized value positions on the line.
  const trueX = lineX0 + TRUE_VALUE * lineSpan;
  const quantX = lineX0 + q.value * lineSpan;

  // Bit-cell row geometry (top section).
  const cellY = 86;
  const cellH = 22;
  const maxBitsW = 320; // width that 32 bits occupies
  const bitsW = (p.bits / 32) * maxBitsW;
  const bitsX = 80;

  // Memory bar geometry (lower section).
  const barX = 150;
  const barMaxW = 250;
  const barH = 16;
  const memBarW = (memBytes / fp16Bytes) * (barMaxW / 2); // FP16 = mid scale

  // Quality indicator: more bits -> higher quality. Map to 0..1.
  const quality = p.bits >= 32 ? 1 : p.bits >= 16 ? 0.95 : p.bits >= 8 ? 0.85 : 0.7;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Quantization: representing model weights with fewer bits to shrink memory at some cost to precision"
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
          Quantization
        </text>
        <text x={16} y={38} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          one weight at {p.key}, {p.bits} bits, {p.levels - 1} grid steps shown
        </text>

        {/* ---------- Section 1: bit-width cells ---------- */}
        <text x={16} y={70} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          bits per weight
        </text>

        {/* baseline ghost (32 bits) */}
        <rect
          x={bitsX}
          y={cellY}
          width={maxBitsW}
          height={cellH}
          rx={3}
          fill="none"
          stroke={C.line}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {/* filled bits */}
        <rect
          x={bitsX}
          y={cellY}
          width={bitsW}
          height={cellH}
          rx={3}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <text
          x={bitsX + bitsW / 2}
          y={cellY + cellH / 2 + 3.5}
          fontSize={10}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={700}
        >
          {p.bits} bits
        </text>
        <text
          x={bitsX - 6}
          y={cellY + cellH / 2 + 3.5}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {p.key}
        </text>
        <text
          x={bitsX + maxBitsW}
          y={cellY + cellH + 14}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          dashed = FP32 (32 bits)
        </text>

        {/* ---------- Section 2: quantization grid on a number line ---------- */}
        <text x={16} y={156} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          quantization grid (coarser = fewer bits)
        </text>

        {/* the line */}
        <line x1={lineX0} y1={lineY} x2={lineX1} y2={lineY} stroke={C.line} strokeWidth={1.4} />

        {/* grid ticks (representable values) */}
        {Array.from({ length: p.levels }, (_, i) => {
          const gx = lineX0 + (i / (p.levels - 1)) * lineSpan;
          return (
            <line
              key={`tick-${i}`}
              x1={gx}
              y1={lineY - 7}
              x2={gx}
              y2={lineY + 7}
              stroke={C.grid}
              strokeWidth={1.4}
            />
          );
        })}

        {/* true continuous value marker (above line) */}
        <line x1={trueX} y1={lineY - 30} x2={trueX} y2={lineY} stroke={C.coral} strokeWidth={1.4} />
        <circle cx={trueX} cy={lineY - 30} r={4} fill={C.coral} />
        <text
          x={trueX}
          y={lineY - 36}
          fontSize={8.5}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="middle"
        >
          true {TRUE_VALUE.toFixed(2)}
        </text>

        {/* snapped quantized value marker (below line) */}
        <line x1={quantX} y1={lineY} x2={quantX} y2={lineY + 30} stroke={C.green} strokeWidth={1.6} />
        <circle cx={quantX} cy={lineY + 30} r={4.5} fill={C.green} />
        <text
          x={quantX}
          y={lineY + 47}
          fontSize={8.5}
          fill={C.green}
          fontFamily={MONO}
          textAnchor="middle"
        >
          snap {q.value.toFixed(3)}
        </text>

        {/* rounding error bracket between true and snapped */}
        <line
          x1={trueX}
          y1={lineY + 14}
          x2={quantX}
          y2={lineY + 14}
          stroke={C.coral}
          strokeWidth={1.2}
          strokeDasharray="2 2"
        />

        {/* ---------- Section 3: 70B memory footprint ---------- */}
        <text x={16} y={272} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          70B model footprint
        </text>

        <text x={16} y={293} fontSize={9} fill={C.muted} fontFamily={MONO}>
          70e9 × {p.bytes} B
        </text>
        {/* memory bar */}
        <rect x={barX} y={284} width={barMaxW} height={barH} rx={3} fill={C.card} stroke={C.line} strokeWidth={1} />
        <rect
          x={barX}
          y={284}
          width={Math.max(2, memBarW)}
          height={barH}
          rx={3}
          fill={C.violet}
          opacity={0.85}
        />
        <text
          x={barX + barMaxW + 6}
          y={284 + barH / 2 + 3.5}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={700}
        >
          {fmtGB(memBytes)}
        </text>

        <text x={16} y={326} fontSize={9} fill={C.muted} fontFamily={MONO}>
          fits on:
        </text>
        <text x={66} y={326} fontSize={9.5} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          {p.fits}
        </text>

        {/* ---------- Section 4: readout band ---------- */}
        <line x1={16} y1={344} x2={464} y2={344} stroke={C.line} strokeWidth={1} />

        {/* rounding error */}
        <text x={16} y={364} fontSize={9.5} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          rounding error
        </text>
        <text x={140} y={364} fontSize={9.5} fill={C.coral} fontFamily={MONO} fontWeight={700}>
          {error.toFixed(4)}
        </text>
        <text x={210} y={364} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          (|true − snap|, grows as bits drop)
        </text>

        {/* quality vs size indicator */}
        <text x={16} y={386} fontSize={9.5} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          quality
        </text>
        <rect x={140} y={378} width={120} height={10} rx={3} fill={C.card} stroke={C.line} strokeWidth={1} />
        <rect x={140} y={378} width={120 * quality} height={10} rx={3} fill={C.green} opacity={0.85} />
        <text x={270} y={386} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          {Math.round(quality * 100)}% vs FP32
        </text>

        {/* PTQ vs QAT explainer */}
        <text x={16} y={414} fontSize={9.5} fill={qat ? C.muted : C.violet} fontFamily={MONO} fontWeight={700}>
          {qat ? "QAT" : "PTQ"}
        </text>
        <text x={66} y={414} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          {qat
            ? "quantization-aware: simulate rounding while training, recover accuracy"
            : "post-training: quantize a trained model, fast but more error"}
        </text>

        {/* caption */}
        <text x={16} y={440} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          Fewer bits per weight: less memory and faster math,
        </text>
        <text x={16} y={454} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          at some cost to precision.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono">precision</span>
        {PRECISIONS.map((pr, i) => (
          <button
            key={pr.key}
            type="button"
            onClick={() => setSel(i)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={i === sel ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {pr.key}
          </button>
        ))}

        <label className="flex items-center gap-1.5 font-mono">
          bit-width
          <input
            type="range"
            min={0}
            max={PRECISIONS.length - 1}
            step={1}
            value={sel}
            onChange={(e) => setSel(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{p.bits}b</span>
        </label>

        <button
          type="button"
          onClick={() => setQat((v) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={qat ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {qat ? "QAT" : "PTQ"}
        </button>
      </div>
    </div>
  );
}
