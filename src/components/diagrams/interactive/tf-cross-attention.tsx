"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Encoder input tokens (English source sentence).
const ENC_WORDS: string[] = ["I", "like", "cats"];

// Decoder generation steps (French target). Each step has the word being
// produced and a hard-coded cross-attention distribution over the three
// encoder tokens (each row sums to ~1.0). The attention shifts to the
// relevant English word at each step.
const STEPS: { word: string; gloss: string; attn: number[] }[] = [
  { word: "J'aime", gloss: "(I like)", attn: [0.55, 0.34, 0.11] },
  { word: "les", gloss: "(the)", attn: [0.18, 0.22, 0.6] },
  { word: "chats", gloss: "(cats)", attn: [0.09, 0.16, 0.75] },
];

// --- Geometry (viewBox 520 x 360) ---
const W = 520;
const H = 360;

// Encoder boxes: stacked vertically on the LEFT.
const ENC_X = 30;
const ENC_W = 96;
const ENC_H = 40;
const ENC_GAP = 18;
const ENC_Y0 = 84; // top edge of first encoder box
const encTop = (i: number): number => ENC_Y0 + i * (ENC_H + ENC_GAP);
const encCY = (i: number): number => encTop(i) + ENC_H / 2;
const ENC_RIGHT = ENC_X + ENC_W; // x where arrows attach

// Decoder query box: RIGHT side, vertically centered against encoder stack.
const Q_X = 350;
const Q_W = 142;
const Q_H = 78;
const ENC_MID = (encCY(0) + encCY(ENC_WORDS.length - 1)) / 2;
const Q_Y = ENC_MID - Q_H / 2;
const Q_LEFT = Q_X; // x where arrows attach
const Q_CY = Q_Y + Q_H / 2;

// Map an attention weight to a stroke width (thin -> thick).
const widthFor = (a: number): number => 1 + a * 9;

