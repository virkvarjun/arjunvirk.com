"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..28) | drawing/grid (56..256 at max batch) |
//   direction label (~274) | formula band (296) | caption band (314..330)
const VW = 480;
const VH = 344;

// Grid geometry. Columns are fixed features; rows are batch examples.
const COLS = 4;
const MAX_ROWS = 6;
const CELL = 30;
const GAP = 4;
const GRID_X = 30; // left of grid
const GRID_Y = 56; // top of grid

// Fixed activation values (deterministic, no Math.random at runtime).
// Indexed [row][col]; we use the first `rows` rows.
const DATA: number[][] = [
  [1.2, -0.4, 0.8, 0.1],
  [-0.7, 1.5, 0.2, -1.1],
  [0.5, 0.3, -1.3, 0.9],
  [-1.4, 0.6, 1.1, 0.4],
  [0.9, -1.2, 0.3, 1.3],
  [0.2, 0.7, -0.6, -0.8],
];

const cellX = (col: number) => GRID_X + col * (CELL + GAP);
const cellY = (row: number) => GRID_Y + row * (CELL + GAP);

type Mode = "layer" | "batch";

function meanStd(vals: number[]): { mu: number; sigma: number } {
  const n = vals.length;
  const mu = vals.reduce((a, b) => a + b, 0) / n;
  const variance = vals.reduce((a, b) => a + (b - mu) * (b - mu), 0) / n;
  return { mu, sigma: Math.sqrt(variance) };
}

export function TfLayerNorm() {
  const [mode, setMode] = useState<Mode>("layer");
  const [rows, setRows] = useState<number>(4);

  // Highlight a representative row (for layer norm) and column (for batch norm).
  const selRow = Math.min(1, rows - 1);
  const selCol = 1;

  const gridW = COLS * CELL + (COLS - 1) * GAP;
  const gridH = rows * CELL + (rows - 1) * GAP;

  // Stats: layer norm over a single row's features (batch-size independent);
  // batch norm over a single column across the current batch.
  const rowVals = DATA[selRow].slice(0, COLS);
  const colVals = DATA.slice(0, rows).map((r) => r[selCol]);
  const layerStat = meanStd(rowVals);
  const batchStat = meanStd(colVals);

  const isLayer = mode === "layer";
  const stat = isLayer ? layerStat : batchStat;

  // Batch norm gets unstable at small batch sizes: sigma estimate is noisy and
  // a tiny batch makes the std a poor estimate. Flag instability for rows < 3.
  const batchUnstable = rows < 3;

  // Right-side readout panel position.
  const panelX = GRID_X + gridW + 26;

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Layer normalization normalizes across one token's features (a row); batch normalization normalizes across the batch (a column). A batch-size slider shows batch norm's statistics becoming unstable at small batch sizes while layer norm is unaffected."
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
          Layer Normalization vs Batch Normalization
        </text>

        {/* Axis labels for the grid */}
        <text
          x={GRID_X + gridW / 2}
          y={GRID_Y - 8}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          features →
        </text>
        <text
          x={GRID_X - 10}
          y={GRID_Y + gridH / 2}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          transform={`rotate(-90 ${GRID_X - 10} ${GRID_Y + gridH / 2})`}
        >
          batch ↓
        </text>

        {/* Highlight band BEHIND the cells: a row (layer) or a column (batch) */}
        {isLayer ? (
          <rect
            x={cellX(0) - 3}
            y={cellY(selRow) - 3}
            width={gridW + 6}
            height={CELL + 6}
            rx={4}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1.6}
          />
        ) : (
          <rect
            x={cellX(selCol) - 3}
            y={cellY(0) - 3}
            width={CELL + 6}
            height={gridH + 6}
            rx={4}
            fill={C.coralFill}
            stroke={C.coral}
            strokeWidth={1.6}
          />
        )}

        {/* Grid cells */}
        {DATA.slice(0, rows).map((rowArr, r) =>
          rowArr.slice(0, COLS).map((v, c) => {
            const inSel = isLayer ? r === selRow : c === selCol;
            const accent = isLayer ? C.blue : C.coral;
            return (
              <g key={`${r}-${c}`}>
                <rect
                  x={cellX(c)}
                  y={cellY(r)}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill="var(--card)"
                  stroke={inSel ? accent : C.line}
                  strokeWidth={inSel ? 1.4 : 1}
                />
                <text
                  x={cellX(c) + CELL / 2}
                  y={cellY(r) + CELL / 2 + 3}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={9}
                  fill={inSel ? C.ink : C.muted}
                >
                  {v.toFixed(1)}
                </text>
              </g>
            );
          }),
        )}

        {/* Direction label, clearly separated from the grid */}
        <text
          x={GRID_X}
          y={cellY(rows - 1) + CELL + 18}
          textAnchor="start"
          fontFamily={MONO}
          fontSize={9.5}
          fill={isLayer ? C.blue : C.coral}
        >
          {isLayer
            ? "normalize across a row (one token's features)"
            : "normalize across a column (one feature, whole batch)"}
        </text>

        {/* Right readout panel: mu / sigma for the selected direction */}
        <text
          x={panelX}
          y={GRID_Y + 4}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          {isLayer ? "Layer Norm stats" : "Batch Norm stats"}
        </text>
        <text
          x={panelX}
          y={GRID_Y + 22}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
        >
          μ = {stat.mu.toFixed(2)}
        </text>
        <text
          x={panelX}
          y={GRID_Y + 38}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
        >
          σ = {stat.sigma.toFixed(2)}
        </text>
        <text
          x={panelX}
          y={GRID_Y + 54}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
        >
          over {isLayer ? `${COLS} features` : `${rows} examples`}
        </text>

        {/* Stability note for batch norm at small batch sizes */}
        {!isLayer && (
          <text
            x={panelX}
            y={GRID_Y + 76}
            fontFamily={MONO}
            fontSize={9}
            fill={batchUnstable ? C.coral : C.green}
          >
            {batchUnstable ? "⚠ unstable: tiny batch" : "stable estimate"}
          </text>
        )}
        {isLayer && (
          <text
            x={panelX}
            y={GRID_Y + 76}
            fontFamily={MONO}
            fontSize={9}
            fill={C.green}
          >
            batch-size independent
          </text>
        )}

        {/* Formula band (own clear horizontal band below the drawing) */}
        <text
          x={VW / 2}
          y={296}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={11}
          fill={C.ink}
        >
          y = γ·(x − μ)/√(σ² + ε) + β
        </text>

        {/* Caption band */}
        <text
          x={VW / 2}
          y={318}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Layer norm normalizes across one token&apos;s features —
        </text>
        <text
          x={VW / 2}
          y={332}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          batch-size independent, generation-friendly.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={isLayer ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setMode("layer")}
        >
          Layer Norm
        </button>
        <button
          type="button"
          className={btn}
          style={!isLayer ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setMode("batch")}
        >
          Batch Norm
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono">batch size</span>
          <input
            type="range"
            min={1}
            max={MAX_ROWS}
            step={1}
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{rows}</span>
        </label>
      </div>
    </div>
  );
}
