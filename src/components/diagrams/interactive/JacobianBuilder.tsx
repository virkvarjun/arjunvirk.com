"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// A "Jacobian builder": rows are outputs (f_i), columns are inputs (x_j).
// Each cell holds the symbolic partial ∂f_i/∂x_j. Hovering a cell lights up
// its output row label and input column label so the rule is unmissable.

interface Preset {
  key: "A" | "B" | "C";
  name: string;
  n: number; // inputs
  m: number; // outputs
  outputs: string[]; // f_i expressions, length m
  // Jacobian[i][j] = symbolic ∂f_i/∂x_j, m rows by n columns.
  jacobian: string[][];
  diagonal: boolean; // preset A: gray off-diagonal, emphasize diagonal
  note: string;
}

const PRESETS: Preset[] = [
  {
    key: "A",
    name: "sigmoid",
    n: 3,
    m: 3,
    outputs: ["σ(x1)", "σ(x2)", "σ(x3)"],
    jacobian: [
      ["σ'(x1)", "0", "0"],
      ["0", "σ'(x2)", "0"],
      ["0", "0", "σ'(x3)"],
    ],
    diagonal: true,
    note: "diagonal Jacobian × vector = element-wise (Hadamard) product",
  },
  {
    key: "B",
    name: "coupled",
    n: 2,
    m: 2,
    outputs: ["x1·x2", "x1+x2"],
    jacobian: [
      ["x2", "x1"],
      ["1", "1"],
    ],
    diagonal: false,
    note: "off-diagonal terms: each output mixes several inputs",
  },
  {
    key: "C",
    name: "coupled-3",
    n: 3,
    m: 3,
    outputs: ["x1·x2", "x2·x3", "x1+x3"],
    jacobian: [
      ["x2", "x1", "0"],
      ["0", "x3", "x2"],
      ["1", "0", "1"],
    ],
    diagonal: false,
    note: "off-diagonal terms: each output mixes several inputs",
  },
];

// Geometry within the 440x250 viewBox.
const CELL = 42;
const GAP = 4;
const MTOP = 64; // top of matrix grid
const MLEFT = 150; // left of matrix grid
const OUT_X = 410; // output vector column center

export function JacobianBuilder() {
  const [presetKey, setPresetKey] = useState<Preset["key"]>("A");
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);

  const p = PRESETS.find((q) => q.key === presetKey) as Preset;

  const cellXY = (i: number, j: number) => ({
    x: MLEFT + j * (CELL + GAP),
    y: MTOP + i * (CELL + GAP),
  });

  const gridW = p.n * (CELL + GAP) - GAP;
  const gridH = p.m * (CELL + GAP) - GAP;

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Jacobian builder"
      >
        {/* Title row: J = ∂f/∂x */}
        <text x={MLEFT} y={24} fontSize={13} fill={C.ink} fontFamily={MONO}>
          J = ∂f / ∂x   (rows = outputs, cols = inputs)
        </text>

        {/* Column headers: x_j (input) */}
        {Array.from({ length: p.n }).map((_, j) => {
          const { x } = cellXY(0, j);
          const on = hover?.j === j;
          return (
            <g key={`col-${j}`}>
              <rect
                x={x}
                y={40}
                width={CELL}
                height={18}
                rx={3}
                fill={on ? C.blueFill : "var(--background)"}
                stroke={on ? C.blue : C.line}
              />
              <text
                x={x + CELL / 2}
                y={53}
                fontSize={12}
                fill={on ? C.blue : C.muted}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {`x${j + 1}`}
              </text>
            </g>
          );
        })}
        <text
          x={MLEFT + gridW / 2}
          y={246}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          inputs x_j  →  columns
        </text>

        {/* Row labels: f_i (output) */}
        {Array.from({ length: p.m }).map((_, i) => {
          const { y } = cellXY(i, 0);
          const on = hover?.i === i;
          return (
            <g key={`row-${i}`}>
              <rect
                x={8}
                y={y}
                width={132}
                height={CELL}
                rx={4}
                fill={on ? C.blueFill : "var(--card)"}
                stroke={on ? C.blue : C.line}
              />
              <text
                x={16}
                y={y + 17}
                fontSize={11}
                fill={on ? C.blue : C.ink}
                fontFamily={MONO}
              >
                {`f${i + 1} = ${p.outputs[i]}`}
              </text>
              <text
                x={16}
                y={y + 31}
                fontSize={9}
                fill={on ? C.blue : C.muted}
                fontFamily={MONO}
              >
                output (row)
              </text>
            </g>
          );
        })}

        {/* Jacobian cells */}
        {p.jacobian.map((row, i) =>
          row.map((val, j) => {
            const { x, y } = cellXY(i, j);
            const isHover = hover?.i === i && hover?.j === j;
            const isDiag = i === j;
            let fill: string = "var(--background)";
            let stroke: string = C.line;
            let textFill: string = C.ink;
            if (p.diagonal && !isDiag) {
              fill = C.grid;
              textFill = C.muted;
            } else if (p.diagonal && isDiag) {
              fill = C.greenFill;
              stroke = C.green;
            }
            if (isHover) {
              fill = C.blueFill;
              stroke = C.blue;
              textFill = C.blue;
            }
            return (
              <g
                key={`cell-${i}-${j}`}
                onMouseEnter={() => setHover({ i, j })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={4}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHover ? 1.8 : 1}
                />
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 4}
                  fontSize={12}
                  fill={textFill}
                  fontFamily={MONO}
                  textAnchor="middle"
                >
                  {val}
                </text>
              </g>
            );
          }),
        )}

        {/* Output vector f(x) on the right, aligned to rows */}
        <text
          x={OUT_X}
          y={40}
          fontSize={10}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          f(x)
        </text>
        {Array.from({ length: p.m }).map((_, i) => {
          const { y } = cellXY(i, 0);
          const on = hover?.i === i;
          return (
            <g key={`fvec-${i}`}>
              <rect
                x={OUT_X - 20}
                y={y + CELL / 2 - 12}
                width={40}
                height={24}
                rx={4}
                fill={on ? C.blueFill : "var(--card)"}
                stroke={on ? C.blue : C.line}
              />
              <text
                x={OUT_X}
                y={y + CELL / 2 + 4}
                fontSize={11}
                fill={on ? C.blue : C.ink}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {`f${i + 1}`}
              </text>
            </g>
          );
        })}

        {/* Side note */}
        <text
          x={8}
          y={MTOP + gridH + 26}
          fontSize={10}
          fill={p.diagonal ? C.green : C.muted}
          fontFamily={MONO}
        >
          {p.note}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        {PRESETS.map((q) => {
          const active = q.key === presetKey;
          return (
            <button
              key={q.key}
              type="button"
              onClick={() => {
                setPresetKey(q.key);
                setHover(null);
              }}
              className="rounded border border-[var(--border)] px-2.5 py-1 font-mono transition-colors"
              style={{
                background: active ? C.ink : "var(--background)",
                color: active ? "var(--background)" : C.ink,
              }}
            >
              {`${q.key}: ${q.name}`}
            </button>
          );
        })}
        <span className="font-mono text-[var(--muted)]">
          hover a cell to trace its output row & input column
        </span>
      </div>
    </div>
  );
}
