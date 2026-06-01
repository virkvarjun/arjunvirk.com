"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Input words (one per encoder hidden state h1..h5).
const WORDS: string[] = ["the", "cat", "sat", "on", "mat"];

// Hard-coded, deterministic attention distributions for each decoder step.
// Each row sums to ~1.0. Different steps focus on different input words,
// illustrating how the decoder builds a custom summary every step.
const STEPS: { label: string; alpha: number[] }[] = [
  { label: "step 1", alpha: [0.62, 0.18, 0.09, 0.06, 0.05] },
  { label: "step 2", alpha: [0.12, 0.58, 0.16, 0.08, 0.06] },
  { label: "step 3", alpha: [0.07, 0.14, 0.55, 0.16, 0.08] },
  { label: "step 4", alpha: [0.05, 0.08, 0.17, 0.52, 0.18] },
  { label: "step 5", alpha: [0.04, 0.06, 0.1, 0.2, 0.6] },
];

// --- Geometry (viewBox 560 x 420) ---
const W = 560;
const H = 420;

// Encoder boxes across the top.
const ENC_W = 66;
const ENC_H = 34;
const ENC_Y = 48; // top edge of encoder boxes
const ENC_CX: number[] = [56, 156, 256, 356, 456]; // box centers (x)

// Decoder query box (bottom-left).
const Q_X = 24;
const Q_Y = 318;
const Q_W = 150;
const Q_H = 46;
const Q_CX = Q_X + Q_W / 2;
const Q_TOP_Y = Q_Y; // arrows start from top edge of query box

// Context-vector box (bottom-right).
const CTX_X = 200;
const CTX_Y = 322;
const CTX_W = 168;
const CTX_H = 56;

// Bar chart region (right side, mid-lower).
const BAR_X0 = 398; // left edge of first bar
const BAR_BASE_Y = 372; // baseline (y of bottom of bars)
const BAR_MAX_H = 92; // pixels for alpha = 1.0
const BAR_W = 22;
const BAR_GAP = 10;
const BAR_TOP_LABEL_Y = 262; // y for the bar-chart title

