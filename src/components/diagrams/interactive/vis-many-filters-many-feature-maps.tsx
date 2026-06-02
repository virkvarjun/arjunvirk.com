"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// --- Geometry (viewBox W x H) ---
const W = 640;
const H = 470;

// Bands.
const TITLE_Y = 26;
const SUBTITLE_Y = 44;
const DRAW_TOP = 76; // top of the main drawing
const DRAW_BOT = 336; // bottom of the main drawing
const READOUT_Y = 372; // own band for the per-channel readout
const THUMB_Y = 392; // thumbnail row inside readout band
const CAPTION_Y = H - 16;

// Input volume (left): a (3,224,224) deck of 3 colored slices.
const IN_X = 30; // left edge of front-most slice
const IN_Y = 150;
const IN_SLICE_W = 64;
const IN_SLICE_H = 80;
const IN_DX = 9; // per-slice offset for the deck
const IN_DY = 9;
const IN_SLICES = 3;

// Filter deck (middle): a stack of small (3,3,3) cubes.
const FILT_CX = 268; // center x of the front filter cube
const FILT_CY = (DRAW_TOP + DRAW_BOT) / 2 - 6;
const FILT_W = 40;
const FILT_DECK_DX = 4;
const FILT_DECK_DY = 4;

// Output volume (right): a stack of K feature-map slices.
const OUT_X = 470; // left edge of the deepest (back) slice
const OUT_TOP_Y = 110; // y of the front-most (channel 0) slice
const OUT_SLICE_W = 70;
const OUT_SLICE_H = 70;
const OUT_DX = 1.7; // per-channel horizontal offset
const OUT_DY = 1.7; // per-channel vertical offset

// Layer presets for the "depth over layers" toggle: each layer deepens the
// channel count while spatial size shrinks. Index 0 is the input layer.
type Layer = { in: number; out: number; spatial: number };
const LAYERS: Layer[] = [
  { in: 3, out: 64, spatial: 224 },
  { in: 64, out: 128, spatial: 112 },
  { in: 128, out: 256, spatial: 56 },
];

// Per-channel "what it detects" thumbnail kinds, cycled across channels.
type Kind = "edge" | "blob" | "texture";
const KINDS: Kind[] = ["edge", "blob", "texture"];
function kindOf(channel: number): Kind {
  return KINDS[channel % KINDS.length];
}
function kindLabel(k: Kind): string {
  if (k === "edge") return "edge";
  if (k === "blob") return "blob";
  return "texture";
}

// Draw a tiny 22x22 thumbnail of what a channel detects.
function Thumb({ x, y, kind }: { x: number; y: number; kind: Kind }) {
  const s = 22;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={s}
        height={s}
        rx={2}
        fill="var(--card)"
        stroke={C.coral}
        strokeWidth={1.2}
      />
      {kind === "edge" && (
        <line
          x1={x + 4}
          y1={y + s - 4}
          x2={x + s - 4}
          y2={y + 4}
          stroke={C.coral}
          strokeWidth={2.2}
        />
      )}
      {kind === "blob" && (
        <circle cx={x + s / 2} cy={y + s / 2} r={6} fill={C.coral} />
      )}
      {kind === "texture" && (
        <g stroke={C.coral} strokeWidth={1.4}>
          <line x1={x + 4} y1={y + 6} x2={x + s - 4} y2={y + 6} />
          <line x1={x + 4} y1={y + 11} x2={x + s - 4} y2={y + 11} />
          <line x1={x + 4} y1={y + 16} x2={x + s - 4} y2={y + 16} />
        </g>
      )}
    </g>
  );
}

