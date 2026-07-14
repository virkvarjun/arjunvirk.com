"use client";

import { useRef, useState } from "react";
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
  lerp,
  type V3,
  type Quat,
  type Prim3D,
  type Camera3D,
  v3,
  quat,
  seg3,
  dot3,
  label3,
  ring3,
  grid3,
  triad3,
  curve3,
  Scene3D,
  useOrbit,
  groundDrag,
  project,
  Legend,
  Readout,
  Transport,
} from "./shared";

const rad = (deg: number) => (deg * Math.PI) / 180;

// ===========================================================================
// Fig 2.1 · The same cup, three frames, three answers  (true 3D, orbitable)
// A 3D tabletop scene: world triad (grey), robot base triad (blue), camera
// triad (amber), and a cup you drag across the floor. A fixed readout lists
// the cup's coordinates in all three frames at once, computed with the real
// inverse transforms. "Shift world origin" slides the world frame and proves
// points move with the origin while a displacement vector's numbers stay put.
// ===========================================================================

// Express world point p in a frame at `origin` with orientation `q`:
// p_f = R^T (p - o). This is the actual math of the chapter, not a sketch.
function inFrame3(p: V3, origin: V3, q: Quat): V3 {
  return quat.rotate(quat.conj(q), v3.sub(p, origin));
}

const fmt3 = (p: V3) => `(${p.map((v) => (v < 0 ? v.toFixed(2) : ` ${v.toFixed(2)}`)).join(",")})`;

