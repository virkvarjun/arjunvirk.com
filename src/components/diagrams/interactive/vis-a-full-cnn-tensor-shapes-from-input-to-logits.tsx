"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// A Full CNN: Tensor Shapes From Input to Logits.
// The network is drawn left-to-right as a sequence of volumes. As we go deeper,
// the spatial size (H, W) shrinks while the channel depth grows, then the volume
// is collapsed by global average pooling into a vector, mapped by a fully
// connected layer to class scores, and turned into probabilities by softmax.
// Hover/step a stage to read its exact layer config and output shape; "trace"
// animates one image flowing through; trend curves show H,W falling and C rising.

type Stage = {
  readonly key: string;
  readonly kind: "vol" | "vec";
  readonly c: number; // channels (or vector length)
  readonly hw: number; // spatial side; 0 for vectors
  readonly label: string; // short shape label drawn under the block
  readonly title: string; // name of the operation that produced this tensor
  readonly cfg: readonly string[]; // layer config lines for the readout band
};

// Hard-coded pipeline (deterministic). Shapes are (C, H, W); vectors are (C,).
const STAGES: readonly Stage[] = [
  {
    key: "input",
    kind: "vol",
    c: 3,
    hw: 224,
    label: "(3,224,224)",
    title: "input image",
    cfg: ["RGB pixels", "3 channels x 224 x 224"],
  },
  {
    key: "stem",
    kind: "vol",
    c: 64,
    hw: 56,
    label: "(64,56,56)",
    title: "stem",
    cfg: ["conv 7x7, stride 2, pad 3", "+ maxpool 3x3, stride 2", "224 -> 56, depth 3 -> 64"],
  },
  {
    key: "s2",
    kind: "vol",
    c: 128,
    hw: 28,
    label: "(128,28,28)",
    title: "stage 2",
    cfg: ["conv 3x3, stride 2, pad 1", "56 -> 28, depth 64 -> 128"],
  },
  {
    key: "s3",
    kind: "vol",
    c: 256,
    hw: 14,
    label: "(256,14,14)",
    title: "stage 3",
    cfg: ["conv 3x3, stride 2, pad 1", "28 -> 14, depth 128 -> 256"],
  },
  {
    key: "s4",
    kind: "vol",
    c: 512,
    hw: 7,
    label: "(512,7,7)",
    title: "stage 4",
    cfg: ["conv 3x3, stride 2, pad 1", "14 -> 7, depth 256 -> 512"],
  },
  {
    key: "gap",
    kind: "vec",
    c: 512,
    hw: 0,
    label: "(512,)",
    title: "global avg pool",
    cfg: ["average each 7x7 map", "(512,7,7) -> (512,)", "spatial dims collapse"],
  },
  {
    key: "fc",
    kind: "vec",
    c: 1000,
    hw: 0,
    label: "(1000,)",
    title: "fully connected",
    cfg: ["linear 512 -> 1000", "one score per class", "raw logits"],
  },
  {
    key: "softmax",
    kind: "vec",
    c: 1000,
    hw: 0,
    label: "(1000,)",
    title: "softmax",
    cfg: ["exp(z) / sum exp(z)", "logits -> probabilities", "sum to 1"],
  },
];

const N = STAGES.length;

// --- layout constants ---
const W = 580;
const H = 410;

// Horizontal slot for each stage.
const PLOT_X0 = 24;
const PLOT_X1 = W - 24;
const SLOT_W = (PLOT_X1 - PLOT_X0) / N;
const slotCenter = (i: number): number => PLOT_X0 + SLOT_W * (i + 0.5);

// Vertical center of the volume row.
const ROW_Y = 138;

// Map a spatial side (7..224) to a drawn block half-size in px.
function faceHalf(hw: number): number {
  // 224 -> 34, 7 -> 9 (log scale so the shrink reads cleanly)
  const t = (Math.log(hw) - Math.log(7)) / (Math.log(224) - Math.log(7));
  return 9 + t * 25;
}

// Map a channel count (3..1000) to a drawn depth/length in px.
function depthPx(cMax: number): number {
  const t = (Math.log(cMax) - Math.log(3)) / (Math.log(1000) - Math.log(3));
  return 4 + t * 22;
}

// Trend-curve plot band (below the drawing).
const TREND_X0 = 60;
const TREND_X1 = W - 24;
const TREND_Y0 = 250; // top (high value)
const TREND_Y1 = 312; // bottom (low value)

// log-scale value -> y in the trend band, given [vMin,vMax].
function trendY(v: number, vMin: number, vMax: number): number {
  const t = (Math.log(v) - Math.log(vMin)) / (Math.log(vMax) - Math.log(vMin));
  return TREND_Y1 - t * (TREND_Y1 - TREND_Y0);
}

