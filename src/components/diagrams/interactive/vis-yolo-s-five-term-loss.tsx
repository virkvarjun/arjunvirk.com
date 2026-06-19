"use client";

import { useState } from "react";
import { C, MONO } from "../frame";

// YOLO's Five-Term Loss.
// Detection is cast as squared-error regression over five terms:
//   1. center (x,y)       , coord error, weighted by lambda_coord, responsible box
//   2. size (sqrt w, h)   , coord error, weighted by lambda_coord, responsible box
//   3. confidence (obj)   , object cells, weight 1
//   4. confidence (noobj) , empty cells, weighted by lambda_noobj
//   5. class probability  , object cells only
// The sqrt on width/height makes a fixed pixel error matter more for small
// boxes than large ones, evening out the localization penalty.

type TermKey = "xy" | "wh" | "obj" | "noobj" | "cls";

type Term = {
  key: TermKey;
  n: number; // index 1..5
  color: string;
  fill: string;
  title: string; // short label
  applies: string; // one-line "applies to"
  penalty: string; // what it penalizes (kept short)
  weight: "coord" | "noobj" | "one";
};

// Hard-coded term table (deterministic, SSR-safe).
const TERMS: readonly Term[] = [
  {
    key: "xy",
    n: 1,
    color: C.coral,
    fill: C.coralFill,
    title: "center (x,y)",
    applies: "responsible box",
    penalty: "box center off target",
    weight: "coord",
  },
  {
    key: "wh",
    n: 2,
    color: C.coral,
    fill: C.coralFill,
    title: "size (√w,√h)",
    applies: "responsible box",
    penalty: "box size off (sqrt-scaled)",
    weight: "coord",
  },
  {
    key: "obj",
    n: 3,
    color: C.blue,
    fill: C.blueFill,
    title: "conf (object)",
    applies: "object cells",
    penalty: "confidence too low on objects",
    weight: "one",
  },
  {
    key: "noobj",
    n: 4,
    color: C.green,
    fill: C.greenFill,
    title: "conf (no obj)",
    applies: "empty cells",
    penalty: "false confidence on empty",
    weight: "noobj",
  },
  {
    key: "cls",
    n: 5,
    color: C.violet,
    fill: C.grid,
    title: "class probs",
    applies: "object cells",
    penalty: "wrong class probabilities",
    weight: "one",
  },
];

// 4x4 sample grid. Two object cells; one holds the "responsible" box.
// cell role: "resp" = responsible box cell, "obj" = object cell, "" = empty.
const GRID_COLS = 4;
const GRID_ROWS = 4;
// indices 0..15 row-major. Object cells at 5 and 10; responsible at 5.
const RESP_CELL = 5;
const OBJ_CELLS: readonly number[] = [5, 10];

