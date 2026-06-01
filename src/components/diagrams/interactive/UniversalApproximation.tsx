"use client";

import { useState } from "react";
import { C, MONO, plotCurve } from "../frame";

// A single sigmoid-step building block. Summing many of these can mold the
// blue curve into almost any target shape — the universal approximation idea.
interface Block {
  center: number;
  w: number;
  scale: number;
}

const X0 = -3;
const X1 = 3;
const Y_LO = -2.4;
const Y_HI = 2.4;

// Plot rectangle inside the 420x250 viewBox.
const PX0 = 44;
const PX1 = 404;
const PY0 = 18;
const PY1 = 210;

const mapX = (x: number): number =>
  PX0 + ((x - X0) / (X1 - X0)) * (PX1 - PX0);
const mapY = (y: number): number =>
  PY1 - ((y - Y_LO) / (Y_HI - Y_LO)) * (PY1 - PY0);

const sigmoid = (t: number): number => 1 / (1 + Math.exp(-t));

const target = (x: number): number =>
  Math.sin(2 * x) + 0.4 * Math.cos(5 * x);

const blockAt = (b: Block, x: number): number =>
  b.scale * sigmoid(b.w * (x - b.center));

const sumAt = (blocks: Block[], x: number): number =>
  blocks.reduce((acc, b) => acc + blockAt(b, x), 0);

// Deterministic default for the index-th freshly added block.
const defaultBlock = (index: number): Block => ({
  center: Math.max(X0, Math.min(X1, -2 + index * 0.8)),
  w: 4,
  scale: 1,
});

const fitError = (blocks: Block[]): number => {
  const N = 40;
  let total = 0;
  for (let i = 0; i <= N; i++) {
    const x = X0 + ((X1 - X0) * i) / N;
    total += Math.abs(sumAt(blocks, x) - target(x));
  }
  return total / (N + 1);
};

export function UniversalApproximation() {
  const [blocks, setBlocks] = useState<Block[]>([defaultBlock(0)]);
  const [selected, setSelected] = useState<number>(0);

  const addBlock = (): void => {
    setBlocks((prev) => {
      const next = [...prev, defaultBlock(prev.length)];
      setSelected(next.length - 1);
      return next;
    });
  };

  const removeBlock = (): void => {
    setBlocks((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      setSelected((s) => Math.min(s, Math.max(0, next.length - 1)));
      return next;
    });
  };

  const updateSelected = (key: keyof Block, value: number): void => {
    setBlocks((prev) =>
      prev.map((b, i) => (i === selected ? { ...b, [key]: value } : b)),
    );
  };

  const cur: Block | undefined = blocks[selected];
  const err = fitError(blocks);

  const yTicks = [-2, -1, 0, 1, 2];

  return (
    <div>
      <svg
        viewBox="0 0 420 250"
        className="h-auto w-full"
        role="img"
        aria-label="Universal approximation builder"
      >
        {/* plot frame */}
        <rect
          x={PX0}
          y={PY0}
          width={PX1 - PX0}
          height={PY1 - PY0}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* horizontal gridlines + y labels */}
        {yTicks.map((ty) => (
          <g key={`y${ty}`}>
            <line
              x1={PX0}
              x2={PX1}
              y1={mapY(ty)}
              y2={mapY(ty)}
              stroke={ty === 0 ? C.line : C.grid}
              strokeWidth={ty === 0 ? 1.2 : 1}
            />
            <text
              x={PX0 - 6}
              y={mapY(ty) + 3}
              fontSize={9}
              fill={C.muted}
              fontFamily={MONO}
              textAnchor="end"
            >
              {ty}
            </text>
          </g>
        ))}

        {/* x axis ticks + labels */}
        {[-3, -2, -1, 0, 1, 2, 3].map((tx) => (
          <g key={`x${tx}`}>
            <line
              x1={mapX(tx)}
              x2={mapX(tx)}
              y1={PY1}
              y2={PY1 + 4}
              stroke={C.line}
              strokeWidth={1}
            />
            <text
              x={mapX(tx)}
              y={PY1 + 15}
              fontSize={9}
              fill={C.muted}
              fontFamily={MONO}
              textAnchor="middle"
            >
              {tx}
            </text>
          </g>
        ))}

        {/* target curve (faint dashed) */}
        <polyline
          fill="none"
          stroke={C.muted}
          strokeWidth={1.6}
          strokeDasharray="4 3"
          points={plotCurve(target, X0, X1, 160, mapX, mapY)}
        />

        {/* running sum approximation */}
        <polyline
          fill="none"
          stroke={C.blue}
          strokeWidth={2.2}
          points={plotCurve(
            (x: number) => sumAt(blocks, x),
            X0,
            X1,
            160,
            mapX,
            mapY,
          )}
        />

        {/* marker for the selected block's center */}
        {cur && (
          <line
            x1={mapX(cur.center)}
            x2={mapX(cur.center)}
            y1={PY0}
            y2={PY1}
            stroke={C.coral}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}

        {/* legend */}
        <text x={PX0 + 4} y={PY0 + 12} fontSize={9} fill={C.muted} fontFamily={MONO}>
          target (dashed)  ·  S(x) = Σ blocks
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <button
          type="button"
          onClick={addBlock}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          + add block
        </button>
        <button
          type="button"
          onClick={removeBlock}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          − remove
        </button>

        <span className="font-mono text-[var(--muted)]">
          blocks: {blocks.length}
        </span>
        <span className="font-mono text-[var(--muted)]">
          err: {err.toFixed(3)}
        </span>

        {cur && (
          <>
            <span className="font-mono text-[var(--muted)]">
              block {selected + 1}
            </span>
            <label className="flex items-center gap-1 font-mono text-[var(--muted)]">
              center
              <input
                type="range"
                min={-3}
                max={3}
                step={0.1}
                value={cur.center}
                onChange={(e) => updateSelected("center", Number(e.target.value))}
                className="w-24 accent-[var(--foreground)]"
              />
              {cur.center.toFixed(1)}
            </label>
            <label className="flex items-center gap-1 font-mono text-[var(--muted)]">
              w
              <input
                type="range"
                min={0.5}
                max={12}
                step={0.1}
                value={cur.w}
                onChange={(e) => updateSelected("w", Number(e.target.value))}
                className="w-24 accent-[var(--foreground)]"
              />
              {cur.w.toFixed(1)}
            </label>
            <label className="flex items-center gap-1 font-mono text-[var(--muted)]">
              scale
              <input
                type="range"
                min={-2}
                max={2}
                step={0.1}
                value={cur.scale}
                onChange={(e) => updateSelected("scale", Number(e.target.value))}
                className="w-24 accent-[var(--foreground)]"
              />
              {cur.scale.toFixed(1)}
            </label>
          </>
        )}
      </div>
    </div>
  );
}
