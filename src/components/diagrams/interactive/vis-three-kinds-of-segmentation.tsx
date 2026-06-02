"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..26) | mode explanation band (34..70) | scene (78..330) |
//   hover readout band (344..392) | counter band (400..432) | caption (446..470)
const VW = 560;
const VH = 482;

// The single scene is laid out inside this rectangle.
const SCENE_X = 16;
const SCENE_Y = 78;
const SCENE_W = VW - 32; // 528
const SCENE_H = 252; // 78..330
const HORIZON = SCENE_Y + SCENE_H * 0.5; // sky above, grass below

type Mode = "semantic" | "instance" | "panoptic";

const MODES: { id: Mode; label: string }[] = [
  { id: "semantic", label: "Semantic" },
  { id: "instance", label: "Instance" },
  { id: "panoptic", label: "Panoptic" },
];

// One-line explanation per mode (each line fits within VW - 24).
const MODE_INFO: Record<Mode, { lead: string; body: string }> = {
  semantic: {
    lead: "Semantic: label every pixel by class.",
    body: "All dogs share one \"dog\" color. No instances are separated.",
  },
  instance: {
    lead: "Instance: separate each object instance.",
    body: "Each dog gets its own color + ID. Background is left blank.",
  },
  panoptic: {
    lead: "Panoptic: things + stuff, all at once.",
    body: "Each dog is its own instance, plus grass and sky as labeled stuff.",
  },
};

// Region identity used for hover + coloring.
type RegionKind = "sky" | "grass" | "dog";
type Region = {
  key: string;
  kind: RegionKind;
  instance: number; // 1..3 for dogs, 0 for stuff
  // Dog body geometry (ellipse-ish blob). Stuff regions ignore these.
  cx: number;
  cy: number;
};

// Three dogs at fixed positions across the grass.
const DOGS: Region[] = [
  { key: "dog1", kind: "dog", instance: 1, cx: SCENE_X + SCENE_W * 0.22, cy: HORIZON + 52 },
  { key: "dog2", kind: "dog", instance: 2, cx: SCENE_X + SCENE_W * 0.5, cy: HORIZON + 66 },
  { key: "dog3", kind: "dog", instance: 3, cx: SCENE_X + SCENE_W * 0.78, cy: HORIZON + 50 },
];

// Distinct instance colors (accent + soft fill) for the three dogs.
const INSTANCE_COLORS: { accent: string; fill: string }[] = [
  { accent: C.blue, fill: C.blueFill },
  { accent: C.coral, fill: C.coralFill },
  { accent: C.violet, fill: "#e3dffb" },
];

// Class colors for semantic mode.
const CLASS_DOG = { accent: C.green, fill: C.greenFill };

// Draw a simple side-view dog blob centered at (cx, cy), scaled by s.
function dogPath(cx: number, cy: number, s: number): string {
  // body ellipse approximation + head + legs as one filled outline.
  const bw = 46 * s; // body half-width
  const bh = 20 * s; // body half-height
  // Rounded body
  const left = cx - bw;
  const right = cx + bw;
  const top = cy - bh;
  const bot = cy + bh;
  return [
    `M ${left} ${cy}`,
    `C ${left} ${top}, ${cx - bw * 0.3} ${top}, ${cx + bw * 0.2} ${top}`,
    // head bump on the right
    `C ${right} ${top - bh * 0.5}, ${right + 8 * s} ${cy - bh * 0.2}, ${right + 6 * s} ${cy}`,
    `C ${right + 8 * s} ${cy + bh * 0.6}, ${right} ${bot}, ${cx + bw * 0.2} ${bot}`,
    // legs underside
    `L ${cx + bw * 0.1} ${bot + 12 * s}`,
    `L ${cx} ${bot}`,
    `L ${cx - bw * 0.4} ${bot + 12 * s}`,
    `L ${cx - bw * 0.5} ${bot}`,
    `C ${cx - bw * 0.8} ${bot}, ${left} ${cy + bh * 0.6}, ${left} ${cy}`,
    "Z",
  ].join(" ");
}

