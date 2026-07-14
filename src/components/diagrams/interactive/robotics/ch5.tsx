"use client";

import { useReducer, useState } from "react";
import {
  R,
  MONO,
  Btn,
  Slider,
  Stage,
  useRafLoop,
  usePrefersReducedMotion,
  useStageVisibility,
  svgArrow,
  approach,
  clamp,
  mulberry32,
  type V3,
  type Prim3D,
  type Camera3D,
  v3,
  seg3,
  dot3,
  label3,
  grid3,
  Scene3D,
  useOrbit,
  Legend,
  Readout,
  Transport,
} from "./shared";

const rad = (d: number) => (d * Math.PI) / 180;
const angWrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// One seeded standard-normal draw (Box–Muller) from a mulberry32 stream, so
// every "noisy" number in this chapter is honest noise AND deterministic.
function gauss(rnd: () => number) {
  const u = Math.max(rnd(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}
// Advance a seed between beats so each beat gets a fresh deterministic stream.
const nextSeed = (s: number) => (Math.imul(s, 1664525) + 1013904223) >>> 0;

// Eigendecomposition of a symmetric 2×2 covariance [[a,b],[b,c]] — the real
// way an uncertainty ellipse gets its axes and tilt.
function eig2(a: number, b: number, c: number) {
  const m = (a + c) / 2;
  const d = Math.sqrt(Math.max(((a - c) / 2) ** 2 + b * b, 0));
  return { l1: m + d, l2: Math.max(m - d, 1e-12), ang: 0.5 * Math.atan2(2 * b, a - c) };
}

// A Gaussian bell as an SVG path over a horizontal axis.
function gaussianPath(
  mu: number, // pixel x of the mean
  sigma: number, // pixel spread
  base: number, // pixel y of the axis (bottom)
  height: number, // pixel height of the peak above the axis
  x0: number,
  x1: number,
  n = 64,
) {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const z = (x - mu) / sigma;
    pts.push(`${x.toFixed(2)},${(base - height * Math.exp(-0.5 * z * z)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")}`;
}

// ===========================================================================
// Fig 5.1 · Belief as a Gaussian: predict widens, update sharpens  (stepper)
// A REAL 1D Kalman filter over a hallway. PREDICT runs μ ← μ+u, σ² ← σ²+Q
// while the hidden truth moves with actual (seeded) execution noise; UPDATE
// draws a noisy measurement z of the truth and fuses it with the real gain
// K = σ²/(σ²+R). Prior (dashed), measurement (amber) and posterior (blue)
// are all on stage at once, so the Bayes multiply is visible.
// ===========================================================================

const AX0 = 70; // axis left px
const AX1 = 660; // axis right px
const AXY = 320; // axis y px
const posToPx = (p: number) => AX0 + (p / 10) * (AX1 - AX0);
const sigToPx = (s: number) => (s / 10) * (AX1 - AX0);
const hOf1 = (sig: number) => clamp(75 / sig, 36, 185);

const Q1 = 0.09; // process-noise variance per move (σ = 0.30 m)
const R1 = 0.2025; // measurement variance (σ = 0.45 m)
const U1 = 0.9; // commanded move per PREDICT (m)

type KF1 = {
  mu: number;
  varr: number;
  truth: number;
  dir: 1 | -1;
  ghost: { mu: number; sig: number; label: string } | null;
  z: number | null;
  K: number | null;
  beat: "predict" | "update"; // the NEXT beat to fire
  step: number;
  seed: number;
  timer: number;
};

const KF1_INIT: KF1 = {
  mu: 2.0,
  varr: 0.64,
  truth: 2.6,
  dir: 1,
  ghost: null,
  z: null,
  K: null,
  beat: "predict",
  step: 0,
  seed: 0x5eed1,
  timer: 0,
};

function kf1Predict(s: KF1): KF1 {
  const rnd = mulberry32(s.seed);
  const dir: 1 | -1 = s.truth + s.dir * U1 > 9.4 || s.truth + s.dir * U1 < 0.6 ? ((-s.dir) as 1 | -1) : s.dir;
  const u = dir * U1;
  // truth executes the command imperfectly — that is where drift comes from
  const truth = clamp(s.truth + u + gauss(rnd) * Math.sqrt(Q1), 0.3, 9.7);
  return {
    ...s,
    ghost: { mu: s.mu, sig: Math.sqrt(s.varr), label: "before the move" },
    z: null,
    K: null,
    mu: clamp(s.mu + u, 0.3, 9.7),
    varr: s.varr + Q1,
    truth,
    dir,
    beat: "update",
    step: s.step + 1,
    seed: nextSeed(s.seed),
    timer: 0,
  };
}

function kf1Update(s: KF1): KF1 {
  const rnd = mulberry32(s.seed);
  const z = clamp(s.truth + gauss(rnd) * Math.sqrt(R1), 0.3, 9.7);
  const K = s.varr / (s.varr + R1); // the real Kalman gain
  return {
    ...s,
    ghost: { mu: s.mu, sig: Math.sqrt(s.varr), label: "prior" },
    z,
    K,
    mu: s.mu + K * (z - s.mu),
    varr: (1 - K) * s.varr,
    beat: "predict",
    step: s.step + 1,
    seed: nextSeed(s.seed),
    timer: 0,
  };
}

const kf1Advance = (s: KF1) => (s.beat === "predict" ? kf1Predict(s) : kf1Update(s));

export function RbBeliefGaussian() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [st, setSt] = useState<KF1>(KF1_INIT);
  const [disp, setDisp] = useState({ mu: KF1_INIT.mu, sig: Math.sqrt(KF1_INIT.varr) });

  useRafLoop(
    (dt) => {
      setSt((s) => (s.timer + dt >= 2.0 ? kf1Advance(s) : { ...s, timer: s.timer + dt }));
      setDisp((d) => ({
        mu: approach(d.mu, st.mu, 0.16, dt),
        sig: approach(d.sig, Math.sqrt(st.varr), 0.16, dt),
      }));
    },
    { playing: playing && inView && !reduced },
  );

  // eased display while the loop runs; exact when paused or reduced-motion
  const cur = reduced || !playing ? { mu: st.mu, sig: Math.sqrt(st.varr) } : disp;
  const muPx = posToPx(cur.mu);
  const h = hOf1(cur.sig);
  const sPx = sigToPx(cur.sig);
  const beliefPath = gaussianPath(muPx, sPx, AXY, h, AX0, AX1);

  const doStep = () => setSt(kf1Advance);
  const reset = () => {
    setSt(KF1_INIT);
    setDisp({ mu: KF1_INIT.mu, sig: Math.sqrt(KF1_INIT.varr) });
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.1 · Belief as a Gaussian: predict widens, update sharpens"
      ariaLabel={`A real 1D Kalman filter: belief mean ${cur.mu.toFixed(2)} metres, sigma ${cur.sig.toFixed(2)} metres, after ${st.step} beats`}
      controls={
        <>
          <Transport playing={playing} onPlay={toggle} onStep={doStep} onReset={reset} stepLabel="beat" />
          <Btn onClick={() => setSt(kf1Predict)} title="move: μ slides by u, σ² grows by Q">
            PREDICT (move)
          </Btn>
          <Btn onClick={() => setSt(kf1Update)} title="measure: fuse a noisy z with gain K = σ²/(σ²+R)">
            UPDATE (measure)
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "mean μ", value: `${cur.mu.toFixed(2)} m`, color: R.signal },
          { label: "sigma σ", value: `${cur.sig.toFixed(2)} m`, color: R.signal },
          { label: "gain K", value: st.K == null ? "—" : st.K.toFixed(2), color: st.K == null ? R.world : R.ink },
          { label: "beat", value: String(st.step), color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "belief (posterior)" },
          { color: R.plan, label: "measurement z", dash: true },
          { color: R.world, label: "prior / pre-move", dash: true },
          { color: R.goal, label: "true position" },
        ]}
      />

      {/* position axis */}
      {Array.from({ length: 11 }).map((_, i) => (
        <g key={i}>
          <line x1={posToPx(i)} y1={AXY} x2={posToPx(i)} y2={AXY + 6} stroke={R.line} strokeWidth={1.5} />
          <text x={posToPx(i)} y={AXY + 22} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
            {i}
          </text>
        </g>
      ))}
      <line x1={AX0} y1={AXY} x2={AX1} y2={AXY} stroke={R.world} strokeWidth={2} />
      <text x={AX1} y={AXY + 40} textAnchor="end" fontFamily={MONO} fontSize={12} fill={R.world}>
        position (m) →
      </text>

      {/* ghost of the previous belief (prior / pre-move), grey dashed */}
      {st.ghost && (
        <g>
          <path
            d={gaussianPath(posToPx(st.ghost.mu), sigToPx(st.ghost.sig), AXY, hOf1(st.ghost.sig), AX0, AX1)}
            fill="none"
            stroke={R.world}
            strokeWidth={2}
            strokeDasharray="5 5"
            opacity={0.8}
          />
          <text
            x={clamp(posToPx(st.ghost.mu), 90, 640)}
            y={AXY - hOf1(st.ghost.sig) - 8}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={11.5}
            fill={R.world}
          >
            {st.ghost.label}
          </text>
        </g>
      )}

      {/* the measurement likelihood (amber bell + dashed line at z) */}
      {st.z != null && (
        <g>
          <path
            d={gaussianPath(posToPx(st.z), sigToPx(Math.sqrt(R1)), AXY, 110, AX0, AX1)}
            fill="none"
            stroke={R.plan}
            strokeWidth={2.5}
            opacity={0.9}
          />
          <line x1={posToPx(st.z)} y1={AXY} x2={posToPx(st.z)} y2={AXY - 130} stroke={R.plan} strokeWidth={2} strokeDasharray="5 5" />
          <text x={clamp(posToPx(st.z), 90, 640)} y={AXY - 140} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
            z = {st.z.toFixed(2)}
          </text>
        </g>
      )}

      {/* current belief: ±σ band + filled bell (blue) */}
      <rect x={muPx - sPx} y={AXY - h} width={2 * sPx} height={h} fill={R.fillBlue} opacity={0.4} />
      <path d={`${beliefPath} L ${AX1} ${AXY} L ${AX0} ${AXY} Z`} fill={R.fillBlue} opacity={0.45} />
      <path d={beliefPath} fill="none" stroke={R.signal} strokeWidth={3} />

      {/* the hidden truth (green), on the axis */}
      <line x1={posToPx(st.truth)} y1={AXY} x2={posToPx(st.truth)} y2={AXY + 8} stroke={R.goal} strokeWidth={4} />
      <circle cx={posToPx(st.truth)} cy={AXY + 32} r={6} fill={R.goal} />
      <text x={posToPx(st.truth)} y={AXY + 54} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        true
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "reduced motion: step the filter manually — the math still runs"
          : st.beat === "predict"
            ? "next: PREDICT — μ slides by the command, σ² grows by Q (motion adds doubt)"
            : "next: UPDATE — a noisy z arrives and the gain K decides how far to move"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 5.2 · The Bayes filter loop  (animated pipeline + REAL 2D Kalman)
// Left: the predict/update cycle. Right: a robot driving a circle while an
// actual 2D Kalman filter tracks it — seeded noisy odometry on predict
// (P ← P + Q), seeded noisy position fixes on update (K = P(P+R)⁻¹), and the
// 2σ ellipse drawn from the true eigendecomposition of P. Turn measurements
// off and dead-reckoning drift grows for real: the estimate random-walks away
// and the ellipse balloons, no scripting involved.
// ===========================================================================

const PRED2 = { x: 150, y: 150 };
const UPD2 = { x: 150, y: 322 };
const BW2 = 86;
const BH2 = 33;
const WC2 = { x: 480, y: 268 }; // world panel centre (px)
const S2 = 95; // px per metre
const SIG_ALONG = 0.045; // odometry noise along track (m per beat)
const SIG_CROSS = 0.018; // odometry noise across track
const SIG_Z = 0.055; // position-fix noise (m)

type M2S = readonly [number, number, number]; // symmetric [[a,b],[b,c]]

type KF2 = {
  th: number; // true angle around the circle
  est: [number, number];
  P: M2S;
  beat: "predict" | "update"; // NEXT beat to fire
  step: number;
  seed: number;
  timer: number;
  trail: [number, number][];
};

const truth2 = (th: number): [number, number] => [Math.cos(th), Math.sin(th)];

const KF2_INIT: KF2 = {
  th: -Math.PI / 2,
  est: truth2(-Math.PI / 2),
  P: [0.0016, 0, 0.0016],
  beat: "predict",
  step: 0,
  seed: 0xbee5,
  timer: 0,
  trail: [truth2(-Math.PI / 2)],
};

function kf2Advance(s: KF2, measOn: boolean): KF2 {
  const rnd = mulberry32(s.seed);
  if (s.beat === "predict") {
    const dth = 0.22;
    const p0 = truth2(s.th);
    const p1 = truth2(s.th + dth);
    const d: [number, number] = [p1[0] - p0[0], p1[1] - p0[1]];
    const phi = Math.atan2(d[1], d[0]);
    const ca = Math.cos(phi);
    const sa = Math.sin(phi);
    // odometry = true displacement + anisotropic noise in the track frame
    const nA = gauss(rnd) * SIG_ALONG;
    const nC = gauss(rnd) * SIG_CROSS;
    const est: [number, number] = [s.est[0] + d[0] + ca * nA - sa * nC, s.est[1] + d[1] + sa * nA + ca * nC];
    const va = SIG_ALONG * SIG_ALONG;
    const vc = SIG_CROSS * SIG_CROSS;
    // Q rotated into the world frame, added to P — predict grows the ellipse
    const P: M2S = [
      s.P[0] + ca * ca * va + sa * sa * vc,
      s.P[1] + ca * sa * (va - vc),
      s.P[2] + sa * sa * va + ca * ca * vc,
    ];
    return { ...s, th: s.th + dth, est, P, beat: "update", step: s.step + 1, seed: nextSeed(s.seed), timer: 0, trail: [...s.trail.slice(-70), est] };
  }
  if (!measOn) {
    // no sensor: the update beat fires and does nothing — drift is uncorrected
    return { ...s, beat: "predict", step: s.step + 1, seed: nextSeed(s.seed), timer: 0 };
  }
  const t = truth2(s.th);
  const z: [number, number] = [t[0] + gauss(rnd) * SIG_Z, t[1] + gauss(rnd) * SIG_Z];
  const rz = SIG_Z * SIG_Z;
  const [pa, pb, pc] = s.P;
  const Sa = pa + rz;
  const Sb = pb;
  const Sc = pc + rz;
  const det = Sa * Sc - Sb * Sb || 1e-12;
  // K = P (P + R)⁻¹ — the 2D trust dial
  const K11 = (pa * Sc - pb * Sb) / det;
  const K12 = (pb * Sa - pa * Sb) / det;
  const K21 = (pb * Sc - pc * Sb) / det;
  const K22 = (pc * Sa - pb * Sb) / det;
  const ix = z[0] - s.est[0];
  const iy = z[1] - s.est[1];
  const est: [number, number] = [s.est[0] + K11 * ix + K12 * iy, s.est[1] + K21 * ix + K22 * iy];
  const a11 = 1 - K11;
  const a12 = -K12;
  const a21 = -K21;
  const a22 = 1 - K22;
  const nb = a11 * pb + a12 * pc;
  const nb2 = a21 * pa + a22 * pb;
  const P: M2S = [a11 * pa + a12 * pb, (nb + nb2) / 2, a21 * pb + a22 * pc];
  return { ...s, est, P, beat: "predict", step: s.step + 1, seed: nextSeed(s.seed), timer: 0, trail: [...s.trail.slice(-70), est] };
}

// quadratic bezier point, for the token riding the cycle arcs
const qbez = (p0: [number, number], c: [number, number], p2: [number, number], t: number): [number, number] => [
  (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0],
  (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1],
];

export function RbBayesLoop() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [speed, setSpeed] = useState(0.9);
  const [measOn, setMeasOn] = useState(true);
  const [st, setSt] = useState<KF2>(KF2_INIT);

  const beatLen = 0.55 / speed;
  useRafLoop(
    (dt) => setSt((s) => (s.timer + dt >= beatLen ? kf2Advance(s, measOn) : { ...s, timer: s.timer + dt })),
    { playing: playing && inView && !reduced },
  );

  const reset = () => setSt(KF2_INIT);
  const doStep = () => setSt((s) => kf2Advance(s, measOn));

  const t = truth2(st.th);
  const tx = WC2.x + t[0] * S2;
  const ty = WC2.y - t[1] * S2;
  const ex = clamp(WC2.x + st.est[0] * S2, 315, 700);
  const ey = clamp(WC2.y - st.est[1] * S2, 160, 420);
  const err = Math.hypot(st.est[0] - t[0], st.est[1] - t[1]);

  // the real covariance ellipse: axes from the eigendecomposition of P
  const { l1, l2, ang } = eig2(st.P[0], st.P[1], st.P[2]);
  const rx = clamp(2 * Math.sqrt(l1) * S2, 3, 60); // 2σ, display-capped
  const ry = clamp(2 * Math.sqrt(l2) * S2, 3, 60);
  const angDeg = (-ang * 180) / Math.PI; // svg y is down
  const sigMax = Math.sqrt(l1);
  const drifting = !measOn && err > 0.12;

  // token rides predict→update (right arc) then update→predict (left arc)
  const prog = reduced ? 0.5 : clamp(st.timer / beatLen, 0, 1);
  const rightArc: [[number, number], [number, number], [number, number]] = [
    [PRED2.x + BW2 - 20, PRED2.y + BH2],
    [PRED2.x + BW2 + 44, (PRED2.y + UPD2.y) / 2],
    [UPD2.x + BW2 - 20, UPD2.y - BH2],
  ];
  const leftArc: [[number, number], [number, number], [number, number]] = [
    [UPD2.x - BW2 + 20, UPD2.y - BH2],
    [UPD2.x - BW2 - 44, (PRED2.y + UPD2.y) / 2],
    [PRED2.x - BW2 + 20, PRED2.y + BH2],
  ];
  const token =
    st.beat === "update" ? qbez(rightArc[0], rightArc[1], rightArc[2], prog) : qbez(leftArc[0], leftArc[1], leftArc[2], prog);
  const predictLit = st.beat === "update"; // predict just fired
  const updateLit = st.beat === "predict" && st.step > 0;

  const trailStr = st.trail
    .map(([x, y]) => `${clamp(WC2.x + x * S2, 315, 700).toFixed(1)},${clamp(WC2.y - y * S2, 160, 420).toFixed(1)}`)
    .join(" ");

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.2 · The Bayes filter loop"
      ariaLabel={`Bayes filter cycling predict and update on a real 2D Kalman filter; position error ${err.toFixed(2)} metres; measurements ${measOn ? "on" : "off"}`}
      controls={
        <>
          <Transport playing={playing} onPlay={toggle} onStep={doStep} onReset={reset} stepLabel="beat" />
          <Btn onClick={() => setMeasOn((v) => !v)} active={!measOn}>
            {measOn ? "measurements: on" : "measurements: OFF"}
          </Btn>
          <Slider label="speed" min={0.3} max={2} step={0.1} value={speed} onChange={setSpeed} fmt={(v) => `${v.toFixed(1)}×`} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "pos error", value: `${err.toFixed(2)} m`, color: drifting || err > 0.2 ? R.error : R.ink },
          { label: "σ (worst)", value: `${sigMax.toFixed(2)} m`, color: sigMax > 0.2 ? R.error : R.signal },
          { label: "beat", value: String(st.step), color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "true path", dash: true },
          { color: R.signal, label: "estimate + 2σ ellipse" },
          { color: R.plan, label: "predict beat" },
        ]}
      />

      {/* cycle arcs */}
      <path
        d={`M ${rightArc[0][0]} ${rightArc[0][1]} Q ${rightArc[1][0]} ${rightArc[1][1]} ${rightArc[2][0]} ${rightArc[2][1]}`}
        fill="none"
        stroke={R.line}
        strokeWidth={2.5}
      />
      <path
        d={`M ${leftArc[0][0]} ${leftArc[0][1]} Q ${leftArc[1][0]} ${leftArc[1][1]} ${leftArc[2][0]} ${leftArc[2][1]}`}
        fill="none"
        stroke={R.line}
        strokeWidth={2.5}
      />

      {/* PREDICT box */}
      <rect
        x={PRED2.x - BW2}
        y={PRED2.y - BH2}
        width={BW2 * 2}
        height={BH2 * 2}
        rx={12}
        fill={R.fillAmber}
        stroke={R.plan}
        strokeWidth={predictLit ? 4 : 2}
      />
      <text x={PRED2.x} y={PRED2.y - 3} textAnchor="middle" fontFamily={MONO} fontSize={16} fontWeight={600} fill={R.ink}>
        PREDICT
      </text>
      <text x={PRED2.x} y={PRED2.y + 17} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        P ← P + Q
      </text>

      {/* UPDATE box */}
      <rect
        x={UPD2.x - BW2}
        y={UPD2.y - BH2}
        width={BW2 * 2}
        height={BH2 * 2}
        rx={12}
        fill={measOn ? R.fillGreen : "#eeeeec"}
        stroke={measOn ? R.goal : R.world}
        strokeWidth={updateLit && measOn ? 4 : 2}
      />
      <text x={UPD2.x} y={UPD2.y - 3} textAnchor="middle" fontFamily={MONO} fontSize={16} fontWeight={600} fill={R.ink}>
        UPDATE
      </text>
      <text x={UPD2.x} y={UPD2.y + 17} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        {measOn ? "K = P(P+R)⁻¹" : "(disabled)"}
      </text>

      {/* traveling token */}
      {!reduced && (
        <g>
          <circle cx={token[0]} cy={token[1]} r={11} fill={st.beat === "update" ? R.plan : R.goal} opacity={0.25} />
          <circle cx={token[0]} cy={token[1]} r={5.5} fill={st.beat === "update" ? R.plan : R.goal} />
        </g>
      )}

      {/* the world: true circle, truth, estimate trail, covariance ellipse */}
      <circle cx={WC2.x} cy={WC2.y} r={S2} fill="none" stroke={R.goal} strokeWidth={2} strokeDasharray="6 6" opacity={0.55} />
      <polyline points={trailStr} fill="none" stroke={R.signal} strokeWidth={1.5} opacity={0.45} />
      <g transform={`translate(${ex} ${ey}) rotate(${angDeg.toFixed(1)})`}>
        <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={R.fillBlue} opacity={0.4} />
        <ellipse cx={0} cy={0} rx={rx} ry={ry} fill="none" stroke={drifting ? R.error : R.signal} strokeWidth={2.5} />
      </g>
      <circle cx={ex} cy={ey} r={5} fill={R.signal} />
      <circle cx={tx} cy={ty} r={5.5} fill={R.goal} />
      {drifting && svgArrow(ex, ey, tx, ty, R.error, 2, 7)}

      <text x={430} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={drifting ? R.error : R.world}>
        {measOn
          ? "predict grows the ellipse, update shrinks it — the belief breathes"
          : "dead-reckoning only: the estimate random-walks away and P grows without bound"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 5.3 · Kalman fusion: two noisy estimates make a tighter one  (sliders)
// Estimate A (blue) and B (amber) are Gaussians; the fused belief (green) is
// the actual product-of-Gaussians posterior — always tighter than both.
// ===========================================================================

const F3AX0 = 70;
const F3AX1 = 660;
const F3AXY = 340;
const f3ToPx = (p: number) => F3AX0 + (p / 6) * (F3AX1 - F3AX0);

export function RbKalmanFusion() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [muA, setMuA] = useState(3.0);
  const [muB, setMuB] = useState(3.6);
  const [sigA, setSigA] = useState(0.3);
  const [sigB, setSigB] = useState(0.2);
  // displayed (eased) copies so slider changes glide
  const [d, setD] = useState({ muA: 3.0, muB: 3.6, sigA: 0.3, sigB: 0.2 });

  useRafLoop(
    (dt) => {
      setD((s) => ({
        muA: approach(s.muA, muA, 0.22, dt),
        muB: approach(s.muB, muB, 0.22, dt),
        sigA: approach(s.sigA, sigA, 0.22, dt),
        sigB: approach(s.sigB, sigB, 0.22, dt),
      }));
    },
    { playing: inView && !reduced },
  );

  const c = reduced ? { muA, muB, sigA, sigB } : d;
  // the real closed-form product of two Gaussians
  const vA = c.sigA * c.sigA;
  const vB = c.sigB * c.sigB;
  const vF = 1 / (1 / vA + 1 / vB);
  const muF = vF * (c.muA / vA + c.muB / vB);
  const sigF = Math.sqrt(vF);
  const K = vA / (vA + vB);

  // height so tighter curves look taller (pdf peak ∝ 1/σ, display-capped)
  const hOf = (sig: number) => clamp((0.3 / sig) * 150, 40, 250);
  const sPx = (sig: number) => (sig / 6) * (F3AX1 - F3AX0);

  const fusedTighter = sigF < Math.min(c.sigA, c.sigB) - 1e-6;

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.3 · Kalman fusion: two noisy estimates make a tighter one"
      ariaLabel={`Two Gaussians A and B fused; fused mean ${muF.toFixed(2)} metres, fused sigma ${sigF.toFixed(3)} metres, Kalman gain ${K.toFixed(2)}`}
      controls={
        <>
          <Slider label="μ_A" min={0.5} max={5.5} step={0.05} value={muA} onChange={setMuA} fmt={(v) => `${v.toFixed(2)}`} />
          <Slider label="μ_B" min={0.5} max={5.5} step={0.05} value={muB} onChange={setMuB} fmt={(v) => `${v.toFixed(2)}`} />
          <Slider label="σ_A" min={0.1} max={1.2} step={0.02} value={sigA} onChange={setSigA} fmt={(v) => `${v.toFixed(2)}`} />
          <Slider label="σ_B" min={0.1} max={1.2} step={0.02} value={sigB} onChange={setSigB} fmt={(v) => `${v.toFixed(2)}`} />
          <Btn
            onClick={() => {
              setMuA(3.0);
              setMuB(3.6);
              setSigA(0.3);
              setSigB(0.2);
            }}
          >
            ↺ reset
          </Btn>
        </>
      }
    >
      {/* fixed readout lane, top (horizontal so tall bells never collide) */}
      <text x={40} y={38} fontFamily={MONO} fontSize={13} fill={R.signal} fontWeight={600}>
        σ_A = {c.sigA.toFixed(2)}
      </text>
      <text x={170} y={38} fontFamily={MONO} fontSize={13} fill={R.plan} fontWeight={600}>
        σ_B = {c.sigB.toFixed(2)}
      </text>
      <text x={300} y={38} fontFamily={MONO} fontSize={13} fill={R.goal} fontWeight={600}>
        σ_fused = {sigF.toFixed(3)}
      </text>
      <text x={470} y={38} fontFamily={MONO} fontSize={13} fill={fusedTighter ? R.goal : R.error} fontWeight={600}>
        {fusedTighter ? "✓ tighter than both" : "…"}
      </text>
      <text x={40} y={58} fontFamily={MONO} fontSize={13} fill={R.ink}>
        gain K = σ²_A/(σ²_A+σ²_B) = {K.toFixed(2)} → μ_fused = {muF.toFixed(2)} m
      </text>

      {/* axis */}
      {Array.from({ length: 7 }).map((_, i) => {
        const x = f3ToPx(i);
        return (
          <g key={i}>
            <line x1={x} y1={F3AXY} x2={x} y2={F3AXY + 6} stroke={R.line} strokeWidth={1.5} />
            <text x={x} y={F3AXY + 22} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              {i}
            </text>
          </g>
        );
      })}
      <line x1={F3AX0} y1={F3AXY} x2={F3AX1} y2={F3AXY} stroke={R.world} strokeWidth={2} />
      <text x={F3AX1} y={F3AXY + 40} textAnchor="end" fontFamily={MONO} fontSize={12} fill={R.world}>
        position (m) →
      </text>

      {/* estimate A (blue) */}
      <path
        d={gaussianPath(f3ToPx(c.muA), sPx(c.sigA), F3AXY, hOf(c.sigA), F3AX0, F3AX1)}
        fill="none"
        stroke={R.signal}
        strokeWidth={2.5}
        opacity={0.85}
      />
      {/* estimate B (amber) */}
      <path
        d={gaussianPath(f3ToPx(c.muB), sPx(c.sigB), F3AXY, hOf(c.sigB), F3AX0, F3AX1)}
        fill="none"
        stroke={R.plan}
        strokeWidth={2.5}
        opacity={0.85}
      />
      {/* fused (green, filled) */}
      <path
        d={`${gaussianPath(f3ToPx(muF), sPx(sigF), F3AXY, hOf(sigF), F3AX0, F3AX1)} L ${F3AX1} ${F3AXY} L ${F3AX0} ${F3AXY} Z`}
        fill={R.fillGreen}
        opacity={0.45}
      />
      <path
        d={gaussianPath(f3ToPx(muF), sPx(sigF), F3AXY, hOf(sigF), F3AX0, F3AX1)}
        fill="none"
        stroke={R.goal}
        strokeWidth={3}
      />
      {/* fused mean marker */}
      <line x1={f3ToPx(muF)} y1={F3AXY} x2={f3ToPx(muF)} y2={F3AXY + 10} stroke={R.goal} strokeWidth={3} />

      {/* legend, bottom lane */}
      <g fontFamily={MONO} fontSize={12}>
        <line x1={70} y1={408} x2={94} y2={408} stroke={R.signal} strokeWidth={3} />
        <text x={100} y={412} fill={R.world}>estimate A</text>
        <line x1={210} y1={408} x2={234} y2={408} stroke={R.plan} strokeWidth={3} />
        <text x={240} y={412} fill={R.world}>estimate B</text>
        <line x1={350} y1={408} x2={374} y2={408} stroke={R.goal} strokeWidth={3} />
        <text x={380} y={412} fill={R.world}>fused belief (the product)</text>
      </g>
    </Stage>
  );
}

