"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Mask R-CNN: Three Branches per Region.
// Faster R-CNN proposes regions of interest (RoIs). Mask R-CNN keeps the two
// Faster R-CNN heads (class, refined box) and ADDS a third parallel head: a
// small fully-convolutional network that predicts a 28x28 binary mask per RoI.
// All three branches read the SAME RoI-aligned features.
//   - Picking a region shows its class, refined box and per-instance mask.
//   - Toggle "instance vs semantic" to contrast per-region masks (each dog
//     painted separately) with one merged blob that loses instances.

const VB_W = 560;
const VB_H = 432;

// Three detected, overlapping dog instances in the source image.
type Region = {
  id: number;
  label: string;
  cls: string;
  conf: string;
  // box in image-panel coordinates
  bx: number;
  by: number;
  bw: number;
  bh: number;
  color: string;
  fill: string;
};

// Image panel geometry.
const IMG_X = 16;
const IMG_Y = 64;
const IMG_W = 220;
const IMG_H = 200;

const REGIONS: Region[] = [
  {
    id: 0,
    label: "R1",
    cls: "dog",
    conf: "0.97",
    bx: IMG_X + 18,
    by: IMG_Y + 30,
    bw: 96,
    bh: 120,
    color: C.blue,
    fill: C.blueFill,
  },
  {
    id: 1,
    label: "R2",
    cls: "dog",
    conf: "0.93",
    bx: IMG_X + 70,
    by: IMG_Y + 54,
    bw: 100,
    bh: 122,
    color: C.coral,
    fill: C.coralFill,
  },
  {
    id: 2,
    label: "R3",
    cls: "dog",
    conf: "0.88",
    bx: IMG_X + 118,
    by: IMG_Y + 20,
    bw: 84,
    bh: 132,
    color: C.green,
    fill: C.greenFill,
  },
];

// A deterministic 8x8 "mask" stencil for the selected instance (1 = painted).
// A rough dog-blob silhouette so each instance reads as a per-pixel mask.
const MASK_GRID = 8;
const MASK_STENCIL: number[][] = [
  [0, 0, 1, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 0, 1, 1, 0],
  [0, 0, 1, 1, 0, 1, 1, 0],
];

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

// Shared-features block geometry (the RoI features feeding all branches).
const FEAT_X = 252;
const FEAT_Y = 150;
const FEAT_W = 66;
const FEAT_H = 56;

// Three branch cards on the right.
const BR_X = 372;
const BR_W = 172;
const BR_H = 64;
const BR_GAP = 12;
const BR_Y0 = 70;

type Mode = "instance" | "semantic";

