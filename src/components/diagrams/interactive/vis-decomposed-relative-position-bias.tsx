"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..26) | subtitle (40) | patch grid + decomposed tables (60..250) |
//   computation readout band (262..308) | caption band (322..342)
const VW = 520;
const VH = 348;

// A small GRID x GRID patch map standing in for the image patches.
const GRID = 4;
const CELL = 30;
const GAP = 4;
const MAP_X = 26;
const MAP_Y = 70;

// Deterministic 1D relative-bias tables, indexed by offset (delta + (GRID-1)).
// Offsets range over [-(GRID-1) .. +(GRID-1)] -> 2*GRID-1 = 7 entries each.
const REL_H: number[] = [-0.6, -0.3, 0.1, 0.5, 0.2, -0.2, -0.5];
const REL_W: number[] = [0.4, 0.2, -0.1, 0.6, -0.3, -0.4, -0.7];

// For the "naive" cost: a real window of 127x127 patches needs a full
// (2*127-1) x (2*127-1) table of biases per head.
const WINDOW = 127;
const NAIVE = (2 * WINDOW - 1) * (2 * WINDOW - 1); // 64009 -> "~16,000"-class
const DECOMP = 2 * (2 * WINDOW - 1); // 506

const cellX = (col: number): number => MAP_X + col * (CELL + GAP);
const cellY = (row: number): number => MAP_Y + row * (CELL + GAP);

interface Pos {
  r: number;
  c: number;
}

const fmt = (v: number): string => (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1));

