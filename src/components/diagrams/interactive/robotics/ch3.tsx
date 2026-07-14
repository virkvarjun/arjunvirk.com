"use client";

import { useReducer, useRef, useState } from "react";
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
  box3,
  Scene3D,
  useOrbit,
  groundDrag,
  project,
  Legend,
  Readout,
} from "./shared";

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
// Ease an angle (degrees) toward a target along the shortest arc.
const approachAngle = (cur: number, target: number, rate: number, dt: number) => {
  const d = ((target - cur + 540) % 360) - 180;
  const k = 1 - Math.pow(1 - rate, dt * 60);
  return cur + k * d;
};

// ===========================================================================
// The chapter's 3-DoF arm, shared by Figs 3.1 / 3.4 / 3.5: a yaw joint at the
// base (about world z), then shoulder and elbow pitching about the yawed
// horizontal axis. FK is real quaternion composition — the same chain of
// rotations the prose multiplies as homogeneous transforms.
// ===========================================================================

const SHOULDER: V3 = [0, 0, 0.45]; // shoulder sits atop a short mast
const A1 = 0.9; // upper-arm length (world units)
const A2 = 0.7; // forearm length

function armFK(yawRad: number, shRad: number, elRad: number) {
  const q1 = quat.fromAxisAngle([0, 0, 1], yawRad);
  const q2 = quat.mul(q1, quat.fromAxisAngle([0, 1, 0], -shRad));
  const q3 = quat.mul(q2, quat.fromAxisAngle([0, 1, 0], -elRad));
  const E = v3.add(SHOULDER, v3.scale(quat.rotate(q2, [1, 0, 0]), A1));
  const H = v3.add(E, v3.scale(quat.rotate(q3, [1, 0, 0]), A2));
  return { q1, q2, q3, E, H };
}

// The arm's body as scene primitives (mast + two links + joints + hand).
function armBody(fk: ReturnType<typeof armFK>, color: string, opacity = 1): Prim3D[] {
  const hub = opacity < 1 ? color : R.ink;
  return [
    seg3([0, 0, 0], SHOULDER, hub, { width: 5, opacity }),
    seg3(SHOULDER, fk.E, color, { width: 7, opacity }),
    seg3(fk.E, fk.H, color, { width: 7, opacity }),
    dot3(SHOULDER, hub, { r: 5 }),
    dot3(fk.E, hub, { r: 4.5 }),
    dot3(fk.H, color, { r: 6 }),
  ];
}

// Analytic 2-link IK in the arm's vertical plane: reach the in-plane point
// (rr, zz) measured from the shoulder. Returns both elbow branches; when the
// point is out of reach the distance is clamped so a (stretched) pose still
// exists to draw.
function ik2(rr: number, zz: number) {
  const d = Math.hypot(rr, zz);
  const dc = clamp(d, Math.abs(A1 - A2) + 1e-4, A1 + A2 - 1e-4);
  const c2 = clamp((dc * dc - A1 * A1 - A2 * A2) / (2 * A1 * A2), -1, 1);
  const el = Math.acos(c2);
  const ang = Math.atan2(zz, rr);
  const off = Math.atan2(A2 * Math.sin(el), A1 + A2 * Math.cos(el));
  return {
    reachable: d <= A1 + A2 + 1e-9,
    down: { sh: deg(ang - off), el: deg(el) }, // elbow below the chord
    up: { sh: deg(ang + off), el: -deg(el) }, // elbow above the chord
  };
}

// Geometric Jacobian columns of the 3-DoF arm at the current pose: for a
// revolute joint, column i = axis_i × (hand − joint_origin). Verified against
// finite differences of armFK.
function armJacobian(fk: ReturnType<typeof armFK>): [V3, V3, V3] {
  const yAx = quat.rotate(fk.q1, [0, 1, 0]);
  const c1 = v3.cross([0, 0, 1], fk.H); // yaw about world z through the base
  const c2 = v3.scale(v3.cross(yAx, v3.sub(fk.H, SHOULDER)), -1); // pitch about −y
  const c3 = v3.scale(v3.cross(yAx, v3.sub(fk.H, fk.E)), -1);
  return [c1, c2, c3];
}

// Jacobi eigensolver for a symmetric 3×3 matrix. Deterministic; returns
// eigenpairs sorted descending. Used for the manipulability ellipsoid J·Jᵀ.
function eig3(M: number[][]) {
  let a = M.map((r) => r.slice());
  const V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let iter = 0; iter < 40; iter++) {
    let p = 0;
    let q = 1;
    if (Math.abs(a[0][2]) > Math.abs(a[p][q])) {
      p = 0;
      q = 2;
    }
    if (Math.abs(a[1][2]) > Math.abs(a[p][q])) {
      p = 1;
      q = 2;
    }
    if (Math.abs(a[p][q]) < 1e-13) break;
    const th = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(th);
    const s = Math.sin(th);
    const na = a.map((r) => r.slice());
    for (let k = 0; k < 3; k++) {
      na[p][k] = c * a[p][k] - s * a[q][k];
      na[q][k] = s * a[p][k] + c * a[q][k];
    }
    const nb = na.map((r) => r.slice());
    for (let k = 0; k < 3; k++) {
      nb[k][p] = c * na[k][p] - s * na[k][q];
      nb[k][q] = s * na[k][p] + c * na[k][q];
    }
    a = nb;
    for (let k = 0; k < 3; k++) {
      const vp = V[k][p];
      const vq = V[k][q];
      V[k][p] = c * vp - s * vq;
      V[k][q] = s * vp + c * vq;
    }
  }
  const pairs = [0, 1, 2].map((i) => ({
    val: Math.max(a[i][i], 0),
    vec: [V[0][i], V[1][i], V[2][i]] as V3,
  }));
  pairs.sort((x, y) => y.val - x.val);
  return pairs;
}

const fmtV3 = (p: V3) => `(${p.map((x) => x.toFixed(2)).join(", ")})`;

// ===========================================================================
// Fig 3.1 · Forward kinematics on an articulated arm  (true 3D, orbitable)
// Three joint sliders (base yaw, shoulder, elbow) drive a 3D arm whose FK is
// computed by real quaternion composition, base to tip. A triad rides the
// hand, a faint arc shows the elbow's sweep, and the readout prints the one
// unique hand position the chain produces.
// ===========================================================================

