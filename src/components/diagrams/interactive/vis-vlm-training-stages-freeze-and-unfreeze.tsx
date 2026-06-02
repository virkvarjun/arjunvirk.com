"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// VLM Training Stages: Freeze and Unfreeze.
// A VLM has three parts wired in series: a (pretrained) vision encoder, a
// connector/adapter that projects image features into the LLM's token space,
// and the (pretrained) LLM. Training proceeds in stages, each freezing or
// unfreezing parts:
//   1. Pretrained init  — all three frozen (nothing trains yet).
//   2. Alignment        — train ONLY the adapter; encoder + LLM frozen.
//   3. Instruction tune — unfreeze the LLM (+ adapter); encoder usually frozen.
//   4. Preference align — RLHF/DPO; LLM + adapter train; encoder frozen.
// The stepper flips the lock/unlock icons per part and shows what data feeds
// each stage. Hovering a part reports whether it is learning in that stage.

// --- part identity ---------------------------------------------------------
type PartId = "encoder" | "adapter" | "llm";

interface PartMeta {
  id: PartId;
  title: string;
  subtitle: string;
  color: string;
  fill: string;
}

const PARTS: PartMeta[] = [
  {
    id: "encoder",
    title: "Vision",
    subtitle: "encoder",
    color: C.green,
    fill: C.greenFill,
  },
  {
    id: "adapter",
    title: "Adapter",
    subtitle: "projector",
    color: C.coral,
    fill: C.coralFill,
  },
  {
    id: "llm",
    title: "LLM",
    subtitle: "decoder",
    color: C.blue,
    fill: C.blueFill,
  },
];

// --- per-stage state -------------------------------------------------------
// trains[partId] = true means that part is unlocked (learning) this stage.
interface StageInfo {
  short: string; // stepper button label
  name: string; // readout heading
  trains: Record<PartId, boolean>;
  data: string; // what data feeds this stage
  goal: string; // objective line
}

const STAGES: StageInfo[] = [
  {
    short: "1 Init",
    name: "1. Pretrained init",
    trains: { encoder: false, adapter: false, llm: false },
    data: "Reuse off-the-shelf pretrained weights",
    goal: "Nothing trains yet - assemble the parts",
  },
  {
    short: "2 Align",
    name: "2. Alignment / captioning",
    trains: { encoder: false, adapter: true, llm: false },
    data: "Image-caption pairs (web alt-text)",
    goal: "Train ONLY the adapter to map image -> tokens",
  },
  {
    short: "3 Instruct",
    name: "3. Instruction tuning",
    trains: { encoder: false, adapter: true, llm: true },
    data: "Image + question -> answer triples",
    goal: "Unfreeze the LLM to follow visual instructions",
  },
  {
    short: "4 Align+",
    name: "4. Preference alignment",
    trains: { encoder: false, adapter: true, llm: true },
    data: "Human preference pairs (RLHF / DPO)",
    goal: "Tune outputs to be helpful + grounded",
  },
];

// --- geometry --------------------------------------------------------------
const VB_W = 540;
const VB_H = 478;
const MARGIN = 16;

// Component-box band.
const BOX_Y = 96;
const BOX_H = 104;
const BOX_W = 150;
const GAP = (VB_W - 2 * MARGIN - 3 * BOX_W) / 2;
const BOX_X = (i: number): number => MARGIN + i * (BOX_W + GAP);

// Data-feed band.
const DATA_Y = 232;

// Readout band.
const READ_X = MARGIN;
const READ_W = VB_W - 2 * MARGIN;
const READ_Y = 268;
const READ_H = 128;
const LINE = 16;

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

