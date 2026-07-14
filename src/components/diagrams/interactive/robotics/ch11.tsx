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
  Scene3D,
  useOrbit,
  Legend,
  Readout,
  Transport,
} from "./shared";

const smooth = (t: number) => t * t * (3 - 2 * t);

// ===========================================================================
// Fig 11.1 · The dreaming loop  (animated pipeline)
// Two MDP loops share one policy. Toggle whether the policy trains in reality
// (expensive, ~1 rollout/s) or inside a learned world model (~10,000/s). A
// token circulates the active loop and the figure *counts* the loops actually
// completed in each mode, so the cost asymmetry is tallied, not asserted.
// ===========================================================================

const POLICY_11 = { x: 360, y: 218 };
const REAL_NODES = [
  { id: "ACT", x: 200, y: 128, color: R.plan, sub: "command" },
  { id: "REAL WORLD", x: 112, y: 300, color: R.world, sub: "reality" },
  { id: "OBSERVE", x: 300, y: 332, color: R.signal, sub: "sense" },
];
const DREAM_NODES = [
  { id: "WORLD MODEL", x: 566, y: 150, color: R.goal, sub: "dreamed dynamics" },
  { id: "IMAGINED", x: 566, y: 322, color: R.signal, sub: "predicted state" },
];

export function RbDreamingLoop() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [dream, setDream] = useState(false);
  const [st, setSt] = useState({ phase: 0, flash: 0, real: 0, imag: 0 });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        const speed = dream ? 1.15 : 0.55;
        let p = s.phase + dt * speed;
        let flash = Math.max(0, s.flash - dt * 1.8);
        let real = s.real;
        let imag = s.imag;
        if (p >= 1) {
          p -= 1;
          if (dream) imag += 1;
          else {
            real += 1;
            flash = 1;
          }
        }
        return { phase: p, flash, real, imag };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const phase = reduced ? 0.5 : st.phase;
  const ring = dream
    ? [POLICY_11, DREAM_NODES[0], DREAM_NODES[1], POLICY_11]
    : [POLICY_11, REAL_NODES[0], REAL_NODES[1], REAL_NODES[2], POLICY_11];
  const segCount = ring.length - 1;
  const fseg = phase * segCount;
  const si = Math.min(Math.floor(fseg), segCount - 1);
  const ft = smooth(fseg - si);
  const tokenX = lerp(ring[si].x, ring[si + 1].x, ft);
  const tokenY = lerp(ring[si].y, ring[si + 1].y, ft);

  const NW = 74;
  const NH = 30;
  const box = (
    n: { id: string; x: number; y: number; color: string; sub: string },
    active: boolean,
  ) => {
    const fill =
      n.color === R.signal
        ? R.fillBlue
        : n.color === R.plan
          ? R.fillAmber
          : n.color === R.goal
            ? R.fillGreen
            : "#eeeeec";
    return (
      <g key={n.id} opacity={active ? 1 : 0.32}>
        <rect
          x={n.x - NW}
          y={n.y - NH}
          width={NW * 2}
          height={NH * 2}
          rx={11}
          fill={fill}
          stroke={n.color}
          strokeWidth={2.5}
        />
        <text x={n.x} y={n.y - 2} textAnchor="middle" fontFamily={MONO} fontSize={14} fontWeight={600} fill={R.ink}>
          {n.id}
        </text>
        <text x={n.x} y={n.y + 15} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          {n.sub}
        </text>
      </g>
    );
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.1 · The dreaming loop"
      ariaLabel={`Policy training in ${dream ? "imagination" : "reality"}: ${st.real} real rollouts and ${st.imag} imagined rollouts completed so far`}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onReset={() => setSt({ phase: 0, flash: 0, real: 0, imag: 0 })}
          />
          <Btn
            onClick={() => setDream((d) => !d)}
            active={dream}
            title="route the policy into the real world or into its own imagination"
          >
            {dream ? "training in imagination" : "training in reality"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "rollouts/sec", value: dream ? "~10,000" : "~1", color: dream ? R.goal : R.plan },
          { label: "real steps", value: String(st.real), color: st.real > 0 ? R.error : R.ink },
          { label: "dreamed", value: st.imag.toLocaleString(), color: R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "policy / command" },
          { color: R.signal, label: "state (sensed/dreamed)" },
          { color: R.goal, label: "learned world model" },
          { color: R.world, label: "the real world" },
        ]}
      />

      {/* edges: real loop (left) */}
      <g opacity={dream ? 0.28 : 1}>
        {svgArrow(POLICY_11.x - NW, POLICY_11.y - 8, REAL_NODES[0].x + 44, REAL_NODES[0].y + 22, R.line, 3, 10)}
        {svgArrow(REAL_NODES[0].x - 20, REAL_NODES[0].y + NH, REAL_NODES[1].x + 10, REAL_NODES[1].y - NH, R.line, 3, 10)}
        {svgArrow(REAL_NODES[1].x + NW, REAL_NODES[1].y + 14, REAL_NODES[2].x - NW, REAL_NODES[2].y + 4, R.line, 3, 10)}
        {svgArrow(REAL_NODES[2].x + NW - 10, REAL_NODES[2].y - NH, POLICY_11.x - 26, POLICY_11.y + NH, R.line, 3, 10)}
        <text x={86} y={212} fontFamily={MONO} fontSize={12} fill={R.world}>
          expensive, slow,
        </text>
        <text x={86} y={228} fontFamily={MONO} fontSize={12} fill={R.world}>
          one robot
        </text>
      </g>

      {/* edges: dream loop (right) */}
      <g opacity={dream ? 1 : 0.28}>
        {svgArrow(POLICY_11.x + NW, POLICY_11.y - 8, DREAM_NODES[0].x - NW, DREAM_NODES[0].y + 8, R.line, 3, 10)}
        {svgArrow(DREAM_NODES[0].x, DREAM_NODES[0].y + NH, DREAM_NODES[1].x, DREAM_NODES[1].y - NH, R.line, 3, 10)}
        {svgArrow(DREAM_NODES[1].x - NW, DREAM_NODES[1].y - 6, POLICY_11.x + NW + 4, POLICY_11.y + NH - 4, R.line, 3, 10)}
        <text x={478} y={392} fontFamily={MONO} fontSize={12} fill={R.goal}>
          cheap: thousands of dreamed rollouts
        </text>
      </g>

      {box({ id: "POLICY", x: POLICY_11.x, y: POLICY_11.y, color: R.plan, sub: "the learner" }, true)}
      {REAL_NODES.map((n) => box(n, !dream))}
      {DREAM_NODES.map((n) => box(n, dream))}

      {/* red flash: another real-world step paid for */}
      {!dream && (st.flash > 0 || reduced) && (
        <rect
          x={REAL_NODES[1].x - NW}
          y={REAL_NODES[1].y - NH}
          width={NW * 2}
          height={NH * 2}
          rx={11}
          fill="none"
          stroke={R.error}
          strokeWidth={3}
          opacity={reduced ? 0.6 : st.flash}
        />
      )}

      {/* circulating data token */}
      {!reduced && (
        <g>
          <circle cx={tokenX} cy={tokenY} r={12} fill={dream ? R.goal : R.signal} opacity={0.25} />
          <circle cx={tokenX} cy={tokenY} r={7} fill={dream ? R.goal : R.signal} />
        </g>
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {reduced
          ? "reduced motion: loops shown static — the toggle still swaps reality ↔ imagination"
          : dream
            ? "same policy, same loop — but every lap is free"
            : "every lap of the left loop costs hardware, supervision, and wall-clock time"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.2 · Dreaming in latent space vs pixel space  (real toy dynamics)
// A genuine 2-D latent space with a ground-truth vector field (a limit cycle).
// Two "learned" models = the true field plus a smooth seeded error field: the
// pixel-space model has large per-step error, the latent model small. Both
// rollouts are integrated for real; the error-vs-horizon curves on the right
// are MEASURED from those rollouts, not drawn.
// ===========================================================================

const H_MAX = 40;
const Z0: [number, number] = [1.15, 0];

function gtField(x: number, y: number): [number, number] {
  const r2 = x * x + y * y;
  return [-1.6 * y + 0.9 * (1 - r2) * x, 1.6 * x + 0.9 * (1 - r2) * y];
}

// smooth seeded error field: what the "learned" model got wrong about f.
const EPS_COEF = (() => {
  const rng = mulberry32(11);
  return Array.from({ length: 4 }, () => ({
    a: 1.5 + 2 * rng(),
    b: 1.5 + 2 * rng(),
    c: rng() * Math.PI * 2,
  }));
})();

function learnedField(x: number, y: number, amp: number): [number, number] {
  const [fx, fy] = gtField(x, y);
  const ex =
    Math.sin(EPS_COEF[0].a * x + EPS_COEF[0].b * y + EPS_COEF[0].c) +
    0.5 * Math.sin(EPS_COEF[1].a * x - EPS_COEF[1].b * y + EPS_COEF[1].c);
  const ey =
    Math.sin(EPS_COEF[2].a * x + EPS_COEF[2].b * y + EPS_COEF[2].c) +
    0.5 * Math.sin(EPS_COEF[3].a * x - EPS_COEF[3].b * y + EPS_COEF[3].c);
  return [fx + amp * ex, fy + amp * ey];
}

// midpoint-method integration of a field, H_MAX macro steps of 5 substeps.
function rollout11(field: (x: number, y: number) => [number, number]) {
  const pts: [number, number][] = [Z0];
  let x = Z0[0];
  let y = Z0[1];
  for (let k = 0; k < H_MAX; k++) {
    for (let s = 0; s < 5; s++) {
      const dt = 0.045;
      const [fx, fy] = field(x, y);
      const [mx, my] = field(x + (fx * dt) / 2, y + (fy * dt) / 2);
      x += mx * dt;
      y += my * dt;
    }
    pts.push([x, y]);
  }
  return pts;
}

const GT_ROLL = rollout11(gtField);
const PIX_ROLL = rollout11((x, y) => learnedField(x, y, 0.5));
const LAT_ROLL = rollout11((x, y) => learnedField(x, y, 0.12));
const errAt = (roll: [number, number][], k: number) =>
  Math.hypot(roll[k][0] - GT_ROLL[k][0], roll[k][1] - GT_ROLL[k][1]);
const PIX_ERR = GT_ROLL.map((_, k) => errAt(PIX_ROLL, k));
const LAT_ERR = GT_ROLL.map((_, k) => errAt(LAT_ROLL, k));
const TRUST_EPS = 0.3;
const trustHorizon = (err: number[]) => {
  const i = err.findIndex((e) => e > TRUST_EPS);
  return i < 0 ? H_MAX : i;
};
const PIX_TRUST = trustHorizon(PIX_ERR);
const LAT_TRUST = trustHorizon(LAT_ERR);

// phase-space panel mapping (clamped so nothing exits the panel)
const zx = (x: number) => clamp(200 + x * 88, 46, 354);
const zy = (y: number) => clamp(245 - y * 88, 106, 384);
// error-chart mapping
const ex11 = (k: number) => 430 + (k / H_MAX) * 260;
const ey11 = (e: number) => 330 - (clamp(e, 0, 1.55) / 1.55) * 195;

// faint glyphs of the true vector field (static, deterministic)
const FIELD_GLYPHS = (() => {
  const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const gx of [-1.28, -0.64, 0, 0.64, 1.28]) {
    for (const gy of [-1.28, -0.64, 0, 0.64, 1.28]) {
      const [fx, fy] = gtField(gx, gy);
      const l = Math.hypot(fx, fy) || 1;
      out.push({ x1: zx(gx), y1: zy(gy), x2: zx(gx + (fx / l) * 0.16), y2: zy(gy + (fy / l) * 0.16) });
    }
  }
  return out;
})();

const poly11 = (pts: [number, number][]) => pts.map(([x, y]) => `${zx(x)},${zy(y)}`).join(" ");
const polyErr = (err: number[], upTo: number) =>
  err.slice(0, upTo + 1).map((e, k) => `${ex11(k)},${ey11(e)}`).join(" ");

export function RbLatentVsPixel() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"pixel" | "latent">("pixel");
  const [playing, toggle] = useReducer((p) => !p, true);
  const [horizon, setHorizon] = useState(24);
  const [t, setT] = useState(0);

  useRafLoop(
    (dt) => setT((v) => (v + dt * 6 > horizon + 6 ? 0 : v + dt * 6)),
    { playing: playing && inView && !reduced },
  );

  const k = reduced ? horizon : clamp(Math.floor(t), 0, horizon);
  const roll = mode === "pixel" ? PIX_ROLL : LAT_ROLL;
  const err = mode === "pixel" ? PIX_ERR : LAT_ERR;
  const col = mode === "pixel" ? R.error : R.signal;
  const trust = mode === "pixel" ? PIX_TRUST : LAT_TRUST;
  const mk = roll[k];
  const gk = GT_ROLL[k];

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.2 · Dreaming in latent space vs pixel space"
      ariaLabel={`A 2D latent space where a ${mode}-quality learned model's rollout diverges from ground truth; measured error ${err[k].toFixed(2)} at step ${k} of ${horizon}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "pixel", label: "pixel-space model" },
              { id: "latent", label: "latent model" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => setT((v) => (Math.floor(v) + 1 > horizon ? 0 : Math.floor(v) + 1))}
            onReset={() => setT(0)}
          />
          <Slider label="horizon" min={5} max={H_MAX} value={horizon} onChange={setHorizon} fmt={(v) => `${v} steps`} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "model", value: mode === "pixel" ? "pixel (noisy)" : "latent (clean)", color: col },
          { label: "step", value: `${k}/${horizon}`, color: R.ink },
          { label: "error ‖ẑ−z‖", value: err[k].toFixed(2), color: err[k] > TRUST_EPS ? R.error : R.goal },
          { label: "trust horizon", value: trust >= H_MAX ? `>${H_MAX}` : `${trust} steps`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "ground truth" },
          { color: R.error, label: "pixel-model rollout" },
          { color: R.signal, label: "latent rollout" },
        ]}
      />

      {/* latent phase-space panel */}
      <rect x={40} y={100} width={320} height={290} rx={8} fill="none" stroke={R.line} strokeWidth={1.5} />
      {FIELD_GLYPHS.map((g, i) => (
        <g key={i} opacity={0.45}>
          <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={R.world} strokeWidth={1.2} />
          <circle cx={g.x2} cy={g.y2} r={1.4} fill={R.world} />
        </g>
      ))}
      <polyline points={poly11(GT_ROLL.slice(0, horizon + 1))} fill="none" stroke={R.goal} strokeWidth={2.2} opacity={0.9} />
      <polyline points={poly11(roll.slice(0, k + 1))} fill="none" stroke={col} strokeWidth={2.4} />
      {/* the measured gap at step k */}
      <line x1={zx(gk[0])} y1={zy(gk[1])} x2={zx(mk[0])} y2={zy(mk[1])} stroke={R.error} strokeWidth={1.5} strokeDasharray="3 3" />
      <circle cx={zx(gk[0])} cy={zy(gk[1])} r={5} fill={R.goal} />
      <circle cx={zx(mk[0])} cy={zy(mk[1])} r={5.5} fill={col} />
      <text x={48} y={382} fontFamily={MONO} fontSize={11.5} fill={R.world}>
        latent space z ∈ R² · arrows = true dynamics
      </text>

      {/* measured error chart */}
      <text x={430} y={120} fontFamily={MONO} fontSize={12.5} fill={R.world}>
        measured error vs horizon
      </text>
      <line x1={430} y1={330} x2={690} y2={330} stroke={R.line} strokeWidth={1.5} />
      <line x1={430} y1={130} x2={430} y2={330} stroke={R.line} strokeWidth={1.5} />
      <line x1={430} y1={ey11(TRUST_EPS)} x2={690} y2={ey11(TRUST_EPS)} stroke={R.world} strokeWidth={1} strokeDasharray="4 4" />
      <text x={434} y={ey11(TRUST_EPS) - 5} fontFamily={MONO} fontSize={10.5} fill={R.world}>
        trust threshold {TRUST_EPS}
      </text>
      <polyline points={polyErr(PIX_ERR, horizon)} fill="none" stroke={R.error} strokeWidth={2} opacity={mode === "pixel" ? 1 : 0.3} />
      <polyline points={polyErr(LAT_ERR, horizon)} fill="none" stroke={R.signal} strokeWidth={2} opacity={mode === "latent" ? 1 : 0.3} />
      <line x1={ex11(k)} y1={132} x2={ex11(k)} y2={330} stroke={R.world} strokeWidth={1} opacity={0.5} />
      <circle cx={ex11(k)} cy={ey11(err[k])} r={4.5} fill={col} />
      <text x={560} y={352} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        imagination steps →
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {mode === "pixel"
          ? `big per-step error compounds: off by ${PIX_ERR[horizon].toFixed(2)} after ${horizon} steps, trustworthy for ${PIX_TRUST}`
          : `small per-step error compounds slowly: off by ${LAT_ERR[horizon].toFixed(2)} after ${horizon} steps, trustworthy for ${LAT_TRUST >= H_MAX ? `all ${H_MAX}` : LAT_TRUST}`}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.3 · Action-conditioned video rollout  (real toy physics)
// One current frame, four candidate actions, and a strip of generated future
// frames. The block's position in every frame comes from integrating actual
// toy dynamics (force, drag, gravity) — change the action, change the future.
// ===========================================================================

type Act11 = "left" | "lift" | "right" | "none";
const ACTS: { id: Act11; label: string }[] = [
  { id: "left", label: "push left" },
  { id: "lift", label: "lift" },
  { id: "right", label: "push right" },
  { id: "none", label: "do nothing" },
];
const GOAL_X = -1.0; // metres: "move the block left of the line"

// integrate m·v̇ = F − c·v (− g up), 6 frames of 0.5 s each.
function simAction(act: Act11) {
  const frames: { x: number; z: number }[] = [{ x: 0, z: 0 }];
  let x = 0;
  let z = 0;
  let vx = 0;
  let vz = 0;
  for (let f = 1; f < 6; f++) {
    for (let s = 0; s < 10; s++) {
      const dt = 0.05;
      const Fx = act === "left" ? -1.1 : act === "right" ? 1.1 : 0;
      const Fz = act === "lift" ? 3.4 : 0;
      vx += (Fx - 1.5 * vx) * dt;
      vz += (Fz - 2.2 - 1.5 * vz) * dt;
      x += vx * dt;
      z += vz * dt;
      if (z <= 0) {
        z = 0;
        vz = 0;
      }
    }
    frames.push({ x, z });
  }
  return frames;
}
const ACT_ROLLOUTS: Record<Act11, { x: number; z: number }[]> = {
  left: simAction("left"),
  lift: simAction("lift"),
  right: simAction("right"),
  none: simAction("none"),
};

export function RbActionVideo() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [act, setAct] = useState<Act11>("left");
  const [steps, setSteps] = useState(5);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [t, setT] = useState(0);

  useRafLoop(
    (dt) => setT((v) => (v + dt * 2.4 > steps + 1.5 ? 0 : v + dt * 2.4)),
    { playing: playing && inView && !reduced },
  );

  const shown = reduced ? steps : clamp(Math.floor(t), 0, steps);
  const roll = ACT_ROLLOUTS[act];
  const last = roll[steps - 1];
  const reached = act !== "lift" && last.x <= GOAL_X;

  const curX = 64;
  const cellY = 190;
  const stripX0 = 286;
  const cellW = 60;
  const cellH = 70;
  const gap = 8;
  const SC = 16; // px per metre inside a frame

  const frameCell = (fx: number, wx: number, wz: number, on: boolean, isCur: boolean) => {
    const c = fx + cellW / 2;
    const dx = clamp(wx * SC, -24, 24);
    const dz = clamp(wz * SC, 0, 34);
    return (
      <g opacity={on ? 1 : 0.14}>
        <rect x={fx} y={cellY} width={cellW} height={cellH} rx={6} fill="#f3f3f0" stroke={R.line} strokeWidth={2} />
        <line x1={fx + 4} y1={cellY + 58} x2={fx + cellW - 4} y2={cellY + 58} stroke={R.world} strokeWidth={2} />
        {/* goal line at world x = GOAL_X */}
        <line
          x1={c + GOAL_X * SC}
          y1={cellY + 6}
          x2={c + GOAL_X * SC}
          y2={cellY + 58}
          stroke={R.goal}
          strokeWidth={1.5}
          strokeDasharray="3 3"
          opacity={0.8}
        />
        {/* gripper */}
        <rect x={c - 10} y={cellY + 8} width={20} height={11} rx={3} fill="#dcdcd8" stroke={R.world} strokeWidth={1.5} />
        {/* block, at its simulated position */}
        <rect
          x={c - 8 + dx}
          y={cellY + 42 - dz}
          width={16}
          height={15}
          rx={3}
          fill={isCur ? "#eeeeec" : R.fillBlue}
          stroke={isCur ? R.world : R.signal}
          strokeWidth={2}
        />
      </g>
    );
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.3 · Action-conditioned video rollout"
      ariaLabel={`Future frames generated by integrating toy dynamics for action ${act}; final block position ${last.x.toFixed(2)} metres`}
      controls={
        <>
          <Tabs options={ACTS} value={act} onChange={setAct} />
          <Slider label="steps" min={2} max={6} value={steps} onChange={setSteps} fmt={(v) => `${v}`} />
          <Transport playing={playing} onPlay={toggle} onReset={() => setT(0)} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "action", value: ACTS.find((a) => a.id === act)!.label, color: R.plan },
          { label: "block x, z", value: `${last.x.toFixed(2)}, ${last.z.toFixed(2)} m`, color: R.signal },
          { label: "goal x ≤ −1.0", value: reached ? "reached ✓" : "not reached", color: reached ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "predicted block" },
          { color: R.goal, label: "goal line", dash: true },
          { color: R.world, label: "gripper (fixed)" },
        ]}
      />

      <text x={curX} y={cellY - 18} fontFamily={MONO} fontSize={13} fill={R.world}>
        current frame
      </text>
      {frameCell(curX, 0, 0, true, true)}

      {svgArrow(curX + cellW + 14, cellY + 34, stripX0 - 16, cellY + 34, R.plan, 3, 10)}
      <text x={(curX + cellW + stripX0) / 2} y={cellY + 22} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={R.plan} fontWeight={600}>
        a = {act}
      </text>

      <text x={stripX0} y={cellY - 18} fontFamily={MONO} fontSize={13} fill={R.signal} fontWeight={600}>
        generated future: p(o&apos; | o, a)
      </text>
      {Array.from({ length: steps }).map((_, i) => {
        const fx = stripX0 + i * (cellW + gap);
        return (
          <g key={i}>
            {frameCell(fx, roll[i].x, roll[i].z, i < shown, false)}
            <text x={fx + cellW / 2} y={cellY + cellH + 16} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
              {i + 1}
            </text>
          </g>
        );
      })}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {act === "left"
          ? reached
            ? "push left long enough and the block crosses the goal line — the action chose this future"
            : "push left is on its way: extend the horizon and it crosses the goal line"
          : "same current frame, different action, different future — that conditioning is what makes it a world model"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.4 · Reconstruct pixels vs align embeddings  (toggle-compare)
// Two pipelines for the same frame. "reconstruct" must commit to all 196,608
// pixel values and wastes effort (red) on texture that grows with clutter;
// "align" predicts a 256-number embedding and its cost barely moves.
// ===========================================================================

const PIXELS_PER_FRAME = 256 * 256 * 3; // 196,608
const EMBED_DIM = 256;

export function RbReconstructVsAlign() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"reconstruct" | "align">("reconstruct");
  const [clutter, setClutter] = useState(40);
  const [pulse, setPulse] = useState(0);

  useRafLoop((dt) => setPulse((p) => (p + dt) % 2), {
    playing: inView && !reduced && mode === "reconstruct",
  });

  const cl = clutter / 100;
  const reconCost = 0.2 + cl * 0.75;
  const alignCost = 0.14;
  const wasted = Math.round(PIXELS_PER_FRAME * cl);
  const wasteOpacity = reduced ? cl : 0.4 + 0.6 * cl * (0.6 + 0.4 * Math.sin(pulse * Math.PI));
  const rng = mulberry32(21);
  const speck = Array.from({ length: 40 }, () => [rng(), rng()] as const);

  const pipeline = (yPos: number, label: string, isRecon: boolean, on: boolean) => {
    const boxColor = isRecon ? R.error : R.goal;
    const cost = isRecon ? reconCost : alignCost;
    return (
      <g opacity={on ? 1 : 0.3}>
        <text x={30} y={yPos - 52} fontFamily={MONO} fontSize={14} fill={boxColor} fontWeight={600}>
          {label}
        </text>
        <rect x={60} y={yPos - 34} width={70} height={68} rx={6} fill="#f3f3f0" stroke={R.line} strokeWidth={2} />
        <text x={95} y={yPos + 52} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          current
        </text>
        {svgArrow(134, yPos, 200, yPos, R.line, 3, 9)}
        <text x={167} y={yPos - 12} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          {isRecon ? "predict" : "encode+predict"}
        </text>

        {isRecon ? (
          <>
            <rect x={210} y={yPos - 34} width={70} height={68} rx={6} fill={R.fillBlue} stroke={R.signal} strokeWidth={2} />
            {on &&
              speck.slice(0, Math.round(6 + cl * 30)).map(([a, b], k) => (
                <circle key={k} cx={210 + 6 + a * 58} cy={yPos - 28 + b * 56} r={2} fill={R.error} opacity={wasteOpacity} />
              ))}
            <text x={245} y={yPos + 52} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              full future frame
            </text>
            <text x={310} y={yPos - 22} fontFamily={MONO} fontSize={12} fill={R.error}>
              must commit to all
            </text>
            <text x={310} y={yPos - 5} fontFamily={MONO} fontSize={12} fill={R.error}>
              {PIXELS_PER_FRAME.toLocaleString()} values
            </text>
          </>
        ) : (
          <>
            <rect x={210} y={yPos - 16} width={54} height={32} rx={6} fill={R.fillGreen} stroke={R.goal} strokeWidth={2} />
            {on &&
              Array.from({ length: 5 }).map((_, k) => (
                <rect key={k} x={216 + k * 9} y={yPos - 8} width={5} height={16} fill={R.signal} opacity={0.85} />
              ))}
            <text x={237} y={yPos + 40} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              future embedding
            </text>
            {svgArrow(268, yPos, 320, yPos, R.line, 3, 9)}
            <rect x={330} y={yPos - 16} width={54} height={32} rx={6} fill="#eef4ef" stroke={R.goal} strokeWidth={2} strokeDasharray="4 4" />
            <text x={357} y={yPos + 40} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
              true target
            </text>
            <text x={402} y={yPos - 8} fontFamily={MONO} fontSize={12} fill={R.goal}>
              {EMBED_DIM} numbers,
            </text>
            <text x={402} y={yPos + 9} fontFamily={MONO} fontSize={12} fill={R.goal}>
              only what decides
            </text>
          </>
        )}

        <text x={560} y={yPos - 20} fontFamily={MONO} fontSize={12} fill={R.world}>
          cost
        </text>
        <rect x={560} y={yPos - 12} width={120} height={14} rx={7} fill="#e7e7e4" />
        <rect x={560} y={yPos - 12} width={120 * clamp(cost, 0, 1)} height={14} rx={7} fill={boxColor} />
      </g>
    );
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.4 · Reconstruct pixels vs align embeddings"
      ariaLabel={`${mode} pipeline at scene clutter ${clutter} percent; a pixel frame is ${PIXELS_PER_FRAME.toLocaleString()} values versus a ${EMBED_DIM}-number embedding`}
      controls={
        <>
          <Tabs
            options={[
              { id: "reconstruct", label: "reconstruct pixels (video)" },
              { id: "align", label: "align embeddings (JEPA)" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Slider label="detail in scene" min={0} max={100} value={clutter} onChange={setClutter} fmt={(v) => `${v}%`} />
        </>
      }
    >
      <Readout
        rows={[
          {
            label: "values/step",
            value: mode === "reconstruct" ? PIXELS_PER_FRAME.toLocaleString() : String(EMBED_DIM),
            color: mode === "reconstruct" ? R.error : R.goal,
          },
          {
            label: "nuisance share",
            value: mode === "reconstruct" ? `${clutter}% (~${wasted.toLocaleString()})` : "excluded by design",
            color: mode === "reconstruct" ? R.error : R.goal,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.error, label: "wasted capacity" },
          { color: R.signal, label: "predicted content" },
          { color: R.goal, label: "decision-relevant" },
        ]}
      />

      {pipeline(160, "reconstruct: predict a full future frame", true, mode === "reconstruct")}
      {pipeline(330, "align: predict a compact future embedding", false, mode === "align")}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {mode === "reconstruct"
          ? "adding clutter balloons the pixel model's wasted effort (red) on detail it will discard"
          : "the embedding never contained the clutter, so its cost barely moves as the scene gets busier"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.5 · Domain randomization  (true 3D, orbitable)
// Nine mini-worlds on one floor: eight sampled from a seeded distribution over
// block size, mass, and friction (width set by the slider), plus the one REAL
// world in the centre. One fixed grasp policy (aperture + grip force, fit to
// the training distribution) is evaluated in every world with real statics:
// fits if aperture ≥ width, holds if F·μ ≥ m·g. Success is computed, not drawn.
// ===========================================================================

const G = 9.81;
const F_CRUSH = 18; // the gripper's force ceiling, N
const REAL_W = { W: 0.26, m: 0.59, mu: 0.4 };

type World5 = { gx: number; gy: number; W: number; m: number; mu: number; real: boolean };

function buildWorlds(seed: number, s: number): World5[] {
  const rng = mulberry32(seed * 991 + 17);
  const out: World5[] = [];
  for (let i = 0; i < 9; i++) {
    const gx = ((i % 3) - 1) * 1.18;
    const gy = (Math.floor(i / 3) - 1) * 1.18;
    if (i === 4) {
      out.push({ gx, gy, ...REAL_W, real: true });
      continue;
    }
    out.push({
      gx,
      gy,
      W: 0.2 * (1 + 0.8 * s * (2 * rng() - 1)),
      m: 0.4 * (1 + 0.9 * s * (2 * rng() - 1)),
      mu: 0.5 * (1 + 0.8 * s * (2 * rng() - 1)),
      real: false,
    });
  }
  return out;
}

export function RbDomainRandomization() {
  const { ref } = useStageVisibility();
  const orbit = useOrbit(-32, 27);
  const [strength, setStrength] = useState(70);
  const [seed, setSeed] = useState(1);
  const s = strength / 100;

  const { worlds, A, F, simOk, realOk } = useMemo(() => {
    const ws = buildWorlds(seed, s);
    const sims = ws.filter((w) => !w.real);
    const ap = 1.04 * Math.max(...sims.map((w) => w.W));
    const need = Math.max(...sims.map((w) => (w.m * G) / w.mu));
    const force = Math.min(1.1 * need, F_CRUSH);
    const ok = (w: World5) => ap >= w.W && force * w.mu >= w.m * G;
    return {
      worlds: ws,
      A: ap,
      F: force,
      simOk: sims.filter(ok).length,
      realOk: ok(ws[4]),
    };
  }, [seed, s]);

  const prims = useMemo(() => {
    const out: Prim3D[] = [];
    for (const w of worlds) {
      const ok = A >= w.W && F * w.mu >= w.m * G;
      const c = ok ? R.goal : R.error;
      const h = 0.44;
      // floor tile, coloured by measured grasp outcome
      out.push(
        seg3([w.gx - h, w.gy - h, 0], [w.gx + h, w.gy - h, 0], c, { width: 2 }),
        seg3([w.gx + h, w.gy - h, 0], [w.gx + h, w.gy + h, 0], c, { width: 2 }),
        seg3([w.gx + h, w.gy + h, 0], [w.gx - h, w.gy + h, 0], c, { width: 2 }),
        seg3([w.gx - h, w.gy + h, 0], [w.gx - h, w.gy - h, 0], c, { width: 2 }),
      );
      // the sampled block (real world's block in amber)
      const bh = w.W * 1.15;
      out.push(...box3([w.gx, w.gy, bh / 2], quat.id, w.W, w.W, bh, w.real ? R.plan : R.signal));
      // the one shared policy: two fingers spaced by the trained aperture
      out.push(
        seg3([w.gx - A / 2, w.gy, 0.36], [w.gx - A / 2, w.gy, 0.62], R.ink, { width: 3 }),
        seg3([w.gx + A / 2, w.gy, 0.36], [w.gx + A / 2, w.gy, 0.62], R.ink, { width: 3 }),
        seg3([w.gx - A / 2, w.gy, 0.62], [w.gx + A / 2, w.gy, 0.62], R.ink, { width: 3 }),
        dot3([w.gx, w.gy, 0.8], c, { r: 4 }),
      );
      if (w.real) out.push(label3([w.gx, w.gy, 1.0], "REAL", R.plan, { anchor: "middle", dy: -2 }));
    }
    return out;
  }, [worlds, A, F]);

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 6.5, zoom: 118 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.5 · Domain randomization"
      ariaLabel={`Nine 3D mini-worlds sampled at randomization ${strength} percent; the shared grasp policy succeeds in ${simOk} of 8 simulated worlds and ${realOk ? "succeeds" : "fails"} in the real one. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Slider label="randomization" min={0} max={100} value={strength} onChange={setStrength} fmt={(v) => `${v}%`} />
          <Btn onClick={() => setSeed((v) => v + 1)} title="draw a fresh batch of training worlds">
            ⏭ resample
          </Btn>
          <Btn
            onClick={() => {
              setSeed(1);
              setStrength(70);
              orbit.reset();
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag to orbit</span>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "sim success", value: `${simOk}/8 worlds`, color: simOk >= 7 ? R.goal : R.plan },
          { label: "real world", value: realOk ? "succeeds ✓" : "fails ✗", color: realOk ? R.goal : R.error },
          { label: "aperture", value: `${(A * 100).toFixed(1)} cm`, color: R.ink },
          { label: "grip force", value: `${F.toFixed(1)} N${F >= F_CRUSH - 0.01 ? " (max)" : ""}`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "sampled sim world" },
          { color: R.plan, label: "the real world" },
          { color: R.goal, label: "grasp succeeds" },
          { color: R.error, label: "grasp fails" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={realOk ? R.world : R.error}>
        {realOk
          ? "wide range: the real world is just one more sample the policy already covers"
          : "range too narrow — every sim world is easy, and the real one sticks out and fails"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.6 · NeRF ray-marching vs 3DGS splatting  (true 3D, orbitable)
// One real 3D scene (a crate and a ball). NeRF tab: a camera fires rays and
// pays many MLP queries per ray. 3DGS tab: a seeded cloud of surface-tangent
// elliptical splats reconstructs the scene; the count slider adds splats and
// a coverage metric — fraction of held-out surface points within a splat
// radius — is measured from the cloud, not asserted.
// ===========================================================================

const CRATE_C: V3 = [-0.6, 0.1, 0.25];
const CRATE_H: V3 = [0.4, 0.4, 0.25];
const BALL_C: V3 = [0.55, -0.1, 0.4];
const BALL_R = 0.4;
const SPLAT_MAX = 200;

function sampleScenePoint(rng: () => number): { p: V3; n: V3; crate: boolean } {
  if (rng() < 0.55) {
    const face = Math.floor(rng() * 5);
    const u = 2 * rng() - 1;
    const w = 2 * rng() - 1;
    const [hx, hy, hz] = CRATE_H;
    const [cx, cy, cz] = CRATE_C;
    if (face === 0) return { p: [cx + u * hx, cy + w * hy, cz + hz], n: [0, 0, 1], crate: true };
    if (face === 1) return { p: [cx + hx, cy + u * hy, cz + w * hz], n: [1, 0, 0], crate: true };
    if (face === 2) return { p: [cx - hx, cy + u * hy, cz + w * hz], n: [-1, 0, 0], crate: true };
    if (face === 3) return { p: [cx + u * hx, cy + hy, cz + w * hz], n: [0, 1, 0], crate: true };
    return { p: [cx + u * hx, cy - hy, cz + w * hz], n: [0, -1, 0], crate: true };
  }
  const z = 2 * rng() - 1;
  const phi = rng() * Math.PI * 2;
  const st = Math.sqrt(Math.max(0, 1 - z * z));
  const n: V3 = [st * Math.cos(phi), st * Math.sin(phi), z];
  return { p: v3.add(BALL_C, v3.scale(n, BALL_R)), n, crate: false };
}

const SPLAT_BASE = (() => {
  const rng = mulberry32(53);
  return Array.from({ length: SPLAT_MAX }, () => ({ ...sampleScenePoint(rng), u: rng() }));
})();
const TEST_PTS = (() => {
  const rng = mulberry32(87);
  return Array.from({ length: 150 }, () => sampleScenePoint(rng).p);
})();

const trueSceneWire = (color: string, width: number): Prim3D[] => [
  ...box3(CRATE_C, quat.id, CRATE_H[0] * 2, CRATE_H[1] * 2, CRATE_H[2] * 2, color).map((sg) => ({ ...sg, width })),
  ...ring3(BALL_C, [0, 0, 1], BALL_R, color, { n: 40, width }),
  ...ring3(BALL_C, [1, 0, 0], BALL_R, color, { n: 40, width }),
  ...ring3(BALL_C, [0, 1, 0], BALL_R, color, { n: 40, width }),
];

const CAM_PT: V3 = [1.75, -1.55, 1.05];
const RAY_TARGETS: V3[] = [
  [-0.6, 0.1, 0.5],
  [0.55, -0.1, 0.4],
  [-0.1, 0.6, 0.02],
];

export function RbNerfVsSplat() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-26, 22);
  const [mode, setMode] = useState<"nerf" | "3dgs">("3dgs");
  const [playing, toggle] = useReducer((p) => !p, true);
  const [count, setCount] = useState(96);
  const [sweep, setSweep] = useState(0);

  useRafLoop((dt) => setSweep((v) => (v + dt * 0.3) % 1), {
    playing: playing && inView && !reduced && mode === "nerf",
  });

  const rSplat = clamp(1.15 / Math.sqrt(count), 0.06, 0.26);

  const coverage = useMemo(() => {
    const splats = SPLAT_BASE.slice(0, count);
    const reach = rSplat * 1.35;
    const hit = TEST_PTS.filter((tp) =>
      splats.some((sp) => v3.len(v3.sub(tp, sp.p)) <= reach),
    ).length;
    return hit / TEST_PTS.length;
  }, [count, rSplat]);

  const prims = useMemo(() => {
    const out: Prim3D[] = [...grid3(1.3, 0.65)];
    if (mode === "3dgs") {
      out.push(...trueSceneWire(R.line, 1));
      for (const sp of SPLAT_BASE.slice(0, count)) {
        const c = sp.crate ? R.plan : R.signal;
        out.push(...ring3(sp.p, sp.n, rSplat * (0.75 + 0.5 * sp.u), c, { n: 8, width: 1.7, opacity: 0.85 }));
        out.push(dot3(sp.p, c, { r: 2 }));
      }
    } else {
      out.push(...trueSceneWire(R.world, 1.6));
      out.push(dot3(CAM_PT, R.ink, { r: 5 }));
      out.push(label3(CAM_PT, "camera", R.ink, { dx: 8, dy: -8, size: 12 }));
      for (const tgt of RAY_TARGETS) {
        out.push(seg3(CAM_PT, tgt, R.world, { width: 1, dash: "3 4", opacity: 0.8 }));
        for (let i = 0; i < 12; i++) {
          const f = 0.12 + (0.88 * i) / 11;
          const lit = reduced ? true : f <= sweep;
          out.push(dot3(v3.lerp(CAM_PT, tgt, f), lit ? R.plan : R.line, { r: lit ? 2.8 : 2 }));
        }
      }
    }
    return out;
  }, [mode, count, rSplat, sweep, reduced]);

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 5.4, zoom: 138 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.6 · NeRF ray-marching vs 3DGS splatting"
      ariaLabel={
        mode === "nerf"
          ? "A 3D scene rendered NeRF-style: rays from a camera carry many MLP sample points each. Drag to orbit."
          : `A 3D scene reconstructed by ${count} elliptical splats covering ${Math.round(coverage * 100)} percent of held-out surface points. Drag to orbit.`
      }
      svgProps={orbit.svgProps}
      controls={
        <>
          <Tabs
            options={[
              { id: "nerf", label: "NeRF" },
              { id: "3dgs", label: "3DGS" },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === "3dgs" ? (
            <Slider label="splats" min={12} max={SPLAT_MAX} step={4} value={count} onChange={setCount} fmt={(v) => `${v}`} />
          ) : (
            <Transport
              playing={playing}
              onPlay={toggle}
              onReset={() => {
                setSweep(0);
                orbit.reset();
              }}
            />
          )}
          <span className="font-mono text-[13px] text-[var(--muted)]">drag to orbit</span>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={
          mode === "nerf"
            ? [
                { label: "scene", value: "implicit MLP field", color: R.ink },
                { label: "queries/px", value: "~dozens of MLP calls", color: R.error },
                { label: "render", value: "ray-march · ~1 fps", color: R.error },
              ]
            : [
                { label: "splats", value: String(count), color: R.ink },
                { label: "coverage", value: `${Math.round(coverage * 100)}% (measured)`, color: coverage > 0.85 ? R.goal : R.plan },
                { label: "render", value: "project+blend · fast", color: R.goal },
              ]
        }
      />
      <Legend
        items={
          mode === "nerf"
            ? [
                { color: R.world, label: "scene (in weights)" },
                { color: R.plan, label: "MLP sample point" },
                { color: R.ink, label: "camera" },
              ]
            : [
                { color: R.line, label: "true surface" },
                { color: R.plan, label: "crate splats" },
                { color: R.signal, label: "ball splats" },
              ]
        }
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {mode === "nerf"
          ? "every pixel means marching a ray and querying the network at each dot — gorgeous, but slow"
          : "explicit blobs hug the true surface: more splats, higher measured coverage, and no per-ray queries"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.7 · The Real2Sim2Real loop, physics-grounded  (animated pipeline)
// The five-stage ring, with stage 3 (IDENTIFY PHYSICS) computed for real: a
// Gaussian prior over the object's centre of mass (wide when blind, tight from
// a VLM) fused with n seeded noisy interaction measurements by exact Bayesian
// updating. The belief band, the estimate, and the error are all computed.
// ===========================================================================

const RING_STAGES = [
  { id: "CAPTURE\nREAL", angle: -90 },
  { id: "BUILD\nTWIN", angle: -18 },
  { id: "IDENTIFY\nPHYSICS", angle: 54 },
  { id: "TRAIN", angle: 126 },
  { id: "DEPLOY", angle: 198 },
];

const THETA_TRUE = 0.14; // true centre-of-mass offset, m
const SIGMA_MEAS = 0.1;
// seeded standard-normal draws (Box–Muller) for the interaction measurements
const MEAS_EPS = (() => {
  const rng = mulberry32(29);
  return Array.from({ length: 12 }, () => {
    const u1 = Math.max(rng(), 1e-6);
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  });
})();

export function RbReal2Sim2Real() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [grounded, setGrounded] = useState(true);
  const [nMeas, setNMeas] = useState(6);
  const [phase, setPhase] = useState(0);

  useRafLoop((dt) => setPhase((p) => (p + dt * 0.7) % 5), {
    playing: playing && inView && !reduced,
  });

  // exact Gaussian posterior: prior (μ0, σ0) fused with n noisy measurements
  const { mu, sigma, success } = useMemo(() => {
    const mu0 = grounded ? 0.1 : 0;
    const s0 = grounded ? 0.15 : 0.45;
    const prec = 1 / (s0 * s0) + nMeas / (SIGMA_MEAS * SIGMA_MEAS);
    const ySum = MEAS_EPS.slice(0, nMeas).reduce((acc, e) => acc + (THETA_TRUE + SIGMA_MEAS * e), 0);
    const m = (mu0 / (s0 * s0) + ySum / (SIGMA_MEAS * SIGMA_MEAS)) / prec;
    const sd = Math.sqrt(1 / prec);
    return {
      mu: m,
      sigma: sd,
      success: clamp(0.96 - 1.3 * Math.abs(m - THETA_TRUE) - 0.9 * sd, 0.22, 0.96),
    };
  }, [grounded, nMeas]);

  const drad = (d: number) => (d * Math.PI) / 180;
  const cx = 250;
  const cy = 252;
  const rr = 130;
  const stagePos = (a: number) => ({ x: cx + Math.cos(drad(a)) * rr, y: cy + Math.sin(drad(a)) * rr });

  const activeStage = reduced ? 2 : Math.floor(phase);
  const tokA = reduced
    ? RING_STAGES[2].angle
    : lerp(RING_STAGES[Math.floor(phase)].angle, RING_STAGES[Math.floor(phase)].angle + 72, phase - Math.floor(phase));
  const tok = stagePos(tokA);

  // parameter axis: θ ∈ [−0.55, 0.65] m → x ∈ [500, 690]
  const px7 = (th: number) => clamp(500 + ((th + 0.55) / 1.2) * 190, 500, 690);
  const bandL = px7(mu - 2 * sigma);
  const bandR = px7(mu + 2 * sigma);

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.7 · The Real2Sim2Real loop, physics-grounded"
      ariaLabel={`Real2Sim2Real ring with ${grounded ? "a VLM prior" : "a blind prior"} and ${nMeas} interaction measurements; centre-of-mass estimate ${mu.toFixed(2)} ± ${(2 * sigma).toFixed(2)} metres against a true value of ${THETA_TRUE}`}
      controls={
        <>
          <Transport playing={playing} onPlay={toggle} onReset={() => setPhase(0)} />
          <Btn onClick={() => setGrounded((g) => !g)} active={grounded}>
            {grounded ? "VLM prior" : "blind prior"}
          </Btn>
          <Slider label="interactions" min={0} max={12} value={nMeas} onChange={setNMeas} fmt={(v) => `${v}`} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "estimate", value: `${mu.toFixed(2)} ± ${(2 * sigma).toFixed(2)} m`, color: R.plan },
          { label: "true CoM", value: `${THETA_TRUE.toFixed(2)} m`, color: R.goal },
          { label: "param error", value: `${Math.abs(mu - THETA_TRUE).toFixed(3)} m`, color: Math.abs(mu - THETA_TRUE) < 0.05 ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "belief over CoM" },
          { color: R.goal, label: "true parameter" },
          { color: R.signal, label: "active stage" },
        ]}
      />

      {/* ring backbone */}
      <circle cx={cx} cy={cy} r={rr} fill="none" stroke={R.line} strokeWidth={2} strokeDasharray="4 7" />
      {RING_STAGES.map((sg, i) => {
        const p = stagePos(sg.angle);
        const hero = i === 2;
        const on = i === activeStage;
        return (
          <g key={sg.id}>
            <rect
              x={p.x - 54}
              y={p.y - 23}
              width={108}
              height={46}
              rx={9}
              fill={hero ? R.fillGreen : on ? R.fillBlue : "#eeeeec"}
              stroke={hero ? R.goal : on ? R.signal : R.world}
              strokeWidth={hero ? 3 : 2}
            />
            {sg.id.split("\n").map((ln, k) => (
              <text key={k} x={p.x} y={p.y - 3 + k * 15} textAnchor="middle" fontFamily={MONO} fontSize={12} fontWeight={600} fill={R.ink}>
                {ln}
              </text>
            ))}
          </g>
        );
      })}
      {!reduced && (
        <>
          <circle cx={tok.x} cy={tok.y} r={11} fill={R.signal} opacity={0.25} />
          <circle cx={tok.x} cy={tok.y} r={6} fill={R.signal} />
        </>
      )}

      {/* stage-3 detail lane, right */}
      <line x1={470} y1={96} x2={470} y2={396} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={500} y={122} fontFamily={MONO} fontSize={13} fill={R.goal} fontWeight={600}>
        identify physics
      </text>
      <text x={500} y={142} fontFamily={MONO} fontSize={12} fill={R.world}>
        centre-of-mass belief (±2σ)
      </text>
      <line x1={500} y1={180} x2={690} y2={180} stroke={R.line} strokeWidth={2} />
      <rect x={bandL} y={169} width={Math.max(bandR - bandL, 2)} height={22} rx={4} fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
      <line x1={px7(mu)} y1={163} x2={px7(mu)} y2={197} stroke={R.plan} strokeWidth={2.5} />
      <line x1={px7(THETA_TRUE)} y1={158} x2={px7(THETA_TRUE)} y2={202} stroke={R.goal} strokeWidth={3} />
      <text x={px7(THETA_TRUE)} y={152} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.goal}>
        true
      </text>
      <text x={500} y={224} fontFamily={MONO} fontSize={12} fill={R.plan}>
        {grounded ? "VLM prior, narrowed by interaction" : "blind guess, narrowed by interaction"}
      </text>

      <text x={500} y={280} fontFamily={MONO} fontSize={13} fill={R.world}>
        expected transfer success
      </text>
      <rect x={500} y={292} width={190} height={16} rx={8} fill="#e7e7e4" />
      <rect x={500} y={292} width={190 * success} height={16} rx={8} fill={R.goal} />
      <text x={500} y={334} fontFamily={MONO} fontSize={15} fill={R.goal} fontWeight={600}>
        {Math.round(success * 100)}%
      </text>
      <text x={500} y={362} fontFamily={MONO} fontSize={12} fill={R.error}>
        tighter, truer physics → smaller gap
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {nMeas === 0
          ? "no interaction yet: the belief is all prior — grounded starts close, blind starts wide"
          : "each poke is a measurement; the Bayesian update tightens the band around the truth"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 11.8 · Reliability, not realism: the drift demo  (paired simulations)
// One action tape, two worlds. A PD controller tracks a planned path under the
// SIM dynamics and its commands are recorded; the identical tape then runs
// open-loop under perturbed "real" dynamics (mass, drag, motor gain, plus an
// unmodelled bias). Both trajectories are integrated for real, and the gap
// between them is measured per step — drift is computed, never drawn.
// ===========================================================================

const K8 = 140;
const DT8 = 0.05;
const GAP_TRUST = 0.3;
const START8: [number, number] = [-2.1, -0.95];
const GOAL8: [number, number] = [2.05, 0.95];
const OBST8 = { x: 0, y: 0.1, r: 0.5 };

// reference path: cubic Bézier from start to goal, dipping under the obstacle
function refPath(u: number): [number, number] {
  const t = clamp(u, 0, 1);
  const s = 1 - t;
  const P = [START8, [-0.4, -1.2], [1.4, -0.4], GOAL8] as const;
  return [
    s * s * s * P[0][0] + 3 * s * s * t * P[1][0] + 3 * s * t * t * P[2][0] + t * t * t * P[3][0],
    s * s * s * P[0][1] + 3 * s * s * t * P[1][1] + 3 * s * t * t * P[2][1] + t * t * t * P[3][1],
  ];
}

function runPair(delta: number) {
  // sim dynamics: m=1, drag c=0.7, motor gain 1.  PD-track the path, record u.
  const kp = 8;
  const kd = 4;
  const uMax = 6;
  const tape: [number, number][] = [];
  const sim: [number, number][] = [START8];
  const simState = { x: START8[0], y: START8[1], vx: 0, vy: 0 };
  for (let k = 0; k < K8; k++) {
    const tn = Math.min((k * DT8) / 6, 1);
    const tn2 = Math.min(((k + 1) * DT8) / 6, 1);
    const p = refPath(tn);
    const p2 = refPath(tn2);
    const dpx = (p2[0] - p[0]) / DT8;
    const dpy = (p2[1] - p[1]) / DT8;
    let ux = kp * (p[0] - simState.x) + kd * (dpx - simState.vx);
    let uy = kp * (p[1] - simState.y) + kd * (dpy - simState.vy);
    const ul = Math.hypot(ux, uy);
    if (ul > uMax) {
      ux = (ux / ul) * uMax;
      uy = (uy / ul) * uMax;
    }
    tape.push([ux, uy]);
    simState.vx += (ux - 0.7 * simState.vx) * DT8;
    simState.vy += (uy - 0.7 * simState.vy) * DT8;
    simState.x += simState.vx * DT8;
    simState.y += simState.vy * DT8;
    sim.push([simState.x, simState.y]);
  }
  // "real" dynamics: perturbed parameters + an unmodelled constant bias force.
  const mR = 1 + 0.8 * delta;
  const cR = 0.7 * (1 - 0.6 * delta);
  const kMotor = 1 - 0.55 * delta;
  const real: [number, number][] = [START8];
  const realState = { x: START8[0], y: START8[1], vx: 0, vy: 0 };
  for (let k = 0; k < K8; k++) {
    const [ux, uy] = tape[k];
    realState.vx += ((kMotor * ux + 0.5 * delta - cR * realState.vx) / mR) * DT8;
    realState.vy += ((kMotor * uy - 0.35 * delta - cR * realState.vy) / mR) * DT8;
    realState.x += realState.vx * DT8;
    realState.y += realState.vy * DT8;
    real.push([realState.x, realState.y]);
  }
  const gap = sim.map(([sx, sy], k) => Math.hypot(sx - real[k][0], sy - real[k][1]));
  const over = gap.findIndex((g) => g > GAP_TRUST);
  return { sim, real, gap, trust: over < 0 ? K8 : over };
}

// world → stage mapping (uniform 80 px/unit), clamped to the panel
const wx8 = (x: number) => clamp(260 + x * 80, 60, 460);
const wy8 = (y: number) => clamp(200 - y * 80, 92, 306);
const poly8 = (pts: [number, number][], upTo: number) =>
  pts.slice(0, upTo + 1).map(([x, y]) => `${wx8(x)},${wy8(y)}`).join(" ");
// gap-chart mapping
const gx8 = (k: number) => 500 + (k / K8) * 190;
const gy8 = (g: number) => 330 - (clamp(g, 0, 1) / 1) * 195;

export function RbDriftDemo() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [mismatch, setMismatch] = useState(25);
  const [grounded, setGrounded] = useState(false);
  const [t, setT] = useState(0);

  const delta = (mismatch / 100) * (grounded ? 0.2 : 1);
  const { sim, real, gap, trust } = useMemo(() => runPair(delta), [delta]);

  useRafLoop(
    (dt) => setT((v) => (v + dt * 30 > K8 + 20 ? 0 : v + dt * 30)),
    { playing: playing && inView && !reduced },
  );
  const k = reduced ? K8 : clamp(Math.floor(t), 0, K8);
  const past = k >= trust && trust < K8;

  return (
    <Stage
      innerRef={ref}
      title="Fig 11.8 · Reliability, not realism: the drift demo"
      ariaLabel={`The same action tape executed under sim and perturbed real dynamics: measured gap ${gap[k].toFixed(2)} metres at step ${k} of ${K8}, trustworthy for ${trust} steps`}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => setT((v) => clamp(Math.floor(v) + 4, 0, K8))}
            onReset={() => setT(0)}
          />
          <Slider label="dynamics mismatch" min={5} max={40} value={mismatch} onChange={setMismatch} fmt={(v) => `${v}%`} />
          <Btn onClick={() => setGrounded((g) => !g)} active={grounded}>
            {grounded ? "grounded (identified)" : "naive model"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "step", value: `${k}/${K8}`, color: R.ink },
          { label: "gap now", value: `${gap[k].toFixed(2)} m`, color: gap[k] > GAP_TRUST ? R.error : R.goal },
          { label: "trust horizon", value: trust >= K8 ? `>${K8} steps` : `${trust} steps`, color: trust >= K8 ? R.goal : R.plan },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "sim rollout (model)" },
          { color: R.goal, label: "real execution" },
          { color: R.error, label: "the gap", dash: true },
          { color: R.plan, label: "planned path", dash: true },
        ]}
      />

      {/* world panel */}
      <rect x={56} y={88} width={408} height={222} rx={8} fill="none" stroke={R.line} strokeWidth={1.5} />
      <circle cx={wx8(OBST8.x)} cy={wy8(OBST8.y)} r={OBST8.r * 80} fill="#ececea" stroke={R.world} strokeWidth={2} />
      <text x={wx8(OBST8.x)} y={wy8(OBST8.y) + 4} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        obstacle
      </text>
      <circle cx={wx8(GOAL8[0])} cy={wy8(GOAL8[1])} r={9} fill="none" stroke={R.goal} strokeWidth={2.5} />
      <text x={wx8(GOAL8[0]) - 14} y={wy8(GOAL8[1]) + 4} textAnchor="end" fontFamily={MONO} fontSize={11.5} fill={R.goal}>
        goal
      </text>
      <circle cx={wx8(START8[0])} cy={wy8(START8[1])} r={5} fill={R.ink} />
      <polyline
        points={Array.from({ length: 41 }, (_, i) => {
          const [px, py] = refPath(i / 40);
          return `${wx8(px)},${wy8(py)}`;
        }).join(" ")}
        fill="none"
        stroke={R.plan}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      <polyline points={poly8(sim, k)} fill="none" stroke={R.signal} strokeWidth={2.4} />
      <polyline points={poly8(real, k)} fill="none" stroke={R.goal} strokeWidth={2.4} />
      <line
        x1={wx8(sim[k][0])}
        y1={wy8(sim[k][1])}
        x2={wx8(real[k][0])}
        y2={wy8(real[k][1])}
        stroke={R.error}
        strokeWidth={1.8}
        strokeDasharray="3 3"
      />
      <circle cx={wx8(sim[k][0])} cy={wy8(sim[k][1])} r={5.5} fill={R.signal} />
      <circle cx={wx8(real[k][0])} cy={wy8(real[k][1])} r={5.5} fill={R.goal} />
      <text x={64} y={330} fontFamily={MONO} fontSize={11.5} fill={R.world}>
        one action tape, two worlds: sim promise vs real outcome
      </text>

      {/* measured gap chart */}
      <text x={500} y={120} fontFamily={MONO} fontSize={12.5} fill={R.world}>
        measured gap (m)
      </text>
      <line x1={500} y1={330} x2={690} y2={330} stroke={R.line} strokeWidth={1.5} />
      <line x1={500} y1={130} x2={500} y2={330} stroke={R.line} strokeWidth={1.5} />
      <line x1={500} y1={gy8(GAP_TRUST)} x2={690} y2={gy8(GAP_TRUST)} stroke={R.error} strokeWidth={1} strokeDasharray="4 4" />
      <text x={504} y={gy8(GAP_TRUST) - 5} fontFamily={MONO} fontSize={10.5} fill={R.error}>
        trust line {GAP_TRUST} m
      </text>
      <polyline
        points={gap.slice(0, k + 1).map((g, i) => `${gx8(i)},${gy8(g)}`).join(" ")}
        fill="none"
        stroke={R.error}
        strokeWidth={2}
      />
      <circle cx={gx8(k)} cy={gy8(gap[k])} r={4.5} fill={R.error} />
      {trust < K8 && (
        <line x1={gx8(trust)} y1={132} x2={gx8(trust)} y2={330} stroke={R.world} strokeWidth={1} strokeDasharray="2 4" />
      )}
      <text x={595} y={352} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        time →
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={past ? R.error : R.world} fontWeight={past ? 600 : 400}>
        {past
          ? `⚠ past step ${trust} the model's promise is off by >${GAP_TRUST} m — plans made here are fiction`
          : trust >= K8
            ? "identified dynamics keep the gap under the trust line for the whole horizon"
            : "small per-step dynamics errors compound: watch the gap curve bend upward"}
      </text>
    </Stage>
  );
}
