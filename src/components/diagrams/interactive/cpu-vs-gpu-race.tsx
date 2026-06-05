"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// The shared parallel task: apply the same op to 64 independent data tiles.
// CPU = a few powerful cores, each handling one tile per tick (4 tiles/tick),
// so it grinds through all 64 in 16 ticks. GPU = thousands of tiny cores that
// light up a huge swath per tick (32 tiles/tick), finishing in 2 ticks. Same
// total work, wildly different throughput on uniform, independent arithmetic.
const TILES = 64;
const COLS = 8;
const ROWS = 8;
const CPU_PER_TICK = 4; // one tile per big core
const GPU_PER_TICK = 32; // dense small cores fire together
const INTERVAL_MS = 250;

// Panel geometry inside the 440x240 viewBox.
const PANEL_W = 196;
const PANEL_H = 152;
const PANEL_Y = 44;
const CPU_X = 16;
const GPU_X = 228;

// Tile-strip layout shared by both panels. The cell size is bounded by BOTH
// the available width and height so the 8x8 grid always fits inside the panel
// (leaving room for the core badges on top and the captions at the bottom).
const PAD = 14;
const TOP_RESERVE = 30; // CPU big-core badges sit here
const BOT_RESERVE = 18; // rate / progress captions sit here
const CELL = Math.min(
  (PANEL_W - PAD * 2) / COLS,
  (PANEL_H - TOP_RESERVE - BOT_RESERVE) / ROWS,
);
const GRID_W = CELL * COLS;
const GRID_H = CELL * ROWS;

function tilePos(panelX: number, i: number): { x: number; y: number } {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  return {
    x: panelX + (PANEL_W - GRID_W) / 2 + c * CELL,
    y: PANEL_Y + TOP_RESERVE + r * CELL,
  };
}

// CPU big-core badges drawn at the top of the CPU panel.
function cpuCorePos(panelX: number, k: number): { x: number; y: number; w: number } {
  const w = (PANEL_W - PAD * 2) / 4;
  return { x: panelX + PAD + k * w, y: PANEL_Y + 6, w };
}

