"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

interface Part {
  name: string;
  desc: string;
}

const LEVELS = ["Chip", "GPC", "SM", "Inside SM"] as const;

// Parts inside one SM, with rough layout boxes (x,y,w,h) in viewBox units.
const PARTS: Array<Part & { x: number; y: number; w: number; h: number; fill: string }> = [
  {
    name: "CUDA cores",
    desc: "128 scalar FP/INT lanes, the bulk of general-purpose math.",
    x: 24,
    y: 40,
    w: 150,
    h: 96,
    fill: C.blueFill,
  },
  {
    name: "Tensor cores",
    desc: "4 matrix-multiply units, accelerate the GEMMs in deep nets.",
    x: 186,
    y: 40,
    w: 96,
    h: 44,
    fill: C.coralFill,
  },
  {
    name: "Special Function Units",
    desc: "SFUs: fast transcendentals, exp, sin, rsqrt, etc.",
    x: 186,
    y: 92,
    w: 96,
    h: 44,
    fill: C.blueFill,
  },
  {
    name: "Warp schedulers",
    desc: "Pick which 32-thread warp issues an instruction each cycle.",
    x: 294,
    y: 40,
    w: 122,
    h: 44,
    fill: C.blueFill,
  },
  {
    name: "Register file",
    desc: "Per-thread fast storage, 256 KB of registers per SM.",
    x: 294,
    y: 92,
    w: 122,
    h: 44,
    fill: C.greenFill,
  },
  {
    name: "Shared memory / L1",
    desc: "On-chip scratchpad + L1 cache shared by the SM's threads.",
    x: 24,
    y: 144,
    w: 392,
    h: 36,
    fill: C.greenFill,
  },
];

