import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { rlGuideChapters, RL_PARTS } from "@/lib/rl-guide";

export const metadata = {
  title: "RL Bible",
  description:
    "A from-scratch guide to reinforcement learning — bandits, Bellman equations, deep RL, offline RL, world models, and vision-language-action policies for robots.",
};

export default function RlGuideContentsPage() {
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

      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">RL Bible</h1>
        <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
          A from-scratch guide to reinforcement learning — bandits, Bellman
          equations, deep RL, offline RL, world models, and
          vision-language-action policies for robots.
        </p>
      </header>

      {RL_PARTS.map((part) => {
        const group = rlGuideChapters.filter((c) => c.part === part);
        if (group.length === 0) return null;
        return (
          <section key={part} className="mb-10">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] mb-4">
              {part}
            </p>
            <ol className="border-t border-[var(--border)]">
              {group.map((c) => (
                <li key={c.slug} className="border-b border-[var(--border)]">
                  <Link
                    href={`/writing/rl-guide/${c.slug}`}
                    className="group flex items-baseline gap-4 py-3.5"
                  >
                    <span className="text-xs font-mono text-[var(--muted)] shrink-0 w-20">
                      {c.label}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium group-hover:underline underline-offset-2">
                        {c.title}
                      </span>
                    </span>
                    <ArrowRight
                      size={14}
                      className="mt-0.5 shrink-0 text-[var(--border)] transition-colors group-hover:text-[var(--foreground)]"
                    />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo, {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
