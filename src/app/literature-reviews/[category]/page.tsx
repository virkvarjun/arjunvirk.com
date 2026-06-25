import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { literatureReviews } from "@/lib/literature";

export function generateStaticParams() {
  return literatureReviews.map((category) => ({ category: category.key }));
}

export default async function LiteratureCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categoryKey } = await params;

  const category = literatureReviews.find((c) => c.key === categoryKey);
  if (!category) notFound();

  return (
    <main className="max-w-2xl mx-auto px-6 w-full">
      <div className="pt-12 pb-6">
        <Link
          href="/literature-reviews"
          className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={12} />
          Literature Reviews
        </Link>
      </div>

      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {category.title}
        </h1>
        <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
          {category.description}
        </p>
      </header>

      {category.papers.length > 0 ? (
        <>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] mb-4">
            Table of contents
          </p>

          <ol className="border-t border-[var(--border)]">
            {category.papers.map((paper) => (
              <li
                key={paper.slug}
                className="border-b border-[var(--border)]"
              >
                <Link
                  href={`/literature-reviews/${category.key}/${paper.slug}`}
                  className="group flex items-start gap-4 py-3.5"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-medium group-hover:underline underline-offset-2">
                      {paper.title}
                    </span>
                    {(paper.authors || paper.year || paper.venue) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[paper.authors, paper.venue, paper.year]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  <ArrowRight
                    size={14}
                    className="mt-0.5 shrink-0 text-[var(--border)] transition-colors group-hover:text-[var(--foreground)]"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)] italic">
          Nothing here yet, coming soon.
        </p>
      )}

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo, {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
