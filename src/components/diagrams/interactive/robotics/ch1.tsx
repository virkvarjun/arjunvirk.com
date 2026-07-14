"use client";

import { useMemo, useState } from "react";
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
  svgArrow,
  svgPoint,
  approach,
  clamp,
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

const rad = (deg: number) => (deg * Math.PI) / 180;

// ===========================================================================
// Fig 1.1 · The sense–plan–act loop  (animated pipeline + live error chart)
// A token circulates SENSE -> PLAN -> ACT -> WORLD. The tracking error is a
// real discrete-time feedback system: every time the token passes ACT the
// error is multiplied by (1 - gain), so the chart on the right records an
// honest geometric decay — inject a disturbance and watch feedback eat it.
// ===========================================================================

type LoopNode = { id: string; x: number; y: number; color: string; sub: string };
const SP_HW = 66;
const SP_HH = 30;
const SP_NODES: LoopNode[] = [
  { id: "SENSE", x: 150, y: 152, color: R.signal, sub: "read the world" },
  { id: "PLAN", x: 356, y: 152, color: R.plan, sub: "decide" },
  { id: "ACT", x: 356, y: 318, color: R.plan, sub: "move" },
  { id: "WORLD", x: 150, y: 318, color: R.world, sub: "reality" },
];
const SP_SEGS: [number, number, number, number][] = [
  [150 + SP_HW, 152, 356 - SP_HW, 152], // SENSE -> PLAN
  [356, 152 + SP_HH, 356, 318 - SP_HH], // PLAN -> ACT
  [356 - SP_HW, 318, 150 + SP_HW, 318], // ACT -> WORLD
  [150, 318 - SP_HH, 150, 152 + SP_HH], // WORLD -> SENSE
];
const SP_CHART = { x0: 468, x1: 692, y0: 118, y1: 352 };
const spSmooth = (t: number) => t * t * (3 - 2 * t);

export function RbSensePlanAct() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, setPlaying] = useState(true);
  const [gain, setGain] = useState(0.5);
  const [speed, setSpeed] = useState(0.9); // loop passes per second (×4 phase)
  const [st, setSt] = useState({
    phase: 0,
    err: 0,
    loops: 0,
    hist: [0] as number[],
    acc: 0,
  });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let phase = s.phase + dt * speed * 2;
        let err = s.err;
        let loops = s.loops;
        // the correction lands as the token leaves ACT: e <- (1 - k) e
        if (s.phase < 2 && phase >= 2) {
          err = err * (1 - gain);
          if (err < 0.004) err = 0;
        }
        if (phase >= 4) {
          phase -= 4;
          loops += 1;
        }
        let hist = s.hist;
        let acc = s.acc + dt;
        if (acc >= 0.06) {
          acc = 0;
          hist = [...s.hist.slice(-139), err];
        }
        return { phase, err, loops, hist, acc };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const inject = () => setSt((s) => ({ ...s, err: 1 }));
  const reset = () => setSt({ phase: 0, err: 0, loops: 0, hist: [0], acc: 0 });

  const seg = Math.floor(st.phase) % 4;
  const f = spSmooth(st.phase - Math.floor(st.phase));
  const [sx, sy, ex, ey] = SP_SEGS[seg];
  const tokenX = reduced ? SP_SEGS[0][0] : sx + (ex - sx) * f;
  const tokenY = reduced ? SP_SEGS[0][1] : sy + (ey - sy) * f;
  const errPct = Math.round(st.err * 100);

  const chartH = SP_CHART.y1 - SP_CHART.y0;
  const chartW = SP_CHART.x1 - SP_CHART.x0;
  // live history polyline (animated) or the analytic staircase (reduced)
  const histPts = st.hist
    .map((e, i) => `${SP_CHART.x0 + (chartW * i) / 139},${SP_CHART.y1 - e * chartH}`)
    .join(" ");
  const stairPts = Array.from({ length: 24 }, (_, j) => {
    const k = Math.floor(j / 2);
    const kk = j % 2 === 0 ? k : k + 1;
    const e = (st.err || 1) * Math.pow(1 - gain, k);
    return `${SP_CHART.x0 + (chartW * Math.min(kk, 11)) / 11},${SP_CHART.y1 - e * chartH}`;
  }).join(" ");

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.1 · The sense–plan–act loop"
      ariaLabel={`Sense, plan, act loop with a circulating data token; tracking error ${errPct} percent after ${st.loops} loops. A chart records the error decaying geometrically.`}
      controls={
        <>
          <Transport playing={playing} onPlay={() => setPlaying((v) => !v)} onReset={reset} />
          <Btn onClick={inject} title="knock the world and watch feedback correct it">
            ⚡ disturb
          </Btn>
          <Slider label="gain" min={0.1} max={0.9} step={0.05} value={gain} onChange={setGain} fmt={(v) => v.toFixed(2)} />
          <Slider label="rate" min={0.25} max={2} step={0.05} value={speed} onChange={setSpeed} fmt={(v) => `${v.toFixed(2)}×`} />
        </>
      }
    >
      {SP_SEGS.map(([x1, y1, x2, y2], i) => (
        <g key={i} opacity={0.9}>
          {svgArrow(x1, y1, x2, y2, R.line, 3, 11)}
        </g>
      ))}

      {SP_NODES.map((n) => {
        const d = Math.hypot(n.x - tokenX, n.y - tokenY);
        const a = reduced ? 0.6 : clamp(1 - d / 140, 0, 1);
        const isWorld = n.id === "WORLD";
        const fill = n.color === R.signal ? R.fillBlue : n.color === R.plan ? R.fillAmber : "#eeeeec";
        return (
          <g key={n.id}>
            {isWorld ? (
              <ellipse cx={n.x} cy={n.y} rx={SP_HW} ry={SP_HH} fill={fill} stroke={n.color} strokeWidth={2 + 2 * a} />
            ) : (
              <rect x={n.x - SP_HW} y={n.y - SP_HH} width={SP_HW * 2} height={SP_HH * 2} rx={12} fill={fill} stroke={n.color} strokeWidth={2 + 2 * a} />
            )}
            {isWorld && st.err > 0.02 && (
              <ellipse cx={n.x} cy={n.y} rx={SP_HW} ry={SP_HH} fill="none" stroke={R.error} strokeWidth={3} opacity={clamp(st.err, 0.15, 1)} />
            )}
            <text x={n.x} y={n.y - 3} textAnchor="middle" fontFamily={MONO} fontSize={18} fontWeight={600} fill={R.ink}>
              {n.id}
            </text>
            <text x={n.x} y={n.y + 17} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              {n.sub}
            </text>
          </g>
        );
      })}

      {!reduced && (
        <g>
          <circle cx={tokenX} cy={tokenY} r={13} fill={SP_NODES[seg].color} opacity={0.25} />
          <circle cx={tokenX} cy={tokenY} r={7} fill={SP_NODES[seg].color} />
        </g>
      )}

      {/* error chart, fixed right lane */}
      <text x={SP_CHART.x0} y={106} fontFamily={MONO} fontSize={12} fill={R.world}>
        tracking error → time
      </text>
      <rect x={SP_CHART.x0} y={SP_CHART.y0} width={chartW} height={chartH} fill="none" stroke={R.line} strokeWidth={1.5} rx={4} />
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={SP_CHART.x0} y1={SP_CHART.y1 - g * chartH} x2={SP_CHART.x1} y2={SP_CHART.y1 - g * chartH} stroke={R.line} strokeWidth={0.8} opacity={0.5} />
      ))}
      <polyline points={reduced ? stairPts : histPts} fill="none" stroke={R.error} strokeWidth={2.5} strokeLinejoin="round" />
      <text x={SP_CHART.x0 + 5} y={SP_CHART.y0 + 15} fontFamily={MONO} fontSize={11} fill={R.world}>
        100%
      </text>

      <Readout
        rows={[
          { label: "error", value: `${errPct}%`, color: st.err > 0.02 ? R.error : R.goal },
          { label: "gain", value: gain.toFixed(2) },
          { label: "loops run", value: String(st.loops) },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "data token" },
          { color: R.error, label: "tracking error" },
        ]}
      />
      {reduced && (
        <text x={24} y={404} fontFamily={MONO} fontSize={11.5} fill={R.world}>
          Reduced motion: static loop; disturb + gain still drive the decay curve.
        </text>
      )}
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        each pass multiplies the error by (1 − gain) — feedback shrinks mistakes geometrically
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.2 · Revolute vs prismatic joints  (true 3D, orbitable)
// Both primitive joints in one 3D scene: a revolute link swinging about its
// dashed axis (its state: one angle) and a prismatic carriage sliding on a
// rail (its state: one distance). Amber marks the single number each owns.
// ===========================================================================

