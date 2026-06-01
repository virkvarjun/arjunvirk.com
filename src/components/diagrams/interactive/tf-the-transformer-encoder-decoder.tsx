"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// A sub-block in either stack. `lines` lets long labels wrap to 2 centered rows
// so nothing spills out of its box.
type Block = {
  id: string;
  lines: string[];
  desc: string;
  formula?: string;
  kind: "attn" | "norm" | "ff" | "embed" | "head"; // colors the box
};

// LEFT — encoder layer, bottom (index 0) to top.
const ENCODER: Block[] = [
  {
    id: "enc-embed",
    lines: ["Input Embedding", "+ Positional Encoding"],
    desc: "Tokens become vectors; positional encodings are added so the model knows word order.",
    formula: "PE(pos,2i)=sin(pos / 10000^(2i/d))",
    kind: "embed",
  },
  {
    id: "enc-attn",
    lines: ["Multi-Head", "Self-Attention"],
    desc: "Each position attends to every other position in the input, all in parallel.",
    formula: "Attention(Q,K,V)=softmax(QKᵀ/√d_k)V",
    kind: "attn",
  },
  {
    id: "enc-norm1",
    lines: ["Add & Norm"],
    desc: "Residual connection adds the input back, then LayerNorm stabilizes the activations.",
    formula: "LayerNorm(x + Sublayer(x))",
    kind: "norm",
  },
  {
    id: "enc-ff",
    lines: ["Feed-Forward", "Network"],
    desc: "A position-wise two-layer MLP applied identically to every token.",
    formula: "FFN(x)=max(0, xW₁+b₁)W₂+b₂",
    kind: "ff",
  },
  {
    id: "enc-norm2",
    lines: ["Add & Norm"],
    desc: "Second residual + LayerNorm, producing this encoder layer's output.",
    formula: "LayerNorm(x + FFN(x))",
    kind: "norm",
  },
];

// RIGHT — decoder layer, bottom (index 0) to top.
const DECODER: Block[] = [
  {
    id: "dec-embed",
    lines: ["Output Embedding", "(shifted right) + PE"],
    desc: "Target tokens (shifted right) are embedded and given positional encodings.",
    formula: "input_t = embed(y_{t-1}) + PE(t)",
    kind: "embed",
  },
  {
    id: "dec-attn",
    lines: ["Masked Multi-Head", "Self-Attention"],
    desc: "Self-attention over outputs, masked so position t cannot peek at future tokens.",
    formula: "mask future: QKᵀ + M,  M_{ij}=-∞ if j>i",
    kind: "attn",
  },
  {
    id: "dec-norm1",
    lines: ["Add & Norm"],
    desc: "Residual connection plus LayerNorm after masked self-attention.",
    formula: "LayerNorm(x + MaskedAttn(x))",
    kind: "norm",
  },
  {
    id: "dec-cross",
    lines: ["Cross-Attention", "Q:dec  K,V:enc"],
    desc: "Decoder queries attend over the encoder's output — this is where the two stacks meet.",
    formula: "softmax(Q_dec K_encᵀ/√d_k) V_enc",
    kind: "head",
  },
  {
    id: "dec-norm2",
    lines: ["Add & Norm"],
    desc: "Residual connection plus LayerNorm after cross-attention.",
    formula: "LayerNorm(x + CrossAttn(x))",
    kind: "norm",
  },
  {
    id: "dec-ff",
    lines: ["Feed-Forward", "Network"],
    desc: "Position-wise MLP, identical structure to the encoder's feed-forward block.",
    formula: "FFN(x)=max(0, xW₁+b₁)W₂+b₂",
    kind: "ff",
  },
  {
    id: "dec-norm3",
    lines: ["Add & Norm"],
    desc: "Final residual + LayerNorm, producing this decoder layer's output.",
    formula: "LayerNorm(x + FFN(x))",
    kind: "norm",
  },
];

