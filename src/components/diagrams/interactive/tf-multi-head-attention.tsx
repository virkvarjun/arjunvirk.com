"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Example sentence whose tokens the heads attend over.
const TOKENS: string[] = [
  "He",
  "swung",
  "the",
  "bat",
  "with",
  "incredible",
  "force",
];

// Per-head attention link over the example sentence: each head connects a
// different pair of tokens (source index -> target index), illustrating that
// heads specialize. Up to 8 heads. Index into TOKENS above.
const HEAD_LINKS: { from: number; to: number; note: string }[] = [
  { from: 1, to: 3, note: "swung -> bat" }, // head 1
  { from: 5, to: 6, note: "incredible -> force" }, // head 2
  { from: 0, to: 1, note: "He -> swung" }, // head 3
  { from: 3, to: 6, note: "bat -> force" }, // head 4
  { from: 2, to: 3, note: "the -> bat" }, // head 5
  { from: 4, to: 5, note: "with -> incredible" }, // head 6
  { from: 0, to: 3, note: "He -> bat" }, // head 7
  { from: 1, to: 6, note: "swung -> force" }, // head 8
];

// --- Geometry (viewBox 600 x 560) ---
const W = 600;
const H = 560;

const D_MODEL = 512; // total model dimension

// Lane (head) layout.
const LANE_X = 96; // left edge of the lane band
const LANE_W = 300; // width of the lane band (input -> output)
const LANES_TOP = 70; // top of the first lane
const LANES_BOTTOM = 360; // bottom of the last lane
const QKV_X = LANE_X + 70; // x center of the W_Q/W_K/W_V mini block
const ATTN_X = LANE_X + 170; // x center of the per-head attention block
const OUT_X = LANE_X + LANE_W - 16; // x center of per-head output dot

// Input box (left).
const IN_X = 14;
const IN_Y = 150;
const IN_W = 64;
const IN_H = 120;

// Concat + W_O column (right).
const CC_X = 440; // left edge of concat box
const CC_W = 56;
const CC_TOP = 70;
const CC_BOT = 360;
const WO_X = 512; // left edge of W_O box
const WO_W = 64;
const WO_Y = 175;
const WO_H = 70;

// Attention-pattern panel (bottom band).
const AP_Y = 408; // top of panel band
const TOK_Y = 470; // baseline row for token boxes
const TOK_BOX_W = 70;
const TOK_GAP = 8;
const TOK_TOTAL = TOKENS.length * TOK_BOX_W + (TOKENS.length - 1) * TOK_GAP;
const TOK_X0 = (W - TOK_TOTAL) / 2; // left edge of first token box
const TOK_BOX_H = 26;

function tokenCenterX(i: number): number {
  return TOK_X0 + i * (TOK_BOX_W + TOK_GAP) + TOK_BOX_W / 2;
}

