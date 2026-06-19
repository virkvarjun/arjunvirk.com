"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The Whole Vision Arc, capstone summary of the Vision chapter.
// A connected journey of milestones, each one fixing a limitation of the
// previous: pixels/tensor -> CNN -> YOLO (detection) -> U-Net (segmentation)
// -> Mask R-CNN (instances) -> SAM (any prompt) -> ViT (drop convolution)
// -> CLIP/SigLIP (align with text) -> VLM (reason over image + text).
// Click any milestone to read what limitation it solved.
// Two "connective tissue" threads can be toggled to highlight where
// skip/residual connections and attention/tokenization recur across the arc.

type ThreadId = "skip" | "attn";

interface Milestone {
  id: string;
  short: string; // node title
  sub: string; // one-word role under title
  solved: string; // headline: what it fixed
  detail: string[]; // 1-2 lines of explanation (each must fit width-24)
  threads: ThreadId[]; // connective-tissue threads this node participates in
  color: string;
  fill: string;
}

// 9 milestones, drawn left-to-right snaking across two rows.
const MILESTONES: Milestone[] = [
  {
    id: "tensor",
    short: "Image tensor",
    sub: "pixels",
    solved: "The raw input: an H x W x 3 grid of numbers.",
    detail: [
      "A flat MLP on pixels needs too many params and has",
      "no translation invariance, the same cat shifted looks new.",
    ],
    threads: [],
    color: C.muted,
    fill: "var(--card)",
  },
  {
    id: "cnn",
    short: "CNN",
    sub: "features",
    solved: "Fixed MLP: shared filters slide over the image.",
    detail: [
      "Convolution reuses weights + pools, giving translation",
      "invariance with far fewer params. ResNet adds skip links.",
    ],
    threads: ["skip"],
    color: C.blue,
    fill: C.blueFill,
  },
  {
    id: "yolo",
    short: "YOLO",
    sub: "detection",
    solved: "Fixed CNN: says WHERE objects are, not just what.",
    detail: [
      "One pass predicts boxes + classes on a grid, so it finds",
      "and localizes many objects at once in real time.",
    ],
    threads: ["skip"],
    color: C.green,
    fill: C.greenFill,
  },
  {
    id: "unet",
    short: "U-Net / FCN",
    sub: "segment",
    solved: "Fixed boxes: a class label for every pixel.",
    detail: [
      "Encoder downsamples, decoder upsamples; skip connections",
      "carry fine detail across, so masks stay sharp.",
    ],
    threads: ["skip"],
    color: C.coral,
    fill: C.coralFill,
  },
  {
    id: "maskrcnn",
    short: "Mask R-CNN",
    sub: "instances",
    solved: "Fixed pixels: separates each object instance.",
    detail: [
      "Detect boxes, then predict a mask inside each one, so two",
      "overlapping cats become two distinct masks, not one blob.",
    ],
    threads: ["skip"],
    color: C.violet,
    fill: "var(--card)",
  },
  {
    id: "sam",
    short: "SAM",
    sub: "promptable",
    solved: "Fixed per-class: one model segments any prompt.",
    detail: [
      "A ViT encoder + prompt decoder segment whatever you click",
      "or box, no retraining for new object categories.",
    ],
    threads: ["skip", "attn"],
    color: C.blue,
    fill: C.blueFill,
  },
  {
    id: "vit",
    short: "ViT",
    sub: "transformer",
    solved: "Dropped convolution: image as a sequence of patches.",
    detail: [
      "Split into patch tokens, then self-attention relates them all.",
      "Residual blocks let it scale with data and compute.",
    ],
    threads: ["skip", "attn"],
    color: C.green,
    fill: C.greenFill,
  },
  {
    id: "clip",
    short: "CLIP / SigLIP",
    sub: "aligned",
    solved: "Fixed isolation: vision aligned to language.",
    detail: [
      "Contrastive training pulls matching image + caption embeddings",
      "together, giving an image encoder that understands text.",
    ],
    threads: ["attn"],
    color: C.coral,
    fill: C.coralFill,
  },
  {
    id: "vlm",
    short: "VLM",
    sub: "reasons",
    solved: "Fixed single-mode: reasons over image + text together.",
    detail: [
      "Image patch tokens feed into an LLM beside text tokens, so it",
      "can describe, answer questions, and reason about a picture.",
    ],
    threads: ["attn"],
    color: C.violet,
    fill: "var(--card)",
  },
];

// --- geometry --------------------------------------------------------------
const VB_W = 720;
const VB_H = 478;
const MARGIN = 14;

