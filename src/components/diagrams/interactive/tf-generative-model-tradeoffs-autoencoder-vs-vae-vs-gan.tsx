"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// viewBox bands top-to-bottom:
//   title (0..26) | column headers (40..58) | latent mini-visuals (62..132) |
//   comparison grid (140..420) | readout band (440..500) | caption (516..548)
const VW = 560;
const VH = 552;

// Three model columns.
type ModelId = "ae" | "vae" | "gan";
const MODELS: { id: ModelId; label: string; accent: string; fill: string }[] = [
  { id: "ae", label: "Autoencoder", accent: C.blue, fill: C.blueFill },
  { id: "vae", label: "VAE", accent: C.green, fill: C.greenFill },
  { id: "gan", label: "GAN", accent: C.coral, fill: C.coralFill },
];

// Comparison axes (rows). Each cell has a short label (fits in box) and a
// one-line explanation shown in the readout band on click.
type RowId =
  | "core"
  | "latent"
  | "generate"
  | "quality"
  | "stability"
  | "bestat";

const ROWS: { id: RowId; label: string }[] = [
  { id: "core", label: "Core idea" },
  { id: "latent", label: "Latent space" },
  { id: "generate", label: "Can generate?" },
  { id: "quality", label: "Sample quality" },
  { id: "stability", label: "Training stab." },
  { id: "bestat", label: "Best at" },
];

// Short in-cell label + full one-line explanation, indexed [row][model].
type Cell = { short: string; tone: "good" | "warn" | "bad" | "neutral"; full: string };

const TABLE: Record<RowId, Record<ModelId, Cell>> = {
  core: {
    ae: {
      short: "encode→decode",
      tone: "neutral",
      full: "Autoencoder: compress input to a code, then reconstruct it back.",
    },
    vae: {
      short: "clouds + KL",
      tone: "neutral",
      full: "VAE: encode to probabilistic clouds, regularised toward a prior by KL.",
    },
    gan: {
      short: "gen vs disc",
      tone: "neutral",
      full: "GAN: a generator and discriminator play an adversarial min-max game.",
    },
  },
  latent: {
    ae: {
      short: "gaps, holes",
      tone: "warn",
      full: "Autoencoder latent: scattered points with empty gaps — not fillable.",
    },
    vae: {
      short: "smooth, packed",
      tone: "good",
      full: "VAE latent: smooth packed clouds — nearby points decode to similar data.",
    },
    gan: {
      short: "implicit noise",
      tone: "neutral",
      full: "GAN latent: implicit; a noise vector is mapped straight to data.",
    },
  },
  generate: {
    ae: {
      short: "No (gaps)",
      tone: "bad",
      full: "Autoencoder cannot generate: sampling random codes hits empty gaps.",
    },
    vae: {
      short: "Yes",
      tone: "good",
      full: "VAE generates: sample the prior, decode to a fresh plausible sample.",
    },
    gan: {
      short: "Yes",
      tone: "good",
      full: "GAN generates: feed random noise to the generator to get a new sample.",
    },
  },
  quality: {
    ae: {
      short: "recon only",
      tone: "neutral",
      full: "Autoencoder quality: n/a — it only reconstructs its inputs.",
    },
    vae: {
      short: "blurry",
      tone: "warn",
      full: "VAE samples are slightly blurry — averaging from the probabilistic prior.",
    },
    gan: {
      short: "sharp",
      tone: "good",
      full: "GAN samples are sharp and realistic — the discriminator punishes blur.",
    },
  },
  stability: {
    ae: {
      short: "stable",
      tone: "good",
      full: "Autoencoder training: stable — a plain reconstruction loss.",
    },
    vae: {
      short: "stable",
      tone: "good",
      full: "VAE training: stable — reconstruction plus a well-behaved KL term.",
    },
    gan: {
      short: "unstable",
      tone: "bad",
      full: "GAN training: can be unstable — mode collapse and oscillation.",
    },
  },
  bestat: {
    ae: {
      short: "compress",
      tone: "neutral",
      full: "Autoencoder is best at compression, denoising, and anomaly detection.",
    },
    vae: {
      short: "smooth gen",
      tone: "neutral",
      full: "VAE is best at smooth generation with a usable, navigable latent space.",
    },
    gan: {
      short: "realism",
      tone: "neutral",
      full: "GAN is best at sharp, photorealistic samples.",
    },
  },
};

// Grid geometry.
const LABEL_W = 108; // width of the left row-label column
const COL_W = 132; // width of each model column
const ROW_H = 44; // height of each comparison row
const GRID_X = 16; // left edge of label column
const GRID_TOP = 140; // top of the first comparison row
const HDR_Y = 52; // baseline of column header text
const VIS_TOP = 64; // top of latent mini-visual band
const VIS_H = 66; // height of latent mini-visual band

const colX = (i: number): number => GRID_X + LABEL_W + i * COL_W;
const rowY = (i: number): number => GRID_TOP + i * ROW_H;

