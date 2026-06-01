"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// The three timesteps of the unrolled RNN. Same shared weights at every step;
// only the input word and the hidden/output indices change.
const STEPS = [
  { word: "the", h: "h1", y: "y1" },
  { word: "cat", h: "h2", y: "y2" },
  { word: "sat", h: "h3", y: "y3" },
] as const;

// How many "lit" stages exist: 0 = nothing, 1..3 = timesteps 1..3 active.
const MAX_STAGE = STEPS.length;

export function TfRnnUnrolled() {
  // active = number of timesteps currently lit (0..3). The Step button advances
  // this, then wraps back to 0. We also keep a continuous interval for "play".
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frame = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      frame.current += 1;
      // advance every ~3 ticks for a gentle cadence
      if (frame.current % 3 === 0) {
        setActive((a) => (a >= MAX_STAGE ? 0 : a + 1));
      }
    }, 240);
    return () => clearInterval(id);
  }, [playing]);

  // --- Layout ---------------------------------------------------------------
  // Columns: source cell, "=", then 3 unrolled timestep columns.
  const cellW = 56;
  const cellH = 30;
  const boxW = 40; // input / output boxes
  const boxH = 24;

  // Vertical bands (top -> bottom)
  const titleY = 20;
  const outY = 60; // output box top edge
  const cellY = 130; // cell box top edge
  const inY = 200; // input box top edge
  const captionY = 268;

  const cellCY = cellY + cellH / 2;

  // Source cell on the far left.
  const srcX = 24;
  const srcCX = srcX + cellW / 2;

  // "=" sign.
  const eqX = srcX + cellW + 22;

  // First unrolled column center, then evenly spaced.
  const colGap = 120;
  const firstColCX = eqX + 30 + cellW / 2;
  const colCX = (i: number) => firstColCX + i * colGap;

  const W = 460;
  const H = 290;

  // A timestep is lit when its index < active.
  const isLit = (i: number) => i < active;
  // A hidden-state arrow (from step i to i+1) is lit once step i+1 is active.
  const arrowLit = (i: number) => i + 1 < active;

  const litCell = (i: number) => (isLit(i) ? C.blue : C.line);
  const litFill = (i: number) => (isLit(i) ? C.blueFill : "var(--card)");

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="RNN unrolled through time: one shared cell reused at three timesteps"
      >
        {/* Title */}
        <text
          x={W / 2}
          y={titleY}
          fontSize={12}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          RNN Unrolled Through Time
        </text>

        {/* ---- Source cell (the shared cell) ---- */}
        <rect
          x={srcX}
          y={cellY}
          width={cellW}
          height={cellH}
          rx={6}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.6}
        />
        <text
          x={srcCX}
          y={cellCY + 4}
          fontSize={11}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.blue}
          fontWeight={600}
        >
          RNN
        </text>
        {/* shared-weights label (two short lines so it fits) */}
        <text
          x={srcCX}
          y={cellY - 20}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          RNN cell
        </text>
        <text
          x={srcCX}
          y={cellY - 9}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          (shared Wx,Wh,Wy)
        </text>
        {/* self-loop hint under the source cell */}
        <text
          x={srcCX}
          y={cellY + cellH + 16}
          fontSize={9}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          loops on h
        </text>

        {/* ---- "=" sign ---- */}
        <text
          x={eqX}
          y={cellCY + 7}
          fontSize={20}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.ink}
          fontWeight={600}
        >
          =
        </text>

        {/* ---- Hidden-state arrows between unrolled cells (under cells) ---- */}
        {[0, 1].map((i) => {
          const x1 = colCX(i) + cellW / 2;
          const x2 = colCX(i + 1) - cellW / 2;
          const lit = arrowLit(i);
          const color = lit ? C.blue : C.line;
          const midX = (x1 + x2) / 2;
          return (
            <g key={`harrow-${i}`}>
              <title>running summary of everything seen so far</title>
              <line
                x1={x1 + 2}
                y1={cellCY}
                x2={x2 - 9}
                y2={cellCY}
                stroke={color}
                strokeWidth={lit ? 2.4 : 1.4}
              />
              <polygon
                points={`${x2},${cellCY} ${x2 - 9},${cellCY - 4.5} ${x2 - 9},${cellCY + 4.5}`}
                fill={color}
              />
              <text
                x={midX}
                y={cellCY - 9}
                fontSize={9.5}
                fontFamily={MONO}
                textAnchor="middle"
                fill={lit ? C.blue : C.muted}
                fontWeight={lit ? 600 : 400}
              >
                {STEPS[i].h} &#8594;
              </text>
            </g>
          );
        })}

        {/* ---- Unrolled timestep columns ---- */}
        {STEPS.map((s, i) => {
          const cx = colCX(i);
          const lit = isLit(i);
          const cellColor = litCell(i);
          const fill = litFill(i);

          // input box -> cell arrow
          const inTop = inY;
          const cellBottom = cellY + cellH;
          // output: cell top -> output box bottom
          const outBottom = outY + boxH;
          const cellTop = cellY;

          return (
            <g key={`step-${i}`}>
              {/* timestep label */}
              <text
                x={cx}
                y={titleY + 22}
                fontSize={9}
                fontFamily={MONO}
                textAnchor="middle"
                fill={lit ? C.blue : C.muted}
                fontWeight={lit ? 600 : 400}
              >
                {`t=${i + 1}`}
              </text>

              {/* output box (top) */}
              <rect
                x={cx - boxW / 2}
                y={outY}
                width={boxW}
                height={boxH}
                rx={5}
                fill={lit ? C.greenFill : "var(--card)"}
                stroke={lit ? C.green : C.line}
                strokeWidth={1.4}
              />
              <text
                x={cx}
                y={outY + boxH / 2 + 4}
                fontSize={11}
                fontFamily={MONO}
                textAnchor="middle"
                fill={lit ? C.green : C.muted}
                fontWeight={600}
              >
                {s.y}
              </text>

              {/* arrow cell -> output */}
              <line
                x1={cx}
                y1={cellTop}
                x2={cx}
                y2={outBottom + 9}
                stroke={lit ? C.green : C.line}
                strokeWidth={lit ? 2.2 : 1.3}
              />
              <polygon
                points={`${cx},${outBottom} ${cx - 4.5},${outBottom + 9} ${cx + 4.5},${outBottom + 9}`}
                fill={lit ? C.green : C.line}
              />

              {/* cell box (middle) — identical color/label for all = shared */}
              <rect
                x={cx - cellW / 2}
                y={cellY}
                width={cellW}
                height={cellH}
                rx={6}
                fill={fill}
                stroke={cellColor}
                strokeWidth={1.6}
              />
              <text
                x={cx}
                y={cellCY + 4}
                fontSize={11}
                fontFamily={MONO}
                textAnchor="middle"
                fill={lit ? C.blue : C.muted}
                fontWeight={600}
              >
                {s.h}
              </text>

              {/* arrow input -> cell */}
              <line
                x1={cx}
                y1={inTop}
                x2={cx}
                y2={cellBottom + 9}
                stroke={lit ? C.blue : C.line}
                strokeWidth={lit ? 2.2 : 1.3}
              />
              <polygon
                points={`${cx},${cellBottom} ${cx - 4.5},${cellBottom + 9} ${cx + 4.5},${cellBottom + 9}`}
                fill={lit ? C.blue : C.line}
              />

              {/* input box (bottom) */}
              <rect
                x={cx - boxW / 2}
                y={inY}
                width={boxW}
                height={boxH}
                rx={5}
                fill={lit ? C.blueFill : "var(--card)"}
                stroke={lit ? C.blue : C.line}
                strokeWidth={1.4}
              />
              <text
                x={cx}
                y={inY + boxH / 2 + 4}
                fontSize={10.5}
                fontFamily={MONO}
                textAnchor="middle"
                fill={lit ? C.blue : C.muted}
                fontWeight={600}
              >
                {s.word}
              </text>
            </g>
          );
        })}

        {/* ---- Caption band ---- */}
        <line
          x1={12}
          y1={captionY - 16}
          x2={W - 12}
          y2={captionY - 16}
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={W / 2}
          y={captionY}
          fontSize={9.5}
          fontFamily={MONO}
          textAnchor="middle"
          fill={C.muted}
        >
          Same weights reused at every step — that&apos;s what handles any length.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setActive((a) => (a >= MAX_STAGE ? 0 : a + 1));
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Step
        </button>
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
            setActive(0);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <span style={{ color: C.muted, fontFamily: MONO }}>
          {active === 0
            ? "no timesteps lit yet"
            : `lit through t=${active} — hidden state h carries a running summary of everything seen so far`}
        </span>
      </div>
    </div>
  );
}
