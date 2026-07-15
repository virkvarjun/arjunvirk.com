"use client";

import { useMemo, useState } from "react";
import {
  R,
  MONO,
  Btn,
  Slider,
  Tabs,
  Stage,
  svgArrow,
  useRafLoop,
  usePrefersReducedMotion,
  useStageVisibility,
  clamp,
  mulberry32,
  Legend,
  Readout,
  Transport,
} from "./shared";

// ===========================================================================
// Chapter 9.5 · Flow Matching & Diffusion Models — the VLA payoff figures.
//
// Fig 9.5.9 runs the DISCRETE dialect of the same recipe (Holderrieth &
// Erives, arXiv 2506.02070 §7): a factorized masked-diffusion mixture path,
// its marginal rate matrix, and the parallel per-token Euler sampler of
// Algorithm 7. There is no velocity field here, only jump rates.
//
// Fig 9.5.10 assembles the chapter into a π0-style policy: a VLM backbone
// produces conditioning y, and an action expert integrates the EXACT marginal
// CondOT field over a seeded set of demonstration action chunks (the same
// posterior-softmax-over-data-points trick as ch9p5.tsx, lifted from R^2 to
// R^(50x32)). Nothing is faked: the ODE really runs in 1600 dimensions and
// the zero-padded dims really get integrated down to zero.
// ===========================================================================

// ===========================================================================
// Fig 9.5.9 · Discrete diffusion: generation by unmasking  (RbDiscreteDiffusion)
// ===========================================================================

const MASK = -1;
const D_TOK = 8; // sequence length d
const N_CAND = 4; // candidate tokens per slot
const N_SIM = 48; // Euler steps for the CTMC sampler

// The target sentence z: eight robot-flavored tokens.
const SENTENCE = ["pick", "up", "the", "pan", "and", "rinse", "it", "off"];

// Plausible distractors per slot, so the posterior p_{1|t} has somewhere to be
// wrong. Index 0 of each slot's vocabulary is always the true token z_j.
const DISTRACTORS: string[][] = [
  ["grab", "lift", "hold"],
  ["out", "off", "in"],
  ["a", "that", "this"],
  ["pot", "cup", "bowl"],
  ["then", "to", "or"],
  ["wash", "scrub", "dry"],
  ["them", "that", "one"],
  ["out", "now", "up"],
];

const CANDS: string[][] = SENTENCE.map((w, j) => [w, ...DISTRACTORS[j]]);

// Fixed seeded logit noise, so a given (t, scheduler) always shows the same
// numbers. The true token gets a context bonus on top (see posteriorAt).
const BASE_LOGITS: number[][] = (() => {
  const rng = mulberry32(9509);
  return CANDS.map((c) => c.map(() => rng() * 1.2));
})();

const P_BASE = 2.4; // true-token logit with zero context revealed
const P_CTX = 2.8; // extra true-token logit once all context is revealed

type Sched = "linear" | "late" | "cosine";

// The scheduler kappa_t: the probability that any given position is already
// unmasked at time t. kappa_0 = 0 (all [MASK]), kappa_1 = 1 (full sentence).
const kappa = (s: Sched, t: number) =>
  s === "linear" ? t : s === "late" ? t * t : 1 - Math.cos((Math.PI * t) / 2);

const kappaDot = (s: Sched, t: number) =>
  s === "linear" ? 1 : s === "late" ? 2 * t : (Math.PI / 2) * Math.sin((Math.PI * t) / 2);

// The scalar out front of the marginal rate matrix:
//   Q_t(v_i, j | x) = [kappa_dot_t / (1 - kappa_t)] * (p_{1|t}(z_j = v_i | x) - delta_{x_j}(v_i))
// It explodes as t -> 1: less and less time left to reveal what remains.
const rateFactor = (s: Sched, t: number) => kappaDot(s, t) / Math.max(1 - kappa(s, t), 1e-6);

