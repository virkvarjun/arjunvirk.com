"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Encoder reads three input words left to right, passing a hidden state
// rightward into a single bold "h_enc" box. The decoder is initialized from
// h_enc and generates three output words one token at a time.
const INPUT_WORDS = ["I", "like", "cats"] as const;
const OUTPUT_WORDS = ["J'aime", "les", "chats"] as const;

export function TfSeq2seq() {
  // How many decoder tokens have been generated (0..3).
  const [generated, setGenerated] = useState(0);
  // "Input length" 3..9 — longer input strains the single h_enc arrow.
  const [inputLen, setInputLen] = useState(3);

  // --- Layout ---
  const W = 720;
  const H = 300;

  const cellW = 64;
  const cellH = 46;
  const cellY = 96;
  const cellMid = cellY + cellH / 2;

  // Encoder cells (left half).
  const encX = [44, 132, 220];
  // h_enc box (center).
  const hEncX = 318;
  const hEncW = 84;
  const hEncMid = hEncX + hEncW / 2;
  // Decoder cells (right half).
  const decX = [452, 540, 628];

  // The squeeze: more input words crowd one fixed vector, so redden the
  // single h_enc arrow as inputLen grows (3 = calm, 9 = crushed).
  const strain = (inputLen - 3) / 6; // 0..1
  const arrowColor = strain <= 0 ? C.ink : C.coral;
  const arrowWidth = 2 + strain * 4;

  // Encoder hidden-state arrow between two x positions at cell mid height.
  const hArrow = (x1: number, x2: number, key: string) => (
    <g key={key}>
      <line x1={x1} y1={cellMid} x2={x2 - 7} y2={cellMid} stroke={C.ink} strokeWidth={2} />
      <polygon
        points={`${x2},${cellMid} ${x2 - 7},${cellMid - 4} ${x2 - 7},${cellMid + 4}`}
        fill={C.ink}
      />
    </g>
  );

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Seq2Seq encoder-decoder LSTM: an encoder compresses an input sentence into a single h_enc vector that the decoder reads to generate output tokens"
      >
        {/* Section headers */}
        <text x={132} y={32} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={C.muted}>
          encoder
        </text>
        <text x={hEncMid} y={32} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={C.coral}>
          bottleneck
        </text>
        <text x={540} y={32} fontSize={11} fontFamily={MONO} textAnchor="middle" fill={C.muted}>
          decoder
        </text>

        {/* --- Encoder hidden-state arrows between cells --- */}
        {hArrow(encX[0] + cellW, encX[1], "enc-h-0")}
        {hArrow(encX[1] + cellW, encX[2], "enc-h-1")}

        {/* --- Encoder cells + input word boxes --- */}
        {encX.map((x, i) => (
          <g key={`enc-${i}`}>
            <rect
              x={x}
              y={cellY}
              width={cellW}
              height={cellH}
              rx={6}
              fill={C.blueFill}
              stroke={C.blue}
              strokeWidth={1.4}
            />
            <text
              x={x + cellW / 2}
              y={cellMid + 4}
              fontSize={10}
              fontFamily={MONO}
              textAnchor="middle"
              fill={C.blue}
              fontWeight={600}
            >
              LSTM
            </text>
            {/* input word box below */}
            <rect
              x={x + 8}
              y={186}
              width={cellW - 16}
              height={26}
              rx={5}
              fill="var(--card)"
              stroke={C.line}
              strokeWidth={1.2}
            />
            <text
              x={x + cellW / 2}
              y={203}
              fontSize={11}
              fontFamily={MONO}
              textAnchor="middle"
              fill={C.ink}
            >
              {INPUT_WORDS[i]}
            </text>
            {/* word -> cell arrow */}
            <line x1={x + cellW / 2} y1={186} x2={x + cellW / 2} y2={cellY + cellH + 7} stroke={C.line} strokeWidth={1.4} />
            <polygon
              points={`${x + cellW / 2},${cellY + cellH} ${x + cellW / 2 - 4},${cellY + cellH + 7} ${x + cellW / 2 + 4},${cellY + cellH + 7}`}
              fill={C.line}
            />
          </g>
        ))}

        {/* --- The single h_enc arrow: encoder -> h_enc box --- */}
        {hArrow(encX[2] + cellW, hEncX, "enc-to-henc")}

        {/* h_enc box (bold, the whole sentence compressed) */}
        <rect
          x={hEncX}
          y={cellY - 4}
          width={hEncW}
          height={cellH + 8}
          rx={7}
          fill={strain > 0 ? C.coralFill : "var(--card)"}
          stroke={strain > 0 ? C.coral : C.ink}
          strokeWidth={2.4}
        />
        <text
          x={hEncMid}
          y={cellMid + 5}
          fontSize={13}
          fontFamily={MONO}
          textAnchor="middle"
          fill={strain > 0 ? C.coral : C.ink}
          fontWeight={700}
        >
          h_enc
        </text>
        {/* short label below the box (long explanation lives in caption) */}
        <text x={hEncMid} y={cellY + cellH + 22} fontSize={9} fontFamily={MONO} textAnchor="middle" fill={C.muted}>
          one fixed vector
        </text>

        {/* --- The single bottleneck arrow: h_enc -> decoder (reddens) --- */}
        <g>
          <line
            x1={hEncX + hEncW}
            y1={cellMid}
            x2={decX[0] - 8}
            y2={cellMid}
            stroke={arrowColor}
            strokeWidth={arrowWidth}
          />
          <polygon
            points={`${decX[0]},${cellMid} ${decX[0] - 9},${cellMid - 5} ${decX[0] - 9},${cellMid + 5}`}
            fill={arrowColor}
          />
          {/* squeeze badge sits above the arrow, clear of everything else */}
          <text
            x={(hEncX + hEncW + decX[0]) / 2}
            y={cellMid - 14}
            fontSize={9}
            fontFamily={MONO}
            textAnchor="middle"
            fill={strain > 0 ? C.coral : C.muted}
            fontWeight={strain > 0 ? 600 : 400}
          >
            {strain > 0 ? `squeeze ${inputLen}→1` : "h_enc"}
          </text>
        </g>

        {/* --- Decoder hidden-state arrows between cells --- */}
        {hArrow(decX[0] + cellW, decX[1], "dec-h-0")}
        {hArrow(decX[1] + cellW, decX[2], "dec-h-1")}

        {/* --- Decoder cells + generated word boxes (above) --- */}
        {decX.map((x, i) => {
          const done = i < generated;
          return (
            <g key={`dec-${i}`}>
              {/* generated word box ABOVE the cell */}
              <rect
                x={x + 8}
                y={52}
                width={cellW - 16}
                height={26}
                rx={5}
                fill={done ? C.greenFill : "var(--card)"}
                stroke={done ? C.green : C.line}
                strokeWidth={1.2}
              />
              <text
                x={x + cellW / 2}
                y={69}
                fontSize={11}
                fontFamily={MONO}
                textAnchor="middle"
                fill={done ? C.green : C.muted}
                fontWeight={done ? 600 : 400}
              >
                {done ? OUTPUT_WORDS[i] : "···"}
              </text>
              {/* cell -> word arrow (upward) */}
              <line x1={x + cellW / 2} y1={cellY} x2={x + cellW / 2} y2={78 + 7} stroke={done ? C.green : C.line} strokeWidth={1.4} />
              <polygon
                points={`${x + cellW / 2},${78} ${x + cellW / 2 - 4},${78 + 7} ${x + cellW / 2 + 4},${78 + 7}`}
                fill={done ? C.green : C.line}
              />
              {/* decoder cell */}
              <rect
                x={x}
                y={cellY}
                width={cellW}
                height={cellH}
                rx={6}
                fill={done ? C.greenFill : "var(--card)"}
                stroke={done ? C.green : C.line}
                strokeWidth={1.4}
              />
              <text
                x={x + cellW / 2}
                y={cellMid + 4}
                fontSize={10}
                fontFamily={MONO}
                textAnchor="middle"
                fill={done ? C.green : C.muted}
                fontWeight={600}
              >
                LSTM
              </text>
            </g>
          );
        })}

        {/* --- Caption band (own row, below the drawing) --- */}
        <line x1={12} y1={244} x2={W - 12} y2={244} stroke={C.line} strokeWidth={1} />
        <text x={12} y={262} fontSize={10} fontFamily={MONO} fill={C.ink}>
          h_enc = the entire input sentence compressed into one vector.
        </text>
        <text x={12} y={278} fontSize={10} fontFamily={MONO} fill={strain > 0 ? C.coral : C.muted}>
          Everything the decoder knows about the input has to fit there. That&apos;s the squeeze.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setGenerated((g) => Math.min(g + 1, OUTPUT_WORDS.length))}
          disabled={generated >= OUTPUT_WORDS.length}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)] disabled:opacity-40"
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => setGenerated(0)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <span style={{ color: C.muted, fontFamily: MONO }}>
          tokens: {generated}/{OUTPUT_WORDS.length}
        </span>

        <label className="flex items-center gap-2" style={{ color: C.muted, fontFamily: MONO }}>
          input length: {inputLen}
          <input
            type="range"
            min={3}
            max={9}
            step={1}
            value={inputLen}
            onChange={(e) => setInputLen(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
        </label>
        <span style={{ color: strain > 0 ? C.coral : C.muted, fontFamily: MONO }}>
          {strain > 0 ? "longer input → same vector → crushed" : "short input fits comfortably"}
        </span>
      </div>
    </div>
  );
}
