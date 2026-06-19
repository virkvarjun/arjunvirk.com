"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// SAM's Three Components and Their Cost Asymmetry.
//
// SAM (Segment Anything Model) splits its work into three pieces:
//   - Image Encoder (ViT-H, 636M params): the HEAVY block. It is run ONCE per
//     image and produces an image embedding that takes ~hundreds of ms.
//   - Prompt Encoder: a LIGHT block run per prompt (a click / box). Cheap.
//   - Mask Decoder: a LIGHT block run per prompt. Emits a mask in ~ms.
// The image embedding is computed once and then REUSED across many prompts, so
// after the one expensive encode, every additional prompt is nearly free. That
// asymmetry is what makes SAM feel instant when you click around an image.
//
// Interaction: "Encode image" runs the heavy bar once (fills the embedding).
// "Add prompt" fires a cheap prompt+decode cycle that produces a mask quickly,
// reusing the stored embedding. The timeline shows one wide image-encode bar
// followed by many small prompt+decode ticks, and a cost readout tallies the
// total milliseconds spent on the heavy encode vs. all the cheap prompts.

// --- cost model (hard-coded, deterministic) --------------------------------
const ENCODE_MS = 450; // one heavy image encode (~hundreds of ms)
const PROMPT_MS = 8; // cheap prompt+decode cycle (milliseconds)
const MAX_PROMPTS = 8; // cap so the timeline stays uncluttered

// --- geometry --------------------------------------------------------------
const VB_W = 520;
const VB_H = 400;

// Component diagram band.
const DIAG_Y = 56;

// Heavy image encoder block (left).
const ENC_X = 20;
const ENC_Y = DIAG_Y;
const ENC_W = 150;
const ENC_H = 120;

// Embedding store (middle).
const EMB_X = 212;
const EMB_Y = DIAG_Y + 30;
const EMB_W = 78;
const EMB_H = 60;

// Light blocks (right): prompt encoder + mask decoder, stacked.
const LIGHT_X = 348;
const PE_Y = DIAG_Y + 4;
const MD_Y = DIAG_Y + 70;
const LIGHT_W = 152;
const LIGHT_H = 46;

// Timeline band.
const TL_X = 20;
const TL_W = VB_W - 40;
const TL_Y = 244;
const TL_H = 30;
const ENC_BAR_W = 180; // wide bar = one expensive encode
const PROMPT_SLOT_W = (TL_W - ENC_BAR_W) / MAX_PROMPTS;

// Cost readout band.
const COST_Y = 312;

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

const PROMPT_INDICES: number[] = [0, 1, 2, 3, 4, 5, 6, 7];

