"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..28) | cell drawing + readout panel (44..262) |
//   assignment band (~278) | caption band (300..330)
const VW = 480;
const VH = 340;

// Grid cell (the YOLO cell) geometry.
const CELL_X = 24;
const CELL_Y = 52;
const CELL_W = 196;
const CELL_H = 196;
const CX = CELL_X + CELL_W / 2;
const CY = CELL_Y + CELL_H / 2;

// Readout / specialization panel on the right.
const PX = CELL_X + CELL_W + 28;

type Box = { w: number; h: number };

// Intersection-over-union of two centered boxes (both share the cell center).
function iouCentered(a: Box, b: Box): number {
  const iw = Math.min(a.w, b.w);
  const ih = Math.min(a.h, b.h);
  const inter = iw * ih;
  const uni = a.w * a.h + b.w * b.h - inter;
  return uni > 0 ? inter / uni : 0;
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

export function VisResponsiblePredictor() {
  // aspect: 0 = tall/narrow ground truth, 100 = wide/short ground truth.
  const [aspect, setAspect] = useState<number>(20);
  const [montage, setMontage] = useState<boolean>(false);

  const t = aspect / 100; // 0..1

  // Ground-truth box: interpolate from tall-narrow to wide-short, area ~constant.
  const gtW = 50 + t * 110; // 50 .. 160
  const gtH = 160 - t * 110; // 160 .. 50
  const gt: Box = { w: gtW, h: gtH };

  // Predictor A specializes to TALL-NARROW priors; B to WIDE-SHORT priors.
  // Montage tightens the priors toward their specialty (drift over training).
  const drift = montage ? 1 : 0.45;
  const A: Box = { w: clamp(70 - drift * 22, 30, 180), h: clamp(120 + drift * 40, 40, 184) };
  const B: Box = { w: clamp(120 + drift * 40, 40, 184), h: clamp(70 - drift * 22, 30, 180) };

  const iouA = iouCentered(A, gt);
  const iouB = iouCentered(B, gt);
  const aResp = iouA >= iouB;

  // Map a box (w,h in box units) to an SVG rect centered on the cell center.
  const rectOf = (b: Box) => ({
    x: CX - b.w / 2,
    y: CY - b.h / 2,
    width: b.w,
    height: b.h,
  });

  const gtR = rectOf(gt);
  const aR = rectOf(A);
  const bR = rectOf(B);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="A YOLO cell predicts two candidate boxes. The one with higher IOU to the ground-truth box becomes responsible and is trained on the object; the other is pushed to predict no-object. Over training the two predictors specialize: one to tall-narrow boxes, one to wide-short boxes."
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
          The Responsible Predictor and Specialization
        </text>

        {/* Cell label */}
        <text
          x={CELL_X}
          y={CELL_Y - 8}
          textAnchor="start"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          one grid cell, B = 2 predictors
        </text>

        {/* The grid cell */}
        <rect
          x={CELL_X}
          y={CELL_Y}
          width={CELL_W}
          height={CELL_H}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.2}
        />

        {/* Ground-truth box (dashed, neutral ink) */}
        <rect
          x={gtR.x}
          y={gtR.y}
          width={gtR.width}
          height={gtR.height}
          rx={2}
          fill="none"
          stroke={C.ink}
          strokeWidth={1.6}
          strokeDasharray="4 3"
        />

        {/* The object (a simple person glyph) centered in the GT box */}
        <g stroke={C.muted} strokeWidth={1.4} fill="none" strokeLinecap="round">
          <circle cx={CX} cy={CY - 14} r={5} />
          <line x1={CX} y1={CY - 9} x2={CX} y2={CY + 8} />
          <line x1={CX - 7} y1={CY - 4} x2={CX + 7} y2={CY - 4} />
          <line x1={CX} y1={CY + 8} x2={CX - 6} y2={CY + 18} />
          <line x1={CX} y1={CY + 8} x2={CX + 6} y2={CY + 18} />
        </g>

        {/* Predictor A box (blue) */}
        <rect
          x={aR.x}
          y={aR.y}
          width={aR.width}
          height={aR.height}
          rx={2}
          fill={aResp ? C.blueFill : "none"}
          fillOpacity={aResp ? 0.5 : 1}
          stroke={C.blue}
          strokeWidth={aResp ? 2.4 : 1.2}
        />
        {/* Predictor B box (coral) */}
        <rect
          x={bR.x}
          y={bR.y}
          width={bR.width}
          height={bR.height}
          rx={2}
          fill={!aResp ? C.coralFill : "none"}
          fillOpacity={!aResp ? 0.5 : 1}
          stroke={C.coral}
          strokeWidth={!aResp ? 2.4 : 1.2}
        />

        {/* Box tags, anchored at top-left corner just outside each box */}
        <text
          x={aR.x + 2}
          y={aR.y - 3}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
        >
          A
        </text>
        <text
          x={bR.x + bR.width - 8}
          y={bR.y + bR.height + 10}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
        >
          B
        </text>

        {/* Readout panel */}
        <text x={PX} y={CELL_Y + 6} fontFamily={MONO} fontSize={10} fill={C.ink}>
          IOU with ground truth
        </text>

        {/* Predictor A readout */}
        <rect
          x={PX}
          y={CELL_Y + 16}
          width={10}
          height={10}
          rx={2}
          fill="none"
          stroke={C.blue}
          strokeWidth={aResp ? 2.4 : 1.2}
        />
        <text
          x={PX + 18}
          y={CELL_Y + 25}
          fontFamily={MONO}
          fontSize={10}
          fill={aResp ? C.ink : C.muted}
        >
          A (tall) = {iouA.toFixed(2)}
        </text>

        {/* Predictor B readout */}
        <rect
          x={PX}
          y={CELL_Y + 34}
          width={10}
          height={10}
          rx={2}
          fill="none"
          stroke={C.coral}
          strokeWidth={!aResp ? 2.4 : 1.2}
        />
        <text
          x={PX + 18}
          y={CELL_Y + 43}
          fontFamily={MONO}
          fontSize={10}
          fill={!aResp ? C.ink : C.muted}
        >
          B (wide) = {iouB.toFixed(2)}
        </text>

        {/* Responsible result */}
        <text
          x={PX}
          y={CELL_Y + 68}
          fontFamily={MONO}
          fontSize={10}
          fill={aResp ? C.blue : C.coral}
        >
          responsible: {aResp ? "A" : "B"}
        </text>
        <text x={PX} y={CELL_Y + 84} fontFamily={MONO} fontSize={9} fill={C.muted}>
          → coord + conf loss
        </text>

        {/* The other predictor */}
        <text
          x={PX}
          y={CELL_Y + 104}
          fontFamily={MONO}
          fontSize={10}
          fill={aResp ? C.coral : C.blue}
        >
          other: {aResp ? "B" : "A"}
        </text>
        <text x={PX} y={CELL_Y + 120} fontFamily={MONO} fontSize={9} fill={C.muted}>
          → predict no-object
        </text>

        {/* Specialization note */}
        <text
          x={PX}
          y={CELL_Y + 148}
          fontFamily={MONO}
          fontSize={9}
          fill={montage ? C.green : C.muted}
        >
          {montage ? "training: priors drift" : "priors: untrained"}
        </text>
        <text
          x={PX}
          y={CELL_Y + 162}
          fontFamily={MONO}
          fontSize={9}
          fill={montage ? C.green : C.muted}
        >
          {montage ? "A→tall  B→wide" : "(toggle montage)"}
        </text>

        {/* Assignment band below the drawing */}
        <text
          x={VW / 2}
          y={CELL_Y + CELL_H + 26}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          {aResp
            ? "Tall ground truth → predictor A is responsible"
            : "Wide ground truth → predictor B is responsible"}
        </text>

        {/* Caption band */}
        <text
          x={VW / 2}
          y={CELL_Y + CELL_H + 46}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          The higher-IOU box is responsible for the object;
        </text>
        <text
          x={VW / 2}
          y={CELL_Y + CELL_H + 60}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          over time the two predictors specialize in box shapes.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-mono">tall ↔ wide</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={aspect}
            onChange={(e) => setAspect(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{aspect}</span>
        </label>
        <button
          type="button"
          className={btn}
          style={montage ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setMontage((m) => !m)}
        >
          training montage
        </button>
      </div>
    </div>
  );
}
