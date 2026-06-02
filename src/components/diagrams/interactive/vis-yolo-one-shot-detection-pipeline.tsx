"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// YOLO: One-Shot Detection Pipeline.
// The whole detector is a SINGLE forward pass:
//   (1) resize the image to 448x448,
//   (2) one CNN forward pass over the whole image,
//   (3) the net predicts an S x S grid of boxes + confidences; threshold by
//       confidence and run NMS -> final boxes drawn back on the image.
// Contrast inset: pre-YOLO detectors (R-CNN) ran the classifier ~2000 times
// per image (one look per region proposal); YOLO looks once.

// --- geometry --------------------------------------------------------------
const VB_W = 560;
const VB_H = 396;

// Three pipeline stages, laid out left -> right in their own band.
const STAGE_Y = 70;
const STAGE_H = 150;

// Stage 1: input image.
const IMG_X = 24;
const IMG_W = 110;

// Stage 2: CNN block.
const CNN_X = 178;
const CNN_W = 96;

// Stage 3: grid / output image.
const OUT_X = 318;
const OUT_W = 110;

// S x S detection grid.
const GRID_S = 7;

// Animation: 0 = idle, then resize -> cnn -> grid -> boxes.
const FRAMES_RESIZE = 3;
const FRAMES_CNN = 5;
const FRAMES_GRID = 3;
const FRAMES_BOXES = 3;
const F_RESIZE_END = FRAMES_RESIZE;
const F_CNN_END = F_RESIZE_END + FRAMES_CNN;
const F_GRID_END = F_CNN_END + FRAMES_GRID;
const TOTAL_FRAMES = F_GRID_END + FRAMES_BOXES;

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

type Phase = "idle" | "resize" | "cnn" | "grid" | "boxes" | "done";

function phaseAt(frame: number): Phase {
  if (frame <= 0) return "idle";
  if (frame < F_RESIZE_END) return "resize";
  if (frame < F_CNN_END) return "cnn";
  if (frame < F_GRID_END) return "grid";
  if (frame < TOTAL_FRAMES) return "boxes";
  return "done";
}

// --- hard-coded detections -------------------------------------------------
// Each box is positioned relative to the output image (fractions 0..1) with a
// model confidence. The slider keeps boxes whose conf >= threshold.
type Det = {
  id: string;
  label: string;
  x: number; // left, fraction of image
  y: number; // top, fraction of image
  w: number; // fraction
  h: number; // fraction
  conf: number; // 0..1
  color: string;
  fill: string;
};

const DETS: Det[] = [
  { id: "dog", label: "dog", x: 0.08, y: 0.46, w: 0.42, h: 0.46, conf: 0.92, color: C.blue, fill: C.blueFill },
  { id: "bike", label: "bike", x: 0.30, y: 0.30, w: 0.58, h: 0.60, conf: 0.78, color: C.coral, fill: C.coralFill },
  { id: "car", label: "car", x: 0.60, y: 0.16, w: 0.34, h: 0.26, conf: 0.55, color: C.green, fill: C.greenFill },
  { id: "pot", label: "plant", x: 0.04, y: 0.10, w: 0.20, h: 0.24, conf: 0.34, color: C.violet, fill: "var(--card)" },
];

