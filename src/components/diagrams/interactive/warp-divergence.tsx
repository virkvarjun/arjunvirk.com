"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Two-part execution-model diagram. Part 1 shows the launch hierarchy
// (grid -> blocks -> threads) and how a threadIdx maps onto a data array.
// Part 2 shows a single 32-lane warp and the cost of branch divergence.
type Part = "hierarchy" | "warp";
type Branch = "convergent" | "divergent";

// Hierarchy layout: 2 blocks of 8 threads = 16 threads -> 16 data elements.
const N_BLOCKS = 2;
const PER_BLOCK = 8;
const N_THREADS = N_BLOCKS * PER_BLOCK; // 16

const TC = 22; // thread cell size
const TY = 44; // top of blocks
const BLOCK_GAP = 28;
const BX = 30; // first block x

// Data array: 16 cells in a single row.
const DC = 22;
const DY = 150;
const DX = 30;

// Warp layout: 32 lanes as a 4x8 grid.
const LANES = 32;
const LCOLS = 8;
const LROWS = 4;
const LC = 40; // lane cell width-ish
const LCH = 30; // lane cell height
const LX = 50;
const LY = 56;

function blockX(b: number): number {
  return BX + b * (PER_BLOCK * TC + BLOCK_GAP);
}

export function WarpDivergence() {
  const [part, setPart] = useState<Part>("hierarchy");
  const [active, setActive] = useState(5); // selected thread index 0..15
  const [branch, setBranch] = useState<Branch>("convergent");
  const [pass, setPass] = useState(0); // 0 or 1, only meaningful when divergent

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";
  const activeStyle = { background: C.ink, color: "var(--background)" } as const;

  // Which lanes take the "if" branch: first 16. The other 16 take "else".
  const ifLane = (i: number) => i < LANES / 2;

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Threads, warps, and divergence"
      >
        {part === "hierarchy" ? (
          <>
            <text x={220} y={22} fontSize={11} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              grid → 2 blocks × 8 threads → 16 threads
            </text>

            {/* blocks of threads */}
            {Array.from({ length: N_BLOCKS }).map((_, b) => {
              const bx = blockX(b);
              return (
                <g key={`b${b}`}>
                  <rect
                    x={bx - 6}
                    y={TY - 6}
                    width={PER_BLOCK * TC + 12}
                    height={TC + 12}
                    fill="var(--card)"
                    stroke={C.line}
                    strokeWidth={1.2}
                    rx={3}
                  />
                  <text x={bx + (PER_BLOCK * TC) / 2} y={TY - 12} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
                    {`block ${b}`}
                  </text>
                  {Array.from({ length: PER_BLOCK }).map((_, t) => {
                    const idx = b * PER_BLOCK + t;
                    const isActive = idx === active;
                    return (
                      <g key={`t${idx}`} className="cursor-pointer" onClick={() => setActive(idx)}>
                        <rect
                          x={bx + t * TC}
                          y={TY}
                          width={TC}
                          height={TC}
                          fill={isActive ? C.blueFill : "var(--background)"}
                          stroke={isActive ? C.blue : C.line}
                          strokeWidth={isActive ? 1.8 : 0.8}
                        />
                        <text
                          x={bx + t * TC + TC / 2}
                          y={TY + TC / 2 + 4}
                          fontSize={10}
                          fill={isActive ? C.blue : C.ink}
                          fontFamily={MONO}
                          textAnchor="middle"
                        >
                          {t}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* mapping arrow */}
            {(() => {
              const ab = Math.floor(active / PER_BLOCK);
              const at = active % PER_BLOCK;
              const sx = blockX(ab) + at * TC + TC / 2;
              const dxc = DX + active * DC + DC / 2;
              return (
                <line x1={sx} y1={TY + TC + 2} x2={dxc} y2={DY - 2} stroke={C.blue} strokeWidth={1.4} strokeDasharray="3 3" />
              );
            })()}

            {/* data array */}
            <text x={220} y={DY - 12} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              data[ ], 16 elements
            </text>
            {Array.from({ length: N_THREADS }).map((_, i) => {
              const isActive = i === active;
              return (
                <g key={`d${i}`}>
                  <rect
                    x={DX + i * DC}
                    y={DY}
                    width={DC}
                    height={DC}
                    fill={isActive ? C.blueFill : "var(--background)"}
                    stroke={isActive ? C.blue : C.line}
                    strokeWidth={isActive ? 1.8 : 0.8}
                  />
                  <text
                    x={DX + i * DC + DC / 2}
                    y={DY + DC / 2 + 4}
                    fontSize={9}
                    fill={isActive ? C.blue : C.muted}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    {i}
                  </text>
                </g>
              );
            })}

            <text x={220} y={DY + DC + 28} fontSize={12} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
              {`thread ${active} handles data[${active}]`}
            </text>
            <text x={220} y={DY + DC + 46} fontSize={9} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              {`global idx = block ${Math.floor(active / PER_BLOCK)} × 8 + thread ${active % PER_BLOCK}`}
            </text>
          </>
        ) : (
          <>
            <text x={220} y={22} fontSize={11} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              one warp = 32 lanes, executed in lockstep
            </text>
            <text x={220} y={40} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
              {branch === "convergent"
                ? "all lanes: y = a * x"
                : pass === 0
                  ? "pass 1, if (lane < 16): y = a * x"
                  : "pass 2, else: y = b - x"}
            </text>

            {/* 32 lanes */}
            {Array.from({ length: LANES }).map((_, i) => {
              const col = i % LCOLS;
              const row = Math.floor(i / LCOLS);
              let on: boolean;
              let isIf = false;
              if (branch === "convergent") {
                on = true;
              } else {
                isIf = ifLane(i);
                // pass 0 runs the "if" lanes, pass 1 runs the "else" lanes.
                on = pass === 0 ? isIf : !isIf;
              }
              const fill = on ? C.greenFill : C.grid;
              const stroke = on ? C.green : C.line;
              return (
                <g key={`l${i}`}>
                  <rect
                    x={LX + col * LC}
                    y={LY + row * LCH}
                    width={LC - 4}
                    height={LCH - 4}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={on ? 1.4 : 0.8}
                    rx={2}
                  />
                  <text
                    x={LX + col * LC + (LC - 4) / 2}
                    y={LY + row * LCH + (LCH - 4) / 2 + 3}
                    fontSize={9}
                    fill={on ? C.green : C.muted}
                    fontFamily={MONO}
                    textAnchor="middle"
                  >
                    {i}
                  </text>
                </g>
              );
            })}

            {/* divider showing if / else split */}
            {branch === "divergent" && (
              <>
                <line x1={LX} y1={LY + 2 * LCH} x2={LX + LCOLS * LC - 4} y2={LY + 2 * LCH} stroke={C.coral} strokeWidth={1.6} strokeDasharray="4 3" />
                <text x={LX + LCOLS * LC + 4} y={LY + LCH - 6} fontSize={9} fill={C.green} fontFamily={MONO}>
                  if (16)
                </text>
                <text x={LX + LCOLS * LC + 4} y={LY + 3 * LCH - 6} fontSize={9} fill={C.coral} fontFamily={MONO}>
                  else (16)
                </text>
              </>
            )}

            {/* pass cost summary */}
            <text x={220} y={208} fontSize={12} fill={C.ink} fontFamily={MONO} textAnchor="middle" fontWeight={600}>
              {branch === "convergent" ? "1 pass: all 32 lanes active" : "2 passes: half the lanes idle each pass, wasted work"}
            </text>
            <text x={220} y={228} fontSize={10} fill={branch === "convergent" ? C.green : C.coral} fontFamily={MONO} textAnchor="middle">
              {branch === "convergent"
                ? "active lanes 32 / 32 · cost 1×"
                : `pass ${pass + 1} of 2 · active lanes 16 / 32 · cost 2×`}
            </text>
          </>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          className={btn}
          style={part === "hierarchy" ? activeStyle : undefined}
          onClick={() => setPart("hierarchy")}
        >
          Hierarchy
        </button>
        <button
          type="button"
          className={btn}
          style={part === "warp" ? activeStyle : undefined}
          onClick={() => setPart("warp")}
        >
          Warp divergence
        </button>

        {part === "hierarchy" ? (
          <span className="font-mono text-[var(--muted)]">click a thread to see its data element</span>
        ) : (
          <>
            <span className="ml-2 font-mono text-[var(--muted)]">branch:</span>
            <button
              type="button"
              className={btn}
              style={branch === "convergent" ? activeStyle : undefined}
              onClick={() => {
                setBranch("convergent");
                setPass(0);
              }}
            >
              convergent
            </button>
            <button
              type="button"
              className={btn}
              style={branch === "divergent" ? activeStyle : undefined}
              onClick={() => setBranch("divergent")}
            >
              divergent
            </button>
            {branch === "divergent" && (
              <button type="button" className={btn} onClick={() => setPass((p) => (p === 0 ? 1 : 0))}>
                {`step → pass ${pass === 0 ? 2 : 1}`}
              </button>
            )}
          </>
        )}
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        {part === "hierarchy"
          ? "one kernel, launched as a grid of blocks of threads; each thread handles one element by its threadIdx."
          : "neural nets do uniform arithmetic and barely branch, so their warps stay convergent."}
      </p>
    </div>
  );
}
