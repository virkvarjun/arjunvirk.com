"use client";

import { useMemo, useState } from "react";
import {
  R,
  MONO,
  Slider,
  Tabs,
  Stage,
  useRafLoop,
  usePrefersReducedMotion,
  useStageVisibility,
  clamp,
  lerp,
  mulberry32,
  Legend,
  Readout,
  Transport,
  svgArrow,
} from "./shared";

// ===========================================================================
// Chapter 9.5 · Flow matching, the systems half.
//
// Fig 9.5.1–9.5.6 answer "what is the field?". These two answer "what is the
// machine that holds the field, and what space does it run in?" — the
// architecture (§6.1) and latent diffusion (§6.2) sections of Holderrieth &
// Erives (arXiv 2506.02070).
//
// Both figures compute their numbers rather than assert them:
//   9.5.7 evaluates the paper's Fourier time embedding term by term and shows
//         that its norm is exactly 1 (sin^2 + cos^2 = 1 summed over d/2 pairs
//         times the 2/d amplitude), and decays the conditioning signal through
//         the stack with a real geometric factor.
//   9.5.8 does the compression arithmetic in full (the paper's 1024x1024, f=16,
//         c=4 example must fall out as 3,145,728 vs 16,384 = 192x), and solves
//         the beta-VAE tradeoff in closed form, then MEASURES reconstruction
//         error and KL back off the seeded latent cloud it draws.
// ===========================================================================

// Locale-independent thousands separator. toLocaleString would make the figure
// render differently per user (and mismatch on hydration), which breaks the
// determinism rule.
function fmtInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ===========================================================================
// Fig 9.5.7 · The network behind the field  (RbFieldNetwork)
//
// u_theta(x, t, y) is a neural network with three inputs, and HOW t and y get
// in decides whether the deep layers ever hear them. Concatenation splices the
// conditioning onto the input once; adaptive normalization rebuilds a per-
// channel (gamma, beta) from it at every block. The pulse animation is the
// argument: watch it fade in one tab and stay lit in the other.
// ===========================================================================

// Fourier time embedding, exactly as written in the notes (§6.1):
//   TimeEmb(t) = sqrt(2/d) [cos(2*pi*w_1*t) ... cos(2*pi*w_{d/2}*t),
//                           sin(2*pi*w_1*t) ... sin(2*pi*w_{d/2}*t)]
//   w_i = w_min * (w_max/w_min)^((i-1)/(d/2-1))     (geometric ladder)
// Its norm is 1 for every t: each (cos, sin) pair contributes 2/d, and there
// are d/2 pairs. The readout prints the measured norm as an honest check.
const D_EMB = 16;
const HALF_EMB = D_EMB / 2;
const W_MIN = 1;
const W_MAX = 100;
const EMB_AMP = Math.sqrt(2 / D_EMB); // 0.35355...
const OMEGA: number[] = Array.from({ length: HALF_EMB }, (_, i) =>
  W_MIN * Math.pow(W_MAX / W_MIN, i / (HALF_EMB - 1)),
);

function timeEmb(t: number): number[] {
  return [
    ...OMEGA.map((w) => EMB_AMP * Math.cos(2 * Math.PI * w * t)),
    ...OMEGA.map((w) => EMB_AMP * Math.sin(2 * Math.PI * w * t)),
  ];
}

// Concatenated conditioning survives each block only as whatever the residual
// stream carries forward: a geometric decay. Adaptive norm re-derives it from
// the embedding at every block, so it never decays.
const CONCAT_DECAY = 0.85;

type Cond957 = "concat" | "adaln";

// --- stage geometry (all fixed, nothing eyeballed) ---
const F7_BX0 = 140; // block lane, left
const F7_BX1 = 596; // block lane, right
const F7_BY0 = 214; // block top
const F7_BY1 = 294; // block bottom
const F7_BYC = (F7_BY0 + F7_BY1) / 2; // pulse rail
const F7_BUS = 194; // conditioning bus rail
const F7_IN_CX = 66; // input token strip center
const F7_BAR_BASE = 386; // strength bar baseline
const F7_BAR_H = 44; // strength bar full height
const F7_EMB_X0 = 152; // time-embedding heat strip
const F7_EMB_CELL = 15;
const F7_EMB_Y0 = 128;
const F7_EMB_H = 24;
const F7_TAP_T = 240; // where the time embedding drops onto the bus
const F7_TAP_Y = 540; // where the prompt drops onto the bus

