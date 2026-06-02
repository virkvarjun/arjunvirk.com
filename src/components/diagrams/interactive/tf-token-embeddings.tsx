"use client";

import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../frame";

// ---- Static data (deterministic; no random/date at module load) ----

// The token we look up and its row index in the embedding matrix.
const TOKEN = "Transform";
const TOKEN_ID = 1231;

// Words shown in the 2D scatter. The first four cluster together (sports),
// "philosophy" sits far away. Each carries a 5-dim vector for the readout.
interface Word {
  label: string;
  x: number; // scatter coordinate in [0,1]
  y: number; // scatter coordinate in [0,1]
  vec: number[]; // 5-dim embedding shown on hover
  cluster: "sport" | "far";
}

const WORDS: Word[] = [
  { label: "bat", x: 0.14, y: 0.24, vec: [0.1, 0.3, 0.4, 0.9, 0.8], cluster: "sport" },
  { label: "ball", x: 0.46, y: 0.18, vec: [0.2, 0.3, 0.5, 0.8, 0.9], cluster: "sport" },
  { label: "swung", x: 0.12, y: 0.66, vec: [0.1, 0.4, 0.3, 0.9, 0.7], cluster: "sport" },
  { label: "hit", x: 0.46, y: 0.54, vec: [0.2, 0.2, 0.5, 0.8, 0.8], cluster: "sport" },
  { label: "philosophy", x: 0.82, y: 0.84, vec: [0.9, 0.7, 0.1, 0.2, 0.1], cluster: "far" },
];

// The embedding matrix: V rows x d cols, drawn as a compact grid.
const V_ROWS = 9; // visual rows (vocab is much larger; this is a sketch)
const D_COLS = 5; // embedding dimension == length of pulled-out vector
const HILITE_ROW = 5; // which drawn row is highlighted as token 1231

// Vector pulled out of the highlighted row.
const VECTOR: number[] = [0.1, 0.3, 0.4, 0.9, 0.8];

// ---- Geometry ----

// Matrix grid placement (middle region).
const M_X = 196; // left edge of grid
const M_Y = 86; // top edge of grid
const CELL = 16; // cell size
const M_W = D_COLS * CELL;
const M_H = V_ROWS * CELL;

// Pulled-out vector placement (right region of the top row).
const VEC_X = 372;
const VEC_Y = 86;
const VCELL = 22;

// Scatter region (own band, lower portion).
const SC_X = 196;
const SC_Y = 286;
const SC_W = 168;
const SC_H = 84;

