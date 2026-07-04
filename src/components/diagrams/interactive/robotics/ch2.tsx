"use client";

import { useState } from "react";
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
} from "./shared";

const rad = (deg: number) => (deg * Math.PI) / 180;
const fmt2 = (v: number) => (v < 0 ? v.toFixed(2) : ` ${v.toFixed(2)}`);

// ===========================================================================
// Fig 2.1 · The same cup, three frames, three answers  (draggable field)
// A top-down scene with three axis-cross frames — world (grey), base (blue),
// camera (amber). Drag the cup; a fixed readout lane lists its coordinates in
// all three frames at once. A "shift origin" toggle proves points move while a
// pinned displacement vector's numbers stay put.
// ===========================================================================

type Frame21 = { x: number; y: number; ang: number };
const WORLD_F: Frame21 = { x: 150, y: 300, ang: 0 };
const BASE_F: Frame21 = { x: 330, y: 340, ang: -25 };
const CAM_F0: Frame21 = { x: 520, y: 130, ang: 150 };

// World->frame coordinates: express a stage point in a frame's own axes.
// Stage y is screen-down; we flip so the frame's +y reads "up" like a plot.
function inFrame(px: number, py: number, f: Frame21): [number, number] {
  const dx = px - f.x;
  const dy = -(py - f.y);
  const c = Math.cos(rad(f.ang));
  const s = Math.sin(rad(f.ang));
  // rotate stage displacement into frame axes (inverse rotation)
  const fx = c * dx + s * dy;
  const fy = -s * dx + c * dy;
  return [fx / 90, fy / 90]; // 90 px = 1.0 metre
}