export function RbJointTypes() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-32, 24);
  const [theta, setTheta] = useState(60); // deg
  const [dist, setDist] = useState(35); // cm
  const [disp, setDisp] = useState({ a: 60, d: 35 });

  useRafLoop(
    (dt) =>
      setDisp((s) => ({
        a: approach(s.a, theta, 0.2, dt),
        d: approach(s.d, dist, 0.2, dt),
      })),
    { playing: inView && !reduced },
  );
  const a = reduced ? theta : disp.a;
  const d = reduced ? dist : disp.d;
  const ang = rad(a);

  const hub: V3 = [-0.72, 0, 0.3];
  const tip: V3 = [-0.72 + 0.55 * Math.cos(ang), 0.55 * Math.sin(ang), 0.3];
  const yd = -0.45 + (d / 60) * 0.9;

  const prims: Prim3D[] = [
    ...grid3(1.2, 0.4),
    // --- revolute ---
    ...box3([-0.72, 0, 0.12], quat.id, 0.26, 0.26, 0.24, R.world),
    seg3([-0.72, 0, 0], [-0.72, 0, 0.82], R.plan, { width: 2, dash: "4 4" }),
    label3([-0.72, 0, 0.9], "axis", R.plan, { anchor: "middle", dy: -4, size: 12 }),
    // zero reference + swept arc: the angle θ made visible
    seg3(hub, [-0.72 + 0.55, 0, 0.3], R.world, { width: 1.5, dash: "2 5", opacity: 0.7 }),
    ...curve3((u) => [-0.72 + 0.5 * Math.cos(u * ang), 0.5 * Math.sin(u * ang), 0.3], R.plan, { n: 26, width: 2.5 }),
    seg3(hub, tip, R.signal, { width: 7 }),
    dot3(tip, R.signal, { r: 6 }),
    dot3(hub, R.ink, { r: 4.5 }),
    label3([-0.72, 0, 1.08], "revolute — one angle", R.ink, { anchor: "middle", size: 12.5 }),
    // --- prismatic ---
    seg3([0.58, -0.55, 0.08], [0.58, 0.55, 0.08], R.world, { width: 2.5 }),
    seg3([0.86, -0.55, 0.08], [0.86, 0.55, 0.08], R.world, { width: 2.5 }),
    seg3([0.58, -0.55, 0.08], [0.86, -0.55, 0.08], R.world, { width: 2.5 }),
    seg3([0.58, 0.55, 0.08], [0.86, 0.55, 0.08], R.world, { width: 2.5 }),
    ...box3([0.72, yd, 0.18], quat.id, 0.3, 0.24, 0.2, R.signal),
    // the travelled distance d, made visible
    dot3([0.72, -0.45, 0.34], R.plan, { r: 3 }),
    seg3([0.72, -0.45, 0.34], [0.72, yd, 0.34], R.plan, { width: 2.5 }),
    dot3([0.72, yd, 0.34], R.plan, { r: 4 }),
    label3([0.72, 0, 0.78], "prismatic — one distance", R.ink, { anchor: "middle", size: 12.5 }),
  ];

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 5, zoom: 145, cy: 245 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.2 · Revolute vs prismatic joints"
      ariaLabel={`A 3D revolute joint at ${Math.round(a)} degrees beside a prismatic joint at ${Math.round(d)} centimetres. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Slider label="θ" min={0} max={170} value={theta} onChange={setTheta} fmt={(v) => `${v}°`} />
          <Slider label="d" min={0} max={60} value={dist} onChange={setDist} fmt={(v) => `${v} cm`} />
          <Btn
            onClick={() => {
              setTheta(60);
              setDist(35);
              orbit.reset();
            }}
          >
            ↺ reset
          </Btn>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "θ (revolute)", value: `${Math.round(a)}°`, color: R.plan },
          { label: "d (prismatic)", value: `${Math.round(d)} cm`, color: R.plan },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "moving part" },
          { color: R.plan, label: "its one number" },
          { color: R.world, label: "structure" },
        ]}
      />
      {reduced && (
        <text x={24} y={404} fontFamily={MONO} fontSize={11.5} fill={R.world}>
          Reduced motion: joints jump to the slider values instead of easing.
        </text>
      )}
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        each joint contributes exactly one number to the state — a six-joint arm is six numbers
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.3 · Configuration space of a 3-joint arm  (dual true-3D, orbitable)
// Left: a yaw-pitch-pitch arm posed by real forward kinematics. Right: the
// 3D box of joint angles (θ1, θ2, θ3) where the whole arm is ONE point.
// Playing runs a scripted joint trajectory; the hand traces a complicated
// curl in the workspace while the config point draws one smooth curve.
// ===========================================================================

const C3 = 0.55; // cube half-extent in world units
// joint limits: θ1 ∈ ±180, θ2 ∈ [0, 90], θ3 ∈ [−105, 5]
function scripted3(tau: number): [number, number, number] {
  return [
    130 * Math.sin(0.45 * tau),
    45 + 35 * Math.sin(0.8 * tau + 1.2),
    -50 + 55 * Math.sin(0.6 * tau + 2.1),
  ];
}
function armFk(t: [number, number, number]) {
  const q1 = quat.fromAxisAngle([0, 0, 1], rad(t[0]));
  const q2 = quat.mul(q1, quat.fromAxisAngle([0, 1, 0], -rad(t[1])));
  const q3 = quat.mul(q2, quat.fromAxisAngle([0, 1, 0], -rad(t[2])));
  const S: V3 = [0, 0, 0.42];
  const E = v3.add(S, v3.scale(quat.rotate(q2, [1, 0, 0]), 0.45));
  const T = v3.add(E, v3.scale(quat.rotate(q3, [1, 0, 0]), 0.38));
  return { S, E, T };
}
const cubePt = (t: [number, number, number]): V3 => [
  (t[0] / 180) * C3,
  ((t[1] - 45) / 45) * C3,
  ((t[2] + 50) / 55) * C3,
];
const trailSegs = (pts: V3[], color: string): Prim3D[] =>
  pts.slice(1).map((p, i) => seg3(pts[i], p, color, { width: 2, opacity: 0.85 }));

export function RbConfigSpace() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-30, 22);
  const [playing, setPlaying] = useState(true);
  const [st, setSt] = useState({
    tau: 0,
    t: scripted3(0),
    trailW: [] as V3[],
    trailC: [] as V3[],
    acc: 0,
  });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        const tau = s.tau + dt * 0.7;
        const t = scripted3(tau);
        const acc = s.acc + dt;
        if (acc < 0.07) return { ...s, tau, t, acc };
        return {
          tau,
          t,
          acc: 0,
          trailW: [...s.trailW.slice(-95), armFk(t).T],
          trailC: [...s.trailC.slice(-95), cubePt(t)],
        };
      });
    },
    { playing: playing && inView && !reduced },
  );

  // reduced motion: draw the entire scripted path statically, still orbitable
  const staticTrail = useMemo(() => {
    if (!reduced) return null;
    return Array.from({ length: 110 }, (_, i) => {
      const t = scripted3(i * 0.13);
      return { w: armFk(t).T, c: cubePt(t) };
    });
  }, [reduced]);
  const trailW = staticTrail ? staticTrail.map((p) => p.w) : st.trailW;
  const trailC = staticTrail ? staticTrail.map((p) => p.c) : st.trailC;

  const t = st.t;
  const { S, E, T } = armFk(t);
  const cp = cubePt(t);

  const setJoint = (i: number) => (v: number) => {
    setPlaying(false);
    setSt((s) => {
      const nt = [...s.t] as [number, number, number];
      nt[i] = v;
      return { ...s, t: nt };
    });
  };

  const primsL: Prim3D[] = [
    ...grid3(0.8, 0.4),
    seg3([0, 0, 0], S, R.world, { width: 5 }),
    dot3([0, 0, 0], R.ink, { r: 4 }),
    ...trailSegs(trailW, R.plan),
    seg3(S, E, R.signal, { width: 7 }),
    seg3(E, T, R.signal, { width: 6 }),
    dot3(S, R.ink, { r: 4.5 }),
    dot3(E, R.ink, { r: 4 }),
    dot3(T, R.plan, { r: 6 }),
    label3(v3.add(T, [0, 0, 0.13]), "hand", R.plan, { anchor: "middle", dy: -2, size: 12 }),
  ];

  const primsR: Prim3D[] = [
    ...box3([0, 0, 0], quat.id, 2 * C3, 2 * C3, 2 * C3, R.line),
    seg3([-C3, -C3, -C3], [C3, -C3, -C3], R.world, { width: 2.5 }),
    seg3([-C3, -C3, -C3], [-C3, C3, -C3], R.world, { width: 2.5 }),
    seg3([-C3, -C3, -C3], [-C3, -C3, C3], R.world, { width: 2.5 }),
    label3([C3 + 0.18, -C3, -C3], "θ1", R.world, { anchor: "middle", size: 12 }),
    label3([-C3, C3 + 0.18, -C3], "θ2", R.world, { anchor: "middle", size: 12 }),
    label3([-C3, -C3, C3 + 0.15], "θ3", R.world, { anchor: "middle", dy: -4, size: 12 }),
    ...trailSegs(trailC, R.goal),
    dot3(cp, R.goal, { r: 6.5 }),
  ];

  const camL: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 5.4, zoom: 118, cx: 186, cy: 252 };
  const camR: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 5.4, zoom: 126, cx: 542, cy: 240 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.3 · Configuration space: the whole arm is one point"
      ariaLabel={`A 3-joint arm at angles ${Math.round(t[0])}, ${Math.round(t[1])}, ${Math.round(t[2])} degrees beside its configuration-space box, where the whole pose is a single point. Drag to orbit both views.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={() => setPlaying((v) => !v)}
            onReset={() => {
              setSt({ tau: 0, t: scripted3(0), trailW: [], trailC: [], acc: 0 });
              setPlaying(true);
              orbit.reset();
            }}
          />
          <Slider label="θ1" min={-180} max={180} value={Math.round(t[0])} onChange={setJoint(0)} fmt={(v) => `${v}°`} />
          <Slider label="θ2" min={0} max={90} value={Math.round(t[1])} onChange={setJoint(1)} fmt={(v) => `${v}°`} />
          <Slider label="θ3" min={-105} max={5} value={Math.round(t[2])} onChange={setJoint(2)} fmt={(v) => `${v}°`} />
        </>
      }
    >
      <line x1={368} y1={48} x2={368} y2={392} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <Scene3D cam={camL} prims={primsL} />
      <Scene3D cam={camR} prims={primsR} />
      <text x={186} y={404} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        workspace — what the body does
      </text>
      <text x={542} y={404} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        joint space (θ1, θ2, θ3) — one point
      </text>
      <Readout
        rows={[
          { label: "θ1 θ2 θ3", value: `${Math.round(t[0])}° ${Math.round(t[1])}° ${Math.round(t[2])}°` },
          { label: "hand (x,y,z)", value: `(${T[0].toFixed(2)}, ${T[1].toFixed(2)}, ${T[2].toFixed(2)})` },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "the arm" },
          { color: R.plan, label: "hand path" },
          { color: R.goal, label: "config point" },
        ]}
      />
      {reduced && (
        <text x={24} y={382} fontFamily={MONO} fontSize={11.5} fill={R.world}>
          Reduced motion: the scripted path is drawn statically; sliders still pose the arm.
        </text>
      )}
      <text x={360} y={426} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        a complicated hand path in the world is one smooth curve through the θ-box
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.4 · The speed–torque trade of a gearbox  (slider-driven, real physics)
// A DC motor's linear torque–speed curve, reflected through a gear ratio N:
// τ_out = ηNτ_m, ω_out = ω_m/N. The operating point is the intersection of
// the reflected curve with the load line τ_L = mgr. No intersection = stall.
// ===========================================================================

