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
  svgArrow,
  svgPoint,
  approach,
  clamp,
} from "./shared";

const rad = (deg: number) => (deg * Math.PI) / 180;
// Ease an angle (degrees) toward a target along the shortest arc.
const approachAngle = (cur: number, target: number, rate: number, dt: number) => {
  const d = ((target - cur + 540) % 360) - 180;
  const k = 1 - Math.pow(1 - rate, dt * 60);
  return (cur + k * d + 360) % 360;
};

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

      {/* fixed readout lane, top-left; never overlaps the loop */}
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
        revolute: rotates
      </text>
      <text x={545} y={54} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        prismatic: slides
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
        {stalled ? "STALLED: load too heavy for this ratio" : "lifting"}
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

// ===========================================================================
// Fig 1.3 · Configuration space of a 2-joint arm  (draggable field)
// Drag the arm's hand OR the dot in (θ1, θ2) space; the two panels stay in
// sync, making "a whole arm pose = one point in joint space" concrete.
// ===========================================================================

const S13 = { x: 175, y: 250 };
const L1 = 96;
const L2 = 78;
const REACH_OUT = L1 + L2;
const REACH_IN = Math.abs(L1 - L2);
// config-space box (θ1 across, θ2 up)
const BX0 = 452;
const BX1 = 686;
const BY0 = 70;
const BY1 = 350;

export function RbConfigSpace() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [showReach, setShowReach] = useState(false);
  const [tgt, setTgt] = useState({ t1: 40, t2: 60 }); // degrees
  const [disp, setDisp] = useState({ t1: 40, t2: 60 });
  const [drag, setDrag] = useState<null | "arm" | "cfg">(null);

  useRafLoop(
    (dt) => {
      setDisp((s) => ({
        t1: approachAngle(s.t1, tgt.t1, 0.25, dt),
        t2: approachAngle(s.t2, tgt.t2, 0.25, dt),
      }));
    },
    { playing: inView && !reduced },
  );

  const cur = reduced ? tgt : disp;
  const th1 = rad(cur.t1);
  const th2 = rad(cur.t2);
  const Ex = S13.x + L1 * Math.cos(th1);
  const Ey = S13.y - L1 * Math.sin(th1);
  const Tx = Ex + L2 * Math.cos(th1 + th2);
  const Ty = Ey - L2 * Math.sin(th1 + th2);

  const cfgX = BX0 + (cur.t1 / 360) * (BX1 - BX0);
  const cfgY = BY1 - (cur.t2 / 360) * (BY1 - BY0);

  const setFromArm = (mx: number, my: number) => {
    const rx = mx - S13.x;
    const ry = -(my - S13.y);
    let r = Math.hypot(rx, ry);
    r = clamp(r, REACH_IN + 3, REACH_OUT - 3);
    const c2 = clamp((r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
    const a2 = Math.acos(c2);
    const a1 = Math.atan2(ry, rx) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
    setTgt({ t1: ((a1 * 180) / Math.PI + 360) % 360, t2: ((a2 * 180) / Math.PI + 360) % 360 });
  };
  const setFromCfg = (mx: number, my: number) => {
    const t1 = clamp((mx - BX0) / (BX1 - BX0), 0, 1) * 360;
    const t2 = clamp((BY1 - my) / (BY1 - BY0), 0, 1) * 360;
    setTgt({ t1, t2 });
  };
  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e);
    if (drag === "arm") setFromArm(x, y);
    else setFromCfg(x, y);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.3 · Configuration space of a 2-joint arm"
      ariaLabel={`Two link arm at joint angles ${Math.round(cur.t1)} and ${Math.round(cur.t2)} degrees, shown as one point in configuration space`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(null),
        onPointerLeave: () => setDrag(null),
      }}
      controls={
        <>
          <Btn onClick={() => setShowReach((v) => !v)} active={showReach}>
            {showReach ? "✓ workspace" : "show workspace"}
          </Btn>
          <Btn onClick={() => setTgt({ t1: 40, t2: 60 })}>↺ reset</Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">
            drag the hand or the dot
          </span>
        </>
      }
    >
      {/* panel labels */}
      <text x={175} y={40} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        the arm
      </text>
      <text x={569} y={40} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.world}>
        configuration space
      </text>
      <line x1={400} y1={30} x2={400} y2={410} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />

      {/* reachable workspace overlay */}
      {showReach && (
        <>
          <circle cx={S13.x} cy={S13.y} r={REACH_OUT} fill={R.fillGreen} opacity={0.35} />
          <circle cx={S13.x} cy={S13.y} r={REACH_IN} fill="var(--background)" />
          <circle cx={S13.x} cy={S13.y} r={REACH_OUT} fill="none" stroke={R.goal} strokeWidth={2} strokeDasharray="5 5" />
          <text x={S13.x} y={S13.y + REACH_OUT + 18} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
            reachable ring; outside is unreachable
          </text>
        </>
      )}

      {/* arm */}
      <line x1={S13.x} y1={S13.y} x2={Ex} y2={Ey} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <line x1={Ex} y1={Ey} x2={Tx} y2={Ty} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={S13.x} cy={S13.y} r={9} fill={R.ink} />
      <circle cx={Ex} cy={Ey} r={7} fill={R.ink} />
      <circle
        cx={Tx}
        cy={Ty}
        r={12}
        fill={R.plan}
        stroke="var(--background)"
        strokeWidth={2}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag("arm");
        }}
      />

      {/* config-space box */}
      <rect x={BX0} y={BY0} width={BX1 - BX0} height={BY1 - BY0} rx={6} fill="none" stroke={R.line} strokeWidth={2} />
      <text x={(BX0 + BX1) / 2} y={BY1 + 24} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        θ1 →
      </text>
      <text x={BX0 - 12} y={(BY0 + BY1) / 2} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world} transform={`rotate(-90 ${BX0 - 12} ${(BY0 + BY1) / 2})`}>
        θ2 →
      </text>
      <circle
        cx={cfgX}
        cy={cfgY}
        r={11}
        fill={R.plan}
        stroke="var(--background)"
        strokeWidth={2}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag("cfg");
        }}
      />
      <text x={BX0 + 6} y={BY0 + 18} fontFamily={MONO} fontSize={12} fill={R.world}>
        one point = one whole arm pose
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.7 · Holonomic vs nonholonomic motion  (draggable field)
// Drag the target. The omni base slides straight to it; the car can reach the
// same spot but only via a feasible curve; it can't move straight sideways.
// ===========================================================================