export function VisManyFilters() {
  const [filters, setFilters] = useState<number>(64);
  const [hovered, setHovered] = useState<number | null>(null);
  const [layer, setLayer] = useState<number>(0);

  const preset = LAYERS[layer];
  // In layer mode the output depth is fixed by the preset; otherwise it follows
  // the slider. The number of output channels equals the number of filters.
  const K = layer === 0 ? filters : preset.out;
  const inChannels = preset.in;
  const spatial = preset.spatial;

  // How many feature-map slices we actually draw (cap for readability; the
  // numeric labels still report the true K).
  const drawn = Math.min(K, 48);

  // Visible slices are drawn back-to-front so channel 0 sits on top/front.
  const sliceIndices: number[] = [];
  for (let i = drawn - 1; i >= 0; i--) sliceIndices.push(i);

  // Currently spotlighted channel (clamped into range).
  const spot =
    hovered !== null && hovered < drawn ? hovered : null;

  // x/y of a given output slice's top-left.
  const sliceX = (i: number): number => OUT_X + (drawn - 1 - i) * OUT_DX;
  const sliceY = (i: number): number => OUT_TOP_Y + i * OUT_DY;

  // Filter deck visuals: number of cube layers to suggest the stack depth.
  const deckLayers = 4;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Many filters make many feature maps. An input volume of in-channels is convolved by K filters in parallel; each filter produces one output channel, so the output volume has K feature-map slices. Hovering a filter highlights the single output channel it produces and shows whether that channel detects an edge, blob, or texture. A slider controls K, and a layer toggle steps through depths 3, 64, 128, 256 as spatial size shrinks."
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
          Many Filters {"->"} Many Feature Maps
        </text>
        <text
          x={W / 2}
          y={SUBTITLE_Y}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          {`K filters in parallel  ->  K output channels`}
        </text>

        {/* ===== Input volume (left) ===== */}
        <text
          x={IN_X + (IN_SLICE_W + (IN_SLICES - 1) * IN_DX) / 2}
          y={DRAW_TOP + 4}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          input
        </text>
        {/* deck of input slices, back-to-front */}
        {Array.from({ length: IN_SLICES }, (_, i) => IN_SLICES - 1 - i).map(
          (i: number) => {
            const fills = [C.coralFill, C.greenFill, C.blueFill];
            const strokes = [C.coral, C.green, C.blue];
            return (
              <rect
                key={`in${i}`}
                x={IN_X + i * IN_DX}
                y={IN_Y - i * IN_DY}
                width={IN_SLICE_W}
                height={IN_SLICE_H}
                rx={4}
                fill={fills[i % 3]}
                stroke={strokes[i % 3]}
                strokeWidth={1.4}
              />
            );
          },
        )}
        <text
          x={IN_X + IN_SLICE_W / 2 + IN_DX}
          y={IN_Y + IN_SLICE_H + 18}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
          fontWeight={600}
        >
          {`(${inChannels}, ${spatial}, ${spatial})`}
        </text>
        <text
          x={IN_X + IN_SLICE_W / 2 + IN_DX}
          y={IN_Y + IN_SLICE_H + 32}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {`${inChannels} channels`}
        </text>

        {/* ===== Input -> filters arrow ===== */}
        <line
          x1={IN_X + IN_SLICE_W + IN_DX + 6}
          y1={FILT_CY}
          x2={FILT_CX - FILT_W / 2 - deckLayers * FILT_DECK_DX - 8}
          y2={FILT_CY}
          stroke={C.line}
          strokeWidth={1.4}
        />

        {/* ===== Filter deck (middle) ===== */}
        <text
          x={FILT_CX}
          y={DRAW_TOP + 4}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          {`${K} filters`}
        </text>
        {/* back cubes of the deck (faded) */}
        {Array.from({ length: deckLayers }, (_, i) => deckLayers - 1 - i).map(
          (i: number) => {
            const off = i;
            const isFront = i === 0;
            return (
              <rect
                key={`deck${i}`}
                x={FILT_CX - FILT_W / 2 + off * FILT_DECK_DX}
                y={FILT_CY - FILT_W / 2 - off * FILT_DECK_DY}
                width={FILT_W}
                height={FILT_W}
                rx={3}
                fill={isFront ? "var(--card)" : C.grid}
                stroke={isFront ? C.ink : C.line}
                strokeWidth={isFront ? 1.6 : 1}
              />
            );
          },
        )}
        {/* 3x3 grid inside the front filter cube */}
        {[0, 1, 2].map((r: number) =>
          [0, 1, 2].map((c: number) => (
            <rect
              key={`g${r}-${c}`}
              x={FILT_CX - FILT_W / 2 + 5 + c * ((FILT_W - 10) / 3)}
              y={FILT_CY - FILT_W / 2 + 5 + r * ((FILT_W - 10) / 3)}
              width={(FILT_W - 10) / 3 - 1.5}
              height={(FILT_W - 10) / 3 - 1.5}
              fill="none"
              stroke={C.line}
              strokeWidth={0.8}
            />
          )),
        )}
        <text
          x={FILT_CX + 2}
          y={FILT_CY + FILT_W / 2 + 22}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
          fontWeight={600}
        >
          {`(${inChannels}, 3, 3)`}
        </text>
        <text
          x={FILT_CX + 2}
          y={FILT_CY + FILT_W / 2 + 36}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          each kernel
        </text>

        {/* ===== Filters -> output arrow ===== */}
        <line
          x1={FILT_CX + FILT_W / 2 + 6}
          y1={FILT_CY}
          x2={OUT_X + (drawn - 1) * OUT_DX - 8}
          y2={FILT_CY}
          stroke={C.line}
          strokeWidth={1.4}
        />

        {/* ===== Output volume (right): K feature-map slices ===== */}
        <text
          x={OUT_X + OUT_SLICE_W / 2}
          y={DRAW_TOP + 4}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          feature maps
        </text>
        {sliceIndices.map((i: number) => {
          const isSpot = spot === i;
          const x = sliceX(i);
          const y = sliceY(i);
          // Channel 0 (front) drawn solid; deeper slices fade slightly.
          const front = i === 0;
          return (
            <rect
              key={`out${i}`}
              x={x}
              y={y}
              width={OUT_SLICE_W}
              height={OUT_SLICE_H}
              rx={3}
              fill={
                isSpot
                  ? C.coralFill
                  : front
                    ? C.blueFill
                    : "var(--card)"
              }
              stroke={isSpot ? C.coral : C.blue}
              strokeWidth={isSpot ? 2 : 1}
              opacity={isSpot ? 1 : front ? 1 : 0.85}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
        {/* Thin per-channel hit strips along the exposed left edge of each
            slice, so even deeply-stacked channels can be hovered. */}
        {sliceIndices.map((i: number) => (
          <rect
            key={`hit${i}`}
            x={sliceX(i)}
            y={sliceY(i)}
            width={Math.max(OUT_DX, 2.4)}
            height={OUT_SLICE_H}
            fill="var(--background)"
            fillOpacity={0}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* depth label under the output stack */}
        <text
          x={OUT_X + OUT_SLICE_W / 2 + (drawn - 1) * (OUT_DX / 2)}
          y={OUT_TOP_Y + OUT_SLICE_H + (drawn - 1) * OUT_DY + 20}
          fontFamily={MONO}
          fontSize={10}
          fill={C.ink}
          textAnchor="middle"
          fontWeight={600}
        >
          {`(${K}, ${spatial}, ${spatial})`}
        </text>
        <text
          x={OUT_X + OUT_SLICE_W / 2 + (drawn - 1) * (OUT_DX / 2)}
          y={OUT_TOP_Y + OUT_SLICE_H + (drawn - 1) * OUT_DY + 34}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {`${K} channels`}
        </text>

        {/* spotlight connector: filter -> the one highlighted channel */}
        {spot !== null && (
          <line
            x1={FILT_CX + FILT_W / 2 + 6}
            y1={FILT_CY}
            x2={sliceX(spot)}
            y2={sliceY(spot) + OUT_SLICE_H / 2}
            stroke={C.coral}
            strokeWidth={1.8}
          />
        )}

        {/* ===== Readout band (its own clear band) ===== */}
        <line
          x1={14}
          y1={READOUT_Y - 18}
          x2={W - 14}
          y2={READOUT_Y - 18}
          stroke={C.line}
          strokeWidth={1}
        />
        {spot !== null ? (
          <>
            <text
              x={14}
              y={READOUT_Y}
              fontFamily={MONO}
              fontSize={10}
              fill={C.coral}
              textAnchor="start"
              fontWeight={600}
            >
              {`filter ${spot} -> output channel ${spot}`}
            </text>
            <text
              x={14}
              y={THUMB_Y + 14}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
              textAnchor="start"
            >
              {`detects: ${kindLabel(kindOf(spot))}`}
            </text>
            <Thumb x={150} y={THUMB_Y - 4} kind={kindOf(spot)} />
          </>
        ) : (
          <text
            x={14}
            y={READOUT_Y}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="start"
          >
            hover a feature map to spotlight one channel
          </text>
        )}
        {/* sample thumbnails of the first few channel detectors (right side) */}
        <text
          x={W - 14}
          y={READOUT_Y}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="end"
        >
          learned patterns:
        </text>
        {[0, 1, 2].map((j: number) => (
          <Thumb
            key={`samp${j}`}
            x={W - 14 - (3 - j) * 30}
            y={THUMB_Y - 4}
            kind={kindOf(j)}
          />
        ))}

        {/* ===== Caption band (bottom) ===== */}
        <text
          x={W / 2}
          y={CAPTION_Y}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          K filters in parallel make K feature maps: 3 colors {"->"} hundreds of
          learned patterns.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">layer:</span>
        {LAYERS.map((lyr: Layer, i: number) => (
          <button
            key={`layer${i}`}
            type="button"
            onClick={() => setLayer(i)}
            aria-pressed={layer === i}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              layer === i
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            {`${lyr.in}->${lyr.out}`}
          </button>
        ))}
        <span className="ml-2 font-mono text-[var(--muted)]">
          filters K:
        </span>
        <input
          type="range"
          min={1}
          max={128}
          step={1}
          value={filters}
          onChange={(e) => {
            setFilters(Number(e.target.value));
            setLayer(0);
          }}
          className="w-28 accent-[var(--foreground)]"
        />
        <span className="font-mono tabular-nums">
          {layer === 0 ? filters : LAYERS[layer].out}
        </span>
        <span className="font-mono text-[var(--muted)]">
          {layer === 0
            ? "= output channels"
            : "(layer preset)"}
        </span>
      </div>
    </div>
  );
}
