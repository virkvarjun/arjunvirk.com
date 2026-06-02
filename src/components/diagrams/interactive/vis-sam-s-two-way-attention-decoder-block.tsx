"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// --- The four sub-steps of SAM's two-way attention block ---
// Each step describes which group queries which, the arrow direction, and a
// short readout. "dir" controls which way the highlighted arrows flow:
//   "self"      -> tokens attend among themselves (loop on the token group)
//   "t2i"       -> tokens query the image embedding (left -> right)
//   "mlp"       -> point-wise MLP refines the tokens (loop on the token group)
//   "i2t"       -> image embedding queries the tokens (right -> left)
type Dir = "self" | "t2i" | "mlp" | "i2t" | "none";

// The dir values an actual step can take (excludes the inactive "none").
type StepDir = Exclude<Dir, "none">;

type Step = {
  label: string;
  dir: StepDir;
  // Two short readout lines (each kept well under the safe text width).
  read1: string;
  read2: string;
  // Whether this step exists in the contrasted one-way decoder block.
  inOneWay: boolean;
};

const STEPS: Step[] = [
  {
    label: "1. token self-attn",
    dir: "self",
    read1: "Tokens attend to each other:",
    read2: "IoU / mask / prompt tokens mix.",
    inOneWay: true,
  },
  {
    label: "2. token -> image",
    dir: "t2i",
    read1: "Tokens query the image (cross-attn).",
    read2: "Prompts pull in visual context.",
    inOneWay: true,
  },
  {
    label: "3. token MLP",
    dir: "mlp",
    read1: "Point-wise MLP refines each token.",
    read2: "Per-token non-linear update.",
    inOneWay: true,
  },
  {
    label: "4. image -> token",
    dir: "i2t",
    read1: "Image queries the tokens (reverse).",
    read2: "Image features highlight the prompt.",
    inOneWay: false,
  },
];

// --- Geometry (viewBox W x H) ---
const W = 560;
const H = 408;

// Token group (LEFT): a stack of labelled token boxes.
const TOK_X = 80;
const TOK_W = 150;
const TOK_H = 30;
const TOK_GAP = 12;
const TOK_Y0 = 120;
const TOKENS: string[] = ["IoU token", "mask tokens x4", "prompt tokens"];
const tokTop = (i: number): number => TOK_Y0 + i * (TOK_H + TOK_GAP);
const TOK_RIGHT = TOK_X + TOK_W;
const TOK_GROUP_TOP = TOK_Y0 - 10;
const TOK_GROUP_BOT = tokTop(TOKENS.length - 1) + TOK_H + 10;
const TOK_GROUP_CY = (TOK_GROUP_TOP + TOK_GROUP_BOT) / 2;

// Image embedding group (RIGHT): a small flattened grid.
const IMG_X = 370;
const IMG_W = 150;
const GRID_N = 6; // 6x6 stand-in for the 64x64 grid
const CELL = 18;
const GRID_W = GRID_N * CELL;
const GRID_X = IMG_X + (IMG_W - GRID_W) / 2;
const GRID_Y = 150;
const GRID_H = GRID_N * CELL;
const IMG_LEFT = IMG_X;
const IMG_CY = GRID_Y + GRID_H / 2;
const IMG_GROUP_TOP = GRID_Y - 34;
const IMG_GROUP_BOT = GRID_Y + GRID_H + 14;

// Safe text width: anything centered at W/2 must stay within this.
const SAFE_W = W - 24;

// Arrowhead helper: returns polygon points for a head at (x,y) pointing along ang.
const head = (x: number, y: number, ang: number, size: number): string => {
  const a1 = ang + Math.PI - 0.45;
  const a2 = ang + Math.PI + 0.45;
  return `${x},${y} ${x + size * Math.cos(a1)},${y + size * Math.sin(a1)} ${x + size * Math.cos(a2)},${y + size * Math.sin(a2)}`;
};

