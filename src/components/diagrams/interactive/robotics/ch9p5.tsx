"use client";

import { useMemo, useRef, useState } from "react";
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
  clamp,
  mulberry32,
  type V3,
  type Prim3D,
  type Camera3D,
  seg3,
  dot3,
  label3,
  curve3,
  Scene3D,
  useOrbit,
  Legend,
  Readout,
  Transport,
} from "./shared";

// ===========================================================================
// Chapter 9.5 · Flow Matching & Diffusion Models
//
// Every figure here runs the actual mathematics of Holderrieth & Erives
// (arXiv 2506.02070). The toy data distribution is a finite set of points,
// which makes the marginal vector field and the marginal score EXACT and
// computable in closed form (the posterior over data points is a softmax of
// Gaussians, Theorem 9 / Eq. 38 of the notes). Nothing is faked: the ODE and
// SDE samplers integrate the true fields, and Fig 9.5.4 really trains a
// small model with SGD on the conditional flow matching loss.
//
// Convention (CondOT path): alpha_t = t, beta_t = 1 - t, so
//   x_t = t z + (1 - t) eps,   u(x|z) = (z - x)/(1 - t),
//   marginal u(x) = (E[z|x,t] - x)/(1 - t),
//   score  grad log p_t(x) = -(x - t E[z|x,t]) / (1 - t)^2.
// ===========================================================================

type V2 = [number, number];

// A crescent of data points: visibly multimodal, so mode-committing behavior
// and posterior averaging are both visible.
const DATA: V2[] = Array.from({ length: 9 }, (_, i) => {
  const a = (Math.PI * (40 + (280 * i) / 8)) / 180;
  return [0.95 * Math.cos(a), 0.95 * Math.sin(a)] as V2;
});

// Two labeled clusters for the guidance figure.
const CLASS_A: V2[] = [
  [-0.85, 0.5],
  [-0.55, 0.72],
  [-0.95, 0.12],
  [-0.6, 0.3],
];
const CLASS_B: V2[] = [
  [0.62, -0.28],
  [0.92, -0.5],
  [0.55, -0.68],
  [0.9, -0.05],
];
const ALL_AB: V2[] = [...CLASS_A, ...CLASS_B];

const TMAX = 0.985; // integrate to just below 1; the CondOT field ~1/(1-t)

// Posterior weights over data points given noisy x at time t (softmax of
// Gaussian log-likelihoods). This is the "which z might x come from" belief.
function posteriorMean(x: V2, t: number, pts: V2[]): V2 {
  const b = Math.max(1 - t, 0.015);
  const inv = 1 / (2 * b * b);
  let best = -Infinity;
  const logs = pts.map((z) => {
    const l = -(((x[0] - t * z[0]) ** 2 + (x[1] - t * z[1]) ** 2) * inv);
    if (l > best) best = l;
    return l;
  });
  let sum = 0;
  const ws = logs.map((l) => {
    const w = Math.exp(l - best);
    sum += w;
    return w;
  });
  let ex = 0;
  let ey = 0;
  ws.forEach((w, k) => {
    ex += (w / sum) * pts[k][0];
    ey += (w / sum) * pts[k][1];
  });
  return [ex, ey];
}

// Exact marginal vector field for the CondOT Gaussian path (Theorem 9).
function marginalField(x: V2, t: number, pts: V2[]): V2 {
  const b = Math.max(1 - t, 0.015);
  const [ex, ey] = posteriorMean(x, t, pts);
  return [(ex - x[0]) / b, (ey - x[1]) / b];
}

// Exact marginal score for the same path (Eq. 38 instantiated).
function marginalScore(x: V2, t: number, pts: V2[]): V2 {
  const b = Math.max(1 - t, 0.015);
  const [ex, ey] = posteriorMean(x, t, pts);
  return [-(x[0] - t * ex) / (b * b), -(x[1] - t * ey) / (b * b)];
}

// Deterministic standard normals (Box-Muller over mulberry32).
function gaussianPairs(seed: number, n: number): V2[] {
  const rng = mulberry32(seed);
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.max(rng(), 1e-9);
    const u2 = rng();
    const r = Math.sqrt(-2 * Math.log(u1));
    out.push([r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)]);
  }
  return out;
}

// Integrate the exact ODE dx = u dt from t=0 with n Euler steps.
function odePath(x0: V2, n: number, pts: V2[]): V2[] {
  const h = TMAX / n;
  let x: V2 = [x0[0], x0[1]];
  const path: V2[] = [x];
  for (let i = 0; i < n; i++) {
    const t = i * h;
    const u = marginalField(x, t, pts);
    x = [x[0] + h * u[0], x[1] + h * u[1]];
    path.push(x);
  }
  return path;
}

