"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// ---------------------------------------------------------------------------
// Layout. The drawing splits into two clearly separated horizontal regions:
//   - top region  (y ~ 56..150): the classic ReLU FFN flow
//   - bottom region(y ~ 168..300): the gated SwiGLU FFN flow
// To the right of the flows sits an activation-curve panel (ReLU vs Swish).
// A title band lives above everything; an annotation + caption band below.
// ---------------------------------------------------------------------------
const VW = 600;
const VH = 430;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const swish = (z: number) => z * sigmoid(z);
const relu = (z: number) => Math.max(0, z);

// Curve panel geometry (top-right).
const CP_X = 392;
const CP_Y = 60;
const CP_W = 192;
const CP_H = 150;
const Z_MIN = -5;
const Z_MAX = 5;
const Y_MIN = -1.2;
const Y_MAX = 4.2;
const cmX = (z: number) => CP_X + ((z - Z_MIN) / (Z_MAX - Z_MIN)) * CP_W;
const cmY = (y: number) =>
  CP_Y + CP_H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * CP_H;
const clampY = (y: number) => Math.max(Y_MIN, Math.min(Y_MAX, y));

// A small rounded node box used in both flows.
function Node({
  x,
  y,
  w,
  h,
  fill,
  stroke,
  lines,
  textFill,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  lines: string[];
  textFill: string;
}) {
  const cy = y + h / 2;
  const start = cy - ((lines.length - 1) * 12) / 2 + 3.5;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={5}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.4}
      />
      {lines.map((ln, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={start + i * 12}
          fontSize={10}
          fill={textFill}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

function Conn({
  x1,
  y1,
  x2,
  y2,
  color,
  dash,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  dash?: string;
}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const head = 6;
  const a1 = ang + Math.PI - 0.42;
  const a2 = ang + Math.PI + 0.42;
  return (
    <g stroke={color} fill={color}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={1.6}
        strokeDasharray={dash}
      />
      <polygon
        stroke="none"
        points={`${x2},${y2} ${x2 + head * Math.cos(a1)},${y2 + head * Math.sin(a1)} ${x2 + head * Math.cos(a2)},${y2 + head * Math.sin(a2)}`}
      />
    </g>
  );
}

export function TfSwiglu() {
  const [animate, setAnimate] = useState<boolean>(false);
  const [phase, setPhase] = useState<number>(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => {
      frame.current = (frame.current + 1) % 120;
      setPhase(frame.current);
    }, 33);
    return () => clearInterval(id);
  }, [animate]);

  // t in [0,1) drives the gating demo: a value sweeps across z and we show
  // how Swish(a) modulates the linear projection b at that point.
  const t = phase / 120;
  const zNow = Z_MIN + t * (Z_MAX - Z_MIN);
  const gateVal = sigmoid(zNow); // Swish gate factor ~ sigmoid acts as the multiplier
  const projVal = zNow; // the (linear) value being modulated
  const gated = swish(zNow);

  const reluCurve = plotCurve(relu, Z_MIN, Z_MAX, 160, cmX, (y) =>
    cmY(clampY(y)),
  );
  const swishCurve = plotCurve(swish, Z_MIN, Z_MAX, 160, cmX, (y) =>
    cmY(clampY(y)),
  );

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="SwiGLU FFN versus ReLU FFN comparison"
      >
        {/* ---- title band ---- */}
        <text
          x={VW / 2}
          y={26}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          SwiGLU FFN vs ReLU FFN
        </text>

        {/* divider between flows region and curve panel */}
        <line
          x1={376}
          y1={48}
          x2={376}
          y2={224}
          stroke={C.grid}
          strokeWidth={1}
        />

        {/* ================= TOP REGION: ReLU FFN ================= */}
        <text
          x={20}
          y={62}
          fontSize={11}
          fill={C.coral}
          fontFamily={MONO}
          fontWeight={600}
        >
          ReLU FFN (2 matrices)
        </text>

        {(() => {
          const ry = 78;
          const rh = 40;
          const xs = 20;
          const xIn = xs;
          const xW1 = xs + 56;
          const xAct = xW1 + 78;
          const xW2 = xAct + 74;
          const xOut = xW2 + 78;
          return (
            <g>
              <Node
                x={xIn}
                y={ry}
                w={42}
                h={rh}
                fill="var(--card)"
                stroke={C.line}
                lines={["x"]}
                textFill={C.ink}
              />
              <Conn
                x1={xIn + 42}
                y1={ry + rh / 2}
                x2={xW1}
                y2={ry + rh / 2}
                color={C.line}
              />
              <Node
                x={xW1}
                y={ry}
                w={64}
                h={rh}
                fill={C.coralFill}
                stroke={C.coral}
                lines={["Linear", "W1"]}
                textFill={C.ink}
              />
              <Conn
                x1={xW1 + 64}
                y1={ry + rh / 2}
                x2={xAct}
                y2={ry + rh / 2}
                color={C.line}
              />
              <Node
                x={xAct}
                y={ry}
                w={60}
                h={rh}
                fill="var(--card)"
                stroke={C.coral}
                lines={["ReLU"]}
                textFill={C.coral}
              />
              <Conn
                x1={xAct + 60}
                y1={ry + rh / 2}
                x2={xW2}
                y2={ry + rh / 2}
                color={C.line}
              />
              <Node
                x={xW2}
                y={ry}
                w={64}
                h={rh}
                fill={C.coralFill}
                stroke={C.coral}
                lines={["Linear", "W2"]}
                textFill={C.ink}
              />
              <Conn
                x1={xW2 + 64}
                y1={ry + rh / 2}
                x2={xOut}
                y2={ry + rh / 2}
                color={C.line}
              />
              <Node
                x={xOut}
                y={ry}
                w={42}
                h={rh}
                fill="var(--card)"
                stroke={C.line}
                lines={["out"]}
                textFill={C.ink}
              />
            </g>
          );
        })()}

        {/* region separator */}
        <line
          x1={20}
          y1={150}
          x2={352}
          y2={150}
          stroke={C.grid}
          strokeWidth={1}
        />

        {/* ================= BOTTOM REGION: SwiGLU FFN ================= */}
        <text
          x={20}
          y={172}
          fontSize={11}
          fill={C.blue}
          fontFamily={MONO}
          fontWeight={600}
        >
          SwiGLU FFN (3 matrices)
        </text>

        {(() => {
          const xIn = 20;
          const xProj = 86;
          const xMid = 176; // swish / pass-through column
          const xGate = 244;
          const xW3 = 278;
          const yTop = 192; // gate branch (W1 -> Swish)
          const yBot = 250; // value branch (W3 proj)
          const yMul = 221; // multiply node center row
          const ph = 30;
          const inY = (yTop + yBot) / 2;
          return (
            <g>
              {/* input */}
              <Node
                x={xIn}
                y={inY - 15}
                w={42}
                h={30}
                fill="var(--card)"
                stroke={C.line}
                lines={["x"]}
                textFill={C.ink}
              />
              {/* split to two projections */}
              <Conn
                x1={xIn + 42}
                y1={inY}
                x2={xProj}
                y2={yTop + ph / 2}
                color={C.line}
              />
              <Conn
                x1={xIn + 42}
                y1={inY}
                x2={xProj}
                y2={yBot + ph / 2}
                color={C.line}
              />
              {/* top projection W1 */}
              <Node
                x={xProj}
                y={yTop}
                w={60}
                h={ph}
                fill={C.blueFill}
                stroke={C.blue}
                lines={["Lin W1"]}
                textFill={C.ink}
              />
              {/* bottom projection W2 (gate value branch) */}
              <Node
                x={xProj}
                y={yBot}
                w={60}
                h={ph}
                fill={C.blueFill}
                stroke={C.blue}
                lines={["Lin W2"]}
                textFill={C.ink}
              />
              {/* swish on top */}
              <Conn
                x1={xProj + 60}
                y1={yTop + ph / 2}
                x2={xMid}
                y2={yTop + ph / 2}
                color={C.line}
              />
              <Node
                x={xMid}
                y={yTop}
                w={56}
                h={ph}
                fill="var(--card)"
                stroke={C.green}
                lines={["Swish"]}
                textFill={C.green}
              />
              {/* bottom passes straight to gate */}
              <Conn
                x1={xProj + 60}
                y1={yBot + ph / 2}
                x2={xGate}
                y2={yBot + ph / 2}
                color={C.line}
              />
              {/* swish output down into gate */}
              <Conn
                x1={xMid + 56}
                y1={yTop + ph / 2}
                x2={xGate + 11}
                y2={yMul - 12}
                color={animate ? C.green : C.line}
              />
              {/* bottom into gate */}
              <Conn
                x1={xGate}
                y1={yBot + ph / 2}
                x2={xGate + 11}
                y2={yMul + 12}
                color={animate ? C.blue : C.line}
              />
              {/* multiply (gate) node */}
              <circle
                cx={xGate + 11}
                cy={yMul}
                r={13}
                fill={animate ? C.greenFill : "var(--card)"}
                stroke={C.green}
                strokeWidth={1.6}
              />
              <text
                x={xGate + 11}
                y={yMul + 4}
                fontSize={13}
                fill={C.green}
                fontFamily={MONO}
                textAnchor="middle"
              >
                ×
              </text>
              {/* gate -> W3 -> out */}
              <Conn
                x1={xGate + 24}
                y1={yMul}
                x2={xW3}
                y2={yMul}
                color={C.line}
              />
              <Node
                x={xW3}
                y={yMul - 15}
                w={56}
                h={30}
                fill={C.blueFill}
                stroke={C.blue}
                lines={["Lin W3"]}
                textFill={C.ink}
              />
              <Conn
                x1={xW3 + 56}
                y1={yMul}
                x2={xW3 + 66}
                y2={yMul}
                color={C.line}
              />
              <Node
                x={xW3 + 66}
                y={yMul - 15}
                w={40}
                h={30}
                fill="var(--card)"
                stroke={C.line}
                lines={["out"]}
                textFill={C.ink}
              />
            </g>
          );
        })()}

        {/* ================= CURVE PANEL (top-right) ================= */}
        <text
          x={CP_X}
          y={CP_Y - 8}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          Swish vs ReLU
        </text>
        {/* panel frame */}
        <rect
          x={CP_X}
          y={CP_Y}
          width={CP_W}
          height={CP_H}
          fill="none"
          stroke={C.grid}
          strokeWidth={1}
        />
        {/* zero axes */}
        <line
          x1={cmX(0)}
          y1={CP_Y}
          x2={cmX(0)}
          y2={CP_Y + CP_H}
          stroke={C.line}
          strokeWidth={1}
        />
        <line
          x1={CP_X}
          y1={cmY(0)}
          x2={CP_X + CP_W}
          y2={cmY(0)}
          stroke={C.line}
          strokeWidth={1}
        />
        <polyline
          points={reluCurve}
          fill="none"
          stroke={C.coral}
          strokeWidth={1.8}
          strokeDasharray="5 4"
        />
        <polyline
          points={swishCurve}
          fill="none"
          stroke={C.green}
          strokeWidth={1.8}
        />
        {/* legend inside panel, top-left clear corner */}
        <text
          x={CP_X + 6}
          y={CP_Y + 14}
          fontSize={9}
          fill={C.green}
          fontFamily={MONO}
        >
          Swish
        </text>
        <text
          x={CP_X + 6}
          y={CP_Y + 26}
          fontSize={9}
          fill={C.coral}
          fontFamily={MONO}
        >
          ReLU
        </text>
        {/* animated marker showing the gating sweep */}
        {animate && (
          <g>
            <line
              x1={cmX(zNow)}
              y1={CP_Y}
              x2={cmX(zNow)}
              y2={CP_Y + CP_H}
              stroke={C.muted}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <circle
              cx={cmX(zNow)}
              cy={cmY(clampY(gated))}
              r={3.5}
              fill={C.green}
            />
          </g>
        )}

        {/* ============ ANNOTATION BAND (below drawing) ============ */}
        <line
          x1={20}
          y1={324}
          x2={VW - 20}
          y2={324}
          stroke={C.grid}
          strokeWidth={1}
        />
        <text
          x={20}
          y={346}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
        >
          3 matrices (W1, W2, W3) vs 2, so SwiGLU shrinks d_ff to ~(8/3)·d_model
        </text>
        <text
          x={20}
          y={362}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
        >
          to keep the parameter count matched.
        </text>

        {/* live gating readout (only when animating) */}
        <text
          x={20}
          y={384}
          fontSize={10}
          fill={animate ? C.green : C.muted}
          fontFamily={MONO}
        >
          {animate
            ? `gate: swish(${zNow.toFixed(2)}) = ${projVal.toFixed(2)} · σ(${zNow.toFixed(2)})=${gateVal.toFixed(2)}  →  ${gated.toFixed(2)}`
            : "toggle the gate animation to watch one projection modulate the other"}
        </text>

        {/* caption band */}
        <text
          x={VW / 2}
          y={412}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          A multiplicative gate lets one projection modulate the other, more
          expressive per parameter.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setAnimate((a) => !a)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            animate ? { background: C.ink, color: "var(--background)" } : undefined
          }
        >
          {animate ? "stop gate animation" : "animate gate ×"}
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          gated value = {gated.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
