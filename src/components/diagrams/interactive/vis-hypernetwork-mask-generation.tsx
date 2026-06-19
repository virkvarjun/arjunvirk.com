"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// Hypernetwork Mask Generation (SAM-style).
// Each of 4 mask tokens (256-dim) is passed through its own tiny MLP to emit a
// 32-dim dynamic linear filter. That filter is dot-producted against the
// 32-dim feature vector at every spatial location of the upsampled image
// features (32, 256, 256) to produce a per-pixel logit -> a mask.
//
// We render the mask on an 8x8 preview grid (64 cells stand in for 256x256).
// All data is hard-coded for SSR determinism.

const GRID = 8; // preview grid side (stands in for 256x256)
const CELLS = GRID * GRID;

// Four hard-coded masks (8x8), one per token. Values 0..9 = mask logit strength.
// They differ in shape so "4 candidate masks" reads clearly.
const MASKS: readonly (readonly number[])[] = [
  // token 0: blob, lower-left
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 2, 5, 7, 6, 3, 0, 0, 1,
    4, 8, 9, 8, 5, 1, 0, 1, 5, 9, 9, 8, 4, 1, 0, 0, 3, 7, 8, 6, 2, 0, 0, 0, 1,
    3, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  // token 1: ring / hollow center
  [
    0, 1, 3, 4, 4, 3, 1, 0, 1, 5, 6, 6, 6, 6, 5, 1, 3, 6, 2, 1, 1, 2, 6, 3, 4,
    6, 1, 0, 0, 1, 6, 4, 4, 6, 1, 0, 0, 1, 6, 4, 3, 6, 2, 1, 1, 2, 6, 3, 1, 5,
    6, 6, 6, 6, 5, 1, 0, 1, 3, 4, 4, 3, 1, 0,
  ],
  // token 1->2: vertical bar, right side
  [
    0, 0, 0, 0, 2, 6, 4, 0, 0, 0, 0, 0, 3, 8, 5, 0, 0, 0, 0, 1, 4, 9, 6, 1, 0,
    0, 0, 1, 4, 9, 6, 1, 0, 0, 0, 1, 4, 9, 6, 1, 0, 0, 0, 1, 4, 9, 6, 1, 0, 0,
    0, 0, 3, 8, 5, 0, 0, 0, 0, 0, 2, 6, 4, 0,
  ],
  // token 3: diagonal stripe
  [
    8, 6, 3, 1, 0, 0, 0, 0, 6, 9, 6, 3, 1, 0, 0, 0, 3, 6, 9, 6, 3, 1, 0, 0, 1,
    3, 6, 9, 6, 3, 1, 0, 0, 1, 3, 6, 9, 6, 3, 1, 0, 0, 1, 3, 6, 9, 6, 3, 0, 0,
    0, 1, 3, 6, 9, 6, 0, 0, 0, 0, 1, 3, 6, 9,
  ],
];

// 32-dim filter shown as 8 bars per token (sampled coefficients, -1..1 scaled).
const FILTERS: readonly (readonly number[])[] = [
  [0.7, -0.3, 0.5, 0.9, -0.6, 0.2, 0.8, -0.4],
  [-0.5, 0.8, -0.2, 0.6, 0.4, -0.7, 0.3, 0.9],
  [0.4, 0.6, -0.8, 0.3, 0.7, -0.5, -0.2, 0.6],
  [0.9, -0.7, 0.6, -0.4, 0.5, 0.8, -0.3, 0.2],
];

const TOKEN_COLORS: readonly { fill: string; stroke: string }[] = [
  { fill: C.blueFill, stroke: C.blue },
  { fill: C.greenFill, stroke: C.green },
  { fill: C.coralFill, stroke: C.coral },
  { fill: "#e7e3fa", stroke: C.violet },
];

