"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Four ways to spread a model + its training batch across 4 chips.
//   Data    , replicate the model, split the batch, all-reduce gradients.
//   Tensor  , split one layer's matrix across chips, exchange partials.
//   Pipeline, split the layers by depth; mini-batches flow like a line.
//   FSDP    , shard the params, gather them on demand each pass.
type Strategy = "data" | "tensor" | "pipeline" | "fsdp";

const STRATS: { id: Strategy; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "tensor", label: "Tensor" },
  { id: "pipeline", label: "Pipeline" },
  { id: "fsdp", label: "FSDP" },
];

// Four chips evenly spaced across the canvas.
const CHIP_W = 84;
const CHIP_H = 116;
const CHIP_Y = 64;
const CHIP_X = [22, 130, 238, 346];
const cx = (i: number) => CHIP_X[i] + CHIP_W / 2;

// A small head pointing at (x2,y2), used for the comm arrows.
function Head({ x, y, ang, color }: { x: number; y: number; ang: number; color: string }) {
  const h = 6;
  const a1 = ang + Math.PI - 0.45;
  const a2 = ang + Math.PI + 0.45;
  return (
    <polygon
      fill={color}
      stroke="none"
      points={`${x},${y} ${x + h * Math.cos(a1)},${y + h * Math.sin(a1)} ${x + h * Math.cos(a2)},${y + h * Math.sin(a2)}`}
    />
  );
}

function ChipShell({ i, sub }: { i: number; sub: string }) {
  return (
    <>
      <rect
        x={CHIP_X[i]}
        y={CHIP_Y}
        width={CHIP_W}
        height={CHIP_H}
        rx={5}
        fill="var(--card)"
        stroke={C.line}
        strokeWidth={1.2}
      />
      <text x={cx(i)} y={CHIP_Y - 6} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
        {`chip ${i}`}
      </text>
      <text x={cx(i)} y={CHIP_Y + CHIP_H + 13} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
        {sub}
      </text>
    </>
  );
}

const NOTES: Record<Strategy, string> = {
  data: "splits the batch, not the model; replicate + all-reduce.",
  tensor: "splits a layer across chips; needs very fast interconnect.",
  pipeline: "splits by depth; assembly line with start/end bubbles.",
  fsdp: "shard the model, gather on demand; data-parallel simplicity, far less memory.",
};

