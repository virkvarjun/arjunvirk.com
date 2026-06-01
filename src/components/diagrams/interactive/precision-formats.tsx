"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Five numeric formats drawn as bit-layout bars, scaled to the same px-per-bit
// so a wider bar literally means more bits (FP16 is half of FP32, INT8 a quarter).
type Key = "fp32" | "fp16" | "bf16" | "fp8" | "int8";

interface Format {
  key: Key;
  name: string;
  sign: number;
  exp: number; // exponent bits (0 for plain integer)
  mant: number; // mantissa / magnitude bits
  total: number;
  speed: number; // throughput relative to FP32
  rangeNote: string;
  precNote: string;
}

const FORMATS: Format[] = [
  { key: "fp32", name: "FP32", sign: 1, exp: 8, mant: 23, total: 32, speed: 1, rangeNote: "8 exp bits -> wide dynamic range", precNote: "23 mantissa bits -> high precision" },
  { key: "fp16", name: "FP16", sign: 1, exp: 5, mant: 10, total: 16, speed: 2, rangeNote: "5 exp bits -> narrow range, overflows easily", precNote: "10 mantissa bits -> moderate precision" },
  { key: "bf16", name: "BF16", sign: 1, exp: 8, mant: 7, total: 16, speed: 2, rangeNote: "8 exp bits -> SAME range as FP32", precNote: "7 mantissa bits -> coarse precision" },
  { key: "fp8", name: "FP8 E4M3", sign: 1, exp: 4, mant: 3, total: 8, speed: 4, rangeNote: "4 exp bits -> small range", precNote: "3 mantissa bits -> very coarse precision" },
  { key: "int8", name: "INT8", sign: 1, exp: 0, mant: 7, total: 8, speed: 4, rangeNote: "no exponent -> fixed-point, quantized scale", precNote: "8-bit integer -> 256 distinct levels" },
];

// Layout geometry.
const PPB = 11; // px per bit -> FP32 = 352px wide
const BAR_X = 70; // left edge of every bar
const BAR_H = 22;
const ROW_H = 36;
const TOP = 24;
// Extra vertical space inserted before the FP8 row (index 3) so the FP32/BF16
// exponent-comparison bracket and its label have their own clear gap below BF16.
const BRACKET_GAP = 28;

function rowY(i: number): number {
  return TOP + i * ROW_H + (i >= 3 ? BRACKET_GAP : 0);
}

