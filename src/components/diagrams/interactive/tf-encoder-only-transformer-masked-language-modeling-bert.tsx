"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// --- Hard-coded sentence with two masked positions (SSR-safe) ---
// The input the model sees: "I [MASK] cats and [MASK] ."
// The targets the MLM head should recover at the masked slots.
type Tok = {
  text: string; // what the encoder reads
  masked: boolean; // is this a [MASK] slot?
  target: string; // gold word (for masked slots: the prediction)
};

const TOKENS: Tok[] = [
  { text: "I", masked: false, target: "I" },
  { text: "[MASK]", masked: true, target: "like" },
  { text: "cats", masked: false, target: "cats" },
  { text: "and", masked: false, target: "and" },
  { text: "[MASK]", masked: true, target: "dogs" },
  { text: ".", masked: false, target: "." },
];

const N = TOKENS.length;
const MASK_IDX = TOKENS.map((t, i) => (t.masked ? i : -1)).filter((i) => i >= 0);

// --- Geometry ---
const VW = 480;
const VH = 400;

const TITLE_H = 30;
const MARGIN = 14;

// Token row (input chips) and the contextual-output row sit on a shared grid.
const COL_W = 66; // horizontal spacing per token slot
const GRID_LEFT = (VW - (N - 1) * COL_W) / 2; // center the row
const colX = (i: number) => GRID_LEFT + i * COL_W;

const CHIP_W = 52;
const CHIP_H = 24;

// Vertical bands (top -> bottom).
const Y_PRED = TITLE_H + 14; // prediction head outputs (for masked slots)
const PRED_H = 26;
const Y_ENC_TOP = Y_PRED + PRED_H + 30; // encoder stack box top
const ENC_H = 64; // encoder stack box height (bidirectional attention drawn over it)
const Y_INPUT = Y_ENC_TOP + ENC_H + 30; // input token chip row
const Y_ATTN_TOP = Y_INPUT - 12; // where attention arcs spring from (chip tops)

