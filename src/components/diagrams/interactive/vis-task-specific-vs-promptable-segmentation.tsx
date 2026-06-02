"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..26) | panel headers (40..56) | two panels (60..372) |
//   GPT-analogy note (384..414) | readout band (422..476) | caption (492..520)
const VW = 600;
const VH = 540;

// ----- Left panel: three task-specific models -----
type TaskId = "tumor" | "road" | "satellite";
const TASKS: { id: TaskId; model: string; data: string; out: string }[] = [
  { id: "tumor", model: "Tumor model", data: "MRI scans", out: "tumor mask" },
  { id: "road", model: "Road model", data: "street photos", out: "road mask" },
  { id: "satellite", model: "Sat. model", data: "aerial tiles", out: "building mask" },
];

// ----- Right panel: SAM prompt modes -----
type PromptId = "point" | "box" | "mask";
const PROMPTS: { id: PromptId; label: string; full: string }[] = [
  {
    id: "point",
    label: "Point",
    full: "Point prompt: one click picks the object under the cursor to segment.",
  },
  {
    id: "box",
    label: "Box",
    full: "Box prompt: a rough rectangle tells SAM which region to segment.",
  },
  {
    id: "mask",
    label: "Mask",
    full: "Mask prompt: a coarse paint-over is refined into a clean mask.",
  },
];

// Layout geometry.
const MARGIN = 14;
const PANEL_TOP = 60;
const PANEL_H = 312;
const GAP = 16;
const PANEL_W = (VW - 2 * MARGIN - GAP) / 2; // ~278
const LX = MARGIN; // left panel x
const RX = MARGIN + PANEL_W + GAP; // right panel x

// Right-panel sample image box (where the user prompts).
const IMG_X = RX + 20;
const IMG_Y = PANEL_TOP + 70;
const IMG_W = PANEL_W - 40;
const IMG_H = 150;

// A hard-coded segmentation blob (the "object" SAM finds), as a closed path
// in fractional image coordinates so it scales with the image box.
const BLOB: [number, number][] = [
  [0.30, 0.28],
  [0.52, 0.20],
  [0.70, 0.34],
  [0.74, 0.58],
  [0.60, 0.74],
  [0.38, 0.72],
  [0.26, 0.52],
];

const blobPath = (): string => {
  const pts = BLOB.map(
    ([fx, fy]) => [IMG_X + fx * IMG_W, IMG_Y + fy * IMG_H] as const,
  );
  return (
    "M " +
    pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") +
    " Z"
  );
};

// Centroid of the blob (for the point prompt marker).
const blobCenter = (): [number, number] => {
  const sx = BLOB.reduce((a, [fx]) => a + fx, 0) / BLOB.length;
  const sy = BLOB.reduce((a, [, fy]) => a + fy, 0) / BLOB.length;
  return [IMG_X + sx * IMG_W, IMG_Y + sy * IMG_H];
};