const GB = { tauS: 0.5, w0: 50, eta: 0.85, r: 0.05, g: 9.81 }; // N·m, rev/s, -, m
const GB_PLOT = { x0: 64, x1: 336, y0: 96, y1: 352 };

function gbGear(cx: number, cy: number, r: number, angDeg: number, color: string, teeth: number) {
  return (
    <g transform={`rotate(${angDeg} ${cx} ${cy})`}>
      <circle cx={cx} cy={cy} r={r} fill="#efefec" stroke={color} strokeWidth={3} />
      {Array.from({ length: teeth }).map((_, i) => (
        <rect key={i} x={cx - 3.5} y={cy - r - 7} width={7} height={9} fill={color} transform={`rotate(${(i / teeth) * 360} ${cx} ${cy})`} />
      ))}
      <line x1={cx} y1={cy} x2={cx} y2={cy - r + 5} stroke={color} strokeWidth={3} />
    </g>
  );
}

export function RbGearbox() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [ratio, setRatio] = useState(20);
  const [mass, setMass] = useState(8);
  const [anim, setAnim] = useState({ ma: 0, oa: 0, lift: 0 });

  const tauL = mass * GB.g * GB.r; // load torque, N·m
  const tauMax = GB.eta * ratio * GB.tauS; // stall torque at the output
  const stalled = tauL >= tauMax;
  const wm = stalled ? 0 : GB.w0 * (1 - tauL / tauMax); // motor speed, rev/s
  const wout = wm / ratio; // output speed, rev/s
  const vLift = wout * 2 * Math.PI * GB.r; // m/s

  useRafLoop(
    (dt) => {
      // gears spin at the true computed speeds, scaled by one shared factor
      setAnim((s) => ({
        ma: (s.ma + dt * wm * 360 * 0.08) % 360,
        oa: (s.oa - dt * wout * 360 * 0.08) % 360,
        lift: clamp(s.lift + (dt * vLift) / 0.5, 0, 1),
      }));
    },
    { playing: inView && !reduced && !stalled && anim.lift < 1 },
  );
  const lift = reduced ? (stalled ? 0 : 0.5) : anim.lift;

  const X = (w: number) => GB_PLOT.x0 + (w / 50) * (GB_PLOT.x1 - GB_PLOT.x0);
  const Y = (tq: number) => GB_PLOT.y1 - (clamp(tq, 0, 45) / 45) * (GB_PLOT.y1 - GB_PLOT.y0);
  const wNoLoad = GB.w0 / ratio;
  const curveStr = Array.from({ length: 41 }, (_, i) => {
    const w = wNoLoad * (i / 40);
    return { w, tq: tauMax * (1 - w / wNoLoad) };
  })
    .filter((p) => p.tq <= 45.2)
    .map((p) => `${X(p.w)},${Y(p.tq)}`)
    .join(" ");

  const weightTop = 336 - lift * 140;

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.4 · The speed–torque trade of a gearbox"
      ariaLabel={`Gearbox at ${ratio} to 1 driving a ${mass} kilogram winch load; output ${wout.toFixed(2)} revolutions per second, ${stalled ? "stalled" : "lifting"}. A torque-speed plot shows the operating point.`}
      controls={
        <>
          <Slider label="gear ratio" min={1} max={100} value={ratio} onChange={setRatio} fmt={(v) => `${v}:1`} />
          <Slider
            label="load"
            min={0.5}
            max={40}
            step={0.5}
            value={mass}
            onChange={(v) => {
              setMass(v);
              setAnim((s) => ({ ...s, lift: 0 }));
            }}
            fmt={(v) => `${v} kg`}
          />
          <Btn onClick={() => setAnim({ ma: 0, oa: 0, lift: 0 })}>↺ reset</Btn>
        </>
      }
    >
      {/* torque–speed plot, fixed left lane */}
      <line x1={GB_PLOT.x0} y1={GB_PLOT.y0} x2={GB_PLOT.x0} y2={GB_PLOT.y1} stroke={R.line} strokeWidth={1.5} />
      <line x1={GB_PLOT.x0} y1={GB_PLOT.y1} x2={GB_PLOT.x1} y2={GB_PLOT.y1} stroke={R.line} strokeWidth={1.5} />
      <text x={(GB_PLOT.x0 + GB_PLOT.x1) / 2} y={376} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        output speed (rev/s) →
      </text>
      <text x={40} y={224} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world} transform="rotate(-90 40 224)">
        output torque (N·m) →
      </text>
      <text x={GB_PLOT.x0 - 6} y={GB_PLOT.y0 + 4} textAnchor="end" fontFamily={MONO} fontSize={11} fill={R.world}>
        45
      </text>
      <text x={GB_PLOT.x1} y={GB_PLOT.y1 + 16} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
        50
      </text>
      <polyline points={curveStr} fill="none" stroke={R.signal} strokeWidth={3} strokeLinecap="round" />
      <line x1={GB_PLOT.x0} y1={Y(tauL)} x2={GB_PLOT.x1} y2={Y(tauL)} stroke={R.plan} strokeWidth={2.5} strokeDasharray="6 5" />
      <text x={GB_PLOT.x1 - 4} y={Y(tauL) - 7} textAnchor="end" fontFamily={MONO} fontSize={11.5} fill={R.plan}>
        load τ = mgr
      </text>
      {stalled ? (
        <>
          <circle cx={X(0)} cy={Y(tauL)} r={7} fill="none" stroke={R.error} strokeWidth={3} />
          <text x={X(0) + 14} y={Y(tauL) + 4} fontFamily={MONO} fontSize={12.5} fill={R.error} fontWeight={600}>
            no intersection: stall
          </text>
        </>
      ) : (
        <>
          <circle cx={X(wout)} cy={Y(tauL)} r={7} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
          <text x={X(wout) + 12} y={Y(tauL) - 10} fontFamily={MONO} fontSize={12} fill={R.goal} fontWeight={600}>
            operating point
          </text>
        </>
      )}

      {/* motor -> gearbox -> winch -> weight, fixed right lane */}
      {gbGear(412, 196, 24, reduced ? 0 : anim.ma, R.signal, 8)}
      <text x={412} y={250} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        motor
      </text>
      <line x1={436} y1={196} x2={448} y2={196} stroke={R.world} strokeWidth={4} />
      <rect x={448} y={168} width={64} height={56} rx={8} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
      <text x={480} y={201} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.ink} fontWeight={600}>
        {ratio}:1
      </text>
      <text x={480} y={250} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        gearbox
      </text>
      <line x1={512} y1={196} x2={538} y2={196} stroke={R.world} strokeWidth={4} />
      {gbGear(560, 196, 20, reduced ? 0 : anim.oa, R.plan, 10)}
      <text x={560} y={250} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
        winch
      </text>
      <line x1={560} y1={176} x2={645} y2={176} stroke={R.world} strokeWidth={2} />
      <line x1={645} y1={176} x2={645} y2={weightTop} stroke={R.world} strokeWidth={2} />
      <rect
        x={623}
        y={weightTop}
        width={44}
        height={40}
        rx={6}
        fill={stalled ? R.fillRed : lift >= 1 ? R.fillGreen : "#eeeeec"}
        stroke={stalled ? R.error : lift >= 1 ? R.goal : R.world}
        strokeWidth={3}
      />
      <text x={645} y={weightTop + 25} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>
        {mass}
      </text>
      <line x1={600} y1={377} x2={692} y2={377} stroke={R.line} strokeWidth={2} />

      <Readout
        rows={[
          { label: "torque avail", value: `${tauMax.toFixed(1)} N·m`, color: R.signal },
          { label: "load needs", value: `${tauL.toFixed(1)} N·m`, color: stalled ? R.error : R.plan },
          { label: "lift speed", value: stalled ? "0 — stalled" : `${(vLift * 100).toFixed(1)} cm/s`, color: stalled ? R.error : R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "motor curve (geared)" },
          { color: R.plan, label: "load line", dash: true },
          { color: R.goal, label: "operating point" },
          { color: R.error, label: "stall" },
        ]}
      />
      {reduced && (
        <text x={24} y={404} fontFamily={MONO} fontSize={11.5} fill={R.world}>
          Reduced motion: gears at rest; the plot and readout still track the sliders.
        </text>
      )}
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={stalled ? R.error : R.world}>
        {stalled
          ? "the load line sits above the whole motor curve — no intersection, no motion"
          : "raise the ratio and the curve pivots: more torque, less speed — same power, different shape"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.5 · Every sensor is blind to something  (toggle-compare, real models)
// Encoder: integrated wheel counts diverge from ground truth across an oil
// patch. IMU: a seeded accelerometer error double-integrated into drift.
// Camera: two balls with equal angular size project to the SAME image.
// LiDAR: real ray casting against a wall and an unlabeled shape.
// ===========================================================================

type SensorTab = "encoder" | "imu" | "camera" | "lidar" | "fuse";
const SENSOR_TABS: { id: SensorTab; label: string }[] = [
  { id: "encoder", label: "Encoder" },
  { id: "imu", label: "IMU" },
  { id: "camera", label: "Camera" },
  { id: "lidar", label: "LiDAR" },
  { id: "fuse", label: "Fuse all" },
];
const BLIND: Record<SensorTab, string> = {
  encoder: "blind to slip: it counts wheel turns, not the world",
  imu: "drift: integrating noisy acceleration twice grows error like t²",
  camera: "no depth: two different worlds land on identical pixels",
  lidar: "no meaning: crisp geometry, zero idea what the shape is",
  fuse: "each sensor covers another's blind spot",
};

// deterministic IMU drift: bias + seeded noise, double-integrated at 20 Hz
const IMU_N = 240; // 12 s
const IMU_DRIFT: number[] = (() => {
  const rng = mulberry32(2024);
  let vel = 0;
  let pos = 0;
  const out = [0];
  for (let i = 1; i <= IMU_N; i++) {
    const acc = 0.02 + 0.1 * (rng() - 0.5); // m/s²: bias + noise
    vel += acc * 0.05;
    pos += vel * 0.05;
    out.push(pos);
  }
  return out;
})();
const IMU_MAX = Math.max(...IMU_DRIFT);

// encoder scenario: constant commanded speed, 50% slip across the oil patch
const ENC = (() => {
  const v = 90; // commanded px/s (1 px = 1 cm)
  const x0 = 70;
  const o0 = 280;
  const o1 = 370;
  const slip = 0.5;
  const xEnd = 580;
  const t1 = (o0 - x0) / v;
  const t2 = t1 + (o1 - o0) / (v * slip);
  const T = t2 + (xEnd - o1) / v;
  return { v, x0, o0, o1, slip, xEnd, t1, t2, T };
})();
const encTrue = (u: number) =>
  u < ENC.t1
    ? ENC.x0 + ENC.v * u
    : u < ENC.t2
      ? ENC.o0 + ENC.v * ENC.slip * (u - ENC.t1)
      : ENC.o1 + ENC.v * (u - ENC.t2);

// lidar ray cast against a vertical wall segment and a circle
function castRay(ox: number, oy: number, angRad: number, wallX: number, c: { x: number; y: number; r: number }) {
  const dx = Math.cos(angRad);
  const dy = Math.sin(angRad);
  const hits: number[] = [];
  if (dx > 1e-6) {
    const tw = (wallX - ox) / dx;
    const yw = oy + tw * dy;
    if (yw >= 130 && yw <= 370) hits.push(tw);
  }
  const fx = ox - c.x;
  const fy = oy - c.y;
  const b = fx * dx + fy * dy;
  const disc = b * b - (fx * fx + fy * fy - c.r * c.r);
  if (disc >= 0) {
    const tc = -b - Math.sqrt(disc);
    if (tc > 0) hits.push(tc);
  }
  return hits.length ? Math.min(...hits) : null;
}

export function RbSensors() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<SensorTab>("encoder");
  const [t, setT] = useState(0);

  useRafLoop(
    (dt) => setT((x) => (x + dt) % (tab === "encoder" ? ENC.T : 12)),
    { playing: inView && !reduced && (tab === "encoder" || tab === "imu") },
  );

  // ---- encoder ----
  const uEnc = reduced ? 5.4 : t;
  const xTrue = encTrue(uEnc);
  const xBel = ENC.x0 + ENC.v * uEnc;
  // ---- imu ----
  const uImu = reduced ? 9 : t;
  const imuIdx = Math.min(Math.floor(uImu / 0.05), IMU_N);
  const drift = IMU_DRIFT[imuIdx];
  const imuCurve = IMU_DRIFT.slice(0, imuIdx + 1)
    .map((p, i) => `${360 + (i / IMU_N) * 330},${320 - (p / IMU_MAX) * 190}`)
    .join(" ");
  // ---- camera ----
  const pin = { x: 170, y: 226 };
  const focal = 52;
  const planeX = pin.x - focal;
  const near = { x: 350, r: 30 }; // z = 180 px
  const far = { x: 620, r: 75 }; // z = 450 px, same r/z ratio
  const imgR = (focal * near.r) / (near.x - pin.x);
  const rayTo = (ox: number, oy: number) => {
    // ray object -> pinhole, extended to the image plane (inverted image)
    const s = focal / (ox - pin.x);
    return pin.y + (pin.y - oy) * s;
  };
  // ---- lidar ----
  const bot = { x: 170, y: 250 };
  const wallX = 600;
  const person = { x: 420, y: 250, r: 30 };
  const rays = Array.from({ length: 17 }, (_, i) => {
    const a = rad(-20 + i * 2.5);
    const hit = castRay(bot.x, bot.y, a, wallX, person);
    const tr = hit === null ? 470 : Math.min(hit, 470);
    return { x: bot.x + tr * Math.cos(a), y: bot.y + tr * Math.sin(a), hit: hit !== null };
  });
  const returns = rays.filter((r) => r.hit).length;

  const readouts: Record<SensorTab, { label: string; value: string; color?: string }[]> = {
    encoder: [
      { label: "odometry says", value: `${Math.round(xBel - ENC.x0)} cm` },
      { label: "actually moved", value: `${Math.round(xTrue - ENC.x0)} cm`, color: R.goal },
      { label: "error", value: `${Math.round(xBel - xTrue)} cm`, color: xBel - xTrue > 2 ? R.error : R.ink },
    ],
    imu: [
      { label: "time", value: `${uImu.toFixed(1)} s` },
      { label: "drift", value: `${drift.toFixed(2)} m`, color: drift > 0.3 ? R.error : R.ink },
      { label: "growth", value: "∝ t²", color: R.error },
    ],
    camera: [
      { label: "near ball h/z", value: (near.r / (near.x - pin.x)).toFixed(3) },
      { label: "far ball h/z", value: (far.r / (far.x - pin.x)).toFixed(3) },
      { label: "image size", value: `${(2 * imgR).toFixed(1)} px both`, color: R.error },
    ],
    lidar: [
      { label: "beams fired", value: "17" },
      { label: "returns", value: String(returns) },
      { label: "labels", value: "none", color: R.error },
    ],
    fuse: [
      { label: "position", value: "pinned ✓", color: R.goal },
      { label: "person", value: "2.5 m ✓", color: R.goal },
      { label: "drift", value: "corrected ✓", color: R.goal },
    ],
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.5 · Every sensor is blind to something"
      ariaLabel={`The same scene through the ${tab} sensor, with its blind spot called out: ${BLIND[tab]}`}
      controls={
        <Tabs
          options={SENSOR_TABS}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setT(0);
          }}
        />
      }
    >
      {tab === "encoder" && (
        <>
          <line x1={30} y1={340} x2={690} y2={340} stroke={R.line} strokeWidth={2} />
          <rect x={ENC.o0} y={333} width={ENC.o1 - ENC.o0} height={13} rx={6} fill="#dfe4ec" stroke={R.line} strokeWidth={1.5} />
          <text x={(ENC.o0 + ENC.o1) / 2} y={366} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
            oil (wheels slip)
          </text>
          <circle cx={clamp(xBel, 40, 690)} cy={312} r={20} fill="none" stroke={R.error} strokeWidth={3} strokeDasharray="5 5" />
          <text x={clamp(xBel, 70, 660)} y={266} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>
            where odometry says
          </text>
          <circle cx={xTrue} cy={312} r={20} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          <circle cx={xTrue - 10} cy={336} r={7} fill="#eeeeec" stroke={R.signal} strokeWidth={2.5} />
          <circle cx={xTrue + 10} cy={336} r={7} fill="#eeeeec" stroke={R.signal} strokeWidth={2.5} />
          <text x={xTrue} y={386} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
            true robot
          </text>
          {xBel - xTrue > 30 && svgArrow(xTrue + 26, 312, clamp(xBel, 40, 690) - 26, 312, R.error, 2.5, 8)}
        </>
      )}
      {tab === "imu" && (
        <>
          <line x1={30} y1={340} x2={330} y2={340} stroke={R.line} strokeWidth={2} />
          <circle cx={150} cy={312} r={20} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          <text x={150} y={386} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
            true (still)
          </text>
          <circle cx={150 + drift * 90} cy={312 - drift * 20} r={20} fill="none" stroke={R.error} strokeWidth={3} strokeDasharray="5 5" />
          <text x={150 + drift * 90} y={266 - drift * 20} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>
            where the IMU thinks it is
          </text>
          <text x={360} y={106} fontFamily={MONO} fontSize={12} fill={R.world}>
            position error vs time — noise integrated twice
          </text>
          <rect x={360} y={118} width={330} height={204} fill="none" stroke={R.line} strokeWidth={1.5} rx={4} />
          <polyline points={imuCurve} fill="none" stroke={R.error} strokeWidth={2.5} />
          <text x={366} y={134} fontFamily={MONO} fontSize={11} fill={R.world}>
            {IMU_MAX.toFixed(1)} m
          </text>
          <text x={676} y={336} textAnchor="end" fontFamily={MONO} fontSize={11} fill={R.world}>
            12 s
          </text>
        </>
      )}
      {tab === "camera" && (
        <>
          <rect x={pin.x - 4} y={196} width={26} height={60} rx={5} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
          <circle cx={pin.x} cy={pin.y} r={4} fill={R.ink} />
          <line x1={planeX} y1={166} x2={planeX} y2={286} stroke={R.world} strokeWidth={2} />
          <text x={planeX} y={156} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={R.world}>
            image plane
          </text>
          {/* rays: ball silhouette edges through the pinhole onto the plane */}
          {[near, far].map((b, i) => (
            <g key={i} opacity={0.75}>
              <line x1={b.x} y1={pin.y - b.r} x2={pin.x} y2={pin.y} stroke={R.signal} strokeWidth={1.2} />
              <line x1={b.x} y1={pin.y + b.r} x2={pin.x} y2={pin.y} stroke={R.signal} strokeWidth={1.2} />
              <line x1={pin.x} y1={pin.y} x2={planeX} y2={rayTo(b.x, pin.y - b.r)} stroke={R.signal} strokeWidth={1.2} strokeDasharray="3 3" />
              <line x1={pin.x} y1={pin.y} x2={planeX} y2={rayTo(b.x, pin.y + b.r)} stroke={R.signal} strokeWidth={1.2} strokeDasharray="3 3" />
            </g>
          ))}
          <circle cx={near.x} cy={pin.y} r={near.r} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
          <text x={near.x} y={pin.y + near.r + 20} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
            0.3 m ball at 1.8 m
          </text>
          <circle cx={far.x} cy={pin.y} r={far.r} fill="none" stroke={R.goal} strokeWidth={3} />
          <text x={far.x} y={pin.y + far.r + 22} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
            0.75 m ball at 4.5 m
          </text>
          <line x1={planeX} y1={pin.y - imgR} x2={planeX} y2={pin.y + imgR} stroke={R.error} strokeWidth={6} />
          <text x={planeX} y={310} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={R.error} fontWeight={600}>
            one identical image
          </text>
        </>
      )}
      {tab === "lidar" && (
        <>
          <circle cx={bot.x} cy={bot.y} r={20} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          <rect x={wallX} y={130} width={14} height={240} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
          <text x={wallX + 7} y={120} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
            wall
          </text>
          {rays.map((rr, i) => (
            <g key={i}>
              <line x1={bot.x} y1={bot.y} x2={rr.x} y2={rr.y} stroke={R.signal} strokeWidth={1} opacity={0.25} />
              {rr.hit && <circle cx={rr.x} cy={rr.y} r={3} fill={R.signal} />}
            </g>
          ))}
          <circle cx={person.x} cy={person.y} r={person.r} fill="none" stroke={R.line} strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={person.x} y={person.y + person.r + 24} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>
            a shape — person? pillar?
          </text>
        </>
      )}
      {tab === "fuse" && (
        <>
          <line x1={30} y1={340} x2={690} y2={340} stroke={R.line} strokeWidth={2} />
          <rect x={wallX} y={130} width={14} height={210} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
          <circle cx={bot.x} cy={312} r={20} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
          <text x={bot.x} y={368} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
            pose pinned ✓
          </text>
          <rect x={person.x - 16} y={234} width={32} height={72} rx={8} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
          <circle cx={person.x} cy={220} r={11} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
          <line x1={bot.x + 22} y1={306} x2={person.x - 18} y2={280} stroke={R.goal} strokeWidth={2} strokeDasharray="5 4" />
          <text x={person.x} y={330} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
            person, 2.5 m away ✓
          </text>
          <text x={300} y={160} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
            camera names it · lidar ranges it · encoders + IMU track the body
          </text>
        </>
      )}

      <Readout rows={readouts[tab]} />
      <Legend
        items={[
          { color: R.signal, label: "sensor reading" },
          { color: R.goal, label: "ground truth" },
          { color: R.error, label: "blind spot" },
        ]}
      />
      {reduced && (
        <text x={24} y={404} fontFamily={MONO} fontSize={11.5} fill={R.world}>
          Reduced motion: encoder and IMU scenes shown at a fixed instant.
        </text>
      )}
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={tab === "fuse" ? R.goal : R.error}>
        {tab === "fuse" ? "✓ " : "blind spot: "}
        {BLIND[tab]}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.6 · One loop, many bodies  (true 3D, orbitable toggle-compare)
