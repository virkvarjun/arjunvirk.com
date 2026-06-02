"use client";

import { useMemo, useState } from "react";
import { C, MONO } from "../frame";

// Conv vs Fully-Connected: parameter count.
//
// A conv layer reuses a small filter (weight sharing) across every spatial
// position (local connectivity), so its parameter count is tiny. A fully-
// connected layer learns a distinct weight for every input/output pair, so on
// a flattened image it explodes into hundreds of millions of parameters.
//
// Input image is fixed at 224 x 224 with `inCh` channels. The FC layer maps the
// flattened image (224*224*inCh features) to `hidden` outputs.

const IMG = 224; // input spatial size (fixed)
const SPATIAL = IMG * IMG; // 50,176 positions a conv filter sweeps over

// Spatial-grid mini map: a coarse GRID x GRID stand-in for the 50,176 positions.
const GRID = 8; // 8 x 8 = 64 cells representing the full spatial extent
const CELLS: readonly { r: number; c: number }[] = Array.from(
  { length: GRID * GRID },
  (_unused: undefined, i: number): { r: number; c: number } => ({
    r: Math.floor(i / GRID),
    c: i % GRID,
  }),
);

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return String(n);
}

export function VisConvVsFcParams() {
  const [kernel, setKernel] = useState<number>(3); // kernel size (k x k)
  const [filters, setFilters] = useState<number>(64); // number of conv filters
  const [inCh, setInCh] = useState<number>(3); // input channels
  const [hidden, setHidden] = useState<number>(1000); // FC hidden size
  const [reveal, setReveal] = useState<boolean>(false); // animate weight sharing

  // Parameter counts (weights + biases).
  const convParams: number = kernel * kernel * inCh * filters + filters;
  const fcParams: number = SPATIAL * inCh * hidden + hidden;
  const ratio: number = fcParams / convParams;
  const weightsPerFilter: number = kernel * kernel * inCh; // shared everywhere

  // Log-scale bar widths. Bars share the same x origin and a common max param
  // budget so the two are directly comparable.
  const barX = 150;
  const barMaxW = 250;
  const logMax = Math.log10(300_000_000); // headroom above FC max (~150M)
  const wOf = useMemo(
    () =>
      (n: number): number =>
        Math.max(2, (Math.log10(n) / logMax) * barMaxW),
    [logMax],
  );
  const convW = wOf(convParams);
  const fcW = wOf(fcParams);

  const convBarY = 78;
  const fcBarY = 110;
  const barH = 18;

  return (
    <div>
      <svg
        viewBox="0 0 440 400"
        className="h-auto w-full"
        role="img"
        aria-label="Conv vs fully-connected parameter count: a small shared filter reused across every spatial position replaces millions of position-specific weights"
      >
        {/* ---- Title band ---- */}
        <text x={16} y={24} fontFamily={MONO} fontSize={13} fill={C.ink}>
          Conv vs Fully-Connected: Parameter Count
        </text>
        <text x={16} y={42} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          same {IMG}×{IMG}×{inCh} input — log scale
        </text>

        {/* ---- Comparison bars band ---- */}
        {/* Conv bar */}
        <text x={16} y={convBarY + 13} fontFamily={MONO} fontSize={10} fill={C.ink}>
          conv {kernel}×{kernel}
        </text>
        <text x={16} y={convBarY + 25} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          {filters} filters
        </text>
        <rect
          x={barX}
          y={convBarY}
          width={convW}
          height={barH}
          rx={3}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1.4}
        />
        <text
          x={barX + convW + 6}
          y={convBarY + 13}
          fontFamily={MONO}
          fontSize={10}
          fill={C.green}
        >
          {fmt(convParams)} params
        </text>

        {/* FC bar */}
        <text x={16} y={fcBarY + 13} fontFamily={MONO} fontSize={10} fill={C.ink}>
          fully-conn
        </text>
        <text x={16} y={fcBarY + 25} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          →{fmt(hidden)} units
        </text>
        <rect
          x={barX}
          y={fcBarY}
          width={fcW}
          height={barH}
          rx={3}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1.4}
        />
        <text
          x={barX + fcW + 6}
          y={fcBarY + 13}
          fontFamily={MONO}
          fontSize={10}
          fill={C.coral}
          textAnchor={fcW > barMaxW - 40 ? "end" : "start"}
          dx={fcW > barMaxW - 40 ? -6 : 0}
        >
          {fmt(fcParams)} params
        </text>

        {/* ---- Reduction readout band ---- */}
        <text x={16} y={160} fontFamily={MONO} fontSize={11} fill={C.violet}>
          {ratio >= 1
            ? `≈ ${fmt(Math.round(ratio))}× fewer parameters`
            : `≈ ${fmt(Math.round(1 / ratio))}× more parameters`}
        </text>

        {/* ---- Weight-sharing illustration ---- */}
        {/* The shared filter tile */}
        <text x={16} y={198} fontFamily={MONO} fontSize={10} fill={C.ink}>
          weight sharing
        </text>
        <text x={16} y={212} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          one filter:
        </text>
        <text x={16} y={224} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          {weightsPerFilter} weights
        </text>
        {/* filter glyph: k x k swatch */}
        <g>
          {Array.from({ length: kernel * kernel }, (_u: undefined, i: number) => {
            const fr = Math.floor(i / kernel);
            const fc = i % kernel;
            const cell = Math.min(36 / kernel, 11);
            const gx = 16 + fc * cell;
            const gy = 234 + fr * cell;
            return (
              <rect
                key={`f${i}`}
                x={gx}
                y={gy}
                width={cell - 1.5}
                height={cell - 1.5}
                rx={1}
                fill={C.blueFill}
                stroke={C.blue}
                strokeWidth={1}
              />
            );
          })}
        </g>

        {/* Spatial grid: the same filter stamped across all positions */}
        <text x={150} y={198} fontFamily={MONO} fontSize={10} fill={C.ink}>
          reused at every position
        </text>
        <text x={150} y={212} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          {fmt(SPATIAL)} spatial locations
        </text>
        {(() => {
          const gx0 = 150;
          const gy0 = 222;
          const cell = 16;
          return CELLS.map(({ r, c }, i: number) => {
            const filled = reveal || i === 0;
            return (
              <g key={`g${i}`}>
                <rect
                  x={gx0 + c * cell}
                  y={gy0 + r * cell}
                  width={cell - 2}
                  height={cell - 2}
                  rx={1.5}
                  fill={filled ? C.blueFill : "var(--card)"}
                  stroke={filled ? C.blue : C.line}
                  strokeWidth={filled ? 1.1 : 0.8}
                />
                {i === 0 && (
                  <rect
                    x={gx0 + c * cell}
                    y={gy0 + r * cell}
                    width={cell - 2}
                    height={cell - 2}
                    rx={1.5}
                    fill="none"
                    stroke={C.violet}
                    strokeWidth={1.6}
                  />
                )}
              </g>
            );
          });
        })()}

        {/* ---- Caption band ---- */}
        <text x={16} y={372} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          A handful of shared weights, reused everywhere,
        </text>
        <text x={16} y={385} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          replaces {fmt(fcParams)} position-specific ones.
        </text>
      </svg>

      {/* ---- Controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          onClick={() => setReveal((v: boolean) => !v)}
          aria-pressed={reveal}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={reveal ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {reveal ? "showing reuse" : "show reuse"}
        </button>

        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          kernel
          <input
            type="range"
            min={1}
            max={7}
            step={2}
            value={kernel}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setKernel(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">
            {kernel}×{kernel}
          </span>
        </label>

        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          filters
          <input
            type="range"
            min={8}
            max={256}
            step={8}
            value={filters}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilters(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{filters}</span>
        </label>

        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          in ch
          <input
            type="range"
            min={1}
            max={3}
            step={1}
            value={inCh}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInCh(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{inCh}</span>
        </label>

        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          FC units
          <input
            type="range"
            min={100}
            max={4000}
            step={100}
            value={hidden}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setHidden(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{fmt(hidden)}</span>
        </label>
      </div>
    </div>
  );
}
