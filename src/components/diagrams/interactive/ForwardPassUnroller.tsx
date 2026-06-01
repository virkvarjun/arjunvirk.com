"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Each step computes one intermediate quantity, inside-out. `slice` marks
// which token-range of the nested formula tokens it highlights, and `layer`
// names which network column (0..2) lights up.
type Step = {
  text: string;
  slice: [number, number];
  layer: number;
};

const STEPS: Step[] = [
  { text: "z¹ = W¹·x + b¹", slice: [9, 16], layer: 0 },
  { text: "a¹ = σ(z¹)", slice: [7, 17], layer: 0 },
  { text: "z² = W² a¹ + b²", slice: [5, 19], layer: 1 },
  { text: "a² = σ(z²)", slice: [3, 21], layer: 1 },
  { text: "z³ = W³ a² + b³", slice: [1, 23], layer: 2 },
  { text: "a³ = σ(z³) = ŷ", slice: [0, 25], layer: 2 },
];

// The nested prediction formula, broken into tokens so a contiguous slice can
// be boxed. Token index ranges correspond to STEPS[*].slice.
const TOKENS = [
  "ŷ", " = ", "σ(", "W³", "·", "σ(", "W²", "·", "σ(", "W¹", " ",
  "x", " + ", "b¹", " )", " + ", "b²", " )", " + ", "b³", " )",
];
// 21 tokens; slice indices above are clamped to this length.

// Vector sizes flowing through the net: input 3 → 4 → 4 → 2.
const SIZES = [3, 4, 4, 2];
const COUNTS = [3, 4, 4, 2]; // neurons drawn per column

