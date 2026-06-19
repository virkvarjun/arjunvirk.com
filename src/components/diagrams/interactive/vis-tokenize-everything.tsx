"use client";

import { useMemo, useState } from "react";
import { C, MONO } from "../frame";

// --- Modalities -----------------------------------------------------------
type ModalityId = "image" | "audio" | "video" | "text";

interface Modality {
  id: ModalityId;
  label: string; // short label for the source box
  encoder: string; // encoder name shown on the arrow
  tokenLabel: string; // tiny tag drawn on each produced token
  count: number; // how many tokens this modality contributes
  color: string;
  fill: string;
}

// Hard-coded, deterministic token contributions (no randomness).
const MODALITIES: Modality[] = [
  {
    id: "image",
    label: "image",
    encoder: "ViT",
    tokenLabel: "img",
    count: 4,
    color: C.blue,
    fill: C.blueFill,
  },
  {
    id: "audio",
    label: "audio",
    encoder: "audio enc",
    tokenLabel: "aud",
    count: 3,
    color: C.green,
    fill: C.greenFill,
  },
  {
    id: "video",
    label: "video",
    encoder: "ST enc",
    tokenLabel: "vid",
    count: 3,
    color: C.violet,
    fill: "var(--background)",
  },
  {
    id: "text",
    label: "text",
    encoder: "tokenizer",
    tokenLabel: "txt",
    count: 3,
    color: C.coral,
    fill: C.coralFill,
  },
];

const HIDDEN_DIM = 1024;

