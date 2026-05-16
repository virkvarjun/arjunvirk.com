import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { writing } from "@/lib/data";
import ChapterImage from "@/components/ChapterImage";

export function generateStaticParams() {
  return writing.flatMap((category) =>
    (category.chapters ?? []).map((chapter) => ({
      category: category.key,
      chapter: chapter.slug,
    })),
  );
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ category: string; chapter: string }>;
}) {
  const { category: categoryKey, chapter: chapterSlug } = await params;

  const category = writing.find((c) => c.key === categoryKey);
  if (!category || !category.chapters) notFound();

  const idx = category.chapters.findIndex((c) => c.slug === chapterSlug);
  if (idx === -1) notFound();

  const chapter = category.chapters[idx];
  const prev = idx > 0 ? category.chapters[idx - 1] : null;
  const next =
    idx < category.chapters.length - 1 ? category.chapters[idx + 1] : null;

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

      <article>
        <p className="text-xs text-[var(--muted)] font-mono mb-2">
          {category.title} &middot; Chapter {chapter.number}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {chapter.title}
        </h1>
        <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
          {chapter.summary}
        </p>

        <div className="mt-10 space-y-7">
          {chapter.sections.map((section, i) => (
            <section key={i}>
              {section.heading && (
                <h2 className="text-base font-semibold tracking-tight mb-3">
                  {section.heading}
                </h2>
              )}
              {section.paragraphs && section.paragraphs.length > 0 && (
                <div className="space-y-3">
                  {section.paragraphs.map((p, j) => (
                    <p key={j} className="text-sm leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              )}
              {section.definitions && section.definitions.length > 0 && (
                <dl className="mt-4 space-y-4">
                  {section.definitions.map((d) => (
                    <div key={d.term}>
                      <dt className="text-sm font-semibold">{d.term}</dt>
                      <dd className="mt-0.5 text-sm text-[var(--muted)] leading-relaxed">
                        {d.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {section.image && (
                <ChapterImage
                  label={section.image.label}
                  caption={section.image.caption}
                />
              )}
            </section>
          ))}
        </div>

        <nav className="mt-16 pt-6 border-t border-[var(--border)] flex items-center justify-between gap-4 text-sm">
          {prev ? (
            <Link
              href={`/writing/${category.key}/${prev.slug}`}
              className="group flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>
                <span className="block text-[10px] uppercase tracking-wider">
                  Previous
                </span>
                <span className="block text-sm font-medium">{prev.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/writing/${category.key}/${next.slug}`}
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
          )}
        </nav>
      </article>

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo &mdash; {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
