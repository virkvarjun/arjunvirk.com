"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// viewBox geometry. Bands top-to-bottom:
//   title (0..30) | drawing: image (left) + pipeline panel (right) (44..286) |
//   readout band (~300) | caption band (322..356)
const VW = 520;
const VH = 380;

// Image frame (the "scene" the classifier scans).
const IMG_X = 18;
const IMG_Y = 46;
const IMG_W = 244;
const IMG_H = 196;

// Three window scales (w,h in px). The classifier window slides at each scale
// across a grid of positions; total cost = positions * scales.
type Scale = { w: number; h: number; cols: number; rows: number };
const SCALES: Scale[] = [
  { w: 44, h: 84, cols: 5, rows: 3 },
  { w: 58, h: 110, cols: 4, rows: 2 },
  { w: 76, h: 144, cols: 3, rows: 1 },
];

// The "true" object location (a pedestrian) inside the image, plus the scale
// index at which the detector fires. Hard-coded for determinism.
const TARGET = { x: IMG_X + 150, y: IMG_Y + 64, w: 58, h: 110 };
const HIT_SCALE = 1;

// Flatten every (scale, col, row) window into a deterministic scan order.
type Win = {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  score: number; // pre-baked classifier score 0..1
};

function buildWindows(): Win[] {
  const out: Win[] = [];
  for (let s = 0; s < SCALES.length; s++) {
    const sc = SCALES[s];
    const stepX = (IMG_W - sc.w) / Math.max(1, sc.cols - 1);
    const stepY = (IMG_H - sc.h) / Math.max(1, sc.rows - 1);
    for (let r = 0; r < sc.rows; r++) {
      for (let c = 0; c < sc.cols; c++) {
        const x = IMG_X + (sc.cols === 1 ? (IMG_W - sc.w) / 2 : c * stepX);
        const y = IMG_Y + (sc.rows === 1 ? (IMG_H - sc.h) / 2 : r * stepY);
        // Score: high only when the window overlaps the target at the hit scale.
        const cx = x + sc.w / 2;
        const cy = y + sc.h / 2;
        const tcx = TARGET.x + TARGET.w / 2;
        const tcy = TARGET.y + TARGET.h / 2;
        const near =
          Math.abs(cx - tcx) < 16 && Math.abs(cy - tcy) < 22 && s === HIT_SCALE;
        const score = near ? 0.92 : 0.18 + ((c * 7 + r * 3 + s * 5) % 5) * 0.05;
        out.push({ x, y, w: sc.w, h: sc.h, scale: s, score });
      }
    }
  }
  return out;
}

const WINDOWS: Win[] = buildWindows();
const TOTAL = WINDOWS.length;

// Pipeline stages, each individually hand-tuned (conveys the complexity).
const STAGES: { id: string; label: string; note: string }[] = [
  { id: "hog", label: "1  HOG features", note: "hand-crafted gradients" },
  { id: "root", label: "2  Root template", note: "whole-object filter" },
  { id: "parts", label: "3  Part filters", note: "head / torso / legs" },
  { id: "deform", label: "4  Deformation", note: "small part shifts" },
  { id: "combine", label: "5  Combine score", note: "root + parts − cost" },
];