export function ParallelismStrategies() {
  const [strat, setStrat] = useState<Strategy>("data");
  const [topo, setTopo] = useState(false);

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";
  const activeStyle = { background: C.ink, color: "var(--background)" } as const;

  // A 4-layer stack drawn inside a chip (used by data / fsdp / pipeline).
  const layerStack = (i: number, opts?: { only?: number; shard?: number }) => {
    const lx = CHIP_X[i] + 12;
    const lw = CHIP_W - 24;
    const lh = 18;
    const ly0 = CHIP_Y + 16;
    return Array.from({ length: 4 }).map((_, l) => {
      const present =
        opts?.only !== undefined
          ? l === opts.only
          : opts?.shard !== undefined
            ? l === opts.shard
            : true;
      return (
        <g key={`l${i}-${l}`}>
          <rect
            x={lx}
            y={ly0 + l * (lh + 4)}
            width={lw}
            height={lh}
            rx={2}
            fill={present ? C.blueFill : C.grid}
            stroke={present ? C.blue : C.line}
            strokeWidth={present ? 1.3 : 0.7}
            strokeDasharray={present ? undefined : "2 2"}
          />
          <text
            x={CHIP_X[i] + CHIP_W / 2}
            y={ly0 + l * (lh + 4) + lh / 2 + 3}
            fontSize={9}
            fill={present ? C.blue : C.muted}
            fontFamily={MONO}
            textAnchor="middle"
          >
            {`L${l + 1}`}
          </text>
        </g>
      );
    });
  };

  return (
    <div>
      <svg viewBox="0 0 440 296" className="h-auto w-full" role="img" aria-label="Parallelism strategies">
        {/* ---- DATA PARALLELISM ---- */}
        {strat === "data" && (
          <>
            <text x={220} y={20} fontSize={11} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              full model on every chip · each chip a different batch slice
            </text>
            {CHIP_X.map((_, i) => (
              <g key={`dc${i}`}>
                <ChipShell i={i} sub={`batch[${i}]`} />
                {layerStack(i)}
              </g>
            ))}
            {/* all-reduce: arrows from each chip meeting at a central sync node.
                Lines begin below the batch[i] labels so they never cross them. */}
            {CHIP_X.map((_, i) => {
              const sy = CHIP_Y + CHIP_H + 42;
              const x1 = cx(i);
              const y1 = CHIP_Y + CHIP_H + 24;
              return (
                <g key={`ar${i}`}>
                  <line x1={x1} y1={y1} x2={220} y2={sy} stroke={C.coral} strokeWidth={1.6} />
                  <Head x={220} y={sy} ang={Math.atan2(sy - y1, 220 - x1)} color={C.coral} />
                </g>
              );
            })}
            <circle cx={220} cy={CHIP_Y + CHIP_H + 42} r={6} fill={C.coralFill} stroke={C.coral} strokeWidth={1.4} />
            <text x={220} y={CHIP_Y + CHIP_H + 62} fontSize={10} fill={C.coral} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
              all-reduce: average gradients across chips
            </text>
          </>
        )}

        {/* ---- TENSOR PARALLELISM ---- */}
        {strat === "tensor" && (
          <>
            <text x={220} y={20} fontSize={11} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              one layer&rsquo;s weight matrix cut into 4 vertical chunks
            </text>
            {CHIP_X.map((_, i) => (
              <g key={`tc${i}`}>
                <ChipShell i={i} sub={`W[:, ${i}]`} />
                {/* the single layer's chunk held by this chip */}
                <rect
                  x={CHIP_X[i] + 18}
                  y={CHIP_Y + 30}
                  width={CHIP_W - 36}
                  height={CHIP_H - 56}
                  rx={3}
                  fill={C.violet === C.violet ? "var(--card)" : "var(--card)"}
                  stroke={C.violet}
                  strokeWidth={1.4}
                />
                <text x={cx(i)} y={CHIP_Y + 24} fontSize={9} fill={C.violet} fontFamily={MONO} textAnchor="middle">
                  {`chunk ${i}`}
                </text>
                <text x={cx(i)} y={CHIP_Y + CHIP_H / 2 + 6} fontSize={11} fill={C.violet} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
                  {`W${i}`}
                </text>
              </g>
            ))}
            {/* heavy intra-layer comm: arrows between adjacent chips, both ways.
                Drawn below the W[:, i] labels for clear separation. */}
            {[0, 1, 2].map((i) => {
              const y = CHIP_Y + CHIP_H + 26;
              const xa = cx(i);
              const xb = cx(i + 1);
              return (
                <g key={`tx${i}`}>
                  <line x1={xa} y1={y} x2={xb} y2={y} stroke={C.coral} strokeWidth={1.8} />
                  <Head x={xb} y={y} ang={0} color={C.coral} />
                  <Head x={xa} y={y} ang={Math.PI} color={C.coral} />
                </g>
              );
            })}
            <text x={220} y={CHIP_Y + CHIP_H + 48} fontSize={10} fill={C.coral} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
              exchange partial results WITHIN the layer (every step)
            </text>
          </>
        )}

        {/* ---- PIPELINE PARALLELISM ---- */}
        {strat === "pipeline" && (
          <>
            <text x={220} y={20} fontSize={11} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              layers split by depth · mini-batches flow down the line
            </text>
            {CHIP_X.map((_, i) => (
              <g key={`pc${i}`}>
                <ChipShell i={i} sub={`stage ${i}`} />
                {layerStack(i, { only: i })}
                {/* flow arrow chip i -> i+1 */}
                {i < 3 && (
                  <g>
                    <line
                      x1={CHIP_X[i] + CHIP_W}
                      y1={CHIP_Y + CHIP_H / 2}
                      x2={CHIP_X[i + 1]}
                      y2={CHIP_Y + CHIP_H / 2}
                      stroke={C.coral}
                      strokeWidth={1.6}
                    />
                    <Head x={CHIP_X[i + 1]} y={CHIP_Y + CHIP_H / 2} ang={0} color={C.coral} />
                  </g>
                )}
              </g>
            ))}
            {/* schedule strip with start/end bubbles */}
            {(() => {
              const sx = 26;
              const sy = CHIP_Y + CHIP_H + 30;
              const cw = 24;
              const ch = 14;
              const SLOTS = 7; // time steps
              // micro-batch m occupies (stage s) at time t = s + m, for m in 0..3
              const cell = (s: number, t: number): number | null => {
                const m = t - s;
                return m >= 0 && m < 4 ? m : null;
              };
              const tone = [C.blueFill, C.greenFill, C.coralFill, C.violet];
              const toneEdge = [C.blue, C.green, C.coral, C.violet];
              return (
                <g>
                  <text x={sx} y={sy - 4} fontSize={9} fill={C.muted} fontFamily={MONO}>
                    schedule (rows = stages, cols = time):
                  </text>
                  {Array.from({ length: 4 }).map((_, s) =>
                    Array.from({ length: SLOTS }).map((_, t) => {
                      const m = cell(s, t);
                      const x = sx + 96 + t * (cw + 2);
                      const y = sy + s * (ch + 2);
                      const idle = m === null;
                      return (
                        <g key={`sc${s}-${t}`}>
                          <rect
                            x={x}
                            y={y}
                            width={cw}
                            height={ch}
                            rx={1.5}
                            fill={idle ? C.grid : tone[m]}
                            stroke={idle ? C.line : toneEdge[m]}
                            strokeWidth={idle ? 0.6 : 1.1}
                          />
                          {idle ? (
                            <text x={x + cw / 2} y={y + ch / 2 + 3} fontSize={7} fill={C.muted} fontFamily={MONO} textAnchor="middle">
                              idle
                            </text>
                          ) : (
                            <text x={x + cw / 2} y={y + ch / 2 + 3} fontSize={8} fill={toneEdge[m]} fontFamily={MONO} textAnchor="middle">
                              {`b${m}`}
                            </text>
                          )}
                        </g>
                      );
                    }),
                  )}
                  {Array.from({ length: 4 }).map((_, s) => (
                    <text key={`sl${s}`} x={sx + 92} y={sy + s * (ch + 2) + ch / 2 + 3} fontSize={8} fill={C.muted} fontFamily={MONO} textAnchor="end">
                      {`s${s}`}
                    </text>
                  ))}
                  <text x={sx} y={sy + 4 * (ch + 2) + 10} fontSize={9} fill={C.coral} fontFamily={MONO} fontWeight={600}>
                    grey = bubble (idle warm-up / drain at start &amp; end)
                  </text>
                </g>
              );
            })()}
          </>
        )}

        {/* ---- FSDP / ZeRO ---- */}
        {strat === "fsdp" && (
          <>
            <text x={220} y={20} fontSize={11} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              params sharded across chips · gathered on demand each pass
            </text>
            {CHIP_X.map((_, i) => (
              <g key={`fc${i}`}>
                <ChipShell i={i} sub={`shard ${i} · batch[${i}]`} />
                {layerStack(i, { shard: i })}
              </g>
            ))}
            {/* all-gather: shards converge to reconstruct the full layer.
                Lines begin below the shard/batch labels so they never cross them. */}
            {CHIP_X.map((_, i) => {
              const sy = CHIP_Y + CHIP_H + 42;
              const x1 = cx(i);
              const y1 = CHIP_Y + CHIP_H + 24;
              return (
                <g key={`ag${i}`}>
                  <line x1={220} y1={sy} x2={x1} y2={y1} stroke={C.coral} strokeWidth={1.6} strokeDasharray="4 3" />
                  <Head x={x1} y={y1} ang={Math.atan2(y1 - sy, x1 - 220)} color={C.coral} />
                </g>
              );
            })}
            <circle cx={220} cy={CHIP_Y + CHIP_H + 42} r={6} fill={C.coralFill} stroke={C.coral} strokeWidth={1.4} />
            <text x={220} y={CHIP_Y + CHIP_H + 62} fontSize={10} fill={C.coral} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
              all-gather: rebuild full params just-in-time, then free
            </text>
          </>
        )}

        {/* physical topology line (toggled) */}
        {topo && (
          <text x={220} y={290} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
            chips → slice (ICI) → 4×4×4 cube → pod → multislice (DCN)
          </text>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {STRATS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={btn}
            style={strat === s.id ? activeStyle : undefined}
            onClick={() => setStrat(s.id)}
          >
            {s.label}
          </button>
        ))}
        <button type="button" className={btn} style={topo ? activeStyle : undefined} onClick={() => setTopo((t) => !t)}>
          topology
        </button>
      </div>

      <p className="mt-2 font-mono text-xs text-[var(--coral)]" style={{ color: C.coral }}>
        the interconnect is half the supercomputer.
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{NOTES[strat]}</p>
    </div>
  );
}
