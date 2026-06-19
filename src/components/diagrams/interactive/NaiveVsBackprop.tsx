"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// Same tiny network on both panels: layer sizes 3 -> 3 -> 2 -> 1.
const LAYERS = [3, 3, 2, 1] as const;
const DEPTH = LAYERS.length; // 4 node-layers, 3 edge-layers

// Edges grouped by the edge-layer they belong to. An edge connects a node in
// layer L (source) to a node in layer L+1 (target). We index nodes per layer.
type Edge = { layer: number; from: number; to: number };

const EDGES: Edge[] = [];
for (let L = 0; L < LAYERS.length - 1; L++) {
  for (let to = 0; to < LAYERS[L + 1]; to++) {
    for (let from = 0; from < LAYERS[L]; from++) {
      EDGES.push({ layer: L, from, to });
    }
  }
}
// 3*3 + 3*2 + 2*1 = 9 + 6 + 2 = 17 weights total.
const WEIGHT_COUNT = EDGES.length;

// All neurons in layers 1.. (everything past the inputs) carry an error value
// that backprop computes once. Inputs (layer 0) are not differentiated.
type Neuron = { layer: number; idx: number };
const ERR_NEURONS: Neuron[] = [];
for (let L = 1; L < LAYERS.length; L++) {
  for (let i = 0; i < LAYERS[L]; i++) ERR_NEURONS.push({ layer: L, idx: i });
}
// 3 + 2 + 1 = 6 neurons get exactly one error each in backprop.

// ---- Deterministic step scripts -------------------------------------------
// The shared timeline has one stage per processed weight, walked output-side
// first so the "shared subpath" pile-up is obvious early.
//
// NAIVE: stage k traces weight EDGES[order[k]] all the way to the cost. The
// chain length grows with how deep (far from output) the weight sits, so the
// per-step op cost = remaining edge-layers on the path to the output. Running
// total therefore grows faster than linearly in the number of weights.
//
// BACKPROP: a single right-to-left sweep assigns ONE error per neuron (6 ops),
// then each weight gradient is read off in 1 cheap op. Total stays linear.

// Process weights output-layer-first: layer 2 edges, then layer 1, then layer 0.
const ORDER: number[] = (() => {
  const byLayer: number[][] = [[], [], []];
  EDGES.forEach((e, i) => byLayer[e.layer].push(i));
  return [...byLayer[2], ...byLayer[1], ...byLayer[0]];
})();

// Path length (in edges) from a weight's edge-layer to the cost: the weight
// itself plus every later edge-layer. Each edge on that path is one naive op,
// and shared late edges get re-traced on every step.
function naiveOpsForWeight(e: Edge): number {
  return DEPTH - 1 - e.layer; // layer 2 -> 1, layer 1 -> 2, layer 0 -> 3
}

// Which (layer, target-node) edge-slots lie on the traced path of a weight:
// from the weight's own target neuron, follow ANY forward edge to the output.
// We mark whole downstream edge-layers as "on a path" for the visit-count viz.
function pathEdges(e: Edge): Set<number> {
  const onPath = new Set<number>();
  onPath.add(EDGES.indexOf(e));
  // Every edge in strictly-later layers is part of some chain to the cost; for
  // this small net we light the full downstream cone for legibility.
  EDGES.forEach((edge, i) => {
    if (edge.layer > e.layer) onPath.add(i);
  });
  return onPath;
}

type Stage = {
  weightEdge: number; // index into EDGES processed this stage
  naiveStepOps: number;
  visited: number[]; // edge indices re-traced this stage (naive)
  bpNeuron: number | null; // neuron index colored this stage (backprop sweep)
  bpEdge: number; // weight gradient read off (backprop), = weightEdge
};

const STAGES: Stage[] = ORDER.map((ei, k) => {
  const e = EDGES[ei];
  const visited = [...pathEdges(e)];
  // Backprop colors one new neuron during the first 6 stages (the sweep), then
  // is just reading gradients; map stage -> neuron while any remain.
  const bpNeuron = k < ERR_NEURONS.length ? k : null;
  return {
    weightEdge: ei,
    naiveStepOps: naiveOpsForWeight(e),
    visited,
    bpNeuron,
    bpEdge: ei,
  };
});

