"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title            (0..26)
//   panel tabs       (38..70)
//   illustration     (78..250)
//   "what it fixed"  (262..312)
//   gradient stack   (322..452)
//   caption          (462..496)
const VW = 560;
const VH = 500;

type IdeaId = "relu" | "bn" | "res";

const IDEAS: {
  id: IdeaId;
  label: string;
  year: string;
  accent: string;
  fill: string;
  fixed: string[]; // one-line "what it fixed", split to fit
}[] = [
  {
    id: "relu",
    label: "ReLU",
    year: "2012",
    accent: C.blue,
    fill: C.blueFill,
    fixed: [
      "Fixed: sigmoids saturate and kill the gradient. ReLU's slope",
      "is a flat 1 for x>0, so signal flows back through deep nets.",
    ],
  },
  {
    id: "bn",
    label: "BatchNorm",
    year: "2015",
    accent: C.green,
    fill: C.greenFill,
    fixed: [
      "Fixed: activations drift and explode between layers. BatchNorm",
      "re-centers each batch to zero mean, unit variance every step.",
    ],
  },
  {
    id: "res",
    label: "Residual",
    year: "2015",
    accent: C.coral,
    fill: C.coralFill,
    fixed: [
      "Fixed: gradients fade across many layers. A +x skip path lets",
      "them flow straight through - the same trick transformers use.",
    ],
  },
];

// Geometry.
const TAB_Y = 44;
const TAB_H = 26;
const TAB_W = 132;
const TAB_GAP = 14;
const TAB_X0 = 16;

const ILL_X = 16;
const ILL_Y = 78;
const ILL_W = VW - 32;
const ILL_H = 172;

const FIX_X = 16;
const FIX_Y = 262;
const FIX_W = VW - 32;
const FIX_H = 50;

const STK_Y = 322;
const STK_H = 130;

// A deep stack of layers for the gradient-flow animation. Index 0 = output
// (loss), last = input. Gradient strength decays as it travels back (right).
const N_LAYERS = 9;

