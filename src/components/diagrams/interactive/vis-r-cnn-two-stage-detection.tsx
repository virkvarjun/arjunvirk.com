"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// ---- Static, deterministic data (no random/date at module load) ----

// A fixed pool of candidate region-proposal boxes drawn over the "image".
// Coordinates are within the image panel's local box (0..IMG_W, 0..IMG_H).
// Hard-coded so render is fully SSR-safe. Each entry: [x, y, w, h, kind]
// kind: 0 = background clutter, 1 = overlaps the true object (a bird-ish blob).
interface Prop {
  x: number;
  y: number;
  w: number;
  h: number;
  obj: boolean; // true if it overlaps the object of interest
}

const IMG_W = 150;
const IMG_H = 132;

// 24 representative proposals (we *render* a subset by the slider; the label
// says "~2000" because real R-CNN proposes that many, we show a sample).
const PROPS: Prop[] = [
  { x: 8, y: 10, w: 30, h: 24, obj: false },
  { x: 52, y: 6, w: 44, h: 30, obj: true },
  { x: 100, y: 12, w: 34, h: 28, obj: false },
  { x: 18, y: 40, w: 38, h: 26, obj: false },
  { x: 60, y: 34, w: 50, h: 40, obj: true },
  { x: 112, y: 44, w: 30, h: 34, obj: false },
  { x: 6, y: 76, w: 36, h: 30, obj: false },
  { x: 58, y: 50, w: 40, h: 46, obj: true },
  { x: 104, y: 80, w: 38, h: 32, obj: false },
  { x: 30, y: 96, w: 44, h: 28, obj: false },
  { x: 72, y: 88, w: 46, h: 36, obj: true },
  { x: 120, y: 14, w: 24, h: 40, obj: false },
  { x: 40, y: 22, w: 28, h: 22, obj: false },
  { x: 84, y: 18, w: 30, h: 26, obj: true },
  { x: 14, y: 58, w: 26, h: 30, obj: false },
  { x: 90, y: 56, w: 34, h: 30, obj: true },
  { x: 46, y: 70, w: 30, h: 38, obj: false },
  { x: 116, y: 96, w: 28, h: 26, obj: false },
  { x: 4, y: 26, w: 22, h: 28, obj: false },
  { x: 66, y: 14, w: 26, h: 24, obj: true },
  { x: 98, y: 38, w: 28, h: 24, obj: false },
  { x: 24, y: 78, w: 28, h: 26, obj: false },
  { x: 78, y: 64, w: 32, h: 34, obj: true },
  { x: 132, y: 64, w: 14, h: 30, obj: false },
];

const MAX_PROPS = PROPS.length;

// ---- Geometry ----
const W = 600;
const H = 532;

// Stage 1 image panel (left).
const IMG_X = 28;
const IMG_Y = 84;

// Stage 2: warp + CNN column (center).
const WARP_X = 250;
const WARP_Y = 96;
const WARP_S = 44; // warped crop square size

const CNN_X = 326;
const CNN_Y = 92;
const CNN_W = 60;
const CNN_H = 56;

// Per-region output chip (right of CNN).
const OUT_X = 410;
const OUT_Y = 96;
const OUT_W = 92;
const OUT_H = 48;

// Post-processing pipeline boxes (bottom band).
const PP_Y = 224;
const PP_H = 36;
const PP_W = 96;
const PP_GAP = 36;
const PP_X0 = 64;

// Readout band y.
const READ_Y = 300;

const STEPS = ["refine box", "NMS", "rescore"] as const;
type Step = (typeof STEPS)[number];