// Five embodiments built from real 3D primitives, each with a calm idle
// motion. The DoF toggle draws amber rings/arrows on every freedom so the
// reader can literally count where the numbers live.
// ===========================================================================

type BodyId = "arm" | "wheeled" | "quadruped" | "humanoid" | "drone";
const BODIES: { id: BodyId; label: string; dof: string; base: string; hard: string }[] = [
  { id: "arm", label: "Arm", dof: "6", base: "fixed", hard: "kinematics" },
  { id: "wheeled", label: "Wheeled", dof: "3", base: "floating", hard: "localization" },
  { id: "quadruped", label: "Quadruped", dof: "12", base: "floating", hard: "balance" },
  { id: "humanoid", label: "Humanoid", dof: "25+", base: "floating", hard: "everything at once" },
  { id: "drone", label: "Drone", dof: "6 (4 motors)", base: "floating", hard: "underactuation" },
];
const BODY_HINT: Record<BodyId, string> = {
  arm: "bolted down: where it is comes free — what the hand does is everything",
  wheeled: "3 pose numbers, and every one of them has to be estimated on the move",
  quadruped: "12 motors, but gravity owns the six DoF of the floating body",
  humanoid: "every hard problem at once, in a body shaped for human tools",
  drone: "4 motors commanding 6 DoF — underactuated by design",
};

