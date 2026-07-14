"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { C, MONO } from "../../frame";

// ---------------------------------------------------------------------------
// Robotics Bible — shared figure primitives.
//
// Every figure is a skin over these: a fixed viewBox SVG stage, one control
// strip, calm delta-timed motion, seeded randomness, offscreen + reduced-motion
// gating. Colors come from the site palette so the guide reads as one language:
//   signal / the controlled thing = blue, command / plan = amber,
//   goal / ground truth = green, error / reality gap = red, world = grey.
// ---------------------------------------------------------------------------

export const R = {
  signal: C.blue, // the controlled thing / the sensed signal (blue)
  plan: "#c07d16", // the command / the plan (amber, tuned for light bg)
  goal: C.green, // the goal / ground truth (green)
  error: "#cf3b3b", // error / the reality gap (red)
  world: C.muted, // the world / static structure (grey)
  line: C.line,
  ink: C.ink,
  card: C.card,
  fillBlue: C.blueFill,
  fillGreen: C.greenFill,
  fillAmber: "#f5e6cd",
  fillRed: "#f6dcdc",
} as const;

export { MONO };

// The logical stage size every robotics figure designs against (§4.1).
export const STAGE_W = 720;
export const STAGE_H = 440;

// --- Motion hooks ----------------------------------------------------------

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

// IntersectionObserver -> is the element on screen? Used to pause loops when a
// figure scrolls out of view so a chapter with eight figures runs one loop.
export function useInView<T extends Element>(ref: React.RefObject<T | null>) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

// Drives a continuous, delta-timed, pausable, reduced-motion-safe loop.
// `update(dt)` advances figure state by dt seconds. Loop is skipped entirely
// under reduced motion or when not playing.
export function useRafLoop(
  update: (dt: number) => void,
  { playing = true }: { playing?: boolean } = {},
) {
  const raf = useRef<number | undefined>(undefined);
  const last = useRef<number>(0);
  const reduced = usePrefersReducedMotion();
  const fn = useRef(update);
  // Keep the latest update closure without restarting the loop each render.
  // Written in an effect (never during render) to satisfy react-hooks/refs.
  useEffect(() => {
    fn.current = update;
  });

  useEffect(() => {
    if (!playing || reduced) return;
    const tick = (t: number) => {
      const dt = last.current ? (t - last.current) / 1000 : 0;
      last.current = t;
      fn.current(Math.min(dt, 0.05)); // clamp big tab-switch gaps
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing, reduced]);
}

// Eases a scalar toward a target each frame (feedback / convergence feel).
// rate is per-frame-at-60fps; scaled by dt so it is frame-rate independent.
export function approach(v: number, target: number, rate = 0.15, dt = 1 / 60) {
  const k = 1 - Math.pow(1 - rate, dt * 60);
  return v + k * (target - v);
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// Deterministic PRNG (mulberry32). Seed it so every load looks identical and a
// figure can be reset to the same sequence.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- UI primitives ---------------------------------------------------------

// One horizontal control strip below the stage: evenly spaced, wraps on
// mobile, consistent styling across every figure (§4.1, §4.3).
export function Controls({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border)] pt-3 text-[13px]">
      {children}
    </div>
  );
}

export function Btn({
  onClick,
  active = false,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[13px] text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
      style={active ? { background: C.ink, color: "var(--background)" } : undefined}
    >
      {children}
    </button>
  );
}

export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  fmt,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  return (
    <label className="flex items-center gap-2 font-mono text-[13px] text-[var(--muted)]">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ accentColor: C.blue }}
      />
      <span className="tabular-nums text-[var(--foreground)]">
        {fmt ? fmt(value) : value}
      </span>
    </label>
  );
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Btn key={o.id} onClick={() => onChange(o.id)} active={value === o.id}>
          {o.label}
        </Btn>
      ))}
    </div>
  );
}

