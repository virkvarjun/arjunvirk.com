"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// SAM's Three-Stage Data Engine.
// A stepper walks through three co-improvement stages. At each stage the model
// labels data, humans correct/add, the dataset grows, and the model retrains,
// shifting effort from mostly-human to fully-automatic while the cumulative
// mask count grows from 4.3M -> 10.2M -> 1.1B.
//   1. Assisted-Manual : human + early SAM, +4.3M masks, ~34s -> ~14s / mask.
//   2. Semi-Automatic  : SAM auto-masks easy objects, humans add missed ones
//      for diversity, +5.9M masks (cumulative 10.2M).
//   3. Fully Automatic : 32x32 point grid prompts + quality/stability filter,
//      +1.1B masks (cumulative 1.1B, ~400x COCO).
// Top: title band. Middle: three stage cards + virtuous-cycle arrow. A readout
// band below shows the active stage, its mask growth, and human/model split.

type StageId = 0 | 1 | 2;

interface Stage {
  id: StageId;
  name1: string; // stage card title line 1
  name2: string; // stage card title line 2
  prompt: string; // prompting method (card subline)
  added: string; // masks added this stage
  cumulative: string; // cumulative masks after this stage
  speed: string; // per-mask annotation note
  humanPct: number; // share of effort from humans (0..1)
  detail1: string; // readout description line 1
  detail2: string; // readout description line 2
  color: string;
  fill: string;
}

const STAGES: Stage[] = [
  {
    id: 0,
    name1: "1. Assisted-",
    name2: "Manual",
    prompt: "human + early SAM",
    added: "+4.3M masks",
    cumulative: "4.3M",
    speed: "~34s -> ~14s / mask",
    humanPct: 0.85,
    detail1: "Annotators click/correct masks; SAM suggests.",
    detail2: "Model retrains as labels accrue -> faster.",
    color: C.coral,
    fill: C.coralFill,
  },
  {
    id: 1,
    name1: "2. Semi-",
    name2: "Automatic",
    prompt: "SAM masks easy objects",
    added: "+5.9M masks",
    cumulative: "10.2M",
    speed: "humans add missed objects",
    humanPct: 0.45,
    detail1: "SAM pre-fills confident masks automatically;",
    detail2: "humans add missed ones for diversity.",
    color: C.blue,
    fill: C.blueFill,
  },
  {
    id: 2,
    name1: "3. Fully",
    name2: "Automatic",
    prompt: "32x32 point grid",
    added: "+1.1B masks",
    cumulative: "1.1B",
    speed: "quality + stability filter",
    humanPct: 0.0,
    detail1: "Grid prompts every image; filter by quality",
    detail2: "& stability -> 1.1B masks, ~400x COCO.",
    color: C.green,
    fill: C.greenFill,
  },
];

// --- geometry --------------------------------------------------------------
const VB_W = 540;
const VB_H = 430;
const MARGIN = 16;

// Stage card band.
const CARD_Y = 88;
const CARD_H = 104;
const CARD_W = 152;
const CARD_GAP = (VB_W - 2 * MARGIN - 3 * CARD_W) / 2;
const CARD_X = (i: number): number => MARGIN + i * (CARD_W + CARD_GAP);

// Effort-split band.
const SPLIT_Y = 218;
const SPLIT_BAR_Y = SPLIT_Y + 16;
const SPLIT_BAR_H = 22;
const SPLIT_X = MARGIN;
const SPLIT_W = VB_W - 2 * MARGIN;