// Bounding box of the blob (for the box prompt marker).
const blobBox = (): { x: number; y: number; w: number; h: number } => {
  const xs = BLOB.map(([fx]) => IMG_X + fx * IMG_W);
  const ys = BLOB.map(([, fy]) => IMG_Y + fy * IMG_H);
  const x0 = Math.min(...xs) - 6;
  const y0 = Math.min(...ys) - 6;
  const x1 = Math.max(...xs) + 6;
  const y1 = Math.max(...ys) + 6;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

export function VisPromptableSegmentation() {
  // Active SAM prompt mode on the right panel.
  const [prompt, setPrompt] = useState<PromptId>("point");
  // Whether SAM has produced its segmentation for the current prompt.
  const [segmented, setSegmented] = useState<boolean>(true);
  // Selected readout text (prompt explanation, or null = default hint).
  const [info, setInfo] = useState<PromptId | null>(null);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const choose = (id: PromptId): void => {
    setPrompt(id);
    setSegmented(true);
    setInfo(id);
  };

  const [cx, cy] = blobCenter();
  const bb = blobBox();
  const infoFull = info ? PROMPTS.find((p) => p.id === info)?.full ?? "" : "";

  // Per-task row geometry inside the left panel.
  const rowTop = PANEL_TOP + 24;
  const rowGap = (PANEL_H - 36) / 3;
  const boxW = 74;
  const boxH = 26;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Task-specific vs promptable segmentation. Left: three separate models, each trained on its own dataset and producing only its fixed mask. Right: one frozen SAM model segments anything based on a point, box, or rough-mask prompt. Choose a prompt to see SAM produce the matching segmentation."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          Task-Specific vs Promptable Segmentation
        </text>

        {/* Panel headers */}
        <text
          x={LX + PANEL_W / 2}
          y={50}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={11}
          fill={C.coral}
        >
          Old way: one model per task
        </text>
        <text
          x={RX + PANEL_W / 2}
          y={50}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={11}
          fill={C.green}
        >
          SAM: one promptable model
        </text>

        {/* Panel frames */}
        <rect
          x={LX}
          y={PANEL_TOP}
          width={PANEL_W}
          height={PANEL_H}
          rx={8}
          fill="var(--card)"
          stroke={C.coral}
          strokeWidth={1}
          opacity={0.9}
        />
        <rect
          x={RX}
          y={PANEL_TOP}
          width={PANEL_W}
          height={PANEL_H}
          rx={8}
          fill="var(--card)"
          stroke={C.green}
          strokeWidth={1}
          opacity={0.9}
        />

        {/* ---- LEFT PANEL: three task-specific pipelines ---- */}
        {TASKS.map((t, i) => {
          const yc = rowTop + i * rowGap + rowGap / 2;
          const dataX = LX + 14;
          const modelX = LX + 102;
          const outX = LX + PANEL_W - 14 - boxW;
          return (
            <g key={t.id}>
              {/* dataset box */}
              <rect
                x={dataX}
                y={yc - boxH / 2}
                width={boxW}
                height={boxH}
                rx={4}
                fill={C.coralFill}
                stroke={C.coral}
                strokeWidth={1}
              />
              <text
                x={dataX + boxW / 2}
                y={yc + 3}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.ink}
              >
                {t.data}
              </text>

              {/* arrow data -> model */}
              <line
                x1={dataX + boxW}
                y1={yc}
                x2={modelX}
                y2={yc}
                stroke={C.muted}
                strokeWidth={1}
              />
              <path
                d={`M ${modelX} ${yc} l -5 -3 l 0 6 z`}
                fill={C.muted}
              />

              {/* model box */}
              <rect
                x={modelX}
                y={yc - boxH / 2}
                width={boxW}
                height={boxH}
                rx={4}
                fill={C.coralFill}
                stroke={C.coral}
                strokeWidth={1.3}
              />
              <text
                x={modelX + boxW / 2}
                y={yc + 3}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.ink}
              >
                {t.model}
              </text>

              {/* arrow model -> output */}
              <line
                x1={modelX + boxW}
                y1={yc}
                x2={outX}
                y2={yc}
                stroke={C.muted}
                strokeWidth={1}
              />
              <path d={`M ${outX} ${yc} l -5 -3 l 0 6 z`} fill={C.muted} />

              {/* fixed output box */}
              <rect
                x={outX}
                y={yc - boxH / 2}
                width={boxW}
                height={boxH}
                rx={4}
                fill="var(--background)"
                stroke={C.line}
                strokeWidth={1}
              />
              <text
                x={outX + boxW / 2}
                y={yc + 3}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.muted}
              >
                {t.out}
              </text>
            </g>
          );
        })}
        {/* left-panel footnote */}
        <text
          x={LX + PANEL_W / 2}
          y={PANEL_TOP + PANEL_H - 8}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          3 datasets, 3 trainings, 3 fixed outputs.
        </text>

        {/* ---- RIGHT PANEL: one model, prompt picks the target ---- */}
        {/* "one frozen model" pill */}
        <rect
          x={RX + PANEL_W / 2 - 60}
          y={PANEL_TOP + 14}
          width={120}
          height={22}
          rx={11}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1.3}
        />
        <text
          x={RX + PANEL_W / 2}
          y={PANEL_TOP + 29}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
        >
          one frozen SAM
        </text>

        {/* sample image */}
        <rect
          x={IMG_X}
          y={IMG_Y}
          width={IMG_W}
          height={IMG_H}
          rx={4}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />
        {/* faint "object" outline always visible in the image */}
        <path d={blobPath()} fill={C.grid} stroke={C.line} strokeWidth={1} />

        {/* segmentation result (when SAM has run) */}
        {segmented && (
          <path
            d={blobPath()}
            fill={C.greenFill}
            stroke={C.green}
            strokeWidth={2}
            opacity={0.85}
          />
        )}

        {/* prompt marker overlays */}
        {prompt === "point" && (
          <>
            <circle cx={cx} cy={cy} r={5} fill={C.green} />
            <circle
              cx={cx}
              cy={cy}
              r={9}
              fill="none"
              stroke={C.green}
              strokeWidth={1}
            />
          </>
        )}
        {prompt === "box" && (
          <rect
            x={bb.x}
            y={bb.y}
            width={bb.w}
            height={bb.h}
            rx={2}
            fill="none"
            stroke={C.green}
            strokeWidth={1.4}
            strokeDasharray="4 3"
          />
        )}
        {prompt === "mask" && (
          <path
            d={blobPath()}
            fill="none"
            stroke={C.violet}
            strokeWidth={2.5}
            strokeDasharray="3 3"
            opacity={0.9}
          />
        )}

        {/* image caption (own line below image, inside panel) */}
        <text
          x={RX + PANEL_W / 2}
          y={IMG_Y + IMG_H + 18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
        >
          {prompt === "point"
            ? "click a point → segment that object"
            : prompt === "box"
              ? "drag a box → segment inside it"
              : "paint a rough mask → SAM refines it"}
        </text>
        {/* right-panel footnote */}
        <text
          x={RX + PANEL_W / 2}
          y={PANEL_TOP + PANEL_H - 8}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={8}
          fill={C.muted}
        >
          same weights segment unseen objects too.
        </text>

        {/* ---- GPT-analogy note band ---- */}
        <rect
          x={MARGIN}
          y={384}
          width={VW - 2 * MARGIN}
          height={30}
          rx={6}
          fill="var(--card)"
          stroke={C.violet}
          strokeWidth={1}
        />
        <text
          x={VW / 2}
          y={403}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.violet}
        >
          Like GPT: one model, the prompt encodes the task.
        </text>

        {/* ---- readout band ---- */}
        <rect
          x={MARGIN}
          y={422}
          width={VW - 2 * MARGIN}
          height={52}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {info ? (
          <>
            <text
              x={MARGIN + 12}
              y={441}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.green}
            >
              {PROMPTS.find((p) => p.id === info)?.label} prompt
            </text>
            <text
              x={MARGIN + 12}
              y={461}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.ink}
            >
              {infoFull}
            </text>
          </>
        ) : (
          <>
            <text
              x={MARGIN + 12}
              y={445}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
            >
              Pick a prompt below — point, box, or mask — and watch
            </text>
            <text
              x={MARGIN + 12}
              y={463}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
            >
              the one model segment whatever you point at.
            </text>
          </>
        )}

        {/* ---- caption band ---- */}
        <text
          x={VW / 2}
          y={494}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Stop training one model per task. Train one promptable
        </text>
        <text
          x={VW / 2}
          y={510}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          model and let the prompt say what to segment.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {PROMPTS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={btn}
            style={
              prompt === p.id
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => choose(p.id)}
          >
            {p.label} prompt
          </button>
        ))}
        <button
          type="button"
          className={btn}
          style={
            !segmented ? { background: C.ink, color: "var(--background)" } : undefined
          }
          onClick={() => setSegmented((s) => !s)}
        >
          {segmented ? "Hide segmentation" : "Show segmentation"}
        </button>
      </div>
    </div>
  );
}
