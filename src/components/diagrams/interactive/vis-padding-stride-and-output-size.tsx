"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// Output size for a 1-D conv axis: floor((input + 2p - k)/s) + 1, clamped to >=1.
function outputSize(input: number, k: number, p: number, s: number): number {
  const raw = Math.floor((input + 2 * p - k) / s) + 1;
  return Math.max(1, raw);
}

// A preset matching the guide text. The displayed input/output strings use the
// real CNN numbers (224, 112, 5, 3); the grid itself renders a small,
// illustrative version with the same k/p/s so the geometry stays legible.
type Preset = {
  key: string;
  label: string;
  // Real numbers quoted in the readout.
  realIn: number;
  // Small illustrative grid size (so cells stay big enough to read).
  gridIn: number;
  k: number;
  p: number;
  s: number;
};

const PRESETS: Preset[] = [
  { key: "same", label: "same pad 224->224", realIn: 224, gridIn: 5, k: 3, p: 1, s: 1 },
  { key: "stride2", label: "stride-2 224->112", realIn: 224, gridIn: 6, k: 3, p: 1, s: 2 },
  { key: "valid", label: "no pad 5->3", realIn: 5, gridIn: 5, k: 3, p: 0, s: 1 },
];

export function VisPaddingStride() {
  // Grid (illustrative) input side length, kernel, padding, stride.
  const [gridIn, setGridIn] = useState<number>(5);
  const [k, setK] = useState<number>(3);
  const [p, setP] = useState<number>(1);
  const [s, setS] = useState<number>(1);
  // Which valid kernel position is highlighted (flattened row-major index).
  const [pos, setPos] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);
  const [active, setActive] = useState<string>("same");

  const frame = useRef<number>(0);

  // Padded side length and per-axis output count.
  const padded = gridIn + 2 * p;
  const outN = outputSize(gridIn, k, p, s);

  // Valid top-left positions along one axis (the kernel must stay in-bounds).
  const positions: number[] = [];
  for (let i = 0; i + k <= padded; i += s) positions.push(i);
  const totalPos = positions.length * positions.length; // 2-D sweep count

  // Animate the kernel sweep across all valid 2-D positions.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      frame.current += 1;
      setPos((prev) => (totalPos > 0 ? (prev + 1) % totalPos : 0));
    }, 650);
    return () => clearInterval(id);
  }, [playing, totalPos]);

  // Keep pos in range when parameters shrink the position count.
  useEffect(() => {
    if (totalPos > 0 && pos >= totalPos) setPos(0);
  }, [totalPos, pos]);

  const applyPreset = (preset: Preset): void => {
    setGridIn(preset.gridIn);
    setK(preset.k);
    setP(preset.p);
    setS(preset.s);
    setPos(0);
    setActive(preset.key);
  };

  // Clamp kernel so it never exceeds the padded grid (avoids zero positions).
  const onSetK = (v: number): void => {
    setK(Math.min(v, gridIn + 2 * p));
    setActive("");
  };
  const onSetGrid = (v: number): void => {
    setGridIn(v);
    setActive("");
  };
  const onSetP = (v: number): void => {
    setP(v);
    setActive("");
  };
  const onSetS = (v: number): void => {
    setS(v);
    setActive("");
  };

  // --- geometry ---
  const W = 480;
  const H = 470;

  // Input grid block (left). Cell size shrinks as the padded grid grows so the
  // whole block keeps a fixed footprint.
  const inBlockX = 40;
  const inBlockY = 78;
  const inBlockSize = 168;
  const inCell = inBlockSize / padded;

  // Output grid block (right). Fixed footprint, cell sized to outN.
  const outBlockX = 320;
  const outBlockY = 78;
  const outBlockSize = 120;
  const outCell = outN > 0 ? outBlockSize / outN : outBlockSize;

  // Current highlighted 2-D position -> top-left cell (row, col) in padded grid.
  const posRow = positions.length > 0 ? Math.floor(pos / positions.length) : 0;
  const posCol = positions.length > 0 ? pos % positions.length : 0;
  const kRow0 = positions[Math.min(posRow, positions.length - 1)] ?? 0;
  const kCol0 = positions[Math.min(posCol, positions.length - 1)] ?? 0;

  // Cells covered by padding border (outer p ring of the padded grid).
  const isPad = (r: number, col: number): boolean =>
    r < p || col < p || r >= padded - p || col >= padded - p;

  // Real-number readout (uses preset real input if a preset is active).
  const activePreset = PRESETS.find((pr) => pr.key === active);
  const realIn = activePreset ? activePreset.realIn : gridIn;
  const realOut = outputSize(realIn, k, p, s);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="How padding and stride set the output size of a convolution, via floor((input + 2p - k)/s) + 1"
      >
        {/* ---------- Title band ---------- */}
        <text x={16} y={22} fontSize={13} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          Padding, Stride, and Output Size
        </text>
        <text x={16} y={38} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          padding adds a zero border; stride skips positions
        </text>

        {/* ---------- Section labels ---------- */}
        <text x={inBlockX} y={64} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          input {gridIn}x{gridIn} + pad {p}  =  {padded}x{padded}
        </text>
        <text x={outBlockX} y={64} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          output {outN}x{outN}
        </text>

        {/* ---------- Input grid cells ---------- */}
        {Array.from({ length: padded }, (_, r) =>
          Array.from({ length: padded }, (_, col) => {
            const pad = isPad(r, col);
            return (
              <rect
                key={`in-${r}-${col}`}
                x={inBlockX + col * inCell}
                y={inBlockY + r * inCell}
                width={inCell}
                height={inCell}
                fill={pad ? C.coralFill : C.card}
                stroke={C.line}
                strokeWidth={0.8}
              />
            );
          }),
        )}

        {/* kernel window overlay (k x k) at current valid position */}
        <rect
          x={inBlockX + kCol0 * inCell}
          y={inBlockY + kRow0 * inCell}
          width={k * inCell}
          height={k * inCell}
          fill={C.blueFill}
          fillOpacity={0.55}
          stroke={C.blue}
          strokeWidth={2}
        />

        {/* legend for the input grid (below it) */}
        <rect x={inBlockX} y={inBlockY + inBlockSize + 12} width={9} height={9} fill={C.coralFill} stroke={C.line} strokeWidth={0.8} />
        <text x={inBlockX + 14} y={inBlockY + inBlockSize + 20} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          zero pad
        </text>
        <rect x={inBlockX + 78} y={inBlockY + inBlockSize + 12} width={9} height={9} fill={C.blueFill} stroke={C.blue} strokeWidth={1.4} />
        <text x={inBlockX + 92} y={inBlockY + inBlockSize + 20} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          {k}x{k} filter
        </text>

        {/* ---------- Arrow from input to output ---------- */}
        <line
          x1={inBlockX + inBlockSize + 14}
          y1={inBlockY + inBlockSize / 2}
          x2={outBlockX - 14}
          y2={outBlockY + outBlockSize / 2}
          stroke={C.muted}
          strokeWidth={1.4}
        />
        <polygon
          points={`${outBlockX - 14},${outBlockY + outBlockSize / 2} ${outBlockX - 21},${outBlockY + outBlockSize / 2 - 4} ${outBlockX - 21},${outBlockY + outBlockSize / 2 + 4}`}
          fill={C.muted}
        />

        {/* ---------- Output grid cells ---------- */}
        {Array.from({ length: outN }, (_, r) =>
          Array.from({ length: outN }, (_, col) => {
            const hit = r === posRow && col === posCol;
            return (
              <rect
                key={`out-${r}-${col}`}
                x={outBlockX + col * outCell}
                y={outBlockY + r * outCell}
                width={outCell}
                height={outCell}
                fill={hit ? C.blueFill : C.greenFill}
                stroke={hit ? C.blue : C.green}
                strokeWidth={hit ? 1.8 : 0.8}
              />
            );
          }),
        )}
        <text x={outBlockX} y={outBlockY + outBlockSize + 20} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          one cell per filter position
        </text>

        {/* ---------- Formula band ---------- */}
        <line x1={16} y1={328} x2={464} y2={328} stroke={C.line} strokeWidth={1} />
        <text x={16} y={348} fontSize={10} fill={C.ink} fontFamily={MONO} fontWeight={700}>
          output = floor( (input + 2p - k) / s ) + 1
        </text>

        {/* plugged-in numbers (illustrative grid) */}
        <text x={16} y={368} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          grid:
        </text>
        <text x={60} y={368} fontSize={9.5} fill={C.blue} fontFamily={MONO} fontWeight={700}>
          floor( ({gridIn} + 2*{p} - {k}) / {s} ) + 1 = {outN}
        </text>

        {/* plugged-in numbers (real CNN scale) */}
        <text x={16} y={388} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
          real:
        </text>
        <text x={60} y={388} fontSize={9.5} fill={C.green} fontFamily={MONO} fontWeight={700}>
          floor( ({realIn} + 2*{p} - {k}) / {s} ) + 1 = {realOut}
        </text>

        {/* sweep progress readout */}
        <text x={16} y={408} fontSize={9} fill={C.muted} fontFamily={MONO}>
          filter visits {totalPos} positions ({positions.length} per axis)
        </text>

        {/* ---------- Caption band ---------- */}
        <line x1={16} y1={422} x2={464} y2={422} stroke={C.line} strokeWidth={1} />
        <text x={16} y={440} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          Padding keeps size up; stride brings it down.
        </text>
        <text x={16} y={454} fontSize={8.5} fill={C.muted} fontFamily={MONO}>
          One formula predicts the output shape every time.
        </text>
      </svg>

      {/* ---------- Controls ---------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono">preset</span>
        {PRESETS.map((pr) => (
          <button
            key={pr.key}
            type="button"
            onClick={() => applyPreset(pr)}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={active === pr.key ? { background: C.ink, color: "var(--background)" } : undefined}
          >
            {pr.label}
          </button>
        ))}

        <label className="flex items-center gap-1.5 font-mono">
          input
          <input
            type="range"
            min={3}
            max={8}
            step={1}
            value={gridIn}
            onChange={(e) => onSetGrid(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{gridIn}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          kernel k
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={k}
            onChange={(e) => onSetK(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{k}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          padding p
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={p}
            onChange={(e) => onSetP(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{p}</span>
        </label>

        <label className="flex items-center gap-1.5 font-mono">
          stride s
          <input
            type="range"
            min={1}
            max={3}
            step={1}
            value={s}
            onChange={(e) => onSetS(Number(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{s}</span>
        </label>

        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={playing ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          {playing ? "pause" : "play"}
        </button>
      </div>
    </div>
  );
}
