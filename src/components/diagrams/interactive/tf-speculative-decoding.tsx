"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Speculative decoding.
//   - A small, fast DRAFT model proposes k tokens one after another (cheap).
//   - The big TARGET model verifies all k proposals in a SINGLE parallel
//     forward pass (the same cost as generating one token normally).
//   - The longest matching prefix is accepted for free (green); the first
//     mismatch is corrected by the target model (red); generation continues.
//   - Effective speedup ~= (accepted + 1) tokens produced per target pass.
//
// Everything is deterministic. The number of accepted draft tokens in a round
// is a fixed function of the "agreement rate" slider and the round index, so
// there is no Math.random anywhere, SSR-safe.

// --- geometry --------------------------------------------------------------
const VB_W = 480;
const VB_H = 360;

const MARGIN = 16;
const K = 5; // draft tokens proposed per round

// token cell layout (shared x positions across the three rows)
const CELL_W = 56;
const CELL_GAP = 10;
const ROW_X = 84; // left edge of first token cell (room for row label on left)
const CELL_H = 34;

// row baselines (y of the top of each row's cells)
const DRAFT_Y = 70;
const TARGET_Y = 150;
const VERDICT_Y = 232;

// readout band sits below the verdict row
const READOUT_Y = 296;

// the draft sequence shown in the cells (deterministic placeholder tokens)
const DRAFT_TOKENS: readonly string[] = ["the", "cat", "sat", "on", "mat"];

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

// How many of the k draft tokens the target model accepts this round.
// Deterministic: higher agreement -> more accepted; a small per-round offset
// keeps successive rounds from looking identical, without any randomness.
function acceptedFor(agreement: number, round: number): number {
  // expected accepted from agreement geometric-style: floor(agreement * (K+1))
  const base = Math.floor((agreement / 100) * (K + 1));
  // deterministic wobble in {-1,0,+1,0} cycling by round
  const wobble = [0, 1, -1, 0][round % 4];
  let acc = base + wobble;
  if (acc < 0) acc = 0;
  if (acc > K) acc = K;
  return acc;
}

type Phase = "draft" | "verify" | "verdict";

