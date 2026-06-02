"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Swin's shifted-window attention. An 8x8 grid of patches is partitioned
// into 4x4 windows; attention runs only WITHIN each window (linear cost).
// On alternating layers the window partition is SHIFTED by half a window
// (here 2 patches) so patches that sat in different windows now share one,
// letting information cross the old boundaries. A toggle flips between the
// regular partition (layer L) and the shifted one (layer L+1) and lights up
// a tracked patch together with the new neighbours it can suddenly attend to.

const GRID = 8; // 8x8 patches
const WIN = 4; // 4x4 window
const SHIFT = WIN / 2; // shift by half a window = 2 patches

// Geometry -------------------------------------------------------------
const CELL = 26;
const GX = 28; // grid left
const GY = 76; // grid top
const GRID_PX = GRID * CELL; // 208
const VB_W = 470;
const VB_H = 392;

// Tracked patch (row, col) in patch coordinates.
const TRACK_R = 3;
const TRACK_C = 3;

// Window index of a patch given a shift offset. With shift s, the window
// boundaries move; cells outside the shifted lattice still belong to a
// partial window. We compute a window id from floor((coord + s) / WIN).
function winId(r: number, c: number, s: number): string {
  const wr = Math.floor((r + s) / WIN);
  const wc = Math.floor((c + s) / WIN);
  return `${wr}-${wc}`;
}

