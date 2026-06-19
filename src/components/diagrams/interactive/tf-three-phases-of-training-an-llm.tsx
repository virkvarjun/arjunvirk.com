"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Three Phases of Training an LLM.
// A left-to-right pipeline of three stages, each clickable:
//   1. PRETRAINING , huge corpus (trillions of tokens), next-token prediction,
//      yields a "base model" that can complete text. Most of the compute.
//   2. SFT         , curated (instruction, good-response) pairs, supervised
//      fine-tuning, teaches the assistant format / instruction following.
//   3. RLHF        , human preference ratings train a reward model, then the
//      policy is optimized against it (DPO is a reward-model-free variant);
//      yields a helpful, harmless, aligned model.
// Below the pipeline a compute-scale bar shows pretraining dwarfing the others.
// A readout band shows the selected phase's data, objective, and capability.

// --- per-phase data (hard-coded; deterministic) ----------------------------
type PhaseId = "pretrain" | "sft" | "rlhf";

interface PhaseInfo {
  id: PhaseId;
  short: string; // box title
  full: string; // readout heading
  data: string; // data type
  scale: string; // data/compute scale
  objective: string; // training objective
  adds: string; // capability added
  output: string; // resulting artifact (under the box)
  computeFrac: number; // share of total training compute (0..1)
  color: string;
  fill: string;
}

const PHASES: PhaseInfo[] = [
  {
    id: "pretrain",
    short: "Pretraining",
    full: "1. Pretraining",
    data: "Web-scale raw text corpus",
    scale: "~trillions of tokens",
    objective: "Next-token prediction (self-supervised)",
    adds: "World knowledge + language",
    output: "base model",
    computeFrac: 0.97,
    color: C.blue,
    fill: C.blueFill,
  },
  {
    id: "sft",
    short: "SFT",
    full: "2. Supervised fine-tuning",
    data: "Curated (instruction, response) pairs",
    scale: "~thousands to millions of examples",
    objective: "Imitate the good responses (supervised)",
    adds: "Follows instructions / assistant format",
    output: "instruct model",
    computeFrac: 0.02,
    color: C.green,
    fill: C.greenFill,
  },
  {
    id: "rlhf",
    short: "RLHF",
    full: "3. RLHF / preference tuning",
    data: "Human preference ratings (A vs B)",
    scale: "reward model -> optimize policy (DPO: no RM)",
    objective: "Maximize preferred-response reward",
    adds: "Helpful, harmless, aligned",
    output: "aligned model",
    computeFrac: 0.01,
    color: C.violet,
    fill: "var(--card)",
  },
];

// --- geometry --------------------------------------------------------------
const VB_W = 520;
const VB_H = 420;

const MARGIN = 16;

// Pipeline band.
const BOX_Y = 56;
const BOX_H = 92;
const BOX_W = 150;
const GAP = (VB_W - 2 * MARGIN - 3 * BOX_W) / 2; // gap between boxes
const BOX_X = (i: number): number => MARGIN + i * (BOX_W + GAP);

// Compute-scale band.
const SCALE_Y = 196;
const SCALE_BAR_Y = SCALE_Y + 18;
const SCALE_BAR_H = 24;
const SCALE_X = MARGIN;
const SCALE_W = VB_W - 2 * MARGIN;

