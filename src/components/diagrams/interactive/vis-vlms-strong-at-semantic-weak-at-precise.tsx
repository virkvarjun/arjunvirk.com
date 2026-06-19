"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..24) | frame strip (34..56) | column headers (66..86) |
//   capability rows: strong (left) + weak (right) (96..356) |
//   readout band (370..438) | caption (452..484)
const VW = 560;
const VH = 496;

// A capability the VLM is tested on. side = which column it lives in.
type Side = "strong" | "weak";
type CapId =
  | "vqa"
  | "caption"
  | "ocr"
  | "chart"
  | "reason"
  | "instruct"
  | "localize"
  | "count"
  | "tinytext"
  | "coords"
  | "rotated"
  | "halluc";

type Cap = {
  id: CapId;
  side: Side;
  short: string; // fits inside the row pill
  // one-line example shown in the readout band on click:
  task: string; // the question/task posed to the VLM
  result: string; // success or failure outcome
  why: string; // why, ties back to token coarseness
};

// Short labels are kept <= ~18 chars so they fit a 224px pill at fontSize 9.5.
const CAPS: Cap[] = [
  {
    id: "vqa",
    side: "strong",
    short: "Visual Q&A",
    task: "“What is happening in this scene?”",
    result: "Right: “a child flying a kite at the beach.”",
    why: "Gist lives in coarse tokens, no exact pixels needed.",
  },
  {
    id: "caption",
    side: "strong",
    short: "Captioning",
    task: "“Describe this photo in one sentence.”",
    result: "Right: fluent, faithful summary of the scene.",
    why: "Semantics survive heavy spatial downsampling.",
  },
  {
    id: "ocr",
    side: "strong",
    short: "OCR (clear text)",
    task: "“Read the large headline on this sign.”",
    result: "Right: transcribes bold, well-sized text.",
    why: "Big glyphs still span several visual tokens.",
  },
  {
    id: "chart",
    side: "strong",
    short: "Chart / docs",
    task: "“Which bar is the tallest in this chart?”",
    result: "Right: names the category that dominates.",
    why: "Relative shape is a coarse, semantic cue.",
  },
  {
    id: "reason",
    side: "strong",
    short: "Visual reasoning",
    task: "“Why is the person holding an umbrella?”",
    result: "Right: infers “because it is raining.”",
    why: "Reasoning rides on meaning, not coordinates.",
  },
  {
    id: "instruct",
    side: "strong",
    short: "Instruction follow",
    task: "“List the objects, then group by color.”",
    result: "Right: obeys multi-step semantic asks.",
    why: "Categories are coarse and token-friendly.",
  },
  {
    id: "localize",
    side: "weak",
    short: "Exact localize",
    task: "“Give the bounding box of the left cup.”",
    result: "Wrong: box is offset by tens of pixels.",
    why: "One token covers a wide patch, edges blur.",
  },
  {
    id: "count",
    side: "weak",
    short: "Count many small",
    task: "“How many birds are in this flock?”",
    result: "Wrong: guesses “12” when there are 27.",
    why: "Tiny objects merge inside one coarse token.",
  },
  {
    id: "tinytext",
    side: "weak",
    short: "Read tiny text",
    task: "“Read the 6pt footnote at the bottom.”",
    result: "Wrong: characters are smeared / invented.",
    why: "Small glyphs fall below the token grid.",
  },
  {
    id: "coords",
    side: "weak",
    short: "Precise coords",
    task: "“Give the pixel (x,y) of the cursor tip.”",
    result: "Wrong: off by a large, unstable margin.",
    why: "Tokens have no fine pixel addressing.",
  },
  {
    id: "rotated",
    side: "weak",
    short: "Rotated / odd font",
    task: "“Read this sideways, stylized label.”",
    result: "Wrong: misreads the warped characters.",
    why: "Coarse patches lose fine stroke detail.",
  },
  {
    id: "halluc",
    side: "weak",
    short: "Hallucination risk",
    task: "“Is there a stop sign in this image?”",
    result: "Wrong: confidently invents one that is absent.",
    why: "Sparse detail → the model fills gaps by prior.",
  },
];

// Geometry.
const MARGIN = 16;
const COL_GAP = 24;
const COL_W = (VW - MARGIN * 2 - COL_GAP) / 2; // ~240
const LEFT_X = MARGIN;
const RIGHT_X = MARGIN + COL_W + COL_GAP;
const HDR_Y = 80; // baseline of column header text
const ROWS_TOP = 96; // top of first capability pill
const ROW_H = 40; // pill slot height
const PILL_H = 32;
const READOUT_Y = 370;
const READOUT_H = 68;

const strongCaps = CAPS.filter((c) => c.side === "strong");
const weakCaps = CAPS.filter((c) => c.side === "weak");