export function ForwardPassUnroller() {
  // step = number of stages completed (0..6). Pointer is at index step-1.
  const [step, setStep] = useState<number>(0);

  const done = step >= STEPS.length;
  const current = step > 0 ? STEPS[step - 1] : null;
  const activeLayer = current ? current.layer : -1;
  const slice = current ? current.slice : ([-1, -1] as [number, number]);

  // Column x positions for the 3-layer drawing (plus an input column).
  const colX = [70, 170, 270, 370];
  const colY = 205; // vertical centre of network drawing
  const rowGap = 16;
  const neuronR = 6;

  const neuronY = (col: number, i: number) => {
    const n = COUNTS[col];
    return colY + (i - (n - 1) / 2) * rowGap;
  };

  return (
    <div>
      <svg
        viewBox="0 0 440 260"
        className="h-auto w-full"
        role="img"
        aria-label="Forward pass unroller"
      >
        {/* Nested prediction formula, token by token, with a boxed slice. */}
        {(() => {
          const charW = 7.0;
          let x = 14;
          const baseY = 26;
          const spans: {
            tok: string;
            x: number;
            w: number;
            on: boolean;
          }[] = [];
          for (let i = 0; i < TOKENS.length; i++) {
            const tok = TOKENS[i];
            const w = tok.length * charW;
            const on = i >= slice[0] && i <= slice[1];
            spans.push({ tok, x, w, on });
            x += w;
          }
          // Bounding box of the highlighted contiguous slice.
          const onSpans = spans.filter((s) => s.on);
          const box =
            onSpans.length > 0
              ? {
                  x: onSpans[0].x - 2,
                  w:
                    onSpans[onSpans.length - 1].x +
                    onSpans[onSpans.length - 1].w -
                    onSpans[0].x +
                    4,
                }
              : null;
          return (
            <g fontFamily={MONO} fontSize={12}>
              {box && (
                <rect
                  x={box.x}
                  y={baseY - 13}
                  width={box.w}
                  height={18}
                  rx={3}
                  fill={C.coralFill}
                  stroke={C.coral}
                  strokeWidth={1.2}
                />
              )}
              {spans.map((s, i) => (
                <text
                  key={i}
                  x={s.x}
                  y={baseY}
                  fill={s.on ? C.coral : C.ink}
                  fontWeight={s.on ? 600 : 400}
                >
                  {s.tok}
                </text>
              ))}
            </g>
          );
        })()}

        {/* Accumulated computed lines, inside-out. */}
        <g fontFamily={MONO} fontSize={11}>
          <text x={14} y={52} fill={C.muted}>
            evaluate inside-out:
          </text>
          {STEPS.map((s, i) => {
            if (i >= step) return null;
            const isCurrent = i === step - 1;
            return (
              <text
                key={i}
                x={22}
                y={70 + i * 16}
                fill={isCurrent ? C.coral : C.ink}
                fontWeight={isCurrent ? 600 : 400}
              >
                {`${i + 1}. ${s.text}`}
              </text>
            );
          })}
          {step === 0 && (
            <text x={22} y={70} fill={C.muted}>
              press Step to begin
            </text>
          )}
        </g>

        {/* Network drawing: input column + 3 layers. */}
        <g>
          {/* connections between adjacent columns */}
          {colX.slice(0, -1).map((cx, c) => (
            <g key={`edges-${c}`}>
              {Array.from({ length: COUNTS[c] }).map((_, i) =>
                Array.from({ length: COUNTS[c + 1] }).map((__, j) => (
                  <line
                    key={`${i}-${j}`}
                    x1={colX[c] + neuronR}
                    y1={neuronY(c, i)}
                    x2={colX[c + 1] - neuronR}
                    y2={neuronY(c + 1, j)}
                    stroke={C.line}
                    strokeWidth={0.5}
                  />
                )),
              )}
            </g>
          ))}

          {/* neuron columns. col 0 = input x, cols 1..3 = layers 0..2 */}
          {colX.map((cx, c) => {
            // c=0 input; c-1 maps to STEPS layer index for layers
            const layerIdx = c - 1;
            const lit = layerIdx >= 0 && layerIdx === activeLayer;
            const evaluated = layerIdx >= 0 && step > 0 && layerIdx < activeLayer;
            const fill = lit
              ? C.blueFill
              : evaluated
                ? C.greenFill
                : "var(--card)";
            const stroke = lit ? C.blue : evaluated ? C.green : C.line;
            return (
              <g key={`col-${c}`}>
                {Array.from({ length: COUNTS[c] }).map((_, i) => (
                  <circle
                    key={i}
                    cx={cx}
                    cy={neuronY(c, i)}
                    r={neuronR}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={lit ? 1.8 : 1.2}
                  />
                ))}
                {/* column label + size */}
                <text
                  x={cx}
                  y={252}
                  fontSize={10}
                  fontFamily={MONO}
                  fill={lit ? C.blue : C.muted}
                  textAnchor="middle"
                  fontWeight={lit ? 600 : 400}
                >
                  {c === 0 ? "x" : `a${["¹", "²", "³"][layerIdx]}`}
                </text>
                <text
                  x={cx}
                  y={144}
                  fontSize={9}
                  fontFamily={MONO}
                  fill={C.muted}
                  textAnchor="middle"
                >
                  {`size ${SIZES[c]}`}
                </text>
              </g>
            );
          })}

          {/* size-flow arrows between labels */}
          {colX.slice(0, -1).map((cx, c) => (
            <text
              key={`flow-${c}`}
              x={(colX[c] + colX[c + 1]) / 2}
              y={144}
              fontSize={9}
              fontFamily={MONO}
              fill={C.muted}
              textAnchor="middle"
            >
              →
            </text>
          ))}
        </g>

        {/* status */}
        <text
          x={426}
          y={52}
          fontSize={10}
          fontFamily={MONO}
          fill={done ? C.green : C.muted}
          textAnchor="end"
        >
          {done ? "ŷ ready" : `step ${step} / ${STEPS.length}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
          disabled={done}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => setStep(STEPS.length)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Run all
        </button>
        <button
          type="button"
          onClick={() => setStep(0)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <span className="font-mono text-[var(--muted)]">
          the network is just the layer equation composed 3 times
        </span>
      </div>
    </div>
  );
}
