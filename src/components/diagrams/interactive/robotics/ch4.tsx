"use client";

import { useReducer, useState } from "react";
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
  approach,
  clamp,
} from "./shared";

const rad = (deg: number) => (deg * Math.PI) / 180;

// ===========================================================================
// Fig 4.1 · Open-loop vs closed-loop under a disturbance  (toggle-compare)
// The same joint asked to hold 90°, two ways. Drop a load: open-loop sags and
// stays sagged (error frozen), closed-loop sags for an instant then drives back
// up as the sensed error is erased. A live error readout counts toward zero.
// ===========================================================================

// Pivot + geometry for the single revolute joint (shared by both modes).
const O41 = { x: 200, y: 250 };
const L41 = 150;
// Screen angle: 90° command points the arm up-and-right along the -y axis.
// We draw with 0° = right, angle measured up from horizontal.
const armTip = (deg: number) => ({
  x: O41.x + L41 * Math.cos(rad(deg)),
  y: O41.y - L41 * Math.sin(rad(deg)),
});

export function RbOpenClosedLoop() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"open" | "closed">("closed");
  const [load, setLoad] = useState(false);
  // angle = live joint angle (deg). settle target depends on mode + load.
  const [ang, setAng] = useState(90);

  // The load pulls the arm down. Open-loop has no way to fight it, so it just
  // sags and stays; closed-loop senses the error and drives back to 90°.
  const sagTarget = 90 - 12; // where the arm sags to under load (deg)
  const target = mode === "closed" ? 90 : load ? sagTarget : 90;

  useRafLoop(
    (dt) => {
      setAng((a) => approach(a, target, 0.14, dt));
    },
    { playing: inView && !reduced },
  );

  const a = reduced ? target : ang;
  const tip = armTip(a);
  const cmd = armTip(90);
  const err = Math.abs(90 - a);
  const errPct = Math.round((err / 12) * 100);

  const reset = () => {
    setLoad(false);
    setAng(90);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.1 · Open-loop vs closed-loop under a disturbance"
      ariaLabel={`A revolute joint holding 90 degrees under ${mode}-loop control; load ${load ? "on" : "off"}; error ${err.toFixed(1)} degrees`}
      controls={
        <>
          <Tabs
            options={[
              { id: "closed", label: "Closed-loop" },
              { id: "open", label: "Open-loop" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Btn onClick={() => setLoad((v) => !v)} active={load} title="drop a weight on the arm">
            {load ? "✓ load on" : "add load"}
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
        </>
      }
    >
      {/* readout lane, top-left, never overlaps the arm */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        tracking error
      </text>
      <rect x={40} y={54} width={180} height={12} rx={6} fill="#e7e7e4" />
      <rect x={40} y={54} width={180 * clamp(err / 12, 0, 1)} height={12} rx={6} fill={R.error} />
      <text x={230} y={64} fontFamily={MONO} fontSize={14} fill={R.ink}>
        {err.toFixed(1)}°
      </text>
      <text x={286} y={64} fontFamily={MONO} fontSize={12} fill={R.world}>
        ({errPct}% of sag)
      </text>

      {/* mode note, top-right */}
      <text x={680} y={44} textAnchor="end" fontFamily={MONO} fontSize={13} fill={mode === "closed" ? R.goal : R.error}>
        {mode === "closed" ? "senses error, corrects" : "sends fixed command, never looks"}
      </text>

      {/* ground + hub */}
      <line x1={60} y1={O41.y} x2={340} y2={O41.y} stroke={R.line} strokeWidth={2} />

      {/* 90° command (amber, dashed) */}
      <line x1={O41.x} y1={O41.y} x2={cmd.x} y2={cmd.y} stroke={R.plan} strokeWidth={4} strokeDasharray="6 6" opacity={0.85} />
      <text x={cmd.x + 6} y={cmd.y - 6} fontFamily={MONO} fontSize={13} fill={R.plan}>
        90° command
      </text>

      {/* the actual arm (blue) */}
      <line x1={O41.x} y1={O41.y} x2={tip.x} y2={tip.y} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={O41.x} cy={O41.y} r={9} fill={R.ink} />
      <circle cx={tip.x} cy={tip.y} r={8} fill={R.signal} />
      <text x={tip.x + 10} y={tip.y + 4} fontFamily={MONO} fontSize={13} fill={R.signal}>
        actual {Math.round(a)}°
      </text>

      {/* the dropped load (grey) hanging off the tip when engaged */}
      {load && (
        <g>
          <line x1={tip.x} y1={tip.y} x2={tip.x} y2={tip.y + 46} stroke={R.world} strokeWidth={2} />
          <rect x={tip.x - 18} y={tip.y + 46} width={36} height={34} rx={5} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
          <text x={tip.x} y={tip.y + 68} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>
            load
          </text>
        </g>
      )}

      {/* explanatory line, bottom lane */}
      <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={R.world}>
        {mode === "open"
          ? "open-loop: the load sags the arm and the error is frozen; the controller is oblivious"
          : "closed-loop: the arm sags an instant, then feedback drives the error back to zero"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 4.2 · P vs PI: steady-state error appears, then dies  (slider-driven)
// A step response (angle vs time) under a constant gravity disturbance. P-only
// settles below the setpoint (gap shaded red); raising K_i walks the tail up to
// meet the setpoint line (the closed gap shaded green).
// ===========================================================================

// Plot box.
const P42 = { x0: 90, x1: 686, y0: 70, y1: 360 };
const SP42 = 90; // setpoint (deg)
const GRAV42 = 8; // constant disturbance torque

// Simulate a step response and return the settling angle + a sampled curve.
// P-only parks at SP - grav/Kp; adding I walks the tail to the setpoint.
function stepCurve(Kp: number, Ki: number, gravityOn: boolean) {
  const N = 120;
  const dt = 0.08;
  let ang = SP42 - 30; // start 30° below
  let integ = 0;
  const pts: number[] = [];
  const grav = gravityOn ? GRAV42 : 0;
  for (let i = 0; i < N; i++) {
    const e = SP42 - ang;
    integ += e * dt;
    // effort minus the constant disturbance; scaled to a plausible rate.
    const u = Kp * e + Ki * integ - grav;
    ang += u * dt * 0.12;
    pts.push(ang);
  }
  return pts;
}

function toPath(pts: number[]) {
  const N = pts.length;
  return pts
    .map((v, i) => {
      const x = P42.x0 + (i / (N - 1)) * (P42.x1 - P42.x0);
      // map angle 40..100 to the plot band
      const y = P42.y1 - clamp((v - 40) / 60, 0, 1) * (P42.y1 - P42.y0);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

const yForAngle = (v: number) => P42.y1 - clamp((v - 40) / 60, 0, 1) * (P42.y1 - P42.y0);

export function RbPvsPI() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [Kp, setKp] = useState(1.5);
  const [Ki, setKi] = useState(0);
  const [gravity, setGravity] = useState(true);
  // reveal 0..1 eases the curve drawing in; static under reduced motion.
  const [reveal, setReveal] = useState(reduced ? 1 : 0);

  useRafLoop(
    (dt) => setReveal((r) => (r >= 1 ? 1 : Math.min(1, r + dt * 0.7))),
    { playing: inView && !reduced && reveal < 1 },
  );

  const pts = stepCurve(Kp, Ki, gravity);
  const shown = reduced ? pts : pts.slice(0, Math.max(2, Math.round(pts.length * reveal)));
  const settle = pts[pts.length - 1];
  const ySet = yForAngle(SP42);
  const ySettle = yForAngle(settle);
  const gap = SP42 - settle;

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.2 · P vs PI: steady-state error appears, then dies"
      ariaLabel={`Step response under gravity with Kp ${Kp.toFixed(1)} and Ki ${Ki.toFixed(2)}; steady-state gap ${gap.toFixed(1)} degrees`}
      controls={
        <>
          <Slider label="Kp" min={0.4} max={4} step={0.1} value={Kp} onChange={(v) => { setKp(v); setReveal(0); }} fmt={(v) => v.toFixed(1)} />
          <Slider label="Ki" min={0} max={1.2} step={0.05} value={Ki} onChange={(v) => { setKi(v); setReveal(0); }} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => { setGravity((g) => !g); setReveal(0); }} active={gravity}>
            {gravity ? "✓ gravity" : "gravity"}
          </Btn>
          <Btn onClick={() => { setKp(1.5); setKi(0); setGravity(true); setReveal(0); }}>↺ reset</Btn>
        </>
      }
    >
      {/* axes */}
      <line x1={P42.x0} y1={P42.y0} x2={P42.x0} y2={P42.y1} stroke={R.line} strokeWidth={1.5} />
      <line x1={P42.x0} y1={P42.y1} x2={P42.x1} y2={P42.y1} stroke={R.line} strokeWidth={1.5} />
      <text x={P42.x0 - 10} y={P42.y0 + 6} textAnchor="end" fontFamily={MONO} fontSize={12} fill={R.world}>
        angle
      </text>
      <text x={P42.x1} y={P42.y1 + 22} textAnchor="end" fontFamily={MONO} fontSize={12} fill={R.world}>
        time →
      </text>

      {/* setpoint line (amber, dashed) */}
      <line x1={P42.x0} y1={ySet} x2={P42.x1} y2={ySet} stroke={R.plan} strokeWidth={2.5} strokeDasharray="7 6" />
      <text x={P42.x1} y={ySet - 8} textAnchor="end" fontFamily={MONO} fontSize={13} fill={R.plan}>
        setpoint 90°
      </text>

      {/* steady-state gap shading: red if P leaves a gap, green once I closes it */}
      {reveal > 0.9 && gap > 0.5 && (
        <>
          <rect x={P42.x1 - 150} y={ySet} width={150} height={ySettle - ySet} fill={R.fillRed} opacity={0.7} />
          <text x={P42.x1 - 156} y={(ySet + ySettle) / 2 + 4} textAnchor="end" fontFamily={MONO} fontSize={13} fill={R.error}>
            steady-state error {gap.toFixed(1)}°
          </text>
        </>
      )}
      {reveal > 0.9 && gap <= 0.5 && Ki > 0.05 && (
        <text x={P42.x1 - 8} y={ySet + 20} textAnchor="end" fontFamily={MONO} fontSize={13} fill={R.goal}>
          ✓ gap closed by I
        </text>
      )}

      {/* the response curve (blue) */}
      <path d={toPath(shown)} fill="none" stroke={R.signal} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

      {/* label */}
      <text x={P42.x0 + 8} y={P42.y0 + 20} fontFamily={MONO} fontSize={13} fill={R.world}>
        {Ki < 0.05 ? "P-only, parks short" : "PI walks up to the line"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 4.3 · Tuning PID: the full interactive controller  (slider-driven)
// A single revolute joint tracks a setpoint you set with a slider; a live PID
// loop runs until it settles then idles. An error-vs-time plot below annotates
// overshoot / steady-state / regime. Gravity toggle makes steady-state real.
// ===========================================================================

const O43 = { x: 200, y: 175 };
const L43 = 120;
const arm43 = (deg: number) => ({
  x: O43.x + L43 * Math.cos(rad(deg)),
  y: O43.y - L43 * Math.sin(rad(deg)),
});
// error plot box (below the arm)
const EP = { x0: 90, x1: 686, y0: 300, y1: 400 };

type PidState = { ang: number; vel: number; integ: number; prevE: number; hist: number[] };

export function RbPidTuner() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [Kp, setKp] = useState(1.4);
  const [Ki, setKi] = useState(0.2);
  const [Kd, setKd] = useState(0.5);
  const [gravity, setGravity] = useState(false);
  const [setpoint, setSetpoint] = useState(110);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [st, setSt] = useState<PidState>({ ang: 40, vel: 0, integ: 0, prevE: 0, hist: [] });

  const grav = gravity ? 8 : 0;

  useRafLoop(
    (dt) => {
      setSt((s) => {
        const h = Math.min(dt, 0.03);
        const e = setpoint - s.ang;
        const integ = clamp(s.integ + e * h, -400, 400); // clamped anti-windup
        const de = (e - s.prevE) / h;
        // torque = PID minus a constant gravity disturbance
        const u = Kp * e + Ki * integ + Kd * de - grav;
        const vel = s.vel + u * h * 2 - s.vel * 1.4 * h; // light natural damping
        const ang = s.ang + vel * h;
        const hist = [...s.hist, e].slice(-160);
        return { ang, vel, integ, prevE: e, hist };
      });
    },
    { playing: playing && inView && !reduced },
  );

  // Static reduced-motion state: solve the settling angle analytically-ish.
  const settleAng = gravity ? setpoint - (Ki > 0.02 ? 0 : grav / Math.max(Kp, 0.01)) : setpoint;
  const a = reduced ? settleAng : st.ang;
  const tip = arm43(a);
  const sp = arm43(setpoint);
  const liveErr = setpoint - a;

  // regime label from the gains (intuition axis, not a formal computation)
  const damping = Kd;
  const regime =
    damping < 0.28 ? "underdamped: it rings" : damping > 1.0 ? "overdamped: sluggish" : "critically damped: clean";
  const regimeCol = damping < 0.28 ? R.error : damping > 1.0 ? R.plan : R.goal;

  // error curve path
  const hist = reduced ? [0] : st.hist;
  const errPath = hist
    .map((e, i) => {
      const x = EP.x0 + (i / Math.max(1, hist.length - 1)) * (EP.x1 - EP.x0);
      const y = (EP.y0 + EP.y1) / 2 - clamp(e / 90, -1, 1) * ((EP.y1 - EP.y0) / 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const reset = () => setSt({ ang: 40, vel: 0, integ: 0, prevE: 0, hist: [] });

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.3 · Tuning PID: the full interactive controller"
      ariaLabel={`A joint under PID control tracking ${setpoint} degrees; error ${liveErr.toFixed(1)} degrees; ${regime}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Slider label="Kp" min={0.2} max={4} step={0.1} value={Kp} onChange={setKp} fmt={(v) => v.toFixed(1)} />
          <Slider label="Ki" min={0} max={1} step={0.05} value={Ki} onChange={setKi} fmt={(v) => v.toFixed(2)} />
          <Slider label="Kd" min={0} max={2} step={0.05} value={Kd} onChange={setKd} fmt={(v) => v.toFixed(2)} />
          <Slider label="setpoint" min={30} max={150} value={setpoint} onChange={(v) => { setSetpoint(v); reset(); }} fmt={(v) => `${v}°`} />
          <Btn onClick={() => setGravity((g) => !g)} active={gravity}>
            {gravity ? "✓ gravity" : "gravity"}
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
        </>
      }
    >
      {/* regime readout, top-left */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        regime
      </text>
      <text x={110} y={44} fontFamily={MONO} fontSize={14} fill={regimeCol} fontWeight={600}>
        {regime}
      </text>
      <text x={480} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        error
      </text>
      <text x={540} y={44} fontFamily={MONO} fontSize={14} fill={R.error} fontWeight={600}>
        {liveErr.toFixed(1)}°
      </text>

      {/* arm hub + ground */}
      <line x1={60} y1={O43.y} x2={340} y2={O43.y} stroke={R.line} strokeWidth={2} />
      {/* setpoint arm (amber dashed) */}
      <line x1={O43.x} y1={O43.y} x2={sp.x} y2={sp.y} stroke={R.plan} strokeWidth={4} strokeDasharray="6 6" opacity={0.85} />
      <text x={sp.x + 6} y={sp.y - 6} fontFamily={MONO} fontSize={13} fill={R.plan}>
        setpoint {setpoint}°
      </text>
      {/* actual arm (blue) */}
      <line x1={O43.x} y1={O43.y} x2={tip.x} y2={tip.y} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={O43.x} cy={O43.y} r={9} fill={R.ink} />
      <circle cx={tip.x} cy={tip.y} r={8} fill={R.signal} />
      {gravity && (
        <text x={O43.x + 150} y={O43.y + 4} fontFamily={MONO} fontSize={13} fill={R.world}>
          gravity load on
        </text>
      )}

      {/* error-vs-time plot */}
      <text x={EP.x0} y={EP.y0 - 8} fontFamily={MONO} fontSize={12} fill={R.world}>
        error vs time
      </text>
      <rect x={EP.x0} y={EP.y0} width={EP.x1 - EP.x0} height={EP.y1 - EP.y0} rx={4} fill="none" stroke={R.line} strokeWidth={1.5} />
      <line x1={EP.x0} y1={(EP.y0 + EP.y1) / 2} x2={EP.x1} y2={(EP.y0 + EP.y1) / 2} stroke={R.plan} strokeWidth={1.5} strokeDasharray="5 6" />
      <text x={EP.x1 - 6} y={(EP.y0 + EP.y1) / 2 - 6} textAnchor="end" fontFamily={MONO} fontSize={12} fill={R.plan}>
        zero error
      </text>
      {/* settling band (green) around zero */}
      <rect x={EP.x0} y={(EP.y0 + EP.y1) / 2 - 8} width={EP.x1 - EP.x0} height={16} fill={R.fillGreen} opacity={0.4} />
      {!reduced && <path d={errPath} fill="none" stroke={R.error} strokeWidth={2.5} strokeLinejoin="round" />}

      {reduced && (
        <text x={40} y={280} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: the arm is shown at its settled pose; the sliders still set gains and setpoint.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 4.4 · Gravity compensation: predict, don't react  (slider-driven)
// A single link commanded to a pose; toggle feedforward gravity comp on/off.
// OFF: the arm sags below the command (feedback alone fights gravity, settles
// short). ON: it snaps to the command. A torque readout tracks m·g·L·cos(θ).
// ===========================================================================

const O44 = { x: 260, y: 250 };
const L44 = 150;
const arm44 = (deg: number) => ({
  x: O44.x + L44 * Math.cos(rad(deg)),
  y: O44.y - L44 * Math.sin(rad(deg)),
});
const M44 = 2; // kg
const LC44 = 0.3; // m
const G44 = 9.81;

export function RbGravityComp() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [comp, setComp] = useState(true);
  const [cmd, setCmd] = useState(40); // commanded angle from horizontal (deg)
  const [gain, setGain] = useState(1.4); // PD feedback strength
  const [ang, setAng] = useState(40);

  // gravity torque at the current pose: τ = m·g·L·cos(θ)
  const gravTorque = (deg: number) => M44 * G44 * LC44 * Math.cos(rad(deg));

  // Without comp, feedback settles short: the pose that balances feedback vs
  // gravity. With comp, the feedforward cancels gravity and it reaches cmd.
  const sagPerTorque = 3.4 / Math.max(gain, 0.2); // deg of sag per N·m residual
  const settle = comp ? cmd : cmd - gravTorque(cmd) * sagPerTorque;

  useRafLoop(
    (dt) => setAng((a) => approach(a, settle, 0.14, dt)),
    { playing: inView && !reduced },
  );

  const a = reduced ? settle : ang;
  const tip = arm44(a);
  const cmdTip = arm44(cmd);
  const tau = gravTorque(a);
  const sag = cmd - a;

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.4 · Gravity compensation: predict, don't react"
      ariaLabel={`Arm commanded to ${cmd} degrees, gravity compensation ${comp ? "on" : "off"}; gravity torque ${tau.toFixed(1)} newton-metres; residual sag ${sag.toFixed(1)} degrees`}
      controls={
        <>
          <Btn onClick={() => setComp((c) => !c)} active={comp} title="inject feedforward gravity torque">
            {comp ? "✓ gravity compensation" : "gravity compensation"}
          </Btn>
          <Slider label="commanded θ" min={0} max={90} value={cmd} onChange={setCmd} fmt={(v) => `${v}°`} />
          <Slider label="Kp/Kd" min={0.4} max={4} step={0.1} value={gain} onChange={setGain} fmt={(v) => v.toFixed(1)} />
          <Btn onClick={() => { setComp(true); setCmd(40); setGain(1.4); setAng(40); }}>↺ reset</Btn>
        </>
      }
    >
      {/* torque readout lane, top-left */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        gravity torque  τ = m·g·L·cos(θ)
      </text>
      <text x={40} y={68} fontFamily={MONO} fontSize={15} fill={comp ? R.goal : R.world} fontWeight={600}>
        {tau.toFixed(2)} N·m {comp ? "→ injected as feedforward" : "→ fought reactively"}
      </text>

      {/* residual sag readout, top-right */}
      <text x={680} y={44} textAnchor="end" fontFamily={MONO} fontSize={14} fill={sag > 0.5 ? R.error : R.goal} fontWeight={600}>
        residual sag {sag.toFixed(1)}°
      </text>

      {/* ground + hub */}
      <line x1={120} y1={O44.y} x2={400} y2={O44.y} stroke={R.line} strokeWidth={2} />
      {/* horizontal reference (θ measured from here) */}
      <line x1={O44.x} y1={O44.y} x2={O44.x + L44 + 20} y2={O44.y} stroke={R.line} strokeWidth={1.5} strokeDasharray="3 6" />

      {/* commanded pose (amber dashed) */}
      <line x1={O44.x} y1={O44.y} x2={cmdTip.x} y2={cmdTip.y} stroke={R.plan} strokeWidth={4} strokeDasharray="6 6" opacity={0.85} />
      <text x={cmdTip.x + 6} y={cmdTip.y - 6} fontFamily={MONO} fontSize={13} fill={R.plan}>
        commanded {cmd}°
      </text>

      {/* injected feedforward torque arc (green) when comp on */}
      {comp && (
        <path
          d={`M ${O44.x + 46} ${O44.y} A 46 46 0 0 0 ${O44.x + 46 * Math.cos(rad(a))} ${O44.y - 46 * Math.sin(rad(a))}`}
          fill="none"
          stroke={R.goal}
          strokeWidth={3}
        />
      )}

      {/* actual arm (blue) */}
      <line x1={O44.x} y1={O44.y} x2={tip.x} y2={tip.y} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={O44.x} cy={O44.y} r={9} fill={R.ink} />
      <circle cx={tip.x} cy={tip.y} r={8} fill={R.signal} />
      <text x={tip.x + 10} y={tip.y + 4} fontFamily={MONO} fontSize={13} fill={R.signal}>
        actual {Math.round(a)}°
      </text>

      {/* bottom explanatory line */}
      <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={R.world}>
        {comp
          ? "feedforward cancels gravity before it can cause a sag; the arm reaches the command"
          : "feedback alone fights gravity and settles short, a residual sag it never fully closes"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 4.5 · Impedance control: dial the stiffness of a virtual spring
// (draggable-field)
// An end-effector tethered to a rest position by a visible virtual spring. Drag
// the end-effector; the spring stretches and shows F = K·Δx. Low K barely
// resists and follows; high K snaps back rigidly. Release → eased, damped return.
// ===========================================================================

const REST45 = { x: 260, y: 235 }; // virtual rest position (amber)
const EE_MIN = { x: 120, y: 110 };
const EE_MAX = { x: 660, y: 380 };

export function RbImpedance() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [K, setK] = useState(200); // N/m
  const [D, setD] = useState(12); // damping
  const [ee, setEe] = useState({ x: 430, y: 235 }); // end-effector pos
  const [vel, setVel] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(false);

  useRafLoop(
    (dt) => {
      if (drag) return;
      // eased, damped spring return: stiffness K and damping D shape the motion.
      const h = Math.min(dt, 0.03);
      const kk = clamp((K / 5000) * 3.2 + 0.15, 0.15, 3.4); // visual stiffness rate
      const dd = clamp(D / 40, 0.05, 0.95);
      setVel((v) => {
        const ax = (REST45.x - ee.x) * kk - v.x * (2 + dd * 24);
        const ay = (REST45.y - ee.y) * kk - v.y * (2 + dd * 24);
        return { x: v.x + ax * h, y: v.y + ay * h };
      });
      setEe((p) => ({ x: p.x + vel.x * h, y: p.y + vel.y * h }));
    },
    { playing: inView && !reduced },
  );

  // Under reduced motion, park the end-effector at a fixed displaced pose so the
  // spring + force are fully labeled and static.
  const pos = reduced ? { x: 430, y: 235 } : ee;
  const dx = pos.x - REST45.x;
  const dy = pos.y - REST45.y;
  const disp = Math.hypot(dx, dy) / 2000; // px → metres-ish for the readout
  const force = K * disp; // F = K·Δx (N)
  const stiffLabel = K < 800 ? "soft: follows your hand" : K > 3000 ? "rigid: resists like a position controller" : "medium";
  const stiffCol = K < 800 ? R.goal : K > 3000 ? R.error : R.plan;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 720;
    const y = ((e.clientY - r.top) / r.height) * 440;
    setEe({ x: clamp(x, EE_MIN.x, EE_MAX.x), y: clamp(y, EE_MIN.y, EE_MAX.y) });
    setVel({ x: 0, y: 0 });
  };

  // draw the virtual spring as a zigzag between rest and end-effector
  const springPath = () => {
    const segs = 12;
    const nx = -dy;
    const ny = dx;
    const len = Math.hypot(nx, ny) || 1;
    const amp = 9;
    let d = `M ${REST45.x} ${REST45.y}`;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const bx = REST45.x + dx * t;
      const by = REST45.y + dy * t;
      const s = i % 2 === 0 ? 1 : -1;
      d += ` L ${(bx + (nx / len) * amp * s).toFixed(1)} ${(by + (ny / len) * amp * s).toFixed(1)}`;
    }
    d += ` L ${pos.x} ${pos.y}`;
    return d;
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 4.5 · Impedance control: dial the stiffness of a virtual spring"
      ariaLabel={`A virtual spring of stiffness ${K} newtons per metre; restoring force ${force.toFixed(1)} newtons`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(false),
        onPointerLeave: () => setDrag(false),
      }}
      controls={
        <>
          <Slider label="stiffness K" min={100} max={5000} step={100} value={K} onChange={setK} fmt={(v) => `${v} N/m`} />
          <Slider label="damping D" min={2} max={40} step={1} value={D} onChange={setD} fmt={(v) => `${v}`} />
          <Btn onClick={() => { setEe({ x: 430, y: 235 }); setVel({ x: 0, y: 0 }); }}>↺ reset</Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the end-effector</span>
        </>
      }
    >
      {/* readout lane, top-left */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        restoring force  F = K · Δx
      </text>
      <text x={40} y={68} fontFamily={MONO} fontSize={15} fill={R.error} fontWeight={600}>
        {force.toFixed(1)} N
      </text>
      <text x={680} y={44} textAnchor="end" fontFamily={MONO} fontSize={13} fill={stiffCol} fontWeight={600}>
        {stiffLabel}
      </text>

      {/* the virtual spring (green) */}
      <path d={springPath()} fill="none" stroke={R.goal} strokeWidth={3} strokeLinejoin="round" />

      {/* rest position (amber) */}
      <circle cx={REST45.x} cy={REST45.y} r={8} fill="none" stroke={R.plan} strokeWidth={3} strokeDasharray="3 4" />
      <text x={REST45.x} y={REST45.y - 16} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.plan}>
        rest position
      </text>

      {/* restoring-force arrow (red) from end-effector back toward rest */}
      {Math.hypot(dx, dy) > 6 && (
        <line
          x1={pos.x}
          y1={pos.y}
          x2={pos.x - dx * clamp(force / 90, 0.15, 1)}
          y2={pos.y - dy * clamp(force / 90, 0.15, 1)}
          stroke={R.error}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}

      {/* the end-effector (blue), draggable */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={13}
        fill={R.fillBlue}
        stroke={R.signal}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
      />
      <text x={pos.x + 18} y={pos.y + 4} fontFamily={MONO} fontSize={13} fill={R.signal}>
        end-effector
      </text>

      {reduced && (
        <text x={40} y={412} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: the spring is shown displaced; the stiffness slider still sets the restoring force.
        </text>
      )}
    </Stage>
  );
}
