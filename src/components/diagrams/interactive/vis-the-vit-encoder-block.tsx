"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// One sub-layer in the ViT pre-norm transformer block. `lines` lets long
// labels wrap to two centered rows so nothing spills outside its box.
type Sub = {
  id: string;
  lines: string[];
  desc: string[]; // pre-split caption lines, each must fit width-24
  kind: "norm" | "attn" | "mlp" | "add";
};

// Bottom (index 0) to top. Standard pre-norm block:
// LN -> MHSA -> (+) -> LN -> MLP -> (+).
const SUBS: Sub[] = [
  {
    id: "ln1",
    lines: ["LayerNorm 1"],
    desc: [
      "Normalize each patch token before attention.",
      "Pre-norm keeps activations well-scaled.",
    ],
    kind: "norm",
  },
  {
    id: "attn",
    lines: ["Multi-Head", "Self-Attention"],
    desc: [
      "Every patch token attends to every other,",
      "mixing information across the whole image.",
    ],
    kind: "attn",
  },
  {
    id: "add1",
    lines: ["Add (residual)"],
    desc: [
      "Add the block input back to the attention",
      "output: the first skip connection.",
    ],
    kind: "add",
  },
  {
    id: "ln2",
    lines: ["LayerNorm 2"],
    desc: [
      "Normalize again before the MLP, so the",
      "feed-forward sees stable inputs.",
    ],
    kind: "norm",
  },
  {
    id: "mlp",
    lines: ["MLP (GELU)"],
    desc: [
      "A position-wise two-layer MLP with GELU,",
      "applied identically to every token.",
    ],
    kind: "mlp",
  },
  {
    id: "add2",
    lines: ["Add (residual)"],
    desc: [
      "Add the post-attention signal back: the",
      "second skip. Output feeds the next block.",
    ],
    kind: "add",
  },
];

const STEP_MAX = SUBS.length - 1;

const DEPTHS: number[] = [12, 24, 32];

function fillFor(kind: Sub["kind"]): string {
  switch (kind) {
    case "norm":
      return "var(--card)";
    case "attn":
      return C.blueFill;
    case "mlp":
      return C.greenFill;
    case "add":
      return C.coralFill;
  }
}
function strokeFor(kind: Sub["kind"]): string {
  switch (kind) {
    case "norm":
      return C.line;
    case "attn":
      return C.blue;
    case "mlp":
      return C.green;
    case "add":
      return C.coral;
  }
}
function textFor(kind: Sub["kind"]): string {
  switch (kind) {
    case "norm":
      return C.ink;
    case "attn":
      return C.blue;
    case "mlp":
      return C.green;
    case "add":
      return C.coral;
  }
}

