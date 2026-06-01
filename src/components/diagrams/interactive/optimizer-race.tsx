"use client";

import { useState, useRef, useEffect } from "react";
import { C, MONO } from "../frame";

// Ravine loss surface: loss(x,y) = 0.05*x^2 + 1.0*y^2, minimum at origin.
// The 20x curvature gap between axes makes a long narrow valley, so plain SGD
// zig-zags across the steep y-walls while crawling along the gentle x-floor.
const KX = 0.1; // d/dx of 0.05*x^2
const KY = 2.0; // d/dy of 1.0*y^2
const START: Pt = [-9, 3];
const MAX_STEPS = 220;
const STOP_LOSS = 0.01;

// Panel geometry: loss-space x in [-10,10], y in [-4,4] mapped into the SVG.
const PX0 = 18;
const PX1 = 422;
const PY0 = 18;
const PY1 = 196;

type Pt = [number, number];

type Algo = "sgd" | "mom" | "adam";

interface Runner {
  algo: Algo;
  color: string;
  label: string;
  pos: Pt;
  trail: Pt[];
  // momentum velocity
  vel: Pt;
  // adam moments
  m: Pt;
  v: Pt;
  t: number;
  done: boolean;
}

function grad(p: Pt): Pt {
  return [KX * p[0], KY * p[1]];
}

function loss(p: Pt): number {
  return 0.05 * p[0] * p[0] + 1.0 * p[1] * p[1];
}

// Map loss-space coordinates into SVG panel pixels.
function mapX(x: number): number {
  return PX0 + ((x + 10) / 20) * (PX1 - PX0);
}
function mapY(y: number): number {
  return PY0 + ((4 - y) / 8) * (PY1 - PY0);
}