export function VisTwoWayAttention() {
  const [step, setStep] = useState<number>(0);
  const [twoWay, setTwoWay] = useState<boolean>(true);

  const cur = STEPS[step];
  // In one-way mode the reverse (image -> token) step is greyed out / disabled.
  const stepActive = twoWay || cur.inOneWay;
  const dir: Dir = stepActive ? cur.dir : "none";

  const tokHot = dir === "self" || dir === "t2i" || dir === "mlp";
  const imgHot = dir === "t2i" || dir === "i2t";

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="SAM's two-way attention decoder block: tokens self-attend, tokens cross-attend to the image embedding, an MLP refines the tokens, then the image embedding cross-attends back to the tokens. Information flows in both directions and the block is stacked twice."
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={26}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          SAM's Two-Way Attention Decoder Block
        </text>
        <text
          x={W / 2}
          y={44}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          tokens and image features attend to each other &#8212; stacked x2
        </text>

        {/* "x2 blocks" badge in the top-right corner */}
        <g>
          <rect
            x={W - 78}
            y={56}
            width={62}
            height={20}
            rx={5}
            fill="var(--card)"
            stroke={C.violet}
            strokeWidth={1.2}
          />
          <text
            x={W - 47}
            y={70}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.violet}
            textAnchor="middle"
            fontWeight={600}
          >
            x2 blocks
          </text>
        </g>

        {/* Group labels (above each group, clear of boxes) */}
        <text
          x={TOK_X + TOK_W / 2}
          y={TOK_GROUP_TOP - 12}
          fontFamily={MONO}
          fontSize={10.5}
          fill={C.coral}
          textAnchor="middle"
          fontWeight={600}
        >
          tokens
        </text>
        <text
          x={IMG_X + IMG_W / 2}
          y={IMG_GROUP_TOP - 6}
          fontFamily={MONO}
          fontSize={10.5}
          fill={C.blue}
          textAnchor="middle"
          fontWeight={600}
        >
          image embedding
        </text>
        <text
          x={IMG_X + IMG_W / 2}
          y={IMG_GROUP_TOP + 8}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          64x64 grid, flattened
        </text>

        {/* Group containers */}
        <rect
          x={TOK_X - 12}
          y={TOK_GROUP_TOP}
          width={TOK_W + 24}
          height={TOK_GROUP_BOT - TOK_GROUP_TOP}
          rx={8}
          fill="none"
          stroke={tokHot ? C.coral : C.line}
          strokeWidth={tokHot ? 2 : 1.2}
          strokeDasharray="4 3"
        />
        <rect
          x={IMG_X - 4}
          y={IMG_GROUP_TOP}
          width={IMG_W + 8}
          height={IMG_GROUP_BOT - IMG_GROUP_TOP}
          rx={8}
          fill="none"
          stroke={imgHot ? C.blue : C.line}
          strokeWidth={imgHot ? 2 : 1.2}
          strokeDasharray="4 3"
        />

        {/* Token boxes */}
        {TOKENS.map((t: string, i: number) => {
          const top = tokTop(i);
          return (
            <g key={`tok${i}`}>
              <rect
                x={TOK_X}
                y={top}
                width={TOK_W}
                height={TOK_H}
                rx={5}
                fill={tokHot ? C.coralFill : "var(--card)"}
                stroke={tokHot ? C.coral : C.ink}
                strokeWidth={tokHot ? 1.6 : 1.2}
              />
              <text
                x={TOK_X + TOK_W / 2}
                y={top + TOK_H / 2 + 3.5}
                fontFamily={MONO}
                fontSize={10}
                fill={tokHot ? C.coral : C.ink}
                textAnchor="middle"
                fontWeight={600}
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Image embedding grid cells */}
        {Array.from({ length: GRID_N * GRID_N }).map((_, k: number) => {
          const r = Math.floor(k / GRID_N);
          const c = k % GRID_N;
          return (
            <rect
              key={`cell${k}`}
              x={GRID_X + c * CELL}
              y={GRID_Y + r * CELL}
              width={CELL}
              height={CELL}
              fill={imgHot ? C.blueFill : "var(--card)"}
              stroke={imgHot ? C.blue : C.line}
              strokeWidth={imgHot ? 1.1 : 0.9}
            />
          );
        })}

        {/* --- Sub-step arrows --- */}
        {/* Token self-attention: curved loop on the LEFT of the token group. */}
        {dir === "self" || dir === "mlp" ? (
          <g>
            <path
              d={`M ${TOK_X - 14} ${TOK_GROUP_CY - 34}
                  C ${TOK_X - 52} ${TOK_GROUP_CY - 34},
                    ${TOK_X - 52} ${TOK_GROUP_CY + 34},
                    ${TOK_X - 14} ${TOK_GROUP_CY + 34}`}
              fill="none"
              stroke={C.coral}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            <polygon
              fill={C.coral}
              points={head(TOK_X - 14, TOK_GROUP_CY + 34, -0.55, 8)}
            />
            <text
              x={TOK_X - 36}
              y={TOK_GROUP_CY + 3}
              fontFamily={MONO}
              fontSize={8.5}
              fill={C.coral}
              textAnchor="middle"
              fontWeight={600}
            >
              {dir === "self" ? "self" : "MLP"}
            </text>
          </g>
        ) : null}

        {/* token -> image cross-attention (left to right, upper lane) */}
        {dir === "t2i" ? (
          <g>
            <line
              x1={TOK_RIGHT + 16}
              y1={TOK_GROUP_CY - 12}
              x2={IMG_LEFT - 18}
              y2={IMG_CY - 12}
              stroke={C.coral}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
            <polygon
              fill={C.coral}
              points={head(
                IMG_LEFT - 18,
                IMG_CY - 12,
                Math.atan2(
                  IMG_CY - 12 - (TOK_GROUP_CY - 12),
                  IMG_LEFT - 18 - (TOK_RIGHT + 16),
                ),
                9,
              )}
            />
          </g>
        ) : null}

        {/* image -> token cross-attention (right to left, lower lane) */}
        {dir === "i2t" ? (
          <g>
            <line
              x1={IMG_LEFT - 18}
              y1={IMG_CY + 12}
              x2={TOK_RIGHT + 16}
              y2={TOK_GROUP_CY + 12}
              stroke={C.blue}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
            <polygon
              fill={C.blue}
              points={head(
                TOK_RIGHT + 16,
                TOK_GROUP_CY + 12,
                Math.atan2(
                  TOK_GROUP_CY + 12 - (IMG_CY + 12),
                  TOK_RIGHT + 16 - (IMG_LEFT - 18),
                ),
                9,
              )}
            />
          </g>
        ) : null}

        {/* Faint two-way reference arrows (always visible, both lanes) so the
            two-directional flow reads even on a single step. Drawn faint and
            behind the active bold arrow above; placed in the mid corridor. */}
        <g opacity={0.28}>
          <line
            x1={TOK_RIGHT + 16}
            y1={TOK_GROUP_CY - 12}
            x2={IMG_LEFT - 18}
            y2={IMG_CY - 12}
            stroke={C.coral}
            strokeWidth={1.4}
            strokeDasharray="3 3"
          />
          {twoWay ? (
            <line
              x1={IMG_LEFT - 18}
              y1={IMG_CY + 12}
              x2={TOK_RIGHT + 16}
              y2={TOK_GROUP_CY + 12}
              stroke={C.blue}
              strokeWidth={1.4}
              strokeDasharray="3 3"
            />
          ) : null}
        </g>

        {/* Corridor labels for the two lanes (between the groups, clear of arrows) */}
        <text
          x={(TOK_RIGHT + IMG_LEFT) / 2}
          y={TOK_GROUP_TOP - 12}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.coral}
          textAnchor="middle"
        >
          token &#8594; image
        </text>
        {twoWay ? (
          <text
            x={(TOK_RIGHT + IMG_LEFT) / 2}
            y={IMG_GROUP_BOT + 16}
            fontFamily={MONO}
            fontSize={8.5}
            fill={C.blue}
            textAnchor="middle"
          >
            image &#8594; token
          </text>
        ) : (
          <text
            x={(TOK_RIGHT + IMG_LEFT) / 2}
            y={IMG_GROUP_BOT + 16}
            fontFamily={MONO}
            fontSize={8.5}
            fill={C.muted}
            textAnchor="middle"
          >
            (no reverse)
          </text>
        )}

        {/* --- Readout band (its own clear band below the drawing) --- */}
        <line
          x1={12}
          y1={H - 76}
          x2={W - 12}
          y2={H - 76}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={W / 2}
          y={H - 58}
          fontFamily={MONO}
          fontSize={11}
          fill={stepActive ? C.ink : C.muted}
          textAnchor="middle"
          fontWeight={600}
        >
          {stepActive ? cur.label : `${cur.label}  (one-way: skipped)`}
        </text>
        <text
          x={W / 2}
          y={H - 42}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          {stepActive ? cur.read1 : "Standard decoders only attend one way."}
        </text>
        <text
          x={W / 2}
          y={H - 28}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          {stepActive ? cur.read2 : "The image never queries the tokens back."}
        </text>

        {/* Caption band */}
        <text
          x={W / 2}
          y={H - 9}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          Both ways: prompts gain visual context, image highlights the prompt.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">sub-step:</span>
        {STEPS.map((s: Step, i: number) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStep(i)}
            aria-pressed={step === i}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={step === i ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStep((s: number) => (s + 1) % STEPS.length)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          next &#8594;
        </button>
        <span className="font-mono text-[var(--muted)]">mode:</span>
        <button
          type="button"
          onClick={() => setTwoWay((v: boolean) => !v)}
          aria-pressed={twoWay}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={twoWay ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {twoWay ? "two-way" : "one-way"}
        </button>
      </div>

      <p className="mt-2 font-mono text-xs text-[var(--muted)]">
        Step through the four sub-steps. Toggle two-way vs. a standard one-way
        decoder, where the image never attends back to the tokens.
      </p>
    </div>
  );
}
