import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import WritingSection from "@/components/WritingSection";

export default function WritingIndexPage() {
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
        <h1 className="text-3xl font-semibold tracking-tight">Writing</h1>
        <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
          Long-form guides, a running ML dictionary, and personal reflections.
        </p>
      </header>

      <WritingSection />

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo &mdash; {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