// Inner figure title shown above the stage (§4.3).
export function FigTitle({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-2 font-mono text-[13px] text-[var(--muted)]"
      style={{ fontFamily: MONO }}
    >
      {children}
    </div>
  );
}

// A figure shell: inner title + fixed-viewBox SVG stage + control strip. The
// enclosing InteractiveFrame supplies the card border and the caption.
export function Stage({
  title,
  ariaLabel,
  children,
  controls,
  viewBox = `0 0 ${STAGE_W} ${STAGE_H}`,
  innerRef,
  svgProps,
}: {
  title: ReactNode;
  ariaLabel: string;
  children: ReactNode;
  controls?: ReactNode;
  viewBox?: string;
  innerRef?: React.Ref<HTMLDivElement>;
  // Extra props spread onto the <svg> (e.g. pointer handlers for draggables).
  svgProps?: React.SVGProps<SVGSVGElement>;
}) {
  return (
    <div ref={innerRef}>
      <FigTitle>{title}</FigTitle>
      <svg
        viewBox={viewBox}
        className="h-auto w-full rounded-md"
        role="img"
        aria-label={ariaLabel}
        style={{ background: "var(--background)", touchAction: "none" }}
        {...svgProps}
      >
        {children}
      </svg>
      {controls != null && <Controls>{controls}</Controls>}
    </div>
  );
}

// Small labeled arrowhead-terminated connector for pipeline figures.
export function svgArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 3,
  head = 10,
) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a1 = ang + Math.PI - 0.42;
  const a2 = ang + Math.PI + 0.42;
  return (
    <g stroke={color} fill={color}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={width} strokeLinecap="round" />
      <polygon
        stroke="none"
        points={`${x2},${y2} ${x2 + head * Math.cos(a1)},${y2 + head * Math.sin(a1)} ${x2 + head * Math.cos(a2)},${y2 + head * Math.sin(a2)}`}
      />
    </g>
  );
}

// Hook returning a ref + whether its loop should run (in view). Compose with
// useRafLoop: pass `playing: playing && inView`.
export function useStageVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return { ref, inView } as const;
}

// Map a pointer event on an SVG (viewBox 0..w x 0..h, h:auto so aspect is
// preserved) to logical stage coordinates. Uniform scale => a plain rect map.
export function svgPoint(
  e: React.PointerEvent<SVGElement>,
  w = STAGE_W,
  h = STAGE_H,
): [number, number] {
  const r = e.currentTarget.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * w, ((e.clientY - r.top) / r.height) * h];
}

// ===========================================================================
// 3D toolkit. Real projected 3D for the figures whose subject *is* 3D
// (rotations, frames, gimbals, point clouds, workspaces): right-handed world
// with z up, an orbitable camera, perspective projection onto the stage, and
// painter's-algorithm depth sorting of short segments. Everything renders to
// plain SVG so the figures stay in one visual language with the 2D ones.
// ===========================================================================

export type V3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number]; // (w, x, y, z)

export const v3 = {
  add: (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: V3, b: V3): V3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  len: (a: V3) => Math.hypot(a[0], a[1], a[2]),
  norm: (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a: V3, b: V3, t: number): V3 => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ],
};