// Backprop sweep colors neurons right-to-left (output first). Reorder neuron
// reveal so the first stages light the rightmost neurons.
const BP_NEURON_ORDER: number[] = (() => {
  const order = ERR_NEURONS.map((_, i) => i).sort((a, b) => {
    return ERR_NEURONS[b].layer - ERR_NEURONS[a].layer;
  });
  return order;
})();

// Each backprop neuron costs 1 op; each weight read costs 1 op.
function bpOpsAfter(step: number): number {
  const neurons = Math.min(step, ERR_NEURONS.length);
  const weights = step; // one gradient read per processed weight
  return neurons + weights;
}
function naiveOpsAfter(step: number): number {
  let t = 0;
  for (let k = 0; k < step; k++) t += STAGES[k].naiveStepOps;
  return t;
}

// ---- Geometry --------------------------------------------------------------
const PANEL_W = 200;
const LEFT_X0 = 16;
const RIGHT_X0 = 240;
const TOP = 40;
const COL_GAP = 52;
const ROW_GAP = 34;
const R = 9;

function nodeXY(panelX0: number, layer: number, idx: number, count: number) {
  const x = panelX0 + 24 + layer * COL_GAP;
  const totalH = (count - 1) * ROW_GAP;
  const y = TOP + 50 - totalH / 2 + idx * ROW_GAP;
  return { x, y };
}

function NetEdges({
  panelX0,
  colorOf,
  widthOf,
}: {
  panelX0: number;
  colorOf: (i: number) => string;
  widthOf: (i: number) => number;
}) {
  return (
    <g>
      {EDGES.map((e, i) => {
        const a = nodeXY(panelX0, e.layer, e.from, LAYERS[e.layer]);
        const b = nodeXY(panelX0, e.layer + 1, e.to, LAYERS[e.layer + 1]);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={colorOf(i)}
            strokeWidth={widthOf(i)}
          />
        );
      })}
    </g>
  );
}

function NetNodes({
  panelX0,
  fillOf,
  strokeOf,
}: {
  panelX0: number;
  fillOf: (n: Neuron) => string;
  strokeOf: (n: Neuron) => string;
}) {
  const nodes: { layer: number; idx: number }[] = [];
  LAYERS.forEach((c, L) => {
    for (let i = 0; i < c; i++) nodes.push({ layer: L, idx: i });
  });
  return (
    <g>
      {nodes.map((n, k) => {
        const p = nodeXY(panelX0, n.layer, n.idx, LAYERS[n.layer]);
        return (
          <circle
            key={k}
            cx={p.x}
            cy={p.y}
            r={R}
            fill={fillOf(n)}
            stroke={strokeOf(n)}
            strokeWidth={1.6}
          />
        );
      })}
    </g>
  );
}

