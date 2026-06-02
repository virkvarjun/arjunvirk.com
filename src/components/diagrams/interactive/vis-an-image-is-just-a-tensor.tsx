"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// ---- Static data (deterministic; no random/date at module load) ----

// A tiny hard-coded 4x4 RGB image. Each pixel is [R, G, B], 0-255.
// The pattern is a soft warm-to-cool gradient so the channels look distinct.
const GRID = 4; // 4x4 image
const IMAGE: number[][][] = [
  [
    [221, 96, 64],
    [232, 140, 78],
    [180, 168, 96],
    [120, 176, 130],
  ],
  [
    [206, 110, 92],
    [214, 150, 110],
    [150, 170, 140],
    [96, 168, 168],
  ],
  [
    [150, 120, 150],
    [150, 150, 170],
    [110, 150, 190],
    [78, 140, 210],
  ],
  [
    [120, 110, 180],
    [104, 120, 200],
    [80, 120, 214],
    [64, 110, 224],
  ],
];

type Channel = 0 | 1 | 2;
const CHANNEL_NAMES: readonly ["R", "G", "B"] = ["R", "G", "B"];

// Convert one channel intensity into a grayscale fill string.
function grayOf(v: number): string {
  return `rgb(${v},${v},${v})`;
}

function rgbOf(p: number[]): string {
  return `rgb(${p[0]},${p[1]},${p[2]})`;
}

// ---- Geometry ----

const PX = 26; // pixel cell size in the zoomed photo
const IMG_X = 28; // left edge of the zoomed photo
const IMG_Y = 96; // top edge of the zoomed photo
const IMG_W = GRID * PX;

// Channel planes (middle).
const PLANE_X = 196;
const PLANE_Y = 92;
const PCELL = 13;
const PLANE_W = GRID * PCELL;
const PLANE_GAP = 24; // vertical gap between stacked planes (room for label)
const PLANE_STEP = GRID * PCELL + PLANE_GAP;

// Tensor box + batch (right).
const TBOX_X = 408;
const TBOX_W = 92;
const TBOX_H = 64;

const MAX_N = 5;