// ===========================================================================
// Fig 5.4 · Monte Carlo Localization: a particle cloud finding itself
// A REAL particle filter over a hallway with three identical doors, run as
// three visible sub-beats: PREDICT scatters every particle through the motion
// model, REWEIGHT sets each particle's weight to its measurement likelihood
// (dot area = weight, so degeneracy is literally visible), RESAMPLE does
// seeded low-variance resampling. N_eff = 1/Σw² is computed from the actual
// weights — when it crashes, that's real degeneracy, not a script.
// ===========================================================================

const H4X0 = 60;
const H4X1 = 660;
const HALL_LEN = 10; // m
const DOORS = [2, 5, 8]; // door positions (m)
const h4ToPx = (p: number) => H4X0 + (p / HALL_LEN) * (H4X1 - H4X0);
const TRUE4 = 5.0;
const SEED4 = 0xc0ffee;
// deterministic vertical jitter per particle slot so the cloud reads as a
// cloud without per-render randomness
const JIT4: number[] = (() => {
  const rnd = mulberry32(0x1abe1);
  return Array.from({ length: 600 }, () => rnd());
})();
const PHASE_NAMES = ["predict", "reweight", "resample"] as const;

type PFPart = { x: number; w: number };
type PFState = {
  parts: PFPart[];
  truth: number;
  phase: 0 | 1 | 2; // the NEXT sub-beat to fire
  saw: boolean | null; // what the robot sensed at the last reweight
  cycle: number;
  seed: number;
  timer: number;
};

