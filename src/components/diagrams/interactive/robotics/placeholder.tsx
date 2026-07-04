"use client";

import { C, MONO } from "../../frame";

// Temporary placeholder shown in a figure slot before its interactive
// component is built. Keeps the guide navigable with a labeled stand-in.
export function RbPlaceholder({ label = "Interactive figure" }: { label?: string }) {
  return (
    <svg viewBox="0 0 720 300" className="h-auto w-full" role="img" aria-label={label}>
      <rect
        x="8"
        y="8"
        width="704"
        height="284"
        rx="12"
        fill="none"
        stroke={C.line}
        strokeWidth="2"
        strokeDasharray="6 8"
      />
      <text
        x="360"
        y="150"
        textAnchor="middle"
        fontFamily={MONO}
        fontSize="18"
        fill={C.muted}
      >
        {label}
      </text>
      <text
        x="360"
        y="178"
        textAnchor="middle"
        fontFamily={MONO}
        fontSize="13"
        fill={C.muted}
      >
        in progress
      </text>
    </svg>
  );
}