export function VisMaskRcnn() {
  const [selected, setSelected] = useState<number>(0);
  const [mode, setMode] = useState<Mode>("instance");

  const region = REGIONS[selected];

  // Branch card vertical positions.
  const branchY = (i: number): number => BR_Y0 + i * (BR_H + BR_GAP);
  const featCx = FEAT_X + FEAT_W / 2;
  const featCy = FEAT_Y + FEAT_H / 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Mask R-CNN adds a third branch: per region of interest, three parallel heads predict class, refined box, and a binary mask"
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
          Mask R-CNN: Three Branches per Region
        </text>
        <text
          x={VB_W / 2}
          y={42}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          image &#8594; region proposals &#8594; 3 parallel heads per RoI
        </text>

        {/* ================= IMAGE PANEL ================= */}
        <text
          x={IMG_X}
          y={IMG_Y - 6}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          image + proposals
        </text>
        <rect
          x={IMG_X}
          y={IMG_Y}
          width={IMG_W}
          height={IMG_H}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* three overlapping dog instances drawn as soft blobs */}
        {REGIONS.map((r) => {
          const isSel = r.id === selected;
          // In semantic mode every instance is the same merged color.
          const merged = mode === "semantic";
          return (
            <ellipse
              key={`blob-${r.id}`}
              cx={r.bx + r.bw / 2}
              cy={r.by + r.bh / 2}
              rx={r.bw / 2 - 6}
              ry={r.bh / 2 - 6}
              fill={merged ? C.violet : r.fill}
              stroke={merged ? C.violet : r.color}
              strokeWidth={1}
              opacity={merged ? 0.5 : isSel ? 0.9 : 0.45}
            />
          );
        })}

        {/* region boxes (clickable) */}
        {REGIONS.map((r) => {
          const isSel = r.id === selected;
          return (
            <g
              key={`box-${r.id}`}
              onClick={() => setSelected(r.id)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={r.bx}
                y={r.by}
                width={r.bw}
                height={r.bh}
                rx={3}
                fill="transparent"
                stroke={r.color}
                strokeWidth={isSel ? 2.4 : 1}
                strokeDasharray={isSel ? undefined : "3 3"}
                opacity={isSel ? 1 : 0.7}
              />
              <rect
                x={r.bx}
                y={r.by - 13}
                width={26}
                height={13}
                rx={2}
                fill={isSel ? r.color : "var(--card)"}
                stroke={r.color}
                strokeWidth={1}
              />
              <text
                x={r.bx + 13}
                y={r.by - 3.5}
                fontSize={9}
                fill={isSel ? "var(--background)" : r.color}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
              >
                {r.label}
              </text>
            </g>
          );
        })}

        {/* semantic-mode note inside image panel footer */}
        <text
          x={IMG_X + IMG_W / 2}
          y={IMG_Y + IMG_H + 14}
          fontSize={9}
          fill={mode === "semantic" ? C.violet : C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {mode === "semantic"
            ? "semantic: instances merged into one blob"
            : "instance: each region kept separate"}
        </text>

        {/* ================= SHARED FEATURES ================= */}
        {/* arrow from selected box to shared features */}
        <line
          x1={IMG_X + IMG_W}
          y1={region.by + region.bh / 2}
          x2={FEAT_X - 4}
          y2={featCy}
          stroke={C.muted}
          strokeWidth={1.4}
          markerEnd="url(#mrcnn-arrow)"
        />
        <text
          x={(IMG_X + IMG_W + FEAT_X) / 2}
          y={featCy - 28}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          RoIAlign
        </text>

        <text
          x={featCx}
          y={FEAT_Y - 8}
          fontSize={9.5}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          shared
        </text>
        <text
          x={featCx}
          y={FEAT_Y + FEAT_H + 14}
          fontSize={9.5}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          features
        </text>
        {/* small feature-map grid */}
        <rect
          x={FEAT_X}
          y={FEAT_Y}
          width={FEAT_W}
          height={FEAT_H}
          rx={4}
          fill={region.fill}
          stroke={region.color}
          strokeWidth={1.6}
        />
        {[1, 2, 3].map((g) => (
          <line
            key={`fgv-${g}`}
            x1={FEAT_X + (FEAT_W / 4) * g}
            y1={FEAT_Y + 4}
            x2={FEAT_X + (FEAT_W / 4) * g}
            y2={FEAT_Y + FEAT_H - 4}
            stroke={region.color}
            strokeWidth={0.6}
            opacity={0.5}
          />
        ))}
        {[1, 2, 3].map((g) => (
          <line
            key={`fgh-${g}`}
            x1={FEAT_X + 4}
            y1={FEAT_Y + (FEAT_H / 4) * g}
            x2={FEAT_X + FEAT_W - 4}
            y2={FEAT_Y + (FEAT_H / 4) * g}
            stroke={region.color}
            strokeWidth={0.6}
            opacity={0.5}
          />
        ))}

        {/* ================= THREE BRANCHES ================= */}
        {/* connectors from shared features to each branch card */}
        {[0, 1, 2].map((i) => {
          const cy = branchY(i) + BR_H / 2;
          return (
            <path
              key={`conn-${i}`}
              d={`M ${FEAT_X + FEAT_W} ${featCy} C ${FEAT_X + FEAT_W + 28} ${featCy}, ${BR_X - 28} ${cy}, ${BR_X - 4} ${cy}`}
              fill="none"
              stroke={C.line}
              strokeWidth={1.4}
              markerEnd="url(#mrcnn-arrow)"
            />
          );
        })}

        {/* branch 1: CLASS */}
        <BranchHead
          x={BR_X}
          y={branchY(0)}
          accent={C.blue}
          accentFill={C.blueFill}
          title="1. class"
        >
          <text
            x={BR_X + 14}
            y={branchY(0) + 36}
            fontSize={11}
            fill={C.ink}
            fontFamily={MONO}
            fontWeight={600}
          >
            {region.cls}
          </text>
          <text
            x={BR_X + 14}
            y={branchY(0) + 51}
            fontSize={8.5}
            fill={C.muted}
            fontFamily={MONO}
          >
            {`p=${region.conf}  vs cat / bg`}
          </text>
        </BranchHead>

        {/* branch 2: BOX */}
        <BranchHead
          x={BR_X}
          y={branchY(1)}
          accent={C.coral}
          accentFill={C.coralFill}
          title="2. refined box"
        >
          <text
            x={BR_X + 14}
            y={branchY(1) + 36}
            fontSize={9}
            fill={C.ink}
            fontFamily={MONO}
          >
            {`(x,y,w,h) tightened`}
          </text>
          {/* tiny before/after box glyph */}
          <rect
            x={BR_X + BR_W - 46}
            y={branchY(1) + 30}
            width={30}
            height={24}
            rx={2}
            fill="none"
            stroke={C.muted}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <rect
            x={BR_X + BR_W - 42}
            y={branchY(1) + 33}
            width={26}
            height={18}
            rx={2}
            fill="none"
            stroke={C.coral}
            strokeWidth={1.6}
          />
        </BranchHead>

        {/* branch 3: MASK (the new third branch) */}
        <BranchHead
          x={BR_X}
          y={branchY(2)}
          accent={C.green}
          accentFill={C.greenFill}
          title="3. mask (new)"
        >
          <text
            x={BR_X + 14}
            y={branchY(2) + 35}
            fontSize={8.5}
            fill={C.muted}
            fontFamily={MONO}
          >
            28x28 binary
          </text>
          <text
            x={BR_X + 14}
            y={branchY(2) + 47}
            fontSize={8.5}
            fill={C.muted}
            fontFamily={MONO}
          >
            FCN head
          </text>
          {/* render the stencil as an 8x8 mask preview */}
          {MASK_STENCIL.map((row, ri) =>
            row.map((v, ci) => {
              const cell = 3;
              const gx = BR_X + BR_W - MASK_GRID * cell - 12;
              const gy = branchY(2) + 30;
              return (
                <rect
                  key={`m-${ri}-${ci}`}
                  x={gx + ci * cell}
                  y={gy + ri * cell}
                  width={cell}
                  height={cell}
                  fill={v ? (mode === "semantic" ? C.violet : C.green) : "var(--card)"}
                  stroke={C.greenFill}
                  strokeWidth={0.3}
                />
              );
            }),
          )}
        </BranchHead>

        {/* "parallel heads" bracket label */}
        <text
          x={BR_X + BR_W / 2}
          y={branchY(2) + BR_H + 16}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          three parallel heads, same features
        </text>

        {/* ================= CAPTION BAND ================= */}
        <line
          x1={16}
          y1={VB_H - 56}
          x2={VB_W - 16}
          y2={VB_H - 56}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={VB_W / 2}
          y={VB_H - 38}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Detect each instance, then paint a per-pixel mask inside its box.
        </text>
        <text
          x={VB_W / 2}
          y={VB_H - 22}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          detection + segmentation = instances.
        </text>

        {/* arrowhead marker */}
        <defs>
          <marker
            id="mrcnn-arrow"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 z" fill={C.muted} />
          </marker>
        </defs>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {REGIONS.map((r) => (
          <button
            key={`btn-${r.id}`}
            type="button"
            className={btn}
            style={
              selected === r.id
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setSelected(r.id)}
          >
            {`${r.label} (${r.cls})`}
          </button>
        ))}
        <button
          type="button"
          className={btn}
          style={
            mode === "semantic"
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() =>
            setMode((m) => (m === "instance" ? "semantic" : "instance"))
          }
        >
          {mode === "instance" ? "Show semantic" : "Show instance"}
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {`region ${region.label}: ${region.cls} p=${region.conf}`}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Mask R-CNN keeps the class and box heads and adds a parallel mask head;
        per-region masks keep instances separate, a semantic mask merges them.
      </p>
    </div>
  );
}

// A branch card: header strip + accent border. Children render the body.
function BranchHead({
  x,
  y,
  accent,
  accentFill,
  title,
  children,
}: {
  x: number;
  y: number;
  accent: string;
  accentFill: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={BR_W}
        height={BR_H}
        rx={6}
        fill="var(--card)"
        stroke={accent}
        strokeWidth={1.4}
      />
      <rect
        x={x}
        y={y}
        width={BR_W}
        height={18}
        rx={6}
        fill={accentFill}
        stroke="none"
      />
      <rect
        x={x}
        y={y + 9}
        width={BR_W}
        height={9}
        fill={accentFill}
        stroke="none"
      />
      <text
        x={x + 14}
        y={y + 13}
        fontSize={9.5}
        fill={accent}
        fontFamily={MONO}
        fontWeight={600}
      >
        {title}
      </text>
      {children}
    </g>
  );
}
