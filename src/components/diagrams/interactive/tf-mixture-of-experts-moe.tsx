"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Number of expert FFNs in the MoE layer.
const N_EXPERTS = 8;
// How many experts the router activates per token (top-k).
const TOP_K = 2;

// A handful of example tokens. For each token we hard-code the router
// (gating-network) logits over the 8 experts. These are deterministic so the
// diagram is SSR-safe (no Math.random / Date). Each row sums loosely to a
// distribution after softmax; the top-2 entries differ per token so the router
// "picks different experts each time".
const TOKENS: { text: string; logits: number[] }[] = [
  { text: "cat", logits: [2.9, 0.4, 1.1, 0.2, 3.4, 0.6, 0.3, 0.8] }, // experts 5,1
  { text: "running", logits: [0.5, 3.1, 0.7, 2.6, 0.4, 0.9, 1.2, 0.3] }, // experts 2,4
  { text: "Tokyo", logits: [0.3, 0.6, 0.5, 0.7, 0.9, 3.6, 1.0, 2.8] }, // experts 6,8
  { text: "+", logits: [0.4, 0.8, 3.5, 0.5, 0.6, 0.3, 2.9, 0.7] }, // experts 3,7
  { text: "she", logits: [3.3, 0.5, 0.4, 0.9, 0.6, 1.1, 0.7, 2.7] }, // experts 1,8
];

// Params (illustrative) so the active-vs-total readout has concrete numbers.
const PARAMS_PER_EXPERT = 0.9; // billions of params per expert FFN
const PARAMS_SHARED = 0.3; // attention + router + embeddings (always active)

// --- Geometry (viewBox W x H) ---
const W = 600;
const H = 560;

const M = 14; // outer margin

// Title band: y 0..58. Drawing band: ~70..430. Readout band: ~440..H.
const TITLE_Y = 24;
const SUB_Y = 44;

// Token box (left).
const TOK_X = M;
const TOK_W = 70;
const TOK_Y = 196;
const TOK_H = 40;

// Router box.
const ROUTER_X = 118;
const ROUTER_W = 86;
const ROUTER_Y = 150;
const ROUTER_H = 130;

// Expert column (right of router).
const EXP_X = 300; // left edge of expert boxes
const EXP_W = 150;
const EXP_TOP = 78; // center y of expert 0
const EXP_GAP = 40; // vertical spacing between expert centers
const EXP_H = 30;

// Combine / sum node (far right).
const SUM_X = 520;
const SUM_R = 22;
const SUM_CY = EXP_TOP + ((N_EXPERTS - 1) * EXP_GAP) / 2;

// Readout band.
const DIV_Y = 432;
const READ_Y = 452;

function expertCenterY(i: number): number {
  return EXP_TOP + i * EXP_GAP;
}