export function VisDpmSlidingWindow() {
  const [idx, setIdx] = useState<number>(0); // current scanned window index
  const [scanning, setScanning] = useState<boolean>(false);
  const [showAll, setShowAll] = useState<boolean>(false);
  const idxRef = useRef<number>(0);

  // Drive the scan: advance the window index on an interval while scanning.
  useEffect(() => {
    if (!scanning) return;
    const id = window.setInterval(() => {
      idxRef.current += 1;
      if (idxRef.current >= TOTAL) {
        idxRef.current = TOTAL - 1;
        setIdx(TOTAL - 1);
        setScanning(false);
        return;
      }
      setIdx(idxRef.current);
    }, 90);
    return () => window.clearInterval(id);
  }, [scanning]);

  const cur = WINDOWS[idx];
  const detected = cur.score > 0.8;

  const startScan = (): void => {
    idxRef.current = 0;
    setIdx(0);
    setShowAll(false);
    setScanning(true);
  };
  const reset = (): void => {
    setScanning(false);
    idxRef.current = 0;
    setIdx(0);
    setShowAll(false);
  };

  // Pipeline panel geometry (right side).
  const panelX = IMG_X + IMG_W + 22;
  const panelW = VW - panelX - 18;
  const stageY = (i: number): number => IMG_Y + 28 + i * 36;

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Pre-deep-learning object detection slides a hand-crafted classifier window across an image at many positions and several scales. The scan visits every window in turn and fires only where the score is high. A panel lists the separate, individually tuned pipeline stages, HOG features, a root template, part templates, deformation, and a combined score, showing why the approach was accurate but slow."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={22}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          DPM: Detection by Sliding Window
        </text>

        {/* Image frame */}
        <rect
          x={IMG_X}
          y={IMG_Y}
          width={IMG_W}
          height={IMG_H}
          rx={5}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.4}
        />
        <text
          x={IMG_X + 6}
          y={IMG_Y - 6}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          image · scan all positions × all scales
        </text>

        {/* Ground feel: a faint "ground line" so the scene reads as a photo */}
        <line
          x1={IMG_X + 6}
          y1={IMG_Y + IMG_H - 14}
          x2={IMG_X + IMG_W - 6}
          y2={IMG_Y + IMG_H - 14}
          stroke={C.grid}
          strokeWidth={1}
        />

        {/* Target object (the pedestrian) drawn as a simple figure */}
        <g opacity={0.9}>
          <circle
            cx={TARGET.x + TARGET.w / 2}
            cy={TARGET.y + 16}
            r={9}
            fill={C.greenFill}
            stroke={C.green}
            strokeWidth={1.2}
          />
          <line
            x1={TARGET.x + TARGET.w / 2}
            y1={TARGET.y + 25}
            x2={TARGET.x + TARGET.w / 2}
            y2={TARGET.y + TARGET.h - 28}
            stroke={C.green}
            strokeWidth={2}
          />
          <line
            x1={TARGET.x + 12}
            y1={TARGET.y + 42}
            x2={TARGET.x + TARGET.w - 12}
            y2={TARGET.y + 42}
            stroke={C.green}
            strokeWidth={2}
          />
          <line
            x1={TARGET.x + TARGET.w / 2}
            y1={TARGET.y + TARGET.h - 28}
            x2={TARGET.x + 14}
            y2={TARGET.y + TARGET.h - 4}
            stroke={C.green}
            strokeWidth={2}
          />
          <line
            x1={TARGET.x + TARGET.w / 2}
            y1={TARGET.y + TARGET.h - 28}
            x2={TARGET.x + TARGET.w - 14}
            y2={TARGET.y + TARGET.h - 4}
            stroke={C.green}
            strokeWidth={2}
          />
        </g>

        {/* All candidate windows (ghosted) when showAll, to convey volume */}
        {showAll &&
          WINDOWS.map((w, i) => (
            <rect
              key={`all-${i}`}
              x={w.x}
              y={w.y}
              width={w.w}
              height={w.h}
              rx={2}
              fill="none"
              stroke={C.line}
              strokeWidth={0.8}
              opacity={0.5}
            />
          ))}

        {/* The current scanned window (or detection) */}
        <rect
          x={cur.x}
          y={cur.y}
          width={cur.w}
          height={cur.h}
          rx={3}
          fill={detected ? C.greenFill : C.blueFill}
          stroke={detected ? C.green : C.blue}
          strokeWidth={detected ? 2.4 : 1.6}
          opacity={detected ? 0.95 : 0.85}
        />
        {detected && (
          <text
            x={cur.x + cur.w / 2}
            y={cur.y - 5}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={9}
            fill={C.green}
          >
            detection!
          </text>
        )}

        {/* Pipeline panel header */}
        <text
          x={panelX}
          y={IMG_Y + 6}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
        >
          per-window pipeline
        </text>
        <text
          x={panelX}
          y={IMG_Y + 19}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
        >
          5 separate hand-tuned stages
        </text>

        {/* Pipeline stages */}
        {STAGES.map((st, i) => {
          const y = stageY(i);
          return (
            <g key={st.id}>
              <rect
                x={panelX}
                y={y}
                width={panelW}
                height={28}
                rx={4}
                fill="var(--card)"
                stroke={C.line}
                strokeWidth={1}
              />
              <text
                x={panelX + 8}
                y={y + 12}
                fontFamily={MONO}
                fontSize={9.5}
                fill={C.ink}
              >
                {st.label}
              </text>
              <text
                x={panelX + 8}
                y={y + 23}
                fontFamily={MONO}
                fontSize={8}
                fill={C.muted}
              >
                {st.note}
              </text>
              {i < STAGES.length - 1 && (
                <line
                  x1={panelX + 14}
                  y1={y + 28}
                  x2={panelX + 14}
                  y2={y + 36}
                  stroke={C.line}
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}

        {/* Readout band (own clear horizontal band below the drawing) */}
        <text
          x={IMG_X}
          y={IMG_Y + IMG_H + 26}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
        >
          window {idx + 1} / {TOTAL}
        </text>
        <text
          x={IMG_X + 116}
          y={IMG_Y + IMG_H + 26}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
        >
          scale {cur.scale + 1} / {SCALES.length}
        </text>
        <text
          x={IMG_X + 230}
          y={IMG_Y + IMG_H + 26}
          fontFamily={MONO}
          fontSize={10}
          fill={detected ? C.green : C.muted}
        >
          score {cur.score.toFixed(2)}
        </text>

        {/* Cost note */}
        <text
          x={IMG_X}
          y={IMG_Y + IMG_H + 42}
          fontFamily={MONO}
          fontSize={9}
          fill={C.coral}
        >
          cost = positions × scales × 5 stages = {TOTAL} windows
        </text>

        {/* Caption band, split so each line fits within VW - 24 px */}
        <text
          x={VW / 2}
          y={VH - 26}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Slide a hand-crafted classifier everywhere, at every scale,
        </text>
        <text
          x={VW / 2}
          y={VH - 12}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          accurate-ish, but slow and built from many separate pieces.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={scanning ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={startScan}
        >
          {scanning ? "scanning…" : "scan"}
        </button>
        <button type="button" className={btn} onClick={reset}>
          reset
        </button>
        <button
          type="button"
          className={btn}
          style={showAll ? { background: C.ink, color: "var(--background)" } : undefined}
          onClick={() => setShowAll((s: boolean) => !s)}
        >
          {showAll ? "hide all windows" : "show all windows"}
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono">window</span>
          <input
            type="range"
            min={0}
            max={TOTAL - 1}
            step={1}
            value={idx}
            onChange={(e) => {
              setScanning(false);
              idxRef.current = Number(e.target.value);
              setIdx(Number(e.target.value));
            }}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{idx + 1}</span>
        </label>
      </div>
    </div>
  );
}
