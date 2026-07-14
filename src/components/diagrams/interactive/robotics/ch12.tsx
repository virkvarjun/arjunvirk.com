"use client";

import { useReducer, useRef, useState } from "react";
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
  approach,
  clamp,
  lerp,
  type V3,
  type Prim3D,
  type Seg3D,
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

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const smooth = (t: number) => t * t * (3 - 2 * t);

// --- Shared 3D helpers for this chapter --------------------------------------

// Intersect the line p(t) = o + t·d with a box (center c, yaw about z, half
// extents h). Returns entry/exit points and their outward world normals. This
// is the real contact geometry both grasp figures compute against.
function rayBox(
  o: V3,
  d: V3,
  c: V3,
  yawRad: number,
  h: V3,
): { pIn: V3; nIn: V3; pOut: V3; nOut: V3 } | null {
  const cw = Math.cos(-yawRad);
  const sw = Math.sin(-yawRad);
  const toLocal = (p: V3): V3 => [p[0] * cw - p[1] * sw, p[0] * sw + p[1] * cw, p[2]];
  const ol = toLocal(v3.sub(o, c));
  const dl = toLocal(d);
  let tmin = -Infinity;
  let tmax = Infinity;
  let axMin = -1;
  let sgMin = 1;
  let axMax = -1;
  let sgMax = 1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dl[i]) < 1e-9) {
      if (Math.abs(ol[i]) > h[i]) return null;
      continue;
    }
    let t1 = (-h[i] - ol[i]) / dl[i];
    let t2 = (h[i] - ol[i]) / dl[i];
    let s1 = -1;
    let s2 = 1;
    if (t1 > t2) {
      const tt = t1;
      t1 = t2;
      t2 = tt;
      s1 = 1;
      s2 = -1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axMin = i;
      sgMin = s1;
    }
    if (t2 < tmax) {
      tmax = t2;
      axMax = i;
      sgMax = s2;
    }
  }
  if (tmax <= tmin || axMin < 0 || axMax < 0) return null;
  const at = (t: number): V3 => [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
  const cy2 = Math.cos(yawRad);
  const sy2 = Math.sin(yawRad);
  const nOf = (ax: number, sg: number): V3 => {
    const n: V3 = ax === 0 ? [sg, 0, 0] : ax === 1 ? [0, sg, 0] : [0, 0, sg];
    return [n[0] * cy2 - n[1] * sy2, n[0] * sy2 + n[1] * cy2, n[2]];
  };
  return { pIn: at(tmin), nIn: nOf(axMin, sgMin), pOut: at(tmax), nOut: nOf(axMax, sgMax) };
}

// A wireframe friction cone: apex at the contact, axis pointing into the
// object, half-angle arctan(μ). Ten base points, alternate spokes.
function cone3(apex: V3, axis: V3, L: number, halfAng: number, color: string): Seg3D[] {
  const a = v3.norm(axis);
  const ref: V3 = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = v3.norm(v3.cross(ref, a));
  const w = v3.cross(a, u);
  const r = L * Math.tan(halfAng);
  const base = v3.add(apex, v3.scale(a, L));
  const N = 10;
  const pts: V3[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    pts.push(v3.add(base, v3.add(v3.scale(u, r * Math.cos(t)), v3.scale(w, r * Math.sin(t)))));
  }
  const out: Seg3D[] = [];
  for (let i = 0; i < N; i++) {
    out.push(seg3(pts[i], pts[(i + 1) % N], color, { width: 1, opacity: 0.7 }));
    if (i % 2 === 0) out.push(seg3(apex, pts[i], color, { width: 1, opacity: 0.5 }));
  }
  return out;
}

// Rotate a vector about the world y-axis (forward lean when a > 0).
const rotY = (p: V3, a: number): V3 => [
  p[0] * Math.cos(a) + p[2] * Math.sin(a),
  p[1],
  -p[0] * Math.sin(a) + p[2] * Math.cos(a),
];

// Monotone-chain convex hull, counter-clockwise.
function hull2(pts: [number, number][]): [number, number][] {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of s) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

// Point-in-convex-polygon (CCW hull) + signed distance to the boundary
// (positive inside). This is the actual stability test in Fig 12.3.
function hullMargin(hull: [number, number][], p: [number, number]) {
  let inside = true;
  let dmin = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (cr < 0) inside = false;
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1), 0, 1);
    dmin = Math.min(dmin, Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy)));
  }
  return { inside, margin: inside ? dmin : -dmin };
}

// ===========================================================================
// Fig 12.1 · Finding an antipodal grasp  (true 3D, orbitable)
// A parallel-jaw gripper pinches a 3D box. The two contacts and their face
// normals come from a real ray–box intersection; the verdict is the honest
// two-contact antipodal test: the pinch axis must lie inside the friction
// cone (half-angle arctan μ) at BOTH contacts. Swing the approach, rotate the
// object, or drop μ, and watch a holding grasp become a slipping one.
// ===========================================================================

const BOX_C: V3 = [0, 0, 0.5];
const BOX_H: V3 = [0.46, 0.3, 0.26];

