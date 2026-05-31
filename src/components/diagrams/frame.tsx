import type { ReactNode } from "react";

// Shared palette for chapter diagrams. Monochrome marks use the site's theme
// variables; a small set of accent colors distinguishes classes/clusters.
export const C = {
  ink: "var(--foreground)",
  muted: "var(--muted)",
  line: "var(--border)",
  grid: "#ececea",
  blue: "#3f5fd6",
  blueFill: "#dde3f8",
  coral: "#d9734f",
  coralFill: "#f6e0d6",
  green: "#3d9970",
  greenFill: "#d8efe4",
  violet: "#6b5cd6",
} as const;

export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
export const SANS = "ui-sans-serif, system-ui, sans-serif";

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
