"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// One sub-layer box in either stack. `lines` lets long labels wrap to two
// centered rows so nothing spills out of its box.
type Kind = "attn" | "norm" | "ff" | "embed" | "head";
type Block = {
  id: string;
  lines: string[];
  shape: string; // tensor shape leaving this block
  desc: string; // one-line readout below the drawing
  kind: Kind;
};

// LEFT, encoder layer, bottom (index 0) to top. Shape stays (n,d) throughout.
const ENCODER: Block[] = [
  {
    id: "enc-in",
    lines: ["Input"],
    shape: "(n,d)",
    desc: "Encoder input: n token vectors, each of width d.",
    kind: "embed",
  },
  {
    id: "enc-attn",
    lines: ["Multi-Head", "Self-Attn"],
    shape: "(n,d)",
    desc: "Every token attends to every other token, in parallel.",
    kind: "attn",
  },
  {
    id: "enc-norm1",
    lines: ["Add & Norm"],
    shape: "(n,d)",
    desc: "Residual skip adds the input back, then LayerNorm.",
    kind: "norm",
  },
  {
    id: "enc-ff",
    lines: ["FFN"],
    shape: "(n,d)",
    desc: "Position-wise MLP applied identically to each token.",
    kind: "ff",
  },
  {
    id: "enc-norm2",
    lines: ["Add & Norm"],
    shape: "(n,d)",
    desc: "Second residual + LayerNorm: the encoder layer's output.",
    kind: "norm",
  },
];

// RIGHT, decoder layer, bottom (index 0) to top. Shape stays (m,d) throughout.
const DECODER: Block[] = [
  {
    id: "dec-in",
    lines: ["Input"],
    shape: "(m,d)",
    desc: "Decoder input: m target tokens so far, each of width d.",
    kind: "embed",
  },
  {
    id: "dec-mattn",
    lines: ["Masked", "Self-Attn"],
    shape: "(m,d)",
    desc: "Masked so position t cannot peek at future tokens.",
    kind: "attn",
  },
  {
    id: "dec-norm1",
    lines: ["Add & Norm"],
    shape: "(m,d)",
    desc: "Residual skip + LayerNorm after masked self-attention.",
    kind: "norm",
  },
  {
    id: "dec-cross",
    lines: ["Cross-Attn", "Q:dec K,V:enc"],
    shape: "(m,d)",
    desc: "Decoder queries attend over the encoder output, stacks meet here.",
    kind: "head",
  },
  {
    id: "dec-norm2",
    lines: ["Add & Norm"],
    shape: "(m,d)",
    desc: "Residual skip + LayerNorm after cross-attention.",
    kind: "norm",
  },
  {
    id: "dec-ff",
    lines: ["FFN"],
    shape: "(m,d)",
    desc: "Position-wise MLP, same structure as the encoder's.",
    kind: "ff",
  },
  {
    id: "dec-norm3",
    lines: ["Add & Norm"],
    shape: "(m,d)",
    desc: "Final residual + LayerNorm: the decoder layer's output.",
    kind: "norm",
  },
];

// Top-of-decoder head: Linear -> logits -> Softmax -> next token.
const HEAD: Block[] = [
  {
    id: "head-linear",
    lines: ["Linear"],
    shape: "(m,V)",
    desc: "Project each decoder vector to one logit per vocabulary word.",
    kind: "head",
  },
  {
    id: "head-softmax",
    lines: ["Softmax"],
    shape: "(m,V)",
    desc: "Logits become a probability distribution over the vocabulary.",
    kind: "head",
  },
  {
    id: "head-out",
    lines: ["next token"],
    shape: "argmax",
    desc: "Highest-probability word is emitted as the next token.",
    kind: "head",
  },
];

// Trace order: up the encoder, across via cross-attention, up the decoder, out.
const TRACE: string[] = [
  "enc-in",
  "enc-attn",
  "enc-norm1",
  "enc-ff",
  "enc-norm2",
  "dec-in",
  "dec-mattn",
  "dec-norm1",
  "dec-cross",
  "dec-norm2",
  "dec-ff",
  "dec-norm3",
  "head-linear",
  "head-softmax",
  "head-out",
];

const BY_ID: Record<string, Block> = Object.fromEntries(
  [...ENCODER, ...DECODER, ...HEAD].map((b) => [b.id, b]),
);