function pfInit(n: number, seed: number): PFState {
  const rnd = mulberry32(seed);
  return {
    parts: Array.from({ length: n }, () => ({ x: rnd() * HALL_LEN, w: 1 / n })),
    truth: TRUE4,
    phase: 0,
    saw: null,
    cycle: 0,
    seed: nextSeed(seed),
    timer: 0,
  };
}

function pfSubStep(s: PFState): PFState {
  const rnd = mulberry32(s.seed);
  const n = s.parts.length;
  if (s.phase === 0) {
    // PREDICT: truth and every particle move through the same noisy model
    const drive = 1.3;
    const truth = (s.truth + drive) % HALL_LEN;
    const parts = s.parts.map((p) => ({
      x: (((p.x + drive + gauss(rnd) * 0.35) % HALL_LEN) + HALL_LEN) % HALL_LEN,
      w: p.w,
    }));
    return { ...s, parts, truth, phase: 1, saw: null, seed: nextSeed(s.seed), timer: 0 };
  }
  if (s.phase === 1) {
    // REWEIGHT: weight = measurement likelihood, then normalize
    const saw = DOORS.some((dr) => Math.abs(s.truth - dr) < 0.6);
    const weighted = s.parts.map((p) => {
      const nd = Math.min(...DOORS.map((dr) => Math.abs(p.x - dr)));
      const g = Math.exp(-(nd * nd) / (2 * 0.4 * 0.4));
      const like = saw ? g + 0.03 : 1 - 0.9 * g + 0.03;
      return { x: p.x, w: p.w * like };
    });
    const sum = weighted.reduce((a, p) => a + p.w, 0) || 1;
    return { ...s, parts: weighted.map((p) => ({ x: p.x, w: p.w / sum })), phase: 2, saw, seed: nextSeed(s.seed), timer: 0 };
  }
  // RESAMPLE: seeded low-variance resampling — heavy particles get copied
  const r0 = rnd() / n;
  const next: PFPart[] = [];
  let acc = s.parts[0].w;
  let i = 0;
  for (let m = 0; m < n; m++) {
    const U = r0 + m / n;
    while (U > acc && i < n - 1) {
      i++;
      acc += s.parts[i].w;
    }
    next.push({ x: clamp(s.parts[i].x + gauss(rnd) * 0.03, 0, HALL_LEN), w: 1 / n });
  }
  return { ...s, parts: next, phase: 0, cycle: s.cycle + 1, seed: nextSeed(s.seed), timer: 0 };
}

