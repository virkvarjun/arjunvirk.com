"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..26) | subtitle (38..52) | main mechanism diagram (62..300) |
//   token-count bar (312..356) | explanation band (368..438) | caption (452..472)
const VW = 560;
const VH = 480;

// Three connector designs.
type DesignId = "linear" | "qformer" | "xattn";

type Design = {
  id: DesignId;
  tab: string; // short label for the selector button
  name: string; // full name shown in header
  family: string; // example model family
  accent: string;
  fill: string;
  tokens: number; // LLM context tokens consumed
  tokensLabel: string;
  trainable: string; // trainable params summary
  // explanation lines (each must fit within VW-24px at fontSize 10)
  lines: string[];
};

const DESIGNS: Design[] = [
  {
    id: "linear",
    tab: "Linear / MLP",
    name: "Linear projection",
    family: "LLaVA",
    accent: C.blue,
    fill: C.blueFill,
    tokens: 256,
    tokensLabel: "256 tokens",
    trainable: "tiny MLP (~few M)",
    lines: [
      "Each of the 256 patch features is mapped 1:1 through a",
      "small MLP into the LLM's embedding space, then fed in",
      "as 256 ordinary input tokens.",
      "Simple to train; uses 256 context slots. Today's default.",
    ],
  },
  {
    id: "qformer",
    tab: "Q-Former",
    name: "Q-Former / resampler",
    family: "BLIP-2",
    accent: C.green,
    fill: C.greenFill,
    tokens: 32,
    tokensLabel: "32 tokens",
    trainable: "Q-Former (~100M+)",
    lines: [
      "A fixed set of 32 learnable query tokens cross-attends to",
      "the 256 patch features, summarising them into 32 tokens.",
      "Only those 32 tokens enter the LLM.",
      "Context-efficient; the resampler adds trainable params.",
    ],
  },
  {
    id: "xattn",
    tab: "Cross-attn",
    name: "Cross-attention layers",
    family: "Flamingo",
    accent: C.coral,
    fill: C.coralFill,
    tokens: 0,
    tokensLabel: "0 tokens",
    trainable: "new attn layers",
    lines: [
      "New cross-attention layers inserted inside the LLM let its",
      "text tokens attend directly to the 256 patch features.",
      "Zero extra context tokens are consumed.",
      "Costs added layers and compute on every forward pass.",
    ],
  },
];

// Layout geometry for the main mechanism diagram.
const ENC_X = 40; // vision encoder box left
const ENC_W = 96;
const BOX_TOP = 96; // top of the encoder / connector / LLM boxes
const BOX_H = 130;
const CON_X = 200; // connector region left
const CON_W = 150;
const LLM_X = 420; // LLM box left
const LLM_W = 100;

const MAX_TOKENS = 256;

