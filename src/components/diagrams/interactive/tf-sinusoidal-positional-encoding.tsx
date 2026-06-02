"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// ---- Model constants (deterministic) ----

// Sinusoidal positional encoding:
//   PE(pos, 2i)   = sin(pos / 10000^(2i/d))
//   PE(pos, 2i+1) = cos(pos / 10000^(2i/d))
// Low dimension index -> high frequency (fast oscillation);
// high dimension index -> low frequency (slow oscillation).

const N_POS = 51; // positions 0..50 (heatmap rows)
const D_MODEL = 16; // embedding dimensions (heatmap columns)

// angle frequency for column j of the embedding (paired sin/cos).
function freq(j: number): number {
  const i = Math.floor(j / 2); // dimension pair index
  return 1 / Math.pow(10000, (2 * i) / D_MODEL);
}

// PE value at (pos, j) in [-1, 1].
function peValue(pos: number, j: number): number {
  const w = freq(j);
  return j % 2 === 0 ? Math.sin(pos * w) : Math.cos(pos * w);
}

// The waves drawn on the right: a few representative dimensions at
// different frequencies. Each entry is a column index of the encoding.
interface Wave {
  j: number; // dimension/column index
  color: string;
  label: string;
}
const WAVES: Wave[] = [
  { j: 0, color: C.coral, label: "dim 0  sin (fast)" },
  { j: 4, color: C.blue, label: "dim 4  sin (med)" },
  { j: 10, color: C.green, label: "dim 10 sin (slow)" },
];

// ---- Geometry ----

const W = 680;
const H = 472;

// Heatmap (left). Columns = dimensions, rows = positions.
const HM_X = 48;
const HM_Y = 70;
const CELL_W = 11;
const CELL_H = 5.2;
const HM_W = D_MODEL * CELL_W;
const HM_H = N_POS * CELL_H;

// Wave panel (right).
const WV_X = 380;
const WV_Y = 86;
const WV_W = 268;
const WV_H = 168;

// map a PE value in [-1,1] to a monochrome-ish fill via blue/coral.
function heatFill(v: number): string {
  // v in [-1, 1]; negative -> coral, positive -> blue, magnitude -> alpha.
  const a = Math.min(1, Math.abs(v));
  if (v >= 0) {
    return `rgba(63, 95, 214, ${(0.12 + 0.8 * a).toFixed(3)})`;
  }
  return `rgba(217, 115, 79, ${(0.12 + 0.8 * a).toFixed(3)})`;
}

