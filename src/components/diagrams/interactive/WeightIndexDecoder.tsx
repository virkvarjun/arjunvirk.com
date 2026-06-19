"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Hard-coded neuron positions for three layers.
// Layer ℓ-1 (source, 3 neurons), layer ℓ (dest, 3 neurons), layer ℓ+1 (2 neurons).
const PREV: ReadonlyArray<{ x: number; y: number }> = [
  { x: 60, y: 70 },
  { x: 60, y: 125 },
  { x: 60, y: 180 },
];
const CUR: ReadonlyArray<{ x: number; y: number }> = [
  { x: 170, y: 70 },
  { x: 170, y: 125 },
  { x: 170, y: 180 },
];
const NEXT: ReadonlyArray<{ x: number; y: number }> = [
  { x: 280, y: 97 },
  { x: 280, y: 152 },
];

type Sel = { j: number; k: number };

export function WeightIndexDecoder() {
  // Default-select w^(ℓ)_{02}: into neuron 0 from neuron 2.
  const [sel, setSel] = useState<Sel>({ j: 0, k: 2 });
  const [showMatrix, setShowMatrix] = useState<boolean>(false);

  const { j, k } = sel;

  // Subscript-style weight label rendered as tspans.
  const weightLabel = (lx: number, ly: number, sub: string) => (
    <text x={lx} y={ly} fontFamily={MONO} fontSize={12} fill={C.ink} textAnchor="middle">
      w
      <tspan dy={-5} fontSize={8} fill={C.muted}>
        (ℓ)
      </tspan>
      <tspan dy={11} fontSize={8} fill={C.coral}>
        {sub}
      </tspan>
    </text>
  );

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Weight index decoder"
      >
        {/* Layer captions */}
        <text x={60} y={28} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="middle">
          layer ℓ−1
        </text>
        <text x={170} y={28} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="middle">
          layer ℓ
        </text>
        <text x={280} y={28} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="middle">
          layer ℓ+1
        </text>

        {/* Connections ℓ -> ℓ+1 (non-interactive context) */}
        {CUR.map((s, si) =>
          NEXT.map((d, di) => (
            <line
              key={`next-${si}-${di}`}
              x1={s.x}
              y1={s.y}
              x2={d.x}
              y2={d.y}
              stroke={C.line}
              strokeWidth={1}
            />
          )),
        )}

        {/* Connections ℓ-1 -> ℓ (interactive). dest = jj (in CUR), src = kk (in PREV) */}
        {CUR.map((d, jj) =>
          PREV.map((s, kk) => {
            const active = jj === j && kk === k;
            return (
              <line
                key={`prev-${jj}-${kk}`}
                x1={s.x}
                y1={s.y}
                x2={d.x}
                y2={d.y}
                stroke={active ? C.coral : C.line}
                strokeWidth={active ? 2.6 : 1}
              />
            );
          }),
        )}

        {/* Invisible thick hit targets on top, for click/hover selection. */}
        {CUR.map((d, jj) =>
          PREV.map((s, kk) => (
            <line
              key={`hit-${jj}-${kk}`}
              x1={s.x}
              y1={s.y}
              x2={d.x}
              y2={d.y}
              stroke="transparent"
              strokeWidth={8}
              className="cursor-pointer"
              onClick={() => setSel({ j: jj, k: kk })}
              onMouseEnter={() => setSel({ j: jj, k: kk })}
            />
          )),
        )}

        {/* Neurons: layer ℓ-1 */}
        {PREV.map((p, i) => (
          <g key={`p-${i}`}>
            <circle cx={p.x} cy={p.y} r={9} fill="var(--card)" stroke={C.line} strokeWidth={1.4} />
            {i === k && (
              <circle cx={p.x} cy={p.y} r={12} fill="none" stroke={C.green} strokeWidth={2} />
            )}
            <text x={p.x} y={p.y + 3.5} fontFamily={MONO} fontSize={10} fill={C.ink} textAnchor="middle">
              {i}
            </text>
          </g>
        ))}

        {/* Neurons: layer ℓ */}
        {CUR.map((p, i) => (
          <g key={`c-${i}`}>
            <circle cx={p.x} cy={p.y} r={9} fill="var(--card)" stroke={C.line} strokeWidth={1.4} />
            {i === j && (
              <circle cx={p.x} cy={p.y} r={12} fill="none" stroke={C.blue} strokeWidth={2} />
            )}
            <text x={p.x} y={p.y + 3.5} fontFamily={MONO} fontSize={10} fill={C.ink} textAnchor="middle">
              {i}
            </text>
          </g>
        ))}

        {/* Neurons: layer ℓ+1 */}
        {NEXT.map((p, i) => (
          <g key={`n-${i}`}>
            <circle cx={p.x} cy={p.y} r={9} fill="var(--card)" stroke={C.line} strokeWidth={1.4} />
            <text x={p.x} y={p.y + 3.5} fontFamily={MONO} fontSize={10} fill={C.ink} textAnchor="middle">
              {i}
            </text>
          </g>
        ))}

        {/* Selected weight label, placed at the midpoint of the active edge. */}
        {weightLabel(
          (PREV[k].x + CUR[j].x) / 2,
          (PREV[k].y + CUR[j].y) / 2 - 6,
          `${j}${k}`,
        )}

        {/* Optional W^(ℓ) matrix beside the network. */}
        {showMatrix && (
          <g>
            <text x={355} y={28} fontFamily={MONO} fontSize={10} fill={C.muted} textAnchor="middle">
              W(ℓ)
            </text>
            {/* column header: k (src) */}
            <text x={355} y={48} fontFamily={MONO} fontSize={9} fill={C.muted} textAnchor="middle">
              k (src) →
            </text>
            {/* row header: j (dest) */}
            <text
              x={306}
              y={95}
              fontFamily={MONO}
              fontSize={9}
              fill={C.muted}
              textAnchor="middle"
              transform="rotate(-90 306 95)"
            >
              j (dest) ↓
            </text>
            {[0, 1, 2].map((rj) =>
              [0, 1, 2].map((ck) => {
                const cx = 322 + ck * 30;
                const cy = 58 + rj * 30;
                const isSel = rj === j && ck === k;
                const inRow = rj === j;
                return (
                  <g key={`m-${rj}-${ck}`}>
                    <rect
                      x={cx}
                      y={cy}
                      width={28}
                      height={28}
                      fill={isSel ? C.coralFill : inRow ? C.blueFill : "var(--card)"}
                      stroke={isSel ? C.coral : inRow ? C.blue : C.line}
                      strokeWidth={isSel ? 1.8 : 1}
                    />
                    <text
                      x={cx + 14}
                      y={cy + 18}
                      fontFamily={MONO}
                      fontSize={9}
                      fill={inRow ? C.ink : C.muted}
                      textAnchor="middle"
                    >
                      {rj}
                      {ck}
                    </text>
                  </g>
                );
              }),
            )}
            <text x={355} y={172} fontFamily={MONO} fontSize={8} fill={C.blue} textAnchor="middle">
              row {j} feeds neuron {j}
            </text>
          </g>
        )}

        {/* Spelled-out reading line. */}
        <text x={20} y={235} fontFamily={MONO} fontSize={10} fill={C.ink}>
          into neuron {j} of layer ℓ, from neuron {k} of layer ℓ−1
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setShowMatrix((v) => !v)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          {showMatrix ? "hide" : "show"} W(ℓ) matrix
        </button>
        <span style={{ fontFamily: MONO, color: C.muted }}>
          selected: w(ℓ)_<span style={{ color: C.coral }}>{`${j}${k}`}</span>, dest j={j}, src k=
          {k}
        </span>
      </div>
    </div>
  );
}
