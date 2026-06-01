"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The four backprop equations, walked one at a time over a single network:
// input(3) -> hidden(4) -> hidden(3) -> output(2).
//
// BP1  delta^L = (a^L - y) (.) sigma'(z^L)        — seed error at output
// BP2  delta^l = ((W^{l+1})^T delta^{l+1}) (.) sigma'(z^l) — route back, one layer at a time
// BP3  dC/db^l = delta^l                          — bias gradient is the local delta
// BP4  dC/dw_{jk} = a^{l-1}_k * delta^l_j          — weight gradient = source act x dest delta

type Step = "idle" | "bp1" | "bp2a" | "bp2b" | "bp3" | "bp4";

// Layer sizes, left -> right.
const SIZES = [3, 4, 3, 2] as const;

// Column x-positions and vertical layout helpers.
const COLX = [70, 165, 260, 355];
const CY = 110;
const VGAP = 34;
const R = 13;

function ny(layer: number, i: number): number {
  const n = SIZES[layer];
  return CY + (i - (n - 1) / 2) * VGAP;
}

// Deterministic hard-coded activations and deltas (no randomness).
// One number per neuron per layer, used purely to drive fill intensity.
const ACTS: number[][] = [
  [0.9, 0.4, 0.7],
  [0.6, 0.8, 0.3, 0.5],
  [0.7, 0.5, 0.9],
  [0.8, 0.3],
];
const DELTAS: number[][] = [
  [0, 0, 0], // input layer carries no delta
  [0.35, 0.6, 0.2, 0.45],
  [0.5, 0.3, 0.7],
  [0.8, 0.45],
];

// At which step does layer `l` first show its delta?
// output(3) at bp1; hidden(2) at bp2a; hidden(1) at bp2b.
function deltaShown(step: Step, layer: number): boolean {
  const order: Record<Step, number> = {
    idle: -1,
    bp1: 0,
    bp2a: 1,
    bp2b: 2,
    bp3: 2,
    bp4: 2,
  };
  const reach = order[step];
  if (reach < 0) return false;
  if (layer === 3) return reach >= 0;
  if (layer === 2) return reach >= 1;
  if (layer === 1) return reach >= 2;
  return false;
}

const EQ: Record<Step, { eq: string; cap: string }> = {
  idle: {
    eq: "pick an equation",
    cap: "Walk the four equations across one network, one backward step at a time.",
  },
  bp1: {
    eq: "δ^(L) = (a^(L) − y) ⊙ σ'(z^(L))",
    cap: "BP1: start the error at the output.",
  },
  bp2a: {
    eq: "δ^(ℓ) = ((W^(ℓ+1))ᵀ δ^(ℓ+1)) ⊙ σ'(z^(ℓ))",
    cap: "BP2: route δ back through Wᵀ, then gate it by σ' — one layer at a time.",
  },
  bp2b: {
    eq: "δ^(ℓ) = ((W^(ℓ+1))ᵀ δ^(ℓ+1)) ⊙ σ'(z^(ℓ))",
    cap: "BP2: keep routing back through Wᵀ and gating by σ' until every hidden layer has its δ.",
  },
  bp3: {
    eq: "∂C/∂b^(ℓ) = δ^(ℓ)",
    cap: "BP3: each neuron's bias gradient is exactly its own δ.",
  },
  bp4: {
    eq: "∂C/∂w_{jk} = a^(ℓ−1)_k · δ^(ℓ)_j",
    cap: "BP4: a weight's gradient = source activation × destination δ.",
  },
};

const ORDER: Step[] = ["bp1", "bp2a", "bp2b", "bp3", "bp4"];

// Highlighted example edge for BP4: hidden-layer-2 neuron k=0 -> output neuron j=1.
const EDGE = { l: 3, j: 1, k: 0 } as const;

