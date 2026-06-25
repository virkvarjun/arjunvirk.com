import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { literatureReviews } from "@/lib/literature";

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

      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] mb-4">
        Table of contents
      </p>

      <ol className="border-t border-[var(--border)]">
        {literatureReviews.map((category) => (
          <li key={category.key} className="border-b border-[var(--border)]">
            <Link
              href={`/literature-reviews/${category.key}`}
              className="group flex items-baseline gap-4 py-3.5"
            >
              <span className="flex-1 text-sm font-medium group-hover:underline underline-offset-2">
                {category.title}
              </span>
              <span className="shrink-0 text-xs font-mono text-[var(--muted)]">
                {category.papers.length}{" "}
                {category.papers.length === 1 ? "paper" : "papers"}
              </span>
              <ArrowRight
                size={14}
                className="mt-0.5 shrink-0 text-[var(--border)] transition-colors group-hover:text-[var(--foreground)]"
              />
            </Link>
          </li>
        ))}
      </ol>

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo, {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