// Readout band.
const READ_Y = 288;
const READ_X = MARGIN;
const READ_W = VB_W - 2 * MARGIN;
const READ_H = 112;
const LINE = 16;

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function VisSamDataEngine() {
  const [selected, setSelected] = useState<StageId>(0);

  const active: Stage = STAGES[selected];
  const humanW: number = active.humanPct * SPLIT_W;
  const modelW: number = SPLIT_W - humanW;

  const step = (dir: number): void => {
    setSelected((s: StageId): StageId => {
      const next = Math.max(0, Math.min(2, s + dir));
      return next as StageId;
    });
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="SAM's three-stage data engine: assisted-manual, semi-automatic, and fully automatic, growing to 1.1B masks"
      >
        {/* ---- title band ---- */}
        <text
          x={VB_W / 2}
          y={24}
          fontSize={14}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          SAM&apos;s Three-Stage Data Engine
        </text>
        <text
          x={VB_W / 2}
          y={42}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          model labels data, humans correct, dataset grows, model retrains
        </text>

        {/* ---- virtuous-cycle hint above the cards ---- */}
        <text
          x={VB_W / 2}
          y={62}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          more masks -&gt; better SAM -&gt; more automatic annotation
        </text>

        {/* ---- stage cards + arrows ---- */}
        {STAGES.map((st, i) => {
          const x = CARD_X(i);
          const isSel = st.id === selected;
          const isDone = st.id <= selected;
          return (
            <g key={st.id}>
              {/* arrow from previous card */}
              {i > 0 && (
                <g>
                  <line
                    x1={CARD_X(i - 1) + CARD_W}
                    y1={CARD_Y + CARD_H / 2}
                    x2={x - 4}
                    y2={CARD_Y + CARD_H / 2}
                    stroke={C.line}
                    strokeWidth={1.4}
                  />
                  <path
                    d={`M ${x - 4} ${CARD_Y + CARD_H / 2} l -6 -3.5 v 7 z`}
                    fill={C.line}
                  />
                </g>
              )}

              {/* stage card (clickable) */}
              <rect
                x={x}
                y={CARD_Y}
                width={CARD_W}
                height={CARD_H}
                rx={6}
                fill={isSel ? st.fill : "var(--card)"}
                stroke={isSel ? st.color : C.line}
                strokeWidth={isSel ? 2 : 1}
                opacity={isDone ? 1 : 0.6}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(st.id)}
              />
              <text
                x={x + CARD_W / 2}
                y={CARD_Y + 20}
                fontSize={11}
                fill={st.color}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {st.name1}
              </text>
              <text
                x={x + CARD_W / 2}
                y={CARD_Y + 35}
                fontSize={11}
                fill={st.color}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {st.name2}
              </text>
              <text
                x={x + CARD_W / 2}
                y={CARD_Y + 54}
                fontSize={8.5}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                style={{ pointerEvents: "none" }}
              >
                {st.prompt}
              </text>
              <text
                x={x + CARD_W / 2}
                y={CARD_Y + 76}
                fontSize={10}
                fill={st.color}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {st.added}
              </text>
              <text
                x={x + CARD_W / 2}
                y={CARD_Y + 92}
                fontSize={8.5}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                style={{ pointerEvents: "none" }}
              >
                {`total: ${st.cumulative}`}
              </text>
            </g>
          );
        })}

        {/* ================= EFFORT-SPLIT BAND ================= */}
        <text
          x={SPLIT_X}
          y={SPLIT_Y + 2}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          annotation effort: human vs. model
        </text>
        <text
          x={SPLIT_X + SPLIT_W}
          y={SPLIT_Y + 2}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`human ${Math.round(active.humanPct * 100)}%`}
        </text>

        {/* human segment */}
        {humanW > 0 && (
          <rect
            x={SPLIT_X}
            y={SPLIT_BAR_Y}
            width={humanW}
            height={SPLIT_BAR_H}
            fill={C.coral}
            stroke="var(--background)"
            strokeWidth={1}
          />
        )}
        {/* model segment */}
        <rect
          x={SPLIT_X + humanW}
          y={SPLIT_BAR_Y}
          width={modelW}
          height={SPLIT_BAR_H}
          fill={active.color}
          stroke="var(--background)"
          strokeWidth={1}
        />
        {humanW > 56 && (
          <text
            x={SPLIT_X + 8}
            y={SPLIT_BAR_Y + SPLIT_BAR_H / 2 + 3.5}
            fontSize={9}
            fill="var(--background)"
            fontFamily={MONO}
            fontWeight={600}
            style={{ pointerEvents: "none" }}
          >
            human
          </text>
        )}
        {modelW > 56 && (
          <text
            x={SPLIT_X + SPLIT_W - 8}
            y={SPLIT_BAR_Y + SPLIT_BAR_H / 2 + 3.5}
            fontSize={9}
            fill="var(--background)"
            fontFamily={MONO}
            fontWeight={600}
            textAnchor="end"
            style={{ pointerEvents: "none" }}
          >
            model
          </text>
        )}

        {/* ================= READOUT BAND ================= */}
        <rect
          x={READ_X}
          y={READ_Y}
          width={READ_W}
          height={READ_H}
          rx={6}
          fill={active.fill}
          stroke={active.color}
          strokeWidth={1.4}
        />
        <text
          x={READ_X + 12}
          y={READ_Y + 20}
          fontSize={12}
          fill={active.color}
          fontFamily={MONO}
          fontWeight={600}
        >
          {`Stage ${active.id + 1}: ${active.name1.replace(/^\d\.\s*/, "")}${active.name2}`}
        </text>
        <text
          x={READ_X + READ_W - 12}
          y={READ_Y + 20}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`stage ${active.id + 1} of 3`}
        </text>

        {(
          [
            ["masks", `${active.added}  (total ${active.cumulative})`],
            ["how", active.detail1],
            ["", active.detail2],
            ["pace", active.speed],
          ] as [string, string][]
        ).map(([label, value], i) => {
          const y = READ_Y + 44 + i * LINE;
          return (
            <g key={`row-${i}`}>
              {label !== "" && (
                <text
                  x={READ_X + 12}
                  y={y}
                  fontSize={9.5}
                  fill={C.muted}
                  fontFamily={MONO}
                >
                  {`${label}:`}
                </text>
              )}
              <text
                x={READ_X + 62}
                y={y}
                fontSize={9.5}
                fill={C.ink}
                fontFamily={MONO}
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* caption line */}
        <text
          x={VB_W / 2}
          y={VB_H - 8}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Bootstrap from human-assisted to fully automatic.
        </text>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          onClick={() => step(-1)}
          disabled={selected === 0}
          style={selected === 0 ? { opacity: 0.4 } : undefined}
        >
          prev stage
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => step(1)}
          disabled={selected === 2}
          style={selected === 2 ? { opacity: 0.4 } : undefined}
        >
          next stage
        </button>
        {STAGES.map((st) => (
          <button
            key={st.id}
            type="button"
            className={btn}
            style={
              st.id === selected
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setSelected(st.id)}
          >
            {`${st.id + 1}`}
          </button>
        ))}
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {`masks: ${active.cumulative}`}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        The model labels its own ever-growing dataset: each stage retrains SAM on
        more masks, so annotation gets faster and more automatic, ending at 1.1B
        masks, about 400x bigger than COCO.
      </p>
    </div>
  );
}
