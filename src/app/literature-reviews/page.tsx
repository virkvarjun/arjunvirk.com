import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LiteratureReviewsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 w-full">
      <div className="pt-12 pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={12} />
          back
        </Link>
      </div>

      <header className="pb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Literature Reviews
        </h1>
        <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
          A compilation of research literature reviews and papers I have read.
        </p>
      </header>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Table of Contents
        </h2>
        <ul className="mt-4 space-y-2 text-base">
          {[
            { label: "Robot Learning", id: "robot-learning" },
            { label: "Machine Learning", id: "machine-learning" },
            { label: "Reinforcement Learning", id: "reinforcement-learning" },
            { label: "Biology/Medical", id: "biology-medical" },
          ].map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo, {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
