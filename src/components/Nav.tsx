"use client";

import { motion } from "framer-motion";

const tabs = ["work", "projects", "writing"] as const;
export type Tab = (typeof tabs)[number];

export default function Nav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav className="flex gap-1 border-b border-[var(--border)] mb-8">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`relative pb-3 px-1 mr-4 text-sm font-medium transition-colors capitalize ${
            active === tab
              ? "text-[var(--foreground)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {tab}
          {active === tab && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--foreground)] rounded-full"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}