export function VisSwinShiftedWindow() {
  // false = layer L (regular partition), true = layer L+1 (shifted).
  const [shifted, setShifted] = useState<boolean>(false);

  const s = shifted ? SHIFT : 0;
  const trackWin = winId(TRACK_R, TRACK_C, s);

  // Window boundary lines for the current (possibly shifted) partition.
  // Vertical lines at x = GX + k*WIN*CELL - s*CELL, clipped to grid.
  const vLines: number[] = [];
  const hLines: number[] = [];
  for (let k = -1; k <= GRID / WIN + 1; k++) {
    const pos = k * WIN - s;
    if (pos > 0 && pos < GRID) {
      vLines.push(pos);
      hLines.push(pos);
    }
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Swin shifted-window attention: an 8 by 8 patch grid partitioned into windows; toggling the layer shifts the partition by half a window so a tracked patch gains neighbours across the old window boundary"
      >
        {/* Title band */}
        <text
          x={VB_W / 2}
          y={24}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Swin&apos;s Shifted-Window Attention
        </text>

        {/* Layer readout (its own band, above the grid) */}
        <text x={GX} y={50} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="start">
          {shifted ? "Layer L+1: shifted partition" : "Layer L: regular partition"}
        </text>
        <text x={GX} y={64} fontSize={9.5} fill={C.muted} fontFamily={MONO} textAnchor="start">
          {shifted
            ? "windows moved by half a window (2 patches)"
            : "attention runs only within each 4x4 window"}
        </text>

        {/* Patch grid ---------------------------------------------------- */}
        {Array.from({ length: GRID }, (_, r) =>
          Array.from({ length: GRID }, (__, c) => {
            const x = GX + c * CELL;
            const y = GY + r * CELL;
            const cellWin = winId(r, c, s);
            const sameWinAsTrack = cellWin === trackWin;
            const isTrack = r === TRACK_R && c === TRACK_C;

            // In layer L the tracked patch's window; in L+1 cells now sharing
            // its (shifted) window that did NOT share it in layer L.
            const sharedInL = winId(r, c, 0) === winId(TRACK_R, TRACK_C, 0);
            const newNeighbor = shifted && sameWinAsTrack && !sharedInL && !isTrack;

            let fill: string = "var(--card)";
            let stroke: string = C.line;
            let strokeWidth = 1;

            if (isTrack) {
              fill = C.violet;
              stroke = C.violet;
            } else if (newNeighbor) {
              fill = C.greenFill;
              stroke = C.green;
              strokeWidth = 1.3;
            } else if (sameWinAsTrack) {
              fill = C.blueFill;
              stroke = C.blue;
            }

            return (
              <rect
                key={`p-${r}-${c}`}
                x={x + 0.5}
                y={y + 0.5}
                width={CELL - 1}
                height={CELL - 1}
                rx={2}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
            );
          }),
        )}

        {/* Window boundary lines (thick) over the grid */}
        {vLines.map((p, i) => (
          <line
            key={`v-${i}`}
            x1={GX + p * CELL}
            y1={GY}
            x2={GX + p * CELL}
            y2={GY + GRID_PX}
            stroke={C.ink}
            strokeWidth={2}
          />
        ))}
        {hLines.map((p, i) => (
          <line
            key={`h-${i}`}
            x1={GX}
            y1={GY + p * CELL}
            x2={GX + GRID_PX}
            y2={GY + p * CELL}
            stroke={C.ink}
            strokeWidth={2}
          />
        ))}
        {/* Outer border */}
        <rect
          x={GX}
          y={GY}
          width={GRID_PX}
          height={GRID_PX}
          rx={2}
          fill="none"
          stroke={C.ink}
          strokeWidth={2}
        />

        {/* Right-hand panel: legend + hierarchy + complexity ------------- */}
        {/* Legend */}
        <g>
          <rect x={266} y={GY + 2} width={13} height={13} rx={2} fill={C.violet} stroke={C.violet} />
          <text x={284} y={GY + 12} fontSize={9.5} fill={C.ink} fontFamily={MONO} textAnchor="start">
            tracked patch
          </text>

          <rect x={266} y={GY + 22} width={13} height={13} rx={2} fill={C.blueFill} stroke={C.blue} />
          <text x={284} y={GY + 32} fontSize={9.5} fill={C.ink} fontFamily={MONO} textAnchor="start">
            its window
          </text>

          <rect x={266} y={GY + 42} width={13} height={13} rx={2} fill={C.greenFill} stroke={C.green} />
          <text x={284} y={GY + 52} fontSize={9.5} fill={C.ink} fontFamily={MONO} textAnchor="start">
            new neighbours
          </text>
        </g>

        {/* Hierarchical stages strip */}
        <text x={266} y={GY + 78} fontSize={10} fill={C.ink} fontFamily={MONO} textAnchor="start" fontWeight={600}>
          Hierarchy
        </text>
        {[
          { label: "S1", res: "H/4", ch: "C", w: 30 },
          { label: "S2", res: "H/8", ch: "2C", w: 22 },
          { label: "S3", res: "H/16", ch: "4C", w: 15 },
        ].map((st, i) => {
          const bx = 266 + i * 44;
          const by = GY + 110;
          return (
            <g key={`stage-${i}`}>
              <rect
                x={bx}
                y={by + (30 - st.w)}
                width={st.w}
                height={st.w}
                rx={2}
                fill={C.blueFill}
                stroke={C.blue}
              />
              <text x={bx + st.w / 2} y={by + 46} fontSize={9} fill={C.ink} fontFamily={MONO} textAnchor="middle">
                {st.res}
              </text>
              <text x={bx + st.w / 2} y={by + 58} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
                {st.ch}
              </text>
            </g>
          );
        })}
        <text x={266} y={GY + 188} fontSize={8.5} fill={C.muted} fontFamily={MONO} textAnchor="start">
          res halves, channels double
        </text>

        {/* Complexity readout band (below the grid, full clear band) ----- */}
        <line x1={GX} y1={GY + GRID_PX + 18} x2={VB_W - 18} y2={GY + GRID_PX + 18} stroke={C.line} strokeWidth={1} />
        <text x={GX} y={GY + GRID_PX + 38} fontSize={10} fill={C.ink} fontFamily={MONO} textAnchor="start" fontWeight={600}>
          Cost vs full ViT
        </text>
        <text x={GX} y={GY + GRID_PX + 54} fontSize={9.5} fill={C.blue} fontFamily={MONO} textAnchor="start">
          Swin: O(M^2 . HW) -- linear in image size HW
        </text>
        <text x={GX} y={GY + GRID_PX + 68} fontSize={9.5} fill={C.coral} fontFamily={MONO} textAnchor="start">
          ViT: O((HW)^2) -- quadratic in image size
        </text>
        <text x={GX} y={GY + GRID_PX + 82} fontSize={8.5} fill={C.muted} fontFamily={MONO} textAnchor="start">
          M = window size; HW = number of patches
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setShifted((v: boolean) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={shifted ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {shifted ? "layer: L+1 (shifted)" : "layer: L (regular)"}
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {shifted ? "new neighbours unlocked" : "windows isolated"}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Local windows for cheap attention, shifted each layer so information
        still spreads &mdash; linear cost, global reach over depth.
      </p>
    </div>
  );
}