export function RbForwardKinematics() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-32, 24);
  const [t1, setT1] = useState(40); // base yaw, deg
  const [t2, setT2] = useState(55); // shoulder pitch
  const [t3, setT3] = useState(65); // elbow pitch
  const [disp, setDisp] = useState({ a: 40, b: 55, c: 65 });

  useRafLoop(
    (dt) => {
      setDisp((s) => {
        const a = approachAngle(s.a, t1, 0.22, dt);
        const b = approachAngle(s.b, t2, 0.22, dt);
        const c = approachAngle(s.c, t3, 0.22, dt);
        if (Math.abs(a - s.a) + Math.abs(b - s.b) + Math.abs(c - s.c) < 1e-4) return s;
        return { a, b, c };
      });
    },
    { playing: inView && !reduced },
  );

  const a = reduced ? t1 : disp.a;
  const b = reduced ? t2 : disp.b;
  const c = reduced ? t3 : disp.c;
  const fk = armFK(rad(a), rad(b), rad(c));
  const pitchAxis = quat.rotate(fk.q1, [0, 1, 0]);

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 4.6,
    zoom: 112,
    target: [0, 0, 0.55],
  };

  const prims: Prim3D[] = [
    ...grid3(1.2, 0.4),
    // base pedestal + the yaw ring it spins on
    ...box3([0, 0, 0.06], quat.id, 0.34, 0.34, 0.12, R.world),
    ...ring3([0, 0, 0.02], [0, 0, 1], 0.44, R.goal, { n: 40, width: 1.5, dash: "3 4", opacity: 0.8 }),
    // link silhouettes so the arm reads as a body, not a wire
    ...box3(v3.lerp(SHOULDER, fk.E, 0.5), fk.q2, A1, 0.13, 0.13, R.world),
    ...box3(v3.lerp(fk.E, fk.H, 0.5), fk.q3, A2, 0.1, 0.1, R.world),
    ...armBody(fk, R.signal),
    // joint axes (green): yaw about z, shoulder + elbow about the yawed y
    seg3(v3.add(SHOULDER, v3.scale(pitchAxis, -0.24)), v3.add(SHOULDER, v3.scale(pitchAxis, 0.24)), R.goal, {
      width: 2,
      dash: "4 4",
    }),
    seg3(v3.add(fk.E, v3.scale(pitchAxis, -0.2)), v3.add(fk.E, v3.scale(pitchAxis, 0.2)), R.goal, {
      width: 2,
      dash: "4 4",
    }),
    // the elbow's reachable arc at the current shoulder pose (real sweep)
    ...curve3(
      (u) => {
        const el = rad(lerp(-140, 140, u));
        const q = quat.mul(fk.q2, quat.fromAxisAngle([0, 1, 0], -el));
        return v3.add(fk.E, v3.scale(quat.rotate(q, [1, 0, 0]), A2));
      },
      R.signal,
      { n: 40, width: 1.2, opacity: 0.35, dash: "2 4" },
    ),
    // hand frame: its orientation is the accumulated rotation q₁·q₂·q₃
    ...triad3(fk.H, fk.q3, 0.26, null),
    label3(v3.add(fk.H, [0, 0, 0.14]), "hand", R.signal, { dx: 10, dy: -2, size: 12.5 }),
    label3([0, 0, -0.08], "base", R.world, { anchor: "middle", dy: 16, size: 12 }),
  ];

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.1 · Forward kinematics on an articulated arm"
      ariaLabel={`A 3D three-joint arm at yaw ${Math.round(a)}, shoulder ${Math.round(b)}, elbow ${Math.round(c)} degrees; hand at ${fmtV3(fk.H)}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Slider label="θ₁ yaw" min={-180} max={180} value={t1} onChange={setT1} fmt={(v) => `${v}°`} />
          <Slider label="θ₂ shoulder" min={-10} max={100} value={t2} onChange={setT2} fmt={(v) => `${v}°`} />
          <Slider label="θ₃ elbow" min={-140} max={140} value={t3} onChange={setT3} fmt={(v) => `${v}°`} />
          <Btn
            onClick={() => {
              setT1(40);
              setT2(55);
              setT3(65);
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
          { label: "θ₁ θ₂ θ₃", value: `${Math.round(a)}° ${Math.round(b)}° ${Math.round(c)}°` },
          { label: "hand", value: fmtV3(fk.H), color: R.signal },
          { label: "from shoulder", value: v3.len(v3.sub(fk.H, SHOULDER)).toFixed(2) },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "arm" },
          { color: R.goal, label: "joint axes" },
          { color: R.signal, label: "elbow sweep", dash: true },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        three rotations chained base → tip · one set of angles, exactly one hand pose · drag to orbit
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.2 · Building an arm from DH parameters  (true 3D, orbitable)
// A 3-joint arm walked out of a live DH table with the standard convention
// Rz(θ)·Tz(d)·Tx(a)·Rx(α) per row, composed with quaternions. Tabs pick the
// row you edit; four sliders drive it and the arm rebuilds in 3D. Green
// dashed axes mark each joint's rotation axis; α = 90° visibly tips the rest
// of the chain out of the plane.
// ===========================================================================

type DhRow = { a: number; alpha: number; d: number; theta: number };

const DH_DEFAULTS: DhRow[] = [
  { a: 0.5, alpha: 90, d: 0.35, theta: 35 },
  { a: 0.75, alpha: 0, d: 0, theta: 40 },
  { a: 0.55, alpha: 0, d: 0, theta: -35 },
];

type DhFrame = { origin: V3; mid: V3; p: V3; q: Quat; axis: V3 };

// Walk the DH chain: per row rotate θ about the current z, slide d along that
// z, run a along the new x, then twist α about x. Real quaternion composition.
function dhWalk(rows: DhRow[]): DhFrame[] {
  const frames: DhFrame[] = [];
  let p: V3 = [0, 0, 0];
  let q: Quat = quat.id;
  for (const r of rows) {
    const axis = quat.rotate(q, [0, 0, 1]);
    const origin = p;
    const q1 = quat.mul(q, quat.fromAxisAngle([0, 0, 1], rad(r.theta)));
    const mid = v3.add(p, v3.scale(quat.rotate(q1, [0, 0, 1]), r.d));
    const end = v3.add(mid, v3.scale(quat.rotate(q1, [1, 0, 0]), r.a));
    const q2 = quat.mul(q1, quat.fromAxisAngle([1, 0, 0], rad(r.alpha)));
    frames.push({ origin, mid, p: end, q: q2, axis });
    p = end;
    q = q2;
  }
  return frames;
}

export function RbDhParameters() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-38, 22);
  const [rows, setRows] = useState<DhRow[]>(DH_DEFAULTS);
  const [sel, setSel] = useState(0);
  const [disp, setDisp] = useState<DhRow[]>(DH_DEFAULTS);

  useRafLoop(
    (dt) => {
      setDisp((s) => {
        const next = s.map((r, i) => ({
          a: approach(r.a, rows[i].a, 0.2, dt),
          alpha: approachAngle(r.alpha, rows[i].alpha, 0.2, dt),
          d: approach(r.d, rows[i].d, 0.2, dt),
          theta: approachAngle(r.theta, rows[i].theta, 0.2, dt),
        }));
        const delta = next.reduce(
          (acc, nr, i) =>
            acc +
            Math.abs(nr.a - s[i].a) +
            Math.abs(nr.alpha - s[i].alpha) +
            Math.abs(nr.d - s[i].d) +
            Math.abs(nr.theta - s[i].theta),
          0,
        );
        return delta < 1e-4 ? s : next;
      });
    },
    { playing: inView && !reduced },
  );

  const cur = reduced ? rows : disp;
  const set = (patch: Partial<DhRow>) =>
    setRows((rs) => rs.map((r, i) => (i === sel ? { ...r, ...patch } : r)));

  const frames = dhWalk(cur);
  const ee = frames[frames.length - 1].p;

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 4.8,
    zoom: 100,
    cx: 240,
    target: [0, 0, 0.4],
  };

  const prims: Prim3D[] = [
    ...grid3(1.2, 0.4),
    ...box3([0, 0, 0.05], quat.id, 0.3, 0.3, 0.1, R.world),
    ...triad3([0, 0, 0], quat.id, 0.3, ["x₀", "y₀", "z₀"], [R.world, R.world, R.world]),
  ];
  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
    const isSel = i === sel;
    // the d slide (dashed, along the joint axis) then the a run (solid link)
    if (cur[i].d > 0.01) prims.push(seg3(fr.origin, fr.mid, isSel ? R.signal : R.world, { width: 3.5, dash: "4 4" }));
    prims.push(seg3(fr.mid, fr.p, isSel ? R.signal : R.world, { width: isSel ? 8 : 6 }));
    // joint axis: the z this row's θ rotates about
    prims.push(
      seg3(v3.add(fr.origin, v3.scale(fr.axis, -0.28)), v3.add(fr.origin, v3.scale(fr.axis, 0.28)), R.goal, {
        width: 2,
        dash: "5 4",
      }),
    );
    prims.push(...ring3(fr.origin, fr.axis, 0.1, R.goal, { n: 24, width: 1.5 }));
    prims.push(dot3(fr.origin, R.ink, { r: 4.5 }));
    prims.push(label3(fr.origin, `J${i + 1}`, isSel ? R.signal : R.world, { dx: 8, dy: -8, size: 12 }));
    prims.push(...triad3(fr.p, fr.q, 0.16, null));
  }
  prims.push(dot3(ee, R.plan, { r: 6 }));
  prims.push(label3(ee, "tool", R.plan, { dx: 9, dy: -8, size: 12.5 }));

  const rowLabel = ["J1", "J2", "J3"];
  const cols: (keyof DhRow)[] = ["a", "alpha", "d", "theta"];
  const colLabel: Record<keyof DhRow, string> = { a: "a", alpha: "α", d: "d", theta: "θ" };
  const tblX = 468;
  const tblY = 64;
  const cw = 52;
  const rh = 34;

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.2 · Building an arm from DH parameters"
      ariaLabel={`A 3D three-joint arm built live from a DH table; editing joint ${sel + 1}, tool at ${fmtV3(ee)}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Tabs
            options={[
              { id: "0", label: "J1" },
              { id: "1", label: "J2" },
              { id: "2", label: "J3" },
            ]}
            value={String(sel)}
            onChange={(v) => setSel(+v)}
          />
          <Slider label="a" min={0.2} max={0.8} step={0.05} value={rows[sel].a} onChange={(v) => set({ a: v })} fmt={(v) => v.toFixed(2)} />
          <Slider label="α" min={-90} max={90} step={15} value={rows[sel].alpha} onChange={(v) => set({ alpha: v })} fmt={(v) => `${v}°`} />
          <Slider label="d" min={0} max={0.5} step={0.05} value={rows[sel].d} onChange={(v) => set({ d: v })} fmt={(v) => v.toFixed(2)} />
          <Slider label="θ" min={-120} max={120} step={5} value={rows[sel].theta} onChange={(v) => set({ theta: v })} fmt={(v) => `${v}°`} />
          <Btn
            onClick={() => {
              setRows(DH_DEFAULTS);
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
          { label: "editing", value: `J${sel + 1}`, color: R.signal },
          { label: "tool at", value: fmtV3(ee), color: R.plan },
        ]}
      />
      {/* live DH table, fixed right lane (painted over the scene) */}
      <text x={tblX} y={tblY - 12} fontFamily={MONO} fontSize={14} fill={R.world}>
        DH table
      </text>
      {cols.map((cn, ci) => (
        <text key={cn} x={tblX + 36 + ci * cw + cw / 2} y={tblY + 14} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
          {colLabel[cn]}
        </text>
      ))}
      {rows.map((r, ri) => {
        const ry = tblY + 26 + ri * rh;
        const isSel = ri === sel;
        return (
          <g key={ri}>
            {isSel && (
              <rect x={tblX - 6} y={ry - 2} width={36 + cols.length * cw + 10} height={rh - 6} rx={5} fill={R.fillBlue} opacity={0.55} />
            )}
            <text x={tblX} y={ry + 17} fontFamily={MONO} fontSize={13} fill={isSel ? R.signal : R.world} fontWeight={isSel ? 600 : 400}>
              {rowLabel[ri]}
            </text>
            {cols.map((cn, ci) => {
              const val = cn === "alpha" || cn === "theta" ? `${Math.round(r[cn])}°` : r[cn].toFixed(2);
              const free = cn === "theta"; // revolute joints: θ is the free one
              return (
                <text
                  key={cn}
                  x={tblX + 36 + ci * cw + cw / 2}
                  y={ry + 17}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={13}
                  fontWeight={free ? 600 : 400}
                  fill={free ? R.plan : R.ink}
                >
                  {val}
                </text>
              );
            })}
          </g>
        );
      })}
      <text x={tblX} y={tblY + 26 + rows.length * rh + 18} fontFamily={MONO} fontSize={12} fill={R.plan}>
        amber θ = the joint&apos;s one free variable
      </text>
      <text x={tblX} y={tblY + 26 + rows.length * rh + 36} fontFamily={MONO} fontSize={12} fill={R.goal}>
        green = joint axes (each row&apos;s z)
      </text>
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        α = 90° on J1 tips the rest of the chain out of the plane · drag to orbit
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.3 · Reachable vs dexterous workspace  (polished 2D, draggable probe)
// A 2-link arm with a short tool on its wrist. The grey band is everywhere
// the tool tip can get *somehow*; the green band is everywhere it can arrive
// from *every* approach direction. The fan at the probe shows exactly which
// approach angles the arm can deliver — watch it thin out near the edge.
// ===========================================================================

const LH = 0.9; // tool length mounted on the 2-link wrist
const N_FAN = 36;

// For a tool tip at (px, py): which sampled approach directions φ are
// feasible (wrist = tip − LH·u(φ) inside the 2-link annulus)? Also picks the
// feasible φ closest to "pointing outward" for the drawn arm pose.
function toolReach(pxw: number, pyw: number, L1: number, L2: number) {
  const outer2 = L1 + L2;
  const inner2 = Math.abs(L1 - L2);
  const outward = Math.atan2(pyw, pxw);
  const ok: boolean[] = [];
  let best: number | null = null;
  let bestD = Infinity;
  for (let i = 0; i < N_FAN; i++) {
    const phi = (i / N_FAN) * Math.PI * 2;
    const wr = Math.hypot(pxw - LH * Math.cos(phi), pyw - LH * Math.sin(phi));
    const feas = wr <= outer2 + 1e-9 && wr >= inner2 - 1e-9;
    ok.push(feas);
    if (feas) {
      const dd = Math.abs(((phi - outward + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (dd < bestD) {
        bestD = dd;
        best = phi;
      }
    }
  }
  const count = ok.reduce((s, f) => s + (f ? 1 : 0), 0);
  return { ok, count, phi: best };
}

// Elbow-down 2-link IK to a wrist point, distance clamped so a pose exists.
function wristIk(wxw: number, wyw: number, L1: number, L2: number) {
  const d = clamp(Math.hypot(wxw, wyw), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4);
  const c2 = clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  const a2 = Math.acos(c2);
  const a1 = Math.atan2(wyw, wxw) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
  return { a: deg(a1), b: deg(a2) };
}

const circleD = (cx: number, cy: number, r: number) =>
  `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`;

export function RbWorkspace() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [L1, setL1] = useState(3);
  const [L2, setL2] = useState(2);
  const [showReach, setShowReach] = useState(true);
  const [showDex, setShowDex] = useState(true);
  const [probe, setProbe] = useState({ x: 2.6, y: 1.9 }); // world units
  const [drag, setDrag] = useState(false);
  const [disp, setDisp] = useState({ a: 30, b: 55, phi: 30 });

  const outer2 = L1 + L2;
  const inner2 = Math.abs(L1 - L2);
  const reachOut = outer2 + LH;
  const reachIn = Math.max(0, inner2 - LH);
  const dexOut = outer2 - LH;
  const dexIn = inner2 + LH;

  // stage mapping: base center-left, scaled so the outer ring always fits
  const BX = 260;
  const BY = 250;
  const S = 165 / reachOut;
  const px = (x: number) => BX + x * S;
  const py = (y: number) => BY - y * S;

  const fan = toolReach(probe.x, probe.y, L1, L2);
  const status = fan.count === N_FAN ? "dexterous" : fan.count > 0 ? "reachable" : "unreachable";

  const targetPose = () => {
    if (fan.phi == null) {
      // out of reach entirely: stretch (or fold) toward the probe
      const s = wristIk(probe.x, probe.y, L1, L2);
      return { a: s.a, b: s.b, phi: deg(Math.atan2(probe.y, probe.x)) };
    }
    const wxw = probe.x - LH * Math.cos(fan.phi);
    const wyw = probe.y - LH * Math.sin(fan.phi);
    const s = wristIk(wxw, wyw, L1, L2);
    return { a: s.a, b: s.b, phi: deg(fan.phi) };
  };

  useRafLoop(
    (dt) => {
      const tgt = targetPose();
      setDisp((s) => {
        const a = approachAngle(s.a, tgt.a, 0.2, dt);
        const b = approachAngle(s.b, tgt.b, 0.2, dt);
        const phi = approachAngle(s.phi, tgt.phi, 0.2, dt);
        if (Math.abs(a - s.a) + Math.abs(b - s.b) + Math.abs(phi - s.phi) < 1e-4) return s;
        return { a, b, phi };
      });
    },
    { playing: inView && !reduced },
  );

  const cur = reduced ? targetPose() : disp;
  const th1 = rad(cur.a);
  const th12 = rad(cur.a + cur.b);
  const ex = L1 * Math.cos(th1);
  const ey = L1 * Math.sin(th1);
  const wxw = ex + L2 * Math.cos(th12);
  const wyw = ey + L2 * Math.sin(th12);
  const unreachable = status === "unreachable";
  // tool tip: at the probe when reachable, else continuing past the wrist
  const tipX = unreachable ? wxw + LH * Math.cos(rad(cur.phi)) : probe.x;
  const tipY = unreachable ? wyw + LH * Math.sin(rad(cur.phi)) : probe.y;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!drag) return;
    const [sx, sy] = svgPoint(e);
    let nx = (sx - BX) / S;
    let ny = (BY - sy) / S;
    const r = Math.hypot(nx, ny);
    const rMax = reachOut + 0.6;
    if (r > rMax) {
      nx = (nx / r) * rMax;
      ny = (ny / r) * rMax;
    }
    ny = Math.max(ny, -0.8 * reachOut); // keep clear of the bottom hint lane
    setProbe({ x: nx, y: ny });
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.3 · Reachable vs dexterous workspace"
      ariaLabel={`Workspace probe at radius ${Math.hypot(probe.x, probe.y).toFixed(2)}: ${status}, ${Math.round((fan.count / N_FAN) * 100)} percent of approach angles feasible`}
      svgProps={{ onPointerMove: onMove, onPointerUp: () => setDrag(false), onPointerLeave: () => setDrag(false) }}
      controls={
        <>
          <Btn onClick={() => setShowReach((v) => !v)} active={showReach}>
            {showReach ? "✓ reachable" : "reachable"}
          </Btn>
          <Btn onClick={() => setShowDex((v) => !v)} active={showDex}>
            {showDex ? "✓ dexterous" : "dexterous"}
          </Btn>
          <Slider label="L₁" min={1.5} max={4} step={0.5} value={L1} onChange={setL1} fmt={(v) => v.toFixed(1)} />
          <Slider label="L₂" min={1} max={3} step={0.5} value={L2} onChange={setL2} fmt={(v) => v.toFixed(1)} />
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the probe</span>
        </>
      }
    >
      {/* reachable annulus for the tool tip (grey) */}
      {showReach && (
        <>
          <path
            d={`${circleD(BX, BY, reachOut * S)} ${reachIn > 0.02 ? circleD(BX, BY, reachIn * S) : ""}`}
            fillRule="evenodd"
            fill={R.world}
            opacity={0.14}
          />
          <circle cx={BX} cy={BY} r={reachOut * S} fill="none" stroke={R.world} strokeWidth={2} strokeDasharray="5 5" />
          {reachIn > 0.02 && (
            <circle cx={BX} cy={BY} r={reachIn * S} fill="none" stroke={R.world} strokeWidth={1.5} strokeDasharray="4 5" />
          )}
        </>
      )}
      {/* dexterous band: arrive from any direction (green) */}
      {showDex && dexOut > dexIn + 0.02 && (
        <>
          <path
            d={`${circleD(BX, BY, dexOut * S)} ${circleD(BX, BY, dexIn * S)}`}
            fillRule="evenodd"
            fill={R.fillGreen}
            opacity={0.55}
          />
          <circle cx={BX} cy={BY} r={dexOut * S} fill="none" stroke={R.goal} strokeWidth={2} />
          <circle cx={BX} cy={BY} r={dexIn * S} fill="none" stroke={R.goal} strokeWidth={1.5} />
        </>
      )}

      {/* the arm reaching the probe with a feasible approach angle */}
      <line x1={BX} y1={BY} x2={px(ex)} y2={py(ey)} stroke={unreachable ? R.error : R.signal} strokeWidth={8} strokeLinecap="round" />
      <line x1={px(ex)} y1={py(ey)} x2={px(wxw)} y2={py(wyw)} stroke={unreachable ? R.error : R.signal} strokeWidth={8} strokeLinecap="round" />
      {/* the tool */}
      <line x1={px(wxw)} y1={py(wyw)} x2={px(tipX)} y2={py(tipY)} stroke={R.plan} strokeWidth={5} strokeLinecap="round" />
      <circle cx={BX} cy={BY} r={8} fill={R.ink} />
      <circle cx={px(ex)} cy={py(ey)} r={6} fill={R.ink} />
      <circle cx={px(wxw)} cy={py(wyw)} r={5.5} fill={R.plan} stroke="var(--background)" strokeWidth={1.5} />

      {/* approach-angle fan at the probe: green = deliverable, red = not */}
      {Array.from({ length: N_FAN }, (_, i) => {
        const phi = (i / N_FAN) * Math.PI * 2;
        const cxp = px(probe.x);
        const cyp = py(probe.y);
        return (
          <line
            key={i}
            x1={cxp - 20 * Math.cos(phi)}
            y1={cyp + 20 * Math.sin(phi)}
            x2={cxp - 9 * Math.cos(phi)}
            y2={cyp + 9 * Math.sin(phi)}
            stroke={fan.ok[i] ? R.goal : R.error}
            strokeWidth={2}
            opacity={fan.ok[i] ? 0.9 : 0.35}
          />
        );
      })}

      {/* the probe */}
      <circle
        cx={px(probe.x)}
        cy={py(probe.y)}
        r={9}
        fill={unreachable ? R.fillRed : R.fillAmber}
        stroke={unreachable ? R.error : R.plan}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
      />

      <Readout
        rows={[
          {
            label: "probe",
            value: status,
            color: status === "unreachable" ? R.error : status === "dexterous" ? R.goal : R.ink,
          },
          {
            label: "approach dirs",
            value: `${Math.round((fan.count / N_FAN) * 100)}%`,
            color: fan.count === N_FAN ? R.goal : fan.count === 0 ? R.error : R.ink,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.world, label: "reachable (somehow)" },
          { color: R.goal, label: "dexterous (any angle)" },
          { color: R.plan, label: "tool on the wrist" },
        ]}
      />
      <text x={360} y={430} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        near the edge the fan thins to a sliver: the arm can touch, but only one way
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.4 · Inverse kinematics: elbow-up & elbow-down  (true 3D, drag target)
// Drag a target across the floor; base yaw is solved by atan2 and shoulder /
// elbow by law-of-cosines IK — both elbow branches drawn, the preferred one
// solid. At the reach circle the branches merge; beyond it the arm stretches
// red with no solution.
// ===========================================================================

const GROUND_REACH = Math.sqrt((A1 + A2) * (A1 + A2) - SHOULDER[2] * SHOULDER[2]);

export function RbInverseKinematics() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-30, 26);
  const [prefer, setPrefer] = useState<"down" | "up">("down");
  const [target, setTarget] = useState<V3>([1.15, 0.55, 0]);
  const dragging = useRef(false);
  const lastPt = useRef<[number, number] | null>(null);
  const [disp, setDisp] = useState({ yaw: 26, shD: -30, elD: 90, shU: 40, elU: -90 });

  const solveNow = () => {
    const rr = Math.hypot(target[0], target[1]);
    const sol = ik2(rr, -SHOULDER[2]);
    return {
      yaw: deg(Math.atan2(target[1], target[0])),
      shD: sol.down.sh,
      elD: sol.down.el,
      shU: sol.up.sh,
      elU: sol.up.el,
      reachable: sol.reachable,
    };
  };

  useRafLoop(
    (dt) => {
      const t = solveNow();
      setDisp((s) => {
        const n = {
          yaw: approachAngle(s.yaw, t.yaw, 0.25, dt),
          shD: approachAngle(s.shD, t.shD, 0.25, dt),
          elD: approachAngle(s.elD, t.elD, 0.25, dt),
          shU: approachAngle(s.shU, t.shU, 0.25, dt),
          elU: approachAngle(s.elU, t.elU, 0.25, dt),
        };
        const delta =
          Math.abs(n.yaw - s.yaw) +
          Math.abs(n.shD - s.shD) +
          Math.abs(n.elD - s.elD) +
          Math.abs(n.shU - s.shU) +
          Math.abs(n.elU - s.elU);
        return delta < 1e-4 ? s : n;
      });
    },
    { playing: inView && !reduced },
  );

  const t = solveNow();
  const cur = reduced ? t : disp;
  const rr = Math.hypot(target[0], target[1]);
  const solutions = !t.reachable ? 0 : Math.abs(rr - GROUND_REACH) < 0.02 ? 1 : 2;

  const fkDown = armFK(rad(cur.yaw), rad(cur.shD), rad(cur.elD));
  const fkUp = armFK(rad(cur.yaw), rad(cur.shU), rad(cur.elU));
  const active = prefer === "down" ? fkDown : fkUp;
  const ghost = prefer === "down" ? fkUp : fkDown;
  const activeAng = prefer === "down" ? { sh: cur.shD, el: cur.elD } : { sh: cur.shU, el: cur.elU };
  const armCol = solutions === 0 ? R.error : R.signal;

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 4.6,
    zoom: 124,
    target: [0, 0, 0.35],
  };

  const prims: Prim3D[] = [
    ...grid3(1.6, 0.4),
    // reach circle on the floor: where the two elbow branches merge
    ...curve3((u) => [GROUND_REACH * Math.cos(u * Math.PI * 2), GROUND_REACH * Math.sin(u * Math.PI * 2), 0], R.world, {
      n: 48,
      width: 1.5,
      dash: "5 5",
    }),
    // floor trace of the arm's vertical working plane
    seg3([0, 0, 0], [target[0], target[1], 0], R.line, { width: 1.2, dash: "3 5" }),
    // ghost branch first (under), then the active one
    ...(solutions === 2 ? armBody(ghost, R.world, 0.45) : []),
    ...armBody(active, armCol),
    // the target on the floor
    ...ring3(target, [0, 0, 1], 0.09, solutions === 0 ? R.error : R.goal, { n: 24, width: 2 }),
    dot3(target, solutions === 0 ? R.error : R.goal, { r: 6 }),
    label3(v3.add(target, [0, 0, 0.02]), "target", solutions === 0 ? R.error : R.goal, { dx: 10, dy: -8, size: 12.5 }),
    // when unreachable, show the gap the arm can't close
    ...(solutions === 0 ? [seg3(active.H, target, R.error, { width: 1.5, dash: "3 4" })] : []),
  ];

  const svgProps = {
    ...orbit.svgProps,
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (dragging.current) {
        const r = e.currentTarget.getBoundingClientRect();
        const sx = ((e.clientX - r.left) / r.width) * 720;
        const sy = ((e.clientY - r.top) / r.height) * 440;
        if (lastPt.current) {
          const np = groundDrag(cam, target, sx - lastPt.current[0], sy - lastPt.current[1]);
          const nr = Math.hypot(np[0], np[1]);
          const rc = Math.min(nr, 1.85);
          setTarget([(np[0] * rc) / (nr || 1), (np[1] * rc) / (nr || 1), 0]);
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

  const targetScreen = project(cam, target);

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.4 · Inverse kinematics: elbow-up & elbow-down"
      ariaLabel={`IK target at floor radius ${rr.toFixed(2)}; ${solutions} solution${solutions === 1 ? "" : "s"}. Drag the target on the floor; drag empty space to orbit.`}
      svgProps={svgProps}
      controls={
        <>
          <Tabs
            options={[
              { id: "down", label: "prefer elbow-down" },
              { id: "up", label: "prefer elbow-up" },
            ]}
            value={prefer}
            onChange={setPrefer}
          />
          <Btn
            onClick={() => {
              setTarget([1.15, 0.55, 0]);
              orbit.reset();
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the target · drag empty space to orbit</span>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      {/* generous invisible hit-target over the target for dragging */}
      <circle
        cx={targetScreen.x}
        cy={targetScreen.y}
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
          {
            label: "solutions",
            value: solutions === 2 ? "2 (up & down)" : solutions === 1 ? "1 (full stretch)" : "0 (unreachable)",
            color: solutions === 0 ? R.error : solutions === 1 ? R.plan : R.goal,
          },
          { label: "θ base", value: `${Math.round(cur.yaw)}°` },
          { label: "θ shoulder", value: `${Math.round(activeAng.sh)}°` },
          { label: "θ elbow", value: `${Math.round(activeAng.el)}°` },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "chosen elbow" },
          { color: R.world, label: "the other elbow" },
          { color: R.goal, label: "target" },
          { color: R.world, label: "reach circle", dash: true },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={solutions === 0 ? R.error : R.world}>
        {solutions === 0
          ? "outside the reach circle no joint angles exist — a solver must give up gracefully"
          : "two arms, one hand: drag the target to the dashed circle and watch the elbows merge"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.5 · The manipulability ellipsoid  (true 3D, orbitable)
// The real 3×3 Jacobian of the 3-DoF arm, with J·Jᵀ eigendecomposed live; the
// ellipsoid of reachable hand velocities is drawn at the hand as its three
// principal sections. Straighten the elbow and watch it collapse to a pancake.
// ===========================================================================

export function RbJacobianEllipse() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-30, 22);
  const [t1, setT1] = useState(30);
  const [t2, setT2] = useState(50);
  const [t3, setT3] = useState(70);
  const [disp, setDisp] = useState({ a: 30, b: 50, c: 70 });

  useRafLoop(
    (dt) => {
      setDisp((s) => {
        const a = approachAngle(s.a, t1, 0.2, dt);
        const b = approachAngle(s.b, t2, 0.2, dt);
        const c = approachAngle(s.c, t3, 0.2, dt);
        if (Math.abs(a - s.a) + Math.abs(b - s.b) + Math.abs(c - s.c) < 1e-4) return s;
        return { a, b, c };
      });
    },
    { playing: inView && !reduced },
  );

  const a = reduced ? t1 : disp.a;
  const b = reduced ? t2 : disp.b;
  const c = reduced ? t3 : disp.c;
  const fk = armFK(rad(a), rad(b), rad(c));
  const J = armJacobian(fk);

  // M = J·Jᵀ, then its eigenpairs = the ellipsoid's axes (real math, no props)
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) M[i][j] = J[0][i] * J[0][j] + J[1][i] * J[1][j] + J[2][i] * J[2][j];
  const pairs = eig3(M);
  const sig = pairs.map((p) => Math.sqrt(p.val)); // singular values of J
  const manip = sig[0] * sig[1] * sig[2]; // = |det J|
  const near = sig[2] < 0.12;

  const ES = 0.3; // world units per (m/s per rad/s) for drawing
  const ellipseCol = near ? R.error : R.plan;
  const sections: Prim3D[] = [];
  const pairIdx: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  for (const [i, j] of pairIdx) {
    sections.push(
      ...curve3(
        (u) => {
          const th = u * Math.PI * 2;
          return v3.add(
            fk.H,
            v3.add(v3.scale(pairs[i].vec, sig[i] * ES * Math.cos(th)), v3.scale(pairs[j].vec, sig[j] * ES * Math.sin(th))),
          );
        },
        ellipseCol,
        { n: 36, width: 2, opacity: 0.9 },
      ),
    );
  }
  // principal axes of the ellipsoid
  for (let i = 0; i < 3; i++) {
    sections.push(
      seg3(v3.add(fk.H, v3.scale(pairs[i].vec, -sig[i] * ES)), v3.add(fk.H, v3.scale(pairs[i].vec, sig[i] * ES)), ellipseCol, {
        width: 1.2,
        opacity: 0.5,
        dash: "2 3",
      }),
    );
  }

  const cam: Camera3D = {
    yawDeg: orbit.yawDeg,
    pitchDeg: orbit.pitchDeg,
    dist: 4.6,
    zoom: 112,
    target: [0, 0, 0.55],
  };

  const prims: Prim3D[] = [...grid3(1.2, 0.4), ...armBody(fk, R.signal), ...sections];

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.5 · The manipulability ellipsoid"
      ariaLabel={`Manipulability ${manip.toFixed(2)}, smallest singular value ${sig[2].toFixed(2)}; ${near ? "near singular" : "well conditioned"}. Drag to orbit.`}
      svgProps={orbit.svgProps}
      controls={
        <>
          <Slider label="θ₁ yaw" min={-180} max={180} value={t1} onChange={setT1} fmt={(v) => `${v}°`} />
          <Slider label="θ₂ shoulder" min={-10} max={100} value={t2} onChange={setT2} fmt={(v) => `${v}°`} />
          <Slider label="θ₃ elbow" min={-140} max={140} value={t3} onChange={setT3} fmt={(v) => `${v}°`} />
          <Btn onClick={() => setT3(0)} title="straighten the elbow: the classic singularity">
            elbow → 0°
          </Btn>
          <Btn
            onClick={() => {
              setT1(30);
              setT2(50);
              setT3(70);
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
          { label: "manipulability", value: manip.toFixed(2), color: near ? R.error : R.ink },
          { label: "σ max", value: sig[0].toFixed(2) },
          { label: "σ min", value: sig[2].toFixed(2), color: near ? R.error : R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "arm" },
          { color: R.plan, label: "velocity ellipsoid" },
          { color: R.error, label: "near singular" },
        ]}
      />
      <text
        x={360}
        y={424}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12}
        fill={near ? R.error : R.world}
        fontWeight={near ? 600 : 400}
      >
        {near
          ? "σ min ≈ 0: a whole direction of hand motion is gone — the ellipsoid is a pancake"
          : "unit joint speeds map through J to this ellipsoid of hand velocities · drag to orbit"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.6 · Approaching a singularity  (polished 2D, slider-driven)
// One slider straightens the elbow of a planar 2-link arm. Manipulability
// |det J| drains, and the joint speed that inverse kinematics demands for a
// constant 5 cm/s outward hand motion climbs the log-scale chart and leaves
// it entirely at full stretch.
// ===========================================================================

const O6 = { x: 210, y: 250 };
const PPU6 = 42;
const wx6 = (u: number) => O6.x + u * PPU6;
const wy6 = (u: number) => O6.y - u * PPU6;
const L1_6 = 3;
const L2_6 = 2;
const TH1_6 = 40; // fixed base angle, deg

function jac6(th2deg: number) {
  const th1 = rad(TH1_6);
  const th12 = rad(TH1_6 + th2deg);
  return [
    [-L1_6 * Math.sin(th1) - L2_6 * Math.sin(th12), -L2_6 * Math.sin(th12)],
    [L1_6 * Math.cos(th1) + L2_6 * Math.cos(th12), L2_6 * Math.cos(th12)],
  ];
}

// Joint speed (deg/s) demanded by q̇ = J⁻¹ẋ for 5 cm/s outward at the hand.
function demand6(th2deg: number): number {
  const J = jac6(th2deg);
  const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
  if (Math.abs(det) < 1e-9) return Infinity;
  const th1 = rad(TH1_6);
  const th12 = rad(TH1_6 + th2deg);
  const hx = L1_6 * Math.cos(th1) + L2_6 * Math.cos(th12);
  const hy = L1_6 * Math.sin(th1) + L2_6 * Math.sin(th12);
  const hr = Math.hypot(hx, hy) || 1;
  const xd = (hx / hr) * 0.05;
  const yd = (hy / hr) * 0.05;
  const q1 = (J[1][1] * xd - J[0][1] * yd) / det;
  const q2 = (-J[1][0] * xd + J[0][0] * yd) / det;
  return Math.hypot(q1, q2) * (180 / Math.PI);
}

// chart mapping: θ₂ from 90° (left) to 0° (right); |q̇| on a log scale
const gx6 = (th2: number) => 470 + ((90 - th2) / 90) * 220;
const gy6 = (q: number) => 336 - ((clamp(Math.log10(Math.min(q, 5000)), 0.4, 3.4) - 0.4) / 3) * 140;

export function RbSingularity() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [t2, setT2] = useState(90);
  const [command, setCommand] = useState(true);
  const [disp, setDisp] = useState(90);

  useRafLoop(
    (dt) =>
      setDisp((d) => {
        const n = approach(d, t2, 0.2, dt);
        return Math.abs(n - d) < 1e-4 ? d : n;
      }),
    { playing: inView && !reduced },
  );

  const b = reduced ? t2 : disp;
  const th1 = rad(TH1_6);
  const th12 = rad(TH1_6 + b);
  const ex = L1_6 * Math.cos(th1);
  const ey = L1_6 * Math.sin(th1);
  const hx = ex + L2_6 * Math.cos(th12);
  const hy = ey + L2_6 * Math.sin(th12);

  const J = jac6(b);
  const detJ = Math.abs(J[0][0] * J[1][1] - J[0][1] * J[1][0]);
  const manipNorm = clamp(detJ / (L1_6 * L2_6), 0, 1); // 1 at θ₂ = 90°
  const qDeg = demand6(b);
  const exploding = qDeg > 400;
  const outAng = Math.atan2(hy, hx);

  const curvePts = Array.from({ length: 61 }, (_, i) => {
    const th2 = 90 - i * 1.5;
    return `${i === 0 ? "M" : "L"} ${gx6(th2).toFixed(1)} ${gy6(demand6(th2)).toFixed(1)}`;
  }).join(" ");

  const barX = 470;
  const barY = 122;
  const barW = 190;

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.6 · Approaching a singularity"
      ariaLabel={`Elbow angle ${Math.round(b)} degrees; manipulability ${manipNorm.toFixed(2)}; demanded joint speed ${
        Number.isFinite(qDeg) ? Math.round(qDeg) + " degrees per second" : "infinite"
      }`}
      controls={
        <>
          <Slider label="θ₂" min={0} max={90} value={t2} onChange={setT2} fmt={(v) => `${v}°`} />
          <Btn onClick={() => setCommand((v) => !v)} active={command}>
            {command ? "✓ command 5 cm/s outward" : "command 5 cm/s outward"}
          </Btn>
          <Btn onClick={() => setT2(90)}>↺ reset</Btn>
        </>
      }
    >
      <line x1={O6.x} y1={wy6(-0.8)} x2={O6.x} y2={wy6(4.2)} stroke={R.line} strokeWidth={1} strokeDasharray="4 6" />
      <line x1={wx6(-1)} y1={O6.y} x2={wx6(5.4)} y2={O6.y} stroke={R.line} strokeWidth={1} strokeDasharray="4 6" />

      {/* the arm */}
      <line x1={O6.x} y1={O6.y} x2={wx6(ex)} y2={wy6(ey)} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <line x1={wx6(ex)} y1={wy6(ey)} x2={wx6(hx)} y2={wy6(hy)} stroke={R.signal} strokeWidth={10} strokeLinecap="round" />
      <circle cx={O6.x} cy={O6.y} r={9} fill={R.ink} />
      <circle cx={wx6(ex)} cy={wy6(ey)} r={7} fill={R.ink} />
      <circle cx={wx6(hx)} cy={wy6(hy)} r={8} fill={R.signal} stroke="var(--background)" strokeWidth={2} />

      {/* outward command arrow: the direction going scarce */}
      {command && (
        <g opacity={exploding ? 1 : 0.85}>
          {svgArrow(
            wx6(hx),
            wy6(hy),
            wx6(hx) + Math.cos(outAng) * 44,
            wy6(hy) - Math.sin(outAng) * 44,
            exploding ? R.error : R.plan,
            2.5,
            8,
          )}
        </g>
      )}

      {/* right lane: manipulability bar + demanded-speed chart */}
      <line x1={450} y1={40} x2={450} y2={392} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={barX} y={barY - 12} fontFamily={MONO} fontSize={13} fill={R.world}>
        manipulability |det J| / max
      </text>
      <rect x={barX} y={barY} width={barW} height={14} rx={6} fill="#e7e7e4" />
      <rect x={barX} y={barY} width={Math.max(2, barW * manipNorm)} height={14} rx={6} fill={manipNorm < 0.15 ? R.error : R.plan} />
      <text x={barX + barW + 8} y={barY + 12} fontFamily={MONO} fontSize={13} fill={R.ink}>
        {manipNorm.toFixed(2)}
      </text>

      <text x={barX} y={182} fontFamily={MONO} fontSize={13} fill={R.world}>
        demanded joint speed (log scale)
      </text>
      <rect x={barX} y={196} width={220} height={140} fill="none" stroke={R.line} strokeWidth={1} />
      <path d={curvePts} fill="none" stroke={R.error} strokeWidth={2} />
      {command && Number.isFinite(qDeg) && <circle cx={gx6(b)} cy={gy6(qDeg)} r={5} fill={R.error} />}
      <text x={barX} y={354} fontFamily={MONO} fontSize={11.5} fill={R.world}>
        θ₂: 90° (folded)
      </text>
      <text x={barX + 220} y={354} textAnchor="end" fontFamily={MONO} fontSize={11.5} fill={R.world}>
        0° (straight)
      </text>
      <text x={barX} y={376} fontFamily={MONO} fontSize={11.5} fill={R.world}>
        θ₂ → 0: links align, det J → 0
      </text>

      <Readout
        rows={[
          { label: "θ₂ elbow", value: `${Math.round(b)}°` },
          { label: "manipulability", value: manipNorm.toFixed(2), color: manipNorm < 0.15 ? R.error : R.ink },
          {
            label: "|q̇| demanded",
            value: command
              ? exploding
                ? Number.isFinite(qDeg)
                  ? `${Math.round(qDeg)} °/s !`
                  : "→ ∞ °/s"
                : `${Math.round(qDeg)} °/s`
              : "off",
            color: exploding ? R.error : R.ink,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "arm" },
          { color: R.plan, label: "manipulability" },
          { color: R.error, label: "demanded |q̇|" },
        ]}
      />
      <text
        x={360}
        y={424}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12}
        fill={exploding ? R.error : R.world}
        fontWeight={exploding ? 600 : 400}
      >
        {exploding
          ? "the inverse is dividing by almost zero — this is how robots whip their joints near full stretch"
          : "straighten the elbow and watch the red curve leave the chart"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 3.7 · Sweeping the elbow through the null space  (polished 2D)
// A redundant 3-link planar arm holds its fingertip on a fixed (draggable)
// target while a null-space slider sweeps the internal posture. Drop an
// obstacle and let auto-avoid pick the posture with the most clearance — the
// fingertip never moves, because the motion lives in J's null space.
// ===========================================================================

const O7 = { x: 210, y: 250 };
const PPU7 = 42;
const wx7 = (u: number) => O7.x + u * PPU7;
const wy7 = (u: number) => O7.y - u * PPU7;

const L3 = [2.2, 2.0, 1.6]; // three link lengths (world units)
const REACH3 = L3[0] + L3[1] + L3[2];

// Solve a 3-link planar arm to place the fingertip at (tx, ty) with a
// self-motion parameter u in [0,1] picking the internal posture: the wrist is
// pinned on a circle of radius L₃ about the tip, its angle swept by u, then
// the first two links reach that wrist by 2-link IK.
function solve3(tx: number, ty: number, u: number, L: number[]): number[] | null {
  const tipR = Math.hypot(tx, ty);
  if (tipR > L[0] + L[1] + L[2] || tipR < 1e-3) return null;
  const tipAng = Math.atan2(ty, tx);
  const spread = 1.5; // radians of self-motion range shown
  const wristDir = tipAng + Math.PI + (u - 0.5) * spread;
  const wxw = tx + L[2] * Math.cos(wristDir);
  const wyw = ty + L[2] * Math.sin(wristDir);
  const wr = Math.hypot(wxw, wyw);
  if (wr > L[0] + L[1] || wr < Math.abs(L[0] - L[1])) return null;
  const c2 = clamp((wr * wr - L[0] * L[0] - L[1] * L[1]) / (2 * L[0] * L[1]), -1, 1);
  const a2 = Math.acos(c2);
  const a1 = Math.atan2(wyw, wxw) - Math.atan2(L[1] * Math.sin(a2), L[0] + L[1] * Math.cos(a2));
  const a3 = Math.atan2(ty - wyw, tx - wxw) - (a1 + a2);
  return [a1, a2, a3];
}

// Forward-walk relative joint angles into absolute joint points.
function jointsOf(rel: number[], L: number[]): [number, number][] {
  const pts: [number, number][] = [[0, 0]];
  let ang = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < rel.length; i++) {
    ang += rel[i];
    x += L[i] * Math.cos(ang);
    y += L[i] * Math.sin(ang);
    pts.push([x, y]);
  }
  return pts;
}

export function RbNullSpace() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [u, setU] = useState(0.5);
  const [target, setTarget] = useState({ x: 3.2, y: 2.4 });
  const [obstacle, setObstacle] = useState(false);
  const [dragTip, setDragTip] = useState(false);
  const [dispU, setDispU] = useState(0.5);
  const [auto, toggleAuto] = useReducer((p: boolean) => !p, false);

  const OBST = { x: 2.6, y: 3.0, r: 0.55 };

  useRafLoop(
    (dt) => {
      let targetU = u;
      if (obstacle && auto) {
        let best = -Infinity;
        let bestU = u;
        for (let i = 0; i <= 24; i++) {
          const uu = i / 24;
          const sol = solve3(target.x, target.y, uu, L3);
          if (!sol) continue;
          const p = jointsOf(sol, L3);
          const clear = Math.hypot(p[2][0] - OBST.x, p[2][1] - OBST.y);
          if (clear > best) {
            best = clear;
            bestU = uu;
          }
        }
        targetU = bestU;
      }
      setDispU((d) => {
        const n = approach(d, targetU, 0.16, dt);
        return Math.abs(n - d) < 1e-5 ? d : n;
      });
      if (obstacle && auto) setU(targetU);
    },
    { playing: inView && !reduced },
  );

  const curU = reduced ? u : dispU;
  const sol = solve3(target.x, target.y, curU, L3) ?? solve3(target.x, target.y, 0.5, L3) ?? [0.6, 0.8, -0.4];
  const pts = jointsOf(sol, L3);
  const clearance = Math.hypot(pts[2][0] - OBST.x, pts[2][1] - OBST.y) - OBST.r;

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (!dragTip) return;
    const [sx, sy] = svgPoint(e);
    let nx = clamp((sx - O7.x) / PPU7, -3, 5.2);
    let ny = clamp((O7.y - sy) / PPU7, -0.5, 4.0);
    const r = Math.hypot(nx, ny);
    if (r > REACH3 - 0.1) {
      nx = (nx / r) * (REACH3 - 0.2);
      ny = (ny / r) * (REACH3 - 0.2);
    }
    setTarget({ x: nx, y: ny });
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 3.7 · Sweeping the elbow through the null space"
      ariaLabel={`Redundant 3-link arm holding a fixed fingertip; self-motion parameter ${curU.toFixed(2)}${
        obstacle ? `, elbow clearance ${clearance.toFixed(2)}` : ""
      }`}
      svgProps={{ onPointerMove: onMove, onPointerUp: () => setDragTip(false), onPointerLeave: () => setDragTip(false) }}
      controls={
        <>
          <Slider label="null-space" min={0} max={1} step={0.01} value={u} onChange={(v) => setU(v)} fmt={(v) => v.toFixed(2)} />
          <Btn onClick={() => setObstacle((v) => !v)} active={obstacle}>
            {obstacle ? "✓ obstacle" : "drop obstacle"}
          </Btn>
          {obstacle && (
            <Btn onClick={toggleAuto} active={auto}>
              {auto ? "✓ auto-avoid" : "auto-avoid"}
            </Btn>
          )}
          <Btn
            onClick={() => {
              setU(0.5);
              setTarget({ x: 3.2, y: 2.4 });
            }}
          >
            ↺ reset
          </Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag the fingertip</span>
        </>
      }
    >
      <line x1={wx7(-4.5)} y1={O7.y} x2={wx7(5.5)} y2={O7.y} stroke={R.line} strokeWidth={1} strokeDasharray="4 6" />

      {/* obstacle */}
      {obstacle && (
        <>
          <circle cx={wx7(OBST.x)} cy={wy7(OBST.y)} r={OBST.r * PPU7} fill={R.fillRed} stroke={R.error} strokeWidth={2.5} />
          <text x={wx7(OBST.x)} y={wy7(OBST.y) + 4} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error}>
            avoid
          </text>
        </>
      )}

      {/* ghost trail of other null-space postures (all share the fingertip) */}
      {!reduced &&
        [0.1, 0.35, 0.65, 0.9].map((uu, i) => {
          const gs = solve3(target.x, target.y, uu, L3);
          if (!gs) return null;
          const gp = jointsOf(gs, L3);
          return (
            <polyline
              key={i}
              points={gp.map((p) => `${wx7(p[0])},${wy7(p[1])}`).join(" ")}
              fill="none"
              stroke={R.plan}
              strokeWidth={2}
              opacity={0.18}
            />
          );
        })}

      {/* the arm */}
      <polyline
        points={pts.map((p) => `${wx7(p[0])},${wy7(p[1])}`).join(" ")}
        fill="none"
        stroke={R.signal}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.slice(0, -1).map((p, i) => (
        <circle key={i} cx={wx7(p[0])} cy={wy7(p[1])} r={i === 0 ? 9 : 6} fill={R.ink} />
      ))}
      {/* the swept elbow (wrist joint), highlighted amber */}
      <circle cx={wx7(pts[2][0])} cy={wy7(pts[2][1])} r={7} fill={R.plan} stroke="var(--background)" strokeWidth={2} />

      {/* fixed fingertip target (green) */}
      <circle
        cx={wx7(target.x)}
        cy={wy7(target.y)}
        r={11}
        fill={R.fillGreen}
        stroke={R.goal}
        strokeWidth={3}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragTip(true);
        }}
      />

      <Readout
        rows={[
          { label: "fingertip", value: "locked on target", color: R.goal },
          { label: "null-space u", value: curU.toFixed(2), color: R.plan },
          ...(obstacle
            ? [
                {
                  label: "elbow clearance",
                  value: Math.max(0, clearance).toFixed(2),
                  color: clearance < 0.15 ? R.error : R.ink,
                },
              ]
            : []),
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "arm (7-DoF stand-in)" },
          { color: R.plan, label: "swept elbow" },
          { color: R.goal, label: "fingertip target" },
          { color: R.error, label: "obstacle" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        every posture solves J·q̇ = 0 at the hand: the elbow moves, the fingertip never does
      </text>
    </Stage>
  );
}