export function RbHolonomic() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<"omni" | "car">("car");
  const [target, setTarget] = useState({ x: 560, y: 150 });
  const [pose, setPose] = useState({ x: 200, y: 300, h: 0 }); // h = heading rad
  const [drag, setDrag] = useState(false);

  useRafLoop(
    (dt) => {
      setPose((p) => {
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 3) return p;
        if (mode === "omni") {
          // slides straight in any direction
          const step = Math.min(dist, 150 * dt);
          return { x: p.x + (dx / dist) * step, y: p.y + (dy / dist) * step, h: Math.atan2(dy, dx) };
        }
        // car: can only drive along heading + steer heading toward target
        const desired = Math.atan2(dy, dx);
        let dh = ((desired - p.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const maxTurn = 2.2 * dt;
        dh = clamp(dh, -maxTurn, maxTurn);
        const h = p.h + dh;
        const drive = Math.min(dist, 130 * dt) * Math.max(0.15, Math.cos(dh)); // slows while turning
        return { x: p.x + Math.cos(h) * drive, y: p.y + Math.sin(h) * drive, h };
      });
    },
    { playing: inView && !reduced },
  );

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e);
    setTarget({ x: clamp(x, 40, 680), y: clamp(y, 40, 380) });
  };
  const reset = () => setPose({ x: 200, y: 300, h: 0 });

  const carPts = (cx: number, cy: number, h: number) => {
    const c = Math.cos(h);
    const s = Math.sin(h);
    const pt = (fx: number, fy: number) => `${cx + fx * c - fy * s},${cy + fx * s + fy * c}`;
    return `${pt(24, -13)} ${pt(24, 13)} ${pt(-24, 13)} ${pt(-24, -13)}`;
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.7 · Holonomic vs nonholonomic motion"
      ariaLabel={`A ${mode === "omni" ? "holonomic omni base" : "nonholonomic car"} moving toward a draggable target`}
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
      {/* faint grid */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`v${i}`} x1={40 + i * 90} y1={30} x2={40 + i * 90} y2={390} stroke={R.line} strokeWidth={0.8} opacity={0.5} />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={`h${i}`} x1={40} y1={30 + i * 90} x2={670} y2={30 + i * 90} stroke={R.line} strokeWidth={0.8} opacity={0.5} />
      ))}

      {/* the forbidden sideways move, for the car */}
      {mode === "car" && (
        <g opacity={0.9}>
          {svgArrow(pose.x, pose.y, pose.x - Math.sin(pose.h) * 60, pose.y + Math.cos(pose.h) * 60, R.error, 2.5, 8)}
          <text x={pose.x - Math.sin(pose.h) * 70} y={pose.y + Math.cos(pose.h) * 70} fontFamily={MONO} fontSize={11} fill={R.error} textAnchor="middle">
            no sideways
          </text>
        </g>
      )}

      {/* heading arrow (allowed motion) */}
      {svgArrow(pose.x, pose.y, pose.x + Math.cos(pose.h) * 54, pose.y + Math.sin(pose.h) * 54, R.goal, 2.5, 9)}

      {/* the robot */}
      {mode === "omni" ? (
        <circle cx={pose.x} cy={pose.y} r={20} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      ) : (
        <polygon points={carPts(pose.x, pose.y, pose.h)} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
      )}

      {/* target */}
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
      <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={R.world}>
        {mode === "car"
          ? "the car reaches any spot, but only along curves its wheels allow"
          : "the omni base slides straight to any target"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.5 · Sensors and what each one is blind to  (toggle-compare)
// The same scene through four sensors; each tab calls out, in red, what that
// sensor misses. "Fuse all" cancels the blind spots.
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
  encoder: "blind to wheel slip: counts turns, not the world",
  imu: "drifts: tiny errors integrate into big ones",
  camera: "no depth: the 3D world arrives flattened to 2D",
  lidar: "no meaning: sees shape, not that it's a person",
  fuse: "each sensor covers another's blind spot",
};

