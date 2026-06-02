"use client";

import { useCallback, useRef, useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..28) | feature grid + RoI (44..300) |
//   readout band (~320..348) | caption band (360..390)
const VW = 520;
const VH = 396;

// Feature-map grid: GRID x GRID integer cells.
const GRID = 8; // 8x8 feature map
const CELL = 28; // px per feature cell
const GRID_X = 28; // left edge of grid
const GRID_Y = 48; // top edge of grid
const GRID_PX = GRID * CELL; // 224

// The RoI is described in fractional feature-map coordinates [0..GRID].
// Position is the top-left corner; size is fixed. Hard-coded default that is
// deliberately fractional so RoI Pool's snapping is visible immediately.
const ROI_W = 4.3; // width in feature cells
const ROI_H = 3.7; // height in feature cells

// Pooled output bins per side (Mask R-CNN uses 7x7; we draw a coarser overlay
// to keep it legible, but report the canonical 7x7 in the caption).
const BINS = 4;

// Convert a fractional feature coordinate to an svg x/y pixel.
const fx = (c: number): number => GRID_X + c * CELL;
const fy = (r: number): number => GRID_Y + r * CELL;

type Mode = "pool" | "align";

// Clamp helper.
const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

export function VisRoiAlign() {
  const [mode, setMode] = useState<Mode>("align");
  // RoI top-left corner in fractional feature coordinates.
  const [roiX, setRoiX] = useState<number>(1.7);
  const [roiY, setRoiY] = useState<number>(2.4);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<boolean>(false);

  const isPool = mode === "pool";

  // Exact (float) RoI corners.
  const x0 = roiX;
  const y0 = roiY;
  const x1 = roiX + ROI_W;
  const y1 = roiY + ROI_H;

  // RoI Pool quantizes the RoI corners to the integer feature grid.
  const qx0 = Math.round(x0);
  const qy0 = Math.round(y0);
  const qx1 = Math.round(x1);
  const qy1 = Math.round(y1);

  // Bin centers for the exact RoI (used to draw sample points in align mode).
  const sampleCenters: { cx: number; cy: number }[] = [];
  for (let by = 0; by < BINS; by++) {
    for (let bx = 0; bx < BINS; bx++) {
      const cx = x0 + ((bx + 0.5) / BINS) * ROI_W;
      const cy = y0 + ((by + 0.5) / BINS) * ROI_H;
      sampleCenters.push({ cx, cy });
    }
  }

  // Alignment error: how far the snapped RoI corners drift from the true
  // corners (in feature-cell units). RoI Align has zero quantization error.
  const snapErr =
    (Math.abs(qx0 - x0) +
      Math.abs(qy0 - y0) +
      Math.abs(qx1 - x1) +
      Math.abs(qy1 - y1)) /
    4;

  // Convert a pointer event to fractional feature coordinates.
  const pointerToFeat = useCallback(
    (clientX: number, clientY: number): { fxv: number; fyv: number } => {
      const svg = svgRef.current;
      if (!svg) return { fxv: roiX, fyv: roiY };
      const rect = svg.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * VW;
      const py = ((clientY - rect.top) / rect.height) * VH;
      return { fxv: (px - GRID_X) / CELL, fyv: (py - GRID_Y) / CELL };
    },
    [roiX, roiY],
  );

  const moveRoi = useCallback(
    (clientX: number, clientY: number) => {
      const { fxv, fyv } = pointerToFeat(clientX, clientY);
      // Pointer points at the RoI center; recover top-left, then clamp so the
      // whole RoI stays inside the feature map.
      setRoiX(clamp(fxv - ROI_W / 2, 0, GRID - ROI_W));
      setRoiY(clamp(fyv - ROI_H / 2, 0, GRID - ROI_H));
    },
    [pointerToFeat],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      moveRoi(e.clientX, e.clientY);
    },
    [moveRoi],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!dragging.current) return;
      moveRoi(e.clientX, e.clientY);
    },
    [moveRoi],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const accent = isPool ? C.coral : C.blue;
  const accentFill = isPool ? C.coralFill : C.blueFill;

  // Readout band y positions.
  const readY = 322;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="RoI Pool quantizes a fractional region box to the integer feature grid, misaligning the pooled mask, while RoI Align samples at exact float positions with bilinear interpolation. Drag the region box to see RoI Pool snap and introduce alignment error while RoI Align stays sub-pixel accurate."
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
          RoI Pool vs RoI Align
        </text>

        {/* Feature-map grid cells */}
        {Array.from({ length: GRID }).map((_, r) =>
          Array.from({ length: GRID }).map((__, c) => (
            <rect
              key={`g-${r}-${c}`}
              x={fx(c)}
              y={fy(r)}
              width={CELL}
              height={CELL}
              fill="var(--card)"
              stroke={C.grid}
              strokeWidth={1}
            />
          )),
        )}

        {/* Grid label */}
        <text
          x={GRID_X}
          y={GRID_Y - 8}
          textAnchor="start"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          feature map (integer grid)
        </text>

        {/* RoI Pool: the snapped box, drawn as a coral overlay aligned to the
            integer grid. We draw it underneath the true box for contrast. */}
        {isPool && (
          <rect
            x={fx(qx0)}
            y={fy(qy0)}
            width={(qx1 - qx0) * CELL}
            height={(qy1 - qy0) * CELL}
            fill={C.coralFill}
            stroke={C.coral}
            strokeWidth={2}
          />
        )}

        {/* The TRUE (exact, fractional) RoI box — always shown, dashed. */}
        <rect
          x={fx(x0)}
          y={fy(y0)}
          width={ROI_W * CELL}
          height={ROI_H * CELL}
          fill="none"
          stroke={C.ink}
          strokeWidth={1.4}
          strokeDasharray="4 3"
        />

        {/* Pool: bin grid snapped to integer cells (max-pool partitions). */}
        {isPool &&
          Array.from({ length: BINS - 1 }).map((_, i) => {
            const w = qx1 - qx0;
            const h = qy1 - qy0;
            const vx = fx(qx0 + (w * (i + 1)) / BINS);
            const hy = fy(qy0 + (h * (i + 1)) / BINS);
            return (
              <g key={`pbin-${i}`}>
                <line
                  x1={vx}
                  y1={fy(qy0)}
                  x2={vx}
                  y2={fy(qy1)}
                  stroke={C.coral}
                  strokeWidth={0.8}
                  opacity={0.6}
                />
                <line
                  x1={fx(qx0)}
                  y1={hy}
                  x2={fx(qx1)}
                  y2={hy}
                  stroke={C.coral}
                  strokeWidth={0.8}
                  opacity={0.6}
                />
              </g>
            );
          })}

        {/* Align: exact float RoI box outline + bilinear sample points. */}
        {!isPool && (
          <rect
            x={fx(x0)}
            y={fy(y0)}
            width={ROI_W * CELL}
            height={ROI_H * CELL}
            fill={C.blueFill}
            fillOpacity={0.45}
            stroke={C.blue}
            strokeWidth={2}
          />
        )}

        {!isPool &&
          sampleCenters.map((s, i) => {
            // Four nearest feature-cell centers for bilinear interpolation.
            const gcx = s.cx - 0.5; // feature-cell-center coordinate
            const gcy = s.cy - 0.5;
            const c0 = Math.floor(gcx);
            const r0 = Math.floor(gcy);
            const px = fx(s.cx);
            const py = fy(s.cy);
            return (
              <g key={`samp-${i}`}>
                {/* light links to the 4 neighbour cell centers */}
                <line
                  x1={px}
                  y1={py}
                  x2={fx(c0 + 1)}
                  y2={fy(r0 + 1)}
                  stroke={C.blue}
                  strokeWidth={0.4}
                  opacity={0.25}
                />
                <circle cx={px} cy={py} r={2.1} fill={C.blue} />
              </g>
            );
          })}

        {/* Legend for the dashed true box (kept clear of the grid) */}
        <line
          x1={GRID_X + GRID_PX + 18}
          y1={GRID_Y + 6}
          x2={GRID_X + GRID_PX + 42}
          y2={GRID_Y + 6}
          stroke={C.ink}
          strokeWidth={1.4}
          strokeDasharray="4 3"
        />
        <text
          x={GRID_X + GRID_PX + 48}
          y={GRID_Y + 9}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          true RoI
        </text>

        <rect
          x={GRID_X + GRID_PX + 18}
          y={GRID_Y + 22}
          width={24}
          height={10}
          fill={accentFill}
          stroke={accent}
          strokeWidth={1.4}
        />
        <text
          x={GRID_X + GRID_PX + 48}
          y={GRID_Y + 31}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          {isPool ? "snapped box" : "exact box"}
        </text>

        {!isPool && (
          <>
            <circle
              cx={GRID_X + GRID_PX + 30}
              cy={GRID_Y + 48}
              r={2.1}
              fill={C.blue}
            />
            <text
              x={GRID_X + GRID_PX + 48}
              y={GRID_Y + 51}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              sample pt
            </text>
          </>
        )}

        {/* Right-column explanation, in its own clear vertical strip */}
        <text
          x={GRID_X + GRID_PX + 18}
          y={GRID_Y + 78}
          fontFamily={MONO}
          fontSize={9.5}
          fill={accent}
        >
          {isPool ? "RoI Pool" : "RoI Align"}
        </text>
        {(isPool
          ? ["rounds corners to", "integer cells →", "the mask shifts."]
          : ["samples at exact", "float positions w/", "bilinear interp."]
        ).map((ln, i) => (
          <text
            key={`expl-${i}`}
            x={GRID_X + GRID_PX + 18}
            y={GRID_Y + 94 + i * 14}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
          >
            {ln}
          </text>
        ))}

        {/* Readout band (own clear horizontal band below the drawing) */}
        <line
          x1={GRID_X}
          y1={readY - 16}
          x2={VW - GRID_X}
          y2={readY - 16}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={GRID_X}
          y={readY}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          mode: {isPool ? "RoI Pool (quantized)" : "RoI Align (sub-pixel)"}
        </text>
        <text
          x={GRID_X}
          y={readY + 16}
          fontFamily={MONO}
          fontSize={10}
          fill={isPool ? C.coral : C.green}
        >
          alignment error:{" "}
          {isPool ? `${snapErr.toFixed(2)} cells` : "0.00 cells (exact)"}
        </text>

        {/* Caption band */}
        <text
          x={VW / 2}
          y={readY + 42}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Don&apos;t round — interpolate. 7x7 sub-pixel sampling lifts
        </text>
        <text
          x={VW / 2}
          y={readY + 56}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Mask R-CNN mask AP by ~10%.
        </text>

        {/* Draggable hit area over the RoI (last so it sits on top). */}
        <rect
          x={fx(Math.min(x0, isPool ? qx0 : x0))}
          y={fy(Math.min(y0, isPool ? qy0 : y0))}
          width={ROI_W * CELL}
          height={ROI_H * CELL}
          fill="transparent"
          style={{ cursor: "move" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={
            isPool ? { background: C.ink, color: "var(--background)" } : undefined
          }
          onClick={() => setMode("pool")}
        >
          RoI Pool
        </button>
        <button
          type="button"
          className={btn}
          style={
            !isPool ? { background: C.ink, color: "var(--background)" } : undefined
          }
          onClick={() => setMode("align")}
        >
          RoI Align
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono">RoI x</span>
          <input
            type="range"
            min={0}
            max={GRID - ROI_W}
            step={0.05}
            value={roiX}
            onChange={(e) =>
              setRoiX(clamp(Number(e.target.value), 0, GRID - ROI_W))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{roiX.toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-mono">RoI y</span>
          <input
            type="range"
            min={0}
            max={GRID - ROI_H}
            step={0.05}
            value={roiY}
            onChange={(e) =>
              setRoiY(clamp(Number(e.target.value), 0, GRID - ROI_H))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{roiY.toFixed(2)}</span>
        </label>
      </div>
    </div>
  );
}