export function TfPositionalEncoding() {
  const [pos, setPos] = useState<number>(12);
  const [showRot, setShowRot] = useState<boolean>(false);

  // The relative-distance offset k for the rotation demo.
  const K = 6;
  const pos2 = Math.min(N_POS - 1, pos + K);

  // y for a given position in the heatmap.
  const rowY = (p: number): number => HM_Y + p * CELL_H;

  // x for a given position (time) in the wave panel.
  const tx = (p: number): number => WV_X + (p / (N_POS - 1)) * WV_W;
  // y for a wave value v in [-1,1] in the wave panel.
  const wy = (v: number): number => WV_Y + WV_H / 2 - v * (WV_H / 2 - 6);

  // Polyline points for a wave column j.
  function wavePoints(j: number): string {
    const pts: string[] = [];
    for (let p = 0; p < N_POS; p += 1) {
      pts.push(`${tx(p).toFixed(2)},${wy(peValue(p, j)).toFixed(2)}`);
    }
    return pts.join(" ");
  }

  // "Fingerprint" values at the selected position (one per wave).
  const fingerprint: { j: number; color: string; v: number }[] = WAVES.map(
    (w: Wave) => ({ j: w.j, color: w.color, v: peValue(pos, w.j) }),
  );

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Sinusoidal positional encoding: a position-by-dimension heatmap of sin/cos values beside the individual frequency waves, with a slider selecting a position and a toggle showing the relative-distance rotation property"
      >
        {/* ---- Title band ---- */}
        <text
          x={W / 2}
          y={26}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Sinusoidal Positional Encoding
        </text>
        <text
          x={W / 2}
          y={44}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          PE(pos, 2i) = sin(pos / 10000^(2i/d)) ; PE(pos, 2i+1) = cos(...)
        </text>

        {/* ============ REGION 1: heatmap (left) ============ */}
        <g>
          <text
            x={HM_X + HM_W / 2}
            y={HM_Y - 12}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            position x dimension
          </text>

          {/* cells */}
          {Array.from({ length: N_POS }).map((_, p: number) =>
            Array.from({ length: D_MODEL }).map((__, j: number) => (
              <rect
                key={`${p}-${j}`}
                x={HM_X + j * CELL_W}
                y={HM_Y + p * CELL_H}
                width={CELL_W}
                height={CELL_H}
                fill={heatFill(peValue(p, j))}
              />
            )),
          )}

          {/* highlight the selected row (and the rotated row if shown) */}
          {showRot && (
            <rect
              x={HM_X - 2}
              y={rowY(pos2)}
              width={HM_W + 4}
              height={CELL_H}
              fill="none"
              stroke={C.violet}
              strokeWidth={1.6}
            />
          )}
          <rect
            x={HM_X - 2}
            y={rowY(pos)}
            width={HM_W + 4}
            height={CELL_H}
            fill="none"
            stroke={C.ink}
            strokeWidth={1.6}
          />

          {/* dimension axis (bottom) */}
          <text
            x={HM_X + HM_W / 2}
            y={HM_Y + HM_H + 16}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.muted}
            textAnchor="middle"
          >
            dimension 0 .. d  (fast -&gt; slow)
          </text>

          {/* position axis (left, rotated) */}
          <text
            x={HM_X - 16}
            y={HM_Y + HM_H / 2}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.muted}
            textAnchor="middle"
            transform={`rotate(-90 ${HM_X - 16} ${HM_Y + HM_H / 2})`}
          >
            position 0 .. 50
          </text>

          {/* selected position marker label, clear to the right of the grid */}
          <text
            x={HM_X + HM_W + 8}
            y={rowY(pos) + CELL_H / 2 + 3}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.ink}
            textAnchor="start"
          >
            {`pos ${pos}`}
          </text>
          {showRot && (
            <text
              x={HM_X + HM_W + 8}
              y={rowY(pos2) + CELL_H / 2 + 3}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.violet}
              textAnchor="start"
            >
              {`pos ${pos2}`}
            </text>
          )}
        </g>

        {/* ============ REGION 2: waves (right) ============ */}
        <g>
          <text
            x={WV_X + WV_W / 2}
            y={WV_Y - 12}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            individual frequency waves
          </text>

          {/* zero axis */}
          <line
            x1={WV_X}
            y1={WV_Y + WV_H / 2}
            x2={WV_X + WV_W}
            y2={WV_Y + WV_H / 2}
            stroke={C.grid}
            strokeWidth={1}
          />
          {/* frame */}
          <line
            x1={WV_X}
            y1={WV_Y}
            x2={WV_X}
            y2={WV_Y + WV_H}
            stroke={C.line}
            strokeWidth={1}
          />

          {/* waves */}
          {WAVES.map((w: Wave) => (
            <polyline
              key={w.j}
              points={wavePoints(w.j)}
              fill="none"
              stroke={w.color}
              strokeWidth={1.6}
              opacity={0.9}
            />
          ))}

          {/* vertical "fingerprint" line at selected position */}
          <line
            x1={tx(pos)}
            y1={WV_Y}
            x2={tx(pos)}
            y2={WV_Y + WV_H}
            stroke={C.ink}
            strokeWidth={1.4}
            strokeDasharray="3 3"
          />
          {showRot && (
            <line
              x1={tx(pos2)}
              y1={WV_Y}
              x2={tx(pos2)}
              y2={WV_Y + WV_H}
              stroke={C.violet}
              strokeWidth={1.4}
              strokeDasharray="3 3"
            />
          )}

          {/* dots where each wave crosses the selected position */}
          {fingerprint.map((f) => (
            <circle
              key={f.j}
              cx={tx(pos)}
              cy={wy(f.v)}
              r={3}
              fill={f.color}
              stroke="var(--card)"
              strokeWidth={1}
            />
          ))}

          {/* time axis label below wave panel */}
          <text
            x={WV_X + WV_W / 2}
            y={WV_Y + WV_H + 16}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.muted}
            textAnchor="middle"
          >
            position (time) -&gt;
          </text>
        </g>

        {/* ============ REGION 3: wave legend (right, own band) ============ */}
        <g>
          {WAVES.map((w: Wave, i: number) => {
            const ly = WV_Y + WV_H + 34 + i * 15;
            return (
              <g key={w.j}>
                <line
                  x1={WV_X}
                  y1={ly}
                  x2={WV_X + 18}
                  y2={ly}
                  stroke={w.color}
                  strokeWidth={2}
                />
                <text
                  x={WV_X + 24}
                  y={ly + 3.5}
                  fontFamily={MONO}
                  fontSize={9.5}
                  fill={C.ink}
                  textAnchor="start"
                >
                  {w.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* ============ REGION 4: fingerprint readout (left, below heatmap) ============ */}
        <g>
          <text
            x={HM_X}
            y={HM_Y + HM_H + 40}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="start"
          >
            {`fingerprint @ pos ${pos}:`}
          </text>
          {fingerprint.map((f, i: number) => (
            <text
              key={f.j}
              x={HM_X + i * 70}
              y={HM_Y + HM_H + 56}
              fontFamily={MONO}
              fontSize={9.5}
              fill={f.color}
              textAnchor="start"
            >
              {`d${f.j}=${f.v.toFixed(2)}`}
            </text>
          ))}
        </g>

        {/* ============ Addition band (bottom) ============ */}
        <g>
          <text
            x={W / 2}
            y={H - 36}
            fontFamily={MONO}
            fontSize={11}
            fill={C.ink}
            textAnchor="middle"
          >
            token_embed
            <tspan fill={C.muted}>{" ᵢ + "}</tspan>
            <tspan fill={C.blue}>pos_encode</tspan>
            <tspan fill={C.muted}>{"ᵢ"}</tspan>
            {showRot ? (
              <tspan fill={C.muted}>{"  ->  rotate(pos) by k = input shift"}</tspan>
            ) : (
              <tspan fill={C.muted}>{" = input"}</tspan>
            )}
            {!showRot && <tspan fill={C.muted}>{"ᵢ"}</tspan>}
          </text>

          {/* Caption */}
          <text
            x={W / 2}
            y={H - 16}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.muted}
            textAnchor="middle"
          >
            Different frequencies give every position a unique fingerprint and encode
            relative distance.
          </text>
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
          position
          <input
            type="range"
            min={0}
            max={N_POS - 1}
            step={1}
            value={pos}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPos(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{pos}</span>
        </label>
        <button
          type="button"
          onClick={() => setShowRot((s: boolean) => !s)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={showRot ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {`relative shift +${K}`}
        </button>
        <span className="font-mono text-[var(--muted)]">
          {showRot
            ? "pos+k is a fixed rotation of pos's encoding."
            : "Drag to move the fingerprint line and lit row."}
        </span>
      </div>
    </div>
  );
}