export function RbParticleFilter() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [count, setCount] = useState(300);
  const [state, setState] = useState<PFState>(() => pfInit(300, SEED4));

  const doStep = () => setState(pfSubStep);

  useRafLoop(
    (dt) => setState((s) => (s.timer + dt >= 0.85 ? pfSubStep(s) : { ...s, timer: s.timer + dt })),
    { playing: playing && inView && !reduced },
  );

  const kidnap = () =>
    setState((s) => ({ ...pfInit(s.parts.length, (s.seed ^ 0xa5a5) >>> 0), truth: s.truth, cycle: s.cycle }));
  const reset = () => setState(pfInit(count, SEED4));
  const onCount = (v: number) => {
    setCount(v);
    setState(pfInit(v, SEED4));
  };

  const n = state.parts.length;
  const neff = 1 / state.parts.reduce((a, p) => a + p.w * p.w, 0);
  const degenerate = neff < n / 5;
  const rOf = (w: number) => clamp(2.1 * Math.sqrt(w * n), 0.8, 8);

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.4 · Monte Carlo Localization: a particle cloud finding itself"
      ariaLabel={`Particle filter over a hallway with three doors; cycle ${state.cycle}; ${n} particles; effective sample size ${Math.round(neff)}`}
      controls={
        <>
          <Transport playing={playing} onPlay={toggle} onStep={doStep} onReset={reset} stepLabel={PHASE_NAMES[state.phase]} />
          <Btn onClick={kidnap} title="re-scatter the particles uniformly">
            kidnap
          </Btn>
          <Slider label="particles" min={80} max={600} step={20} value={count} onChange={onCount} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "cycle", value: String(state.cycle), color: R.ink },
          { label: "next beat", value: PHASE_NAMES[state.phase], color: R.ink },
          { label: "N_eff", value: `${Math.round(neff)} / ${n}`, color: degenerate ? R.error : R.goal },
          { label: "sensor z", value: state.saw == null ? "—" : state.saw ? "door!" : "no door", color: R.plan },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "particle (area = weight)" },
          { color: R.goal, label: "true pose" },
          { color: R.plan, label: "door" },
        ]}
      />

      {/* hallway + doors */}
      <rect x={H4X0} y={300} width={H4X1 - H4X0} height={46} fill="#efefec" stroke={R.world} strokeWidth={2} />
      {DOORS.map((dr, i) => (
        <g key={i}>
          <rect x={h4ToPx(dr) - 14} y={300} width={28} height={46} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.5} />
          <text x={h4ToPx(dr)} y={366} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
            door
          </text>
        </g>
      ))}

      {/* the particles themselves: x = hypothesis, dot area = weight */}
      {state.parts.map((p, i) => (
        <circle
          key={i}
          cx={h4ToPx(p.x)}
          cy={120 + JIT4[i % 600] * 125}
          r={rOf(p.w)}
          fill={R.signal}
          opacity={0.5}
        />
      ))}

      {/* true pose (green) */}
      <line
        x1={h4ToPx(state.truth)}
        y1={296}
        x2={h4ToPx(state.truth)}
        y2={258}
        stroke={R.goal}
        strokeWidth={2}
        strokeDasharray="4 5"
        opacity={0.8}
      />
      <circle cx={h4ToPx(state.truth)} cy={288} r={7} fill={R.goal} />
      <text x={h4ToPx(state.truth)} y={274} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        true
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={degenerate ? R.error : R.world}>
        {degenerate
          ? "degeneracy: a few heavy particles carry all the weight — resampling rescues it"
          : "reweight swells the good guesses, resample culls the bad — watch N_eff breathe"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 5.5 · An occupancy grid filling in as the robot scans  (stepper)
// A top-down room; a robot drives a short path firing a LiDAR fan each step.
// Crossed cells accumulate log-odds toward free, terminal cells toward wall.
// Sensor-noise slider makes the emerging map crisper or fuzzier. Seeded.
// ===========================================================================

const GX0 = 190; // grid area left px
const GY0 = 40; // grid area top px
const GRID_N = 24; // cells per side
const CELL = 15; // px per cell
// true room walls, in cell coords (a rectangular room with an inner nook)
function trueOccupied(cx: number, cy: number) {
  if (cx <= 1 || cx >= GRID_N - 2 || cy <= 1 || cy >= GRID_N - 2) return true;
  if (cy >= 9 && cy <= 10 && cx >= 12 && cx <= 20) return true; // inner wall
  return false;
}
// robot path (cell coords) it walks through, one waypoint per step
const PATH5: [number, number][] = [
  [6, 6],
  [9, 7],
  [12, 8],
  [15, 13],
  [10, 15],
  [7, 12],
  [8, 8],
];
const SEED5 = 0x5eed5;

// Cast a ray through the TRUE map (pure, deterministic) — used to draw the
// scan fan honestly: rays stop where the real walls stop them.
function castRay5(rx: number, ry: number, ang: number): [number, number] {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  for (let t = 0.5; t < GRID_N * 1.5; t += 0.25) {
    const cx = Math.round(rx + dx * t);
    const cy = Math.round(ry + dy * t);
    if (cx < 0 || cy < 0 || cx >= GRID_N || cy >= GRID_N || trueOccupied(cx, cy)) {
      return [rx + dx * t, ry + dy * t];
    }
  }
  return [rx, ry];
}

type OGState = { grid: Float32Array; step: number; seed: number; timer: number };

// One scan step: fire a LiDAR fan from the current waypoint, nudge crossed
// cells toward free and terminal cells toward wall. Pure + seeded per step.
function advance5(s: OGState, noise: number): OGState {
  if (s.step >= PATH5.length) return s;
  const grid = Float32Array.from(s.grid);
  const rnd = mulberry32((s.seed + s.step * 7919) >>> 0);
  const [rx, ry] = PATH5[s.step];
  const RAYS = 60;
  for (let k = 0; k < RAYS; k++) {
    const ang = (k / RAYS) * Math.PI * 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    for (let t = 0.5; t < GRID_N; t += 0.5) {
      const cx = Math.round(rx + dx * t);
      const cy = Math.round(ry + dy * t);
      if (cx < 0 || cy < 0 || cx >= GRID_N || cy >= GRID_N) break;
      const idx = cy * GRID_N + cx;
      const occ = trueOccupied(cx, cy);
      // sensor noise: occasionally flip the reading
      const noisy = rnd() < noise * 0.4;
      const senseOcc = noisy ? !occ : occ;
      if (senseOcc) {
        grid[idx] = clamp(grid[idx] + 0.85, -6, 6); // evidence of wall
        break;
      } else {
        grid[idx] = clamp(grid[idx] - 0.45, -6, 6); // evidence of free
      }
    }
  }
  return { grid, step: s.step + 1, seed: s.seed, timer: 0 };
}

export function RbOccupancyGrid() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [noise, setNoise] = useState(0.25);
  const [state, setState] = useState<OGState>(() => ({
    // log-odds per cell, 0 = unknown (p=0.5)
    grid: new Float32Array(GRID_N * GRID_N),
    step: 0,
    seed: SEED5,
    timer: 0,
  }));

  const doStep = () => setState((s) => advance5(s, noise));

  // Auto-step inside the raf callback only (no render-time side effects).
  useRafLoop(
    (dt) => {
      setState((s) => {
        if (s.step >= PATH5.length) return s;
        const t = s.timer + dt;
        if (t >= 1.3) return advance5(s, noise);
        return { ...s, timer: t };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const reset = () =>
    setState({ grid: new Float32Array(GRID_N * GRID_N), step: 0, seed: SEED5, timer: 0 });

  const shown = state;
  const robotIdx = clamp(shown.step - 1, 0, PATH5.length - 1);
  const robot = PATH5[robotIdx];
  const known = shown.grid.reduce((a, lo) => a + (Math.abs(lo) > 0.05 ? 1 : 0), 0);
  const knownPct = Math.round((known / (GRID_N * GRID_N)) * 100);

  const cellFill = (lo: number) => {
    const p = 1 / (1 + Math.exp(-lo)); // occupancy prob
    if (Math.abs(lo) < 0.05) return "#d9d9d5"; // unknown grey
    if (p > 0.5) {
      // occupied -> amber
      const t = (p - 0.5) * 2;
      return `rgba(192,125,22,${0.15 + 0.8 * t})`;
    }
    // free -> dark
    const t = (0.5 - p) * 2;
    return `rgb(${Math.round(70 - 40 * t)},${Math.round(74 - 44 * t)},${Math.round(82 - 50 * t)})`;
  };

  const rcx = GX0 + (robot[0] + 0.5) * CELL;
  const rcy = GY0 + (robot[1] + 0.5) * CELL;

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.5 · An occupancy grid filling in as the robot scans"
      ariaLabel={`Occupancy grid; scan ${shown.step} of ${PATH5.length}; ${knownPct} percent of cells known; walls emerging from grey as the robot scans`}
      controls={
        <>
          <Transport playing={playing} onPlay={toggle} onStep={doStep} onReset={reset} stepLabel="scan" />
          <Slider label="sensor noise" min={0} max={1} step={0.05} value={noise} onChange={setNoise} fmt={(v) => v.toFixed(2)} />
        </>
      }
    >
      {/* readout + legend, fixed left lane */}
      <text x={30} y={40} fontFamily={MONO} fontSize={14} fill={R.world}>
        scan
      </text>
      <text x={90} y={40} fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
        {shown.step}/{PATH5.length}
      </text>
      <text x={30} y={62} fontFamily={MONO} fontSize={13} fill={R.world}>
        known
      </text>
      <text x={90} y={62} fontFamily={MONO} fontSize={13} fill={R.ink} fontWeight={600}>
        {knownPct}%
      </text>
      <g fontFamily={MONO} fontSize={12}>
        <rect x={30} y={96} width={16} height={16} fill="#d9d9d5" />
        <text x={54} y={109} fill={R.world}>unknown 0.5</text>
        <rect x={30} y={126} width={16} height={16} fill="rgb(40,40,42)" />
        <text x={54} y={139} fill={R.world}>free space</text>
        <rect x={30} y={156} width={16} height={16} fill="rgba(192,125,22,0.9)" />
        <text x={54} y={169} fill={R.world}>occupied</text>
        <line x1={30} y1={198} x2={46} y2={198} stroke={R.goal} strokeWidth={3} />
        <text x={54} y={202} fill={R.world}>true walls</text>
        <circle cx={38} cy={228} r={7} fill={R.signal} />
        <text x={54} y={232} fill={R.world}>robot + rays</text>
      </g>

      {/* the grid */}
      {Array.from({ length: GRID_N }).map((_, cy) =>
        Array.from({ length: GRID_N }).map((__, cx) => {
          const lo = shown.grid[cy * GRID_N + cx];
          return (
            <rect
              key={`${cx}-${cy}`}
              x={GX0 + cx * CELL}
              y={GY0 + cy * CELL}
              width={CELL}
              height={CELL}
              fill={cellFill(lo)}
            />
          );
        }),
      )}

      {/* true wall outline for reference (green) */}
      {Array.from({ length: GRID_N }).map((_, cy) =>
        Array.from({ length: GRID_N }).map((__, cx) =>
          trueOccupied(cx, cy) ? (
            <rect
              key={`t${cx}-${cy}`}
              x={GX0 + cx * CELL}
              y={GY0 + cy * CELL}
              width={CELL}
              height={CELL}
              fill="none"
              stroke={R.goal}
              strokeWidth={1}
              opacity={0.5}
            />
          ) : null,
        ),
      )}

      {/* robot + its scan fan, rays cast honestly against the true walls */}
      {shown.step > 0 &&
        Array.from({ length: 24 }).map((_, k) => {
          const ang = (k / 24) * Math.PI * 2;
          const [hx, hy] = castRay5(robot[0], robot[1], ang);
          return (
            <line
              key={k}
              x1={rcx}
              y1={rcy}
              x2={clamp(GX0 + (hx + 0.5) * CELL, GX0, GX0 + GRID_N * CELL)}
              y2={clamp(GY0 + (hy + 0.5) * CELL, GY0, GY0 + GRID_N * CELL)}
              stroke={R.signal}
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}
      <circle cx={rcx} cy={rcy} r={7} fill={R.signal} />

      <text x={30} y={424} fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "reduced motion: step the scans manually — the map still fills in"
          : "each ray votes: crossed cells → free, terminal cells → wall"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 5.6 · Loop closure snaps a drifted trajectory back into place
// (true 3D, orbitable). The robot drives a loop past landmark poles; its
// estimated trajectory (blue) is built by integrating SEEDED NOISY ODOMETRY
// (heading bias + noise per step), so the peel-away drift is real, not drawn.
// Landmarks are placed in the map from the drifted poses, so they drift too.
// "Close the loop" applies the actual pose-graph correction shape: the
// endpoint error, distributed linearly along the chain (rotation about the
// start + translation), which snaps the loop shut and drags the map with it.
// ===========================================================================

const N6 = 64;
const SEED6 = 0x51a11;

const LOOP6 = (() => {
  const rnd = mulberry32(SEED6);
  const a0 = -Math.PI / 2;
  const truePts: V3[] = Array.from({ length: N6 + 1 }, (_, i) => {
    const a = a0 + (i / N6) * Math.PI * 2;
    return [1.05 * Math.cos(a), 0.85 * Math.sin(a), 0] as V3;
  });
  const trueTh: number[] = Array.from({ length: N6 + 1 }, (_, i) => {
    const j = Math.min(i, N6 - 1);
    const d = v3.sub(truePts[j + 1], truePts[j]);
    return Math.atan2(d[1], d[0]);
  });
  // integrate noisy odometry: per-step turn noise + a small consistent bias
  const estPts: V3[] = [truePts[0]];
  const estTh: number[] = [trueTh[0]];
  for (let i = 0; i < N6; i++) {
    const d = v3.sub(truePts[i + 1], truePts[i]);
    const dist = Math.hypot(d[0], d[1]) * (1 + gauss(rnd) * 0.03);
    const dturn = angWrap(trueTh[i + 1] - trueTh[i]) + gauss(rnd) * rad(1.1) + rad(0.5);
    const th = estTh[i] + dturn;
    estTh.push(th);
    estPts.push([estPts[i][0] + dist * Math.cos(th), estPts[i][1] + dist * Math.sin(th), 0]);
  }
  // landmark poles around the loop, each mapped from the pose that saw it
  const lms = Array.from({ length: 6 }, (_, k) => {
    const a = a0 + (k / 6) * Math.PI * 2 + 0.35;
    const rr = 1.3 + rnd() * 0.25;
    const p: V3 = [rr * 1.05 * Math.cos(a), rr * 0.85 * Math.sin(a), 0.35 + rnd() * 0.4];
    const anchor = truePts.reduce(
      (best, q, i) =>
        (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < (truePts[best][0] - p[0]) ** 2 + (truePts[best][1] - p[1]) ** 2
          ? i
          : best,
      0,
    );
    return { p, anchor: Math.min(anchor, N6) };
  });
  const lmEst: V3[] = lms.map(({ p, anchor: i }) => {
    // the landmark as the drifted robot mapped it: relative observation from
    // the true pose, replayed from the estimated pose with its heading error
    const rel = [p[0] - truePts[i][0], p[1] - truePts[i][1]];
    const dth = estTh[i] - trueTh[i];
    const c = Math.cos(dth);
    const s = Math.sin(dth);
    return [estPts[i][0] + c * rel[0] - s * rel[1], estPts[i][1] + s * rel[0] + c * rel[1], p[2]] as V3;
  });
  // the endpoint error the closure must kill: est end vs est start (they are
  // the same physical place), in rotation and translation
  const thErr = angWrap(estTh[N6] - estTh[0]);
  const S = estPts[0];
  const dEnd = [estPts[N6][0] - S[0], estPts[N6][1] - S[1]];
  const cE = Math.cos(-thErr);
  const sE = Math.sin(-thErr);
  const eFull: [number, number] = [cE * dEnd[0] - sE * dEnd[1], sE * dEnd[0] + cE * dEnd[1]];
  return { truePts, estPts, lms, lmEst, thErr, eFull };
})();

// Pose-graph-style correction: fraction g = (i/N)·rel of the endpoint error
// (rotation about the start, then translation) removed from pose i.
function corrected6(p: V3, i: number, rel: number): V3 {
  const S = LOOP6.estPts[0];
  const g = (i / N6) * rel;
  const th = -g * LOOP6.thErr;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const dx = p[0] - S[0];
  const dy = p[1] - S[1];
  return [S[0] + c * dx - s * dy - g * LOOP6.eFull[0], S[1] + s * dx + c * dy - g * LOOP6.eFull[1], p[2]];
}

export function RbLoopClosure() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-32, 32);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [st, setSt] = useState({ step: 0, closed: 0, timer: 0 });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        const timer = s.timer + dt;
        const step = timer >= 0.085 && s.step < N6 ? s.step + 1 : s.step;
        const closed = s.closed > 0 && s.closed < 1 ? approach(s.closed, 1, 0.05, dt) : s.closed;
        return { step, closed, timer: step !== s.step ? 0 : timer };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const shownStep = reduced ? N6 : st.step;
  const rel = reduced ? (st.closed > 0 ? 1 : 0) : st.closed;
  const atStart = shownStep >= N6;
  const canClose = atStart && st.closed === 0;

  const closeLoop = () => {
    if (atStart) setSt((s) => (s.closed === 0 ? { ...s, closed: reduced ? 1 : 0.001 } : s));
  };
  const reset = () => {
    setSt({ step: 0, closed: 0, timer: 0 });
    orbit.reset();
  };

  const { truePts, estPts, lms, lmEst } = LOOP6;
  const cpts = estPts.map((p, i) => corrected6(p, i, rel));
  const head = cpts[shownStep];
  const trueHead = truePts[shownStep];
  const gap = Math.hypot(head[0] - trueHead[0], head[1] - trueHead[1]);
  const endGap = Math.hypot(cpts[N6][0] - cpts[0][0], cpts[N6][1] - cpts[0][1]);

  const prims: Prim3D[] = [
    ...grid3(1.6, 0.4),
    // the full true loop, faint dashed green, for reference
    ...truePts.slice(0, -1).map((p, i) => seg3(p, truePts[i + 1], R.goal, { width: 1.5, dash: "3 4", opacity: 0.55 })),
    // start marker
    dot3(truePts[0], R.goal, { r: 5 }),
    label3(truePts[0], "start", R.goal, { dx: 8, dy: 16, size: 12 }),
    // estimated (drifted → corrected) trajectory, blue
    ...cpts.slice(0, Math.max(shownStep, 1)).flatMap((p, i) => (i < shownStep ? [seg3(p, cpts[i + 1], R.signal, { width: 2.5 })] : [])),
    ...cpts.filter((_, i) => i % 4 === 0 && i <= shownStep).map((p) => dot3(p, R.signal, { r: 2.5 })),
    // landmark poles: true (grey) always; mapped (amber) once observed, with
    // a red link showing how far the drifted map placed it from reality
    ...lms.flatMap(({ p, anchor }, k) => {
      const base: V3 = [p[0], p[1], 0];
      const pole = [seg3(base, p, R.world, { width: 2 }), dot3(p, R.world, { r: 4 })];
      if (anchor > shownStep) return pole;
      const est = corrected6(lmEst[k], anchor, rel);
      return [
        ...pole,
        dot3(est, R.plan, { r: 4.5 }),
        seg3(p, est, R.error, { width: 1, dash: "2 3", opacity: 0.65 }),
      ];
    }),
    // the live drift gap while driving (red dashes, est head → true head)
    ...(gap > 0.03 ? [seg3(head, trueHead, R.error, { width: 1.5, dash: "3 3", opacity: 0.9 })] : []),
    // the loop-closure edge while it is being enforced
    ...(rel > 0 && endGap > 0.03 ? [seg3(cpts[N6], cpts[0], R.goal, { width: 3, dash: "5 4" })] : []),
    // robots: estimated (blue) and true (green ghost)
    dot3(head, R.signal, { r: 6 }),
    dot3(trueHead, R.goal, { r: 3.5 }),
  ];

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 5, zoom: 118 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.6 · Loop closure snaps a drifted trajectory back into place"
      ariaLabel={`A 3D robot trajectory drifting from truth as noisy odometry integrates; loop ${rel > 0.5 ? "closed and corrected" : "open"}; drift gap ${gap.toFixed(2)} metres. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => setSt((s) => ({ ...s, step: Math.min(s.step + 2, N6) }))}
            onReset={reset}
          />
          <Btn onClick={closeLoop} active={canClose} title={canClose ? "add the loop-closure edge" : "drive back to the start first"}>
            {st.closed > 0 ? "loop closed ✓" : "close the loop"}
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag to orbit</span>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "step", value: `${shownStep}/${N6}`, color: R.ink },
          { label: "drift gap", value: `${gap.toFixed(2)} m${rel > 0.5 ? " ✓" : ""}`, color: rel > 0.5 ? R.goal : R.error },
          { label: "loop", value: st.closed > 0 ? "closed" : "open", color: st.closed > 0 ? R.goal : R.world },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "true path", dash: true },
          { color: R.signal, label: "estimated path" },
          { color: R.world, label: "landmark (true)" },
          { color: R.plan, label: "landmark (mapped)" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={canClose ? R.error : R.world}>
        {st.closed > 0
          ? "one constraint, distributed along the chain — the whole loop and its landmarks relax at once"
          : canClose
            ? "back at the start, but the estimate isn't — close the loop"
            : "integrating noisy odometry: watch the blue path peel away from truth"}
      </text>
    </Stage>
  );
}