export const quat = {
  id: [1, 0, 0, 0] as Quat,
  fromAxisAngle(axis: V3, angleRad: number): Quat {
    const [x, y, z] = v3.norm(axis);
    const h = angleRad / 2;
    const s = Math.sin(h);
    return [Math.cos(h), x * s, y * s, z * s];
  },
  // ZYX (yaw-pitch-roll) Euler convention, the aerospace standard used in Ch2.
  fromEuler(rollRad: number, pitchRad: number, yawRad: number): Quat {
    const qz = quat.fromAxisAngle([0, 0, 1], yawRad);
    const qy = quat.fromAxisAngle([0, 1, 0], pitchRad);
    const qx = quat.fromAxisAngle([1, 0, 0], rollRad);
    return quat.mul(quat.mul(qz, qy), qx);
  },
  mul(a: Quat, b: Quat): Quat {
    const [aw, ax, ay, az] = a;
    const [bw, bx, by, bz] = b;
    return [
      aw * bw - ax * bx - ay * by - az * bz,
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
    ];
  },
  norm(q: Quat): Quat {
    const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
  },
  conj: (q: Quat): Quat => [q[0], -q[1], -q[2], -q[3]],
  rotate(q: Quat, p: V3): V3 {
    // p' = q p q*  via the expanded (cheaper) form.
    const u: V3 = [q[1], q[2], q[3]];
    const s = q[0];
    const a = v3.scale(u, 2 * v3.dot(u, p));
    const b = v3.scale(p, s * s - v3.dot(u, u));
    const c = v3.scale(v3.cross(u, p), 2 * s);
    return v3.add(v3.add(a, b), c);
  },
  slerp(a: Quat, b: Quat, t: number): Quat {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    let bb: Quat = b;
    if (d < 0) {
      d = -d;
      bb = [-b[0], -b[1], -b[2], -b[3]];
    }
    if (d > 0.9995) {
      return quat.norm([
        lerp(a[0], bb[0], t),
        lerp(a[1], bb[1], t),
        lerp(a[2], bb[2], t),
        lerp(a[3], bb[3], t),
      ]);
    }
    const th = Math.acos(clamp(d, -1, 1));
    const sa = Math.sin((1 - t) * th) / Math.sin(th);
    const sb = Math.sin(t * th) / Math.sin(th);
    return [
      sa * a[0] + sb * bb[0],
      sa * a[1] + sb * bb[1],
      sa * a[2] + sb * bb[2],
      sa * a[3] + sb * bb[3],
    ];
  },
};

// --- Camera -----------------------------------------------------------------

export type Camera3D = {
  yawDeg: number; // orbit around world z
  pitchDeg: number; // elevation above the ground plane
  dist: number; // camera distance from the target, world units
  fov?: number; // perspective strength; larger = flatter (default 5)
  zoom?: number; // stage pixels per world unit at the target (default 150)
  cx?: number; // stage center of projection
  cy?: number;
  target?: V3; // world point the camera looks at
};

export type P2 = { x: number; y: number; depth: number; scale: number };

// World (z up, right-handed) -> stage. depth grows away from the camera;
// scale is the local perspective factor (use it to size dots/labels).
export function project(cam: Camera3D, p: V3): P2 {
  const {
    yawDeg,
    pitchDeg,
    dist,
    fov = 5,
    zoom = 150,
    cx = STAGE_W / 2,
    cy = STAGE_H / 2 + 10,
    target = [0, 0, 0] as V3,
  } = cam;
  const ya = rad3d(yawDeg);
  const pa = rad3d(pitchDeg);
  const q = v3.sub(p, target);
  // rotate the world so the camera looks down -y': yaw about z, pitch about x.
  const x1 = q[0] * Math.cos(ya) - q[1] * Math.sin(ya);
  const y1 = q[0] * Math.sin(ya) + q[1] * Math.cos(ya);
  const z1 = q[2];
  const y2 = y1 * Math.cos(pa) - z1 * Math.sin(pa);
  const z2 = y1 * Math.sin(pa) + z1 * Math.cos(pa);
  const depth = dist - y2;
  const persp = fov / Math.max(fov + y2 / dist, 0.05); // ~1 at target
  return {
    x: cx + x1 * zoom * persp,
    y: cy - z2 * zoom * persp,
    depth,
    scale: persp,
  };
}

const rad3d = (d: number) => (d * Math.PI) / 180;

// Depth cue: farther segments render thinner and more transparent, which is
// what makes wireframe 3D read as 3D. t in [0,1] across the scene's depth.
export function depthStyle(t: number) {
  return { opacity: 0.35 + 0.65 * (1 - t), width: 0.6 + 0.4 * (1 - t) };
}