// The toy denoiser p_{1|t}(. | x), one softmax per position.
//  - An already-unmasked position is a delta on its own token (masked diffusion
//    never re-masks), so p - delta = 0 and its jump rate is exactly zero.
//  - A masked position gets a softmax whose true-token logit grows with how
//    much context has already been revealed, so a slot that waits its turn is
//    decided more sharply. (Note this does NOT make the t^2 scheduler more
//    accurate: kappa_t only reparametrizes time, it does not change the reveal
//    order, and measured error rates across the three schedulers match.)
function posteriorAt(x: number[]): number[][] {
  const nUnmasked = x.reduce((a, v) => a + (v === MASK ? 0 : 1), 0);
  return x.map((v, j) => {
    if (v !== MASK) return CANDS[j].map((_, i) => (i === v ? 1 : 0));
    const ctx = nUnmasked / (D_TOK - 1); // v is masked, so this counts the others
    const logits = BASE_LOGITS[j].map((b, i) => b + (i === 0 ? P_BASE + P_CTX * ctx : 0));
    let best = -Infinity;
    for (const l of logits) if (l > best) best = l;
    const es = logits.map((l) => Math.exp(l - best));
    const sum = es.reduce((a, b) => a + b, 0);
    return es.map((e) => e / sum);
  });
}

// Algorithm 7: parallel per-token Euler. At each step every masked position
// independently jumps with probability h * Q, choosing its new token from the
// posterior. States are memoized so the t slider scrubs one real trajectory.
// Seeded so the default view (linear, t = 0.62) shows a real failure mode: the
// sampler commits slot 1 to "lift" early, and masked diffusion never re-masks,
// so the error is permanent. That is the honest cost of parallel decoding.
function simulate(s: Sched): number[][] {
  const rng = mulberry32(34);
  const states: number[][] = [];
  let x = new Array<number>(D_TOK).fill(MASK);
  states.push(x.slice());
  const h = 1 / N_SIM;
  for (let k = 0; k < N_SIM; k++) {
    const r = rateFactor(s, k / N_SIM);
    const post = posteriorAt(x); // computed once from x: the update is parallel
    const next = x.slice();
    for (let j = 0; j < D_TOK; j++) {
      if (x[j] !== MASK) continue; // rate is 0 for revealed slots
      if (rng() < clamp(h * r, 0, 1)) {
        let u = rng();
        let c = N_CAND - 1;
        for (let i = 0; i < N_CAND; i++) {
          u -= post[j][i];
          if (u <= 0) {
            c = i;
            break;
          }
        }
        next[j] = c;
      }
    }
    x = next;
    states.push(x.slice());
  }
  return states;
}

// Seeded uniforms giving the training-time mixture path a monotone coupling:
// position j is unmasked at time t iff u_j < kappa_t. Marginally that is
// exactly m_j ~ Bernoulli(kappa_t), and it makes the t slider coherent.
const U_PATH: number[] = (() => {
  const rng = mulberry32(4242);
  return Array.from({ length: D_TOK }, () => rng());
})();

// --- Fig 9.5.9 geometry ----------------------------------------------------

const SLOT_X0 = 62;
const SLOT_PITCH = 75;
const SLOT_W = 70;
const SLOT_H = 40;
const ROW_PATH_Y = 132;
const ROW_SIM_Y = 202;

// rate-vs-time panel (log vertical axis from 10^-1 to 10^2.5)
const CX0 = 64;
const CX1 = 328;
const CY0 = 288;
const CY1 = 386;
const cpx = (t: number) => CX0 + (CX1 - CX0) * t;
const cpy = (r: number) =>
  CY1 - (CY1 - CY0) * clamp((Math.log10(Math.max(r, 0.05)) + 1) / 3.5, 0, 1);

function slotEl(key: string, j: number, val: number, y: number, kind: "path" | "sim", isFocus: boolean) {
  const masked = val === MASK;
  const wrong = !masked && kind === "sim" && val !== 0;
  const fill = masked ? "none" : kind === "path" ? R.fillAmber : wrong ? R.fillRed : R.fillBlue;
  const stroke = masked ? R.line : kind === "path" ? R.plan : wrong ? R.error : R.signal;
  const x = SLOT_X0 + j * SLOT_PITCH;
  return (
    <g key={key}>
      <rect
        x={x}
        y={y}
        width={SLOT_W}
        height={SLOT_H}
        rx={5}
        fill={fill}
        stroke={stroke}
        strokeWidth={isFocus ? 3 : 2}
        strokeDasharray={masked ? "5 3" : undefined}
      />
      <text
        x={x + SLOT_W / 2}
        y={y + 25}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12.5}
        fill={masked ? R.world : R.ink}
        fontWeight={masked ? 400 : 600}
      >
        {masked ? "[MASK]" : CANDS[j][val]}
      </text>
    </g>
  );
}

