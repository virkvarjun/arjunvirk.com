"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// A single LSTM cell.
//
// The "cell state" line C runs straight across the top (the "memory highway"),
// carrying a forget-multiply node (⊙) and an input-add node (+). Below sit four
// gate blocks fed by the concatenation [h(t-1), x(t)]:
//   forget f_t (σ)      -> multiplies into the C line
//   input  i_t (σ)      -+ multiplied together, then added into the C line
//   cand.  C~_t (tanh)  -+
//   output o_t (σ)      -> multiplied by tanh(C_t) to produce h_t
//
// Interactions:
//   - click a gate to highlight it and read its equation + plain-English note
//   - toggle "highway" to set f_t≈1, i_t≈0 so memory flows across untouched.

type Gate = "f" | "i" | "c" | "o" | null;

const GATES = {
  f: {
    name: "forget gate",
    color: C.coral,
    fill: C.coralFill,
    eq: "f_t = σ(W_f · [h(t-1), x_t] + b_f)",
    desc: "forget gate: how much old memory to keep, 0 = erase, 1 = keep.",
  },
  i: {
    name: "input gate",
    color: C.blue,
    fill: C.blueFill,
    eq: "i_t = σ(W_i · [h(t-1), x_t] + b_i)",
    desc: "input gate: how much of the new candidate to write into memory.",
  },
  c: {
    name: "candidate",
    color: C.green,
    fill: C.greenFill,
    eq: "C~_t = tanh(W_C · [h(t-1), x_t] + b_C)",
    desc: "candidate: the proposed new memory content, squashed to (-1, 1).",
  },
  o: {
    name: "output gate",
    color: C.violet,
    fill: "var(--card)",
    eq: "o_t = σ(W_o · [h(t-1), x_t] + b_o)",
    desc: "output gate: how much of tanh(C_t) is exposed as the hidden output h_t.",
  },
} as const;

// Geometry ---------------------------------------------------------------
const W = 480;
const H = 360;

// The cell body (the dashed container that the inputs flow into).
const CELL = { x: 70, y: 40, w: 320, h: 220 };

// The memory-highway line and its two operation nodes.
const HWY_Y = 70;
const FORGET_X = 175; // ⊙ forget-multiply node
const ADD_X = 265; // + input-add node

// Gate blocks (rounded boxes). Order left->right along the bottom row.
const GATE_Y = 165;
const GATE_H = 34;
const GATE_W = 56;
const GATE_X: Record<Exclude<Gate, null>, number> = {
  f: 100,
  i: 165,
  c: 228,
  o: 305,
};

// The ⊗ node where i_t · C~_t combine before being added to the line.
// Aligned under the ADD node so the combined contribution feeds straight up
// into the + on the highway.
const MIX_X = ADD_X;
const MIX_Y = 118;

// The output ⊙ node (o_t · tanh(C_t)) and the tanh-of-C node feeding it.
const OUT_MULT_X = 375;
const OUT_MULT_Y = 220;
const TANHC_X = 375;
const TANHC_Y = HWY_Y; // tanh(C_t) tap sits on the highway, right side

// Bottom concatenation bus that feeds every gate.
const BUS_Y = 248;