// Softmax over the selected top-k logits -> combine weights.
function softmaxTopK(logits: number[], idxs: number[]): number[] {
  const vals = idxs.map((i) => logits[i]);
  const max = Math.max(...vals);
  const exps = vals.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Indices of the top-k logits (descending by logit value).
function topKIndices(logits: number[], k: number): number[] {
  return logits
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .slice(0, k)
    .map((o) => o.i);
}

export function TfMixtureOfExperts() {
  const [tokenIdx, setTokenIdx] = useState<number>(0);
  // Cumulative count of how often each expert has been selected, for the
  // load-balance meter. Seeded to zeros; updated only in event handlers.
  const [usage, setUsage] = useState<number[]>(() =>
    Array.from({ length: N_EXPERTS }, () => 0),
  );

  const token = TOKENS[tokenIdx];
  const chosen = topKIndices(token.logits, TOP_K); // active expert indices
  const weights = softmaxTopK(token.logits, chosen); // combine weights
  const chosenSet = new Set<number>(chosen);
  // Map expert index -> its combine weight (for active experts).
  const weightOf = new Map<number, number>();
  chosen.forEach((e, j) => weightOf.set(e, weights[j]));

  // Params readout.
  const totalParams = PARAMS_SHARED + N_EXPERTS * PARAMS_PER_EXPERT;
  const activeParams = PARAMS_SHARED + TOP_K * PARAMS_PER_EXPERT;

  const totalRuns = usage.reduce((a, b) => a + b, 0);
  const maxUsage = Math.max(1, ...usage);

  // Pick a token and record expert usage (event handler -> setState OK).
  const pick = (i: number): void => {
    setTokenIdx(i);
    const sel = topKIndices(TOKENS[i].logits, TOP_K);
    setUsage((prev) => {
      const next = prev.slice();
      sel.forEach((e) => (next[e] += 1));
      return next;
    });
  };

  const resetUsage = (): void => {
    setUsage(Array.from({ length: N_EXPERTS }, () => 0));
  };

  const routerCx = ROUTER_X + ROUTER_W / 2;
  const routerCy = ROUTER_Y + ROUTER_H / 2;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Mixture of Experts: a token feeds a router (gating network) that scores 8 expert feed-forward networks and selects the top 2; the token passes only through those two experts, whose outputs are weighted by softmaxed router scores and summed. Readouts show active versus total parameters and a load-balance meter of expert usage."
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={TITLE_Y}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Mixture of Experts (MoE)
        </text>
        <text
          x={W / 2}
          y={SUB_Y}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          {`router picks top-${TOP_K} of ${N_EXPERTS} expert FFNs per token`}
        </text>

        {/* ---- Token box (left) ---- */}
        <rect
          x={TOK_X}
          y={TOK_Y}
          width={TOK_W}
          height={TOK_H}
          rx={6}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.6}
        />
        <text
          x={TOK_X + TOK_W / 2}
          y={TOK_Y - 8}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          token
        </text>
        <text
          x={TOK_X + TOK_W / 2}
          y={TOK_Y + TOK_H / 2 + 4}
          fontFamily={MONO}
          fontSize={12}
          fill={C.blue}
          textAnchor="middle"
          fontWeight={600}
        >
          {token.text.length > 9 ? token.text.slice(0, 8) + "…" : token.text}
        </text>

        {/* token -> router connector */}
        <line
          x1={TOK_X + TOK_W}
          y1={TOK_Y + TOK_H / 2}
          x2={ROUTER_X}
          y2={routerCy}
          stroke={C.line}
          strokeWidth={1.6}
        />

        {/* ---- Router (gating network) ---- */}
        <rect
          x={ROUTER_X}
          y={ROUTER_Y}
          width={ROUTER_W}
          height={ROUTER_H}
          rx={6}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.8}
        />
        <text
          x={routerCx}
          y={ROUTER_Y - 20}
          fontFamily={MONO}
          fontSize={10}
          fill={C.coral}
          textAnchor="middle"
          fontWeight={600}
        >
          Router
        </text>
        <text
          x={routerCx}
          y={ROUTER_Y - 8}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          (gating net)
        </text>
        <text
          x={routerCx}
          y={routerCy - 6}
          fontFamily={MONO}
          fontSize={10}
          fill={C.coral}
          textAnchor="middle"
          fontWeight={600}
        >
          linear
        </text>
        <text
          x={routerCx}
          y={routerCy + 9}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {`-> ${N_EXPERTS} scores`}
        </text>
        <text
          x={routerCx}
          y={routerCy + 24}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          {`softmax top-${TOP_K}`}
        </text>

        {/* ---- Router -> experts connectors + experts ---- */}
        {Array.from({ length: N_EXPERTS }, (_, i) => i).map((i: number) => {
          const cy = expertCenterY(i);
          const active = chosenSet.has(i);
          const stroke = active ? C.green : C.line;
          const half = EXP_H / 2;
          const w = weightOf.get(i);
          return (
            <g key={`exp${i}`} opacity={active ? 1 : 0.42}>
              {/* router -> expert connector */}
              <line
                x1={ROUTER_X + ROUTER_W}
                y1={routerCy + (cy - routerCy) * 0.18}
                x2={EXP_X}
                y2={cy}
                stroke={active ? C.green : C.line}
                strokeWidth={active ? 2 : 0.9}
                strokeDasharray={active ? undefined : "3 3"}
              />
              {/* expert box */}
              <rect
                x={EXP_X}
                y={cy - half}
                width={EXP_W}
                height={EXP_H}
                rx={5}
                fill={active ? C.greenFill : "var(--card)"}
                stroke={stroke}
                strokeWidth={active ? 1.8 : 1.1}
              />
              <text
                x={EXP_X + 10}
                y={cy + 3.5}
                fontFamily={MONO}
                fontSize={10}
                fill={active ? C.green : C.muted}
                textAnchor="start"
                fontWeight={active ? 600 : 400}
              >
                {`Expert ${i + 1}`}
              </text>
              {/* per-expert status / weight */}
              <text
                x={EXP_X + EXP_W - 10}
                y={cy + 3.5}
                fontFamily={MONO}
                fontSize={9}
                fill={active ? C.green : C.muted}
                textAnchor="end"
                fontWeight={active ? 600 : 400}
              >
                {active && w !== undefined ? `w=${w.toFixed(2)}` : "idle"}
              </text>
              {/* expert -> sum connector (active only) */}
              {active && (
                <line
                  x1={EXP_X + EXP_W}
                  y1={cy}
                  x2={SUM_X - SUM_R}
                  y2={SUM_CY + (cy - SUM_CY) * 0.2}
                  stroke={C.green}
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}

        {/* experts band caption */}
        <text
          x={EXP_X + EXP_W / 2}
          y={EXP_TOP - EXP_H / 2 - 10}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {`${N_EXPERTS} expert FFNs`}
        </text>

        {/* ---- Weighted-sum / combine node ---- */}
        <circle
          cx={SUM_X}
          cy={SUM_CY}
          r={SUM_R}
          fill={C.violet}
          stroke={C.violet}
          strokeWidth={1.6}
        />
        <text
          x={SUM_X}
          y={SUM_CY + 6}
          fontFamily={MONO}
          fontSize={18}
          fill="var(--card)"
          textAnchor="middle"
          fontWeight={600}
        >
          Σ
        </text>
        <text
          x={SUM_X}
          y={SUM_CY - SUM_R - 8}
          fontFamily={MONO}
          fontSize={9}
          fill={C.violet}
          textAnchor="middle"
          fontWeight={600}
        >
          combine
        </text>
        <text
          x={SUM_X}
          y={SUM_CY + SUM_R + 14}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          weighted sum
        </text>
        {/* sum -> output */}
        <line
          x1={SUM_X}
          y1={SUM_CY + SUM_R}
          x2={SUM_X}
          y2={SUM_CY + SUM_R + 22}
          stroke={C.violet}
          strokeWidth={1.8}
        />
        <text
          x={SUM_X}
          y={SUM_CY + SUM_R + 36}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          output
        </text>

        {/* ===== Readout band ===== */}
        <line
          x1={M}
          y1={DIV_Y}
          x2={W - M}
          y2={DIV_Y}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* Params readout (left half) */}
        <text
          x={M}
          y={READ_Y}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="start"
          fontWeight={600}
        >
          parameters
        </text>
        <text
          x={M}
          y={READ_Y + 16}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="start"
        >
          {`total:  ${N_EXPERTS} experts  =  ${totalParams.toFixed(1)}B`}
        </text>
        <text
          x={M}
          y={READ_Y + 30}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.green}
          textAnchor="start"
          fontWeight={600}
        >
          {`active/token:  ${TOP_K} experts  =  ${activeParams.toFixed(1)}B`}
        </text>
        <text
          x={M}
          y={READ_Y + 44}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.coral}
          textAnchor="start"
        >
          {`-> only ${((activeParams / totalParams) * 100).toFixed(0)}% of params run per token`}
        </text>

        {/* Active experts line */}
        <text
          x={M}
          y={READ_Y + 62}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.ink}
          textAnchor="start"
        >
          {`"${token.text}"  ->  experts ${chosen
            .map((e) => e + 1)
            .sort((a, b) => a - b)
            .join(" + ")}`}
        </text>

        {/* Load-balance meter (right half) */}
        <text
          x={320}
          y={READ_Y}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="start"
          fontWeight={600}
        >
          {`load balance  (${totalRuns} picks)`}
        </text>
        {Array.from({ length: N_EXPERTS }, (_, i) => i).map((i: number) => {
          const barX = 320 + i * 33;
          const barW = 26;
          const baseY = READ_Y + 58; // bottom baseline of bars
          const maxBarH = 38;
          const h = (usage[i] / maxUsage) * maxBarH;
          const active = chosenSet.has(i);
          return (
            <g key={`bar${i}`}>
              {/* track */}
              <rect
                x={barX}
                y={baseY - maxBarH}
                width={barW}
                height={maxBarH}
                rx={2}
                fill="var(--card)"
                stroke={C.line}
                strokeWidth={0.8}
              />
              {/* fill */}
              <rect
                x={barX}
                y={baseY - h}
                width={barW}
                height={h}
                rx={2}
                fill={active ? C.green : C.blueFill}
                stroke={active ? C.green : C.blue}
                strokeWidth={active ? 1.4 : 0.8}
              />
              {/* count above bar */}
              <text
                x={barX + barW / 2}
                y={baseY - maxBarH - 4}
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.muted}
                textAnchor="middle"
              >
                {usage[i]}
              </text>
              {/* expert label below bar */}
              <text
                x={barX + barW / 2}
                y={baseY + 11}
                fontFamily={MONO}
                fontSize={8.5}
                fill={active ? C.green : C.muted}
                textAnchor="middle"
                fontWeight={active ? 600 : 400}
              >
                {`E${i + 1}`}
              </text>
            </g>
          );
        })}

        {/* Caption at very bottom */}
        <text
          x={W / 2}
          y={H - 10}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Many experts, few active per token: huge capacity, small per-token
          compute.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">send token:</span>
        {TOKENS.map((t, i) => (
          <button
            key={`tok${i}`}
            type="button"
            onClick={() => pick(i)}
            aria-pressed={tokenIdx === i}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              tokenIdx === i
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            {t.text}
          </button>
        ))}
        <button
          type="button"
          onClick={resetUsage}
          className="ml-2 rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset meter
        </button>
      </div>
    </div>
  );
}
