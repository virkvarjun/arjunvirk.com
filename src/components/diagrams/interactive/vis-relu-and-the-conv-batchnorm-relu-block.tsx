"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// ReLU and the Conv -> BatchNorm -> ReLU block.
// Left: the activation curve (ReLU / sigmoid / tanh) with the gradient
// annotated and a draggable input value read out on the curve.
// Right: the standard CNN building block Conv -> BatchNorm -> ReLU, with a
// feature map flowing through. Negative activations are clipped to zero by
// ReLU. Toggling the activation OFF collapses the 3 conv layers into one
// linear map (W3·W2·W1 = W).

type Act = "relu" | "sigmoid" | "tanh";

// ----- curve plot geometry -----
const PLOT_X = 24; // left edge of plot box
const PLOT_Y = 70; // top edge of plot box
const PLOT_W = 220;
const PLOT_H = 180;
const X_MIN = -4;
const X_MAX = 4;
const Y_MIN = -1.2;
const Y_MAX = 4;

// map data coords -> svg coords
const sx = (x: number): number =>
  PLOT_X + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
const sy = (y: number): number =>
  PLOT_Y + PLOT_H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;

const fOf = (act: Act, x: number): number => {
  if (act === "relu") return Math.max(0, x);
  if (act === "sigmoid") return 1 / (1 + Math.exp(-x));
  return Math.tanh(x);
};
const gradOf = (act: Act, x: number): number => {
  if (act === "relu") return x > 0 ? 1 : 0;
  if (act === "sigmoid") {
    const s = 1 / (1 + Math.exp(-x));
    return s * (1 - s);
  }
  const t = Math.tanh(x);
  return 1 - t * t;
};

// pre-sampled x grid (deterministic, no Math.random)
const XS: readonly number[] = Array.from(
  { length: 81 },
  (_, i) => X_MIN + (i / 80) * (X_MAX - X_MIN),
);

const curvePoints = (act: Act): string =>
  XS.map((x) => `${sx(x).toFixed(1)},${sy(fOf(act, x)).toFixed(1)}`).join(" ");

// ----- block geometry (right side) -----
const BLK_X = 290;
const BLK_W = 90;
const BLK_H = 30;
const BLK_GAP = 18;
const BLK_Y0 = 96; // top of first box

// A small 4-cell feature map: values before/after ReLU.
const PRE: readonly number[] = [1.6, -0.9, -1.4, 2.3];

const fmtSigned = (v: number): string => (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1));

