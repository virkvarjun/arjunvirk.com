"use client";

import { useState } from "react";

/**
 * "Check your understanding" box, matching the ML Bible's expandable
 * question boxes with a Show answer ▸ / Hide answer ▾ toggle.
 */
export default function Check({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-5 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] mb-1.5">
        Check your understanding
      </p>
      <p className="text-sm leading-relaxed font-medium">{q}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
      >
        {open ? "Hide answer ▾" : "Show answer ▸"}
      </button>
      {open && (
        <div className="mt-2 text-sm leading-relaxed border-t border-[var(--border)] pt-2 [&>p]:my-1.5">
          {children}
        </div>
      )}
    </div>
  );
}
