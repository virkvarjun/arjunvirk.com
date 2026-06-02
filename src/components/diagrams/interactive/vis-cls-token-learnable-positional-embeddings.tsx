"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// ---- Static, deterministic data (no random/date at module load) ----

// The patch-token sequence we draw. Real ViT has 196 patch tokens; we draw a
// compact run of 6 plus the prepended [CLS], and label the count in text.
const SEQ_LEN = 6; // visible patch tokens drawn
const TOTAL_TOKENS = 197; // 196 patches + 1 CLS (shown in caption text)

// Sequence cells: index 0 is CLS, the rest are patch tokens.
interface SeqCell {
  label: string;
  isCls: boolean;
}
const SEQUENCE: SeqCell[] = [
  { label: "CLS", isCls: true },
  { label: "p1", isCls: false },
  { label: "p2", isCls: false },
  { label: "p3", isCls: false },
  { label: "p4", isCls: false },
  { label: "p5", isCls: false },
  { label: "p6", isCls: false },
];

// 2D positional-embedding heatmap: a small 7x7 sketch standing in for the
// learned 14x14 grid topology. Clicking a cell lights its spatial neighbors.
const GRID = 7;
// Precomputed neighbor lookup is implicit (Chebyshev distance <= 1).

// ---- Geometry ----

const VIEW_W = 520;
const VIEW_H = 490;

// Sequence row band.
const SEQ_X = 40; // left edge of first cell
const SEQ_Y = 92; // top edge of sequence cells
const SEQ_CELL = 46; // cell width
const SEQ_GAP = 8; // gap between cells
const SEQ_H = 40; // cell height
const SEQ_STEP = SEQ_CELL + SEQ_GAP;

// Positional embedding tag row (just below sequence cells).
const POS_Y = SEQ_Y + SEQ_H + 30; // top of "+pos_i" tags

// Heatmap band (lower portion).
const HM_CELL = 22;
const HM_W = GRID * HM_CELL;
const HM_X = (VIEW_W - HM_W) / 2 - 60; // left edge, shifted left for readout
const HM_Y = 248;