export function TfEncoderOnly() {
  // Which masked slot is "active" (clicked), drives the attention highlight.
  const [active, setActive] = useState<number>(MASK_IDX[0]);
  // Attention mode: encoder = bidirectional, decoder = causal/left-only.
  const [mode, setMode] = useState<"encoder" | "decoder">("encoder");

  // Source positions that the active token attends to.
  const sources: number[] = [];
  for (let j = 0; j < N; j += 1) {
    if (j === active) continue;
    if (mode === "decoder" && j > active) continue; // causal: no future
    sources.push(j);
  }

  const centerX = VW / 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Encoder-only transformer with masked language modeling (BERT): a sentence with [MASK] tokens enters an encoder with bidirectional self-attention; masked positions are predicted from context on both sides."
      >
        <defs>
          <marker
            id="bert-arrow"
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
            id="bert-arrow-blue"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={C.blue} />
          </marker>
          <marker
            id="bert-arrow-green"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={C.green} />
          </marker>
        </defs>

        {/* ---- Title band ---- */}
        <text
          x={centerX}
          y={20}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Encoder-Only Transformer + MLM (BERT)
        </text>

        {/* ---- Prediction head outputs (only above masked slots) ---- */}
        {MASK_IDX.map((i) => {
          const isActive = i === active;
          const x = colX(i);
          return (
            <g key={`pred-${i}`}>
              <rect
                x={x - CHIP_W / 2}
                y={Y_PRED}
                width={CHIP_W}
                height={PRED_H}
                rx={5}
                fill={isActive ? C.greenFill : "var(--card)"}
                stroke={C.green}
                strokeWidth={isActive ? 1.6 : 1.2}
              />
              <text
                x={x}
                y={Y_PRED + PRED_H / 2 + 4}
                fontSize={11}
                fill={C.ink}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
              >
                {TOKENS[i].target}
              </text>
              {/* arrow from encoder up into the prediction chip */}
              <line
                x1={x}
                y1={Y_ENC_TOP}
                x2={x}
                y2={Y_PRED + PRED_H}
                stroke={C.green}
                strokeWidth={1.4}
                markerEnd="url(#bert-arrow-green)"
              />
            </g>
          );
        })}
        {/* label for the prediction head, to the left, in its own clear space */}
        <text
          x={MARGIN}
          y={Y_PRED + 10}
          fontSize={9}
          fill={C.green}
          fontFamily={MONO}
        >
          MLM head
        </text>
        <text
          x={MARGIN}
          y={Y_PRED + 21}
          fontSize={9}
          fill={C.green}
          fontFamily={MONO}
        >
          predicts
        </text>

        {/* ---- Encoder stack box (bidirectional self-attention happens here) ---- */}
        <rect
          x={GRID_LEFT - CHIP_W / 2 - 10}
          y={Y_ENC_TOP}
          width={(N - 1) * COL_W + CHIP_W + 20}
          height={ENC_H}
          rx={7}
          fill={C.blueFill}
          stroke={C.blue}
        />
        <text
          x={centerX}
          y={Y_ENC_TOP + 14}
          fontSize={10}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Encoder × L ,  {mode === "encoder"
            ? "bidirectional self-attention"
            : "causal (left-only) self-attention"}
        </text>

        {/* contextual vectors: one node per position inside the encoder */}
        {TOKENS.map((t, i) => {
          const x = colX(i);
          const cy = Y_ENC_TOP + ENC_H - 18;
          const isActive = i === active;
          const isSource = sources.includes(i);
          return (
            <g key={`ctx-${i}`}>
              <circle
                cx={x}
                cy={cy}
                r={6}
                fill={
                  isActive
                    ? C.green
                    : isSource
                      ? C.blue
                      : "var(--card)"
                }
                stroke={isActive ? C.green : C.blue}
                strokeWidth={1.4}
              />
            </g>
          );
        })}

        {/* ---- Bidirectional / causal attention arcs into the active token ---- */}
        {sources.map((j) => {
          const xFrom = colX(j);
          const xTo = colX(active);
          const baseY = Y_ENC_TOP + ENC_H - 18;
          // Arc height scales with distance so arcs don't collapse onto each other.
          const dist = Math.abs(j - active);
          const lift = 10 + dist * 8;
          const midX = (xFrom + xTo) / 2;
          const fromRight = j > active; // attending from the right side
          return (
            <path
              key={`attn-${j}`}
              d={`M ${xFrom} ${baseY - 6} Q ${midX} ${baseY - lift} ${xTo} ${baseY - 6}`}
              fill="none"
              stroke={fromRight && mode === "decoder" ? C.coral : C.blue}
              strokeWidth={1.4}
              opacity={0.85}
              markerEnd="url(#bert-arrow-blue)"
            />
          );
        })}

        {/* ---- Input token chips ---- */}
        {TOKENS.map((t, i) => {
          const x = colX(i);
          const isMask = t.masked;
          const isActive = i === active;
          return (
            <g
              key={`tok-${i}`}
              style={{ cursor: isMask ? "pointer" : "default" }}
              onClick={isMask ? () => setActive(i) : undefined}
            >
              <rect
                x={x - CHIP_W / 2}
                y={Y_INPUT}
                width={CHIP_W}
                height={CHIP_H}
                rx={5}
                fill={
                  isMask
                    ? isActive
                      ? C.coralFill
                      : "var(--card)"
                    : "var(--card)"
                }
                stroke={isMask ? C.coral : C.line}
                strokeWidth={isMask && isActive ? 1.8 : 1.2}
              />
              <text
                x={x}
                y={Y_INPUT + CHIP_H / 2 + 4}
                fontSize={isMask ? 9 : 11}
                fill={isMask ? C.coral : C.ink}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={isMask ? 600 : 400}
              >
                {t.text}
              </text>
              {/* arrow from input chip up into the encoder */}
              <line
                x1={x}
                y1={Y_INPUT}
                x2={x}
                y2={Y_ENC_TOP + ENC_H}
                stroke={C.ink}
                strokeWidth={1.2}
                markerEnd="url(#bert-arrow)"
              />
            </g>
          );
        })}
        {/* input row label, left margin, clear of chips */}
        <text
          x={MARGIN}
          y={Y_INPUT + CHIP_H / 2 + 4}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          input
        </text>

        {/* ---- Readout line: what the active mask attends to ---- */}
        <line
          x1={MARGIN}
          y1={Y_INPUT + CHIP_H + 18}
          x2={VW - MARGIN}
          y2={Y_INPUT + CHIP_H + 18}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={MARGIN}
          y={Y_INPUT + CHIP_H + 34}
          fontSize={9.5}
          fill={C.ink}
          fontFamily={MONO}
        >
          {`pos ${active} attends to: {${sources.join(", ")}}  →  predict "${TOKENS[active].target}"`}
        </text>
        <text
          x={MARGIN}
          y={Y_INPUT + CHIP_H + 48}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          {mode === "encoder"
            ? "context from BOTH sides (left + right)"
            : "context from LEFT only, future tokens are hidden"}
        </text>

        {/* ---- 80/10/10 masking-rule inset (bottom-left) ---- */}
        {(() => {
          const ix = MARGIN;
          const iy = Y_INPUT + CHIP_H + 64;
          const iw = 200;
          const ih = 84;
          const rows: [string, string, string][] = [
            ["80%", "[MASK]", C.coral],
            ["10%", "random tok", C.violet],
            ["10%", "unchanged", C.green],
          ];
          return (
            <g>
              <rect
                x={ix}
                y={iy}
                width={iw}
                height={ih}
                rx={6}
                fill="var(--card)"
                stroke={C.line}
              />
              <text
                x={ix + 10}
                y={iy + 16}
                fontSize={9.5}
                fill={C.ink}
                fontFamily={MONO}
                fontWeight={600}
              >
                masking rule (15% of tokens)
              </text>
              {rows.map((r, k) => {
                const ry = iy + 30 + k * 17;
                return (
                  <g key={`mr-${k}`}>
                    <rect
                      x={ix + 10}
                      y={ry}
                      width={34}
                      height={13}
                      rx={3}
                      fill={r[2]}
                      opacity={0.18}
                      stroke={r[2]}
                    />
                    <text
                      x={ix + 27}
                      y={ry + 10}
                      fontSize={9}
                      fill={C.ink}
                      fontFamily={MONO}
                      textAnchor="middle"
                    >
                      {r[0]}
                    </text>
                    <text
                      x={ix + 52}
                      y={ry + 10}
                      fontSize={9}
                      fill={C.ink}
                      fontFamily={MONO}
                    >
                      → {r[1]}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* ---- Encoder vs decoder mini-comparison (bottom-right) ---- */}
        {(() => {
          const ix = VW - MARGIN - 220;
          const iy = Y_INPUT + CHIP_H + 64;
          const iw = 220;
          const ih = 84;
          // 4 dots in a row; draw allowed attention into the middle node.
          const dotY = iy + 50;
          const dots = [ix + 40, ix + 80, ix + 120, ix + 160];
          const center = 2; // the node receiving attention (index into dots)
          return (
            <g>
              <rect
                x={ix}
                y={iy}
                width={iw}
                height={ih}
                rx={6}
                fill="var(--card)"
                stroke={C.line}
              />
              <text
                x={ix + 10}
                y={iy + 16}
                fontSize={9.5}
                fill={C.ink}
                fontFamily={MONO}
                fontWeight={600}
              >
                {mode === "encoder" ? "encoder: ↔ both" : "decoder: → left only"}
              </text>
              <text
                x={ix + 10}
                y={iy + 30}
                fontSize={8.5}
                fill={C.muted}
                fontFamily={MONO}
              >
                attention into the • node
              </text>
              {dots.map((dx, k) => (
                <circle
                  key={`cmp-dot-${k}`}
                  cx={dx}
                  cy={dotY}
                  r={k === center ? 5 : 4}
                  fill={k === center ? C.green : "var(--card)"}
                  stroke={k === center ? C.green : C.line}
                  strokeWidth={1.3}
                />
              ))}
              {dots.map((dx, k) => {
                if (k === center) return null;
                if (mode === "decoder" && k > center) return null; // no future
                const fromRight = k > center;
                const midX = (dx + dots[center]) / 2;
                return (
                  <path
                    key={`cmp-arc-${k}`}
                    d={`M ${dx} ${dotY - 5} Q ${midX} ${dotY - 18} ${dots[center]} ${dotY - 5}`}
                    fill="none"
                    stroke={fromRight ? C.blue : C.blue}
                    strokeWidth={1.2}
                    markerEnd="url(#bert-arrow-blue)"
                  />
                );
              })}
            </g>
          );
        })()}

        {/* ---- Caption band (very bottom) ---- */}
        <text
          x={centerX}
          y={VH - 12}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Bidirectional attention + predict the masked words = deep two-sided understanding.
        </text>
      </svg>

      {/* ---- Controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">predict mask:</span>
        {MASK_IDX.map((i) => (
          <button
            key={`btn-mask-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              active === i
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            pos {i} → {TOKENS[i].target}
          </button>
        ))}

        <span className="font-mono text-[var(--muted)]">attention:</span>
        <button
          type="button"
          onClick={() => setMode("encoder")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            mode === "encoder"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          encoder (↔)
        </button>
        <button
          type="button"
          onClick={() => setMode("decoder")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            mode === "decoder"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          decoder (→)
        </button>
      </div>
    </div>
  );
}