export function VisThreeConnectors() {
  const [design, setDesign] = useState<DesignId>("linear");

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const d: Design = DESIGNS.find((x) => x.id === design) ?? DESIGNS[0];

  // Token bar geometry.
  const BAR_X = 130;
  const BAR_W = 300;
  const barFrac = d.tokens / MAX_TOKENS;
  const barY = 326;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Three ways to connect a vision encoder to an LLM: a linear projection that maps 256 patch tokens 1:1 (LLaVA), a Q-Former that summarises them into 32 query tokens (BLIP-2), and cross-attention layers inside the LLM that consume 0 extra context tokens (Flamingo). Select a design to see its mechanism, the number of LLM context tokens it uses, and its trainable parameters."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          Three Connector Designs
        </text>
        <text
          x={VW / 2}
          y={46}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
        >
          Bridging a vision encoder to an LLM —{" "}
          <tspan fill={d.accent}>{d.name}</tspan>
          <tspan fill={C.muted}> ({d.family})</tspan>
        </text>

        {/* Vision encoder box */}
        <rect
          x={ENC_X}
          y={BOX_TOP}
          width={ENC_W}
          height={BOX_H}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.2}
        />
        <text
          x={ENC_X + ENC_W / 2}
          y={BOX_TOP + 16}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          Vision
        </text>
        <text
          x={ENC_X + ENC_W / 2}
          y={BOX_TOP + 29}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          encoder
        </text>
        {/* 256 patch tokens depicted as a small grid of dots */}
        {Array.from({ length: 16 }).map((_, k) => {
          const col = k % 4;
          const row = Math.floor(k / 4);
          return (
            <circle
              key={k}
              cx={ENC_X + 24 + col * 16}
              cy={BOX_TOP + 50 + row * 16}
              r={2.4}
              fill={C.muted}
            />
          );
        })}
        <text
          x={ENC_X + ENC_W / 2}
          y={BOX_TOP + BOX_H - 8}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
        >
          256 patches
        </text>

        {/* LLM box */}
        <rect
          x={LLM_X}
          y={BOX_TOP}
          width={LLM_W}
          height={BOX_H}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.2}
        />
        <text
          x={LLM_X + LLM_W / 2}
          y={BOX_TOP + 16}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          LLM
        </text>
        {/* Stack of transformer layers inside the LLM */}
        {[0, 1, 2, 3].map((k) => (
          <rect
            key={k}
            x={LLM_X + 16}
            y={BOX_TOP + 30 + k * 20}
            width={LLM_W - 32}
            height={14}
            rx={3}
            fill={design === "xattn" ? d.fill : "var(--background)"}
            stroke={design === "xattn" && k % 2 === 1 ? d.accent : C.line}
            strokeWidth={1}
          />
        ))}

        {/* Connector region — content depends on the selected design */}
        {/* Region frame */}
        <rect
          x={CON_X}
          y={BOX_TOP}
          width={CON_W}
          height={BOX_H}
          rx={6}
          fill={d.fill}
          stroke={d.accent}
          strokeWidth={1.4}
        />
        <text
          x={CON_X + CON_W / 2}
          y={BOX_TOP + 15}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={d.accent}
        >
          {d.tab}
        </text>

        {/* Linear projection: 256 dots -> MLP slab -> 256 dots, 1:1 */}
        {design === "linear" && (
          <g>
            <rect
              x={CON_X + 50}
              y={BOX_TOP + 40}
              width={50}
              height={50}
              rx={4}
              fill="var(--card)"
              stroke={d.accent}
              strokeWidth={1}
            />
            <text
              x={CON_X + 75}
              y={BOX_TOP + 68}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={9}
              fill={d.accent}
            >
              MLP
            </text>
            <text
              x={CON_X + CON_W / 2}
              y={BOX_TOP + BOX_H - 8}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.muted}
            >
              1:1 map → 256
            </text>
          </g>
        )}

        {/* Q-Former: 32 query tokens cross-attend to patches -> 32 tokens */}
        {design === "qformer" && (
          <g>
            {/* learnable query tokens */}
            {[0, 1, 2, 3, 4].map((k) => (
              <circle
                key={k}
                cx={CON_X + 30}
                cy={BOX_TOP + 42 + k * 13}
                r={3}
                fill={d.accent}
              />
            ))}
            <rect
              x={CON_X + 56}
              y={BOX_TOP + 40}
              width={64}
              height={52}
              rx={4}
              fill="var(--card)"
              stroke={d.accent}
              strokeWidth={1}
            />
            <text
              x={CON_X + 88}
              y={BOX_TOP + 63}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={8.5}
              fill={d.accent}
            >
              cross
            </text>
            <text
              x={CON_X + 88}
              y={BOX_TOP + 75}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={8.5}
              fill={d.accent}
            >
              attn
            </text>
            <text
              x={CON_X + CON_W / 2}
              y={BOX_TOP + BOX_H - 8}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.muted}
            >
              32 queries → 32
            </text>
          </g>
        )}

        {/* Cross-attention: patches feed directly into the LLM's layers */}
        {design === "xattn" && (
          <g>
            <text
              x={CON_X + CON_W / 2}
              y={BOX_TOP + 56}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={9}
              fill={d.accent}
            >
              patches feed
            </text>
            <text
              x={CON_X + CON_W / 2}
              y={BOX_TOP + 70}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={9}
              fill={d.accent}
            >
              into LLM layers
            </text>
            <text
              x={CON_X + CON_W / 2}
              y={BOX_TOP + BOX_H - 8}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.muted}
            >
              0 extra tokens
            </text>
          </g>
        )}

        {/* Flow arrow: encoder -> connector */}
        <line
          x1={ENC_X + ENC_W}
          y1={BOX_TOP + BOX_H / 2}
          x2={CON_X - 6}
          y2={BOX_TOP + BOX_H / 2}
          stroke={C.muted}
          strokeWidth={1.4}
        />
        <path
          d={`M ${CON_X - 6} ${BOX_TOP + BOX_H / 2} l -6 -3.5 l 0 7 z`}
          fill={C.muted}
        />

        {/* Flow arrow: connector -> LLM (xattn enters mid-stack, else top) */}
        {design === "xattn" ? (
          <>
            <line
              x1={CON_X + CON_W}
              y1={BOX_TOP + BOX_H / 2}
              x2={LLM_X + 4}
              y2={BOX_TOP + 30 + 1 * 20 + 7}
              stroke={d.accent}
              strokeWidth={1.4}
            />
            <path
              d={`M ${LLM_X + 4} ${BOX_TOP + 30 + 1 * 20 + 7} l -7 -2 l 1 7 z`}
              fill={d.accent}
            />
            <line
              x1={CON_X + CON_W}
              y1={BOX_TOP + BOX_H / 2}
              x2={LLM_X + 4}
              y2={BOX_TOP + 30 + 3 * 20 + 7}
              stroke={d.accent}
              strokeWidth={1.4}
            />
            <path
              d={`M ${LLM_X + 4} ${BOX_TOP + 30 + 3 * 20 + 7} l -7 -2 l 1 7 z`}
              fill={d.accent}
            />
          </>
        ) : (
          <>
            <line
              x1={CON_X + CON_W}
              y1={BOX_TOP + BOX_H / 2}
              x2={LLM_X - 6}
              y2={BOX_TOP + BOX_H / 2}
              stroke={d.accent}
              strokeWidth={1.4}
            />
            <path
              d={`M ${LLM_X - 6} ${BOX_TOP + BOX_H / 2} l -6 -3.5 l 0 7 z`}
              fill={d.accent}
            />
          </>
        )}

        {/* Token-count bar band */}
        <text
          x={ENC_X}
          y={barY + 4}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          LLM context
        </text>
        <text
          x={ENC_X}
          y={barY + 17}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          tokens used
        </text>
        {/* bar track */}
        <rect
          x={BAR_X}
          y={barY - 8}
          width={BAR_W}
          height={16}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {/* bar fill */}
        {barFrac > 0 && (
          <rect
            x={BAR_X}
            y={barY - 8}
            width={Math.max(4, BAR_W * barFrac)}
            height={16}
            rx={4}
            fill={d.fill}
            stroke={d.accent}
            strokeWidth={1.2}
          />
        )}
        <text
          x={BAR_X + BAR_W + 8}
          y={barY + 4}
          fontFamily={MONO}
          fontSize={11}
          fill={d.accent}
        >
          {d.tokensLabel}
        </text>
        {/* scale endpoints */}
        <text
          x={BAR_X}
          y={barY + 22}
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          0
        </text>
        <text
          x={BAR_X + BAR_W}
          y={barY + 22}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          256 (max)
        </text>

        {/* Explanation band */}
        <rect
          x={16}
          y={366}
          width={VW - 32}
          height={76}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={28}
          y={382}
          fontFamily={MONO}
          fontSize={10}
          fill={d.accent}
        >
          {d.name} ({d.family}) · trainable: {d.trainable}
        </text>
        {d.lines.map((ln, i) => (
          <text
            key={i}
            x={28}
            y={397 + i * 14}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.ink}
          >
            {ln}
          </text>
        ))}

        {/* Caption band */}
        <text
          x={VW / 2}
          y={466}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Map patches 1:1 (LLaVA), summarize to a fixed few (Q-Former), or inject
          via cross-attn (Flamingo).
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {DESIGNS.map((x) => (
          <button
            key={x.id}
            type="button"
            className={btn}
            style={
              design === x.id
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setDesign(x.id)}
          >
            {x.tab}
          </button>
        ))}
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {d.tokensLabel} in LLM context
        </span>
      </div>
    </div>
  );
}