export function VisTokenizeEverything() {
  const [active, setActive] = useState<Record<ModalityId, boolean>>({
    image: true,
    audio: true,
    video: false,
    text: true,
  });
  const [hoverMerge, setHoverMerge] = useState<boolean>(false);

  const toggle = (id: ModalityId): void =>
    setActive((prev) => ({ ...prev, [id]: !prev[id] }));

  // --- Layout ---------------------------------------------------------------
  const W = 640;
  const H = 416;

  // Vertical bands
  const titleY = 22;
  const readoutY = 44; // readout line below title
  const diagramTop = 70; // top of the drawing area
  const captionY = H - 28; // first caption baseline (2nd line at +12)

  // Column x-anchors
  const srcX = 30; // source box left edge
  const srcW = 70;
  const encX = 140; // encoder label center
  const mergeX = 268; // x where the shared stream starts (left edge of stream)
  const streamW = 168; // width of the shared token stream area
  const llmX = 470; // LLM stack left edge
  const llmW = 96;
  const outX = 600; // output text x

  // Row geometry for the four modality lanes
  const laneTop = diagramTop + 18;
  const laneH = 56;
  const lanes = MODALITIES.map((m, i) => ({
    ...m,
    cy: laneTop + i * laneH + laneH / 2,
  }));

  // Center y of the whole stack of lanes (where the LLM + stream sit)
  const midY = laneTop + (MODALITIES.length * laneH) / 2;

  // Build the merged token sequence from active modalities, in lane order.
  const sequence = useMemo(() => {
    const out: { mod: Modality; idx: number }[] = [];
    for (const m of MODALITIES) {
      if (!active[m.id]) continue;
      for (let i = 0; i < m.count; i += 1) out.push({ mod: m, idx: i });
    }
    return out;
  }, [active]);

  const totalTokens = sequence.length;
  const activeCount = MODALITIES.filter((m) => active[m.id]).length;

  // Token chip geometry inside the shared stream (single row, wrap if needed).
  const tChipW = 22;
  const tChipH = 22;
  const tGap = 5;
  const streamLeft = mergeX;
  const perRow = Math.max(
    1,
    Math.floor((streamW + tGap) / (tChipW + tGap)),
  );
  const placed = sequence.map((s, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    return {
      ...s,
      x: streamLeft + col * (tChipW + tGap),
      row,
    };
  });
  const streamRows = Math.max(1, Math.ceil(totalTokens / perRow) || 1);
  const streamTotalH = streamRows * tChipH + (streamRows - 1) * tGap;
  const streamTop = midY - streamTotalH / 2;

  // LLM stack geometry
  const llmTop = laneTop + 4;
  const llmH = MODALITIES.length * laneH - 8;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Tokenize everything: image, audio, video and text encoders each emit tokens of one shared hidden dimension that merge into a single sequence entering one transformer LLM, which emits text"
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={titleY}
          fontSize={13}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          Tokenize Everything
        </text>

        {/* Readout band */}
        <text
          x={W / 2}
          y={readoutY}
          fontSize={10}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          {`${activeCount} modalities on  ->  ${totalTokens} tokens  ->  one LLM  (each token dim=${HIDDEN_DIM})`}
        </text>
        <line
          x1={12}
          y1={diagramTop - 8}
          x2={W - 12}
          y2={diagramTop - 8}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* Merge bracket / shared-stream container */}
        <rect
          x={streamLeft - 12}
          y={streamTop - 14}
          width={streamW + 24}
          height={streamTotalH + 28}
          rx={8}
          fill="var(--background)"
          stroke={hoverMerge ? C.ink : C.line}
          strokeWidth={hoverMerge ? 1.8 : 1.2}
        />
        <text
          x={streamLeft + streamW / 2}
          y={streamTop - 20}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          shared token stream
        </text>

        {/* Lanes: source -> encoder -> tokens flowing toward the merge */}
        {lanes.map((m) => {
          const on = active[m.id];
          const dim = on ? 1 : 0.32;
          return (
            <g key={m.id} opacity={dim}>
              {/* source box */}
              <rect
                x={srcX}
                y={m.cy - 14}
                width={srcW}
                height={28}
                rx={5}
                fill={m.fill}
                stroke={m.color}
                strokeWidth={1.4}
              />
              <text
                x={srcX + srcW / 2}
                y={m.cy + 4}
                fontSize={10}
                fontFamily={MONO}
                textAnchor="middle"
                fill={m.color}
                fontWeight={600}
              >
                {m.label}
              </text>

              {/* arrow source -> encoder */}
              <line
                x1={srcX + srcW}
                y1={m.cy}
                x2={encX - 30}
                y2={m.cy}
                stroke={on ? m.color : C.line}
                strokeWidth={1.4}
              />
              {/* encoder label */}
              <text
                x={encX}
                y={m.cy - 6}
                fontSize={9}
                fontFamily={MONO}
                textAnchor="middle"
                fill={on ? m.color : C.muted}
              >
                {m.encoder}
              </text>
              <text
                x={encX}
                y={m.cy + 8}
                fontSize={7.5}
                fontFamily={MONO}
                textAnchor="middle"
                fill={C.muted}
              >
                encoder
              </text>

              {/* curved flow from encoder toward the merge point */}
              <path
                d={`M ${encX + 32} ${m.cy} C ${mergeX - 60} ${m.cy}, ${
                  mergeX - 60
                } ${midY}, ${mergeX - 14} ${midY}`}
                fill="none"
                stroke={on ? m.color : C.line}
                strokeWidth={on ? 1.6 : 1}
                strokeDasharray={on ? undefined : "3 3"}
              />

              {/* a couple of sample tokens on the lane near the encoder */}
              {on &&
                Array.from({ length: Math.min(m.count, 3) }).map((_, k) => (
                  <rect
                    key={`lt-${m.id}-${k}`}
                    x={encX + 36 + k * 14}
                    y={m.cy - 7}
                    width={11}
                    height={14}
                    rx={2.5}
                    fill={m.fill}
                    stroke={m.color}
                    strokeWidth={1}
                  />
                ))}
            </g>
          );
        })}

        {/* Merged sequence chips inside the shared stream */}
        {placed.map((p, i) => {
          const y = streamTop + p.row * (tChipH + tGap);
          return (
            <g key={`tok-${i}`}>
              <rect
                x={p.x}
                y={y}
                width={tChipW}
                height={tChipH}
                rx={4}
                fill={p.mod.fill}
                stroke={p.mod.color}
                strokeWidth={1.3}
              />
              <text
                x={p.x + tChipW / 2}
                y={y + tChipH / 2 + 3.5}
                fontSize={7}
                fontFamily={MONO}
                textAnchor="middle"
                fill={p.mod.color}
                fontWeight={600}
              >
                {p.mod.tokenLabel}
              </text>
            </g>
          );
        })}
        {totalTokens === 0 && (
          <text
            x={streamLeft + streamW / 2}
            y={midY + 3}
            fontSize={9}
            fontFamily={MONO}
            textAnchor="middle"
            fill={C.muted}
          >
            no modalities on
          </text>
        )}

        {/* arrow: shared stream -> LLM */}
        <line
          x1={streamLeft + streamW + 14}
          y1={midY}
          x2={llmX - 10}
          y2={midY}
          stroke={C.ink}
          strokeWidth={1.8}
        />
        <polygon
          points={`${llmX - 10},${midY} ${llmX - 18},${midY - 4} ${
            llmX - 18
          },${midY + 4}`}
          fill={C.ink}
        />

        {/* LLM transformer stack */}
        <rect
          x={llmX}
          y={llmTop}
          width={llmW}
          height={llmH}
          rx={8}
          fill="var(--card)"
          stroke={C.ink}
          strokeWidth={1.6}
        />
        {Array.from({ length: 4 }).map((_, k) => {
          const bh = (llmH - 14) / 4;
          const by = llmTop + 7 + k * bh;
          return (
            <rect
              key={`blk-${k}`}
              x={llmX + 10}
              y={by + 3}
              width={llmW - 20}
              height={bh - 6}
              rx={4}
              fill="var(--background)"
              stroke={C.line}
              strokeWidth={1}
            />
          );
        })}
        <text
          x={llmX + llmW / 2}
          y={llmTop - 8}
          fontSize={10}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          LLM
        </text>
        <text
          x={llmX + llmW / 2}
          y={llmTop + llmH + 16}
          fontSize={8}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          transformer blocks
        </text>

        {/* arrow: LLM -> output text */}
        <line
          x1={llmX + llmW}
          y1={midY}
          x2={outX - 14}
          y2={midY}
          stroke={C.ink}
          strokeWidth={1.8}
        />
        <polygon
          points={`${outX - 6},${midY} ${outX - 14},${midY - 4} ${
            outX - 14
          },${midY + 4}`}
          fill={C.ink}
        />
        <text
          x={outX - 2}
          y={midY - 10}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="end"
          fill={C.ink}
          fontWeight={600}
        >
          text
        </text>
        <text
          x={outX - 2}
          y={midY + 16}
          fontSize={8}
          fontFamily={MONO}
          textAnchor="end"
          fill={C.muted}
        >
          out
        </text>

        {/* Hover note about the shared hidden dim (own clear band, above caption) */}
        {hoverMerge && (
          <>
            <text
              x={W / 2}
              y={captionY - 34}
              fontSize={9}
              fontFamily={MONO}
              textAnchor="middle"
              fill={C.ink}
            >
              {`all tokens share one hidden dim (${HIDDEN_DIM}),`}
            </text>
            <text
              x={W / 2}
              y={captionY - 22}
              fontSize={9}
              fontFamily={MONO}
              textAnchor="middle"
              fill={C.ink}
            >
              attention treats every token uniformly
            </text>
          </>
        )}

        {/* Hover hotspot over the merge container */}
        <rect
          x={streamLeft - 12}
          y={streamTop - 14}
          width={streamW + 24}
          height={streamTotalH + 28}
          fill="transparent"
          onMouseEnter={() => setHoverMerge(true)}
          onMouseLeave={() => setHoverMerge(false)}
          style={{ cursor: "help" }}
        />

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
          Any modality you can turn into tokens enters the same LLM,
        </text>
        <text
          x={W / 2}
          y={captionY + 12}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          attention reasons over all of them together.
        </text>
      </svg>

      {/* Controls row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {MODALITIES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              active[m.id]
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            {`${m.label} (${m.count})`}
          </button>
        ))}
        <span className="font-mono tabular-nums" style={{ color: C.muted }}>
          {`seq len: ${totalTokens}`}
        </span>
      </div>
    </div>
  );
}
