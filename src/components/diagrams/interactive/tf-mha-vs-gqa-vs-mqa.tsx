"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// --- Geometry (viewBox 600 x 430) ---
const W = 600;
const H = 430;

const N_Q = 8; // number of query heads (fixed)

// Three panels side by side.
const PANEL_W = 180;
const PANEL_GAP = 14;
const PANELS_TOTAL = 3 * PANEL_W + 2 * PANEL_GAP;
const PANEL_X0 = (W - PANELS_TOTAL) / 2; // left edge of first panel

// Vertical bands inside each panel.
const Q_Y = 118; // center row of query-head dots
const KV_Y = 250; // center row of key/value-head dots
const DOT_R = 7;

const PANEL_TOP = 88; // top of the panel frame
const PANEL_BOT = 300; // bottom of the panel frame

// Readout band geometry (below the drawing).
const READ_Y = 332;

type Mode = "MHA" | "GQA" | "MQA";

// Divisors of N_Q (8) that give valid even groupings, used by the slider.
const GROUP_STEPS: number[] = [1, 2, 4, 8];

// Per-panel descriptor: how many K/V heads (groups) the 8 query heads share.
type Panel = {
  key: Mode;
  title: string;
  groups: number; // number of K/V heads
};

function qHeadX(panelX: number, i: number): number {
  // Evenly spread N_Q query heads across the panel interior.
  const pad = 20;
  const span = PANEL_W - 2 * pad;
  return panelX + pad + (span * i) / (N_Q - 1);
}

function kvHeadX(panelX: number, g: number, groups: number): number {
  // Center each K/V head under the middle of the query heads it serves.
  const headsPerGroup = N_Q / groups;
  const first = g * headsPerGroup;
  const last = first + headsPerGroup - 1;
  return (qHeadX(panelX, first) + qHeadX(panelX, last)) / 2;
}

// Quality label as groups decrease (more sharing = lower quality).
function qualityFor(groups: number): { label: string; color: string } {
  if (groups >= N_Q) return { label: "best", color: C.green };
  if (groups === 1) return { label: "worse", color: C.coral };
  return { label: "near-best", color: C.blue };
}

