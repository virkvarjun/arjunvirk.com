"use client";

import { useMemo, useReducer, useState } from "react";
import {
  R,
  MONO,
  Btn,
  Slider,
  Tabs,
  Stage,
  useRafLoop,
  usePrefersReducedMotion,
  useStageVisibility,
  svgArrow,
  approach,
  clamp,
  lerp,
  mulberry32,
  type V3,
  type Prim3D,
  type Camera3D,
  v3,
  quat,
  seg3,
  dot3,
  label3,
  ring3,
  grid3,
  box3,
  curve3,
  Scene3D,
  useOrbit,
  Legend,
  Readout,
  Transport,
} from "./shared";

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const smooth = (t: number) => t * t * (3 - 2 * t);
// Seeded, roughly-normal noise (sum of four uniforms, mean 0, std ~0.58).
const gauss = (r: () => number) => r() + r() + r() + r() - 2;

// Generic planar 2-link inverse kinematics. Coordinates are (x, up); elbowSign
// -1 gives the elbow-up solution. Targets outside the annulus are clamped to
// the nearest reachable radius, which is what a real controller does too.
function ik2(
  dx: number,
  dz: number,
  L1: number,
  L2: number,
  elbowSign = -1,
): [number, number] {
  const rMin = Math.abs(L1 - L2) + 0.02;
  const rMax = L1 + L2 - 0.02;
  const r0 = Math.hypot(dx, dz) || 1e-6;
  const r = clamp(r0, rMin, rMax);
  const x = (dx * r) / r0;
  const z = (dz * r) / r0;
  const c2 = clamp((r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  const s2 = elbowSign * Math.sqrt(Math.max(0, 1 - c2 * c2));
  const q2 = Math.atan2(s2, c2);
  const q1 = Math.atan2(z, x) - Math.atan2(L2 * s2, L1 + L2 * c2);
  return [q1, q2];
}

// ===========================================================================
// Fig 10.1 · Behavior cloning = supervised learning on (o, a) pairs
// Three lanes: demonstrate -> train -> deploy. The deployment is not a
// cartoon: the rollout is driven by nearest-neighbour lookup over the actual
// (state, velocity) pairs sliced from the demos, so coverage decides whether
// it reaches the goal, and the miss distance is measured, not asserted.
// ===========================================================================

const D1_STEPS = 36;
const D1_GOAL: [number, number] = [135, -225];

type Demo1 = { pts: [number, number][]; vels: [number, number][] };

function makeDemos1(K: number): Demo1[] {
  const rng = mulberry32(11);
  const out: Demo1[] = [];
  for (let j = 0; j < K; j++) {
    const sx = (rng() - 0.5) * 36;
    const sy = (rng() - 0.5) * 20;
    const bow = (rng() - 0.5) * 56;
    const pts: [number, number][] = [];
    for (let i = 0; i <= D1_STEPS; i++) {
      const t = i / D1_STEPS;
      pts.push([
        lerp(sx, D1_GOAL[0], t) + bow * Math.sin(Math.PI * t),
        lerp(sy, D1_GOAL[1], smooth(t)),
      ]);
    }
    const vels: [number, number][] = [];
    for (let i = 0; i < D1_STEPS; i++) {
      vels.push([pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]]);
    }
    out.push({ pts, vels });
  }
  return out;
}

// Roll the cloned policy out from a perturbed start: each step looks up the
// nearest demonstrated state and replays its action. Off the data (nearest
// state > 26 units away) the action degrades — the honest failure mode.
function rollout1(demos: Demo1[], seed: number) {
  const rng = mulberry32(seed);
  const sgn = rng() < 0.5 ? -1 : 1;
  const start: [number, number] = [(rng() - 0.5) * 52, (rng() - 0.5) * 36];
  const steps: { x: number; y: number; off: boolean }[] = [
    { x: start[0], y: start[1], off: false },
  ];
  let x = start[0];
  let y = start[1];
  for (let i = 0; i < 80; i++) {
    let bd = Infinity;
    let vx = 0;
    let vy = 0;
    for (const d of demos) {
      for (let k = 0; k < d.vels.length; k++) {
        const ddx = d.pts[k][0] - x;
        const ddy = d.pts[k][1] - y;
        const dd = ddx * ddx + ddy * ddy;
        if (dd < bd) {
          bd = dd;
          vx = d.vels[k][0];
          vy = d.vels[k][1];
        }
      }
    }
    const dist = Math.sqrt(bd);
    const off = dist > 26;
    if (off) {
      // off-support: the net has no data here, so its action is a degraded
      // version of the nearest one — rotated away, feeding the drift.
      const th = sgn * rad(clamp((dist - 26) * 2.2, 0, 80));
      const c = Math.cos(th);
      const s = Math.sin(th);
      const rvx = c * vx - s * vy;
      const rvy = s * vx + c * vy;
      vx = rvx;
      vy = rvy;
    }
    x = clamp(x + vx + (rng() - 0.5) * 1.6, -45, 190);
    y = clamp(y + vy + (rng() - 0.5) * 1.6, -250, 18);
    steps.push({ x, y, off });
    if (Math.hypot(x - D1_GOAL[0], y - D1_GOAL[1]) < 10) break;
  }
  const last = steps[steps.length - 1];
  const miss = Math.hypot(last.x - D1_GOAL[0], last.y - D1_GOAL[1]);
  return { steps, miss };
}

export function RbBehaviorCloning() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [demoN, setDemoN] = useState(6);
  const [startSeed, setStartSeed] = useState(0);
  const [prog, setProg] = useState(0);

  useRafLoop((dt) => setProg((v) => (v + dt * 0.38) % 1.35), {
    playing: playing && inView && !reduced,
  });

  const demos = useMemo(() => makeDemos1(demoN), [demoN]);
  const roll = useMemo(() => rollout1(demos, 101 + startSeed * 7), [demos, startSeed]);

  const t = reduced ? 1 : Math.min(prog, 1);
  const shown = Math.max(1, Math.round(t * (roll.steps.length - 1)) + 1);
  const cur = roll.steps[shown - 1];
  const liveMiss = Math.hypot(cur.x - D1_GOAL[0], cur.y - D1_GOAL[1]);
  const pairs = demoN * D1_STEPS;
  const reached = roll.miss < 14;
  const done = t >= 1;

  // lane geometry: demos left, train middle, deploy right
  const bL = { x: 85, y: 390 };
  const bR = { x: 505, y: 385 };
  const stackN = clamp(Math.round(3 + demoN / 3), 3, 12);

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.1 · Behavior cloning = supervised learning on (o, a) pairs"
      ariaLabel={`Expert demonstrations sliced into observation-action pairs train a policy; the deployed rollout replays the nearest recorded action over ${demoN} demonstrations and ${reached ? "reaches" : "misses"} the goal`}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onReset={() => setProg(0)}
          />
          <Slider label="demos" min={2} max={30} step={1} value={demoN} onChange={setDemoN} fmt={(v) => `${v}`} />
          <Btn onClick={() => { setStartSeed((s) => s + 1); setProg(0); }} title="perturb the deployment start state">
            ⟳ new start
          </Btn>
        </>
      }
    >
      {/* lane structure */}
      <line x1={268} y1={108} x2={268} y2={402} stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />
      <line x1={452} y1={108} x2={452} y2={402} stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />
      <text x={150} y={122} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        1 · demonstrate
      </text>
      <text x={360} y={122} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        2 · train π
      </text>
      <text x={580} y={122} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        3 · deploy π
      </text>

      {/* left lane: the K expert demos, sliced into pairs */}
      {demos.map((d, j) => (
        <polyline
          key={j}
          points={d.pts.map(([x, y]) => `${(bL.x + x).toFixed(1)},${(bL.y + y).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={R.goal}
          strokeWidth={1.4}
          opacity={0.45}
        />
      ))}
      <rect x={bL.x + D1_GOAL[0] - 9} y={bL.y + D1_GOAL[1] - 9} width={18} height={18} rx={3} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      <text x={bL.x + D1_GOAL[0]} y={bL.y + D1_GOAL[1] - 16} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.goal}>
        goal
      </text>

      {/* middle lane: (o, a) cards into the policy net */}
      {svgArrow(252, 300, 294, 300, R.plan, 2.2, 8)}
      {Array.from({ length: stackN }).map((_, i) => (
        <rect key={i} x={300 + i * 3} y={326 - i * 6} width={64} height={20} rx={4} fill={R.fillBlue} stroke={R.signal} strokeWidth={1.3} />
      ))}
      <text x={352} y={356} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        (o, a) × {pairs}
      </text>
      {svgArrow(352, 254, 352, 226, R.plan, 2.2, 8)}
      <rect x={312} y={150} width={96} height={68} rx={10} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
      <text x={360} y={180} textAnchor="middle" fontFamily={MONO} fontSize={21} fontWeight={600} fill={R.ink}>
        π
      </text>
      <text x={360} y={204} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        min‖π(o)−a‖²
      </text>
      {svgArrow(408, 184, 462, 184, R.plan, 2.2, 8)}

      {/* right lane: nearest-neighbour rollout, colored by data support */}
      <rect x={bR.x + D1_GOAL[0] - 9} y={bR.y + D1_GOAL[1] - 9} width={18} height={18} rx={3} fill={reached && done ? R.fillGreen : "#eeeeec"} stroke={reached && done ? R.goal : R.world} strokeWidth={2.5} />
      <text x={bR.x + D1_GOAL[0]} y={bR.y + D1_GOAL[1] - 16} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        goal
      </text>
      <circle cx={bR.x + roll.steps[0].x} cy={bR.y + roll.steps[0].y} r={6} fill="none" stroke={R.plan} strokeWidth={2.5} />
      {roll.steps.slice(0, shown).map((p, i) => {
        if (i === 0) return null;
        const q = roll.steps[i - 1];
        return (
          <line
            key={i}
            x1={bR.x + q.x}
            y1={bR.y + q.y}
            x2={bR.x + p.x}
            y2={bR.y + p.y}
            stroke={p.off ? R.error : R.signal}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={bR.x + cur.x} cy={bR.y + cur.y} r={6.5} fill={cur.off ? R.error : R.signal} />

      <Readout
        rows={[
          { label: "demos", value: `${demoN}`, color: R.ink },
          { label: "(o,a) pairs", value: `${pairs}`, color: R.signal },
          { label: "dist to goal", value: liveMiss.toFixed(0), color: liveMiss < 14 ? R.goal : R.ink },
          { label: "result", value: done ? (reached ? "reached ✓" : "missed ✗") : "…", color: reached ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "expert demos", dash: true },
          { color: R.signal, label: "rollout (on data)" },
          { color: R.error, label: "off-support step" },
          { color: R.plan, label: "(o,a) → train π" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "Reduced motion: full rollout shown; demos and new-start still recompute it."
          : demoN < 8
            ? "sparse demos: the rollout leaves the data (red) and drifts — add demonstrations"
            : "dense coverage keeps every step near a recorded (o, a) pair"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Shared drift simulator for Figs 10.2 and 10.3. dev = perpendicular
// deviation from the expert path. At every closed-loop decision (each step
// when H = 1, each chunk seam otherwise) a fresh, seeded prediction error is
// injected AND the existing deviation is amplified — acting from a state
// outside the training tube degrades the next action. Inside a chunk the
// policy executes open-loop: tiny execution jitter, no feedback amplification.
// DAgger replaces amplification with a pull back toward the tube, because the
// expert has now labeled exactly these off-tube states.
// ===========================================================================

function simDrift(T: number, eps: number, H: number, dagger: boolean, seed: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [0];
  let d = 0;
  for (let i = 0; i < T; i++) {
    const g = gauss(rng);
    if (i % H === 0) {
      if (dagger) d = d * 0.88 + eps * 52 * g;
      else d = d * (1 + 0.05 * Math.min(Math.abs(d) / 30, 2)) + eps * 52 * (1 + Math.abs(d) / 45) * g;
    } else {
      d += eps * 8 * g;
    }
    d = clamp(d, -145, 145);
    out.push(d);
  }
  return out;
}

function meanDrift(T: number, eps: number, H: number, dagger: boolean, seeds = 14): number[] {
  const acc: number[] = new Array<number>(T + 1).fill(0);
  for (let s = 0; s < seeds; s++) {
    const dv = simDrift(T, eps, H, dagger, 40 + s * 13);
    for (let k = 0; k <= T; k++) acc[k] += Math.abs(dv[k]);
  }
  return acc.map((v) => v / seeds);
}

const cumsum = (a: number[]) => {
  const out: number[] = [];
  let s = 0;
  for (const v of a) {
    s += v;
    out.push(s);
  }
  return out;
};

// Map a mean-error curve into the measured-curve panel (x0..x1, yBase..yTop).
function curvePath(vals: number[], x0: number, x1: number, yBase: number, yTop: number, vmax: number) {
  return vals
    .map((v, k) => `${(x0 + ((x1 - x0) * k) / (vals.length - 1)).toFixed(1)},${(yBase - (yBase - yTop) * clamp(v / vmax, 0, 1)).toFixed(1)}`)
    .join(" ");
}

// ===========================================================================
// Fig 10.2 · Small errors compound into total failure  (honest simulation)
// A seeded per-step-error policy is rolled out against the expert path; the
// bottom panel plots the measured mean |error| over 14 seeded rollouts, so
// "grows like T², not T" is a curve you watch, not a claim you read.
// ===========================================================================

const F2 = { x0: 90, x1: 610, yBase: 205, amp: 115 };
const f2Point = (t: number): [number, number] => [
  lerp(F2.x0, F2.x1, t),
  F2.yBase - F2.amp * Math.sin(Math.PI * t),
];
const f2Normal = (t: number): [number, number] => {
  const tx = F2.x1 - F2.x0;
  const ty = -F2.amp * Math.PI * Math.cos(Math.PI * t);
  const l = Math.hypot(tx, ty) || 1;
  return [-ty / l, tx / l];
};

export function RbCompoundingError() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [eps, setEps] = useState(0.02);
  const [horizon, setHorizon] = useState(80);
  const [dagger, setDagger] = useState(false);
  const [k, setK] = useState(0);

  useRafLoop(
    (dt) => setK((v) => (v + dt * 22 > horizon + 14 ? 0 : v + dt * 22)),
    { playing: playing && inView && !reduced },
  );
  const kNow = reduced ? horizon : Math.min(Math.floor(k), horizon);

  const { dev, meanBC, meanDA, ratio } = useMemo(() => {
    const devRun = simDrift(horizon, eps, 1, dagger, 5);
    const mBC = meanDrift(horizon, eps, 1, false);
    const mDA = meanDrift(horizon, eps, 1, true);
    const A = cumsum(dagger ? mDA : mBC);
    const half = A[Math.floor(horizon / 2)] || 1e-6;
    return { dev: devRun, meanBC: mBC, meanDA: mDA, ratio: A[horizon] / half };
  }, [horizon, eps, dagger]);

  // the drawn rollout: expert point + deviation along the path normal
  const pts = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i <= kNow; i++) {
      const t = i / horizon;
      const [px, py] = f2Point(t);
      const [nx, ny] = f2Normal(t);
      out.push([clamp(px + nx * dev[i], 60, 660), clamp(py + ny * dev[i], 64, 256)]);
    }
    return out;
  }, [dev, kNow, horizon]);
  const tip = pts[pts.length - 1];
  const accErr = useMemo(() => {
    let s = 0;
    for (let i = 0; i <= kNow; i++) s += Math.abs(dev[i]);
    return s;
  }, [dev, kNow]);

  // measured-curve panel
  const P = { x0: 90, x1: 610, yBase: 400, yTop: 306 };
  const vmax = Math.max(...meanBC, ...meanDA, 12);
  const expertPts = Array.from({ length: 61 })
    .map((_, i) => f2Point(i / 60))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.2 · Small errors compound into total failure"
      ariaLabel={`A behavior-cloning policy with per-step error ${eps} rolled out over ${horizon} steps drifts off the expert path; the measured mean error curve bends upward without DAgger and stays flat with it`}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => setK((v) => Math.min(Math.floor(v) + 1, horizon))}
            onReset={() => setK(0)}
          />
          <Slider label="ε" min={0.005} max={0.06} step={0.005} value={eps} onChange={setEps} fmt={(v) => v.toFixed(3)} />
          <Slider label="T" min={20} max={120} step={5} value={horizon} onChange={setHorizon} fmt={(v) => `${v}`} />
          <Btn onClick={() => setDagger((v) => !v)} active={dagger}>
            {dagger ? "✓ DAgger relabeling" : "DAgger relabeling"}
          </Btn>
        </>
      }
    >
      {/* states seen in training: the tube around the expert path */}
      <polyline points={expertPts} fill="none" stroke="#dcdcd8" strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <polyline points={expertPts} fill="none" stroke={R.goal} strokeWidth={2.5} strokeDasharray="6 5" />
      <circle cx={F2.x1} cy={F2.yBase} r={8} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      <text x={F2.x1} y={F2.yBase + 24} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        goal
      </text>

      {/* the policy rollout */}
      <polyline points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} fill="none" stroke={R.signal} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={tip[0]} cy={tip[1]} r={6.5} fill={R.signal} />
      {dagger &&
        pts.map((p, i) => {
          if (i % 14 !== 0 || i === 0 || Math.abs(dev[i]) < 8) return null;
          const [ex, ey] = f2Point(i / horizon);
          return <g key={i}>{svgArrow(p[0], p[1], ex, ey, R.error, 1.8, 6)}</g>;
        })}

      {/* measured mean-error panel */}
      <line x1={P.x0} y1={P.yBase} x2={P.x1} y2={P.yBase} stroke={R.line} strokeWidth={1.5} />
      <line x1={P.x0} y1={P.yBase} x2={P.x0} y2={P.yTop - 4} stroke={R.line} strokeWidth={1.5} />
      <text x={P.x0} y={P.yTop - 12} fontFamily={MONO} fontSize={11.5} fill={R.world}>
        measured mean |error| vs step · 14 seeded rollouts
      </text>
      <polyline points={curvePath(meanBC, P.x0, P.x1, P.yBase, P.yTop, vmax)} fill="none" stroke={R.error} strokeWidth={dagger ? 1.6 : 3} opacity={dagger ? 0.55 : 1} />
      <polyline points={curvePath(meanDA, P.x0, P.x1, P.yBase, P.yTop, vmax)} fill="none" stroke={R.goal} strokeWidth={dagger ? 3 : 1.6} opacity={dagger ? 1 : 0.55} />
      <text x={616} y={P.yBase - (P.yBase - P.yTop) * clamp(meanBC[horizon] / vmax, 0, 1) + 4} fontFamily={MONO} fontSize={11.5} fill={R.error}>
        no relabel
      </text>
      <text x={616} y={P.yBase - (P.yBase - P.yTop) * clamp(meanDA[horizon] / vmax, 0, 1) + 4} fontFamily={MONO} fontSize={11.5} fill={R.goal}>
        DAgger
      </text>
      <line
        x1={P.x0 + ((P.x1 - P.x0) * kNow) / horizon}
        y1={P.yBase}
        x2={P.x0 + ((P.x1 - P.x0) * kNow) / horizon}
        y2={P.yTop}
        stroke={R.world}
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      <Readout
        rows={[
          { label: "step k / T", value: `${kNow} / ${horizon}`, color: R.ink },
          { label: "|error| now", value: Math.abs(dev[kNow]).toFixed(1), color: Math.abs(dev[kNow]) > 18 ? R.error : R.ink },
          { label: "Σ |error|", value: accErr.toFixed(0), color: dagger ? R.goal : R.error },
          { label: "horizon ×2 ⇒", value: `err ×${ratio.toFixed(1)}`, color: dagger ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "expert path", dash: true },
          { color: R.signal, label: "policy rollout" },
          { color: R.world, label: "seen in training" },
          { color: R.error, label: "expert relabels" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={dagger ? R.goal : R.error}>
        {reduced
          ? "Reduced motion: full rollout shown; ε, T and DAgger still recompute the measured curves."
          : dagger
            ? `relabeling the visited states caps the drift — doubling the horizon only ×${ratio.toFixed(1)}s the error (linear)`
            : `each step off the tube degrades the next: doubling the horizon ×${ratio.toFixed(1)}s the error, not ×2`}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 10.3 · Predict a chunk, not a single step  (the fix, same simulation)
// The identical noise model as Fig 10.2, run twice with the same seed: once
// re-deciding every step (H = 1) and once committing to open-loop chunks of
// H actions. Fewer closed-loop seams = measurably less drift, and the
// bottom panel shows both measured curves side by side.
// ===========================================================================

const F3_T = 120;
const F3 = { x0: 90, x1: 610, yBase: 195, amp: 88 };
const f3Point = (t: number): [number, number] => [
  lerp(F3.x0, F3.x1, t),
  F3.yBase - F3.amp * Math.sin(Math.PI * t) + 16 * Math.sin(2 * Math.PI * t),
];
const f3Normal = (t: number): [number, number] => {
  const tx = F3.x1 - F3.x0;
  const ty = -F3.amp * Math.PI * Math.cos(Math.PI * t) + 32 * Math.PI * Math.cos(2 * Math.PI * t);
  const l = Math.hypot(tx, ty) || 1;
  return [-ty / l, tx / l];
};

export function RbActionChunking() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [chunkH, setChunkH] = useState(25);
  const [eps, setEps] = useState(0.02);
  const [k, setK] = useState(0);

  useRafLoop(
    (dt) => setK((v) => (v + dt * 26 > F3_T + 18 ? 0 : v + dt * 26)),
    { playing: playing && inView && !reduced },
  );
  const kNow = reduced ? F3_T : Math.min(Math.floor(k), F3_T);

  const { devOne, devChk, meanOne, meanChk } = useMemo(
    () => ({
      devOne: simDrift(F3_T, eps, 1, false, 21),
      devChk: simDrift(F3_T, eps, chunkH, false, 21),
      meanOne: meanDrift(F3_T, eps, 1, false),
      meanChk: meanDrift(F3_T, eps, chunkH, false),
    }),
    [eps, chunkH],
  );

  const { ptsOne, ptsChk } = useMemo(() => {
    const build = (dev: number[]) => {
      const out: [number, number][] = [];
      for (let i = 0; i <= kNow; i++) {
        const t = i / F3_T;
        const [px, py] = f3Point(t);
        const [nx, ny] = f3Normal(t);
        out.push([clamp(px + nx * dev[i], 60, 660), clamp(py + ny * dev[i], 60, 258)]);
      }
      return out;
    };
    return { ptsOne: build(devOne), ptsChk: build(devChk) };
  }, [devOne, devChk, kNow]);

  const P = { x0: 90, x1: 610, yBase: 400, yTop: 306 };
  const vmax = Math.max(...meanOne, ...meanChk, 12);
  const gain = meanOne[F3_T] / Math.max(meanChk[F3_T], 0.5);
  const replansChk = Math.floor(kNow / chunkH) + (kNow > 0 ? 1 : 0);
  const expertPts = Array.from({ length: 73 })
    .map((_, i) => f3Point(i / 72))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.3 · Predict a chunk, not a single step"
      ariaLabel={`The same noisy imitation simulation run one-step and with action chunks of ${chunkH}; the chunked rollout shows ${gain.toFixed(1)} times less measured drift`}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => setK((v) => Math.min(Math.floor(v) + 1, F3_T))}
            onReset={() => setK(0)}
          />
          <Slider label="chunk H" min={1} max={50} step={1} value={chunkH} onChange={setChunkH} fmt={(v) => `${v}`} />
          <Slider label="ε" min={0.005} max={0.06} step={0.005} value={eps} onChange={setEps} fmt={(v) => v.toFixed(3)} />
        </>
      }
    >
      {/* expert path + tube */}
      <polyline points={expertPts} fill="none" stroke="#dcdcd8" strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" opacity={0.65} />
      <polyline points={expertPts} fill="none" stroke={R.goal} strokeWidth={2.5} strokeDasharray="6 5" />
      <circle cx={F3.x1} cy={F3.yBase} r={8} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />

      {/* one-step rollout (blue) vs chunked rollout (amber) — same seed */}
      <polyline points={ptsOne.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} fill="none" stroke={R.signal} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ptsOne[ptsOne.length - 1][0]} cy={ptsOne[ptsOne.length - 1][1]} r={6} fill={R.signal} />
      <polyline points={ptsChk.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} fill="none" stroke={R.plan} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ptsChk[ptsChk.length - 1][0]} cy={ptsChk[ptsChk.length - 1][1]} r={6} fill={R.plan} />
      {/* seams: the closed-loop replans where fresh error can enter */}
      {ptsChk.map((p, i) => (i % chunkH === 0 ? <circle key={i} cx={p[0]} cy={p[1]} r={4} fill={R.error} /> : null))}

      {/* measured drift panel, both policies */}
      <line x1={P.x0} y1={P.yBase} x2={P.x1} y2={P.yBase} stroke={R.line} strokeWidth={1.5} />
      <line x1={P.x0} y1={P.yBase} x2={P.x0} y2={P.yTop - 4} stroke={R.line} strokeWidth={1.5} />
      <text x={P.x0} y={P.yTop - 12} fontFamily={MONO} fontSize={11.5} fill={R.world}>
        measured mean |drift| vs step · 14 seeded rollouts
      </text>
      <polyline points={curvePath(meanOne, P.x0, P.x1, P.yBase, P.yTop, vmax)} fill="none" stroke={R.signal} strokeWidth={2.6} />
      <polyline points={curvePath(meanChk, P.x0, P.x1, P.yBase, P.yTop, vmax)} fill="none" stroke={R.plan} strokeWidth={2.6} />
      <text x={616} y={P.yBase - (P.yBase - P.yTop) * clamp(meanOne[F3_T] / vmax, 0, 1) + 4} fontFamily={MONO} fontSize={11.5} fill={R.signal}>
        H=1
      </text>
      <text x={616} y={Math.min(P.yBase - (P.yBase - P.yTop) * clamp(meanChk[F3_T] / vmax, 0, 1) + 4, P.yBase - 2)} fontFamily={MONO} fontSize={11.5} fill={R.plan}>
        H={chunkH}
      </text>
      <line
        x1={P.x0 + ((P.x1 - P.x0) * kNow) / F3_T}
        y1={P.yBase}
        x2={P.x0 + ((P.x1 - P.x0) * kNow) / F3_T}
        y2={P.yTop}
        stroke={R.world}
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      <Readout
        rows={[
          { label: "step k / T", value: `${kNow} / ${F3_T}`, color: R.ink },
          { label: "replans", value: `${kNow} vs ${replansChk}`, color: R.ink },
          { label: "drift now", value: `${Math.abs(devOne[kNow]).toFixed(0)} vs ${Math.abs(devChk[kNow]).toFixed(0)}`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "expert path", dash: true },
          { color: R.signal, label: "one-step policy" },
          { color: R.plan, label: `chunks of H=${chunkH}` },
          { color: R.error, label: "replan seam" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "Reduced motion: full rollouts shown; H and ε still recompute both measured curves."
          : chunkH === 1
            ? "H = 1 is plain behavior cloning — slide H up and watch the amber curve flatten"
            : `same seed, same noise: H=${chunkH} cuts measured drift ×${gain.toFixed(1)} — but it can only react at the red seams`}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 10.4 · A regressor averages the modes; diffusion samples one
// Real denoising: 16 demonstrated trajectories form two modes around an
// obstacle. The sample starts as seeded noise and follows the exact posterior
// mean of the Gaussian-diffused demo distribution (annealed σ, DDIM-style
// update). Early on the posterior mean IS the collapsed average; as σ anneals
// the sample commits to one mode. The regressor tab shows the actual mean of
// the demo set driving straight into the obstacle. All numbers are measured.
// ===========================================================================

const DP_W = 25; // waypoints per trajectory
const DP_M = 16; // demos
const DP_X0 = 110;
const DP_X1 = 610;
const DP_Y = 232; // centerline
const DP_OBS = { x: 360, y: DP_Y, r: 30 };
const dpX = (i: number) => lerp(DP_X0, DP_X1, i / (DP_W - 1));

function dpDemos(): number[][] {
  const rng = mulberry32(2024);
  const out: number[][] = [];
  for (let j = 0; j < DP_M; j++) {
    const s = j < DP_M / 2 ? 1 : -1;
    const amp = 80 + (rng() - 0.5) * 36;
    const wig = (rng() - 0.5) * 26;
    const ph = rng() * Math.PI;
    out.push(
      Array.from({ length: DP_W }, (_, i) => {
        const t = i / (DP_W - 1);
        return s * (amp * Math.sin(Math.PI * t) + wig * Math.sin(2 * Math.PI * t + ph) * Math.sin(Math.PI * t));
      }),
    );
  }
  return out;
}

// Exact denoiser for the diffused empirical distribution: at noise level σ the
// posterior mean E[x₀|x] is a softmax-weighted blend of the demos. DDIM-style
// deterministic update anneals σ from 118 to ~2 over N steps.
function dpDenoise(demos: number[][], seed: number, N: number) {
  const rng = mulberry32(1000 + seed * 37);
  const sig = (k: number) => 118 * Math.pow(2.2 / 118, k / N);
  let x = Array.from({ length: DP_W }, () => clamp(sig(0) * gauss(rng), -130, 130));
  const frames: number[][] = [x.slice()];
  const means: number[][] = [];
  const wUps: number[] = [];
  for (let k = 0; k < N; k++) {
    const s = sig(k);
    const sn = sig(k + 1);
    const logw = demos.map((d) => {
      let msd = 0;
      for (let i = 0; i < DP_W; i++) msd += (x[i] - d[i]) * (x[i] - d[i]);
      return -msd / DP_W / (2 * s * s);
    });
    const mx = Math.max(...logw);
    const w = logw.map((v) => Math.exp(v - mx));
    const Z = w.reduce((a, b) => a + b, 0) || 1;
    const x0 = Array.from({ length: DP_W }, (_, i) => demos.reduce((a, d, j) => a + (w[j] / Z) * d[i], 0));
    means.push(x0);
    wUps.push(demos.reduce((a, _, j) => a + (j < DP_M / 2 ? w[j] / Z : 0), 0));
    x = x0.map((m, i) => m + (sn / s) * (x[i] - m));
    frames.push(x.slice());
  }
  if (means.length === 0) {
    means.push(x.slice());
    wUps.push(0.5);
  }
  return { frames, means, wUps };
}

const dpClearance = (offsets: number[]) => {
  let c = Infinity;
  for (let i = 0; i < DP_W; i++) c = Math.min(c, Math.hypot(dpX(i) - DP_OBS.x, offsets[i]) - DP_OBS.r);
  return c;
};

type DpTab = "reg" | "dp";

export function RbDiffusionPolicy() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<DpTab>("reg");
  const [playing, toggle] = useReducer((p) => !p, true);
  const [steps, setSteps] = useState(16);
  const [seedIdx, setSeedIdx] = useState(0);
  const [k, setK] = useState(0);

  useRafLoop(
    (dt) => setK((v) => (v + (dt * steps) / 2.5 > steps + 5 ? 0 : v + (dt * steps) / 2.5)),
    { playing: playing && inView && !reduced && tab === "dp" },
  );
  const kNow = reduced ? steps : Math.min(k, steps);

  const demos = useMemo(() => dpDemos(), []);
  const meanAll = useMemo(
    () => Array.from({ length: DP_W }, (_, i) => demos.reduce((a, d) => a + d[i], 0) / DP_M),
    [demos],
  );
  const den = useMemo(() => dpDenoise(demos, 300 + (seedIdx % 9), steps), [demos, seedIdx, steps]);
  const tally = useMemo(() => {
    let up = 0;
    let dn = 0;
    let hit = 0;
    for (let s = 0; s < 9; s++) {
      const f = dpDenoise(demos, 300 + s, steps).frames[steps];
      if (f[Math.floor(DP_W / 2)] > 0) up++;
      else dn++;
      if (dpClearance(f) < 0) hit++;
    }
    return { up, dn, hit };
  }, [demos, steps]);

  // interpolate between denoise frames for smooth playback
  const ki = Math.min(Math.floor(kNow), steps - 1);
  const frac = clamp(kNow - ki, 0, 1);
  const cur = den.frames[ki].map((v, i) => lerp(v, den.frames[ki + 1][i], frac));
  const mean = den.means[Math.min(ki, den.means.length - 1)];
  const wUp = den.wUps[Math.min(ki, den.wUps.length - 1)];
  const sigNow = 118 * Math.pow(2.2 / 118, kNow / steps);
  const committed = wUp > 0.7 ? "left" : wUp < 0.3 ? "right" : "undecided";
  const clear = dpClearance(tab === "dp" ? cur : meanAll);
  const done = kNow >= steps;

  const toPts = (off: number[]) => off.map((v, i) => `${dpX(i).toFixed(1)},${(DP_Y - v).toFixed(1)}`).join(" ");

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.4 · A regressor averages the modes; diffusion samples one"
      ariaLabel={
        tab === "reg"
          ? `The mean of 16 demonstrated trajectories drives straight into the obstacle with measured clearance ${clear.toFixed(0)}`
          : `Real denoising of a trajectory from seeded noise toward the two-mode demo distribution; committed ${committed}, clearance ${clear.toFixed(0)}`
      }
      controls={
        <>
          <Tabs
            options={[
              { id: "reg", label: "Regressor (squared error)" },
              { id: "dp", label: "Diffusion Policy" },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === "dp" && (
            <>
              <Transport
                playing={playing}
                onPlay={toggle}
                onStep={() => setK((v) => Math.min(Math.floor(v) + 1, steps))}
                onReset={() => setK(0)}
              />
              <Btn onClick={() => { setSeedIdx((s) => s + 1); setK(0); }} title="fresh seed noise, same denoiser">
                ⟳ resample
              </Btn>
              <Slider label="steps N" min={4} max={40} step={1} value={steps} onChange={setSteps} fmt={(v) => `${v}`} />
            </>
          )}
        </>
      }
    >
      {/* the demo distribution: two modes */}
      {demos.map((d, j) => (
        <polyline key={j} points={toPts(d)} fill="none" stroke={R.goal} strokeWidth={1.3} opacity={0.32} />
      ))}

      {/* obstacle, start, goal */}
      <circle cx={DP_OBS.x} cy={DP_OBS.y} r={DP_OBS.r} fill="#e6e6e3" stroke={R.world} strokeWidth={2.5} />
      <text x={DP_OBS.x} y={DP_OBS.y + 4} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        obstacle
      </text>
      <circle cx={DP_X0} cy={DP_Y} r={9} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} />
      <text x={DP_X0} y={DP_Y + 28} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        start
      </text>
      <circle cx={DP_X1} cy={DP_Y} r={9} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      <text x={DP_X1} y={DP_Y + 28} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        goal
      </text>

      {tab === "reg" ? (
        <>
          <polyline points={toPts(meanAll)} fill="none" stroke={R.plan} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={DP_OBS.x} cy={DP_OBS.y} r={DP_OBS.r + 5} fill="none" stroke={R.error} strokeWidth={3} />
          <text x={DP_OBS.x} y={DP_OBS.y - DP_OBS.r - 14} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error} fontWeight={600}>
            collision: the mean of left &amp; right
          </text>
        </>
      ) : (
        <>
          {/* posterior mean: starts as the collapsed average, sharpens to a mode */}
          <polyline points={toPts(mean)} fill="none" stroke={R.signal} strokeWidth={1.8} strokeDasharray="5 4" opacity={0.85} />
          {/* the sample being denoised */}
          <polyline points={toPts(cur)} fill="none" stroke={R.plan} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      <Readout
        rows={
          tab === "reg"
            ? [
                { label: "prediction", value: "mean of 16 demos", color: R.plan },
                { label: "clearance", value: `${clear.toFixed(0)} px`, color: clear < 0 ? R.error : R.goal },
                { label: "verdict", value: clear < 0 ? "collision ✗" : "clear ✓", color: clear < 0 ? R.error : R.goal },
              ]
            : [
                { label: "denoise k / N", value: `${Math.round(kNow)} / ${steps}`, color: R.ink },
                { label: "σ (noise)", value: sigNow.toFixed(1), color: R.ink },
                { label: "committed", value: committed, color: committed === "undecided" ? R.world : R.goal },
                { label: "clearance", value: `${clear.toFixed(0)} px`, color: clear < 0 ? R.error : R.goal },
                { label: "9 seeds", value: `${tally.up}L ${tally.dn}R ${tally.hit}hit`, color: tally.hit === 0 ? R.goal : R.error },
              ]
        }
      />
      <Legend
        items={[
          { color: R.goal, label: "demo set (2 modes)" },
          { color: R.plan, label: tab === "reg" ? "regressor output" : "sample xₖ" },
          ...(tab === "dp" ? [{ color: R.signal, label: "posterior mean x̂₀", dash: true }] : []),
          { color: R.world, label: "obstacle" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "Reduced motion: fully denoised sample shown; resample and steps still recompute it."
          : tab === "reg"
            ? "squared error minimizes to the average of the demos — the one trajectory nobody demonstrated"
            : done
              ? `committed ${committed} with ${clear.toFixed(0)} px to spare · resample to flip — 9 seeds: ${tally.up} left / ${tally.dn} right, ${tally.hit} collisions`
              : "the dashed posterior mean starts as the collapsed average, then σ anneals and the sample falls into one mode"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 10.5 · ALOHA leader-follower teleoperation  (true 3D, orbitable)
// A scripted pick-lift-replace demonstration: the follower's end-effector
// trajectory is solved with real 2-link IK, the leader arm mirrors the same
// joint angles on smaller links (that is the ALOHA trick), and the recorded
// end-effector path is drawn as a 3D curve — the demonstration itself.
// ===========================================================================

const AL_F: V3 = [0.42, 0, 0.4]; // follower shoulder
const AL_FL: [number, number] = [0.55, 0.42];
const AL_L: V3 = [-1.02, 0, 0.34]; // leader shoulder
const AL_LL: [number, number] = [0.3, 0.23];
const AL_BLOCK: V3 = [1.0, 0, 0.075];
const AL_P0: V3 = [0.72, 0, 0.74];
const AL_P1: V3 = [1.0, 0, 0.22];
const AL_P2: V3 = [0.88, 0, 0.68];

function alohaPose(p: number) {
  const seg = (a: number, b: number) => smooth(clamp((p - a) / (b - a), 0, 1));
  let pos: V3;
  if (p < 0.22) pos = v3.lerp(AL_P0, AL_P1, seg(0, 0.22));
  else if (p < 0.32) pos = AL_P1;
  else if (p < 0.55) pos = v3.lerp(AL_P1, AL_P2, seg(0.32, 0.55));
  else if (p < 0.72) pos = v3.lerp(AL_P2, AL_P1, seg(0.55, 0.72));
  else if (p < 0.82) pos = AL_P1;
  else pos = v3.lerp(AL_P1, AL_P0, seg(0.82, 1));
  const jaw = p < 0.22 ? 1 : p < 0.32 ? 1 - seg(0.22, 0.32) : p < 0.72 ? 0 : p < 0.82 ? seg(0.72, 0.82) : 1;
  const carrying = p >= 0.32 && p < 0.72;
  return { pos, jaw, carrying };
}

// A parallel-jaw gripper glyph at ee, pointing along the wrist direction.
function gripper3(ee: V3, dir: V3, jaw: number, scale: number, color: string): Prim3D[] {
  const d = v3.norm(dir);
  let perp = v3.cross(d, [0, 0, 1]);
  if (v3.len(perp) < 0.1) perp = v3.cross(d, [0, 1, 0]);
  perp = v3.norm(perp);
  const gap = scale * (0.3 + 0.55 * jaw);
  const back = v3.sub(ee, v3.scale(d, scale * 0.7));
  const out: Prim3D[] = [];
  for (const s of [1, -1]) {
    const off = v3.scale(perp, gap * s);
    out.push(seg3(v3.add(back, off), v3.add(v3.add(ee, off), v3.scale(d, scale * 0.4)), color, { width: 3.5 }));
  }
  out.push(seg3(v3.add(back, v3.scale(perp, gap)), v3.add(back, v3.scale(perp, -gap)), color, { width: 3.5 }));
  return out;
}

// 2-link arm in the x-z plane: shoulder column, links, joints; returns prims
// plus wrist angle for the gripper.
function arm3(shoulder: V3, L1: number, L2: number, q1: number, q2: number, color: string, w: number) {
  const elbow: V3 = [shoulder[0] + L1 * Math.cos(q1), shoulder[1], shoulder[2] + L1 * Math.sin(q1)];
  const ee: V3 = [elbow[0] + L2 * Math.cos(q1 + q2), elbow[1], elbow[2] + L2 * Math.sin(q1 + q2)];
  const prims: Prim3D[] = [
    seg3([shoulder[0], shoulder[1], 0], shoulder, R.world, { width: 3 }),
    seg3(shoulder, elbow, color, { width: w }),
    seg3(elbow, ee, color, { width: w * 0.85 }),
    dot3(shoulder, R.ink, { r: 4 }),
    dot3(elbow, color, { r: 3.5 }),
  ];
  return { prims, ee, wrist: q1 + q2 };
}

export function RbAloha() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-32, 24);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [recording, setRecording] = useState(true);
  const [p, setP] = useState(0.02);

  useRafLoop((dt) => setP((v) => (v + dt / 8) % 1), {
    playing: playing && inView && !reduced,
  });
  const pShown = reduced ? 0.45 : p;

  const { pos, jaw, carrying } = alohaPose(pShown);
  const [q1, q2] = ik2(pos[0] - AL_F[0], pos[2] - AL_F[2], AL_FL[0], AL_FL[1]);
  const fol = arm3(AL_F, AL_FL[0], AL_FL[1], q1, q2, R.signal, 6);
  const lead = arm3(AL_L, AL_LL[0], AL_LL[1], q1, q2, R.plan, 4.5); // same q — the ALOHA trick
  const blockPos: V3 = carrying ? [fol.ee[0], fol.ee[1], fol.ee[2] - 0.145] : AL_BLOCK;
  const samples = Math.floor(pShown * 8 * 50);

  const prims: Prim3D[] = [
    ...grid3(1.3, 0.325),
    // the joint-angle stream, leader -> follower
    seg3([AL_L[0], 0, 0.04], [AL_F[0], 0, 0.04], R.world, { width: 1.5, dash: "4 5" }),
    label3([-0.32, 0, 0.05], "joint angles stream →", R.world, { anchor: "middle", dy: 16, size: 11.5 }),
    ...lead.prims,
    ...gripper3(lead.ee, [Math.cos(lead.wrist), 0, Math.sin(lead.wrist)], jaw, 0.09, R.plan),
    label3([-1.02, 0, 0.86], "leader (operator)", R.plan, { anchor: "middle", dy: -4, size: 12 }),
    ...fol.prims,
    ...gripper3(fol.ee, [Math.cos(fol.wrist), 0, Math.sin(fol.wrist)], jaw, 0.14, R.signal),
    label3([0.42, 0, 1.02], "follower (recorded)", R.signal, { anchor: "middle", dy: -4, size: 12 }),
    ...box3(blockPos, quat.id, 0.16, 0.16, 0.15, carrying ? R.goal : R.world),
    // the recorded demonstration: the follower's end-effector path
    ...(recording && pShown > 0.02
      ? curve3((u) => alohaPose(u).pos, R.goal, { n: 72, t0: 0, t1: pShown, width: 2.2 })
      : []),
  ];

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 5.2,
    zoom: 126,
    target: [-0.05, 0, 0.32],
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.5 · ALOHA leader-follower teleoperation"
      ariaLabel={`A small leader arm and a larger follower arm sharing the same joint angles perform a pick-and-place in 3D; the follower's end-effector path is recorded as the demonstration. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => setP((v) => (v + 1 / 16) % 1)}
            onReset={() => {
              setP(0.02);
              orbit.reset();
            }}
          />
          <Btn onClick={() => setRecording((v) => !v)} active={recording}>
            {recording ? "● recording" : "record"}
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag to orbit</span>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "t", value: `${(pShown * 8).toFixed(1)} s`, color: R.ink },
          { label: "q₁, q₂", value: `${deg(q1).toFixed(0)}°, ${deg(q2).toFixed(0)}°`, color: R.signal },
          { label: "gripper", value: `${Math.round(jaw * 100)}% open`, color: jaw < 0.2 ? R.goal : R.ink },
          { label: "samples @50Hz", value: recording ? `${samples}` : "—", color: recording ? R.goal : R.world },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "leader arm" },
          { color: R.signal, label: "follower arm" },
          { color: R.goal, label: "recorded EE path" },
          { color: R.world, label: "block / world" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "Reduced motion: mid-task pose shown with the recorded path; record still toggles the trace."
          : "one set of joint angles, two bodies: the demonstration lands in the follower's own action space"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 10.6 · UMI: collect in the wild, deploy on a matching robot  (true 3D)
// Collect: a handheld gripper + GoPro sweeps through a kitchen scene tracing a
// 3D end-effector path. Deploy: a 3-DoF robot (yaw + real 2-link IK) replays
// the SAME recorded path with the SAME gripper glyph and camera — the matched
// interface is exactly what makes the in-the-wild data transfer.
// ===========================================================================

const U_C0: V3 = [-0.55, 0.42, 0.85];
const U_CC: V3 = [0.05, 0.72, 1.05];
const U_C1: V3 = [0.34, -0.12, 0.62];
const U_C2: V3 = [0.45, -0.25, 0.5];
const U_C3: V3 = [0.28, 0.22, 0.92];
const U_MUG: V3 = [0.45, -0.25, 0.455];

function umiPos(p: number): V3 {
  const seg = (a: number, b: number) => smooth(clamp((p - a) / (b - a), 0, 1));
  if (p < 0.4) {
    const u = seg(0, 0.4);
    return v3.add(
      v3.scale(U_C0, (1 - u) * (1 - u)),
      v3.add(v3.scale(U_CC, 2 * u * (1 - u)), v3.scale(U_C1, u * u)),
    );
  }
  if (p < 0.52) return v3.lerp(U_C1, U_C2, seg(0.4, 0.52));
  if (p < 0.62) return U_C2;
  return v3.lerp(U_C2, U_C3, seg(0.62, 1));
}

function umiPose(p: number) {
  const seg = (a: number, b: number) => smooth(clamp((p - a) / (b - a), 0, 1));
  const pos = umiPos(p);
  const jaw = p < 0.52 ? 1 : p < 0.62 ? 1 - seg(0.52, 0.62) : 0;
  const carrying = p >= 0.62;
  const fd = v3.sub(umiPos(Math.min(p + 0.015, 1)), umiPos(Math.max(p - 0.015, 0)));
  const dir = v3.len(fd) > 1e-4 ? v3.norm(fd) : v3.norm(v3.sub(U_C2, U_C1));
  return { pos, jaw, carrying, dir };
}

type UmiTab = "collect" | "deploy";

export function RbUmi() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-30, 22);
  const [tab, setTab] = useState<UmiTab>("collect");
  const [playing, toggle] = useReducer((p) => !p, true);
  const [p, setP] = useState(0.05);

  useRafLoop((dt) => setP((v) => (v + dt / 7) % 1), {
    playing: playing && inView && !reduced,
  });
  const pShown = reduced ? 0.8 : p;

  const { pos, jaw, carrying, dir } = umiPose(pShown);
  const mugPos: V3 = carrying ? [pos[0], pos[1], pos[2] - 0.07] : U_MUG;

  // the shared scene + the recorded path (identical in both tabs)
  const prims: Prim3D[] = [
    ...grid3(1.3, 0.325),
    ...box3([0.45, -0.25, 0.2], quat.id, 0.64, 0.5, 0.4, R.world),
    seg3(mugPos, v3.add(mugPos, [0, 0, 0.09]), R.goal, { width: 5 }),
    dot3(v3.add(mugPos, [0, 0, 0.1]), R.goal, { r: 5.5 }),
    ...ring3(v3.add(mugPos, [0, 0, 0.1]), [0, 0, 1], 0.045, R.goal, { n: 24, width: 1.5 }),
    ...(pShown > 0.02
      ? curve3((u) => umiPos(u), R.goal, { n: 72, t0: 0, t1: pShown, width: 2.2, dash: "5 4" })
      : []),
    // the matched interface: same jaws + same camera in both tabs
    ...gripper3(pos, dir, jaw, 0.13, R.plan),
  ];
  const camBox: V3 = v3.add(v3.sub(pos, v3.scale(dir, 0.16)), [0, 0, 0.09]);
  prims.push(...box3(camBox, quat.id, 0.09, 0.06, 0.06, R.signal));
  prims.push(seg3(camBox, v3.add(camBox, v3.add(v3.scale(dir, 0.3), [0.08, 0, -0.1])), R.signal, { width: 1, dash: "2 3", opacity: 0.7 }));
  prims.push(seg3(camBox, v3.add(camBox, v3.add(v3.scale(dir, 0.3), [-0.08, 0, -0.1])), R.signal, { width: 1, dash: "2 3", opacity: 0.7 }));

  if (tab === "collect") {
    prims.push(label3([-0.55, 0.42, 1.08], "handheld — no robot in the loop", R.plan, { anchor: "middle", size: 12 }));
  } else {
    // 3-DoF robot: base yaw + planar 2-link IK to the same recorded pose
    const S: V3 = [-0.85, 0.55, 0.5];
    const dx = pos[0] - S[0];
    const dy = pos[1] - S[1];
    const dz = pos[2] - S[2];
    const rr = Math.hypot(dx, dy) || 1e-6;
    const ur: V3 = [dx / rr, dy / rr, 0];
    const [a1, a2] = ik2(rr, dz, 0.8, 0.75);
    const elbow = v3.add(v3.add(S, v3.scale(ur, 0.8 * Math.cos(a1))), [0, 0, 0.8 * Math.sin(a1)]);
    const eeR = v3.add(v3.add(elbow, v3.scale(ur, 0.75 * Math.cos(a1 + a2))), [0, 0, 0.75 * Math.sin(a1 + a2)]);
    prims.push(
      seg3([S[0], S[1], 0], S, R.world, { width: 5 }),
      ...box3([S[0], S[1], 0.06], quat.id, 0.24, 0.24, 0.12, R.world),
      seg3(S, elbow, R.signal, { width: 6 }),
      seg3(elbow, eeR, R.signal, { width: 5 }),
      dot3(S, R.ink, { r: 4.5 }),
      dot3(elbow, R.signal, { r: 4 }),
      label3([-0.85, 0.55, 0.78], "robot replays the recorded path", R.signal, { anchor: "middle", size: 12 }),
    );
  }

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 5.4,
    zoom: 128,
    target: [-0.1, 0.1, 0.35],
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.6 · UMI: collect demonstrations in the wild, no robot"
      ariaLabel={
        tab === "collect"
          ? "A handheld gripper with a GoPro traces a 3D demonstration path through a kitchen scene, no robot present. Drag to orbit."
          : "A robot arm with the matching gripper and wrist camera replays the same recorded 3D path via inverse kinematics. Drag to orbit."
      }
      svgProps={orbit.svgProps}
      controls={
        <>
          <Tabs
            options={[
              { id: "collect", label: "Collect (handheld)" },
              { id: "deploy", label: "Deploy (robot)" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <Transport
            playing={playing}
            onPlay={toggle}
            onReset={() => {
              setP(0.05);
              orbit.reset();
            }}
          />
          <span className="font-mono text-[13px] text-[var(--muted)]">drag to orbit</span>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "t", value: `${(pShown * 7).toFixed(1)} s`, color: R.ink },
          { label: "gripper pose", value: `(${pos[0].toFixed(2)}, ${pos[1].toFixed(2)}, ${pos[2].toFixed(2)})`, color: R.plan },
          { label: "jaw", value: `${Math.round(jaw * 100)}% open`, color: jaw < 0.2 ? R.goal : R.ink },
          { label: "rig", value: tab === "collect" ? "gripper + GoPro" : "arm + wrist cam", color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "recorded EE path", dash: true },
          { color: R.plan, label: "gripper (action)" },
          { color: R.signal, label: "camera (obs)" },
          { color: R.world, label: "kitchen / world" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "Reduced motion: mid-demonstration shown; the tabs still swap collection for deployment."
          : tab === "collect"
            ? "same jaws, same camera viewpoint as the robot — that deliberate match is what makes this data transfer"
            : "the observation and action interface match the handheld rig, so the in-the-wild data drops straight in"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 10.7 · The same action means different things on different bodies
// Two 2-link arms with deliberately different morphologies, real FK/IK. Raw
// joint commands land the hands in different relative poses (measured gap);
// switching to a normalized relative-EE action makes robot B *solve* for the
// corresponding pose with real inverse kinematics, and the gap collapses.
// ===========================================================================

const E_A = { b: { x: 140, y: 300 }, L1: 150, L2: 95 };
const E_B = { b: { x: 432, y: 300 }, L1: 110, L2: 45 };

function fk2(b: { x: number; y: number }, L1: number, L2: number, q1: number, q2: number) {
  const e = { x: b.x + L1 * Math.cos(q1), y: b.y - L1 * Math.sin(q1) };
  const t = { x: e.x + L2 * Math.cos(q1 + q2), y: e.y - L2 * Math.sin(q1 + q2) };
  return { e, t };
}

type EmbTab = "raw" | "norm";

export function RbEmbodimentGap() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<EmbTab>("raw");
  const [action, setAction] = useState(40);
  const [disp, setDisp] = useState(40);

  useRafLoop((dt) => setDisp((v) => approach(v, action, 0.22, dt)), {
    playing: inView && !reduced,
  });
  const a = reduced ? action : disp;

  const q1 = rad(a);
  const q2 = rad(-55 + 0.25 * a);
  const reachA = E_A.L1 + E_A.L2;
  const reachB = E_B.L1 + E_B.L2;

  const A = fk2(E_A.b, E_A.L1, E_A.L2, q1, q2);
  // relative pose of A's hand, in units of its own reach (math coords, y up)
  const uA = { x: (A.t.x - E_A.b.x) / reachA, y: (E_A.b.y - A.t.y) / reachA };

  let B: ReturnType<typeof fk2>;
  if (tab === "raw") {
    B = fk2(E_B.b, E_B.L1, E_B.L2, q1, q2);
  } else {
    // normalized action: B solves IK for the SAME relative pose scaled to its
    // own reach — real inverse kinematics, not a snap-to.
    const [b1, b2] = ik2(uA.x * reachB, uA.y * reachB, E_B.L1, E_B.L2, Math.sin(q2) < 0 ? -1 : 1);
    B = fk2(E_B.b, E_B.L1, E_B.L2, b1, b2);
  }
  const uB = { x: (B.t.x - E_B.b.x) / reachB, y: (E_B.b.y - B.t.y) / reachB };
  const gap = Math.hypot(uA.x - uB.x, uA.y - uB.y) * 100;
  const pools = gap < 2;

  const armEls = (
    b: { x: number; y: number },
    f: ReturnType<typeof fk2>,
    color: string,
    fill: string,
    label: string,
  ) => (
    <g>
      <rect x={b.x - 18} y={b.y} width={36} height={14} rx={3} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <line x1={b.x} y1={b.y} x2={f.e.x} y2={f.e.y} stroke={color} strokeWidth={9} strokeLinecap="round" />
      <line x1={f.e.x} y1={f.e.y} x2={f.t.x} y2={f.t.y} stroke={color} strokeWidth={7} strokeLinecap="round" />
      <circle cx={b.x} cy={b.y} r={6.5} fill={R.ink} />
      <circle cx={f.e.x} cy={f.e.y} r={5} fill={color} />
      <circle cx={f.t.x} cy={f.t.y} r={9} fill={fill} stroke={color} strokeWidth={2.5} />
      <text x={b.x} y={b.y + 32} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={color} fontWeight={600}>
        {label}
      </text>
      {/* the relative action: base -> hand */}
      <line x1={b.x} y1={b.y} x2={f.t.x} y2={f.t.y} stroke={pools ? R.goal : R.world} strokeWidth={1.6} strokeDasharray="4 4" opacity={0.8} />
    </g>
  );

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.7 · The same action means different things on different bodies"
      ariaLabel={`One action applied to two arms with different link lengths; ${pools ? "in normalized relative form the hands correspond and data pools" : "as raw joint angles the hands land in different relative poses"}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "raw", label: "raw joint action" },
              { id: "norm", label: "normalized Δ-EE action" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <Slider label="action" min={5} max={90} step={1} value={action} onChange={setAction} fmt={(v) => `${v}°`} />
          <Btn onClick={() => { setAction(40); setTab("raw"); }}>↺ reset</Btn>
        </>
      }
    >
      {armEls(E_A.b, A, R.signal, R.fillBlue, `A · links ${E_A.L1}+${E_A.L2}`)}
      {armEls(E_B.b, B, R.plan, R.fillAmber, `B · links ${E_B.L1}+${E_B.L2}`)}

      {/* correspondence indicator between the two hands */}
      <line x1={A.t.x} y1={A.t.y} x2={B.t.x} y2={B.t.y} stroke={pools ? R.goal : R.error} strokeWidth={2} strokeDasharray="5 4" />
      <text
        x={clamp((A.t.x + B.t.x) / 2, 120, 560)}
        y={clamp((A.t.y + B.t.y) / 2 - 12, 120, 380)}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12.5}
        fill={pools ? R.goal : R.error}
        fontWeight={600}
      >
        {pools ? "same relative move ✓" : "mismatch"}
      </text>

      <Readout
        rows={[
          {
            label: "command",
            value: tab === "raw" ? `q = (${a.toFixed(0)}°, ${(-55 + 0.25 * a).toFixed(0)}°)` : `Δ-EE (${uA.x.toFixed(2)}, ${uA.y.toFixed(2)})`,
            color: R.plan,
          },
          { label: "A rel. pose", value: `(${uA.x.toFixed(2)}, ${uA.y.toFixed(2)})`, color: R.signal },
          { label: "B rel. pose", value: `(${uB.x.toFixed(2)}, ${uB.y.toFixed(2)})`, color: R.plan },
          { label: "gap", value: `${gap.toFixed(1)}% of reach`, color: pools ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "robot A" },
          { color: R.plan, label: "robot B" },
          { color: R.goal, label: "relative action", dash: true },
          { color: R.error, label: "embodiment gap" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={pools ? R.goal : R.error}>
        {reduced
          ? "Reduced motion: shown at the commanded action; the tabs still align or split the two hands."
          : pools
            ? "expressed as normalized relative motion, one command means the same thing on both bodies — data pools"
            : "identical joint numbers, different bodies: the hands land in different relative poses, so this data can't pool"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 10.8 · A demonstration is synchronized multimodal streams on one timeline
// Five lanes on one 30 Hz clock: two camera streams, a real joint trace, the
// gripper state, and the action lane. A playhead cuts every lane at once;
// chunk boxes the next H actions; desync slides the camera lanes by a
// measured +53 ms and the (o, a) pair at the playhead goes visibly wrong.
// ===========================================================================

const SY_N = 30;
const SY_LANES = [
  { id: "scene", label: "scene cam" },
  { id: "wrist", label: "wrist cam" },
  { id: "joints", label: "joint angles" },
  { id: "gripper", label: "gripper" },
  { id: "action", label: "action" },
] as const;

export function RbSyncTimeline() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [chunk, setChunk] = useState(false);
  const [desync, setDesync] = useState(false);
  const [k, setK] = useState(6);
  const [, setAcc] = useState(0);

  useRafLoop(
    (dt) => {
      setAcc((a) => {
        const na = a + dt * 4;
        if (na >= 1) {
          setK((v) => (v + 1) % SY_N);
          return na - 1;
        }
        return na;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const X0 = 170;
  const X1 = 690;
  const Y0 = 105;
  const laneH = 38;
  const step = (X1 - X0) / SY_N;
  const playX = X0 + k * step;
  const camShift = desync ? step * 1.6 : 0;
  const H = 6;

  const cellAlpha = useMemo(() => {
    const rng = mulberry32(3);
    return Array.from({ length: SY_N * 2 }, () => 0.25 + rng() * 0.55);
  }, []);
  const jointPts = useMemo(() => {
    const y = Y0 + 2 * laneH;
    return Array.from({ length: SY_N + 1 })
      .map((_, t) => {
        const v = 0.5 + 0.36 * Math.sin((t / SY_N) * Math.PI * 2.3 + 0.7);
        return `${(X0 + t * step).toFixed(1)},${(y + 7 + (1 - v) * (laneH - 18)).toFixed(1)}`;
      })
      .join(" ");
  }, [step]);

  return (
    <Stage
      innerRef={ref}
      title="Fig 10.8 · A demonstration is synchronized streams on one timeline"
      ariaLabel={`Scene camera, wrist camera, joint, gripper and action lanes on one 30 Hz clock; playhead at frame ${k} of ${SY_N}; cameras ${desync ? "desynced by 53 milliseconds" : "aligned"}`}
      controls={
        <>
          <Transport playing={playing} onPlay={toggle} onStep={() => setK((v) => (v + 1) % SY_N)} onReset={() => { setK(6); setAcc(0); }} />
          <Btn onClick={() => setChunk((v) => !v)} active={chunk}>
            {chunk ? `✓ chunk H=${H}` : `chunk H=${H}`}
          </Btn>
          <Btn onClick={() => setDesync((v) => !v)} active={desync}>
            {desync ? "✓ desync cams" : "desync cams"}
          </Btn>
        </>
      }
    >
      {/* lanes */}
      {SY_LANES.map((ln, i) => {
        const y = Y0 + i * laneH;
        const isCam = ln.id === "scene" || ln.id === "wrist";
        return (
          <g key={ln.id}>
            <text x={30} y={y + laneH / 2 + 4} fontFamily={MONO} fontSize={12} fill={ln.id === "action" ? R.plan : R.signal}>
              {ln.label}
            </text>
            <rect x={X0} y={y + 3} width={X1 - X0} height={laneH - 8} rx={4} fill="#f2f2ef" stroke={R.line} strokeWidth={1} />
            {ln.id === "joints" ? (
              <polyline points={jointPts} fill="none" stroke={R.signal} strokeWidth={2} />
            ) : ln.id === "gripper" ? (
              Array.from({ length: SY_N }).map((_, t) => (
                <rect
                  key={t}
                  x={X0 + t * step + 1}
                  y={y + 8}
                  width={step - 2}
                  height={laneH - 18}
                  rx={2}
                  fill={R.fillBlue}
                  opacity={t >= 12 && t <= 21 ? 0.9 : 0.22}
                />
              ))
            ) : ln.id === "action" ? (
              Array.from({ length: SY_N }).map((_, t) => (
                <rect key={t} x={X0 + t * step + 1} y={y + 8} width={step - 2} height={laneH - 18} rx={2} fill={R.plan} opacity={cellAlpha[t] * 0.8} />
              ))
            ) : (
              Array.from({ length: SY_N }).map((_, t) => (
                <rect
                  key={t}
                  x={clamp(X0 + t * step + 1 + (isCam ? camShift : 0), X0, X1 - step + 1)}
                  y={y + 8}
                  width={step - 2}
                  height={laneH - 18}
                  rx={2}
                  fill={R.fillBlue}
                  opacity={cellAlpha[(t + i * SY_N) % (SY_N * 2)]}
                />
              ))
            )}
          </g>
        );
      })}

      {/* chunk overlay on the action lane */}
      {chunk && (
        <rect
          x={X0 + k * step}
          y={Y0 + 4 * laneH + 6}
          width={step * Math.min(H, SY_N - k)}
          height={laneH - 14}
          rx={3}
          fill="none"
          stroke={R.plan}
          strokeWidth={2.5}
        />
      )}

      {/* playhead cutting every lane */}
      <line x1={playX} y1={Y0 - 6} x2={playX} y2={Y0 + SY_LANES.length * laneH} stroke={desync ? R.error : R.goal} strokeWidth={2.5} />
      <circle cx={playX} cy={Y0 - 10} r={5} fill={desync ? R.error : R.goal} />

      {/* the (o, a) pair extracted at the playhead */}
      <rect x={170} y={314} width={520} height={66} rx={6} fill="none" stroke={R.line} strokeWidth={1.5} />
      <text x={182} y={334} fontFamily={MONO} fontSize={12} fill={R.world}>
        at the playhead:
      </text>
      <rect x={182} y={342} width={58} height={30} rx={4} fill={R.fillBlue} stroke={R.signal} strokeWidth={1.5} />
      <text x={211} y={361} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.signal}>
        obs
      </text>
      {svgArrow(246, 357, 284, 357, desync ? R.error : R.goal, 2, 7)}
      <rect x={292} y={342} width={58} height={30} rx={4} fill={R.fillAmber} stroke={R.plan} strokeWidth={1.5} />
      <text x={321} y={361} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.plan}>
        action
      </text>
      <text x={368} y={361} fontFamily={MONO} fontSize={13} fill={desync ? R.error : R.goal} fontWeight={600}>
        {desync ? "⚠ mispaired: the image is 53 ms stale" : "aligned (observation, action) pair ✓"}
      </text>

      <Readout
        rows={[
          { label: "frame k / N", value: `${k} / ${SY_N}`, color: R.ink },
          { label: "clock @30Hz", value: `${Math.round(k * 33.3)} ms`, color: R.ink },
          { label: "cam offset", value: desync ? "+53 ms" : "0 ms", color: desync ? R.error : R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "observations" },
          { color: R.plan, label: "actions" },
          { color: R.goal, label: "aligned pair" },
          { color: R.error, label: "mispaired" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "Reduced motion: playhead static; step, chunk and desync still recompute the pairing."
          : desync
            ? "a 1.6-frame camera lag silently teaches the policy the wrong observation for every action"
            : "one clock, five streams — the training pair is only as honest as the synchronization"}
      </text>
    </Stage>
  );
}