// Spatial side per stage for the curve (vectors keep last spatial value = collapsed -> 1).
const SPATIAL: readonly number[] = STAGES.map((s) => (s.hw > 0 ? s.hw : 1));
// Channel count per stage for the curve.
const CHANNELS: readonly number[] = STAGES.map((s) => s.c);

export function VisFullCnnShapes() {
  const [active, setActive] = useState<number>(0);
  const [hover, setHover] = useState<number | null>(null);
  const [showTrends, setShowTrends] = useState<boolean>(true);
  const [tracing, setTracing] = useState<boolean>(false);

  // The stage whose config we show: hover wins, else the stepped/traced one.
  const focus = hover !== null ? hover : active;
  const fs = STAGES[focus];

  // --- trace animation: advance `active` one stage at a time ---
  const frame = useRef<number>(0);
  useEffect(() => {
    if (!tracing) return;
    const id = setInterval(() => {
      frame.current += 1;
      setActive((prev: number) => {
        const next = prev + 1;
        if (next >= N) {
          setTracing(false);
          return N - 1;
        }
        return next;
      });
    }, 700);
    return () => clearInterval(id);
  }, [tracing]);

  const startTrace = (): void => {
    setActive(0);
    setHover(null);
    frame.current = 0;
    setTracing(true);
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="A full CNN drawn left to right: spatial dimensions shrink while channel depth grows, then the volume flattens to a vector and class logits"
      >
        {/* Title band */}
        <text x={24} y={24} fontFamily={MONO} fontSize={13} fill={C.ink}>
          A Full CNN: Tensor Shapes From Input to Logits
        </text>
        <text x={24} y={40} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          shape (C,H,W): spatial dims shrink, channels grow, then flatten to logits
        </text>

        {/* Connector line through the stages */}
        <line
          x1={slotCenter(0)}
          y1={ROW_Y}
          x2={slotCenter(N - 1)}
          y2={ROW_Y}
          stroke={C.line}
          strokeWidth={1.2}
        />

        {/* Stages */}
        {STAGES.map((s, i) => {
          const cx = slotCenter(i);
          const isFocus = i === focus;
          const reached = tracing ? i <= active : true;
          const opacity = reached ? 1 : 0.28;

          if (s.kind === "vol") {
            const fh = faceHalf(s.hw);
            const d = depthPx(s.c);
            // Isometric-ish box: front face + top + right side.
            const fx = cx - d / 2;
            const fy = ROW_Y - fh;
            const fw = fh * 2;
            const fhh = fh * 2;
            const fill = isFocus ? C.blueFill : C.card;
            const stroke = isFocus ? C.blue : C.ink;
            return (
              <g
                key={s.key}
                opacity={opacity}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  setTracing(false);
                  setActive(i);
                }}
                style={{ cursor: "pointer" }}
              >
                {/* top face */}
                <polygon
                  points={`${fx},${fy} ${fx + d},${fy - d} ${fx + d + fw},${fy - d} ${fx + fw},${fy}`}
                  fill={isFocus ? C.blueFill : C.grid}
                  stroke={stroke}
                  strokeWidth={1.2}
                />
                {/* right face */}
                <polygon
                  points={`${fx + fw},${fy} ${fx + d + fw},${fy - d} ${fx + d + fw},${fy - d + fhh} ${fx + fw},${fy + fhh}`}
                  fill={isFocus ? C.blueFill : C.grid}
                  stroke={stroke}
                  strokeWidth={1.2}
                />
                {/* front face */}
                <rect
                  x={fx}
                  y={fy}
                  width={fw}
                  height={fhh}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.4}
                />
                {/* invisible hit pad to ease hover */}
                <rect
                  x={cx - SLOT_W / 2 + 2}
                  y={ROW_Y - fh - d - 6}
                  width={SLOT_W - 4}
                  height={fhh + d + 14}
                  fill="transparent"
                />
              </g>
            );
          }

          // vector stage: a thin tall bar of cells
          const barH = 64;
          const barW = 14;
          const bx = cx - barW / 2;
          const by = ROW_Y - barH / 2;
          const isLogits = s.key === "fc";
          const isSoftmax = s.key === "softmax";
          const stroke = isFocus ? C.violet : C.ink;
          const fill = isSoftmax
            ? C.greenFill
            : isLogits
              ? C.coralFill
              : C.blueFill;
          return (
            <g
              key={s.key}
              opacity={opacity}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                setTracing(false);
                setActive(i);
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={bx}
                y={by}
                width={barW}
                height={barH}
                fill={isFocus ? C.violet : fill}
                stroke={stroke}
                strokeWidth={1.4}
                rx={2}
              />
              {/* cell divisions */}
              {[1, 2, 3, 4, 5].map((k) => (
                <line
                  key={k}
                  x1={bx}
                  y1={by + (barH * k) / 6}
                  x2={bx + barW}
                  y2={by + (barH * k) / 6}
                  stroke={isFocus ? "var(--background)" : C.line}
                  strokeWidth={0.8}
                />
              ))}
              <rect
                x={cx - SLOT_W / 2 + 2}
                y={by - 6}
                width={SLOT_W - 4}
                height={barH + 12}
                fill="transparent"
              />
            </g>
          );
        })}

        {/* Per-stage title (above) and shape label (below) — own clear rows */}
        {STAGES.map((s, i) => {
          const cx = slotCenter(i);
          const isFocus = i === focus;
          // alternate the title baseline to avoid neighbor collisions
          const titleY = i % 2 === 0 ? 60 : 74;
          return (
            <g key={`lab-${s.key}`}>
              <text
                x={cx}
                y={titleY}
                fontFamily={MONO}
                fontSize={8.5}
                fill={isFocus ? C.ink : C.muted}
                textAnchor="middle"
              >
                {s.title}
              </text>
              <text
                x={cx}
                y={i % 2 === 0 ? 196 : 210}
                fontFamily={MONO}
                fontSize={8.5}
                fill={isFocus ? C.blue : C.muted}
                textAnchor="middle"
              >
                {s.label}
              </text>
            </g>
          );
        })}

        {/* Trend curves band */}
        {showTrends && (
          <g>
            <text
              x={24}
              y={238}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
            >
              trends (log scale):
            </text>
            <text
              x={150}
              y={238}
              fontFamily={MONO}
              fontSize={9}
              fill={C.coral}
            >
              spatial 224&rarr;7
            </text>
            <text
              x={262}
              y={238}
              fontFamily={MONO}
              fontSize={9}
              fill={C.green}
            >
              channels 3&rarr;512
            </text>

            {/* axis baseline */}
            <line
              x1={TREND_X0}
              y1={TREND_Y1 + 4}
              x2={TREND_X1}
              y2={TREND_Y1 + 4}
              stroke={C.line}
              strokeWidth={1}
            />
            {/* spatial falling curve (coral) */}
            <polyline
              points={SPATIAL.map((v, i) => {
                const x =
                  TREND_X0 + ((TREND_X1 - TREND_X0) * i) / (N - 1);
                return `${x.toFixed(1)},${trendY(v, 1, 224).toFixed(1)}`;
              }).join(" ")}
              fill="none"
              stroke={C.coral}
              strokeWidth={1.6}
            />
            {/* channels rising curve (green) */}
            <polyline
              points={CHANNELS.map((v, i) => {
                const x =
                  TREND_X0 + ((TREND_X1 - TREND_X0) * i) / (N - 1);
                return `${x.toFixed(1)},${trendY(v, 3, 1000).toFixed(1)}`;
              }).join(" ")}
              fill="none"
              stroke={C.green}
              strokeWidth={1.6}
            />
            {/* markers at the focused stage */}
            {(() => {
              const x =
                TREND_X0 + ((TREND_X1 - TREND_X0) * focus) / (N - 1);
              return (
                <g>
                  <circle
                    cx={x}
                    cy={trendY(SPATIAL[focus], 1, 224)}
                    r={3}
                    fill={C.coral}
                  />
                  <circle
                    cx={x}
                    cy={trendY(CHANNELS[focus], 3, 1000)}
                    r={3}
                    fill={C.green}
                  />
                </g>
              );
            })()}
          </g>
        )}

        {/* Readout band (bottom): focused stage config */}
        <line
          x1={24}
          y1={330}
          x2={W - 24}
          y2={330}
          stroke={C.line}
          strokeWidth={1}
        />
        <text x={24} y={348} fontFamily={MONO} fontSize={10.5} fill={C.ink}>
          {fs.title} &rarr; {fs.label}
        </text>
        {fs.cfg.map((line, i) => (
          <text
            key={`cfg-${i}`}
            x={24}
            y={364 + i * 14}
            fontFamily={MONO}
            fontSize={9}
            fill={C.muted}
          >
            {line}
          </text>
        ))}
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setTracing(false);
            setHover(null);
            setActive((p: number) => Math.max(0, p - 1));
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          &larr; step
        </button>
        <button
          type="button"
          onClick={() => {
            setTracing(false);
            setHover(null);
            setActive((p: number) => Math.min(N - 1, p + 1));
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          step &rarr;
        </button>
        <button
          type="button"
          onClick={startTrace}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={tracing ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          trace
        </button>
        <button
          type="button"
          onClick={() => setShowTrends((v: boolean) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={showTrends ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          trends
        </button>
        <span className="font-mono text-[var(--muted)]">
          hover or step a stage to see its layer config and output shape
        </span>
      </div>
    </div>
  );
}