export function VisYoloPipeline() {
  const [frame, setFrame] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [thresh, setThresh] = useState<number>(0.5);

  const frameRef = useRef<number>(frame);
  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = frameRef.current + 1;
      if (next >= TOTAL_FRAMES) {
        setFrame(TOTAL_FRAMES);
        setPlaying(false);
      } else {
        setFrame(next);
      }
    }, 320);
    return () => clearInterval(id);
  }, [playing]);

  function onDetect(): void {
    if (frame >= TOTAL_FRAMES || playing) {
      setPlaying(false);
      setFrame(0);
      // restart on next tick via the play toggle below
      setTimeout(() => setPlaying(true), 0);
      return;
    }
    setFrame(0);
    setPlaying(true);
  }
  function onReset(): void {
    setPlaying(false);
    setFrame(0);
  }

  const phase = phaseAt(frame);
  const resizeDone = frame >= F_RESIZE_END;
  const cnnActive = phase === "cnn";
  const cnnDone = frame >= F_CNN_END;
  const gridShown = frame >= F_CNN_END; // grid appears once CNN is done
  const boxesShown = frame >= F_GRID_END;

  // CNN fill progress while active.
  const cnnFrac = Math.min(
    1,
    Math.max(0, (frame - F_RESIZE_END + 1) / FRAMES_CNN),
  );

  // Build grid cell indices.
  const cells: number[] = [];
  for (let i = 0; i < GRID_S * GRID_S; i++) cells.push(i);

  // Kept detections (conf >= threshold), only counted once boxes are shown.
  const kept = DETS.filter((d) => d.conf >= thresh);
  const keptShown = boxesShown ? kept : [];

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="YOLO one-shot detection pipeline: resize, one CNN pass, grid prediction, threshold and NMS"
      >
        {/* ---- title band ---- */}
        <text
          x={VB_W / 2}
          y={24}
          fontSize={14}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          YOLO: One-Shot Detection Pipeline
        </text>
        <text
          x={VB_W / 2}
          y={42}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          image to boxes in a single forward pass
        </text>

        {/* ================= STAGE 1: INPUT / RESIZE ================= */}
        <g>
          <text
            x={IMG_X + IMG_W / 2}
            y={STAGE_Y - 6}
            fontSize={10}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="middle"
            fontWeight={600}
          >
            1. resize
          </text>
          <rect
            x={IMG_X}
            y={STAGE_Y}
            width={IMG_W}
            height={IMG_W}
            rx={4}
            fill="var(--card)"
            stroke={phase === "resize" ? C.blue : C.line}
            strokeWidth={phase === "resize" ? 1.8 : 1}
          />
          {/* a simple "scene" inside the input image */}
          <circle
            cx={IMG_X + IMG_W * 0.32}
            cy={STAGE_Y + IMG_W * 0.66}
            r={IMG_W * 0.16}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1}
          />
          <rect
            x={IMG_X + IMG_W * 0.5}
            y={STAGE_Y + IMG_W * 0.34}
            width={IMG_W * 0.34}
            height={IMG_W * 0.34}
            rx={2}
            fill={C.coralFill}
            stroke={C.coral}
            strokeWidth={1}
          />
          <text
            x={IMG_X + IMG_W / 2}
            y={STAGE_Y + IMG_W + 16}
            fontSize={9}
            fill={resizeDone ? C.green : C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            448 x 448
          </text>
        </g>

        {/* arrow stage1 -> stage2 */}
        <ArrowR
          x={IMG_X + IMG_W + 6}
          xEnd={CNN_X - 6}
          y={STAGE_Y + IMG_W / 2}
          active={frame >= F_RESIZE_END}
        />

        {/* ================= STAGE 2: CNN FORWARD PASS ================= */}
        <g>
          <text
            x={CNN_X + CNN_W / 2}
            y={STAGE_Y - 6}
            fontSize={10}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="middle"
            fontWeight={600}
          >
            2. one CNN
          </text>
          {/* stacked conv layers shown as nested slabs */}
          {[0, 1, 2, 3].map((k) => {
            const inset = k * 9;
            const w = CNN_W - inset * 2;
            const x = CNN_X + inset;
            const y = STAGE_Y + 14 + k * 6;
            const h = CNN_W + 6 - k * 12;
            const lit = cnnActive && cnnFrac >= (k + 1) / 4;
            return (
              <rect
                key={`conv-${k}`}
                x={x}
                y={y}
                width={w}
                height={h}
                rx={3}
                fill={lit || cnnDone ? C.blueFill : "var(--card)"}
                stroke={cnnActive || cnnDone ? C.blue : C.line}
                strokeWidth={cnnActive || cnnDone ? 1.4 : 1}
                opacity={cnnActive ? (lit ? 1 : 0.4) : cnnDone ? 1 : 0.6}
              />
            );
          })}
          <text
            x={CNN_X + CNN_W / 2}
            y={STAGE_Y + IMG_W + 16}
            fontSize={9}
            fill={cnnDone ? C.green : C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            single pass
          </text>
        </g>

        {/* arrow stage2 -> stage3 */}
        <ArrowR
          x={CNN_X + CNN_W + 6}
          xEnd={OUT_X - 6}
          y={STAGE_Y + IMG_W / 2}
          active={frame >= F_CNN_END}
        />

        {/* ================= STAGE 3: GRID + BOXES ================= */}
        <g>
          <text
            x={OUT_X + OUT_W / 2}
            y={STAGE_Y - 6}
            fontSize={10}
            fill={C.ink}
            fontFamily={MONO}
            textAnchor="middle"
            fontWeight={600}
          >
            3. grid + NMS
          </text>
          <rect
            x={OUT_X}
            y={STAGE_Y}
            width={OUT_W}
            height={OUT_W}
            rx={4}
            fill="var(--card)"
            stroke={phase === "grid" || phase === "boxes" ? C.coral : C.line}
            strokeWidth={phase === "grid" || phase === "boxes" ? 1.8 : 1}
          />

          {/* S x S grid lines, shown once CNN produces the grid */}
          {gridShown &&
            cells.map((i) => {
              const r = Math.floor(i / GRID_S);
              const c = i % GRID_S;
              const cw = OUT_W / GRID_S;
              return (
                <rect
                  key={`cell-${i}`}
                  x={OUT_X + c * cw}
                  y={STAGE_Y + r * cw}
                  width={cw}
                  height={cw}
                  fill="none"
                  stroke={C.grid}
                  strokeWidth={0.6}
                />
              );
            })}

          {/* faint "scene" echoed in the output image */}
          {gridShown && (
            <>
              <circle
                cx={OUT_X + OUT_W * 0.32}
                cy={STAGE_Y + OUT_W * 0.66}
                r={OUT_W * 0.16}
                fill={C.blueFill}
                stroke="none"
                opacity={0.5}
              />
              <rect
                x={OUT_X + OUT_W * 0.5}
                y={STAGE_Y + OUT_W * 0.34}
                width={OUT_W * 0.34}
                height={OUT_W * 0.34}
                rx={2}
                fill={C.coralFill}
                stroke="none"
                opacity={0.5}
              />
            </>
          )}

          {/* final detection boxes (thresholded + NMS) */}
          {keptShown.map((d) => {
            const bx = OUT_X + d.x * OUT_W;
            const by = STAGE_Y + d.y * OUT_W;
            const bw = d.w * OUT_W;
            const bh = d.h * OUT_W;
            return (
              <g key={`box-${d.id}`}>
                <rect
                  x={bx}
                  y={by}
                  width={bw}
                  height={bh}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={1.8}
                  rx={1}
                />
                {/* label chip above the box */}
                <rect
                  x={bx}
                  y={by - 11}
                  width={d.label.length * 5.2 + 6}
                  height={10}
                  fill={d.color}
                  rx={1}
                />
                <text
                  x={bx + 3}
                  y={by - 3}
                  fontSize={8}
                  fill="var(--background)"
                  fontFamily={MONO}
                >
                  {d.label}
                </text>
              </g>
            );
          })}

          <text
            x={OUT_X + OUT_W / 2}
            y={STAGE_Y + IMG_W + 16}
            fontSize={9}
            fill={boxesShown ? C.green : C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {`${GRID_S}x${GRID_S} cells`}
          </text>
        </g>

        {/* ================= READOUT BAND ================= */}
        <rect
          x={12}
          y={STAGE_Y + STAGE_H + 6}
          width={VB_W - 24}
          height={40}
          rx={5}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={24}
          y={STAGE_Y + STAGE_H + 24}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          {phase === "idle"
            ? "ready"
            : phase === "resize"
              ? "resizing to 448 x 448"
              : phase === "cnn"
                ? "one CNN forward pass over whole image"
                : phase === "grid"
                  ? "grid predicts boxes + confidences"
                  : phase === "boxes"
                    ? "threshold + NMS -> final boxes"
                    : "done: one look, all boxes"}
        </text>
        <text
          x={24}
          y={STAGE_Y + STAGE_H + 39}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          {`threshold ${thresh.toFixed(2)} -> ${kept.length} of ${DETS.length} boxes kept`}
        </text>

        {/* ================= CONTRAST INSET ================= */}
        <rect
          x={444}
          y={STAGE_Y}
          width={VB_W - 444 - 16}
          height={STAGE_H}
          rx={5}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={444 + (VB_W - 444 - 16) / 2}
          y={STAGE_Y + 16}
          fontSize={9}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          looks / image
        </text>
        {/* R-CNN: ~2000 looks */}
        <text
          x={452}
          y={STAGE_Y + 38}
          fontSize={9}
          fill={C.coral}
          fontFamily={MONO}
          fontWeight={600}
        >
          R-CNN
        </text>
        <text
          x={452}
          y={STAGE_Y + 51}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          ~2000 passes
        </text>
        {/* many tiny ticks to suggest many looks */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
          <rect
            key={`rcnn-${k}`}
            x={452 + k * 7}
            y={STAGE_Y + 58}
            width={4}
            height={12}
            rx={1}
            fill={C.coralFill}
            stroke={C.coral}
            strokeWidth={0.8}
          />
        ))}
        {/* YOLO: 1 look */}
        <text
          x={452}
          y={STAGE_Y + 92}
          fontSize={9}
          fill={C.blue}
          fontFamily={MONO}
          fontWeight={600}
        >
          YOLO
        </text>
        <text
          x={452}
          y={STAGE_Y + 105}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          1 pass
        </text>
        <rect
          x={452}
          y={STAGE_Y + 112}
          width={28}
          height={14}
          rx={2}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <text
          x={452}
          y={STAGE_Y + 142}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
        >
          one look,
        </text>
        <text
          x={452}
          y={STAGE_Y + 152}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
        >
          not 2000
        </text>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={onDetect}>
          {playing ? "Detecting..." : frame >= TOTAL_FRAMES ? "Detect again" : "Detect"}
        </button>
        <button type="button" className={btn} onClick={onReset}>
          Reset
        </button>
        <label className="flex items-center gap-2">
          <span className="font-mono text-[var(--muted)]">confidence</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={thresh}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setThresh(parseFloat(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{thresh.toFixed(2)}</span>
        </label>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {`phase: ${phase}`}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Resize, one CNN pass, threshold + NMS. The whole detector is a single
        forward pass.
      </p>
    </div>
  );
}

// A short right-pointing arrow between pipeline stages.
function ArrowR({
  x,
  xEnd,
  y,
  active,
}: {
  x: number;
  xEnd: number;
  y: number;
  active: boolean;
}) {
  const color = active ? C.ink : C.line;
  return (
    <g stroke={color} fill={color}>
      <line x1={x} y1={y} x2={xEnd - 4} y2={y} strokeWidth={1.4} />
      <polygon
        points={`${xEnd},${y} ${xEnd - 6},${y - 3.5} ${xEnd - 6},${y + 3.5}`}
        stroke="none"
      />
    </g>
  );
}
