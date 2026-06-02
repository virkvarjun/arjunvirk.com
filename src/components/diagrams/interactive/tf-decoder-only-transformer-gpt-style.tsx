"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// A tiny deterministic "next token" model: given the last token in the
// sequence, pick a plausible follow-on. Hard-coded so the component is
// fully SSR-safe (no Math.random / Date).
const NEXT: Record<string, string> = {
  the: "cat",
  cat: "sat",
  sat: "on",
  on: "the",
  a: "small",
  small: "dog",
  dog: "ran",
  ran: "fast",
  hello: "world",
  world: "and",
  and: "then",
  then: "the",
};

function predict(seq: string[]): string {
  const last = seq[seq.length - 1]?.toLowerCase() ?? "the";
  return NEXT[last] ?? "the";
}

// Geometry inside the tall viewBox (0 0 460 600).
const VW = 460;
const VH = 600;
const STACK_X = 130; // left edge of the layer stack
const STACK_W = 200; // width of the layer stack boxes

// Sub-block heights inside one decoder layer.
const SUB_H = 20;
const SUB_GAP = 5;
const LAYER_PAD = 8;
const TITLE_STRIP = 13;
// A layer = title strip + 4 sub-blocks. Compute its height.
const LAYER_H = LAYER_PAD * 2 + TITLE_STRIP + SUB_H * 4 + SUB_GAP * 4;

const SUBS = [
  "Masked Self-Attention",
  "Add & Norm",
  "Feed-Forward (FFN)",
  "Add & Norm",
] as const;

