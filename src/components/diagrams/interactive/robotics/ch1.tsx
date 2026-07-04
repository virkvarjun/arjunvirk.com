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
} from "./shared";

// ===========================================================================
// Fig 1.1 · The sense–plan–act loop  (animated pipeline)
// A glowing token travels SENSE -> PLAN -> ACT -> WORLD -> SENSE. Injecting a
// disturbance spikes the tracking error; each pass of the loop halves it, so
// the reader watches feedback correct the world.
// ===========================================================================

type LoopNode = { id: string; x: number; y: number; color: string; sub: string };
const HW = 78;
const HH = 34;
const NODES: LoopNode[] = [
  { id: "SENSE", x: 205, y: 140, color: R.signal, sub: "read the world" },
  { id: "PLAN", x: 515, y: 140, color: R.plan, sub: "decide" },
  { id: "ACT", x: 515, y: 320, color: R.plan, sub: "move" },
  { id: "WORLD", x: 205, y: 320, color: R.world, sub: "reality" },
];
// Arrow segments (box-edge to box-edge), traversed in order.
const SEGS: [number, number, number, number][] = [
  [205 + HW, 140, 515 - HW, 140], // SENSE -> PLAN
  [515, 140 + HH, 515, 320 - HH], // PLAN -> ACT
  [515 - HW, 320, 205 + HW, 320], // ACT -> WORLD
  [205, 320 - HH, 205, 140 + HH], // WORLD -> SENSE
];
const smooth = (t: number) => t * t * (3 - 2 * t);

