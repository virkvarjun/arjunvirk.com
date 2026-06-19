"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// A fixed 4 -> 5 -> 4 -> 1 network. We illustrate signal flow with
// hard-coded, deterministic numbers, no real training is performed.
const SIZES = [4, 5, 4, 1] as const;

// Precomputed forward activations per layer (0..1). The output layer's single
// value drives the "loss" readout.
const ACT: number[][] = [
  [0.9, 0.4, 0.7, 0.2],
  [0.82, 0.55, 0.3, 0.66, 0.48],
  [0.6, 0.74, 0.35, 0.5],
  [0.71],
];

// Base error signal magnitudes per layer (before the activation-slope scaling
// applied during the backward sweep). Output starts strong; the sweep then
// propagates these leftward, attenuated by the chosen nonlinearity.
const BASE_DELTA: number[][] = [
  [1, 0.7, 0.85, 0.5],
  [0.9, 0.6, 0.75, 0.55, 0.8],
  [0.85, 1, 0.7, 0.6],
  [1],
];

const LOSS = 0.142;

// Per-layer attenuation toward the inputs. sigmoid saturates -> deltas shrink
// markedly each layer (vanishing gradient); ReLU keeps the slope near 1.
const SIG_FACTOR = 0.25;
const RELU_FACTOR = 1;

// Layout
const W = 440;
const COLS = [70, 180, 290, 390];
const TOP = 56;
const BOT = 196;
const R = 13;

function nodeY(layer: number, i: number): number {
  const n = SIZES[layer];
  if (n === 1) return (TOP + BOT) / 2;
  return TOP + ((BOT - TOP) * i) / (n - 1);
}

// Backward delta for layer L: BASE_DELTA scaled by the cumulative
// attenuation from the output (layer 3) back to layer L.
function backDelta(layer: number, i: number, factor: number): number {
  const steps = SIZES.length - 1 - layer; // layers traversed from output
  const scale = Math.pow(factor, steps);
  return BASE_DELTA[layer][i] * scale;
}

type Phase = "idle" | "forward" | "backward";

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

export function BackpropVisualizer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0); // sweep frontier (column index)
  const [relu, setRelu] = useState(false);

  // Latest frontier value held in a ref so the interval reads fresh state.
  const stepRef = useRef(0);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (phase === "idle") return;
    const id = setInterval(() => {
      const cur = stepRef.current;
      if (cur >= SIZES.length) {
        clearInterval(id);
        return;
      }
      setStep(cur + 1);
    }, 120);
    return () => clearInterval(id);
  }, [phase]);

  function runForward() {
    setPhase("forward");
    setStep(0);
  }
  function runBackward() {
    setPhase("backward");
    setStep(0);
  }
  function reset() {
    setPhase("idle");
    setStep(0);
  }

  const factor = relu ? RELU_FACTOR : SIG_FACTOR;

  // A layer is "reached" by the sweep once the frontier passes it.
  function reached(layer: number): boolean {
    if (phase === "forward") return layer < step; // left -> right
    if (phase === "backward") return SIZES.length - 1 - layer < step; // right -> left
    return false;
  }

  const showLoss = phase !== "idle" && step >= SIZES.length;

  return (
    <div>
      <svg
        viewBox="0 0 440 240"
        className="h-auto w-full"
        role="img"
        aria-label="Backpropagation visualizer"
      >
        {/* connection lines between adjacent columns */}
        {SIZES.slice(0, -1).map((n, l) =>
          Array.from({ length: n }).map((_, i) =>
            Array.from({ length: SIZES[l + 1] }).map((_, j) => (
              <line
                key={`e-${l}-${i}-${j}`}
                x1={COLS[l]}
                y1={nodeY(l, i)}
                x2={COLS[l + 1]}
                y2={nodeY(l + 1, j)}
                stroke={C.line}
                strokeWidth={0.75}
              />
            )),
          ),
        )}

        {/* nodes */}
        {SIZES.map((n, l) =>
          Array.from({ length: n }).map((_, i) => {
            const lit = reached(l);
            let fill: string = "var(--card)";
            let stroke: string = C.line;
            if (lit && phase === "forward") {
              fill = mix(C.blueFill, C.blue, ACT[l][i]);
              stroke = C.blue;
            } else if (lit && phase === "backward") {
              fill = mix(C.coralFill, C.coral, backDelta(l, i, factor));
              stroke = C.coral;
            }
            return (
              <g key={`n-${l}-${i}`}>
                <circle
                  cx={COLS[l]}
                  cy={nodeY(l, i)}
                  r={R}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.4}
                />
                {l === SIZES.length - 1 && (
                  <text
                    x={COLS[l]}
                    y={nodeY(l, i) + 3.5}
                    fontSize={9}
                    fill={C.muted}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    ŷ
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* column labels */}
        {["in", "h1", "h2", "out"].map((t, l) => (
          <text
            key={`cl-${l}`}
            x={COLS[l]}
            y={28}
            fontSize={10}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {t}
          </text>
        ))}

        {/* phase label */}
        <text
          x={20}
          y={222}
          fontSize={11}
          fill={phase === "backward" ? C.coral : C.blue}
          fontFamily={MONO}
        >
          {phase === "backward"
            ? "backward: error signal δ"
            : "forward: activations"}
        </text>

        {/* loss readout */}
        {showLoss && phase === "forward" && (
          <text
            x={W - 20}
            y={28}
            fontSize={11}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="end"
          >
            {`loss = ${LOSS.toFixed(3)}`}
          </text>
        )}

        {/* saturation note (sigmoid backward) */}
        {phase === "backward" && !relu && (
          <text
            x={W - 20}
            y={222}
            fontSize={9.5}
            fill={C.coral}
            fontFamily={MONO}
            textAnchor="end"
          >
            sigmoid saturates → δ vanishes
          </text>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={runForward}>
          Forward
        </button>
        <button type="button" className={btn} onClick={runBackward}>
          Backward
        </button>
        <button type="button" className={btn} onClick={reset}>
          Reset
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => setRelu((v) => !v)}
        >
          {relu ? "ReLU" : "sigmoid"}
        </button>
        <span className="font-mono text-[var(--muted)]">
          slope: {relu ? "ReLU (~1, δ survives)" : "sigmoid (~0.25, δ shrinks)"}
        </span>
      </div>
    </div>
  );
}

// Linear interpolation between two hex colors by t in [0,1].
function mix(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * k);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * k);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * k);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hex(h: string): [number, number, number] {
  const v = h.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}
