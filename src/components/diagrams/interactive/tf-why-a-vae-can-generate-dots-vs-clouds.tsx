"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Why a VAE can generate: dots vs clouds.
// Two 2D latent-space maps side by side:
//   - Plain autoencoder: each training image maps to an isolated POINT. Big
//     empty gaps sit between the points; sampling in a gap decodes to garbage
//     because the decoder never saw that region.
//   - VAE: each image maps to a Gaussian CLOUD (mean mu, spread sigma). The KL
//     term pulls the clouds toward the origin so they overlap and fill the
//     space; sampling anywhere lands inside some cloud and decodes to a
//     plausible image.
// The user clicks either map to drop a sample; we report whether it hit a
// point/cloud (valid decode) or a gap (garbage). A toggle expands the VAE
// clouds from tight dots up to overlapping, space-filling Gaussians.

// Five training images placed in latent space. Same logical positions on both
// maps (in 0..1 normalized coords) so the contrast is purely points vs clouds.
type Item = { id: number; x: number; y: number; glyph: string };
const ITEMS: readonly Item[] = [
  { id: 0, x: 0.24, y: 0.30, glyph: "0" },
  { id: 1, x: 0.70, y: 0.22, glyph: "1" },
  { id: 2, x: 0.78, y: 0.68, glyph: "2" },
  { id: 3, x: 0.32, y: 0.74, glyph: "3" },
  { id: 4, x: 0.52, y: 0.50, glyph: "4" },
];

// VAE per-image sigma in normalized units (radius of the 1-sigma cloud) when
// fully "trained". Spread is generous so clouds overlap and crowd the centre.
const VAE_SIGMA = 0.20;