// --- lock glyph ------------------------------------------------------------
// Draws a small padlock centered at (cx, cy). Locked => closed shackle (muted);
// unlocked => open shackle + accent color.
function Lock({
  cx,
  cy,
  locked,
  color,
}: {
  cx: number;
  cy: number;
  locked: boolean;
  color: string;
}) {
  const bodyW = 16;
  const bodyH = 12;
  const bodyX = cx - bodyW / 2;
  const bodyY = cy - 1;
  const stroke = locked ? C.muted : color;
  // Shackle: locked = symmetric arch into body; unlocked = arch rotated open.
  const shackle = locked
    ? `M ${cx - 5} ${bodyY} v -3 a 5 5 0 0 1 10 0 v 3`
    : `M ${cx - 5} ${bodyY} v -3 a 5 5 0 0 1 10 0`;
  return (
    <g style={{ pointerEvents: "none" }}>
      <path d={shackle} fill="none" stroke={stroke} strokeWidth={1.6} />
      <rect
        x={bodyX}
        y={bodyY}
        width={bodyW}
        height={bodyH}
        rx={2}
        fill={locked ? "var(--card)" : color}
        stroke={stroke}
        strokeWidth={1.4}
      />
    </g>
  );
}

export function VisVlmTrainingStages() {
  const [stageIdx, setStageIdx] = useState<number>(1);
  const [hover, setHover] = useState<PartId | null>(null);

  const stage: StageInfo = STAGES[stageIdx];

  const hoverPart: PartMeta | null =
    hover === null ? null : (PARTS.find((p) => p.id === hover) ?? null);
  const hoverLearning: boolean =
    hoverPart === null ? false : stage.trains[hoverPart.id];

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="VLM training stages: freeze the vision encoder and LLM to train the adapter, then unfreeze the LLM for instruction tuning"
      >
        {/* ---- title band ---- */}
        <text
          x={VB_W / 2}
          y={26}
          fontSize={14}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          VLM Training Stages: Freeze and Unfreeze
        </text>
        <text
          x={VB_W / 2}
          y={44}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          step through stages; locked = frozen, unlocked = learning
        </text>

        {/* ---- legend (locked vs unlocked) ---- */}
        <g>
          <Lock cx={MARGIN + 8} cy={66} locked color={C.ink} />
          <text
            x={MARGIN + 22}
            y={72}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
          >
            frozen
          </text>
          <Lock cx={MARGIN + 86} cy={66} locked={false} color={C.coral} />
          <text
            x={MARGIN + 100}
            y={72}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
          >
            trainable
          </text>
        </g>
        <text
          x={VB_W - MARGIN}
          y={72}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          image -&gt; encoder -&gt; adapter -&gt; LLM -&gt; text
        </text>

        {/* ---- component boxes + connecting arrows ---- */}
        {PARTS.map((p, i) => {
          const x = BOX_X(i);
          const learning = stage.trains[p.id];
          const isHover = hover === p.id;
          return (
            <g key={p.id}>
              {/* connecting arrow from previous box */}
              {i > 0 && (
                <g>
                  <line
                    x1={BOX_X(i - 1) + BOX_W}
                    y1={BOX_Y + BOX_H / 2}
                    x2={x - 4}
                    y2={BOX_Y + BOX_H / 2}
                    stroke={C.line}
                    strokeWidth={1.4}
                  />
                  <path
                    d={`M ${x - 4} ${BOX_Y + BOX_H / 2} l -6 -3.5 v 7 z`}
                    fill={C.line}
                  />
                </g>
              )}

              {/* box */}
              <rect
                x={x}
                y={BOX_Y}
                width={BOX_W}
                height={BOX_H}
                rx={6}
                fill={learning ? p.fill : "var(--card)"}
                stroke={learning ? p.color : C.line}
                strokeWidth={isHover ? 2.4 : learning ? 2 : 1.2}
                strokeDasharray={learning ? undefined : "5 4"}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
              />
              <text
                x={x + BOX_W / 2}
                y={BOX_Y + 26}
                fontSize={12}
                fill={learning ? p.color : C.ink}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {p.title}
              </text>
              <text
                x={x + BOX_W / 2}
                y={BOX_Y + 42}
                fontSize={9}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                style={{ pointerEvents: "none" }}
              >
                {p.subtitle}
              </text>

              {/* lock icon */}
              <Lock
                cx={x + BOX_W / 2}
                cy={BOX_Y + 62}
                locked={!learning}
                color={p.color}
              />

              {/* status label */}
              <text
                x={x + BOX_W / 2}
                y={BOX_Y + 96}
                fontSize={9.5}
                fill={learning ? p.color : C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={learning ? 600 : 400}
                style={{ pointerEvents: "none" }}
              >
                {learning ? "training" : "frozen"}
              </text>
            </g>
          );
        })}

        {/* ---- data-feed band ---- */}
        <text
          x={MARGIN}
          y={DATA_Y}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          data this stage:
        </text>
        <text
          x={MARGIN + 116}
          y={DATA_Y}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
        >
          {stage.data}
        </text>

        {/* ================= READOUT BAND ================= */}
        <rect
          x={READ_X}
          y={READ_Y}
          width={READ_W}
          height={READ_H}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.4}
        />
        <text
          x={READ_X + 12}
          y={READ_Y + 22}
          fontSize={12}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          {stage.name}
        </text>
        <text
          x={READ_X + READ_W - 12}
          y={READ_Y + 22}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`stage ${stageIdx + 1} of ${STAGES.length}`}
        </text>

        {/* goal line */}
        <text
          x={READ_X + 12}
          y={READ_Y + 22 + LINE + 4}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          {stage.goal}
        </text>

        {/* per-part freeze/train summary row */}
        {PARTS.map((p, i) => {
          const learning = stage.trains[p.id];
          const cellW = (READ_W - 24) / 3;
          const cx = READ_X + 12 + cellW * i + cellW / 2;
          const y = READ_Y + 70;
          return (
            <g key={`sum-${p.id}`}>
              <Lock cx={cx - 28} cy={y - 3} locked={!learning} color={p.color} />
              <text
                x={cx - 14}
                y={y + 1}
                fontSize={9}
                fill={learning ? p.color : C.muted}
                fontFamily={MONO}
                fontWeight={learning ? 600 : 400}
              >
                {p.title}
              </text>
            </g>
          );
        })}

        {/* hover readout line(s) */}
        <text
          x={READ_X + 12}
          y={READ_Y + 98}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          fontWeight={600}
        >
          hover a part:
        </text>
        <text
          x={READ_X + 110}
          y={READ_Y + 98}
          fontSize={9.5}
          fill={hoverPart === null ? C.muted : hoverLearning ? C.green : C.muted}
          fontFamily={MONO}
        >
          {hoverPart === null
            ? "move over a box above"
            : hoverLearning
              ? `${hoverPart.title} is LEARNING this stage`
              : `${hoverPart.title} is FROZEN this stage`}
        </text>

        {/* caption (split into two fitting lines) */}
        <text
          x={VB_W / 2}
          y={VB_H - 22}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Start fully frozen, train the adapter, then unfreeze the LLM
        </text>
        <text
          x={VB_W / 2}
          y={VB_H - 8}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          for instruction tuning, then align - cheap to capable.
        </text>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          onClick={() => setStageIdx((s: number) => Math.max(0, s - 1))}
        >
          prev
        </button>
        {STAGES.map((s, i) => (
          <button
            key={s.short}
            type="button"
            className={btn}
            style={
              i === stageIdx
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setStageIdx(i)}
          >
            {s.short}
          </button>
        ))}
        <button
          type="button"
          className={btn}
          onClick={() =>
            setStageIdx((s: number) => Math.min(STAGES.length - 1, s + 1))
          }
        >
          next
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {`stage ${stageIdx + 1}/${STAGES.length}`}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Freezing the expensive pretrained encoder and LLM while training only the
        small adapter is cheap; unfreezing the LLM later buys capability at higher
        cost. The vision encoder usually stays frozen throughout.
      </p>
    </div>
  );
}
