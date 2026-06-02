"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..30) | chart + findings panel (44..258) |
//   RL highlight box (270..318) | caption (332..360)
const VW = 540;
const VH = 372;

// --- Loss-vs-LR chart geometry (left side) ---
const CH_X = 40; // chart left
const CH_Y = 60; // chart top
const CH_W = 220; // chart width
const CH_H = 150; // chart height

// log10(LR) axis runs from -5 to -2. Slider picks a log-LR value.
const LR_MIN = -5;
const LR_MAX = -2;

// U-shaped loss curves: loss = base + k*(logLR - opt)^2, clipped.
// FullFT optimum near 1e-4 (log -4); LoRA optimum ~10x higher (log -3, i.e. ~9.8x).
const FULLFT_OPT = -4.0;
const LORA_OPT = -3.0; // 10^(-3) / 10^(-4) = 10x  (fit: 9.8x)
const FULLFT_BASE = 1.0;
const LORA_BASE = 1.04; // LoRA settles a touch higher but matches closely
const CURVE_K = 1.35;

function lossAt(logLR: number, opt: number, base: number): number {
  const d = logLR - opt;
  return base + CURVE_K * d * d;
}

// Map a (logLR, loss) point into chart pixel space.
const LOSS_MIN = 0.5;
const LOSS_MAX = 4.0;
const px = (logLR: number): number =>
  CH_X + ((logLR - LR_MIN) / (LR_MAX - LR_MIN)) * CH_W;
const py = (loss: number): number =>
  CH_Y + ((loss - LOSS_MIN) / (LOSS_MAX - LOSS_MIN)) * CH_H;

// Sample a smooth polyline for a curve.
function curvePoints(opt: number, base: number): string {
  const pts: string[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const lr = LR_MIN + (i / N) * (LR_MAX - LR_MIN);
    let loss = lossAt(lr, opt, base);
    if (loss > LOSS_MAX) loss = LOSS_MAX;
    pts.push(`${px(lr).toFixed(1)},${py(loss).toFixed(1)}`);
  }
  return pts.join(" ");
}

type FindingId = "layers" | "lr10x" | "rankindep" | "hparams" | "batch";

type Finding = {
  id: FindingId;
  label: string;
  detail: string[];
};

const FINDINGS: Finding[] = [
  {
    id: "layers",
    label: "1. Apply to ALL layers",
    detail: ["attn-only r256 = 0.25B", "MLP-only r128 = 0.24B", "MLP/MoE coverage wins"],
  },
  {
    id: "lr10x",
    label: "2. Optimal LR ~ 10x FullFT",
    detail: ["fit: 9.8x offset", "~15x for very short runs", "see U-curves at left"],
  },
  {
    id: "rankindep",
    label: "3. LR ~independent of rank",
    detail: ["1/r scaling of update", "opt LR holds across r", "tune once, reuse"],
  },
  {
    id: "hparams",
    label: "4. Only 2 hyperparameters",
    detail: ["learning rate", "rank r", "fewer knobs than FullFT"],
  },
  {
    id: "batch",
    label: "5. Stay above info content",
    detail: ["low rank 'falls off'", "once capacity runs out", "caution: big batches hurt"],
  },
];

// Findings panel geometry (right side).
const FP_X = 286;
const FP_Y = 56;
const FP_W = 232;
const ROW_H = 18; // collapsed row height
const DET_H = 14; // per-detail-line height when expanded