export function TfSpeculativeDecoding() {
  const [round, setRound] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>("draft");
  const [agreement, setAgreement] = useState<number>(70);

  const accepted = acceptedFor(agreement, round);
  // tokens produced by one target pass = accepted draft tokens + 1 correction
  const produced = accepted + 1;

  // step the little state machine: draft -> verify -> verdict -> (next round)
  function onStep(): void {
    if (phase === "draft") {
      setPhase("verify");
    } else if (phase === "verify") {
      setPhase("verdict");
    } else {
      setRound((r) => r + 1);
      setPhase("draft");
    }
  }
  function onReset(): void {
    setRound(0);
    setPhase("draft");
  }

  const cellX = (i: number): number => ROW_X + i * (CELL_W + CELL_GAP);

  // visibility per phase
  const showVerify = phase === "verify" || phase === "verdict";
  const showVerdict = phase === "verdict";

  // index of the first rejected token (the correction slot)
  const firstReject = accepted; // 0..K ; ==K means all accepted

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Speculative decoding: a draft model proposes tokens that a target model verifies in parallel"
      >
        {/* ---- title band ---- */}
        <text
          x={VB_W / 2}
          y={24}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Speculative Decoding
        </text>
        <text
          x={VB_W / 2}
          y={40}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {`round ${round + 1}  ·  draft proposes k=${K} tokens`}
        </text>

        {/* ================= DRAFT ROW ================= */}
        <text
          x={MARGIN}
          y={DRAFT_Y + CELL_H / 2 - 6}
          fontSize={10}
          fill={C.violet}
          fontFamily={MONO}
          fontWeight={600}
        >
          draft
        </text>
        <text
          x={MARGIN}
          y={DRAFT_Y + CELL_H / 2 + 8}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
        >
          small
        </text>
        {DRAFT_TOKENS.map((tok, i) => {
          const x = cellX(i);
          return (
            <g key={`draft-${i}`}>
              <rect
                x={x}
                y={DRAFT_Y}
                width={CELL_W}
                height={CELL_H}
                rx={4}
                fill={C.violet}
                stroke={C.violet}
                strokeWidth={1}
                opacity={0.9}
              />
              <text
                x={x + CELL_W / 2}
                y={DRAFT_Y + CELL_H / 2 + 4}
                fontSize={11}
                fill="var(--card)"
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
              >
                {tok}
              </text>
            </g>
          );
        })}
        <text
          x={ROW_X + K * (CELL_W + CELL_GAP) - CELL_GAP}
          y={DRAFT_Y - 8}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          proposed one-by-one (cheap)
        </text>

        {/* arrows draft -> target (one parallel verify pass) */}
        {showVerify &&
          DRAFT_TOKENS.map((_, i) => {
            const x = cellX(i) + CELL_W / 2;
            return (
              <line
                key={`arr-${i}`}
                x1={x}
                y1={DRAFT_Y + CELL_H}
                x2={x}
                y2={TARGET_Y}
                stroke={C.line}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            );
          })}

        {/* ================= TARGET ROW ================= */}
        <text
          x={MARGIN}
          y={TARGET_Y + CELL_H / 2 - 6}
          fontSize={10}
          fill={C.blue}
          fontFamily={MONO}
          fontWeight={600}
        >
          target
        </text>
        <text
          x={MARGIN}
          y={TARGET_Y + CELL_H / 2 + 8}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
        >
          big
        </text>
        {/* one parallel pass: a bracket spanning all k cells */}
        {showVerify && (
          <rect
            x={ROW_X - 6}
            y={TARGET_Y - 6}
            width={K * (CELL_W + CELL_GAP) - CELL_GAP + 12}
            height={CELL_H + 12}
            rx={6}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1.4}
          />
        )}
        {DRAFT_TOKENS.map((tok, i) => {
          const x = cellX(i);
          return (
            <g key={`target-${i}`}>
              <rect
                x={x}
                y={TARGET_Y}
                width={CELL_W}
                height={CELL_H}
                rx={4}
                fill="var(--card)"
                stroke={C.blue}
                strokeWidth={1}
                opacity={showVerify ? 1 : 0.25}
              />
              <text
                x={x + CELL_W / 2}
                y={TARGET_Y + CELL_H / 2 + 4}
                fontSize={11}
                fill={showVerify ? C.blue : C.muted}
                fontFamily={MONO}
                textAnchor="middle"
                opacity={showVerify ? 1 : 0.4}
              >
                {tok}
              </text>
            </g>
          );
        })}
        {showVerify && (
          <text
            x={ROW_X + (K * (CELL_W + CELL_GAP) - CELL_GAP) / 2}
            y={TARGET_Y + CELL_H + 18}
            fontSize={8}
            fill={C.blue}
            fontFamily={MONO}
            textAnchor="middle"
          >
            verified in ONE parallel pass
          </text>
        )}

        {/* ================= VERDICT ROW ================= */}
        <text
          x={MARGIN}
          y={VERDICT_Y + CELL_H / 2 - 6}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          fontWeight={600}
        >
          kept
        </text>
        {DRAFT_TOKENS.map((tok, i) => {
          const x = cellX(i);
          // before verdict: faint outline only
          if (!showVerdict) {
            return (
              <rect
                key={`verdict-${i}`}
                x={x}
                y={VERDICT_Y}
                width={CELL_W}
                height={CELL_H}
                rx={4}
                fill="var(--card)"
                stroke={C.line}
                strokeWidth={1}
                opacity={0.4}
              />
            );
          }
          const isAccepted = i < accepted;
          const isCorrection = i === firstReject && firstReject < K;
          const fill = isAccepted
            ? C.greenFill
            : isCorrection
              ? C.coralFill
              : "var(--card)";
          const stroke = isAccepted
            ? C.green
            : isCorrection
              ? C.coral
              : C.line;
          const txtFill = isAccepted
            ? C.green
            : isCorrection
              ? C.coral
              : C.muted;
          const label = isCorrection ? "fix" : tok;
          return (
            <g key={`verdict-${i}`}>
              <rect
                x={x}
                y={VERDICT_Y}
                width={CELL_W}
                height={CELL_H}
                rx={4}
                fill={fill}
                stroke={stroke}
                strokeWidth={isCorrection ? 1.6 : 1.2}
                opacity={!isAccepted && !isCorrection ? 0.3 : 1}
              />
              <text
                x={x + CELL_W / 2}
                y={VERDICT_Y + CELL_H / 2 + 4}
                fontSize={11}
                fill={txtFill}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={600}
                opacity={!isAccepted && !isCorrection ? 0.4 : 1}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* ---- readout band (below verdict row) ---- */}
        <line
          x1={MARGIN}
          y1={READOUT_Y - 16}
          x2={VB_W - MARGIN}
          y2={READOUT_Y - 16}
          stroke={C.line}
          strokeWidth={1}
        />
        {showVerdict ? (
          <>
            <text
              x={MARGIN}
              y={READOUT_Y}
              fontSize={10}
              fill={C.green}
              fontFamily={MONO}
              fontWeight={600}
            >
              {`accepted ${accepted}/${K}`}
            </text>
            <text
              x={MARGIN + 110}
              y={READOUT_Y}
              fontSize={10}
              fill={C.coral}
              fontFamily={MONO}
            >
              {firstReject < K ? "+1 correction" : "all guesses right"}
            </text>
            <text
              x={VB_W - MARGIN}
              y={READOUT_Y}
              fontSize={11}
              fill={C.ink}
              fontFamily={MONO}
              textAnchor="end"
              fontWeight={600}
            >
              {`${produced} tokens / pass  →  ${produced.toFixed(1)}× speedup`}
            </text>
            <text
              x={MARGIN}
              y={READOUT_Y + 16}
              fontSize={8}
              fill={C.muted}
              fontFamily={MONO}
            >
              one big-model pass produced {produced} tokens instead of 1
            </text>
          </>
        ) : (
          <text
            x={MARGIN}
            y={READOUT_Y}
            fontSize={10}
            fill={C.muted}
            fontFamily={MONO}
          >
            {phase === "draft"
              ? "step: draft model proposes k tokens →"
              : "step: target model verifies all k at once →"}
          </text>
        )}
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={onStep}>
          {phase === "draft"
            ? "Draft k tokens"
            : phase === "verify"
              ? "Verify (parallel)"
              : "Next round"}
        </button>
        <button type="button" className={btn} onClick={onReset}>
          Reset
        </button>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">agreement</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={agreement}
            onChange={(e) => setAgreement(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{agreement}%</span>
        </label>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {`speedup ≈ ${produced.toFixed(1)}×`}
        </span>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        A small model guesses ahead; the big model checks them all at once. Free
        speed when guesses are right.
      </p>
    </div>
  );
}