export function VisHypernetworkMask() {
  const [token, setToken] = useState<number>(0);
  const [sweep, setSweep] = useState<number>(CELLS); // cells revealed (0..64)
  const [playing, setPlaying] = useState<boolean>(false);
  const frame = useRef<number>(CELLS);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      frame.current += 2;
      if (frame.current >= CELLS) {
        frame.current = CELLS;
        setSweep(CELLS);
        setPlaying(false);
        return;
      }
      setSweep(frame.current);
    }, 60);
    return () => clearInterval(id);
  }, [playing]);

  const startSweep = (): void => {
    frame.current = 0;
    setSweep(0);
    setPlaying(true);
  };

  const pickToken = (i: number): void => {
    setToken(i);
    setPlaying(false);
    frame.current = CELLS;
    setSweep(CELLS);
  };

  const mask = MASKS[token];
  const filt = FILTERS[token];
  const col = TOKEN_COLORS[token];

  // ---- layout ----
  const VB_W = 520;
  const VB_H = 380;

  // Mask token bar (left)
  const tokX = 24;
  const tokY = 96;

  // MLP glyph
  const mlpX = 96;
  const mlpY = 96;

  // Filter bars (8 coeffs)
  const filtX = 188;
  const filtTop = 80;
  const filtBarW = 9;
  const filtGap = 3;
  const filtMaxH = 30; // half-height

  // Feature grid + mask grid (right block)
  const gridSize = 152;
  const cell = gridSize / GRID;
  const maskX = 300;
  const featY = 80; // (feature grid sits behind / above conceptually, we draw mask grid)

  // For the upsampled-features mini panel above the mask grid.

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Hypernetwork mask generation: a mask token's MLP emits a 32-dim filter that is dot-producted across upsampled image features to paint a mask"
      >
        {/* Title band */}
        <text x={20} y={24} fontFamily={MONO} fontSize={13} fill={C.ink}>
          Hypernetwork Mask Generation
        </text>
        <text x={20} y={42} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          token -&gt; MLP -&gt; filter -&gt; dot over features -&gt; mask
        </text>

        {/* ---- Mask token (256-dim) ---- */}
        <text
          x={tokX + 14}
          y={tokY - 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
          textAnchor="middle"
        >
          token
        </text>
        <rect
          x={tokX}
          y={tokY}
          width={28}
          height={90}
          rx={3}
          fill={col.fill}
          stroke={col.stroke}
          strokeWidth={1.4}
        />
        <text
          x={tokX + 14}
          y={tokY + 108}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          256-d
        </text>

        {/* arrow token -> MLP */}
        <line
          x1={tokX + 28}
          y1={tokY + 45}
          x2={mlpX}
          y2={mlpY + 45}
          stroke={C.line}
          strokeWidth={1.4}
        />

        {/* ---- MLP glyph (3 small layers) ---- */}
        <text
          x={mlpX + 33}
          y={mlpY - 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
          textAnchor="middle"
        >
          MLP
        </text>
        {[0, 1, 2].map((k) => (
          <rect
            key={k}
            x={mlpX + k * 24}
            y={mlpY + (k === 1 ? 12 : 0)}
            width={14}
            height={k === 1 ? 66 : 90}
            rx={2}
            fill="var(--card)"
            stroke={C.ink}
            strokeWidth={1.2}
          />
        ))}
        <text
          x={mlpX + 33}
          y={mlpY + 108}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          ~8k params
        </text>

        {/* arrow MLP -> filter */}
        <line
          x1={mlpX + 62}
          y1={mlpY + 45}
          x2={filtX - 6}
          y2={mlpY + 45}
          stroke={C.line}
          strokeWidth={1.4}
        />

        {/* ---- 32-dim filter (8 bars) ---- */}
        <text
          x={filtX + (filtBarW + filtGap) * 4 - filtGap / 2}
          y={filtTop - 10}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
          textAnchor="middle"
        >
          filter (32-d)
        </text>
        {filt.map((v, i) => {
          const h = Math.abs(v) * filtMaxH;
          const x = filtX + i * (filtBarW + filtGap);
          const yMid = filtTop + filtMaxH;
          const y = v >= 0 ? yMid - h : yMid;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={filtBarW}
              height={Math.max(1, h)}
              rx={1}
              fill={col.fill}
              stroke={col.stroke}
              strokeWidth={1}
            />
          );
        })}
        {/* zero axis */}
        <line
          x1={filtX - 2}
          y1={filtTop + filtMaxH}
          x2={filtX + (filtBarW + filtGap) * 8 - filtGap + 2}
          y2={filtTop + filtMaxH}
          stroke={C.muted}
          strokeWidth={0.8}
        />
        <text
          x={filtX + (filtBarW + filtGap) * 4 - filtGap / 2}
          y={filtTop + filtMaxH * 2 + 16}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          dynamic weights
        </text>

        {/* arrow filter -> grid (dot product) */}
        <line
          x1={filtX + (filtBarW + filtGap) * 8 - filtGap}
          y1={filtTop + filtMaxH}
          x2={maskX - 6}
          y2={featY + 70}
          stroke={col.stroke}
          strokeWidth={1.4}
        />
        <text
          x={(filtX + (filtBarW + filtGap) * 8 + maskX) / 2 - 6}
          y={featY + 38}
          fontFamily={MONO}
          fontSize={8.5}
          fill={col.stroke}
          textAnchor="middle"
        >
          dot @
        </text>
        <text
          x={(filtX + (filtBarW + filtGap) * 8 + maskX) / 2 - 6}
          y={featY + 50}
          fontFamily={MONO}
          fontSize={8.5}
          fill={col.stroke}
          textAnchor="middle"
        >
          each pixel
        </text>

        {/* ---- mask grid (upsampled features painted into a mask) ---- */}
        <text
          x={maskX + gridSize / 2}
          y={featY - 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
          textAnchor="middle"
        >
          features (32,256,256) -&gt; mask
        </text>
        {/* grid cells */}
        {mask.map((v, idx) => {
          const r = Math.floor(idx / GRID);
          const c = idx % GRID;
          const revealed = idx < sweep;
          const a = Math.min(1, v / 9);
          return (
            <rect
              key={idx}
              x={maskX + c * cell}
              y={featY + r * cell}
              width={cell}
              height={cell}
              fill={revealed && a > 0.06 ? col.stroke : "var(--card)"}
              fillOpacity={revealed ? a : 0}
              stroke={C.grid}
              strokeWidth={0.5}
            />
          );
        })}
        {/* grid border */}
        <rect
          x={maskX}
          y={featY}
          width={gridSize}
          height={gridSize}
          fill="none"
          stroke={C.line}
          strokeWidth={1.4}
        />
        {/* sweep cursor (vertical scan line over current row) */}
        {sweep < CELLS &&
          (() => {
            const cur = Math.min(sweep, CELLS - 1);
            const cr = Math.floor(cur / GRID);
            const cc = cur % GRID;
            return (
              <rect
                x={maskX + cc * cell}
                y={featY + cr * cell}
                width={cell}
                height={cell}
                fill="none"
                stroke={C.ink}
                strokeWidth={1.6}
              />
            );
          })()}
        <text
          x={maskX + gridSize / 2}
          y={featY + gridSize + 16}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          256x256 mask logits
        </text>

        {/* ---- 4 candidate masks row (thumbnails) ---- */}
        <text x={20} y={272} fontFamily={MONO} fontSize={9} fill={C.ink}>
          4 mask tokens -&gt; 4 candidate masks:
        </text>
        {MASKS.map((m, ti) => {
          const thX = 24 + ti * 70;
          const thY = 282;
          const tcol = TOKEN_COLORS[ti];
          const thSize = 48;
          const tc = thSize / GRID;
          const active = ti === token;
          return (
            <g
              key={ti}
              onClick={() => pickToken(ti)}
              style={{ cursor: "pointer" }}
            >
              {m.map((v, idx) => {
                const r = Math.floor(idx / GRID);
                const c = idx % GRID;
                const a = Math.min(1, v / 9);
                return (
                  <rect
                    key={idx}
                    x={thX + c * tc}
                    y={thY + r * tc}
                    width={tc}
                    height={tc}
                    fill={a > 0.06 ? tcol.stroke : "var(--card)"}
                    fillOpacity={a}
                  />
                );
              })}
              <rect
                x={thX}
                y={thY}
                width={thSize}
                height={thSize}
                fill="none"
                stroke={active ? C.ink : C.line}
                strokeWidth={active ? 2 : 1}
              />
              <text
                x={thX + thSize / 2}
                y={thY + thSize + 12}
                fontFamily={MONO}
                fontSize={8.5}
                fill={active ? C.ink : C.muted}
                textAnchor="middle"
              >
                mask {ti}
              </text>
            </g>
          );
        })}

        {/* ---- param-count note (own band, right of thumbnails) ---- */}
        <text x={320} y={290} fontFamily={MONO} fontSize={9} fill={C.ink}>
          per token: ~8,000 params
        </text>
        <text x={320} y={306} fontFamily={MONO} fontSize={9} fill={C.muted}>
          vs emit 256x256 map
        </text>
        <text x={320} y={322} fontFamily={MONO} fontSize={9} fill={C.muted}>
          = 65,536 outputs.
        </text>

        {/* ---- caption band (bottom) ---- */}
        <text x={20} y={356} fontFamily={MONO} fontSize={9} fill={C.muted}>
          A mask token emits a tiny filter; dotting it against
        </text>
        <text x={20} y={370} fontFamily={MONO} fontSize={9} fill={C.muted}>
          upsampled features paints the mask: cheap, prompt-adaptive.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => pickToken(i)}
            aria-pressed={token === i}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              token === i
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            token {i}
          </button>
        ))}
        <button
          onClick={startSweep}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          sweep filter
        </button>
        <span className="font-mono text-[var(--muted)] tabular-nums">
          {playing
            ? `painting pixel ${Math.min(sweep, CELLS)} / ${CELLS}`
            : "showing full mask"}
        </span>
      </div>
    </div>
  );
}