export function RbSensors() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<SensorTab>("encoder");
  const [drift, setDrift] = useState(0); // seconds on the IMU tab

  useRafLoop(
    (dt) => setDrift((d) => (d > 6 ? 6 : d + dt)),
    { playing: inView && !reduced && tab === "imu" },
  );

  const robot = { x: 175, y: 250 };
  const person = { x: 430, y: 210 };
  const wallX = 600;
  const driftAmt = reduced ? 40 : (drift / 6) * 90;

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.5 · Every sensor is blind to something"
      ariaLabel={`Scene through the ${tab} sensor`}
      controls={
        <>
          <Tabs
            options={SENSOR_TABS}
            value={tab}
            onChange={(t) => {
              setTab(t);
              setDrift(0);
            }}
          />
        </>
      }
    >
      {/* ground */}
      <line x1={30} y1={320} x2={690} y2={320} stroke={R.line} strokeWidth={2} />
      {/* wall (world structure) */}
      <rect x={wallX} y={140} width={16} height={180} fill="#e6e6e3" stroke={R.world} strokeWidth={2} />
      <text x={wallX + 8} y={132} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>wall</text>

      {/* what the sensor perceives */}
      {tab === "encoder" && (
        <>
          <circle cx={robot.x} cy={robot.y} r={22} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          {/* believed position runs ahead of true (slip) */}
          <circle cx={robot.x + 130} cy={robot.y} r={22} fill="none" stroke={R.error} strokeWidth={3} strokeDasharray="5 5" />
          {svgArrow(robot.x + 26, robot.y, robot.x + 104, robot.y, R.error, 2.5, 8)}
          <text x={robot.x + 130} y={robot.y - 32} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>believed (slipped)</text>
          <text x={robot.x} y={robot.y + 42} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>true</text>
        </>
      )}
      {tab === "imu" && (
        <>
          <circle cx={robot.x} cy={robot.y} r={22} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          <circle cx={robot.x + driftAmt} cy={robot.y - driftAmt * 0.25} r={22} fill="none" stroke={R.error} strokeWidth={3} strokeDasharray="5 5" />
          {svgArrow(robot.x + 26, robot.y, robot.x + driftAmt - 24, robot.y - driftAmt * 0.25, R.error, 2.5, 8)}
          <text x={robot.x} y={robot.y + 42} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>true</text>
          <text x={robot.x + driftAmt} y={robot.y - driftAmt * 0.25 - 30} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>estimate drifting</text>
        </>
      )}
      {tab === "camera" && (
        <>
          <circle cx={robot.x} cy={robot.y} r={22} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          {/* recognizes the person + wall (semantics) but flat */}
          <rect x={person.x - 16} y={person.y - 34} width={32} height={70} rx={8} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} />
          <circle cx={person.x} cy={person.y - 46} r={11} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} />
          <text x={person.x} y={person.y + 54} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>&quot;person&quot; ✓</text>
          <text x={person.x + 70} y={person.y} fontFamily={MONO} fontSize={13} fill={R.error}>depth = ?</text>
        </>
      )}
      {tab === "lidar" && (
        <>
          <circle cx={robot.x} cy={robot.y} r={22} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          {/* crisp geometry: dotted returns, but person is just a shape */}
          {Array.from({ length: 14 }).map((_, i) => {
            const yy = 150 + i * 12;
            return <circle key={i} cx={wallX} cy={yy} r={2.6} fill={R.signal} />;
          })}
          {Array.from({ length: 7 }).map((_, i) => {
            const yy = person.y - 30 + i * 10;
            return <circle key={`p${i}`} cx={person.x} cy={yy} r={2.6} fill={R.signal} />;
          })}
          <text x={person.x} y={person.y + 54} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>shape = ? (no meaning)</text>
        </>
      )}
      {tab === "fuse" && (
        <>
          <circle cx={robot.x} cy={robot.y} r={22} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
          <rect x={person.x - 16} y={person.y - 34} width={32} height={70} rx={8} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
          <circle cx={person.x} cy={person.y - 46} r={11} fill={R.fillGreen} stroke={R.goal} strokeWidth={2.5} />
          <text x={person.x} y={person.y + 54} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>person, 2.1 m away ✓</text>
          <text x={robot.x} y={robot.y + 42} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>position pinned ✓</text>
        </>
      )}

      {/* blind-spot readout lane (fixed, bottom) */}
      <text x={30} y={404} fontFamily={MONO} fontSize={13} fill={tab === "fuse" ? R.goal : R.error}>
        {tab === "fuse" ? "✓ " : "blind spot: "}
        {BLIND[tab]}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 1.6 · One loop, many bodies  (toggle-compare)
