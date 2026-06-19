"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Four tokens of the example sentence.
const TOKENS: string[] = ["I", "like", "this", "girl"];
const N = TOKENS.length;

// d_k for the scaling node. sqrt(d_k) is the divisor.
const D_K = 64;
const SQRT_DK = Math.sqrt(D_K); // 8

// Hard-coded raw dot-product scores Q_i . K_j (the QK^T matrix, pre-scaling).
// Row i = query token i, column j = key token j. Larger = more aligned.
// Designed so "like" (row 1) aligns most strongly with "girl" (col 3).
const RAW: number[][] = [
  [40, 18, 12, 10], // I
  [14, 36, 16, 52], // like  -> strong with "girl"
  [10, 20, 44, 22], // this
  [12, 30, 18, 50], // girl
];

// Softmax of a row, optionally scaled by 1/sqrt(d_k).
function softmaxRow(row: number[], scaled: boolean): number[] {
  const div = scaled ? SQRT_DK : 1;
  const z = row.map((v) => v / div);
  const m = Math.max(...z);
  const ex = z.map((v) => Math.exp(v - m));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map((v) => v / s);
}

// --- Geometry (viewBox 560 x 470) ---
const W = 560;
const H = 470;

// Stage-1 token column (left): x_i -> Q/K/V.
const TOK_X = 26; // left edge of token boxes
const TOK_W = 58;
const TOK_H = 26;
const TOK_GAP = 14;
const TOK_Y0 = 96; // top of first token box
const tokY = (i: number): number => TOK_Y0 + i * (TOK_H + TOK_GAP);
const tokCY = (i: number): number => tokY(i) + TOK_H / 2;

// Q/K/V chips to the right of each token.
const QKV_X = TOK_X + TOK_W + 16;
const QKV_W = 56;
const QKV_H = 16;

// Heatmap grid (center-right): rows = query token i, cols = key token j.
const CELL = 42;
const GRID_X = 250; // left edge of cells (after row labels)
const GRID_Y = 118; // top edge of cells (after col labels)
const cellX = (j: number): number => GRID_X + j * CELL;
const cellY = (i: number): number => GRID_Y + i * CELL;

// Output column (far right): the weighted blend of values.
const OUT_X = GRID_X + N * CELL + 34;
const OUT_W = 48;
const OUT_H = 26;