function clampPx(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function svgPoint(p: Pt): string {
  const sx = clampPx(mapX(p[0]), PX0 - 6, PX1 + 6);
  const sy = clampPx(mapY(p[1]), PY0 - 6, PY1 + 6);
  return `${sx.toFixed(1)},${sy.toFixed(1)}`;
}

function freshRunners(): Runner[] {
  return [
    {
      algo: "sgd",
      color: C.coral,
      label: "SGD",
      pos: [...START] as Pt,
      trail: [[...START] as Pt],
      vel: [0, 0],
      m: [0, 0],
      v: [0, 0],
      t: 0,
      done: false,
    },
    {
      algo: "mom",
      color: C.blue,
      label: "SGD+momentum",
      pos: [...START] as Pt,
      trail: [[...START] as Pt],
      vel: [0, 0],
      m: [0, 0],
      v: [0, 0],
      t: 0,
      done: false,
    },
    {
      algo: "adam",
      color: C.green,
      label: "Adam",
      pos: [...START] as Pt,
      trail: [[...START] as Pt],
      vel: [0, 0],
      m: [0, 0],
      v: [0, 0],
      t: 0,
      done: false,
    },
  ];
}

const B1 = 0.9;
const B2 = 0.999;
const EPS = 1e-8;

// Advance one runner by a single optimizer step (mutates in place).
function advance(r: Runner, lr: number): void {
  if (r.done) return;
  const g = grad(r.pos);
  let step: Pt;
  if (r.algo === "sgd") {
    step = [-lr * g[0], -lr * g[1]];
  } else if (r.algo === "mom") {
    r.vel = [0.9 * r.vel[0] + g[0], 0.9 * r.vel[1] + g[1]];
    step = [-lr * r.vel[0], -lr * r.vel[1]];
  } else {
    r.t += 1;
    r.m = [B1 * r.m[0] + (1 - B1) * g[0], B1 * r.m[1] + (1 - B1) * g[1]];
    r.v = [
      B2 * r.v[0] + (1 - B2) * g[0] * g[0],
      B2 * r.v[1] + (1 - B2) * g[1] * g[1],
    ];
    const mh: Pt = [r.m[0] / (1 - B1 ** r.t), r.m[1] / (1 - B1 ** r.t)];
    const vh: Pt = [r.v[0] / (1 - B2 ** r.t), r.v[1] / (1 - B2 ** r.t)];
    step = [
      (-lr * mh[0]) / (Math.sqrt(vh[0]) + EPS),
      (-lr * mh[1]) / (Math.sqrt(vh[1]) + EPS),
    ];
  }
  r.pos = [r.pos[0] + step[0], r.pos[1] + step[1]];
  r.trail.push([...r.pos] as Pt);
  if (loss(r.pos) < STOP_LOSS || r.trail.length - 1 >= MAX_STEPS) {
    r.done = true;
  }
}

// Nested ellipse contours of the ravine, centered at the minimum (origin).
const CONTOURS: number[] = [0.2, 0.8, 1.8, 3.2, 5.0];

export function OptimizerRace() {
  const [lr, setLr] = useState(0.1);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  // Snapshot of trails for rendering; the authoritative sim state is in refs.
  const [trails, setTrails] = useState<Pt[][]>(() =>
    freshRunners().map((r) => r.trail),
  );

  const runnersRef = useRef<Runner[]>(freshRunners());
  const lrRef = useRef(lr);
  lrRef.current = lr;

  function publish(): void {
    setTrails(runnersRef.current.map((r) => r.trail.map((p) => [...p] as Pt)));
    setStep(Math.max(...runnersRef.current.map((r) => r.trail.length - 1)));
  }

  function tick(): boolean {
    const rs = runnersRef.current;
    rs.forEach((r) => advance(r, lrRef.current));
    return rs.every((r) => r.done);
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const allDone = tick();
      publish();
      if (allDone) setRunning(false);
    }, 90);
    return () => clearInterval(id);
  }, [running]);

  function onStep(): void {
    const allDone = tick();
    publish();
    if (allDone) setRunning(false);
  }

  function onReset(): void {
    setRunning(false);
    runnersRef.current = freshRunners();
    setStep(0);
    setTrails(runnersRef.current.map((r) => r.trail));
  }

  const btn =
    "rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground)] transition-colors hover:bg-[var(--background)]";
  const meta = runnersRef.current;

  return (
    <div>
      <svg
        viewBox="0 0 440 260"
        className="h-auto w-full"
        role="img"
        aria-label="Optimizer race on a ravine"
      >
        <rect
          x={PX0}
          y={PY0}
          width={PX1 - PX0}
          height={PY1 - PY0}
          fill="var(--card)"
          stroke={C.line}
          strokeWidth={1}
        />

        {/* Ravine contours: ellipses of constant loss. rx from 0.05*x^2=L,
            ry from y^2=L, converted to pixel radii. */}
        {CONTOURS.map((L, i) => {
          const rxw = Math.sqrt(L / 0.05); // half-width in x loss-space
          const ryw = Math.sqrt(L / 1.0); // half-width in y loss-space
          const rxp = (rxw / 20) * (PX1 - PX0);
          const ryp = (ryw / 8) * (PY1 - PY0);
          return (
            <ellipse
              key={i}
              cx={mapX(0)}
              cy={mapY(0)}
              rx={rxp}
              ry={ryp}
              fill="none"
              stroke={C.line}
              strokeWidth={1}
            />
          );
        })}

        {/* Minimum marker */}
        <circle cx={mapX(0)} cy={mapY(0)} r={2.5} fill={C.ink} />
        <text
          x={mapX(0) + 6}
          y={mapY(0) - 5}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
        >
          min
        </text>

        {/* Trails */}
        {meta.map((r, i) => {
          const tr = trails[i] ?? [];
          if (tr.length < 2) return null;
          return (
            <polyline
              key={`t${r.algo}`}
              points={tr.map(svgPoint).join(" ")}
              fill="none"
              stroke={r.color}
              strokeWidth={1.6}
              strokeLinejoin="round"
              opacity={0.95}
            />
          );
        })}

        {/* Current head markers */}
        {meta.map((r, i) => {
          const tr = trails[i] ?? [];
          const head = tr[tr.length - 1] ?? START;
          const [hx, hy] = svgPoint(head).split(",").map(Number);
          return <circle key={`h${r.algo}`} cx={hx} cy={hy} r={3.4} fill={r.color} />;
        })}

        {/* Shared start point */}
        {(() => {
          const [sx, sy] = svgPoint(START).split(",").map(Number);
          return <circle cx={sx} cy={sy} r={5} fill="none" stroke={C.ink} strokeWidth={1.2} />;
        })()}

        {/* Step counter */}
        <text
          x={PX1}
          y={PY0 - 5}
          fontSize={9}
          fill={C.muted}
          fontFamily={MONO}
          textAnchor="end"
        >
          {`step ${step}`}
        </text>

        {/* Legend */}
        {meta.map((r, i) => (
          <g key={`l${r.algo}`} transform={`translate(${PX0 + i * 142}, ${PY1 + 26})`}>
            <line x1={0} y1={-3} x2={16} y2={-3} stroke={r.color} strokeWidth={2.4} />
            <text x={21} y={0} fontSize={10} fill={C.ink} fontFamily={MONO}>
              {r.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2 font-mono">
          lr
          <input
            type="range"
            min={0.02}
            max={0.5}
            step={0.01}
            value={lr}
            onChange={(e) => setLr(parseFloat(e.target.value))}
            className="w-28 accent-[var(--foreground)]"
            aria-label="learning rate"
          />
          <span className="font-mono tabular-nums w-10">{lr.toFixed(2)}</span>
        </label>
        <button type="button" className={btn} onClick={() => setRunning((p) => !p)}>
          {running ? "Pause" : "Run"}
        </button>
        <button type="button" className={btn} onClick={onStep}>
          Step
        </button>
        <button type="button" className={btn} onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