const fmtRate = (r: number) => (r >= 1e4 ? "∞" : r >= 1000 ? r.toExponential(1) : r.toFixed(1));

export function RbDiscreteDiffusion() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [sched, setSched] = useState<Sched>("linear");
  const [t, setT] = useState(0.62);
  const [playing, setPlaying] = useState(false);

  useRafLoop((dt) => setT((v) => (v + dt * 0.2 >= 1 ? 1 : v + dt * 0.2)), {
    playing: playing && inView && !reduced && t < 1,
  });
  const tv = reduced ? 0.62 : t;

  const states = useMemo(() => simulate(sched), [sched]);
  const k = clamp(Math.round(tv * N_SIM), 0, N_SIM);
  const sim = states[k];

  const kap = kappa(sched, tv);
  const rate = rateFactor(sched, tv);
  const pathRow = U_PATH.map((u) => (u < kap ? 0 : MASK));
  const nUnmasked = sim.reduce((a, v) => a + (v === MASK ? 0 : 1), 0);

  const post = useMemo(() => posteriorAt(sim), [sim]);
  // Focus the leftmost still-masked slot; once the sentence is complete, keep
  // the last one that was masked so the reader sees its rate collapse to zero.
  const focus = useMemo(() => {
    for (let kk = k; kk >= 0; kk--) {
      const idx = states[kk].indexOf(MASK);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [states, k]);

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 140; i++) {
      const tt = (i / 140) * 0.995;
      pts.push(`${cpx(tt).toFixed(1)},${cpy(rateFactor(sched, tt)).toFixed(1)}`);
    }
    return pts.join(" ");
  }, [sched]);

  const focusMasked = sim[focus] === MASK;

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.9 · Discrete diffusion: generation by unmasking"
      ariaLabel={`A masked diffusion language model unmasking an eight token sentence at time ${tv.toFixed(2)}, ${nUnmasked} of 8 revealed, jump rate factor ${fmtRate(rate)}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "linear", label: "κ_t = t" },
              { id: "late", label: "κ_t = t² (late reveal)" },
              { id: "cosine", label: "cosine" },
            ]}
            value={sched}
            onChange={(v) => {
              setSched(v);
              setT(0);
              setPlaying(true);
            }}
          />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onStep={() => {
              setPlaying(false);
              setT(clamp((k + 1) / N_SIM, 0, 1));
            }}
            onReset={() => {
              setT(0);
              setPlaying(true);
            }}
          />
          <Slider label="t" min={0} max={1} step={0.01} value={t} onChange={setT} fmt={(v) => v.toFixed(2)} />
        </>
      }
    >
      {/* ---- the two rows of token slots ---- */}
      <text x={62} y={126} fontFamily={MONO} fontSize={11.5} fill={R.plan}>
        training path sample x_t ~ p_t(·|z)
      </text>
      {pathRow.map((v, j) => slotEl(`p${j}`, j, v, ROW_PATH_Y, "path", false))}

      <text x={62} y={196} fontFamily={MONO} fontSize={11.5} fill={R.signal}>
        sampling trajectory x_t ← parallel Euler jumps (Alg. 7)
      </text>
      {sim.map((v, j) => slotEl(`s${j}`, j, v, ROW_SIM_Y, "sim", j === focus))}
      {sim.map((_, j) => (
        <text
          key={`n${j}`}
          x={SLOT_X0 + j * SLOT_PITCH + SLOT_W / 2}
          y={254}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={9.5}
          fill={j === focus ? R.plan : R.world}
          fontWeight={j === focus ? 700 : 400}
        >
          {j + 1}
        </text>
      ))}

      {/* ---- left panel: the rate factor exploding toward t = 1 ---- */}
      <rect x={24} y={262} width={316} height={140} rx={8} fill="none" stroke={R.line} />
      <text x={32} y={278} fontFamily={MONO} fontSize={11} fill={R.world}>
        jump-rate factor κ̇_t / (1 − κ_t)
      </text>
      {[1, 10, 100].map((g) => (
        <g key={g}>
          <line x1={CX0} y1={cpy(g)} x2={CX1} y2={cpy(g)} stroke={R.line} strokeWidth={1} strokeDasharray="3 4" />
          <text x={60} y={cpy(g) + 3.5} textAnchor="end" fontFamily={MONO} fontSize={9.5} fill={R.world}>
            {g}
          </text>
        </g>
      ))}
      <line x1={CX0} y1={CY1} x2={CX1} y2={CY1} stroke={R.line} strokeWidth={1.2} />
      <text x={CX0} y={398} fontFamily={MONO} fontSize={9.5} fill={R.world}>
        t=0
      </text>
      <text x={CX1} y={398} textAnchor="end" fontFamily={MONO} fontSize={9.5} fill={R.world}>
        t=1
      </text>
      <polyline points={curve} fill="none" stroke={R.world} strokeWidth={2} />
      <line x1={cpx(tv)} y1={CY0 - 2} x2={cpx(tv)} y2={CY1} stroke={R.plan} strokeWidth={1.4} strokeDasharray="3 3" />
      <circle cx={cpx(tv)} cy={cpy(rate)} r={4.5} fill={R.error} />

      {/* ---- right panel: the actual posterior and the actual rates ---- */}
      <rect x={356} y={262} width={340} height={140} rx={8} fill="none" stroke={R.line} />
      <text x={364} y={278} fontFamily={MONO} fontSize={11} fill={R.world}>
        {`slot ${focus + 1}:  Q = κ̇/(1−κ) · p_1|t(v|x)`}
      </text>
      {CANDS[focus].map((word, i) => {
        const p = post[focus][i];
        const q = focusMasked ? rate * p : 0;
        const y = 300 + i * 22;
        return (
          <g key={word + i}>
            <text x={364} y={y} fontFamily={MONO} fontSize={12} fill={i === 0 ? R.goal : R.world}>
              {word}
            </text>
            <rect x={418} y={y - 9} width={Math.max(p * 120, 0.6)} height={11} rx={2} fill={i === 0 ? R.goal : R.world} opacity={0.75} />
            <text x={548} y={y} fontFamily={MONO} fontSize={10.5} fill={R.ink}>
              {`p ${p.toFixed(2)}  q ${fmtRate(q)}`}
            </text>
          </g>
        );
      })}
      <text x={364} y={392} fontFamily={MONO} fontSize={10} fill={R.world}>
        {focusMasked ? "masked: rate ∝ posterior, and it is climbing" : "revealed: p is a δ, so every rate is exactly 0"}
      </text>

      <Readout
        rows={[
          { label: "t", value: tv.toFixed(2), color: R.ink },
          { label: "κ_t", value: kap.toFixed(2), color: R.plan },
          { label: "unmasked", value: `${nUnmasked}/8`, color: nUnmasked === 8 ? R.goal : R.signal },
          { label: "rate κ̇/(1−κ)", value: fmtRate(rate), color: R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.world, label: "[MASK]" },
          { color: R.plan, label: "path sample p_t(·|z)" },
          { color: R.signal, label: "sim x_t (Euler)" },
          { color: R.error, label: "wrong token" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {tv < 0.5
          ? "FAST action tokens (Ch 9) are exactly this: a discrete VLA unmasks its chunk"
          : "no velocity field here, only jump rates: and the loss is cross-entropy per position"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.5.10 · Anatomy of a flow-matching VLA (π0-style)  (RbPi0Anatomy)
// ===========================================================================

const H_CHUNK = 50; // π0 predicts H = 50 future actions per chunk
const D_CHUNK = 32; // padded action dim (cross-embodiment)
const DOF = 14; // real 14-DoF action; dims 14..31 are zero padding
const DIM = H_CHUNK * D_CHUNK; // 1600: the action expert's actual flow space
const N_DEMO = 4;
const TMAX2 = 0.985; // the CondOT field ~ 1/(1-t), so stop just short of 1
const MS_PER_EVAL = 2; // the stated latency assumption behind "control rate"
const D_MODEL = 1024; // illustrative expert width
const N_LAYERS = 18; // π0's action expert layer count

// Four demonstration action chunks. Dims 0,1 are the plotted end-effector
// path; dims 2..13 are the other joints (seeded smooth signals); dims 14..31
// are exactly zero, which is what "zero-padded to 32" literally means.
const CHUNK_FNS: ((s: number) => [number, number])[] = [
  (s) => [-1.35 + 2.7 * s, -0.75 + 1.5 * Math.sin(Math.PI * s)],
  (s) => [-1.3 + 2.6 * s, 0.72 * Math.sin(2 * Math.PI * s)],
  (s) => [-1.4 + 2.8 * s, 0.8 - 1.55 * Math.sin(Math.PI * s)],
  (s) => [-1.2 + 2.4 * s * s, -0.85 + 1.7 * s],
];

const DEMOS: Float64Array[] = (() => {
  const rng = mulberry32(2410);
  return CHUNK_FNS.map((f) => {
    const amp: number[] = [];
    const freq: number[] = [];
    const phase: number[] = [];
    for (let d = 2; d < DOF; d++) {
      amp.push(0.25 + 0.35 * rng());
      freq.push(0.5 + 1.5 * rng());
      phase.push(rng());
    }
    const z = new Float64Array(DIM);
    for (let i = 0; i < H_CHUNK; i++) {
      const s = i / (H_CHUNK - 1);
      const xy = f(s);
      z[i * D_CHUNK] = xy[0];
      z[i * D_CHUNK + 1] = xy[1];
      for (let d = 2; d < DOF; d++) {
        z[i * D_CHUNK + d] = amp[d - 2] * Math.sin(2 * Math.PI * (freq[d - 2] * s + phase[d - 2]));
      }
      // dims DOF..D_CHUNK-1 stay 0: the cross-embodiment zero padding
    }
    return z;
  });
})();

// One seeded noise chunk x_0 ~ N(0, I) in all 1600 dims, padding included.
const X0: Float64Array = (() => {
  const rng = mulberry32(883);
  const a = new Float64Array(DIM);
  for (let i = 0; i < DIM; i++) {
    const u1 = Math.max(rng(), 1e-9);
    const u2 = rng();
    a[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  return a;
})();

// Posterior over demonstration chunks given the noisy chunk x at time t: a
// softmax of Gaussian log-likelihoods (Theorem 9 of the notes), exactly the
// technique ch9p5.tsx uses in R^2, here in R^1600.
function demoPosterior(x: Float64Array, t: number): Float64Array {
  const b = Math.max(1 - t, 0.015);
  const inv = 1 / (2 * b * b);
  const logs = new Float64Array(N_DEMO);
  let best = -Infinity;
  for (let k = 0; k < N_DEMO; k++) {
    const z = DEMOS[k];
    let s2 = 0;
    for (let i = 0; i < DIM; i++) {
      const d = x[i] - t * z[i];
      s2 += d * d;
    }
    logs[k] = -s2 * inv;
    if (logs[k] > best) best = logs[k];
  }
  const w = new Float64Array(N_DEMO);
  let sum = 0;
  for (let k = 0; k < N_DEMO; k++) {
    w[k] = Math.exp(logs[k] - best);
    sum += w[k];
  }
  for (let k = 0; k < N_DEMO; k++) w[k] /= sum;
  return w;
}

// The exact marginal CondOT field u(x,t) = (E[z|x,t] - x) / (1 - t).
function chunkField(x: Float64Array, t: number): Float64Array {
  const b = Math.max(1 - t, 0.015);
  const w = demoPosterior(x, t);
  const out = new Float64Array(DIM);
  for (let i = 0; i < DIM; i++) {
    let e = 0;
    for (let k = 0; k < N_DEMO; k++) e += w[k] * DEMOS[k][i];
    out[i] = (e - x[i]) / b;
  }
  return out;
}

// Euler-integrate the expert's ODE. `steps` Euler steps = `steps` network
// evaluations; the whole point of CondOT is that a handful is enough.
function integrateChunk(steps: number): Float64Array[] {
  const h = TMAX2 / steps;
  let x = Float64Array.from(X0);
  const out: Float64Array[] = [x];
  for (let i = 0; i < steps; i++) {
    const u = chunkField(x, i * h);
    const nx = new Float64Array(DIM);
    for (let d = 0; d < DIM; d++) nx[d] = x[d] + h * u[d];
    x = nx;
    out.push(x);
  }
  return out;
}

// RMS distance from the current chunk to the nearest demonstration chunk.
function rmsToNearestDemo(x: Float64Array): number {
  let best = Infinity;
  for (let k = 0; k < N_DEMO; k++) {
    const z = DEMOS[k];
    let s = 0;
    for (let i = 0; i < DIM; i++) {
      const d = x[i] - z[i];
      s += d * d;
    }
    const r = Math.sqrt(s / DIM);
    if (r < best) best = r;
  }
  return best;
}

// Per-dimension RMS across the chunk's H timesteps: what the 32-cell strip
// shows. Noise lights all 32; a finished chunk lights only the 14 real DoF.
function perDimRms(x: Float64Array): number[] {
  const out: number[] = [];
  for (let d = 0; d < D_CHUNK; d++) {
    let s = 0;
    for (let i = 0; i < H_CHUNK; i++) {
      const v = x[i * D_CHUNK + d];
      s += v * v;
    }
    out.push(Math.sqrt(s / H_CHUNK));
  }
  return out;
}

// --- Fig 9.5.10 geometry ---------------------------------------------------

const PLOT_CX = 495;
const PLOT_CY = 300;
const PLOT_SX = 108; // action dim 0 -> stage x
const PLOT_SY = 58; // action dim 1 -> stage y
const apx = (v: number) => PLOT_CX + clamp(v, -1.7, 1.7) * PLOT_SX;
const apy = (v: number) => PLOT_CY - clamp(v, -1.4, 1.4) * PLOT_SY;

const STRIP_X0 = 456;
const STRIP_PITCH = 4.25;

const LAYER_Y = [256, 280, 304, 328, 352];
const LAYER_LABELS = ["layer 1", "layer 2", "⋮ 14 more", "layer 17", "layer 18"];

const chunkPoly = (x: Float64Array) =>
  Array.from({ length: H_CHUNK }, (_, i) => `${apx(x[i * D_CHUNK]).toFixed(1)},${apy(x[i * D_CHUNK + 1]).toFixed(1)}`).join(" ");

type Inject = "concat" | "ada";

export function RbPi0Anatomy() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [inject, setInject] = useState<Inject>("ada");
  const [steps, setSteps] = useState(10);
  const [cfg, setCfg] = useState(false);
  const [tau, setTau] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Loop with a short hold at the end, so the pipeline reads as alive.
  useRafLoop((dt) => setTau((v) => (v + dt * 0.3 > 1.32 ? 0 : v + dt * 0.3)), {
    playing: playing && inView && !reduced,
  });
  const tv = reduced ? 1 : Math.min(tau, 1);

  const path = useMemo(() => integrateChunk(steps), [steps]);
  const k = clamp(Math.round(tv * steps), 0, steps);
  const x = path[k];

  const nfe = steps * (cfg ? 2 : 1);
  const hz = 1000 / (nfe * MS_PER_EVAL);
  const err = rmsToNearestDemo(x);
  const strip = perDimRms(x);
  const ada = inject === "ada";
  const modValues = ada ? N_LAYERS * 2 * D_MODEL : D_MODEL;

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.10 · Anatomy of a flow-matching VLA (π0-style)"
      ariaLabel={`A pi-zero style vision language action policy: a VLM backbone conditions an action expert that integrates a flow ODE into a 50 by 32 action chunk in ${steps} steps, ${nfe} network evaluations`}
      controls={
        <>
          <Tabs
            options={[
              { id: "concat", label: "concat once" },
              { id: "ada", label: "adaptive RMSNorm / layer" },
            ]}
            value={inject}
            onChange={setInject}
          />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onStep={() => {
              setPlaying(false);
              setTau(clamp((k + 1) / steps, 0, 1));
            }}
            onReset={() => {
              setTau(0);
              setPlaying(true);
            }}
          />
          <Slider label="ODE steps" min={4} max={20} step={1} value={steps} onChange={setSteps} />
          <Btn onClick={() => setCfg((v) => !v)} active={cfg} title="classifier-free guidance: one conditional plus one unconditional eval per step">
            CFG {cfg ? "on (2× NFE)" : "off"}
          </Btn>
        </>
      }
    >
      <text x={24} y={110} fontFamily={MONO} fontSize={10.5} fill={R.world}>
        control rate = 1000 / (NFE × 2 ms/eval)
      </text>

      {/* ---- the pipeline ---- */}
      <rect x={22} y={116} width={88} height={58} rx={6} fill="none" stroke={R.world} strokeWidth={1.6} />
      <text x={66} y={140} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill={R.ink}>
        camera +
      </text>
      <text x={66} y={155} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill={R.ink}>
        language
      </text>
      {svgArrow(110, 145, 126, 145, R.world, 2, 7)}

      <rect x={128} y={116} width={124} height={58} rx={6} fill="none" stroke={R.world} strokeWidth={1.6} />
      <text x={190} y={136} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill={R.ink}>
        VLM backbone
      </text>
      <text x={190} y={151} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill={R.world}>
        PaliGemma 3B
      </text>
      <text x={190} y={166} textAnchor="middle" fontFamily={MONO} fontSize={9.5} fill={R.world}>
        (frozen-ish)
      </text>
      {svgArrow(252, 145, 278, 145, R.plan, 2.4, 8)}
      <text x={265} y={136} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.plan} fontWeight={700}>
        y
      </text>

      <rect x={282} y={116} width={138} height={58} rx={6} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
      <text x={351} y={134} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill={R.ink} fontWeight={600}>
        action expert
      </text>
      <text x={351} y={149} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill={R.world}>
        300M · flow ODE
      </text>
      <text x={351} y={164} textAnchor="middle" fontFamily={MONO} fontSize={9.5} fill={cfg ? R.error : R.world}>
        {cfg ? "2 evals/step: cond+∅" : "1 eval/step: cond only"}
      </text>
      <rect x={282} y={178} width={130} height={4} rx={2} fill={R.line} />
      <rect x={282} y={178} width={130 * tv} height={4} rx={2} fill={R.signal} />
      {svgArrow(420, 145, 444, 145, R.signal, 2.4, 8)}

      <rect x={448} y={116} width={152} height={58} rx={6} fill="none" stroke={R.signal} strokeWidth={1.6} />
      <text x={524} y={132} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill={R.ink} fontWeight={600}>
        action chunk
      </text>
      <text x={524} y={146} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={R.world}>
        50 × 32
      </text>
      {strip.map((v, d) => (
        <rect
          key={d}
          x={STRIP_X0 + d * STRIP_PITCH}
          y={152}
          width={3.3}
          height={18}
          fill={d < DOF ? R.signal : R.world}
          opacity={clamp(v / 0.8, 0.06, 1)}
        />
      ))}
      <line x1={STRIP_X0 + DOF * STRIP_PITCH - 0.6} y1={150} x2={STRIP_X0 + DOF * STRIP_PITCH - 0.6} y2={172} stroke={R.error} strokeWidth={1.2} />
      <text x={524} y={184} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={R.world}>
        14-DoF actions → 32 dims (zero pad)
      </text>
      {svgArrow(600, 145, 622, 145, R.signal, 2.4, 8)}

      <rect x={626} y={116} width={72} height={58} rx={6} fill="none" stroke={R.world} strokeWidth={1.6} />
      <text x={662} y={140} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill={R.ink}>
        robot
      </text>
      <text x={662} y={155} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill={R.world}>
        executes
      </text>

      {/* ---- panel A: how the conditioning reaches the expert's layers ---- */}
      <rect x={22} y={190} width={254} height={212} rx={8} fill="none" stroke={R.line} />
      <text x={28} y={204} fontFamily={MONO} fontSize={11} fill={R.world}>
        conditioning into the expert
      </text>

      <rect x={32} y={216} width={92} height={28} rx={5} fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
      <text x={78} y={234} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.ink} fontWeight={600}>
        y (VLM)
      </text>
      <rect x={158} y={216} width={110} height={28} rx={5} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
      <text x={213} y={234} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={R.ink}>
        x_τ noisy chunk
      </text>
      {svgArrow(213, 244, 213, 252, R.signal, 2, 7)}

      {ada ? (
        <>
          <line x1={78} y1={244} x2={78} y2={362} stroke={R.plan} strokeWidth={2.4} strokeLinecap="round" />
          {LAYER_Y.map((y) => (
            <g key={`bus${y}`}>{svgArrow(78, y + 10, 150, y + 10, R.plan, 2, 7)}</g>
          ))}
        </>
      ) : (
        svgArrow(78, 244, 150, 258, R.plan, 2.4, 8)
      )}

      {LAYER_Y.map((y, i) => (
        <g key={`L${y}`}>
          <rect
            x={158}
            y={y}
            width={110}
            height={20}
            rx={4}
            fill="none"
            stroke={R.world}
            strokeWidth={1.4}
            strokeDasharray={i === 2 ? "4 3" : undefined}
          />
          <text x={164} y={y + 14} fontFamily={MONO} fontSize={10.5} fill={R.ink}>
            {LAYER_LABELS[i]}
            {ada ? "  γ,β" : ""}
          </text>
        </g>
      ))}
      {svgArrow(213, 372, 213, 384, R.signal, 2.4, 8)}
      <text x={222} y={384} fontFamily={MONO} fontSize={11} fill={R.signal} fontWeight={600}>
        v_θ
      </text>
      <text x={28} y={398} fontFamily={MONO} fontSize={10.5} fill={ada ? R.plan : R.world}>
        {ada
          ? `y → 18/18 layers · 18×2×1024 = ${modValues.toLocaleString("en-US")}`
          : `y → 1/18 layers · 1×1024 = ${modValues.toLocaleString("en-US")}`}
      </text>

      {/* ---- panel B: the expert's ODE, really integrated ---- */}
      <rect x={292} y={190} width={406} height={212} rx={8} fill="none" stroke={R.line} />
      <text x={298} y={204} fontFamily={MONO} fontSize={11} fill={R.world}>
        action expert ODE: noise → chunk
      </text>
      <text x={692} y={204} textAnchor="end" fontFamily={MONO} fontSize={10.5} fill={err < 0.1 ? R.goal : R.ink}>
        {`rms→demo ${err.toFixed(3)}`}
      </text>
      {DEMOS.map((z, i) => (
        <polyline key={i} points={chunkPoly(z)} fill="none" stroke={R.goal} strokeWidth={2} opacity={0.4} />
      ))}
      <polyline points={chunkPoly(x)} fill="none" stroke={R.signal} strokeWidth={2} opacity={0.9} />
      {Array.from({ length: H_CHUNK }, (_, i) => (
        <circle key={i} cx={apx(x[i * D_CHUNK])} cy={apy(x[i * D_CHUNK + 1])} r={1.8} fill={R.signal} opacity={0.85} />
      ))}
      <circle cx={apx(x[0])} cy={apy(x[1])} r={4.5} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
      <text x={298} y={396} fontFamily={MONO} fontSize={10} fill={R.world}>
        {`τ = ${tv.toFixed(2)} · step ${k}/${steps} · dims 0,1 of 32 shown`}
      </text>

      <Readout
        rows={[
          { label: "chunk", value: `${H_CHUNK} × ${D_CHUNK}`, color: R.ink },
          { label: "steps", value: String(steps), color: R.ink },
          { label: "NFE", value: String(nfe), color: cfg ? R.error : R.signal },
          { label: "control rate ≈", value: `${hz >= 20 ? hz.toFixed(0) : hz.toFixed(1)} Hz`, color: hz >= 30 ? R.goal : R.plan },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "conditioning y" },
          { color: R.signal, label: "chunk x_τ (live)" },
          { color: R.goal, label: "demo chunks z" },
          { color: R.world, label: "pad dims d ≥ 14" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {cfg
          ? "CFG doubles NFE for the same chunk: prompt volume is paid for in latency"
          : k >= steps
            ? "CondOT paths are near-straight, so a handful of evals lands the chunk"
            : "one ODE in R^1600 (50×32): even the 18 pad dims get integrated down to zero"}
      </text>
    </Stage>
  );
}