function armBody(osc: number, dof: boolean): Prim3D[] {
  const a1 = rad(58 + 12 * osc);
  const a2 = rad(-70 + 16 * osc);
  const S: V3 = [0, 0, 0.22];
  const E: V3 = [0.42 * Math.cos(a1), 0, 0.22 + 0.42 * Math.sin(a1)];
  const T: V3 = [E[0] + 0.36 * Math.cos(a1 + a2), 0, E[2] + 0.36 * Math.sin(a1 + a2)];
  return [
    ...box3([0, 0, 0.1], quat.id, 0.36, 0.36, 0.2, R.world),
    seg3(S, E, R.signal, { width: 7 }),
    seg3(E, T, R.signal, { width: 6 }),
    dot3(S, R.ink, { r: 4.5 }),
    dot3(E, R.ink, { r: 4 }),
    dot3(T, R.signal, { r: 5.5 }),
    ...(dof
      ? [
          ...ring3(S, [0, 0, 1], 0.15, R.plan, { n: 20, width: 2 }),
          ...ring3(S, [0, 1, 0], 0.11, R.plan, { n: 20, width: 2 }),
          ...ring3(E, [0, 1, 0], 0.09, R.plan, { n: 20, width: 2 }),
          label3([0, 0, 1.05], "one ring per motorized joint", R.plan, { anchor: "middle", size: 12 }),
        ]
      : []),
  ];
}
function wheeledBody(osc: number, dof: boolean): Prim3D[] {
  const x = 0.28 * osc;
  const wheels: Prim3D[] = [-0.16, 0.16].flatMap((wx) =>
    [-0.22, 0.22].flatMap((wy) => ring3([x + wx, wy, 0.11], [0, 1, 0], 0.11, R.world, { n: 16, width: 2 })),
  );
  return [
    ...box3([x, 0, 0.24], quat.id, 0.56, 0.4, 0.18, R.signal),
    ...wheels,
    ...(dof
      ? [
          seg3([x + 0.34, 0, 0.24], [x + 0.6, 0, 0.24], R.plan, { width: 3 }),
          dot3([x + 0.6, 0, 0.24], R.plan, { r: 4 }),
          ...ring3([x, 0, 0.4], [0, 0, 1], 0.18, R.plan, { n: 20, width: 2 }),
          label3([x, 0, 0.62], "x, y, heading — all estimated", R.plan, { anchor: "middle", size: 12 }),
        ]
      : []),
  ];
}
function quadrupedBody(osc: number, dof: boolean): Prim3D[] {
  const bz = 0.42 + 0.02 * osc;
  const legs: Prim3D[] = [0, 1, 2, 3].flatMap((i) => {
    const hx = i < 2 ? 0.24 : -0.24;
    const hy = i % 2 === 0 ? 0.15 : -0.15;
    const s = (i === 0 || i === 3 ? osc : -osc) * 0.1;
    const hip: V3 = [hx, hy, bz - 0.08];
    const knee: V3 = [hx + s, hy, 0.2];
    const foot: V3 = [hx + 1.8 * s, hy, 0];
    return [seg3(hip, knee, R.signal, { width: 5 }), seg3(knee, foot, R.signal, { width: 4 }), dot3(foot, R.ink, { r: 3 })];
  });
  const hipRings: Prim3D[] = dof
    ? [0, 1, 2, 3].flatMap((i) =>
        ring3([i < 2 ? 0.24 : -0.24, i % 2 === 0 ? 0.15 : -0.15, bz - 0.08], [0, 1, 0], 0.06, R.plan, { n: 14, width: 2 }),
      )
    : [];
  return [
    ...box3([0, 0, bz], quat.id, 0.64, 0.3, 0.16, R.signal),
    ...legs,
    ...hipRings,
    ...(dof ? [label3([0, 0, 0.78], "3 per leg × 4 legs = 12", R.plan, { anchor: "middle", size: 12 })] : []),
  ];
}
function humanoidBody(osc: number, dof: boolean): Prim3D[] {
  const swing = 0.16 * osc;
  const pel: V3 = [0.02 * osc, 0, 0.52];
  const neck: V3 = [0.02 * osc, 0, 0.88];
  return [
    seg3(pel, neck, R.signal, { width: 7 }),
    dot3([neck[0], 0, 0.96], R.signal, { r: 7 }),
    // arms, swinging in counter-phase
    seg3([neck[0], -0.15, 0.84], [swing * 0.6, -0.22, 0.68], R.signal, { width: 4.5 }),
    seg3([swing * 0.6, -0.22, 0.68], [swing, -0.24, 0.54], R.signal, { width: 4 }),
    seg3([neck[0], 0.15, 0.84], [-swing * 0.6, 0.22, 0.68], R.signal, { width: 4.5 }),
    seg3([-swing * 0.6, 0.22, 0.68], [-swing, 0.24, 0.54], R.signal, { width: 4 }),
    // legs, planted
    seg3([pel[0], -0.09, 0.52], [0.02, -0.1, 0.26], R.signal, { width: 5 }),
    seg3([0.02, -0.1, 0.26], [0, -0.11, 0], R.signal, { width: 4.5 }),
    seg3([pel[0], 0.09, 0.52], [0.02, 0.1, 0.26], R.signal, { width: 5 }),
    seg3([0.02, 0.1, 0.26], [0, 0.11, 0], R.signal, { width: 4.5 }),
    ...(dof
      ? [
          ...ring3([neck[0], -0.15, 0.84], [1, 0, 0], 0.06, R.plan, { n: 14, width: 2 }),
          ...ring3([neck[0], 0.15, 0.84], [1, 0, 0], 0.06, R.plan, { n: 14, width: 2 }),
          ...ring3([pel[0], -0.09, 0.52], [1, 0, 0], 0.06, R.plan, { n: 14, width: 2 }),
          ...ring3([pel[0], 0.09, 0.52], [1, 0, 0], 0.06, R.plan, { n: 14, width: 2 }),
          label3([0, 0, 1.12], "25+ joints on a floating base", R.plan, { anchor: "middle", size: 12 }),
        ]
      : []),
  ];
}
function droneBody(osc: number, dof: boolean): Prim3D[] {
  const z = 0.6 + 0.06 * osc;
  const qd = quat.fromAxisAngle([1, 0, 0], rad(7 * osc));
  const c: V3 = [0, 0, z];
  const up = quat.rotate(qd, [0, 0, 1]);
  const corners = ([[1, 1], [1, -1], [-1, 1], [-1, -1]] as const).map(
    ([sx, sy]) => v3.add(c, quat.rotate(qd, [sx * 0.3, sy * 0.3, 0])),
  );
  return [
    dot3([0, 0, 0.005], R.world, { r: 6 }),
    ...corners.flatMap((p): Prim3D[] => [
      seg3(c, p, R.signal, { width: 4 }),
      ...ring3(p, up, 0.15, R.signal, { n: 16, width: 2 }),
      ...(dof
        ? [seg3(p, v3.add(p, v3.scale(up, 0.2)), R.plan, { width: 2.5 }), dot3(v3.add(p, v3.scale(up, 0.2)), R.plan, { r: 3 })]
        : []),
    ]),
    dot3(c, R.ink, { r: 4.5 }),
    ...(dof ? [label3([0, 0, 1.05], "4 thrusts must buy 6 DoF", R.plan, { anchor: "middle", size: 12 })] : []),
  ];
}

