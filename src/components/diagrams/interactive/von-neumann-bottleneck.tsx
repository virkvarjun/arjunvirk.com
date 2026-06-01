"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// The cycle is a fixed sequence of phase ticks. The processor can only act once
// the data it needs has crawled across the single shared channel, so most ticks
// are spent "waiting for memory" (coral) and only one tick is "computing"
// (green). Adding a cache shortens the travel phases dramatically.
type Phase = "fetch" | "compute" | "writeback";

const FETCH_TICKS = 6; // slow crawl: memory -> processor
const COMPUTE_TICKS = 1; // fast: a single bright pulse
const WRITE_TICKS = 6; // slow crawl back: processor -> memory
const CACHED_TRAVEL = 1; // cache hit: travel collapses to ~1 tick each way

// Geometry.
const PROC_X = 36;
const PROC_W = 96;
const MEM_X = 308;
const MEM_W = 96;
const BOX_Y = 30;
const BOX_H = 70;
const CHAN_Y = BOX_Y + BOX_H / 2; // channel centerline
const CHAN_X0 = PROC_X + PROC_W; // left end of channel (processor side)
const CHAN_X1 = MEM_X; // right end of channel (memory side)

// Timeline bar.
const TL_X = 36;
const TL_W = 368;
const TL_Y = 150;
const TL_H = 16;
const TL_SLOTS = 40; // visible history window

interface Tick {
  computing: boolean;
}

// Build the phase plan for one full cycle given current travel length.
function buildPlan(travel: number): Phase[] {
  const plan: Phase[] = [];
  for (let i = 0; i < travel; i++) plan.push("fetch");
  for (let i = 0; i < COMPUTE_TICKS; i++) plan.push("compute");
  for (let i = 0; i < travel; i++) plan.push("writeback");
  return plan;
}