export function TfCrossAttention() {
  const [step, setStep] = useState<number>(0);
  const attn = STEPS[step].attn;
  const maxA = Math.max(...attn);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Cross-attention: the decoder query attends back over the encoder output. Q comes from the decoder while K and V come from the encoder, with arrow thickness showing attention weight as each French word is generated."
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={24}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Cross-Attention
        </text>

        {/* Side captions (kept above each column, clear of boxes) */}
        <text
          x={ENC_X}
          y={54}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.blue}
          textAnchor="start"
          fontWeight={600}
        >
          Encoder output
        </text>
        <text
          x={ENC_X}
          y={68}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="start"
        >
          K, V come from here
        </text>

        <text
          x={Q_X + Q_W}
          y={54}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.coral}
          textAnchor="end"
          fontWeight={600}
        >
          Decoder state
        </text>
        <text
          x={Q_X + Q_W}
          y={68}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="end"
        >
          Q comes from here
        </text>

        {/* Attention arrows: decoder query -> each encoder box.
            Drawn first so boxes/labels render on top. Thickness = weight.
            Q is the source (right), K/V boxes are the targets (left). */}
        {ENC_WORDS.map((_w: string, i: number) => {
          const a = attn[i];
          const active = a === maxA;
          const x1 = Q_LEFT; // start at decoder query (left edge)
          const y1 = Q_CY;
          const x2 = ENC_RIGHT + 6; // end just right of the encoder box
          const y2 = encCY(i);
          const color = active ? C.blue : C.muted;
          const ang = Math.atan2(y2 - y1, x2 - x1);
          const head = 7;
          const a1 = ang + Math.PI - 0.4;
          const a2 = ang + Math.PI + 0.4;
          return (
            <g key={`arr${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={widthFor(a)}
                strokeLinecap="round"
                opacity={active ? 0.9 : 0.45}
              />
              <polygon
                fill={color}
                stroke="none"
                opacity={active ? 0.95 : 0.5}
                points={`${x2},${y2} ${x2 + head * Math.cos(a1)},${y2 + head * Math.sin(a1)} ${x2 + head * Math.cos(a2)},${y2 + head * Math.sin(a2)}`}
              />
            </g>
          );
        })}

        {/* Encoder boxes (K, V source) */}
        {ENC_WORDS.map((w: string, i: number) => {
          const active = attn[i] === maxA;
          const top = encTop(i);
          return (
            <g key={`enc${i}`}>
              <rect
                x={ENC_X}
                y={top}
                width={ENC_W}
                height={ENC_H}
                rx={6}
                fill={active ? C.blueFill : "var(--card)"}
                stroke={active ? C.blue : C.ink}
                strokeWidth={active ? 2 : 1.3}
              />
              <text
                x={ENC_X + ENC_W / 2}
                y={top + 18}
                fontFamily={MONO}
                fontSize={11}
                fill={active ? C.blue : C.ink}
                textAnchor="middle"
                fontWeight={600}
              >
                {`"${w}"`}
              </text>
              <text
                x={ENC_X + ENC_W / 2}
                y={top + 32}
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.muted}
                textAnchor="middle"
              >
                {`K${i + 1}, V${i + 1}`}
              </text>
            </g>
          );
        })}

        {/* Weight readouts: placed in their own column just left of the
            decoder box, beside each arrow's right end. Clear of boxes/lines. */}
        {ENC_WORDS.map((_w: string, i: number) => {
          const a = attn[i];
          const active = a === maxA;
          // Place the weight label partway along the arrow, nudged
          // perpendicular so it never sits on the line or on a box.
          const x1 = Q_LEFT;
          const y1 = Q_CY;
          const x2 = ENC_RIGHT + 6;
          const y2 = encCY(i);
          const t = 0.62; // toward the encoder end
          const lx = x1 + (x2 - x1) * t;
          const ly = y1 + (y2 - y1) * t;
          const plen = Math.hypot(x2 - x1, y2 - y1);
          // perpendicular pointing "outward" (up for top arrows, down for bottom)
          const sign = y2 <= y1 ? -1 : 1;
          const px = (-(y2 - y1) / plen) * sign * -1;
          const py = ((x2 - x1) / plen) * sign * -1;
          const off = 13;
          return (
            <text
              key={`wt${i}`}
              x={lx + px * off}
              y={ly + py * off + 3}
              fontFamily={MONO}
              fontSize={9}
              fill={active ? C.blue : C.muted}
              textAnchor="middle"
              fontWeight={active ? 600 : 400}
            >
              {a.toFixed(2)}
            </text>
          );
        })}

        {/* Decoder query box (Q source) */}
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
            x={Q_X + Q_W / 2}
            y={Q_Y + 20}
            fontFamily={MONO}
            fontSize={10.5}
            fill={C.coral}
            textAnchor="middle"
            fontWeight={600}
          >
            Q (query)
          </text>
          <text
            x={Q_X + Q_W / 2}
            y={Q_Y + 38}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
          >
            producing:
          </text>
          <text
            x={Q_X + Q_W / 2}
            y={Q_Y + 55}
            fontFamily={MONO}
            fontSize={12}
            fill={C.ink}
            textAnchor="middle"
            fontWeight={600}
          >
            {STEPS[step].word}
          </text>
          <text
            x={Q_X + Q_W / 2}
            y={Q_Y + 70}
            fontFamily={MONO}
            fontSize={8.5}
            fill={C.muted}
            textAnchor="middle"
          >
            {STEPS[step].gloss}
          </text>
        </g>

        {/* Readout band BELOW the drawing (its own clear horizontal band) */}
        <text
          x={W / 2}
          y={H - 40}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
        >
          {`step ${step + 1}: "${STEPS[step].word}" attends most to "${
            ENC_WORDS[attn.indexOf(maxA)]
          }"`}
        </text>

        {/* Caption band */}
        <text
          x={W / 2}
          y={H - 20}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Q from the decoder, K and V from the encoder, the decoder looks
          back at the input.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">generate:</span>
        {STEPS.map((s: { word: string; gloss: string; attn: number[] }, i: number) => (
          <button
            key={s.word}
            type="button"
            onClick={() => setStep(i)}
            aria-pressed={step === i}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={step === i ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {s.word}
          </button>
        ))}
      </div>

      <p className="mt-2 font-mono text-xs text-[var(--muted)]">
        Step through the French output and watch cross-attention shift to the
        relevant English word.
      </p>
    </div>
  );
}
