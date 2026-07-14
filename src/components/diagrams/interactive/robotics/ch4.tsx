"use client";

import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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
  type V3,
  type Prim3D,
  type Camera3D,
  type Seg3D,
  v3,
  quat,
  seg3,
  dot3,
  label3,
  grid3,
  triad3,
  Scene3D,
  useOrbit,
  groundDrag,
  project,
  Legend,
  Readout,
  Transport,
  svgArrow,
} from "./shared";

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const DEG = 180 / Math.PI; // converts a per-degree gain to per-radian

// ===========================================================================
// Fig 4.1 · Open-loop vs closed-loop under a disturbance  (toggle-compare)
// One rigid link (1.2 kg, pivot-mounted) asked to hold 90° — horizontal —
// measured from hanging straight down. Both modes drive the same simulated
// plant: I·θ̈ = u − (τ_arm + τ_load)·sin θ − b·θ̇, integrated per frame.
// Open-loop sends the fixed model torque τ_arm·sin 90° and never looks, so a
// 50 g load parks it ~23° low. Closed-loop (PID) senses the error and erases
// it. A strip chart records the actual trajectory of each experiment.
// ===========================================================================

const P41 = {
  I: 0.12, // link inertia about the pivot (kg·m²)
  b: 0.5, // viscous friction (N·m·s/rad)
  tauArm: 2.94, // m·g·Lc of the link itself: 1.2 kg at 0.25 m
  tauLoad: 0.25, // m·g·L of the dropped load: 50 g at the 0.5 m tip
  cmd: rad(90), // hold horizontal (90° up from hanging straight down)
  Kp: 3,
  Ki: 2.5,
  Kd: 0.6,
  uMax: 12,
};

type St41 = {
  th: number;
  w: number;
  integ: number;
  u: number;
  t: number;
  hist: { t: number; d: number }[];
};
// Start settled at the command with the integrator pre-loaded so the loop
// opens in equilibrium; the experiment is the load, not the startup.
const init41 = (): St41 => ({
  th: P41.cmd,
  w: 0,
  integ: P41.tauArm / P41.Ki,
  u: P41.tauArm,
  t: 0,
  hist: [],
});

function step41(s: St41, dt: number, mode: "open" | "closed", load: boolean): St41 {
  const n = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / n;
  let { th, w, integ, u } = s;
  const tauTot = P41.tauArm + (load ? P41.tauLoad : 0);
  for (let i = 0; i < n; i++) {
    const e = P41.cmd - th;
    if (mode === "closed") {
      integ = clamp(integ + e * h, -1.5, 1.5);
      u = clamp(P41.Kp * e + P41.Ki * integ - P41.Kd * w, -P41.uMax, P41.uMax);
    } else {
      u = P41.tauArm * Math.sin(P41.cmd); // fixed model torque, never re-measured
    }
    const acc = (u - tauTot * Math.sin(th) - P41.b * w) / P41.I;
    w += acc * h;
    th = clamp(th + w * h, rad(5), rad(150));
  }
  const t = s.t + dt;
  const last = s.hist[s.hist.length - 1];
  const hist =
    !last || t - last.t > 0.033
      ? [...s.hist, { t, d: deg(th) }].slice(-260)
      : s.hist;
  return { th, w, integ, u, t, hist };
}

// Where the open-loop arm parks under load: τ_arm·sin90° = τ_tot·sin θ.
const openSag41 = deg(Math.asin(clamp(P41.tauArm / (P41.tauArm + P41.tauLoad), 0, 1)));

const O41 = { x: 190, y: 255 };
const L41 = 150;
// θ measured from hanging straight down; +x is the swing-up direction.
const tip41 = (th: number) => ({
  x: O41.x + L41 * Math.sin(th),
  y: O41.y + L41 * Math.cos(th),
});
const PL41 = { x0: 392, x1: 688, y0: 130, y1: 300 };
const y41 = (d: number) =>
  PL41.y1 - ((clamp(d, 55, 95) - 55) / 40) * (PL41.y1 - PL41.y0);