export function TfLoraWithoutRegret() {
  // Slider holds log10(LR) * 10 as an integer for clean stepping.
  const [logLR10, setLogLR10] = useState<number>(-30); // -3.0 default
  const [open, setOpen] = useState<FindingId | null>("lr10x");

  const logLR = logLR10 / 10;

  const fullftLoss = lossAt(logLR, FULLFT_OPT, FULLFT_BASE);
  const loraLoss = lossAt(logLR, LORA_OPT, LORA_BASE);
  const loraBetter = loraLoss <= fullftLoss;

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  // Compute vertical layout of the findings list with one expandable detail.
  let cursor = FP_Y;
  const rows = FINDINGS.map((f) => {
    const top = cursor;
    const expanded = open === f.id;
    const h = ROW_H + (expanded ? f.detail.length * DET_H + 4 : 0);
    cursor += h + 4;
    return { f, top, expanded, h };
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="LoRA matches full fine-tuning when applied to all layers and given enough capacity. A learning-rate slider traces U-shaped loss curves whose optima differ by about 10x between LoRA and full fine-tuning, and clickable findings expand the supporting numbers."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={20}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          LoRA Without Regret: When LoRA Matches Full Fine-Tuning
        </text>

        {/* ---- Left: Loss vs learning-rate chart ---- */}
        <text
          x={CH_X}
          y={CH_Y - 12}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          loss vs learning rate
        </text>

        {/* chart frame */}
        <rect
          x={CH_X}
          y={CH_Y}
          width={CH_W}
          height={CH_H}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* y-axis label */}
        <text
          x={CH_X - 8}
          y={CH_Y + CH_H / 2}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          transform={`rotate(-90 ${CH_X - 8} ${CH_Y + CH_H / 2})`}
        >
          loss ↑
        </text>
        {/* x-axis label */}
        <text
          x={CH_X + CH_W / 2}
          y={CH_Y + CH_H + 16}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          log10(learning rate) →
        </text>
        {/* x ticks */}
        {[-5, -4, -3, -2].map((t) => (
          <text
            key={t}
            x={px(t)}
            y={CH_Y + CH_H + 28}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={8}
            fill={C.muted}
          >
            1e{t}
          </text>
        ))}

        {/* FullFT curve */}
        <polyline
          points={curvePoints(FULLFT_OPT, FULLFT_BASE)}
          fill="none"
          stroke={C.blue}
          strokeWidth={1.8}
        />
        {/* LoRA curve */}
        <polyline
          points={curvePoints(LORA_OPT, LORA_BASE)}
          fill="none"
          stroke={C.coral}
          strokeWidth={1.8}
        />

        {/* optima markers */}
        <circle cx={px(FULLFT_OPT)} cy={py(FULLFT_BASE)} r={3} fill={C.blue} />
        <circle cx={px(LORA_OPT)} cy={py(LORA_BASE)} r={3} fill={C.coral} />

        {/* 10x offset bracket between the two optima */}
        <line
          x1={px(FULLFT_OPT)}
          y1={py(FULLFT_BASE) - 12}
          x2={px(LORA_OPT)}
          y2={py(FULLFT_BASE) - 12}
          stroke={C.muted}
          strokeWidth={1}
        />
        <text
          x={(px(FULLFT_OPT) + px(LORA_OPT)) / 2}
          y={py(FULLFT_BASE) - 16}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
        >
          ~10x
        </text>

        {/* slider position line */}
        <line
          x1={px(logLR)}
          y1={CH_Y}
          x2={px(logLR)}
          y2={CH_Y + CH_H}
          stroke={C.ink}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {/* points on each curve at current LR */}
        <circle
          cx={px(logLR)}
          cy={py(Math.min(fullftLoss, LOSS_MAX))}
          r={3.2}
          fill="var(--card)"
          stroke={C.blue}
          strokeWidth={1.6}
        />
        <circle
          cx={px(logLR)}
          cy={py(Math.min(loraLoss, LOSS_MAX))}
          r={3.2}
          fill="var(--card)"
          stroke={C.coral}
          strokeWidth={1.6}
        />

        {/* legend */}
        <rect x={CH_X} y={CH_Y + CH_H + 34} width={10} height={3} fill={C.blue} />
        <text
          x={CH_X + 14}
          y={CH_Y + CH_H + 38}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          FullFT
        </text>
        <rect x={CH_X + 70} y={CH_Y + CH_H + 34} width={10} height={3} fill={C.coral} />
        <text
          x={CH_X + 84}
          y={CH_Y + CH_H + 38}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          LoRA
        </text>
        {/* live readout of losses */}
        <text
          x={CH_X}
          y={CH_Y + CH_H + 54}
          fontFamily={MONO}
          fontSize={9}
          fill={loraBetter ? C.green : C.coral}
        >
          {loraBetter
            ? "LoRA matches / leads here"
            : "FullFT leads at this LR"}
        </text>

        {/* ---- Right: clickable findings ---- */}
        <text
          x={FP_X}
          y={FP_Y - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          Findings (click to expand)
        </text>
        {rows.map(({ f, top, expanded, h }) => (
          <g key={f.id} onClick={() => setOpen(expanded ? null : f.id)} style={{ cursor: "pointer" }}>
            <rect
              x={FP_X}
              y={top}
              width={FP_W}
              height={h}
              rx={4}
              fill={expanded ? C.blueFill : "var(--card)"}
              stroke={expanded ? C.blue : C.line}
              strokeWidth={1}
            />
            <text
              x={FP_X + 8}
              y={top + 13}
              fontFamily={MONO}
              fontSize={10}
              fill={C.ink}
            >
              {f.label}
            </text>
            <text
              x={FP_X + FP_W - 8}
              y={top + 13}
              textAnchor="end"
              fontFamily={MONO}
              fontSize={10}
              fill={C.muted}
            >
              {expanded ? "−" : "+"}
            </text>
            {expanded &&
              f.detail.map((d, i) => (
                <text
                  key={i}
                  x={FP_X + 14}
                  y={top + ROW_H + 10 + i * DET_H}
                  fontFamily={MONO}
                  fontSize={9}
                  fill={C.muted}
                >
                  • {d}
                </text>
              ))}
          </g>
        ))}

        {/* ---- RL highlight box ---- */}
        <rect
          x={40}
          y={284}
          width={VW - 80}
          height={46}
          rx={5}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1.2}
        />
        <text
          x={52}
          y={301}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          RL: rank-1 LoRA matches FullFT
        </text>
        <text
          x={52}
          y={316}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          ~O(1) bits/episode — ~1000x less info than SFT
        </text>
        <text
          x={52}
          y={327}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          320,000 bits needed vs 3M params available
        </text>

        {/* ---- Caption ---- */}
        <text
          x={VW / 2}
          y={348}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          LoRA matches full fine-tuning if you cover all layers and keep
        </text>
        <text
          x={VW / 2}
          y={362}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          enough capacity — and for RL, rank 1 is plenty.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">learning rate</span>
          <input
            type="range"
            min={LR_MIN * 10}
            max={LR_MAX * 10}
            step={1}
            value={logLR10}
            onChange={(e) => setLogLR10(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">1e{logLR.toFixed(1)}</span>
        </label>
        <button
          type="button"
          className={btn}
          onClick={() => setLogLR10(Math.round(FULLFT_OPT * 10))}
        >
          FullFT optimum
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => setLogLR10(Math.round(LORA_OPT * 10))}
        >
          LoRA optimum
        </button>
      </div>
    </div>
  );
}