export function VisImageIsATensor() {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const [channelsFirst, setChannelsFirst] = useState<boolean>(true);
  const [batchN, setBatchN] = useState<number>(3);

  const hoveredPixel: number[] | null =
    hover === null ? null : IMAGE[hover.r][hover.c];

  // Axis-order strings driven by the toggle.
  const axisLabel: string = channelsFirst ? "(C=3, H, W)" : "(H, W, C=3)";
  const batchLabel: string = channelsFirst
    ? `(N=${batchN}, C, H, W)`
    : `(N=${batchN}, H, W, C)`;
  const framework: string = channelsFirst ? "PyTorch" : "NumPy / TF";

  return (
    <div>
      <svg
        viewBox="0 0 600 452"
        className="h-auto w-full"
        role="img"
        aria-label="An image is just a tensor: pixels carry RGB triples, split into three channel planes, stacked into a (C,H,W) tensor, then batched into a 4D (N,C,H,W) tensor"
      >
        {/* ---- Title band ---- */}
        <text
          x={300}
          y={26}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          An Image Is Just a Tensor
        </text>

        {/* ---- Readout band (own clear band below title) ---- */}
        <g>
          {hoveredPixel ? (
            <>
              <rect
                x={28}
                y={42}
                width={20}
                height={20}
                rx={3}
                fill={rgbOf(hoveredPixel)}
                stroke={C.line}
                strokeWidth={1}
              />
              <text
                x={56}
                y={56}
                fontFamily={MONO}
                fontSize={11}
                fill={C.ink}
                textAnchor="start"
              >
                {`pixel (${hover?.r}, ${hover?.c})  RGB = (${hoveredPixel[0]}, ${hoveredPixel[1]}, ${hoveredPixel[2]})`}
              </text>
            </>
          ) : (
            <text
              x={28}
              y={56}
              fontFamily={MONO}
              fontSize={11}
              fill={C.muted}
              textAnchor="start"
            >
              Hover a pixel to read its (R, G, B) triple.
            </text>
          )}
        </g>

        {/* ============ REGION 1: zoomed photo (left) ============ */}
        <g>
          <text
            x={IMG_X + IMG_W / 2}
            y={IMG_Y - 12}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            zoomed image
          </text>
          {IMAGE.map((row: number[][], r: number) =>
            row.map((p: number[], c: number) => {
              const active = hover?.r === r && hover?.c === c;
              return (
                <rect
                  key={`px-${r}-${c}`}
                  x={IMG_X + c * PX}
                  y={IMG_Y + r * PX}
                  width={PX}
                  height={PX}
                  fill={rgbOf(p)}
                  stroke={active ? C.ink : C.line}
                  strokeWidth={active ? 2 : 0.8}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHover({ r, c })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            }),
          )}
          <text
            x={IMG_X + IMG_W / 2}
            y={IMG_Y + IMG_W + 18}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.muted}
            textAnchor="middle"
          >
            each pixel = 3 numbers
          </text>
        </g>

        {/* arrow: photo -> channel planes */}
        <g stroke={C.line} fill={C.line}>
          <line
            x1={IMG_X + IMG_W + 8}
            y1={IMG_Y + IMG_W / 2}
            x2={PLANE_X - 14}
            y2={IMG_Y + IMG_W / 2}
            strokeWidth={1.4}
          />
          <polygon
            points={`${PLANE_X - 8},${IMG_Y + IMG_W / 2} ${PLANE_X - 15},${IMG_Y + IMG_W / 2 - 4} ${PLANE_X - 15},${IMG_Y + IMG_W / 2 + 4}`}
          />
        </g>

        {/* ============ REGION 2: three channel planes (middle) ============ */}
        <g>
          <text
            x={PLANE_X + PLANE_W / 2}
            y={PLANE_Y - 14}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            split into channels
          </text>
          {CHANNEL_NAMES.map((name: string, ch: number) => {
            const channel = ch as Channel;
            const accent =
              channel === 0 ? C.coral : channel === 1 ? C.green : C.blue;
            const planeTop = PLANE_Y + ch * PLANE_STEP;
            return (
              <g key={`plane-${name}`}>
                {/* channel name tag to the left of each plane */}
                <text
                  x={PLANE_X - 12}
                  y={planeTop + PLANE_W / 2 + 3.5}
                  fontFamily={MONO}
                  fontSize={11}
                  fill={accent}
                  fontWeight={600}
                  textAnchor="end"
                >
                  {name}
                </text>
                {IMAGE.map((row: number[][], r: number) =>
                  row.map((p: number[], c: number) => {
                    const active = hover?.r === r && hover?.c === c;
                    return (
                      <rect
                        key={`pl-${name}-${r}-${c}`}
                        x={PLANE_X + c * PCELL}
                        y={planeTop + r * PCELL}
                        width={PCELL}
                        height={PCELL}
                        fill={grayOf(p[channel])}
                        stroke={active ? accent : C.line}
                        strokeWidth={active ? 1.6 : 0.6}
                      />
                    );
                  }),
                )}
                {/* accent border around the plane */}
                <rect
                  x={PLANE_X}
                  y={planeTop}
                  width={PLANE_W}
                  height={PLANE_W}
                  fill="none"
                  stroke={accent}
                  strokeWidth={1.2}
                />
              </g>
            );
          })}
        </g>

        {/* arrow: planes -> tensor box */}
        <g stroke={C.line} fill={C.line}>
          <line
            x1={PLANE_X + PLANE_W + 10}
            y1={PLANE_Y + PLANE_STEP + PLANE_W / 2}
            x2={TBOX_X - 14}
            y2={PLANE_Y + PLANE_STEP + PLANE_W / 2}
            strokeWidth={1.4}
          />
          <polygon
            points={`${TBOX_X - 8},${PLANE_Y + PLANE_STEP + PLANE_W / 2} ${TBOX_X - 15},${PLANE_Y + PLANE_STEP + PLANE_W / 2 - 4} ${TBOX_X - 15},${PLANE_Y + PLANE_STEP + PLANE_W / 2 + 4}`}
          />
        </g>

        {/* ============ REGION 3: tensor box (right, top) ============ */}
        <g>
          <text
            x={TBOX_X + TBOX_W / 2}
            y={PLANE_Y - 14}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            stack -&gt; 3D tensor
          </text>
          <rect
            x={TBOX_X}
            y={PLANE_Y}
            width={TBOX_W}
            height={TBOX_H}
            rx={5}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1.4}
          />
          <text
            x={TBOX_X + TBOX_W / 2}
            y={PLANE_Y + TBOX_H / 2 - 2}
            fontFamily={MONO}
            fontSize={11}
            fill={C.ink}
            fontWeight={600}
            textAnchor="middle"
          >
            {axisLabel}
          </text>
          <text
            x={TBOX_X + TBOX_W / 2}
            y={PLANE_Y + TBOX_H / 2 + 14}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
          >
            tensor
          </text>
        </g>

        {/* ============ REGION 4: batch stack (right, lower) ============ */}
        <g>
          <text
            x={TBOX_X + TBOX_W / 2}
            y={PLANE_Y + TBOX_H + 30}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            batch N images
          </text>
          {/* draw N offset slices, back-to-front */}
          {Array.from({ length: batchN }).map((_, i: number) => {
            const idx = batchN - 1 - i; // back slice first
            const off = idx * 9;
            const bx = TBOX_X - 6 + off;
            const by = PLANE_Y + TBOX_H + 44 + off;
            const front = idx === 0;
            return (
              <rect
                key={`slice-${idx}`}
                x={bx}
                y={by}
                width={TBOX_W - 10}
                height={42}
                rx={4}
                fill={front ? C.violet : "var(--card)"}
                stroke={C.violet}
                strokeWidth={1.2}
                opacity={front ? 0.9 : 0.55}
              />
            );
          })}
          {/* label sits in clear space BELOW the stack */}
          <text
            x={TBOX_X + TBOX_W / 2}
            y={PLANE_Y + TBOX_H + 44 + (batchN - 1) * 9 + 42 + 18}
            fontFamily={MONO}
            fontSize={10.5}
            fill={C.violet}
            fontWeight={600}
            textAnchor="middle"
          >
            {batchLabel}
          </text>
        </g>

        {/* ============ Caption band (bottom, own clear band) ============ */}
        <text
          x={300}
          y={438}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Pixels -&gt; channels -&gt; a 3D tensor; batch them for the 4D (N, C, H, W) a CNN eats.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setChannelsFirst(true)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            channelsFirst
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          channels-first (C, H, W)
        </button>
        <button
          type="button"
          onClick={() => setChannelsFirst(false)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            !channelsFirst
              ? { background: C.ink, color: "var(--background)" }
              : undefined
          }
        >
          channels-last (H, W, C)
        </button>
        <span className="font-mono text-[var(--muted)]">{framework}</span>

        <label className="flex items-center gap-2">
          <span className="font-mono text-[var(--foreground)]">batch N</span>
          <input
            type="range"
            min={1}
            max={MAX_N}
            step={1}
            value={batchN}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setBatchN(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{batchN}</span>
        </label>
      </div>
    </div>
  );
}