export function VisRcnnTwoStage() {
  const [count, setCount] = useState<number>(12); // proposals shown / processed
  const [running, setRunning] = useState<boolean>(false);
  const [done, setDone] = useState<number>(0); // how many regions classified so far

  const frame = useRef<number>(0);

  // Animation: process proposals one at a time, deliberately slow, to convey
  // that one CNN pass per region does not scale to real time.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setDone((d: number) => {
        const next = d + 1;
        if (next >= count) {
          setRunning(false);
          return count;
        }
        return next;
      });
    }, 320);
    return () => window.clearInterval(id);
  }, [running, count]);

  const startRun = (): void => {
    frame.current = 0;
    setDone(0);
    setRunning(true);
  };

  // The region currently "in the CNN" (during a run), else the last one.
  const activeIdx: number = running ? Math.min(done, count - 1) : -1;

  // Estimated wall-clock cost: real R-CNN ~ 0.02s/region forward pass + selective
  // search; scaled to the spec's ">40s per image" at the full ~2000 proposals.
  const fullProposals = 2000;
  const shownToFull = (count / MAX_PROPS) * fullProposals; // implied real count
  const secs = (shownToFull / fullProposals) * 47; // ~47s at full load

  const active: Prop | null = activeIdx >= 0 ? PROPS[activeIdx] : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="R-CNN two-stage detection: stage one proposes about two thousand candidate region boxes over the image; stage two warps each region to a fixed size and runs a CNN classifier on every single one, producing a class and refined box, followed by box refinement, non-maximum suppression and rescoring. Running one CNN per region makes the original R-CNN very slow, over forty seconds per image."
      >
        {/* ---- Title band ---- */}
        <text
          x={W / 2}
          y={26}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          R-CNN: Two-Stage Detection
        </text>
        <text x={W / 2} y={44} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="middle">
          propose ~2000 regions &#8594; warp each &#8594; run CNN per region &#8594; refine / NMS
        </text>

        {/* ============ STAGE 1: image + region proposals ============ */}
        <text x={IMG_X} y={IMG_Y - 24} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="start">
          Stage 1 &#183; region proposals
        </text>
        <text x={IMG_X} y={IMG_Y - 10} fontFamily={MONO} fontSize={8.5} fill={C.coral} textAnchor="start">
          selective search &#8594; ~2000 boxes
        </text>

        {/* image panel */}
        <rect
          x={IMG_X}
          y={IMG_Y}
          width={IMG_W}
          height={IMG_H}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1.2}
        />
        {/* a simple "object" blob in the image for context */}
        <ellipse
          cx={IMG_X + 78}
          cy={IMG_Y + 62}
          rx={34}
          ry={42}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1}
          opacity={0.6}
        />

        {/* proposal boxes (first `count` of the pool) */}
        {PROPS.slice(0, count).map((p: Prop, i: number) => {
          const isActive = i === activeIdx;
          const classified = running && i < done;
          const stroke = isActive ? C.green : p.obj ? C.coral : C.muted;
          return (
            <rect
              key={i}
              x={IMG_X + p.x}
              y={IMG_Y + p.y}
              width={p.w}
              height={p.h}
              rx={2}
              fill="none"
              stroke={stroke}
              strokeWidth={isActive ? 2 : 1}
              opacity={classified ? 0.85 : isActive ? 1 : 0.5}
            />
          );
        })}

        {/* count badge under the image */}
        <text
          x={IMG_X + IMG_W / 2}
          y={IMG_Y + IMG_H + 16}
          fontFamily={MONO}
          fontSize={9}
          fill={C.ink}
          textAnchor="middle"
        >
          showing {count} of a ~2000-box pool
        </text>

        {/* ---- arrow stage1 -> warp ---- */}
        <line
          x1={IMG_X + IMG_W + 4}
          y1={WARP_Y + WARP_S / 2}
          x2={WARP_X - 10}
          y2={WARP_Y + WARP_S / 2}
          stroke={C.coral}
          strokeWidth={1.4}
        />
        <polygon
          points={`${WARP_X - 10},${WARP_Y + WARP_S / 2} ${WARP_X - 17},${WARP_Y + WARP_S / 2 - 4} ${WARP_X - 17},${WARP_Y + WARP_S / 2 + 4}`}
          fill={C.coral}
        />
        <text
          x={(IMG_X + IMG_W + WARP_X) / 2}
          y={WARP_Y + WARP_S / 2 - 8}
          fontFamily={MONO}
          fontSize={8}
          fill={C.coral}
          textAnchor="middle"
        >
          each
        </text>

        {/* ============ STAGE 2: warp -> CNN -> output (per region) ============ */}
        <text x={WARP_X} y={WARP_Y - 24} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="start">
          Stage 2 &#183; classify every region
        </text>
        <text x={WARP_X} y={WARP_Y - 10} fontFamily={MONO} fontSize={8.5} fill={C.muted} textAnchor="start">
          one CNN forward pass per box
        </text>

        {/* warped crop square */}
        <rect
          x={WARP_X}
          y={WARP_Y}
          width={WARP_S}
          height={WARP_S}
          rx={3}
          fill={active && active.obj ? C.coralFill : C.blueFill}
          stroke={active && active.obj ? C.coral : C.blue}
          strokeWidth={1.4}
        />
        <text
          x={WARP_X + WARP_S / 2}
          y={WARP_Y + WARP_S + 13}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
          textAnchor="middle"
        >
          warp 224&#215;224
        </text>

        {/* arrow warp -> CNN */}
        <line
          x1={WARP_X + WARP_S + 2}
          y1={WARP_Y + WARP_S / 2}
          x2={CNN_X - 6}
          y2={CNN_Y + CNN_H / 2}
          stroke={C.muted}
          strokeWidth={1.2}
        />
        <polygon
          points={`${CNN_X - 6},${CNN_Y + CNN_H / 2} ${CNN_X - 13},${CNN_Y + CNN_H / 2 - 4} ${CNN_X - 13},${CNN_Y + CNN_H / 2 + 4}`}
          fill={C.muted}
        />

        {/* CNN trapezoid (stacked rects suggesting conv stack) */}
        <rect
          x={CNN_X}
          y={CNN_Y}
          width={CNN_W}
          height={CNN_H}
          rx={4}
          fill="var(--card)"
          stroke={C.violet}
          strokeWidth={1.6}
        />
        <rect x={CNN_X + 10} y={CNN_Y + 10} width={CNN_W - 20} height={6} fill={C.blueFill} stroke={C.blue} strokeWidth={0.8} />
        <rect x={CNN_X + 14} y={CNN_Y + 22} width={CNN_W - 28} height={6} fill={C.blueFill} stroke={C.blue} strokeWidth={0.8} />
        <rect x={CNN_X + 18} y={CNN_Y + 34} width={CNN_W - 36} height={6} fill={C.blueFill} stroke={C.blue} strokeWidth={0.8} />
        <text
          x={CNN_X + CNN_W / 2}
          y={CNN_Y + CNN_H + 13}
          fontFamily={MONO}
          fontSize={9}
          fill={C.violet}
          textAnchor="middle"
          fontWeight={600}
        >
          CNN
        </text>

        {/* arrow CNN -> output */}
        <line
          x1={CNN_X + CNN_W + 2}
          y1={CNN_Y + CNN_H / 2}
          x2={OUT_X - 6}
          y2={OUT_Y + OUT_H / 2}
          stroke={C.muted}
          strokeWidth={1.2}
        />
        <polygon
          points={`${OUT_X - 6},${OUT_Y + OUT_H / 2} ${OUT_X - 13},${OUT_Y + OUT_H / 2 - 4} ${OUT_X - 13},${OUT_Y + OUT_H / 2 + 4}`}
          fill={C.muted}
        />

        {/* output chip: class + refined box */}
        <rect
          x={OUT_X}
          y={OUT_Y}
          width={OUT_W}
          height={OUT_H}
          rx={4}
          fill="var(--card)"
          stroke={C.green}
          strokeWidth={1.4}
        />
        <text x={OUT_X + 8} y={OUT_Y + 18} fontFamily={MONO} fontSize={9} fill={C.ink} textAnchor="start">
          class: {active ? (active.obj ? "bird" : "bg") : "-"}
        </text>
        <text x={OUT_X + 8} y={OUT_Y + 36} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="start">
          + refined box
        </text>

        {/* ============ POST-PROCESSING pipeline (bottom band) ============ */}
        <text x={PP_X0} y={PP_Y - 12} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="start">
          Post-processing (over all classified regions)
        </text>
        {STEPS.map((s: Step, i: number) => {
          const x = PP_X0 + i * (PP_W + PP_GAP);
          return (
            <g key={s}>
              <rect
                x={x}
                y={PP_Y}
                width={PP_W}
                height={PP_H}
                rx={5}
                fill={C.greenFill}
                stroke={C.green}
                strokeWidth={1.3}
              />
              <text
                x={x + PP_W / 2}
                y={PP_Y + PP_H / 2 + 3.5}
                fontFamily={MONO}
                fontSize={9.5}
                fill={C.ink}
                textAnchor="middle"
              >
                {s}
              </text>
              {i < STEPS.length - 1 && (
                <g>
                  <line
                    x1={x + PP_W + 2}
                    y1={PP_Y + PP_H / 2}
                    x2={x + PP_W + PP_GAP - 8}
                    y2={PP_Y + PP_H / 2}
                    stroke={C.green}
                    strokeWidth={1.3}
                  />
                  <polygon
                    points={`${x + PP_W + PP_GAP - 8},${PP_Y + PP_H / 2} ${x + PP_W + PP_GAP - 15},${PP_Y + PP_H / 2 - 4} ${x + PP_W + PP_GAP - 15},${PP_Y + PP_H / 2 + 4}`}
                    fill={C.green}
                  />
                </g>
              )}
            </g>
          );
        })}
        {/* final detections chip */}
        {(() => {
          const x = PP_X0 + STEPS.length * (PP_W + PP_GAP);
          return (
            <g>
              <line x1={x - PP_GAP + 2} y1={PP_Y + PP_H / 2} x2={x - 8} y2={PP_Y + PP_H / 2} stroke={C.green} strokeWidth={1.3} />
              <polygon
                points={`${x - 8},${PP_Y + PP_H / 2} ${x - 15},${PP_Y + PP_H / 2 - 4} ${x - 15},${PP_Y + PP_H / 2 + 4}`}
                fill={C.green}
              />
              <text x={x} y={PP_Y + PP_H / 2 + 3.5} fontFamily={MONO} fontSize={9.5} fill={C.green} textAnchor="start" fontWeight={600}>
                detections
              </text>
            </g>
          );
        })()}

        {/* ============ READOUT band ============ */}
        <line x1={24} y1={READ_Y - 16} x2={W - 24} y2={READ_Y - 16} stroke={C.line} strokeWidth={1} />
        <rect
          x={24}
          y={READ_Y - 6}
          width={W - 48}
          height={68}
          rx={6}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />
        {/* progress bar of CNN passes */}
        <text x={40} y={READ_Y + 14} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="start">
          CNN passes
        </text>
        <rect x={120} y={READ_Y + 5} width={300} height={12} rx={3} fill="var(--card)" stroke={C.line} strokeWidth={1} />
        <rect
          x={120}
          y={READ_Y + 5}
          width={(300 * (running ? done : count)) / MAX_PROPS}
          height={12}
          rx={3}
          fill={C.violet}
          opacity={0.85}
        />
        <text x={430} y={READ_Y + 14} fontFamily={MONO} fontSize={9.5} fill={C.ink} textAnchor="start">
          {running ? done : count} / {count}
        </text>

        <text x={40} y={READ_Y + 38} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="start">
          est. compute (scaled to ~2000)
        </text>
        <text x={300} y={READ_Y + 38} fontFamily={MONO} fontSize={9.5} fill={C.coral} textAnchor="start" fontWeight={600}>
          ~{secs.toFixed(1)} s / image
        </text>
        <text x={40} y={READ_Y + 54} fontFamily={MONO} fontSize={9} fill={C.coral} textAnchor="start">
          {running ? "running CNN per region… (deliberately slow)" : ">40 seconds per image (original R-CNN)"}
        </text>

        {/* ============ Caption band (bottom) ============ */}
        <text x={W / 2} y={H - 26} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="middle">
          Propose ~2000 boxes, then classify each: accurate, fully deep,
        </text>
        <text x={W / 2} y={H - 12} fontFamily={MONO} fontSize={9.5} fill={C.muted} textAnchor="middle">
          but far too slow for real time.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={startRun}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={running ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {running ? `running ${done}/${count}` : "run"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setDone(0);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          proposals
          <input
            type="range"
            min={2}
            max={MAX_PROPS}
            step={1}
            value={count}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setRunning(false);
              setDone(0);
              setCount(Number(e.target.value));
            }}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{count}</span>
        </label>
      </div>
    </div>
  );
}