export function VisSamComponents() {
  const [encoded, setEncoded] = useState<boolean>(false);
  const [encoding, setEncoding] = useState<boolean>(false);
  const [encFrac, setEncFrac] = useState<number>(0); // 0..1 fill of encode bar
  const [prompts, setPrompts] = useState<number>(0); // prompts fired so far
  const [flash, setFlash] = useState<number>(0); // index of just-fired prompt + 1

  const fracRef = useRef<number>(0);
  useEffect(() => {
    fracRef.current = encFrac;
  }, [encFrac]);

  // Animate the heavy encode bar filling, then mark embedding ready.
  useEffect(() => {
    if (!encoding) return;
    const id = setInterval(() => {
      const next = fracRef.current + 0.12;
      if (next >= 1) {
        setEncFrac(1);
        setEncoding(false);
        setEncoded(true);
      } else {
        setEncFrac(next);
      }
    }, 70);
    return () => clearInterval(id);
  }, [encoding]);

  // Briefly clear the flash highlight after a prompt fires.
  useEffect(() => {
    if (flash === 0) return;
    const id = setInterval(() => {
      setFlash(0);
    }, 420);
    return () => clearInterval(id);
  }, [flash]);

  function onEncode(): void {
    if (encoding) return;
    setEncoded(false);
    setEncFrac(0);
    fracRef.current = 0;
    setPrompts(0);
    setFlash(0);
    setEncoding(true);
  }

  function onPrompt(): void {
    if (!encoded || prompts >= MAX_PROMPTS) return;
    setPrompts((p) => {
      const np = p + 1;
      setFlash(np);
      return np;
    });
  }

  function onReset(): void {
    setEncoding(false);
    setEncoded(false);
    setEncFrac(0);
    fracRef.current = 0;
    setPrompts(0);
    setFlash(0);
  }

  const embReady = encoded;
  const encodeCost = encoded || encoding ? ENCODE_MS : 0;
  const promptCost = prompts * PROMPT_MS;
  const totalCost = encodeCost + promptCost;
  // Average ms per prompt-after-encode framing (amortized).
  const avgPerPrompt = prompts > 0 ? totalCost / prompts : 0;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="SAM's three components and their cost asymmetry"
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
          SAM: three components, asymmetric cost
        </text>
        <text
          x={VB_W / 2}
          y={42}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          encode image once (heavy), then many cheap prompts
        </text>

        {/* ================= HEAVY IMAGE ENCODER ================= */}
        <rect
          x={ENC_X}
          y={ENC_Y}
          width={ENC_W}
          height={ENC_H}
          rx={7}
          fill={encoding ? C.blueFill : encoded ? C.blueFill : "var(--card)"}
          stroke={C.blue}
          strokeWidth={encoding ? 2.2 : 1.4}
        />
        <text
          x={ENC_X + ENC_W / 2}
          y={ENC_Y + 22}
          fontSize={12}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Image Encoder
        </text>
        <text
          x={ENC_X + ENC_W / 2}
          y={ENC_Y + 38}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          ViT-H, 636M params
        </text>
        {/* heavy badge */}
        <text
          x={ENC_X + ENC_W / 2}
          y={ENC_Y + 54}
          fontSize={9}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          HEAVY
        </text>
        {/* in-block encode progress bar */}
        <rect
          x={ENC_X + 16}
          y={ENC_Y + 66}
          width={ENC_W - 32}
          height={12}
          rx={3}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />
        <rect
          x={ENC_X + 16}
          y={ENC_Y + 66}
          width={(ENC_W - 32) * encFrac}
          height={12}
          rx={3}
          fill={C.blue}
        />
        <text
          x={ENC_X + ENC_W / 2}
          y={ENC_Y + 96}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          runs ONCE per image
        </text>
        <text
          x={ENC_X + ENC_W / 2}
          y={ENC_Y + 110}
          fontSize={9}
          fill={encoding ? C.blue : C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {`~${ENCODE_MS} ms`}
        </text>

        {/* arrow: encoder -> embedding */}
        <line
          x1={ENC_X + ENC_W}
          y1={EMB_Y + EMB_H / 2}
          x2={EMB_X}
          y2={EMB_Y + EMB_H / 2}
          stroke={embReady ? C.blue : C.line}
          strokeWidth={1.6}
          markerEnd=""
        />
        <polygon
          points={`${EMB_X},${EMB_Y + EMB_H / 2} ${EMB_X - 8},${EMB_Y + EMB_H / 2 - 4} ${EMB_X - 8},${EMB_Y + EMB_H / 2 + 4}`}
          fill={embReady ? C.blue : C.line}
        />

        {/* ================= EMBEDDING STORE ================= */}
        <rect
          x={EMB_X}
          y={EMB_Y}
          width={EMB_W}
          height={EMB_H}
          rx={6}
          fill={embReady ? C.greenFill : "var(--card)"}
          stroke={embReady ? C.green : C.line}
          strokeWidth={1.4}
          strokeDasharray={embReady ? "0" : "4 4"}
        />
        <text
          x={EMB_X + EMB_W / 2}
          y={EMB_Y + 24}
          fontSize={10}
          fill={embReady ? C.green : C.muted}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          image
        </text>
        <text
          x={EMB_X + EMB_W / 2}
          y={EMB_Y + 38}
          fontSize={10}
          fill={embReady ? C.green : C.muted}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          embedding
        </text>
        <text
          x={EMB_X + EMB_W / 2}
          y={EMB_Y + 52}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {embReady ? "cached, reused" : "not ready"}
        </text>

        {/* arrow: embedding -> light blocks (reused) */}
        <line
          x1={EMB_X + EMB_W}
          y1={EMB_Y + EMB_H / 2}
          x2={LIGHT_X}
          y2={MD_Y + LIGHT_H / 2}
          stroke={embReady ? C.green : C.line}
          strokeWidth={1.6}
        />
        <polygon
          points={`${LIGHT_X},${MD_Y + LIGHT_H / 2} ${LIGHT_X - 8},${MD_Y + LIGHT_H / 2 - 4} ${LIGHT_X - 8},${MD_Y + LIGHT_H / 2 + 4}`}
          fill={embReady ? C.green : C.line}
        />

        {/* ================= LIGHT: PROMPT ENCODER ================= */}
        <rect
          x={LIGHT_X}
          y={PE_Y}
          width={LIGHT_W}
          height={LIGHT_H}
          rx={6}
          fill={flash > 0 ? C.coralFill : "var(--card)"}
          stroke={C.coral}
          strokeWidth={flash > 0 ? 2 : 1.2}
        />
        <text
          x={LIGHT_X + LIGHT_W / 2}
          y={PE_Y + 19}
          fontSize={11}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Prompt Encoder
        </text>
        <text
          x={LIGHT_X + LIGHT_W / 2}
          y={PE_Y + 34}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          light, per prompt
        </text>

        {/* ================= LIGHT: MASK DECODER ================= */}
        <rect
          x={LIGHT_X}
          y={MD_Y}
          width={LIGHT_W}
          height={LIGHT_H}
          rx={6}
          fill={flash > 0 ? C.coralFill : "var(--card)"}
          stroke={C.coral}
          strokeWidth={flash > 0 ? 2 : 1.2}
        />
        <text
          x={LIGHT_X + LIGHT_W / 2}
          y={MD_Y + 19}
          fontSize={11}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Mask Decoder
        </text>
        <text
          x={LIGHT_X + LIGHT_W / 2}
          y={MD_Y + 34}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {`light, ~${PROMPT_MS} ms`}
        </text>

        {/* real-time badge under light blocks */}
        <text
          x={LIGHT_X + LIGHT_W / 2}
          y={MD_Y + LIGHT_H + 16}
          fontSize={9}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          real time, per prompt
        </text>

        {/* ================= TIMELINE ================= */}
        <text
          x={TL_X}
          y={TL_Y - 12}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          timeline
        </text>
        <text
          x={TL_X + TL_W}
          y={TL_Y - 12}
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
          y1={TL_Y + TL_H + 8}
          x2={TL_X + TL_W}
          y2={TL_Y + TL_H + 8}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* one wide expensive encode bar */}
        <rect
          x={TL_X}
          y={TL_Y}
          width={ENC_BAR_W}
          height={TL_H}
          rx={3}
          fill={encoded || encoding ? C.blueFill : "var(--card)"}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <rect
          x={TL_X}
          y={TL_Y}
          width={ENC_BAR_W * encFrac}
          height={TL_H}
          rx={3}
          fill={C.blue}
          opacity={0.45}
        />
        <text
          x={TL_X + ENC_BAR_W / 2}
          y={TL_Y + TL_H / 2 + 4}
          fontSize={10}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          image encode
        </text>

        {/* many small cheap prompt+decode ticks */}
        {PROMPT_INDICES.map((i) => {
          const x = TL_X + ENC_BAR_W + i * PROMPT_SLOT_W + 2;
          const w = PROMPT_SLOT_W - 4;
          const done = i < prompts;
          const isFlash = flash === i + 1;
          return (
            <rect
              key={`tick-${i}`}
              x={x}
              y={TL_Y + 4}
              width={w}
              height={TL_H - 8}
              rx={2}
              fill={isFlash ? C.coral : done ? C.coralFill : "var(--background)"}
              stroke={C.coral}
              strokeWidth={isFlash ? 1.8 : 1}
              opacity={done ? 1 : 0.4}
            />
          );
        })}
        <text
          x={TL_X + ENC_BAR_W + (TL_W - ENC_BAR_W) / 2}
          y={TL_Y + TL_H + 22}
          fontSize={9}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="middle"
        >
          cheap prompt + decode cycles
        </text>

        {/* ================= COST READOUT BAND ================= */}
        <text
          x={TL_X}
          y={COST_Y}
          fontSize={10}
          fill={C.blue}
          fontFamily={MONO}
          fontWeight={600}
        >
          {`encode: ${encodeCost} ms (once)`}
        </text>
        <text
          x={TL_X + 188}
          y={COST_Y}
          fontSize={10}
          fill={C.coral}
          fontFamily={MONO}
          fontWeight={600}
        >
          {`${prompts} prompts: ${promptCost} ms`}
        </text>
        <text
          x={TL_X + TL_W}
          y={COST_Y}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
          textAnchor="end"
        >
          {`total: ${totalCost} ms`}
        </text>
        <text
          x={TL_X}
          y={COST_Y + 18}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          {prompts > 0
            ? `amortized: ${avgPerPrompt.toFixed(0)} ms / prompt`
            : "fire prompts to amortize the heavy encode"}
        </text>

        {/* ================= CAPTION BAND ================= */}
        <text
          x={VB_W / 2}
          y={VB_H - 28}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
        >
          Encode the image once (expensive); decode each prompt in ms (cheap).
        </text>
        <text
          x={VB_W / 2}
          y={VB_H - 12}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          That asymmetry is what makes SAM feel instant.
        </text>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={
            encoding ? { background: C.ink, color: "var(--background)" } : undefined
          }
          onClick={onEncode}
          disabled={encoding}
        >
          {encoding ? "Encoding…" : encoded ? "Re-encode image" : "Encode image"}
        </button>
        <button
          type="button"
          className={btn}
          onClick={onPrompt}
          disabled={!encoded || prompts >= MAX_PROMPTS}
        >
          Add prompt
        </button>
        <button type="button" className={btn} onClick={onReset}>
          Reset
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {!encoded && !encoding
            ? "embedding: not ready"
            : encoding
              ? "embedding: computing…"
              : `embedding: ready · prompts ${prompts}/${MAX_PROMPTS}`}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        The heavy image encoder runs once per image; the light prompt encoder
        and mask decoder run per prompt, reusing the cached embedding.
      </p>
    </div>
  );
}