const toneColor = (tone: Cell["tone"]): string => {
  if (tone === "good") return C.green;
  if (tone === "bad") return C.coral;
  if (tone === "warn") return C.violet;
  return C.muted;
};

export function TfGenerativeTradeoffs() {
  // Selected model column to highlight (null = none).
  const [model, setModel] = useState<ModelId | null>("vae");
  // Selected cell to explain (row+model), null = show hint.
  const [sel, setSel] = useState<{ row: RowId; model: ModelId } | null>(null);
  // Toggle: highlight which models can actually generate new data.
  const [showGen, setShowGen] = useState<boolean>(false);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  const selCell: Cell | null = sel ? TABLE[sel.row][sel.model] : null;
  const selModelLabel = sel
    ? MODELS.find((m) => m.id === sel.model)?.label ?? ""
    : "";

  const gridRight = colX(3);
  const gridBottom = rowY(ROWS.length);

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Comparison of Autoencoder, VAE, and GAN across core idea, latent space, ability to generate new data, sample quality, training stability, and what each is best at. Click a cell to read a one-line explanation; toggle to highlight which models can generate."
      >
        {/* Title band */}
        <text
          x={VW / 2}
          y={18}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
        >
          Generative Model Tradeoffs: Autoencoder vs VAE vs GAN
        </text>

        {/* Selected-column highlight band behind everything */}
        {model && (
          <rect
            x={colX(MODELS.findIndex((m) => m.id === model)) - 2}
            y={VIS_TOP - 6}
            width={COL_W - 6}
            height={gridBottom - (VIS_TOP - 6) + 4}
            rx={6}
            fill={MODELS.find((m) => m.id === model)?.fill}
            opacity={0.55}
          />
        )}

        {/* Column headers */}
        {MODELS.map((m, i) => {
          const active = model === m.id;
          return (
            <text
              key={m.id}
              x={colX(i) + (COL_W - 6) / 2}
              y={HDR_Y}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={12}
              fill={active ? m.accent : C.ink}
            >
              {m.label}
            </text>
          );
        })}

        {/* Latent-space mini-visuals, one per column */}
        {MODELS.map((m, i) => {
          const cx = colX(i) + (COL_W - 6) / 2;
          const vx = colX(i) + 6;
          const vw = COL_W - 18;
          const canGen = m.id !== "ae";
          const dimmed = showGen && !canGen;
          const op = dimmed ? 0.25 : 1;
          return (
            <g key={`vis-${m.id}`} opacity={op}>
              <rect
                x={vx}
                y={VIS_TOP}
                width={vw}
                height={VIS_H}
                rx={5}
                fill="var(--card)"
                stroke={model === m.id ? m.accent : C.line}
                strokeWidth={model === m.id ? 1.4 : 1}
              />
              {m.id === "ae" &&
                // scattered dots with gaps
                [
                  [0.18, 0.28],
                  [0.34, 0.7],
                  [0.62, 0.22],
                  [0.8, 0.6],
                  [0.5, 0.45],
                  [0.26, 0.52],
                  [0.72, 0.8],
                ].map(([fx, fy], k) => (
                  <circle
                    key={k}
                    cx={vx + fx * vw}
                    cy={VIS_TOP + 8 + fy * (VIS_H - 26)}
                    r={2.6}
                    fill={C.blue}
                  />
                ))}
              {m.id === "vae" &&
                // smooth packed clouds
                [
                  [0.3, 0.4],
                  [0.55, 0.42],
                  [0.45, 0.62],
                  [0.66, 0.62],
                  [0.4, 0.32],
                ].map(([fx, fy], k) => (
                  <circle
                    key={k}
                    cx={vx + fx * vw}
                    cy={VIS_TOP + 8 + fy * (VIS_H - 26)}
                    r={8}
                    fill={C.greenFill}
                    stroke={C.green}
                    strokeWidth={0.8}
                    opacity={0.8}
                  />
                ))}
              {m.id === "gan" && (
                // noise -> data arrow
                <g>
                  {[
                    [0.16, 0.32],
                    [0.22, 0.6],
                    [0.13, 0.5],
                    [0.25, 0.4],
                  ].map(([fx, fy], k) => (
                    <circle
                      key={k}
                      cx={vx + fx * vw}
                      cy={VIS_TOP + 8 + fy * (VIS_H - 26)}
                      r={1.8}
                      fill={C.muted}
                    />
                  ))}
                  <line
                    x1={vx + 0.34 * vw}
                    y1={VIS_TOP + (VIS_H - 18) / 2}
                    x2={vx + 0.58 * vw}
                    y2={VIS_TOP + (VIS_H - 18) / 2}
                    stroke={C.coral}
                    strokeWidth={1.4}
                  />
                  <path
                    d={`M ${vx + 0.58 * vw} ${VIS_TOP + (VIS_H - 18) / 2} l -5 -3 l 0 6 z`}
                    fill={C.coral}
                  />
                  <rect
                    x={vx + 0.64 * vw}
                    y={VIS_TOP + (VIS_H - 18) / 2 - 9}
                    width={16}
                    height={16}
                    rx={2}
                    fill={C.coralFill}
                    stroke={C.coral}
                    strokeWidth={0.9}
                  />
                </g>
              )}
              <text
                x={cx}
                y={VIS_TOP + VIS_H - 5}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={8}
                fill={C.muted}
              >
                {m.id === "ae"
                  ? "dots + gaps"
                  : m.id === "vae"
                    ? "smooth clouds"
                    : "noise → data"}
              </text>
            </g>
          );
        })}

        {/* Row labels (left column) */}
        {ROWS.map((r, ri) => (
          <text
            key={`rl-${r.id}`}
            x={GRID_X + 2}
            y={rowY(ri) + ROW_H / 2 + 3}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.ink}
          >
            {r.label}
          </text>
        ))}

        {/* Horizontal separators across the grid */}
        {ROWS.map((r, ri) => (
          <line
            key={`sep-${r.id}`}
            x1={GRID_X}
            y1={rowY(ri)}
            x2={gridRight - 6}
            y2={rowY(ri)}
            stroke={C.grid}
            strokeWidth={1}
          />
        ))}
        <line
          x1={GRID_X}
          y1={gridBottom}
          x2={gridRight - 6}
          y2={gridBottom}
          stroke={C.grid}
          strokeWidth={1}
        />

        {/* Cells */}
        {ROWS.map((r, ri) =>
          MODELS.map((m, ci) => {
            const cell = TABLE[r.id][m.id];
            const isSel = sel?.row === r.id && sel?.model === m.id;
            const x = colX(ci) + 4;
            const y = rowY(ri) + 4;
            const w = COL_W - 14;
            const h = ROW_H - 8;
            // For the generate-highlight toggle, emphasise the "generate?" row.
            const genEmph =
              showGen && r.id === "generate" && m.id !== "ae";
            const genDim = showGen && r.id === "generate" && m.id === "ae";
            const tcol = toneColor(cell.tone);
            return (
              <g
                key={`${r.id}-${m.id}`}
                onClick={() => setSel({ row: r.id, model: m.id })}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={4}
                  fill={
                    isSel
                      ? m.fill
                      : genEmph
                        ? C.greenFill
                        : "transparent"
                  }
                  stroke={isSel ? m.accent : genEmph ? C.green : "transparent"}
                  strokeWidth={isSel || genEmph ? 1.3 : 0}
                  opacity={genDim ? 0.4 : 1}
                />
                {/* tone dot */}
                <circle
                  cx={x + 7}
                  cy={y + h / 2}
                  r={2.6}
                  fill={tcol}
                  opacity={genDim ? 0.4 : 1}
                />
                <text
                  x={x + 15}
                  y={y + h / 2 + 3}
                  fontFamily={MONO}
                  fontSize={9}
                  fill={isSel ? C.ink : C.muted}
                  opacity={genDim ? 0.5 : 1}
                >
                  {cell.short}
                </text>
              </g>
            );
          }),
        )}

        {/* Readout band (own clear horizontal band below the grid) */}
        <rect
          x={16}
          y={440}
          width={VW - 32}
          height={60}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {selCell ? (
          <>
            <text
              x={28}
              y={460}
              fontFamily={MONO}
              fontSize={10}
              fill={
                MODELS.find((m) => m.id === sel?.model)?.accent ?? C.ink
              }
            >
              {selModelLabel} · {ROWS.find((r) => r.id === sel?.row)?.label}
            </text>
            <text
              x={28}
              y={480}
              fontFamily={MONO}
              fontSize={10}
              fill={C.ink}
            >
              {selCell.full}
            </text>
          </>
        ) : (
          <>
            <text
              x={28}
              y={464}
              fontFamily={MONO}
              fontSize={10}
              fill={C.muted}
            >
              Click any cell to read a one-line explanation.
            </text>
            <text
              x={28}
              y={482}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              Use the buttons to highlight a model column or who can generate.
            </text>
          </>
        )}

        {/* Caption band */}
        <text
          x={VW / 2}
          y={524}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          Each family trades something: autoencoders give representation,
        </text>
        <text
          x={VW / 2}
          y={540}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          VAEs give smooth generation, GANs give sharpness.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={btn}
            style={
              model === m.id
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
            onClick={() => setModel(model === m.id ? null : m.id)}
          >
            {m.label}
          </button>
        ))}
        <button
          type="button"
          className={btn}
          style={
            showGen ? { background: C.ink, color: "var(--background)" } : undefined
          }
          onClick={() => setShowGen((s) => !s)}
        >
          Who can generate?
        </button>
        {sel && (
          <button type="button" className={btn} onClick={() => setSel(null)}>
            Clear cell
          </button>
        )}
      </div>
    </div>
  );
}