// Seeded "noise" for the input patch strip: x_t is a noisy image, so its cells
// should not all be the same shade — and should not change between loads.
const F7_PATCH = (() => {
  const rng = mulberry32(9057);
  return Array.from({ length: 4 }, () => 0.3 + 0.65 * rng());
})();

export function RbFieldNetwork() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<Cond957>("adaln");
  const [layers, setLayers] = useState(8);
  const [t, setT] = useState(0.32);
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState(0);

  useRafLoop((dt) => setPhase((v) => (v + dt * 0.3) % 1), {
    playing: playing && inView && !reduced,
  });
  // Reduced motion: park the pulse mid-stack, where the concat tab has already
  // visibly faded. The static frame still makes the point.
  const p = reduced ? 0.62 : phase;

  const emb = useMemo(() => timeEmb(t), [t]);
  const embNorm = useMemo(() => Math.hypot(...emb), [emb]);

  const blocks = useMemo(() => {
    const pitch = (F7_BX1 - F7_BX0) / layers;
    const w = Math.min(pitch - 12, 56);
    return Array.from({ length: layers }, (_, i) => {
      const cx = F7_BX0 + pitch * (i + 0.5);
      return {
        i,
        cx,
        x0: cx - w / 2,
        x1: cx + w / 2,
        w,
        // the real number the bar draws and the readout prints
        strength: mode === "concat" ? Math.pow(CONCAT_DECAY, i) : 1,
      };
    });
  }, [layers, mode]);

  const pitch = (F7_BX1 - F7_BX0) / layers;
  const lastStrength = blocks[blocks.length - 1].strength;

  // Pulse position along the rail, and the strength of the block it is in.
  const px = lerp(F7_IN_CX, 610, p);
  const pulseLayer = clamp(Math.floor((px - F7_BX0) / pitch), 0, layers - 1);
  const pulseStrength = mode === "concat" ? Math.pow(CONCAT_DECAY, pulseLayer) : 1;

  // The conditioning bus only spans what it actually feeds.
  const busX0 = mode === "concat" ? F7_IN_CX : Math.min(blocks[0].cx, F7_TAP_T);
  const busX1 =
    mode === "concat" ? F7_TAP_Y : Math.max(blocks[layers - 1].cx, F7_TAP_Y);
  // How lit the single front injection is (concat) — it fires once, at the start.
  const frontLit = Math.exp(-Math.pow(p / 0.055, 2));

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.7 · The network behind the field: where t and the prompt get in"
      ariaLabel={`A ${layers} block network predicting the velocity field, conditioned by ${
        mode === "concat" ? "concatenation at the input" : "adaptive normalization at every block"
      }, at time ${t.toFixed(2)}. Conditioning strength at the last block is ${lastStrength.toFixed(3)}.`}
      controls={
        <>
          <Tabs
            options={[
              { id: "concat", label: "concatenate" },
              { id: "adaln", label: "adaptive norm (AdaLN)" },
            ]}
            value={mode}
            onChange={(v) => {
              setMode(v);
              setPhase(0);
            }}
          />
          <Slider label="blocks" min={4} max={12} step={1} value={layers} onChange={setLayers} />
          <Slider label="t" min={0} max={1} step={0.01} value={t} onChange={setT} fmt={(v) => v.toFixed(2)} />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((v) => !v)}
            onReset={() => {
              setPhase(0);
              setPlaying(true);
            }}
          />
        </>
      }
    >
      {/* ---- conditioning source band: the real time embedding + the prompt ---- */}
      <rect x={140} y={106} width={480} height={68} rx={8} fill="none" stroke={R.line} strokeDasharray="5 4" />
      <text x={F7_EMB_X0} y={122} fontFamily={MONO} fontSize={12} fill={R.world}>
        TimeEmb(t) d=16 (amber +, blue −)
      </text>
      {emb.map((v, i) => (
        <rect
          key={i}
          x={F7_EMB_X0 + i * F7_EMB_CELL}
          y={F7_EMB_Y0}
          width={F7_EMB_CELL - 1}
          height={F7_EMB_H}
          fill={v >= 0 ? R.plan : R.signal}
          opacity={0.1 + 0.9 * (Math.abs(v) / EMB_AMP)}
          stroke={R.line}
          strokeWidth={0.5}
        />
      ))}
      <line
        x1={F7_EMB_X0 + HALF_EMB * F7_EMB_CELL - 0.5}
        y1={F7_EMB_Y0 - 2}
        x2={F7_EMB_X0 + HALF_EMB * F7_EMB_CELL - 0.5}
        y2={F7_EMB_Y0 + F7_EMB_H + 2}
        stroke={R.ink}
        strokeWidth={1.2}
      />
      <text x={F7_EMB_X0 + 60} y={168} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        cos(2π wᵢ t) ×8
      </text>
      <text x={F7_EMB_X0 + 180} y={168} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        sin(2π wᵢ t) ×8
      </text>

      {/* prompt / condition embedding */}
      <rect x={470} y={118} width={148} height={44} rx={8} fill={R.fillGreen} stroke={R.goal} strokeWidth={2} />
      <text x={544} y={136} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
        prompt y
      </text>
      <text x={544} y={152} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        task / image
      </text>

      {/* ---- the conditioning bus and its taps ---- */}
      <line x1={F7_TAP_T} y1={174} x2={F7_TAP_T} y2={F7_BUS} stroke={R.plan} strokeWidth={2} />
      <line x1={F7_TAP_Y} y1={162} x2={F7_TAP_Y} y2={F7_BUS} stroke={R.goal} strokeWidth={2} />
      <line x1={busX0} y1={F7_BUS} x2={busX1} y2={F7_BUS} stroke={R.plan} strokeWidth={2.4} opacity={0.9} />

      {/* concat: exactly one injection, at the input. adaLN: one per block. */}
      {mode === "concat" ? (
        <g opacity={0.35 + 0.65 * frontLit}>
          {svgArrow(F7_IN_CX, F7_BUS, F7_IN_CX, 210, R.plan, 2.6, 7)}
        </g>
      ) : (
        blocks.map((b) => {
          const lit = Math.exp(-Math.pow((px - b.cx) / 26, 2));
          return (
            <g key={b.i} opacity={0.3 + 0.7 * lit}>
              {svgArrow(b.cx, F7_BUS, b.cx, 210, R.plan, 1.6 + 1.4 * lit, 6)}
            </g>
          );
        })
      )}

      {/* ---- input patch strip: the noisy x_t ---- */}
      {F7_PATCH.map((a, i) => (
        <rect
          key={i}
          x={40}
          y={216 + i * 20}
          width={52}
          height={17}
          fill={R.fillBlue}
          opacity={a}
          stroke={R.signal}
          strokeWidth={1.5}
        />
      ))}
      <text x={F7_IN_CX} y={310} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        x_t (noisy)
      </text>

      {/* ---- the stack ---- */}
      {svgArrow(94, F7_BYC, blocks[0].x0 - 3, F7_BYC, R.world, 1.5, 6)}
      {blocks.map((b, i) =>
        i < blocks.length - 1 ? (
          <line
            key={`c${i}`}
            x1={b.x1}
            y1={F7_BYC}
            x2={blocks[i + 1].x0}
            y2={F7_BYC}
            stroke={R.world}
            strokeWidth={1.5}
          />
        ) : null,
      )}
      {svgArrow(blocks[layers - 1].x1, F7_BYC, 622, F7_BYC, R.world, 1.5, 7)}
      {blocks.map((b) => (
        <g key={b.i}>
          {/* the tint IS the strength: concat blocks fade, adaLN blocks do not */}
          <rect
            x={b.x0}
            y={F7_BY0}
            width={b.w}
            height={F7_BY1 - F7_BY0}
            rx={5}
            fill={R.fillAmber}
            opacity={b.strength}
          />
          <rect
            x={b.x0}
            y={F7_BY0}
            width={b.w}
            height={F7_BY1 - F7_BY0}
            rx={5}
            fill="none"
            stroke={R.line}
            strokeWidth={1.4}
          />
          {b.w >= 18 && (
            <text
              x={b.cx}
              y={F7_BY1 - 7}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={9}
              fill={R.world}
            >
              {b.i + 1}
            </text>
          )}
        </g>
      ))}

      {/* the conditioning pulse riding the stack */}
      <circle cx={px} cy={F7_BYC} r={11} fill="none" stroke={R.plan} strokeWidth={1.5} opacity={0.4 * pulseStrength} />
      <circle cx={px} cy={F7_BYC} r={7} fill={R.plan} opacity={0.18 + 0.82 * pulseStrength} />

      {/* ---- output velocity ---- */}
      <rect x={626} y={232} width={74} height={44} rx={8} fill={R.fillRed} stroke={R.error} strokeWidth={2} />
      <text x={663} y={251} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error} fontWeight={600}>
        u_θ
      </text>
      <text x={663} y={266} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        velocity
      </text>

      {/* ---- the governing formula, per tab ---- */}
      <text x={390} y={310} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
        {mode === "concat"
          ? "input = [ x_t ; TimeEmb(t) ; y ]: spliced on once, then never again"
          : "AdaNorm(x) = (1+γ)·Norm(x) + β,  with (γ, β) = MLP(c) at every block"}
      </text>

      {/* ---- per-block conditioning strength bars ---- */}
      <text x={44} y={356} fontFamily={MONO} fontSize={11} fill={R.world}>
        conditioning
      </text>
      <text x={44} y={372} fontFamily={MONO} fontSize={11} fill={R.world}>
        strength
      </text>
      <line
        x1={F7_BX0}
        y1={F7_BAR_BASE - F7_BAR_H}
        x2={F7_BX1}
        y2={F7_BAR_BASE - F7_BAR_H}
        stroke={R.line}
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      <text x={602} y={F7_BAR_BASE - F7_BAR_H + 4} fontFamily={MONO} fontSize={10} fill={R.world}>
        1.0
      </text>
      <line x1={F7_BX0} y1={F7_BAR_BASE} x2={F7_BX1} y2={F7_BAR_BASE} stroke={R.line} strokeWidth={1.2} />
      {blocks.map((b) => {
        const bw = Math.min(b.w, 20);
        const h = b.strength * F7_BAR_H;
        return (
          <g key={b.i}>
            <rect x={b.cx - bw / 2} y={F7_BAR_BASE - h} width={bw} height={h} fill={R.plan} opacity={0.85} />
            <text
              x={b.cx}
              y={F7_BAR_BASE - h - 4}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={9}
              fill={R.world}
            >
              {b.strength.toFixed(2)}
            </text>
          </g>
        );
      })}

      <Readout
        rows={[
          { label: "t", value: t.toFixed(2), color: R.ink },
          { label: "|TimeEmb|", value: embNorm.toFixed(3), color: R.plan },
          { label: "blocks", value: String(layers), color: R.ink },
          {
            label: "cond @ last",
            value: lastStrength.toFixed(3),
            color: lastStrength > 0.9 ? R.goal : R.error,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "input x" },
          { color: R.plan, label: "time embedding" },
          { color: R.goal, label: "prompt embedding" },
          { color: R.error, label: "velocity out" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {mode === "concat"
          ? "concatenate: t and y enter once: by the last block only an echo of them is left"
          : "AdaLN re-injects (γ, β) at every block: the choice π0.5 makes, as adaptive RMSNorm"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.5.8 · Latent diffusion: compress first, generate second (RbLatentDiffusion)
//
// Pixel space is too big to generate in, so a VAE compresses it and the flow
// runs in the latent space. The arithmetic is all live:
//   d_pixel  = H * W * 3
//   d_latent = (H/f) * (W/f) * c,  c = 4
//   ratio    = d_pixel / d_latent = 3 f^2 / 4     (resolution cancels!)
//   attention cost ~ tokens^2, so the token-count saving squares: f^4.
// The paper's example (1024x1024, f=16, c=4 -> 3,145,728 vs 16,384 = 192x)
// falls straight out. The two squares are drawn with their AREAS in exactly
// that ratio, so "192x" is something you can see, not just read.
// ===========================================================================

const C_LATENT = 4;
const RES_OPTIONS = ["256", "512", "1024", "2048"] as const;
type Res958 = (typeof RES_OPTIONS)[number];

// --- pipeline geometry ---
const F8_STAGES = {
  img: [28, 96],
  enc: [112, 168],
  lat: [190, 238],
  flow: [258, 462],
  lat2: [484, 532],
  dec: [548, 604],
  img2: [620, 688],
} as const;
const F8_RAIL = 164;

// Seeded thumbnail + latent code, so the picture is identical on every load
// and the "same image out" story is literally the same pixels.
const F8_THUMB = (() => {
  const rng = mulberry32(1234);
  return Array.from({ length: 64 }, () => rng());
})();
const F8_CODE = (() => {
  const rng = mulberry32(5678);
  return Array.from({ length: 16 }, () => rng());
})();

// --- the beta-VAE tradeoff, solved honestly -------------------------------
// The encoder posterior is q(z|x) = N(mu, sigma^2 I) with mu = s * m, where m
// is the latent the decoder needs in order to reconstruct. With a fixed-gain
// decoder the objective is
//   L(s, sigma) = (1-s)^2 M + sigma^2 D  +  beta * KL,
//   KL = 1/2 [ s^2 M + D (sigma^2 - log sigma^2 - 1) ],   M = E||m||^2
// Setting the two derivatives to zero gives the closed form
//   dL/ds      = -2(1-s) M + beta s M = 0        ->  s      = 2 / (2 + beta)
//   dL/dsigma^2 = D + beta D/2 (1 - 1/sigma^2)=0 ->  sigma^2 = beta / (beta + 2)
// beta -> 0 : s -> 1, sigma -> 0. Latents ARE the raw blob: perfect recon,
//             nothing pins them to a Gaussian, KL blows up.
// beta -> inf: s -> 0, sigma -> 1. Latents ARE N(0, I): KL -> 0, recon dies.
const F8_N = 64;
const F8_DIM = 2;

function gaussSeq(seed: number, n: number): [number, number][] {
  const rng = mulberry32(seed);
  const g = () => {
    const u1 = Math.max(rng(), 1e-9);
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng());
  };
  return Array.from({ length: n }, () => [g(), g()] as [number, number]);
}

// Where reconstruction wants the latents: two offset clusters, deliberately
// NOT a standard Gaussian — that is the whole tension the KL term is fighting.
const F8_M: [number, number][] = (() => {
  const j = gaussSeq(4242, F8_N);
  return j.map(([a, b], i) => {
    const arm = i % 2 === 0 ? 1 : -1;
    return [0.6 + arm * 1.5 + 0.3 * a, 0.45 - arm * 1.0 + 0.3 * b] as [number, number];
  });
})();
const F8_EPS = gaussSeq(909, F8_N);

export function RbLatentDiffusion() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [res, setRes] = useState<Res958>("1024");
  const [fExp, setFExp] = useState(4); // f = 2^fExp
  const [logBeta, setLogBeta] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState(0);

  useRafLoop((dt) => setPhase((v) => (v + dt * 0.26) % 1), {
    playing: playing && inView && !reduced,
  });
  // Reduced motion: park the sample inside the flow box, where the story is.
  const p = reduced ? 0.5 : phase;

  const H = Number(res);
  const f = Math.pow(2, fExp);
  const beta = Math.pow(10, logBeta);

  // --- the real arithmetic ---
  const hl = H / f;
  const dPixel = H * H * 3;
  const dLatent = hl * hl * C_LATENT;
  const ratio = dPixel / dLatent; // == 3 f^2 / 4
  const nPixTok = H * H;
  const nLatTok = hl * hl;
  const attn = Math.pow(nPixTok / nLatTok, 2); // == f^4

  // --- the beta-VAE cloud, measured not asserted ---
  const vae = useMemo(() => {
    const s = 2 / (2 + beta);
    const sig2 = beta / (beta + 2);
    const sig = Math.sqrt(sig2);
    const z: [number, number][] = F8_M.map((m, i) => [
      s * m[0] + sig * F8_EPS[i][0],
      s * m[1] + sig * F8_EPS[i][1],
    ]);
    const mx = z.reduce((a, q) => a + q[0], 0) / F8_N;
    const my = z.reduce((a, q) => a + q[1], 0) / F8_N;
    const varr =
      z.reduce((a, q) => a + (q[0] - mx) ** 2 + (q[1] - my) ** 2, 0) / (F8_N * F8_DIM);
    // reconstruction: the decoder is fixed-gain, so the error is literally the
    // distance from where the latent landed to where recon needed it.
    const recon = F8_M.reduce((a, m, i) => a + (m[0] - z[i][0]) ** 2 + (m[1] - z[i][1]) ** 2, 0) / F8_N;
    // D_KL = 1/2 * sum(mu^2 + sigma^2 - log sigma^2 - 1), per point, averaged.
    const lg = Math.log(sig2);
    const kl =
      F8_M.reduce(
        (a, m) =>
          a + 0.5 * ((s * m[0]) ** 2 + (s * m[1]) ** 2 + F8_DIM * (sig2 - lg - 1)),
        0,
      ) / F8_N;
    return { s, sig, z, meanMag: Math.hypot(mx, my), varr, recon, kl };
  }, [beta]);

  // --- the two spaces, drawn with their areas in the true ratio ---
  const SP = 90; // pixel-space square side
  const SL = SP / Math.sqrt(ratio); // area ratio is EXACTLY d_pixel/d_latent
  const PX0 = 44;
  const PY1 = 390;
  const LCX = 240;

  const dotsFor = (x0: number, y0: number, side: number, color: string, key: string) => {
    const n = Math.max(1, Math.floor(side / 6));
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (
        <circle
          key={`${key}-${i}-${j}`}
          cx={x0 + ((i + 0.5) * side) / n}
          cy={y0 + ((j + 0.5) * side) / n}
          r={1.4}
          fill={color}
          opacity={0.7}
        />
      )),
    ).flat();
  };

  // --- pipeline sample: glow each stage as it passes through ---
  const sx = lerp(52, 664, p);
  const lit = (span: readonly [number, number]) => {
    const d = Math.max(span[0] - sx, sx - span[1], 0);
    return Math.exp(-Math.pow(d / 24, 2));
  };
  const inLatent = sx > F8_STAGES.enc[1] && sx < F8_STAGES.dec[0];

  // --- VAE scatter panel ---
  const VCX = 466;
  const VCY = 339;
  const VS = 24;
  const vx = (u: number) => clamp(VCX + VS * u, 380, 552);
  const vy = (u: number) => clamp(VCY - VS * u, 282, 396);

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5.8 · Latent diffusion: compress first, generate second"
      ariaLabel={`A ${H} by ${H} image compressed by factor ${f} into a ${hl} by ${hl} by 4 latent: ${fmtInt(
        dPixel,
      )} pixel values become ${fmtInt(dLatent)} latent values, a ${
        ratio >= 10 ? Math.round(ratio) : ratio.toFixed(2)
      } times compression. The flow matching model runs in the latent space.`}
      controls={
        <>
          <Tabs
            options={RES_OPTIONS.map((o) => ({ id: o, label: o }))}
            value={res}
            onChange={setRes}
          />
          <Slider label="downsample f" min={0} max={4} step={1} value={fExp} onChange={setFExp} fmt={(v) => String(Math.pow(2, v))} />
          <Slider
            label="β (KL weight)"
            min={-2}
            max={1.7}
            step={0.05}
            value={logBeta}
            onChange={setLogBeta}
            fmt={(v) => {
              const b = Math.pow(10, v);
              return b < 1 ? b.toFixed(2) : b.toFixed(1);
            }}
          />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((v) => !v)}
            onReset={() => {
              setPhase(0);
              setPlaying(true);
            }}
          />
        </>
      }
    >
      {/* ================= pipeline ================= */}
      {/* image in */}
      <g opacity={0.55 + 0.45 * lit(F8_STAGES.img)}>
        {F8_THUMB.map((v, i) => (
          <rect
            key={i}
            x={28 + (i % 8) * 8.5}
            y={130 + Math.floor(i / 8) * 8.5}
            width={8.5}
            height={8.5}
            fill={R.world}
            opacity={0.15 + 0.7 * v}
          />
        ))}
        <rect x={28} y={130} width={68} height={68} fill="none" stroke={R.world} strokeWidth={2} />
      </g>

      {svgArrow(98, F8_RAIL, 110, F8_RAIL, R.world, 1.5, 6)}

      {/* encoder */}
      <g opacity={0.55 + 0.45 * lit(F8_STAGES.enc)}>
        <polygon points="112,130 168,148 168,180 112,198" fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
      </g>
      {svgArrow(170, F8_RAIL, 188, F8_RAIL, R.world, 1.5, 6)}

      {/* latent in */}
      <g opacity={0.55 + 0.45 * lit(F8_STAGES.lat)}>
        {F8_CODE.map((v, i) => (
          <rect
            key={i}
            x={190 + (i % 4) * 12}
            y={140 + Math.floor(i / 4) * 12}
            width={12}
            height={12}
            fill={R.signal}
            opacity={0.15 + 0.7 * v}
          />
        ))}
        <rect x={190} y={140} width={48} height={48} fill="none" stroke={R.signal} strokeWidth={2} />
      </g>
      {svgArrow(240, F8_RAIL, 256, F8_RAIL, R.world, 1.5, 6)}

      {/* the star: the flow box */}
      <g opacity={0.7 + 0.3 * lit(F8_STAGES.flow)}>
        <rect x={258} y={118} width={204} height={92} rx={10} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      </g>
      <text x={360} y={148} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink} fontWeight={600}>
        flow matching runs HERE
      </text>
      <text x={360} y={168} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.signal}>
        {`u_θ(z, t, y) on ${hl}×${hl}×${C_LATENT}`}
      </text>
      <text x={360} y={190} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        noise → latent, never pixels
      </text>

      {svgArrow(464, F8_RAIL, 482, F8_RAIL, R.world, 1.5, 6)}

      {/* latent out */}
      <g opacity={0.55 + 0.45 * lit(F8_STAGES.lat2)}>
        {F8_CODE.map((v, i) => (
          <rect
            key={i}
            x={484 + (i % 4) * 12}
            y={140 + Math.floor(i / 4) * 12}
            width={12}
            height={12}
            fill={R.signal}
            opacity={0.15 + 0.7 * v}
          />
        ))}
        <rect x={484} y={140} width={48} height={48} fill="none" stroke={R.signal} strokeWidth={2} />
      </g>
      {svgArrow(534, F8_RAIL, 546, F8_RAIL, R.world, 1.5, 6)}

      {/* decoder */}
      <g opacity={0.55 + 0.45 * lit(F8_STAGES.dec)}>
        <polygon points="548,148 604,130 604,198 548,180" fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
      </g>
      {svgArrow(606, F8_RAIL, 618, F8_RAIL, R.world, 1.5, 6)}

      {/* image out — the same seeded pixels: it is a reconstruction */}
      <g opacity={0.55 + 0.45 * lit(F8_STAGES.img2)}>
        {F8_THUMB.map((v, i) => (
          <rect
            key={i}
            x={620 + (i % 8) * 8.5}
            y={130 + Math.floor(i / 8) * 8.5}
            width={8.5}
            height={8.5}
            fill={R.world}
            opacity={0.15 + 0.7 * v}
          />
        ))}
        <rect x={620} y={130} width={68} height={68} fill="none" stroke={R.world} strokeWidth={2} />
      </g>

      {/* the travelling sample */}
      <circle cx={sx} cy={F8_RAIL} r={6} fill={inLatent ? R.signal : R.world} />

      {/* pipeline labels */}
      <text x={62} y={222} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        image
      </text>
      <text x={62} y={236} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.ink}>
        {`${H}×${H}×3`}
      </text>
      <text x={140} y={222} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.plan}>
        VAE enc
      </text>
      <text x={214} y={222} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        latent
      </text>
      <text x={214} y={236} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.ink}>
        {`${hl}×${hl}×${C_LATENT}`}
      </text>
      <text x={508} y={222} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        latent
      </text>
      <text x={508} y={236} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.ink}>
        {`${hl}×${hl}×${C_LATENT}`}
      </text>
      <text x={576} y={222} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.plan}>
        VAE dec
      </text>
      <text x={654} y={222} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        image
      </text>
      <text x={654} y={236} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.ink}>
        {`${H}×${H}×3`}
      </text>

      {/* ================= panel: the two spaces, to scale ================= */}
      <rect x={24} y={252} width={324} height={154} rx={8} fill="none" stroke={R.line} />
      <text x={34} y={268} fontFamily={MONO} fontSize={11} fill={R.world}>
        the two spaces, drawn to scale
      </text>
      {dotsFor(PX0, PY1 - SP, SP, R.world, "pix")}
      <rect x={PX0} y={PY1 - SP} width={SP} height={SP} fill="none" stroke={R.world} strokeWidth={2} />
      {dotsFor(LCX - SL / 2, PY1 - SL, SL, R.signal, "lat")}
      <rect x={LCX - SL / 2} y={PY1 - SL} width={SL} height={SL} fill="none" stroke={R.signal} strokeWidth={2} />
      <text x={PX0 + SP / 2} y={402} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={R.world}>
        {`pixel ${fmtInt(dPixel)}`}
      </text>
      <text x={LCX} y={402} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={R.signal}>
        {`latent ${fmtInt(dLatent)}`}
      </text>

      {/* ================= panel: the VAE's two forces ================= */}
      <rect x={364} y={252} width={336} height={154} rx={8} fill="none" stroke={R.line} />
      <text x={372} y={268} fontFamily={MONO} fontSize={11} fill={R.world}>
        the VAE&apos;s two forces
      </text>
      <rect x={376} y={278} width={180} height={122} rx={4} fill="none" stroke={R.line} />
      <line x1={376} y1={VCY} x2={556} y2={VCY} stroke={R.line} strokeWidth={0.8} />
      <line x1={VCX} y1={278} x2={VCX} y2={400} stroke={R.line} strokeWidth={0.8} />
      {/* KL wants them here: the unit Gaussian */}
      <circle cx={VCX} cy={VCY} r={VS} fill="none" stroke={R.goal} strokeWidth={2} strokeDasharray="4 3" />
      {/* reconstruction wants them here: the raw, lumpy, off-centre blob */}
      {F8_M.map((m, i) => (
        <circle key={`m${i}`} cx={vx(m[0])} cy={vy(m[1])} r={2.6} fill="none" stroke={R.plan} strokeWidth={1.2} opacity={0.75} />
      ))}
      {/* where they actually land */}
      {vae.z.map((q, i) => (
        <circle key={`z${i}`} cx={vx(q[0])} cy={vy(q[1])} r={2.4} fill={R.signal} opacity={0.85} />
      ))}
      {(
        [
          ["β", beta < 1 ? beta.toFixed(2) : beta.toFixed(1), R.ink],
          ["recon err", vae.recon.toFixed(2), R.plan],
          ["KL(q‖N)", vae.kl.toFixed(2), R.goal],
          ["mean |z|", vae.meanMag.toFixed(2), R.ink],
          ["var z", vae.varr.toFixed(2), R.ink],
        ] as [string, string, string][]
      ).map(([k, v, c], i) => (
        <g key={k}>
          <text x={570} y={292 + i * 22} fontFamily={MONO} fontSize={11} fill={R.world}>
            {k}
          </text>
          <text x={646} y={292 + i * 22} fontFamily={MONO} fontSize={11} fill={c} fontWeight={600}>
            {v}
          </text>
        </g>
      ))}

      <Readout
        y={30}
        rows={[
          { label: "pixel values", value: fmtInt(dPixel), color: R.world },
          { label: "latent values", value: fmtInt(dLatent), color: R.signal },
          {
            label: "compression",
            value: `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(2)}×`,
            color: ratio >= 1 ? R.goal : R.error,
          },
          { label: "latent tokens", value: fmtInt(nLatTok), color: R.ink },
          { label: "attn speedup", value: `${fmtInt(attn)}×`, color: R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.world, label: "pixel space" },
          { color: R.signal, label: "latent space / flow" },
          { color: R.plan, label: "recon pull → data" },
          { color: R.goal, label: "KL pull → N(0,I)", dash: true },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        robot VLAs pull the same trick: flow in a learned latent action space, then decode
      </text>
    </Stage>
  );
}
