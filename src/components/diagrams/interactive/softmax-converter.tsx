"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

const CLASSES = ["A", "B", "C", "D", "E"] as const;
const INIT_LOGITS: number[] = [2.0, 1.0, 0.5, -1.0, 0.2];

// Numerically stable softmax with temperature: subtract the max of (z/T)
// before exponentiating so large logits never overflow.
function softmax(logits: number[], t: number): number[] {
  const scaled = logits.map((z) => z / t);
  const m = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function SoftmaxConverter() {
  const [logits, setLogits] = useState<number[]>(INIT_LOGITS);
  const [temp, setTemp] = useState<number>(1.0);

  const probs = softmax(logits, temp);
  const total = probs.reduce((a, b) => a + b, 0);
  const maxP = Math.max(...probs);

  const setLogit = (i: number, v: number) => {
    setLogits((prev) => prev.map((z, j) => (j === i ? v : z)));
  };

  // --- SVG layout ---
  const W = 420;
  const plotLeft = 40;
  const plotRight = 400;
  const top = 24; // y for p = 1.0
  const base = 196; // y for p = 0.0
  const plotH = base - top;
  const slot = (plotRight - plotLeft) / CLASSES.length;
  const barW = slot * 0.56;
  const y = (p: number) => base - p * plotH;

  const tempNote =
    temp < 0.7
      ? "Low T: distribution sharpens toward one confident spike."
      : temp > 1.6
        ? "High T: distribution flattens toward uniform (1/5 each)."
        : "T ≈ 1: standard softmax.";

  return (
    <div>
      <svg
        viewBox="0 0 420 240"
        className="h-auto w-full"
        role="img"
        aria-label="Softmax converter"
      >
        {/* 1.0 reference line */}
        <line
          x1={plotLeft}
          y1={top}
          x2={plotRight}
          y2={top}
          stroke={C.line}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={plotLeft - 5}
          y={top + 3}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          1.0
        </text>
        <text
          x={plotLeft - 5}
          y={base + 3}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          0.0
        </text>

        {/* baseline */}
        <line
          x1={plotLeft}
          y1={base}
          x2={plotRight}
          y2={base}
          stroke={C.ink}
          strokeWidth={1.4}
        />

        {/* bars */}
        {CLASSES.map((letter, i) => {
          const p = probs[i];
          const cx = plotLeft + slot * (i + 0.5);
          const bx = cx - barW / 2;
          const by = y(p);
          const h = base - by;
          const isMax = p === maxP;
          const fill = isMax ? C.greenFill : C.blueFill;
          const stroke = isMax ? C.green : C.blue;
          return (
            <g key={letter}>
              <rect
                x={bx}
                y={by}
                width={barW}
                height={Math.max(0, h)}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.4}
              />
              <text
                x={cx}
                y={by - 4}
                fontSize={10}
                fill={isMax ? C.green : C.ink}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {p.toFixed(2)}
              </text>
              <text
                x={cx}
                y={base + 14}
                fontSize={11}
                fill={C.ink}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {letter}
              </text>
            </g>
          );
        })}

        {/* running total */}
        <text
          x={plotRight}
          y={base + 30}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`Σ p = ${total.toFixed(2)}`}
        </text>

        {/* temperature note */}
        <text
          x={plotLeft}
          y={base + 30}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="start"
        >
          {tempNote}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {CLASSES.map((letter, i) => (
          <label key={letter} className="flex items-center gap-2">
            <span className="font-mono">{`z${i} (${letter})`}</span>
            <input
              type="range"
              min={-5}
              max={5}
              step={0.1}
              value={logits[i]}
              onChange={(e) => setLogit(i, Number(e.target.value))}
              className="w-28 accent-[var(--foreground)]"
            />
            <span className="font-mono tabular-nums w-10">
              {logits[i].toFixed(1)}
            </span>
          </label>
        ))}
        <label className="flex items-center gap-2">
          <span className="font-mono">T</span>
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.1}
            value={temp}
            onChange={(e) => setTemp(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums w-10">{temp.toFixed(1)}</span>
        </label>
      </div>
    </div>
  );
}