export function RbEmbodiments() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-30, 20);
  const [body, setBody] = useState<BodyId>("arm");
  const [showDof, setShowDof] = useState(true);
  const [t, setT] = useState(0);

  useRafLoop((dt) => setT((v) => v + dt), { playing: inView && !reduced });
  const osc = reduced ? 0.4 : Math.sin(t * 1.5);

  const info = BODIES.find((b) => b.id === body)!;
  const bodyPrims =
    body === "arm"
      ? armBody(osc, showDof)
      : body === "wheeled"
        ? wheeledBody(osc, showDof)
        : body === "quadruped"
          ? quadrupedBody(osc, showDof)
          : body === "humanoid"
            ? humanoidBody(osc, showDof)
            : droneBody(osc, showDof);
  const prims: Prim3D[] = [...grid3(0.8, 0.4), ...bodyPrims];

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 5, zoom: 150, cy: 255 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.6 · One loop, many bodies"
      ariaLabel={`A 3D ${info.label} with ${info.dof} degrees of freedom and a ${info.base} base; its hard problem is ${info.hard}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Tabs options={BODIES.map((b) => ({ id: b.id, label: b.label }))} value={body} onChange={setBody} />
          <Btn onClick={() => setShowDof((v) => !v)} active={showDof}>
            {showDof ? "✓ show the DoF" : "show the DoF"}
          </Btn>
          <Btn onClick={() => orbit.reset()}>↺ view</Btn>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "total DoF", value: info.dof, color: R.signal },
          { label: "base", value: info.base, color: info.base === "fixed" ? R.goal : R.plan },
          { label: "hard problem", value: info.hard, color: R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "the body" },
          { color: R.plan, label: "its freedoms" },
        ]}
      />
      {reduced && (
        <text x={24} y={404} fontFamily={MONO} fontSize={11.5} fill={R.world}>
          Reduced motion: bodies hold a fixed pose; tabs and orbit still work.
        </text>
      )}
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {BODY_HINT[body]}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.7 · Holonomic vs nonholonomic motion  (draggable field, real model)
// The car is a kinematic bicycle with a steering limit, so it owns a minimum
// turning radius (drawn in red). The omni base has no velocity constraint and
// slides straight. Drag the target; both use honest integrated dynamics.
// ===========================================================================

const HOLO_START = { x: 180, y: 300, h: 0 };
const BIKE = { L: 38, vCar: 130, phiMax: rad(32), vOmni: 165 };
const RMIN = BIKE.L / Math.tan(BIKE.phiMax); // ≈ 61 px = 0.61 m at 100 px/m

type Pose = { x: number; y: number; h: number };
function holoStep(p: Pose, target: { x: number; y: number }, mode: "omni" | "car", dt: number): Pose {
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const distT = Math.hypot(dx, dy);
  if (distT < 5) return p;
  if (mode === "omni") {
    const step = Math.min(distT, BIKE.vOmni * dt);
    return { x: p.x + (dx / distT) * step, y: p.y + (dy / distT) * step, h: Math.atan2(dy, dx) };
  }
  // kinematic bicycle: ẋ = v cos h, ẏ = v sin h, ḣ = (v/L) tan φ
  const desired = Math.atan2(dy, dx);
  const e = ((desired - p.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const phi = clamp(1.6 * e, -BIKE.phiMax, BIKE.phiMax);
  const vv = BIKE.vCar * clamp(distT / 70, 0.25, 1);
  const h = p.h + (vv / BIKE.L) * Math.tan(phi) * dt;
  return {
    x: clamp(p.x + Math.cos(h) * vv * dt, 30, 690),
    y: clamp(p.y + Math.sin(h) * vv * dt, 30, 392),
    h,
  };
}
function holoSim(target: { x: number; y: number }, mode: "omni" | "car") {
  let p: Pose = HOLO_START;
  const pts: [number, number][] = [[p.x, p.y]];
  for (let i = 0; i < 1600; i++) {
    p = holoStep(p, target, mode, 0.02);
    if (i % 6 === 0) pts.push([p.x, p.y]);
    if (Math.hypot(target.x - p.x, target.y - p.y) < 6) break;
  }
  return { pts, end: p };
}

export function RbHolonomic() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"omni" | "car">("car");
  const [target, setTarget] = useState({ x: 560, y: 150 });
  const [drag, setDrag] = useState(false);
  const [st, setSt] = useState({ pose: HOLO_START as Pose, trail: [] as [number, number][] });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        const pose = holoStep(s.pose, target, mode, dt);
        const last = s.trail[s.trail.length - 1];
        const trail =
          !last || Math.hypot(pose.x - last[0], pose.y - last[1]) > 5
            ? [...s.trail.slice(-219), [pose.x, pose.y] as [number, number]]
            : s.trail;
        return { pose, trail };
      });
    },
    { playing: inView && !reduced },
  );

  // reduced motion: integrate the full path synchronously and draw it static
  const sim = reduced ? holoSim(target, mode) : null;
  const pose = sim ? sim.end : st.pose;
  const trail = sim ? sim.pts : st.trail;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e);
    setTarget({ x: clamp(x, 40, 680), y: clamp(y, 40, 380) });
  };
  const reset = () => setSt({ pose: HOLO_START, trail: [] });

  const distT = Math.hypot(target.x - pose.x, target.y - pose.y);
  const cL = { x: pose.x - RMIN * Math.sin(pose.h), y: pose.y + RMIN * Math.cos(pose.h) };
  const cR = { x: pose.x + RMIN * Math.sin(pose.h), y: pose.y - RMIN * Math.cos(pose.h) };
  const carPts = (() => {
    const c = Math.cos(pose.h);
    const s = Math.sin(pose.h);
    const pt = (fx: number, fy: number) => `${pose.x + fx * c - fy * s},${pose.y + fx * s + fy * c}`;
    return `${pt(24, -13)} ${pt(24, 13)} ${pt(-24, 13)} ${pt(-24, -13)}`;
  })();

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.7 · Holonomic vs nonholonomic motion"
      ariaLabel={`A ${mode === "omni" ? "holonomic omni base sliding straight" : "nonholonomic car with a minimum turning radius"} chasing a draggable target, its path traced`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(false),
        onPointerLeave: () => setDrag(false),
      }}
      controls={
        <>
          <Tabs
            options={[
              { id: "car", label: "car (nonholonomic)" },
              { id: "omni", label: "omni (holonomic)" },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              reset();
            }}
          />
          <Btn onClick={reset}>↺ reset</Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the target</span>
        </>
      }
    >
      {/* faint metric grid */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`v${i}`} x1={40 + i * 90} y1={40} x2={40 + i * 90} y2={392} stroke={R.line} strokeWidth={0.8} opacity={0.5} />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <line key={`h${i}`} x1={40} y1={40 + i * 90} x2={670} y2={40 + i * 90} stroke={R.line} strokeWidth={0.8} opacity={0.5} />
      ))}

      {/* travelled path */}
      {trail.length > 1 && (
        <polyline points={trail.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke={R.signal} strokeWidth={2} opacity={0.45} />
      )}

      {/* the car's steering limit, made visible: minimum-turn circles */}
      {mode === "car" && (
        <g opacity={0.55}>
          <circle cx={cL.x} cy={cL.y} r={RMIN} fill="none" stroke={R.error} strokeWidth={1.5} strokeDasharray="5 5" />
          <circle cx={cR.x} cy={cR.y} r={RMIN} fill="none" stroke={R.error} strokeWidth={1.5} strokeDasharray="5 5" />
        </g>
      )}
      {mode === "car" && (
        <g opacity={0.9}>
          {svgArrow(pose.x, pose.y, pose.x - Math.sin(pose.h) * 58, pose.y + Math.cos(pose.h) * 58, R.error, 2.5, 8)}
          <text
            x={clamp(pose.x - Math.sin(pose.h) * 72, 40, 680)}
            y={clamp(pose.y + Math.cos(pose.h) * 72, 40, 400)}
            fontFamily={MONO}
            fontSize={11}
            fill={R.error}
            textAnchor="middle"
          >
            no sideways
          </text>
        </g>
      )}
      {svgArrow(pose.x, pose.y, pose.x + Math.cos(pose.h) * 52, pose.y + Math.sin(pose.h) * 52, R.goal, 2.5, 9)}

      {mode === "omni" ? (
        <circle cx={pose.x} cy={pose.y} r={20} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      ) : (
        <polygon points={carPts} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      )}

      <circle
        cx={target.x}
        cy={target.y}
        r={13}
        fill={R.fillAmber}
        stroke={R.plan}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
      />

      <Readout
        rows={[
          { label: "to target", value: `${(distT / 100).toFixed(2)} m` },
          { label: "heading", value: `${Math.round((((pose.h * 180) / Math.PI) % 360 + 360) % 360)}°` },
          {
            label: "min turn",
            value: mode === "car" ? `${(RMIN / 100).toFixed(2)} m` : "0 — any direction",
            color: mode === "car" ? R.error : R.goal,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "robot + its path" },
          { color: R.plan, label: "target" },
          { color: R.goal, label: "allowed velocity" },
          { color: R.error, label: "forbidden / turn limit" },
        ]}
      />
      {reduced && (
        <text x={24} y={404} fontFamily={MONO} fontSize={11.5} fill={R.world}>
          Reduced motion: the full path is integrated and drawn statically.
        </text>
      )}
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {mode === "car"
          ? "every approach is a curve of radius ≥ 0.61 m — that constraint is the parallel-parking shuffle"
          : "holonomic: the straight line to the target is always a legal motion"}
      </text>
    </Stage>
  );
}
