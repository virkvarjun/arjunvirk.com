"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

interface Node {
  id: string;
  layer: number;
  x: number;
  y: number;
  label?: string;
}

interface Edge {
  from: string;
  to: string;
}

// Layer column x-positions and node counts. Built deterministically below.
const LAYER_X: number[] = [80, 200, 310, 420];
const LAYER_COUNTS: number[] = [4, 5, 5, 2];
const LAYER_LABELS: (string[] | null)[] = [
  ["x1", "x2", "x3", "x4"],
  null,
  null,
  ["y1", "y2"],
];

const NODE_R = 11;
const CENTER_Y = 215; // vertical center of the node graph
const V_GAP = 30; // vertical spacing between nodes in a layer

function buildNodes(): Node[] {
  const nodes: Node[] = [];
  for (let l = 0; l < LAYER_COUNTS.length; l++) {
    const count = LAYER_COUNTS[l];
    const labels = LAYER_LABELS[l];
    const totalH = (count - 1) * V_GAP;
    const top = CENTER_Y - totalH / 2;
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: `l${l}n${i}`,
        layer: l,
        x: LAYER_X[l],
        y: top + i * V_GAP,
        label: labels ? labels[i] : undefined,
      });
    }
  }
  return nodes;
}

function buildEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  for (let l = 0; l < LAYER_COUNTS.length - 1; l++) {
    const from = nodes.filter((n: Node) => n.layer === l);
    const to = nodes.filter((n: Node) => n.layer === l + 1);
    for (const a of from) {
      for (const b of to) {
        edges.push({ from: a.id, to: b.id });
      }
    }
  }
  return edges;
}

const NODES: Node[] = buildNodes();
const EDGES: Edge[] = buildEdges(NODES);
const NODE_BY_ID: Record<string, Node> = NODES.reduce(
  (acc: Record<string, Node>, n: Node) => {
    acc[n.id] = n;
    return acc;
  },
  {},
);

// Tooltip term definitions for the formula popover.
const FORMULA_TERMS: { sym: string; def: string }[] = [
  { sym: "W", def: "weights" },
  { sym: "x", def: "input" },
  { sym: "b", def: "bias" },
  { sym: "σ", def: "nonlinearity" },
];

export function TfFeedforward() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [formulaHover, setFormulaHover] = useState<boolean>(false);

  const isEdgeActive = (e: Edge): boolean => {
    if (hovered === null) return false;
    return e.from === hovered || e.to === hovered;
  };

  return (
    <div>
      <svg
        viewBox="0 0 500 360"
        className="h-auto w-full"
        role="img"
        aria-label="Feedforward neural network with four fully-connected layers, information flowing left to right"
      >
        {/* Title band */}
        <text
          x={250}
          y={24}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Feedforward Neural Network
        </text>

        {/* Formula above the first gap (input -> hidden 1) */}
        <g
          onMouseEnter={() => setFormulaHover(true)}
          onMouseLeave={() => setFormulaHover(false)}
          style={{ cursor: "help" }}
        >
          {/* invisible hit area */}
          <rect
            x={96}
            y={44}
            width={108}
            height={20}
            fill="transparent"
          />
          <text
            x={150}
            y={59}
            fontFamily={MONO}
            fontSize={12}
            fill={formulaHover ? C.blue : C.ink}
            textAnchor="middle"
          >
            h = &#963;(Wx + b)
          </text>
          <line
            x1={104}
            y1={63}
            x2={196}
            y2={63}
            stroke={formulaHover ? C.blue : C.line}
            strokeWidth={0.75}
            strokeDasharray="2 2"
          />
        </g>

        {/* Edges */}
        <g>
          {EDGES.map((e: Edge, i: number) => {
            const a = NODE_BY_ID[e.from];
            const b = NODE_BY_ID[e.to];
            const active = isEdgeActive(e);
            const dim = hovered !== null && !active;
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            // start/end on node rims so arrowheads sit just outside the target
            const sx = a.x + Math.cos(ang) * NODE_R;
            const sy = a.y + Math.sin(ang) * NODE_R;
            const ex = b.x - Math.cos(ang) * (NODE_R + 1);
            const ey = b.y - Math.sin(ang) * (NODE_R + 1);
            const stroke = active ? C.blue : C.line;
            const opacity = dim ? 0.12 : active ? 0.95 : 0.4;
            // small arrowhead pointing into the target node
            const head = 5;
            const a1 = ang + Math.PI - 0.4;
            const a2 = ang + Math.PI + 0.4;
            return (
              <g key={i} stroke={stroke} fill={stroke} opacity={opacity}>
                <line
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  strokeWidth={active ? 1.5 : 0.8}
                />
                <polygon
                  stroke="none"
                  points={`${ex},${ey} ${ex + head * Math.cos(a1)},${ey + head * Math.sin(a1)} ${ex + head * Math.cos(a2)},${ey + head * Math.sin(a2)}`}
                />
              </g>
            );
          })}
        </g>

        {/* Layer captions under each column */}
        {[
          { x: LAYER_X[0], t: "input" },
          { x: LAYER_X[1], t: "hidden 1" },
          { x: LAYER_X[2], t: "hidden 2" },
          { x: LAYER_X[3], t: "output" },
        ].map((c: { x: number; t: string }) => (
          <text
            key={c.t}
            x={c.x}
            y={312}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.muted}
            textAnchor="middle"
          >
            {c.t}
          </text>
        ))}

        {/* Nodes */}
        {NODES.map((n: Node) => {
          const active = hovered === n.id;
          const connected =
            hovered !== null &&
            EDGES.some(
              (e: Edge) =>
                (e.from === hovered && e.to === n.id) ||
                (e.to === hovered && e.from === n.id),
            );
          const dim = hovered !== null && !active && !connected;
          const stroke = active || connected ? C.blue : C.ink;
          const fill = active
            ? C.blueFill
            : connected
              ? C.blueFill
              : "var(--card)";
          return (
            <g
              key={n.id}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
              opacity={dim ? 0.3 : 1}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={NODE_R}
                fill={fill}
                stroke={stroke}
                strokeWidth={active ? 2 : 1.4}
              />
              {n.label && (
                <text
                  x={n.x}
                  y={n.y + 3.2}
                  fontFamily={MONO}
                  fontSize={9.5}
                  fill={stroke}
                  textAnchor="middle"
                >
                  {n.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Formula tooltip popover (rendered last so it sits on top) */}
        {formulaHover && (
          <g>
            <rect
              x={150}
              y={70}
              width={150}
              height={74}
              rx={4}
              fill="var(--card)"
              stroke={C.blue}
              strokeWidth={1}
            />
            {FORMULA_TERMS.map(
              (t: { sym: string; def: string }, i: number) => (
                <text
                  key={t.sym}
                  x={160}
                  y={87 + i * 16}
                  fontFamily={MONO}
                  fontSize={10}
                  fill={C.ink}
                  textAnchor="start"
                >
                  <tspan fill={C.blue} fontWeight={600}>
                    {t.sym}
                  </tspan>
                  {`  ${t.def}`}
                </text>
              ),
            )}
          </g>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">
          Hover a node to trace its connections. Hover the formula for term
          definitions.
        </span>
        <button
          type="button"
          onClick={() => {
            setHovered(null);
            setFormulaHover(false);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
      </div>

      <p className="mt-2 font-mono text-xs text-[var(--muted)]">
        Information flows one way. No memory, fixed input size.
      </p>
    </div>
  );
}
