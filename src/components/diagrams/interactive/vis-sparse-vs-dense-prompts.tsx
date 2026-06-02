"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands (top -> bottom):
//   title        (0..30)
//   lane labels  (~48)
//   two lanes    (60..300)
//   caption band (320..354)
const VW = 560;
const VH = 360;

// --- Sparse lane (top) geometry ---
const SPARSE_Y = 70; // top of the sparse-lane content
// image panel where a user "draws" a point / box prompt
const IMG_X = 24;
const IMG_Y = SPARSE_Y;
const IMG_W = 96;
const IMG_H = 96;

// token sequence (right side of the sparse lane)
const TOK_X = 300;
const TOK_Y = SPARSE_Y + 6;
const TOK_W = 36;
const TOK_H = 22;
const TOK_GAP = 6;

// --- Dense lane (bottom) geometry ---
const DENSE_Y = 210;
// mask panel
const MASK_X = 24;
const MASK_Y = DENSE_Y;
const MASK_W = 96;
const MASK_H = 96;

// downsampled feature grid (4x4 stand-in for 64x64) and image-embedding grid
const FEAT_X = 300;
const FEAT_Y = DENSE_Y + 4;
const FEAT_CELL = 18;
const FEAT_N = 4;

const EMB_X = 430;
const EMB_Y = FEAT_Y;

type Toggles = {
  point: boolean;
  box: boolean;
  mask: boolean;
};

type PromptKind = "point" | "box" | "mask";

// Existing decoder tokens (always present), then prompt tokens get appended.
const BASE_TOKENS = 2;

// Hard-coded mask "rough" pixels (which of the 96x96 mask cells are on),
// expressed as a 6x6 boolean pattern; deterministic.
const MASK_PATTERN: boolean[][] = [
  [false, false, true, true, false, false],
  [false, true, true, true, true, false],
  [true, true, true, true, true, true],
  [true, true, true, true, true, true],
  [false, true, true, true, true, false],
  [false, false, true, true, false, false],
];

// Downsampled feature magnitudes (4x4), deterministic stand-in for conv output.
const FEAT_VALS: number[][] = [
  [0.1, 0.5, 0.6, 0.1],
  [0.4, 0.9, 0.9, 0.4],
  [0.5, 0.9, 0.9, 0.5],
  [0.1, 0.4, 0.5, 0.1],
];

// Base image-embedding magnitudes (4x4), deterministic.
const EMB_VALS: number[][] = [
  [0.3, 0.2, 0.2, 0.3],
  [0.2, 0.3, 0.3, 0.2],
  [0.3, 0.2, 0.2, 0.3],
  [0.2, 0.3, 0.3, 0.2],
];

