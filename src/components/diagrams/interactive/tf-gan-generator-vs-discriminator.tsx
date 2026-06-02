"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// ---- Static, deterministic data (no random/date) ----

// The noise vector z fed into the generator (fixed values, no randomness).
const Z: number[] = [0.7, -0.3, 0.5, -0.8];

// Training timeline. Each entry is one stepper position, alternating the two
// adversarial phases. As training progresses the fake sample's shape (a 7-point
// polyline) approaches the real one, and D's accuracy drifts toward 0.50.
type Phase = "D" | "G";
interface Step {
  phase: Phase; // which network is being trained this step
  acc: number; // discriminator accuracy at distinguishing real vs fake
  pReal: number; // D's score on the real sample
  pFake: number; // D's score on the fake sample
  // 7 heights in [0,1] describing the fake sample's curve.
  fake: number[];
}

// The real sample's fixed curve (a smooth bump).
const REAL: number[] = [0.2, 0.55, 0.85, 1.0, 0.85, 0.55, 0.2];

// Start: fake is jagged/flat noise; D is near-perfect (0.95) and easily tells
// them apart. Over steps the fake curve morphs toward REAL and acc -> ~0.5.
const STEPS: Step[] = [
  {
    phase: "D",
    acc: 0.95,
    pReal: 0.92,
    pFake: 0.08,
    fake: [0.6, 0.15, 0.8, 0.3, 0.7, 0.2, 0.55],
  },
  {
    phase: "G",
    acc: 0.88,
    pReal: 0.9,
    pFake: 0.18,
    fake: [0.4, 0.3, 0.7, 0.55, 0.7, 0.35, 0.4],
  },
  {
    phase: "D",
    acc: 0.8,
    pReal: 0.86,
    pFake: 0.27,
    fake: [0.32, 0.42, 0.72, 0.78, 0.72, 0.42, 0.32],
  },
  {
    phase: "G",
    acc: 0.7,
    pReal: 0.78,
    pFake: 0.38,
    fake: [0.26, 0.5, 0.8, 0.9, 0.8, 0.5, 0.26],
  },
  {
    phase: "D",
    acc: 0.61,
    pReal: 0.68,
    pFake: 0.45,
    fake: [0.22, 0.53, 0.83, 0.96, 0.83, 0.53, 0.22],
  },
  {
    phase: "G",
    acc: 0.53,
    pReal: 0.55,
    pFake: 0.49,
    fake: [0.2, 0.55, 0.85, 0.99, 0.85, 0.55, 0.2],
  },
];

// ---- Geometry ----
const W = 560;
const H = 430;

// Noise box (top-left).
const Z_X = 28;
const Z_Y = 96;
const Z_W = 96;
const Z_H = 52;

// Generator box.
const G_X = 168;
const G_Y = 92;
const G_W = 78;
const G_H = 60;

// Fake-sample panel (after G).
const FK_X = 296;
const FK_Y = 84;
const SAMP_W = 96;
const SAMP_H = 76;

// Real-sample panel (lower-left stream).
const RL_X = 168;
const RL_Y = 236;

// Discriminator box (right).
const D_X = 452;
const D_Y = 150;
const D_W = 80;
const D_H = 72;

// Accuracy meter band (bottom drawing region).
const MET_X = 296;
const MET_Y = 300;
const MET_W = 236;
const MET_H = 16;

