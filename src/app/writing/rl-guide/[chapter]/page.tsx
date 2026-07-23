import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  rlGuideChapters,
  getRlChapter,
  rlChapterExists,
  rlNeighbors,
} from "@/lib/rl-guide";
import { renderRlChapter } from "@/lib/rl-mdx";

export function generateStaticParams() {
  return rlGuideChapters.map((c) => ({ chapter: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const ch = getRlChapter(chapter);
  return ch
    ? { title: `${ch.title} · RL Bible`, description: ch.description }
    : {};
}

export default async function RlChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const ch = getRlChapter(chapter);
  if (!ch || !rlChapterExists(chapter)) notFound();

  const { prev, next } = rlNeighbors(chapter);
  const content = await renderRlChapter(chapter);

  const navLink =
    "inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors";
  const navDisabled =
    "inline-flex items-center gap-1 text-xs text-[var(--border)] cursor-default select-none";

  return (
    <main className="max-w-2xl mx-auto px-6 w-full">
      <div className="pt-12 pb-6 flex items-center justify-between gap-4">
        <Link href="/writing/rl-guide" className={navLink}>
          <ArrowLeft size={12} />
          RL Bible
        </Link>
        <nav className="flex items-center gap-4">
          {prev ? (
            <Link
              href={`/writing/rl-guide/${prev.slug}`}
              className={navLink}
              aria-label={`Previous chapter: ${prev.title}`}
            >
              <ArrowLeft size={13} />
              Prev
            </Link>
          ) : (
            <span className={navDisabled} aria-hidden="true">
              <ArrowLeft size={13} />
              Prev
            </span>
          )}
          {next ? (
            <Link
              href={`/writing/rl-guide/${next.slug}`}
              className={navLink}
              aria-label={`Next chapter: ${next.title}`}
            >
              Next
              <ArrowRight size={13} />
            </Link>
          ) : (
            <span className={navDisabled} aria-hidden="true">
              Next
              <ArrowRight size={13} />
            </span>
          )}
        </nav>
      </div>

      <article className="rl-prose">
        <p className="text-xs text-[var(--muted)] font-mono mb-2">
          RL Bible · {ch.label}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{ch.title}</h1>
        <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
          {ch.description}
        </p>

        <div className="mt-10">{content}</div>

        <nav className="mt-16 pt-6 border-t border-[var(--border)] flex items-center justify-between gap-4 text-sm">
          {prev ? (
            <Link
              href={`/writing/rl-guide/${prev.slug}`}
              className="group flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>
                <span className="block text-[10px] uppercase tracking-wider">
                  Prev
                </span>
                <span className="block text-sm font-medium">{prev.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/writing/rl-guide/${next.slug}`}
              className="group flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-right"
            >
              <span>
                <span className="block text-[10px] uppercase tracking-wider">
                  Next
                </span>
                <span className="block text-sm font-medium">{next.title}</span>
              </span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo, {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