export function TfLstmCell() {
  const [sel, setSel] = useState<Gate>(null);
  const [highway, setHighway] = useState(false);

  const info = sel ? GATES[sel] : null;

  // In highway mode the forget path is "open" (f≈1) and the input path is
  // "closed" (i≈0), so we de-emphasize the input/candidate machinery and make
  // the cell-state line bold.
  const lineActive = highway ? C.coral : C.line;
  const inputDim = highway ? 0.28 : 1;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="An LSTM cell: a memory-highway cell-state line with forget and input operations, fed by forget, input, candidate, and output gates"
      >
        {/* ---- cell body ---- */}
        <rect
          x={CELL.x}
          y={CELL.y}
          width={CELL.w}
          height={CELL.h}
          rx={12}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1.2}
          strokeDasharray="4 4"
        />
        <text
          x={W / 2}
          y={22}
          fontSize={11}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="middle"
          fontWeight={600}
        >
          LSTM Cell
        </text>

        {/* ====================================================== */}
        {/* memory highway: cell state C across the top            */}
        {/* ====================================================== */}
        <line
          x1={CELL.x - 14}
          y1={HWY_Y}
          x2={CELL.x + CELL.w + 14}
          y2={HWY_Y}
          stroke={lineActive}
          strokeWidth={highway ? 3.4 : 2.2}
        />
        <text
          x={CELL.x + 6}
          y={HWY_Y - 8}
          fontSize={9}
          fill={highway ? C.coral : C.muted}
          fontFamily={MONO}
        >
          memory highway · C
        </text>
        {/* C(t-1) in on the left, C_t out on the right */}
        <text
          x={CELL.x - 16}
          y={HWY_Y - 8}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="end"
        >
          C(t-1)
        </text>

        {/* forget-multiply node ⊙ on the highway */}
        <OpNode
          x={FORGET_X}
          y={HWY_Y}
          glyph="×"
          active={highway || sel === "f"}
          color={highway ? C.coral : C.muted}
        />
        {/* input-add node + on the highway */}
        <OpNode
          x={ADD_X}
          y={HWY_Y}
          glyph="+"
          active={sel === "i" || sel === "c"}
          color={C.muted}
        />

        {/* ====================================================== */}
        {/* gate blocks                                            */}
        {/* ====================================================== */}
        {(["f", "i", "c", "o"] as const).map((g) => {
          const gx = GATE_X[g];
          const meta = GATES[g];
          const isSel = sel === g;
          const dim = (g === "i" || g === "c") ? inputDim : 1;
          const kind = g === "c" ? "tanh" : "σ";
          const label =
            g === "f" ? "f_t" : g === "i" ? "i_t" : g === "c" ? "C~_t" : "o_t";
          return (
            <g key={g} opacity={dim} style={{ cursor: "pointer" }} onClick={() => setSel(isSel ? null : g)}>
              <rect
                x={gx}
                y={GATE_Y}
                width={GATE_W}
                height={GATE_H}
                rx={6}
                fill={isSel ? meta.fill : "var(--card)"}
                stroke={isSel ? meta.color : C.line}
                strokeWidth={isSel ? 2 : 1.2}
              />
              <text
                x={gx + GATE_W / 2}
                y={GATE_Y + 14}
                fontSize={11}
                fill={C.ink}
                fontFamily={MONO}
                textAnchor="middle"
                fontWeight={isSel ? 600 : 400}
              >
                {label}
              </text>
              <text
                x={gx + GATE_W / 2}
                y={GATE_Y + 27}
                fontSize={9}
                fill={meta.color}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {kind}
              </text>
            </g>
          );
        })}

        {/* ---- wiring: gates -> operations ---- */}
        {/* forget gate up into the forget-multiply node */}
        <path
          d={`M ${GATE_X.f + GATE_W / 2} ${GATE_Y} V ${HWY_Y + 9} `}
          fill="none"
          stroke={highway ? C.coral : sel === "f" ? C.coral : C.line}
          strokeWidth={sel === "f" || highway ? 2 : 1.2}
        />
        <text
          x={FORGET_X - 12}
          y={HWY_Y + 24}
          fontSize={8.5}
          fill={highway ? C.coral : C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {highway ? "f≈1" : "f_t"}
        </text>

        {/* input gate and candidate -> mix ⊗ node */}
        <path
          d={`M ${GATE_X.i + GATE_W / 2} ${GATE_Y} V ${MIX_Y + 8} H ${MIX_X}`}
          fill="none"
          stroke={sel === "i" ? C.blue : C.line}
          strokeWidth={sel === "i" ? 2 : 1.2}
          opacity={inputDim}
        />
        <path
          d={`M ${GATE_X.c + GATE_W / 2} ${GATE_Y} V ${MIX_Y + 8} H ${MIX_X}`}
          fill="none"
          stroke={sel === "c" ? C.green : C.line}
          strokeWidth={sel === "c" ? 2 : 1.2}
          opacity={inputDim}
        />
        <g opacity={inputDim}>
          <OpNode
            x={MIX_X}
            y={MIX_Y}
            glyph="×"
            active={sel === "i" || sel === "c"}
            color={C.muted}
          />
        </g>
        {/* mix -> add node on the highway */}
        <path
          d={`M ${MIX_X} ${MIX_Y - 9} V ${HWY_Y + 9}`}
          fill="none"
          stroke={sel === "i" || sel === "c" ? C.ink : C.line}
          strokeWidth={1.2}
          opacity={inputDim}
        />
        <text
          x={MIX_X + 6}
          y={MIX_Y + 2}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
          opacity={inputDim}
        >
          {highway ? "i≈0" : "i·C~"}
        </text>

        {/* ====================================================== */}
        {/* output path: tanh(C_t) · o_t -> h_t                    */}
        {/* ====================================================== */}
        {/* tap the highway down to the output multiply through a tanh */}
        <path
          d={`M ${TANHC_X} ${HWY_Y} V ${OUT_MULT_Y - 9}`}
          fill="none"
          stroke={sel === "o" ? C.violet : C.line}
          strokeWidth={1.2}
        />
        <rect
          x={TANHC_X - 22}
          y={(HWY_Y + OUT_MULT_Y) / 2 - 9}
          width={44}
          height={18}
          rx={5}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />
        <text
          x={TANHC_X}
          y={(HWY_Y + OUT_MULT_Y) / 2 + 3.5}
          fontSize={8.5}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          tanh
        </text>
        {/* output gate out of its right side, down to the output multiply node */}
        <path
          d={`M ${GATE_X.o + GATE_W} ${GATE_Y + GATE_H / 2} H ${OUT_MULT_X} V ${OUT_MULT_Y - 9}`}
          fill="none"
          stroke={sel === "o" ? C.violet : C.line}
          strokeWidth={sel === "o" ? 2 : 1.2}
        />
        <OpNode
          x={OUT_MULT_X}
          y={OUT_MULT_Y}
          glyph="×"
          active={sel === "o"}
          color={sel === "o" ? C.violet : C.muted}
        />
        {/* output multiply -> h_t out (down then right, leaving the cell) */}
        <path
          d={`M ${OUT_MULT_X + 9} ${OUT_MULT_Y} H ${CELL.x + CELL.w + 14}`}
          fill="none"
          stroke={sel === "o" ? C.violet : C.line}
          strokeWidth={sel === "o" ? 2 : 1.4}
        />

        {/* ====================================================== */}
        {/* outputs on the right                                   */}
        {/* ====================================================== */}
        <text
          x={CELL.x + CELL.w + 18}
          y={HWY_Y - 8}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
        >
          C_t
        </text>
        <text
          x={CELL.x + CELL.w + 18}
          y={OUT_MULT_Y + 3.5}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
        >
          h_t
        </text>

        {/* ====================================================== */}
        {/* bottom concatenation bus + inputs                      */}
        {/* ====================================================== */}
        <line
          x1={GATE_X.f + GATE_W / 2}
          y1={BUS_Y}
          x2={GATE_X.o + GATE_W / 2}
          y2={BUS_Y}
          stroke={C.line}
          strokeWidth={1.2}
        />
        {(["f", "i", "c", "o"] as const).map((g) => (
          <line
            key={`feed-${g}`}
            x1={GATE_X[g] + GATE_W / 2}
            y1={BUS_Y}
            x2={GATE_X[g] + GATE_W / 2}
            y2={GATE_Y + GATE_H}
            stroke={(g === "i" || g === "c") ? lineActive : C.line}
            strokeWidth={1.2}
            opacity={(g === "i" || g === "c") ? inputDim : 1}
          />
        ))}
        {/* concat label */}
        <text
          x={(GATE_X.f + GATE_X.o + GATE_W) / 2}
          y={BUS_Y + 16}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="middle"
        >
          concat [h(t-1), x_t]
        </text>
        {/* the two inputs entering the bus */}
        <line
          x1={CELL.x - 14}
          y1={BUS_Y}
          x2={GATE_X.f + GATE_W / 2}
          y2={BUS_Y}
          stroke={C.line}
          strokeWidth={1.2}
        />
        <text
          x={CELL.x - 16}
          y={BUS_Y - 16}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="end"
        >
          h(t-1)
        </text>
        <text
          x={CELL.x - 16}
          y={BUS_Y + 4}
          fontSize={10}
          fill={C.ink}
          fontFamily={MONO}
          textAnchor="end"
        >
          x_t
        </text>
        <line
          x1={CELL.x - 50}
          y1={BUS_Y - 12}
          x2={CELL.x - 14}
          y2={BUS_Y}
          stroke={C.line}
          strokeWidth={1}
        />
        <line
          x1={CELL.x - 50}
          y1={BUS_Y}
          x2={CELL.x - 14}
          y2={BUS_Y}
          stroke={C.line}
          strokeWidth={1}
        />

        {/* ====================================================== */}
        {/* readout band BELOW the drawing                         */}
        {/* ====================================================== */}
        <rect
          x={20}
          y={290}
          width={W - 40}
          height={56}
          rx={8}
          fill="var(--background)"
          stroke={info ? info.color : C.line}
          strokeWidth={info ? 1.6 : 1}
        />
        {info ? (
          <>
            <text
              x={32}
              y={309}
              fontSize={11}
              fill={info.color}
              fontFamily={MONO}
              fontWeight={600}
            >
              {info.name}
            </text>
            <text x={32} y={325} fontSize={11} fill={C.ink} fontFamily={MONO}>
              {info.eq}
            </text>
            <text x={32} y={339} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
              {info.desc}
            </text>
          </>
        ) : highway ? (
          <>
            <text
              x={32}
              y={309}
              fontSize={11}
              fill={C.coral}
              fontFamily={MONO}
              fontWeight={600}
            >
              highway open · f_t≈1, i_t≈0
            </text>
            <text x={32} y={325} fontSize={11} fill={C.ink} fontFamily={MONO}>
              C_t = 1·C(t-1) + 0·C~_t = C(t-1)
            </text>
            <text x={32} y={339} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
              old memory flows straight across the highway, untouched.
            </text>
          </>
        ) : (
          <>
            <text x={32} y={314} fontSize={11} fill={C.ink} fontFamily={MONO}>
              C_t = f_t · C(t-1) + i_t · C~_t
            </text>
            <text x={32} y={332} fontSize={9.5} fill={C.muted} fontFamily={MONO}>
              click a gate for its equation, or open the highway to see memory pass through.
            </text>
          </>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {(["f", "i", "c", "o"] as const).map((g) => {
          const meta = GATES[g];
          const active = sel === g;
          const label =
            g === "f"
              ? "forget f_t"
              : g === "i"
                ? "input i_t"
                : g === "c"
                  ? "candidate C~_t"
                  : "output o_t";
          return (
            <button
              key={g}
              onClick={() => setSel(active ? null : g)}
              className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
              style={active ? { background: meta.color, color: "var(--background)" } : undefined}
            >
              {label}
            </button>
          );
        })}
        <button
          onClick={() => setHighway((h) => !h)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={highway ? { background: C.coral, color: "var(--background)" } : undefined}
        >
          {highway ? "highway: on" : "show highway (f≈1, i≈0)"}
        </button>
        <button
          onClick={() => {
            setSel(null);
            setHighway(false);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// A small operation node (⊙ multiply or + add) drawn as a ringed glyph.
function OpNode({
  x,
  y,
  glyph,
  active,
  color,
}: {
  x: number;
  y: number;
  glyph: string;
  active: boolean;
  color: string;
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={9}
        fill="var(--card)"
        stroke={active ? color : C.line}
        strokeWidth={active ? 2 : 1.3}
      />
      <text
        x={x}
        y={y + 3.5}
        fontSize={11}
        fill={active ? color : C.muted}
        fontFamily={MONO}
        textAnchor="middle"
      >
        {glyph}
      </text>
    </g>
  );
}
