"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// Image Normalization Pipeline.
// Three stages applied to an example image, left to right, with a histogram of
// pixel values for the selected channel beneath the current stage:
//   1. Raw:        values 0..255            (too big, not zero-centered)
//   2. After /255: values 0..1             (squeezed into [0,1])
//   3. (x-mean)/std per channel: centered on 0, spread ~1
// The user toggles through the stages (the histogram shifts + rescales) and
// drags the per-channel mean / std sliders to watch the centered histogram move.

// --- channel data ----------------------------------------------------------
// Hard-coded raw pixel bins per channel (0..255). Each entry is a (center,
// count) bucket. Chosen so each channel sits at a different brightness, and
// counts are deterministic (no Math.random).
type Bin = { v: number; n: number }; // v in 0..255, n = pixel count

const RAW: Record<"R" | "G" | "B", Bin[]> = {
  R: [
    { v: 150, n: 4 },
    { v: 170, n: 9 },
    { v: 190, n: 14 },
    { v: 205, n: 17 },
    { v: 218, n: 13 },
    { v: 232, n: 8 },
    { v: 246, n: 3 },
  ],
  G: [
    { v: 120, n: 5 },
    { v: 140, n: 11 },
    { v: 160, n: 16 },
    { v: 176, n: 15 },
    { v: 192, n: 10 },
    { v: 208, n: 6 },
    { v: 224, n: 2 },
  ],
  B: [
    { v: 96, n: 3 },
    { v: 116, n: 8 },
    { v: 136, n: 13 },
    { v: 152, n: 18 },
    { v: 168, n: 12 },
    { v: 186, n: 7 },
    { v: 204, n: 3 },
  ],
};

const IMAGENET_MEAN: Record<"R" | "G" | "B", number> = {
  R: 0.485,
  G: 0.456,
  B: 0.406,
};
const IMAGENET_STD: Record<"R" | "G" | "B", number> = {
  R: 0.229,
  G: 0.224,
  B: 0.225,
};

const CH_COLOR: Record<"R" | "G" | "B", string> = {
  R: C.coral,
  G: C.green,
  B: C.blue,
};
const CH_FILL: Record<"R" | "G" | "B", string> = {
  R: C.coralFill,
  G: C.greenFill,
  B: C.blueFill,
};

type Channel = "R" | "G" | "B";
type Stage = 0 | 1 | 2; // 0 raw, 1 /255, 2 normalized

const STAGE_LABEL: Record<Stage, string> = {
  0: "Raw",
  1: "After / 255",
  2: "Normalized",
};

// Value of a raw 0..255 pixel after the given stage, with the supplied
// per-channel mean/std (used at stage 2).
function transform(v255: number, stage: Stage, mean: number, std: number): number {
  if (stage === 0) return v255;
  const x = v255 / 255;
  if (stage === 1) return x;
  return (x - mean) / std;
}

// --- geometry --------------------------------------------------------------
const VB_W = 480;
const VB_H = 372;

// Histogram plot area.
const PLOT_X = 40;
const PLOT_W = 400;
const PLOT_Y = 150;
const PLOT_H = 120;
const PLOT_BOTTOM = PLOT_Y + PLOT_H; // baseline (only for stage 0/1; stage 2 uses center)

