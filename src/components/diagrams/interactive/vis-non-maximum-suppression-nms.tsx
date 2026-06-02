"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Non-Maximum Suppression (NMS).
// An object detector fires many overlapping boxes for the SAME object, each
// with a confidence score. NMS prunes the duplicates:
//   1. (optional) drop boxes below a confidence threshold,
//   2. sort the survivors by confidence,
//   3. pick the highest-confidence box -> add it to the kept output,
//   4. compute IOU of every remaining box against that kept box,
//   5. suppress (delete) any box whose IOU exceeds the IOU threshold,
//   6. repeat from step 3 on whatever is left.
// We step through pick-and-suppress one round at a time. The IOU slider makes
// suppression more/less aggressive; the confidence slider sets the pre-filter.

// --- box model (hard-coded, deterministic) --------------------------------
type Box = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  score: number; // confidence 0..1
};

// All coordinates are in viewBox units inside the stage. Two clusters: a tight
// cluster of 4 duplicates around the "face", plus 1 looser box that survives.
const BOXES: Box[] = [
  { id: "A", x: 70, y: 102, w: 110, h: 128, score: 0.92 },
  { id: "B", x: 82, y: 116, w: 104, h: 124, score: 0.81 },
  { id: "C", x: 60, y: 88, w: 118, h: 140, score: 0.74 },
  { id: "D", x: 96, y: 130, w: 96, h: 118, score: 0.55 },
  { id: "E", x: 250, y: 104, w: 96, h: 124, score: 0.68 },
];

// --- IOU -------------------------------------------------------------------
function iou(a: Box, b: Box): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const uni = a.w * a.h + b.w * b.h - inter;
  return uni <= 0 ? 0 : inter / uni;
}

type State = "candidate" | "kept" | "suppressed" | "filtered";

type Resolved = {
  status: Map<string, State>; // final state per box id after `rounds` rounds
  current: string | null; // box just picked this round (the new "kept")
  suppressedThisRound: Set<string>; // suppressed by the current pick
  totalRounds: number; // rounds needed to fully resolve
};

// Run NMS for `rounds` pick-and-suppress rounds and report the resulting state.
function runNms(iouThr: number, confThr: number, rounds: number): Resolved {
  const status = new Map<string, State>();
  // confidence pre-filter
  const survivors: Box[] = [];
  for (const b of BOXES) {
    if (b.score < confThr) status.set(b.id, "filtered");
    else {
      status.set(b.id, "candidate");
      survivors.push(b);
    }
  }
  // sort by score desc (stable on score; deterministic)
  survivors.sort((p, q) => q.score - p.score);

  let pool = survivors.slice();
  let done = 0;
  let current: string | null = null;
  let suppressedThisRound = new Set<string>();
  while (pool.length > 0) {
    const pick = pool[0];
    const willApply = done < rounds;
    if (willApply) {
      status.set(pick.id, "kept");
      current = pick.id;
      suppressedThisRound = new Set<string>();
    }
    const rest: Box[] = [];
    for (let i = 1; i < pool.length; i++) {
      const b = pool[i];
      if (iou(pick, b) > iouThr) {
        if (willApply) {
          status.set(b.id, "suppressed");
          suppressedThisRound.add(b.id);
        }
      } else {
        rest.push(b);
      }
    }
    pool = rest;
    done += 1;
  }
  return {
    status,
    current,
    suppressedThisRound,
    totalRounds: countRounds(iouThr, confThr),
  };
}

// Count how many pick-and-suppress rounds fully resolve the pool.
function countRounds(iouThr: number, confThr: number): number {
  const survivors = BOXES.filter((b) => b.score >= confThr).slice();
  survivors.sort((p, q) => q.score - p.score);
  let pool = survivors;
  let rounds = 0;
  while (pool.length > 0) {
    const pick = pool[0];
    pool = pool.filter((b, i) => i !== 0 && iou(pick, b) <= iouThr);
    rounds += 1;
  }
  return rounds;
}

const btn =
  "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

// --- geometry --------------------------------------------------------------
const VB_W = 480;
const VB_H = 384;

const STAGE_X = 16;
const STAGE_Y = 64;
const STAGE_W = 360;
const STAGE_H = 188;

