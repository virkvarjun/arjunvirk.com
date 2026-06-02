"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// --- Fixed ground-truth box (in canvas pixel coords) ---
// The prediction box is driven by the sliders; the ground truth stays put so
// the user can watch IOU climb from 0 -> 1 as the prediction lines up with it.
const GT = { x: 96, y: 120, w: 110, h: 96 };

// Slider ranges for the predicted box.
const PRED_X = { min: 24, max: 230 };
const PRED_Y = { min: 64, max: 200 };
const PRED_W = { min: 40, max: 160 };
const PRED_H = { min: 40, max: 140 };

type Rect = { x: number; y: number; w: number; h: number };

// Axis-aligned intersection rectangle of two boxes (null if they don't overlap).
function intersectRect(a: Rect, b: Rect): Rect | null {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function VisIou() {
  // Predicted box: offset + size. Defaults give a partial overlap (~0.3 IOU).
  const [px, setPx] = useState<number>(150);
  const [py, setPy] = useState<number>(96);
  const [pw, setPw] = useState<number>(96);
  const [ph, setPh] = useState<number>(84);

  const pred: Rect = { x: px, y: py, w: pw, h: ph };

  const inter = intersectRect(pred, GT);
  const interArea = inter ? inter.w * inter.h : 0;
  const unionArea = pred.w * pred.h + GT.w * GT.h - interArea;
  const iou = unionArea > 0 ? interArea / unionArea : 0;

  // --- geometry ---
  const W = 460;
  const H = 384;

  // Gauge (vertical bar on the right showing 0..1).
  const gaugeX = 392;
  const gaugeTop = 70;
  const gaugeBot = 252;
  const gaugeH = gaugeBot - gaugeTop;
  const fillTop = gaugeBot - iou * gaugeH;

  // Threshold marks on the gauge.
  const thresholds: { v: number; label: string }[] = [
    { v: 1, label: "1 identical" },
    { v: 0.5, label: "0.5 match" },
    { v: 0, label: "0 no overlap" },
  ];

  // Verdict text driven by IOU.
  const verdict =
    iou >= 0.999
      ? "identical boxes"
      : iou >= 0.5
        ? "likely same object"
        : iou > 0
          ? "partial overlap"
          : "no overlap";

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Intersection over Union: a predicted box and a ground-truth box, with their intersection and union shaded, and IOU equal to intersection area divided by union area"
      >
        {/* ---------- Title band ---------- */}
        <text x={16} y={22} fontSize={13} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          Intersection over Union (IOU)
        </text>
        <text x={16} y={38} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          move + resize the prediction to overlap the target
        </text>

        {/* ---------- Drawing canvas ---------- */}
        <rect
          x={16}
          y={52}
          width={344}
          height={232}
          rx={4}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* Union = both boxes filled lightly underneath (drawn as two fills). */}
        <rect x={GT.x} y={GT.y} width={GT.w} height={GT.h} fill={C.violet} opacity={0.1} />
        <rect x={pred.x} y={pred.y} width={pred.w} height={pred.h} fill={C.violet} opacity={0.1} />

        {/* Intersection (drawn on top, stronger). */}
        {inter && (
          <rect
            x={inter.x}
            y={inter.y}
            width={inter.w}
            height={inter.h}
            fill={C.green}
            opacity={0.45}
          />
        )}

        {/* Ground-truth box outline. */}
        <rect
          x={GT.x}
          y={GT.y}
          width={GT.w}
          height={GT.h}
          fill="none"
          stroke={C.blue}
          strokeWidth={2}
        />
        {/* Predicted box outline. */}
        <rect
          x={pred.x}
          y={pred.y}
          width={pred.w}
          height={pred.h}
          fill="none"
          stroke={C.coral}
          strokeWidth={2}
          strokeDasharray="5 3"
        />

        {/* Box legend (in the canvas's clear top-left, not over the boxes). */}
        <rect x={26} y={62} width={12} height={2.5} fill={C.blue} />
        <text x={44} y={66} fontSize={9} fill={C.blue} fontFamily={MONO} fontWeight={700}>
          ground truth
        </text>
        <line x1={26} y1={79} x2={38} y2={79} stroke={C.coral} strokeWidth={2.5} strokeDasharray="4 3" />
        <text x={44} y={82} fontSize={9} fill={C.coral} fontFamily={MONO} fontWeight={700}>
          prediction
        </text>

        {/* Shading legend (canvas bottom-left, clear band). */}
        <rect x={26} y={262} width={11} height={11} fill={C.green} opacity={0.45} />
        <text x={43} y={271} fontSize={9} fill={C.ink} fontFamily={MONO}>
          intersection
        </text>
        <rect x={160} y={262} width={11} height={11} fill={C.violet} opacity={0.2} />
        <text x={177} y={271} fontSize={9} fill={C.ink} fontFamily={MONO}>
          union
        </text>

        {/* ---------- Gauge (right) ---------- */}
        <text x={376} y={62} fontSize={9.5} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          IOU
        </text>
        <rect
          x={gaugeX}
          y={gaugeTop}
          width={18}
          height={gaugeH}
          rx={3}
          fill={C.card}
          stroke={C.line}
          strokeWidth={1}
        />
        <rect
          x={gaugeX}
          y={fillTop}
          width={18}
          height={gaugeBot - fillTop}
          rx={3}
          fill={C.green}
          opacity={0.8}
        />
        {/* Threshold tick marks + labels to the left of the bar. */}
        {thresholds.map((t) => {
          const ty = gaugeBot - t.v * gaugeH;
          return (
            <g key={t.label}>
              <line
                x1={gaugeX - 4}
                y1={ty}
                x2={gaugeX + 18}
                y2={ty}
                stroke={C.muted}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text
                x={gaugeX - 7}
                y={ty + 3}
                fontSize={8}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="end"
              >
                {t.label}
              </text>
            </g>
          );
        })}

        {/* ---------- Readout band ---------- */}
        <line x1={16} y1={300} x2={444} y2={300} stroke={C.line} strokeWidth={1} />

        {/* Formula line. */}
        <text x={16} y={320} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          IOU = intersection / union
        </text>
        <text x={250} y={320} fontSize={10} fill={C.muted} fontFamily={MONO}>
          = {Math.round(interArea)} / {Math.round(unionArea)}
        </text>

        {/* Value + verdict line. */}
        <text x={16} y={340} fontSize={11} fill={C.green} fontFamily={MONO} fontWeight={700}>
          IOU = {iou.toFixed(3)}
        </text>
        <text x={150} y={340} fontSize={10} fill={C.ink} fontFamily={MONO}>
          {verdict}
        </text>

        {/* Caption, split to fit width. */}
        <text x={16} y={360} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          Overlap over combined area: 1 = identical, 0 = no overlap.
        </text>
        <text x={16} y={374} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          The universal box-quality metric.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-1.5 font-mono">
          x
          <input
            type="range"
            min={PRED_X.min}
            max={PRED_X.max}
            step={1}
            value={px}
            onChange={(e) => setPx(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{px}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          y
          <input
            type="range"
            min={PRED_Y.min}
            max={PRED_Y.max}
            step={1}
            value={py}
            onChange={(e) => setPy(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{py}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          width
          <input
            type="range"
            min={PRED_W.min}
            max={PRED_W.max}
            step={1}
            value={pw}
            onChange={(e) => setPw(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{pw}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          height
          <input
            type="range"
            min={PRED_H.min}
            max={PRED_H.max}
            step={1}
            value={ph}
            onChange={(e) => setPh(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{ph}</span>
        </label>

        <button
          type="button"
          onClick={() => {
            setPx(GT.x);
            setPy(GT.y);
            setPw(GT.w);
            setPh(GT.h);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          snap to match (IOU=1)
        </button>
      </div>
    </div>
  );
}