// --- Scene assembly ---------------------------------------------------------
// Figures build a list of primitives, then render them back-to-front. Curves
// are sampled into short segments so interleaved objects sort correctly.

export type Seg3D = {
  kind: "seg";
  a: V3;
  b: V3;
  color: string;
  width?: number;
  dash?: string;
  opacity?: number;
};
export type Dot3D = {
  kind: "dot";
  p: V3;
  color: string;
  r?: number;
  stroke?: string;
};
export type Label3D = {
  kind: "label";
  p: V3;
  text: string;
  color: string;
  size?: number;
  dx?: number;
  dy?: number;
  anchor?: "start" | "middle" | "end";
};
export type Poly3D = {
  kind: "poly";
  pts: V3[];
  fill: string;
  opacity?: number;
  stroke?: string;
};
export type Prim3D = Seg3D | Dot3D | Label3D | Poly3D;

export const seg3 = (a: V3, b: V3, color: string, o: Partial<Seg3D> = {}): Seg3D => ({
  kind: "seg",
  a,
  b,
  color,
  ...o,
});
export const dot3 = (p: V3, color: string, o: Partial<Dot3D> = {}): Dot3D => ({
  kind: "dot",
  p,
  color,
  ...o,
});
export const label3 = (p: V3, text: string, color: string, o: Partial<Label3D> = {}): Label3D => ({
  kind: "label",
  p,
  text,
  color,
  ...o,
});

// Sample a parametric 3D curve into depth-sortable segments.
export function curve3(
  f: (t: number) => V3,
  color: string,
  { n = 64, t0 = 0, t1 = 1, ...o }: Partial<Seg3D> & { n?: number; t0?: number; t1?: number } = {},
): Seg3D[] {
  const out: Seg3D[] = [];
  for (let i = 0; i < n; i++) {
    out.push(seg3(f(t0 + ((t1 - t0) * i) / n), f(t0 + ((t1 - t0) * (i + 1)) / n), color, o));
  }
  return out;
}