export function VisThreeCnnIdeas() {
  const [idea, setIdea] = useState<IdeaId>("relu");
  const [flow, setFlow] = useState<boolean>(false);
  // Animation frame counter (only advances while `flow` is on).
  const [frame, setFrame] = useState<number>(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!flow) return;
    const t = window.setInterval(() => {
      frameRef.current = (frameRef.current + 1) % 1000;
      setFrame(frameRef.current);
    }, 90);
    return () => window.clearInterval(t);
  }, [flow]);

  const active = IDEAS.find((d) => d.id === idea) ?? IDEAS[0];

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  // ----- gradient stack geometry -----
  const stkX0 = 28;
  const stkX1 = VW - 28;
  const stkSpan = stkX1 - stkX0;
  const cellGap = stkSpan / N_LAYERS;
  const cellW = cellGap - 8;
  const stkBoxY = STK_Y + 30;
  const stkBoxH = 40;
  const layerX = (i: number): number => stkX0 + i * cellGap + (cellGap - cellW) / 2;

  // Pulse position travels from output (i=0, left) to input (right).
  const pulse = flow ? (frame % (N_LAYERS + 3)) : -1;

  // Gradient magnitude at layer i. Without tricks it vanishes geometrically;
  // with tricks it stays healthy. (Deterministic, hard-coded falloff.)
  const gradWith = (i: number): number => Math.max(0.35, 1 - i * 0.05);
  const gradWithout = (i: number): number => Math.pow(0.55, i);

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="The three ideas that made deep CNNs trainable: ReLU activations, BatchNorm, and residual skip connections. Select a panel to see an illustration and what it fixed; toggle gradient flow to watch backprop survive through a deep stack with the tricks and die without them."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          The Three Ideas That Made CNNs Dominate
        </text>

        {/* Panel tabs */}
        {IDEAS.map((d, i) => {
          const x = TAB_X0 + i * (TAB_W + TAB_GAP);
          const on = d.id === idea;
          return (
            <g
              key={d.id}
              onClick={() => setIdea(d.id)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x}
                y={TAB_Y}
                width={TAB_W}
                height={TAB_H}
                rx={5}
                fill={on ? d.fill : "var(--card)"}
                stroke={on ? d.accent : C.line}
                strokeWidth={on ? 1.4 : 1}
              />
              <text
                x={x + 12}
                y={TAB_Y + TAB_H / 2 + 3.5}
                fontFamily={MONO}
                fontSize={11}
                fill={on ? d.accent : C.ink}
              >
                {d.label}
              </text>
              <text
                x={x + TAB_W - 10}
                y={TAB_Y + TAB_H / 2 + 3.5}
                textAnchor="end"
                fontFamily={MONO}
                fontSize={9}
                fill={C.muted}
              >
                {d.year}
              </text>
            </g>
          );
        })}

        {/* Illustration frame */}
        <rect
          x={ILL_X}
          y={ILL_Y}
          width={ILL_W}
          height={ILL_H}
          rx={7}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {idea === "relu" && <ReluPanel />}
        {idea === "bn" && <BatchNormPanel />}
        {idea === "res" && <ResidualPanel />}

        {/* "What it fixed" band */}
        <rect
          x={FIX_X}
          y={FIX_Y}
          width={FIX_W}
          height={FIX_H}
          rx={6}
          fill={active.fill}
          stroke={active.accent}
          strokeWidth={1}
          opacity={0.85}
        />
        <text
          x={FIX_X + 12}
          y={FIX_Y + 20}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          {active.fixed[0]}
        </text>
        <text
          x={FIX_X + 12}
          y={FIX_Y + 38}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          {active.fixed[1]}
        </text>

        {/* Gradient-flow stack header */}
        <text
          x={28}
          y={STK_Y + 12}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          Backprop through a deep stack (gradient travels right ←)
        </text>
        <text
          x={VW - 28}
          y={STK_Y + 12}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={9}
          fill={flow ? active.accent : C.muted}
        >
          {flow ? "with the tricks" : "without the tricks"}
        </text>

        {/* Layer cells */}
        {Array.from({ length: N_LAYERS }, (_, i) => {
          const x = layerX(i);
          const g = flow ? gradWith(i) : gradWithout(i);
          const lit = flow && pulse >= i;
          const barCol = flow ? active.accent : C.coral;
          const barH = Math.max(2, g * (stkBoxH - 8));
          return (
            <g key={`L${i}`}>
              <rect
                x={x}
                y={stkBoxY}
                width={cellW}
                height={stkBoxH}
                rx={3}
                fill={lit ? active.fill : "var(--card)"}
                stroke={lit ? active.accent : C.line}
                strokeWidth={lit ? 1.3 : 1}
              />
              {/* gradient-magnitude bar inside the cell */}
              <rect
                x={x + 3}
                y={stkBoxY + stkBoxH - 4 - barH}
                width={cellW - 6}
                height={barH}
                rx={1.5}
                fill={barCol}
                opacity={0.55}
              />
            </g>
          );
        })}

        {/* connector arrows between cells (point right = backward) */}
        {Array.from({ length: N_LAYERS - 1 }, (_, i) => {
          const x1 = layerX(i) + cellW;
          const x2 = layerX(i + 1);
          const yc = stkBoxY + stkBoxH / 2;
          const reached = flow && pulse > i;
          const col = !flow && i >= 3 ? C.line : reached ? active.accent : C.muted;
          return (
            <g key={`A${i}`} stroke={col} fill={col}>
              <line x1={x1} y1={yc} x2={x2 - 4} y2={yc} strokeWidth={1.2} />
              <path
                d={`M ${x2 - 4} ${yc} l -4 -2.5 l 0 5 z`}
                stroke="none"
              />
            </g>
          );
        })}

        {/* end labels under the stack */}
        <text
          x={layerX(0) + cellW / 2}
          y={stkBoxY + stkBoxH + 14}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
        >
          loss
        </text>
        <text
          x={layerX(N_LAYERS - 1) + cellW / 2}
          y={stkBoxY + stkBoxH + 14}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8.5}
          fill={!flow ? C.coral : C.muted}
        >
          input
        </text>
        {!flow && (
          <text
            x={VW / 2}
            y={stkBoxY + stkBoxH + 14}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={8.5}
            fill={C.coral}
          >
            gradient fades to ~0 before reaching the input
          </text>
        )}

        {/* Caption band */}
        <text
          x={VW / 2}
          y={VH - 20}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          ReLU keeps gradients alive, BatchNorm steadies training, residuals
        </text>
        <text
          x={VW / 2}
          y={VH - 7}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          carry gradients through depth - the last is the transformer trick.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {IDEAS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={btn}
            style={
              idea === d.id
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setIdea(d.id)}
          >
            {d.label}
          </button>
        ))}
        <button
          type="button"
          className={btn}
          style={
            flow ? { background: C.ink, color: "var(--background)" } : undefined
          }
          onClick={() => setFlow((s) => !s)}
        >
          Gradient flow: {flow ? "with tricks" : "without"}
        </button>
      </div>
    </div>
  );
}

// ---------- Illustration panels ----------
// Each draws inside the frame rect (ILL_X..ILL_X+ILL_W, ILL_Y..ILL_Y+ILL_H)
// with >=12px inner margin.

