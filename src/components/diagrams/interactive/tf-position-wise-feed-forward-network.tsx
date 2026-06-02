"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Position-wise Feed-Forward Network.
// Each token vector (d_model = 512) is expanded to 4x (2048) by W1, passed
// through ReLU, then contracted back to 512 by W2 — the SAME weights applied
// independently to every token in the sequence.

// Token labels for the parallel copies (identical FFN applied to each).
const TOKENS: readonly string[] = ["x1", "x2", "x3", "x4"];

export function TfFFN() {
  const [relu, setRelu] = useState<boolean>(true);
  const [hoverExpand, setHoverExpand] = useState<boolean>(false);

  // --- layout for the single (detailed) FFN drawn on the left ---
  const dx = 26; // left margin of the detailed FFN
  const top = 64; // top of the FFN drawing
  const bot = 214; // bottom of the FFN drawing
  const midY = (top + bot) / 2;
  const halfNarrow = 26; // half-height of a 512-wide column
  const halfWide = 66; // half-height of a 2048-wide column

  // x positions of the four vertical bars: in → W1 → ReLU → W2 → out
  const xIn = dx;
  const xExp = dx + 70; // after expansion (wide)
  const xRelu = dx + 150; // after relu (wide)
  const xOut = dx + 230; // after contraction (narrow)

  const barW = 16;

  // A vertical column bar centered on midY with given half-height.
  const Bar = (
    x: number,
    half: number,
    fill: string,
    stroke: string,
    label: string,
    sub: string,
  ) => (
    <g>
      <rect
        x={x}
        y={midY - half}
        width={barW}
        height={half * 2}
        rx={3}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.4}
      />
      <text
        x={x + barW / 2}
        y={midY - half - 9}
        fontFamily={MONO}
        fontSize={10}
        fill={C.ink}
        textAnchor="middle"
      >
        {label}
      </text>
      <text
        x={x + barW / 2}
        y={midY + half + 16}
        fontFamily={MONO}
        fontSize={9}
        fill={C.muted}
        textAnchor="middle"
      >
        {sub}
      </text>
    </g>
  );

  // Trapezoid connecting bar at x1 (half h1) to bar at x2 (half h2).
  const Trap = (
    x1: number,
    h1: number,
    x2: number,
    h2: number,
    fill: string,
    stroke: string,
    active: boolean,
  ) => {
    const a = x1 + barW;
    const b = x2;
    return (
      <polygon
        points={`${a},${midY - h1} ${b},${midY - h2} ${b},${midY + h2} ${a},${midY + h1}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={active ? 1.8 : 1.2}
      />
    );
  };

  // --- parameter-count bar comparison (right side) ---
  const cmpX = 320; // left edge of comparison area
  const cmpTop = 70;
  const cmpW = 110; // max bar width
  const ffnPctW = cmpW; // ~4M -> full bar
  const attnPctW = Math.round(cmpW * 0.25); // ~1M -> quarter

  return (
    <div>
      <svg
        viewBox="0 0 460 300"
        className="h-auto w-full"
        role="img"
        aria-label="Position-wise feed-forward network: expand 512 to 2048, ReLU, contract back to 512, applied per token"
      >
        {/* Title band */}
        <text x={26} y={24} fontFamily={MONO} fontSize={13} fill={C.ink}>
          Position-wise Feed-Forward Network
        </text>
        <text x={26} y={42} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          FFN(x) = W2 {"·"} {relu ? "ReLU" : "id"}(W1 {"·"} x)
        </text>

        {/* Expansion trapezoid (W1): 512 -> 2048 */}
        {Trap(
          xIn,
          halfNarrow,
          xExp,
          halfWide,
          hoverExpand ? C.coralFill : C.blueFill,
          hoverExpand ? C.coral : C.blue,
          hoverExpand,
        )}
        {/* invisible hover hit-area over the expansion */}
        <rect
          x={xIn + barW}
          y={midY - halfWide}
          width={xExp - (xIn + barW)}
          height={halfWide * 2}
          fill="transparent"
          onMouseEnter={() => setHoverExpand(true)}
          onMouseLeave={() => setHoverExpand(false)}
          style={{ cursor: "pointer" }}
        />

        {/* Contraction trapezoid (W2): 2048 -> 512.
            When ReLU is off the two linear maps collapse — dim the glyph. */}
        {Trap(
          xRelu,
          halfWide,
          xOut,
          halfNarrow,
          relu ? C.blueFill : C.grid,
          relu ? C.blue : C.line,
          false,
        )}

        {/* Bars */}
        {Bar(xIn, halfNarrow, "var(--card)", C.ink, "in", "512")}
        {Bar(xExp, halfWide, hoverExpand ? C.coralFill : C.blueFill, hoverExpand ? C.coral : C.blue, "h", "2048")}
        {Bar(xRelu, halfWide, relu ? C.greenFill : C.grid, relu ? C.green : C.line, "a", relu ? "ReLU" : "id")}
        {Bar(xOut, halfNarrow, "var(--card)", C.ink, "out", "512")}

        {/* W1 / W2 step labels under the trapezoids */}
        <text
          x={(xIn + xExp) / 2 + barW / 2}
          y={bot + 38}
          fontFamily={MONO}
          fontSize={9}
          fill={hoverExpand ? C.coral : C.muted}
          textAnchor="middle"
        >
          W1 expand
        </text>
        <text
          x={(xRelu + xOut) / 2 + barW / 2}
          y={bot + 38}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          W2 contract
        </text>

        {/* Parameter comparison panel (right) */}
        <text x={cmpX} y={cmpTop - 12} fontFamily={MONO} fontSize={10} fill={C.ink}>
          params / layer
        </text>
        {/* FFN bar (~4M) */}
        <rect x={cmpX} y={cmpTop} width={ffnPctW} height={16} rx={2} fill={C.coralFill} stroke={C.coral} strokeWidth={1.2} />
        <text x={cmpX} y={cmpTop - 0} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="start" dx={ffnPctW + 4} dy={12}>
          FFN ~4M
        </text>
        {/* attention bar (~1M) */}
        <rect x={cmpX} y={cmpTop + 28} width={attnPctW} height={16} rx={2} fill={C.blueFill} stroke={C.blue} strokeWidth={1.2} />
        <text x={cmpX + attnPctW + 4} y={cmpTop + 40} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="start">
          attn ~1M
        </text>

        {/* Per-token application: small parallel copies (identical weights) */}
        <text x={cmpX} y={cmpTop + 78} fontFamily={MONO} fontSize={10} fill={C.ink}>
          applied per token:
        </text>
        {TOKENS.map((t, i) => {
          const ty = cmpTop + 96 + i * 22;
          return (
            <g key={t}>
              {/* mini FFN: small narrow-wide-narrow glyph */}
              <rect x={cmpX} y={ty} width={6} height={12} rx={1} fill="var(--card)" stroke={C.ink} strokeWidth={1} />
              <polygon
                points={`${cmpX + 6},${ty} ${cmpX + 18},${ty - 4} ${cmpX + 18},${ty + 16} ${cmpX + 6},${ty + 12}`}
                fill={C.blueFill}
                stroke={C.blue}
                strokeWidth={1}
              />
              <polygon
                points={`${cmpX + 18},${ty - 4} ${cmpX + 30},${ty} ${cmpX + 30},${ty + 12} ${cmpX + 18},${ty + 16}`}
                fill={C.blueFill}
                stroke={C.blue}
                strokeWidth={1}
              />
              <rect x={cmpX + 30} y={ty} width={6} height={12} rx={1} fill="var(--card)" stroke={C.ink} strokeWidth={1} />
              <text x={cmpX + 44} y={ty + 10} fontFamily={MONO} fontSize={9} fill={C.muted}>
                {t} (same W1, W2)
              </text>
            </g>
          );
        })}

        {/* Hover readout band (bottom) */}
        <text
          x={26}
          y={272}
          fontFamily={MONO}
          fontSize={9.5}
          fill={hoverExpand ? C.coral : C.muted}
        >
          {hoverExpand
            ? "~4M params here — most of the model's knowledge"
            : relu
              ? "ReLU on: a true nonlinearity between W1 and W2"
              : "ReLU off: W2·W1 collapses into one linear map"}
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          onClick={() => setRelu((r) => !r)}
          aria-pressed={relu}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={relu ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          ReLU: {relu ? "on" : "off"}
        </button>
        <span className="font-mono text-[var(--muted)]">
          {relu
            ? "nonlinear — two distinct layers"
            : "linear — the two layers collapse into one"}
        </span>
      </div>
    </div>
  );
}