export function RbThreeFrames() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-34, 26);
  const [cup, setCup] = useState<V3>([0.65, 0.4, 0]);
  const [shift, setShift] = useState(false);
  const [off, setOff] = useState(0); // eased world-origin offset (metres)
  const dragging = useRef(false);
  const lastPt = useRef<[number, number] | null>(null);

  useRafLoop((dt) => setOff((o) => approach(o, shift ? 0.8 : 0, 0.18, dt)), {
    playing: inView && !reduced,
  });
  const oX = reduced ? (shift ? 0.8 : 0) : off;

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 4.5, zoom: 128 };

  // the three frames: world (slides with the demo), base, camera on a mast.
  const worldO: V3 = [-1.15 + oX, -0.85, 0];
  const qWorld = quat.id;
  const baseO: V3 = [0.15, -0.35, 0];
  const qBase = quat.fromAxisAngle([0, 0, 1], rad(35));
  const camO: V3 = [-0.75, 0.85, 0.95];
  // camera tilted down toward the table, yawed to face the cup area
  const qCam = quat.mul(quat.fromAxisAngle([0, 0, 1], rad(-55)), quat.fromAxisAngle([0, 1, 0], rad(35)));

  const cupW = inFrame3(cup, worldO, qWorld);
  const cupB = inFrame3(cup, baseO, qBase);
  const cupC = inFrame3(cup, camO, qCam);

  // a fixed displacement vector out of the base origin: its world-frame
  // numbers never change when the origin shifts, because vectors ignore
  // translation. Points don't get that luxury.
  const vec: V3 = [0.55, 0.55, 0];
  const vecTip = v3.add(baseO, vec);

  const prims: Prim3D[] = [
    ...grid3(1.4, 0.35),
    ...triad3(worldO, qWorld, 0.5, ["x", "y", "z"], [R.world, R.world, R.world]),
    ...triad3(baseO, qBase, 0.45, ["x", "y", "z"], [R.signal, R.signal, R.signal]),
    ...triad3(camO, qCam, 0.4, ["x", "y", "z"], [R.plan, R.plan, R.plan]),
    label3(v3.add(worldO, [0, 0, 0.62]), "world", R.world, { anchor: "middle", dy: -4 }),
    label3(v3.add(baseO, [0, 0, 0.58]), "base", R.signal, { anchor: "middle", dy: -4 }),
    label3(v3.add(camO, [0, 0, 0.52]), "camera", R.plan, { anchor: "middle", dy: -4 }),
    // camera mast down to the floor
    seg3([camO[0], camO[1], 0], camO, R.plan, { width: 1.5, dash: "3 4" }),
    // sight line: camera -> cup
    seg3(camO, cup, R.plan, { width: 1, dash: "2 5", opacity: 0.7 }),
    // the fixed displacement vector (green) off the base origin
    seg3(baseO, vecTip, R.goal, { width: 3 }),
    label3(vecTip, "vector: numbers frozen", R.goal, { dx: 8, dy: -6, size: 11.5 }),
    // the cup: a dot with a stem so it reads as an object, not a mark
    seg3(cup, v3.add(cup, [0, 0, 0.22]), R.goal, { width: 5 }),
    dot3(v3.add(cup, [0, 0, 0.24]), R.goal, { r: 7 }),
    label3(v3.add(cup, [0, 0, 0.36]), "cup", R.goal, { anchor: "middle", dy: -2 }),
  ];

  const svgProps = {
    ...orbit.svgProps,
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (dragging.current) {
        const r = e.currentTarget.getBoundingClientRect();
        const sx = ((e.clientX - r.left) / r.width) * 720;
        const sy = ((e.clientY - r.top) / r.height) * 440;
        if (lastPt.current) {
          const np = groundDrag(cam, cup, sx - lastPt.current[0], sy - lastPt.current[1]);
          setCup([clamp(np[0], -1.3, 1.3), clamp(np[1], -1.3, 1.3), 0]);
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

  const cupScreen = project(cam, v3.add(cup, [0, 0, 0.24]));

  return (
    <Stage
      innerRef={ref}
      title="Fig 2.1 · The same cup, three frames, three answers"
      ariaLabel="One cup in a 3D scene with world, base and camera frames; its coordinates are shown in all three frames at once. Drag the background to orbit."
      svgProps={svgProps}
      controls={
        <>
          <Btn onClick={() => setShift((v) => !v)} active={shift}>
            {shift ? "✓ shift world origin" : "shift world origin"}
          </Btn>
          <Btn
            onClick={() => {
              setCup([0.65, 0.4, 0]);
              setShift(false);
              orbit.reset();
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the cup · drag empty space to orbit</span>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      {/* invisible, generous hit-target over the cup for dragging */}
      <circle
        cx={cupScreen.x}
        cy={cupScreen.y}
        r={22}
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
          { label: "in world", value: fmt3(cupW), color: shift || oX > 0.02 ? R.error : R.ink },
          { label: "in base", value: fmt3(cupB), color: R.ink },
          { label: "in camera", value: fmt3(cupC), color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.world, label: "world frame" },
          { color: R.signal, label: "base frame" },
          { color: R.plan, label: "camera frame" },
          { color: R.goal, label: "the cup" },
        ]}
      />
      <text x={24} y={426} fontFamily={MONO} fontSize={12} fill={R.world}>
        one point · three frames · three different, equally correct coordinates
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 2.2 · A 2D rotation, and the axes it carries  (slider-driven diagram)
// One angle slider spins a green point (starts at (2,0)) plus a blue rotated
// x-axis and amber rotated y-axis. A side panel prints the live 2×2 matrix so
// the reader watches "columns = rotated axes" literally happen.
// ===========================================================================

export function RbRotationMatrix() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [theta, setTheta] = useState(35); // target degrees
  const [disp, setDisp] = useState(35); // eased degrees

  useRafLoop((dt) => setDisp((d) => approach(d, theta, 0.22, dt)), {
    playing: inView && !reduced,
  });
  const a = reduced ? theta : disp;
  const r = rad(a);
  const cos = Math.cos(r);
  const sin = Math.sin(r);

  const O = { x: 235, y: 250 };
  const U = 90; // px per unit
  const toPt = (x: number, y: number) => ({ x: O.x + x * U, y: O.y - y * U });

  // green point starts at (2,0) then rotates
  const pt = toPt(2 * cos, 2 * sin);
  const xTip = toPt(cos, sin); // rotated x-axis (blue, first column)
  const yTip = toPt(-sin, cos); // rotated y-axis (amber, second column)

  const near90 = Math.abs(((a % 360) + 360) % 360 - 90) < 2;

  // matrix panel entries: highlight the sin cells (they change sign)
  const cells = [
    [cos.toFixed(2), (-sin).toFixed(2)],
    [sin.toFixed(2), cos.toFixed(2)],
  ];

  return (
    <Stage
      innerRef={ref}
      title="Fig 2.2 · A 2D rotation, and the axes it carries"
      ariaLabel={`A 2D rotation by ${Math.round(a)} degrees, with its rotated x and y axes and live rotation matrix`}
      controls={
        <>
          <Slider label="θ" min={0} max={360} value={theta} onChange={setTheta} fmt={(v) => `${v}°`} />
          <Btn onClick={() => setTheta(90)}>snap to 90°</Btn>
          <Btn onClick={() => setTheta(35)}>↺ reset</Btn>
        </>
      }
    >
      {/* grid */}
      {Array.from({ length: 7 }).map((_, i) => {
        const gx = O.x - 2 * U + i * U;
        return <line key={`v${i}`} x1={gx} y1={70} x2={gx} y2={430} stroke={R.line} strokeWidth={0.8} opacity={0.5} />;
      })}
      {Array.from({ length: 5 }).map((_, i) => {
        const gy = O.y - 2 * U + i * U;
        return <line key={`h${i}`} x1={40} y1={gy} x2={430} y2={gy} stroke={R.line} strokeWidth={0.8} opacity={0.5} />;
      })}
      <line x1={40} y1={O.y} x2={430} y2={O.y} stroke={R.world} strokeWidth={1.5} />
      <line x1={O.x} y1={70} x2={O.x} y2={430} stroke={R.world} strokeWidth={1.5} />

      {/* rotated y-axis (amber, second column) */}
      <line x1={O.x} y1={O.y} x2={yTip.x} y2={yTip.y} stroke={R.plan} strokeWidth={5} strokeLinecap="round" />
      <text x={yTip.x - 22} y={yTip.y - 6} fontFamily={MONO} fontSize={12} fill={R.plan}>
        ŷ→col 2
      </text>
      {/* rotated x-axis (blue, first column) */}
      <line x1={O.x} y1={O.y} x2={xTip.x} y2={xTip.y} stroke={R.signal} strokeWidth={5} strokeLinecap="round" />
      <text x={xTip.x + 6} y={xTip.y - 4} fontFamily={MONO} fontSize={12} fill={R.signal}>
        x̂→col 1
      </text>

      {/* the point being rotated */}
      <line x1={O.x} y1={O.y} x2={pt.x} y2={pt.y} stroke={R.goal} strokeWidth={2} strokeDasharray="4 4" />
      <circle cx={pt.x} cy={pt.y} r={9} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
      <circle cx={O.x} cy={O.y} r={5} fill={R.ink} />

      {near90 && (
        <text x={pt.x + 12} y={pt.y} fontFamily={MONO} fontSize={12} fill={R.goal} fontWeight={600}>
          (2,0) → (0,2)
        </text>
      )}

      {/* live matrix panel, fixed right lane */}
      <text x={470} y={130} fontFamily={MONO} fontSize={14} fill={R.world}>
        R(θ) =
      </text>
      <text x={470} y={172} fontFamily={MONO} fontSize={26} fill={R.world}>
        [
      </text>
      <text x={470} y={210} fontFamily={MONO} fontSize={26} fill={R.world}>
        [
      </text>
      <text x={630} y={172} fontFamily={MONO} fontSize={26} fill={R.world}>
        ]
      </text>
      <text x={630} y={210} fontFamily={MONO} fontSize={26} fill={R.world}>
        ]
      </text>
      <text x={492} y={168} fontFamily={MONO} fontSize={17} fill={R.signal} fontWeight={600}>
        {cells[0][0]}
      </text>
      <text x={562} y={168} fontFamily={MONO} fontSize={17} fill={sin > 0.01 ? R.error : R.plan} fontWeight={600}>
        {cells[0][1]}
      </text>
      <text x={492} y={206} fontFamily={MONO} fontSize={17} fill={R.signal} fontWeight={600}>
        {cells[1][0]}
      </text>
      <text x={562} y={206} fontFamily={MONO} fontSize={17} fill={R.plan} fontWeight={600}>
        {cells[1][1]}
      </text>
      <text x={470} y={252} fontFamily={MONO} fontSize={12} fill={R.signal}>
        col 1 = rotated x̂
      </text>
      <text x={470} y={272} fontFamily={MONO} fontSize={12} fill={R.plan}>
        col 2 = rotated ŷ
      </text>
      <text x={470} y={310} fontFamily={MONO} fontSize={13} fill={R.ink}>
        θ = {Math.round(a)}°
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 2.3 · Gimbal lock: watch a degree of freedom vanish  (slider-driven)
// Three nested rings driven by roll / pitch / yaw sliders around an aircraft.
// As pitch -> 90° the outer and inner rings swing into the same plane; the DoF
// indicator drops 3 -> 2 and the collapsed axes flash red.
// ===========================================================================

export function RbGimbalLock() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-28, 18);
  const [roll, setRoll] = useState(15);
  const [pitch, setPitch] = useState(20); // target
  const [yaw, setYaw] = useState(25);
  const [pd, setPd] = useState(20); // eased pitch (for the "drive to lock" ride)

  useRafLoop((dt) => setPd((p) => approach(p, pitch, 0.1, dt)), {
    playing: inView && !reduced,
  });
  const p = reduced ? pitch : pd;

  // The real mechanism, composed with real quaternions (ZYX / yaw-pitch-roll):
  //   q1 = Rz(yaw)      — outer ring, spins about the fixed vertical axis
  //   q2 = q1 · Ry(pitch) — middle ring, pivoted on the outer ring
  //   q3 = q2 · Rx(roll)  — inner ring, pivoted on the middle ring; body rides it
  const q1 = quat.fromAxisAngle([0, 0, 1], rad(yaw));
  const q2 = quat.mul(q1, quat.fromAxisAngle([0, 1, 0], rad(p)));
  const q3 = quat.mul(q2, quat.fromAxisAngle([1, 0, 0], rad(roll)));

  // Lock detector: the roll axis is the inner frame's x; the yaw axis is the
  // fixed z. At pitch = ±90° they align and one degree of freedom is gone.
  const rollAxis = quat.rotate(q2, [1, 0, 0]);
  const align = Math.abs(v3.dot(rollAxis, [0, 0, 1])); // 0 = independent, 1 = locked
  const locked = align > 0.92;
  const dof = locked ? 2 : 3;
  const ringCol = locked ? R.error : R.plan;

  const R1 = 1.05, R2 = 0.82, R3 = 0.6;
  const y1 = quat.rotate(q1, [0, 1, 0]); // pitch pivot axis (on the outer ring)
  const x2 = quat.rotate(q2, [1, 0, 0]); // roll pivot axis (on the middle ring)

  const prims: Prim3D[] = [
    // fixed yaw axis: the vertical rod the outer ring spins about
    seg3([0, 0, -1.25], [0, 0, 1.25], R.world, { width: 2, dash: "5 4" }),
    label3([0, 0, 1.32], "yaw axis (fixed)", R.world, { anchor: "middle", dy: -4, size: 12 }),
    // outer ring: contains the vertical axis and the pitch pivots
    ...ring3([0, 0, 0], quat.rotate(q1, [1, 0, 0]), R1, ringCol, { width: 2.5 }),
    // middle ring: pivoted on the outer at ±y1
    ...ring3([0, 0, 0], quat.rotate(q2, [0, 0, 1]), R2, R.world, { width: 2.5 }),
    // inner ring: pivoted on the middle at ±x2; carries the body
    ...ring3([0, 0, 0], quat.rotate(q3, [0, 1, 0]), R3, ringCol, { width: 2.5 }),
    // pivot bearings, so the mounting is visible mechanism, not decoration
    seg3(v3.scale(y1, R2), v3.scale(y1, R1), R.ink, { width: 4 }),
    seg3(v3.scale(y1, -R2), v3.scale(y1, -R1), R.ink, { width: 4 }),
    seg3(v3.scale(x2, R3), v3.scale(x2, R2), R.ink, { width: 4 }),
    seg3(v3.scale(x2, -R3), v3.scale(x2, -R2), R.ink, { width: 4 }),
    // the roll axis arrow — watch it swing up into the yaw axis
    seg3(v3.scale(x2, -1.25), v3.scale(x2, 1.25), locked ? R.error : R.signal, {
      width: 2,
      dash: "5 4",
    }),
    label3(v3.scale(x2, 1.32), "roll axis", locked ? R.error : R.signal, { dx: 6, size: 12 }),
    // the body: nose along x3, wings along y3
    seg3(v3.scale(quat.rotate(q3, [1, 0, 0]), -0.38), v3.scale(quat.rotate(q3, [1, 0, 0]), 0.45), R.signal, { width: 6 }),
    dot3(v3.scale(quat.rotate(q3, [1, 0, 0]), 0.45), R.signal, { r: 6 }),
    seg3(v3.scale(quat.rotate(q3, [0, 1, 0]), -0.3), v3.scale(quat.rotate(q3, [0, 1, 0]), 0.3), R.signal, { width: 4 }),
  ];

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 5, zoom: 132 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 2.3 · Gimbal lock: watch a degree of freedom vanish"
      ariaLabel={`A three-ring gimbal in 3D with roll ${Math.round(roll)}, pitch ${Math.round(p)}, yaw ${Math.round(yaw)} degrees; ${dof} degrees of freedom remaining. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Slider label="roll" min={-90} max={90} value={roll} onChange={setRoll} fmt={(v) => `${v}°`} />
          <Slider label="pitch" min={-90} max={90} value={pitch} onChange={setPitch} fmt={(v) => `${v}°`} />
          <Slider label="yaw" min={-90} max={90} value={yaw} onChange={setYaw} fmt={(v) => `${v}°`} />
          <Btn onClick={() => setPitch(90)} title="drive pitch to 90° and collapse a DoF">
            drive to lock
          </Btn>
          <Btn
            onClick={() => {
              setRoll(15);
              setPitch(20);
              setYaw(25);
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
          { label: "DoF left", value: String(dof), color: locked ? R.error : R.goal },
          { label: "axis align", value: `${Math.round(align * 100)}%`, color: locked ? R.error : R.ink },
          { label: "pitch", value: `${Math.round(p)}°`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "yaw + roll rings" },
          { color: R.world, label: "pitch ring" },
          { color: R.signal, label: "body / roll axis" },
          { color: R.error, label: "locked" },
        ]}
      />
      {locked && (
        <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13.5} fill={R.error} fontWeight={600}>
          roll axis ∥ yaw axis: two knobs now drive the same motion — one DoF is gone
        </text>
      )}
      {!locked && (
        <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          drag to orbit · push pitch toward 90° and watch the dashed axes merge
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 2.4 · Euler vs quaternion: which one takes the ugly path?  (true 3D)
// One unit sphere, two interpolation laws, zero fakery: the amber path lerps
// the three Euler angles independently and composes them; the blue path slerps
// between the same two orientations as quaternions. Both nose traces are drawn
// on the sphere so the detour is measured, not asserted. Orbitable.
// ===========================================================================

type Mode24 = "both" | "euler" | "slerp";

// Euler triples (roll, pitch, yaw) in degrees for start and end orientations.
const EUL_A: V3 = [0, 12, 20];
const EUL_B_EASY: V3 = [0, 35, 150];
const EUL_B_LOCK: V3 = [70, 85, 160]; // pitch grazes the pole: lerp goes wild

const qFromEulDeg = (e: V3) => quat.fromEuler(rad(e[0]), rad(e[1]), rad(e[2]));
const noseAt = (q: Quat): V3 => quat.rotate(q, [1, 0, 0]);

export function RbQuaternionSlerp() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-20, 16);
  const [mode, setMode] = useState<Mode24>("both");
  const [nearLock, setNearLock] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0.35);

  useRafLoop(
    (dt) => setT((v) => (v + dt * 0.25 >= 1 ? 1 : v + dt * 0.25)),
    { playing: playing && inView && !reduced && t < 1 },
  );
  const tv = reduced ? Math.max(t, 0.999) : t;

  const eulB = nearLock ? EUL_B_LOCK : EUL_B_EASY;
  const qA = qFromEulDeg(EUL_A);
  const qB = qFromEulDeg(eulB);

  // the two laws, computed honestly
  const eulerQ = (u: number) =>
    qFromEulDeg([
      lerp(EUL_A[0], eulB[0], u),
      lerp(EUL_A[1], eulB[1], u),
      lerp(EUL_A[2], eulB[2], u),
    ]);
  const slerpQ = (u: number) => quat.slerp(qA, qB, u);

  // arc lengths of the two nose paths (degrees swept), the honest scorecard
  const pathLen = (f: (u: number) => Quat) => {
    let acc = 0;
    let prev = noseAt(f(0));
    for (let i = 1; i <= 48; i++) {
      const cur = noseAt(f(i / 48));
      acc += Math.acos(clamp(v3.dot(prev, cur), -1, 1));
      prev = cur;
    }
    return (acc * 180) / Math.PI;
  };
  const lenE = pathLen(eulerQ);
  const lenS = pathLen(slerpQ);

  const showE = mode === "both" || mode === "euler";
  const showS = mode === "both" || mode === "slerp";

  const prims: Prim3D[] = [
    // wireframe globe: equator + two meridians + a tilted ring, kept light
    ...ring3([0, 0, 0], [0, 0, 1], 1, R.line, { width: 1 }),
    ...ring3([0, 0, 0], [1, 0, 0], 1, R.line, { width: 1 }),
    ...ring3([0, 0, 0], [0, 1, 0], 1, R.line, { width: 1 }),
    // poles, because "pitch hits the pole" is the whole story
    dot3([0, 0, 1], R.world, { r: 3.5 }),
    label3([0, 0, 1], "pole (pitch 90°)", R.world, { dx: 8, dy: -6, size: 11.5 }),
    dot3([0, 0, -1], R.world, { r: 3.5 }),
    // start and end noses (green, ground truth)
    dot3(noseAt(qA), R.goal, { r: 5.5 }),
    label3(noseAt(qA), "A", R.goal, { dx: 8, dy: 12, size: 13 }),
    dot3(noseAt(qB), R.goal, { r: 5.5 }),
    label3(noseAt(qB), "B", R.goal, { dx: 8, dy: -8, size: 13 }),
    ...(showE
      ? [
          ...curve3((u) => noseAt(eulerQ(u * tv)), R.plan, { n: 56, width: 2.5 }),
          dot3(noseAt(eulerQ(tv)), R.plan, { r: 6 }),
          seg3([0, 0, 0], noseAt(eulerQ(tv)), R.plan, { width: 2, opacity: 0.5 }),
        ]
      : []),
    ...(showS
      ? [
          ...curve3((u) => noseAt(slerpQ(u * tv)), R.signal, { n: 56, width: 2.5 }),
          dot3(noseAt(slerpQ(tv)), R.signal, { r: 6 }),
          seg3([0, 0, 0], noseAt(slerpQ(tv)), R.signal, { width: 2, opacity: 0.5 }),
        ]
      : []),
  ];

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 4.6, zoom: 150 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 2.4 · Euler vs quaternion: which one takes the ugly path?"
      ariaLabel={`A unit sphere with two traced nose paths from orientation A to B: Euler interpolation versus quaternion slerp, at blend ${tv.toFixed(2)}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Tabs
            options={[
              { id: "both", label: "both" },
              { id: "euler", label: "euler only" },
              { id: "slerp", label: "slerp only" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Transport
            playing={playing}
            onPlay={() => setPlaying((v) => !v)}
            onReset={() => {
              setT(0);
              setPlaying(false);
              orbit.reset();
            }}
          />
          <Slider label="t" min={0} max={1} step={0.01} value={t} onChange={setT} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => { setNearLock((v) => !v); setT(0.35); }} active={nearLock}>
            {nearLock ? "✓ B near the pole" : "put B near the pole"}
          </Btn>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "t", value: tv.toFixed(2), color: R.ink },
          { label: "euler sweep", value: `${Math.round(lenE)}°`, color: R.plan },
          { label: "slerp sweep", value: `${Math.round(lenS)}°`, color: R.signal },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "euler-angle lerp" },
          { color: R.signal, label: "quaternion slerp" },
          { color: R.goal, label: "A and B" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={nearLock ? R.error : R.world}>
        {nearLock
          ? `near the pole the Euler path sweeps ${Math.round(lenE)}° to slerp's ${Math.round(lenS)}° — same start, same end`
          : "slerp takes the great-circle arc at constant speed · drag to orbit"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 2.5 · Compose a chain: base -> arm -> camera, then drop a point
// (animated pipeline + draggable field). A three-frame chain with a draggable
// cup in the camera frame; sliders edit the arm and camera-mount angles; a
// step button lights one edge at a time and builds up T_base_camera.
// ===========================================================================

type Vec3 = [number, number, number];
// 2D-flavoured homogeneous transform on (x,y): rotation `ang` + translation.
function makeT(angDeg: number, tx: number, ty: number) {
  const c = Math.cos(rad(angDeg));
  const s = Math.sin(rad(angDeg));
  return { c, s, tx, ty };
}
function applyT(T: { c: number; s: number; tx: number; ty: number }, x: number, y: number): [number, number] {
  return [T.c * x - T.s * y + T.tx, T.s * x + T.c * y + T.ty];
}

export function RbTransformChain() {
  // No ambient loop; this figure is purely slider/drag driven, so it is
  // already reduced-motion safe (nothing autoplays). We still take a stage ref
  // for consistent layout.
  const { ref } = useStageVisibility();
  const [armAng, setArmAng] = useState(35);
  const [camAng, setCamAng] = useState(-40);
  const [step, setStep] = useState(0); // 0=none 1=base->arm 2=+arm->cam
  const [cup, setCup] = useState<Vec3>([0.9, 0.3, 0]); // camera-frame coords
  const [drag, setDrag] = useState(false);

  // metric layout: base at left, arm frame offset, camera on the arm tip.
  const baseP = { x: 150, y: 300 };
  const U = 78; // px per unit for drawing frames on the canvas

  // edge transforms (into parent). base->arm: rotate armAng, shift (1.3,0).
  const T_base_arm = makeT(armAng, 1.3, 0);
  // arm->cam: rotate camAng, shift (0.8, 0.4)
  const T_arm_cam = makeT(camAng, 0.8, 0.4);

  // compose base<-camera = T_base_arm · T_arm_cam
  const compose = (
    A: { c: number; s: number; tx: number; ty: number },
    B: { c: number; s: number; tx: number; ty: number },
  ) => {
    // apply B then A: rotation adds, translation = A.R*B.t + A.t
    const [tx, ty] = applyT(A, B.tx, B.ty);
    return { c: A.c * B.c - A.s * B.s, s: A.s * B.c + A.c * B.s, tx, ty };
  };
  const T_base_cam = compose(T_base_arm, T_arm_cam);

  // frame origins in stage px (base frame metric -> px, y up)
  const metricToStage = (mx: number, my: number) => ({ x: baseP.x + mx * U, y: baseP.y - my * U });
  const armOrigin = metricToStage(T_base_arm.tx, T_base_arm.ty);
  const camOriginM = applyT(T_base_arm, T_arm_cam.tx, T_arm_cam.ty);
  const camOrigin = metricToStage(camOriginM[0], camOriginM[1]);

  // cup in each frame
  const cupInBase = applyT(T_base_cam, cup[0], cup[1]);
  const cupInArm = applyT(T_arm_cam, cup[0], cup[1]);
  const cupStage = metricToStage(cupInBase[0], cupInBase[1]);

  const axis = (o: { x: number; y: number }, ang: number, color: string, label: string) => {
    const r = rad(-ang);
    const L = 34;
    return (
      <g>
        <line x1={o.x} y1={o.y} x2={o.x + L * Math.cos(r)} y2={o.y + L * Math.sin(r)} stroke={color} strokeWidth={3} />
        <line
          x1={o.x}
          y1={o.y}
          x2={o.x + L * Math.cos(r - Math.PI / 2)}
          y2={o.y + L * Math.sin(r - Math.PI / 2)}
          stroke={color}
          strokeWidth={3}
          strokeDasharray="4 3"
        />
        <circle cx={o.x} cy={o.y} r={5} fill={color} />
        <text x={o.x + 6} y={o.y - 10} fontFamily={MONO} fontSize={13} fill={color} fontWeight={600}>
          {label}
        </text>
      </g>
    );
  };

  const armAngTotal = armAng;
  const camAngTotal = armAng + camAng;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const r = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * 720;
    const sy = ((e.clientY - r.top) / r.height) * 440;
    // convert stage px -> base metric -> camera-frame coords (inverse of T_base_cam)
    const mx = (sx - baseP.x) / U;
    const my = -(sy - baseP.y) / U;
    const dx = mx - T_base_cam.tx;
    const dy = my - T_base_cam.ty;
    // inverse rotation
    const cx = T_base_cam.c * dx + T_base_cam.s * dy;
    const cy = -T_base_cam.s * dx + T_base_cam.c * dy;
    setCup([clamp(cx, -0.4, 1.6), clamp(cy, -1.2, 1.2), 0]);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 2.5 · Compose a chain: base → arm → camera, then drop a point"
      ariaLabel={`A base to arm to camera transform chain with a draggable cup; the running product resolves the cup in every frame`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(false),
        onPointerLeave: () => setDrag(false),
      }}
      controls={
        <>
          <Slider label="arm angle" min={-60} max={80} value={armAng} onChange={setArmAng} fmt={(v) => `${v}°`} />
          <Slider label="cam mount" min={-90} max={40} value={camAng} onChange={setCamAng} fmt={(v) => `${v}°`} />
          <Btn onClick={() => setStep((s) => (s + 1) % 3)} title="light one edge multiply at a time">
            step through chain ({step}/2)
          </Btn>
          <Btn
            onClick={() => {
              setStep(0);
              setCup([0.9, 0.3, 0]);
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the cup</span>
        </>
      }
    >
      {/* edges */}
      <line
        x1={baseP.x}
        y1={baseP.y}
        x2={armOrigin.x}
        y2={armOrigin.y}
        stroke={step >= 1 ? R.error : R.world}
        strokeWidth={step >= 1 ? 4 : 2.5}
      />
      <line
        x1={armOrigin.x}
        y1={armOrigin.y}
        x2={camOrigin.x}
        y2={camOrigin.y}
        stroke={step >= 2 ? R.error : R.world}
        strokeWidth={step >= 2 ? 4 : 2.5}
      />
      <line x1={camOrigin.x} y1={camOrigin.y} x2={cupStage.x} y2={cupStage.y} stroke={R.line} strokeWidth={1.5} strokeDasharray="3 4" />

      {axis(baseP, 0, R.world, "base")}
      {axis(armOrigin, armAngTotal, R.signal, "arm")}
      {axis(camOrigin, camAngTotal, R.plan, "cam")}

      {/* cup */}
      <circle
        cx={cupStage.x}
        cy={cupStage.y}
        r={12}
        fill={R.fillGreen}
        stroke={R.goal}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
      />
      <text x={cupStage.x} y={cupStage.y - 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        cup
      </text>

      {/* readout lane, fixed right */}
      <text x={452} y={70} fontFamily={MONO} fontSize={13} fill={R.world}>
        cup resolved in each frame
      </text>
      <text x={452} y={98} fontFamily={MONO} fontSize={13} fill={R.plan}>
        camera ({cup[0].toFixed(2)}, {cup[1].toFixed(2)})
      </text>
      <text x={452} y={122} fontFamily={MONO} fontSize={13} fill={R.signal}>
        arm ({cupInArm[0].toFixed(2)}, {cupInArm[1].toFixed(2)})
      </text>
      <text x={452} y={146} fontFamily={MONO} fontSize={13} fill={R.goal} fontWeight={600}>
        base ({cupInBase[0].toFixed(2)}, {cupInBase[1].toFixed(2)})
      </text>

      <text x={452} y={196} fontFamily={MONO} fontSize={12} fill={R.world}>
        running product:
      </text>
      <text x={452} y={220} fontFamily={MONO} fontSize={13} fill={step >= 1 ? R.error : R.world}>
        {step >= 1 ? "T_base_arm ·" : "T_base_arm"}
      </text>
      <text x={452} y={242} fontFamily={MONO} fontSize={13} fill={step >= 2 ? R.error : R.world}>
        {step >= 2 ? "  T_arm_cam" : "  T_arm_cam"}
      </text>
      <text x={452} y={272} fontFamily={MONO} fontSize={12} fill={R.world}>
        {step === 0 ? "step to light each edge" : step === 1 ? "edge 1: base ← arm" : "edge 2: · arm ← cam = base ← cam"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 2.6 · The transform tree: click an edge, read the transform
// (draggable field + toggle). A clean node-link frame tree; joint sliders drive
// dynamic edges; a "resolve cup in ___ frame" dropdown highlights the walked
// path and prints the accumulated coordinate, so the reader sees a tf lookup.
// ===========================================================================

type NodeId = "world" | "base" | "shoulder" | "elbow" | "wrist" | "gripper" | "cammount" | "camera" | "cup";
type TreeNode = { id: NodeId; x: number; y: number; label: string; color: string };
type TreeEdge = { from: NodeId; to: NodeId; dyn: boolean };

const TN: TreeNode[] = [
  { id: "world", x: 90, y: 240, label: "world", color: R.world },
  { id: "base", x: 200, y: 240, label: "base", color: R.world },
  { id: "shoulder", x: 320, y: 120, label: "shoulder", color: R.signal },
  { id: "elbow", x: 430, y: 120, label: "elbow", color: R.signal },
  { id: "wrist", x: 540, y: 120, label: "wrist", color: R.signal },
  { id: "gripper", x: 650, y: 120, label: "gripper", color: R.signal },
  { id: "cammount", x: 340, y: 350, label: "cam_mount", color: R.plan },
  { id: "camera", x: 470, y: 350, label: "camera", color: R.plan },
  { id: "cup", x: 600, y: 350, label: "cup", color: R.goal },
];
const TE: TreeEdge[] = [
  { from: "world", to: "base", dyn: true },
  { from: "base", to: "shoulder", dyn: true },
  { from: "shoulder", to: "elbow", dyn: true },
  { from: "elbow", to: "wrist", dyn: true },
  { from: "wrist", to: "gripper", dyn: false },
  { from: "base", to: "cammount", dyn: false },
  { from: "cammount", to: "camera", dyn: false },
  { from: "camera", to: "cup", dyn: false },
];
const nodeById = (id: NodeId) => TN.find((n) => n.id === id)!;

// paths from cup up to each target frame (the tf walk)
const PATHS: Record<string, NodeId[]> = {
  camera: ["cup", "camera"],
  base: ["cup", "camera", "cammount", "base"],
  gripper: ["cup", "camera", "cammount", "base", "shoulder", "elbow", "wrist", "gripper"],
  world: ["cup", "camera", "cammount", "base", "world"],
};
// sample resolved coordinates so the readout is concrete and deterministic.
const RESOLVED: Record<string, string> = {
  camera: "(0.00, 0.00, 0.60)",
  base: "(0.42, 0.10, 0.71)",
  gripper: "(0.18, -0.05, 0.33)",
  world: "(1.42, 2.10, 0.71)",
};

export function RbTransformTree() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [target, setTarget] = useState<keyof typeof PATHS>("base");
  const [joint, setJoint] = useState(30);
  const [sel, setSel] = useState<string | null>("base->shoulder");
  const [pulse, setPulse] = useState(0);

  useRafLoop((dt) => setPulse((p) => (p + dt) % 1), {
    playing: inView && !reduced,
  });

  const path = PATHS[target];
  const onPath = (a: NodeId, b: NodeId) => {
    for (let i = 0; i < path.length - 1; i++) {
      if ((path[i] === a && path[i + 1] === b) || (path[i] === b && path[i + 1] === a)) return true;
    }
    return false;
  };
  // an edge traversed against its arrow (child->parent up the tree) = inverse
  const isInverse = (from: NodeId, to: NodeId) => {
    const iFrom = path.indexOf(from);
    const iTo = path.indexOf(to);
    // path goes cup(child) -> ... -> target; an edge is stored parent->child,
    // so walking child-before-parent along the path is an inverse traversal.
    return iFrom >= 0 && iTo >= 0 && iFrom < iTo;
  };

  const selEdge = TE.find((e) => `${e.from}->${e.to}` === sel);

  return (
    <Stage
      innerRef={ref}
      title="Fig 2.6 · The transform tree: click an edge, read the transform"
      ariaLabel={`A robot frame tree; resolving the cup in the ${target} frame lights the walked path`}
      controls={
        <>
          <Tabs
            options={[
              { id: "camera", label: "in camera" },
              { id: "base", label: "in base" },
              { id: "gripper", label: "in gripper" },
              { id: "world", label: "in world" },
            ]}
            value={target}
            onChange={(v) => setTarget(v as keyof typeof PATHS)}
          />
          <Slider label="joint" min={-60} max={90} value={joint} onChange={setJoint} fmt={(v) => `${v}°`} />
          <Btn
            onClick={() => {
              setTarget("base");
              setSel("base->shoulder");
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">click an edge</span>
        </>
      }
    >
      {/* edges */}
      {TE.map((e) => {
        const a = nodeById(e.from);
        const b = nodeById(e.to);
        const lit = onPath(e.from, e.to);
        const inv = lit && isInverse(e.from, e.to);
        const isSel = `${e.from}->${e.to}` === sel;
        const col = inv ? R.error : lit ? R.goal : e.dyn ? R.signal : R.world;
        return (
          <g key={`${e.from}-${e.to}`} style={{ cursor: "pointer" }} onClick={() => setSel(`${e.from}->${e.to}`)}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={col}
              strokeWidth={lit ? 4 : isSel ? 3.5 : 2}
              strokeDasharray={e.dyn ? "none" : "6 4"}
              opacity={lit ? 1 : 0.8}
            />
            {/* dynamic glyph: a small moving dot along dynamic edges */}
            {e.dyn && !reduced && (
              <circle
                cx={lerp(a.x, b.x, pulse)}
                cy={lerp(a.y, b.y, pulse)}
                r={2.6}
                fill={lit ? R.goal : R.signal}
              />
            )}
          </g>
        );
      })}

      {/* nodes */}
      {TN.map((n) => {
        const lit = path.includes(n.id);
        return (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.id === "cup" ? 12 : 9}
              fill={lit ? R.fillGreen : "var(--background)"}
              stroke={lit ? R.goal : n.color}
              strokeWidth={lit ? 3 : 2.5}
            />
            <text x={n.x} y={n.y - 14} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={n.color}>
              {n.label}
            </text>
          </g>
        );
      })}

      {/* fixed readout lane, top */}
      <text x={30} y={34} fontFamily={MONO} fontSize={13} fill={R.world}>
        tf lookup: cup in {target} frame
      </text>
      <text x={30} y={56} fontFamily={MONO} fontSize={15} fill={R.goal} fontWeight={600}>
        {RESOLVED[target]}
      </text>

      {/* selected-edge panel, fixed right */}
      {selEdge && (
        <>
          <text x={452} y={402} fontFamily={MONO} fontSize={12} fill={R.world}>
            edge: {selEdge.from} → {selEdge.to} · {selEdge.dyn ? "dynamic (from encoders)" : "static (fixed mount)"}
          </text>
        </>
      )}
      <text x={30} y={402} fontFamily={MONO} fontSize={11} fill={R.error}>
        red edge = traversed against its arrow (an inverse)
      </text>

      {reduced && (
        <text x={30} y={420} fontFamily={MONO} fontSize={11} fill={R.world}>
          Reduced motion: dynamic glyphs at rest; tabs still walk the tree.
        </text>
      )}
    </Stage>
  );
}