// Map an attention weight in [0,1] to a heat fill (light -> blue).
function heatFill(w: number): string {
  const t = Math.max(0, Math.min(1, w));
  // interpolate between blueFill (#dde3f8) and blue (#3f5fd6)
  const a = [0xdd, 0xe3, 0xf8];
  const b = [0x3f, 0x5f, 0xd6];
  const ch = a.map((c, k) => Math.round(c + (b[k] - c) * t));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

export function TfSelfAttention() {
  const [sel, setSel] = useState<number>(1); // selected query token (default "like")
  const [scaled, setScaled] = useState<boolean>(true);
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);

  // Attention weights per row, given the current scaling toggle.
  const weights: number[][] = RAW.map((row) => softmaxRow(row, scaled));

  // Read-out string for the band below the grid.
  const readout: string =
    hover != null
      ? `${TOKENS[hover.i]} -> ${TOKENS[hover.j]} : ${weights[hover.i][hover.j].toFixed(2)} (token "${TOKENS[hover.i]}" attends to "${TOKENS[hover.j]}")`
      : `row "${TOKENS[sel]}" highlighted, click a token to query it, hover a cell for its weight`;

  // Stroke width for weighted arrows from the selected query token.
  const arrowW = (w: number): number => 0.6 + w * 9;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Scaled dot-product self-attention: each of four tokens (I, like, this, girl) projects to query, key and value vectors; Q times K transpose is scaled by one over sqrt of d_k, softmaxed per row into an attention-weight heatmap, then multiplied by V to produce output representations."
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={22}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Scaled Dot-Product Self-Attention
        </text>

        {/* Formula band (its own clear horizontal band, below title) */}
        <text
          x={W / 2}
          y={46}
          fontFamily={MONO}
          fontSize={12}
          fill={C.violet}
          fontWeight={600}
          textAnchor="middle"
        >
          {"Attention(Q,K,V) = softmax( Q Kᵀ / √dₖ ) V"}
        </text>
        <line
          x1={20}
          y1={60}
          x2={W - 20}
          y2={60}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* ---- Stage 1: tokens fan out to Q,K,V ---- */}
        <text
          x={TOK_X}
          y={80}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="start"
        >
          1. x_i &#8594; Q,K,V
        </text>
        {TOKENS.map((tok: string, i: number) => {
          const active = i === sel;
          return (
            <g key={`tok${i}`}>
              {/* token embedding box */}
              <rect
                x={TOK_X}
                y={tokY(i)}
                width={TOK_W}
                height={TOK_H}
                rx={5}
                fill={active ? C.coralFill : "var(--card)"}
                stroke={active ? C.coral : C.ink}
                strokeWidth={active ? 2 : 1.3}
                style={{ cursor: "pointer" }}
                onClick={() => setSel(i)}
              />
              <text
                x={TOK_X + TOK_W / 2}
                y={tokCY(i) + 4}
                fontFamily={MONO}
                fontSize={10.5}
                fill={active ? C.coral : C.ink}
                textAnchor="middle"
                fontWeight={600}
                style={{ cursor: "pointer", pointerEvents: "none" }}
              >
                {tok}
              </text>
              {/* connector into the Q/K/V chip */}
              <line
                x1={TOK_X + TOK_W}
                y1={tokCY(i)}
                x2={QKV_X}
                y2={tokCY(i)}
                stroke={C.line}
                strokeWidth={1}
              />
              {/* Q K V chip showing the three projections via W_Q,W_K,W_V */}
              <rect
                x={QKV_X}
                y={tokCY(i) - QKV_H / 2}
                width={QKV_W}
                height={QKV_H}
                rx={3}
                fill="var(--card)"
                stroke={C.line}
                strokeWidth={1}
              />
              <text
                x={QKV_X + QKV_W / 2}
                y={tokCY(i) + 3.5}
                fontFamily={MONO}
                fontSize={9}
                fill={C.muted}
                textAnchor="middle"
              >
                {`Q·K·V`}
              </text>
            </g>
          );
        })}
        {/* matrices label under the Q/K/V chips */}
        <text
          x={QKV_X + QKV_W / 2}
          y={tokY(N - 1) + TOK_H + 18}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          W_Q W_K W_V
        </text>

        {/* Weighted attention arrows from the selected query token to each
            key token's row position. Drawn before the grid so labels stay
            on top. Thicker = stronger attention. */}
        {TOKENS.map((_t: string, j: number) => {
          const w = weights[sel][j];
          const x1 = QKV_X + QKV_W + 4;
          const y1 = tokCY(sel);
          const x2 = GRID_X - 6;
          const y2 = cellY(j) + CELL / 2;
          const active = w === Math.max(...weights[sel]);
          return (
            <line
              key={`aw${j}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={active ? C.blue : C.muted}
              strokeWidth={arrowW(w)}
              strokeLinecap="round"
              opacity={0.55}
            />
          );
        })}

        {/* ---- Stage 2-4: the n x n attention heatmap ---- */}
        {/* stage caption above grid */}
        <text
          x={GRID_X}
          y={GRID_Y - 30}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="start"
        >
          2. Q K&#7488;{"   "}3. &#247; &#8730;d&#8342;{"   "}4. softmax row &#8594; weights
        </text>

        {/* column header label */}
        <text
          x={GRID_X + (N * CELL) / 2}
          y={GRID_Y - 14}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          key token j &#8594;
        </text>

        {/* column token labels (clear of the cells, above them) */}
        {TOKENS.map((tok: string, j: number) => (
          <text
            key={`col${j}`}
            x={cellX(j) + CELL / 2}
            y={GRID_Y - 3}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.ink}
            textAnchor="middle"
          >
            {tok}
          </text>
        ))}

        {/* row token labels (clear of the cells, to their left) */}
        {TOKENS.map((tok: string, i: number) => {
          const active = i === sel;
          return (
            <text
              key={`row${i}`}
              x={GRID_X - 12}
              y={cellY(i) + CELL / 2 + 3.5}
              fontFamily={MONO}
              fontSize={9.5}
              fill={active ? C.coral : C.ink}
              fontWeight={active ? 600 : 400}
              textAnchor="end"
              style={{ cursor: "pointer" }}
              onClick={() => setSel(i)}
            >
              {tok}
            </text>
          );
        })}
        {/* vertical "query token i" label, rotated, left of row labels */}
        <text
          x={GRID_X - 56}
          y={GRID_Y + (N * CELL) / 2}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
          transform={`rotate(-90 ${GRID_X - 56} ${GRID_Y + (N * CELL) / 2})`}
        >
          query token i &#8595;
        </text>

        {/* heatmap cells */}
        {weights.map((row: number[], i: number) =>
          row.map((w: number, j: number) => {
            const rowSel = i === sel;
            const isHover = hover != null && hover.i === i && hover.j === j;
            return (
              <g key={`cell${i}-${j}`}>
                <rect
                  x={cellX(j)}
                  y={cellY(i)}
                  width={CELL}
                  height={CELL}
                  fill={heatFill(w)}
                  stroke={
                    isHover ? C.ink : rowSel ? C.coral : "var(--card)"
                  }
                  strokeWidth={isHover ? 2 : rowSel ? 2 : 1}
                  opacity={rowSel || hover == null ? 1 : 0.78}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHover({ i, j })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSel(i)}
                />
                <text
                  x={cellX(j) + CELL / 2}
                  y={cellY(i) + CELL / 2 + 3.5}
                  fontFamily={MONO}
                  fontSize={10}
                  fill={w > 0.5 ? "var(--card)" : C.ink}
                  textAnchor="middle"
                  fontWeight={isHover ? 700 : 400}
                  style={{ pointerEvents: "none" }}
                >
                  {w.toFixed(2)}
                </text>
              </g>
            );
          }),
        )}

        {/* "= 1" annotation: rows sum to 1 (to the right of each row) */}
        {weights.map((_row: number[], i: number) => (
          <text
            key={`sum${i}`}
            x={GRID_X + N * CELL + 6}
            y={cellY(i) + CELL / 2 + 3.5}
            fontFamily={MONO}
            fontSize={8.5}
            fill={i === sel ? C.coral : C.muted}
            textAnchor="start"
          >
            &#931;=1
          </text>
        ))}

        {/* ---- Stage 5: weights x V -> outputs ---- */}
        <text
          x={OUT_X + OUT_W / 2}
          y={GRID_Y - 14}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          5. &#215; V
        </text>
        {TOKENS.map((_t: string, i: number) => {
          const active = i === sel;
          const oy = cellY(i) + (CELL - OUT_H) / 2;
          return (
            <g key={`out${i}`}>
              <rect
                x={OUT_X}
                y={oy}
                width={OUT_W}
                height={OUT_H}
                rx={4}
                fill={active ? C.greenFill : "var(--card)"}
                stroke={active ? C.green : C.ink}
                strokeWidth={active ? 2 : 1.2}
              />
              <text
                x={OUT_X + OUT_W / 2}
                y={oy + OUT_H / 2 + 3.5}
                fontFamily={MONO}
                fontSize={9.5}
                fill={active ? C.green : C.ink}
                textAnchor="middle"
                fontWeight={600}
              >
                {`z${i + 1}`}
              </text>
            </g>
          );
        })}
        {/* outputs caption */}
        <text
          x={OUT_X + OUT_W / 2}
          y={cellY(N - 1) + CELL + 14}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          outputs
        </text>

        {/* ---- Read-out band (its own clear band, below the drawing) ---- */}
        <line
          x1={20}
          y1={H - 46}
          x2={W - 20}
          y2={H - 46}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={W / 2}
          y={H - 28}
          fontFamily={MONO}
          fontSize={10}
          fill={hover != null ? C.blue : C.ink}
          textAnchor="middle"
        >
          {readout}
        </text>
        <text
          x={W / 2}
          y={H - 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {scaled
            ? `scaling ON: logits divided by √dₖ = ${SQRT_DK} (softmax stays soft)`
            : "scaling OFF: raw logits (softmax sharpens toward one-hot)"}
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">query token:</span>
        {TOKENS.map((tok: string, i: number) => (
          <button
            key={tok}
            type="button"
            onClick={() => setSel(i)}
            aria-pressed={sel === i}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={sel === i ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {tok}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setScaled((s) => !s)}
          aria-pressed={scaled}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={scaled ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {scaled ? "scaling: on" : "scaling: off"}
        </button>
      </div>

      <p className="mt-2 font-mono text-xs text-[var(--muted)]">
        Every token queries every token, scales, softmaxes, then pulls a
        weighted blend of values.
      </p>
    </div>
  );
}
