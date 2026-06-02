"use client";

import { useMemo, useState } from "react";
import { C, MONO } from "../frame";

// --- Strategies -----------------------------------------------------------
type Strategy = "word" | "char" | "subword";

const STRATEGIES: { id: Strategy; label: string; color: string; fill: string }[] = [
  { id: "word", label: "Word", color: C.blue, fill: C.blueFill },
  { id: "char", label: "Character", color: C.coral, fill: C.coralFill },
  { id: "subword", label: "Subword (BPE)", color: C.green, fill: C.greenFill },
];

// A tiny fixed BPE-style vocabulary: known "merges" the toy tokenizer prefers.
// Longest-match-first so "transform" beats "trans". Lowercased for matching.
const BPE_PIECES = [
  "transform",
  "power",
  "ers",
  "ful",
  "ing",
  "ness",
  "are",
  "the",
  "ation",
  "tion",
  "er",
  "ly",
  "ed",
  "es",
  "s",
];

// Deterministic token id in [100, 49999] from a piece string. No randomness so
// SSR and client render identically.
function tokenId(piece: string): number {
  let h = 0;
  for (let i = 0; i < piece.length; i += 1) {
    h = (h * 31 + piece.charCodeAt(i)) % 49900;
  }
  return 100 + h;
}

// Split a sentence into "words" + standalone punctuation, preserving order.
function splitWords(text: string): string[] {
  const out: string[] = [];
  const re = /[A-Za-z0-9]+|[^\sA-Za-z0-9]/g;
  const matches = text.match(re);
  if (matches) out.push(...matches);
  return out;
}

// Greedy longest-match subword split of a single word (letters/digits only).
function bpeWord(word: string): string[] {
  const lower = word.toLowerCase();
  const pieces: string[] = [];
  let i = 0;
  while (i < lower.length) {
    let matched = "";
    for (const p of BPE_PIECES) {
      if (p.length > matched.length && lower.startsWith(p, i)) matched = p;
    }
    if (matched) {
      // emit using original-case slice so the user sees their text
      pieces.push(word.slice(i, i + matched.length));
      i += matched.length;
    } else {
      pieces.push(word.slice(i, i + 1));
      i += 1;
    }
  }
  return pieces;
}

function tokenize(text: string, strategy: Strategy): string[] {
  if (strategy === "word") return splitWords(text);
  if (strategy === "char") {
    // Every non-space character is its own token.
    return Array.from(text).filter((c) => c !== " ");
  }
  // subword: words go through BPE, punctuation stays whole
  const out: string[] = [];
  for (const w of splitWords(text)) {
    if (/^[A-Za-z0-9]+$/.test(w)) out.push(...bpeWord(w));
    else out.push(w);
  }
  return out;
}

const MAX_TEXT = 40; // input cap so the SVG stays clean
const DEFAULT_TEXT = "Transformers are powerful!";