export function TfTokenEmbeddings() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pulled, setPulled] = useState<boolean>(false);
  // Animation progress 0..1 of the row being pulled out.
  const [anim, setAnim] = useState<number>(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!pulled) {
      setAnim(0);
      return;
    }
    frame.current = 0;
    const id = setInterval(() => {
      frame.current += 1;
      const t = Math.min(1, frame.current / 18);
      setAnim(t);
      if (t >= 1) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [pulled]);

  const hoveredWord: Word | null =
    hovered === null ? null : (WORDS.find((w: Word) => w.label === hovered) ?? null);

  // The vector currently shown in the right readout: hovered word, else the
  // pulled-out token row.
  const shownVec: number[] = hoveredWord ? hoveredWord.vec : VECTOR;
  const showVector = pulled || hoveredWord !== null;

  // Highlighted row geometry.
  const rowY = M_Y + HILITE_ROW * CELL;

  return (
    <div>
      <svg
        viewBox="0 0 560 414"
        className="h-auto w-full"
        role="img"
        aria-label="Token embeddings: a token maps to a row of the embedding matrix, pulled out as a vector, and related words cluster in a 2D projection"
      >
        {/* ---- Title band ---- */}
        <text
          x={280}
          y={24}
          fontFamily={MONO}
          fontSize={13}
          fill={C.ink}
          fontWeight={600}
          textAnchor="middle"
        >
          Token Embeddings
        </text>

        {/* ============ REGION 1: token + id (left) ============ */}
        <g>
          <rect
            x={28}
            y={118}
            width={104}
            height={34}
            rx={5}
            fill={C.blueFill}
            stroke={C.blue}
            strokeWidth={1.4}
          />
          <text
            x={80}
            y={139}
            fontFamily={MONO}
            fontSize={12}
            fill={C.ink}
            textAnchor="middle"
          >
            {TOKEN}
          </text>
          <text
            x={80}
            y={170}
            fontFamily={MONO}
            fontSize={10.5}
            fill={C.muted}
            textAnchor="middle"
          >
            {`token id ${TOKEN_ID}`}
          </text>
          {/* arrow from token to the highlighted row */}
          <line
            x1={134}
            y1={135}
            x2={M_X - 8}
            y2={rowY + CELL / 2}
            stroke={C.blue}
            strokeWidth={1.4}
          />
          <polygon
            points={`${M_X - 8},${rowY + CELL / 2} ${M_X - 15},${rowY + CELL / 2 - 4} ${M_X - 15},${rowY + CELL / 2 + 4}`}
            fill={C.blue}
          />
        </g>

        {/* ============ REGION 2: embedding matrix (middle) ============ */}
        <g>
          {/* matrix label above */}
          <text
            x={M_X + M_W / 2}
            y={M_Y - 12}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            embedding matrix
          </text>

          {/* grid cells */}
          {Array.from({ length: V_ROWS }).map((_, r: number) =>
            Array.from({ length: D_COLS }).map((__, c: number) => {
              const isHi = r === HILITE_ROW;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={M_X + c * CELL}
                  y={M_Y + r * CELL}
                  width={CELL}
                  height={CELL}
                  fill={isHi ? C.coralFill : "var(--card)"}
                  stroke={C.line}
                  strokeWidth={0.8}
                />
              );
            }),
          )}
          {/* highlight outline on the looked-up row */}
          <rect
            x={M_X}
            y={rowY}
            width={M_W}
            height={CELL}
            fill="none"
            stroke={C.coral}
            strokeWidth={2}
          />

          {/* V = vocab size (left bracket label) */}
          <text
            x={M_X - 12}
            y={M_Y + M_H / 2}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
            transform={`rotate(-90 ${M_X - 12} ${M_Y + M_H / 2})`}
          >
            V = vocab size
          </text>

          {/* d = embedding dim (below grid) */}
          <text
            x={M_X + M_W / 2}
            y={M_Y + M_H + 16}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            d = embedding dim
          </text>

          {/* row index label on the highlighted row */}
          <text
            x={M_X + M_W + 8}
            y={rowY + CELL / 2 + 3.5}
            fontFamily={MONO}
            fontSize={9.5}
            fill={C.coral}
            textAnchor="start"
          >
            {`row ${TOKEN_ID}`}
          </text>
        </g>

        {/* ============ pull-out connector (animated) ============ */}
        {showVector && (
          <line
            x1={M_X + M_W + 4}
            y1={rowY + CELL / 2}
            x2={VEC_X - 6}
            y2={VEC_Y + (D_COLS * VCELL) / 2}
            stroke={hoveredWord ? C.blue : C.coral}
            strokeWidth={1.2}
            strokeDasharray="3 3"
            opacity={hoveredWord ? 0.5 : 0.3 + 0.7 * anim}
          />
        )}

        {/* ============ REGION 3a: pulled-out vector (right) ============ */}
        <g opacity={showVector ? (hoveredWord ? 1 : anim) : 0.18}>
          <text
            x={VEC_X + VCELL / 2}
            y={VEC_Y - 12}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            vector
          </text>
          {shownVec.map((v: number, i: number) => {
            const cy = VEC_Y + i * VCELL;
            const accent = hoveredWord ? C.blue : C.coral;
            return (
              <g key={i}>
                <rect
                  x={VEC_X}
                  y={cy}
                  width={VCELL}
                  height={VCELL}
                  fill={hoveredWord ? C.blueFill : C.coralFill}
                  stroke={accent}
                  strokeWidth={1}
                />
                <text
                  x={VEC_X + VCELL / 2}
                  y={cy + VCELL / 2 + 3.5}
                  fontFamily={MONO}
                  fontSize={10}
                  fill={C.ink}
                  textAnchor="middle"
                >
                  {v.toFixed(1)}
                </text>
              </g>
            );
          })}
          {/* which vector is shown */}
          <text
            x={VEC_X + VCELL / 2}
            y={VEC_Y + D_COLS * VCELL + 16}
            fontFamily={MONO}
            fontSize={9.5}
            fill={hoveredWord ? C.blue : C.coral}
            textAnchor="middle"
          >
            {hoveredWord ? hoveredWord.label : TOKEN}
          </text>
        </g>

        {/* ============ REGION 3b: 2D projection scatter (own band) ============ */}
        <g>
          <text
            x={SC_X + SC_W / 2}
            y={SC_Y - 10}
            fontFamily={MONO}
            fontSize={10}
            fill={C.muted}
            textAnchor="middle"
          >
            2D projection of embedding space
          </text>
          <rect
            x={SC_X}
            y={SC_Y}
            width={SC_W}
            height={SC_H}
            fill="none"
            stroke={C.line}
            strokeWidth={1}
            rx={3}
          />
          {WORDS.map((w: Word) => {
            const cx = SC_X + 8 + w.x * (SC_W - 16);
            const cy = SC_Y + 8 + w.y * (SC_H - 16);
            const active = hovered === w.label;
            const accent = w.cluster === "far" ? C.violet : C.green;
            // place label so it does not collide with the dot or box edge
            const labelLeft = w.x > 0.6;
            return (
              <g
                key={w.label}
                onMouseEnter={() => setHovered(w.label)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={active ? 5 : 3.5}
                  fill={active ? accent : w.cluster === "far" ? C.violet : C.greenFill}
                  stroke={accent}
                  strokeWidth={1.4}
                />
                <text
                  x={labelLeft ? cx - 7 : cx + 7}
                  y={cy + 3}
                  fontFamily={MONO}
                  fontSize={9}
                  fill={active ? accent : C.muted}
                  textAnchor={labelLeft ? "end" : "start"}
                >
                  {w.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* ============ Caption band (bottom) ============ */}
        <text
          x={280}
          y={400}
          fontFamily={MONO}
          fontSize={9.5}
          fill={C.muted}
          textAnchor="middle"
        >
          Each token becomes a trainable vector; similar meanings sit close together.
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setHovered(null);
            setPulled(true);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          style={pulled && !hovered ? { background: C.ink, color: "var(--background)" } : undefined}
        >
          look up token
        </button>
        <button
          type="button"
          onClick={() => {
            setHovered(null);
            setPulled(false);
            setAnim(0);
          }}
          className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          reset
        </button>
        <span className="font-mono text-[var(--muted)]">
          Hover a word in the scatter to see its vector.
        </span>
      </div>
    </div>
  );
}
