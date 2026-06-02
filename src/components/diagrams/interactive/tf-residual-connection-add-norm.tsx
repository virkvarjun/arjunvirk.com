"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

type Mode = "post" | "pre";

// Vertical layout: flow goes bottom -> top.
// Center column x for boxes/nodes:
const CX = 230;
// Skip path runs down the LEFT side, clearly to the left of the sublayer box.
const SKIP_X = 95;

// Y positions (top of drawing area to bottom).
const Y_OUT = 78; // output node
const Y_NORM = 132; // LayerNorm (post-norm) OR sublayer-output region
const Y_ADD = 200; // Add (+) node
const Y_SUB = 274; // sublayer box center
const Y_IN = 352; // input x split point

const BOX_W = 168;
const BOX_H = 40;
const NODE_R = 15;

export function TfResidual() {
  const [mode, setMode] = useState<Mode>("post");
  const [backprop, setBackprop] = useState<boolean>(false);
  const [phase, setPhase] = useState<number>(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!backprop) {
      setPhase(0);
      frame.current = 0;
      return;
    }
    const id = window.setInterval(() => {
      frame.current = (frame.current + 1) % 100;
      setPhase(frame.current);
    }, 40);
    return () => window.clearInterval(id);
  }, [backprop]);

  // Backprop travels TOP -> BOTTOM (reverse of forward). p in [0,1].
  const p = phase / 100;

  const isPre = mode === "pre";

  // Labels for the two box positions depending on mode.
  // post-norm: Sublayer in middle, LayerNorm after the Add.
  // pre-norm:  LayerNorm before the Sublayer, Add at top (norm-free residual).
  // We keep the geometry fixed and just swap which label sits where, plus
  // move the Norm node, to convey the rearrangement clearly.

  // Forward direction arrow color
  const FWD = C.line;

  // A dot traveling down the skip path during backprop (always strong signal).
  // Skip path geometry: from Add node up-left region down to input split.
  // We render the gradient pulse as a moving dot along each segment.

  // Helper: point along skip vertical line between Y_ADD and Y_IN
  const skipGradY = Y_ADD + (Y_IN - Y_ADD) * p;

  // Gradient through sublayer (main path) is tiny -> dot fades / barely moves.
  const subGradY = Y_ADD + (Y_IN - Y_ADD) * p;
  const subGradOpacity = backprop ? Math.max(0, 0.35 - p * 0.3) : 0;

  return (
    <div>
      <svg
        viewBox="0 0 460 432"
        className="h-auto w-full"
        role="img"
        aria-label="Residual connection: input x splits into a sublayer path and a skip path that bypasses the sublayer, then both are summed at an Add node and passed through LayerNorm."
      >
        {/* Title band */}
        <text
          x={230}
          y={26}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Residual Connection (Add &amp; Norm)
        </text>
        <text
          x={230}
          y={46}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          {isPre ? "pre-norm: norm before sublayer" : "post-norm: norm after add"}
        </text>

        {/* arrowhead marker defs */}
        <defs>
          <marker
            id="rc-head"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill={C.line} />
          </marker>
          <marker
            id="rc-head-coral"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill={C.coral} />
          </marker>
        </defs>

        {/* ===================== FORWARD PATHS ===================== */}

        {/* Input node x (bottom) */}
        <circle
          cx={CX}
          cy={Y_IN}
          r={NODE_R}
          fill="var(--card)"
          stroke={C.ink}
          strokeWidth={1.6}
        />
        <text
          x={CX}
          y={Y_IN + 4}
          fontFamily={MONO}
          fontSize={12}
          fill={C.ink}
          textAnchor="middle"
        >
          x
        </text>

        {/* Split point: short stub up from x, then branch left (skip) and up (main) */}
        {/* Skip branch: x -> left -> up -> into Add from the left.
            Routed well to the LEFT of the sublayer box so it never crosses it. */}
        <path
          d={`M ${CX - NODE_R} ${Y_IN}
              C ${SKIP_X + 40} ${Y_IN}, ${SKIP_X} ${Y_IN - 10}, ${SKIP_X} ${Y_IN - 30}
              L ${SKIP_X} ${Y_ADD + 30}
              C ${SKIP_X} ${Y_ADD + 10}, ${SKIP_X + 40} ${Y_ADD}, ${CX - NODE_R - 2} ${Y_ADD}`}
          fill="none"
          stroke={isPre ? C.line : C.green}
          strokeWidth={2}
          markerEnd="url(#rc-head)"
        />
        <text
          x={SKIP_X - 8}
          y={(Y_IN + Y_ADD) / 2}
          fontFamily={MONO}
          fontSize={10}
          fill={isPre ? C.muted : C.green}
          textAnchor="end"
        >
          +x
        </text>
        <text
          x={SKIP_X - 8}
          y={(Y_IN + Y_ADD) / 2 + 13}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="end"
        >
          skip
        </text>

        {/* Main branch: x -> up into sublayer (pre-norm inserts a Norm first) */}
        <line
          x1={CX}
          y1={Y_IN - NODE_R}
          x2={CX}
          y2={Y_SUB + BOX_H / 2 + 2}
          stroke={FWD}
          strokeWidth={2}
          markerEnd="url(#rc-head)"
        />

        {/* Pre-norm: a small Norm tag sits on the main path just below the
            sublayer box (norm before sublayer). Post-norm: no tag here. */}
        {isPre && (
          <>
            <rect
              x={CX - 44}
              y={Y_SUB + BOX_H / 2 + 8}
              width={88}
              height={22}
              rx={4}
              fill={C.violet + "22"}
              stroke={C.violet}
              strokeWidth={1.4}
            />
            <text
              x={CX}
              y={Y_SUB + BOX_H / 2 + 23}
              fontFamily={MONO}
              fontSize={10}
              fill={C.violet}
              textAnchor="middle"
            >
              LayerNorm
            </text>
          </>
        )}

        {/* Sublayer box (main path) */}
        <rect
          x={CX - BOX_W / 2}
          y={Y_SUB - BOX_H / 2}
          width={BOX_W}
          height={BOX_H}
          rx={6}
          fill={C.blueFill}
          stroke={C.blue}
          strokeWidth={1.6}
        />
        <text
          x={CX}
          y={Y_SUB - 2}
          fontFamily={MONO}
          fontSize={11}
          fill={C.blue}
          textAnchor="middle"
        >
          Sublayer
        </text>
        <text
          x={CX}
          y={Y_SUB + 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.blue}
          textAnchor="middle"
        >
          (Attention or FFN)
        </text>

        {/* Sublayer -> Add */}
        <line
          x1={CX}
          y1={Y_SUB - BOX_H / 2}
          x2={CX}
          y2={Y_ADD + NODE_R + 2}
          stroke={FWD}
          strokeWidth={2}
          markerEnd="url(#rc-head)"
        />

        {/* Add (+) node */}
        <circle
          cx={CX}
          cy={Y_ADD}
          r={NODE_R}
          fill="var(--card)"
          stroke={C.ink}
          strokeWidth={1.8}
        />
        <text
          x={CX}
          y={Y_ADD + 5}
          fontFamily={MONO}
          fontSize={15}
          fill={C.ink}
          textAnchor="middle"
        >
          +
        </text>
        <text
          x={CX + NODE_R + 8}
          y={Y_ADD + 4}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="start"
        >
          Add
        </text>

        {/* Add -> (post-norm: LayerNorm) -> out */}
        {!isPre ? (
          <>
            <line
              x1={CX}
              y1={Y_ADD - NODE_R}
              x2={CX}
              y2={Y_NORM + 13}
              stroke={FWD}
              strokeWidth={2}
              markerEnd="url(#rc-head)"
            />
            <rect
              x={CX - 50}
              y={Y_NORM - 12}
              width={100}
              height={24}
              rx={5}
              fill={C.violet + "22"}
              stroke={C.violet}
              strokeWidth={1.6}
            />
            <text
              x={CX}
              y={Y_NORM + 4}
              fontFamily={MONO}
              fontSize={11}
              fill={C.violet}
              textAnchor="middle"
            >
              LayerNorm
            </text>
            <line
              x1={CX}
              y1={Y_NORM - 12}
              x2={CX}
              y2={Y_OUT + NODE_R + 2}
              stroke={FWD}
              strokeWidth={2}
              markerEnd="url(#rc-head)"
            />
          </>
        ) : (
          <line
            x1={CX}
            y1={Y_ADD - NODE_R}
            x2={CX}
            y2={Y_OUT + NODE_R + 2}
            stroke={FWD}
            strokeWidth={2}
            markerEnd="url(#rc-head)"
          />
        )}

        {/* Output node */}
        <circle
          cx={CX}
          cy={Y_OUT}
          r={NODE_R}
          fill="var(--card)"
          stroke={C.ink}
          strokeWidth={1.6}
        />
        <text
          x={CX}
          y={Y_OUT + 4}
          fontFamily={MONO}
          fontSize={11}
          fill={C.ink}
          textAnchor="middle"
        >
          out
        </text>

        {/* ===================== BACKPROP OVERLAY ===================== */}
        {backprop && (
          <g>
            {/* Coral pulse traveling DOWN the skip path = strong, clean gradient. */}
            <circle cx={SKIP_X} cy={skipGradY} r={5.5} fill={C.coral} />
            <circle
              cx={SKIP_X}
              cy={skipGradY}
              r={9}
              fill="none"
              stroke={C.coral}
              strokeWidth={1.2}
              opacity={0.5}
            />
            {/* tiny, fading pulse on the sublayer (main) path */}
            <circle
              cx={CX}
              cy={subGradY}
              r={3}
              fill={C.coral}
              opacity={subGradOpacity}
            />
          </g>
        )}

        {/* ===================== READOUT BAND (below drawing) ===================== */}
        <line
          x1={20}
          y1={384}
          x2={440}
          y2={384}
          stroke={C.line}
          strokeWidth={0.75}
          strokeDasharray="3 3"
        />
        {backprop ? (
          <>
            <text
              x={230}
              y={402}
              fontFamily={MONO}
              fontSize={10}
              fill={C.coral}
              textAnchor="middle"
            >
              backprop: gradient flows freely down +x skip
            </text>
            <text
              x={230}
              y={418}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
              textAnchor="middle"
            >
              sublayer gradient may shrink; the skip keeps a clear road back
            </text>
          </>
        ) : (
          <>
            <text
              x={230}
              y={402}
              fontFamily={MONO}
              fontSize={10}
              fill={C.ink}
              textAnchor="middle"
            >
              {isPre
                ? "out = x + Sublayer(LayerNorm(x))"
                : "out = LayerNorm(x + Sublayer(x))"}
            </text>
            <text
              x={230}
              y={418}
              fontFamily={MONO}
              fontSize={9.5}
              fill={C.muted}
              textAnchor="middle"
            >
              the +x skip path bypasses the sublayer entirely
            </text>
          </>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => setBackprop((b: boolean) => !b)}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={
            backprop ? { background: C.ink, color: "var(--background)" } : undefined
          }
        >
          {backprop ? "backprop: on" : "backprop: off"}
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--muted)]">norm:</span>
          <button
            type="button"
            onClick={() => setMode("post")}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              mode === "post"
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            post-norm
          </button>
          <button
            type="button"
            onClick={() => setMode("pre")}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              mode === "pre"
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            pre-norm
          </button>
        </div>
      </div>

      <p className="mt-2 font-mono text-xs text-[var(--muted)]">
        The +x skip path gives gradients a clear road back, so deep stacks stay
        trainable.
      </p>
    </div>
  );
}
