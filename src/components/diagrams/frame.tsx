import type { ReactNode } from "react";

// Shared palette for chapter diagrams. Monochrome marks use the site's theme
// variables; a small set of accent colors distinguishes classes/clusters.
export const C = {
  ink: "var(--foreground)",
  muted: "var(--muted)",
  line: "var(--border)",
  card: "var(--card)",
  grid: "#ececea",
  blue: "#3f5fd6",
  blueFill: "#dde3f8",
  coral: "#d9734f",
  coralFill: "#f6e0d6",
  green: "#3d9970",
  greenFill: "#d8efe4",
  violet: "#6b5cd6",
} as const;

// Diagram text uses Computer Modern (CMU Serif) to match the chapter math
// and the explainer videos. Scoped to diagrams only — the rest of the site
// keeps its own fonts. Fallbacks apply only if CMU Serif fails to load.
export const MONO = '"CMU Serif", ui-monospace, SFMono-Regular, Menlo, monospace';
export const SANS = '"CMU Serif", ui-serif, Georgia, serif';

// --- Shared SVG primitives (used across chapter diagram files) ---

export function Dot({
  x,
  y,
  fill,
  r = 4,
}: {
  x: number;
  y: number;
  fill: string;
  r?: number;
}) {
  return <circle cx={x} cy={y} r={r} fill={fill} />;
}

export function Ring({
  x,
  y,
  stroke,
  r = 5,
}: {
  x: number;
  y: number;
  stroke: string;
  r?: number;
}) {
  return <circle cx={x} cy={y} r={r} fill="none" stroke={stroke} strokeWidth={1.6} />;
}

export function Label({
  x,
  y,
  children,
  fill = C.muted,
  size = 11,
  anchor = "start",
  weight,
  mono = true,
}: {
  x: number;
  y: number;
  children: string;
  fill?: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  mono?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={fill}
      fontFamily={mono ? MONO : SANS}
      textAnchor={anchor}
      fontWeight={weight}
    >
      {children}
    </text>
  );
}

/** A line segment ending in a small arrowhead at (x2,y2). */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
  width = 2,
  head = 7,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width?: number;
  head?: number;
}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a1 = ang + Math.PI - 0.4;
  const a2 = ang + Math.PI + 0.4;
  return (
    <g stroke={color} fill={color}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={width} />
      <polygon
        stroke="none"
        points={`${x2},${y2} ${x2 + head * Math.cos(a1)},${y2 + head * Math.sin(a1)} ${x2 + head * Math.cos(a2)},${y2 + head * Math.sin(a2)}`}
      />
    </g>
  );
}

/** Build an SVG polyline `points` string by sampling f over [x0,x1]. */
export function plotCurve(
  f: (x: number) => number,
  x0: number,
  x1: number,
  n: number,
  mapX: (x: number) => number,
  mapY: (y: number) => number,
): string {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push(`${mapX(x).toFixed(2)},${mapY(f(x)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/**
 * Wrapper for an interactive diagram, which renders its own SVG plus HTML
 * controls (sliders, buttons) — so, unlike DiagramFrame, it does not provide
 * the <svg> element itself.
 */
export function InteractiveFrame({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: string;
}) {
  return (
    <figure className="my-7">
      <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        {children}
      </div>
      {caption && (
        <figcaption className="mt-2 text-xs text-[var(--muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Figure wrapper: a bordered card holding an SVG, with an optional caption. */
export function DiagramFrame({
  children,
  caption,
  viewBox = "0 0 400 240",
  label,
}: {
  children: ReactNode;
  caption?: string;
  viewBox?: string;
  label?: string;
}) {
  return (
    <figure className="my-7">
      <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <svg
          viewBox={viewBox}
          className="h-auto w-full"
          role="img"
          aria-label={label ?? caption ?? "diagram"}
        >
          {children}
        </svg>
      </div>
      {caption && (
        <figcaption className="mt-2 text-xs text-[var(--muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
