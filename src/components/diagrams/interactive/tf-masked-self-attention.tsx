"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Masked (causal) self-attention. An n x n score grid over the tokens
// "I like this girl": rows = query token, cols = key token. The upper
// triangle (key is in the future of the query) is masked to -inf, which
// becomes 0 after softmax. A step button reveals one query row at a time
// (left-to-right generation); a toggle lifts the mask to show "cheating".

const TOKENS = ["I", "like", "this", "girl"] as const;
const N = TOKENS.length;

// Geometry --------------------------------------------------------------
const CELL = 46;
const GAP = 4;
const STEP = CELL + GAP; // 50
const MAT_X = 116; // left edge of the grid
const MAT_Y = 74; // top edge of the grid
const GRID_W = N * STEP - GAP; // 196
const GRID_BOTTOM = MAT_Y + N * STEP - GAP; // 270

export function TfMaskedAttention() {
  // How many query rows are "generated" / revealed (0..N). Start fully shown.
  const [revealed, setRevealed] = useState<number>(N);
  const [masked, setMasked] = useState<boolean>(true);

  const step = () => setRevealed((r) => (r >= N ? N : r + 1));
  const reset = () => setRevealed(0);

  return (
    <div>
      <svg
        viewBox="0 0 460 372"
        className="h-auto w-full"
        role="img"
        aria-label="Masked self-attention: a causal attention grid where the upper triangle is masked to negative infinity"
      >
        {/* Title band */}
        <text
          x={230}
          y={24}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Masked Self-Attention
        </text>

        {/* Axis hint labels (kept clear of the cells) */}
        <text x={MAT_X + GRID_W / 2} y={46} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          key (attend to)
        </text>
        <text
          x={28}
          y={MAT_Y + GRID_W / 2}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
          transform={`rotate(-90 28 ${MAT_Y + GRID_W / 2})`}
        >
          query (token)
        </text>

        {/* Column token labels, above the grid */}
        {TOKENS.map((t, k) => (
          <text
            key={`col-${k}`}
            x={MAT_X + k * STEP + CELL / 2}
            y={MAT_Y - 8}
            fontSize={11}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {t}
          </text>
        ))}

        {/* Row token labels, left of the grid */}
        {TOKENS.map((t, j) => (
          <text
            key={`row-${j}`}
            x={MAT_X - 10}
            y={MAT_Y + j * STEP + CELL / 2 + 4}
            fontSize={11}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="end"
          >
            {t}
          </text>
        ))}

        {/* Grid cells */}
        {TOKENS.map((_, j) =>
          TOKENS.map((__, k) => {
            const x = MAT_X + k * STEP;
            const y = MAT_Y + j * STEP;
            const isFuture = k > j; // key after query -> masked region
            const rowVisible = j < revealed;

            // Visual state per cell.
            let fill: string = "var(--card)";
            let fillOpacity = 1;
            let stroke: string = C.line;
            let strokeWidth = 1;
            let dash: string | undefined;
            let glyph = "";
            let glyphFill: string = C.ink;

            if (!rowVisible) {
              // Not yet generated: faint placeholder.
              fill = "var(--card)";
              stroke = C.line;
              strokeWidth = 1;
              dash = "3 3";
              glyph = "";
            } else if (isFuture && masked) {
              // Blocked future cell.
              fill = C.coralFill;
              fillOpacity = 1;
              stroke = C.coral;
              strokeWidth = 1;
              glyph = "0";
              glyphFill = C.coral;
            } else {
              // Allowed cell (or unmasked future when toggle is off).
              fill = isFuture ? C.greenFill : C.blueFill;
              fillOpacity = 1;
              stroke = isFuture ? C.green : C.blue;
              strokeWidth = isFuture ? 1.4 : 1;
              dash = isFuture ? "3 3" : undefined; // unmasked future stands out
              glyph = "•";
              glyphFill = isFuture ? C.green : C.blue;
            }

            return (
              <g key={`c-${j}-${k}`}>
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={4}
                  fill={fill}
                  fillOpacity={fillOpacity}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dash}
                />
                {glyph && (
                  <text
                    x={x + CELL / 2}
                    y={y + CELL / 2 + (glyph === "•" ? 6 : 4)}
                    fontSize={glyph === "•" ? 16 : 12}
                    fill={glyphFill}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    {glyph}
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* Legend band, in its own clear space below the grid */}
        <g>
          {/* allowed swatch */}
          <rect x={MAT_X} y={GRID_BOTTOM + 18} width={14} height={14} rx={3} fill={C.blueFill} stroke={C.blue} />
          <text
            x={MAT_X + 20}
            y={GRID_BOTTOM + 29}
            fontSize={10}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="start"
          >
            allowed: self + earlier tokens
          </text>

          {/* blocked swatch */}
          <rect x={MAT_X} y={GRID_BOTTOM + 40} width={14} height={14} rx={3} fill={C.coralFill} stroke={C.coral} />
          <text
            x={MAT_X + 20}
            y={GRID_BOTTOM + 51}
            fontSize={10}
            fill={C.coral}
            fontFamily={MONO}
            textAnchor="start"
          >
            -inf -&gt; 0 after softmax (future, blocked)
          </text>
        </g>

        {/* Status readout, top-right, clear of everything */}
        <text x={452} y={24} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="end">
          {masked
            ? revealed >= N
              ? "all tokens generated"
              : revealed === 0
                ? "press step to generate"
                : `generated up to "${TOKENS[revealed - 1]}"`
            : "mask OFF, model can cheat"}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={step}
          disabled={revealed >= N}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-40"
        >
          step
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
        <button
          type="button"
          onClick={() => setMasked((m) => !m)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={masked ? undefined : { background: C.ink, color: "var(--background)" }}
        >
          {masked ? "mask: ON" : "mask: OFF"}
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Block the future with a -inf mask so the model learns to predict, not
        copy.
      </p>
    </div>
  );
}
