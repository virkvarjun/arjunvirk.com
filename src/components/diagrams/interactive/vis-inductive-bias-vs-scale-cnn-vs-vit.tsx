"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..28) | plot (56..240) + bias panel column (right) |
//   readout band (~296) | caption (~312..338)
const VW = 560;
const VH = 352;

// --- Chart geometry ---
const CH_X = 46; // plot left
const CH_Y = 56; // plot top
const CH_W = 290; // plot width
const CH_H = 184; // plot height

// --- Bias panel column (to the RIGHT of the plot, no overlap) ---
const BP_X = 362;
const BP_W = 186; // ends at 548, inside VW-12

// log10(images) axis: 1M (6) -> 300M+ (8.5).
const SIZE_MIN = 6.0; // 1M
const SIZE_MAX = 8.5; // ~300M

// Accuracy axis (percent).
const ACC_MIN = 55;
const ACC_MAX = 90;

// Crossover near JFT-300M scale (~100M images here).
const CROSSOVER = 8.0;

// CNN: strong inductive bias -> high floor, saturates early.
function cnnAcc(s: number): number {
  const t = (s - SIZE_MIN) / (SIZE_MAX - SIZE_MIN); // 0..1
  return 72 + 12 * (1 - Math.exp(-2.6 * t));
}

// ViT: weak bias -> low floor at small data, steep gains with scale.
function vitAcc(s: number): number {
  const t = (s - SIZE_MIN) / (SIZE_MAX - SIZE_MIN); // 0..1
  return 60 + 28 * t * t;
}

