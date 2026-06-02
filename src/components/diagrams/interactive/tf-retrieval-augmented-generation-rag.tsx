"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// ---- Static data (deterministic; no random/date at module load) ----

// Each query carries a 4-dim "embedding" so we can score it against the store.
interface Query {
  label: string;
  vec: number[]; // 4-dim, values in [0,1]
}

const QUERIES: Query[] = [
  { label: "How do plants make food?", vec: [0.9, 0.2, 0.1, 0.3] },
  { label: "Why is the sky blue?", vec: [0.2, 0.9, 0.3, 0.1] },
  { label: "What powers a rocket?", vec: [0.1, 0.2, 0.9, 0.4] },
];

// Document chunks in the vector store. Each has a 4-dim embedding and a short
// text snippet. Similarity is computed against the active query at render time.
interface Chunk {
  id: string;
  text: string;
  vec: number[];
}

const CHUNKS: Chunk[] = [
  { id: "d1", text: "Photosynthesis turns light into sugar", vec: [0.92, 0.18, 0.12, 0.25] },
  { id: "d2", text: "Chlorophyll absorbs sunlight in leaves", vec: [0.80, 0.30, 0.10, 0.40] },
  { id: "d3", text: "Rayleigh scattering bends blue light", vec: [0.20, 0.88, 0.25, 0.15] },
  { id: "d4", text: "Rockets burn fuel for thrust", vec: [0.15, 0.22, 0.90, 0.35] },
  { id: "d5", text: "Tax forms are due in April", vec: [0.10, 0.10, 0.15, 0.92] },
];

// Cosine similarity between two equal-length vectors, in [0,1] here since
// all components are non-negative.
function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ---- Geometry ----
const W = 600;
const H = 470;

// Query box (left).
const Q_X = 20;
const Q_Y = 70;
const Q_W = 150;
const Q_H = 44;

// Embedding vector (left-center, below query).
const VEC_X = 60;
const VEC_Y = 150;
const VCELL = 22;

// Document store (center).
const STORE_X = 222;
const STORE_Y = 64;
const ROW_H = 30;
const ROW_W = 188;
const ROW_GAP = 8;

// Prompt box (right).
const P_X = 452;
const P_Y = 64;
const P_W = 128;

// LLM box (right, bottom).
const LLM_X = 452;
const LLM_Y = 348;
const LLM_W = 128;
const LLM_H = 44;

