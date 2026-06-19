"use client";

import { useMemo, useState } from "react";
import { C, MONO } from "../frame";

// ===========================================================================
// "Encoding a Point Prompt", how SAM turns a click into a 256-dim token.
//
// pixel (x,y) -> normalize to [0,1] -> Fourier features (fixed matrix B, then
// sin & cos) -> add a learned label embedding (foreground green / background
// red) -> one 256-dim prompt token. Nearby clicks get similar Fourier codes;
// far-apart clicks get very different ones.
// ===========================================================================

// ---- Static data (deterministic; no random/date at module load) ----

// Image canvas in pixels (the conceptual "image size" used to normalize).
const IMG_PX = 64;

// A small fixed "random" Gaussian matrix B: each row is a 2D frequency vector.
// Hard-coded (no Math.random) so the encoding is fully deterministic/SSR-safe.
// We visualize an 8-band spectrum; the real SAM vector is 256-dim (8*2*... ).
const B_ROWS: ReadonlyArray<readonly [number, number]> = [
  [0.6, -1.3],
  [1.9, 0.4],
  [-0.8, 2.2],
  [2.7, -1.1],
  [-2.4, -0.7],
  [1.2, 3.1],
  [3.6, 1.8],
  [-1.5, 2.9],
] as const;

const N_BANDS = B_ROWS.length; // 8 frequency bands shown

// Two preset clicks so the diagram is informative before the user touches it.
interface PointDef {
  px: number; // pixel x in [0, IMG_PX]
  py: number; // pixel y in [0, IMG_PX]
  label: "fg" | "bg";
}

type Label = "fg" | "bg";

const TWO_PI = Math.PI * 2;

// Compute the 8-band Fourier feature (sin part) for a normalized (x,y).
// Returned values are in [-1,1]; used both for the spectrum bars and to
// measure similarity between two clicks.
function fourierBands(nx: number, ny: number): number[] {
  return B_ROWS.map(([bx, by]) => {
    const proj = TWO_PI * (bx * nx + by * ny);
    return Math.sin(proj);
  });
}

// Cosine-style similarity between two band vectors, mapped to [0,1].
function similarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  const cos = denom === 0 ? 0 : dot / denom;
  return (cos + 1) / 2; // [-1,1] -> [0,1]
}

// ---- Geometry (all coordinates in the 520 x 470 viewBox) ----

const VB_W = 520;
const VB_H = 476;

// Image panel (left).
const IMG_X = 24;
const IMG_Y = 78;
const IMG_W = 150;
const IMG_H = 150;

// Spectrum panels (right): two stacked strips, one per click.
const SPEC_X = 232;
const SPEC_W = 264;
const BAND_GAP = 2;
const BAND_W = (SPEC_W - (N_BANDS - 1) * BAND_GAP) / N_BANDS;
const SPEC_H = 44; // height of a spectrum strip
const SPEC1_Y = 96; // top strip (point A)
const SPEC2_Y = 176; // bottom strip (point B)

// Prompt-token row (bottom band).
const TOK_Y = 324;
const TOK_H = 26;
const TOK_X = 24;
const TOK_W = VB_W - 48; // full-width 256-d token strip
const N_CELLS = 32; // visual cells standing in for 256 dims