// right-side kept-output panel
const OUT_X = 388;
const OUT_W = 80;

export function VisNms() {
  const [round, setRound] = useState<number>(0);
  const [iouThr, setIouThr] = useState<number>(0.5);
  const [confThr, setConfThr] = useState<number>(0.3);

  const total = countRounds(iouThr, confThr);
  const clampedRound = Math.min(round, total);
  const r = runNms(iouThr, confThr, clampedRound);

  // kept boxes, in pick order (high score first)
  const kept = BOXES.filter((b) => r.status.get(b.id) === "kept").sort(
    (a, b) => b.score - a.score,
  );

  function step(): void {
    setRound((v) => Math.min(v + 1, total));
  }
  function reset(): void {
    setRound(0);
  }

  const done = clampedRound >= total && total > 0;

  // step readout text (kept short to fit width)
  let readout: string;
  if (clampedRound === 0) {
    readout = "Start: 5 candidate boxes, sorted by confidence.";
  } else if (done) {
    readout = `Done: ${kept.length} box(es) kept, duplicates suppressed.`;
  } else {
    const curScore =
      r.current != null
        ? BOXES.find((b) => b.id === r.current)?.score.toFixed(2)
        : "";
    readout = `Round ${clampedRound}: keep box ${r.current} (${curScore}), suppress IOU > ${iouThr.toFixed(2)}.`;
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Non-maximum suppression keeps the highest-confidence box and removes overlapping duplicates"
      >
        {/* ---- title band ---- */}
        <text
          x={VB_W / 2}
          y={24}
          fontSize={13}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          Non-Maximum Suppression (NMS)
        </text>

        {/* ---- step readout band ---- */}
        <text
          x={STAGE_X}
          y={48}
          fontSize={10}
          fill={done ? C.green : C.ink}
          fontFamily={MONO}
        >
          {readout}
        </text>

        {/* ================= STAGE (image with boxes) ================= */}
        <rect
          x={STAGE_X}
          y={STAGE_Y}
          width={STAGE_W}
          height={STAGE_H}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* the "objects": a face blob (left) + a second object (right) */}
        <g opacity={0.5}>
          {/* face */}
          <circle cx={123} cy={150} r={34} fill={C.grid} stroke="none" />
          <circle cx={112} cy={144} r={4} fill={C.muted} />
          <circle cx={134} cy={144} r={4} fill={C.muted} />
          <path
            d="M111 162 Q123 172 135 162"
            fill="none"
            stroke={C.muted}
            strokeWidth={2}
          />
          {/* second object */}
          <circle cx={298} cy={158} r={30} fill={C.grid} stroke="none" />
          <circle cx={288} cy={152} r={3.5} fill={C.muted} />
          <circle cx={308} cy={152} r={3.5} fill={C.muted} />
          <path
            d="M288 168 Q298 176 308 168"
            fill="none"
            stroke={C.muted}
            strokeWidth={2}
          />
        </g>

        {/* detection boxes */}
        {BOXES.map((b) => {
          const st = r.status.get(b.id) ?? "candidate";
          const isKept = st === "kept";
          const isCurrent = b.id === r.current && clampedRound > 0 && !done;
          const isSuppressed = st === "suppressed";
          const isFiltered = st === "filtered";

          const stroke = isKept
            ? C.green
            : isSuppressed
              ? C.coral
              : isFiltered
                ? C.muted
                : C.blue;
          const opacity = isSuppressed || isFiltered ? 0.28 : 1;
          const sw = isCurrent ? 2.6 : isKept ? 2 : 1.2;
          const dash = isFiltered ? "3 3" : undefined;

          // label position: top-left inside the box; small chip
          const labelW = 40;
          const labelH = 13;
          const lx = b.x + 2;
          const ly = b.y + 2;

          return (
            <g key={b.id} opacity={opacity}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={3}
                fill={isKept ? C.greenFill : "none"}
                fillOpacity={isKept ? 0.4 : 0}
                stroke={stroke}
                strokeWidth={sw}
                strokeDasharray={dash}
              />
              {/* score chip (label fits: ~4 chars * 0.6em * 9px = ~22px < 40px) */}
              <rect
                x={lx}
                y={ly}
                width={labelW}
                height={labelH}
                rx={2}
                fill="var(--background)"
                stroke={stroke}
                strokeWidth={0.8}
              />
              <text
                x={lx + labelW / 2}
                y={ly + 9.5}
                fontSize={8.5}
                fill={stroke}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {`${b.id} ${b.score.toFixed(2)}`}
              </text>
            </g>
          );
        })}

        {/* ================= KEPT-OUTPUT PANEL ================= */}
        <text
          x={OUT_X}
          y={STAGE_Y - 4}
          fontSize={9}
          fill={C.green}
          fontFamily={MONO}
          fontWeight={600}
        >
          kept
        </text>
        <rect
          x={OUT_X}
          y={STAGE_Y}
          width={OUT_W}
          height={STAGE_H}
          rx={6}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        {kept.length === 0 ? (
          <text
            x={OUT_X + OUT_W / 2}
            y={STAGE_Y + 26}
            fontSize={8.5}
            fill={C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            (none)
          </text>
        ) : (
          kept.map((b, i) => {
            const cy = STAGE_Y + 12 + i * 26;
            return (
              <g key={`k-${b.id}`}>
                <rect
                  x={OUT_X + 8}
                  y={cy}
                  width={OUT_W - 16}
                  height={20}
                  rx={3}
                  fill={C.greenFill}
                  stroke={C.green}
                  strokeWidth={1}
                />
                <text
                  x={OUT_X + OUT_W / 2}
                  y={cy + 13.5}
                  fontSize={9}
                  fill={C.green}
                  fontFamily={MONO}
                  textAnchor="middle"
                >
                  {`${b.id} ${b.score.toFixed(2)}`}
                </text>
              </g>
            );
          })
        )}

        {/* ================= LEGEND BAND ================= */}
        {(() => {
          const ly = STAGE_Y + STAGE_H + 22;
          const items: { label: string; color: string; dash?: string }[] = [
            { label: "candidate", color: C.blue },
            { label: "kept", color: C.green },
            { label: "suppressed", color: C.coral },
            { label: "below conf", color: C.muted, dash: "3 3" },
          ];
          let cx = STAGE_X;
          return items.map((it) => {
            const x = cx;
            // advance: swatch(14) + gap(4) + text + gap(16)
            const textW = it.label.length * 5.4;
            cx = x + 14 + 4 + textW + 16;
            return (
              <g key={it.label}>
                <rect
                  x={x}
                  y={ly - 9}
                  width={14}
                  height={10}
                  rx={2}
                  fill="none"
                  stroke={it.color}
                  strokeWidth={1.4}
                  strokeDasharray={it.dash}
                />
                <text
                  x={x + 18}
                  y={ly}
                  fontSize={9}
                  fill={C.ink}
                  fontFamily={MONO}
                >
                  {it.label}
                </text>
              </g>
            );
          });
        })()}

        {/* ================= COUNTS READOUT BAND ================= */}
        <text
          x={STAGE_X}
          y={STAGE_Y + STAGE_H + 46}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
        >
          {`boxes: 5   IOU thr: ${iouThr.toFixed(2)}   conf thr: ${confThr.toFixed(2)}   round ${clampedRound}/${total}`}
        </text>
      </svg>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          onClick={step}
          disabled={done}
          style={done ? { opacity: 0.5 } : undefined}
        >
          Step
        </button>
        <button type="button" className={btn} onClick={reset}>
          Reset
        </button>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">IOU thr</span>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={iouThr}
            className="w-28 accent-[var(--foreground)]"
            onChange={(e) => {
              setIouThr(Number(e.target.value));
              setRound(0);
            }}
          />
          <span className="font-mono tabular-nums">{iouThr.toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">conf thr</span>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={confThr}
            className="w-28 accent-[var(--foreground)]"
            onChange={(e) => {
              setConfThr(Number(e.target.value));
              setRound(0);
            }}
          />
          <span className="font-mono tabular-nums">{confThr.toFixed(2)}</span>
        </label>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Keep the most confident box, suppress its high-overlap neighbors,
        repeat - duplicates gone.
      </p>
    </div>
  );
}