// Pick an embodiment; see its DoF, whether the base is fixed or floating, and
// the hard problem it foregrounds. Each body does a calm idle motion.
// ===========================================================================

type BodyId = "arm" | "wheeled" | "quadruped" | "humanoid" | "drone";
const BODIES: { id: BodyId; label: string; dof: string; base: string; hard: string }[] = [
  { id: "arm", label: "Arm", dof: "6", base: "fixed", hard: "kinematics" },
  { id: "wheeled", label: "Wheeled base", dof: "3", base: "floating", hard: "localization" },
  { id: "quadruped", label: "Quadruped", dof: "12", base: "floating", hard: "balance" },
  { id: "humanoid", label: "Humanoid", dof: "25+", base: "floating", hard: "everything at once" },
  { id: "drone", label: "Drone", dof: "6 (4 motors)", base: "floating", hard: "underactuated flight" },
];

export function RbEmbodiments() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [body, setBody] = useState<BodyId>("arm");
  const [showDof, setShowDof] = useState(true);
  const [t, setT] = useState(0);

  useRafLoop((dt) => setT((v) => v + dt), { playing: inView && !reduced });
  const osc = reduced ? 0 : Math.sin(t * 1.6);

  const info = BODIES.find((b) => b.id === body)!;
  const cx = 250;
  const cy = 250;
  const joint = showDof ? R.signal : R.world;
  const baseCol = showDof ? R.plan : R.world;

  return (
    <Stage
      innerRef={ref}
      title="Fig 1.6 · One loop, many bodies"
      ariaLabel={`${info.label}: ${info.dof} degrees of freedom, ${info.base} base, hard problem ${info.hard}`}
      controls={
        <>
          <Tabs options={BODIES.map((b) => ({ id: b.id, label: b.label }))} value={body} onChange={setBody} />
          <Btn onClick={() => setShowDof((v) => !v)} active={showDof}>
            {showDof ? "✓ DoF breakdown" : "show DoF breakdown"}
          </Btn>
        </>
      }
    >
      {/* ground line for floating bodies */}
      {info.base === "floating" && body !== "drone" && (
        <line x1={90} y1={350} x2={410} y2={350} stroke={R.line} strokeWidth={2} />
      )}

      {body === "arm" && (
        <g>
          <rect x={cx - 30} y={330} width={60} height={26} rx={5} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
          {(() => {
            const a1 = rad(60 + osc * 12);
            const a2 = rad(-70 + osc * 16);
            const e = { x: cx + 100 * Math.cos(a1), y: 330 - 100 * Math.sin(a1) };
            const tp = { x: e.x + 90 * Math.cos(a1 + a2), y: e.y - 90 * Math.sin(a1 + a2) };
            return (
              <>
                <line x1={cx} y1={330} x2={e.x} y2={e.y} stroke={joint} strokeWidth={11} strokeLinecap="round" />
                <line x1={e.x} y1={e.y} x2={tp.x} y2={tp.y} stroke={joint} strokeWidth={11} strokeLinecap="round" />
                <circle cx={cx} cy={330} r={8} fill={joint} />
                <circle cx={e.x} cy={e.y} r={7} fill={joint} />
              </>
            );
          })()}
        </g>
      )}
      {body === "wheeled" && (
        <g>
          <rect x={cx - 60 + osc * 20} y={300} width={120} height={44} rx={8} fill={R.fillBlue} stroke={joint} strokeWidth={3} />
          <circle cx={cx - 34 + osc * 20} cy={348} r={16} fill="#eeeeec" stroke={R.world} strokeWidth={3} />
          <circle cx={cx + 34 + osc * 20} cy={348} r={16} fill="#eeeeec" stroke={R.world} strokeWidth={3} />
          {showDof && svgArrow(cx + osc * 20, 322, cx + 60 + osc * 20, 322, baseCol, 2.5, 8)}
        </g>
      )}
      {body === "quadruped" && (
        <g>
          <rect x={cx - 70} y={250 + osc * 4} width={140} height={40} rx={10} fill={R.fillBlue} stroke={joint} strokeWidth={3} />
          {[-55, -20, 20, 55].map((dx, i) => (
            <line
              key={i}
              x1={cx + dx}
              y1={280 + osc * 4}
              x2={cx + dx + (i % 2 ? osc * 8 : -osc * 8)}
              y2={350}
              stroke={joint}
              strokeWidth={7}
              strokeLinecap="round"
            />
          ))}
        </g>
      )}
      {body === "humanoid" && (
        <g stroke={joint} strokeWidth={8} strokeLinecap="round" fill="none">
          <circle cx={cx} cy={170} r={18} fill={R.fillBlue} />
          <line x1={cx} y1={188} x2={cx} y2={278} />
          <line x1={cx} y1={210} x2={cx - 42} y2={250 + osc * 14} />
          <line x1={cx} y1={210} x2={cx + 42} y2={250 - osc * 14} />
          <line x1={cx} y1={278} x2={cx - 26} y2={348} />
          <line x1={cx} y1={278} x2={cx + 26} y2={348} />
        </g>
      )}
      {body === "drone" && (
        <g>
          {(() => {
            const yy = cy - 20 + osc * 10;
            return (
              <>
                <line x1={cx - 70} y1={yy - 30} x2={cx + 70} y2={yy + 30} stroke={joint} strokeWidth={7} strokeLinecap="round" />
                <line x1={cx - 70} y1={yy + 30} x2={cx + 70} y2={yy - 30} stroke={joint} strokeWidth={7} strokeLinecap="round" />
                {[[-70, -30], [70, 30], [-70, 30], [70, -30]].map(([dx, dy], i) => (
                  <ellipse key={i} cx={cx + dx} cy={yy + dy} rx={22} ry={6} fill={R.fillBlue} stroke={joint} strokeWidth={2.5} />
                ))}
                {showDof && svgArrow(cx, yy + 44, cx, yy + 84, baseCol, 2.5, 8)}
              </>
            );
          })()}
        </g>
      )}

      {/* readout panel (fixed right lane) */}
      <line x1={470} y1={70} x2={470} y2={380} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={500} y={120} fontFamily={MONO} fontSize={16} fill={R.ink} fontWeight={600}>{info.label}</text>
      <text x={500} y={162} fontFamily={MONO} fontSize={14} fill={R.world}>total DoF</text>
      <text x={640} y={162} fontFamily={MONO} fontSize={14} fill={joint} fontWeight={600}>{info.dof}</text>
      <text x={500} y={196} fontFamily={MONO} fontSize={14} fill={R.world}>base</text>
      <text x={640} y={196} fontFamily={MONO} fontSize={14} fill={baseCol} fontWeight={600}>{info.base}</text>
      <text x={500} y={230} fontFamily={MONO} fontSize={14} fill={R.world}>hard problem</text>
      <text x={500} y={256} fontFamily={MONO} fontSize={15} fill={R.error} fontWeight={600}>{info.hard}</text>
      {showDof && (
        <>
          <circle cx={508} cy={300} r={6} fill={R.signal} />
          <text x={522} y={305} fontFamily={MONO} fontSize={12} fill={R.world}>actuated joints</text>
          <circle cx={508} cy={326} r={6} fill={R.plan} />
          <text x={522} y={331} fontFamily={MONO} fontSize={12} fill={R.world}>base / floating DoF</text>
        </>
      )}
    </Stage>
  );
}