export function CpuVsGpuRace() {
  const [running, setRunning] = useState(false);
  const [cpuDone, setCpuDone] = useState(0); // tiles processed
  const [gpuDone, setGpuDone] = useState(0);
  const [cpuTicks, setCpuTicks] = useState(0);
  const [gpuTicks, setGpuTicks] = useState(0);

  // Authoritative animation state lives in refs so the interval is pure.
  const cpuRef = useRef(0);
  const gpuRef = useRef(0);
  const cpuTickRef = useRef(0);
  const gpuTickRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      let changed = false;
      if (cpuRef.current < TILES) {
        cpuRef.current = Math.min(TILES, cpuRef.current + CPU_PER_TICK);
        cpuTickRef.current += 1;
        setCpuDone(cpuRef.current);
        setCpuTicks(cpuTickRef.current);
        changed = true;
      }
      if (gpuRef.current < TILES) {
        gpuRef.current = Math.min(TILES, gpuRef.current + GPU_PER_TICK);
        gpuTickRef.current += 1;
        setGpuDone(gpuRef.current);
        setGpuTicks(gpuTickRef.current);
        changed = true;
      }
      if (!changed) setRunning(false);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [running]);

  function onRun(): void {
    if (cpuRef.current >= TILES && gpuRef.current >= TILES) onReset();
    setRunning(true);
  }

  function onReset(): void {
    setRunning(false);
    cpuRef.current = 0;
    gpuRef.current = 0;
    cpuTickRef.current = 0;
    gpuTickRef.current = 0;
    setCpuDone(0);
    setGpuDone(0);
    setCpuTicks(0);
    setGpuTicks(0);
  }

  const cpuFinished = cpuDone >= TILES;
  const gpuFinished = gpuDone >= TILES;

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg
        viewBox="0 0 440 240"
        className="h-auto w-full"
        role="img"
        aria-label="CPU vs GPU"
      >
        {/* Panel headings */}
        <text x={CPU_X} y={16} fontSize={11} fill={C.ink} fontFamily={MONO} fontWeight={600}>
          CPU: a few big cores
        </text>
        <text x={GPU_X} y={16} fontSize={11} fill={C.ink} fontFamily={MONO} fontWeight={600}>
          GPU: thousands of small cores
        </text>

        {/* Tick counters / status */}
        <text x={CPU_X} y={32} fontSize={10} fill={C.coral} fontFamily={MONO}>
          {`CPU: ${cpuTicks} ticks${cpuFinished ? " - DONE" : ""}`}
        </text>
        <text x={GPU_X} y={32} fontSize={10} fill={C.blue} fontFamily={MONO}>
          {`GPU: ${gpuTicks} ticks${gpuFinished ? " - DONE" : ""}`}
        </text>

        {/* Panel frames */}
        <rect
          x={CPU_X}
          y={PANEL_Y}
          width={PANEL_W}
          height={PANEL_H}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <rect
          x={GPU_X}
          y={PANEL_Y}
          width={PANEL_W}
          height={PANEL_H}
          rx={4}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* CPU: 4 large complex cores along the top of its panel */}
        {[0, 1, 2, 3].map((k) => {
          const p = cpuCorePos(CPU_X, k);
          // a core is "busy" while there are still tiles assigned to it
          const active = running && !cpuFinished;
          return (
            <g key={`core${k}`}>
              <rect
                x={p.x + 2}
                y={p.y}
                width={p.w - 4}
                height={20}
                rx={3}
                fill={active ? C.coralFill : "var(--card)"}
                stroke={C.coral}
                strokeWidth={1.2}
              />
              {/* a couple inner lines to read as a "complex" core */}
              <line
                x1={p.x + 6}
                y1={p.y + 7}
                x2={p.x + p.w - 8}
                y2={p.y + 7}
                stroke={C.coral}
                strokeWidth={0.8}
                opacity={0.55}
              />
              <line
                x1={p.x + 6}
                y1={p.y + 13}
                x2={p.x + p.w - 8}
                y2={p.y + 13}
                stroke={C.coral}
                strokeWidth={0.8}
                opacity={0.55}
              />
            </g>
          );
        })}

        {/* Shared 64-tile work strip — CPU panel */}
        {Array.from({ length: TILES }, (_, i) => {
          const p = tilePos(CPU_X, i);
          const on = i < cpuDone;
          return (
            <rect
              key={`cpu${i}`}
              x={p.x + 1}
              y={p.y + 1}
              width={CELL - 2}
              height={CELL - 2}
              rx={1.5}
              fill={on ? C.coralFill : "var(--card)"}
              stroke={on ? C.coral : C.line}
              strokeWidth={on ? 1.1 : 0.8}
            />
          );
        })}

        {/* GPU panel: a dense grid of tiny cores that double as the work tiles */}
        {Array.from({ length: TILES }, (_, i) => {
          const p = tilePos(GPU_X, i);
          const on = i < gpuDone;
          return (
            <rect
              key={`gpu${i}`}
              x={p.x + 1}
              y={p.y + 1}
              width={CELL - 2}
              height={CELL - 2}
              rx={1.5}
              fill={on ? C.blueFill : "var(--card)"}
              stroke={on ? C.blue : C.line}
              strokeWidth={on ? 1.1 : 0.8}
            />
          );
        })}

        {/* Per-panel rate captions */}
        <text
          x={CPU_X + 6}
          y={PANEL_Y + PANEL_H - 6}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          {`${CPU_PER_TICK} tiles / tick`}
        </text>
        <text
          x={GPU_X + 6}
          y={PANEL_Y + PANEL_H - 6}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
        >
          {`${GPU_PER_TICK} tiles / tick`}
        </text>

        {/* Progress counts */}
        <text
          x={CPU_X + PANEL_W - 6}
          y={PANEL_Y + PANEL_H - 6}
          fontSize={8.5}
          fill={C.coral}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`${cpuDone}/${TILES}`}
        </text>
        <text
          x={GPU_X + PANEL_W - 6}
          y={PANEL_Y + PANEL_H - 6}
          fontSize={8.5}
          fill={C.blue}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`${gpuDone}/${TILES}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={onRun} disabled={running}>
          Run
        </button>
        <button type="button" className={btn} onClick={onReset}>
          Reset
        </button>
        <span className="font-mono text-[var(--muted)]">
          Same 64 tiles of work: many simple units in parallel finish in far
          fewer ticks than a few powerful ones.
        </span>
      </div>
    </div>
  );
}