export function TfVaeDotsVsClouds() {
  // Sampled point per map, in normalized 0..1 coords (null = none yet).
  const [aeSample, setAeSample] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [vaeSample, setVaeSample] = useState<{ x: number; y: number } | null>(
    null,
  );
  // Cloud growth 0..1: 0 = tight dots, 1 = full overlapping Gaussians.
  const [grow, setGrow] = useState<number>(1);

  // --- layout ---
  const W = 520;
  const H = 408;

  // Each map is a square plot.
  const plot = 196; // side length in px
  const gapBetween = 28;
  const leftX = 18;
  const rightX = leftX + plot + gapBetween;
  const plotY = 78; // top of both plots

  // Map normalized 0..1 coords into a plot's pixel box.
  const toPx = (originX: number, n: number, axis: "x" | "y"): number =>
    axis === "x" ? originX + n * plot : plotY + n * plot;

  // For the AE map a sample is "valid" only if it lands very close to a stored
  // point; otherwise it falls in a gap and decodes to garbage.
  const AE_HIT_R = 0.05; // normalized radius around each isolated point
  function aeHit(s: { x: number; y: number }): Item | null {
    let best: Item | null = null;
    let bestD = AE_HIT_R;
    for (const it of ITEMS) {
      const d = Math.hypot(it.x - s.x, it.y - s.y);
      if (d <= bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  // For the VAE map a sample is valid if it lands within ~1.6 sigma of any
  // cloud's (grown) centre, clouds overlap so almost everywhere is covered.
  function vaeHit(s: { x: number; y: number }): Item | null {
    const sigma = VAE_SIGMA * (0.18 + 0.82 * grow);
    const reach = sigma * 1.6;
    let best: Item | null = null;
    let bestD = reach;
    for (const it of ITEMS) {
      // Clouds also drift toward the centre (0.5,0.5) as they grow (KL pull).
      const cx = it.x + (0.5 - it.x) * 0.35 * grow;
      const cy = it.y + (0.5 - it.y) * 0.35 * grow;
      const d = Math.hypot(cx - s.x, cy - s.y);
      if (d <= bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  // Click handler turning an SVG-space click into a normalized sample.
  function clickMap(
    e: React.MouseEvent<SVGRectElement>,
    originX: number,
    which: "ae" | "vae",
  ): void {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const nx = (loc.x - originX) / plot;
    const ny = (loc.y - plotY) / plot;
    const cx = Math.max(0, Math.min(1, nx));
    const cy = Math.max(0, Math.min(1, ny));
    if (which === "ae") setAeSample({ x: cx, y: cy });
    else setVaeSample({ x: cx, y: cy });
  }

  const aeResult = aeSample ? aeHit(aeSample) : null;
  const vaeResult = vaeSample ? vaeHit(vaeSample) : null;

  // Cloud render radius (1-sigma, in px) given growth.
  const cloudSigmaPx = VAE_SIGMA * (0.18 + 0.82 * grow) * plot;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Plain autoencoder maps each image to an isolated point leaving gaps that decode to garbage, while a VAE maps each image to an overlapping Gaussian cloud that fills the latent space"
      >
        {/* Title band */}
        <text x={18} y={24} fontFamily={MONO} fontSize={13} fill={C.ink}>
          Why a VAE can generate: dots vs clouds
        </text>
        <text x={18} y={42} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          click a map to sample the latent space and decode that point
        </text>

        {/* ---------- LEFT: plain autoencoder ---------- */}
        <text
          x={leftX + plot / 2}
          y={plotY - 12}
          fontFamily={MONO}
          fontSize={10.5}
          fill={C.coral}
          textAnchor="middle"
        >
          plain autoencoder: dots
        </text>
        <rect
          x={leftX}
          y={plotY}
          width={plot}
          height={plot}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.2}
        />
        {/* Isolated points with a small "valid" halo each. */}
        {ITEMS.map((it) => {
          const px = toPx(leftX, it.x, "x");
          const py = toPx(leftX, it.y, "y");
          return (
            <g key={`ae-${it.id}`}>
              <circle
                cx={px}
                cy={py}
                r={AE_HIT_R * plot}
                fill={C.coralFill}
                stroke="none"
                opacity={0.5}
              />
              <circle cx={px} cy={py} r={4} fill={C.coral} stroke="none" />
              <text
                x={px}
                y={py - 8}
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.coral}
                textAnchor="middle"
              >
                {it.glyph}
              </text>
            </g>
          );
        })}
        {/* AE sample marker + verdict glyph. */}
        {aeSample && (
          <g>
            <line
              x1={toPx(leftX, aeSample.x, "x") - 6}
              y1={toPx(leftX, aeSample.y, "y")}
              x2={toPx(leftX, aeSample.x, "x") + 6}
              y2={toPx(leftX, aeSample.y, "y")}
              stroke={aeResult ? C.green : C.ink}
              strokeWidth={1.4}
            />
            <line
              x1={toPx(leftX, aeSample.x, "x")}
              y1={toPx(leftX, aeSample.y, "y") - 6}
              x2={toPx(leftX, aeSample.x, "x")}
              y2={toPx(leftX, aeSample.y, "y") + 6}
              stroke={aeResult ? C.green : C.ink}
              strokeWidth={1.4}
            />
            {!aeResult && (
              <text
                x={toPx(leftX, aeSample.x, "x") + 9}
                y={toPx(leftX, aeSample.y, "y") + 4}
                fontFamily={MONO}
                fontSize={12}
                fill={C.ink}
              >
                ?
              </text>
            )}
          </g>
        )}

        {/* ---------- RIGHT: VAE ---------- */}
        <text
          x={rightX + plot / 2}
          y={plotY - 12}
          fontFamily={MONO}
          fontSize={10.5}
          fill={C.violet}
          textAnchor="middle"
        >
          VAE: overlapping clouds
        </text>
        <rect
          x={rightX}
          y={plotY}
          width={plot}
          height={plot}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.2}
        />
        {/* Soft Gaussian clouds (two rings: ~1 and ~2 sigma). */}
        {ITEMS.map((it) => {
          const cxN = it.x + (0.5 - it.x) * 0.35 * grow;
          const cyN = it.y + (0.5 - it.y) * 0.35 * grow;
          const px = toPx(rightX, cxN, "x");
          const py = toPx(rightX, cyN, "y");
          return (
            <g key={`vae-${it.id}`}>
              <circle
                cx={px}
                cy={py}
                r={cloudSigmaPx * 1.9}
                fill={C.violet}
                opacity={0.08}
              />
              <circle
                cx={px}
                cy={py}
                r={cloudSigmaPx}
                fill={C.violet}
                opacity={0.16}
              />
              <circle cx={px} cy={py} r={3} fill={C.violet} />
              <text
                x={px}
                y={py - cloudSigmaPx - 3}
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.violet}
                textAnchor="middle"
              >
                {it.glyph}
              </text>
            </g>
          );
        })}
        {/* VAE sample marker. */}
        {vaeSample && (
          <g>
            <line
              x1={toPx(rightX, vaeSample.x, "x") - 6}
              y1={toPx(rightX, vaeSample.y, "y")}
              x2={toPx(rightX, vaeSample.x, "x") + 6}
              y2={toPx(rightX, vaeSample.y, "y")}
              stroke={vaeResult ? C.green : C.coral}
              strokeWidth={1.4}
            />
            <line
              x1={toPx(rightX, vaeSample.x, "x")}
              y1={toPx(rightX, vaeSample.y, "y") - 6}
              x2={toPx(rightX, vaeSample.x, "x")}
              y2={toPx(rightX, vaeSample.y, "y") + 6}
              stroke={vaeResult ? C.green : C.coral}
              strokeWidth={1.4}
            />
          </g>
        )}

        {/* Click capture rects (drawn last so they receive the events). */}
        <rect
          x={leftX}
          y={plotY}
          width={plot}
          height={plot}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onClick={(e) => clickMap(e, leftX, "ae")}
        />
        <rect
          x={rightX}
          y={plotY}
          width={plot}
          height={plot}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onClick={(e) => clickMap(e, rightX, "vae")}
        />

        {/* ---------- Readout band (below the plots) ---------- */}
        {(() => {
          const ry = plotY + plot + 20;
          return (
            <g>
              {/* Left readout */}
              <text
                x={leftX}
                y={ry}
                fontFamily={MONO}
                fontSize={9.5}
                fill={
                  aeSample ? (aeResult ? C.green : C.coral) : C.muted
                }
              >
                {aeSample
                  ? aeResult
                    ? `decodes → image "${aeResult.glyph}" (on a point)`
                    : "in a gap → garbage decode"
                  : "click left map to sample"}
              </text>
              {/* Right readout */}
              <text
                x={rightX}
                y={ry}
                fontFamily={MONO}
                fontSize={9.5}
                fill={
                  vaeSample ? (vaeResult ? C.green : C.coral) : C.muted
                }
              >
                {vaeSample
                  ? vaeResult
                    ? `decodes → plausible (in cloud "${vaeResult.glyph}")`
                    : "edge: grow clouds to cover it"
                  : "click right map to sample"}
              </text>
            </g>
          );
        })()}

        {/* Caption band (bottom) */}
        <text
          x={18}
          y={H - 16}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
        >
          Dots leave gaps you can&apos;t generate from; overlapping clouds
        </text>
        <text x={18} y={H - 4} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          fill the space smoothly.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--foreground)]">
          cloud spread
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={grow}
            onChange={(e) => setGrow(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">
            {grow === 0 ? "dots" : `${Math.round(grow * 100)}%`}
          </span>
        </label>
        <button
          type="button"
          onClick={() => setGrow(0)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={grow === 0 ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          collapse to dots
        </button>
        <button
          type="button"
          onClick={() => setGrow(1)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={grow === 1 ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          grow clouds
        </button>
        <button
          type="button"
          onClick={() => {
            setAeSample(null);
            setVaeSample(null);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          clear samples
        </button>
      </div>
    </div>
  );
}