export function TfBahdanau() {
  const [step, setStep] = useState<number>(0);
  const alpha = STEPS[step].alpha;
  const maxA = Math.max(...alpha);

  // Map an attention weight to a stroke width (thin -> thick).
  const widthFor = (a: number): number => 0.8 + a * 8.5;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Bahdanau attention added to a seq2seq model: a decoder query attends over five encoder hidden states with weighted arrows, a context vector, and a bar chart of attention weights that sums to one"
      >
        {/* Title */}
        <text
          x={W / 2}
          y={22}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Bahdanau Attention (added to Seq2Seq)
        </text>

        {/* Encoder row caption */}
        <text
          x={ENC_CX[0] - ENC_W / 2}
          y={ENC_Y - 8}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="start"
        >
          encoder hidden states
        </text>

        {/* Attention arrows: query -> each encoder state. Drawn first so
            the boxes and labels render on top. */}
        {ENC_CX.map((cx: number, i: number) => {
          const a = alpha[i];
          const x2 = cx;
          const y2 = ENC_Y + ENC_H + 2; // just under the encoder box
          const x1 = Q_CX;
          const y1 = Q_TOP_Y;
          const active = a === maxA;
          const color = active ? C.blue : C.muted;
          const ang = Math.atan2(y2 - y1, x2 - x1);
          const head = 7;
          const a1 = ang + Math.PI - 0.4;
          const a2 = ang + Math.PI + 0.4;
          // Label position: a point partway up the arrow, nudged to the side
          // (perpendicular) so it never sits on the line or a crossing point.
          const t = 0.5;
          const lx = x1 + (x2 - x1) * t;
          const ly = y1 + (y2 - y1) * t;
          // perpendicular unit vector
          const plen = Math.hypot(x2 - x1, y2 - y1);
          const px = -(y2 - y1) / plen;
          const py = (x2 - x1) / plen;
          const off = 13;
          const labX = lx + px * off;
          const labY = ly + py * off;
          return (
            <g key={`arr${i}`} opacity={active ? 1 : 0.85}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={widthFor(a)}
                strokeLinecap="round"
                opacity={active ? 0.9 : 0.5}
              />
              <polygon
                fill={color}
                stroke="none"
                opacity={active ? 0.95 : 0.6}
                points={`${x2},${y2} ${x2 + head * Math.cos(a1)},${y2 + head * Math.sin(a1)} ${x2 + head * Math.cos(a2)},${y2 + head * Math.sin(a2)}`}
              />
              {/* alpha label beside the arrow */}
              <text
                x={labX}
                y={labY}
                fontFamily={MONO}
                fontSize={9}
                fill={active ? C.blue : C.muted}
                textAnchor="middle"
                fontWeight={active ? 600 : 400}
              >
                {`a_i${i + 1}`}
              </text>
            </g>
          );
        })}

        {/* Encoder boxes */}
        {ENC_CX.map((cx: number, i: number) => {
          const x = cx - ENC_W / 2;
          const active = alpha[i] === maxA;
          return (
            <g key={`enc${i}`}>
              <rect
                x={x}
                y={ENC_Y}
                width={ENC_W}
                height={ENC_H}
                rx={5}
                fill={active ? C.blueFill : "var(--card)"}
                stroke={active ? C.blue : C.ink}
                strokeWidth={active ? 2 : 1.3}
              />
              <text
                x={cx}
                y={ENC_Y + 15}
                fontFamily={MONO}
                fontSize={10.5}
                fill={active ? C.blue : C.ink}
                textAnchor="middle"
                fontWeight={600}
              >
                {`h${i + 1}`}
              </text>
              <text
                x={cx}
                y={ENC_Y + 28}
                fontFamily={MONO}
                fontSize={9.5}
                fill={C.muted}
                textAnchor="middle"
              >
                {`"${WORDS[i]}"`}
              </text>
            </g>
          );
        })}

        {/* Decoder query box */}
        <g>
          <rect
            x={Q_X}
            y={Q_Y}
            width={Q_W}
            height={Q_H}
            rx={6}
            fill={C.coralFill}
            stroke={C.coral}
            strokeWidth={1.6}
          />
          <text
            x={Q_CX}
            y={Q_Y + 20}
            fontFamily={MONO}
            fontSize={11}
            fill={C.coral}
            textAnchor="middle"
            fontWeight={600}
          >
            s_(i-1)
          </text>
          <text
            x={Q_CX}
            y={Q_Y + 35}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
          >
            decoder query
          </text>
        </g>

        {/* Context-vector box (assembled weighted blend) */}
        <g>
          <rect
            x={CTX_X}
            y={CTX_Y}
            width={CTX_W}
            height={CTX_H}
            rx={6}
            fill={C.greenFill}
            stroke={C.green}
            strokeWidth={1.6}
          />
          <text
            x={CTX_X + CTX_W / 2}
            y={CTX_Y + 18}
            fontFamily={MONO}
            fontSize={10.5}
            fill={C.green}
            textAnchor="middle"
            fontWeight={600}
          >
            c_i = sum a_ij h_j
          </text>
          <text
            x={CTX_X + CTX_W / 2}
            y={CTX_Y + 33}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
          >
            weighted blend of h1..h5
          </text>
          <text
            x={CTX_X + CTX_W / 2}
            y={CTX_Y + 47}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
          >
            {`-> feeds decoder step ${step + 1}`}
          </text>
        </g>

        {/* Arrow: query -> context (the query selects the blend) */}
        <line
          x1={Q_X + Q_W}
          y1={Q_Y + Q_H / 2}
          x2={CTX_X - 3}
          y2={CTX_Y + CTX_H / 2}
          stroke={C.line}
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />

        {/* Bar chart of the alpha weights */}
        <g>
          <text
            x={BAR_X0}
            y={BAR_TOP_LABEL_Y}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.muted}
            textAnchor="start"
          >
            attention weights (Σ=1)
          </text>
          {/* baseline */}
          <line
            x1={BAR_X0 - 6}
            y1={BAR_BASE_Y}
            x2={BAR_X0 + 5 * (BAR_W + BAR_GAP)}
            y2={BAR_BASE_Y}
            stroke={C.line}
            strokeWidth={1}
          />
          {alpha.map((a: number, i: number) => {
            const bx = BAR_X0 + i * (BAR_W + BAR_GAP);
            const bh = a * BAR_MAX_H;
            const active = a === maxA;
            return (
              <g key={`bar${i}`}>
                <rect
                  x={bx}
                  y={BAR_BASE_Y - bh}
                  width={BAR_W}
                  height={bh}
                  rx={2}
                  fill={active ? C.blue : C.blueFill}
                  stroke={active ? C.blue : C.line}
                  strokeWidth={1}
                />
                {/* value on top of bar */}
                <text
                  x={bx + BAR_W / 2}
                  y={BAR_BASE_Y - bh - 4}
                  fontFamily={MONO}
                  fontSize={8.5}
                  fill={active ? C.blue : C.muted}
                  textAnchor="middle"
                  fontWeight={active ? 600 : 400}
                >
                  {a.toFixed(2)}
                </text>
                {/* category label under bar */}
                <text
                  x={bx + BAR_W / 2}
                  y={BAR_BASE_Y + 11}
                  fontFamily={MONO}
                  fontSize={8.5}
                  fill={C.muted}
                  textAnchor="middle"
                >
                  {`h${i + 1}`}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">decoder step:</span>
        {STEPS.map((s: { label: string; alpha: number[] }, i: number) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStep(i)}
            aria-pressed={step === i}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              step === i
                ? { borderColor: C.blue, color: C.blue }
                : undefined
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="mt-2 font-mono text-xs text-[var(--muted)]">
        The decoder builds a custom summary each step instead of reusing one
        frozen vector.
      </p>
    </div>
  );
}