export function TfDecoderOnly() {
  const [prompt, setPrompt] = useState<string>("the cat");
  const [generated, setGenerated] = useState<string[]>([]);
  const [layers, setLayers] = useState<number>(3);

  const baseTokens = prompt.trim().length
    ? prompt.trim().split(/\s+/).slice(0, 8)
    : [];
  const seq = [...baseTokens, ...generated];

  const step = () => {
    if (seq.length === 0) return;
    if (seq.length >= 12) return;
    setGenerated((g) => [...g, predict([...baseTokens, ...g])]);
  };
  const reset = () => setGenerated([]);

  // --- Vertical layout (bottom-to-top flow, drawn top-to-bottom) ---
  const titleBandH = 30;
  const topMargin = titleBandH + 10;

  const outputH = 24; // "next-token probabilities" box
  const softmaxH = 22;
  const linearH = 22;
  const blockGap = 12;

  const yOutput = topMargin;
  const ySoftmax = yOutput + outputH + blockGap;
  const yLinear = ySoftmax + softmaxH + blockGap;

  // Decoder stack sits below Linear. Show at most 2 full layer boxes; if
  // layers>2 the middle is an ellipsis box representing the repeat.
  const stackTop = yLinear + linearH + blockGap;

  // Build the list of layer boxes to draw (top = layer N, bottom = layer 1).
  type LayerBox = { kind: "layer" | "ellipsis"; idxLabel: string };
  const layerBoxes: LayerBox[] = [];
  if (layers <= 2) {
    for (let i = layers; i >= 1; i -= 1) {
      layerBoxes.push({ kind: "layer", idxLabel: `Decoder Layer ${i}` });
    }
  } else {
    layerBoxes.push({ kind: "layer", idxLabel: `Decoder Layer ${layers}` });
    layerBoxes.push({ kind: "ellipsis", idxLabel: `… × ${layers - 2} more …` });
    layerBoxes.push({ kind: "layer", idxLabel: "Decoder Layer 1" });
  }

  const ELLIPSIS_H = 26;
  const layerGap = 12;
  let yCursor = stackTop;
  const placed = layerBoxes.map((b) => {
    const h = b.kind === "layer" ? LAYER_H : ELLIPSIS_H;
    const top = yCursor;
    yCursor += h + layerGap;
    return { ...b, top, h };
  });

  const stackBottom = yCursor - layerGap;

  // Embeddings band below the stack.
  const embGap = 12;
  const embH = 30;
  const yEmb = stackBottom + embGap;

  // Sequence / readout band below everything.
  const seqBandTop = yEmb + embH + 16;

  // Arrow geometry for the autoregressive loop (right side).
  const loopX = STACK_X + STACK_W + 24;

  const centerX = STACK_X + STACK_W / 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Decoder-only transformer (GPT-style): a stack of masked self-attention and feed-forward layers predicting the next token autoregressively"
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={20}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Decoder-Only Transformer (GPT-style)
        </text>

        {/* defs: arrowhead */}
        <defs>
          <marker
            id="dot-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={C.ink} />
          </marker>
          <marker
            id="dot-arrow-blue"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={C.blue} />
          </marker>
        </defs>

        {/* ---- Output: next-token probabilities ---- */}
        <rect
          x={STACK_X}
          y={yOutput}
          width={STACK_W}
          height={outputH}
          rx={5}
          fill={C.greenFill}
          stroke={C.green}
        />
        <text
          x={centerX}
          y={yOutput + outputH / 2 + 4}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          next-token probabilities
        </text>

        {/* ---- Softmax ---- */}
        <line
          x1={centerX}
          y1={ySoftmax + softmaxH}
          x2={centerX}
          y2={yOutput + outputH}
          stroke={C.ink}
          strokeWidth={1.4}
          markerEnd="url(#dot-arrow)"
        />
        <rect
          x={STACK_X + 30}
          y={ySoftmax}
          width={STACK_W - 60}
          height={softmaxH}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
        />
        <text
          x={centerX}
          y={ySoftmax + softmaxH / 2 + 4}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Softmax
        </text>

        {/* ---- Linear ---- */}
        <line
          x1={centerX}
          y1={yLinear + linearH}
          x2={centerX}
          y2={ySoftmax + softmaxH}
          stroke={C.ink}
          strokeWidth={1.4}
          markerEnd="url(#dot-arrow)"
        />
        <rect
          x={STACK_X + 30}
          y={yLinear}
          width={STACK_W - 60}
          height={linearH}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
        />
        <text
          x={centerX}
          y={yLinear + linearH / 2 + 4}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Linear
        </text>

        {/* arrow from stack top into Linear */}
        <line
          x1={centerX}
          y1={stackTop}
          x2={centerX}
          y2={yLinear + linearH}
          stroke={C.ink}
          strokeWidth={1.4}
          markerEnd="url(#dot-arrow)"
        />

        {/* ---- Decoder layer stack ---- */}
        {placed.map((b, i) => {
          if (b.kind === "ellipsis") {
            return (
              <g key={`box-${i}`}>
                <rect
                  x={STACK_X + 18}
                  y={b.top}
                  width={STACK_W - 36}
                  height={b.h}
                  rx={5}
                  fill="var(--card)"
                  stroke={C.line}
                  strokeDasharray="4 3"
                />
                <text
                  x={centerX}
                  y={b.top + b.h / 2 + 4}
                  fontSize={10}
                  fill={C.muted}
                  fontFamily={MONO}
                  textAnchor="middle"
                >
                  {b.idxLabel}
                </text>
              </g>
            );
          }
          const titleY = b.top + LAYER_PAD + 10;
          return (
            <g key={`box-${i}`}>
              {/* layer outer box */}
              <rect
                x={STACK_X}
                y={b.top}
                width={STACK_W}
                height={b.h}
                rx={6}
                fill={C.blueFill}
                stroke={C.blue}
              />
              <text
                x={centerX}
                y={titleY}
                fontSize={10}
                fill={C.blue}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
              >
                {b.idxLabel}
              </text>
              {/* four sub-blocks */}
              {SUBS.map((label, k) => {
                const sy =
                  b.top + LAYER_PAD + TITLE_STRIP + k * (SUB_H + SUB_GAP);
                const isAttn = k === 0;
                const isFFN = k === 2;
                const fill = isAttn
                  ? C.coralFill
                  : isFFN
                    ? C.greenFill
                    : "var(--card)";
                const stroke = isAttn
                  ? C.coral
                  : isFFN
                    ? C.green
                    : C.line;
                return (
                  <g key={`sub-${k}`}>
                    <rect
                      x={STACK_X + 14}
                      y={sy}
                      width={STACK_W - 28}
                      height={SUB_H}
                      rx={4}
                      fill={fill}
                      stroke={stroke}
                    />
                    <text
                      x={centerX}
                      y={sy + SUB_H / 2 + 3.5}
                      fontSize={9}
                      fill={C.ink}
                      fontFamily={MONO}
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* arrows between stacked layer boxes */}
        {placed.slice(0, -1).map((b, i) => {
          const below = placed[i + 1];
          return (
            <line
              key={`stackarrow-${i}`}
              x1={centerX}
              y1={below.top}
              x2={centerX}
              y2={b.top + b.h}
              stroke={C.ink}
              strokeWidth={1.4}
              markerEnd="url(#dot-arrow)"
            />
          );
        })}

        {/* ---- Embeddings ---- */}
        <line
          x1={centerX}
          y1={yEmb}
          x2={centerX}
          y2={stackBottom}
          stroke={C.ink}
          strokeWidth={1.4}
          markerEnd="url(#dot-arrow)"
        />
        <rect
          x={STACK_X}
          y={yEmb}
          width={STACK_W}
          height={embH}
          rx={5}
          fill={C.violet}
          opacity={0.14}
          stroke={C.violet}
        />
        <text
          x={centerX}
          y={yEmb + 13}
          fontSize={9.5}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Token + Positional
        </text>
        <text
          x={centerX}
          y={yEmb + 24}
          fontSize={9.5}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Embeddings
        </text>

        {/* ---- "removed" note, left of the stack ---- */}
        <text
          x={14}
          y={stackTop + 14}
          fontSize={8.5}
          fill={C.coral}
          fontFamily={MONO}
        >
          encoder
        </text>
        <text
          x={14}
          y={stackTop + 25}
          fontSize={8.5}
          fill={C.coral}
          fontFamily={MONO}
        >
          removed
        </text>
        <text
          x={14}
          y={stackTop + 42}
          fontSize={8.5}
          fill={C.coral}
          fontFamily={MONO}
        >
          cross-attn
        </text>
        <text
          x={14}
          y={stackTop + 53}
          fontSize={8.5}
          fill={C.coral}
          fontFamily={MONO}
        >
          removed
        </text>
        <text
          x={14}
          y={stackTop + 78}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          causal:
        </text>
        <text
          x={14}
          y={stackTop + 89}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          attend
        </text>
        <text
          x={14}
          y={stackTop + 100}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          backward
        </text>
        <text
          x={14}
          y={stackTop + 111}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          only
        </text>

        {/* ---- Autoregressive loop arrow (right side) ---- */}
        {/* from output box, down the right margin, into embeddings */}
        <path
          d={`M ${STACK_X + STACK_W} ${yOutput + outputH / 2}
              H ${loopX}
              V ${yEmb + embH / 2}
              H ${STACK_X + STACK_W}`}
          fill="none"
          stroke={C.blue}
          strokeWidth={1.4}
          strokeDasharray="5 3"
          markerEnd="url(#dot-arrow-blue)"
        />
        <text
          x={loopX + 6}
          y={(yOutput + yEmb) / 2}
          fontSize={8.5}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="start"
        >
          predicted
        </text>
        <text
          x={loopX + 6}
          y={(yOutput + yEmb) / 2 + 11}
          fontSize={8.5}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="start"
        >
          token fed
        </text>
        <text
          x={loopX + 6}
          y={(yOutput + yEmb) / 2 + 22}
          fontSize={8.5}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="start"
        >
          back in
        </text>

        {/* ---- Sequence readout band (below the drawing) ---- */}
        <line
          x1={14}
          y1={seqBandTop - 8}
          x2={VW - 14}
          y2={seqBandTop - 8}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={14}
          y={seqBandTop + 6}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          sequence (prompt + generated):
        </text>
        {(() => {
          // Lay out tokens as wrapped chips inside the readout band.
          const chipY = seqBandTop + 16;
          const chipH = 18;
          let cx = 14;
          let cy = chipY;
          const rowMax = VW - 14;
          const chips: React.ReactElement[] = [];
          seq.forEach((tok, i) => {
            const w = Math.max(22, tok.length * 6.2 + 12);
            if (cx + w > rowMax) {
              cx = 14;
              cy += chipH + 6;
            }
            const isGen = i >= baseTokens.length;
            chips.push(
              <g key={`chip-${i}`}>
                <rect
                  x={cx}
                  y={cy}
                  width={w}
                  height={chipH}
                  rx={4}
                  fill={isGen ? C.blueFill : "var(--card)"}
                  stroke={isGen ? C.blue : C.line}
                />
                <text
                  x={cx + w / 2}
                  y={cy + chipH / 2 + 3.5}
                  fontSize={9}
                  fill={C.ink}
                  fontFamily={MONO}
                  textAnchor="middle"
                >
                  {tok}
                </text>
              </g>,
            );
            cx += w + 6;
          });
          if (seq.length === 0) {
            chips.push(
              <text
                key="empty"
                x={14}
                y={chipY + 13}
                fontSize={9}
                fill={C.muted}
                fontFamily={MONO}
              >
                (type a prompt below)
              </text>,
            );
          }
          return chips;
        })()}
      </svg>

      {/* ---- Controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono text-[var(--muted)]">prompt</span>
          <input
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setGenerated([]);
            }}
            className="w-36 rounded border border-[var(--border)] px-2 py-1 font-mono text-[var(--foreground)]"
          />
        </label>

        <button
          type="button"
          onClick={step}
          disabled={seq.length === 0 || seq.length >= 12}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          generate next token →
        </button>

        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>

        <label className="flex items-center gap-2">
          <span className="font-mono text-[var(--muted)]">layers N</span>
          <input
            type="range"
            min={1}
            max={12}
            value={layers}
            onChange={(e) => setLayers(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{layers}</span>
        </label>
      </div>
    </div>
  );
}
