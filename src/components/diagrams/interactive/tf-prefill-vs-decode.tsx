"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// Prefill vs Decode. Two phases of LLM inference contrasted side by side:
//   - PREFILL: the whole prompt (many tokens) is processed in ONE parallel
//     block. Big matmuls keep the GPU's arithmetic units busy → compute-bound.
//     It fills the KV cache and sets the time-to-first-token.
//   - DECODE: tokens are emitted one at a time; each step reads the full KV
//     cache + all weights to make a single new token. Tiny matmuls, lots of
//     memory traffic → memory-bandwidth-bound. Sets tokens/second.
// The timeline animation plays a long prefill bar followed by many small
// sequential decode steps so the parallel-vs-sequential shape is visible.

// --- model of the timeline -------------------------------------------------
const PROMPT_TOKENS = 8; // tokens in the prompt (drawn as a parallel block)
const DECODE_STEPS = 9; // generated tokens, one per step

// Animation phases counted in "frames": prefill occupies a few frames (it is
// one parallel operation but we let the bar fill), then one frame per decode
// token.
const PREFILL_FRAMES = 4;
const TOTAL_FRAMES = PREFILL_FRAMES + DECODE_STEPS; // last frame index = TOTAL-1

// --- geometry --------------------------------------------------------------
const VB_W = 480;
const VB_H = 360;

// Two phase panels.
const PANEL_Y = 46;
const PANEL_H = 150;
const LEFT_X = 16;
const RIGHT_X = 248;
const PANEL_W = 216;
const DIVIDER_X = 240;

// Timeline band (shared, below the panels).
const TL_Y = 238;
const TL_X = 26;
const TL_W = VB_W - 52; // leaves margin both sides
// Prefill takes a wide chunk; the rest is split into DECODE_STEPS cells.
const PREFILL_W = 150;
const DECODE_W = TL_W - PREFILL_W;
const STEP_W = DECODE_W / DECODE_STEPS;

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

type Phase = "prefill" | "decode" | "done";

function phaseAt(frame: number): Phase {
  if (frame < PREFILL_FRAMES) return "prefill";
  if (frame < TOTAL_FRAMES) return "decode";
  return "done";
}

// How many decode tokens have been emitted after `frame` frames.
function tokensDone(frame: number): number {
  if (frame < PREFILL_FRAMES) return 0;
  return Math.min(DECODE_STEPS, frame - PREFILL_FRAMES + 1);
}