// Two snaking rows of nodes.
const NODE_W = 118;
const NODE_H = 54;
const ROW0_Y = 86; // top row center band start
const ROW1_Y = 196; // bottom row
const COLS = 5; // top row has 5, bottom row has 4 (snake)

// Top row: indices 0..4 left-to-right.
// Bottom row: indices 5..8 right-to-left (snake), so 5 sits under 4.
const colGap = (VB_W - 2 * MARGIN - COLS * NODE_W) / (COLS - 1);

function nodePos(i: number): { x: number; y: number; row: number } {
  if (i < COLS) {
    return { x: MARGIN + i * (NODE_W + colGap), y: ROW0_Y, row: 0 };
  }
  const j = i - COLS; // 0..3
  // snake: right to left starting under the last top node
  const col = COLS - 1 - j; // 4,3,2,1
  return { x: MARGIN + col * (NODE_W + colGap), y: ROW1_Y, row: 1 };
}

// Connective-tissue thread polylines run along a y just below each row.
const SKIP_Y0 = ROW0_Y + NODE_H + 12;
const SKIP_Y1 = ROW1_Y + NODE_H + 12;

// Readout band.
const READ_Y = 300;
const READ_X = MARGIN;
const READ_W = VB_W - 2 * MARGIN;
const READ_H = 122;
const LINE = 16;

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

const THREADS: { id: ThreadId; label: string; color: string }[] = [
  { id: "skip", label: "skip / residual", color: C.coral },
  { id: "attn", label: "attention / tokens", color: C.violet },
];