export function NaiveVsBackprop() {
  const [step, setStep] = useState(0); // weights processed so far (0..WEIGHT_COUNT)

  const reset = () => setStep(0);
  const next = () => setStep((s) => Math.min(s + 1, WEIGHT_COUNT));
  const run = () => setStep(WEIGHT_COUNT);

  // Accumulated naive visit-counts per edge across all processed weights.
  const visitCount = new Array<number>(WEIGHT_COUNT).fill(0);
  for (let k = 0; k < step; k++) {
    for (const ei of STAGES[k].visited) visitCount[ei]++;
  }
  const maxVisit = Math.max(1, ...visitCount);

  // Backprop: which neurons have an error stored (revealed right-to-left), and
  // which weight gradients have been read off.
  const bpNeuronsLit = new Set<number>();
  for (let k = 0; k < Math.min(step, ERR_NEURONS.length); k++) {
    bpNeuronsLit.add(BP_NEURON_ORDER[k]);
  }
  const bpEdgesRead = new Set<number>();
  for (let k = 0; k < step; k++) bpEdgesRead.add(STAGES[k].bpEdge);

  const naiveOps = naiveOpsAfter(step);
  const bpOps = bpOpsAfter(step);

  // ---- Left panel (naive) styling ----
  const naiveEdgeColor = (i: number) => {
    const v = visitCount[i];
    if (v <= 0) return C.line;
    return C.coral;
  };
  const naiveEdgeWidth = (i: number) => {
    const v = visitCount[i];
    if (v <= 0) return 1;
    return 1.4 + (v / maxVisit) * 3.2; // piles up on shared late edges
  };
  const naiveNodeFill = () => "var(--card)";
  const naiveNodeStroke = () => C.line;

  // ---- Right panel (backprop) styling ----
  const bpEdgeColor = (i: number) => (bpEdgesRead.has(i) ? C.green : C.line);
  const bpEdgeWidth = (i: number) => (bpEdgesRead.has(i) ? 2 : 1);
  const bpNodeIndex = (n: Neuron) =>
    ERR_NEURONS.findIndex((m) => m.layer === n.layer && m.idx === n.idx);
  const bpNodeFill = (n: Neuron) => {
    const idx = bpNodeIndex(n);
    return idx >= 0 && bpNeuronsLit.has(idx) ? C.blueFill : "var(--card)";
  };
  const bpNodeStroke = (n: Neuron) => {
    const idx = bpNodeIndex(n);
    return idx >= 0 && bpNeuronsLit.has(idx) ? C.blue : C.line;
  };

  const doneTag = step >= WEIGHT_COUNT ? " (done)" : "";

  return (
    <div>
      <svg
        viewBox="0 0 440 250"
        className="h-auto w-full"
        role="img"
        aria-label="Naive vs backprop work"
      >
        {/* panel frames */}
        <rect
          x={LEFT_X0}
          y={TOP - 24}
          width={PANEL_W}
          height={170}
          rx={6}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />
        <rect
          x={RIGHT_X0}
          y={TOP - 24}
          width={PANEL_W}
          height={170}
          rx={6}
          fill="var(--background)"
          stroke={C.line}
          strokeWidth={1}
        />

        <g fontFamily={MONO} textAnchor="middle">
          <text x={LEFT_X0 + PANEL_W / 2} y={TOP - 9} fontSize={11} fill={C.coral}>
            naive (re-trace each weight)
          </text>
          <text x={RIGHT_X0 + PANEL_W / 2} y={TOP - 9} fontSize={11} fill={C.blue}>
            backprop (sweep once)
          </text>
        </g>

        {/* Left: naive, accumulated traced paths, thicker where re-trodden */}
        <NetEdges
          panelX0={LEFT_X0}
          colorOf={naiveEdgeColor}
          widthOf={naiveEdgeWidth}
        />
        <NetNodes
          panelX0={LEFT_X0}
          fillOf={naiveNodeFill}
          strokeOf={naiveNodeStroke}
        />

        {/* Right: backprop, one error per neuron, then cheap reads */}
        <NetEdges panelX0={RIGHT_X0} colorOf={bpEdgeColor} widthOf={bpEdgeWidth} />
        <NetNodes
          panelX0={RIGHT_X0}
          fillOf={bpNodeFill}
          strokeOf={bpNodeStroke}
        />

        {/* per-edge visit counts on the most-shared (output-side) edges */}
        <g fontFamily={MONO} textAnchor="middle">
          {EDGES.map((e, i) => {
            if (e.layer !== DEPTH - 2 || visitCount[i] <= 1) return null;
            const a = nodeXY(LEFT_X0, e.layer, e.from, LAYERS[e.layer]);
            const b = nodeXY(LEFT_X0, e.layer + 1, e.to, LAYERS[e.layer + 1]);
            return (
              <text
                key={i}
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 4}
                fontSize={9}
                fill={C.coral}
              >
                ×{visitCount[i]}
              </text>
            );
          })}
        </g>

        {/* Counters, the punchline */}
        <g fontFamily={MONO}>
          <text x={LEFT_X0 + 8} y={TOP + 162} fontSize={13} fill={C.coral}>
            naive ops: {naiveOps}
          </text>
          <text x={RIGHT_X0 + 8} y={TOP + 162} fontSize={13} fill={C.green}>
            backprop ops: {bpOps}
          </text>
          <text
            x={220}
            y={TOP + 188}
            fontSize={11}
            fill={C.ink}
            textAnchor="middle"
          >
            weights processed: {step} / {WEIGHT_COUNT}
            {doneTag}
          </text>
          <text
            x={220}
            y={TOP + 204}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
          >
            same gradients, hugely different cost, backprop never recomputes a
            shared subpath
          </text>
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={next}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Step
        </button>
        <button
          type="button"
          onClick={run}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Run
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Reset
        </button>
        <span className="font-mono text-[var(--muted)]">
          naive {naiveOps} vs backprop {bpOps} ops, the gap widens with every
          weight.
        </span>
      </div>
    </div>
  );
}
