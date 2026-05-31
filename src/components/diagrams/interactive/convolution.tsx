"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// The worked example from the chapter: a 5x5 input and a 3x3 horizontal
// edge-detector filter. The 3x3 output is produced one position at a time.
const INPUT = [
  [3, 0, 1, 5, 2],
  [2, 6, 2, 4, 1],
  [1, 1, 7, 8, 3],
  [0, 2, 4, 3, 5],
  [1, 3, 2, 1, 0],
];
const FILTER = [
  [-1, -1, -1],
  [0, 0, 0],
  [1, 1, 1],
];

function conv(r: number, c: number): number {
  let s = 0;
  for (let m = 0; m < 3; m++) {
    for (let n = 0; n < 3; n++) {
      s += INPUT[r + m][c + n] * FILTER[m][n];
    }
  }
  return s;
}

const IX = 26;
const IY = 40;
const IC = 26; // input cell
const FX = 192;
const FY = 64;
const FC = 22; // filter cell
const OX = 304;
const OY = 48;
const OC = 26; // output cell

export function ConvolutionInteractive() {
  const [active, setActive] = useState(0); // 0..8, row-major output position
  const [vals, setVals] = useState<(number | null)[]>(Array(9).fill(null));

  const ar = Math.floor(active / 3);
  const ac = active % 3;

  function compute(idx: number) {
    const r = Math.floor(idx / 3);
    const c = idx % 3;
    setVals((prev) => {
      const next = [...prev];
      next[idx] = conv(r, c);
      return next;
    });
    setActive(idx);
  }

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";

  return (
    <div>
      <svg viewBox="0 0 420 210" className="h-auto w-full" role="img" aria-label="Interactive convolution">
        {/* input */}
        <text x={IX + (5 * IC) / 2} y={32} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          input 5×5
        </text>
        {INPUT.flatMap((row, r) =>
          row.map((v, c) => {
            const inPatch = r >= ar && r < ar + 3 && c >= ac && c < ac + 3;
            return (
              <g key={`i${r}-${c}`}>
                <rect
                  x={IX + c * IC}
                  y={IY + r * IC}
                  width={IC}
                  height={IC}
                  fill={inPatch ? C.blue + "22" : "var(--background)"}
                  stroke={C.line}
                  strokeWidth={0.8}
                />
                <text x={IX + c * IC + IC / 2} y={IY + r * IC + IC / 2 + 4} fontSize={11} fill={C.ink} fontFamily={MONO} textAnchor="middle">
                  {v}
                </text>
              </g>
            );
          }),
        )}
        <rect x={IX + ac * IC} y={IY + ar * IC} width={3 * IC} height={3 * IC} fill="none" stroke={C.blue} strokeWidth={1.8} />

        {/* filter */}
        <text x={FX + (3 * FC) / 2} y={56} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          filter
        </text>
        {FILTER.flatMap((row, r) =>
          row.map((v, c) => (
            <g key={`f${r}-${c}`}>
              <rect x={FX + c * FC} y={FY + r * FC} width={FC} height={FC} fill={C.coralFill} stroke={C.coral} strokeWidth={0.8} />
              <text x={FX + c * FC + FC / 2} y={FY + r * FC + FC / 2 + 4} fontSize={10} fill={C.coral} fontFamily={MONO} textAnchor="middle">
                {v}
              </text>
            </g>
          )),
        )}

        {/* output */}
        <text x={OX + (3 * OC) / 2} y={40} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          output 3×3
        </text>
        {Array.from({ length: 9 }).map((_, idx) => {
          const r = Math.floor(idx / 3);
          const c = idx % 3;
          const filled = vals[idx];
          return (
            <g key={`o${idx}`} className="cursor-pointer" onClick={() => compute(idx)}>
              <rect
                x={OX + c * OC}
                y={OY + r * OC}
                width={OC}
                height={OC}
                fill={idx === active ? C.green + "33" : filled !== null ? C.greenFill : "var(--background)"}
                stroke={idx === active ? C.green : C.line}
                strokeWidth={idx === active ? 1.6 : 0.8}
              />
              {filled !== null && (
                <text x={OX + c * OC + OC / 2} y={OY + r * OC + OC / 2 + 4} fontSize={11} fill={C.green} fontFamily={MONO} textAnchor="middle">
                  {filled}
                </text>
              )}
            </g>
          );
        })}

        {/* live computation */}
        <text x={210} y={196} fontSize={10} fill={C.muted} fontFamily={MONO} textAnchor="middle">
          {`Σ (patch ⊙ filter) = ${conv(ar, ac)}  →  output[${ar},${ac}]`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" className={btn} onClick={() => compute(active)}>
          Compute this cell
        </button>
        <button type="button" className={btn} onClick={() => compute((active + 1) % 9)}>
          Next position
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            setVals(Array(9).fill(null));
            setActive(0);
          }}
        >
          Reset
        </button>
        <span className="font-mono text-[var(--muted)]">click an output cell to compute it</span>
      </div>
    </div>
  );
}