export function VisYoloLoss() {
  const [active, setActive] = useState<Record<TermKey, boolean>>({
    xy: true,
    wh: true,
    obj: true,
    noobj: true,
    cls: true,
  });
  const [selected, setSelected] = useState<TermKey>("wh");
  const [lambdaCoord, setLambdaCoord] = useState<number>(5);
  const [lambdaNoobj, setLambdaNoobj] = useState<number>(0.5);

  const sel: Term = TERMS.find((t: Term) => t.key === selected) ?? TERMS[0];

  const toggle = (k: TermKey): void =>
    setActive((a: Record<TermKey, boolean>) => ({ ...a, [k]: !a[k] }));

  const weightLabel = (w: Term["weight"]): string => {
    if (w === "coord") return `λ_coord = ${lambdaCoord}`;
    if (w === "noobj") return `λ_noobj = ${lambdaNoobj}`;
    return "weight 1";
  };

  // Whether a grid cell is highlighted for the selected term.
  const cellHot = (idx: number): boolean => {
    if (sel.key === "xy" || sel.key === "wh") return idx === RESP_CELL;
    if (sel.key === "obj" || sel.key === "cls") return OBJ_CELLS.includes(idx);
    // noobj: every cell that is NOT an object cell
    return !OBJ_CELLS.includes(idx);
  };

  // ---- layout constants ----
  const W = 480;
  const Hsvg = 568;

  // term-list band
  const rowsTop = 78;
  const rowH = 34;
  const rowX = 18;
  const rowW = 250;

  // grid band (right of term list)
  const gx = 296; // grid left
  const gyTop = 92; // grid top
  const cell = 38;
  const gridW = cell * GRID_COLS;
  const gridH = cell * GRID_ROWS;

  // sqrt-trick demo band
  const demoY = 318;

  // explanation band
  const expY = 446;

  // sqrt-trick: fixed pixel error 'e' on a small vs large box.
  // Show that sqrt(w) shrinks the gap between large and small contributions.
  const smallW = 0.12; // normalized width
  const largeW = 0.62;
  const err = 0.08; // fixed normalized error added to width
  // raw squared diff vs sqrt squared diff
  const rawSmall = (err / smallW) * 0.5; // illustrative magnitude
  const rawLarge = (err / largeW) * 0.5;
  const sqSmall = Math.abs(Math.sqrt(smallW + err) - Math.sqrt(smallW));
  const sqLarge = Math.abs(Math.sqrt(largeW + err) - Math.sqrt(largeW));
  const barMax = 110;
  const rawScale = barMax / Math.max(rawSmall, rawLarge);
  const sqScale = barMax / Math.max(sqSmall, sqLarge);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${Hsvg}`}
        className="h-auto w-full"
        role="img"
        aria-label="YOLO's five-term squared-error loss: center, size, object confidence, no-object confidence, and class probabilities, with lambda weights and the sqrt size trick"
      >
        {/* Title band */}
        <text x={18} y={26} fontFamily={MONO} fontSize={14} fill={C.ink}>
          YOLO&apos;s Five-Term Loss
        </text>
        <text x={18} y={46} fontFamily={MONO} fontSize={10} fill={C.muted}>
          Detection as squared-error regression, sum of 5 terms.
        </text>
        <text x={18} y={64} fontFamily={MONO} fontSize={10} fill={C.muted}>
          Toggle a term off; click a term to inspect it.
        </text>

        {/* ---- Five term rows (left) ---- */}
        {TERMS.map((t: Term, i: number) => {
          const y = rowsTop + i * rowH;
          const on = active[t.key];
          const isSel = selected === t.key;
          return (
            <g
              key={t.key}
              onClick={() => setSelected(t.key)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={rowX}
                y={y}
                width={rowW}
                height={rowH - 6}
                rx={4}
                fill={on ? t.fill : "var(--card)"}
                stroke={isSel ? C.ink : t.color}
                strokeWidth={isSel ? 2 : 1.2}
                opacity={on ? 1 : 0.5}
              />
              {/* number chip */}
              <circle
                cx={rowX + 14}
                cy={y + (rowH - 6) / 2}
                r={8}
                fill={on ? t.color : C.grid}
                stroke={t.color}
                strokeWidth={1}
              />
              <text
                x={rowX + 14}
                y={y + (rowH - 6) / 2 + 3.5}
                fontFamily={MONO}
                fontSize={10}
                fill={on ? "var(--background)" : C.muted}
                textAnchor="middle"
              >
                {t.n}
              </text>
              {/* term title */}
              <text
                x={rowX + 30}
                y={y + 13}
                fontFamily={MONO}
                fontSize={10.5}
                fill={C.ink}
                opacity={on ? 1 : 0.6}
              >
                {t.title}
              </text>
              {/* weight + applies */}
              <text
                x={rowX + 30}
                y={y + 25}
                fontFamily={MONO}
                fontSize={8.5}
                fill={C.muted}
              >
                {weightLabel(t.weight)} {"•"} {t.applies}
              </text>
              {/* on/off marker at right */}
              <text
                x={rowX + rowW - 8}
                y={y + (rowH - 6) / 2 + 3.5}
                fontFamily={MONO}
                fontSize={9}
                fill={on ? t.color : C.muted}
                textAnchor="end"
              >
                {on ? "on" : "off"}
              </text>
            </g>
          );
        })}

        {/* Sum readout under term rows */}
        <text
          x={rowX}
          y={rowsTop + TERMS.length * rowH + 12}
          fontFamily={MONO}
          fontSize={9}
          fill={C.muted}
        >
          L = sum of the {TERMS.filter((t) => active[t.key]).length} active terms
        </text>

        {/* ---- Sample grid (right) ---- */}
        <text x={gx} y={gyTop - 18} fontFamily={MONO} fontSize={10} fill={C.ink}>
          where term {sel.n} applies
        </text>
        <text x={gx} y={gyTop - 5} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          {sel.applies} highlighted
        </text>
        {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, idx: number) => {
          const r = Math.floor(idx / GRID_COLS);
          const c = idx % GRID_COLS;
          const x = gx + c * cell;
          const y = gyTop + r * cell;
          const hot = cellHot(idx);
          const isObj = OBJ_CELLS.includes(idx);
          return (
            <g key={`g${idx}`}>
              <rect
                x={x}
                y={y}
                width={cell}
                height={cell}
                fill={hot ? sel.fill : "var(--card)"}
                stroke={C.line}
                strokeWidth={1}
              />
              {hot && (
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={cell - 2}
                  height={cell - 2}
                  fill="none"
                  stroke={sel.color}
                  strokeWidth={1.6}
                />
              )}
              {isObj && (
                <circle
                  cx={x + cell / 2}
                  cy={y + cell / 2}
                  r={5}
                  fill={C.ink}
                  opacity={0.75}
                />
              )}
              {idx === RESP_CELL && (
                <text
                  x={x + cell / 2}
                  y={y + cell - 5}
                  fontFamily={MONO}
                  fontSize={7.5}
                  fill={C.ink}
                  textAnchor="middle"
                >
                  resp
                </text>
              )}
            </g>
          );
        })}
        {/* grid legend */}
        <circle cx={gx + 6} cy={gyTop + gridH + 14} r={4} fill={C.ink} opacity={0.75} />
        <text
          x={gx}
          y={gyTop + gridH + 17}
          fontFamily={MONO}
          fontSize={8.5}
          fill={C.muted}
        >
          resp=responsible, obj=object cell
        </text>

        {/* ---- sqrt-trick demo band ---- */}
        <line
          x1={18}
          y1={demoY - 14}
          x2={W - 18}
          y2={demoY - 14}
          stroke={C.line}
          strokeWidth={1}
        />
        <text x={18} y={demoY} fontFamily={MONO} fontSize={11} fill={C.ink}>
          the √ size trick
        </text>
        <text x={18} y={demoY + 15} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          same pixel error on a small vs large box
        </text>

        {/* raw error column */}
        <text x={36} y={demoY + 40} fontFamily={MONO} fontSize={9} fill={C.ink}>
          raw w
        </text>
        {/* small box raw bar */}
        <text x={36} y={demoY + 58} fontFamily={MONO} fontSize={8} fill={C.muted}>
          small
        </text>
        <rect
          x={78}
          y={demoY + 50}
          width={rawSmall * rawScale}
          height={10}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1}
        />
        {/* large box raw bar */}
        <text x={36} y={demoY + 74} fontFamily={MONO} fontSize={8} fill={C.muted}>
          large
        </text>
        <rect
          x={78}
          y={demoY + 66}
          width={rawLarge * rawScale}
          height={10}
          fill={C.coralFill}
          stroke={C.coral}
          strokeWidth={1}
        />

        {/* sqrt error column */}
        <text x={262} y={demoY + 40} fontFamily={MONO} fontSize={9} fill={C.ink}>
          √ w
        </text>
        <text x={262} y={demoY + 58} fontFamily={MONO} fontSize={8} fill={C.muted}>
          small
        </text>
        <rect
          x={300}
          y={demoY + 50}
          width={sqSmall * sqScale}
          height={10}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1}
        />
        <text x={262} y={demoY + 74} fontFamily={MONO} fontSize={8} fill={C.muted}>
          large
        </text>
        <rect
          x={300}
          y={demoY + 66}
          width={sqLarge * sqScale}
          height={10}
          fill={C.greenFill}
          stroke={C.green}
          strokeWidth={1}
        />

        <text x={18} y={demoY + 96} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          raw: small box punished far more than large.
        </text>
        <text x={18} y={demoY + 108} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          √ w: penalties evened out across box sizes.
        </text>

        {/* ---- explanation band ---- */}
        <line
          x1={18}
          y1={expY - 14}
          x2={W - 18}
          y2={expY - 14}
          stroke={C.line}
          strokeWidth={1}
        />
        <rect
          x={18}
          y={expY - 6}
          width={10}
          height={10}
          rx={2}
          fill={sel.fill}
          stroke={sel.color}
          strokeWidth={1.2}
        />
        <text x={34} y={expY + 3} fontFamily={MONO} fontSize={11} fill={C.ink}>
          term {sel.n}: {sel.title}
        </text>
        <text x={18} y={expY + 20} fontFamily={MONO} fontSize={9} fill={C.muted}>
          penalizes: {sel.penalty}
        </text>
        <text x={18} y={expY + 34} fontFamily={MONO} fontSize={9} fill={C.muted}>
          applies to: {sel.applies}
        </text>
        <text x={18} y={expY + 48} fontFamily={MONO} fontSize={9} fill={sel.color}>
          weight: {weightLabel(sel.weight)}
        </text>

        {/* caption band (bottom) */}
        <line
          x1={18}
          y1={Hsvg - 42}
          x2={W - 18}
          y2={Hsvg - 42}
          stroke={C.line}
          strokeWidth={1}
        />
        <text x={18} y={Hsvg - 26} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
          Five squared-error terms turn detection into regression
        </text>
        <text x={18} y={Hsvg - 13} fontFamily={MONO} fontSize={8.5} fill={C.muted}>
         , weights balance localization, objects, empty space.
        </text>
      </svg>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {TERMS.map((t: Term) => (
          <button
            key={t.key}
            onClick={() => toggle(t.key)}
            aria-pressed={active[t.key]}
            className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            style={
              active[t.key] ? { background: C.ink, color: "var(--background)" } : undefined
            }
          >
            {t.n}: {active[t.key] ? "on" : "off"}
          </button>
        ))}
        <label className="flex items-center gap-1.5 font-mono text-[var(--muted)]">
          λ_coord
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={lambdaCoord}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setLambdaCoord(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{lambdaCoord}</span>
        </label>
        <label className="flex items-center gap-1.5 font-mono text-[var(--muted)]">
          λ_noobj
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={lambdaNoobj}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setLambdaNoobj(Number(e.target.value))
            }
            className="w-28 accent-[var(--foreground)]"
          />
          <span className="font-mono tabular-nums">{lambdaNoobj.toFixed(1)}</span>
        </label>
      </div>
    </div>
  );
}