// Top-of-decoder head: Linear -> Softmax -> Output Probabilities.
const HEAD: Block[] = [
  {
    id: "head-linear",
    lines: ["Linear"],
    desc: "A learned projection maps the decoder output to one logit per vocabulary word.",
    formula: "logits = h · Wᵒ,  shape [vocab]",
    kind: "head",
  },
  {
    id: "head-softmax",
    lines: ["Softmax"],
    desc: "Logits are turned into a probability distribution over the vocabulary.",
    formula: "p_i = e^{logit_i} / Σ_j e^{logit_j}",
    kind: "head",
  },
  {
    id: "head-out",
    lines: ["Output Probabilities"],
    desc: "The distribution over next tokens; the highest-probability word is emitted.",
    formula: "ŷ_t = argmax_i p_i",
    kind: "head",
  },
];

const ALL: Block[] = [...ENCODER, ...DECODER, ...HEAD];

function fillFor(kind: Block["kind"]): string {
  switch (kind) {
    case "attn":
      return C.blueFill;
    case "norm":
      return "var(--card)";
    case "ff":
      return C.greenFill;
    case "embed":
      return C.coralFill;
    case "head":
      return C.blueFill;
  }
}
function strokeFor(kind: Block["kind"]): string {
  switch (kind) {
    case "attn":
      return C.blue;
    case "norm":
      return C.line;
    case "ff":
      return C.green;
    case "embed":
      return C.coral;
    case "head":
      return C.violet;
  }
}
function textFor(kind: Block["kind"]): string {
  switch (kind) {
    case "attn":
      return C.blue;
    case "norm":
      return C.ink;
    case "ff":
      return C.green;
    case "embed":
      return C.coral;
    case "head":
      return C.violet;
  }
}

