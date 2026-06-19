"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Sliding-window attention + the depth trick.
//
// Top panel: a strip of n tokens. One query token is highlighted; only the
// w tokens immediately before it are shaded (its attention window).
//
// Bottom panel: stacking L layers widens the effective receptive field of a
// fixed query position. Layer 1 reaches w back, layer 2 reaches 2w, ...,
// layer L reaches L*w, a "ripple" of expanding triangles.

// --- Top strip geometry ---
const N = 16; // visible tokens in the strip
const STRIP_X = 30; // left edge of the strip
const STRIP_Y = 56; // top of the strip cells
const CELL = 23; // token cell side
const CELL_GAP = 1;
const CELL_STEP = CELL + CELL_GAP;
const STRIP_W = N * CELL_STEP - CELL_GAP;
const QUERY = 11; // index of the highlighted query token (0-based)

// --- Bottom (depth) panel geometry ---
const DEPTH_X = 30; // left edge of the position axis
const DEPTH_W = 388; // width of the position axis
const POS = 40; // number of positions on the depth axis
const POS_STEP = DEPTH_W / POS;
const Q_POS = 30; // query position on the depth axis (0-based)
const LAYERS_Y0 = 184; // top (layer L) of the stack
const LAYER_H = 16; // vertical room per layer
const MAX_L = 8; // slider max for layers

const VIEW_W = 448;
const VIEW_H = 416;