export function VisReluBlock() {
  const [act, setAct] = useState<Act>("relu");
  const [nonlinear, setNonlinear] = useState<boolean>(true);
  const [xInput, setXInput] = useState<number>(-1.5);

  const yOut = fOf(act, xInput);
  const grad = gradOf(act, xInput);

  const px = sx(xInput);
  const py = sy(yOut);

  // post-activation feature-map values (ReLU clips negatives when nonlinear)
  const post = PRE.map((v) => (nonlinear ? Math.max(0, v) : v));

  return (
    <div>
      <svg
        viewBox="0 0 560 400"
        className="h-auto w-full"
        role="img"
        aria-label="ReLU activation curve with gradient, and the Conv to BatchNorm to ReLU CNN building block clipping negative activations"
      >
        {/* ---------- Title band ---------- */}
        <text x={24} y={26} fontFamily={MONO} fontSize={13} fill={C.ink}>
          ReLU and the Conv {"->"} BatchNorm {"->"} ReLU Block
        </text>
        <text x={24} y={44} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          ReLU(x) = max(0, x), clips negatives, gradient 1 for x{">"}0, 0 for x{"<"}0
        </text>

        {/* ---------- LEFT: activation curve ---------- */}
        {/* plot frame */}
        <rect
          x={PLOT_X}
          y={PLOT_Y}
          width={PLOT_W}
          height={PLOT_H}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {/* axes (x=0 vertical, y=0 horizontal) */}
        <line
          x1={sx(0)}
          y1={PLOT_Y}
          x2={sx(0)}
          y2={PLOT_Y + PLOT_H}
          stroke={C.grid}
          strokeWidth={1}
        />
        <line
          x1={PLOT_X}
          y1={sy(0)}
          x2={PLOT_X + PLOT_W}
          y2={sy(0)}
          stroke={C.grid}
          strokeWidth={1}
        />
        {/* axis labels */}
        <text
          x={PLOT_X + PLOT_W - 4}
          y={sy(0) - 4}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="end"
        >
          x
        </text>
        <text
          x={sx(0) + 4}
          y={PLOT_Y + 10}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          f(x)
        </text>

        {/* faint comparison curves when comparing */}
        {act !== "relu" && (
          <polyline
            points={curvePoints("relu")}
            fill="none"
            stroke={C.grid}
            strokeWidth={1.5}
          />
        )}

        {/* main curve */}
        <polyline
          points={curvePoints(act)}
          fill="none"
          stroke={
            act === "relu" ? C.green : act === "sigmoid" ? C.blue : C.violet
          }
          strokeWidth={2.2}
        />

        {/* dragged input: vertical drop line + point + tangent slope hint */}
        <line
          x1={px}
          y1={PLOT_Y + PLOT_H}
          x2={px}
          y2={py}
          stroke={C.coral}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <line
          x1={px}
          y1={py}
          x2={PLOT_X}
          y2={py}
          stroke={C.coral}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle cx={px} cy={py} r={4.5} fill={C.coral} stroke="var(--background)" strokeWidth={1.2} />

        {/* curve legend / saturation note (own band under plot) */}
        <text
          x={PLOT_X}
          y={PLOT_Y + PLOT_H + 18}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
        >
          {act === "relu"
            ? "ReLU: gradient stays 1 where active"
            : act === "sigmoid"
              ? "sigmoid: saturates, gradient -> 0 at |x| large"
              : "tanh: saturates, gradient -> 0 at |x| large"}
        </text>
        <text
          x={PLOT_X}
          y={PLOT_Y + PLOT_H + 32}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          input x = {xInput.toFixed(1)} {"->"} f(x) = {yOut.toFixed(2)}, f'(x) ={" "}
          {grad.toFixed(2)}
        </text>

        {/* ---------- RIGHT: Conv -> BN -> ReLU block ---------- */}
        <text x={BLK_X} y={PLOT_Y - 6} fontFamily={MONO} fontSize={10} fill={C.ink}>
          standard CNN block
        </text>

        {/* three chained boxes */}
        {(["Conv", "BatchNorm", nonlinear ? "ReLU" : "(none)"] as const).map(
          (label, i) => {
            const y = BLK_Y0 + i * (BLK_H + BLK_GAP);
            const isRelu = i === 2;
            const stroke = isRelu
              ? nonlinear
                ? C.green
                : C.line
              : C.blue;
            const fill = isRelu
              ? nonlinear
                ? C.greenFill
                : C.grid
              : C.blueFill;
            return (
              <g key={i}>
                <rect
                  x={BLK_X}
                  y={y}
                  width={BLK_W}
                  height={BLK_H}
                  rx={4}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.4}
                />
                <text
                  x={BLK_X + BLK_W / 2}
                  y={y + BLK_H / 2 + 3.5}
                  fontFamily={MONO}
                  fontSize={10}
                  fill={C.ink}
                  textAnchor="middle"
                >
                  {label}
                </text>
                {/* connecting arrow to next box */}
                {i < 2 && (
                  <line
                    x1={BLK_X + BLK_W / 2}
                    y1={y + BLK_H}
                    x2={BLK_X + BLK_W / 2}
                    y2={y + BLK_H + BLK_GAP}
                    stroke={C.muted}
                    strokeWidth={1.2}
                    markerEnd=""
                  />
                )}
                {i < 2 && (
                  <polygon
                    points={`${BLK_X + BLK_W / 2 - 3},${y + BLK_H + BLK_GAP - 4} ${BLK_X + BLK_W / 2 + 3},${y + BLK_H + BLK_GAP - 4} ${BLK_X + BLK_W / 2},${y + BLK_H + BLK_GAP}`}
                    fill={C.muted}
                  />
                )}
              </g>
            );
          },
        )}

        {/* feature-map cells: before vs after ReLU */}
        <text
          x={BLK_X + BLK_W + 24}
          y={BLK_Y0 + 2}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          before
        </text>
        <text
          x={BLK_X + BLK_W + 92}
          y={BLK_Y0 + 2}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          after
        </text>
        {PRE.map((v, i) => {
          const cy = BLK_Y0 + 12 + i * 22;
          const clipped = nonlinear && v < 0;
          return (
            <g key={i}>
              {/* before cell */}
              <rect
                x={BLK_X + BLK_W + 24}
                y={cy}
                width={56}
                height={18}
                rx={2}
                fill={v < 0 ? C.coralFill : C.blueFill}
                stroke={v < 0 ? C.coral : C.blue}
                strokeWidth={1}
              />
              <text
                x={BLK_X + BLK_W + 24 + 28}
                y={cy + 12.5}
                fontFamily={MONO}
                fontSize={9}
                fill={C.ink}
                textAnchor="middle"
              >
                {fmtSigned(v)}
              </text>
              {/* arrow */}
              <line
                x1={BLK_X + BLK_W + 82}
                y1={cy + 9}
                x2={BLK_X + BLK_W + 90}
                y2={cy + 9}
                stroke={C.muted}
                strokeWidth={1}
              />
              {/* after cell */}
              <rect
                x={BLK_X + BLK_W + 92}
                y={cy}
                width={56}
                height={18}
                rx={2}
                fill={clipped ? C.grid : post[i] > 0 ? C.greenFill : C.grid}
                stroke={clipped ? C.line : post[i] > 0 ? C.green : C.line}
                strokeWidth={1}
              />
              <text
                x={BLK_X + BLK_W + 92 + 28}
                y={cy + 12.5}
                fontFamily={MONO}
                fontSize={9}
                fill={clipped ? C.muted : C.ink}
                textAnchor="middle"
              >
                {fmtSigned(post[i])}
              </text>
            </g>
          );
        })}

        {/* ---------- readout band (collapse explanation) ---------- */}
        <text
          x={BLK_X}
          y={BLK_Y0 + 3 * (BLK_H + BLK_GAP) + 10}
          fontFamily={MONO}
          fontSize={9}
          fill={nonlinear ? C.green : C.coral}
        >
          {nonlinear
            ? "ReLU clips negatives -> stays nonlinear"
            : "no activation: W3·W2·W1 = W (one linear map)"}
        </text>

        {/* ---------- caption band (bottom, wrapped to fit width) ---------- */}
        <text x={24} y={372} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          Without a nonlinearity, stacked conv layers collapse to one.
        </text>
        <text x={24} y={388} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          ReLU keeps them expressive and the gradients flowing.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {(["relu", "sigmoid", "tanh"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAct(a)}
            aria-pressed={act === a}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={act === a ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {a}
          </button>
        ))}
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          input x
          <input
            type="range"
            min={-4}
            max={4}
            step={0.1}
            value={xInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setXInput(parseFloat(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{xInput.toFixed(1)}</span>
        </label>
        <button
          onClick={() => setNonlinear((n) => !n)}
          aria-pressed={nonlinear}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={nonlinear ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          activation: {nonlinear ? "on" : "off (collapse)"}
        </button>
      </div>
    </div>
  );
}
