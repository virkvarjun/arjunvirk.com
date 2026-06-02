"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..28) | controls hint via buttons | towers band (44..300) |
//   readout band (312..392) | mini params chart shares right side |
//   caption (470..500)
const VW = 600;
const VH = 512;

type SizeId = "base" | "large" | "huge";

type Model = {
  id: SizeId;
  label: string;
  layers: number;
  hidden: number;
  heads: number;
  mlp: number;
  paramsM: number; // total params in millions
  accent: string;
  fill: string;
};

// Hard-coded ViT configurations (ViT paper).
const MODELS: Model[] = [
  {
    id: "base",
    label: "ViT-Base",
    layers: 12,
    hidden: 768,
    heads: 12,
    mlp: 3072,
    paramsM: 86,
    accent: C.blue,
    fill: C.blueFill,
  },
  {
    id: "large",
    label: "ViT-Large",
    layers: 24,
    hidden: 1024,
    heads: 16,
    mlp: 4096,
    paramsM: 307,
    accent: C.green,
    fill: C.greenFill,
  },
  {
    id: "huge",
    label: "ViT-Huge",
    layers: 32,
    hidden: 1280,
    heads: 16,
    mlp: 5120,
    paramsM: 632,
    accent: C.coral,
    fill: C.coralFill,
  },
];

// Tower band geometry.
const TOWER_TOP = 52; // top of tallest tower drawing
const TOWER_BOTTOM = 270; // baseline where all towers sit
const TOWER_H = TOWER_BOTTOM - TOWER_TOP; // 218
const MAX_LAYERS = 32;
const MIN_W = 30; // width at hidden=768 scaled
const COL_CX = [108, 250, 392]; // centre x of each tower

// Map a hidden dim to a tower width (proportional).
const towerW = (hidden: number): number => (hidden / 1280) * 84;

// Approx share of params in the MLP blocks (~2/3 in transformers).
// MLP weights per layer ~ 2 * hidden * mlp ; attention ~ 4 * hidden^2.
const mlpShare = (m: Model): number => {
  const attn = 4 * m.hidden * m.hidden;
  const mlp = 2 * m.hidden * m.mlp;
  return mlp / (attn + mlp);
};

// Mini params chart geometry (right band, below towers area is busy, so place
// the chart in the readout band's right portion).
const CHART_X = 360;
const CHART_Y = 396;
const CHART_W = 220;
const CHART_H = 88;