export function TfMhaGqaMqa() {
  // Slider drives the GQA panel's K/V group count (and selects a mode).
  const [groupIdx, setGroupIdx] = useState<number>(1); // index into GROUP_STEPS -> 2 groups
  const gqaGroups = GROUP_STEPS[groupIdx];

  // The active mode is implied by the chosen group count.
  const activeMode: Mode =
    gqaGroups >= N_Q ? "MHA" : gqaGroups === 1 ? "MQA" : "GQA";

  const setMode = (m: Mode): void => {
    if (m === "MHA") setGroupIdx(3); // 8 groups
    else if (m === "MQA") setGroupIdx(0); // 1 group
    else setGroupIdx(1); // 2 groups (a representative GQA)
  };

  const panels: Panel[] = [
    { key: "MHA", title: "MHA", groups: N_Q },
    { key: "GQA", title: "GQA", groups: gqaGroups },
    { key: "MQA", title: "MQA", groups: 1 },
  ];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Comparison of Multi-Head Attention, Grouped-Query Attention, and Multi-Query Attention. Eight query heads connect down to key/value heads. In MHA each query head has its own K/V head (8 total). In GQA the query heads are split into groups that each share one K/V head. In MQA all eight query heads share a single K/V head. Fewer K/V heads shrink the key/value cache at a small quality cost."
      >
        {/* Title band */}
        <text
          x={W / 2}
          y={24}
          fontFamily={MONO}
          fontSize={14}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          MHA vs GQA vs MQA
        </text>
        <text
          x={W / 2}
          y={42}
          fontFamily={MONO}
          fontSize={10}
          fill={C.muted}
          textAnchor="middle"
        >
          8 query heads sharing fewer key/value heads
        </text>

        {/* Row legend (left of panels) */}
        <text
          x={W / 2}
          y={64}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          top row = Q heads   ·   bottom row = K/V heads
        </text>

        {/* ===== Panels ===== */}
        {panels.map((p: Panel, pi: number) => {
          const panelX = PANEL_X0 + pi * (PANEL_W + PANEL_GAP);
          const active = p.key === activeMode;
          const cache = p.groups; // KV cache scales with number of K/V heads
          const saving = N_Q / p.groups; // e.g. 8x, 4x, 1x
          const q = qualityFor(p.groups);

          return (
            <g key={p.key}>
              {/* Panel frame */}
              <rect
                x={panelX}
                y={PANEL_TOP}
                width={PANEL_W}
                height={PANEL_BOT - PANEL_TOP}
                rx={8}
                fill={active ? C.coralFill : "var(--card)"}
                stroke={active ? C.coral : C.line}
                strokeWidth={active ? 2 : 1.1}
              />
              {/* Panel title */}
              <text
                x={panelX + PANEL_W / 2}
                y={PANEL_TOP + 16}
                fontFamily={MONO}
                fontSize={12}
                fill={active ? C.coral : C.ink}
                fontWeight={600}
                textAnchor="middle"
              >
                {p.title}
              </text>

              {/* Connector lines: each Q head -> its shared K/V head */}
              {Array.from({ length: N_Q }, (_, i) => i).map((i: number) => {
                const g = Math.floor(i / (N_Q / p.groups));
                const x1 = qHeadX(panelX, i);
                const x2 = kvHeadX(panelX, g, p.groups);
                return (
                  <line
                    key={`ln${pi}-${i}`}
                    x1={x1}
                    y1={Q_Y + DOT_R}
                    x2={x2}
                    y2={KV_Y - DOT_R}
                    stroke={active ? C.coral : C.line}
                    strokeWidth={active ? 1.2 : 0.9}
                    opacity={active ? 0.9 : 0.7}
                  />
                );
              })}

              {/* Query-head dots (top row) */}
              {Array.from({ length: N_Q }, (_, i) => i).map((i: number) => (
                <circle
                  key={`q${pi}-${i}`}
                  cx={qHeadX(panelX, i)}
                  cy={Q_Y}
                  r={DOT_R}
                  fill={C.blueFill}
                  stroke={C.blue}
                  strokeWidth={1.4}
                />
              ))}

              {/* Key/Value-head dots (bottom row) */}
              {Array.from({ length: p.groups }, (_, g) => g).map(
                (g: number) => (
                  <circle
                    key={`kv${pi}-${g}`}
                    cx={kvHeadX(panelX, g, p.groups)}
                    cy={KV_Y}
                    r={DOT_R + 1}
                    fill={active ? C.coralFill : C.greenFill}
                    stroke={active ? C.coral : C.green}
                    strokeWidth={1.6}
                  />
                ),
              )}

              {/* Row labels (inside panel, left-aligned, clear of dots) */}
              <text
                x={panelX + 8}
                y={Q_Y - 14}
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.blue}
                textAnchor="start"
              >
                {`${N_Q} Q`}
              </text>
              <text
                x={panelX + 8}
                y={KV_Y + 22}
                fontFamily={MONO}
                fontSize={8.5}
                fill={active ? C.coral : C.green}
                textAnchor="start"
              >
                {`${p.groups} K/V`}
              </text>

              {/* Readout band below each panel */}
              <text
                x={panelX + PANEL_W / 2}
                y={READ_Y}
                fontFamily={MONO}
                fontSize={10}
                fill={C.ink}
                textAnchor="middle"
              >
                {`cache: ${cache}/8`}
              </text>
              <text
                x={panelX + PANEL_W / 2}
                y={READ_Y + 16}
                fontFamily={MONO}
                fontSize={10}
                fill={C.muted}
                textAnchor="middle"
              >
                {saving === 1
                  ? "full size"
                  : `${Math.round(saving)}x smaller`}
              </text>
              <text
                x={panelX + PANEL_W / 2}
                y={READ_Y + 32}
                fontFamily={MONO}
                fontSize={10}
                fill={q.color}
                textAnchor="middle"
                fontWeight={600}
              >
                {`quality: ${q.label}`}
              </text>
            </g>
          );
        })}

        {/* Caption band at the very bottom */}
        <text
          x={W / 2}
          y={H - 14}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Share K/V across query heads to shrink the cache. GQA is the sweet
          spot.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-[var(--muted)]">mode:</span>
        {(["MHA", "GQA", "MQA"] as Mode[]).map((m: Mode) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={activeMode === m}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              activeMode === m
                ? { background: C.ink, color: "var(--background)" }
                : undefined
            }
          >
            {m}
          </button>
        ))}
        <span className="ml-2 font-mono text-[var(--muted)]">K/V heads:</span>
        <input
          type="range"
          min={0}
          max={GROUP_STEPS.length - 1}
          step={1}
          value={groupIdx}
          onChange={(e) => setGroupIdx(Number(e.target.value))}
          className="w-28 accent-[var(--foreground)]"
        />
        <span className="font-mono tabular-nums">{gqaGroups}</span>
        <span className="font-mono text-[var(--muted)]">
          {`(${activeMode}, cache ${gqaGroups}/8, ${Math.round(
            N_Q / gqaGroups,
          )}x smaller)`}
        </span>
      </div>
    </div>
  );
}