function lerp(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number, e: number) => Math.round(s + (e - s) * t);
  const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
  const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = ch(pa & 255, pb & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

export function FourEquationsWalk() {
  const [step, setStep] = useState<Step>("idle");
  const [outer, setOuter] = useState(false);

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);
  const showOuter = step === "bp4" && outer;

  return (
    <div>
      <svg
        viewBox="0 0 440 270"
        className="h-auto w-full"
        role="img"
        aria-label="The four equations of backpropagation on one network"
      >
        {/* connections */}
        {SIZES.slice(0, -1).map((_, l) =>
          Array.from({ length: SIZES[l] }).map((__, k) =>
            Array.from({ length: SIZES[l + 1] }).map((___, j) => {
              const hot =
                step === "bp4" && l + 1 === EDGE.l && j === EDGE.j && k === EDGE.k;
              return (
                <line
                  key={`${l}-${k}-${j}`}
                  x1={COLX[l] + R}
                  y1={ny(l, k)}
                  x2={COLX[l + 1] - R}
                  y2={ny(l + 1, j)}
                  stroke={hot ? C.green : C.line}
                  strokeWidth={hot ? 2.4 : 0.7}
                />
              );
            }),
          ),
        )}

        {/* neurons */}
        {SIZES.map((n, l) =>
          Array.from({ length: n }).map((__, i) => {
            const isOut = l === 3;
            const showD = deltaShown(step, l);
            let fill: string = "var(--card)";
            let stroke: string = C.line;
            if (showD) {
              const t = isOut
                ? 0.45 + 0.5 * DELTAS[l][i]
                : 0.25 + 0.55 * DELTAS[l][i];
              fill = lerp(C.coralFill, C.coral, t);
              stroke = C.coral;
            }
            const biasNeuron =
              step === "bp3" && ((l === 3 && i === 0) || (l === 2 && i === 1) || (l === 1 && i === 0));
            return (
              <g key={`n-${l}-${i}`}>
                <circle
                  cx={COLX[l]}
                  cy={ny(l, i)}
                  r={R}
                  fill={fill}
                  stroke={biasNeuron ? C.violet : stroke}
                  strokeWidth={biasNeuron ? 2 : 1.2}
                />
                {showD && (
                  <text
                    x={COLX[l]}
                    y={ny(l, i) + 3.5}
                    fontSize={8}
                    fill="var(--background)"
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    δ
                  </text>
                )}
                {biasNeuron && (
                  <text
                    x={COLX[l]}
                    y={ny(l, i) - R - 4}
                    fontSize={8}
                    fill={C.violet}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    ∂C/∂b=δ
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* BP4 weight-gradient annotation on the highlighted edge */}
        {step === "bp4" && (
          <g>
            <circle
              cx={(COLX[EDGE.l - 1] + COLX[EDGE.l]) / 2}
              cy={(ny(EDGE.l - 1, EDGE.k) + ny(EDGE.l, EDGE.j)) / 2}
              r={3}
              fill={C.green}
            />
            <text
              x={(COLX[EDGE.l - 1] + COLX[EDGE.l]) / 2}
              y={(ny(EDGE.l - 1, EDGE.k) + ny(EDGE.l, EDGE.j)) / 2 - 7}
              fontSize={8}
              fill={C.green}
              fontFamily={MONO}
              textAnchor="middle"
            >
              {`a=${ACTS[EDGE.l - 1][EDGE.k]}·δ=${DELTAS[EDGE.l][EDGE.j]}`}
            </text>
          </g>
        )}

        {/* layer captions */}
        {["in", "h1", "h2", "out"].map((t, l) => (
          <text
            key={`lc-${l}`}
            x={COLX[l]}
            y={205}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {t}
          </text>
        ))}

        {/* outer-product view (BP4 toggle) */}
        {showOuter && (
          <g transform="translate(312,12)">
            <text x={0} y={0} fontSize={8} fill={C.muted} fontFamily={MONO}>
              dC/dW = δ aᵀ
            </text>
            {/* aT row labels (k = source acts, h2 has 3 neurons) */}
            {ACTS[2].map((a, k) => (
              <text
                key={`ar-${k}`}
                x={28 + k * 22 + 11}
                y={16}
                fontSize={7}
                fill={C.green}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {a.toFixed(1)}
              </text>
            ))}
            {/* delta column labels (j = dest deltas, out has 2 neurons) */}
            {DELTAS[3].map((d, j) => (
              <text
                key={`dc-${j}`}
                x={20}
                y={28 + j * 22 + 7}
                fontSize={7}
                fill={C.coral}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {d.toFixed(1)}
              </text>
            ))}
            {/* matrix cells (j,k) = delta_j * a_k */}
            {DELTAS[3].map((d, j) =>
              ACTS[2].map((a, k) => {
                const v = d * a;
                return (
                  <g key={`cell-${j}-${k}`}>
                    <rect
                      x={28 + k * 22}
                      y={22 + j * 22}
                      width={20}
                      height={20}
                      fill={lerp(C.coralFill, C.coral, Math.min(1, v + 0.15))}
                      stroke={C.line}
                      strokeWidth={0.6}
                    />
                    <text
                      x={28 + k * 22 + 10}
                      y={22 + j * 22 + 13}
                      fontSize={7}
                      fill={C.ink}
                      fontFamily={MONO}
                      textAnchor="middle"
                    >
                      {v.toFixed(2)}
                    </text>
                  </g>
                );
              }),
            )}
          </g>
        )}

        {/* equation banner */}
        <text
          x={220}
          y={236}
          fontSize={12}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          {EQ[step].eq}
        </text>
        <text
          x={220}
          y={255}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {EQ[step].cap}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {([
          ["BP1", "bp1"],
          ["BP2", "bp2a"],
          ["BP3", "bp3"],
          ["BP4", "bp4"],
        ] as const).map(([label, s]) => {
          // BP2 is highlighted while either of its two sub-steps is active.
          const active = step === s || (s === "bp2a" && step === "bp2b");
          return (
            <button
              key={s}
              onClick={() => setStep(s)}
              className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
              style={
                active ? { background: C.ink, color: "var(--background)" } : undefined
              }
            >
              {label}
            </button>
          );
        })}
        <button
          onClick={next}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Next
        </button>
        <button
          onClick={() => {
            setStep("idle");
            setOuter(false);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <label className="flex items-center gap-1.5 font-mono text-[var(--muted)]">
          <input
            type="checkbox"
            checked={outer}
            disabled={step !== "bp4"}
            onChange={(e) => setOuter(e.target.checked)}
          />
          outer-product view
        </label>
      </div>
    </div>
  );
}