function AxisCross({ f, color, label }: { f: Frame21; color: string; label: string }) {
  const c = Math.cos(rad(f.ang));
  const s = Math.sin(rad(f.ang));
  const L = 46;
  const xTip = { x: f.x + L * c, y: f.y - L * s };
  const yTip = { x: f.x + L * s, y: f.y + L * c };
  return (
    <g>
      <line x1={f.x} y1={f.y} x2={xTip.x} y2={xTip.y} stroke={color} strokeWidth={3} />
      <line x1={f.x} y1={f.y} x2={yTip.x} y2={yTip.y} stroke={color} strokeWidth={3} strokeDasharray="4 3" />
      <circle cx={f.x} cy={f.y} r={5} fill={color} />
      <text x={xTip.x + 4} y={xTip.y + 4} fontFamily={MONO} fontSize={12} fill={color}>
        x
      </text>
      <text x={yTip.x + 4} y={yTip.y + 4} fontFamily={MONO} fontSize={12} fill={color}>
        y
      </text>
      <text x={f.x - 6} y={f.y + 22} fontFamily={MONO} fontSize={13} fill={color} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

export function RbThreeFrames() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [cup, setCup] = useState({ x: 420, y: 240 });
  const [cam, setCam] = useState<Frame21>(CAM_F0);
  const [shift, setShift] = useState(false);
  const [drag, setDrag] = useState<null | "cup" | "cam">(null);
  // eased world-origin offset for the "shift origin" demo
  const [off, setOff] = useState(0);

  useRafLoop(
    (dt) => setOff((o) => approach(o, shift ? 120 : 0, 0.2, dt)),
    { playing: inView && !reduced },
  );
  const oX = reduced ? (shift ? 120 : 0) : off;
  const world: Frame21 = { ...WORLD_F, x: WORLD_F.x + oX };

  const cW = inFrame(cup.x, cup.y, world);
  const cB = inFrame(cup.x, cup.y, BASE_F);
  const cC = inFrame(cup.x, cup.y, cam);

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = clamp(((e.clientX - r.left) / r.width) * 720, 120, 660);
    const y = clamp(((e.clientY - r.top) / r.height) * 440, 100, 380);
    if (drag === "cup") setCup({ x, y });
    else setCam((f) => ({ ...f, x: clamp(x, 380, 660), y: clamp(y, 60, 260) }));
  };

  // displacement vector: from base origin toward the cup, fixed length demo
  const vTipX = BASE_F.x + 70;
  const vTipY = BASE_F.y - 70;

  const rows: [string, string, [number, number]][] = [
    ["world", R.world, cW],
    ["base", R.signal, cB],
    ["camera", R.plan, cC],
  ];

  return (
    <Stage
      innerRef={ref}
      title="Fig 2.1 · The same cup, three frames, three answers"
      ariaLabel={`One cup shown with its coordinates in a world, base and camera frame at once`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(null),
        onPointerLeave: () => setDrag(null),
      }}
      controls={
        <>
          <Btn onClick={() => setShift((v) => !v)} active={shift}>
            {shift ? "✓ shift world origin" : "shift world origin"}
          </Btn>
          <Btn
            onClick={() => {
              setCup({ x: 420, y: 240 });
              setCam(CAM_F0);
              setShift(false);
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the cup or the camera</span>
        </>
      }
    >
      {/* fixed readout lane, top — three frames, three answers */}
      <text x={30} y={34} fontFamily={MONO} fontSize={13} fill={R.world}>
        cup coordinates (metres)
      </text>
      {rows.map(([name, col, xy], i) => (
        <g key={name}>
          <rect x={28 + i * 224} y={44} width={210} height={26} rx={5} fill="none" stroke={col} strokeWidth={1.5} />
          <text x={38 + i * 224} y={61} fontFamily={MONO} fontSize={13} fill={col} fontWeight={600}>
            {name}
          </text>
          <text
            x={112 + i * 224}
            y={61}
            fontFamily={MONO}
            fontSize={13}
            fill={name === "world" && (shift || oX > 1) ? R.error : R.ink}
          >
            ({fmt2(xy[0])},{fmt2(xy[1])})
          </text>
        </g>
      ))}

      {/* frames */}
      <AxisCross f={world} color={R.world} label="world" />
      <AxisCross f={BASE_F} color={R.signal} label="base" />
      <AxisCross f={cam} color={R.plan} label="camera" />

      {/* fixed displacement vector off the base origin — numbers never change */}
      <g opacity={0.9}>
        <line x1={BASE_F.x} y1={BASE_F.y} x2={vTipX} y2={vTipY} stroke={R.goal} strokeWidth={2.5} />
        <polygon
          points={`${vTipX},${vTipY} ${vTipX - 8},${vTipY + 2} ${vTipX - 2},${vTipY + 8}`}
          fill={R.goal}
        />
        <text x={vTipX + 4} y={vTipY - 4} fontFamily={MONO} fontSize={11} fill={R.goal}>
          vector (0.78,0.78) — unchanged
        </text>
      </g>

      {/* draggable camera handle */}
      <circle
        cx={cam.x}
        cy={cam.y}
        r={14}
        fill="none"
        stroke={R.plan}
        strokeWidth={2}
        strokeDasharray="3 3"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag("cam");
        }}
      />

      {/* the cup */}
      <circle
        cx={cup.x}
        cy={cup.y}
        r={13}
        fill={R.fillGreen}
        stroke={R.goal}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag("cup");
        }}
      />
      <text x={cup.x} y={cup.y + 30} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
        cup
      </text>

      {reduced && (
        <text x={30} y={412} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: origin shift shown at rest; the toggle still updates the numbers.
        </text>
      )}
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
  const [roll, setRoll] = useState(20);
  const [pitch, setPitch] = useState(25); // target
  const [yaw, setYaw] = useState(30);
  const [pd, setPd] = useState(25); // eased pitch

  useRafLoop((dt) => setPd((p) => approach(p, pitch, 0.16, dt)), {
    playing: inView && !reduced,
  });
  const p = reduced ? pitch : pd;

  const lockAmt = clamp(1 - Math.abs(p - 90) / 18, 0, 1); // 1 at lock
  const locked = lockAmt > 0.55;
  const dof = locked ? 2 : 3;

  const C = { x: 250, y: 240 };
  // three concentric rings; pitch squashes the inner ring toward a line and
  // rolls the outer ring's tilt so at 90° outer & inner share a plane.
  const outerR = 150;
  const midR = 112;
  const innerR = 76;

  // ellipse "squash": as pitch nears 90°, inner ring collapses to a line
  const innerRy = innerR * Math.abs(Math.cos(rad(p)));

  return (
    <Stage
      innerRef={ref}
      title="Fig 2.3 · Gimbal lock: watch a degree of freedom vanish"
      ariaLabel={`A gimbal with roll ${Math.round(roll)}, pitch ${Math.round(p)}, yaw ${Math.round(yaw)} degrees; ${dof} degrees of freedom remaining`}
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
              setRoll(20);
              setPitch(25);
              setYaw(30);
            }}
          >
            ↺ reset
          </Btn>
        </>
      }
    >
      {/* fixed readout lane, top-left */}
      <text x={30} y={40} fontFamily={MONO} fontSize={14} fill={R.world}>
        degrees of freedom remaining
      </text>
      <text x={30} y={70} fontFamily={MONO} fontSize={26} fill={locked ? R.error : R.goal} fontWeight={700}>
        {dof}
      </text>
      <text x={62} y={70} fontFamily={MONO} fontSize={14} fill={locked ? R.error : R.goal}>
        {locked ? "— roll & yaw collapsed" : "— all independent"}
      </text>

      {/* outer ring (yaw, amber) */}
      <ellipse
        cx={C.x}
        cy={C.y}
        rx={outerR}
        ry={outerR * 0.42}
        fill="none"
        stroke={locked ? R.error : R.plan}
        strokeWidth={locked ? 4 : 3}
        transform={`rotate(${yaw * 0.15} ${C.x} ${C.y})`}
      />
      {/* mid ring (pitch, world grey) — the one that still works */}
      <ellipse
        cx={C.x}
        cy={C.y}
        rx={midR * 0.42}
        ry={midR}
        fill="none"
        stroke={R.world}
        strokeWidth={3}
        transform={`rotate(${p * 0.2} ${C.x} ${C.y})`}
      />
      {/* inner ring (roll, amber) — collapses onto the outer plane at lock */}
      <ellipse
        cx={C.x}
        cy={C.y}
        rx={innerR}
        ry={Math.max(4, innerRy) * 0.42 + innerRy * 0.58}
        fill="none"
        stroke={locked ? R.error : R.plan}
        strokeWidth={locked ? 4 : 3}
        transform={`rotate(${roll * 0.15} ${C.x} ${C.y})`}
      />

      {/* aircraft body (blue), pitches up with p */}
      <g transform={`rotate(${-p * 0.7} ${C.x} ${C.y})`}>
        <polygon
          points={`${C.x},${C.y - 40} ${C.x - 10},${C.y + 30} ${C.x + 10},${C.y + 30}`}
          fill={R.fillBlue}
          stroke={R.signal}
          strokeWidth={2.5}
        />
        <line x1={C.x - 34} y1={C.y} x2={C.x + 34} y2={C.y} stroke={R.signal} strokeWidth={5} strokeLinecap="round" />
      </g>

      {/* label the two collapsed axes at lock */}
      {locked && (
        <text x={C.x} y={C.y + 175} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error} fontWeight={600}>
          roll axis ∥ yaw axis — one motion, two knobs
        </text>
      )}

      {/* legend, fixed right lane */}
      <text x={470} y={140} fontFamily={MONO} fontSize={13} fill={R.plan}>
        ● roll / yaw rings
      </text>
      <text x={470} y={166} fontFamily={MONO} fontSize={13} fill={R.world}>
        ● pitch ring
      </text>
      <text x={470} y={192} fontFamily={MONO} fontSize={13} fill={R.signal}>
        ● aircraft body
      </text>
      <text x={470} y={230} fontFamily={MONO} fontSize={12} fill={R.world}>
        pitch = {Math.round(p)}°
      </text>
      <text x={470} y={252} fontFamily={MONO} fontSize={12} fill={locked ? R.error : R.world}>
        {locked ? "LOCKED near 90°" : "away from lock"}
      </text>

      {reduced && (
        <text x={30} y={414} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: rings shown static; the pitch slider still drives the lock.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 2.4 · Euler vs quaternion: which one takes the ugly path?  (toggle-compare)
// Two objects blend from start A to end B along a shared scrub bar. Left uses
// naive Euler interpolation (kinks, can flip near lock); right uses quaternion
// slerp (clean even arc). Traced nose paths make the difference undeniable.
// ===========================================================================

type Mode24 = "both" | "euler" | "slerp";

export function RbQuaternionSlerp() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<Mode24>("both");
  const [nearLock, setNearLock] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);

  useRafLoop(
    (dt) =>
      setT((v) => {
        const nv = v + dt * 0.4;
        return nv >= 1 ? 1 : nv;
      }),
    { playing: playing && inView && !reduced && t < 1 },
  );

  const tv = reduced ? 1 : t;

  // start A and end B headings (degrees) — nearLock preset pushes B through a
  // pole so the Euler path lurches and doubles back.
  const A = 20;
  const B = nearLock ? 340 : 150;

  // slerp: shortest arc, constant rate
  const dShort = ((B - A + 540) % 360) - 180;
  const slerpAng = A + dShort * tv;
  // euler: naive linear over the "long/ugly" way + a wobble near lock
  const eulerBase = lerp(A, nearLock ? B + 360 : B, tv);
  const wobble = nearLock ? Math.sin(tv * Math.PI * 3) * 26 * (1 - Math.abs(tv - 0.5) * 1.4) : 0;
  const eulerAng = eulerBase + wobble;

  const drawObj = (cx: number, cy: number, ang: number, color: string, fill: string, label: string) => {
    const r = rad(-ang);
    const nose = { x: cx + 60 * Math.cos(r), y: cy + 60 * Math.sin(r) };
    return (
      <g>
        <line x1={cx} y1={cy} x2={nose.x} y2={nose.y} stroke={color} strokeWidth={6} strokeLinecap="round" />
        <polygon
          points={`${nose.x},${nose.y} ${nose.x - 12 * Math.cos(r - 0.4)},${nose.y - 12 * Math.sin(r - 0.4)} ${nose.x - 12 * Math.cos(r + 0.4)},${nose.y - 12 * Math.sin(r + 0.4)}`}
          fill={color}
        />
        <circle cx={cx} cy={cy} r={26} fill={fill} stroke={color} strokeWidth={2.5} />
        <text x={cx} y={cy + 62} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={color}>
          {label}
        </text>
      </g>
    );
  };

  // traced arcs for each nose (sampled path)
  const trace = (cx: number, cy: number, fn: (u: number) => number, color: string) => {
    const pts = Array.from({ length: 41 }, (_, i) => {
      const u = i / 40;
      if (u > tv + 0.001) return null;
      const r = rad(-fn(u));
      return `${(cx + 60 * Math.cos(r)).toFixed(1)},${(cy + 60 * Math.sin(r)).toFixed(1)}`;
    }).filter(Boolean);
    return <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} opacity={0.55} />;
  };

  const eFn = (u: number) => lerp(A, nearLock ? B + 360 : B, u) + (nearLock ? Math.sin(u * Math.PI * 3) * 26 * (1 - Math.abs(u - 0.5) * 1.4) : 0);
  const sFn = (u: number) => A + dShort * u;

  const showE = mode === "both" || mode === "euler";
  const showS = mode === "both" || mode === "slerp";
  const CL = { x: 200, y: 250 };
  const CR = { x: 520, y: 250 };

  // target B ghost markers
  const targetGhost = (cx: number, cy: number) => {
    const r = rad(-B);
    const nx = cx + 60 * Math.cos(r);
    const ny = cy + 60 * Math.sin(r);
    return <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={R.goal} strokeWidth={2.5} strokeDasharray="5 5" />;
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 2.4 · Euler vs quaternion: which one takes the ugly path?"
      ariaLabel={`Two objects blending from start A to end B; left uses Euler interpolation, right uses quaternion slerp, at blend ${tv.toFixed(2)}`}
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
          <Btn onClick={() => setPlaying((v) => !v)} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Slider label="t" min={0} max={1} step={0.01} value={t} onChange={setT} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => setNearLock((v) => !v)} active={nearLock}>
            {nearLock ? "✓ near-lock B" : "choose near-lock B"}
          </Btn>
          <Btn
            onClick={() => {
              setT(0);
              setPlaying(false);
            }}
          >
            ↺ reset
          </Btn>
        </>
      }
    >
      <line x1={360} y1={70} x2={360} y2={400} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={200} y={54} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.plan}>
        Euler interpolation
      </text>
      <text x={520} y={54} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.signal}>
        quaternion slerp
      </text>

      {showE && (
        <>
          {targetGhost(CL.x, CL.y)}
          {trace(CL.x, CL.y, eFn, R.plan)}
          {drawObj(CL.x, CL.y, eulerAng, R.plan, R.fillAmber, nearLock ? "detours / flips" : "wobbles")}
        </>
      )}
      {showS && (
        <>
          {targetGhost(CR.x, CR.y)}
          {trace(CR.x, CR.y, sFn, R.signal)}
          {drawObj(CR.x, CR.y, slerpAng, R.signal, R.fillBlue, "clean even arc")}
        </>
      )}

      {/* fixed bottom lane */}
      <text x={30} y={418} fontFamily={MONO} fontSize={13} fill={R.world}>
        green dashed = target orientation B · t = {tv.toFixed(2)}
        {nearLock ? " · near-lock: Euler side lurches" : ""}
      </text>

      {reduced && (
        <text x={30} y={396} fontFamily={MONO} fontSize={12} fill={R.world}>
          Reduced motion: shown at t = 1; the scrub bar and presets still update both paths.
        </text>
      )}
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
  // No ambient loop — this figure is purely slider/drag driven, so it is
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
// Fig 2.6 · The transform tree — click an edge, read the transform
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
      title="Fig 2.6 · The transform tree — click an edge, read the transform"
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
        tf lookup — cup in {target} frame
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