function ReluPanel() {
  // Two mini-plots side by side: ReLU (left) vs sigmoid (right), each with a
  // gradient-flow arrow callout.
  const pad = 16;
  const colW = (ILL_W - pad * 3) / 2;
  const plotH = 78;
  const topY = ILL_Y + 30;

  const leftX = ILL_X + pad;
  const rightX = ILL_X + pad * 2 + colW;

  // map a function over [-3,3] x [0..1] into a plot box
  const curve = (
    bx: number,
    f: (x: number) => number,
  ): string => {
    const pts: string[] = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const x = -3 + (6 * i) / n;
      const px = bx + ((x + 3) / 6) * colW;
      const yv = Math.max(0, Math.min(1, f(x)));
      const py = topY + plotH - yv * (plotH - 6) - 3;
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return pts.join(" ");
  };

  const relu = (x: number): number => Math.max(0, x) / 3;
  const sig = (x: number): number => 1 / (1 + Math.exp(-x));

  return (
    <g>
      {/* axes + ReLU */}
      <line x1={leftX} y1={topY + plotH} x2={leftX + colW} y2={topY + plotH} stroke={C.grid} strokeWidth={1} />
      <line x1={leftX + colW / 2} y1={topY} x2={leftX + colW / 2} y2={topY + plotH} stroke={C.grid} strokeWidth={1} />
      <polyline points={curve(leftX, relu)} fill="none" stroke={C.blue} strokeWidth={2} />
      <text x={leftX + colW / 2} y={topY - 8} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={C.blue}>
        ReLU  max(0, x)
      </text>
      <text x={leftX + colW / 2} y={topY + plotH + 16} textAnchor="middle" fontFamily={MONO} fontSize={8.5} fill={C.green}>
        slope = 1, gradient passes
      </text>

      {/* axes + sigmoid */}
      <line x1={rightX} y1={topY + plotH} x2={rightX + colW} y2={topY + plotH} stroke={C.grid} strokeWidth={1} />
      <line x1={rightX + colW / 2} y1={topY} x2={rightX + colW / 2} y2={topY + plotH} stroke={C.grid} strokeWidth={1} />
      <polyline points={curve(rightX, sig)} fill="none" stroke={C.coral} strokeWidth={2} />
      <text x={rightX + colW / 2} y={topY - 8} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={C.coral}>
        sigmoid (saturates)
      </text>
      <text x={rightX + colW / 2} y={topY + plotH + 16} textAnchor="middle" fontFamily={MONO} fontSize={8.5} fill={C.coral}>
        flat tails, gradient ~ 0
      </text>

      {/* gradient-vanishing markers on sigmoid tails */}
      <circle cx={rightX + 8} cy={topY + plotH - 4} r={2.4} fill={C.coral} />
      <circle cx={rightX + colW - 8} cy={topY + 4} r={2.4} fill={C.coral} />

      <text x={ILL_X + ILL_W / 2} y={topY + plotH + 34} textAnchor="middle" fontFamily={MONO} fontSize={8.5} fill={C.muted}>
        Healthy gradient on the left vs. a vanishing one on the right.
      </text>
    </g>
  );
}

function BatchNormPanel() {
  // Before (spread/unstable) vs after (zero-mean, unit-variance) dot clouds on
  // a shared number line, with a normalize arrow between them.
  const beforeY = ILL_Y + 56;
  const afterY = ILL_Y + 122;
  const axX0 = ILL_X + 24;
  const axX1 = ILL_X + ILL_W - 24;
  const mid = (axX0 + axX1) / 2;

  // Hard-coded "before" activations (raw position 0..1 across the axis).
  const before = [0.06, 0.12, 0.2, 0.34, 0.52, 0.71, 0.83, 0.93, 0.97];
  // After normalization: clustered around the center (mean 0), unit variance.
  const after = [0.34, 0.4, 0.45, 0.48, 0.5, 0.52, 0.55, 0.6, 0.66];

  const px = (f: number): number => axX0 + f * (axX1 - axX0);

  return (
    <g>
      <text x={ILL_X + ILL_W / 2} y={ILL_Y + 24} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={C.green}>
        One layer's activations across a batch
      </text>

      {/* before */}
      <text x={axX0} y={beforeY - 12} fontFamily={MONO} fontSize={9} fill={C.coral}>
        before: spread out, drifting
      </text>
      <line x1={axX0} y1={beforeY} x2={axX1} y2={beforeY} stroke={C.grid} strokeWidth={1} />
      {before.map((f, i) => (
        <circle key={`b${i}`} cx={px(f)} cy={beforeY} r={3} fill={C.coral} opacity={0.8} />
      ))}

      {/* normalize arrow */}
      <line x1={mid} y1={beforeY + 8} x2={mid} y2={afterY - 22} stroke={C.green} strokeWidth={1.4} />
      <path d={`M ${mid} ${afterY - 22} l -3 -5 l 6 0 z`} fill={C.green} />
      <text x={mid + 10} y={afterY - 30} fontFamily={MONO} fontSize={8.5} fill={C.green}>
        normalize
      </text>

      {/* after */}
      <text x={axX0} y={afterY - 12} fontFamily={MONO} fontSize={9} fill={C.green}>
        after: zero mean, unit variance
      </text>
      <line x1={axX0} y1={afterY} x2={axX1} y2={afterY} stroke={C.grid} strokeWidth={1} />
      {/* center tick (mean = 0) */}
      <line x1={mid} y1={afterY - 8} x2={mid} y2={afterY + 8} stroke={C.line} strokeWidth={1} />
      <text x={mid} y={afterY + 20} textAnchor="middle" fontFamily={MONO} fontSize={8} fill={C.muted}>
        mean 0
      </text>
      {after.map((f, i) => (
        <circle key={`a${i}`} cx={px(f)} cy={afterY} r={3} fill={C.green} opacity={0.85} />
      ))}
    </g>
  );
}