export function TfMultiHead() {
  const [heads, setHeads] = useState<number>(8);
  const [selected, setSelected] = useState<number>(0);

  // Per-head subspace dimension d_k = d_model / h.
  const dk = Math.round(D_MODEL / heads);

  // Clamp the selected head to the available range.
  const sel = selected < heads ? selected : heads - 1;
  const link = HEAD_LINKS[sel];

  // Vertical center of lane i (0-indexed) given `heads` lanes.
  const laneCenterY = (i: number): number => {
    if (heads === 1) return (LANES_TOP + LANES_BOTTOM) / 2;
    const span = LANES_BOTTOM - LANES_TOP;
    return LANES_TOP + (span * i) / (heads - 1);
  };

  // Lane box height scales (loosely) so lanes never collide; never < 16.
  const laneH = Math.max(16, Math.min(30, (LANES_BOTTOM - LANES_TOP) / heads - 6));

  const ccCenterY = (CC_TOP + CC_BOT) / 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Multi-head attention: an input sequence feeds h parallel attention heads, each with its own W_Q, W_K, W_V projections into a d_model/h subspace and its own scaled dot-product attention; the per-head outputs are concatenated and projected by W_O into the combined output. A panel shows how the selected head links different tokens of an example sentence."
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={24}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Multi-Head Attention
        </text>
        <text
          x={W / 2}
          y={42}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          {`h = ${heads} parallel heads,  d_k = d_v = ${D_MODEL}/${heads} = ${dk}`}
        </text>

        {/* Input box (left) */}
        <g>
          <rect
            x={IN_X}
            y={IN_Y}
            width={IN_W}
            height={IN_H}
            rx={6}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1.6}
          />
          <text
            x={IN_X + IN_W / 2}
            y={IN_Y + IN_H / 2 - 6}
            fontFamily={MONO}
            fontSize={11}
            fill={C.blue}
            textAnchor="middle"
            fontWeight={600}
          >
            input
          </text>
          <text
            x={IN_X + IN_W / 2}
            y={IN_Y + IN_H / 2 + 9}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
          >
            {`d=${D_MODEL}`}
          </text>
        </g>

        {/* Heads-band caption */}
        <text
          x={LANE_X}
          y={LANES_TOP - 18}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="start"
        >
          {`${heads} parallel heads`}
        </text>
        {/* Concat-band caption */}
        <text
          x={CC_X + CC_W / 2}
          y={CC_TOP - 18}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          concat
        </text>
        <text
          x={WO_X + WO_W / 2}
          y={WO_Y - 16}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          mix
        </text>

        {/* Lanes (heads), drawn back-to-front: links first under boxes. */}
        {Array.from({ length: heads }, (_, i) => i).map((i: number) => {
          const cy = laneCenterY(i);
          const active = i === sel;
          const stroke = active ? C.coral : C.ink;
          const faint = active ? 1 : 0.55;
          const half = laneH / 2;
          return (
            <g key={`lane${i}`} opacity={faint}>
              {/* input -> QKV connector */}
              <line
                x1={IN_X + IN_W}
                y1={cy}
                x2={QKV_X - 22}
                y2={cy}
                stroke={active ? C.coral : C.line}
                strokeWidth={active ? 1.8 : 1}
              />
              {/* QKV mini block */}
              <rect
                x={QKV_X - 22}
                y={cy - half}
                width={44}
                height={laneH}
                rx={3}
                fill={active ? C.coralFill : "var(--card)"}
                stroke={stroke}
                strokeWidth={active ? 1.8 : 1.1}
              />
              <text
                x={QKV_X}
                y={cy + 3}
                fontFamily={MONO}
                fontSize={laneH >= 22 ? 9 : 8}
                fill={active ? C.coral : C.ink}
                textAnchor="middle"
                fontWeight={active ? 600 : 400}
              >
                WQKV
              </text>
              {/* QKV -> attention connector */}
              <line
                x1={QKV_X + 22}
                y1={cy}
                x2={ATTN_X - 34}
                y2={cy}
                stroke={active ? C.coral : C.line}
                strokeWidth={active ? 1.8 : 1}
              />
              {/* per-head attention block */}
              <rect
                x={ATTN_X - 34}
                y={cy - half}
                width={68}
                height={laneH}
                rx={3}
                fill={active ? C.coralFill : "var(--card)"}
                stroke={stroke}
                strokeWidth={active ? 1.8 : 1.1}
              />
              <text
                x={ATTN_X}
                y={cy + 3}
                fontFamily={MONO}
                fontSize={laneH >= 22 ? 9 : 8}
                fill={active ? C.coral : C.ink}
                textAnchor="middle"
                fontWeight={active ? 600 : 400}
              >
                {`attn ${i + 1}`}
              </text>
              {/* attention -> output connector */}
              <line
                x1={ATTN_X + 34}
                y1={cy}
                x2={OUT_X - 6}
                y2={cy}
                stroke={active ? C.coral : C.line}
                strokeWidth={active ? 1.8 : 1}
              />
              {/* per-head output dot */}
              <circle
                cx={OUT_X}
                cy={cy}
                r={4.5}
                fill={active ? C.coral : C.blueFill}
                stroke={active ? C.coral : C.blue}
                strokeWidth={1.4}
              />
              {/* output -> concat connector */}
              <line
                x1={OUT_X + 5}
                y1={cy}
                x2={CC_X}
                y2={ccCenterY + (cy - ccCenterY) * 0.55}
                stroke={active ? C.coral : C.line}
                strokeWidth={active ? 1.8 : 0.9}
              />
            </g>
          );
        })}

        {/* Concat block */}
        <g>
          <rect
            x={CC_X}
            y={CC_TOP}
            width={CC_W}
            height={CC_BOT - CC_TOP}
            rx={6}
            fill={C.greenFill}
            stroke={C.green}
            strokeWidth={1.6}
          />
          <text
            x={CC_X + CC_W / 2}
            y={ccCenterY - 4}
            fontFamily={MONO}
            fontSize={11}
            fill={C.green}
            textAnchor="middle"
            fontWeight={600}
            transform={`rotate(-90 ${CC_X + CC_W / 2} ${ccCenterY - 4})`}
          >
            Concat
          </text>
          <text
            x={CC_X + CC_W / 2}
            y={CC_BOT + 14}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
          >
            {`${heads}x${dk}=${heads * dk}`}
          </text>
        </g>

        {/* Concat -> W_O connector */}
        <line
          x1={CC_X + CC_W}
          y1={ccCenterY}
          x2={WO_X}
          y2={WO_Y + WO_H / 2}
          stroke={C.line}
          strokeWidth={1.4}
        />

        {/* W_O projection block */}
        <g>
          <rect
            x={WO_X}
            y={WO_Y}
            width={WO_W}
            height={WO_H}
            rx={6}
            fill={C.violet}
            stroke={C.violet}
            strokeWidth={1.6}
          />
          <text
            x={WO_X + WO_W / 2}
            y={WO_Y + WO_H / 2 - 4}
            fontFamily={MONO}
            fontSize={12}
            fill="var(--card)"
            textAnchor="middle"
            fontWeight={600}
          >
            W_O
          </text>
          <text
            x={WO_X + WO_W / 2}
            y={WO_Y + WO_H / 2 + 11}
            fontFamily={MONO}
            fontSize={8.5}
            fill="var(--card)"
            textAnchor="middle"
          >
            project
          </text>
        </g>

        {/* W_O -> combined output */}
        <line
          x1={WO_X + WO_W / 2}
          y1={WO_Y + WO_H}
          x2={WO_X + WO_W / 2}
          y2={WO_Y + WO_H + 18}
          stroke={C.violet}
          strokeWidth={1.8}
        />
        <text
          x={WO_X + WO_W / 2}
          y={WO_Y + WO_H + 32}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {`out d=${D_MODEL}`}
        </text>

        {/* ===== Attention-pattern panel (bottom band) ===== */}
        {/* divider line above the panel */}
        <line
          x1={14}
          y1={AP_Y - 14}
          x2={W - 14}
          y2={AP_Y - 14}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={14}
          y={AP_Y}
          fontFamily={MONO}
          fontSize={10}
          fill={C.coral}
          textAnchor="start"
          fontWeight={600}
        >
          {`head ${sel + 1} attends:`}
        </text>
        <text
          x={120}
          y={AP_Y}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="start"
        >
          {link.note}
        </text>

        {/* link arc between the two attended tokens */}
        {(() => {
          const x1 = tokenCenterX(link.from);
          const x2 = tokenCenterX(link.to);
          const yTop = TOK_Y - 4;
          const midX = (x1 + x2) / 2;
          const arcH = 34;
          const d = `M ${x1} ${yTop} Q ${midX} ${yTop - arcH} ${x2} ${yTop}`;
          return (
            <g>
              <path d={d} fill="none" stroke={C.coral} strokeWidth={2} />
              <circle cx={x1} cy={yTop} r={3} fill={C.coral} />
              <circle cx={x2} cy={yTop} r={3} fill={C.coral} />
            </g>
          );
        })()}

        {/* token boxes */}
        {TOKENS.map((tok: string, i: number) => {
          const cx = tokenCenterX(i);
          const on = i === link.from || i === link.to;
          return (
            <g key={`tok${i}`}>
              <rect
                x={cx - TOK_BOX_W / 2}
                y={TOK_Y}
                width={TOK_BOX_W}
                height={TOK_BOX_H}
                rx={4}
                fill={on ? C.coralFill : "var(--card)"}
                stroke={on ? C.coral : C.line}
                strokeWidth={on ? 1.8 : 1.1}
              />
              <text
                x={cx}
                y={TOK_Y + TOK_BOX_H / 2 + 4}
                fontFamily={MONO}
                fontSize={10}
                fill={on ? C.coral : C.ink}
                textAnchor="middle"
                fontWeight={on ? 600 : 400}
              >
                {tok}
              </text>
            </g>
          );
        })}

        {/* caption band at the very bottom */}
        <text
          x={W / 2}
          y={H - 14}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Each head attends differently and in parallel; concat + W_O mixes them
          back together.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">head:</span>
        {Array.from({ length: heads }, (_, i) => i).map((i: number) => (
          <button
            key={`hbtn${i}`}
            type="button"
            onClick={() => setSelected(i)}
            aria-pressed={sel === i}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={sel === i ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {i + 1}
          </button>
        ))}
        <span className="ml-2 font-mono text-[var(--muted)]">heads h:</span>
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          value={heads}
          onChange={(e) => setHeads(Number(e.target.value))}
          className="w-28 accent-[var(--foreground)]"
        />
        <span className="font-mono tabular-nums">{heads}</span>
        <span className="font-mono text-[var(--muted)]">{`d_k = 512/${heads} = ${dk}`}</span>
      </div>
    </div>
  );
}