function fillFor(kind: Kind): string {
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
function strokeFor(kind: Kind): string {
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
function textFor(kind: Kind): string {
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

export function TfFullTrace() {
  // step = -1 means "not started"; 0..TRACE.length-1 lights one block.
  const [step, setStep] = useState<number>(-1);
  const [playing, setPlaying] = useState<boolean>(false);
  const [layers, setLayers] = useState<number>(6);
  const frame = useRef<number>(0);

  const STEP_MAX = TRACE.length - 1;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      frame.current += 1;
      setStep((s) => {
        if (s >= STEP_MAX) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 650);
    return () => clearInterval(id);
  }, [playing, STEP_MAX]);

  // --- Layout ---------------------------------------------------------------
  const W = 480;
  const H = 720;

  const bw = 138; // box width
  const bh = 30; // box height
  const vgap = 12; // vertical gap between stacked sub-blocks

  const encCX = 118; // encoder column center
  const decCX = 362; // decoder column center
  const encX = encCX - bw / 2;
  const decX = decCX - bw / 2;

  const encBottomY = 560; // top edge of bottom-most encoder box
  const decBottomY = 560; // top edge of bottom-most decoder box

  // Top edge y for block index i within a stack growing upward.
  const yAt = (bottomY: number, i: number) => bottomY - i * (bh + vgap);

  const litId: string | null = step >= 0 ? TRACE[step] : null;

  // Stacks.
  const encTopY = yAt(encBottomY, ENCODER.length - 1);
  const decTopY = yAt(decBottomY, DECODER.length - 1);
  const headBottomY = decTopY;
  const crossIdx = DECODER.findIndex((b) => b.id === "dec-cross");
  const crossCenterY = yAt(decBottomY, crossIdx) + bh / 2;

  const captionTop = 624; // divider above readout band

  // Render one stack of blocks growing upward from bottomY.
  function renderStack(blocks: Block[], cx: number, bottomY: number) {
    return blocks.map((b, i) => {
      const x = cx - bw / 2;
      const y = yAt(bottomY, i);
      const isLit = litId === b.id;
      return (
        <g key={b.id}>
          <rect
            x={x}
            y={y}
            width={bw}
            height={bh}
            rx={6}
            fill={isLit ? C.violet : fillFor(b.kind)}
            stroke={strokeFor(b.kind)}
            strokeWidth={isLit ? 2.6 : 1.4}
          />
          {b.lines.length === 1 ? (
            <text
              x={cx}
              y={y + bh / 2 + 3.5}
              fontSize={10}
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
                y={y + bh / 2 - 2.5}
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
          {/* Shape tag to the outer side of each box (n,d) stays constant. */}
          <text
            x={cx === encCX ? x - 6 : x + bw + 6}
            y={y + bh / 2 + 3}
            fontSize={8}
            fontFamily={MONO}
            textAnchor={cx === encCX ? "end" : "start"}
            fill={isLit ? C.violet : C.muted}
            fontWeight={isLit ? 600 : 400}
          >
            {b.shape}
          </text>
        </g>
      );
    });
  }

  // Vertical connector arrows between consecutive boxes in a stack.
  function renderConnectors(blocks: Block[], cx: number, bottomY: number) {
    const out: React.ReactNode[] = [];
    for (let i = 0; i < blocks.length - 1; i++) {
      const y1 = yAt(bottomY, i); // current box top
      const y2 = yAt(bottomY, i + 1) + bh; // box above's bottom
      out.push(
        <g key={`conn-${cx}-${i}`} stroke={C.line} fill={C.line}>
          <line x1={cx} y1={y1} x2={cx} y2={y2 + 6} strokeWidth={1.4} />
          <polygon
            points={`${cx},${y2} ${cx - 4},${y2 + 6} ${cx + 4},${y2 + 6}`}
            stroke="none"
          />
        </g>,
      );
    }
    return out;
  }

  // Residual skip arc: from below `fromIdx` box up around the outside into the
  // norm box at `toIdx`. side -1 routes left (encoder), +1 routes right (dec).
  function skip(
    cx: number,
    bottomY: number,
    fromIdx: number,
    toIdx: number,
    side: number,
    key: string,
  ) {
    const offset = side < 0 ? -(bw / 2 + 14) : bw / 2 + 14;
    const xRail = cx + offset;
    const yStart = yAt(bottomY, fromIdx) + bh + 6; // just below source box
    const yEnd = yAt(bottomY, toIdx) + bh / 2; // into norm box mid-height
    const xEnter = cx + (side < 0 ? -bw / 2 : bw / 2);
    return (
      <g key={key} stroke={C.muted} fill={C.muted} opacity={0.85}>
        <line x1={cx + (side < 0 ? -bw / 2 : bw / 2)} y1={yStart} x2={xRail} y2={yStart} strokeWidth={1.2} strokeDasharray="3 2" />
        <line x1={xRail} y1={yStart} x2={xRail} y2={yEnd} strokeWidth={1.2} strokeDasharray="3 2" />
        <line x1={xRail} y1={yEnd} x2={xEnter} y2={yEnd} strokeWidth={1.2} strokeDasharray="3 2" />
        <polygon
          points={`${xEnter},${yEnd} ${xEnter + (side < 0 ? -6 : 6)},${yEnd - 3.5} ${xEnter + (side < 0 ? -6 : 6)},${yEnd + 3.5}`}
          stroke="none"
        />
      </g>
    );
  }

  const current = litId ? BY_ID[litId] : null;
  const inEncoder = step >= 0 && step <= 4;
  const stepLabel =
    step < 0
      ? "Press Trace / Step to send a sequence through the layers."
      : `Step ${step + 1} / ${TRACE.length}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Full trace of data through one encoder layer and one decoder layer: shape (n,d) stays constant through self-attention, add and norm, and feed-forward sublayers, then a Linear and Softmax head produces the next token."
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={20}
          fontSize={12}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          One Encoder Layer + One Decoder Layer (full trace)
        </text>

        {/* Stack column labels */}
        <text x={encCX} y={40} fontSize={10} fontFamily={MONO} textAnchor="middle" fill={C.muted} fontWeight={600}>
          {`Encoder  ×${layers}`}
        </text>
        <text x={decCX} y={40} fontSize={10} fontFamily={MONO} textAnchor="middle" fill={C.muted} fontWeight={600}>
          {`Decoder  ×${layers}`}
        </text>

        {/* Faded stacked-layer ghosts behind each repeating region ("× N"). */}
        {Array.from({ length: Math.min(layers, 4) - 1 }).map((_, k) => {
          const off = (k + 1) * 3;
          const top = yAt(encBottomY, ENCODER.length - 1);
          const bot = yAt(encBottomY, 1) + bh;
          return (
            <rect
              key={`enc-ghost-${k}`}
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
          );
        })}
        {Array.from({ length: Math.min(layers, 4) - 1 }).map((_, k) => {
          const off = (k + 1) * 3;
          const top = yAt(decBottomY, DECODER.length - 1);
          const bot = yAt(decBottomY, 1) + bh;
          return (
            <rect
              key={`dec-ghost-${k}`}
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
          );
        })}

        {/* Within-stack connectors (under boxes) */}
        {renderConnectors(ENCODER, encCX, encBottomY)}
        {renderConnectors(DECODER, decCX, decBottomY)}

        {/* Residual skip arrows. Encoder: in->norm1, attn-out->... (2 skips). */}
        {skip(encCX, encBottomY, 0, 2, -1, "enc-skip-1")}
        {skip(encCX, encBottomY, 2, 4, -1, "enc-skip-2")}
        {/* Decoder: 3 skips into its three Add&Norm boxes. */}
        {skip(decCX, decBottomY, 0, 2, 1, "dec-skip-1")}
        {skip(decCX, decBottomY, 2, 4, 1, "dec-skip-2")}
        {skip(decCX, decBottomY, 4, 6, 1, "dec-skip-3")}

        {/* Decoder top -> head connector */}
        <g stroke={C.line} fill={C.line}>
          <line x1={decCX} y1={decTopY} x2={decCX} y2={headBottomY - (bh + vgap) + bh + 6} strokeWidth={1.4} />
        </g>
        {/* Head connectors */}
        {HEAD.map((_, i) => {
          const yTop = i === 0 ? decTopY : headBottomY - i * (bh + vgap);
          const yBot = headBottomY - (i + 1) * (bh + vgap) + bh;
          return (
            <g key={`head-conn-${i}`} stroke={C.line} fill={C.line}>
              <line x1={decCX} y1={yTop} x2={decCX} y2={yBot + 6} strokeWidth={1.4} />
              <polygon points={`${decCX},${yBot} ${decCX - 4},${yBot + 6} ${decCX + 4},${yBot + 6}`} stroke="none" />
            </g>
          );
        })}

        {/* Cross-attention bridge: encoder top -> over -> into cross box's left. */}
        {(() => {
          const startY = encTopY;
          const riseY = startY - 16;
          const crossLeftX = decX;
          const litBridge = litId === "dec-cross";
          const col = litBridge ? C.violet : C.coral;
          const wdt = litBridge ? 2.6 : 1.6;
          return (
            <g stroke={col} fill={col}>
              <line x1={encCX} y1={startY} x2={encCX} y2={riseY} strokeWidth={wdt} />
              <line x1={encCX} y1={riseY} x2={crossLeftX - 18} y2={riseY} strokeWidth={wdt} />
              <line x1={crossLeftX - 18} y1={riseY} x2={crossLeftX - 18} y2={crossCenterY} strokeWidth={wdt} />
              <line x1={crossLeftX - 18} y1={crossCenterY} x2={crossLeftX - 7} y2={crossCenterY} strokeWidth={wdt} />
              <polygon
                points={`${crossLeftX},${crossCenterY} ${crossLeftX - 7},${crossCenterY - 4} ${crossLeftX - 7},${crossCenterY + 4}`}
                stroke="none"
              />
              <text
                x={(encCX + crossLeftX) / 2}
                y={riseY - 5}
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

        {/* Boxes on top */}
        {renderStack(ENCODER, encCX, encBottomY)}
        {renderStack(DECODER, decCX, decBottomY)}
        {HEAD.map((b, i) => {
          const x = decCX - bw / 2;
          const y = headBottomY - (i + 1) * (bh + vgap);
          const isLit = litId === b.id;
          return (
            <g key={b.id}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={bh}
                rx={6}
                fill={isLit ? C.violet : fillFor(b.kind)}
                stroke={strokeFor(b.kind)}
                strokeWidth={isLit ? 2.6 : 1.4}
              />
              <text
                x={decCX}
                y={y + bh / 2 + 3.5}
                fontSize={10}
                fontFamily={MONO}
                textAnchor="middle"
                fill={isLit ? "var(--card)" : textFor(b.kind)}
                fontWeight={600}
              >
                {b.lines[0]}
              </text>
              <text
                x={x + bw + 6}
                y={y + bh / 2 + 3}
                fontSize={8}
                fontFamily={MONO}
                textAnchor="start"
                fill={isLit ? C.violet : C.muted}
                fontWeight={isLit ? 600 : 400}
              >
                {b.shape}
              </text>
            </g>
          );
        })}

        {/* Bottom input labels */}
        <text x={encCX} y={encBottomY + bh + 16} fontSize={9} fontFamily={MONO} textAnchor="middle" fill={C.muted}>
          source tokens
        </text>
        <text x={decCX} y={decBottomY + bh + 16} fontSize={9} fontFamily={MONO} textAnchor="middle" fill={C.muted}>
          targets (shifted right)
        </text>

        {/* ---- Readout band (below the drawing; never over it) ---- */}
        <line x1={12} y1={captionTop} x2={W - 12} y2={captionTop} stroke={C.line} strokeWidth={1} />
        <text x={16} y={captionTop + 18} fontSize={10} fontFamily={MONO} fill={C.ink} fontWeight={600}>
          {stepLabel}
        </text>
        {current ? (
          <>
            <text x={16} y={captionTop + 35} fontSize={9.5} fontFamily={MONO} fill={textFor(current.kind)} fontWeight={600}>
              {`${current.lines.join(" ")}  →  ${current.shape}`}
            </text>
            <Wrapped text={current.desc} x={16} y={captionTop + 51} width={W - 32} size={9.5} fill={C.muted} />
            <text x={16} y={captionTop + 79} fontSize={9} fontFamily={MONO} fill={inEncoder ? C.coral : C.violet}>
              {inEncoder
                ? "shape (n,d) in  →  (n,d) out"
                : litId && litId.startsWith("head")
                  ? "decoder vectors  →  vocab logits  →  probabilities"
                  : "shape (m,d) in  →  (m,d) out"}
            </text>
          </>
        ) : (
          <text x={16} y={captionTop + 36} fontSize={9.5} fontFamily={MONO} fill={C.muted}>
            Same shape in, same shape out, that&apos;s why layers stack freely.
          </text>
        )}

        {/* Caption */}
        <text x={W / 2} y={H - 8} fontSize={9} fontFamily={MONO} textAnchor="middle" fill={C.muted}>
          Same shape in, same shape out, that&apos;s why you can stack layers freely.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => {
            if (step >= STEP_MAX) setStep(-1);
            setPlaying((p) => !p);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={playing ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {playing ? "Pause" : "Trace"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStep((s) => (s >= STEP_MAX ? STEP_MAX : s + 1));
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStep(-1);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <span style={{ color: C.muted, fontFamily: MONO }}>stack:</span>
        <input
          type="range"
          min={1}
          max={6}
          step={1}
          value={layers}
          onChange={(e) => setLayers(Number(e.target.value))}
          className="w-28 accent-[var(--foreground)]"
        />
        <span className="font-mono tabular-nums" style={{ color: C.ink }}>
          {`${layers} layer${layers === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}

// Word-wrap a one-line description into up to two lines in the readout band.
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
  const charW = size * 0.6;
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
      {lines.slice(0, 2).map((ln, i) => (
        <text key={i} x={x} y={y + i * 13} fontSize={size} fontFamily={MONO} fill={fill}>
          {ln}
        </text>
      ))}
    </>
  );
}