export function RbOpenClosedLoop() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"open" | "closed">("closed");
  const [load, setLoad] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [st, setSt] = useState<St41>(init41);

  useRafLoop((dt) => setSt((s) => step41(s, dt, mode, load)), {
    playing: playing && inView && !reduced,
  });

  // static reduced-motion pose: the analytic settling angle
  const settled = mode === "closed" ? 90 : load ? openSag41 : 90;
  const thDeg = reduced ? settled : deg(st.th);
  const tip = tip41(rad(thDeg));
  const cmdTip = tip41(P41.cmd);
  const err = 90 - thDeg;
  const u = reduced ? P41.tauArm : st.u;

  // strip-chart path over the last 8 s
  const t0 = Math.max(0, st.t - 8);
  const pts = reduced
    ? [
        { t: 0, d: settled },
        { t: 8, d: settled },
      ]
    : st.hist.filter((p) => p.t >= t0);
  const path = pts
    .map((p, i) => {
      const x = PL41.x0 + ((p.t - t0) / 8) * (PL41.x1 - PL41.x0);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y41(p.d).toFixed(1)}`;
    })
    .join(" ");

  const reset = () => {
    setLoad(false);
    setSt(init41());
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.1 · Open-loop vs closed-loop under a disturbance"
      ariaLabel={`A simulated revolute joint holding 90 degrees under ${mode}-loop control; load ${load ? "on" : "off"}; error ${err.toFixed(1)} degrees. A strip chart records the angle over the last 8 seconds.`}
      controls={
        <>
          <Tabs
            options={[
              { id: "closed", label: "Closed-loop" },
              { id: "open", label: "Open-loop" },
            ]}
            value={mode}
            onChange={(v) => {
              // switching modes restarts the experiment from equilibrium
              setMode(v);
              setSt(init41());
            }}
          />
          <Btn onClick={() => setLoad((v) => !v)} active={load} title="hang a 50 g weight on the tip">
            {load ? "✓ load on" : "add load"}
          </Btn>
          <Transport playing={playing} onPlay={() => setPlaying((v) => !v)} onReset={reset} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "error", value: `${err.toFixed(1)}°`, color: Math.abs(err) > 1 ? R.error : R.goal },
          { label: "torque u", value: `${u.toFixed(2)} N·m`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "actual angle" },
          { color: R.plan, label: "command 90°", dash: true },
          { color: R.world, label: "load (50 g)" },
          { color: R.error, label: "error" },
        ]}
      />

      {/* mount: pivot on a post */}
      <line x1={O41.x} y1={O41.y} x2={O41.x} y2={395} stroke={R.world} strokeWidth={5} />
      <line x1={O41.x - 42} y1={395} x2={O41.x + 42} y2={395} stroke={R.line} strokeWidth={3} />

      {/* command pose (amber, dashed) — horizontal */}
      <line
        x1={O41.x}
        y1={O41.y}
        x2={cmdTip.x}
        y2={cmdTip.y}
        stroke={R.plan}
        strokeWidth={4}
        strokeDasharray="6 6"
        opacity={0.85}
      />
      <text x={236} y={243} fontFamily={MONO} fontSize={13} fill={R.plan}>
        command 90°
      </text>

      {/* live error arc (red) between actual and command */}
      {Math.abs(err) > 1 && (
        <path
          d={`M ${O41.x + 70 * Math.sin(rad(thDeg))} ${O41.y + 70 * Math.cos(rad(thDeg))} A 70 70 0 0 ${err > 0 ? 0 : 1} ${O41.x + 70} ${O41.y}`}
          fill="none"
          stroke={R.error}
          strokeWidth={2.5}
        />
      )}

      {/* the actual arm (blue) */}
      <line x1={O41.x} y1={O41.y} x2={tip.x} y2={tip.y} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={O41.x} cy={O41.y} r={9} fill={R.ink} />
      <circle cx={tip.x} cy={tip.y} r={8} fill={R.signal} />

      {/* the dropped load hanging off the tip */}
      {load && (
        <g>
          <line x1={tip.x} y1={tip.y} x2={tip.x} y2={tip.y + 30} stroke={R.world} strokeWidth={2} />
          <rect x={tip.x - 15} y={tip.y + 30} width={30} height={26} rx={5} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
          <text x={tip.x} y={tip.y + 47} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.ink}>
            50g
          </text>
        </g>
      )}

      {/* strip chart: angle vs time */}
      <text x={PL41.x0} y={PL41.y0 - 10} fontFamily={MONO} fontSize={12} fill={R.world}>
        angle vs time
      </text>
      <rect x={PL41.x0} y={PL41.y0} width={PL41.x1 - PL41.x0} height={PL41.y1 - PL41.y0} fill="none" stroke={R.line} strokeWidth={1.5} rx={4} />
      {[60, 70, 80, 90].map((d) => (
        <g key={d}>
          <line x1={PL41.x0} y1={y41(d)} x2={PL41.x1} y2={y41(d)} stroke={R.line} strokeWidth={0.8} opacity={0.6} />
          <text x={PL41.x0 - 8} y={y41(d) + 4} textAnchor="end" fontFamily={MONO} fontSize={11} fill={R.world}>
            {d}°
          </text>
        </g>
      ))}
      <line x1={PL41.x0} y1={y41(90)} x2={PL41.x1} y2={y41(90)} stroke={R.plan} strokeWidth={2} strokeDasharray="6 5" />
      <path d={path} fill="none" stroke={R.signal} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <text x={PL41.x1} y={PL41.y1 + 18} textAnchor="end" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        last 8 s →
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={mode === "open" && load ? R.error : R.world}>
        {mode === "open"
          ? load
            ? `a 50 g load sags the arm ${(90 - openSag41).toFixed(0)}° — the fixed command never notices`
            : "open-loop: torque computed once from the model, never re-measured — now add the load"
          : load
            ? "closed-loop: the sensed error drives extra torque until the gap is erased"
            : "closed-loop: holding 90° by continuously re-measuring — add the load and watch it recover"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 4.2 · P vs PI: steady-state error appears, then dies  (slider-driven)
// A real discrete step response: I·θ̈ = K_p·e + K_i·∫e − d − b·θ̇ integrated
// at 4 ms from 60° to a 90° setpoint against a constant 8 N·m gravity torque.
// P-only parks at exactly e_ss = d/K_p (the chapter's 8/K_p number, measured
// off the trace); raising K_i walks the tail up to the line. Overshoot and
// settling time are computed from the simulated trace, not asserted.
// ===========================================================================

const S42 = { I: 4, b: 40, T: 6, dt: 0.004, every: 12, sp: 90, start: 60, dist: 8 };

function sim42(KpDeg: number, KiDeg: number, gravityOn: boolean) {
  const Kp = KpDeg * DEG;
  const Ki = KiDeg * DEG;
  const d = gravityOn ? S42.dist : 0;
  const spR = rad(S42.sp);
  const steps = Math.round(S42.T / S42.dt);
  const pts: { t: number; d: number }[] = [{ t: 0, d: S42.start }];
  let th = rad(S42.start);
  let w = 0;
  let integ = 0;
  for (let i = 1; i <= steps; i++) {
    const e = spR - th;
    integ += e * S42.dt;
    const u = Kp * e + Ki * integ;
    const acc = (u - d - S42.b * w) / S42.I;
    w += acc * S42.dt;
    th += w * S42.dt;
    if (i % S42.every === 0) pts.push({ t: i * S42.dt, d: deg(th) });
  }
  return pts;
}

function metrics42(pts: { t: number; d: number }[]) {
  const tail = pts.slice(-8);
  const final = tail.reduce((s, p) => s + p.d, 0) / tail.length;
  const peak = Math.max(...pts.map((p) => p.d));
  const overshoot = Math.max(0, peak - S42.sp);
  // settling: the last time the trace sits outside the ±2° band of the setpoint
  const lastOut = pts.reduce((acc, p, i) => (Math.abs(p.d - S42.sp) > 2 ? i : acc), -1);
  const settle = lastOut < 0 ? 0 : lastOut >= pts.length - 1 ? null : pts[lastOut + 1].t;
  return { final, ssErr: S42.sp - final, overshoot, settle };
}

const P42 = { x0: 96, x1: 688, y0: 96, y1: 356 };
const y42 = (d: number) =>
  P42.y1 - ((clamp(d, 35, 105) - 35) / 70) * (P42.y1 - P42.y0);
const x42 = (t: number) => P42.x0 + (t / S42.T) * (P42.x1 - P42.x0);

export function RbPvsPI() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [Kp, setKp] = useState(1.5);
  const [Ki, setKi] = useState(0);
  const [gravity, setGravity] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [prog, setProg] = useState(0); // 0..1 time sweep across the 6 s trace

  useRafLoop((dt) => setProg((p) => Math.min(1, p + dt / 4)), {
    playing: playing && inView && !reduced && prog < 1,
  });
  const sweep = reduced ? 1 : prog;

  const pts = useMemo(() => sim42(Kp, Ki, gravity), [Kp, Ki, gravity]);
  const ghost = useMemo(() => sim42(Kp, 0, gravity), [Kp, gravity]);
  const m = metrics42(pts);

  const shown = pts.slice(0, Math.max(2, Math.ceil(pts.length * sweep)));
  const toPath = (ps: { t: number; d: number }[]) =>
    ps.map((p, i) => `${i === 0 ? "M" : "L"} ${x42(p.t).toFixed(1)} ${y42(p.d).toFixed(1)}`).join(" ");
  const head = shown[shown.length - 1];
  const ySet = y42(S42.sp);
  const ySettle = y42(m.final);
  const done = sweep >= 0.98;
  const restart = () => {
    setProg(0);
    setPlaying(true);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.2 · P vs PI: steady-state error appears, then dies"
      ariaLabel={`Simulated step response under a constant gravity torque with Kp ${Kp.toFixed(1)} and Ki ${Ki.toFixed(2)}; measured steady-state error ${m.ssErr.toFixed(1)} degrees`}
      controls={
        <>
          <Transport playing={playing} onPlay={() => setPlaying((v) => !v)} onReset={restart} stepLabel="replay" />
          <Slider label="Kp" min={0.4} max={4} step={0.1} value={Kp} onChange={(v) => { setKp(v); restart(); }} fmt={(v) => v.toFixed(1)} />
          <Slider label="Ki" min={0} max={1.2} step={0.05} value={Ki} onChange={(v) => { setKi(v); restart(); }} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => { setGravity((g) => !g); restart(); }} active={gravity}>
            {gravity ? "✓ gravity (8 N·m)" : "gravity (8 N·m)"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "steady error", value: `${m.ssErr > 0.05 ? m.ssErr.toFixed(1) : "0.0"}°`, color: m.ssErr > 0.5 ? R.error : R.goal },
          { label: "overshoot", value: m.overshoot > 0.3 ? `${((m.overshoot / 30) * 100).toFixed(0)}%` : "0%", color: R.ink },
          { label: "settle ±2°", value: m.settle == null ? "never" : `${m.settle.toFixed(1)} s`, color: m.settle == null ? R.error : R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "response" },
          ...(Ki > 0.02 ? [{ color: R.world, label: "P-only, same Kp", dash: true }] : []),
          { color: R.plan, label: "setpoint 90°", dash: true },
        ]}
      />

      {/* axes + grid */}
      <rect x={P42.x0} y={P42.y0} width={P42.x1 - P42.x0} height={P42.y1 - P42.y0} fill="none" stroke={R.line} strokeWidth={1.5} rx={4} />
      {[40, 50, 60, 70, 80, 90, 100].map((d) => (
        <g key={d}>
          <line x1={P42.x0} y1={y42(d)} x2={P42.x1} y2={y42(d)} stroke={R.line} strokeWidth={0.8} opacity={0.5} />
          <text x={P42.x0 - 8} y={y42(d) + 4} textAnchor="end" fontFamily={MONO} fontSize={11} fill={R.world}>
            {d}°
          </text>
        </g>
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((t) => (
        <g key={t}>
          <line x1={x42(t)} y1={P42.y0} x2={x42(t)} y2={P42.y1} stroke={R.line} strokeWidth={0.8} opacity={0.4} />
          <text x={x42(t)} y={P42.y1 + 18} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
            {t === 6 ? "6 s" : t}
          </text>
        </g>
      ))}

      {/* setpoint line */}
      <line x1={P42.x0} y1={ySet} x2={P42.x1} y2={ySet} stroke={R.plan} strokeWidth={2.5} strokeDasharray="7 6" />

      {/* steady-state gap: shaded red while it persists, green check once closed */}
      {done && m.ssErr > 0.5 && (
        <>
          <rect x={P42.x1 - 150} y={ySet} width={150} height={Math.max(0, ySettle - ySet)} fill={R.fillRed} opacity={0.7} />
          <text x={P42.x1 - 156} y={(ySet + ySettle) / 2 + 4} textAnchor="end" fontFamily={MONO} fontSize={13} fill={R.error}>
            steady-state error {m.ssErr.toFixed(1)}°
          </text>
        </>
      )}
      {done && m.ssErr <= 0.5 && Ki > 0.02 && (
        <text x={P42.x1 - 8} y={ySet + 20} textAnchor="end" fontFamily={MONO} fontSize={13} fill={R.goal}>
          ✓ gap closed by I
        </text>
      )}

      {/* P-only reference when I is active */}
      {Ki > 0.02 && (
        <path d={toPath(ghost)} fill="none" stroke={R.world} strokeWidth={2} strokeDasharray="5 5" opacity={0.7} />
      )}

      {/* the live response */}
      <path d={toPath(shown)} fill="none" stroke={R.signal} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {!reduced && sweep < 1 && head && <circle cx={x42(head.t)} cy={y42(head.d)} r={4.5} fill={R.signal} />}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {gravity
          ? `P needs error to make effort: predicted gap = 8 / Kp = ${(8 / Kp).toFixed(1)}° · ${Ki > 0.02 ? "I walks the tail up to the line" : "raise Ki to close it"}`
          : "no disturbance, no steady-state error — toggle gravity to bring the villain back"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 4.3 · Tuning PID: the full interactive controller  (slider-driven sim)
// The live loop: I·θ̈ = sat(K_p·e + K_i·∫e − K_d·θ̇) − m·g·Lc·cos θ − b·θ̇,
// integrated per frame at ≤4 ms substeps, with torque saturation, clamped
// integrator, optional conditional-integration anti-windup, and a "hold the
// arm" block for the windup demo. Overshoot, settling time and the damping
// regime are measured from the recorded trace of the current step.
// ===========================================================================

const C43 = { I: 4, b: 12, uMax: 30, A: 10 }; // A = m·g·Lc of the link (N·m)
const O43 = { x: 320, y: 185 };
const L43 = 110;
// θ from horizontal, counterclockwise positive (90° = straight up)
const arm43 = (th: number) => ({
  x: O43.x + L43 * Math.cos(th),
  y: O43.y - L43 * Math.sin(th),
});
const EP = { x0: 90, x1: 688, y0: 300, y1: 402 };

const startDeg43 = (sp: number) => clamp(sp - 60, -15, 150);

type St43 = {
  th: number;
  w: number;
  integ: number;
  u: number;
  t: number;
  hist: { t: number; e: number }[];
};
const init43 = (sp: number): St43 => ({
  th: rad(startDeg43(sp)),
  w: 0,
  integ: 0,
  u: 0,
  t: 0,
  hist: [],
});

type Par43 = {
  KpR: number;
  KiR: number;
  KdR: number;
  spR: number;
  grav: boolean;
  aw: boolean;
  hold: boolean;
  holdR: number;
};

function step43(s: St43, dt: number, p: Par43): St43 {
  const n = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / n;
  let { th, w, integ, u } = s;
  for (let i = 0; i < n; i++) {
    const e = p.spR - th;
    const u0 = p.KpR * e + p.KiR * integ - p.KdR * w;
    // conditional integration: with anti-windup on, stop accumulating while
    // the actuator is saturated in the direction the error is pushing.
    if (!p.aw || Math.abs(u0) < C43.uMax || e * u0 < 0) {
      integ = clamp(integ + e * h, -2.5, 2.5);
    }
    u = clamp(p.KpR * e + p.KiR * integ - p.KdR * w, -C43.uMax, C43.uMax);
    const tauG = p.grav ? C43.A * Math.cos(th) : 0;
    const acc = (u - tauG - C43.b * w) / C43.I;
    w += acc * h;
    th += w * h;
    if (th < rad(-30)) {
      th = rad(-30);
      w = Math.max(w, 0);
    }
    if (th > rad(195)) {
      th = rad(195);
      w = Math.min(w, 0);
    }
    if (p.hold && th > p.holdR) {
      th = p.holdR; // a hand physically blocks the arm
      w = 0;
    }
  }
  const t = s.t + dt;
  const hist = [...s.hist, { t, e: deg(p.spR - th) }].slice(-900);
  return { th, w, integ, u, t, hist };
}

function metrics43(hist: { t: number; e: number }[], stepDeg: number) {
  if (hist.length < 2) return { overshoot: 0, osPct: 0, settle: null as number | null, err: stepDeg };
  const minE = Math.min(...hist.map((p) => p.e));
  const overshoot = Math.max(0, -minE);
  const lastOut = hist.reduce((acc, p, i) => (Math.abs(p.e) > 2 ? i : acc), -1);
  const tNow = hist[hist.length - 1].t;
  const settle =
    lastOut >= hist.length - 1
      ? null
      : lastOut < 0
        ? 0
        : tNow - hist[lastOut + 1].t > 0.5
          ? hist[lastOut + 1].t
          : null;
  return { overshoot, osPct: (overshoot / Math.max(stepDeg, 1)) * 100, settle, err: hist[hist.length - 1].e };
}

// analytic settled pose for reduced motion: Kp·e = m·g·Lc·cosθ (P-only)
function settled43(spDeg: number, KpR: number, KiR: number, grav: boolean) {
  if (!grav || KiR > 0.5) return spDeg;
  const sp = rad(spDeg);
  const th = Array.from({ length: 40 }).reduce<number>(
    (v) => sp - (C43.A * Math.cos(v)) / KpR,
    sp,
  );
  return deg(th);
}

export function RbPidTuner() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [Kp, setKp] = useState(1.4);
  const [Ki, setKi] = useState(0); // raise it to kill the gravity gap (and meet windup)
  const [Kd, setKd] = useState(0.5);
  const [gravity, setGravity] = useState(false);
  const [setpoint, setSetpoint] = useState(110);
  const [aw, setAw] = useState(false);
  const [hold, setHold] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [st, setSt] = useState<St43>(() => init43(110));

  const par: Par43 = {
    KpR: Kp * DEG,
    KiR: Ki * DEG,
    KdR: Kd * DEG,
    spR: rad(setpoint),
    grav: gravity,
    aw,
    hold,
    holdR: rad(setpoint - 40),
  };

  useRafLoop((dt) => setSt((s) => step43(s, dt, par)), {
    playing: playing && inView && !reduced,
  });

  const stepSize = Math.abs(setpoint - startDeg43(setpoint));
  const m = metrics43(st.hist, stepSize);
  const thDeg = reduced ? settled43(setpoint, par.KpR, par.KiR, gravity) : deg(st.th);
  const tip = arm43(rad(thDeg));
  const sp = arm43(par.spR);
  const liveErr = reduced ? setpoint - thDeg : m.err;
  const iTerm = par.KiR * st.integ;

  // damping regime, judged from the measured trace of this step
  const settledNow = m.settle != null;
  const regime =
    st.t < 1.2 && !reduced
      ? { txt: "measuring…", col: R.world }
      : m.osPct > 4
        ? { txt: "underdamped: it rings — add Kd", col: R.error }
        : settledNow && (m.settle ?? 99) < 3
          ? { txt: "critically damped: fast and clean", col: R.goal }
          : st.t > 3.5 || reduced
            ? { txt: "overdamped: sluggish — more Kp or less Kd", col: R.plan }
            : { txt: "measuring…", col: R.world };

  // error-vs-time plot over the last 8 s
  const t0 = Math.max(0, st.t - 8);
  const eMid = (EP.y0 + EP.y1) / 2;
  const eAmp = (EP.y1 - EP.y0) / 2 - 4;
  const ePath = st.hist
    .filter((p) => p.t >= t0)
    .map((p, i) => {
      const x = EP.x0 + ((p.t - t0) / 8) * (EP.x1 - EP.x0);
      const y = eMid - clamp(p.e / 64, -1, 1) * eAmp;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const holdMark = arm43(par.holdR);

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.3 · Tuning PID: the full interactive controller"
      ariaLabel={`A simulated joint under PID control tracking ${setpoint} degrees; error ${liveErr.toFixed(1)} degrees; overshoot ${m.osPct.toFixed(0)} percent; ${regime.txt}`}
      controls={
        <>
          {/* every parameter change restarts the step so the measured
              overshoot / settling numbers describe exactly one experiment */}
          <Transport playing={playing} onPlay={() => setPlaying((v) => !v)} onReset={() => setSt(init43(setpoint))} />
          <Slider label="Kp" min={0.2} max={4} step={0.1} value={Kp} onChange={(v) => { setKp(v); setSt(init43(setpoint)); }} fmt={(v) => v.toFixed(1)} />
          <Slider label="Ki" min={0} max={1} step={0.05} value={Ki} onChange={(v) => { setKi(v); setSt(init43(setpoint)); }} fmt={(v) => v.toFixed(2)} />
          <Slider label="Kd" min={0} max={2} step={0.05} value={Kd} onChange={(v) => { setKd(v); setSt(init43(setpoint)); }} fmt={(v) => v.toFixed(2)} />
          <Slider label="setpoint" min={30} max={150} value={setpoint} onChange={(v) => { setSetpoint(v); setSt(init43(v)); }} fmt={(v) => `${v}°`} />
          <Btn
            onClick={() => {
              setGravity((g) => !g);
              setSt(init43(setpoint));
            }}
            active={gravity}
            title="add the m·g·L·cosθ gravity torque"
          >
            {gravity ? "✓ gravity" : "gravity"}
          </Btn>
          <Btn onClick={() => setHold((h) => !h)} active={hold} title="physically block the arm and let the integrator wind up">
            {hold ? "✓ holding arm" : "hold arm"}
          </Btn>
          <Btn
            onClick={() => {
              setAw((v) => !v);
              setSt(init43(setpoint));
            }}
            active={aw}
            title="stop integrating while the torque is saturated"
          >
            {aw ? "✓ anti-windup" : "anti-windup"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "error", value: `${liveErr.toFixed(1)}°`, color: Math.abs(liveErr) > 2 ? R.error : R.goal },
          { label: "overshoot", value: `${m.osPct.toFixed(0)}%`, color: m.osPct > 4 ? R.error : R.ink },
          { label: "settle ±2°", value: m.settle == null ? "—" : `${m.settle.toFixed(1)} s`, color: R.ink },
          { label: "I-term", value: `${iTerm.toFixed(1)} N·m`, color: Math.abs(iTerm) > 15 ? R.error : R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "actual angle" },
          { color: R.plan, label: "setpoint", dash: true },
          { color: R.error, label: "error trace" },
        ]}
      />

      {/* setpoint arm (amber dashed) */}
      <line x1={O43.x} y1={O43.y} x2={sp.x} y2={sp.y} stroke={R.plan} strokeWidth={4} strokeDasharray="6 6" opacity={0.85} />
      <text
        x={setpoint > 90 ? sp.x - 8 : sp.x + 8}
        y={sp.y - 8}
        textAnchor={setpoint > 90 ? "end" : "start"}
        fontFamily={MONO}
        fontSize={13}
        fill={R.plan}
      >
        setpoint {setpoint}°
      </text>

      {/* hold-the-arm block */}
      {hold && (
        <g>
          <circle cx={holdMark.x * 1.13 - O43.x * 0.13} cy={holdMark.y * 1.13 - O43.y * 0.13} r={7} fill={R.world} />
          <text
            x={holdMark.x * 1.13 - O43.x * 0.13 + 10}
            y={holdMark.y * 1.13 - O43.y * 0.13 + 4}
            fontFamily={MONO}
            fontSize={12}
            fill={R.world}
          >
            blocked
          </text>
        </g>
      )}

      {/* actual arm (blue) */}
      <line x1={O43.x} y1={O43.y} x2={tip.x} y2={tip.y} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={O43.x} cy={O43.y} r={9} fill={R.ink} />
      <circle cx={tip.x} cy={tip.y} r={8} fill={R.signal} />
      <text x={tip.x + 12} y={tip.y + 4} fontFamily={MONO} fontSize={13} fill={R.signal}>
        {Math.round(thDeg)}°
      </text>
      {/* gravity pull at the arm's midpoint */}
      {gravity &&
        svgArrow((O43.x + tip.x) / 2 + 4, (O43.y + tip.y) / 2 + 6, (O43.x + tip.x) / 2 + 4, (O43.y + tip.y) / 2 + 40, R.error, 2, 7)}

      {/* error-vs-time plot */}
      <text x={EP.x0} y={EP.y0 - 8} fontFamily={MONO} fontSize={12} fill={R.world}>
        error vs time (last 8 s)
      </text>
      <rect x={EP.x0} y={EP.y0} width={EP.x1 - EP.x0} height={EP.y1 - EP.y0} rx={4} fill="none" stroke={R.line} strokeWidth={1.5} />
      <rect x={EP.x0} y={eMid - (2 / 64) * eAmp} width={EP.x1 - EP.x0} height={(4 / 64) * eAmp} fill={R.fillGreen} opacity={0.5} />
      <line x1={EP.x0} y1={eMid} x2={EP.x1} y2={eMid} stroke={R.plan} strokeWidth={1.5} strokeDasharray="5 6" />
      <text x={EP.x1 - 6} y={eMid - 6} textAnchor="end" fontFamily={MONO} fontSize={11.5} fill={R.plan}>
        zero error
      </text>
      {!reduced && <path d={ePath} fill="none" stroke={R.error} strokeWidth={2.5} strokeLinejoin="round" />}

      <text x={360} y={428} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={hold ? R.error : regime.col} fontWeight={600}>
        {hold
          ? Ki < 0.05
            ? "arm blocked — raise Ki above zero and watch the integrator wind up"
            : `arm blocked: the integrator is storing ${iTerm.toFixed(0)} N·m ${aw ? "(anti-windup capping it)" : "— release and watch the overshoot"}`
          : reduced
            ? "Reduced motion: the arm is shown at its settled pose; sliders still set gains and setpoint."
            : regime.txt}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 4.4 · Gravity compensation: predict, don't react  (slider-driven sim)
// A 2 kg link with centre of mass 0.3 m out (τ̂ = m·g·L = 5.89 N·m), simulated
// live under PD feedback with a toggleable feedforward u_ff = m·g·L·cos θ.
// OFF: the arm settles where K_p·e balances gravity — the residual sag. ON:
// the model cancels gravity outright and the arm parks on the command. An
// inset plots τ_g(θ) = m·g·L·cos θ with live markers.
// ===========================================================================

const P44 = { tau: 5.89, I: 0.35, b: 1.5 }; // m·g·L, inertia, viscous friction
const O44 = { x: 210, y: 260 };
const L44 = 150;
const arm44 = (th: number) => ({
  x: O44.x + L44 * Math.cos(th),
  y: O44.y - L44 * Math.sin(th),
});
const IN44 = { x0: 470, x1: 688, y0: 150, y1: 330 };
const inX = (d: number) => IN44.x0 + (d / 90) * (IN44.x1 - IN44.x0);
const inY = (tau: number) => IN44.y1 - (clamp(tau, 0, 6) / 6) * (IN44.y1 - IN44.y0);

type St44 = { th: number; w: number };

function step44(s: St44, dt: number, cmdR: number, Kp: number, Kd: number, comp: boolean): St44 {
  const n = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / n;
  let { th, w } = s;
  for (let i = 0; i < n; i++) {
    const e = cmdR - th;
    const uFf = comp ? P44.tau * Math.cos(th) : 0;
    const u = Kp * e - Kd * w + uFf;
    const acc = (u - P44.tau * Math.cos(th) - P44.b * w) / P44.I;
    w += acc * h;
    th = clamp(th + w * h, rad(-60), rad(120));
  }
  return { th, w };
}

function settled44(cmdDeg: number, Kp: number, comp: boolean) {
  if (comp) return cmdDeg;
  const cmd = rad(cmdDeg);
  const th = Array.from({ length: 40 }).reduce<number>(
    (v) => cmd - (P44.tau * Math.cos(v)) / Kp,
    cmd,
  );
  return deg(th);
}

// the τ_g(θ) curve for the inset, sampled once
const CURVE44 = Array.from({ length: 46 }, (_, i) => {
  const d = (i / 45) * 90;
  return { d, tau: P44.tau * Math.cos(rad(d)) };
});

export function RbGravityComp() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [comp, setComp] = useState(true);
  const [cmd, setCmd] = useState(40); // commanded angle from horizontal (deg)
  const [gain, setGain] = useState(1.4); // feedback strength multiplier
  const [playing, setPlaying] = useState(true);
  const [st, setSt] = useState<St44>({ th: rad(20), w: 0 });

  const Kp = gain * 30; // N·m/rad
  const Kd = 2 * Math.sqrt(Kp * P44.I); // critically damped feedback pair

  useRafLoop((dt) => setSt((s) => step44(s, dt, rad(cmd), Kp, Kd, comp)), {
    playing: playing && inView && !reduced,
  });

  const thDeg = reduced ? settled44(cmd, Kp, comp) : deg(st.th);
  const th = rad(thDeg);
  const tip = arm44(th);
  const cmdTip = arm44(rad(cmd));
  const tauG = P44.tau * Math.cos(th);
  const sag = cmd - thDeg;
  const com = { x: O44.x + 0.55 * L44 * Math.cos(th), y: O44.y - 0.55 * L44 * Math.sin(th) };

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.4 · Gravity compensation: predict, don't react"
      ariaLabel={`Simulated arm commanded to ${cmd} degrees, gravity compensation ${comp ? "on" : "off"}; gravity torque ${tauG.toFixed(1)} newton-metres; residual sag ${sag.toFixed(1)} degrees`}
      controls={
        <>
          <Btn onClick={() => setComp((c) => !c)} active={comp} title="inject the model torque m·g·L·cosθ as feedforward">
            {comp ? "✓ gravity compensation" : "gravity compensation"}
          </Btn>
          <Slider label="commanded θ" min={0} max={90} value={cmd} onChange={setCmd} fmt={(v) => `${v}°`} />
          <Slider label="Kp/Kd" min={0.4} max={4} step={0.1} value={gain} onChange={setGain} fmt={(v) => v.toFixed(1)} />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((v) => !v)}
            onReset={() => {
              setComp(true);
              setCmd(40);
              setGain(1.4);
              setSt({ th: rad(20), w: 0 });
            }}
          />
        </>
      }
    >
      <Readout
        rows={[
          { label: "τ_g = mgL·cosθ", value: `${tauG.toFixed(2)} N·m`, color: R.ink },
          { label: "feedforward", value: comp ? `${tauG.toFixed(2)} N·m` : "0 (off)", color: comp ? R.goal : R.world },
          { label: "residual sag", value: `${sag.toFixed(1)}°`, color: sag > 0.5 ? R.error : R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "actual arm" },
          { color: R.plan, label: "commanded θ", dash: true },
          { color: R.goal, label: "feedforward τ" },
          { color: R.error, label: "gravity pull" },
        ]}
      />

      {/* mount + horizontal reference */}
      <line x1={O44.x} y1={O44.y} x2={O44.x} y2={400} stroke={R.world} strokeWidth={5} />
      <line x1={O44.x - 42} y1={400} x2={O44.x + 42} y2={400} stroke={R.line} strokeWidth={3} />
      <line x1={O44.x} y1={O44.y} x2={O44.x + L44 + 24} y2={O44.y} stroke={R.line} strokeWidth={1.5} strokeDasharray="3 6" />
      <text x={O44.x + L44 + 30} y={O44.y + 4} fontFamily={MONO} fontSize={11.5} fill={R.world}>
        θ=0
      </text>

      {/* commanded pose (amber dashed) */}
      <line x1={O44.x} y1={O44.y} x2={cmdTip.x} y2={cmdTip.y} stroke={R.plan} strokeWidth={4} strokeDasharray="6 6" opacity={0.85} />
      <text x={cmdTip.x + 8} y={cmdTip.y - 8} fontFamily={MONO} fontSize={13} fill={R.plan}>
        {cmd}°
      </text>

      {/* injected feedforward torque arc (green) when comp on */}
      {comp && thDeg > 3 && (
        <path
          d={`M ${O44.x + 46} ${O44.y} A 46 46 0 0 0 ${O44.x + 46 * Math.cos(th)} ${O44.y - 46 * Math.sin(th)}`}
          fill="none"
          stroke={R.goal}
          strokeWidth={3.5}
        />
      )}

      {/* actual arm (blue) with the gravity pull at its centre of mass */}
      <line x1={O44.x} y1={O44.y} x2={tip.x} y2={tip.y} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={O44.x} cy={O44.y} r={9} fill={R.ink} />
      <circle cx={tip.x} cy={tip.y} r={8} fill={R.signal} />
      {svgArrow(com.x + 5, com.y + 8, com.x + 5, com.y + 46, R.error, 2.5, 8)}
      <text x={com.x + 12} y={com.y + 40} fontFamily={MONO} fontSize={11.5} fill={R.error}>
        mg
      </text>

      {/* inset: τ_g(θ) = mgL·cosθ with live markers */}
      <text x={IN44.x0} y={IN44.y0 - 10} fontFamily={MONO} fontSize={12} fill={R.world}>
        gravity torque vs angle
      </text>
      <rect x={IN44.x0} y={IN44.y0} width={IN44.x1 - IN44.x0} height={IN44.y1 - IN44.y0} rx={4} fill="none" stroke={R.line} strokeWidth={1.5} />
      {[0, 3, 6].map((tau) => (
        <text key={tau} x={IN44.x0 - 8} y={inY(tau) + 4} textAnchor="end" fontFamily={MONO} fontSize={11} fill={R.world}>
          {tau}
        </text>
      ))}
      {[0, 45, 90].map((d) => (
        <text key={d} x={inX(d)} y={IN44.y1 + 16} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
          {d}°
        </text>
      ))}
      <path
        d={CURVE44.map((p, i) => `${i === 0 ? "M" : "L"} ${inX(p.d).toFixed(1)} ${inY(p.tau).toFixed(1)}`).join(" ")}
        fill="none"
        stroke={R.world}
        strokeWidth={2}
      />
      <line x1={inX(clamp(cmd, 0, 90))} y1={IN44.y0} x2={inX(clamp(cmd, 0, 90))} y2={IN44.y1} stroke={R.plan} strokeWidth={1.5} strokeDasharray="4 4" />
      <circle cx={inX(clamp(thDeg, 0, 90))} cy={inY(P44.tau * Math.cos(rad(clamp(thDeg, 0, 90))))} r={5} fill={R.signal} />
      <text x={IN44.x1 - 6} y={IN44.y0 + 16} textAnchor="end" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        max at horizontal
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={sag > 0.5 ? R.error : R.goal}>
        {comp
          ? "feedforward cancels gravity before it causes an error — the arm parks on the command"
          : `feedback alone settles where Kp·e balances gravity: a ${sag.toFixed(1)}° sag it never closes`}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 4.5 · Impedance control: dial the stiffness of a virtual spring
// (true 3D, orbitable). An end-effector point mass tethered to a rest pose by
// a virtual spring-damper, simulated honestly: m·ẍ = K(x_d − x) − D·ẋ at 2 ms
// substeps. Drag the end-effector (or poke it) and it responds exactly like a
// spring of the stiffness you dialled — soft K follows and floats back, high
// K snaps rigid. The damping ratio ζ = D / 2√(Km) is computed live.
// ===========================================================================

const A45: V3 = [0, 0, 0.55]; // virtual rest pose x_d
const M45 = 3; // end-effector apparent mass (kg)

type St45 = { p: V3; v: V3 };
const init45 = (): St45 => ({ p: [0.62, 0.34, 0.55], v: [0, 0, 0] });

function step45(s: St45, dt: number, K: number, D: number): St45 {
  const n = Math.max(1, Math.ceil(dt / 0.002));
  const h = dt / n;
  let p = s.p;
  let v = s.v;
  for (let i = 0; i < n; i++) {
    const acc = v3.add(v3.scale(v3.sub(A45, p), K / M45), v3.scale(v, -D / M45));
    v = v3.add(v, v3.scale(acc, h));
    p = v3.add(p, v3.scale(v, h));
  }
  return {
    p: [clamp(p[0], -1.1, 1.1), clamp(p[1], -1.1, 1.1), clamp(p[2], 0.12, 1.15)],
    v,
  };
}

// the virtual spring as a tapered 3D zigzag between the two poses
function spring45(a: V3, b: V3): Seg3D[] {
  const d = v3.sub(b, a);
  const len = v3.len(d);
  if (len < 0.03) return [seg3(a, b, R.goal, { width: 2.5 })];
  const dir = v3.scale(d, 1 / len);
  const ref: V3 = Math.abs(dir[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = v3.norm(v3.cross(dir, ref));
  const N = 18;
  const pts: V3[] = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    const taper = Math.min(1, 3.2 * Math.min(t, 1 - t));
    const side = i % 2 === 1 ? 1 : -1;
    return v3.add(v3.add(a, v3.scale(d, t)), v3.scale(u, side * 0.055 * taper));
  });
  return pts.slice(0, -1).map((p, i) => seg3(p, pts[i + 1], R.goal, { width: 2 }));
}

export function RbImpedance() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-32, 22);
  const [K, setK] = useState(200); // N/m
  const [D, setD] = useState(12); // N·s/m
  const [st, setSt] = useState<St45>(init45);
  const dragging = useRef(false);
  const lastPt = useRef<[number, number] | null>(null);

  useRafLoop(
    (dt) => {
      if (dragging.current) return;
      setSt((s) => step45(s, dt, K, D));
    },
    { playing: inView && !reduced },
  );

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 4.8,
    zoom: 138,
    target: [0, 0, 0.35],
  };

  const p = st.p;
  const delta = v3.sub(p, A45);
  const dist = v3.len(delta);
  const force = K * dist; // |F| = K·|Δx|
  const zeta = D / (2 * Math.sqrt(K * M45));
  const stiffLabel =
    K < 800
      ? "soft: follows your hand, floats back"
      : K > 3000
        ? "rigid: a position controller in all but name"
        : "medium stiffness";
  const stiffCol = K < 800 ? R.goal : K > 3000 ? R.error : R.plan;

  // restoring-force arrow: from the end-effector back toward rest, length ∝ F
  const fLen = clamp(force / 1500, 0.07, 0.7);
  const fTip = dist > 0.02 ? v3.add(p, v3.scale(v3.scale(delta, -1 / dist), fLen)) : p;

  const prims: Prim3D[] = [
    ...grid3(1.2, 0.4),
    // drop lines so both poses read as floating above the floor
    seg3([A45[0], A45[1], 0], A45, R.world, { width: 1, dash: "3 4" }),
    seg3([p[0], p[1], 0], p, R.world, { width: 1, dash: "3 4" }),
    dot3([p[0], p[1], 0], R.world, { r: 2.5 }),
    ...spring45(A45, p),
    ...triad3(A45, quat.id, 0.22, null, [R.plan, R.plan, R.plan]),
    label3(v3.add(A45, [0, 0, 0.3]), "rest pose x_d", R.plan, { anchor: "middle", dy: -4 }),
    ...triad3(p, quat.id, 0.2, null, [R.signal, R.signal, R.signal]),
    dot3(p, R.signal, { r: 6 }),
    label3(v3.add(p, [0, 0, 0.28]), "end-effector", R.signal, { anchor: "middle", dy: -4 }),
    ...(dist > 0.02
      ? [seg3(p, fTip, R.error, { width: 3.5 }), dot3(fTip, R.error, { r: 3.5 })]
      : []),
  ];

  const eeScreen = project(cam, p);

  const svgProps = {
    ...orbit.svgProps,
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (dragging.current) {
        const r = e.currentTarget.getBoundingClientRect();
        const sx = ((e.clientX - r.left) / r.width) * 720;
        const sy = ((e.clientY - r.top) / r.height) * 440;
        if (lastPt.current) {
          const np = groundDrag(cam, p, sx - lastPt.current[0], sy - lastPt.current[1]);
          setSt((s) => ({
            p: [clamp(np[0], -1.1, 1.1), clamp(np[1], -1.1, 1.1), s.p[2]],
            v: [0, 0, 0],
          }));
        }
        lastPt.current = [sx, sy];
        return;
      }
      orbit.svgProps.onPointerMove?.(e);
    },
    onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => {
      dragging.current = false;
      lastPt.current = null;
      orbit.svgProps.onPointerUp?.(e);
    },
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.5 · Impedance control: dial the stiffness of a virtual spring"
      ariaLabel={`A 3D end-effector tethered to a rest pose by a simulated virtual spring of stiffness ${K} newtons per metre; restoring force ${force.toFixed(0)} newtons; damping ratio ${zeta.toFixed(2)}. Drag the end-effector, or drag empty space to orbit.`}
      svgProps={svgProps}
      controls={
        <>
          <Slider label="stiffness K" min={100} max={5000} step={100} value={K} onChange={setK} fmt={(v) => `${v} N/m`} />
          <Slider label="damping D" min={2} max={80} step={1} value={D} onChange={setD} fmt={(v) => `${v}`} />
          <Btn
            onClick={() => setSt((s) => ({ p: s.p, v: v3.add(s.v, [1.7, 1.1, 0.9]) }))}
            title="shove the end-effector with a fixed impulse"
          >
            ⚡ poke
          </Btn>
          <Btn
            onClick={() => {
              setSt(init45());
              orbit.reset();
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the end-effector · drag empty space to orbit</span>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      {/* generous invisible hit-target over the end-effector */}
      <circle
        cx={eeScreen.x}
        cy={eeScreen.y}
        r={24}
        fill="transparent"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          dragging.current = true;
          lastPt.current = null;
        }}
      />
      <Readout
        rows={[
          { label: "stretch Δx", value: `${(dist * 100).toFixed(0)} cm`, color: R.ink },
          { label: "force K·Δx", value: `${force.toFixed(0)} N`, color: R.error },
          { label: "damping ζ", value: zeta.toFixed(2), color: zeta < 0.4 ? R.plan : R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "rest pose x_d" },
          { color: R.signal, label: "end-effector" },
          { color: R.goal, label: "virtual spring" },
          { color: R.error, label: "restoring force" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={stiffCol}>
        {reduced
          ? "Reduced motion: the spring is shown displaced; sliders still set the restoring force."
          : `${stiffLabel} · one number decides whether the robot is a rock or a cushion`}
      </text>
    </Stage>
  );
}
