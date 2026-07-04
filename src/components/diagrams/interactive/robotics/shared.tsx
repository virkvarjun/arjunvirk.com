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