export function VisVitEncoderBlock() {
  const [step, setStep] = useState<number>(0);
  const [depthIdx, setDepthIdx] = useState<number>(0);
  const [residual, setResidual] = useState<boolean>(true);
  const [playing, setPlaying] = useState<boolean>(false);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      frame.current += 1;
      if (frame.current % 2 === 0) {
        setStep((s: number) => (s >= STEP_MAX ? 0 : s + 1));
      }
    }, 320);
    return () => clearInterval(id);
  }, [playing]);

  // --- Layout ----------------------------------------------------------------
  const W = 460;
  const H = 600;

  const bw = 152; // box width
  const bh = 30; // box height
  const vgap = 16; // vertical gap (room for connectors + arrows)

  const blockCX = 168; // center of the main block column
  const blockX = blockCX - bw / 2;

  const bottomY = 350; // top edge of bottom-most box (ln1)
  const yAt = (i: number): number => bottomY - i * (bh + vgap);

  const topY = yAt(STEP_MAX); // top edge of top box (add2)
  const inY = bottomY + bh + 20; // input line foot
  const outY = topY - 22; // output dot row

  const depth = DEPTHS[depthIdx];

  const captionTop = 434; // divider above readout band
  const current = SUBS[step];

  // Residual skip 1 wraps around: input -> add1 (around ln1 + attn).
  // Residual skip 2 wraps around: add1 -> add2 (around ln2 + mlp).
  const add1Idx = 2;
  const add2Idx = 5;
  const add1Y = yAt(add1Idx) + bh / 2;
  const add2Y = yAt(add2Idx) + bh / 2;
  const skipX = blockX + bw + 30; // x of the curving skip wire (right side)

  // Ghost "× N" stacked outlines on the far left (visual depth).
  const ghostN = 4;
  const ghostTop = topY;
  const ghostBot = bottomY + bh;
  const ghostX = 40;
  const ghostW = 26;

  // Gradient health for the "residual off" animation: with residuals the
  // gradient stays strong; without, it decays with depth.
  const gradStrong = residual ? 1 : Math.max(0.06, Math.pow(0.55, depthIdx + 1));

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="The ViT encoder block: LayerNorm, multi-head self-attention, residual add, LayerNorm, MLP, residual add, the standard pre-norm transformer block over image patch tokens, repeated N times into a classification head."
      >
        {/* ---- Title band ---- */}
        <text
          x={W / 2}
          y={20}
          fontSize={12}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          The ViT Encoder Block
        </text>
        <text
          x={W / 2}
          y={35}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          pre-norm transformer block over patch tokens
        </text>

        {/* ---- Ghost stack (× depth) on the far left ---- */}
        {Array.from({ length: ghostN }).map((_, k: number) => {
          const off = (ghostN - 1 - k) * 4;
          const op = residual ? 0.55 - k * 0.1 : (0.55 - k * 0.1) * 0.5;
          return (
            <rect
              key={`ghost-${k}`}
              x={ghostX - off}
              y={ghostTop - off}
              width={ghostW}
              height={ghostBot - ghostTop}
              rx={5}
              fill="none"
              stroke={C.line}
              strokeWidth={1}
              opacity={op}
            />
          );
        })}
        <text
          x={ghostX + ghostW / 2 - 6}
          y={ghostBot + 16}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
          fontWeight={600}
        >
          {`× ${depth}`}
        </text>
        <text
          x={ghostX + ghostW / 2 - 6}
          y={ghostBot + 29}
          fontSize={8}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          blocks
        </text>

        {/* ---- Input token ---- */}
        <line
          x1={blockCX}
          y1={inY}
          x2={blockCX}
          y2={bottomY + bh}
          stroke={C.line}
          strokeWidth={1.4}
        />
        <text
          x={blockCX}
          y={inY + 14}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          patch tokens (+ pos, [CLS])
        </text>

        {/* ---- Vertical connectors between boxes (under boxes) ---- */}
        {SUBS.slice(0, STEP_MAX).map((_, i: number) => {
          const yTopLower = yAt(i);
          const yBotUpper = yAt(i + 1) + bh;
          return (
            <g key={`conn-${i}`} stroke={C.line} fill={C.line}>
              <line
                x1={blockCX}
                y1={yTopLower}
                x2={blockCX}
                y2={yBotUpper + 6}
                strokeWidth={1.4}
              />
              <polygon
                points={`${blockCX},${yBotUpper} ${blockCX - 4},${yBotUpper + 6} ${blockCX + 4},${yBotUpper + 6}`}
                stroke="none"
              />
            </g>
          );
        })}

        {/* ---- Residual skip arrows (right side, curving around) ---- */}
        {(() => {
          const on = residual;
          const col = on ? C.coral : C.line;
          const wdt = on ? 1.8 : 1.2;
          const dash = on ? undefined : "4 3";
          const opac = on ? 1 : 0.55;
          // Skip 1: input -> add1 right edge.
          const inTapY = bottomY + bh + 6; // just below ln1's bottom
          const a1RightX = blockX + bw;
          // Skip 2: add1 top -> add2 right edge.
          const a1TopY = yAt(add1Idx);
          const a2RightX = blockX + bw;
          return (
            <g
              fill={col}
              stroke={col}
              strokeWidth={wdt}
              opacity={opac}
              strokeDasharray={dash}
            >
              {/* skip 1 */}
              <path
                d={`M ${blockCX} ${inTapY} H ${skipX} V ${add1Y} H ${a1RightX + 7}`}
                fill="none"
              />
              <polygon
                points={`${a1RightX},${add1Y} ${a1RightX + 7},${add1Y - 4} ${a1RightX + 7},${add1Y + 4}`}
                stroke="none"
                opacity={opac}
              />
              {/* skip 2 */}
              <path
                d={`M ${blockCX} ${a1TopY} H ${skipX + 16} V ${add2Y} H ${a2RightX + 7}`}
                fill="none"
              />
              <polygon
                points={`${a2RightX},${add2Y} ${a2RightX + 7},${add2Y - 4} ${a2RightX + 7},${add2Y + 4}`}
                stroke="none"
                opacity={opac}
              />
              <text
                x={skipX + 24}
                y={(add1Y + add2Y) / 2}
                fontSize={8}
                fontFamily={MONO}
                textAnchor="middle"
                fill={on ? C.coral : C.muted}
                stroke="none"
                opacity={1}
                transform={`rotate(90 ${skipX + 24} ${(add1Y + add2Y) / 2})`}
              >
                {on ? "residual skips" : "no skips"}
              </text>
            </g>
          );
        })()}

        {/* ---- The sub-layer boxes ---- */}
        {SUBS.map((b, i: number) => {
          const y = yAt(i);
          const isActive = step === i;
          const stroke = strokeFor(b.kind);
          const tcol = textFor(b.kind);
          return (
            <g
              key={b.id}
              onClick={() => {
                setPlaying(false);
                setStep(i);
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={blockX}
                y={y}
                width={bw}
                height={bh}
                rx={6}
                fill={isActive ? C.violet : fillFor(b.kind)}
                stroke={isActive ? C.violet : stroke}
                strokeWidth={isActive ? 2.4 : 1.4}
              />
              {b.lines.length === 1 ? (
                <text
                  x={blockCX}
                  y={y + bh / 2 + 3.5}
                  fontSize={10}
                  fontFamily={MONO}
                  textAnchor="middle"
                  fill={isActive ? "var(--card)" : tcol}
                  fontWeight={600}
                >
                  {b.lines[0]}
                </text>
              ) : (
                <>
                  <text
                    x={blockCX}
                    y={y + bh / 2 - 2}
                    fontSize={9}
                    fontFamily={MONO}
                    textAnchor="middle"
                    fill={isActive ? "var(--card)" : tcol}
                    fontWeight={600}
                  >
                    {b.lines[0]}
                  </text>
                  <text
                    x={blockCX}
                    y={y + bh / 2 + 9}
                    fontSize={9}
                    fontFamily={MONO}
                    textAnchor="middle"
                    fill={isActive ? "var(--card)" : tcol}
                    fontWeight={600}
                  >
                    {b.lines[1]}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* ---- Output -> classification head ---- */}
        <g stroke={C.line} fill={C.line}>
          <line
            x1={blockCX}
            y1={topY}
            x2={blockCX}
            y2={outY + 6}
            strokeWidth={1.4}
          />
          <polygon
            points={`${blockCX},${outY} ${blockCX - 4},${outY + 6} ${blockCX + 4},${outY + 6}`}
            stroke="none"
          />
        </g>
        <text
          x={blockCX}
          y={outY - 6}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          [CLS] token → MLP head → class logits
        </text>

        {/* ---- Step / depth labels on the upper-right (clear of drawing) ---- */}
        <text
          x={W - 14}
          y={64}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="end"
          fill={C.muted}
        >
          {`step ${step + 1} / ${SUBS.length}`}
        </text>
        <text
          x={W - 14}
          y={78}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="end"
          fill={residual ? C.green : C.coral}
          fontWeight={600}
        >
          {residual ? "gradient: healthy" : "gradient: dying"}
        </text>
        {/* gradient health bar */}
        <rect
          x={W - 86}
          y={84}
          width={72}
          height={6}
          rx={3}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <rect
          x={W - 86}
          y={84}
          width={72 * gradStrong}
          height={6}
          rx={3}
          fill={residual ? C.green : C.coral}
          stroke="none"
        />

        {/* ---- Readout band (below the drawing; never over it) ---- */}
        <line
          x1={12}
          y1={captionTop}
          x2={W - 12}
          y2={captionTop}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={16}
          y={captionTop + 18}
          fontSize={10}
          fontFamily={MONO}
          fill={C.ink}
          fontWeight={600}
        >
          {`${step + 1}. ${current.lines.join(" ")}`}
        </text>
        {current.desc.map((ln: string, i: number) => (
          <text
            key={`desc-${i}`}
            x={16}
            y={captionTop + 34 + i * 14}
            fontSize={9.5}
            fontFamily={MONO}
            fill={C.muted}
          >
            {ln}
          </text>
        ))}
        {!residual && (
          <>
            <text
              x={16}
              y={captionTop + 72}
              fontSize={9.5}
              fontFamily={MONO}
              fill={C.coral}
              fontWeight={600}
            >
              Skips off: with no residual path the gradient
            </text>
            <text
              x={16}
              y={captionTop + 86}
              fontSize={9.5}
              fontFamily={MONO}
              fill={C.coral}
            >
              {`vanishes through ${depth} blocks, same lesson as CNNs.`}
            </text>
          </>
        )}

        {/* ---- Caption at the very bottom ---- */}
        <text
          x={W / 2}
          y={H - 22}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          Identical to a BERT block, LayerNorm, attention,
        </text>
        <text
          x={W / 2}
          y={H - 9}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          residual, MLP, residual, just over image patches.
        </text>
      </svg>

      {/* ---- Controls row ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setPlaying((p: boolean) => !p)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {playing ? "Pause" : "Play steps"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStep((s: number) => (s >= STEP_MAX ? 0 : s + 1));
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>

        <span style={{ color: C.muted, fontFamily: MONO }}>depth:</span>
        {DEPTHS.map((d: number, i: number) => (
          <button
            key={d}
            type="button"
            onClick={() => setDepthIdx(i)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              depthIdx === i
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            {d}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setResidual((r: boolean) => !r)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            !residual
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          {residual ? "Remove residuals" : "Restore residuals"}
        </button>
      </div>
    </div>
  );
}