export function VisVlmStrengthsWeaknesses() {
  // Selected capability for the readout (null = hint).
  const [sel, setSel] = useState<CapId | null>("vqa");
  // Toggle: reframe the split as VLM (meaning) vs SAM-style (pixels).
  const [reframe, setReframe] = useState<boolean>(false);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const selCap: Cap | null = sel
    ? CAPS.find((c) => c.id === sel) ?? null
    : null;

  const renderPill = (cap: Cap, i: number, side: Side) => {
    const x = side === "strong" ? LEFT_X : RIGHT_X;
    const y = ROWS_TOP + i * ROW_H;
    const isSel = sel === cap.id;
    const accent = side === "strong" ? C.green : C.coral;
    const fill = side === "strong" ? C.greenFill : C.coralFill;
    const mark = side === "strong" ? "✓" : "✗";
    return (
      <g
        key={cap.id}
        onClick={() => setSel(cap.id)}
        style={{ cursor: "pointer" }}
      >
        <rect
          x={x}
          y={y}
          width={COL_W}
          height={PILL_H}
          rx={6}
          fill={isSel ? fill : "var(--card)"}
          stroke={isSel ? accent : C.line}
          strokeWidth={isSel ? 1.6 : 1}
        />
        {/* tone badge */}
        <circle cx={x + 16} cy={y + PILL_H / 2} r={7} fill={fill} />
        <text
          x={x + 16}
          y={y + PILL_H / 2 + 3.5}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={10}
          fill={accent}
        >
          {mark}
        </text>
        <text
          x={x + 32}
          y={y + PILL_H / 2 + 3.5}
          fontFamily={MONO}
          fontSize={10.5}
          fill={C.ink}
        >
          {cap.short}
        </text>
      </g>
    );
  };

  const leftTitle = reframe ? "VLM: what it means" : "Strong (semantic)";
  const rightTitle = reframe ? "SAM-style: exact pixels" : "Weak (precise)";

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Two columns contrasting tasks vision-language models do well (high-level semantic questions like captioning and visual Q&A) versus tasks they do poorly (exact spatial localization, counting many small objects, reading tiny text, precise coordinates). Click a capability to see an example task, the success or failure outcome, and why it stems from coarse visual tokens. A toggle reframes the split as meaning (VLM) versus exact pixels (SAM-style models)."
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
          VLMs: Strong at Semantic, Weak at Precise
        </text>

        {/* Reframe strip: one-line summary of the active framing */}
        <text
          x={VW / 2}
          y={48}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          {reframe
            ? "Visual tokens are coarse: great for meaning, not pixel-exact, hand precision to SAM-style models."
            : "Visual tokens are coarse: each one summarizes a whole patch, so fine spatial detail is lost."}
        </text>

        {/* Column headers */}
        <rect
          x={LEFT_X}
          y={HDR_Y - 15}
          width={COL_W}
          height={20}
          rx={5}
          fill={C.greenFill}
        />
        <text
          x={LEFT_X + COL_W / 2}
          y={HDR_Y - 1}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={11}
          fill={C.green}
        >
          {leftTitle}
        </text>
        <rect
          x={RIGHT_X}
          y={HDR_Y - 15}
          width={COL_W}
          height={20}
          rx={5}
          fill={C.coralFill}
        />
        <text
          x={RIGHT_X + COL_W / 2}
          y={HDR_Y - 1}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={11}
          fill={C.coral}
        >
          {rightTitle}
        </text>

        {/* Capability pills */}
        {strongCaps.map((c, i) => renderPill(c, i, "strong"))}
        {weakCaps.map((c, i) => renderPill(c, i, "weak"))}

        {/* Readout band (own clear horizontal band below the columns) */}
        <rect
          x={MARGIN}
          y={READOUT_Y}
          width={VW - MARGIN * 2}
          height={READOUT_H}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {selCap ? (
          <>
            <text
              x={MARGIN + 12}
              y={READOUT_Y + 17}
              fontFamily={MONO}
              fontSize={10}
              fill={selCap.side === "strong" ? C.green : C.coral}
            >
              {selCap.short} · Task: {selCap.task}
            </text>
            <text
              x={MARGIN + 12}
              y={READOUT_Y + 35}
              fontFamily={MONO}
              fontSize={10}
              fill={C.ink}
            >
              {selCap.result}
            </text>
            <text
              x={MARGIN + 12}
              y={READOUT_Y + 53}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
            >
              Why: {selCap.why}
            </text>
          </>
        ) : (
          <>
            <text
              x={MARGIN + 12}
              y={READOUT_Y + 22}
              fontFamily={MONO}
              fontSize={10}
              fill={C.muted}
            >
              Click any capability to see an example task and outcome.
            </text>
            <text
              x={MARGIN + 12}
              y={READOUT_Y + 42}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
            >
              Strong = high-level meaning; weak = exact pixels and counts.
            </text>
          </>
        )}

        {/* Caption band */}
        <text
          x={VW / 2}
          y={READOUT_Y + READOUT_H + 18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Great at what an image means, shakier on exact positions and counts,
        </text>
        <text
          x={VW / 2}
          y={READOUT_Y + READOUT_H + 32}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          pair with SAM-style models when precision matters.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={
            reframe
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
          onClick={() => setReframe((r) => !r)}
        >
          Reframe: meaning vs pixels
        </button>
        {sel && (
          <button type="button" className={btn} onClick={() => setSel(null)}>
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