export function VisClsTokenPosEmbed() {
  const [hoverCls, setHoverCls] = useState<boolean>(false);
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);

  const cellX = (i: number): number => SEQ_X + i * SEQ_STEP;

  // Is grid cell (r,c) a spatial neighbor of the selected cell?
  const isNeighbor = (r: number, c: number): boolean => {
    if (!sel) return false;
    const dr = Math.abs(r - sel.r);
    const dc = Math.abs(c - sel.c);
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
  };

  // Readout line for the heatmap interaction.
  const heatReadout: string = sel
    ? `pos (${sel.r},${sel.c}) is closest to its 8 grid neighbors`
    : "click a position to see its nearest learned neighbors";

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="A prepended CLS token plus learnable positional embeddings added to every token; the learned position vectors recover a 2D grid topology"
      >
        {/* ---- Title band ---- */}
        <text
          x={VIEW_W / 2}
          y={26}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          CLS Token + Learnable Positional Embeddings
        </text>

        {/* ---- Sub-band: what the row shows ---- */}
        <text
          x={VIEW_W / 2}
          y={48}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          {`[CLS] prepended -> 1 + 196 = ${TOTAL_TOKENS} tokens, each gets +pos_i`}
        </text>

        {/* ============ REGION 1: token sequence with CLS ============ */}
        <g>
          {SEQUENCE.map((cell: SeqCell, i: number) => {
            const x = cellX(i);
            const clsActive = cell.isCls && hoverCls;
            const fill = cell.isCls
              ? clsActive
                ? C.coral
                : C.coralFill
              : C.blueFill;
            const stroke = cell.isCls ? C.coral : C.blue;
            const textFill = clsActive ? "var(--background)" : C.ink;
            return (
              <g
                key={cell.label}
                onMouseEnter={cell.isCls ? () => setHoverCls(true) : undefined}
                onMouseLeave={cell.isCls ? () => setHoverCls(false) : undefined}
                style={cell.isCls ? { cursor: "pointer" } : undefined}
              >
                <rect
                  x={x}
                  y={SEQ_Y}
                  width={SEQ_CELL}
                  height={SEQ_H}
                  rx={5}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={cell.isCls ? 1.8 : 1.2}
                />
                <text
                  x={x + SEQ_CELL / 2}
                  y={SEQ_Y + SEQ_H / 2 + 4}
                  fontFamily={MONO}
                  fontSize={cell.isCls ? 11 : 11}
                  fill={textFill}
                  textAnchor="middle"
                  fontWeight={cell.isCls ? 600 : 400}
                >
                  {cell.isCls ? "[CLS]" : cell.label}
                </text>
              </g>
            );
          })}

          {/* "..." marker after the visible patch run */}
          <text
            x={cellX(SEQ_LEN) + SEQ_CELL + 10}
            y={SEQ_Y + SEQ_H / 2 + 4}
            fontFamily={MONO}
            fontSize={12}
            fill={C.muted}
            textAnchor="start"
          >
            ...
          </text>

          {/* position index labels above each cell (0..6) */}
          {SEQUENCE.map((cell: SeqCell, i: number) => (
            <text
              key={`idx-${cell.label}`}
              x={cellX(i) + SEQ_CELL / 2}
              y={SEQ_Y - 8}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
              textAnchor="middle"
            >
              {i}
            </text>
          ))}
        </g>

        {/* ============ REGION 2: +pos_i tags added to every token ============ */}
        <g>
          {SEQUENCE.map((cell: SeqCell, i: number) => {
            const x = cellX(i);
            return (
              <g key={`pos-${cell.label}`}>
                {/* plus sign between cell and pos tag */}
                <text
                  x={x + SEQ_CELL / 2}
                  y={SEQ_Y + SEQ_H + 16}
                  fontFamily={MONO}
                  fontSize={12}
                  fill={C.green}
                  textAnchor="middle"
                >
                  +
                </text>
                <rect
                  x={x + 3}
                  y={POS_Y}
                  width={SEQ_CELL - 6}
                  height={22}
                  rx={4}
                  fill={C.greenFill}
                  stroke={C.green}
                  strokeWidth={1}
                />
                <text
                  x={x + SEQ_CELL / 2}
                  y={POS_Y + 15}
                  fontFamily={MONO}
                  fontSize={10}
                  fill={C.ink}
                  textAnchor="middle"
                >
                  {`pos${i}`}
                </text>
              </g>
            );
          })}

          {/* label for the positional-embedding row */}
          <text
            x={cellX(SEQ_LEN) + SEQ_CELL + 10}
            y={POS_Y + 15}
            fontFamily={MONO}
            fontSize={9}
            fill={C.green}
            textAnchor="start"
          >
            learnable
          </text>
        </g>

        {/* ============ REGION 3: CLS attention readout band ============ */}
        <g>
          {/* attention arrows from patches into CLS when hovered */}
          {hoverCls &&
            SEQUENCE.map((cell: SeqCell, i: number) => {
              if (cell.isCls) return null;
              const x = cellX(i) + SEQ_CELL / 2;
              const clsX = cellX(0) + SEQ_CELL / 2;
              return (
                <line
                  key={`att-${cell.label}`}
                  x1={x}
                  y1={SEQ_Y - 2}
                  x2={clsX + 6}
                  y2={SEQ_Y - 2}
                  stroke={C.coral}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              );
            })}

          <text
            x={VIEW_W / 2}
            y={POS_Y + 50}
            fontFamily={MONO}
            fontSize={10}
            fill={hoverCls ? C.coral : C.muted}
            textAnchor="middle"
          >
            {hoverCls
              ? "every patch writes into [CLS] via attention -> global summary"
              : "hover [CLS]: every patch writes into it; its final state classifies"}
          </text>
        </g>

        {/* ============ REGION 4: learned 2D positional heatmap ============ */}
        <g>
          <text
            x={HM_X + HM_W / 2}
            y={HM_Y - 12}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            learned pos-embedding similarity
          </text>

          {Array.from({ length: GRID }).map((_, r: number) =>
            Array.from({ length: GRID }).map((__, c: number) => {
              const isSel = sel !== null && sel.r === r && sel.c === c;
              const nb = isNeighbor(r, c);
              const fill = isSel
                ? C.violet
                : nb
                  ? C.blueFill
                  : sel
                    ? "var(--card)"
                    : "var(--card)";
              const stroke = isSel ? C.violet : nb ? C.blue : C.line;
              return (
                <rect
                  key={`hm-${r}-${c}`}
                  x={HM_X + c * HM_CELL}
                  y={HM_Y + r * HM_CELL}
                  width={HM_CELL}
                  height={HM_CELL}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSel || nb ? 1.4 : 0.8}
                  onClick={() => setSel({ r, c })}
                  style={{ cursor: "pointer" }}
                />
              );
            }),
          )}

          {/* axis hint below the grid */}
          <text
            x={HM_X + HM_W / 2}
            y={HM_Y + HM_W + 16}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
          >
            14x14 grid recovered from a 1D scheme
          </text>
        </g>

        {/* ============ REGION 5: heatmap readout (right of grid) ============ */}
        <g>
          {/* legend swatches */}
          <rect
            x={HM_X + HM_W + 22}
            y={HM_Y + 6}
            width={12}
            height={12}
            fill={C.violet}
            stroke={C.violet}
            strokeWidth={1}
          />
          <text
            x={HM_X + HM_W + 40}
            y={HM_Y + 16}
            fontFamily={MONO}
            fontSize={9}
            fill={C.ink}
            textAnchor="start"
          >
            selected
          </text>
          <rect
            x={HM_X + HM_W + 22}
            y={HM_Y + 28}
            width={12}
            height={12}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1}
          />
          <text
            x={HM_X + HM_W + 40}
            y={HM_Y + 38}
            fontFamily={MONO}
            fontSize={9}
            fill={C.ink}
            textAnchor="start"
          >
            neighbors
          </text>
        </g>

        {/* ---- Heatmap readout line (own band, below grid) ---- */}
        <text
          x={VIEW_W / 2}
          y={HM_Y + HM_W + 38}
          fontFamily={MONO}
          fontSize={9.5}
          fill={sel ? C.violet : C.muted}
          textAnchor="middle"
        >
          {heatReadout}
        </text>

        {/* ============ Caption band (bottom) ============ */}
        <text
          x={VIEW_W / 2}
          y={VIEW_H - 22}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          A prepended [CLS] token gathers a global summary;
        </text>
        <text
          x={VIEW_W / 2}
          y={VIEW_H - 8}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          learnable position vectors recover the 2D grid on their own.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setHoverCls(true)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={hoverCls ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          show CLS attention
        </button>
        <button
          type="button"
          onClick={() => setSel({ r: 3, c: 3 })}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          highlight center pos
        </button>
        <button
          type="button"
          onClick={() => {
            setHoverCls(false);
            setSel(null);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
        <span className="font-mono text-[var(--muted)]">
          Click a heatmap cell to light its neighbors.
        </span>
      </div>
    </div>
  );
}
