import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { literatureReviews } from "@/lib/literature";
import ArticleSections from "@/components/ArticleSections";

export function generateStaticParams() {
  return literatureReviews.flatMap((category) =>
    category.papers.map((paper) => ({
      category: category.key,
      paper: paper.slug,
    })),
  );
}

export default async function PaperReviewPage({
  params,
}: {
  params: Promise<{ category: string; paper: string }>;
}) {
  const { category: categoryKey, paper: paperSlug } = await params;

  const category = literatureReviews.find((c) => c.key === categoryKey);
  if (!category) notFound();

  const paper = category.papers.find((p) => p.slug === paperSlug);
  if (!paper) notFound();

  return (
    <main className="max-w-2xl mx-auto px-6 w-full">
      <div className="pt-12 pb-6">
        <Link
          href={`/literature-reviews/${category.key}`}
          className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={12} />
          {category.title}
        </Link>
      </div>

      <article>
        <p className="text-xs text-[var(--muted)] font-mono mb-2">
          {[category.title, paper.venue, paper.year].filter(Boolean).join(" · ")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight leading-tight">
          {paper.title}
        </h1>
        {paper.authors && (
          <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
            {paper.authors}
          </p>
        )}
        {paper.summary && (
          <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
            {paper.summary}
          </p>
        )}

        <ArticleSections sections={paper.sections} />

        {paper.citation && (
          <section className="mt-12">
            <h2 className="text-base font-semibold tracking-tight mb-3">
              Citation
            </h2>
            <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-xs leading-relaxed">
              <code className="font-mono text-[var(--foreground)] whitespace-pre">
                {paper.citation}
              </code>
            </pre>
          </section>
        )}
      </article>

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo, {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