export function TfTransformer() {
  const [selected, setSelected] = useState<string | null>("dec-cross");
  const [layers, setLayers] = useState(6);
  const [playing, setPlaying] = useState(false);
  // flow stage 0..7 drives the animated token: up encoder, across, up decoder, out.
  const [stage, setStage] = useState(0);
  const frame = useRef(0);

  const FLOW_MAX = 7;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      frame.current += 1;
      if (frame.current % 3 === 0) {
        setStage((s) => (s >= FLOW_MAX ? 0 : s + 1));
      }
    }, 260);
    return () => clearInterval(id);
  }, [playing]);

  // --- Layout ---------------------------------------------------------------
  const W = 460;
  const H = 600;

  const bw = 156; // box width
  const bh = 30; // box height
  const vgap = 9; // vertical gap between stacked sub-blocks

  // Column centers. Encoder left, decoder right with room between for arrows.
  const encCX = 110;
  const decCX = 350;
  const encX = encCX - bw / 2;
  const decX = decCX - bw / 2;

  // Bottom baseline (embedding boxes sit here) — stacks grow upward.
  const encBottomY = 430; // top edge of the bottom-most encoder box
  const decBottomY = 430;

  // Compute top-edge y for block index i within a stack growing upward.
  const yAt = (bottomY: number, i: number) => bottomY - i * (bh + vgap);

  // Faded "× N layers" stacked outlines behind the repeating layer region.
  // The repeating part excludes the embedding box (index 0).
  const repeatN = Math.min(layers, 4); // visual cap for legibility

  const captionTop = 478; // divider above readout band

  const current = ALL.find((b) => b.id === selected) ?? null;

  // Which block is "lit" by the flow animation.
  const flowBlock = (): string | null => {
    switch (stage) {
      case 1:
        return "enc-attn";
      case 2:
        return "enc-norm2";
      case 3:
        return "dec-cross";
      case 4:
        return "dec-ff";
      case 5:
        return "head-linear";
      case 6:
        return "head-softmax";
      case 7:
        return "head-out";
      default:
        return null;
    }
  };
  const lit = flowBlock();

  // Render a single stack of blocks growing upward from bottomY.
  function renderStack(blocks: Block[], cx: number, bottomY: number) {
    return blocks.map((b, i) => {
      const x = cx - bw / 2;
      const y = yAt(bottomY, i);
      const isSel = selected === b.id;
      const isLit = lit === b.id;
      const stroke = strokeFor(b.kind);
      return (
        <g
          key={b.id}
          onClick={() => {
            setPlaying(false);
            setSelected(b.id);
          }}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={x}
            y={y}
            width={bw}
            height={bh}
            rx={6}
            fill={isLit ? C.violet : fillFor(b.kind)}
            stroke={stroke}
            strokeWidth={isSel || isLit ? 2.4 : 1.4}
          />
          {b.lines.length === 1 ? (
            <text
              x={cx}
              y={y + bh / 2 + 3.5}
              fontSize={9.5}
              fontFamily={MONO}
              textAnchor="middle"
              fill={isLit ? "var(--card)" : textFor(b.kind)}
              fontWeight={600}
            >
              {b.lines[0]}
            </text>
          ) : (
            <>
              <text
                x={cx}
                y={y + bh / 2 - 2}
                fontSize={9}
                fontFamily={MONO}
                textAnchor="middle"
                fill={isLit ? "var(--card)" : textFor(b.kind)}
                fontWeight={600}
              >
                {b.lines[0]}
              </text>
              <text
                x={cx}
                y={y + bh / 2 + 9}
                fontSize={9}
                fontFamily={MONO}
                textAnchor="middle"
                fill={isLit ? "var(--card)" : textFor(b.kind)}
                fontWeight={600}
              >
                {b.lines[1]}
              </text>
            </>
          )}
        </g>
      );
    });
  }

  // Vertical connector arrows between consecutive boxes in a stack.
  function renderConnectors(blocks: Block[], cx: number, bottomY: number) {
    const out: React.ReactNode[] = [];
    for (let i = 0; i < blocks.length - 1; i++) {
      const yTopOfLower = yAt(bottomY, i); // current box top
      const yBottomOfUpper = yAt(bottomY, i + 1) + bh; // box above's bottom
      const y1 = yTopOfLower;
      const y2 = yBottomOfUpper;
      out.push(
        <g key={`conn-${cx}-${i}`} stroke={C.line} fill={C.line}>
          <line x1={cx} y1={y1} x2={cx} y2={y2 + 7} strokeWidth={1.4} />
          <polygon
            points={`${cx},${y2} ${cx - 4},${y2 + 7} ${cx + 4},${y2 + 7}`}
            stroke="none"
          />
        </g>,
      );
    }
    return out;
  }

  // Top edge of each stack (for the encoder->decoder bridge + head connection).
  const encTopY = yAt(encBottomY, ENCODER.length - 1); // top box top edge
  const decTopY = yAt(decBottomY, DECODER.length - 1);
  const headBottomY = decTopY; // head sits above decoder
  // y of decoder cross-attention box (index 3) center.
  const crossIdx = DECODER.findIndex((b) => b.id === "dec-cross");
  const crossY = yAt(decBottomY, crossIdx);
  const crossCenterY = crossY + bh / 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="The Transformer encoder-decoder architecture: an encoder stack feeding a decoder stack via cross-attention, with Linear and Softmax producing output probabilities."
      >
        {/* Title */}
        <text
          x={W / 2}
          y={20}
          fontSize={12}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          The Transformer (Encoder–Decoder)
        </text>

        {/* Stack labels */}
        <text
          x={encCX}
          y={38}
          fontSize={10}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
          fontWeight={600}
        >
          Encoder
        </text>
        <text
          x={decCX}
          y={38}
          fontSize={10}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
          fontWeight={600}
        >
          Decoder
        </text>

        {/* Faded "stacked layers" outlines behind the repeating region of each
            stack (visual "× N", not literal redraw). */}
        {Array.from({ length: repeatN - 1 }).map((_, k) => {
          const off = (k + 1) * 3;
          // region spans from the box above embedding (index1) to top box
          const top = yAt(encBottomY, ENCODER.length - 1);
          const bot = yAt(encBottomY, 1) + bh;
          return (
            <g key={`enc-ghost-${k}`}>
              <rect
                x={encX - off}
                y={top - off}
                width={bw}
                height={bot - top}
                rx={6}
                fill="none"
                stroke={C.line}
                strokeWidth={1}
                opacity={0.5 - k * 0.12}
              />
            </g>
          );
        })}
        {Array.from({ length: repeatN - 1 }).map((_, k) => {
          const off = (k + 1) * 3;
          const top = yAt(decBottomY, DECODER.length - 1);
          const bot = yAt(decBottomY, 1) + bh;
          return (
            <g key={`dec-ghost-${k}`}>
              <rect
                x={decX + off}
                y={top - off}
                width={bw}
                height={bot - top}
                rx={6}
                fill="none"
                stroke={C.line}
                strokeWidth={1}
                opacity={0.5 - k * 0.12}
              />
            </g>
          );
        })}

        {/* "Nx = N layers" bracket labels */}
        <text
          x={encX - 14}
          y={(encTopY + (yAt(encBottomY, 1) + bh)) / 2}
          fontSize={8.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
          transform={`rotate(-90 ${encX - 14} ${(encTopY + (yAt(encBottomY, 1) + bh)) / 2})`}
        >
          {`Nx = ${layers}`}
        </text>
        <text
          x={decX + bw + 14}
          y={(decTopY + (yAt(decBottomY, 1) + bh)) / 2}
          fontSize={8.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
          transform={`rotate(90 ${decX + bw + 14} ${(decTopY + (yAt(decBottomY, 1) + bh)) / 2})`}
        >
          {`Nx = ${layers}`}
        </text>

        {/* Connectors within each stack (drawn first, under boxes) */}
        {renderConnectors(ENCODER, encCX, encBottomY)}
        {renderConnectors(DECODER, decCX, decBottomY)}

        {/* Decoder -> head connector (top decoder box to bottom head box) */}
        <g stroke={C.line} fill={C.line}>
          <line
            x1={decCX}
            y1={decTopY}
            x2={decCX}
            y2={headBottomY - (bh + vgap) + bh + 7}
            strokeWidth={1.4}
          />
        </g>
        {/* head connectors */}
        {(() => {
          const out: React.ReactNode[] = [];
          for (let i = 0; i < HEAD.length; i++) {
            const yTop =
              i === 0 ? decTopY : headBottomY - i * (bh + vgap);
            const yBot = headBottomY - (i + 1) * (bh + vgap) + bh;
            out.push(
              <g key={`head-conn-${i}`} stroke={C.line} fill={C.line}>
                <line
                  x1={decCX}
                  y1={yTop}
                  x2={decCX}
                  y2={yBot + 7}
                  strokeWidth={1.4}
                />
                <polygon
                  points={`${decCX},${yBot} ${decCX - 4},${yBot + 7} ${decCX + 4},${yBot + 7}`}
                  stroke="none"
                />
              </g>,
            );
          }
          return out;
        })()}

        {/* Cross-attention bridge: encoder top -> right around -> decoder cross
            block. Routed to the right of the encoder top and into the cross box
            from its LEFT side, avoiding all text. */}
        {(() => {
          const startX = encCX;
          const startY = encTopY; // encoder top box top edge
          const riseY = startY - 14; // go up a touch above the encoder
          const crossLeftX = decX; // enter cross box on its left edge
          const litBridge = lit === "dec-cross" || selected === "dec-cross";
          const col = litBridge ? C.violet : C.coral;
          const wdt = litBridge ? 2.4 : 1.6;
          return (
            <g stroke={col} fill={col}>
              {/* up out of encoder */}
              <line x1={startX} y1={startY} x2={startX} y2={riseY} strokeWidth={wdt} />
              {/* across to a point left of the cross box */}
              <line
                x1={startX}
                y1={riseY}
                x2={crossLeftX - 16}
                y2={riseY}
                strokeWidth={wdt}
              />
              {/* down to the cross-attention row */}
              <line
                x1={crossLeftX - 16}
                y1={riseY}
                x2={crossLeftX - 16}
                y2={crossCenterY}
                strokeWidth={wdt}
              />
              {/* into the cross box */}
              <line
                x1={crossLeftX - 16}
                y1={crossCenterY}
                x2={crossLeftX - 7}
                y2={crossCenterY}
                strokeWidth={wdt}
              />
              <polygon
                points={`${crossLeftX},${crossCenterY} ${crossLeftX - 7},${crossCenterY - 4} ${crossLeftX - 7},${crossCenterY + 4}`}
                stroke="none"
              />
              <text
                x={(startX + crossLeftX) / 2}
                y={riseY - 4}
                fontSize={8.5}
                fontFamily={MONO}
                textAnchor="middle"
                fill={litBridge ? C.violet : C.muted}
                fontWeight={litBridge ? 600 : 400}
              >
                K, V from encoder
              </text>
            </g>
          );
        })()}

        {/* The boxes themselves (on top of connectors) */}
        {renderStack(ENCODER, encCX, encBottomY)}
        {renderStack(DECODER, decCX, decBottomY)}
        {/* head stack grows upward from decoder top */}
        {HEAD.map((b, i) => {
          const cx = decCX;
          const x = cx - bw / 2;
          const y = headBottomY - (i + 1) * (bh + vgap);
          const isSel = selected === b.id;
          const isLit = lit === b.id;
          return (
            <g
              key={b.id}
              onClick={() => {
                setPlaying(false);
                setSelected(b.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x}
                y={y}
                width={bw}
                height={bh}
                rx={6}
                fill={isLit ? C.violet : fillFor(b.kind)}
                stroke={strokeFor(b.kind)}
                strokeWidth={isSel || isLit ? 2.4 : 1.4}
              />
              <text
                x={cx}
                y={y + bh / 2 + 3.5}
                fontSize={9.5}
                fontFamily={MONO}
                textAnchor="middle"
                fill={isLit ? "var(--card)" : textFor(b.kind)}
                fontWeight={600}
              >
                {b.lines[0]}
              </text>
            </g>
          );
        })}

        {/* Bottom inputs feeding the embeddings */}
        <text
          x={encCX}
          y={encBottomY + bh + 16}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          inputs (source tokens)
        </text>
        <text
          x={decCX}
          y={decBottomY + bh + 16}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          outputs (shifted right)
        </text>

        {/* ---- Readout band (below the stacks; never over them) ---- */}
        <line
          x1={12}
          y1={captionTop}
          x2={W - 12}
          y2={captionTop}
          stroke={C.line}
          strokeWidth={1}
        />
        {current ? (
          <>
            <text
              x={16}
              y={captionTop + 18}
              fontSize={10}
              fontFamily={MONO}
              fill={C.ink}
              fontWeight={600}
            >
              {current.lines.join(" ").replace(/\s+/g, " ")}
            </text>
            <Wrapped
              text={current.desc}
              x={16}
              y={captionTop + 34}
              width={W - 32}
              size={9.5}
              fill={C.muted}
            />
            {current.formula && (
              <text
                x={16}
                y={captionTop + 76}
                fontSize={9.5}
                fontFamily={MONO}
                fill={C.violet}
              >
                {current.formula}
              </text>
            )}
          </>
        ) : (
          <text
            x={16}
            y={captionTop + 20}
            fontSize={9.5}
            fontFamily={MONO}
            fill={C.muted}
          >
            Click any block to see what it does.
          </text>
        )}

        {/* Caption */}
        <text
          x={W / 2}
          y={H - 8}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          Encoder reads the input in parallel; decoder emits output one token at a time.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {playing ? "Pause flow" : "Play data flow"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStage((s) => (s >= FLOW_MAX ? 0 : s + 1));
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Step flow
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStage(0);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <span style={{ color: C.muted, fontFamily: MONO }}>layers:</span>
        <button
          type="button"
          onClick={() => setLayers((n) => Math.max(1, n - 1))}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          −
        </button>
        <span style={{ color: C.ink, fontFamily: MONO }}>{`N = ${layers}`}</span>
        <button
          type="button"
          onClick={() => setLayers((n) => Math.min(6, n + 1))}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Word-wrap a description into up to 4 lines inside the readout band.
function Wrapped({
  text,
  x,
  y,
  width,
  size,
  fill,
}: {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  fill: string;
}) {
  const charW = size * 0.6; // monospace approx
  const maxChars = Math.max(8, Math.floor(width / charW));
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return (
    <>
      {lines.slice(0, 3).map((ln, i) => (
        <text
          key={i}
          x={x}
          y={y + i * 13}
          fontSize={size}
          fontFamily={MONO}
          fill={fill}
        >
          {ln}
        </text>
      ))}
    </>
  );
}