export function TfRag() {
  const [queryIdx, setQueryIdx] = useState<number>(0);
  const [topK, setTopK] = useState<number>(2);
  const [rerank, setRerank] = useState<boolean>(false);

  const query: Query = QUERIES[queryIdx];

  // Score every chunk against the query embedding.
  interface Scored extends Chunk {
    score: number; // base cosine similarity
    rank: number; // rank after (optional) rerank, 0-based; -1 if not retrieved
    final: number; // displayed score (reranked nudges true matches up)
  }

  const baseScored = CHUNKS.map((ch: Chunk): { ch: Chunk; score: number } => ({
    ch,
    score: cosine(query.vec, ch.vec),
  }));

  // Sort by base similarity descending to get retrieval order.
  const order = [...baseScored].sort((a, b) => b.score - a.score);

  // "Rerank" simulates a cross-encoder: it sharpens the gap so the single best
  // chunk is pushed clearly above the rest (deterministic, no randomness).
  const scored: Scored[] = CHUNKS.map((ch: Chunk): Scored => {
    const base = cosine(query.vec, ch.vec);
    const orderRank = order.findIndex((o) => o.ch.id === ch.id);
    const retrieved = orderRank < topK;
    const final = rerank && retrieved ? Math.min(0.99, base + (orderRank === 0 ? 0.06 : -0.04)) : base;
    return { ...ch, score: base, rank: retrieved ? orderRank : -1, final };
  });

  // Chunks that make it into the prompt, in (possibly reranked) display order.
  const retrieved: Scored[] = scored
    .filter((s) => s.rank >= 0)
    .sort((a, b) => (rerank ? b.final - a.final : a.rank - b.rank));

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Retrieval-augmented generation: a query is embedded, matched against document chunks by similarity, the top-k chunks are retrieved and inserted into the prompt, and the LLM answers grounded in them"
      >
        {/* ---- Title band ---- */}
        <text
          x={W / 2}
          y={26}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Retrieval-Augmented Generation (RAG)
        </text>
        <text
          x={W / 2}
          y={44}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          query &#8594; embed &#8594; retrieve top-k &#8594; insert into prompt &#8594; generate
        </text>

        {/* ============ REGION 1: query (left) ============ */}
        <text
          x={Q_X + Q_W / 2}
          y={Q_Y - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          1. query
        </text>
        <rect
          x={Q_X}
          y={Q_Y}
          width={Q_W}
          height={Q_H}
          rx={5}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        {/* Query text wrapped onto up to two centered lines. */}
        {wrapText(query.label, 20).map((ln: string, i: number, arr: string[]) => (
          <text
            key={i}
            x={Q_X + Q_W / 2}
            y={Q_Y + Q_H / 2 + 4 - (arr.length - 1) * 7 + i * 14}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.ink}
            textAnchor="middle"
          >
            {ln}
          </text>
        ))}

        {/* ---- encoder arrow query -> vector ---- */}
        <line
          x1={Q_X + Q_W / 2}
          y1={Q_Y + Q_H}
          x2={Q_X + Q_W / 2}
          y2={VEC_Y - 22}
          stroke={C.muted}
          strokeWidth={1.2}
        />
        <text
          x={Q_X + Q_W / 2 + 6}
          y={VEC_Y - 28}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="start"
        >
          encoder
        </text>
        <polygon
          points={`${Q_X + Q_W / 2},${VEC_Y - 14} ${Q_X + Q_W / 2 - 4},${VEC_Y - 21} ${Q_X + Q_W / 2 + 4},${VEC_Y - 21}`}
          fill={C.muted}
        />

        {/* ============ REGION 2: query embedding vector ============ */}
        <text
          x={VEC_X + (query.vec.length * VCELL) / 2}
          y={VEC_Y - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          2. embedding
        </text>
        {query.vec.map((v: number, i: number) => (
          <g key={i}>
            <rect
              x={VEC_X + i * VCELL}
              y={VEC_Y}
              width={VCELL}
              height={VCELL}
              fill={C.blueFill}
              stroke={C.blue}
              strokeWidth={1}
            />
            <text
              x={VEC_X + i * VCELL + VCELL / 2}
              y={VEC_Y + VCELL / 2 + 3.5}
              fontFamily={MONO}
              fontSize={9}
              fill={C.ink}
              textAnchor="middle"
            >
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* ---- arrow vector -> store (vector search) ---- */}
        <line
          x1={VEC_X + query.vec.length * VCELL + 4}
          y1={VEC_Y + VCELL / 2}
          x2={STORE_X - 10}
          y2={VEC_Y + VCELL / 2}
          stroke={C.coral}
          strokeWidth={1.4}
        />
        <polygon
          points={`${STORE_X - 10},${VEC_Y + VCELL / 2} ${STORE_X - 17},${VEC_Y + VCELL / 2 - 4} ${STORE_X - 17},${VEC_Y + VCELL / 2 + 4}`}
          fill={C.coral}
        />
        <text
          x={(VEC_X + query.vec.length * VCELL + STORE_X) / 2}
          y={VEC_Y + VCELL / 2 - 8}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.coral}
          textAnchor="middle"
        >
          search
        </text>

        {/* ============ REGION 3: document store (center) ============ */}
        <text
          x={STORE_X + ROW_W / 2}
          y={STORE_Y - 10}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          3. vector store (similarity)
        </text>
        {scored.map((s: Scored, i: number) => {
          const y = STORE_Y + i * (ROW_H + ROW_GAP);
          const retrievedRow = s.rank >= 0;
          return (
            <g key={s.id}>
              <rect
                x={STORE_X}
                y={y}
                width={ROW_W}
                height={ROW_H}
                rx={4}
                fill={retrievedRow ? C.coralFill : "var(--card)"}
                stroke={retrievedRow ? C.coral : C.line}
                strokeWidth={retrievedRow ? 1.6 : 1}
              />
              {/* chunk text */}
              <text
                x={STORE_X + 8}
                y={y + ROW_H / 2 + 3.5}
                fontFamily={MONO}
                fontSize={8.5}
                fill={retrievedRow ? C.ink : C.muted}
                textAnchor="start"
              >
                {truncate(s.text, 28)}
              </text>
              {/* similarity score chip on the right edge */}
              <text
                x={STORE_X + ROW_W - 8}
                y={y + ROW_H / 2 + 3.5}
                fontFamily={MONO}
                fontSize={9}
                fill={retrievedRow ? C.coral : C.muted}
                textAnchor="end"
              >
                {(rerank && retrievedRow ? s.final : s.score).toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* ---- optional rerank annotation ---- */}
        {rerank && (
          <text
            x={STORE_X + ROW_W / 2}
            y={STORE_Y + CHUNKS.length * (ROW_H + ROW_GAP) + 4}
            fontFamily={MONO}
            fontSize={8.5}
            fill={C.violet}
            textAnchor="middle"
          >
            cross-encoder reranked top-{topK}
          </text>
        )}

        {/* ---- arrow store -> prompt ---- */}
        <line
          x1={STORE_X + ROW_W + 4}
          y1={P_Y + 30}
          x2={P_X - 10}
          y2={P_Y + 30}
          stroke={C.green}
          strokeWidth={1.4}
        />
        <polygon
          points={`${P_X - 10},${P_Y + 30} ${P_X - 17},${P_Y + 26} ${P_X - 17},${P_Y + 34}`}
          fill={C.green}
        />
        <text
          x={(STORE_X + ROW_W + P_X) / 2}
          y={P_Y + 22}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.green}
          textAnchor="middle"
        >
          top-{topK}
        </text>

        {/* ============ REGION 4: assembled prompt (right) ============ */}
        <text
          x={P_X + P_W / 2}
          y={P_Y - 10}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          4. prompt
        </text>
        {(() => {
          // Prompt rows: a context header, one line per retrieved chunk, then
          // the question. Each row is 22px tall.
          const rows: { text: string; kind: "ctx" | "chunk" | "q" }[] = [
            { text: "Context:", kind: "ctx" },
            ...retrieved.map((s) => ({ text: `• ${truncate(s.text, 16)}`, kind: "chunk" as const })),
            { text: `Q: ${truncate(query.label, 14)}`, kind: "q" },
          ];
          const padTop = 10;
          const rowH = 22;
          const boxH = padTop * 2 + rows.length * rowH;
          return (
            <g>
              <rect
                x={P_X}
                y={P_Y}
                width={P_W}
                height={boxH}
                rx={5}
                fill="var(--card)"
                stroke={C.green}
                strokeWidth={1.4}
              />
              {rows.map((r, i: number) => (
                <text
                  key={i}
                  x={P_X + 8}
                  y={P_Y + padTop + rowH / 2 + 3 + i * rowH}
                  fontFamily={MONO}
                  fontSize={8.5}
                  fill={r.kind === "chunk" ? C.coral : r.kind === "q" ? C.blue : C.muted}
                  textAnchor="start"
                >
                  {r.text}
                </text>
              ))}
              {/* arrow prompt -> LLM */}
              <line
                x1={P_X + P_W / 2}
                y1={P_Y + boxH}
                x2={P_X + P_W / 2}
                y2={LLM_Y - 8}
                stroke={C.muted}
                strokeWidth={1.2}
              />
              <polygon
                points={`${P_X + P_W / 2},${LLM_Y - 4} ${P_X + P_W / 2 - 4},${LLM_Y - 11} ${P_X + P_W / 2 + 4},${LLM_Y - 11}`}
                fill={C.muted}
              />
            </g>
          );
        })()}

        {/* ============ REGION 5: LLM (bottom right) ============ */}
        <rect
          x={LLM_X}
          y={LLM_Y}
          width={LLM_W}
          height={LLM_H}
          rx={5}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <text
          x={LLM_X + LLM_W / 2}
          y={LLM_Y + 17}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
          fontWeight={600}
        >
          5. LLM
        </text>
        <text
          x={LLM_X + LLM_W / 2}
          y={LLM_Y + 33}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          grounded answer
        </text>

        {/* ============ Caption band (bottom) ============ */}
        <text
          x={W / 2}
          y={H - 14}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Retrieve relevant text first, then answer grounded in it &#8212; no retraining needed.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {QUERIES.map((q: Query, i: number) => (
          <button
            key={q.label}
            type="button"
            onClick={() => setQueryIdx(i)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={queryIdx === i ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {truncate(q.label, 18)}
          </button>
        ))}
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          top-k
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{topK}</span>
        </label>
        <button
          type="button"
          onClick={() => setRerank((r: boolean) => !r)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={rerank ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          rerank: {rerank ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}

// ---- text helpers (pure, deterministic) ----

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// Greedy word wrap into lines of at most `max` characters.
function wrapText(s: string, max: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}