export function VonNeumannBottleneck() {
  const [playing, setPlaying] = useState(false);
  const [cache, setCache] = useState(false);
  const [step, setStep] = useState(0);
  const [computeCount, setComputeCount] = useState(0);
  const [waitCount, setWaitCount] = useState(0);
  const [history, setHistory] = useState<Tick[]>([]);

  // Animation frame counter lives in a ref; the interval mutates it and pushes
  // derived state. We never call setState at the top level of an effect.
  const stepRef = useRef(0);
  const cacheRef = useRef(false);
  cacheRef.current = cache;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      advance(cacheRef.current);
    }, 120);
    return () => clearInterval(id);
    // advance is stable (defined below via closure over setters).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  function advance(cached: boolean) {
    const travel = cached ? CACHED_TRAVEL : FETCH_TICKS;
    const plan = buildPlan(travel);
    const phase = plan[stepRef.current % plan.length];
    const computing = phase === "compute";
    stepRef.current += 1;
    setStep(stepRef.current);
    if (computing) setComputeCount((c) => c + 1);
    else setWaitCount((w) => w + 1);
    setHistory((h) => {
      const next = [...h, { computing }];
      if (next.length > TL_SLOTS) next.shift();
      return next;
    });
  }

  // Derive current phase for rendering (read-only, no state writes).
  const travel = cache ? CACHED_TRAVEL : FETCH_TICKS;
  const plan = buildPlan(travel);
  const cycleLen = plan.length;
  const inCycle = step % cycleLen;
  const phase: Phase = plan[inCycle];
  const computing = phase === "compute";

  // Packet position along the channel for the current travel tick.
  // fetch: packet moves memory(right) -> processor(left)
  // writeback: packet moves processor(left) -> memory(right)
  let packetX: number | null = null;
  let packetColor: string = C.blue;
  if (phase === "fetch") {
    const t = inCycle; // 0..travel-1
    const frac = travel <= 1 ? 0.5 : t / (travel - 1);
    packetX = CHAN_X1 - frac * (CHAN_X1 - CHAN_X0);
    packetColor = C.coral;
  } else if (phase === "writeback") {
    const t = inCycle - travel - COMPUTE_TICKS; // 0..travel-1
    const frac = travel <= 1 ? 0.5 : t / (travel - 1);
    packetX = CHAN_X0 + frac * (CHAN_X1 - CHAN_X0);
    packetColor = C.blue;
  }

  const total = computeCount + waitCount;
  const computePct = total === 0 ? 0 : Math.round((computeCount / total) * 100);

  function reset() {
    setPlaying(false);
    stepRef.current = 0;
    setStep(0);
    setComputeCount(0);
    setWaitCount(0);
    setHistory([]);
  }

  return (
    <div>
      <svg
        viewBox="0 0 440 230"
        className="h-auto w-full"
        role="img"
        aria-label="The von Neumann bottleneck"
      >
        {/* Narrow shared channel between processor and memory. */}
        <rect
          x={CHAN_X0}
          y={CHAN_Y - 5}
          width={CHAN_X1 - CHAN_X0}
          height={10}
          fill="var(--card)"
          stroke={C.line}
        />
        {/* Bottleneck label + bracket on the channel. */}
        <text
          x={(CHAN_X0 + CHAN_X1) / 2}
          y={CHAN_Y - 12}
          fontSize={9}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="middle"
        >
          von Neumann bottleneck
        </text>
        <text
          x={(CHAN_X0 + CHAN_X1) / 2}
          y={CHAN_Y + 24}
          fontSize={8}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          one narrow shared channel
        </text>

        {/* Data packet crawling through the channel. */}
        {packetX !== null && (
          <g>
            <rect
              x={packetX - 6}
              y={CHAN_Y - 4}
              width={12}
              height={8}
              fill={packetColor}
              rx={1.5}
            />
          </g>
        )}

        {/* Cache box (when enabled) sits beside the processor. */}
        {cache && (
          <g>
            <rect
              x={CHAN_X0 + 6}
              y={BOX_Y + 6}
              width={40}
              height={BOX_H - 12}
              fill={C.greenFill}
              stroke={C.green}
              rx={3}
            />
            <text
              x={CHAN_X0 + 26}
              y={CHAN_Y + 3}
              fontSize={9}
              fill={C.green}
              fontFamily={MONO}
              textAnchor="middle"
            >
              cache
            </text>
          </g>
        )}

        {/* Processor box. Bright when computing, dim/idle while waiting. */}
        <rect
          x={PROC_X}
          y={BOX_Y}
          width={PROC_W}
          height={BOX_H}
          fill={computing ? C.greenFill : "var(--card)"}
          stroke={computing ? C.green : C.line}
          strokeWidth={computing ? 2 : 1}
          rx={4}
        />
        <text
          x={PROC_X + PROC_W / 2}
          y={BOX_Y + 24}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          PROCESSOR
        </text>
        <text
          x={PROC_X + PROC_W / 2}
          y={BOX_Y + 46}
          fontSize={10}
          fill={computing ? C.green : C.coral}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {computing ? "computing" : "waiting…"}
        </text>

        {/* Memory box. */}
        <rect
          x={MEM_X}
          y={BOX_Y}
          width={MEM_W}
          height={BOX_H}
          fill="var(--card)"
          stroke={C.line}
          rx={4}
        />
        <text
          x={MEM_X + MEM_W / 2}
          y={BOX_Y + 24}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          MEMORY
        </text>
        <text
          x={MEM_X + MEM_W / 2}
          y={BOX_Y + 46}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          {phase === "fetch" ? "sending →" : "code + data"}
        </text>

        {/* Timeline: each past tick segment colored by what it spent time on. */}
        <text
          x={TL_X}
          y={TL_Y - 6}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          timeline (recent ticks):
        </text>
        <rect
          x={TL_X}
          y={TL_Y}
          width={TL_W}
          height={TL_H}
          fill="var(--background)"
          stroke={C.line}
        />
        {history.map((tick, i) => {
          const sw = TL_W / TL_SLOTS;
          return (
            <rect
              key={i}
              x={TL_X + i * sw}
              y={TL_Y}
              width={sw + 0.5}
              height={TL_H}
              fill={tick.computing ? C.green : C.coralFill}
              stroke={tick.computing ? C.green : C.coral}
              strokeWidth={0.4}
            />
          );
        })}

        {/* Legend + running counts. */}
        <rect x={TL_X} y={TL_Y + 26} width={10} height={10} fill={C.coralFill} stroke={C.coral} />
        <text
          x={TL_X + 16}
          y={TL_Y + 35}
          fontSize={9}
          fill={C.ink}
          fontFamily={MONO}
        >
          {`memory-wait ticks: ${waitCount}`}
        </text>
        <rect x={TL_X + 200} y={TL_Y + 26} width={10} height={10} fill={C.green} />
        <text
          x={TL_X + 216}
          y={TL_Y + 35}
          fontSize={9}
          fill={C.ink}
          fontFamily={MONO}
        >
          {`compute ticks: ${computeCount}`}
        </text>
        <text
          x={TL_X}
          y={TL_Y + 51}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          {`processor busy only ${computePct}% of the time` +
            (cache ? "  (cache hit: channel barely used)" : "")}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            advance(cacheRef.current);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => setCache((c) => !c)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {cache ? "remove cache" : "add cache"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <span className="font-mono text-[var(--muted)]">
          {cache
            ? "cache on — most fetches are local, channel idle"
            : "cache off — every fetch crawls the shared channel"}
        </span>
      </div>
    </div>
  );
}