export function TfTokenization() {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [strategy, setStrategy] = useState<Strategy>("subword");

  const active = STRATEGIES.find((s) => s.id === strategy)!;

  // All three token lists (for the count comparison) + the active one to draw.
  const counts = useMemo(
    () => ({
      word: tokenize(text, "word").length,
      char: tokenize(text, "char").length,
      subword: tokenize(text, "subword").length,
    }),
    [text],
  );

  const tokens = useMemo(() => tokenize(text, strategy), [text, strategy]);

  // --- Layout ---------------------------------------------------------------
  const W = 460;

  // Vertical bands (top -> bottom)
  const titleY = 20;
  const sentenceY = 46; // the input sentence echoed at top
  const stratLabelY = 74; // which strategy is active
  const gridTop = 92; // first token row top edge

  // Token chip geometry
  const chipH = 26;
  const idH = 16; // gap below chip for the id text
  const rowH = chipH + idH + 16; // chip + id + spacing
  const padX = 18;
  const gridW = W - padX * 2;
  const gap = 6;

  // Greedy wrap of chips into rows, each chip width ~ token length.
  type Placed = { tok: string; x: number; y: number; w: number; row: number };
  const placed: Placed[] = [];
  const charPx = 6.4; // ~0.6em at font-size 11 (mono) plus a little
  let cx = padX;
  let row = 0;
  const minChipW = 16;
  const maxChips = 60; // hard cap on rendered chips to avoid runaway char rows
  let truncated = false;

  for (let i = 0; i < tokens.length; i += 1) {
    if (i >= maxChips) {
      truncated = true;
      break;
    }
    const tok = tokens[i];
    const display = tok === " " ? "·" : tok;
    const w = Math.max(minChipW, display.length * charPx + 12);
    if (cx + w > padX + gridW && cx > padX) {
      row += 1;
      cx = padX;
    }
    placed.push({ tok: display, x: cx, y: gridTop + row * rowH, w, row });
    cx += w + gap;
  }
  const rows = row + 1;

  const gridBottom = gridTop + rows * rowH - 16 + 6;

  // Comparison band + caption sit below the grid.
  const compY = gridBottom + 22;
  const captionY = compY + 30;
  const H = captionY + 22;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Tokenization: a sentence split into tokens under word, character, or subword strategies, each token mapped to a token ID"
      >
        {/* Title */}
        <text
          x={W / 2}
          y={titleY}
          fontSize={12}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          Tokenization
        </text>

        {/* Echoed input sentence */}
        <text
          x={W / 2}
          y={sentenceY}
          fontSize={11}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
        >
          {(() => {
            const s = text.trim() === "" ? "(type a sentence below)" : `"${text}"`;
            return s.length > 52 ? `${s.slice(0, 51)}…` : s;
          })()}
        </text>

        {/* Active strategy label */}
        <text
          x={W / 2}
          y={stratLabelY}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={active.color}
          fontWeight={600}
        >
          {`${active.label} → ${tokens.length} token${tokens.length === 1 ? "" : "s"}`}
        </text>

        {/* Token chips + ids */}
        {placed.map((p, i) => (
          <g key={`chip-${i}`}>
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={chipH}
              rx={5}
              fill={active.fill}
              stroke={active.color}
              strokeWidth={1.4}
            />
            <text
              x={p.x + p.w / 2}
              y={p.y + chipH / 2 + 4}
              fontSize={11}
              fontFamily={MONO}
              textAnchor="middle"
              fill={active.color}
              fontWeight={600}
            >
              {p.tok}
            </text>
            {/* token id beneath the chip */}
            <text
              x={p.x + p.w / 2}
              y={p.y + chipH + 12}
              fontSize={8}
              fontFamily={MONO}
              textAnchor="middle"
              fill={C.muted}
            >
              {tokenId(p.tok)}
            </text>
          </g>
        ))}

        {/* truncation hint if we capped the char-level overflow */}
        {truncated && (
          <text
            x={W / 2}
            y={gridBottom + 4}
            fontSize={8.5}
            fontFamily={MONO}
            textAnchor="middle"
            fill={C.muted}
          >
            … sequence continues (showing first {maxChips})
          </text>
        )}

        {/* Comparison band: token count per strategy (length tradeoff) */}
        <line
          x1={12}
          y1={compY - 14}
          x2={W - 12}
          y2={compY - 14}
          stroke={C.line}
          strokeWidth={1}
        />
        {STRATEGIES.map((s, i) => {
          const colW = (W - 24) / 3;
          const colCX = 12 + colW * i + colW / 2;
          const isActive = s.id === strategy;
          return (
            <g key={`cmp-${s.id}`}>
              <text
                x={colCX}
                y={compY}
                fontSize={9}
                fontFamily={MONO}
                textAnchor="middle"
                fill={isActive ? s.color : C.muted}
                fontWeight={isActive ? 600 : 400}
              >
                {s.label}
              </text>
              <text
                x={colCX}
                y={compY + 14}
                fontSize={11}
                fontFamily={MONO}
                textAnchor="middle"
                fill={isActive ? s.color : C.ink}
                fontWeight={600}
              >
                {`${counts[s.id]} tok`}
              </text>
            </g>
          );
        })}

        {/* Caption band */}
        <line
          x1={12}
          y1={captionY - 14}
          x2={W - 12}
          y2={captionY - 14}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={W / 2}
          y={captionY}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          Subword tokenization balances vocabulary size against sequence length.
        </text>
      </svg>

      {/* Controls row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {STRATEGIES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStrategy(s.id)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              strategy === s.id
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            {s.label}
          </button>
        ))}
        <label className="flex items-center gap-2 font-mono">
          <span style={{ color: C.muted }}>text</span>
          <input
            type="text"
            value={text}
            maxLength={MAX_TEXT}
            onChange={(e) => setText(e.target.value)}
            placeholder="type a sentence…"
            className="w-48 rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-mono text-[var(--foreground)]"
          />
        </label>
        <button
          type="button"
          onClick={() => setText(DEFAULT_TEXT)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