export function VisThreeSegmentations() {
  const [mode, setMode] = useState<Mode>("semantic");
  const [hover, setHover] = useState<Region | null>(null);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const info = MODE_INFO[mode];

  // Instances are only counted in instance/panoptic modes.
  const countsInstances = mode === "instance" || mode === "panoptic";
  const instanceCount = countsInstances ? DOGS.length : 0;

  // Sky/grass are colored "stuff" only in semantic & panoptic; left as scene
  // backdrop (neutral) in instance mode.
  const stuffSegmented = mode === "semantic" || mode === "panoptic";

  // Color helpers per mode.
  const skyFill = stuffSegmented ? C.blueFill : "var(--card)";
  const skyStroke = stuffSegmented ? C.blue : C.line;
  const grassFill = stuffSegmented ? C.greenFill : "var(--card)";
  const grassStroke = stuffSegmented ? C.green : C.line;

  const dogColors = (instance: number): { accent: string; fill: string } => {
    if (mode === "semantic") return CLASS_DOG;
    return INSTANCE_COLORS[instance - 1];
  };

  // Hover readout text.
  const hoverLine = ((): { a: string; b: string } => {
    if (!hover) {
      return {
        a: "Hover a region to see its label.",
        b: stuffSegmented
          ? "Dogs are things; sky and grass are stuff."
          : "Only object instances are segmented here.",
      };
    }
    if (hover.kind === "sky") return { a: "label: sky  (stuff)", b: "class-only — no instance ID." };
    if (hover.kind === "grass")
      return { a: "label: grass  (stuff)", b: "class-only — no instance ID." };
    // dog
    if (mode === "semantic")
      return { a: "label: dog  (class)", b: "semantic — same color for every dog." };
    return {
      a: `label: dog  ·  instance #${hover.instance}`,
      b: "this dog is separated from the others.",
    };
  })();

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Three kinds of image segmentation contrasted on one scene of three dogs on grass under sky. Semantic labels each pixel's class, instance separates object instances, panoptic does both for things and stuff. Switch modes to recolor the scene and hover regions for labels."
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
          Three Kinds of Segmentation
        </text>

        {/* Mode explanation band (own clear band above the scene) */}
        <rect
          x={16}
          y={32}
          width={VW - 32}
          height={38}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <text x={26} y={49} fontFamily={MONO} fontSize={10.5} fill={C.ink}>
          {info.lead}
        </text>
        <text x={26} y={64} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          {info.body}
        </text>

        {/* ---- Scene ---- */}
        {/* Sky region (top half) */}
        <g
          onMouseEnter={() =>
            setHover({ key: "sky", kind: "sky", instance: 0, cx: 0, cy: 0 })
          }
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={SCENE_X}
            y={SCENE_Y}
            width={SCENE_W}
            height={SCENE_H * 0.5}
            rx={6}
            fill={skyFill}
            stroke={skyStroke}
            strokeWidth={1.2}
          />
          {stuffSegmented && (
            <text
              x={SCENE_X + 10}
              y={SCENE_Y + 16}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.blue}
            >
              sky
            </text>
          )}
        </g>

        {/* Grass region (bottom half) */}
        <g
          onMouseEnter={() =>
            setHover({ key: "grass", kind: "grass", instance: 0, cx: 0, cy: 0 })
          }
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={SCENE_X}
            y={HORIZON}
            width={SCENE_W}
            height={SCENE_Y + SCENE_H - HORIZON}
            rx={6}
            fill={grassFill}
            stroke={grassStroke}
            strokeWidth={1.2}
          />
          {stuffSegmented && (
            <text
              x={SCENE_X + 10}
              y={SCENE_Y + SCENE_H - 8}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.green}
            >
              grass
            </text>
          )}
        </g>

        {/* Horizon line */}
        <line
          x1={SCENE_X}
          y1={HORIZON}
          x2={SCENE_X + SCENE_W}
          y2={HORIZON}
          stroke={stuffSegmented ? C.green : C.line}
          strokeWidth={1}
        />

        {/* Dogs */}
        {DOGS.map((d) => {
          const col = dogColors(d.instance);
          const isHover = hover?.key === d.key;
          return (
            <g
              key={d.key}
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <path
                d={dogPath(d.cx, d.cy, 1)}
                fill={col.fill}
                stroke={col.accent}
                strokeWidth={isHover ? 2.4 : 1.6}
              />
              {/* eye dot for orientation */}
              <circle
                cx={d.cx + 44}
                cy={d.cy - 8}
                r={1.7}
                fill={col.accent}
              />
              {/* instance ID badge only when instances are segmented */}
              {countsInstances && (
                <>
                  <circle
                    cx={d.cx}
                    cy={d.cy}
                    r={9}
                    fill="var(--background)"
                    stroke={col.accent}
                    strokeWidth={1.4}
                  />
                  <text
                    x={d.cx}
                    y={d.cy + 3.5}
                    textAnchor="middle"
                    fontFamily={MONO}
                    fontSize={10}
                    fill={col.accent}
                  >
                    {d.instance}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* ---- Hover readout band ---- */}
        <rect
          x={16}
          y={344}
          width={VW - 32}
          height={48}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={28}
          y={364}
          fontFamily={MONO}
          fontSize={10.5}
          fill={hover ? C.ink : C.muted}
        >
          {hoverLine.a}
        </text>
        <text x={28} y={381} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          {hoverLine.b}
        </text>

        {/* ---- Instance counter band ---- */}
        <text x={28} y={418} fontFamily={MONO} fontSize={10.5} fill={C.ink}>
          Instance count:
        </text>
        <text
          x={150}
          y={418}
          fontFamily={MONO}
          fontSize={10.5}
          fill={countsInstances ? C.coral : C.muted}
        >
          {countsInstances
            ? `${instanceCount} dogs separated`
            : "n/a — semantic has no instances"}
        </text>

        {/* ---- Caption band ---- */}
        <text
          x={VW / 2}
          y={462}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          Semantic = what · instance = what + which one · panoptic = both, things and stuff.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={btn}
            style={
              mode === m.id
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
        <span className="font-mono tabular-nums text-[var(--muted)]">
          instances: {instanceCount}
        </span>
      </div>
    </div>
  );
}