// Readout band.
const READ_Y = 268;
const READ_X = MARGIN;
const READ_W = VB_W - 2 * MARGIN;
const READ_H = 118;
const LINE = 16; // line spacing

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function TfThreePhases() {
  const [selected, setSelected] = useState<PhaseId>("pretrain");

  const active: PhaseInfo =
    PHASES.find((p) => p.id === selected) ?? PHASES[0];
  const activeIndex: number = PHASES.findIndex((p) => p.id === selected);

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Three phases of training an LLM: pretraining, SFT, and RLHF"
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
          Three Phases of Training an LLM
        </text>
        <text
          x={VB_W / 2}
          y={42}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          click a phase to inspect its data, objective, and capability
        </text>

        {/* ---- pipeline boxes + arrows ---- */}
        {PHASES.map((p, i) => {
          const x = BOX_X(i);
          const isSel = p.id === selected;
          return (
            <g key={p.id}>
              {/* arrow from previous box */}
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

              {/* phase box (clickable) */}
              <rect
                x={x}
                y={BOX_Y}
                width={BOX_W}
                height={BOX_H}
                rx={6}
                fill={isSel ? p.fill : "var(--card)"}
                stroke={isSel ? p.color : C.line}
                strokeWidth={isSel ? 2 : 1}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(p.id)}
              />
              <text
                x={x + BOX_W / 2}
                y={BOX_Y + 22}
                fontSize={12}
                fill={p.color}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
                style={{ cursor: "pointer", pointerEvents: "none" }}
              >
                {p.short}
              </text>
              <text
                x={x + BOX_W / 2}
                y={BOX_Y + 42}
                fontSize={8.5}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                style={{ pointerEvents: "none" }}
              >
                {p.id === "pretrain"
                  ? "next-token pred."
                  : p.id === "sft"
                    ? "supervised"
                    : "preference RL"}
              </text>
              <text
                x={x + BOX_W / 2}
                y={BOX_Y + 60}
                fontSize={8.5}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                style={{ pointerEvents: "none" }}
              >
                {p.id === "pretrain"
                  ? "trillions of tokens"
                  : p.id === "sft"
                    ? "(instr, response)"
                    : "human ratings"}
              </text>

              {/* output artifact pill under the box */}
              <text
                x={x + BOX_W / 2}
                y={BOX_Y + 80}
                fontSize={9}
                fill={p.color}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {`-> ${p.output}`}
              </text>
            </g>
          );
        })}

        {/* ================= COMPUTE-SCALE BAND ================= */}
        <text
          x={SCALE_X}
          y={SCALE_Y + 4}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          share of total training compute
        </text>
        <text
          x={SCALE_X + SCALE_W}
          y={SCALE_Y + 4}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          pretraining dominates
        </text>

        {/* stacked proportional bar */}
        {PHASES.map((p, i) => {
          const prior = PHASES.slice(0, i).reduce(
            (s, q) => s + q.computeFrac,
            0,
          );
          const x = SCALE_X + prior * SCALE_W;
          const w = p.computeFrac * SCALE_W;
          const isSel = p.id === selected;
          return (
            <g key={`bar-${p.id}`}>
              <rect
                x={x}
                y={SCALE_BAR_Y}
                width={w}
                height={SCALE_BAR_H}
                fill={p.fill === "var(--card)" ? C.violet : p.color}
                opacity={isSel ? 1 : 0.55}
                stroke="var(--background)"
                strokeWidth={1}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(p.id)}
              />
            </g>
          );
        })}
        {/* percentage labels: only pretraining fits inside; others below */}
        <text
          x={SCALE_X + 8}
          y={SCALE_BAR_Y + SCALE_BAR_H / 2 + 4}
          fontSize={10}
          fill="var(--background)"
          fontFamily={MONO}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          pretraining ~97%
        </text>
        <text
          x={SCALE_X + SCALE_W}
          y={SCALE_BAR_Y + SCALE_BAR_H + 14}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
          style={{ pointerEvents: "none" }}
        >
          SFT + RLHF ~3% (post-training)
        </text>

        {/* ================= READOUT BAND ================= */}
        <rect
          x={READ_X}
          y={READ_Y}
          width={READ_W}
          height={READ_H}
          rx={6}
          fill={active.fill === "var(--card)" ? "var(--card)" : active.fill}
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
          {active.full}
        </text>
        <text
          x={READ_X + READ_W - 12}
          y={READ_Y + 20}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`phase ${activeIndex + 1} of 3`}
        </text>

        {/* readout rows: label + value */}
        {(
          [
            ["data", active.data],
            ["scale", active.scale],
            ["objective", active.objective],
            ["adds", active.adds],
          ] as [string, string][]
        ).map(([label, value], i) => {
          const y = READ_Y + 42 + i * LINE;
          return (
            <g key={`row-${label}`}>
              <text
                x={READ_X + 12}
                y={y}
                fontSize={9.5}
                fill={C.muted}
                fontFamily={MONO}
              >
                {`${label}:`}
              </text>
              <text
                x={READ_X + 86}
                y={y}
                fontSize={9.5}
                fill={label === "adds" ? active.color : C.ink}
                fontFamily={MONO}
                fontWeight={label === "adds" ? 600 : 400}
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
          Pretrain for knowledge, SFT for format, RLHF for alignment.
        </text>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={btn}
            style={
              p.id === selected
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setSelected(p.id)}
          >
            {p.short}
          </button>
        ))}
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {`selected: ${active.short}`}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Each phase reuses the previous model&apos;s weights: pretraining builds
        knowledge, SFT teaches the assistant format, and RLHF aligns outputs with
        human preferences.
      </p>
    </div>
  );
}