function Box({
  x,
  y,
  w,
  h,
  fill,
  stroke = C.line,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke?: string;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={3} fill={fill} stroke={stroke} strokeWidth={1.2} />;
}

function Caption({ children }: { children: string }) {
  return (
    <text x={220} y={236} fontSize={11} fill={C.muted} fontFamily={MONO} textAnchor="middle">
      {children}
    </text>
  );
}

function Tally({ children }: { children: string }) {
  return (
    <text x={432} y={16} fontSize={9} fill={C.ink} fontFamily={MONO} textAnchor="end">
      {children}
    </text>
  );
}

export function GpuHierarchy() {
  const [level, setLevel] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const tally: Record<number, string> = {
    0: "H100: 132 SMs × 128 = ~16,900 CUDA cores",
    1: "GPC: ~16 SMs × 128 = ~2,000 cores here",
    2: "SM: 128 CUDA + 4 tensor cores",
    3: "1 SM × 132 → 528 tensor cores chip-wide",
  };

  const caption: Record<number, string> = {
    0: "the full chip: clusters wired to a big memory pool",
    1: "one GPC: a Graphics Processing Cluster of SMs",
    2: "one SM: a Streaming Multiprocessor of parts",
    3: "inside one SM: the compute and memory blocks",
  };

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Zoom into the GPU"
      >
        <Tally>{tally[level]}</Tally>

        {level === 0 && (
          <g>
            {/* GPC grid */}
            {Array.from({ length: 8 }).map((_, i) => {
              const col = i % 4;
              const row = Math.floor(i / 4);
              return (
                <g key={i}>
                  <Box x={24 + col * 96} y={36 + row * 70} w={86} h={60} fill={C.blueFill} />
                  <text
                    x={24 + col * 96 + 43}
                    y={36 + row * 70 + 34}
                    fontSize={11}
                    fill={C.ink}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    {`GPC ${i + 1}`}
                  </text>
                </g>
              );
            })}
            {/* outer chip outline */}
            <rect x={14} y={26} width={412} height={154} rx={5} fill="none" stroke={C.line} strokeWidth={1.6} />
            {/* HBM / VRAM bar */}
            <Box x={14} y={190} w={412} h={26} fill={C.greenFill} stroke={C.green} />
            <text x={220} y={207} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="middle">
              HBM / VRAM (80 GB)
            </text>
          </g>
        )}

        {level === 1 && (
          <g>
            <rect x={14} y={26} width={412} height={190} rx={5} fill="none" stroke={C.line} strokeWidth={1.6} />
            <text x={24} y={20} fontSize={11} fill={C.muted} fontFamily={MONO}>
              one GPC
            </text>
            {Array.from({ length: 8 }).map((_, i) => {
              const col = i % 4;
              const row = Math.floor(i / 4);
              return (
                <g key={i}>
                  <Box x={28 + col * 99} y={42 + row * 84} w={88} h={72} fill={C.blueFill} />
                  <text
                    x={28 + col * 99 + 44}
                    y={42 + row * 84 + 40}
                    fontSize={11}
                    fill={C.ink}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    {`SM ${i + 1}`}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {level === 2 && (
          <g>
            <rect x={14} y={26} width={412} height={190} rx={5} fill="none" stroke={C.line} strokeWidth={1.6} />
            <text x={24} y={20} fontSize={11} fill={C.muted} fontFamily={MONO}>
              one SM
            </text>
            {PARTS.map((p) => (
              <Box
                key={p.name}
                x={p.x}
                y={p.y}
                w={p.w}
                h={p.h}
                fill={p.fill}
                stroke={p.fill === C.coralFill ? C.coral : p.fill === C.greenFill ? C.green : C.line}
              />
            ))}
          </g>
        )}

        {level === 3 && (
          <g>
            <rect x={14} y={26} width={412} height={190} rx={5} fill="none" stroke={C.line} strokeWidth={1.6} />
            {PARTS.map((p) => {
              const active = hovered === p.name;
              const stroke =
                p.fill === C.coralFill ? C.coral : p.fill === C.greenFill ? C.green : C.blue;
              return (
                <g
                  key={p.name}
                  onMouseEnter={() => setHovered(p.name)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    rx={3}
                    fill={p.fill}
                    stroke={stroke}
                    strokeWidth={active ? 2 : 1.2}
                  />
                  {p.name === "CUDA cores" ? (
                    <g>
                      {Array.from({ length: 32 }).map((_, i) => {
                        const col = i % 8;
                        const row = Math.floor(i / 8);
                        return (
                          <rect
                            key={i}
                            x={p.x + 8 + col * 17}
                            y={p.y + 28 + row * 14}
                            width={12}
                            height={9}
                            rx={1}
                            fill="var(--card)"
                            stroke={C.blue}
                            strokeWidth={0.8}
                          />
                        );
                      })}
                      <text x={p.x + 8} y={p.y + 18} fontSize={9} fill={C.ink} fontFamily={MONO}>
                        CUDA cores ×128
                      </text>
                    </g>
                  ) : p.name === "Tensor cores" ? (
                    <g>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <rect
                          key={i}
                          x={p.x + 8 + i * 22}
                          y={p.y + 22}
                          width={16}
                          height={14}
                          rx={1}
                          fill="var(--card)"
                          stroke={C.coral}
                          strokeWidth={0.9}
                        />
                      ))}
                      <text x={p.x + 8} y={p.y + 15} fontSize={9} fill={C.ink} fontFamily={MONO}>
                        Tensor ×4
                      </text>
                    </g>
                  ) : (
                    (() => {
                      const fontSize = 9.5;
                      // Monospace glyphs are ~0.6em wide; wrap if the label is
                      // too wide for its box (with a little padding).
                      const charW = fontSize * 0.6;
                      const maxChars = Math.floor((p.w - 8) / charW);
                      if (p.name.length <= maxChars) {
                        return (
                          <text
                            x={p.x + p.w / 2}
                            y={p.y + p.h / 2 + 3}
                            fontSize={fontSize}
                            fill={C.ink}
                            fontFamily={MONO}
                            textAnchor="middle"
                          >
                            {p.name}
                          </text>
                        );
                      }
                      // Split into two roughly balanced lines on a space.
                      const words = p.name.split(" ");
                      const mid = Math.ceil(words.length / 2);
                      const line1 = words.slice(0, mid).join(" ");
                      const line2 = words.slice(mid).join(" ");
                      const cx = p.x + p.w / 2;
                      const cy = p.y + p.h / 2;
                      return (
                        <text
                          x={cx}
                          fontSize={fontSize}
                          fill={C.ink}
                          fontFamily={MONO}
                          textAnchor="middle"
                        >
                          <tspan x={cx} y={cy - 2}>
                            {line1}
                          </tspan>
                          <tspan x={cx} y={cy + 9}>
                            {line2}
                          </tspan>
                        </text>
                      );
                    })()
                  )}
                </g>
              );
            })}
          </g>
        )}

        <Caption>{caption[level]}</Caption>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setLevel((l) => Math.max(0, l - 1))}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          − zoom out
        </button>
        {LEVELS.map((name, i) => {
          const active = level === i;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setLevel(i)}
              className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
              style={active ? { background: C.ink, color: "var(--background)" } : undefined}
            >
              {name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setLevel((l) => Math.min(3, l + 1))}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          + zoom in
        </button>
        <span className="font-mono text-[var(--muted)]">
          {level === 3 && hovered
            ? PARTS.find((p) => p.name === hovered)?.desc
            : level === 3
              ? "hover a block to inspect it"
              : "use the buttons to zoom"}
        </span>
      </div>
    </div>
  );
}