export function VisRelativePositionBias() {
  // Query cell (fixed-ish, user-selectable) and key cell.
  const [query, setQuery] = useState<Pos>({ r: 1, c: 1 });
  const [key, setKey] = useState<Pos>({ r: 2, c: 3 });
  const [pick, setPick] = useState<"query" | "key">("key");

  const dh = key.r - query.r; // delta_h
  const dw = key.c - query.c; // delta_w
  const idxH = dh + (GRID - 1);
  const idxW = dw + (GRID - 1);
  const biasH = REL_H[idxH];
  const biasW = REL_W[idxW];
  const bias = biasH + biasW;

  const score = 1.7; // illustrative raw QK^T/sqrt(d) score
  const biased = score + bias;

  const onCell = (r: number, c: number): void => {
    if (pick === "query") setQuery({ r, c });
    else setKey({ r, c });
  };

  // 1D table geometry (decomposed tables on the right).
  const TAB_X = 250;
  const TW = 32; // table cell width
  const TH = 24; // table cell height
  const TGAP = 2;
  const hTabY = MAP_Y + 4;
  const wTabY = hTabY + TH + 56;
  const tabCount = 2 * GRID - 1;
  const tabCellX = (i: number): number => TAB_X + i * (TW + TGAP);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Decomposed relative position bias: an H by W bias table is built from a small height-offset table plus a small width-offset table. Pick a query patch and a key patch; their row offset and column offset index the two tables, and the summed bias is added to the attention score before softmax."
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
          Decomposed Relative Position Bias
        </text>

        {/* Section labels */}
        <text
          x={MAP_X}
          y={MAP_Y - 12}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          patch map (query → key)
        </text>
        <text
          x={TAB_X}
          y={MAP_Y - 12}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          decomposed bias tables
        </text>

        {/* Patch grid */}
        {Array.from({ length: GRID }).map((_, r) =>
          Array.from({ length: GRID }).map((__, c) => {
            const isQ = query.r === r && query.c === c;
            const isK = key.r === r && key.c === c;
            const stroke = isQ ? C.blue : isK ? C.coral : C.line;
            const fill = isQ ? C.blueFill : isK ? C.coralFill : "var(--card)";
            return (
              <g key={`p-${r}-${c}`}>
                <rect
                  x={cellX(c)}
                  y={cellY(r)}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isQ || isK ? 1.8 : 1}
                  style={{ cursor: "pointer" }}
                  onClick={() => onCell(r, c)}
                />
                {(isQ || isK) && (
                  <text
                    x={cellX(c) + CELL / 2}
                    y={cellY(r) + CELL / 2 + 3.5}
                    textAnchor="middle"
                    fontFamily={MONO}
                    fontSize={10}
                    fill={isQ ? C.blue : C.coral}
                  >
                    {isQ ? "Q" : "K"}
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* Offset readout under the grid */}
        <text
          x={MAP_X}
          y={cellY(GRID - 1) + CELL + 18}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.ink}
        >
          Δh = {dh >= 0 ? `+${dh}` : dh}, Δw = {dw >= 0 ? `+${dw}` : dw}
        </text>
        <text
          x={MAP_X}
          y={cellY(GRID - 1) + CELL + 32}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          (row offset, col offset)
        </text>

        {/* rel_h table */}
        <text
          x={TAB_X}
          y={hTabY - 4}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.blue}
        >
          rel_h(Δh)
        </text>
        {REL_H.map((v, i) => {
          const sel = i === idxH;
          return (
            <g key={`h-${i}`}>
              <rect
                x={tabCellX(i)}
                y={hTabY}
                width={TW}
                height={TH}
                rx={3}
                fill={sel ? C.blueFill : "var(--card)"}
                stroke={sel ? C.blue : C.line}
                strokeWidth={sel ? 1.6 : 1}
              />
              <text
                x={tabCellX(i) + TW / 2}
                y={hTabY + TH / 2 + 3}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={8.5}
                fill={sel ? C.ink : C.muted}
              >
                {fmt(v)}
              </text>
            </g>
          );
        })}
        {/* rel_h offset axis labels */}
        <text
          x={tabCellX(0) + TW / 2}
          y={hTabY + TH + 11}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          −{GRID - 1}
        </text>
        <text
          x={tabCellX(tabCount - 1) + TW / 2}
          y={hTabY + TH + 11}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          +{GRID - 1}
        </text>

        {/* rel_w table */}
        <text
          x={TAB_X}
          y={wTabY - 4}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.coral}
        >
          rel_w(Δw)
        </text>
        {REL_W.map((v, i) => {
          const sel = i === idxW;
          return (
            <g key={`w-${i}`}>
              <rect
                x={tabCellX(i)}
                y={wTabY}
                width={TW}
                height={TH}
                rx={3}
                fill={sel ? C.coralFill : "var(--card)"}
                stroke={sel ? C.coral : C.line}
                strokeWidth={sel ? 1.6 : 1}
              />
              <text
                x={tabCellX(i) + TW / 2}
                y={wTabY + TH / 2 + 3}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={8.5}
                fill={sel ? C.ink : C.muted}
              >
                {fmt(v)}
              </text>
            </g>
          );
        })}
        <text
          x={tabCellX(0) + TW / 2}
          y={wTabY + TH + 11}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          −{GRID - 1}
        </text>
        <text
          x={tabCellX(tabCount - 1) + TW / 2}
          y={wTabY + TH + 11}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          +{GRID - 1}
        </text>

        {/* Param-count readout (own clear spot, right of the tables area top) */}
        <text
          x={MAP_X}
          y={cellY(GRID - 1) + CELL + 48}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          naive HxW table: {NAIVE.toLocaleString()} params/head
        </text>
        <text
          x={MAP_X}
          y={cellY(GRID - 1) + CELL + 61}
          fontFamily={MONO}
          fontSize={9}
          fill={C.green}
        >
          decomposed H+W: {DECOMP} params (98% fewer)
        </text>

        {/* Computation band */}
        <line
          x1={12}
          y1={270}
          x2={VW - 12}
          y2={270}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={VW / 2}
          y={286}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={11}
          fill={C.ink}
        >
          bias(Δh,Δw) = rel_h({fmt(biasH)}) + rel_w({fmt(biasW)}) = {fmt(bias)}
        </text>
        <text
          x={VW / 2}
          y={304}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={11}
          fill={C.violet}
        >
          score + bias = {score.toFixed(1)} {fmt(bias)} = {biased.toFixed(1)}
          {"  →  softmax"}
        </text>

        {/* Caption band */}
        <text
          x={VW / 2}
          y={320}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Split the relative bias into independent height and width parts:
        </text>
        <text
          x={VW / 2}
          y={334}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          same idea, 98% fewer parameters.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono">click a cell to set:</span>
        <button
          type="button"
          className={btn}
          style={
            pick === "query"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => setPick("query")}
        >
          Query (Q)
        </button>
        <button
          type="button"
          className={btn}
          style={
            pick === "key"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => setPick("key")}
        >
          Key (K)
        </button>
      </div>
    </div>
  );
}