// Per-stage x-axis domain [min,max] mapped across PLOT_W.
function domain(stage: Stage): [number, number] {
  if (stage === 0) return [0, 255];
  if (stage === 1) return [0, 1];
  return [-3, 3];
}

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function VisNormalizationPipeline() {
  const [stage, setStage] = useState<Stage>(0);
  const [channel, setChannel] = useState<Channel>("R");
  const [mean, setMean] = useState<number>(IMAGENET_MEAN.R);
  const [std, setStd] = useState<number>(IMAGENET_STD.R);

  // Animated interpolation factor toward the target stage (0..1).
  const [t, setT] = useState<number>(1);
  const tRef = useRef<number>(1);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // When the stage changes, animate t from 0 -> 1.
  useEffect(() => {
    setT(0);
    tRef.current = 0;
    const id = setInterval(() => {
      const next = Math.min(1, tRef.current + 0.08);
      tRef.current = next;
      setT(next);
      if (next >= 1) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [stage]);

  function selectChannel(ch: Channel): void {
    setChannel(ch);
    setMean(IMAGENET_MEAN[ch]);
    setStd(IMAGENET_STD[ch]);
  }
  function resetMeanStd(): void {
    setMean(IMAGENET_MEAN[channel]);
    setStd(IMAGENET_STD[channel]);
  }

  const bins = RAW[channel];
  const col = CH_COLOR[channel];
  const fill = CH_FILL[channel];

  // Previous stage (for animation morph).
  const prevStage: Stage = stage === 0 ? 0 : ((stage - 1) as Stage);

  // Map a value in `dom` to an x pixel coordinate.
  function toX(value: number, dom: [number, number]): number {
    const [lo, hi] = dom;
    const f = (value - lo) / (hi - lo);
    return PLOT_X + Math.max(0, Math.min(1, f)) * PLOT_W;
  }

  const domTo = domain(stage);
  const domFrom = domain(prevStage);

  // Max count for bar-height scaling.
  let maxN = 1;
  for (const b of bins) maxN = Math.max(maxN, b.n);

  const barW = 14;

  // Readout: the transformed value of a representative pixel (the modal bin).
  let modal = bins[0];
  for (const b of bins) if (b.n > modal.n) modal = b;
  const valTo = transform(modal.v, stage, mean, std);
  const valFrom = transform(modal.v, prevStage, mean, std);
  const shownVal = valFrom + (valTo - valFrom) * t;

  // Where the "0" reference line sits (stage 2 only, in the target domain).
  const zeroX = toX(0, domTo);

  const stageNote =
    stage === 0
      ? "too big, not zero-centered"
      : stage === 1
        ? "squeezed into [0, 1]"
        : "zero-centered, unit-ish variance";

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Image normalization pipeline: scale to zero-one then center and rescale per channel"
      >
        {/* ---- title band ---- */}
        <text
          x={VB_W / 2}
          y={22}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Image Normalization Pipeline
        </text>

        {/* ---- stage step indicator (own band) ---- */}
        {([0, 1, 2] as Stage[]).map((s) => {
          const cx = PLOT_X + 60 + s * 150;
          const active = s === stage;
          const done = s < stage;
          return (
            <g key={`step-${s}`}>
              <rect
                x={cx - 56}
                y={38}
                width={112}
                height={26}
                rx={5}
                fill={active ? fill : "var(--card)"}
                stroke={active ? col : C.line}
                strokeWidth={active ? 1.8 : 1}
                opacity={active || done ? 1 : 0.55}
              />
              <text
                x={cx}
                y={55}
                fontSize={11}
                fill={active ? col : C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={active ? 600 : 400}
              >
                {STAGE_LABEL[s]}
              </text>
              {s < 2 && (
                <text
                  x={cx + 75}
                  y={55}
                  fontSize={12}
                  fill={C.muted}
                  fontFamily={MONO}
                  textAnchor="middle"
                >
                  →
                </text>
              )}
            </g>
          );
        })}

        {/* ---- formula / readout band (own clear band, below steps) ---- */}
        <text
          x={PLOT_X}
          y={88}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
        >
          {stage === 0
            ? "x  (0..255 integers)"
            : stage === 1
              ? "x / 255  →  [0, 1]"
              : "(x/255 - mean) / std   per channel"}
        </text>
        <text
          x={PLOT_X}
          y={104}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
        >
          {`channel ${channel}:  mean = ${mean.toFixed(3)}   std = ${std.toFixed(3)}`}
        </text>
        <text
          x={PLOT_X + PLOT_W}
          y={88}
          fontSize={10}
          fill={col}
          fontFamily={MONO}
          textAnchor="end"
          fontWeight={600}
        >
          {`peak px → ${shownVal.toFixed(stage === 0 ? 0 : 3)}`}
        </text>
        <text
          x={PLOT_X + PLOT_W}
          y={104}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {stageNote}
        </text>

        {/* ---- histogram plot frame ---- */}
        <rect
          x={PLOT_X}
          y={PLOT_Y}
          width={PLOT_W}
          height={PLOT_H}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* gridlines: a few ticks along the x domain */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const x = PLOT_X + f * PLOT_W;
          const dv = domTo[0] + f * (domTo[1] - domTo[0]);
          return (
            <g key={`tick-${i}`}>
              <line
                x1={x}
                y1={PLOT_Y}
                x2={x}
                y2={PLOT_BOTTOM}
                stroke={C.grid}
                strokeWidth={1}
              />
              <text
                x={x}
                y={PLOT_BOTTOM + 14}
                fontSize={9}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {stage === 0 ? dv.toFixed(0) : dv.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* zero reference line (stage 2): emphasize zero-centering */}
        {stage === 2 && (
          <g>
            <line
              x1={zeroX}
              y1={PLOT_Y}
              x2={zeroX}
              y2={PLOT_BOTTOM}
              stroke={C.ink}
              strokeWidth={1.4}
              strokeDasharray="4 3"
            />
            <text
              x={zeroX}
              y={PLOT_Y - 6}
              fontSize={9}
              fill={C.ink}
              fontFamily={MONO}
              textAnchor="middle"
              fontWeight={600}
            >
              0
            </text>
          </g>
        )}

        {/* histogram bars, morphing from prev stage to current stage */}
        {bins.map((b, i) => {
          const xFrom = toX(transform(b.v, prevStage, mean, std), domFrom);
          const xTo = toX(transform(b.v, stage, mean, std), domTo);
          const cx = xFrom + (xTo - xFrom) * t;
          const h = (b.n / maxN) * (PLOT_H - 16);
          const y = PLOT_BOTTOM - h;
          return (
            <rect
              key={`bar-${i}`}
              x={cx - barW / 2}
              y={y}
              width={barW}
              height={h}
              rx={1.5}
              fill={fill}
              stroke={col}
              strokeWidth={1}
            />
          );
        })}

        {/* x-axis label */}
        <text
          x={PLOT_X + PLOT_W / 2}
          y={PLOT_BOTTOM + 30}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          pixel value (channel {channel}) — histogram count on y
        </text>

        {/* ---- caption band (bottom, own clear band) ---- */}
        <text
          x={VB_W / 2}
          y={VB_H - 14}
          fontSize={9.5}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Scale to [0,1], then center per channel — the same at train and test.
        </text>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {([0, 1, 2] as Stage[]).map((s) => (
          <button
            key={`sbtn-${s}`}
            type="button"
            className={btn}
            style={
              stage === s
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setStage(s)}
          >
            {STAGE_LABEL[s]}
          </button>
        ))}

        <span className="font-mono text-[var(--muted)]">chan</span>
        {(["R", "G", "B"] as Channel[]).map((ch) => (
          <button
            key={`cbtn-${ch}`}
            type="button"
            className={btn}
            style={
              channel === ch
                ? { background: CH_COLOR[ch], color: "var(--background)" }
                : undefined
            }
            onClick={() => selectChannel(ch)}
          >
            {ch}
          </button>
        ))}

        <label className="flex items-center gap-1.5">
          <span className="font-mono text-[var(--muted)]">mean</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={mean}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMean(parseFloat(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{mean.toFixed(3)}</span>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="font-mono text-[var(--muted)]">std</span>
          <input
            type="range"
            min={0.05}
            max={0.5}
            step={0.001}
            value={std}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setStd(parseFloat(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{std.toFixed(3)}</span>
        </label>

        <button type="button" className={btn} onClick={resetMeanStd}>
          ImageNet defaults
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Stage 1 divides by 255 into [0,1]; stage 2 subtracts the per-channel
        mean and divides by the per-channel std, centering the histogram on 0.
      </p>
    </div>
  );
}