export function VisSparseVsDensePrompts() {
  const [toggles, setToggles] = useState<Toggles>({
    point: true,
    box: false,
    mask: true,
  });

  const toggle = (k: PromptKind): void =>
    setToggles((t: Toggles) => ({ ...t, [k]: !t[k] }));

  // Sparse prompt tokens added to the sequence.
  const pointTokens = toggles.point ? 1 : 0;
  const boxTokens = toggles.box ? 2 : 0;
  const promptTokens = pointTokens + boxTokens;
  const totalTokens = BASE_TOKENS + promptTokens;

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  // token x given index
  const tokX = (i: number): number => TOK_X + i * (TOK_W + TOK_GAP);

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Sparse prompts (points and boxes) become a few 256-dim attention tokens appended to the SAM decoder's token sequence; a dense prompt (a mask) is conv-downsampled and added elementwise onto the image embedding before decoding."
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
          Sparse vs Dense Prompts
        </text>

        {/* ============ SPARSE LANE ============ */}
        <text
          x={IMG_X}
          y={SPARSE_Y - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.blue}
        >
          Sparse: points, boxes → tokens
        </text>

        {/* prompt image panel */}
        <rect
          x={IMG_X}
          y={IMG_Y}
          width={IMG_W}
          height={IMG_H}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {/* a soft object shape inside the panel */}
        <ellipse
          cx={IMG_X + IMG_W / 2}
          cy={IMG_Y + IMG_H / 2}
          rx={30}
          ry={26}
          fill={C.grid}
          stroke={C.line}
          strokeWidth={1}
        />
        {/* point prompt marker */}
        {toggles.point && (
          <g>
            <circle
              cx={IMG_X + 38}
              cy={IMG_Y + 44}
              r={5}
              fill={C.green}
              stroke="var(--background)"
              strokeWidth={1.5}
            />
          </g>
        )}
        {/* box prompt marker */}
        {toggles.box && (
          <g>
            <rect
              x={IMG_X + 22}
              y={IMG_Y + 24}
              width={52}
              height={48}
              rx={2}
              fill="none"
              stroke={C.violet}
              strokeWidth={1.6}
              strokeDasharray="4 3"
            />
            {/* two highlighted corners -> two tokens */}
            <circle cx={IMG_X + 22} cy={IMG_Y + 24} r={3.5} fill={C.violet} />
            <circle cx={IMG_X + 74} cy={IMG_Y + 72} r={3.5} fill={C.violet} />
          </g>
        )}

        {/* arrow from image to token sequence */}
        <line
          x1={IMG_X + IMG_W + 6}
          y1={IMG_Y + IMG_H / 2}
          x2={TOK_X - 10}
          y2={IMG_Y + IMG_H / 2}
          stroke={C.muted}
          strokeWidth={1.2}
          markerEnd="url(#arrow)"
        />
        <text
          x={(IMG_X + IMG_W + 6 + TOK_X - 10) / 2}
          y={IMG_Y + IMG_H / 2 - 18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          256-dim
        </text>
        <text
          x={(IMG_X + IMG_W + 6 + TOK_X - 10) / 2}
          y={IMG_Y + IMG_H / 2 - 6}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          embed
        </text>

        {/* token sequence header */}
        <text
          x={TOK_X}
          y={TOK_Y - 8}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          decoder token sequence
        </text>

        {/* base (existing) tokens */}
        {Array.from({ length: BASE_TOKENS }).map((_, i) => (
          <g key={`base-${i}`}>
            <rect
              x={tokX(i)}
              y={TOK_Y}
              width={TOK_W}
              height={TOK_H}
              rx={3}
              fill="var(--card)"
              stroke={C.line}
              strokeWidth={1}
            />
            <text
              x={tokX(i) + TOK_W / 2}
              y={TOK_Y + TOK_H / 2 + 3}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={8}
              fill={C.muted}
            >
              tok
            </text>
          </g>
        ))}

        {/* appended point token */}
        {toggles.point &&
          Array.from({ length: pointTokens }).map((_, i) => {
            const idx = BASE_TOKENS + i;
            return (
              <g key={`pt-${i}`}>
                <rect
                  x={tokX(idx)}
                  y={TOK_Y}
                  width={TOK_W}
                  height={TOK_H}
                  rx={3}
                  fill={C.greenFill}
                  stroke={C.green}
                  strokeWidth={1.4}
                />
                <text
                  x={tokX(idx) + TOK_W / 2}
                  y={TOK_Y + TOK_H / 2 + 3}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={8}
                  fill={C.green}
                >
                  pt
                </text>
              </g>
            );
          })}

        {/* appended box tokens (exactly two corner tokens) */}
        {toggles.box &&
          Array.from({ length: boxTokens }).map((_, i) => {
            const idx = BASE_TOKENS + pointTokens + i;
            return (
              <g key={`bx-${i}`}>
                <rect
                  x={tokX(idx)}
                  y={TOK_Y}
                  width={TOK_W}
                  height={TOK_H}
                  rx={3}
                  fill={C.grid}
                  stroke={C.violet}
                  strokeWidth={1.4}
                />
                <text
                  x={tokX(idx) + TOK_W / 2}
                  y={TOK_Y + TOK_H / 2 + 3}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={8}
                  fill={C.violet}
                >
                  {i === 0 ? "c1" : "c2"}
                </text>
              </g>
            );
          })}

        {/* token count readout (own clear spot below the sequence) */}
        <text
          x={TOK_X}
          y={TOK_Y + TOK_H + 20}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
        >
          {BASE_TOKENS} base + {promptTokens} prompt = {totalTokens} tokens
        </text>
        <text
          x={TOK_X}
          y={TOK_Y + TOK_H + 34}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          enter the decoder via attention
        </text>

        {/* divider between lanes */}
        <line
          x1={12}
          y1={186}
          x2={VW - 12}
          y2={186}
          stroke={C.line}
          strokeWidth={1}
          strokeDasharray="3 4"
        />

        {/* ============ DENSE LANE ============ */}
        <text
          x={MASK_X}
          y={DENSE_Y - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.coral}
        >
          Dense: mask → added to image features
        </text>

        {/* mask panel (6x6 rough mask) */}
        <rect
          x={MASK_X}
          y={MASK_Y}
          width={MASK_W}
          height={MASK_H}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {MASK_PATTERN.map((rowArr, r) =>
          rowArr.map((on, c) => {
            const cw = MASK_W / 6;
            const ch = MASK_H / 6;
            return (
              <rect
                key={`m-${r}-${c}`}
                x={MASK_X + c * cw}
                y={MASK_Y + r * ch}
                width={cw}
                height={ch}
                fill={toggles.mask && on ? C.coralFill : "var(--card)"}
                stroke={C.grid}
                strokeWidth={0.5}
              />
            );
          }),
        )}
        <text
          x={MASK_X + MASK_W / 2}
          y={MASK_Y + MASK_H + 14}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          256×256 mask
        </text>

        {/* conv-downsample arrow */}
        <line
          x1={MASK_X + MASK_W + 6}
          y1={MASK_Y + MASK_H / 2}
          x2={FEAT_X - 10}
          y2={FEAT_Y + (FEAT_CELL * FEAT_N) / 2}
          stroke={C.muted}
          strokeWidth={1.2}
          markerEnd="url(#arrow)"
        />
        <text
          x={(MASK_X + MASK_W + 6 + FEAT_X - 10) / 2}
          y={MASK_Y + MASK_H / 2 - 16}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          convs ↓
        </text>
        <text
          x={(MASK_X + MASK_W + 6 + FEAT_X - 10) / 2}
          y={MASK_Y + MASK_H / 2 - 4}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          (256,64,64)
        </text>

        {/* downsampled feature grid */}
        {FEAT_VALS.map((rowArr, r) =>
          rowArr.map((v, c) => (
            <rect
              key={`f-${r}-${c}`}
              x={FEAT_X + c * FEAT_CELL}
              y={FEAT_Y + r * FEAT_CELL}
              width={FEAT_CELL}
              height={FEAT_CELL}
              fill={
                toggles.mask
                  ? `color-mix(in srgb, ${C.coral} ${Math.round(v * 70)}%, var(--card))`
                  : "var(--card)"
              }
              stroke={C.line}
              strokeWidth={0.6}
            />
          )),
        )}
        <text
          x={FEAT_X + (FEAT_CELL * FEAT_N) / 2}
          y={FEAT_Y + FEAT_CELL * FEAT_N + 14}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          mask feats
        </text>

        {/* plus sign between feature grid and embedding grid */}
        <text
          x={(FEAT_X + FEAT_CELL * FEAT_N + EMB_X) / 2}
          y={FEAT_Y + (FEAT_CELL * FEAT_N) / 2 + 5}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={16}
          fill={toggles.mask ? C.coral : C.muted}
        >
          +
        </text>

        {/* image embedding grid (sum target) */}
        {EMB_VALS.map((rowArr, r) =>
          rowArr.map((base, c) => {
            const added = toggles.mask ? FEAT_VALS[r][c] : 0;
            const v = Math.min(1, base + added);
            return (
              <rect
                key={`e-${r}-${c}`}
                x={EMB_X + c * FEAT_CELL}
                y={EMB_Y + r * FEAT_CELL}
                width={FEAT_CELL}
                height={FEAT_CELL}
                fill={`color-mix(in srgb, ${C.blue} ${Math.round(v * 70)}%, var(--card))`}
                stroke={C.line}
                strokeWidth={0.6}
              />
            );
          }),
        )}
        <text
          x={EMB_X + (FEAT_CELL * FEAT_N) / 2}
          y={EMB_Y + FEAT_CELL * FEAT_N + 14}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          image embed
        </text>

        {/* per-pixel note */}
        <text
          x={FEAT_X}
          y={FEAT_Y + FEAT_CELL * FEAT_N + 28}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
        >
          {toggles.mask
            ? "added elementwise, per-pixel — no tokens"
            : "no mask: image embed unchanged"}
        </text>

        {/* Caption band */}
        <text
          x={VW / 2}
          y={338}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Local prompts (points, boxes) become attention tokens;
        </text>
        <text
          x={VW / 2}
          y={352}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          a global prompt (mask) is added straight onto the image features.
        </text>

        {/* arrowhead marker */}
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.muted} />
          </marker>
        </defs>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={
            toggles.point
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => toggle("point")}
        >
          point
        </button>
        <button
          type="button"
          className={btn}
          style={
            toggles.box
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => toggle("box")}
        >
          box
        </button>
        <button
          type="button"
          className={btn}
          style={
            toggles.mask
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => toggle("mask")}
        >
          mask
        </button>
      </div>
    </div>
  );
}