export function PrecisionFormats() {
  const [sel, setSel] = useState<Key>("bf16");
  const selected = FORMATS.find((f) => f.key === sel) ?? FORMATS[0];

  const fp32 = FORMATS[0];
  const bf16 = FORMATS[2];

  return (
    <div>
      <svg viewBox="0 0 440 232" className="h-auto w-full" role="img" aria-label="Precision formats">
        {/* Header */}
        <text x={BAR_X} y={14} fontSize={10} fill={C.muted} fontFamily={MONO}>
          bit layout — scaled, {PPB}px = 1 bit
        </text>
        <text x={430} y={14} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="end">
          sign · exponent · mantissa
        </text>

        {FORMATS.map((f, i) => {
          const y = rowY(i);
          const isSel = f.key === sel;
          const signW = f.sign * PPB;
          const expW = f.exp * PPB;
          const mantW = f.mant * PPB;
          const x0 = BAR_X;
          const xExp = x0 + signW;
          const xMant = xExp + expW;
          const isInt = f.exp === 0;

          return (
            <g
              key={f.key}
              onClick={() => setSel(f.key)}
              onMouseEnter={() => setSel(f.key)}
              style={{ cursor: "pointer" }}
            >
              {/* selection backdrop */}
              {isSel && (
                <rect
                  x={4}
                  y={y - 4}
                  width={432}
                  height={BAR_H + 8}
                  rx={4}
                  fill="var(--background)"
                  stroke={C.line}
                />
              )}

              {/* name + total bits */}
              <text x={8} y={y + BAR_H / 2 + 4} fontSize={11} fill={C.ink} fontFamily={MONO} fontWeight={isSel ? 700 : 400}>
                {f.name}
              </text>

              {isInt ? (
                // INT8: one solid magnitude segment + sign bit
                <>
                  <rect x={x0} y={y} width={signW} height={BAR_H} fill={C.violet} />
                  <rect x={xExp} y={y} width={mantW} height={BAR_H} fill={C.greenFill} stroke={C.green} />
                  <text x={xExp + mantW / 2} y={y + BAR_H / 2 + 4} fontSize={9} fill={C.green} fontFamily={MONO} textAnchor="middle">
                    int 8b
                  </text>
                </>
              ) : (
                <>
                  {/* sign */}
                  <rect x={x0} y={y} width={signW} height={BAR_H} fill={C.violet} />
                  {/* exponent */}
                  <rect x={xExp} y={y} width={expW} height={BAR_H} fill={C.coralFill} stroke={C.coral} />
                  <text x={xExp + expW / 2} y={y + BAR_H / 2 + 4} fontSize={9} fill={C.coral} fontFamily={MONO} textAnchor="middle">
                    e{f.exp}
                  </text>
                  {/* mantissa */}
                  <rect x={xMant} y={y} width={mantW} height={BAR_H} fill={C.blueFill} stroke={C.blue} />
                  <text x={xMant + mantW / 2} y={y + BAR_H / 2 + 4} fontSize={9} fill={C.blue} fontFamily={MONO} textAnchor="middle">
                    m{f.mant}
                  </text>
                </>
              )}

              {/* total bit count at far right */}
              <text x={434} y={y + BAR_H / 2 + 4} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="end">
                {f.total}b
              </text>
            </g>
          );
        })}

        {/* Guide: FP32 vs BF16 exponent fields are the same length (same range). */}
        {(() => {
          const yA = rowY(0);
          const yB = rowY(2);
          const xExpStart = BAR_X + fp32.sign * PPB;
          const xExpEndA = xExpStart + fp32.exp * PPB;
          const gx0 = xExpStart;
          const gx1 = xExpEndA;
          const gy = yB + BAR_H + 10;
          return (
            <g>
              {/* bracket under both exponent fields */}
              <line x1={gx0} y1={yA - 6} x2={gx0} y2={gy} stroke={C.coral} strokeWidth={1} strokeDasharray="3 3" />
              <line x1={gx1} y1={yA - 6} x2={gx1} y2={gy} stroke={C.coral} strokeWidth={1} strokeDasharray="3 3" />
              <line x1={gx0} y1={gy} x2={gx1} y2={gy} stroke={C.coral} strokeWidth={1.2} />
              <text x={(gx0 + gx1) / 2} y={gy + 12} fontSize={9} fill={C.coral} fontFamily={MONO} textAnchor="middle">
                FP32 &amp; BF16: 8 exp bits = same range
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Readout for the selected format */}
      <div className="mt-3 rounded border border-[var(--border)] bg-[var(--background)] p-3 text-xs">
        <div className="font-mono font-bold text-[var(--foreground)]">
          {selected.name} — {selected.total} bits ({selected.total / 8} bytes / number)
        </div>
        <div className="mt-1 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          <span className="font-mono" style={{ color: C.coral }}>
            range: {selected.rangeNote}
          </span>
          <span className="font-mono" style={{ color: C.blue }}>
            precision: {selected.precNote}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[var(--muted)]">
          <span>bytes/number = {selected.total}/8 = {selected.total / 8}</span>
          <span>throughput ≈ {selected.speed}× vs FP32</span>
          <span>memory = 1/{selected.speed} of FP32</span>
        </div>
        {selected.key === "bf16" && (
          <div className="mt-2 font-mono" style={{ color: C.violet }}>
            note: BF16 keeps FP32&apos;s 8-bit exponent (same range) but trims the
            mantissa 23 → 7 bits — fewer precision steps, half the memory.
          </div>
        )}
        <div className="mt-2 font-mono text-[var(--muted)]">
          each step down (FP32 → FP16/BF16 → FP8/INT8) roughly halves bytes and doubles throughput.
        </div>
      </div>

      {/* Controls row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {FORMATS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setSel(f.key)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={f.key === sel ? { background: "var(--background)" } : undefined}
            aria-pressed={f.key === sel}
          >
            {f.name}
          </button>
        ))}
        <span className="font-mono text-[var(--muted)]">
          quantization = mapping high-precision weights into these smaller formats.
        </span>
      </div>
    </div>
  );
}