// Map data coords to pixels.
const px = (s: number): number =>
  CH_X + ((s - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * CH_W;
const py = (acc: number): number =>
  CH_Y + (1 - (acc - ACC_MIN) / (ACC_MAX - ACC_MIN)) * CH_H;

function curvePoints(f: (s: number) => number): string {
  const pts: string[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const s = SIZE_MIN + (i / N) * (SIZE_MAX - SIZE_MIN);
    pts.push(`${px(s).toFixed(1)},${py(f(s)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// x-axis ticks.
const X_TICKS: { s: number; label: string }[] = [
  { s: 6.0, label: "1M" },
  { s: 7.0, label: "10M" },
  { s: 8.0, label: "100M" },
  { s: 8.477, label: "300M" },
];

const Y_TICKS: number[] = [60, 70, 80, 90];

type BiasId = "locality" | "translation" | "hierarchy";

type Bias = {
  id: BiasId;
  label: string;
};

const BIASES: Bias[] = [
  { id: "locality", label: "locality" },
  { id: "translation", label: "translation inv." },
  { id: "hierarchy", label: "hierarchy" },
];

export function VisInductiveBiasVsScale() {
  // Slider holds log10(images) * 100 as an integer for clean stepping.
  const [size100, setSize100] = useState<number>(650); // 6.50 (~3M) default
  const [biases, setBiases] = useState<Record<BiasId, boolean>>({
    locality: true,
    translation: true,
    hierarchy: true,
  });

  const size = size100 / 100;
  const cnn = cnnAcc(size);
  const vit = vitAcc(size);
  const cnnAhead = cnn >= vit;
  const gap = Math.abs(cnn - vit);

  // Human-readable image count for readout.
  const imgCount = ((): string => {
    const n = Math.pow(10, size);
    if (n >= 1e8) return `${(n / 1e6).toFixed(0)}M`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    return `${(n / 1e3).toFixed(0)}K`;
  })();

  const mx = px(size);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const toggle = (id: BiasId): void =>
    setBiases((b) => ({ ...b, [id]: !b[id] }));

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Accuracy versus training-data size for CNNs and Vision Transformers on a log x-axis. The CNN's strong inductive bias wins at small data; the ViT's weak bias plus scale overtakes it past a crossover near 100M images. A data-size slider moves a marker along both curves and reports which architecture leads, and toggles show which biases the CNN bakes in while the ViT must learn them."
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
          Inductive Bias vs Scale: CNN vs ViT
        </text>

        {/* y-axis label */}
        <text
          x={CH_X - 34}
          y={CH_Y + CH_H / 2}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          transform={`rotate(-90 ${CH_X - 34} ${CH_Y + CH_H / 2})`}
        >
          accuracy (%)
        </text>

        {/* grid + y ticks */}
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line
              x1={CH_X}
              y1={py(t)}
              x2={CH_X + CH_W}
              y2={py(t)}
              stroke={C.grid}
              strokeWidth={1}
            />
            <text
              x={CH_X - 6}
              y={py(t) + 3}
              textAnchor="end"
              fontFamily={MONO}
              fontSize={8}
              fill={C.muted}
            >
              {t}
            </text>
          </g>
        ))}

        {/* chart frame */}
        <rect
          x={CH_X}
          y={CH_Y}
          width={CH_W}
          height={CH_H}
          fill="none"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* x ticks */}
        {X_TICKS.map((t) => (
          <g key={t.label}>
            <line
              x1={px(t.s)}
              y1={CH_Y + CH_H}
              x2={px(t.s)}
              y2={CH_Y + CH_H + 4}
              stroke={C.line}
              strokeWidth={1}
            />
            <text
              x={px(t.s)}
              y={CH_Y + CH_H + 15}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={8}
              fill={C.muted}
            >
              {t.label}
            </text>
          </g>
        ))}
        {/* x-axis label */}
        <text
          x={CH_X + CH_W / 2}
          y={CH_Y + CH_H + 28}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          training-data size (log scale) →
        </text>

        {/* crossover guide */}
        <line
          x1={px(CROSSOVER)}
          y1={CH_Y}
          x2={px(CROSSOVER)}
          y2={CH_Y + CH_H}
          stroke={C.muted}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <circle
          cx={px(CROSSOVER)}
          cy={py(cnnAcc(CROSSOVER))}
          r={3}
          fill="var(--card)"
          stroke={C.ink}
          strokeWidth={1.4}
        />
        <text
          x={px(CROSSOVER)}
          y={CH_Y - 4}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.ink}
        >
          crossover
        </text>

        {/* CNN curve */}
        <polyline
          points={curvePoints(cnnAcc)}
          fill="none"
          stroke={C.blue}
          strokeWidth={1.8}
        />
        {/* ViT curve */}
        <polyline
          points={curvePoints(vitAcc)}
          fill="none"
          stroke={C.coral}
          strokeWidth={1.8}
        />

        {/* curve labels near their left ends, clear of the curves */}
        <text
          x={CH_X + 5}
          y={py(cnnAcc(SIZE_MIN)) - 6}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
        >
          CNN
        </text>
        <text
          x={CH_X + 5}
          y={py(vitAcc(SIZE_MIN)) - 6}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
        >
          ViT
        </text>

        {/* region annotations (in clear corners of the plot) */}
        <text
          x={px(6.55)}
          y={py(89)}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.blue}
        >
          strong bias
        </text>
        <text
          x={px(6.55)}
          y={py(89) + 11}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.blue}
        >
          wins here
        </text>
        <text
          x={px(8.18)}
          y={py(63)}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.coral}
        >
          weak bias +
        </text>
        <text
          x={px(8.18)}
          y={py(63) + 11}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.coral}
        >
          scale wins here
        </text>

        {/* slider marker */}
        <line
          x1={mx}
          y1={CH_Y}
          x2={mx}
          y2={CH_Y + CH_H}
          stroke={C.ink}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle
          cx={mx}
          cy={py(cnn)}
          r={3.4}
          fill="var(--card)"
          stroke={C.blue}
          strokeWidth={1.7}
        />
        <circle
          cx={mx}
          cy={py(vit)}
          r={3.4}
          fill="var(--card)"
          stroke={C.coral}
          strokeWidth={1.7}
        />

        {/* ---- Bias panel column (right of plot) ---- */}
        <text
          x={BP_X}
          y={CH_Y + 4}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
        >
          inductive biases
        </text>
        {/* column headers */}
        <text
          x={BP_X + BP_W - 44}
          y={CH_Y + 19}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.blue}
        >
          CNN
        </text>
        <text
          x={BP_X + BP_W - 16}
          y={CH_Y + 19}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.coral}
        >
          ViT
        </text>
        {BIASES.map((b, i) => {
          const rowY = CH_Y + 36 + i * 20;
          const on = biases[b.id];
          return (
            <g key={b.id}>
              <text
                x={BP_X}
                y={rowY + 3}
                fontFamily={MONO}
                fontSize={8.5}
                fill={on ? C.ink : C.muted}
              >
                {b.label}
              </text>
              {/* CNN: built-in when toggled on */}
              <circle
                cx={BP_X + BP_W - 44}
                cy={rowY}
                r={4}
                fill={on ? C.blue : "var(--card)"}
                stroke={C.blue}
                strokeWidth={1.2}
              />
              {/* ViT: must learn it (never built-in) */}
              <circle
                cx={BP_X + BP_W - 16}
                cy={rowY}
                r={4}
                fill="var(--card)"
                stroke={C.coral}
                strokeWidth={1.2}
              />
            </g>
          );
        })}
        {/* legend for the dots */}
        <text
          x={BP_X}
          y={CH_Y + 36 + 3 * 20 + 4}
          fontFamily={MONO}
          fontSize={7.5}
          fill={C.muted}
        >
          filled = built in
        </text>
        <text
          x={BP_X}
          y={CH_Y + 36 + 3 * 20 + 14}
          fontFamily={MONO}
          fontSize={7.5}
          fill={C.muted}
        >
          open = must be learned
        </text>
        {/* count of biases the ViT must learn from data */}
        <text
          x={BP_X}
          y={CH_Y + 36 + 3 * 20 + 30}
          fontFamily={MONO}
          fontSize={8}
          fill={C.coral}
        >
          {`ViT must learn ${BIASES.length}/3`}
        </text>
        <text
          x={BP_X}
          y={CH_Y + 36 + 3 * 20 + 40}
          fontFamily={MONO}
          fontSize={8}
          fill={C.blue}
        >
          {`CNN bakes in ${
            (biases.locality ? 1 : 0) +
            (biases.translation ? 1 : 0) +
            (biases.hierarchy ? 1 : 0)
          }/3`}
        </text>

        {/* ---- Readout band ---- */}
        <text
          x={VW / 2}
          y={296}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={cnnAhead ? C.blue : C.coral}
        >
          {`at ${imgCount} images: ${cnnAhead ? "CNN" : "ViT"} leads by ${gap.toFixed(
            1,
          )} pts   (CNN ${cnn.toFixed(1)}%  vs  ViT ${vit.toFixed(1)}%)`}
        </text>

        {/* ---- Caption (two lines) ---- */}
        <text
          x={VW / 2}
          y={324}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Strong biases win when data is scarce; weak biases plus scale win
        </text>
        <text
          x={VW / 2}
          y={338}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          when data is abundant, the same story as language.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">data size</span>
          <input
            type="range"
            min={SIZE_MIN * 100}
            max={SIZE_MAX * 100}
            step={1}
            value={size100}
            onChange={(e) => setSize100(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{imgCount}</span>
        </label>
        {BIASES.map((b) => (
          <button
            key={b.id}
            type="button"
            className={btn}
            style={
              biases[b.id]
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => toggle(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