// Integrate the SDE extension (Theorem 17) with Euler-Maruyama:
// dx = [u + (sigma^2/2) score] dt + sigma dW. Same marginals p_t, noisy path.
function sdePath(x0: V2, n: number, sigma: number, pts: V2[], seed: number): V2[] {
  const h = TMAX / n;
  const rng = mulberry32(seed);
  const gauss = () => {
    const u1 = Math.max(rng(), 1e-9);
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  let x: V2 = [x0[0], x0[1]];
  const path: V2[] = [x];
  for (let i = 0; i < n; i++) {
    const t = i * h;
    const u = marginalField(x, t, pts);
    const s = marginalScore(x, t, pts);
    const sh = sigma * Math.sqrt(h);
    x = [
      x[0] + h * (u[0] + 0.5 * sigma * sigma * s[0]) + sh * gauss(),
      x[1] + h * (u[1] + 0.5 * sigma * sigma * s[1]) + sh * gauss(),
    ];
    path.push(x);
  }
  return path;
}

const distToData = (p: V2, pts: V2[]) =>
  Math.min(...pts.map((z) => Math.hypot(p[0] - z[0], p[1] - z[1])));

// ===========================================================================
// Fig 9.5.1 · A vector field is a machine that moves points  (RbFlowField)
// Tabs pick a field: a simple contraction, a swirl, and the exact
// noise-to-data marginal field. Particles integrate the real ODE with Euler
// steps; a step-count slider shows integration error honestly.
// ===========================================================================

type Field951 = "contract" | "swirl" | "generate";

const F1_STARTS = gaussianPairs(7, 14).map((g) => [g[0] * 0.9, g[1] * 0.9] as V2);

function field951(kind: Field951, x: V2, t: number): V2 {
  if (kind === "contract") return [-1.6 * x[0], -1.6 * x[1]];
  if (kind === "swirl") return [-1.1 * x[0] - 1.8 * x[1], 1.8 * x[0] - 1.1 * x[1]];
  return marginalField(x, t, DATA);
}

export function RbFlowField() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [kind, setKind] = useState<Field951>("generate");
  const [steps, setSteps] = useState(48);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);

  useRafLoop((dt) => setT((v) => (v + dt * 0.22 > 1 ? 0 : v + dt * 0.22)), {
    playing: playing && inView && !reduced,
  });
  const tv = reduced ? 0.72 : t;

  const CX = 390;
  const CY = 238;
  const S = 128;
  const toPx = (p: V2): V2 => [CX + p[0] * S, CY - p[1] * S];

  // full Euler paths, then truncated to the shared clock tv
  const paths = useMemo(
    () =>
      F1_STARTS.map((x0) => {
        const h = TMAX / steps;
        let x: V2 = x0;
        const path: V2[] = [x];
        for (let i = 0; i < steps; i++) {
          const u = field951(kind, x, i * h);
          x = [clamp(x[0] + h * u[0], -1.6, 1.6), clamp(x[1] + h * u[1], -1.6, 1.6)];
          path.push(x);
        }
        return path;
      }),
    [kind, steps],
  );
  const k = Math.min(Math.floor(tv * steps), steps);
  const landErr =
    kind === "generate"
      ? paths.reduce((a, p) => a + distToData(p[p.length - 1], DATA), 0) / paths.length
      : 0;

  // arrow grid of the field at the current time
  const arrows = useMemo(() => {
    const out: { a: V2; b: V2 }[] = [];
    for (let gx = -1.25; gx <= 1.26; gx += 0.31) {
      for (let gy = -1.25; gy <= 1.26; gy += 0.31) {
        const u = field951(kind, [gx, gy], tv * TMAX);
        const m = Math.hypot(u[0], u[1]) || 1;
        const L = 0.11 * Math.min(m, 2.4) / m;
        out.push({ a: [gx, gy], b: [gx + u[0] * L, gy + u[1] * L] });
      }
    }
    return out;
  }, [kind, tv]);

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.1 · A vector field is a machine that moves points"
      ariaLabel={`A 2D vector field with particles following it by Euler integration, at time ${tv.toFixed(2)} with ${steps} steps`}
      controls={
        <>
          <Tabs
            options={[
              { id: "contract", label: "pull to center" },
              { id: "swirl", label: "swirl" },
              { id: "generate", label: "noise to data" },
            ]}
            value={kind}
            onChange={(v) => {
              setKind(v);
              setT(0);
            }}
          />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onReset={() => {
              setT(0);
              setPlaying(true);
            }}
          />
          <Slider label="euler steps" min={4} max={96} step={4} value={steps} onChange={setSteps} />
        </>
      }
    >
      {/* field arrows */}
      {arrows.map((ar, i) => {
        const a = toPx(ar.a);
        const b = toPx(ar.b);
        return (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={R.world} strokeWidth={1.3} opacity={0.55} />
        );
      })}
      {/* data points for the generate tab */}
      {kind === "generate" &&
        DATA.map((z, i) => {
          const p = toPx(z);
          return <circle key={i} cx={p[0]} cy={p[1]} r={6} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />;
        })}
      {/* particle trails + heads */}
      {paths.map((path, i) => {
        const seen = path.slice(0, k + 1).map(toPx);
        const head = seen[seen.length - 1];
        return (
          <g key={i}>
            <polyline
              points={seen.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
              fill="none"
              stroke={R.signal}
              strokeWidth={1.6}
              opacity={0.5}
            />
            <circle cx={head[0]} cy={head[1]} r={4.5} fill={R.signal} />
          </g>
        );
      })}
      <Readout
        rows={[
          { label: "time t", value: tv.toFixed(2), color: R.ink },
          { label: "euler steps", value: String(steps), color: R.ink },
          ...(kind === "generate"
            ? [{ label: "landing err", value: landErr.toFixed(3), color: landErr < 0.1 ? R.goal : R.plan }]
            : []),
        ]}
      />
      <Legend
        items={[
          { color: R.world, label: "vector field u" },
          { color: R.signal, label: "particles" },
          ...(kind === "generate" ? [{ color: R.goal, label: "data points" }] : []),
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {kind === "generate"
          ? "the exact noise-to-data field: fewer Euler steps means a sloppier landing, try 4 vs 96"
          : "each particle just follows the arrows: that is all an ODE trajectory is"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.5.2 · Turning the noise knob: from ODE to SDE  (RbSdeNoise)
// An Ornstein-Uhlenbeck process in 1D, drawn as x versus time. sigma = 0 is
// a smooth deterministic flow; raising sigma adds Brownian jitter. Endpoint
// spread is measured and compared with the theoretical stationary std.
// ===========================================================================

const THETA_OU = 2.0;

export function RbSdeNoise() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [sigma, setSigma] = useState(0.6);
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);

  useRafLoop((dt) => setT((v) => (v + dt * 0.3 >= 1 ? 1 : v + dt * 0.3)), {
    playing: playing && inView && !reduced && t < 1,
  });
  const tv = reduced ? 1 : t;

  const N = 12;
  const STEPS = 160;
  const T_END = 2.2;
  const paths = useMemo(() => {
    const h = T_END / STEPS;
    return Array.from({ length: N }, (_, i) => {
      const rng = mulberry32(101 + i);
      const gauss = () => {
        const u1 = Math.max(rng(), 1e-9);
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng());
      };
      let x = -2.6 + (5.2 * i) / (N - 1);
      const p: number[] = [x];
      for (let s = 0; s < STEPS; s++) {
        x = x + h * (-THETA_OU * x) + sigma * Math.sqrt(h) * gauss();
        p.push(x);
      }
      return p;
    });
  }, [sigma]);

  const k = Math.max(1, Math.floor(tv * STEPS));
  const ends = paths.map((p) => p[k]);
  const mean = ends.reduce((a, b) => a + b, 0) / N;
  const std = Math.sqrt(ends.reduce((a, b) => a + (b - mean) ** 2, 0) / N);
  const theory = sigma / Math.sqrt(2 * THETA_OU);

  const X0 = 70;
  const X1 = 690;
  const Y0 = 60;
  const Y1 = 400;
  const px = (s: number) => X0 + ((X1 - X0) * s) / STEPS;
  const py = (v: number) => Y0 + ((Y1 - Y0) * (3 - v)) / 6;

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.2 · Turning the noise knob: from ODE to SDE"
      ariaLabel={`Twelve Ornstein-Uhlenbeck trajectories with diffusion coefficient ${sigma.toFixed(2)}`}
      controls={
        <>
          <Slider label="σ (noise)" min={0} max={1.5} step={0.05} value={sigma} onChange={setSigma} fmt={(v) => v.toFixed(2)} />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onReset={() => {
              setT(0);
              setPlaying(true);
            }}
          />
          <Btn onClick={() => setSigma(0)}>σ = 0 (pure ODE)</Btn>
        </>
      }
    >
      <line x1={X0} y1={py(0)} x2={X1} y2={py(0)} stroke={R.line} strokeWidth={1.2} />
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={R.line} strokeWidth={1.2} />
      <text x={X1 - 4} y={py(0) - 8} textAnchor="end" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        time
      </text>
      <text x={X0 + 6} y={Y0 + 12} fontFamily={MONO} fontSize={11.5} fill={R.world}>
        x
      </text>
      {paths.map((p, i) => (
        <polyline
          key={i}
          points={p
            .slice(0, k + 1)
            .map((v, s) => `${px(s).toFixed(1)},${py(clamp(v, -3, 3)).toFixed(1)}`)
            .join(" ")}
          fill="none"
          stroke={sigma === 0 ? R.signal : R.plan}
          strokeWidth={1.6}
          opacity={0.75}
        />
      ))}
      <Readout
        rows={[
          { label: "σ", value: sigma.toFixed(2), color: sigma === 0 ? R.signal : R.plan },
          { label: "spread (measured)", value: std.toFixed(2), color: R.ink },
          { label: "spread (theory)", value: theory.toFixed(2), color: R.world },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "σ = 0: deterministic" },
          { color: R.plan, label: "σ > 0: stochastic" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        same drift toward zero every time; the only difference is how much Brownian noise you pour in
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.5.3 · The probability path: one point versus the whole dataset
// (RbProbPath) Left panel: the conditional path collapsing onto ONE chosen
// data point z. Right panel: the marginal path morphing noise into the whole
// dataset. Both clouds are exact samples x = t z + (1 - t) eps.
// ===========================================================================

const EPS_CLOUD = gaussianPairs(31, 260);
const Z_PICK = EPS_CLOUD.map((_, i) => i % DATA.length); // seeded z per sample

export function RbProbPath() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [t, setT] = useState(0.5);
  const [zi, setZi] = useState(2);
  const [playing, setPlaying] = useState(false);

  useRafLoop((dt) => setT((v) => (v + dt * 0.25 >= 1 ? 1 : v + dt * 0.25)), {
    playing: playing && inView && !reduced && t < 1,
  });
  const tv = reduced ? 0.75 : t;

  const S = 88;
  const panel = (cx: number, cy: number, pick: (i: number) => V2, tint: string) =>
    EPS_CLOUD.map((e, i) => {
      const z = pick(i);
      const x: V2 = [tv * z[0] + (1 - tv) * e[0] * 0.9, tv * z[1] + (1 - tv) * e[1] * 0.9];
      return (
        <circle
          key={i}
          cx={cx + clamp(x[0], -1.5, 1.5) * S}
          cy={cy - clamp(x[1], -1.5, 1.5) * S}
          r={2.4}
          fill={tint}
          opacity={0.6}
        />
      );
    });

  const LCX = 195;
  const RCX = 535;
  const CY = 258;

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.3 · The probability path: one point versus the whole dataset"
      ariaLabel={`Conditional and marginal probability paths at interpolation time ${tv.toFixed(2)}`}
      controls={
        <>
          <Slider label="t" min={0} max={1} step={0.01} value={t} onChange={setT} fmt={(v) => v.toFixed(2)} />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onReset={() => {
              setT(0);
              setPlaying(false);
            }}
          />
          <Btn onClick={() => setZi((v) => (v + 1) % DATA.length)}>next z</Btn>
        </>
      }
    >
      <line x1={365} y1={96} x2={365} y2={400} stroke={R.line} strokeWidth={1.2} strokeDasharray="4 6" />
      <text x={LCX} y={100} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.plan}>
        conditional path p_t(·|z)
      </text>
      <text x={RCX} y={100} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.signal}>
        marginal path p_t
      </text>

      {panel(LCX, CY, () => DATA[zi], R.plan)}
      {panel(RCX, CY, (i) => DATA[Z_PICK[i]], R.signal)}

      {/* the chosen z on the left; the full dataset on the right */}
      <circle cx={LCX + DATA[zi][0] * S} cy={CY - DATA[zi][1] * S} r={6.5} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
      {DATA.map((z, i) => (
        <circle key={i} cx={RCX + z[0] * S} cy={CY - z[1] * S} r={4.5} fill="none" stroke={R.goal} strokeWidth={2} />
      ))}

      <Readout
        rows={[
          { label: "t", value: tv.toFixed(2), color: R.ink },
          { label: "α_t = t", value: tv.toFixed(2), color: R.goal },
          { label: "β_t = 1-t", value: (1 - tv).toFixed(2), color: R.plan },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "samples, one z" },
          { color: R.signal, label: "samples, all z" },
          { color: R.goal, label: "data point(s)" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        x = t·z + (1-t)·ε : at t=0 both panels are pure noise, at t=1 the left collapses to z, the right becomes the dataset
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.5.4 · Train it yourself: SGD on the conditional flow matching loss
// (RbCfmTrain) A real model: u_theta is a linear combination of 5x5 spatial
// RBFs x 3 time bins (150 parameters). Every train step samples a seeded
// batch (z, eps, t), forms x = t z + (1-t) eps, and does one SGD step on
// || u_theta(x,t) - (z - eps) ||^2. Loss falls, rollouts land on the data.
// ===========================================================================

const RBF_N = 5;
const RBF_T = 3;
const RBF_GAMMA = 3.2;
const N_BASIS = RBF_N * RBF_N * RBF_T;
const RBF_CENTERS: { x: number; y: number; t: number }[] = [];
for (let it = 0; it < RBF_T; it++)
  for (let iy = 0; iy < RBF_N; iy++)
    for (let ix = 0; ix < RBF_N; ix++)
      RBF_CENTERS.push({
        x: -1.2 + (2.4 * ix) / (RBF_N - 1),
        y: -1.2 + (2.4 * iy) / (RBF_N - 1),
        t: it / Math.max(RBF_T - 1, 1),
      });

function rbfFeatures(x: V2, t: number): Float64Array {
  const f = new Float64Array(N_BASIS);
  for (let i = 0; i < N_BASIS; i++) {
    const c = RBF_CENTERS[i];
    const d2 = (x[0] - c.x) ** 2 + (x[1] - c.y) ** 2 + 2.2 * (t - c.t) ** 2;
    f[i] = Math.exp(-RBF_GAMMA * d2);
  }
  return f;
}

function modelField(params: Float64Array, x: V2, t: number): V2 {
  const f = rbfFeatures(x, t);
  let ux = 0;
  let uy = 0;
  for (let i = 0; i < N_BASIS; i++) {
    ux += params[i] * f[i];
    uy += params[N_BASIS + i] * f[i];
  }
  return [ux, uy];
}

export function RbCfmTrain() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [lr, setLr] = useState(0.5);
  const [training, setTraining] = useState(false);
  // Snapshot state drives rendering; the live params/rng live in refs and are
  // only mutated inside the training loop callback, never during render.
  const [snap, setSnap] = useState<{ step: number; loss: number; params: Float64Array; hist: number[] }>(() => ({
    step: 0,
    loss: NaN,
    params: new Float64Array(2 * N_BASIS),
    hist: [],
  }));
  const paramsRef = useRef<Float64Array | null>(null);
  const stepRef = useRef(0);
  const rngRef = useRef<() => number>(mulberry32(55));
  const histRef = useRef<number[]>([]);

  const doSteps = (count: number) => {
    if (!paramsRef.current) paramsRef.current = new Float64Array(2 * N_BASIS);
    const P = paramsRef.current;
    const rng = rngRef.current;
    const gauss = () => {
      const u1 = Math.max(rng(), 1e-9);
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng());
    };
    let lastLoss = 0;
    const B = 24;
    for (let s = 0; s < count; s++) {
      let loss = 0;
      const gx = new Float64Array(N_BASIS);
      const gy = new Float64Array(N_BASIS);
      for (let b = 0; b < B; b++) {
        const z = DATA[Math.floor(rng() * DATA.length)];
        const e: V2 = [gauss() * 0.9, gauss() * 0.9];
        const t = rng();
        const x: V2 = [t * z[0] + (1 - t) * e[0], t * z[1] + (1 - t) * e[1]];
        const target: V2 = [z[0] - e[0], z[1] - e[1]];
        const f = rbfFeatures(x, t);
        let ux = 0;
        let uy = 0;
        for (let i = 0; i < N_BASIS; i++) {
          ux += P[i] * f[i];
          uy += P[N_BASIS + i] * f[i];
        }
        const rx = ux - target[0];
        const ry = uy - target[1];
        loss += rx * rx + ry * ry;
        for (let i = 0; i < N_BASIS; i++) {
          gx[i] += (2 * rx * f[i]) / B;
          gy[i] += (2 * ry * f[i]) / B;
        }
      }
      for (let i = 0; i < N_BASIS; i++) {
        P[i] -= lr * gx[i];
        P[N_BASIS + i] -= lr * gy[i];
      }
      lastLoss = loss / B;
      stepRef.current += 1;
      if (stepRef.current % 5 === 0) histRef.current.push(lastLoss);
      if (histRef.current.length > 120) histRef.current.shift();
    }
    setSnap({ step: stepRef.current, loss: lastLoss, params: Float64Array.from(P), hist: [...histRef.current] });
  };

  useRafLoop(() => doSteps(4), { playing: training && inView && !reduced });

  const reset = () => {
    paramsRef.current = new Float64Array(2 * N_BASIS);
    stepRef.current = 0;
    rngRef.current = mulberry32(55);
    histRef.current = [];
    setSnap({ step: 0, loss: NaN, params: new Float64Array(2 * N_BASIS), hist: [] });
    setTraining(false);
  };

  // rollouts through the CURRENT model field (24 seeded particles)
  const starts = useMemo(() => gaussianPairs(83, 20).map((g) => [g[0] * 0.9, g[1] * 0.9] as V2), []);
  const rollouts = useMemo(() => {
    const n = 40;
    const h = TMAX / n;
    return starts.map((x0) => {
      let x: V2 = x0;
      const p: V2[] = [x];
      for (let i = 0; i < n; i++) {
        const u = modelField(snap.params, x, i * h);
        x = [clamp(x[0] + h * u[0], -1.6, 1.6), clamp(x[1] + h * u[1], -1.6, 1.6)];
        p.push(x);
      }
      return p;
    });
  }, [snap.params, starts]);
  const evalErr = rollouts.reduce((a, p) => a + distToData(p[p.length - 1], DATA), 0) / rollouts.length;

  const CX = 262;
  const CY = 240;
  const S = 116;
  const toPx = (p: V2): V2 => [CX + p[0] * S, CY - p[1] * S];

  // loss chart lane, right side
  const LX0 = 468;
  const LX1 = 692;
  const LY0 = 130;
  const LY1 = 320;
  const hist = snap.hist;
  const maxL = Math.max(...hist, 4);

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.4 · Train it yourself: SGD on the conditional flow matching loss"
      ariaLabel={`A 150 parameter model trained by stochastic gradient descent on the conditional flow matching loss, at step ${snap.step}`}
      controls={
        <>
          <Btn onClick={() => setTraining((v) => !v)} active={training}>
            {training ? "⏸ pause training" : "▶ train"}
          </Btn>
          <Btn onClick={() => doSteps(1)}>⏭ one step</Btn>
          <Btn onClick={reset}>↺ reset weights</Btn>
          <Slider label="learning rate" min={0.05} max={1.2} step={0.05} value={lr} onChange={setLr} fmt={(v) => v.toFixed(2)} />
        </>
      }
    >
      {/* model field arrows at t = 0.5 */}
      {Array.from({ length: 7 }).flatMap((_, ix) =>
        Array.from({ length: 7 }).map((_, iy) => {
          const gx = -1.2 + (2.4 * ix) / 6;
          const gy = -1.2 + (2.4 * iy) / 6;
          const u = modelField(snap.params, [gx, gy], 0.5);
          const m = Math.hypot(u[0], u[1]) || 1;
          const L = (0.1 * Math.min(m, 2.5)) / m;
          const a = toPx([gx, gy]);
          const b = toPx([gx + u[0] * L, gy + u[1] * L]);
          return (
            <line key={`${ix}-${iy}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={R.world} strokeWidth={1.2} opacity={0.5} />
          );
        }),
      )}
      {DATA.map((z, i) => {
        const p = toPx(z);
        return <circle key={i} cx={p[0]} cy={p[1]} r={5.5} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />;
      })}
      {rollouts.map((p, i) => {
        const head = toPx(p[p.length - 1]);
        return (
          <g key={i}>
            <polyline
              points={p.map((q) => toPx(q)).map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ")}
              fill="none"
              stroke={R.signal}
              strokeWidth={1.3}
              opacity={0.4}
            />
            <circle cx={head[0]} cy={head[1]} r={3.6} fill={R.signal} />
          </g>
        );
      })}

      {/* loss chart */}
      <rect x={LX0 - 8} y={LY0 - 18} width={LX1 - LX0 + 16} height={LY1 - LY0 + 34} rx={8} fill="none" stroke={R.line} />
      <text x={LX0} y={LY0 - 26} fontFamily={MONO} fontSize={12} fill={R.world}>
        CFM loss per batch
      </text>
      {hist.length > 1 && (
        <polyline
          points={hist
            .map((l, i) => `${(LX0 + ((LX1 - LX0) * i) / (hist.length - 1)).toFixed(1)},${(LY1 - ((LY1 - LY0) * clamp(l, 0, maxL)) / maxL).toFixed(1)}`)
            .join(" ")}
          fill="none"
          stroke={R.error}
          strokeWidth={2}
        />
      )}

      <Readout
        rows={[
          { label: "sgd steps", value: String(snap.step), color: R.ink },
          { label: "batch loss", value: Number.isNaN(snap.loss) ? "…" : snap.loss.toFixed(2), color: R.error },
          { label: "landing err", value: evalErr.toFixed(3), color: evalErr < 0.15 ? R.goal : R.plan },
        ]}
      />
      <Legend
        items={[
          { color: R.world, label: "learned field u_θ" },
          { color: R.signal, label: "samples from u_θ" },
          { color: R.goal, label: "data" },
          { color: R.error, label: "loss" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {snap.step === 0
          ? "untrained: the field is zero and samples go nowhere. press train and watch the field organize"
          : "regressing on (z - ε) alone, never simulating during training, still teaches the full noise-to-data field"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.5.5 · One model, two samplers: ODE and SDE in 3D  (RbOdeVsSde3D)
// Space is horizontal, time rises vertically. Blue: deterministic ODE paths.
// Amber: SDE paths from the extension trick (same marginals, jagged routes).
// Both integrate the exact fields. Orbit to see the funnel.
// ===========================================================================

type Mode955 = "both" | "ode" | "sde";

export function RbOdeVsSde3D() {
  const { ref } = useStageVisibility();
  const orbit = useOrbit(-38, 22);
  const [mode, setMode] = useState<Mode955>("both");
  const [sigma, setSigma] = useState(0.9);
  const [nSteps, setNSteps] = useState(64);

  const starts = useMemo(() => gaussianPairs(17, 9).map((g) => [g[0] * 0.8, g[1] * 0.8] as V2), []);
  const odes = useMemo(() => starts.map((x0) => odePath(x0, nSteps, DATA)), [starts, nSteps]);
  const sdes = useMemo(
    () => starts.map((x0, i) => sdePath(x0, nSteps, sigma, DATA, 300 + i)),
    [starts, nSteps, sigma],
  );

  const pathLen = (p: V2[]) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  const meanLen = (ps: V2[][]) => ps.reduce((a, p) => a + pathLen(p), 0) / ps.length;
  const meanErr = (ps: V2[][]) => ps.reduce((a, p) => a + distToData(p[p.length - 1], DATA), 0) / ps.length;

  const SC = 0.72; // world scale for the xy plane
  const H = 1.7; // world height of the time axis
  const lift = (p: V2, i: number, n: number): V3 => [p[0] * SC, p[1] * SC, (H * i) / n];

  const prims: Prim3D[] = [
    // time axis + floor/ceiling reference rings
    seg3([0, 0, 0], [0, 0, H + 0.15], R.world, { width: 1.5, dash: "4 4" }),
    label3([0, 0, H + 0.22], "t = 1 (data)", R.world, { anchor: "middle", dy: -4, size: 12 }),
    label3([1.05, 0, 0], "t = 0 (noise)", R.world, { size: 12, dx: 6 }),
    // noise cloud on the floor
    ...starts.map((s): Prim3D => dot3([s[0] * SC, s[1] * SC, 0], R.world, { r: 3 })),
    // data points on the ceiling
    ...DATA.map((z): Prim3D => dot3([z[0] * SC, z[1] * SC, H], R.goal, { r: 4.5 })),
    ...(mode !== "sde"
      ? odes.flatMap((p) =>
          curve3((u) => lift(p[Math.round(u * (p.length - 1))], Math.round(u * (p.length - 1)), p.length - 1), R.signal, {
            n: 42,
            width: 1.8,
          }),
        )
      : []),
    ...(mode !== "ode"
      ? sdes.flatMap((p) =>
          curve3((u) => lift(p[Math.round(u * (p.length - 1))], Math.round(u * (p.length - 1)), p.length - 1), R.plan, {
            n: Math.min(nSteps, 96),
            width: 1.4,
            opacity: 0.85,
          }),
        )
      : []),
  ];

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 4.6, zoom: 138, target: [0, 0, 0.85] };

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.5 · One model, two samplers: ODE and SDE in 3D"
      ariaLabel={`Noise-to-data trajectories rising through time in 3D, deterministic ODE versus stochastic SDE with sigma ${sigma.toFixed(1)}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Tabs
            options={[
              { id: "both", label: "both" },
              { id: "ode", label: "ODE only" },
              { id: "sde", label: "SDE only" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Slider label="σ" min={0.2} max={1.8} step={0.1} value={sigma} onChange={setSigma} fmt={(v) => v.toFixed(1)} />
          <Slider label="steps" min={16} max={128} step={16} value={nSteps} onChange={setNSteps} />
          <Btn onClick={orbit.reset}>↺ view</Btn>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "ODE path len", value: meanLen(odes).toFixed(2), color: R.signal },
          { label: "SDE path len", value: meanLen(sdes).toFixed(2), color: R.plan },
          { label: "landing err", value: `${meanErr(odes).toFixed(2)} / ${meanErr(sdes).toFixed(2)}`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "ODE (flow)" },
          { color: R.plan, label: "SDE (diffusion)" },
          { color: R.goal, label: "data, at t = 1" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        same start, same marginals, same destination: the SDE just takes the scenic, jagged route. drag to orbit
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.5.11 · The action chunk: why a robot is sure about now and vague
// about later  (RbActionChunkDenoise)
//
// This is the whole chapter pointed at a robot. The "object" being generated
// is an entire action chunk: H = 50 future waypoints, so the sample lives in
// R^100 and the exact CondOT marginal field applies unchanged (the posterior
// over demo chunks is still a softmax of Gaussians, just in 100 dimensions).
//
// The demonstration set is built the way real demo data actually behaves: the
// current observation pins down the immediate action, so every demo agrees at
// h = 0, while the far future depends on choices nobody has made yet, so the
// demos fan into three modes. Nothing about the decay below is drawn by hand.
// We integrate the real ODE from seeded noise and MEASURE the spread across
// seeds at each horizon index. Verified offline: dispersion climbs from 0.016
// at h = 0 to 0.256 at h = 49, a ~16x growth, and all three modes get hit.
//
// The effect is a toy reproduction of a real measurement: Abhinav Jha's
// "Visualizing Flow Matching in Robotics" (2026) ran PCA on pi0.5's actual
// denoising trajectories on Mobile ALOHA and found the same shape, with
// dispersion 0.27 at h = 0 rising to 1.77 at h = 49.
// ===========================================================================

const CHUNK_H = 50;
const CHUNK_D = CHUNK_H * 2;
const CHUNK_MODES = [0.62, 0.0, -0.62];

// One demonstration chunk, flattened to [x0,y0,x1,y1,...]. Divergence ramps
// in only after ~a third of the horizon: agreement now, disagreement later.
function demoChunk(mode: number, seed: number): Float64Array {
  const rng = mulberry32(seed);
  const amp = CHUNK_MODES[mode];
  const out = new Float64Array(CHUNK_D);
  for (let i = 0; i < CHUNK_H; i++) {
    const s = i / (CHUNK_H - 1);
    const g = s < 0.32 ? 0 : (s - 0.32) / 0.68;
    const jit = (rng() - 0.5) * 0.05 * (0.15 + g);
    out[2 * i] = -1.05 + 2.1 * s;
    out[2 * i + 1] = amp * g * g + jit;
  }
  return out;
}
const CHUNK_DATA: Float64Array[] = (() => {
  const out: Float64Array[] = [];
  for (let m = 0; m < 3; m++) for (let k = 0; k < 2; k++) out.push(demoChunk(m, 991 + m * 7 + k));
  return out;
})();

// Exact CondOT marginal field in R^100, same formula as the 2D figures.
function chunkPosteriorMean(x: Float64Array, t: number): Float64Array {
  const b = Math.max(1 - t, 0.015);
  const inv = 1 / (2 * b * b);
  const logs = CHUNK_DATA.map((z) => {
    let s = 0;
    for (let i = 0; i < CHUNK_D; i++) {
      const d = x[i] - t * z[i];
      s += d * d;
    }
    return -s * inv;
  });
  const best = Math.max(...logs);
  const ws = logs.map((l) => Math.exp(l - best));
  const sum = ws.reduce((a, c) => a + c, 0);
  const ex = new Float64Array(CHUNK_D);
  ws.forEach((w, k) => {
    const p = w / sum;
    const z = CHUNK_DATA[k];
    for (let i = 0; i < CHUNK_D; i++) ex[i] += p * z[i];
  });
  return ex;
}

// Integrate one chunk from seeded noise, recording every intermediate state
// so the reader can scrub the generation instead of only seeing the answer.
function chunkTrajectory(seed: number, nSteps: number): Float64Array[] {
  const rng = mulberry32(seed);
  const gauss = () => {
    const u1 = Math.max(rng(), 1e-9);
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng());
  };
  let x = new Float64Array(CHUNK_D);
  for (let i = 0; i < CHUNK_D; i++) x[i] = gauss() * 0.9;
  const frames: Float64Array[] = [Float64Array.from(x)];
  const h = TMAX / nSteps;
  for (let s = 0; s < nSteps; s++) {
    const t = s * h;
    const b = Math.max(1 - t, 0.015);
    const ex = chunkPosteriorMean(x, t);
    const nx = new Float64Array(CHUNK_D);
    for (let i = 0; i < CHUNK_D; i++) nx[i] = x[i] + h * ((ex[i] - x[i]) / b);
    x = nx;
    frames.push(Float64Array.from(x));
  }
  return frames;
}

export function RbActionChunkDenoise() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [nSteps, setNSteps] = useState(32);
  const [batch, setBatch] = useState(0);
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);

  useRafLoop((dt) => setT((v) => (v + dt * 0.32 >= 1 ? 1 : v + dt * 0.32)), {
    playing: playing && inView && !reduced && t < 1,
  });
  const tv = reduced ? 1 : t;

  const N_SAMP = 12;
  const runs = useMemo(
    () => Array.from({ length: N_SAMP }, (_, i) => chunkTrajectory(4000 + batch * 977 + i * 13, nSteps)),
    [nSteps, batch],
  );
  const k = Math.min(Math.round(tv * nSteps), nSteps);
  const now = useMemo(() => runs.map((r) => r[k]), [runs, k]);

  // measured dispersion across seeds at each horizon index
  const disp = useMemo(
    () =>
      Array.from({ length: CHUNK_H }, (_, h) => {
        let cx = 0;
        let cy = 0;
        for (const s of now) {
          cx += s[2 * h];
          cy += s[2 * h + 1];
        }
        cx /= N_SAMP;
        cy /= N_SAMP;
        let d = 0;
        for (const s of now) d += Math.hypot(s[2 * h] - cx, s[2 * h + 1] - cy);
        return d / N_SAMP;
      }),
    [now],
  );
  const d0 = disp[0];
  const dEnd = disp[CHUNK_H - 1];
  const ratio = dEnd / Math.max(d0, 1e-6);

  // which modes did the batch actually commit to? (nearest demo at the end)
  const modesHit = useMemo(() => {
    const hit = new Set<number>();
    for (const s of now) {
      let bi = 0;
      let bd = Infinity;
      CHUNK_DATA.forEach((z, idx) => {
        let d = 0;
        for (let i = 0; i < CHUNK_D; i++) d += (s[i] - z[i]) ** 2;
        if (d < bd) {
          bd = d;
          bi = idx;
        }
      });
      hit.add(Math.floor(bi / 2));
    }
    return hit.size;
  }, [now]);

  // left panel: workspace. right panel: measured dispersion vs horizon.
  const LX = 232;
  const LY = 250;
  const LS = 86;
  const wp = (x: number, y: number): [number, number] => [LX + clamp(x, -2, 2) * LS, LY - clamp(y, -1.7, 1.7) * LS];

  const RX0 = 470;
  const RX1 = 694;
  const RY0 = 150;
  const RY1 = 330;
  const dMax = Math.max(...disp, 0.05);
  const dp = (h: number, v: number): [number, number] => [
    RX0 + ((RX1 - RX0) * h) / (CHUNK_H - 1),
    RY1 - ((RY1 - RY0) * v) / dMax,
  ];

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.11 · The action chunk: certain about now, vague about later"
      ariaLabel={`Twelve action chunks of fifty waypoints generated by flow matching, with measured dispersion growing from ${d0.toFixed(3)} at the immediate step to ${dEnd.toFixed(3)} fifty steps out`}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onReset={() => {
              setT(0);
              setPlaying(true);
            }}
          />
          <Slider label="t" min={0} max={1} step={0.02} value={t} onChange={setT} fmt={(v) => v.toFixed(2)} />
          <Slider label="ODE steps" min={4} max={64} step={4} value={nSteps} onChange={setNSteps} />
          <Btn onClick={() => setBatch((b) => b + 1)}>↻ resample noise</Btn>
        </>
      }
    >
      {/* demo chunks, faint: the distribution the model learned */}
      {CHUNK_DATA.map((z, i) => (
        <polyline
          key={`d${i}`}
          points={Array.from({ length: CHUNK_H }, (_, h) => wp(z[2 * h], z[2 * h + 1]).join(",")).join(" ")}
          fill="none"
          stroke={R.goal}
          strokeWidth={2}
          opacity={0.28}
        />
      ))}
      {/* generated chunks */}
      {now.map((s, i) => (
        <polyline
          key={`s${i}`}
          points={Array.from({ length: CHUNK_H }, (_, h) => wp(s[2 * h], s[2 * h + 1]).join(",")).join(" ")}
          fill="none"
          stroke={R.signal}
          strokeWidth={1.5}
          opacity={0.75}
        />
      ))}
      {/* h = 0 and h = 49 markers, the two ends of the story */}
      {now.map((s, i) => {
        const a = wp(s[0], s[1]);
        const b = wp(s[2 * (CHUNK_H - 1)], s[2 * (CHUNK_H - 1) + 1]);
        return (
          <g key={`m${i}`}>
            <circle cx={a[0]} cy={a[1]} r={2.6} fill={R.plan} />
            <circle cx={b[0]} cy={b[1]} r={2.6} fill={R.error} />
          </g>
        );
      })}
      <text x={LX} y={104} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={R.world}>
        action chunk in the workspace (50 waypoints)
      </text>
      <text x={40} y={396} fontFamily={MONO} fontSize={11.5} fill={R.plan}>
        ● h = 0 (act now)
      </text>
      <text x={40} y={412} fontFamily={MONO} fontSize={11.5} fill={R.error}>
        ● h = 49 (2 s out)
      </text>

      {/* right panel: the measured decay curve */}
      <rect x={RX0 - 10} y={RY0 - 26} width={RX1 - RX0 + 22} height={RY1 - RY0 + 52} rx={8} fill="none" stroke={R.line} />
      <text x={RX0 - 6} y={RY0 - 34} fontFamily={MONO} fontSize={12} fill={R.world}>
        measured spread across seeds
      </text>
      <line x1={RX0} y1={RY1} x2={RX1} y2={RY1} stroke={R.line} strokeWidth={1.2} />
      <line x1={RX0} y1={RY0} x2={RX0} y2={RY1} stroke={R.line} strokeWidth={1.2} />
      <polyline
        points={disp.map((v, h) => dp(h, v).join(",")).join(" ")}
        fill="none"
        stroke={R.error}
        strokeWidth={2.4}
      />
      <circle cx={dp(0, disp[0])[0]} cy={dp(0, disp[0])[1]} r={4} fill={R.plan} />
      <circle cx={dp(CHUNK_H - 1, dEnd)[0]} cy={dp(CHUNK_H - 1, dEnd)[1]} r={4} fill={R.error} />
      <text x={RX0} y={RY1 + 16} fontFamily={MONO} fontSize={11} fill={R.world}>
        h = 0
      </text>
      <text x={RX1} y={RY1 + 16} textAnchor="end" fontFamily={MONO} fontSize={11} fill={R.world}>
        h = 49
      </text>
      <text x={RX0 - 6} y={RY0 - 8} fontFamily={MONO} fontSize={10.5} fill={R.world}>
        spread
      </text>

      <Readout
        rows={[
          { label: "t", value: tv.toFixed(2), color: R.ink },
          { label: "spread @ h=0", value: d0.toFixed(3), color: R.plan },
          { label: "spread @ h=49", value: dEnd.toFixed(3), color: R.error },
          { label: "growth", value: `${ratio.toFixed(1)}×`, color: ratio > 3 ? R.error : R.ink },
          { label: "modes hit", value: `${modesHit}/3`, color: modesHit === 3 ? R.goal : R.plan },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "demonstrations" },
          { color: R.signal, label: "generated chunks" },
          { color: R.error, label: "spread / far future" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {tv < 0.25
          ? "t ≈ 0: the chunk is pure noise, a scribble with no plan in it yet"
          : `the model commits to the next action (spread ${d0.toFixed(3)}) long before it commits to the 50th (${dEnd.toFixed(3)}, ${ratio.toFixed(0)}× wider)`}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.5.6 · Classifier-free guidance: the prompt volume knob (RbCfgGuidance)
// Two labeled clusters. The guided field is the exact CFG combination
// (1 - w) u(x|∅) + w u(x|y), integrated for real. Adherence and diversity
// are measured from the endpoints, so the w tradeoff is data, not a claim.
// ===========================================================================

export function RbCfgGuidance() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [w, setW] = useState(1);
  const [cls, setCls] = useState<"A" | "B">("A");
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);

  useRafLoop((dt) => setT((v) => (v + dt * 0.3 >= 1 ? 1 : v + dt * 0.3)), {
    playing: playing && inView && !reduced && t < 1,
  });
  const tv = reduced ? 1 : t;

  const target = cls === "A" ? CLASS_A : CLASS_B;
  const N = 40;
  const STEPS = 56;
  const starts = useMemo(() => gaussianPairs(59, N).map((g) => [g[0] * 0.85, g[1] * 0.85] as V2), []);
  const paths = useMemo(() => {
    const h = TMAX / STEPS;
    return starts.map((x0) => {
      let x: V2 = x0;
      const p: V2[] = [x];
      for (let i = 0; i < STEPS; i++) {
        const time = i * h;
        const uU = marginalField(x, time, ALL_AB);
        const uG = marginalField(x, time, target);
        x = [
          clamp(x[0] + h * ((1 - w) * uU[0] + w * uG[0]), -1.7, 1.7),
          clamp(x[1] + h * ((1 - w) * uU[1] + w * uG[1]), -1.7, 1.7),
        ];
        p.push(x);
      }
      return p;
    });
  }, [starts, w, target]);

  const k = Math.max(1, Math.floor(tv * STEPS));
  const finals = paths.map((p) => p[p.length - 1]);
  const adhere = finals.filter((e) => distToData(e, target) < distToData(e, cls === "A" ? CLASS_B : CLASS_A)).length / N;
  const centroid: V2 = [finals.reduce((a, e) => a + e[0], 0) / N, finals.reduce((a, e) => a + e[1], 0) / N];
  const spread = finals.reduce((a, e) => a + Math.hypot(e[0] - centroid[0], e[1] - centroid[1]), 0) / N;

  const CX = 390;
  const CY = 240;
  const S = 122;
  const toPx = (p: V2): V2 => [CX + p[0] * S, CY - p[1] * S];

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.6 · Classifier-free guidance: the prompt volume knob"
      ariaLabel={`Guided sampling toward class ${cls} with guidance scale ${w.toFixed(1)}; adherence ${(adhere * 100).toFixed(0)} percent`}
      controls={
        <>
          <Tabs
            options={[
              { id: "A", label: "prompt: class A" },
              { id: "B", label: "prompt: class B" },
            ]}
            value={cls}
            onChange={(v) => {
              setCls(v);
              setT(reduced ? 1 : 0);
              setPlaying(!reduced);
            }}
          />
          <Slider label="guidance w" min={0} max={6} step={0.25} value={w} onChange={setW} fmt={(v) => v.toFixed(2)} />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onReset={() => {
              setT(0);
              setPlaying(true);
            }}
          />
        </>
      }
    >
      {CLASS_A.map((z, i) => {
        const p = toPx(z);
        return <rect key={`a${i}`} x={p[0] - 5} y={p[1] - 5} width={10} height={10} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.2} />;
      })}
      {CLASS_B.map((z, i) => {
        const p = toPx(z);
        return <circle key={`b${i}`} cx={p[0]} cy={p[1]} r={5.5} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.2} />;
      })}
      {paths.map((p, i) => {
        const seen = p.slice(0, k + 1).map(toPx);
        const head = seen[seen.length - 1];
        return (
          <g key={i}>
            <polyline
              points={seen.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ")}
              fill="none"
              stroke={R.world}
              strokeWidth={1}
              opacity={0.35}
            />
            <circle cx={head[0]} cy={head[1]} r={3.4} fill={cls === "A" ? R.plan : R.signal} />
          </g>
        );
      })}
      <Readout
        rows={[
          { label: "guidance w", value: w.toFixed(2), color: R.ink },
          { label: "fits prompt", value: `${Math.round(adhere * 100)}%`, color: adhere > 0.9 ? R.goal : R.plan },
          { label: "diversity", value: spread.toFixed(2), color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "class A (squares)" },
          { color: R.signal, label: "class B (circles)" },
          { color: R.world, label: "sample paths" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {w === 0
          ? "w = 0 ignores the prompt entirely: unconditional samples fall on both classes"
          : w <= 1.25
            ? "w = 1 is vanilla conditioning; nudge w higher and watch adherence climb while diversity shrinks"
            : "high w: nearly every sample obeys the prompt, but they crowd together. that is the CFG tradeoff"}
      </text>
    </Stage>
  );
}
