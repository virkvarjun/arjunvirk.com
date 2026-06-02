"use client";

import { useCallback, useRef, useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..26) | drawing: grid + side panel (44..286) |
//   readout band (~302..316) | caption band (330..348)
const VW = 488;
const VH = 360;

// YOLO grid: S = 7 over a 448x448 image (each cell is a 64x64 region).
const S = 7;
const CELL = 30; // px per grid cell in the diagram
const GRID_X = 18;
const GRID_Y = 44;
const GRID_W = S * CELL; // 210
const GRID_H = S * CELL; // 210

// Output tensor view (right panel): a small S x S map of slot stacks.
const TX = GRID_X + GRID_W + 40; // left of tensor panel
const TY = GRID_Y;
const TCELL = 24;
const TW = S * TCELL; // 168

// Dog bounding box (in grid-cell units, fractional). Hard-coded default.
// Drag moves the whole box by repositioning its center.
const DOG_W = 2.6; // width in cells
const DOG_H = 1.8; // height in cells

// Initial dog center, in cell units (col, row).
const INIT_CX = 2.7;
const INIT_CY = 3.4;

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

type View = "grid" | "tensor";

export function VisYoloGrid() {
  const [view, setView] = useState<View>("grid");
  // Dog center in cell units.
  const [cx, setCx] = useState<number>(INIT_CX);
  const [cy, setCy] = useState<number>(INIT_CY);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<boolean>(false);

  // Which cell holds the center -> the "responsible" cell.
  const respCol = clamp(Math.floor(cx), 0, S - 1);
  const respRow = clamp(Math.floor(cy), 0, S - 1);

  // Convert a pointer event to cell-unit coordinates inside the image grid.
  const pointerToCell = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): { col: number; row: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      // Map client px -> viewBox px -> grid-cell units.
      const vbX = ((e.clientX - rect.left) / rect.width) * VW;
      const vbY = ((e.clientY - rect.top) / rect.height) * VH;
      const col = (vbX - GRID_X) / CELL;
      const row = (vbY - GRID_Y) / CELL;
      return { col, row };
    },
    [],
  );

  const moveTo = useCallback((col: number, row: number) => {
    // Keep the dog's center inside the image, leaving room for the box.
    setCx(clamp(col, DOG_W / 2, S - DOG_W / 2));
    setCy(clamp(row, DOG_H / 2, S - DOG_H / 2));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const p = pointerToCell(e);
      if (!p) return;
      if (p.col < 0 || p.col > S || p.row < 0 || p.row > S) return;
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      moveTo(p.col, p.row);
    },
    [pointerToCell, moveTo],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging.current) return;
      const p = pointerToCell(e);
      if (!p) return;
      moveTo(p.col, p.row);
    },
    [pointerToCell, moveTo],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  // Dog bounding box corners in cell units.
  const boxL = cx - DOG_W / 2;
  const boxT = cy - DOG_H / 2;

  // Pixel helpers.
  const px = (col: number) => GRID_X + col * CELL;
  const py = (row: number) => GRID_Y + row * CELL;

  const centerPx = px(cx);
  const centerPy = py(cy);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="YOLO lays an S by S grid (7x7) over the image. The cell containing an object's center is responsible for predicting it. Drag the dog to move its center; the responsible cell updates live. A toggle shows the spatially laid-out 7x7x30 output tensor with the responsible cell's slot highlighted."
        style={{ touchAction: "none", cursor: dragging.current ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
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
          YOLO&apos;s S×S Grid and the Responsible Cell
        </text>

        {/* Left label: the image */}
        <text
          x={GRID_X}
          y={GRID_Y - 8}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          448×448 image · 7×7 grid (64px cells)
        </text>

        {/* Image background */}
        <rect
          x={GRID_X}
          y={GRID_Y}
          width={GRID_W}
          height={GRID_H}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* Responsible cell highlight (behind grid lines) */}
        <rect
          x={px(respCol)}
          y={py(respRow)}
          width={CELL}
          height={CELL}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.8}
        />

        {/* Grid lines */}
        {Array.from({ length: S - 1 }, (_, i) => i + 1).map((i) => (
          <line
            key={`v${i}`}
            x1={px(i)}
            y1={GRID_Y}
            x2={px(i)}
            y2={GRID_Y + GRID_H}
            stroke={C.grid}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: S - 1 }, (_, i) => i + 1).map((i) => (
          <line
            key={`h${i}`}
            x1={GRID_X}
            y1={py(i)}
            x2={GRID_X + GRID_W}
            y2={py(i)}
            stroke={C.grid}
            strokeWidth={1}
          />
        ))}

        {/* Dog bounding box */}
        <rect
          x={px(boxL)}
          y={py(boxT)}
          width={DOG_W * CELL}
          height={DOG_H * CELL}
          fill={C.blueFill}
          fillOpacity={0.55}
          stroke={C.blue}
          strokeWidth={1.8}
          rx={3}
        />
        {/* Dog label inside the box (fits: ~3 chars at 9px) */}
        <text
          x={px(boxL) + 5}
          y={py(boxT) + 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
        >
          dog
        </text>

        {/* Object center dot */}
        <circle cx={centerPx} cy={centerPy} r={4.5} fill={C.coral} />
        <circle
          cx={centerPx}
          cy={centerPy}
          r={4.5}
          fill="none"
          stroke="var(--card)"
          strokeWidth={1.2}
        />

        {/* Responsible-cell pointer label, below the grid (own clear space) */}
        <text
          x={GRID_X}
          y={GRID_Y + GRID_H + 16}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.coral}
        >
          responsible cell: row {respRow}, col {respCol}
        </text>
        <text
          x={GRID_X}
          y={GRID_Y + GRID_H + 30}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          ↑ holds the object&apos;s center (drag the dog)
        </text>

        {/* ---- Right panel ---- */}
        {view === "grid" ? (
          <>
            {/* Panel title */}
            <text
              x={TX}
              y={TY - 8}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              this cell predicts:
            </text>
            {/* Prediction vector breakdown for the responsible cell */}
            {[
              { label: "box 1", sub: "x y w h conf", fill: C.blue },
              { label: "box 2", sub: "x y w h conf", fill: C.blue },
              { label: "class p", sub: "20 probs", fill: C.green },
            ].map((row, i) => {
              const ry = TY + 6 + i * 40;
              return (
                <g key={row.label}>
                  <rect
                    x={TX}
                    y={ry}
                    width={150}
                    height={30}
                    rx={4}
                    fill="var(--card)"
                    stroke={row.fill}
                    strokeWidth={1.3}
                  />
                  <text
                    x={TX + 8}
                    y={ry + 13}
                    fontFamily={MONO}
                    fontSize={10}
                    fill={C.ink}
                  >
                    {row.label}
                  </text>
                  <text
                    x={TX + 8}
                    y={ry + 24}
                    fontFamily={MONO}
                    fontSize={8.5}
                    fill={C.muted}
                  >
                    {row.sub}
                  </text>
                </g>
              );
            })}
            <text
              x={TX}
              y={TY + 6 + 3 * 40 + 6}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              B=2 boxes + class vector
            </text>
            <text
              x={TX}
              y={TY + 6 + 3 * 40 + 20}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              = 2·5 + 20 = 30 values
            </text>
          </>
        ) : (
          <>
            {/* Tensor view: spatial 7x7 map of 30-vector slots */}
            <text
              x={TX}
              y={TY - 8}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              output tensor 7×7×30
            </text>
            {Array.from({ length: S }, (_, r) =>
              Array.from({ length: S }, (_, c) => {
                const on = r === respRow && c === respCol;
                return (
                  <rect
                    key={`t${r}-${c}`}
                    x={TX + c * TCELL}
                    y={TY + r * TCELL}
                    width={TCELL - 2}
                    height={TCELL - 2}
                    rx={2}
                    fill={on ? C.coralFill : "var(--card)"}
                    stroke={on ? C.coral : C.line}
                    strokeWidth={on ? 1.8 : 1}
                  />
                );
              }),
            )}
            <text
              x={TX}
              y={TY + TW + 6}
              fontFamily={MONO}
              fontSize={9}
              fill={C.coral}
            >
              highlighted slot = depth-30 vector
            </text>
            <text
              x={TX}
              y={TY + TW + 20}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              for the responsible cell
            </text>
            <text
              x={TX}
              y={TY + TW + 34}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              same (row,col) as the image
            </text>
          </>
        )}

        {/* Caption band (two lines, each fits within VW-24) */}
        <text
          x={VW / 2}
          y={332}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          An object belongs to the one cell holding its center —
        </text>
        <text
          x={VW / 2}
          y={346}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          so predictions line up spatially with the image.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={
            view === "grid"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => setView("grid")}
        >
          image + cell
        </button>
        <button
          type="button"
          className={btn}
          style={
            view === "tensor"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => setView("tensor")}
        >
          7×7×30 tensor
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            setCx(INIT_CX);
            setCy(INIT_CY);
          }}
        >
          reset
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          center → cell (r{respRow}, c{respCol})
        </span>
      </div>
    </div>
  );
}