// Map a sample curve (7 heights in [0,1]) to an SVG polyline string.
function curve(heights: number[], x: number, y: number): string {
  const n = heights.length;
  const innerW = SAMP_W - 16;
  const innerH = SAMP_H - 18;
  return heights
    .map((h: number, i: number) => {
      const px = x + 8 + (i / (n - 1)) * innerW;
      const py = y + 10 + (1 - h) * innerH;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}

export function TfGan() {
  const [step, setStep] = useState<number>(0);

  const s: Step = STEPS[step];
  const isLast: boolean = step === STEPS.length - 1;
  const accX: number = MET_X + s.acc * MET_W; // meter fill end
  const targetX: number = MET_X + 0.5 * MET_W; // 0.5 coin-flip target

  const trainingG: boolean = s.phase === "G";
  const trainingD: boolean = s.phase === "D";

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="GAN: a generator turns noise into a fake sample while a discriminator scores real versus fake; the two train in alternating phases until accuracy drifts to a coin flip"
      >
        {/* ---- Title band ---- */}
        <text
          x={W / 2}
          y={24}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          GAN: Generator vs Discriminator
        </text>
        <text
          x={W / 2}
          y={42}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          {`step ${step + 1}/${STEPS.length} — ${
            trainingG ? "Phase 2: freeze D, train G" : "Phase 1: freeze G, train D"
          }`}
        </text>

        {/* ============ noise z ============ */}
        <rect
          x={Z_X}
          y={Z_Y}
          width={Z_W}
          height={Z_H}
          rx={5}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <text
          x={Z_X + Z_W / 2}
          y={Z_Y + 16}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          noise z
        </text>
        <text
          x={Z_X + Z_W / 2}
          y={Z_Y + 36}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
        >
          {`[${Z.map((v: number) => v.toFixed(1)).join(" ")}]`}
        </text>

        {/* z -> G arrow */}
        <line
          x1={Z_X + Z_W}
          y1={Z_Y + Z_H / 2}
          x2={G_X - 8}
          y2={G_Y + G_H / 2}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <polygon
          points={`${G_X - 8},${G_Y + G_H / 2} ${G_X - 15},${G_Y + G_H / 2 - 4} ${G_X - 15},${G_Y + G_H / 2 + 4}`}
          fill={C.blue}
        />

        {/* ============ Generator G ============ */}
        <rect
          x={G_X}
          y={G_Y}
          width={G_W}
          height={G_H}
          rx={6}
          fill={trainingG ? C.greenFill : "var(--card)"}
          stroke={C.green}
          strokeWidth={trainingG ? 2.4 : 1.4}
        />
        <text
          x={G_X + G_W / 2}
          y={G_Y + 26}
          fontFamily={MONO}
          fontSize={12}
          fill={C.ink}
          textAnchor="middle"
          fontWeight={600}
        >
          G
        </text>
        <text
          x={G_X + G_W / 2}
          y={G_Y + 44}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          generator
        </text>

        {/* G -> fake arrow */}
        <line
          x1={G_X + G_W}
          y1={G_Y + G_H / 2}
          x2={FK_X - 8}
          y2={FK_Y + SAMP_H / 2}
          stroke={C.green}
          strokeWidth={1.4}
        />
        <polygon
          points={`${FK_X - 8},${FK_Y + SAMP_H / 2} ${FK_X - 15},${FK_Y + SAMP_H / 2 - 4} ${FK_X - 15},${FK_Y + SAMP_H / 2 + 4}`}
          fill={C.green}
        />

        {/* ============ fake sample panel ============ */}
        <text
          x={FK_X + SAMP_W / 2}
          y={FK_Y - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.coral}
          textAnchor="middle"
        >
          fake sample
        </text>
        <rect
          x={FK_X}
          y={FK_Y}
          width={SAMP_W}
          height={SAMP_H}
          rx={4}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.2}
        />
        <polyline
          points={curve(s.fake, FK_X, FK_Y)}
          fill="none"
          stroke={C.coral}
          strokeWidth={1.8}
        />

        {/* ============ real sample stream ============ */}
        <text
          x={RL_X + SAMP_W / 2}
          y={RL_Y - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.blue}
          textAnchor="middle"
        >
          real sample
        </text>
        <rect
          x={RL_X}
          y={RL_Y}
          width={SAMP_W}
          height={SAMP_H}
          rx={4}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.2}
        />
        <polyline
          points={curve(REAL, RL_X, RL_Y)}
          fill="none"
          stroke={C.blue}
          strokeWidth={1.8}
        />
        <text
          x={RL_X + SAMP_W / 2}
          y={RL_Y + SAMP_H + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          from dataset
        </text>

        {/* fake -> D arrow */}
        <line
          x1={FK_X + SAMP_W}
          y1={FK_Y + SAMP_H / 2 + 6}
          x2={D_X - 8}
          y2={D_Y + 22}
          stroke={C.coral}
          strokeWidth={1.4}
        />
        <polygon
          points={`${D_X - 8},${D_Y + 22} ${D_X - 15},${D_Y + 18} ${D_X - 15},${D_Y + 26}`}
          fill={C.coral}
        />

        {/* real -> D arrow */}
        <line
          x1={RL_X + SAMP_W}
          y1={RL_Y + SAMP_H / 2 - 6}
          x2={D_X - 8}
          y2={D_Y + D_H - 22}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <polygon
          points={`${D_X - 8},${D_Y + D_H - 22} ${D_X - 15},${D_Y + D_H - 26} ${D_X - 15},${D_Y + D_H - 18}`}
          fill={C.blue}
        />

        {/* ============ Discriminator D ============ */}
        <rect
          x={D_X}
          y={D_Y}
          width={D_W}
          height={D_H}
          rx={6}
          fill={trainingD ? C.coralFill : "var(--card)"}
          stroke={C.coral}
          strokeWidth={trainingD ? 2.4 : 1.4}
        />
        <text
          x={D_X + D_W / 2}
          y={D_Y + 24}
          fontFamily={MONO}
          fontSize={12}
          fill={C.ink}
          textAnchor="middle"
          fontWeight={600}
        >
          D
        </text>
        <text
          x={D_X + D_W / 2}
          y={D_Y + 40}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          detective
        </text>
        <text
          x={D_X + D_W / 2}
          y={D_Y + 58}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          P(real)
        </text>

        {/* ============ D's two scores (readout, right band) ============ */}
        <text
          x={D_X + D_W / 2}
          y={D_Y - 28}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
          textAnchor="middle"
        >
          {`real: ${s.pReal.toFixed(2)}`}
        </text>
        <text
          x={D_X + D_W / 2}
          y={D_Y - 14}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
          textAnchor="middle"
        >
          {`fake: ${s.pFake.toFixed(2)}`}
        </text>

        {/* ============ feedback arrows ============ */}
        {/* D -> G : G's only teacher (dashed) */}
        <path
          d={`M ${D_X + 4} ${D_Y + D_H + 4} C ${D_X - 60} ${360}, ${G_X + 20} ${360}, ${G_X + G_W / 2} ${G_Y + G_H + 6}`}
          fill="none"
          stroke={C.green}
          strokeWidth={1.4}
          strokeDasharray="4 3"
        />
        <polygon
          points={`${G_X + G_W / 2},${G_Y + G_H + 6} ${G_X + G_W / 2 - 4},${G_Y + G_H + 13} ${G_X + G_W / 2 + 4},${G_Y + G_H + 13}`}
          fill={C.green}
        />
        <text
          x={(G_X + D_X) / 2}
          y={372}
          fontFamily={MONO}
          fontSize={9}
          fill={C.green}
          textAnchor="middle"
        >
          gradient back to G — D is G&apos;s only teacher
        </text>

        {/* real/fake labels -> D (short upward tick) */}
        <line
          x1={D_X + D_W / 2}
          y1={D_Y + D_H + 4}
          x2={D_X + D_W / 2}
          y2={D_Y + D_H + 16}
          stroke={C.coral}
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />
        <text
          x={D_X + D_W / 2}
          y={D_Y + D_H + 28}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.coral}
          textAnchor="middle"
        >
          true labels
        </text>

        {/* ============ accuracy meter (own band, bottom) ============ */}
        <text
          x={MET_X}
          y={MET_Y - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="start"
        >
          {`D accuracy: ${s.acc.toFixed(2)}`}
        </text>
        <rect
          x={MET_X}
          y={MET_Y}
          width={MET_W}
          height={MET_H}
          rx={3}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <rect
          x={MET_X}
          y={MET_Y}
          width={Math.max(0, accX - MET_X)}
          height={MET_H}
          rx={3}
          fill={isLast ? C.greenFill : C.coralFill}
        />
        {/* 0.5 coin-flip target line */}
        <line
          x1={targetX}
          y1={MET_Y - 4}
          x2={targetX}
          y2={MET_Y + MET_H + 4}
          stroke={C.violet}
          strokeWidth={1.4}
          strokeDasharray="3 2"
        />
        <text
          x={targetX}
          y={MET_Y + MET_H + 16}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.violet}
          textAnchor="middle"
        >
          0.5 target
        </text>

        {/* ============ caption band (very bottom) ============ */}
        <text
          x={W / 2}
          y={H - 12}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Two networks in an arms race; the goal is a stalemate where the detective can only guess.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setStep((p: number) => Math.min(STEPS.length - 1, p + 1))}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={trainingG ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          train step
        </button>
        <button
          type="button"
          onClick={() => setStep(0)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {`acc ${s.acc.toFixed(2)} · ${trainingG ? "training G" : "training D"}`}
        </span>
        <span className="font-mono text-[var(--muted)]">
          {isLast ? "stalemate: D is guessing" : "keep stepping toward 0.5"}
        </span>
      </div>
    </div>
  );
}
