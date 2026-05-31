"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { landing, profile, type RichSegment } from "@/lib/data";

function RichText({ segments }: { segments: RichSegment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        typeof seg === "string" ? (
          <span key={i}>{seg}</span>
        ) : (
          <a
            key={i}
            href={seg.href}
            target={seg.href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2 decoration-1 hover:text-[var(--muted)] transition-colors"
          >
            {seg.text}
          </a>
        ),
      )}
    </>
  );
}

export default function Home() {
  const [open, setOpen] = useState(false);

  return (
    <main className="w-full max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-24">
      <div className="flex flex-col gap-10 md:flex-row-reverse md:items-start md:justify-between md:gap-12">
        <div className="max-w-xl">
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-normal tracking-tight">
            {profile.name}
          </h1>

          <p className="mt-6 max-w-md text-lg md:text-xl leading-snug text-[var(--foreground)]">
            {landing.subtitle}
          </p>

          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-7 flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-expanded={open}
          >
            More info
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              <ChevronDown size={14} strokeWidth={2.5} />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3.5 text-sm leading-relaxed text-[var(--foreground)] max-w-md">
                  {landing.more.map((para, i) => (
                    <p key={i}>
                      <RichText segments={para} />
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <nav className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
            {landing.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="hover:text-[var(--foreground)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="shrink-0">
          <div className="relative h-44 w-44 sm:h-52 sm:w-52 overflow-hidden rounded-2xl bg-[var(--card)] ring-1 ring-[var(--border)]">
            <div className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] text-4xl font-black text-[var(--muted)]/40">
              AV
            </div>
            {/* Drop a photo at /public/profile.jpg to replace the placeholder */}
            <img
              src="/profile.jpg"
              alt={profile.name}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
