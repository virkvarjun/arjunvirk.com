"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// How a YOLO box is encoded.
// - (x, y): the box CENTER as an offset inside the responsible grid cell,
//   each in [0, 1] (0 = cell's left/top edge, 1 = right/bottom edge).
// - (w, h): the box width/height as a fraction of the WHOLE image, in [0, 1].
// - conf: an objectness/confidence score in [0, 1].
// All values are deterministic functions of the slider state.

// ---- Left panel: zoomed single grid cell --------------------------------
const CELL_X = 40;
const CELL_Y = 96;
const CELL_W = 150;
const CELL_H = 150;

// ---- Right panel: full image --------------------------------------------
const IMG_X = 286;
const IMG_Y = 96;
const IMG_W = 168;
const IMG_H = 150;

function fmt(v: number): string {
  return v.toFixed(2);
}

export function VisYoloBoxEncoding() {
  // Center offsets inside the responsible cell (cell-relative, 0..1).
  const [x, setX] = useState<number>(0.62);
  const [y, setY] = useState<number>(0.4);
  // Box size as a fraction of the whole image (image-relative, 0..1).
  const [w, setW] = useState<number>(0.5);
  const [h, setH] = useState<number>(0.42);
  // Confidence / objectness score.
  const [conf, setConf] = useState<number>(0.88);

  // Center dot position inside the zoomed cell.
  const dotX = CELL_X + x * CELL_W;
  const dotY = CELL_Y + y * CELL_H;

  // Box drawn on the full image: width/height are image fractions, centered
  // on the same (x, y) location (here the responsible cell sits at image
  // center for illustration), clamped so the box stays inside the image.
  const boxW = w * IMG_W;
  const boxH = h * IMG_H;
  const cx = IMG_X + (0.35 + x * 0.3) * IMG_W;
  const cy = IMG_Y + (0.35 + y * 0.3) * IMG_H;
  const rawBoxX = cx - boxW / 2;
  const rawBoxY = cy - boxH / 2;
  const boxX = Math.max(IMG_X, Math.min(IMG_X + IMG_W - boxW, rawBoxX));
  const boxY = Math.max(IMG_Y, Math.min(IMG_Y + IMG_H - boxH, rawBoxY));

  return (
    <div>
      <svg
        viewBox="0 0 480 478"
        className="h-auto w-full"
        role="img"
        aria-label="How a YOLO bounding box is encoded: cell-relative center and image-relative size"
      >
        {/* ---------- Title band ---------- */}
        <text
          x={16}
          y={22}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={700}
        >
          How a YOLO Box Is Encoded
        </text>
        <text x={16} y={38} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          center (x,y) is cell-relative; size (w,h) is image-relative
        </text>

        {/* ---------- Left panel header ---------- */}
        <text
          x={CELL_X}
          y={64}
          fontSize={11}
          fill={C.blue}
          fontFamily={MONO}
          fontWeight={700}
        >
          responsible cell
        </text>
        <text x={CELL_X} y={77} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          center offset (x,y) in [0,1]
        </text>

        {/* ---------- Left: zoomed grid cell ---------- */}
        <rect
          x={CELL_X}
          y={CELL_Y}
          width={CELL_W}
          height={CELL_H}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.5}
        />
        {/* edge markers: x=0 / x=1 / y=0 / y=1 */}
        <text
          x={CELL_X - 4}
          y={CELL_Y - 4}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="start"
        >
          x=0
        </text>
        <text
          x={CELL_X + CELL_W}
          y={CELL_Y - 4}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          x=1
        </text>
        <text
          x={CELL_X - 6}
          y={CELL_Y + 8}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          y=0
        </text>
        <text
          x={CELL_X - 6}
          y={CELL_Y + CELL_H}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          y=1
        </text>

        {/* guide lines from edges to the center dot */}
        <line
          x1={CELL_X}
          y1={dotY}
          x2={dotX}
          y2={dotY}
          stroke={C.coral}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <line
          x1={dotX}
          y1={CELL_Y}
          x2={dotX}
          y2={dotY}
          stroke={C.coral}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {/* center dot */}
        <circle cx={dotX} cy={dotY} r={5} fill={C.coral} />

        {/* x / y value tags along the edges */}
        <text
          x={(CELL_X + dotX) / 2}
          y={dotY - 5}
          fontSize={8.5}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="middle"
        >
          x={fmt(x)}
        </text>
        <text
          x={dotX + 7}
          y={(CELL_Y + dotY) / 2}
          fontSize={8.5}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="start"
        >
          y={fmt(y)}
        </text>

        {/* ---------- Right panel header ---------- */}
        <text
          x={IMG_X}
          y={64}
          fontSize={11}
          fill={C.green}
          fontFamily={MONO}
          fontWeight={700}
        >
          whole image
        </text>
        <text x={IMG_X} y={77} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          size (w,h) in [0,1] of image
        </text>

        {/* ---------- Right: full image with box ---------- */}
        <rect
          x={IMG_X}
          y={IMG_Y}
          width={IMG_W}
          height={IMG_H}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.5}
        />
        {/* faint cell grid on the image (3x3) */}
        {[1, 2].map((i) => (
          <line
            key={`gv-${i}`}
            x1={IMG_X + (i * IMG_W) / 3}
            y1={IMG_Y}
            x2={IMG_X + (i * IMG_W) / 3}
            y2={IMG_Y + IMG_H}
            stroke={C.grid}
            strokeWidth={1}
          />
        ))}
        {[1, 2].map((i) => (
          <line
            key={`gh-${i}`}
            x1={IMG_X}
            y1={IMG_Y + (i * IMG_H) / 3}
            x2={IMG_X + IMG_W}
            y2={IMG_Y + (i * IMG_H) / 3}
            stroke={C.grid}
            strokeWidth={1}
          />
        ))}
        {/* the bounding box */}
        <rect
          x={boxX}
          y={boxY}
          width={boxW}
          height={boxH}
          fill={C.greenFill}
          fillOpacity={0.45}
          stroke={C.green}
          strokeWidth={2}
        />
        <circle cx={boxX + boxW / 2} cy={boxY + boxH / 2} r={3} fill={C.green} />

        {/* w dimension marker (below image) */}
        <line
          x1={boxX}
          y1={IMG_Y + IMG_H + 8}
          x2={boxX + boxW}
          y2={IMG_Y + IMG_H + 8}
          stroke={C.green}
          strokeWidth={1}
        />
        <text
          x={boxX + boxW / 2}
          y={IMG_Y + IMG_H + 20}
          fontSize={8.5}
          fill={C.green}
          fontFamily={MONO}
          textAnchor="middle"
        >
          w={fmt(w)}
        </text>
        {/* h dimension marker (right of image) */}
        <line
          x1={IMG_X + IMG_W + 6}
          y1={boxY}
          x2={IMG_X + IMG_W + 6}
          y2={boxY + boxH}
          stroke={C.green}
          strokeWidth={1}
        />
        <text
          x={IMG_X + IMG_W + 10}
          y={IMG_Y - 4}
          fontSize={8.5}
          fill={C.green}
          fontFamily={MONO}
          textAnchor="end"
        >
          h={fmt(h)}
        </text>

        {/* ---------- Readout band (own clear strip) ---------- */}
        <line
          x1={16}
          y1={300}
          x2={464}
          y2={300}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={16}
          y={320}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={700}
        >
          encoded vector
        </text>

        {/* the 5-tuple readout, each value in its own chip */}
        {(
          [
            { k: "x", v: x, col: C.coral },
            { k: "y", v: y, col: C.coral },
            { k: "w", v: w, col: C.green },
            { k: "h", v: h, col: C.green },
            { k: "conf", v: conf, col: C.violet },
          ] as const
        ).map((item, i) => {
          const chipX = 16 + i * 88;
          return (
            <g key={item.k}>
              <rect
                x={chipX}
                y={332}
                width={80}
                height={30}
                rx={4}
                fill="var(--background)"
                stroke={item.col}
                strokeWidth={1.4}
              />
              <text
                x={chipX + 40}
                y={345}
                fontSize={9}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {item.k}
              </text>
              <text
                x={chipX + 40}
                y={357}
                fontSize={11}
                fill={item.col}
                fontFamily={MONO}
                fontWeight={700}
                textAnchor="middle"
              >
                {fmt(item.v)}
              </text>
            </g>
          );
        })}

        {/* ---------- Caption band ---------- */}
        <text x={16} y={392} fontSize={9} fill={C.coral} fontFamily={MONO}>
          (x,y): center is small and cell-relative.
        </text>
        <text x={16} y={408} fontSize={9} fill={C.green} fontFamily={MONO}>
          (w,h): image-relative, so boxes can be any size.
        </text>
        <text x={16} y={428} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          The cell that contains the center is the one
        </text>
        <text x={16} y={442} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          responsible for predicting this box.
        </text>
        <text x={16} y={462} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          conf scores how sure the cell is an object is there.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-1.5 font-mono">
          x
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{fmt(x)}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          y
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{fmt(y)}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          w
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.01}
            value={w}
            onChange={(e) => setW(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{fmt(w)}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          h
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.01}
            value={h}
            onChange={(e) => setH(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{fmt(h)}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          conf
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={conf}
            onChange={(e) => setConf(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{fmt(conf)}</span>
        </label>
      </div>
    </div>
  );
}
