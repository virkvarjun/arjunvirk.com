"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Why an MLP fails on images.
// Left: flattening a WxHx3 image into a long vector and fully connecting it to
// a hidden layer explodes the first-layer weight count (in_dim * hidden_dim).
// Right: the same object at different positions lights up an entirely different
// set of input neurons, an MLP has no translation invariance.

// Discrete image-size choices for the slider (square side, 3 colour channels).
const SIZES: readonly number[] = [32, 64, 96, 128, 160, 192, 224];

// Discrete hidden-layer width choices for the slider.
const HIDDENS: readonly number[] = [100, 250, 500, 1000, 2000, 4000];

// The four positions the dog can occupy in the right-hand grid (col,row in a
// 4x4 grid). Hard-coded so the diagram is fully deterministic / SSR-safe.
const DOG_POS: readonly { col: number; row: number }[] = [
  { col: 0, row: 0 },
  { col: 3, row: 0 },
  { col: 3, row: 3 },
  { col: 0, row: 3 },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

export function VisWhyMlpFails() {
  const [sizeIdx, setSizeIdx] = useState<number>(6); // default 224
  const [hiddenIdx, setHiddenIdx] = useState<number>(3); // default 1000
  const [dogIdx, setDogIdx] = useState<number>(0);

  const side: number = SIZES[sizeIdx];
  const hidden: number = HIDDENS[hiddenIdx];
  const inDim: number = side * side * 3;
  const params: number = inDim * hidden;

  // ---- left panel geometry: small image grid -> flatten -> hidden column ----
  const gridX = 40;
  const gridY = 88;
  const gridSide = 66; // px size of the drawn image (always 6x6 cells)
  const cells = 6;
  const cell = gridSide / cells;

  // flattened vector strip
  const vecX = gridX + gridSide + 34;
  const vecY = gridY - 6;
  const vecW = 14;
  const vecH = gridSide + 12;

  // hidden-layer column of nodes (drawn as a fixed set of dots)
  const hidX = 226;
  const hidTop = 80;
  const hidBot = 174;
  const hidNodes = 7;

  // ---- right panel geometry ----
  const rGridX = 372;
  const rGridY = 88;
  const rGridSide = 96;
  const rCells = 4;
  const rCell = rGridSide / rCells;
  const dog = DOG_POS[dogIdx];

  // neuron strip below the right grid: 16 neurons (one per cell), the 2 lit by
  // the dog's current 2x2 footprint are highlighted.
  const stripX = rGridX;
  const stripY = rGridY + rGridSide + 26;
  const stripCell = rGridSide / 16;
  const litCells: number[] = [];
  // the dog occupies a 2x2 footprint; map those 4 cells to strip indices.
  for (let r = dog.row; r < dog.row + 2 && r < rCells; r++) {
    for (let c = dog.col; c < dog.col + 2 && c < rCells; c++) {
      litCells.push(r * rCells + c);
    }
  }

  // small "dog" glyph (a simple paw-ish blob) inside a grid cell rect.
  const Dog = (cx: number, cy: number, r: number) => (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.coralFill} stroke={C.coral} strokeWidth={1.4} />
      <circle cx={cx - r * 0.4} cy={cy - r * 0.45} r={r * 0.3} fill={C.coral} />
      <circle cx={cx + r * 0.4} cy={cy - r * 0.45} r={r * 0.3} fill={C.coral} />
      <circle cx={cx} cy={cy + r * 0.25} r={r * 0.4} fill={C.coral} />
    </g>
  );

  return (
    <div>
      <svg
        viewBox="0 0 600 440"
        className="h-auto w-full"
        role="img"
        aria-label="Why an MLP fails on images: flattening explodes the first-layer parameter count and destroys translation invariance"
      >
        {/* Title band */}
        <text x={24} y={26} fontFamily={MONO} fontSize={14} fill={C.ink}>
          Why an MLP Fails on Images
        </text>

        {/* divider between the two panels */}
        <line x1={340} y1={56} x2={340} y2={356} stroke={C.line} strokeWidth={1} strokeDasharray="3 4" />

        {/* ============ LEFT PANEL: parameter explosion ============ */}
        <text x={24} y={52} fontFamily={MONO} fontSize={11} fill={C.blue}>
          Parameter explosion
        </text>

        {/* image grid */}
        <rect
          x={gridX}
          y={gridY}
          width={gridSide}
          height={gridSide}
          fill="var(--card)"
          stroke={C.ink}
          strokeWidth={1.2}
        />
        {Array.from({ length: cells * cells }).map((_, i) => {
          const c = i % cells;
          const r = Math.floor(i / cells);
          // a deterministic checker-ish shading so it reads as an image
          const on = (c + r) % 3 === 0;
          return (
            <rect
              key={i}
              x={gridX + c * cell}
              y={gridY + r * cell}
              width={cell}
              height={cell}
              fill={on ? C.blueFill : "var(--card)"}
              stroke={C.grid}
              strokeWidth={0.5}
            />
          );
        })}
        <text x={gridX + gridSide / 2} y={gridY - 8} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
          {side}×{side}×3
        </text>
        <text x={gridX + gridSide / 2} y={gridY + gridSide + 14} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
          image
        </text>

        {/* flatten arrow */}
        <line
          x1={gridX + gridSide + 4}
          y1={gridY + gridSide / 2}
          x2={vecX - 4}
          y2={gridY + gridSide / 2}
          stroke={C.muted}
          strokeWidth={1.2}
        />
        <polygon
          points={`${vecX - 4},${gridY + gridSide / 2} ${vecX - 10},${gridY + gridSide / 2 - 4} ${vecX - 10},${gridY + gridSide / 2 + 4}`}
          fill={C.muted}
        />
        <text x={gridX + gridSide + 19} y={gridY + gridSide / 2 - 6} fontFamily={MONO} fontSize={8} fill={C.muted} textAnchor="middle">
          flatten
        </text>

        {/* flattened vector strip */}
        <rect x={vecX} y={vecY} width={vecW} height={vecH} fill={C.blueFill} stroke={C.blue} strokeWidth={1.2} />
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={i}
            x1={vecX}
            y1={vecY + ((i + 1) * vecH) / 9}
            x2={vecX + vecW}
            y2={vecY + ((i + 1) * vecH) / 9}
            stroke={C.blue}
            strokeWidth={0.4}
          />
        ))}
        <text x={vecX + vecW / 2} y={vecY - 6} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
          vector
        </text>
        <text x={vecX + vecW / 2} y={vecY + vecH + 13} fontFamily={MONO} fontSize={8.5} fill={C.blue} textAnchor="middle">
          {fmt(inDim)}
        </text>

        {/* dense connections vector -> hidden (drawn faintly) */}
        {Array.from({ length: 9 }).map((_, i) => {
          const y1 = vecY + ((i + 0.5) * vecH) / 9;
          return Array.from({ length: hidNodes }).map((__, j) => {
            const y2 = hidTop + (j * (hidBot - hidTop)) / (hidNodes - 1);
            return (
              <line
                key={`${i}-${j}`}
                x1={vecX + vecW}
                y1={y1}
                x2={hidX}
                y2={y2}
                stroke={C.blue}
                strokeWidth={0.3}
                opacity={0.3}
              />
            );
          });
        })}

        {/* hidden-layer nodes */}
        {Array.from({ length: hidNodes }).map((_, j) => {
          const cy = hidTop + (j * (hidBot - hidTop)) / (hidNodes - 1);
          return <circle key={j} cx={hidX} cy={cy} r={4.5} fill={C.blueFill} stroke={C.blue} strokeWidth={1.2} />;
        })}
        <text x={hidX} y={hidTop - 12} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
          hidden
        </text>
        <text x={hidX} y={hidBot + 18} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
          {fmt(hidden)} units
        </text>

        {/* readout band (its own clear band below the left drawing) */}
        <rect x={24} y={250} width={290} height={58} rx={4} fill="var(--background)" stroke={C.line} strokeWidth={1} />
        <text x={36} y={270} fontFamily={MONO} fontSize={9.5} fill={C.ink}>
          first-layer weights = in × hidden
        </text>
        <text x={36} y={286} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          {fmt(inDim)} × {fmt(hidden)} =
        </text>
        <text x={130} y={286} fontFamily={MONO} fontSize={11} fill={C.coral} fontWeight={600}>
          {params.toLocaleString("en-US")}
        </text>
        <text x={36} y={301} fontFamily={MONO} fontSize={9} fill={C.coral}>
          ≈ {fmt(params)} params in ONE layer
        </text>

        {/* ============ RIGHT PANEL: no translation invariance ============ */}
        <text x={rGridX} y={52} fontFamily={MONO} fontSize={11} fill={C.coral}>
          No translation invariance
        </text>

        {/* image grid with dog at current position */}
        <rect x={rGridX} y={rGridY} width={rGridSide} height={rGridSide} fill="var(--card)" stroke={C.ink} strokeWidth={1.2} />
        {Array.from({ length: rCells * rCells }).map((_, i) => {
          const c = i % rCells;
          const r = Math.floor(i / rCells);
          return (
            <rect
              key={i}
              x={rGridX + c * rCell}
              y={rGridY + r * rCell}
              width={rCell}
              height={rCell}
              fill="none"
              stroke={C.grid}
              strokeWidth={0.6}
            />
          );
        })}
        {/* highlight the dog's 2x2 footprint */}
        <rect
          x={rGridX + dog.col * rCell}
          y={rGridY + dog.row * rCell}
          width={rCell * 2}
          height={rCell * 2}
          fill={C.coralFill}
          opacity={0.45}
          stroke={C.coral}
          strokeWidth={1}
        />
        {Dog(rGridX + (dog.col + 1) * rCell, rGridY + (dog.row + 1) * rCell, rCell * 0.7)}
        <text x={rGridX + rGridSide / 2} y={rGridY - 8} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
          same dog, position {dogIdx + 1}
        </text>

        {/* input-neuron strip: which input neurons "fire" */}
        <text x={stripX} y={stripY - 8} fontFamily={MONO} fontSize={9} fill={C.muted}>
          input neurons that fire:
        </text>
        {Array.from({ length: 16 }).map((_, i) => {
          const lit = litCells.includes(i);
          return (
            <rect
              key={i}
              x={stripX + i * stripCell}
              y={stripY}
              width={stripCell - 1}
              height={12}
              rx={1}
              fill={lit ? C.coral : C.grid}
              stroke={lit ? C.coral : C.line}
              strokeWidth={0.6}
            />
          );
        })}
        <text x={stripX} y={stripY + 30} fontFamily={MONO} fontSize={9} fill={C.coral}>
          → a different set lights up every move
        </text>
        <text x={stripX} y={stripY + 44} fontFamily={MONO} fontSize={9} fill={C.muted}>
          must relearn &quot;dog&quot; for every position
        </text>

        {/* ============ caption band (bottom, full width) ============ */}
        <line x1={24} y1={384} x2={576} y2={384} stroke={C.line} strokeWidth={1} />
        <text x={24} y={404} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          Flattening throws away spatial structure: too many parameters, and the
        </text>
        <text x={24} y={418} fontFamily={MONO} fontSize={9.5} fill={C.muted}>
          same object looks brand-new at every position.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          image size
          <input
            type="range"
            min={0}
            max={SIZES.length - 1}
            step={1}
            value={sizeIdx}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSizeIdx(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">
            {side}×{side}
          </span>
        </label>
        <label className="flex items-center gap-2 font-mono text-[var(--muted)]">
          hidden_dim
          <input
            type="range"
            min={0}
            max={HIDDENS.length - 1}
            step={1}
            value={hiddenIdx}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHiddenIdx(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{fmt(hidden)}</span>
        </label>
        <button
          onClick={() => setDogIdx((d: number) => (d + 1) % DOG_POS.length)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          move the dog →
        </button>
        <span className="font-mono tabular-nums text-[var(--muted)]">
          {params.toLocaleString("en-US")} first-layer params
        </span>
      </div>
    </div>
  );
}