export function TfSlidingWindow() {
  const [w, setW] = useState<number>(3);
  const [layers, setLayers] = useState<number>(4);

  const reset = () => {
    setW(3);
    setLayers(4);
  };

  // Effective receptive field after stacking `layers` layers of window `w`.
  const effective = w * layers;

  // Real-model framing of the same numbers (32 layers x 4096 window).
  const realLayers = 32;
  const realWindow = 4096;
  const realEffective = realLayers * realWindow; // 131,072

  // Bottom-layer triangle uses up to MAX_LAYERS rows.
  const maxLayers = layers;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Sliding-window attention: each token attends to a local window of w previous tokens, and stacking L layers grows the effective receptive field to L times w."
      >
        {/* Title band */}
        <text x={VIEW_W / 2} y={20} textAnchor="middle" fill={C.ink} fontFamily={MONO} fontSize={13}>
          Sliding-Window Attention + the Depth Trick
        </text>

        {/* ---- TOP PANEL: one layer, local window ---- */}
        <text x={STRIP_X} y={44} fill={C.muted} fontFamily={MONO} fontSize={10}>
          one layer: each token attends to w previous tokens, not all n
        </text>

        {Array.from({ length: N }, (_, i) => {
          const x = STRIP_X + i * CELL_STEP;
          const isQuery = i === QUERY;
          const inWindow = i < QUERY && i >= QUERY - w;
          let fill = "var(--card)";
          if (isQuery) fill = C.coralFill;
          else if (inWindow) fill = C.blueFill;
          return (
            <g key={`tok-${i}`}>
              <rect
                x={x}
                y={STRIP_Y}
                width={CELL}
                height={CELL}
                rx={2}
                fill={fill}
                stroke={isQuery ? C.coral : inWindow ? C.blue : C.line}
                strokeWidth={isQuery ? 1.6 : 1}
              />
            </g>
          );
        })}

        {/* Window bracket under the shaded cells */}
        {w > 0 && (
          <>
            <line
              x1={STRIP_X + (QUERY - w) * CELL_STEP}
              y1={STRIP_Y + CELL + 6}
              x2={STRIP_X + QUERY * CELL_STEP - CELL_GAP}
              y2={STRIP_Y + CELL + 6}
              stroke={C.blue}
              strokeWidth={1.2}
            />
            <text
              x={STRIP_X + (QUERY - w / 2) * CELL_STEP - CELL_GAP / 2}
              y={STRIP_Y + CELL + 18}
              textAnchor="middle"
              fill={C.blue}
              fontFamily={MONO}
              fontSize={10}
            >
              window w = {w}
            </text>
          </>
        )}

        {/* Query marker */}
        <text
          x={STRIP_X + QUERY * CELL_STEP + CELL / 2}
          y={STRIP_Y - 5}
          textAnchor="middle"
          fill={C.coral}
          fontFamily={MONO}
          fontSize={10}
        >
          query
        </text>

        {/* ---- DIVIDER ---- */}
        <line x1={STRIP_X} y1={132} x2={VIEW_W - STRIP_X} y2={132} stroke={C.line} strokeWidth={0.75} />

        {/* ---- BOTTOM PANEL: depth trick ---- */}
        <text x={DEPTH_X} y={152} fill={C.muted} fontFamily={MONO} fontSize={10}>
          stack L layers: the receptive field widens by w each layer
        </text>

        {/* position axis baseline (below the stack) */}
        {(() => {
          const baseY = LAYERS_Y0 + maxLayers * LAYER_H + 6;
          return (
            <>
              {/* layer rows: each layer reaches (layer index)*w positions back */}
              {Array.from({ length: maxLayers }, (_, k) => {
                // k = 0 is the TOP layer (layer L), k = maxLayers-1 is layer 1.
                const layerNum = maxLayers - k; // 1..L from bottom to top
                const reach = layerNum * w; // positions reached back
                const y = LAYERS_Y0 + k * LAYER_H;
                const qx = DEPTH_X + Q_POS * POS_STEP;
                const leftPos = Math.max(0, Q_POS - reach);
                const lx = DEPTH_X + leftPos * POS_STEP;
                return (
                  <g key={`layer-${k}`}>
                    <rect
                      x={lx}
                      y={y}
                      width={qx - lx}
                      height={LAYER_H - 4}
                      rx={1.5}
                      fill={C.blueFill}
                      stroke={C.blue}
                      strokeWidth={0.75}
                    />
                    <text
                      x={DEPTH_X - 6}
                      y={y + (LAYER_H - 4) / 2 + 3}
                      textAnchor="end"
                      fill={C.muted}
                      fontFamily={MONO}
                      fontSize={9}
                    >
                      L{layerNum}
                    </text>
                  </g>
                );
              })}

              {/* query position vertical guide */}
              <line
                x1={DEPTH_X + Q_POS * POS_STEP}
                y1={LAYERS_Y0 - 4}
                x2={DEPTH_X + Q_POS * POS_STEP}
                y2={baseY}
                stroke={C.coral}
                strokeWidth={1.2}
              />

              {/* effective reach bracket on the baseline */}
              {(() => {
                const reachAll = Math.min(POS, effective);
                const leftPos = Math.max(0, Q_POS - reachAll);
                const lx = DEPTH_X + leftPos * POS_STEP;
                const qx = DEPTH_X + Q_POS * POS_STEP;
                return (
                  <>
                    <line x1={lx} y1={baseY} x2={qx} y2={baseY} stroke={C.coral} strokeWidth={1.2} />
                    <line x1={lx} y1={baseY - 3} x2={lx} y2={baseY + 3} stroke={C.coral} strokeWidth={1.2} />
                    <text
                      x={(lx + qx) / 2}
                      y={baseY + 15}
                      textAnchor="middle"
                      fill={C.coral}
                      fontFamily={MONO}
                      fontSize={10}
                    >
                      effective field = L*w = {effective}
                    </text>
                  </>
                );
              })()}
            </>
          );
        })()}

        {/* ---- READOUT BAND (bottom) ---- */}
        <text x={DEPTH_X} y={VIEW_H - 38} fill={C.ink} fontFamily={MONO} fontSize={10}>
          {`L*w = ${layers} x ${w} = ${effective} tokens of effective context`}
        </text>
        <text x={DEPTH_X} y={VIEW_H - 24} fill={C.muted} fontFamily={MONO} fontSize={10}>
          {`cost per layer ~ n*w (windowed) vs n^2 (full), local stays cheap`}
        </text>
        <text x={DEPTH_X} y={VIEW_H - 10} fill={C.green} fontFamily={MONO} fontSize={9}>
          {`real model: ${realLayers} layers x ${realWindow} window = ~${realEffective.toLocaleString("en-US")}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">window w</span>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={w}
            onChange={(e) => setW(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{w}</span>
        </label>

        <label className="flex items-center gap-2">
          <span className="font-mono">layers L</span>
          <input
            type="range"
            min={1}
            max={MAX_L}
            step={1}
            value={layers}
            onChange={(e) => setLayers(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{layers}</span>
        </label>

        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
      </div>

      <p className="mt-3 max-w-prose text-xs text-[var(--muted)]">
        A small local window per layer, stacked deep, reaches far, that&rsquo;s how long
        context stays cheap.
      </p>
    </div>
  );
}