// A circle of radius r in the plane orthogonal to `normal`, centered at c.
export function ring3(
  c: V3,
  normal: V3,
  r: number,
  color: string,
  o: Partial<Seg3D> & { n?: number } = {},
): Seg3D[] {
  const nrm = v3.norm(normal);
  const ref: V3 = Math.abs(nrm[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = v3.norm(v3.cross(ref, nrm));
  const w = v3.cross(nrm, u);
  return curve3(
    (t) => {
      const a = t * Math.PI * 2;
      return v3.add(c, v3.add(v3.scale(u, r * Math.cos(a)), v3.scale(w, r * Math.sin(a))));
    },
    color,
    { n: 72, ...o },
  );
}

// Ground grid on the z=0 plane, centered on the origin.
export function grid3(half = 1.2, step = 0.4, color = R.line): Seg3D[] {
  const out: Seg3D[] = [];
  for (let v = -half; v <= half + 1e-9; v += step) {
    out.push(seg3([v, -half, 0], [v, half, 0], color, { width: 1 }));
    out.push(seg3([-half, v, 0], [half, v, 0], color, { width: 1 }));
  }
  return out;
}

// A coordinate-frame triad at pose (origin + quaternion), axis length L.
// Colors follow the guide's frame convention: x red-ish, y green, z blue.
export function triad3(
  origin: V3,
  q: Quat,
  L = 0.5,
  labels: [string, string, string] | null = ["x", "y", "z"],
  colors: [string, string, string] = [R.error, R.goal, R.signal],
): Prim3D[] {
  const out: Prim3D[] = [];
  const axes: V3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  axes.forEach((a, i) => {
    const tip = v3.add(origin, v3.scale(quat.rotate(q, a), L));
    out.push(seg3(origin, tip, colors[i], { width: 3 }));
    out.push(dot3(tip, colors[i], { r: 3 }));
    if (labels) out.push(label3(tip, labels[i], colors[i], { dx: 8, dy: -6 }));
  });
  out.push(dot3(origin, R.ink, { r: 3.5 }));
  return out;
}

// Wireframe box (axis-aligned before rotation), for link/body silhouettes.
export function box3(c: V3, q: Quat, sx: number, sy: number, sz: number, color: string): Seg3D[] {
  const corners: V3[] = [];
  for (const dx of [-1, 1])
    for (const dy of [-1, 1])
      for (const dz of [-1, 1])
        corners.push(v3.add(c, quat.rotate(q, [(dx * sx) / 2, (dy * sy) / 2, (dz * sz) / 2])));
  const e: [number, number][] = [
    [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3],
    [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7],
  ];
  return e.map(([i, j]) => seg3(corners[i], corners[j], color, { width: 1.5 }));
}

// Render a primitive list back-to-front with depth cueing. Labels always
// paint last (they are UI, not geometry) and ignore depth attenuation.
export function Scene3D({ cam, prims }: { cam: Camera3D; prims: Prim3D[] }) {
  type Drawn = { depth: number; el: ReactNode };
  const drawn: Drawn[] = [];
  const labels: ReactNode[] = [];
  const staged: { prim: Prim3D; pts: P2[] }[] = prims.map((prim) => {
    const pts =
      prim.kind === "seg"
        ? [project(cam, prim.a), project(cam, prim.b)]
        : prim.kind === "poly"
          ? prim.pts.map((p) => project(cam, p))
          : [project(cam, prim.p)];
    return { prim, pts };
  });
  const allDepths = staged.flatMap((s) => s.pts.map((p) => p.depth));
  const dMin = Math.min(...allDepths, Infinity);
  const dMax = Math.max(...allDepths, -Infinity);
  const span = Math.max(dMax - dMin, 1e-6);
  let k = 0;
  for (const { prim, pts } of staged) {
    const depth = pts.reduce((s, p) => s + p.depth, 0) / pts.length;
    const t = (depth - dMin) / span;
    const cue = depthStyle(t);
    if (prim.kind === "seg") {
      drawn.push({
        depth,
        el: (
          <line
            key={k++}
            x1={pts[0].x}
            y1={pts[0].y}
            x2={pts[1].x}
            y2={pts[1].y}
            stroke={prim.color}
            strokeWidth={(prim.width ?? 2) * cue.width}
            strokeDasharray={prim.dash}
            opacity={(prim.opacity ?? 1) * cue.opacity}
            strokeLinecap="round"
          />
        ),
      });
    } else if (prim.kind === "dot") {
      drawn.push({
        depth,
        el: (
          <circle
            key={k++}
            cx={pts[0].x}
            cy={pts[0].y}
            r={(prim.r ?? 4) * pts[0].scale}
            fill={prim.color}
            stroke={prim.stroke}
            opacity={cue.opacity}
          />
        ),
      });
    } else if (prim.kind === "poly") {
      drawn.push({
        depth,
        el: (
          <polygon
            key={k++}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={prim.fill}
            opacity={prim.opacity ?? 0.25}
            stroke={prim.stroke}
          />
        ),
      });
    } else {
      labels.push(
        <text
          key={`L${k++}`}
          x={pts[0].x + (prim.dx ?? 0)}
          y={pts[0].y + (prim.dy ?? 0)}
          fill={prim.color}
          fontSize={prim.size ?? 13}
          fontFamily={MONO}
          textAnchor={prim.anchor ?? "start"}
        >
          {prim.text}
        </text>,
      );
    }
  }
  drawn.sort((a, b) => b.depth - a.depth);
  return (
    <g>
      {drawn.map((d) => d.el)}
      {labels}
    </g>
  );
}

// Pointer-drag orbit control. Returns camera angles plus svgProps to spread
// onto the Stage's <svg>. Dragging feels like rotating the object itself.
export function useOrbit(initialYaw = -30, initialPitch = 22) {
  const [yawDeg, setYaw] = useState(initialYaw);
  const [pitchDeg, setPitch] = useState(initialPitch);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const svgProps: React.SVGProps<SVGSVGElement> = {
    onPointerDown: (e) => {
      drag.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current = { x: e.clientX, y: e.clientY };
      setYaw((v) => v + dx * 0.45);
      setPitch((v) => clamp(v + dy * 0.45, -5, 80));
    },
    onPointerUp: (e) => {
      drag.current = null;
      (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    },
    style: { cursor: "grab", touchAction: "none" },
  };
  const reset = () => {
    setYaw(initialYaw);
    setPitch(initialPitch);
  };
  return { yawDeg, pitchDeg, svgProps, reset, setYaw, setPitch } as const;
}

// Convert a screen-space pointer delta (stage units) into a world-space move
// of point p constrained to the z = p.z plane, by inverting the projection's
// local Jacobian. This is what makes "drag the object on the floor" feel
// exact under any camera angle.
export function groundDrag(cam: Camera3D, p: V3, dsx: number, dsy: number): V3 {
  const e = 0.01;
  const p0 = project(cam, p);
  const px = project(cam, [p[0] + e, p[1], p[2]]);
  const py = project(cam, [p[0], p[1] + e, p[2]]);
  const a = (px.x - p0.x) / e;
  const b = (py.x - p0.x) / e;
  const c = (px.y - p0.y) / e;
  const d = (py.y - p0.y) / e;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-6) return p;
  const dx = (d * dsx - b * dsy) / det;
  const dy = (-c * dsx + a * dsy) / det;
  return [p[0] + dx, p[1] + dy, p[2]];
}

// --- Figure chrome ----------------------------------------------------------

// Fixed legend lane: color-keyed entries in the top-right of the stage. Keeps
// every figure's legend in the same place so the reader never hunts for it.
export function Legend({
  items,
  x = STAGE_W - 200,
  y = 30,
}: {
  items: { color: string; label: string; dash?: boolean }[];
  x?: number;
  y?: number;
}) {
  return (
    <g>
      {items.map((it, i) => (
        <g key={i} transform={`translate(${x} ${y + i * 22})`}>
          {it.dash ? (
            <line x1={0} y1={-4} x2={18} y2={-4} stroke={it.color} strokeWidth={2.5} strokeDasharray="4 3" />
          ) : (
            <circle cx={9} cy={-4} r={5} fill={it.color} />
          )}
          <text x={26} y={0} fontFamily={MONO} fontSize={12.5} fill={R.world}>
            {it.label}
          </text>
        </g>
      ))}
    </g>
  );
}

// Fixed readout lane, top-left: a stack of `name  value` rows in mono, the
// place live numbers go so they never collide with the art (§4.6).
export function Readout({
  rows,
  x = 24,
  y = 32,
}: {
  rows: { label: string; value: string; color?: string }[];
  x?: number;
  y?: number;
}) {
  return (
    <g>
      {rows.map((r, i) => (
        <g key={i}>
          <text x={x} y={y + i * 21} fontFamily={MONO} fontSize={13} fill={R.world}>
            {r.label}
          </text>
          <text x={x + 118} y={y + i * 21} fontFamily={MONO} fontSize={13} fill={r.color ?? R.ink} fontWeight={600}>
            {r.value}
          </text>
        </g>
      ))}
    </g>
  );
}

// The standard play / step / reset trio, so every animated figure exposes the
// same transport controls in the same order.
export function Transport({
  playing,
  onPlay,
  onStep,
  onReset,
  stepLabel = "step",
}: {
  playing: boolean;
  onPlay: () => void;
  onStep?: () => void;
  onReset: () => void;
  stepLabel?: string;
}) {
  return (
    <>
      <Btn onClick={onPlay}>{playing ? "⏸ pause" : "▶ play"}</Btn>
      {onStep && <Btn onClick={onStep}>⏭ {stepLabel}</Btn>}
      <Btn onClick={onReset}>↺ reset</Btn>
    </>
  );
}