export function RbSensePlanAct() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [speed, setSpeed] = useState(0.7);
  // phase 0..4 around the loop; err 0..1 tracking error; flash 0..1 world glow.
  const [st, setSt] = useState({ phase: 0, err: 0, flash: 0 });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let p = s.phase + dt * speed;
        let err = s.err;
        if (p >= 4) {
          p -= 4;
          err *= 0.5; // one full loop of feedback halves the error
          if (err < 0.02) err = 0;
        }
        return { phase: p, err, flash: Math.max(0, s.flash - dt * 1.6) };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const inject = () => setSt((s) => ({ ...s, err: 1, flash: 1 }));
  const reset = () => setSt({ phase: 0, err: 0, flash: 0 });

  const seg = Math.floor(st.phase) % 4;
  const f = smooth(st.phase - Math.floor(st.phase));
  const [sx, sy, ex, ey] = SEGS[seg];
  const tokenX = reduced ? SEGS[0][0] : sx + (ex - sx) * f;
  const tokenY = reduced ? SEGS[0][1] : sy + (ey - sy) * f;

  const activation = (n: LoopNode) => {
    if (reduced) return 0.7;
    const d = Math.hypot(n.x - tokenX, n.y - tokenY);
    return clamp(1 - d / 150, 0, 1);
  };

  const errPct = Math.round(st.err * 100);

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.1 · The sense–plan–act loop"
      ariaLabel={`Sense, plan, act loop with a data token circulating; tracking error ${errPct} percent`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={inject} title="nudge the world and watch feedback correct it">
            ⚡ inject disturbance
          </Btn>
          <Btn onClick={reset}>↺ reset</Btn>
          <Slider
            label="speed"
            min={0.25}
            max={2}
            step={0.05}
            value={speed}
            onChange={setSpeed}
            fmt={(v) => `${v.toFixed(2)}×`}
          />
        </>
      }
    >
      {SEGS.map(([x1, y1, x2, y2], i) => (
        <g key={i} opacity={0.9}>
          {svgArrow(x1, y1, x2, y2, R.line, 3, 11)}
        </g>
      ))}

      {NODES.map((n) => {
        const a = activation(n);
        const scale = 1 + 0.04 * a;
        const isWorld = n.id === "WORLD";
        const fill =
          n.color === R.signal ? R.fillBlue : n.color === R.plan ? R.fillAmber : "#eeeeec";
        return (
          <g
            key={n.id}
            transform={`translate(${n.x} ${n.y}) scale(${scale}) translate(${-n.x} ${-n.y})`}
          >
            {isWorld ? (
              <ellipse cx={n.x} cy={n.y} rx={HW} ry={HH} fill={fill} stroke={n.color} strokeWidth={2 + 2 * a} />
            ) : (
              <rect
                x={n.x - HW}
                y={n.y - HH}
                width={HW * 2}
                height={HH * 2}
                rx={12}
                fill={fill}
                stroke={n.color}
                strokeWidth={2 + 2 * a}
              />
            )}
            {isWorld && (st.flash > 0 || st.err > 0) && (
              <ellipse
                cx={n.x}
                cy={n.y}
                rx={HW}
                ry={HH}
                fill="none"
                stroke={R.error}
                strokeWidth={3}
                opacity={Math.max(st.flash, st.err * 0.7)}
              />
            )}
            <text x={n.x} y={n.y - 3} textAnchor="middle" fontFamily={MONO} fontSize={19} fontWeight={600} fill={R.ink}>
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
          <circle cx={tokenX} cy={tokenY} r={13} fill={NODES[seg].color} opacity={0.25} />
          <circle cx={tokenX} cy={tokenY} r={7} fill={NODES[seg].color} />
        </g>
      )}

      {/* fixed readout lane, top-left — never overlaps the loop */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        tracking error
      </text>
      <rect x={40} y={54} width={180} height={12} rx={6} fill="#e7e7e4" />
      <rect x={40} y={54} width={180 * st.err} height={12} rx={6} fill={R.error} />
      <text x={230} y={64} fontFamily={MONO} fontSize={14} fill={R.ink}>
        {errPct}%
      </text>

      {reduced && (
        <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: the loop is shown static. Inject still updates the error.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 1.2 · Revolute vs prismatic joints  (slider-driven diagram)
// Two mechanisms, one state number each. The link eases to the slider value.
// ===========================================================================

export function RbJointTypes() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [theta, setTheta] = useState(35); // deg, target
  const [dist, setDist] = useState(35); // cm, target (0..60)
  const [disp, setDisp] = useState({ a: 35, d: 35 });

  useRafLoop(
    (dt) => {
      setDisp((s) => ({
        a: approach(s.a, theta, 0.22, dt),
        d: approach(s.d, dist, 0.22, dt),
      }));
    },
    { playing: inView && !reduced },
  );

  const a = reduced ? theta : disp.a;
  const d = reduced ? dist : disp.d;

  const px = 195;
  const py = 288;
  const L = 128;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const tipX = px + L * Math.cos(rad(-a));
  const tipY = py + L * Math.sin(rad(-a));
  const arc = `M ${px + 40} ${py} A 40 40 0 0 ${a > 180 ? 1 : 0} ${px + 40 * Math.cos(rad(-a))} ${py + 40 * Math.sin(rad(-a))}`;

  const railX0 = 440;
  const railX1 = 660;
  const travel = railX1 - railX0 - 56;
  const blockX = railX0 + 6 + (d / 60) * travel;

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.2 · Revolute vs prismatic joints"
      ariaLabel={`A revolute joint at ${Math.round(a)} degrees and a prismatic joint at ${Math.round(d)} centimetres`}
      controls={
        <>
          <Slider label="θ" min={0} max={170} value={theta} onChange={setTheta} fmt={(v) => `${v}°`} />
          <Slider label="d" min={0} max={60} value={dist} onChange={setDist} fmt={(v) => `${v} cm`} />
          <Btn
            onClick={() => {
              setTheta(35);
              setDist(35);
            }}
          >
            ↺ reset
          </Btn>
        </>
      }
    >
      <line x1={370} y1={40} x2={370} y2={400} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={195} y={54} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        revolute — rotates
      </text>
      <text x={545} y={54} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        prismatic — slides
      </text>

      <rect x={px - 34} y={py} width={68} height={40} rx={6} fill="#eeeeec" stroke={R.line} strokeWidth={2} />
      <path d={arc} fill="none" stroke={R.plan} strokeWidth={2.5} />
      <line x1={px} y1={py} x2={tipX} y2={tipY} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={px} cy={py} r={9} fill={R.ink} />
      <circle cx={tipX} cy={tipY} r={8} fill={R.signal} />
      <text x={px} y={100} textAnchor="middle" fontFamily={MONO} fontSize={17} fill={R.plan} fontWeight={600}>
        θ = {Math.round(a)}°
      </text>

      <rect x={railX0} y={294} width={railX1 - railX0} height={14} rx={4} fill="#eeeeec" stroke={R.line} strokeWidth={2} />
      <line x1={railX0} y1={288} x2={railX0} y2={314} stroke={R.world} strokeWidth={3} />
      <line x1={railX1} y1={288} x2={railX1} y2={314} stroke={R.world} strokeWidth={3} />
      <rect x={blockX} y={276} width={50} height={50} rx={7} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      <text x={545} y={100} textAnchor="middle" fontFamily={MONO} fontSize={17} fill={R.plan} fontWeight={600}>
        d = {Math.round(d)} cm
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.4 · The speed–torque trade of a gearbox  (slider-driven diagram)
// A fast motor drives a slow, high-torque output that lifts a load. Raising the
// ratio slows the output but lets it lift more; too much load stalls it (red).
// ===========================================================================

export function RbGearbox() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [ratio, setRatio] = useState(20);
  const [load, setLoad] = useState(30);
  const [anim, setAnim] = useState({ motor: 0, out: 0, lift: 0 });

  const stalled = load > ratio + 4;
  const motorRPS = 1.4;
  const outRPS = motorRPS / ratio;

  useRafLoop(
    (dt) => {
      setAnim((s) => {
        if (stalled) return s;
        return {
          motor: s.motor + dt * motorRPS * 360,
          out: s.out + dt * outRPS * 360,
          lift: clamp(s.lift + dt * outRPS * 2.2, 0, 1),
        };
      });
    },
    { playing: inView && !reduced && !stalled && anim.lift < 1 },
  );

  const lift = reduced ? 0.5 : anim.lift;
  const mA = reduced ? 0 : anim.motor;
  const oA = reduced ? 0 : anim.out;

  const motorC = { x: 175, y: 250, r: 42 };
  const outC = { x: 340, y: 250, r: 74 };
  const trackX = 560;
  const topY = 90;
  const botY = 360;
  const weightY = botY - lift * (botY - topY) - 30;

  const gear = (c: { x: number; y: number; r: number }, ang: number, color: string, n: number) => (
    <g transform={`rotate(${ang} ${c.x} ${c.y})`}>
      <circle cx={c.x} cy={c.y} r={c.r} fill="#efefec" stroke={color} strokeWidth={3} />
      {Array.from({ length: n }).map((_, i) => (
        <rect
          key={i}
          x={c.x - 4}
          y={c.y - c.r - 8}
          width={8}
          height={10}
          fill={color}
          transform={`rotate(${(i / n) * 360} ${c.x} ${c.y})`}
        />
      ))}
      <line x1={c.x} y1={c.y} x2={c.x} y2={c.y - c.r + 6} stroke={color} strokeWidth={3} />
    </g>
  );

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.4 · The speed–torque trade of a gearbox"
      ariaLabel={`Gearbox at ${ratio} to 1 lifting a load of ${load}; ${stalled ? "stalled" : "lifting"}`}
      controls={
        <>
          <Slider label="gear ratio" min={1} max={100} value={ratio} onChange={setRatio} fmt={(v) => `${v}:1`} />
          <Slider label="load" min={1} max={100} value={load} onChange={setLoad} fmt={(v) => `${v}`} />
          <Btn onClick={() => setAnim({ motor: 0, out: 0, lift: 0 })}>↺ reset</Btn>
        </>
      }
    >
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.world}>
        output speed
      </text>
      <text x={175} y={44} fontFamily={MONO} fontSize={14} fill={R.plan} fontWeight={600}>
        {outRPS.toFixed(3)} rev/s
      </text>
      <text x={330} y={44} fontFamily={MONO} fontSize={14} fill={stalled ? R.error : R.goal} fontWeight={600}>
        {stalled ? "STALLED — load too heavy for this ratio" : "lifting"}
      </text>

      {gear(motorC, mA, R.signal, 10)}
      <text x={motorC.x} y={motorC.y + motorC.r + 26} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.signal}>
        motor (fast)
      </text>
      {gear(outC, -oA, R.plan, 18)}
      <text x={outC.x} y={outC.y + outC.r + 22} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.plan}>
        output (slow, strong)
      </text>

      <line x1={trackX} y1={topY} x2={trackX} y2={botY} stroke={R.line} strokeWidth={2} strokeDasharray="3 6" />
      <line x1={outC.x + outC.r} y1={outC.y} x2={trackX} y2={outC.y} stroke={R.world} strokeWidth={2} />
      <line x1={trackX} y1={outC.y} x2={trackX} y2={weightY} stroke={R.world} strokeWidth={2} />
      <rect
        x={trackX - 30}
        y={weightY}
        width={60}
        height={54}
        rx={6}
        fill={stalled ? R.fillRed : lift >= 1 ? R.fillGreen : "#eeeeec"}
        stroke={stalled ? R.error : lift >= 1 ? R.goal : R.world}
        strokeWidth={3}
      />
      <text x={trackX} y={weightY + 33} textAnchor="middle" fontFamily={MONO} fontSize={16} fill={R.ink}>
        {load}
      </text>

      {reduced && (
        <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: gears shown at rest; the sliders still set speed, capacity, and stall.
        </text>
      )}
    </Stage>
  );
}