export function VisWholeVisionArc() {
  const [selected, setSelected] = useState<string>("tensor");
  const [activeThreads, setActiveThreads] = useState<Record<ThreadId, boolean>>(
    { skip: false, attn: false },
  );

  const active: Milestone =
    MILESTONES.find((m) => m.id === selected) ?? MILESTONES[0];
  const activeIndex: number = MILESTONES.findIndex((m) => m.id === selected);

  const toggleThread = (id: ThreadId): void =>
    setActiveThreads((prev) => ({ ...prev, [id]: !prev[id] }));

  // Build arrow path between node i and i+1 (handles the snake turn).
  const arrowSegments: { d: string; mx: number; my: number; idx: number }[] =
    [];
  for (let i = 0; i < MILESTONES.length - 1; i++) {
    const a = nodePos(i);
    const b = nodePos(i + 1);
    if (a.row === b.row) {
      // same row, horizontal arrow
      const x1 = a.x + NODE_W;
      const x2 = b.x;
      const y = a.y + NODE_H / 2;
      arrowSegments.push({
        d: `M ${x1} ${y} L ${x2 - 4} ${y}`,
        mx: (x1 + x2) / 2,
        my: y,
        idx: i,
      });
    } else {
      // row change (the snake U-turn): go down from a, curve into b
      const x = a.x + NODE_W / 2;
      const y1 = a.y + NODE_H;
      const y2 = b.y;
      arrowSegments.push({
        d: `M ${x} ${y1} L ${x} ${y2 - 4}`,
        mx: x,
        my: (y1 + y2) / 2,
        idx: i,
      });
    }
  }

  // Thread polyline: connect node-bottom-centers of nodes in this thread.
  const threadPoints = (id: ThreadId): string => {
    const pts: string[] = [];
    MILESTONES.forEach((m, i) => {
      if (!m.threads.includes(id)) return;
      const p = nodePos(i);
      const y = p.row === 0 ? SKIP_Y0 : SKIP_Y1;
      pts.push(`${p.x + NODE_W / 2},${y}`);
    });
    return pts.join(" ");
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="The whole vision arc: each model fixes a limitation of the previous one"
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
          The Whole Vision Arc
        </text>
        <text
          x={VB_W / 2}
          y={42}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          click a milestone to see the limitation it fixed; toggle the recurring threads
        </text>

        {/* ---- connective-tissue threads (drawn under nodes) ---- */}
        {THREADS.map((t) => {
          if (!activeThreads[t.id]) return null;
          return (
            <polyline
              key={`thread-${t.id}`}
              points={threadPoints(t.id)}
              fill="none"
              stroke={t.color}
              strokeWidth={2.5}
              strokeDasharray="2 4"
              strokeLinecap="round"
              opacity={0.85}
            />
          );
        })}
        {/* small markers on threaded nodes */}
        {THREADS.map((t) => {
          if (!activeThreads[t.id]) return null;
          return MILESTONES.map((m, i) => {
            if (!m.threads.includes(t.id)) return null;
            const p = nodePos(i);
            const y = p.row === 0 ? SKIP_Y0 : SKIP_Y1;
            return (
              <circle
                key={`mark-${t.id}-${m.id}`}
                cx={p.x + NODE_W / 2}
                cy={y}
                r={3}
                fill={t.color}
              />
            );
          });
        })}

        {/* ---- arrows between milestones ---- */}
        {arrowSegments.map((seg) => (
          <g key={`arrow-${seg.idx}`}>
            <path d={seg.d} stroke={C.line} strokeWidth={1.4} fill="none" />
            {/* arrowhead: tiny triangle at the path end */}
            {nodePos(seg.idx).row === nodePos(seg.idx + 1).row ? (
              <path
                d={`M ${nodePos(seg.idx + 1).x - 4} ${
                  nodePos(seg.idx).y + NODE_H / 2
                } l -6 -3.5 v 7 z`}
                fill={C.line}
              />
            ) : (
              <path
                d={`M ${nodePos(seg.idx).x + NODE_W / 2} ${
                  nodePos(seg.idx + 1).y - 4
                } l -3.5 -6 h 7 z`}
                fill={C.line}
              />
            )}
          </g>
        ))}

        {/* ---- milestone nodes ---- */}
        {MILESTONES.map((m, i) => {
          const p = nodePos(i);
          const isSel = m.id === selected;
          return (
            <g key={m.id}>
              <rect
                x={p.x}
                y={p.y}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill={isSel ? m.fill : "var(--card)"}
                stroke={isSel ? m.color : C.line}
                strokeWidth={isSel ? 2 : 1}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(m.id)}
              />
              <text
                x={p.x + NODE_W / 2}
                y={p.y + 22}
                fontSize={11}
                fill={m.color === C.muted ? C.ink : m.color}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {m.short}
              </text>
              <text
                x={p.x + NODE_W / 2}
                y={p.y + 39}
                fontSize={8.5}
                fill={C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                style={{ pointerEvents: "none" }}
              >
                {m.sub}
              </text>
              {/* step index badge */}
              <text
                x={p.x + 7}
                y={p.y + 13}
                fontSize={8}
                fill={C.muted}
                fontFamily={MONO}
                style={{ pointerEvents: "none" }}
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* ================= READOUT BAND ================= */}
        <rect
          x={READ_X}
          y={READ_Y}
          width={READ_W}
          height={READ_H}
          rx={6}
          fill={active.fill === "var(--card)" ? "var(--card)" : active.fill}
          stroke={active.color === C.muted ? C.line : active.color}
          strokeWidth={1.4}
        />
        <text
          x={READ_X + 12}
          y={READ_Y + 22}
          fontSize={12}
          fill={active.color === C.muted ? C.ink : active.color}
          fontFamily={MONO}
          fontWeight={600}
        >
          {`${activeIndex + 1}. ${active.short}`}
        </text>
        <text
          x={READ_X + READ_W - 12}
          y={READ_Y + 22}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`step ${activeIndex + 1} of ${MILESTONES.length}`}
        </text>

        {/* what it solved */}
        <text
          x={READ_X + 12}
          y={READ_Y + 44}
          fontSize={10.5}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          {active.solved}
        </text>

        {/* detail lines */}
        {active.detail.map((ln, i) => (
          <text
            key={`detail-${i}`}
            x={READ_X + 12}
            y={READ_Y + 66 + i * LINE}
            fontSize={9.5}
            fill={C.muted}
            fontFamily={MONO}
          >
            {ln}
          </text>
        ))}

        {/* threads present at this milestone */}
        <text
          x={READ_X + 12}
          y={READ_Y + 66 + active.detail.length * LINE + 6}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          {active.threads.length > 0
            ? `recurring heroes here: ${active.threads
                .map((t) => (t === "skip" ? "skip/residual" : "attention/tokens"))
                .join("  +  ")}`
            : "the starting point, no learned machinery yet"}
        </text>

        {/* caption */}
        <text
          x={VB_W / 2}
          y={VB_H - 26}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Every model fixes the previous one&apos;s weak point,
        </text>
        <text
          x={VB_W / 2}
          y={VB_H - 12}
          fontSize={9.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          and the same heroes (skip connections, attention) recur the whole way through.
        </text>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {MILESTONES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={btn}
            style={
              m.id === selected
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setSelected(m.id)}
          >
            {m.short}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">threads:</span>
        {THREADS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={btn}
            style={
              activeThreads[t.id]
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => toggleThread(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        The chapter is one connected journey: each milestone removes a limitation
        of the last, while skip/residual connections and attention plus
        &ldquo;tokenize everything&rdquo; keep reappearing as the load-bearing ideas.
      </p>
    </div>
  );
}