export function RbAntipodalGrasp() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-32, 22);
  const [approachDeg, setApproachDeg] = useState(90);
  const [objYaw, setObjYaw] = useState(12);
  const [mu, setMu] = useState(0.4);
  const [showCone, setShowCone] = useState(true);
  const [close, setClose] = useState(0); // eased finger close, 0..1

  useRafLoop((dt) => setClose((c) => approach(c, 1, 0.1, dt)), {
    playing: inView && !reduced,
  });
  const closeT = reduced ? 1 : close;

  const yawRad = rad(objYaw);
  const app = rad(approachDeg);
  const u: V3 = [Math.cos(app), Math.sin(app), 0]; // pinch axis, horizontal

  // Real contact geometry: where the pinch line pierces the box, and the
  // outward normals of the faces it pierces.
  const hit = rayBox(BOX_C, u, BOX_C, yawRad, BOX_H)!; // line through center: always hits
  const pA = hit.pOut; // +u side contact
  const nA = hit.nOut;
  const pB = hit.pIn; // -u side contact
  const nB = hit.nIn;

  // The antipodal force-closure test, computed for real: the pinch axis must
  // lie within arctan(μ) of the contact normal at both contacts.
  const coneHalf = Math.atan(mu);
  const angA = Math.acos(clamp(v3.dot(u, nA), -1, 1));
  const angB = Math.acos(clamp(-v3.dot(u, nB), -1, 1));
  const okA = angA < coneHalf;
  const okB = angB < coneHalf;
  const holds = okA && okB;
  const grasp = holds ? R.goal : R.error;

  // Gripper: pads retract along the pinch axis when open, plus a yoke above.
  const padA = v3.add(pA, v3.scale(u, (1 - closeT) * 0.5));
  const padB = v3.add(pB, v3.scale(u, -(1 - closeT) * 0.5));
  const zTop = BOX_C[2] + 0.62;
  const yA: V3 = [padA[0], padA[1], zTop];
  const yB: V3 = [padB[0], padB[1], zTop];

  const qBox = quat.fromAxisAngle([0, 0, 1], yawRad);
  const prims: Prim3D[] = [
    ...grid3(1.2, 0.4),
    // the object
    ...box3(BOX_C, qBox, BOX_H[0] * 2, BOX_H[1] * 2, BOX_H[2] * 2, R.signal),
    // pinch axis
    seg3(v3.add(BOX_C, v3.scale(u, -1.35)), v3.add(BOX_C, v3.scale(u, 1.35)), R.plan, {
      width: 1.5,
      dash: "6 6",
      opacity: 0.8,
    }),
    // friction cones (axis = inward normal, half-angle = arctan μ)
    ...(showCone ? cone3(pA, v3.scale(nA, -1), 0.36, coneHalf, R.world) : []),
    ...(showCone ? cone3(pB, v3.scale(nB, -1), 0.36, coneHalf, R.world) : []),
    // contact normals
    seg3(pA, v3.add(pA, v3.scale(nA, 0.32)), grasp, { width: 3 }),
    dot3(v3.add(pA, v3.scale(nA, 0.32)), grasp, { r: 3 }),
    seg3(pB, v3.add(pB, v3.scale(nB, 0.32)), grasp, { width: 3 }),
    dot3(v3.add(pB, v3.scale(nB, 0.32)), grasp, { r: 3 }),
    // contact points
    dot3(pA, grasp, { r: 5 }),
    dot3(pB, grasp, { r: 5 }),
    // gripper: pads, risers, crossbar
    seg3(v3.add(padA, [0, 0, -0.15]), v3.add(padA, [0, 0, 0.15]), R.plan, { width: 6 }),
    seg3(v3.add(padB, [0, 0, -0.15]), v3.add(padB, [0, 0, 0.15]), R.plan, { width: 6 }),
    seg3(v3.add(padA, [0, 0, 0.15]), yA, R.plan, { width: 3 }),
    seg3(v3.add(padB, [0, 0, 0.15]), yB, R.plan, { width: 3 }),
    seg3(yA, yB, R.plan, { width: 3 }),
    label3(v3.lerp(yA, yB, 0.5), "gripper", R.plan, { anchor: "middle", dy: -8, size: 12 }),
  ];

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 4.6,
    zoom: 190,
    target: [0, 0, 0.4],
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.1 · Finding an antipodal grasp"
      ariaLabel={`A parallel-jaw gripper pinching a 3D box; ${holds ? "force closure holds" : "the grasp will slip"}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Slider
            label="approach"
            min={0}
            max={180}
            value={approachDeg}
            onChange={setApproachDeg}
            fmt={(v) => `${v}°`}
          />
          <Slider
            label="rotate object"
            min={-90}
            max={90}
            value={objYaw}
            onChange={setObjYaw}
            fmt={(v) => `${v}°`}
          />
          <Slider label="μ" min={0.1} max={0.9} step={0.05} value={mu} onChange={setMu} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => setShowCone((v) => !v)} active={showCone}>
            {showCone ? "✓ friction cones" : "show friction cones"}
          </Btn>
          <Btn
            onClick={() => {
              setApproachDeg(90);
              setObjYaw(12);
              setMu(0.4);
              setClose(0);
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
          {
            label: "grasp",
            value: holds ? "holds ✓" : "will slip ✗",
            color: grasp,
          },
          { label: "angle A", value: `${deg(angA).toFixed(0)}°`, color: okA ? R.goal : R.error },
          { label: "angle B", value: `${deg(angB).toFixed(0)}°`, color: okB ? R.goal : R.error },
          { label: "cone ±", value: `${deg(coneHalf).toFixed(0)}°`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "object" },
          { color: R.plan, label: "gripper · pinch axis" },
          { color: R.world, label: "friction cone" },
          { color: grasp, label: "contacts + normals" },
        ]}
      />
      <text
        x={360}
        y={424}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12.5}
        fill={holds ? R.world : R.error}
        fontWeight={holds ? 400 : 600}
      >
        {holds
          ? `pinch axis within arctan μ = ${deg(coneHalf).toFixed(0)}° of both face normals → force closure · drag to orbit`
          : "pinch axis leaves a friction cone: the finger pushes off-normal and the object shears out"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 12.2 · Reorienting an object in-hand  (true 3D stepper, orbitable)
// Four fingers arch over a palm and pinch a cube at real ray–box contacts.
// Each step is one contact-switch: the cube rotates one increment about the
// vertical axis while the risky finger breaks contact, swings with the lift,
// and re-lands on the surface. Ghost cube = the commanded target orientation.
// ===========================================================================

const IH_STEPS = 6;
const FINGER_ANGLES = [20, 110, 200, 290]; // deg, offset so contacts avoid corners
const CUBE_C: V3 = [0, 0, 0.62];
const CUBE_H: V3 = [0.28, 0.28, 0.28];

export function RbInHandReorient() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-30, 26);
  const [playing, setPlaying] = useState(false);
  const [showForce, setShowForce] = useState(true);
  const [targetDeg, setTargetDeg] = useState(90);
  const [step, setStep] = useState(0); // 0..IH_STEPS contact-switches done
  const [st, setSt] = useState({ ang: 0, phase: 0 });
  const acc = useRef(0);

  const cubeTarget = (step / IH_STEPS) * targetDeg;
  const riskyFinger = step > 0 ? (step - 1) % FINGER_ANGLES.length : -1;

  useRafLoop(
    (dt) => {
      setSt((s) => ({
        ang: approach(s.ang, cubeTarget, 0.12, dt),
        phase: (s.phase + dt * 2.2) % (Math.PI * 2),
      }));
      if (playing) {
        acc.current += dt;
        if (acc.current >= 1.15) {
          acc.current = 0;
          setStep((k) => (k >= IH_STEPS ? k : k + 1));
        }
      } else {
        acc.current = 0;
      }
    },
    { playing: inView && !reduced },
  );

  const cubeAng = reduced ? cubeTarget : st.ang;
  const pulse = reduced ? 0.5 : (Math.sin(st.phase) + 1) / 2;
  // lift envelope: right after a switch the cube still has degrees to go, so
  // the risky finger is off the surface; it eases back on as the cube settles.
  const stepSize = Math.max(targetDeg / IH_STEPS, 4);
  const lift = reduced ? 0 : clamp(Math.abs(cubeAng - cubeTarget) / (stepSize * 0.7), 0, 1);

  const yawRad = rad(cubeAng);
  const qCube = quat.fromAxisAngle([0, 0, 1], yawRad);
  const qGhost = quat.fromAxisAngle([0, 0, 1], rad(targetDeg));

  // fingers: base on a ring at the palm edge, tip at the real cube contact.
  const fingers = FINGER_ANGLES.map((aDeg, i) => {
    const a = rad(aDeg);
    const base: V3 = [Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.06];
    const dir: V3 = [-Math.cos(a), -Math.sin(a), 0]; // toward the cube axis
    const hit = rayBox([base[0], base[1], CUBE_C[2]], dir, CUBE_C, yawRad, CUBE_H);
    const contact: V3 = hit ? hit.pIn : CUBE_C;
    const n: V3 = hit ? hit.nIn : [Math.cos(a), Math.sin(a), 0];
    const risky = i === riskyFinger;
    const tip = risky
      ? v3.add(v3.add(contact, v3.scale(n, 0.3 * lift)), [0, 0, 0.18 * lift])
      : contact;
    const knuckle: V3 = [lerp(base[0], tip[0], 0.55), lerp(base[1], tip[1], 0.55), 0.92];
    return { base, knuckle, tip, contact, n, risky };
  });

  const inFlight = riskyFinger >= 0 && lift > 0.4;
  const marker = v3.add(CUBE_C, v3.add(quat.rotate(qCube, [0.28, 0, 0]), [0, 0, 0.29]));

  const prims: Prim3D[] = [
    ...grid3(1.0, 0.5),
    // palm
    ...ring3([0, 0, 0.02], [0, 0, 1], 0.8, R.world, { width: 2 }),
    label3([0, -0.8, 0.02], "palm", R.world, { anchor: "middle", dy: 16, size: 12 }),
    // rotation axis
    seg3([0, 0, 0], [0, 0, 1.25], R.world, { width: 1.5, dash: "4 5", opacity: 0.7 }),
    label3([0, 0, 1.25], "rotation axis", R.world, { anchor: "middle", dy: -6, size: 11.5 }),
    // ghost target orientation
    ...box3(CUBE_C, qGhost, 0.6, 0.6, 0.6, R.plan).map((s) => ({
      ...s,
      dash: "4 4",
      width: 1.2,
      opacity: 0.75,
    })),
    // the cube + a face marker so rotation is visible
    ...box3(CUBE_C, qCube, 0.56, 0.56, 0.56, R.signal).map((s) => ({ ...s, width: 2 })),
    seg3(v3.add(CUBE_C, [0, 0, 0.29]), marker, R.signal, { width: 3.5 }),
    dot3(marker, R.signal, { r: 4 }),
    // fingers
    ...fingers.flatMap((f): Prim3D[] => {
      const col = f.risky ? R.error : R.goal;
      const out: Prim3D[] = [
        dot3(f.base, R.world, { r: 4 }),
        seg3(f.base, f.knuckle, R.world, { width: 4 }),
        seg3(f.knuckle, f.tip, R.world, { width: 4 }),
        dot3(f.tip, col, { r: 5.5 }),
      ];
      if (showForce && !f.risky) {
        out.push(
          seg3(v3.add(f.contact, v3.scale(f.n, 0.26)), v3.add(f.contact, v3.scale(f.n, 0.06)), R.goal, {
            width: 2.5,
            opacity: 0.35 + 0.5 * pulse,
          }),
          dot3(v3.add(f.contact, v3.scale(f.n, 0.06)), R.goal, { r: 2.5 }),
        );
      }
      return out;
    }),
  ];

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 4.8,
    zoom: 165,
    target: [0, 0, 0.5],
  };

  const doStep = () => setStep((k) => (k >= IH_STEPS ? k : k + 1));
  const reset = () => {
    setStep(0);
    setSt({ ang: 0, phase: 0 });
    setPlaying(false);
    acc.current = 0;
    orbit.reset();
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.2 · Reorienting an object in-hand"
      ariaLabel={`A four-finger hand rotating a cube toward a target; contact switch ${step} of ${IH_STEPS}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onStep={doStep}
            onReset={reset}
          />
          <Slider
            label="target"
            min={0}
            max={180}
            value={targetDeg}
            onChange={setTargetDeg}
            fmt={(v) => `${v}°`}
          />
          <Btn onClick={() => setShowForce((v) => !v)} active={showForce}>
            {showForce ? "✓ contact forces" : "show contact forces"}
          </Btn>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      <Readout
        rows={[
          { label: "switch", value: `${step} / ${IH_STEPS}`, color: R.ink },
          { label: "cube yaw", value: `${Math.round(cubeAng)}°`, color: R.signal },
          {
            label: "contacts",
            value: inFlight ? "3 / 4" : "4 / 4",
            color: inFlight ? R.error : R.goal,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "cube" },
          { color: R.plan, label: "target pose", dash: true },
          { color: R.goal, label: "holding contact" },
          { color: R.error, label: "switching finger" },
        ]}
      />
      <text
        x={360}
        y={424}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12.5}
        fill={step >= IH_STEPS ? R.goal : R.world}
        fontWeight={step >= IH_STEPS ? 600 : 400}
      >
        {step >= IH_STEPS
          ? "reached the target orientation ✓ — six contact switches, six different dynamics regimes"
          : "every lift-and-replace is a discontinuous switch in the dynamics · drag to orbit"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 12.3 · Which chapter runs which body part?  (true 3D, orbitable)
// A stick humanoid with each region colored by the chapter that controls it,
// standing on a real support polygon (convex hull of both feet). Lean and
// reach sliders move a mass-weighted center of mass; the stability verdict is
// an honest point-in-polygon test of the CoM's ground projection — the
// quasi-static version of the ZMP rule from the text.
// ===========================================================================

type BodyRegion = "legs" | "arms" | "torso" | "head" | "all";
const REGION_INFO: Record<
  Exclude<BodyRegion, "all">,
  { label: string; method: string; chapter: string; color: string; why: string }
> = {
  legs: {
    label: "legs",
    method: "RL locomotion",
    chapter: "Ch 7",
    color: R.goal,
    why: "walking is contact-rich and hand-code-resistant, learned in sim.",
  },
  arms: {
    label: "arms / hands",
    method: "VLA manipulation",
    chapter: "Ch 9",
    color: R.plan,
    why: "the hands need to understand the instruction and the scene.",
  },
  torso: {
    label: "torso / whole-body",
    method: "balance control (ZMP)",
    chapter: "Ch 4",
    color: R.signal,
    why: "keep the CoM over the support polygon; lean and watch it move.",
  },
  head: {
    label: "head / eyes",
    method: "perception + VLM",
    chapter: "Ch 8",
    color: R.world,
    why: "read the world; state estimation (Ch 5) pins the floating body.",
  },
};

export function RbBodyPartChapters() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-35, 16);
  const [sel, setSel] = useState<BodyRegion>("all");
  const [lean, setLean] = useState(8);
  const [reach, setReach] = useState(20);
  const [stance, setStance] = useState(0.16);
  const [disp, setDisp] = useState({ lean: 8, reach: 20 });

  useRafLoop(
    (dt) =>
      setDisp((s) => ({
        lean: approach(s.lean, lean, 0.15, dt),
        reach: approach(s.reach, reach, 0.15, dt),
      })),
    { playing: inView && !reduced },
  );
  const L = rad(reduced ? lean : disp.lean);
  const RCH = rad(reduced ? reach : disp.reach);

  // --- skeleton (a stick humanoid; torso and head pitch forward by `lean`,
  // arms swing forward by `reach`, feet stay planted at ±stance) ------------
  const pelvis: V3 = [0, 0, 0.92];
  const hipL: V3 = [0, 0.13, 0.9];
  const hipR: V3 = [0, -0.13, 0.9];
  const ankleL: V3 = [0.02, stance, 0.06];
  const ankleR: V3 = [0.02, -stance, 0.06];
  const kneeL = v3.add(v3.lerp(hipL, ankleL, 0.55), [0.07, 0, 0]);
  const kneeR = v3.add(v3.lerp(hipR, ankleR, 0.55), [0.07, 0, 0]);
  const chest = v3.add(pelvis, rotY([0, 0, 0.44], L));
  const headC = v3.add(pelvis, rotY([0, 0, 0.62], L));
  const shBase = v3.add(pelvis, rotY([0, 0, 0.42], L));
  const shL = v3.add(shBase, [0, 0.21, 0]);
  const shR = v3.add(shBase, [0, -0.21, 0]);
  const armDir = rotY([Math.sin(RCH), 0, -Math.cos(RCH)], L);
  const elbL = v3.add(shL, v3.scale(armDir, 0.24));
  const elbR = v3.add(shR, v3.scale(armDir, 0.24));
  const handL = v3.add(elbL, v3.scale(armDir, 0.24));
  const handR = v3.add(elbR, v3.scale(armDir, 0.24));

  // --- mass-weighted center of mass (rough human segment fractions) --------
  const parts: { m: number; p: V3 }[] = [
    { m: 0.08, p: headC },
    { m: 0.48, p: v3.add(pelvis, rotY([0, 0, 0.26], L)) },
    { m: 0.05, p: elbL },
    { m: 0.05, p: elbR },
    { m: 0.17, p: v3.lerp(hipL, ankleL, 0.45) },
    { m: 0.17, p: v3.lerp(hipR, ankleR, 0.45) },
  ];
  const mTot = parts.reduce((s, q) => s + q.m, 0);
  const com: V3 = [
    parts.reduce((s, q) => s + q.m * q.p[0], 0) / mTot,
    parts.reduce((s, q) => s + q.m * q.p[1], 0) / mTot,
    parts.reduce((s, q) => s + q.m * q.p[2], 0) / mTot,
  ];

  // --- support polygon: convex hull of both feet, then point-in-polygon ----
  const footCorners = (fy: number): [number, number][] => [
    [-0.08, fy - 0.055],
    [0.19, fy - 0.055],
    [0.19, fy + 0.055],
    [-0.08, fy + 0.055],
  ];
  const hull = hull2([...footCorners(stance), ...footCorners(-stance)]);
  const { inside: stable, margin } = hullMargin(hull, [com[0], com[1]]);
  const verdict = stable ? R.goal : R.error;

  const glow = (r: Exclude<BodyRegion, "all">) => (sel === "all" ? 0.95 : sel === r ? 1 : 0.2);
  const cl = (r: Exclude<BodyRegion, "all">) => REGION_INFO[r].color;

  const prims: Prim3D[] = [
    ...grid3(0.9, 0.3),
    // support polygon (the stability region) and the two feet
    {
      kind: "poly",
      pts: hull.map(([x, y]): V3 => [x, y, 0.004]),
      fill: stable ? R.fillGreen : R.fillRed,
      opacity: 0.5,
      stroke: verdict,
    },
    {
      kind: "poly",
      pts: footCorners(stance).map(([x, y]): V3 => [x, y, 0.012]),
      fill: "#e3e3df",
      opacity: 0.9,
      stroke: cl("legs"),
    },
    {
      kind: "poly",
      pts: footCorners(-stance).map(([x, y]): V3 => [x, y, 0.012]),
      fill: "#e3e3df",
      opacity: 0.9,
      stroke: cl("legs"),
    },
    // legs (Ch 7)
    seg3(hipL, kneeL, cl("legs"), { width: 5, opacity: glow("legs") }),
    seg3(kneeL, ankleL, cl("legs"), { width: 5, opacity: glow("legs") }),
    seg3(hipR, kneeR, cl("legs"), { width: 5, opacity: glow("legs") }),
    seg3(kneeR, ankleR, cl("legs"), { width: 5, opacity: glow("legs") }),
    // torso / whole-body (Ch 4)
    seg3(hipL, hipR, cl("torso"), { width: 5, opacity: glow("torso") }),
    seg3(pelvis, chest, cl("torso"), { width: 7, opacity: glow("torso") }),
    seg3(shL, shR, cl("torso"), { width: 4, opacity: glow("torso") }),
    // arms (Ch 9)
    seg3(shL, elbL, cl("arms"), { width: 4, opacity: glow("arms") }),
    seg3(elbL, handL, cl("arms"), { width: 4, opacity: glow("arms") }),
    seg3(shR, elbR, cl("arms"), { width: 4, opacity: glow("arms") }),
    seg3(elbR, handR, cl("arms"), { width: 4, opacity: glow("arms") }),
    dot3(handL, cl("arms"), { r: 4.5 }),
    dot3(handR, cl("arms"), { r: 4.5 }),
    // head (Ch 8)
    seg3(chest, headC, cl("head"), { width: 3, opacity: glow("head") }),
    ...ring3(headC, [0, 1, 0], 0.09, cl("head"), { width: 2, opacity: glow("head") }),
    dot3(headC, cl("head"), { r: 3.5 }),
    // center of mass + its ground projection (the quasi-static ZMP)
    dot3(com, R.ink, { r: 5 }),
    label3(com, "CoM", R.ink, { dx: 10, dy: -6, size: 12 }),
    seg3(com, [com[0], com[1], 0.01], R.ink, { width: 1.5, dash: "3 4", opacity: 0.8 }),
    dot3([com[0], com[1], 0.01], verdict, { r: 5.5 }),
  ];

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 5,
    zoom: 150,
    cx: 240,
    target: [0, 0, 0.65],
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.3 · Which chapter runs which body part?"
      ariaLabel={`A 3D humanoid with body regions mapped to chapters; ${sel === "all" ? "all regions shown" : sel + " selected"}; the robot is ${stable ? "balanced" : "tipping"}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Tabs
            options={[
              { id: "legs", label: "Legs" },
              { id: "arms", label: "Arms" },
              { id: "torso", label: "Torso" },
              { id: "head", label: "Head" },
              { id: "all", label: "Show all" },
            ]}
            value={sel}
            onChange={setSel}
          />
          <Slider label="lean" min={-25} max={45} value={lean} onChange={setLean} fmt={(v) => `${v}°`} />
          <Slider label="reach" min={0} max={90} value={reach} onChange={setReach} fmt={(v) => `${v}°`} />
          <Slider
            label="stance"
            min={0.1}
            max={0.3}
            step={0.01}
            value={stance}
            onChange={setStance}
            fmt={(v) => `${Math.round(v * 100)} cm`}
          />
          <Btn
            onClick={() => {
              setLean(8);
              setReach(20);
              setStance(0.16);
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
          { label: "balance", value: stable ? "stable ✓" : "tipping ✗", color: verdict },
          { label: "margin", value: `${(margin * 100).toFixed(1)} cm`, color: verdict },
          { label: "CoM fwd", value: `${(com[0] * 100).toFixed(1)} cm`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "legs · RL (Ch 7)" },
          { color: R.plan, label: "arms · VLA (Ch 9)" },
          { color: R.signal, label: "torso · ZMP (Ch 4)" },
          { color: R.world, label: "head · VLM (Ch 8)" },
        ]}
      />
      {/* callout panel, fixed right lane under the legend */}
      {sel === "all" ? (
        <>
          <text x={520} y={150} fontFamily={MONO} fontSize={13.5} fontWeight={600} fill={R.ink}>
            the factored humanoid
          </text>
          {wrapText(
            "one body, four tools: pick a tab to inspect a region, or lean until the CoM leaves the feet.",
            27,
          ).map((ln, i) => (
            <text key={i} x={520} y={172 + i * 18} fontFamily={MONO} fontSize={12} fill={R.world}>
              {ln}
            </text>
          ))}
        </>
      ) : (
        <>
          <text x={520} y={150} fontFamily={MONO} fontSize={13.5} fontWeight={600} fill={REGION_INFO[sel].color}>
            {REGION_INFO[sel].label}
          </text>
          <text x={520} y={172} fontFamily={MONO} fontSize={12.5} fill={R.ink}>
            {REGION_INFO[sel].method}
          </text>
          <text x={520} y={192} fontFamily={MONO} fontSize={12.5} fill={R.world}>
            {REGION_INFO[sel].chapter}
          </text>
          {wrapText(REGION_INFO[sel].why, 27).map((ln, i) => (
            <text key={i} x={520} y={218 + i * 18} fontFamily={MONO} fontSize={12} fill={R.world}>
              {ln}
            </text>
          ))}
        </>
      )}
      <text
        x={360}
        y={424}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12.5}
        fill={stable ? R.world : R.error}
        fontWeight={stable ? 400 : 600}
      >
        {stable
          ? "quasi-static balance: the CoM ground projection (≈ ZMP) stays inside the support polygon"
          : "CoM projects outside the support polygon — the robot tips"}
      </text>
    </Stage>
  );
}

// Simple word-wrap for callout prose (returns lines of <= maxChars).
function wrapText(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ===========================================================================
// Fig 12.4 · The pub/sub graph of a real robot  (animated pipeline, 2D)
// A ROS 2 node graph; a data token flows camera -> perception -> planner ->
// controller -> gripper. Toggle sense/plan/act coloring; kill a node to show
// only its subscribers go dark. TF node quietly pulses publishing transforms.
// ===========================================================================

type GNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  beat: "sense" | "plan" | "act" | "tf";
};
const GNODES: GNode[] = [
  { id: "cam", x: 100, y: 130, label: "camera", beat: "sense" },
  { id: "perc", x: 270, y: 130, label: "perception", beat: "sense" },
  { id: "plan", x: 440, y: 130, label: "planner / VLA", beat: "plan" },
  { id: "ctrl", x: 610, y: 230, label: "controller", beat: "act" },
  { id: "grip", x: 440, y: 330, label: "gripper", beat: "act" },
  { id: "tf", x: 190, y: 310, label: "TF", beat: "tf" },
];
// edges = the token path in order, with topic labels
const GEDGES: { from: string; to: string; topic: string; path: boolean }[] = [
  { from: "cam", to: "perc", topic: "/camera/image", path: true },
  { from: "perc", to: "plan", topic: "/objects", path: true },
  { from: "plan", to: "ctrl", topic: "/goal_pose", path: true },
  { from: "ctrl", to: "grip", topic: "/joint_cmd", path: true },
  { from: "tf", to: "plan", topic: "/tf", path: false },
];
const BEAT_COLOR = {
  sense: R.signal,
  plan: R.plan,
  act: R.goal,
  tf: R.world,
} as const;
const NW = 68;
const NH = 26;

export function RbPubSubGraph() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [speed, setSpeed] = useState(0.7);
  const [phaseColor, setPhaseColor] = useState(false);
  const [killed, setKilled] = useState<string | null>(null);
  const [st, setSt] = useState({ phase: 0, tf: 0 });

  const pathEdges = GEDGES.filter((e) => e.path);

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let p = s.phase + dt * speed;
        if (p >= pathEdges.length) p -= pathEdges.length;
        let tf = s.tf + dt * 1.8;
        if (tf > Math.PI * 2) tf -= Math.PI * 2;
        return { phase: p, tf };
      });
    },
    { playing: playing && inView && !reduced },
  );

  const node = (id: string) => GNODES.find((n) => n.id === id)!;
  // trim edges to the node borders so arrowheads (and the token) stay visible
  const trimEdge = (a: GNode, b: GNode) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const dEdge = 1 / Math.max(Math.abs(ux) / NW, Math.abs(uy) / NH);
    return {
      x1: a.x + ux * (dEdge + 4),
      y1: a.y + uy * (dEdge + 4),
      x2: b.x - ux * (dEdge + 8),
      y2: b.y - uy * (dEdge + 8),
    };
  };

  // which nodes are starved: any node downstream of the killed one on the path
  const starved = new Set<string>();
  if (killed) {
    starved.add(killed);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of pathEdges) {
        if (starved.has(e.from) && !starved.has(e.to)) {
          starved.add(e.to);
          changed = true;
        }
      }
    }
  }

  const seg = Math.floor(st.phase) % pathEdges.length;
  const f = smooth(st.phase - Math.floor(st.phase));
  const e = pathEdges[seg];
  const a = node(e.from);
  const b = node(e.to);
  const t = trimEdge(a, b);
  const tokenX = reduced ? t.x1 : lerp(t.x1, t.x2, f);
  const tokenY = reduced ? t.y1 : lerp(t.y1, t.y2, f);
  const tokenAlive = !killed || (!starved.has(e.from) && !starved.has(e.to));
  const tfPulse = reduced ? 0.5 : (Math.sin(st.tf) + 1) / 2;

  const nodeColor = (n: GNode) => {
    if (starved.has(n.id)) return R.error;
    if (phaseColor) return BEAT_COLOR[n.beat];
    return n.beat === "tf" ? R.world : R.ink;
  };
  const nodeFill = (n: GNode) => {
    if (starved.has(n.id)) return R.fillRed;
    if (!phaseColor) return "#eeeeec";
    return n.beat === "sense"
      ? R.fillBlue
      : n.beat === "plan"
        ? R.fillAmber
        : n.beat === "act"
          ? R.fillGreen
          : "#eeeeec";
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.4 · The pub/sub graph of a real robot"
      ariaLabel="A ROS 2 node graph with a data token flowing through the sense-plan-act loop"
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onReset={() => {
              setSt({ phase: 0, tf: 0 });
              setKilled(null);
            }}
          />
          <Slider
            label="speed"
            min={0.25}
            max={2}
            step={0.05}
            value={speed}
            onChange={setSpeed}
            fmt={(v) => `${v.toFixed(2)}×`}
          />
          <Btn onClick={() => setPhaseColor((v) => !v)} active={phaseColor}>
            {phaseColor ? "✓ sense/plan/act" : "highlight phases"}
          </Btn>
          <Btn
            onClick={() => setKilled((k) => (k === "perc" ? null : "perc"))}
            active={killed === "perc"}
            title="drop the perception node"
          >
            {killed ? "revive node" : "kill a node"}
          </Btn>
        </>
      }
    >
      {/* edges, trimmed to node borders */}
      {GEDGES.map((ed, i) => {
        const na = node(ed.from);
        const nb = node(ed.to);
        const tr = trimEdge(na, nb);
        const dead = killed != null && (starved.has(ed.from) || starved.has(ed.to));
        const col = dead ? R.error : ed.path ? R.world : R.line;
        return (
          <g key={i} opacity={dead ? 0.55 : 0.9}>
            {svgArrow(tr.x1, tr.y1, tr.x2, tr.y2, col, 2.5, 9)}
            <text
              x={(na.x + nb.x) / 2}
              y={(na.y + nb.y) / 2 - 10}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={12}
              fill={dead ? R.error : R.world}
            >
              {ed.topic}
            </text>
          </g>
        );
      })}

      {/* nodes */}
      {GNODES.map((n) => {
        const near = !reduced && Math.hypot(n.x - tokenX, n.y - tokenY) < 40 && tokenAlive;
        const isTf = n.beat === "tf";
        return (
          <g key={n.id}>
            <rect
              x={n.x - NW}
              y={n.y - NH}
              width={NW * 2}
              height={NH * 2}
              rx={9}
              fill={nodeFill(n)}
              stroke={nodeColor(n)}
              strokeWidth={near || (isTf && tfPulse > 0.6) ? 4 : 2}
              opacity={isTf ? 0.55 + 0.4 * tfPulse : 1}
            />
            <text
              x={n.x}
              y={n.y + 5}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={13}
              fontWeight={600}
              fill={starved.has(n.id) ? R.error : R.ink}
            >
              {n.label}
            </text>
          </g>
        );
      })}

      {/* the data token */}
      {!reduced && tokenAlive && (
        <g>
          <circle cx={tokenX} cy={tokenY} r={11} fill={BEAT_COLOR[b.beat]} opacity={0.25} />
          <circle cx={tokenX} cy={tokenY} r={6} fill={BEAT_COLOR[b.beat]} />
        </g>
      )}

      <Readout
        rows={[
          { label: "in flight", value: e.topic, color: tokenAlive ? R.ink : R.error },
          { label: "hop", value: `${seg + 1} / ${pathEdges.length}`, color: R.ink },
          {
            label: "graph",
            value: killed ? "degraded" : "nominal",
            color: killed ? R.error : R.goal,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "sense nodes" },
          { color: R.plan, label: "plan nodes" },
          { color: R.goal, label: "act nodes" },
          { color: R.world, label: "TF (transforms)" },
        ]}
      />
      <text
        x={360}
        y={424}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12.5}
        fill={killed ? R.error : R.world}
        fontWeight={killed ? 600 : 400}
      >
        {reduced
          ? "Reduced motion: graph shown static; kill / phase toggles still work."
          : killed
            ? "perception killed: only its subscribers go dark; camera and TF keep publishing"
            : "one token traces sense → plan → act; nodes agree on topics, not on each other"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 12.5 · The generalization gap: seen vs unseen  (slider-driven diagram)
// Each bell is the *sampling distribution* of a measured success rate over n
// trials: standard error sqrt(p(1-p)/n), 95% band = ±1.96·se. Fewer trials
// fatten the bells; more novelty drags the unseen mean down. The verdict is
// a real two-proportion significance test on the gap.
// ===========================================================================

export function RbGeneralizationGap() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [trials, setTrials] = useState(50);
  const [novelty, setNovelty] = useState(50);
  const [showCI, setShowCI] = useState(true);
  const [disp, setDisp] = useState({ seen: 0.88, unseen: 0.57, bs: 0.09, bu: 0.14 });

  // targets: binomial standard errors, the honest statistics of n trials
  const seenMean = 0.88;
  const unseenMean = clamp(0.88 - (novelty / 100) * 0.62, 0.15, 0.88);
  const seS = Math.sqrt((seenMean * (1 - seenMean)) / trials);
  const seU = Math.sqrt((unseenMean * (1 - unseenMean)) / trials);
  const bandS = 1.96 * seS;
  const bandU = 1.96 * seU;

  useRafLoop(
    (dt) => {
      setDisp((s) => ({
        seen: approach(s.seen, seenMean, 0.16, dt),
        unseen: approach(s.unseen, unseenMean, 0.16, dt),
        bs: approach(s.bs, bandS, 0.16, dt),
        bu: approach(s.bu, bandU, 0.16, dt),
      }));
    },
    { playing: inView && !reduced },
  );

  const sMean = reduced ? seenMean : disp.seen;
  const uMean = reduced ? unseenMean : disp.unseen;
  const bS = reduced ? bandS : disp.bs;
  const bU = reduced ? bandU : disp.bu;

  // plot area
  const X0 = 90;
  const X1 = 640;
  const Y0 = 112;
  const Y1 = 330;
  const rateToX = (r: number) => X0 + r * (X1 - X0);

  // sampling-distribution bell for a measured rate: sigma = se
  const curve = (mean: number, sigma: number, color: string, fill: string) => {
    const N = 60;
    const s = Math.max(sigma, 0.012);
    let p = `M ${X0} ${Y1} `;
    for (let i = 0; i <= N; i++) {
      const r = i / N;
      const g = Math.exp(-0.5 * ((r - mean) / s) ** 2);
      const x = rateToX(r);
      const y = Y1 - g * (Y1 - Y0) * 0.82;
      p += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    p += `L ${X1} ${Y1} Z`;
    return <path d={p} fill={fill} opacity={0.55} stroke={color} strokeWidth={2.5} />;
  };

  // two-proportion z-test on the gap (the real "is this meaningful" check)
  const sig = Math.abs(seenMean - unseenMean) > 1.96 * Math.hypot(seS, seU);
  const gapNoisy = !sig;
  const gapPct = Math.round((sMean - uMean) * 100);

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.5 · The generalization gap: seen vs unseen"
      ariaLabel={`Success-rate sampling distributions for seen and unseen conditions; gap ${gapPct} points, ${gapNoisy ? "inside the noise band" : "statistically clear"}`}
      controls={
        <>
          <Slider label="trials" min={5} max={400} step={5} value={trials} onChange={setTrials} fmt={(v) => `${v}`} />
          <Slider label="novelty" min={0} max={100} value={novelty} onChange={setNovelty} fmt={(v) => `${v}%`} />
          <Btn onClick={() => setShowCI((v) => !v)} active={showCI}>
            {showCI ? "✓ 95% bands" : "show 95% bands"}
          </Btn>
          <Btn
            onClick={() => {
              setTrials(50);
              setNovelty(50);
            }}
          >
            ↺ reset
          </Btn>
        </>
      }
    >
      {/* axes */}
      <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={R.line} strokeWidth={2} />
      {[0, 0.25, 0.5, 0.75, 1].map((r) => (
        <g key={r}>
          <line x1={rateToX(r)} y1={Y1} x2={rateToX(r)} y2={Y1 + 6} stroke={R.line} strokeWidth={1.5} />
          <text x={rateToX(r)} y={Y1 + 22} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
            {Math.round(r * 100)}%
          </text>
        </g>
      ))}
      <text x={(X0 + X1) / 2} y={Y1 + 44} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        measured success rate →
      </text>

      {/* sampling distributions */}
      {curve(uMean, bU / 1.96, R.plan, R.fillAmber)}
      {curve(sMean, bS / 1.96, R.goal, R.fillGreen)}

      {/* 95% confidence bands at each mean */}
      {showCI && (
        <>
          <rect
            x={rateToX(clamp(sMean - bS, 0, 1))}
            y={Y0 - 6}
            width={rateToX(clamp(sMean + bS, 0, 1)) - rateToX(clamp(sMean - bS, 0, 1))}
            height={Y1 - Y0 + 6}
            fill={R.goal}
            opacity={0.12}
          />
          <rect
            x={rateToX(clamp(uMean - bU, 0, 1))}
            y={Y0 - 6}
            width={rateToX(clamp(uMean + bU, 0, 1)) - rateToX(clamp(uMean - bU, 0, 1))}
            height={Y1 - Y0 + 6}
            fill={R.plan}
            opacity={0.12}
          />
        </>
      )}

      {/* mean lines */}
      <line x1={rateToX(sMean)} y1={Y0 - 6} x2={rateToX(sMean)} y2={Y1} stroke={R.goal} strokeWidth={2} strokeDasharray="5 5" />
      <line x1={rateToX(uMean)} y1={Y0 - 6} x2={rateToX(uMean)} y2={Y1} stroke={R.plan} strokeWidth={2} strokeDasharray="5 5" />

      {/* the gap bracket */}
      <line
        x1={rateToX(uMean)}
        y1={Y0 - 12}
        x2={rateToX(sMean)}
        y2={Y0 - 12}
        stroke={R.error}
        strokeWidth={2}
        strokeDasharray={gapNoisy ? "3 4" : undefined}
      />
      <text
        x={(rateToX(uMean) + rateToX(sMean)) / 2}
        y={Y0 - 20}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13}
        fontWeight={600}
        fill={R.error}
      >
        gap {gapPct} pp
      </text>

      <Readout
        rows={[
          { label: "seen", value: `${Math.round(sMean * 100)}% ± ${Math.round(bS * 100)}`, color: R.goal },
          { label: "unseen", value: `${Math.round(uMean * 100)}% ± ${Math.round(bU * 100)}`, color: R.plan },
          { label: "gap", value: `${gapPct} pp`, color: R.error },
          { label: "verdict", value: sig ? "clear" : "noise", color: sig ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "seen (flattering)" },
          { color: R.plan, label: "unseen (honest)" },
          { color: R.error, label: "the gap", dash: true },
        ]}
      />
      <text
        x={360}
        y={424}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12.5}
        fill={gapNoisy ? R.error : R.world}
        fontWeight={gapNoisy ? 600 : 400}
      >
        {reduced
          ? "Reduced motion: distributions shown static; sliders still recompute the gap."
          : gapNoisy
            ? "too few trials: the 95% intervals overlap and the gap dissolves into noise"
            : "each bell = the spread of a measured rate over n trials; a big seen/unseen gap means it memorized"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 12.6 · Stiff vs compliant: what happens when a human is in the way
// (toggle-compare, 2D)
// The same arm runs into a hand two ways. Stiff drives through and spikes the
// force past the limit (red). Compliant senses the resistance and halts at its
// force cap (green). A force gauge tracks the contact force live.
// ===========================================================================

type ArmMode = "stiff" | "compliant";

export function RbStiffVsCompliant() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [mode, setMode] = useState<ArmMode>("stiff");
  const [running, setRunning] = useState(false);
  const [forceLimit, setForceLimit] = useState(0.45); // 0..1 of gauge
  const [st, setSt] = useState({ reach: 0, force: 0 }); // reach 0..1, force 0..1

  const HAND_X = 470; // where the human hand sits
  const START_X = 150;
  const TARGET_X = 600;
  const armX = (reach: number) => lerp(START_X, TARGET_X, reach);
  const contactReach = (HAND_X - START_X) / (TARGET_X - START_X);

  useRafLoop(
    (dt) => {
      setSt((s) => {
        if (!running) return s;
        let reach = s.reach;
        let force = s.force;
        const hitContact = reach >= contactReach - 0.001;
        if (!hitContact) {
          reach = Math.min(contactReach, reach + dt * 0.5);
          force = approach(force, 0, 0.2, dt);
        } else if (mode === "stiff") {
          // keeps driving; force spikes past the limit
          reach = Math.min(1, reach + dt * 0.18);
          force = approach(force, 0.95, 0.08, dt);
        } else {
          // compliant: halts at contact, force settles at the cap
          reach = contactReach;
          force = approach(force, forceLimit, 0.12, dt);
        }
        return { reach, force };
      });
    },
    { playing: inView && !reduced && running },
  );

  const reach = reduced ? (mode === "stiff" ? 0.78 : contactReach) : st.reach;
  const force = reduced ? (mode === "stiff" ? 0.95 : forceLimit) : st.force;
  const ax = armX(reach);
  const danger = force > forceLimit + 0.02;
  const armCol = danger ? R.error : R.signal;

  const run = () => {
    setSt({ reach: 0, force: 0 });
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setSt({ reach: 0, force: 0 });
  };

  // gauge geometry (top-left readout lane, under the numeric rows)
  const GX = 24;
  const GY = 96;
  const GW = 240;
  const limitX = GX + forceLimit * GW;

  return (
    <Stage
      innerRef={ref}
      title="Fig 12.6 · Stiff vs compliant when a human is in the way"
      ariaLabel={`A ${mode} arm running into a human hand; contact force ${Math.round(force * 100)} percent, ${danger ? "in the danger zone" : "under the safe limit"}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "stiff", label: "Stiff" },
              { id: "compliant", label: "Compliant" },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              reset();
            }}
          />
          {mode === "compliant" && (
            <Slider
              label="force limit"
              min={0.15}
              max={0.7}
              step={0.01}
              value={forceLimit}
              onChange={setForceLimit}
              fmt={(v) => `${Math.round(v * 100)}%`}
            />
          )}
          <Btn onClick={run}>▶ run into obstacle</Btn>
          <Btn onClick={reset}>↺ reset</Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "mode", value: mode, color: R.ink },
          { label: "contact force", value: `${Math.round(force * 100)}%`, color: danger ? R.error : R.goal },
          { label: "force limit", value: `${Math.round(forceLimit * 100)}%`, color: R.ink },
        ]}
      />
      {/* force gauge under the readout */}
      <rect x={GX} y={GY} width={GW} height={16} rx={8} fill="#e7e7e4" />
      <rect x={limitX} y={GY} width={GX + GW - limitX} height={16} fill={R.fillRed} opacity={0.6} />
      <rect x={GX} y={GY} width={GW * force} height={16} rx={8} fill={danger ? R.error : R.goal} />
      <line x1={limitX} y1={GY - 5} x2={limitX} y2={GY + 21} stroke={R.ink} strokeWidth={2} />
      <text x={limitX} y={GY + 36} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
        limit
      </text>

      {/* ground / bench */}
      <line x1={100} y1={330} x2={660} y2={330} stroke={R.line} strokeWidth={2} />

      {/* target marker (command) */}
      <line x1={TARGET_X} y1={160} x2={TARGET_X} y2={330} stroke={R.plan} strokeWidth={1.5} strokeDasharray="5 6" />
      <text x={TARGET_X} y={152} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
        target
      </text>

      {/* robot base + arm (a horizontal link driving right) */}
      <rect x={START_X - 40} y={230} width={40} height={70} rx={6} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <line x1={START_X} y1={265} x2={ax} y2={265} stroke={armCol} strokeWidth={12} strokeLinecap="round" />
      <circle cx={ax} cy={265} r={12} fill={armCol} />

      {/* the human hand obstacle */}
      <g>
        <rect x={HAND_X} y={244} width={44} height={42} rx={10} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={HAND_X + 4 + i * 10} y={224} width={7} height={24} rx={3} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
        ))}
        <text x={HAND_X + 22} y={306} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
          human
        </text>
      </g>

      {/* contact flash */}
      {reach >= contactReach - 0.005 && (
        <circle cx={HAND_X} cy={265} r={danger ? 16 : 12} fill="none" stroke={danger ? R.error : R.goal} strokeWidth={3} opacity={0.8} />
      )}

      <Legend
        items={[
          { color: R.signal, label: "arm (safe)" },
          { color: R.error, label: "over the limit" },
          { color: R.plan, label: "commanded target", dash: true },
          { color: R.world, label: "human hand" },
        ]}
      />
      <text
        x={360}
        y={424}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12.5}
        fill={danger ? R.error : mode === "compliant" ? R.goal : R.world}
        fontWeight={danger ? 600 : 400}
      >
        {reduced
          ? "Reduced motion: final state shown per tab; the force limit slider still applies."
          : mode === "stiff"
            ? danger
              ? "STIFF: drives through the hand; force spikes past the limit into the danger zone"
              : "stiff, position-controlled: it will not yield — press run"
            : force >= forceLimit - 0.03 && reach >= contactReach - 0.005
              ? "COMPLIANT: senses the resistance and halts safely under its force cap ✓"
              : "compliant, force-limited: it yields on contact — press run"}
      </text>
    </Stage>
  );
}