export function VisPointPrompt() {
  // Two clickable points; user can move either by selecting then clicking image.
  const [points, setPoints] = useState<PointDef[]>([
    { px: 18, py: 22, label: "fg" },
    { px: 44, py: 40, label: "bg" },
  ]);
  // Which point the next image-click will move.
  const [active, setActive] = useState<0 | 1>(0);
  // Label assigned to the active point via the fg/bg buttons.
  const [brush, setBrush] = useState<Label>("fg");

  // Place / move the active point when the image is clicked.
  const handleImageClick = (e: React.MouseEvent<SVGRectElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width; // [0,1]
    const fy = (e.clientY - rect.top) / rect.height; // [0,1]
    const px = Math.max(0, Math.min(IMG_PX, Math.round(fx * IMG_PX)));
    const py = Math.max(0, Math.min(IMG_PX, Math.round(fy * IMG_PX)));
    setPoints((prev: PointDef[]) => {
      const next: PointDef[] = [prev[0], prev[1]];
      next[active] = { px, py, label: brush };
      return next;
    });
  };

  // Normalized coords + bands for both points (memoized; pure).
  const derived = useMemo(() => {
    const norm = points.map((p: PointDef) => ({
      nx: (p.px + 0.5) / IMG_PX,
      ny: (p.py + 0.5) / IMG_PX,
    }));
    const bands = norm.map((n: { nx: number; ny: number }) =>
      fourierBands(n.nx, n.ny),
    );
    const sim = similarity(bands[0], bands[1]);
    return { norm, bands, sim };
  }, [points]);

  const labelColor = (l: Label): string => (l === "fg" ? C.green : C.coral);
  const labelFill = (l: Label): string => (l === "fg" ? C.greenFill : C.coralFill);

  // Pixel position of a point inside the image panel.
  const ptX = (p: PointDef): number => IMG_X + (p.px / IMG_PX) * IMG_W;
  const ptY = (p: PointDef): number => IMG_Y + (p.py / IMG_PX) * IMG_H;

  // Render a spectrum strip for point `idx`.
  const renderSpectrum = (idx: 0 | 1, y: number): React.ReactNode => {
    const p = points[idx];
    const bands = derived.bands[idx];
    const accent = labelColor(p.label);
    const mid = y + SPEC_H / 2;
    return (
      <g>
        {/* zero baseline */}
        <line
          x1={SPEC_X}
          y1={mid}
          x2={SPEC_X + SPEC_W}
          y2={mid}
          stroke={C.line}
          strokeWidth={0.8}
        />
        {bands.map((v: number, i: number) => {
          const h = (Math.abs(v) * (SPEC_H / 2 - 2));
          const bx = SPEC_X + i * (BAND_W + BAND_GAP);
          const by = v >= 0 ? mid - h : mid;
          return (
            <rect
              key={i}
              x={bx}
              y={by}
              width={BAND_W}
              height={Math.max(0.6, h)}
              fill={accent}
              opacity={0.85}
            />
          );
        })}
      </g>
    );
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Encoding a point prompt: a click is normalized, lifted to a Fourier feature spectrum, then tagged foreground or background and summed into one 256-dimensional prompt token"
      >
        {/* ---- Title band ---- */}
        <text
          x={VB_W / 2}
          y={26}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Encoding a Point Prompt
        </text>
        <text
          x={VB_W / 2}
          y={46}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          normalize -&gt; Fourier features -&gt; + label = one 256-d token
        </text>

        {/* ============ STEP 1: image + normalize (left) ============ */}
        <text
          x={IMG_X}
          y={IMG_Y - 8}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="start"
        >
          1. click an image
        </text>
        <rect
          x={IMG_X}
          y={IMG_Y}
          width={IMG_W}
          height={IMG_H}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.2}
          rx={4}
          onClick={handleImageClick}
          style={{ cursor: "crosshair" }}
        />
        {/* faint grid to read it as an image */}
        {Array.from({ length: 3 }).map((_, i: number) => {
          const g = i + 1;
          return (
            <g key={`grid-${i}`} pointerEvents="none">
              <line
                x1={IMG_X + (g * IMG_W) / 4}
                y1={IMG_Y}
                x2={IMG_X + (g * IMG_W) / 4}
                y2={IMG_Y + IMG_H}
                stroke={C.grid}
                strokeWidth={0.8}
              />
              <line
                x1={IMG_X}
                y1={IMG_Y + (g * IMG_H) / 4}
                x2={IMG_X + IMG_W}
                y2={IMG_Y + (g * IMG_H) / 4}
                stroke={C.grid}
                strokeWidth={0.8}
              />
            </g>
          );
        })}
        {/* the two placed points */}
        {points.map((p: PointDef, i: number) => {
          const isActive = i === active;
          return (
            <g key={`pt-${i}`} pointerEvents="none">
              {isActive && (
                <circle
                  cx={ptX(p)}
                  cy={ptY(p)}
                  r={9}
                  fill="none"
                  stroke={labelColor(p.label)}
                  strokeWidth={1.2}
                  strokeDasharray="2 2"
                />
              )}
              <circle
                cx={ptX(p)}
                cy={ptY(p)}
                r={5.5}
                fill={labelFill(p.label)}
                stroke={labelColor(p.label)}
                strokeWidth={2}
              />
              <text
                x={ptX(p)}
                y={ptY(p) + 3}
                fontFamily={MONO}
                fontSize={8}
                fill={labelColor(p.label)}
                textAnchor="middle"
              >
                {i === 0 ? "A" : "B"}
              </text>
            </g>
          );
        })}

        {/* normalize readout under the image (own band) */}
        <text
          x={IMG_X}
          y={IMG_Y + IMG_H + 18}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="start"
        >
          2. normalize: (x+.5)/{IMG_PX}
        </text>
        {points.map((p: PointDef, i: number) => {
          const n = derived.norm[i];
          return (
            <text
              key={`norm-${i}`}
              x={IMG_X}
              y={IMG_Y + IMG_H + 18 + 16 * (i + 1)}
              fontFamily={MONO}
              fontSize={9}
              fill={labelColor(p.label)}
              textAnchor="start"
            >
              {`${i === 0 ? "A" : "B"} (${n.nx.toFixed(2)}, ${n.ny.toFixed(2)}) ${p.label}`}
            </text>
          );
        })}

        {/* ============ STEP 2: Fourier spectra (right) ============ */}
        <text
          x={SPEC_X}
          y={SPEC1_Y - 22}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="start"
        >
          3. Fourier features: sin(2&#960; B&#183;x)
        </text>
        <text
          x={SPEC_X}
          y={SPEC1_Y - 8}
          fontFamily={MONO}
          fontSize={9}
          fill={labelColor(points[0].label)}
          textAnchor="start"
        >
          point A spectrum
        </text>
        {renderSpectrum(0, SPEC1_Y)}

        <text
          x={SPEC_X}
          y={SPEC2_Y - 8}
          fontFamily={MONO}
          fontSize={9}
          fill={labelColor(points[1].label)}
          textAnchor="start"
        >
          point B spectrum
        </text>
        {renderSpectrum(1, SPEC2_Y)}

        {/* similarity readout (own line, below the two strips) */}
        <text
          x={SPEC_X}
          y={SPEC2_Y + SPEC_H + 18}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.ink}
          textAnchor="start"
        >
          {`encoding similarity A~B: ${(derived.sim * 100).toFixed(0)}%`}
        </text>
        <text
          x={SPEC_X}
          y={SPEC2_Y + SPEC_H + 32}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="start"
        >
          {derived.sim > 0.75
            ? "nearby clicks -> similar codes"
            : "far-apart clicks -> different codes"}
        </text>

        {/* ============ STEP 3: prompt token (bottom band) ============ */}
        <text
          x={TOK_X}
          y={TOK_Y - 26}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="start"
        >
          4. + learned label embedding = 256-d prompt token
        </text>
        {/* render one token per point, stacked */}
        {points.map((p: PointDef, idx: number) => {
          const bands = derived.bands[idx];
          const accent = labelColor(p.label);
          const rowY = TOK_Y + idx * (TOK_H + 14);
          return (
            <g key={`tok-${idx}`}>
              <text
                x={TOK_X}
                y={rowY - 4}
                fontFamily={MONO}
                fontSize={9}
                fill={accent}
                textAnchor="start"
              >
                {`token ${idx === 0 ? "A" : "B"} (${p.label})`}
              </text>
              {Array.from({ length: N_CELLS }).map((_, c: number) => {
                // tile the 8 bands across 32 cells, modulated by the label sign
                const v = bands[c % N_BANDS];
                const labelBias = p.label === "fg" ? 0.18 : -0.18;
                const t = Math.max(0, Math.min(1, (v + labelBias + 1) / 2));
                const cw = TOK_W / N_CELLS;
                return (
                  <rect
                    key={c}
                    x={TOK_X + c * cw}
                    y={rowY}
                    width={cw - 0.6}
                    height={TOK_H}
                    fill={accent}
                    opacity={0.18 + 0.72 * t}
                  />
                );
              })}
              <rect
                x={TOK_X}
                y={rowY}
                width={TOK_W}
                height={TOK_H}
                fill="none"
                stroke={accent}
                strokeWidth={1.2}
              />
            </g>
          );
        })}

        {/* ============ Caption band (bottom) ============ */}
        <text
          x={VB_W / 2}
          y={VB_H - 28}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Normalize, lift to a high-dim Fourier vector, then tag it fg or bg -
        </text>
        <text
          x={VB_W / 2}
          y={VB_H - 14}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          one 256-dim token per click.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setActive(0)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={active === 0 ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          move point A
        </button>
        <button
          type="button"
          onClick={() => setActive(1)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={active === 1 ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          move point B
        </button>
        <button
          type="button"
          onClick={() => {
            setBrush("fg");
            setPoints((prev: PointDef[]) => {
              const next: PointDef[] = [prev[0], prev[1]];
              next[active] = { ...next[active], label: "fg" };
              return next;
            });
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={brush === "fg" ? { background: C.green, color: "var(--background)" } : undefined}
        >
          foreground
        </button>
        <button
          type="button"
          onClick={() => {
            setBrush("bg");
            setPoints((prev: PointDef[]) => {
              const next: PointDef[] = [prev[0], prev[1]];
              next[active] = { ...next[active], label: "bg" };
              return next;
            });
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={brush === "bg" ? { background: C.coral, color: "var(--background)" } : undefined}
        >
          background
        </button>
        <span className="font-mono text-[var(--muted)]">
          Click the image to move the selected point.
        </span>
      </div>
    </div>
  );
}
