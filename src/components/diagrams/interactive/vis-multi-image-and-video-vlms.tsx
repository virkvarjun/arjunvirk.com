"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// ---- Static config (deterministic; no random/date) ----

// Tokens produced per encoded image / frame (a sketch value).
const TOKENS_PER_IMAGE = 256;
// Spatiotemporal encoding shares/pools tokens across frames, so the marginal
// cost per extra frame is much smaller than re-encoding it independently.
const ST_BASE = 256; // first frame
const ST_PER_EXTRA = 48; // each additional frame adds only a few tokens

// Text prompt tokens that always sit in the sequence.
const TEXT_TOKENS = 24;

// A handful of distinct fill tints to color each image's token block.
const BLOCK_FILLS: string[] = [C.blueFill, C.coralFill, C.greenFill, "var(--card)"];
const BLOCK_STROKES: string[] = [C.blue, C.coral, C.green, C.violet];

type VideoMode = "sampling" | "spatiotemporal";

// ---- Geometry ----
const VW = 600;
const VH = 596;

export function VisMultiImageVideoVlms() {
  // Number of images (multi-image section) AND frames (video section).
  const [count, setCount] = useState<number>(3);
  const [mode, setMode] = useState<VideoMode>("sampling");

  const clamped = Math.max(1, Math.min(6, count));

  // Token budgets.
  const samplingTokens = clamped * TOKENS_PER_IMAGE + TEXT_TOKENS;
  const stTokens = ST_BASE + (clamped - 1) * ST_PER_EXTRA + TEXT_TOKENS;
  const videoTokens = mode === "sampling" ? samplingTokens : stTokens;

  // ---- Multi-image row geometry ----
  const imgY = 70;
  const imgH = 42;
  const seqY = 138;
  const seqH = 26;

  // Lay out up to `clamped` images across a fixed band.
  const bandX = 18;
  const bandW = VW - 36;
  const gap = 10;
  const cellW = Math.min(72, (bandW - gap * (clamped - 1)) / clamped);
  const totalW = cellW * clamped + gap * (clamped - 1);
  const startX = bandX + (bandW - totalW) / 2;

  // ---- Token sequence (concatenated) geometry ----
  // We draw small token cells per image group, plus a text group at the end.
  const seqStartX = 18;
  const seqEndX = VW - 18;
  const seqAvail = seqEndX - seqStartX;
  // groups: one per image + one text group
  const groupGap = 6;
  const markerW = 8; // image-start / image-end marker
  const groups = clamped + 1; // + text
  const groupAvail = (seqAvail - groupGap * (groups - 1)) / groups;
  const tokenCellW = 5;

  // ---- Bar-chart compare geometry (video section) ----
  const chartX = 332;
  const chartTop = 372;
  const chartH = 120;
  const maxTokens = 6 * TOKENS_PER_IMAGE + TEXT_TOKENS; // upper bound for scale
  const barW = 54;
  const samplingBarH = (samplingTokens / maxTokens) * chartH;
  const stBarH = (stTokens / maxTokens) * chartH;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Multi-image and video VLMs: each image or frame becomes a block of visual tokens concatenated into one LLM sequence; frame sampling makes the token count explode while spatiotemporal encoding stays flatter"
      >
        {/* ===== Title band ===== */}
        <text
          x={VW / 2}
          y={26}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Multi-Image and Video VLMs
        </text>

        {/* ===== Token-count readout band ===== */}
        <text
          x={VW / 2}
          y={46}
          fontFamily={MONO}
          fontSize={10.5}
          fill={C.muted}
          textAnchor="middle"
        >
          {`${clamped} ${clamped === 1 ? "image/frame" : "images/frames"} x ${TOKENS_PER_IMAGE} tokens + ${TEXT_TOKENS} text`}
        </text>

        {/* ============ SECTION 1: MULTI-IMAGE ============ */}
        <text x={18} y={64} fontFamily={MONO} fontSize={11} fill={C.ink} fontWeight={600}>
          Multi-image
        </text>

        {/* images */}
        {Array.from({ length: clamped }).map((_, i: number) => {
          const x = startX + i * (cellW + gap);
          const stroke = BLOCK_STROKES[i % BLOCK_STROKES.length];
          const fill = BLOCK_FILLS[i % BLOCK_FILLS.length];
          return (
            <g key={`img-${i}`}>
              <rect
                x={x}
                y={imgY}
                width={cellW}
                height={imgH}
                rx={4}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.4}
              />
              <text
                x={x + cellW / 2}
                y={imgY + imgH / 2 + 3.5}
                fontFamily={MONO}
                fontSize={10}
                fill={C.ink}
                textAnchor="middle"
              >
                {`img ${i + 1}`}
              </text>
              {/* encode arrow down to the sequence */}
              <line
                x1={x + cellW / 2}
                y1={imgY + imgH + 2}
                x2={x + cellW / 2}
                y2={seqY - 4}
                stroke={stroke}
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.6}
              />
            </g>
          );
        })}

        {/* concatenated LLM sequence */}
        <text x={18} y={seqY - 8} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          concatenated LLM token sequence
        </text>
        <rect
          x={seqStartX - 2}
          y={seqY - 2}
          width={seqAvail + 4}
          height={seqH + 4}
          rx={4}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />
        {Array.from({ length: clamped }).map((_, i: number) => {
          const gx = seqStartX + i * (groupAvail + groupGap);
          const stroke = BLOCK_STROKES[i % BLOCK_STROKES.length];
          const fill = BLOCK_FILLS[i % BLOCK_FILLS.length];
          // number of little token cells to draw inside this group
          const innerW = groupAvail - 2 * markerW - 4;
          const nCells = Math.max(1, Math.floor(innerW / (tokenCellW + 1)));
          return (
            <g key={`grp-${i}`}>
              {/* image-start marker */}
              <rect
                x={gx}
                y={seqY + 3}
                width={markerW}
                height={seqH - 6}
                rx={1.5}
                fill={stroke}
                opacity={0.85}
              />
              {/* token cells */}
              {Array.from({ length: nCells }).map((__, k: number) => (
                <rect
                  key={k}
                  x={gx + markerW + 2 + k * (tokenCellW + 1)}
                  y={seqY + 4}
                  width={tokenCellW}
                  height={seqH - 8}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={0.5}
                />
              ))}
              {/* image-end marker */}
              <rect
                x={gx + groupAvail - markerW}
                y={seqY + 3}
                width={markerW}
                height={seqH - 6}
                rx={1.5}
                fill={stroke}
                opacity={0.85}
              />
            </g>
          );
        })}
        {/* text group at the end */}
        {(() => {
          const gx = seqStartX + clamped * (groupAvail + groupGap);
          const innerW = groupAvail - 4;
          const nCells = Math.max(1, Math.floor(innerW / (tokenCellW + 1)));
          return (
            <g>
              {Array.from({ length: Math.min(nCells, 6) }).map((_, k: number) => (
                <rect
                  key={`txt-${k}`}
                  x={gx + 2 + k * (tokenCellW + 1)}
                  y={seqY + 4}
                  width={tokenCellW}
                  height={seqH - 8}
                  fill={C.grid}
                  stroke={C.muted}
                  strokeWidth={0.5}
                />
              ))}
              <text
                x={gx + groupAvail / 2}
                y={seqY + seqH + 14}
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.muted}
                textAnchor="middle"
              >
                text
              </text>
            </g>
          );
        })()}

        {/* marker legend */}
        <text x={18} y={seqY + seqH + 18} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          colored bars = image-start / image-end markers
        </text>

        {/* arrow into shared LLM */}
        <line
          x1={VW / 2}
          y1={seqY + seqH + 26}
          x2={VW / 2}
          y2={seqY + seqH + 40}
          stroke={C.line}
          strokeWidth={1.2}
        />
        <polygon
          points={`${VW / 2},${seqY + seqH + 44} ${VW / 2 - 4},${seqY + seqH + 38} ${VW / 2 + 4},${seqY + seqH + 38}`}
          fill={C.line}
        />
        <rect
          x={VW / 2 - 70}
          y={seqY + seqH + 46}
          width={140}
          height={24}
          rx={5}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.4}
        />
        <text
          x={VW / 2}
          y={seqY + seqH + 62}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
        >
          shared LLM (compares all)
        </text>

        {/* ===== divider ===== */}
        <line x1={18} y1={266} x2={VW - 18} y2={266} stroke={C.line} strokeWidth={1} strokeDasharray="4 3" />

        {/* ============ SECTION 2: VIDEO ============ */}
        <text x={18} y={286} fontFamily={MONO} fontSize={11} fill={C.ink} fontWeight={600}>
          Video
        </text>
        <text x={70} y={286} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          {mode === "sampling" ? "frame sampling (simple, many tokens)" : "spatiotemporal (one encoder, fewer tokens)"}
        </text>

        {/* video frame strip (left) */}
        {(() => {
          const fY = 300;
          const fH = 34;
          const fBandX = 18;
          const fBandW = 296;
          const fGap = 6;
          const fW = Math.min(44, (fBandW - fGap * (clamped - 1)) / clamped);
          return (
            <g>
              {Array.from({ length: clamped }).map((_, i: number) => {
                const x = fBandX + i * (fW + fGap);
                // For spatiotemporal we visually downsample redundant middle frames.
                const isKey = i === 0 || i === clamped - 1;
                const redundant = mode === "spatiotemporal" && !isKey;
                return (
                  <g key={`frame-${i}`}>
                    <rect
                      x={x}
                      y={fY}
                      width={fW}
                      height={fH}
                      rx={3}
                      fill={redundant ? C.grid : C.greenFill}
                      stroke={redundant ? C.muted : C.green}
                      strokeWidth={1.2}
                      opacity={redundant ? 0.7 : 1}
                    />
                    <text
                      x={x + fW / 2}
                      y={fY + fH / 2 + 3.5}
                      fontFamily={MONO}
                      fontSize={9}
                      fill={redundant ? C.muted : C.ink}
                      textAnchor="middle"
                    >
                      {`f${i + 1}`}
                    </text>
                  </g>
                );
              })}
              {/* strip caption */}
              <text x={fBandX} y={fY + fH + 16} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
                {mode === "spatiotemporal"
                  ? "keep key frames detailed, downsample redundant"
                  : "every sampled frame encoded independently"}
              </text>
            </g>
          );
        })()}

        {/* encoder box -> tokens */}
        {(() => {
          const eY = 368;
          return (
            <g>
              <rect
                x={18}
                y={eY}
                width={120}
                height={26}
                rx={5}
                fill={mode === "sampling" ? C.coralFill : C.greenFill}
                stroke={mode === "sampling" ? C.coral : C.green}
                strokeWidth={1.4}
              />
              <text
                x={78}
                y={eY + 17}
                fontFamily={MONO}
                fontSize={9.5}
                fill={C.ink}
                textAnchor="middle"
              >
                {mode === "sampling" ? "per-frame encoder" : "space-time encoder"}
              </text>
              <line x1={138} y1={eY + 13} x2={170} y2={eY + 13} stroke={C.line} strokeWidth={1.2} />
              <polygon
                points={`${174},${eY + 13} ${168},${eY + 9} ${168},${eY + 17}`}
                fill={C.line}
              />
              <text
                x={178}
                y={eY + 2}
                fontFamily={MONO}
                fontSize={9}
                fill={C.muted}
              >
                {mode === "sampling" ? "tokens grow" : "tokens pooled"}
              </text>
              <text
                x={178}
                y={eY + 16}
                fontFamily={MONO}
                fontSize={9}
                fill={C.muted}
              >
                {mode === "sampling" ? "per frame" : "across space+time"}
              </text>
            </g>
          );
        })()}

        {/* ===== token-budget bar chart (compare both approaches) ===== */}
        <text x={chartX} y={chartTop - 8} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          token budget vs #frames
        </text>
        {/* baseline */}
        <line
          x1={chartX}
          y1={chartTop + chartH}
          x2={chartX + 250}
          y2={chartTop + chartH}
          stroke={C.line}
          strokeWidth={1}
        />
        {/* sampling bar */}
        <rect
          x={chartX + 24}
          y={chartTop + chartH - samplingBarH}
          width={barW}
          height={samplingBarH}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.4}
        />
        <text
          x={chartX + 24 + barW / 2}
          y={chartTop + chartH - samplingBarH - 6}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.coral}
          textAnchor="middle"
        >
          {samplingTokens}
        </text>
        <text
          x={chartX + 24 + barW / 2}
          y={chartTop + chartH + 14}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          sampling
        </text>
        {/* spatiotemporal bar */}
        <rect
          x={chartX + 24 + barW + 40}
          y={chartTop + chartH - stBarH}
          width={barW}
          height={stBarH}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1.4}
        />
        <text
          x={chartX + 24 + barW + 40 + barW / 2}
          y={chartTop + chartH - stBarH - 6}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.green}
          textAnchor="middle"
        >
          {stTokens}
        </text>
        <text
          x={chartX + 24 + barW + 40 + barW / 2}
          y={chartTop + chartH + 14}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          space-time
        </text>

        {/* active-mode marker on chart */}
        <text
          x={chartX}
          y={chartTop + chartH + 32}
          fontFamily={MONO}
          fontSize={9}
          fill={mode === "sampling" ? C.coral : C.green}
        >
          {`active: ${mode === "sampling" ? "frame sampling" : "spatiotemporal"} = ${videoTokens} tokens`}
        </text>

        {/* ===== Caption band (bottom, split to fit width) ===== */}
        <text
          x={VW / 2}
          y={VH - 28}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Concatenate per-image tokens for multi-image; sample frames or encode
        </text>
        <text
          x={VW / 2}
          y={VH - 14}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          space-time for video - same LLM underneath.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
          frames
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={clamped}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCount(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{clamped}</span>
        </label>
        <button
          type="button"
          onClick={() => setMode("sampling")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={mode === "sampling" ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          frame sampling
        </button>
        <button
          type="button"
          onClick={() => setMode("spatiotemporal")}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={mode === "spatiotemporal" ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          spatiotemporal
        </button>
        <span className="font-mono text-[var(--muted)]">
          {`${videoTokens} video tokens`}
        </span>
      </div>
    </div>
  );
}