function ResidualPanel() {
  // A weight block with a curved +x skip arc around it; gradient flows straight
  // through the skip.
  const cy = ILL_Y + 96;
  const inX = ILL_X + 36;
  const blockX = ILL_X + 150;
  const blockW = 150;
  const blockH = 46;
  const sumX = blockX + blockW + 70;
  const outX = sumX + 70;

  return (
    <g>
      <text x={ILL_X + ILL_W / 2} y={ILL_Y + 24} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={C.coral}>
        Residual block:  out = F(x) + x
      </text>

      {/* input node */}
      <circle cx={inX} cy={cy} r={6} fill={C.coralFill} stroke={C.coral} strokeWidth={1.3} />
      <text x={inX} y={cy + 24} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={C.ink}>
        x
      </text>

      {/* main path: x -> block */}
      <line x1={inX + 8} y1={cy} x2={blockX - 4} y2={cy} stroke={C.muted} strokeWidth={1.3} />
      <path d={`M ${blockX - 4} ${cy} l -4 -2.5 l 0 5 z`} fill={C.muted} />

      {/* weight block F(x) */}
      <rect x={blockX} y={cy - blockH / 2} width={blockW} height={blockH} rx={5} fill="var(--card)" stroke={C.coral} strokeWidth={1.3} />
      <text x={blockX + blockW / 2} y={cy + 3.5} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={C.ink}>
        weight layers F(x)
      </text>

      {/* block -> sum */}
      <line x1={blockX + blockW} y1={cy} x2={sumX - 10} y2={cy} stroke={C.muted} strokeWidth={1.3} />
      <path d={`M ${sumX - 10} ${cy} l -4 -2.5 l 0 5 z`} fill={C.muted} />

      {/* sum node */}
      <circle cx={sumX} cy={cy} r={11} fill="var(--card)" stroke={C.coral} strokeWidth={1.3} />
      <text x={sumX} y={cy + 4} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={C.coral}>
        +
      </text>

      {/* sum -> out */}
      <line x1={sumX + 11} y1={cy} x2={outX - 4} y2={cy} stroke={C.muted} strokeWidth={1.3} />
      <path d={`M ${outX - 4} ${cy} l -4 -2.5 l 0 5 z`} fill={C.muted} />
      <text x={outX + 4} y={cy + 3.5} fontFamily={MONO} fontSize={9} fill={C.ink}>
        out
      </text>

      {/* skip arc: x -> sum (gradient highway) */}
      <path
        d={`M ${inX} ${cy - 8} C ${inX} ${cy - 52}, ${sumX} ${cy - 52}, ${sumX} ${cy - 12}`}
        fill="none"
        stroke={C.green}
        strokeWidth={2}
      />
      <path d={`M ${sumX} ${cy - 12} l -3 -6 l 6 0 z`} fill={C.green} />
      <text x={(inX + sumX) / 2} y={cy - 56} textAnchor="middle" fontFamily={MONO} fontSize={9} fill={C.green}>
        +x skip: gradient flows straight through
      </text>

      <text x={ILL_X + ILL_W / 2} y={ILL_Y + ILL_H - 14} textAnchor="middle" fontFamily={MONO} fontSize={8.5} fill={C.muted}>
        Same identity-shortcut idea transformers use in every block.
      </text>
    </g>
  );
}
