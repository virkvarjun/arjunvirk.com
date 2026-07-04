"use client";

import { useMemo, useReducer, useState } from "react";
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
  lerp,
  mulberry32,
} from "./shared";

// A tidy Gaussian bell as an SVG path over a horizontal axis. `peak` is the y
// of the curve top, `base` the y of the axis; taller+narrower = more certain.
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
    const x = lerp(x0, x1, i / n);
    const z = (x - mu) / sigma;
    const y = base - height * Math.exp(-0.5 * z * z);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M ${pts.join(" L ")}`;
}

// ===========================================================================
// Fig 5.1 · Belief as a Gaussian: predict widens, update sharpens  (stepper)
// A 1D belief bell over a position axis. PREDICT slides + widens it (motion
// adds doubt); UPDATE folds in a measurement so it grows taller + narrower.
// ===========================================================================

const AX0 = 70; // axis left px
const AX1 = 660; // axis right px
const AXY = 320; // axis y px
const PEAK_H = 210; // max bell height px
// belief lives in position units 0..10 m mapped across [AX0, AX1]
const posToPx = (p: number) => AX0 + (p / 10) * (AX1 - AX0);
const TRUE_POS = 6.0; // ground truth (m)

export function RbBeliefGaussian() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  // target belief (what buttons set), displayed belief (eased toward it),
  // a measurement flag, and an ambient-demo phase timer — one state object so
  // the raf loop never nests setState calls.
  const [st, setSt] = useState({
    tgtMu: 3.0,
    tgtSig: 0.9,
    mu: 3.0,
    sigma: 0.9,
    meas: null as number | null,
    phase: 0,
  });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        const mu = approach(s.mu, s.tgtMu, 0.14, dt);
        const sigma = approach(s.sigma, s.tgtSig, 0.14, dt);
        const np = s.phase + dt;
        if (np >= 2.2) {
          // alternate the two beats automatically for the ambient loop
          if (s.tgtSig > 0.85) {
            // sharpen toward the true position (update)
            return { ...s, mu, sigma, phase: 0, meas: TRUE_POS, tgtMu: lerp(s.tgtMu, TRUE_POS, 0.55), tgtSig: clamp(s.tgtSig * 0.5, 0.4, 2) };
          }
          // widen + drift (predict)
          return { ...s, mu, sigma, phase: 0, meas: null, tgtMu: clamp(s.tgtMu + 0.5, 1, 9), tgtSig: clamp(s.tgtSig * 1.9, 0.4, 2.2) };
        }
        return { ...s, mu, sigma, phase: np };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const doPredict = () =>
    setSt((s) => ({ ...s, meas: null, tgtMu: clamp(s.tgtMu + 0.9, 1, 9), tgtSig: clamp(s.tgtSig * 1.7, 0.4, 2.2) }));
  const doUpdate = () =>
    setSt((s) => {
      const m = TRUE_POS;
      // fuse belief with a fairly-sharp measurement at the true position
      const vB = s.tgtSig * s.tgtSig;
      const vM = 0.55 * 0.55;
      const vF = 1 / (1 / vB + 1 / vM);
      const muF = vF * (s.tgtMu / vB + m / vM);
      return { ...s, meas: m, tgtMu: muF, tgtSig: Math.sqrt(vF) };
    });
  const reset = () =>
    setSt({ tgtMu: 3.0, tgtSig: 0.9, mu: 3.0, sigma: 0.9, meas: null, phase: 0 });

  const cur = reduced ? { mu: st.tgtMu, sigma: st.tgtSig } : { mu: st.mu, sigma: st.sigma };
  const meas = st.meas;
  const muPx = posToPx(cur.mu);
  const sPx = (cur.sigma / 10) * (AX1 - AX0); // sigma in px
  // taller when narrower: keep area roughly constant so certainty reads visually
  const h = clamp((0.9 / cur.sigma) * 150, 60, PEAK_H);
  const path = gaussianPath(muPx, sPx, AXY, h, AX0, AX1);
  const bandL = muPx - sPx;
  const bandR = muPx + sPx;

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.1 · Belief as a Gaussian: predict widens, update sharpens"
      ariaLabel={`A 1D Gaussian belief with mean ${cur.mu.toFixed(2)} metres and sigma ${cur.sigma.toFixed(2)} metres over a position axis`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={doPredict} title="move: slides the belief and widens it">
            PREDICT (move)
          </Btn>
          <Btn onClick={doUpdate} title="measure: folds in a reading and sharpens the belief">
            UPDATE (measure)
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
        </>
      }
    >
      {/* fixed readout lane, top-left */}
      <text x={40} y={40} fontFamily={MONO} fontSize={14} fill={R.world}>
        belief
      </text>
      <text x={110} y={40} fontFamily={MONO} fontSize={14} fill={R.signal} fontWeight={600}>
        μ = {cur.mu.toFixed(2)} m
      </text>
      <text x={250} y={40} fontFamily={MONO} fontSize={14} fill={R.signal} fontWeight={600}>
        σ = {cur.sigma.toFixed(2)} m
      </text>

      {/* position axis + gridlines */}
      {Array.from({ length: 11 }).map((_, i) => {
        const x = posToPx(i);
        return (
          <g key={i}>
            <line x1={x} y1={AXY} x2={x} y2={AXY + 6} stroke={R.line} strokeWidth={1.5} />
            <text x={x} y={AXY + 22} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              {i}
            </text>
          </g>
        );
      })}
      <line x1={AX0} y1={AXY} x2={AX1} y2={AXY} stroke={R.world} strokeWidth={2} />
      <text x={AX1} y={AXY + 40} textAnchor="end" fontFamily={MONO} fontSize={12} fill={R.world}>
        position (m) →
      </text>

      {/* ±σ band */}
      <rect x={bandL} y={AXY - h} width={bandR - bandL} height={h} fill={R.fillBlue} opacity={0.5} />
      <text x={muPx} y={AXY - h - 10} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        ±σ
      </text>

      {/* belief curve */}
      <path d={path} fill="none" stroke={R.signal} strokeWidth={3} />

      {/* incoming measurement (amber) */}
      {meas != null && (
        <g>
          <line
            x1={posToPx(meas)}
            y1={AXY}
            x2={posToPx(meas)}
            y2={AXY - PEAK_H}
            stroke={R.plan}
            strokeWidth={2.5}
            strokeDasharray="5 5"
          />
          <text x={posToPx(meas)} y={AXY - PEAK_H - 6} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
            measurement
          </text>
        </g>
      )}

      {/* true position (green) */}
      <line x1={posToPx(TRUE_POS)} y1={AXY} x2={posToPx(TRUE_POS)} y2={AXY + 8} stroke={R.goal} strokeWidth={4} />
      <circle cx={posToPx(TRUE_POS)} cy={AXY + 30} r={6} fill={R.goal} />
      <text x={posToPx(TRUE_POS)} y={AXY + 52} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        true
      </text>

      {reduced && (
        <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: belief shown static. PREDICT and UPDATE still reshape it.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 5.2 · The Bayes filter loop  (animated pipeline)
// A token cycles PREDICT -> UPDATE -> PREDICT. The belief ellipse pulses wider
// on predict and tighter on update. Turn measurements off and it balloons.
// ===========================================================================

const PRED = { x: 210, y: 150 };
const UPD = { x: 510, y: 150 };
const BW = 92;
const BH = 40;

export function RbBayesLoop() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [speed, setSpeed] = useState(0.6);
  const [measOn, setMeasOn] = useState(true);
  // phase 0..2 around the loop; unc = belief spread (px radius).
  const [st, setSt] = useState({ phase: 0, unc: 40 });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let p = s.phase + dt * speed;
        let unc = s.unc;
        // predict half (0..1): grow; update half (1..2): shrink if measurements on
        const before = s.phase;
        if (before < 1) unc = clamp(unc + dt * speed * 34, 24, 190);
        else if (measOn) unc = clamp(unc - dt * speed * 40, 24, 190);
        if (p >= 2) {
          p -= 2;
          if (!measOn) unc = clamp(unc + 6, 24, 220); // runaway when uncorrected
        }
        return { phase: p, unc };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const reset = () => setSt({ phase: 0, unc: 40 });

  const unc = reduced ? 90 : st.unc;
  const half = Math.floor(st.phase) % 2; // 0 predict->update, 1 update->predict
  const f = reduced ? 0.5 : st.phase - Math.floor(st.phase);
  // token travels along the top arc (predict->update) then bottom arc back
  const tokenX = half === 0 ? lerp(PRED.x + BW, UPD.x - BW, f) : lerp(UPD.x - BW, PRED.x + BW, f);
  const tokenY = half === 0 ? PRED.y - 78 : PRED.y + 78;
  const runaway = !measOn && unc > 150;

  const activePredict = half === 0 && f < 0.5;
  const activeUpdate = half === 0 && f >= 0.5;

  const bx = 360;
  const by = 320;

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.2 · The Bayes filter loop"
      ariaLabel={`Bayes filter cycling predict and update; belief spread ${Math.round(unc)} pixels; measurements ${measOn ? "on" : "off"}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setMeasOn((v) => !v)} active={!measOn}>
            {measOn ? "measurements: on" : "measurements: OFF"}
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
          <Slider
            label="speed"
            min={0.25}
            max={1.5}
            step={0.05}
            value={speed}
            onChange={setSpeed}
            fmt={(v) => `${v.toFixed(2)}×`}
          />
        </>
      }
    >
      {/* fixed readout lane, top-left */}
      <text x={40} y={40} fontFamily={MONO} fontSize={14} fill={R.world}>
        belief uncertainty
      </text>
      <rect x={40} y={50} width={200} height={12} rx={6} fill="#e7e7e4" />
      <rect
        x={40}
        y={50}
        width={clamp(((unc - 24) / 196) * 200, 0, 200)}
        height={12}
        rx={6}
        fill={runaway ? R.error : R.signal}
      />

      {/* the two-node cycle arcs */}
      <path
        d={`M ${PRED.x + BW} ${PRED.y} C ${PRED.x + BW + 60} ${PRED.y - 90}, ${UPD.x - BW - 60} ${UPD.y - 90}, ${UPD.x - BW} ${UPD.y}`}
        fill="none"
        stroke={R.line}
        strokeWidth={2.5}
      />
      <path
        d={`M ${UPD.x - BW} ${UPD.y} C ${UPD.x - BW - 60} ${UPD.y + 90}, ${PRED.x + BW + 60} ${PRED.y + 90}, ${PRED.x + BW} ${PRED.y}`}
        fill="none"
        stroke={R.line}
        strokeWidth={2.5}
      />

      {/* PREDICT box */}
      <rect
        x={PRED.x - BW}
        y={PRED.y - BH}
        width={BW * 2}
        height={BH * 2}
        rx={12}
        fill={R.fillAmber}
        stroke={R.plan}
        strokeWidth={activePredict ? 4 : 2}
      />
      <text x={PRED.x} y={PRED.y - 4} textAnchor="middle" fontFamily={MONO} fontSize={17} fontWeight={600} fill={R.ink}>
        PREDICT
      </text>
      <text x={PRED.x} y={PRED.y + 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        motion model
      </text>

      {/* UPDATE box */}
      <rect
        x={UPD.x - BW}
        y={UPD.y - BH}
        width={BW * 2}
        height={BH * 2}
        rx={12}
        fill={measOn ? R.fillGreen : "#eeeeec"}
        stroke={measOn ? R.goal : R.world}
        strokeWidth={activeUpdate ? 4 : 2}
      />
      <text x={UPD.x} y={UPD.y - 4} textAnchor="middle" fontFamily={MONO} fontSize={17} fontWeight={600} fill={R.ink}>
        UPDATE
      </text>
      <text x={UPD.x} y={UPD.y + 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {measOn ? "measurement model" : "(disabled)"}
      </text>

      {/* traveling token */}
      {!reduced && (
        <g>
          <circle cx={tokenX} cy={tokenY} r={12} fill={half === 0 ? R.plan : R.goal} opacity={0.25} />
          <circle cx={tokenX} cy={tokenY} r={6} fill={half === 0 ? R.plan : R.goal} />
        </g>
      )}

      {/* belief ellipse, in its own lane at the bottom */}
      <ellipse cx={bx} cy={by} rx={unc} ry={unc * 0.62} fill={R.fillBlue} opacity={0.45} />
      <ellipse
        cx={bx}
        cy={by}
        rx={unc}
        ry={unc * 0.62}
        fill="none"
        stroke={runaway ? R.error : R.signal}
        strokeWidth={3}
      />
      <circle cx={bx} cy={by} r={4} fill={R.signal} />
      <text x={bx} y={by + unc * 0.62 + 20} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={runaway ? R.error : R.world}>
        {runaway ? "dead-reckoning drift — belief blowing up" : "belief (grows on predict, shrinks on update)"}
      </text>

      {reduced && (
        <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: loop shown static. Toggle measurements to size the belief.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 5.3 · Kalman fusion: two noisy estimates make a tighter one  (sliders)
// Estimate A (blue) and B (amber) are Gaussians; the fused belief (green) is
// always taller and narrower than both, pulled toward whichever is sharper.
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
  const vA = c.sigA * c.sigA;
  const vB = c.sigB * c.sigB;
  const vF = 1 / (1 / vA + 1 / vB);
  const muF = vF * (c.muA / vA + c.muB / vB);
  const sigF = Math.sqrt(vF);
  const K = vA / (vA + vB);

  // height so tighter curves look taller (fixed area feel)
  const hOf = (sig: number) => clamp((0.3 / sig) * 150, 40, 250);
  const sPx = (sig: number) => (sig / 6) * (F3AX1 - F3AX0);

  const fusedTighter = sigF < Math.min(c.sigA, c.sigB) - 1e-6;

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.3 · Kalman fusion: two noisy estimates make a tighter one"
      ariaLabel={`Two Gaussians A and B fused; fused sigma ${sigF.toFixed(3)} metres, Kalman gain ${K.toFixed(2)}`}
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
      {/* fixed readout lane, top-left */}
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
        Kalman gain K = {K.toFixed(2)}
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

      {/* legend, bottom lane */}
      <g fontFamily={MONO} fontSize={12}>
        <line x1={70} y1={408} x2={94} y2={408} stroke={R.signal} strokeWidth={3} />
        <text x={100} y={412} fill={R.world}>estimate A</text>
        <line x1={210} y1={408} x2={234} y2={408} stroke={R.plan} strokeWidth={3} />
        <text x={240} y={412} fill={R.world}>estimate B</text>
        <line x1={350} y1={408} x2={374} y2={408} stroke={R.goal} strokeWidth={3} />
        <text x={380} y={412} fill={R.world}>fused belief</text>
      </g>
    </Stage>
  );
}

// ===========================================================================
// Fig 5.4 · Monte Carlo Localization: a particle cloud finding itself (stepper)
// A 1D hallway with 3 identical doors and a hidden true pose. Steps run
// predict -> reweight -> resample; the cloud collapses from flat to a spike.
// Seeded so it is identical every load; kidnap re-scatters uniformly.
// ===========================================================================

const H4X0 = 60;
const H4X1 = 660;
const HALL_LEN = 10; // m
const DOORS = [2, 5, 8]; // door positions (m)
const h4ToPx = (p: number) => H4X0 + (p / HALL_LEN) * (H4X1 - H4X0);
const TRUE4 = 5.0; // hidden true pose start (at the middle door)

type P4 = { x: number; w: number };

function seedParticles(n: number, seed: number): P4[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, () => ({ x: rnd() * HALL_LEN, w: 1 / n }));
}

const SEED4 = 0xc0ffee;

type PFState = { parts: P4[]; truth: number; step: number; seed: number; timer: number };

// One predict -> reweight -> resample beat. Pure + seeded, so the button and
// the ambient loop share identical deterministic behaviour.
function advance4(s: PFState): PFState {
  const rnd = mulberry32(s.seed);
  // PREDICT: drive +1.3 m, scatter each particle with noise
  const drive = 1.3;
  const truth = (((s.truth + drive) % HALL_LEN) + HALL_LEN) % HALL_LEN;
  let parts = s.parts.map((p) => ({
    x: (((p.x + drive + (rnd() - 0.5) * 0.9) % HALL_LEN) + HALL_LEN) % HALL_LEN,
    w: p.w,
  }));
  // does the robot see a door here? (near any door)
  const seesDoor = DOORS.some((d) => Math.abs(truth - d) < 0.6);
  // UPDATE (reweight): particles near a door explain a door-sighting well
  parts = parts.map((p) => {
    const nearDoor = Math.min(...DOORS.map((d) => Math.abs(p.x - d)));
    const like = seesDoor
      ? Math.exp(-(nearDoor * nearDoor) / (2 * 0.4 * 0.4)) + 0.02
      : 1 - Math.exp(-(nearDoor * nearDoor) / (2 * 0.4 * 0.4)) * 0.9 + 0.02;
    return { x: p.x, w: p.w * like };
  });
  const sum = parts.reduce((a, p) => a + p.w, 0) || 1;
  parts = parts.map((p) => ({ x: p.x, w: p.w / sum }));
  // RESAMPLE: low-variance resampling, seeded
  const n = parts.length;
  const r0 = rnd() / n;
  let acc = parts[0].w;
  let i = 0;
  const next: P4[] = [];
  for (let m = 0; m < n; m++) {
    const U = r0 + m / n;
    while (U > acc && i < n - 1) {
      i++;
      acc += parts[i].w;
    }
    next.push({ x: clamp(parts[i].x + (rnd() - 0.5) * 0.05, 0, HALL_LEN), w: 1 / n });
  }
  return { parts: next, truth, step: s.step + 1, seed: (s.seed * 1664525 + 1013904223) >>> 0, timer: 0 };
}

export function RbParticleFilter() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [count, setCount] = useState(300);
  const [state, setState] = useState<PFState>(() => ({
    parts: seedParticles(300, SEED4),
    truth: TRUE4,
    step: 0,
    seed: SEED4 + 1,
    timer: 0,
  }));

  const doStep = () => setState((s) => advance4(s));

  // Auto-step entirely inside the raf callback (no render-time side effects).
  useRafLoop(
    (dt) => {
      setState((s) => {
        const t = s.timer + dt;
        if (t >= 1.4) return advance4(s);
        return { ...s, timer: t };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const kidnap = () => {
    setState((s) => ({ ...s, parts: seedParticles(count, (s.seed ^ 0xa5a5) >>> 0), timer: 0 }));
  };
  const reset = () => {
    setState({ parts: seedParticles(count, SEED4), truth: TRUE4, step: 0, seed: SEED4 + 1, timer: 0 });
  };
  const onCount = (v: number) => {
    setCount(v);
    setState((s) => ({ ...s, parts: seedParticles(v, SEED4), timer: 0 }));
  };

  // bin particles for a clean histogram-of-density read (no per-dot overlap)
  const BINS = 60;
  const bins = useMemo(() => {
    const b = new Array(BINS).fill(0);
    for (const p of state.parts) {
      const idx = clamp(Math.floor((p.x / HALL_LEN) * BINS), 0, BINS - 1);
      b[idx] += 1;
    }
    const max = Math.max(1, ...b);
    return b.map((v) => v / max);
  }, [state.parts]);

  const cloudY = 250;

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.4 · Monte Carlo Localization: a particle cloud finding itself"
      ariaLabel={`Particle filter over a hallway with three doors; step ${state.step}; ${count} particles`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={doStep}>⏭ step</Btn>
          <Btn onClick={kidnap} title="re-scatter the particles uniformly">
            kidnap
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
          <Slider label="particles" min={80} max={600} step={20} value={count} onChange={onCount} />
        </>
      }
    >
      {/* fixed readout lane, top-left */}
      <text x={40} y={40} fontFamily={MONO} fontSize={14} fill={R.world}>
        step
      </text>
      <text x={90} y={40} fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
        {state.step}
      </text>
      <text x={150} y={40} fontFamily={MONO} fontSize={14} fill={R.world}>
        predict → reweight → resample
      </text>

      {/* hallway + doors */}
      <rect x={H4X0} y={300} width={H4X1 - H4X0} height={46} fill="#efefec" stroke={R.world} strokeWidth={2} />
      {DOORS.map((d, i) => (
        <g key={i}>
          <rect x={h4ToPx(d) - 14} y={300} width={28} height={46} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.5} />
          <text x={h4ToPx(d)} y={366} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
            door
          </text>
        </g>
      ))}

      {/* particle density bins (blue, brightness = weight/density) */}
      {bins.map((v, i) => {
        const x = H4X0 + (i / BINS) * (H4X1 - H4X0);
        const w = (H4X1 - H4X0) / BINS;
        const barH = v * 150;
        return (
          <rect
            key={i}
            x={x}
            y={cloudY - barH}
            width={w - 1}
            height={barH}
            fill={R.signal}
            opacity={0.25 + 0.6 * v}
          />
        );
      })}
      <text x={H4X0} y={cloudY - 158} fontFamily={MONO} fontSize={12} fill={R.signal}>
        particle density (belief)
      </text>

      {/* true pose (green) */}
      <line x1={h4ToPx(state.truth)} y1={296} x2={h4ToPx(state.truth)} y2={cloudY - 160} stroke={R.goal} strokeWidth={2} strokeDasharray="4 5" opacity={0.7} />
      <circle cx={h4ToPx(state.truth)} cy={288} r={7} fill={R.goal} />
      <text x={h4ToPx(state.truth)} y={272} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        true pose
      </text>

      {reduced && (
        <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: cloud shown static. Step, kidnap, and reset still work.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 5.5 · An occupancy grid filling in as the robot scans  (stepper)
// A top-down room; a robot drives a short path firing a LiDAR fan each step.
// Crossed cells darken toward free, terminal cells brighten toward wall.
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

  // reduced motion: show the final map
  const shown = state;
  const robot = PATH5[Math.min(shown.step, PATH5.length - 1)];

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

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.5 · An occupancy grid filling in as the robot scans"
      ariaLabel={`Occupancy grid; step ${shown.step} of ${PATH5.length}; walls emerging from grey as the robot scans`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={doStep}>⏭ step</Btn>
          <Btn onClick={reset}>↺ reset</Btn>
          <Slider label="sensor noise" min={0} max={1} step={0.05} value={noise} onChange={setNoise} fmt={(v) => v.toFixed(2)} />
        </>
      }
    >
      {/* readout + legend, fixed left lane */}
      <text x={30} y={40} fontFamily={MONO} fontSize={14} fill={R.world}>
        step
      </text>
      <text x={82} y={40} fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
        {shown.step}/{PATH5.length}
      </text>
      <g fontFamily={MONO} fontSize={12}>
        <rect x={30} y={90} width={16} height={16} fill="#d9d9d5" />
        <text x={54} y={103} fill={R.world}>unknown 0.5</text>
        <rect x={30} y={120} width={16} height={16} fill="rgb(40,40,42)" />
        <text x={54} y={133} fill={R.world}>free space</text>
        <rect x={30} y={150} width={16} height={16} fill="rgba(192,125,22,0.9)" />
        <text x={54} y={163} fill={R.world}>occupied</text>
        <line x1={30} y1={192} x2={46} y2={192} stroke={R.goal} strokeWidth={3} />
        <text x={54} y={196} fill={R.world}>true walls</text>
        <circle cx={38} cy={222} r={7} fill={R.signal} />
        <text x={54} y={226} fill={R.world}>robot + rays</text>
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

      {/* robot + its scan fan */}
      {!reduced &&
        shown.step > 0 &&
        Array.from({ length: 16 }).map((_, k) => {
          const ang = (k / 16) * Math.PI * 2;
          const cxp = GX0 + (robot[0] + 0.5) * CELL;
          const cyp = GY0 + (robot[1] + 0.5) * CELL;
          return (
            <line
              key={k}
              x1={cxp}
              y1={cyp}
              x2={cxp + Math.cos(ang) * 70}
              y2={cyp + Math.sin(ang) * 70}
              stroke={R.signal}
              strokeWidth={1}
              opacity={0.25}
            />
          );
        })}
      <circle cx={GX0 + (robot[0] + 0.5) * CELL} cy={GY0 + (robot[1] + 0.5) * CELL} r={7} fill={R.signal} />

      {reduced && (
        <text x={30} y={300} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: step to fill in the map; the noise slider still applies.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 5.6 · Loop closure snaps a drifted trajectory back into place (stepper)
// The robot drives a loop; the estimated path (blue) peels away from the true
// path (green). Once back near the start, "close the loop" adds an edge and the
// whole trajectory relaxes onto the truth in one eased motion.
// ===========================================================================

// true loop as a rounded rectangle of waypoints (px)
const LOOP_TRUE: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const cx = 360;
  const cy = 235;
  const rx = 230;
  const ry = 140;
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
})();
// per-step drift offset applied cumulatively to the estimate (a consistent bias)
function driftedPath(upto: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= upto; i++) {
    const [x, y] = LOOP_TRUE[i];
    const f = i / (LOOP_TRUE.length - 1);
    // consistent bias: rotate + push outward, growing with progress
    const dx = f * 70 * Math.cos(f * 6.0);
    const dy = f * 46 * Math.sin(f * 5.2) + f * 22;
    out.push([x + dx, y + dy]);
  }
  return out;
}

export function RbLoopClosure() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  // step around the loop, `closed` = 0..1 relaxation, `timer` = walk cadence.
  const [st, setSt] = useState({ step: 0, closed: 0, timer: 0 });

  const maxStep = LOOP_TRUE.length - 1;
  const step = st.step;
  const closed = st.closed;
  const atStart = step >= maxStep;

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let step = s.step;
        let timer = s.timer + dt;
        if (timer >= 0.09) {
          if (step < maxStep) step += 1;
          timer = 0;
        }
        // ease the relaxation once the loop is closed
        const closed = s.closed > 0 && s.closed < 1 ? approach(s.closed, 1, 0.06, dt) : s.closed;
        return { step, closed, timer };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const closeLoop = () => {
    if (atStart) setSt((s) => (s.closed === 0 ? { ...s, closed: 0.001 } : s));
  };
  const reset = () => setSt({ step: 0, closed: 0, timer: 0 });

  const shownStep = reduced ? maxStep : step;
  const rel = reduced ? 1 : closed;
  const drift = driftedPath(shownStep);
  const truePart = LOOP_TRUE.slice(0, shownStep + 1);
  // estimated path relaxes toward truth by `rel`
  const est = drift.map(([x, y], i) => {
    const [tx, ty] = LOOP_TRUE[i];
    return [lerp(x, tx, rel), lerp(y, ty, rel)] as [number, number];
  });
  const estStr = est.map((p) => p.join(",")).join(" ");
  const trueStr = truePart.map((p) => p.join(",")).join(" ");

  const head = est[est.length - 1];
  const trueHead = LOOP_TRUE[shownStep];
  const canClose = atStart && closed === 0;
  const driftGap = Math.hypot(head[0] - trueHead[0], head[1] - trueHead[1]);

  return (
    <Stage
      innerRef={ref}
      title="Fig 5.6 · Loop closure snaps a drifted trajectory back into place"
      ariaLabel={`A robot driving a loop; estimated trajectory drifting from truth; loop ${rel > 0.5 ? "closed and corrected" : "open"}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setSt((s) => ({ ...s, step: Math.min(s.step + 2, maxStep) }))}>⏭ step</Btn>
          <Btn onClick={closeLoop} active={canClose} title={canClose ? "add the loop-closure edge" : "drive back near the start first"}>
            {rel > 0 ? "loop closed ✓" : "close the loop"}
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
        </>
      }
    >
      {/* fixed readout lane, top-left */}
      <text x={30} y={38} fontFamily={MONO} fontSize={14} fill={R.world}>
        drift gap
      </text>
      <text x={110} y={38} fontFamily={MONO} fontSize={14} fill={rel > 0.5 ? R.goal : R.error} fontWeight={600}>
        {Math.round(driftGap)} px {rel > 0.5 ? "— corrected" : ""}
      </text>

      {/* true trajectory (green) */}
      <polyline points={trueStr} fill="none" stroke={R.goal} strokeWidth={3} opacity={0.9} />
      {/* start marker */}
      <circle cx={LOOP_TRUE[0][0]} cy={LOOP_TRUE[0][1]} r={9} fill="none" stroke={R.goal} strokeWidth={3} />
      <text x={LOOP_TRUE[0][0]} y={LOOP_TRUE[0][1] - 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        start
      </text>

      {/* odometry edges (amber) between estimated nodes */}
      {est.filter((_, i) => i % 4 === 0).map((p, i, arr) => {
        if (i === arr.length - 1) return null;
        const q = arr[i + 1];
        return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={R.plan} strokeWidth={1.5} opacity={0.5} />;
      })}

      {/* estimated trajectory (blue, drifted/relaxing) */}
      <polyline points={estStr} fill="none" stroke={R.signal} strokeWidth={3} />
      {/* pose nodes */}
      {est.filter((_, i) => i % 4 === 0).map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={R.signal} />
      ))}

      {/* the drift gap arrow (red) while open */}
      {rel < 0.5 && shownStep > 2 && (
        <g opacity={0.9}>
          {svgArrow(head[0], head[1], trueHead[0], trueHead[1], R.error, 2.5, 8)}
        </g>
      )}

      {/* the loop-closure edge, highlighted */}
      {rel > 0 && (
        <line
          x1={est[est.length - 1][0]}
          y1={est[est.length - 1][1]}
          x2={LOOP_TRUE[0][0]}
          y2={LOOP_TRUE[0][1]}
          stroke={R.goal}
          strokeWidth={3.5}
          strokeDasharray="6 4"
        />
      )}

      {/* robot head */}
      <circle cx={head[0]} cy={head[1]} r={8} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />

      {/* legend, bottom lane */}
      <g fontFamily={MONO} fontSize={12}>
        <line x1={30} y1={410} x2={54} y2={410} stroke={R.goal} strokeWidth={3} />
        <text x={60} y={414} fill={R.world}>true path</text>
        <line x1={160} y1={410} x2={184} y2={410} stroke={R.signal} strokeWidth={3} />
        <text x={190} y={414} fill={R.world}>estimated (drifted)</text>
        <line x1={370} y1={410} x2={394} y2={410} stroke={R.plan} strokeWidth={2} />
        <text x={400} y={414} fill={R.world}>odometry edges</text>
      </g>

      {reduced && (
        <text x={470} y={38} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: shown corrected.
        </text>
      )}
    </Stage>
  );
}