export function TfPrefillDecode() {
  const [frame, setFrame] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [showLimit, setShowLimit] = useState<boolean>(true);

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
    }, 520);
    return () => clearInterval(id);
  }, [playing]);

  function onPlay(): void {
    if (frame >= TOTAL_FRAMES) setFrame(0);
    setPlaying((p) => !p);
  }
  function onReset(): void {
    setPlaying(false);
    setFrame(0);
  }

  const phase = phaseAt(frame);
  const prefillActive = phase === "prefill";
  const decodeTokens = tokensDone(frame);
  const decodeActive = phase === "decode";

  // KV-cache fill fraction: full once prefill completes.
  const prefillFrac = Math.min(1, (frame + 1) / PREFILL_FRAMES);
  const kvFilled = frame >= PREFILL_FRAMES;

  // Prompt token columns for the prefill panel.
  const promptCols: number[] = [];
  for (let i = 0; i < PROMPT_TOKENS; i++) promptCols.push(i);

  // Decode token squares for the decode panel.
  const decodeCols: number[] = [];
  for (let i = 0; i < DECODE_STEPS; i++) decodeCols.push(i);

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Prefill versus decode phases of LLM inference"
      >
        {/* ---- title band ---- */}
        <text
          x={VB_W / 2}
          y={22}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Prefill vs Decode
        </text>

        {/* ---- divider between the two phase panels ---- */}
        <line
          x1={DIVIDER_X}
          y1={PANEL_Y - 6}
          x2={DIVIDER_X}
          y2={PANEL_Y + PANEL_H + 6}
          stroke={C.line}
          strokeWidth={1}
          strokeDasharray="3 4"
        />

        {/* ================= LEFT: PREFILL ================= */}
        <g>
          <rect
            x={LEFT_X}
            y={PANEL_Y}
            width={PANEL_W}
            height={PANEL_H}
            rx={6}
            fill={prefillActive ? C.blueFill : "var(--card)"}
            stroke={prefillActive ? C.blue : C.line}
            strokeWidth={prefillActive ? 1.8 : 1}
          />
          <text
            x={LEFT_X + 12}
            y={PANEL_Y + 18}
            fontSize={12}
            fill={C.blue}
            fontFamily={MONO}
            fontWeight={600}
          >
            Prefill
          </text>
          <text
            x={LEFT_X + PANEL_W - 12}
            y={PANEL_Y + 18}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="end"
          >
            parallel
          </text>

          {/* the whole prompt processed as ONE parallel block */}
          {promptCols.map((i) => {
            const cw = 18;
            const gap = 4;
            const blockW = PROMPT_TOKENS * cw + (PROMPT_TOKENS - 1) * gap;
            const x0 = LEFT_X + (PANEL_W - blockW) / 2;
            const x = x0 + i * (cw + gap);
            const y = PANEL_Y + 36;
            const h = 40;
            return (
              <rect
                key={`pt-${i}`}
                x={x}
                y={y}
                width={cw}
                height={h}
                rx={2}
                fill={prefillActive ? C.blue : kvFilled ? C.blueFill : "var(--card)"}
                stroke={C.blue}
                strokeWidth={1}
                opacity={prefillActive ? prefillFrac : kvFilled ? 1 : 0.35}
              />
            );
          })}
          <text
            x={LEFT_X + PANEL_W / 2}
            y={PANEL_Y + 90}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {`${PROMPT_TOKENS} prompt tokens, one pass`}
          </text>

          {/* KV-cache fill readout */}
          <text
            x={LEFT_X + 12}
            y={PANEL_Y + 112}
            fontSize={9}
            fill={kvFilled ? C.green : C.muted}
            fontFamily={MONO}
          >
            {kvFilled ? "KV cache: filled" : "KV cache: filling..."}
          </text>

          {/* the takeaway label for prefill */}
          <text
            x={LEFT_X + 12}
            y={PANEL_Y + 130}
            fontSize={9}
            fill={C.ink}
            fontFamily={MONO}
          >
            compute-bound
          </text>
          <text
            x={LEFT_X + 12}
            y={PANEL_Y + 143}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
          >
            sets time-to-first-token
          </text>
        </g>

        {/* ================= RIGHT: DECODE ================= */}
        <g>
          <rect
            x={RIGHT_X}
            y={PANEL_Y}
            width={PANEL_W}
            height={PANEL_H}
            rx={6}
            fill={decodeActive ? C.coralFill : "var(--card)"}
            stroke={decodeActive ? C.coral : C.line}
            strokeWidth={decodeActive ? 1.8 : 1}
          />
          <text
            x={RIGHT_X + 12}
            y={PANEL_Y + 18}
            fontSize={12}
            fill={C.coral}
            fontFamily={MONO}
            fontWeight={600}
          >
            Decode
          </text>
          <text
            x={RIGHT_X + PANEL_W - 12}
            y={PANEL_Y + 18}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="end"
          >
            sequential
          </text>

          {/* tokens generated one at a time */}
          {decodeCols.map((i) => {
            const cw = 18;
            const gap = 4;
            const blockW = DECODE_STEPS * cw + (DECODE_STEPS - 1) * gap;
            const x0 = RIGHT_X + (PANEL_W - blockW) / 2;
            const x = x0 + i * (cw + gap);
            const y = PANEL_Y + 36;
            const h = 40;
            const emitted = i < decodeTokens;
            const current = decodeActive && i === decodeTokens - 1;
            return (
              <rect
                key={`dt-${i}`}
                x={x}
                y={y}
                width={cw}
                height={h}
                rx={2}
                fill={
                  current ? C.coral : emitted ? C.coralFill : "var(--card)"
                }
                stroke={C.coral}
                strokeWidth={current ? 1.6 : 1}
                opacity={emitted ? 1 : 0.3}
              />
            );
          })}
          <text
            x={RIGHT_X + PANEL_W / 2}
            y={PANEL_Y + 90}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            one token per step
          </text>

          {/* each step re-reads cache + weights */}
          <text
            x={RIGHT_X + 12}
            y={PANEL_Y + 112}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
          >
            each step reads KV cache + weights
          </text>

          {/* the takeaway label for decode */}
          <text
            x={RIGHT_X + 12}
            y={PANEL_Y + 130}
            fontSize={9}
            fill={C.ink}
            fontFamily={MONO}
          >
            memory-bandwidth-bound
          </text>
          <text
            x={RIGHT_X + 12}
            y={PANEL_Y + 143}
            fontSize={9}
            fill={C.muted}
            fontFamily={MONO}
          >
            sets tokens/second
          </text>
        </g>

        {/* ================= SHARED TIMELINE ================= */}
        <text
          x={TL_X}
          y={TL_Y - 10}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          timeline
        </text>
        <text
          x={TL_X + TL_W}
          y={TL_Y - 10}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          time →
        </text>

        {/* base line */}
        <line
          x1={TL_X}
          y1={TL_Y + 34}
          x2={TL_X + TL_W}
          y2={TL_Y + 34}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* one wide prefill bar */}
        <rect
          x={TL_X}
          y={TL_Y}
          width={PREFILL_W}
          height={28}
          rx={3}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
          opacity={frame >= 0 ? 1 : 0.3}
        />
        {/* prefill progress overlay while filling */}
        {prefillActive && (
          <rect
            x={TL_X}
            y={TL_Y}
            width={PREFILL_W * prefillFrac}
            height={28}
            rx={3}
            fill={C.blue}
            opacity={0.5}
          />
        )}
        <text
          x={TL_X + PREFILL_W / 2}
          y={TL_Y + 18}
          fontSize={10}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          prefill
        </text>

        {/* many small sequential decode steps */}
        {decodeCols.map((i) => {
          const x = TL_X + PREFILL_W + i * STEP_W + 1.5;
          const w = STEP_W - 3;
          const emitted = i < decodeTokens;
          const current = decodeActive && i === decodeTokens - 1;
          return (
            <rect
              key={`tl-d-${i}`}
              x={x}
              y={TL_Y + 6}
              width={w}
              height={22}
              rx={2}
              fill={current ? C.coral : emitted ? C.coralFill : "var(--card)"}
              stroke={C.coral}
              strokeWidth={current ? 1.6 : 1}
              opacity={emitted ? 1 : 0.3}
            />
          );
        })}
        <text
          x={TL_X + PREFILL_W + DECODE_W / 2}
          y={TL_Y + 46}
          fontSize={9}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="middle"
        >
          decode steps
        </text>

        {/* ================= LIMITING-RESOURCE READOUT ================= */}
        {showLimit && (
          <text
            x={VB_W / 2}
            y={TL_Y + 78}
            fontSize={11}
            fill={
              phase === "decode"
                ? C.coral
                : phase === "prefill"
                  ? C.blue
                  : C.muted
            }
            fontFamily={MONO}
            textAnchor="middle"
            fontWeight={600}
          >
            {phase === "prefill"
              ? "limited by: compute (arithmetic units)"
              : phase === "decode"
                ? "limited by: memory bandwidth"
                : "limited by: — (idle)"}
          </text>
        )}
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={onPlay}>
          {playing ? "Pause" : frame >= TOTAL_FRAMES ? "Replay" : "Play"}
        </button>
        <button type="button" className={btn} onClick={onReset}>
          Reset
        </button>
        <button
          type="button"
          className={btn}
          style={
            showLimit ? { background: C.ink, color: "var(--background)" } : undefined
          }
          onClick={() => setShowLimit((s) => !s)}
        >
          Limiting resource
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {phase === "prefill"
            ? "phase: prefill"
            : phase === "decode"
              ? `phase: decode (${decodeTokens}/${DECODE_STEPS})`
              : "phase: done"}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Prompt processing is parallel and compute-bound; generation is
        sequential and bandwidth-bound.
      </p>
    </div>
  );
}
