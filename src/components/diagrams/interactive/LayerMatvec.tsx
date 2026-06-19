"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// A neural-network layer as a matrix-vector product: z = W x + b, a = σ(z).
// Fixed 2-neuron, 3-input example so every number is correct and live-computed.
const W: readonly [number, number, number][] = [
  [0.5, -1.0, 2.0],
  [1.5, 0.5, -0.5],
];
const X: readonly number[] = [1.0, 2.0, -1.0];
const B: readonly number[] = [0.5, -1.0];

const MUL = "·"; // middle dot, used as the multiplication sign
const sigma = (t: number) => 1 / (1 + Math.exp(-t));
const f = (n: number) => n.toFixed(2);
// Signed term for a running sum, e.g. " + 0.50" or " - 1.00".
const term = (n: number) => (n < 0 ? ` - ${f(-n)}` : ` + ${f(n)}`);

const Z: number[] = W.map((row, i) => row.reduce((s, w, j) => s + w * X[j], 0) + B[i]);
const A: number[] = Z.map(sigma);

export function LayerMatvec() {
  const [sel, setSel] = useState(0); // selected neuron / row index (0 or 1)

  const CELL = 34; // cell size for the W grid
  const ROW_H = 38; // row pitch for the column vectors
  const wx = 24; // left edge of W
  const wy = 56; // top edge of W
  const midY = (i: number) => wy + i * ROW_H + (CELL - 4) / 2;

  // Render a 2x1 column vector at column x.
  const Column = (
    x: number,
    vals: number[],
    opts: { accent: string; accentFill: string },
  ) => (
    <g>
      {vals.map((v, i) => {
        const on = i === sel;
        return (
          <g key={i} opacity={on ? 1 : 0.35}>
            <rect
              x={x}
              y={wy + i * ROW_H}
              width={CELL}
              height={CELL - 4}
              rx={3}
              fill={on ? opts.accentFill : "var(--background)"}
              stroke={on ? opts.accent : C.line}
            />
            <text
              x={x + CELL / 2}
              y={midY(i)}
              fontFamily={MONO}
              fontSize={12}
              fill={C.ink}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {f(v)}
            </text>
          </g>
        );
      })}
    </g>
  );

  const Glyph = (x: number, ch: string, fill: string, size = 16) => (
    <text x={x} y={midY(0)} fontFamily={MONO} fontSize={size} fill={fill} textAnchor="middle" dominantBaseline="central">
      {ch}
    </text>
  );

  const Cap = (x: number, ch: string) => (
    <text x={x} y={wy - 14} fontFamily={MONO} fontSize={12} fill={C.muted} textAnchor="middle">
      {ch}
    </text>
  );

  const row = W[sel];
  const z = Z[sel];

  // x columns
  const xCol = wx + 3 * CELL + 5;
  const bCol = wx + 4 * CELL + 36;
  const zCol = wx + 5 * CELL + 76;
  const aCol = wx + 7 * CELL + 116;

  // Live products line, e.g. "0.50·1.00 + (-1.00)·2.00 + 2.00·(-1.00)".
  const prodStr = row
    .map((w, j) => `${f(w)}${MUL}${f(X[j])}`)
    .join("  +  ");

  return (
    <div>
      <svg
        viewBox="0 0 440 220"
        className="h-auto w-full"
        role="img"
        aria-label="A layer as a matrix-vector product"
      >
        {/* W matrix: 2 rows x 3 cols, each row is one neuron's weights */}
        {Cap(wx + (3 * CELL) / 2, "W")}
        {W.map((r, i) =>
          r.map((w, j) => {
            const on = i === sel;
            return (
              <g key={`${i}-${j}`} opacity={on ? 1 : 0.35}>
                <rect
                  x={wx + j * CELL}
                  y={wy + i * CELL}
                  width={CELL}
                  height={CELL}
                  fill={on ? C.blueFill : "var(--background)"}
                  stroke={on ? C.blue : C.line}
                />
                <text
                  x={wx + j * CELL + CELL / 2}
                  y={wy + i * CELL + CELL / 2}
                  fontFamily={MONO}
                  fontSize={12}
                  fill={C.ink}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {f(w)}
                </text>
              </g>
            );
          }),
        )}

        {/* x vector (3x1), highlighted whole when a row is selected */}
        {Cap(xCol + CELL / 2, "x")}
        {X.map((v, j) => (
          <g key={j}>
            <rect x={xCol} y={wy + j * CELL} width={CELL} height={CELL} fill={C.blueFill} stroke={C.blue} />
            <text
              x={xCol + CELL / 2}
              y={wy + j * CELL + CELL / 2}
              fontFamily={MONO}
              fontSize={12}
              fill={C.ink}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {f(v)}
            </text>
          </g>
        ))}

        {/* + b */}
        {Glyph(wx + 4 * CELL + 16, "+", C.muted)}
        {Cap(bCol + CELL / 2, "b")}
        {Column(bCol, [...B], { accent: C.coral, accentFill: C.coralFill })}

        {/* = z */}
        {Glyph(wx + 5 * CELL + 56, "=", C.muted)}
        {Cap(zCol + CELL / 2, "z")}
        {Column(zCol, [...Z], { accent: C.blue, accentFill: C.blueFill })}

        {/* → σ → a */}
        {Glyph(wx + 6 * CELL + 100, "→ σ →", C.violet, 11)}
        {Cap(aCol + CELL / 2, "a")}
        {Column(aCol, [...A], { accent: C.green, accentFill: C.greenFill })}
      </svg>

      {/* Live arithmetic for the selected neuron */}
      <div className="mt-2 space-y-1 font-mono text-xs text-[var(--foreground)]">
        <div className="text-[var(--muted)]">
          z_{sel + 1} = w_{sel + 1}1{MUL}x_1 + w_{sel + 1}2{MUL}x_2 + w_{sel + 1}3
          {MUL}x_3 + b_{sel + 1}
        </div>
        <div>
          {"    = "}
          {prodStr}
          {term(B[sel])}
        </div>
        <div>
          {"    = "}
          {f(row[0] * X[0])}
          {term(row[1] * X[1])}
          {term(row[2] * X[2])}
          {term(B[sel])}
          {" = "}
          <span style={{ color: C.blue }}>{f(z)}</span>
        </div>
        <div>
          a_{sel + 1} = {"σ"}(z_{sel + 1}) = {"σ"}({f(z)}) ={" "}
          <span style={{ color: C.green }}>{f(A[sel])}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {[0, 1].map((i) => (
          <button
            key={i}
            onClick={() => setSel(i)}
            aria-pressed={sel === i}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={sel === i ? { background: C.blueFill, borderColor: C.blue } : undefined}
          >
            neuron {i + 1}
          </button>
        ))}
        <span className="font-mono text-[var(--muted)]">
          each row of W is one neuron&apos;s weights
        </span>
      </div>
    </div>
  );
}