export function VisVitSizes() {
  const [sel, setSel] = useState<SizeId>("base");
  const [showMlp, setShowMlp] = useState<boolean>(true);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const model: Model = MODELS.find((m) => m.id === sel) ?? MODELS[0];
  const perHead = Math.round(model.hidden / model.heads);
  const mlpPct = Math.round(mlpShare(model) * 100);
  const attnPct = 100 - mlpPct;

  // Chart: params (M) vs width. Use sqrt-ish scaling for x positions by hidden.
  const maxParams = 632;
  const chartPt = (m: Model): { x: number; y: number } => {
    const fx = (m.hidden - 700) / (1280 - 700); // 0..1 across the three
    const fy = m.paramsM / maxParams;
    return {
      x: CHART_X + 18 + fx * (CHART_W - 34),
      y: CHART_Y + CHART_H - 8 - fy * (CHART_H - 22),
    };
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="ViT size comparison: Base, Large, and Huge shown as stacked-block towers with width proportional to hidden dimension, labeled with layers, heads, MLP size, and total parameters. Selecting a size highlights its tower and shows per-head dimension and where its parameters live, plus a chart of parameters growing super-linearly with width."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={20}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          ViT Sizes: Base / Large / Huge
        </text>

        {/* Baseline under towers */}
        <line
          x1={24}
          y1={TOWER_BOTTOM + 1}
          x2={476}
          y2={TOWER_BOTTOM + 1}
          stroke={C.grid}
          strokeWidth={1}
        />

        {/* Towers */}
        {MODELS.map((m, i) => {
          const cx = COL_CX[i];
          const w = towerW(m.hidden);
          const active = sel === m.id;
          const op = active ? 1 : 0.55;
          // height proportional to layer count
          const h = (m.layers / MAX_LAYERS) * TOWER_H;
          const top = TOWER_BOTTOM - h;
          // number of drawn blocks (cap for clarity), each = a few layers
          const blocks = m.layers === 12 ? 6 : m.layers === 24 ? 8 : 8;
          const blockH = h / blocks;
          const x = cx - w / 2;
          // MLP portion of each block (visual share)
          const share = mlpShare(m);
          return (
            <g
              key={m.id}
              onClick={() => setSel(m.id)}
              style={{ cursor: "pointer" }}
              opacity={op}
            >
              {/* highlight halo for selected */}
              {active && (
                <rect
                  x={x - 5}
                  y={top - 5}
                  width={w + 10}
                  height={h + 10}
                  rx={6}
                  fill={m.fill}
                  opacity={0.5}
                />
              )}
              {Array.from({ length: blocks }).map((_, k) => {
                const by = top + k * blockH;
                const mlpH = blockH * share;
                return (
                  <g key={k}>
                    {/* attention slab */}
                    <rect
                      x={x}
                      y={by}
                      width={w}
                      height={blockH - mlpH - 0.6}
                      fill="var(--card)"
                      stroke={active ? m.accent : C.line}
                      strokeWidth={active ? 1.1 : 0.8}
                    />
                    {/* MLP slab (4x hidden) */}
                    <rect
                      x={x}
                      y={by + (blockH - mlpH)}
                      width={w}
                      height={mlpH - 0.6}
                      fill={showMlp ? m.fill : "var(--card)"}
                      stroke={active ? m.accent : C.line}
                      strokeWidth={active ? 1.1 : 0.8}
                    />
                  </g>
                );
              })}
              {/* label under tower */}
              <text
                x={cx}
                y={TOWER_BOTTOM + 16}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={11}
                fill={active ? m.accent : C.ink}
              >
                {m.label}
              </text>
              <text
                x={cx}
                y={TOWER_BOTTOM + 29}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={9}
                fill={C.muted}
              >
                {m.layers}L · d={m.hidden}
              </text>
              <text
                x={cx}
                y={TOWER_BOTTOM + 41}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={9}
                fill={C.muted}
              >
                {m.paramsM}M params
              </text>
            </g>
          );
        })}

        {/* width-proportional caption near top of towers */}
        <text
          x={250}
          y={44}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          width ∝ hidden dim · height ∝ layers · filled = MLP (4×d)
        </text>

        {/* ---- Patterns band (left of readout) ---- */}
        <text
          x={24}
          y={332}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          Three patterns
        </text>
        <text x={24} y={348} fontFamily={MONO} fontSize={9} fill={C.muted}>
          • MLP dim = 4 × hidden dim
        </text>
        <text x={24} y={362} fontFamily={MONO} fontSize={9} fill={C.muted}>
          • d divisible by heads → per-head = d/h
        </text>
        <text x={24} y={376} fontFamily={MONO} fontSize={9} fill={C.muted}>
          • params grow ~quadratically with width
        </text>

        {/* ---- Readout band (selected size) ---- */}
        <rect
          x={16}
          y={392}
          width={332}
          height={92}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={28}
          y={410}
          fontFamily={MONO}
          fontSize={11}
          fill={model.accent}
        >
          {model.label}
        </text>
        <text x={28} y={426} fontFamily={MONO} fontSize={9} fill={C.ink}>
          layers {model.layers} · d {model.hidden} · heads {model.heads}
        </text>
        <text x={28} y={440} fontFamily={MONO} fontSize={9} fill={C.ink}>
          MLP {model.mlp} = 4 × {model.hidden}
        </text>
        <text x={28} y={454} fontFamily={MONO} fontSize={9} fill={C.ink}>
          per-head dim = {model.hidden}/{model.heads} = {perHead}
        </text>
        <text x={28} y={468} fontFamily={MONO} fontSize={9} fill={C.ink}>
          params {model.paramsM}M · MLPs hold ~{mlpPct}%
        </text>
        <text x={28} y={480} fontFamily={MONO} fontSize={8} fill={C.muted}>
          (attention ~{attnPct}%, rest in embeds/norms)
        </text>

        {/* ---- Mini params chart ---- */}
        <text
          x={CHART_X}
          y={388}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
        >
          params vs width
        </text>
        {/* axes */}
        <line
          x1={CHART_X + 14}
          y1={CHART_Y + 4}
          x2={CHART_X + 14}
          y2={CHART_Y + CHART_H - 8}
          stroke={C.line}
          strokeWidth={1}
        />
        <line
          x1={CHART_X + 14}
          y1={CHART_Y + CHART_H - 8}
          x2={CHART_X + CHART_W - 6}
          y2={CHART_Y + CHART_H - 8}
          stroke={C.line}
          strokeWidth={1}
        />
        {/* super-linear curve through the three points */}
        <polyline
          points={MODELS.map((m) => {
            const p = chartPt(m);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke={C.muted}
          strokeWidth={1.2}
        />
        {MODELS.map((m) => {
          const p = chartPt(m);
          const active = sel === m.id;
          return (
            <g key={`pt-${m.id}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? 4 : 3}
                fill={active ? m.accent : "var(--card)"}
                stroke={m.accent}
                strokeWidth={1.2}
              />
              {active && (
                <text
                  x={p.x}
                  y={p.y - 7}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={8}
                  fill={m.accent}
                >
                  {m.paramsM}M
                </text>
              )}
            </g>
          );
        })}
        <text
          x={CHART_X + CHART_W - 6}
          y={CHART_Y + CHART_H + 4}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          width →
        </text>

        {/* Caption band */}
        <text
          x={VW / 2}
          y={502}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Wider and deeper, MLPs 4× the hidden dim — params balloon quadratically with width.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={btn}
            style={
              sel === m.id
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setSel(m.id)}
          >
            {m.label}
          </button>
        ))}
        <button
          type="button"
          className={btn}
          style={
            showMlp ? { background: C.ink, color: "var(--background)" } : undefined
          }
          onClick={() => setShowMlp((s: boolean) => !s)}
        >
          Highlight MLPs
        </button>
      </div>
    </div>
  );
}
