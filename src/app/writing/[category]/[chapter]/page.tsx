import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { writing } from "@/lib/data";
import ChapterImage from "@/components/ChapterImage";
import { BlockMath, MathText } from "@/components/Math";
import { Diagram } from "@/components/diagrams";

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
  const isReflections = category.kind === "reflections";
  const prev = idx > 0 ? category.chapters[idx - 1] : null;
  const next =
    idx < category.chapters.length - 1 ? category.chapters[idx + 1] : null;

  const navLink =
    "inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors";
  const navDisabled =
    "inline-flex items-center gap-1 text-xs text-[var(--border)] cursor-default select-none";

  return (
    <main className="max-w-2xl mx-auto px-6 w-full">
      <div className="pt-12 pb-6 flex items-center justify-between gap-4">
        <Link
          href={isReflections ? "/writing" : `/writing/${category.key}`}
          className={navLink}
        >
          <ArrowLeft size={12} />
          {isReflections ? "Writing" : category.title}
        </Link>
        <nav className="flex items-center gap-4">
          {prev ? (
            <Link
              href={`/writing/${category.key}/${prev.slug}`}
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
              href={`/writing/${category.key}/${next.slug}`}
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

      <article>
        <p className="text-xs text-[var(--muted)] font-mono mb-2">
          {isReflections
            ? chapter.number
            : `${category.title} · Chapter ${chapter.number}`}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {chapter.title}
        </h1>
        {chapter.summary && (
          <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
            {chapter.summary}
          </p>
        )}
        {chapter.published && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
            Published {chapter.published}
            {chapter.updated && chapter.updated !== chapter.published
              ? ` · Updated ${chapter.updated}`
              : ""}
          </p>
        )}

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
                    <p
                      key={j}
                      className={`text-sm leading-relaxed ${section.italic ? "italic" : ""}`}
                    >
                      <MathText>{p}</MathText>
                    </p>
                  ))}
                </div>
              )}
              {section.equations && section.equations.length > 0 && (
                <div className="mt-1">
                  {section.equations.map((eq, j) => (
                    <BlockMath key={j}>{eq}</BlockMath>
                  ))}
                </div>
              )}
              {section.list && section.list.length > 0 && (
                <ul className="mt-3 space-y-2 pl-5 list-disc marker:text-[var(--muted)]">
                  {section.list.map((item, j) => (
                    <li key={j} className="text-sm leading-relaxed">
                      <MathText>{item}</MathText>
                    </li>
                  ))}
                </ul>
              )}
              {section.definitions && section.definitions.length > 0 && (
                <dl className="mt-4 space-y-4">
                  {section.definitions.map((d) => (
                    <div key={d.term}>
                      <dt className="text-sm font-semibold">{d.term}</dt>
                      <dd className="mt-0.5 text-sm text-[var(--muted)] leading-relaxed">
                        <MathText>{d.definition}</MathText>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {section.quiz && (
                <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Check your understanding
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed">
                    <MathText>{section.quiz.question}</MathText>
                  </p>
                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                      <span className="group-open:hidden">Show answer ▸</span>
                      <span className="hidden group-open:inline">Hide answer ▾</span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                      <MathText>{section.quiz.answer}</MathText>
                    </p>
                  </details>
                </div>
              )}
              {section.diagram && (
                <Diagram
                  id={section.diagram.id}
                  caption={section.diagram.caption}
                />
              )}
              {section.image && (
                <ChapterImage
                  label={section.image.label}
                  caption={section.image.caption}
                />
              )}
              {section.code && (
                <pre className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-xs leading-relaxed">
                  <code className="font-mono text-[var(--foreground)] whitespace-pre">
                    {section.code.content}
                  </code>
                </pre>
              )}
              {section.table && section.table.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                        {section.table.rows[0].map((cell, c) => (
                          <th
                            key={c}
                            className="px-3 py-2 text-left text-xs font-semibold align-top"
                          >
                            <MathText>{cell}</MathText>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.slice(1).map((row, r) => (
                        <tr
                          key={r}
                          className="border-b border-[var(--border)] last:border-0"
                        >
                          {row.map((cell, c) => (
                            <td
                              key={c}
                              className={`px-3 py-2 align-top ${c === 0 ? "font-medium" : "text-[var(--muted)]"}`}
                            >
                              <MathText>{cell}</MathText>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        {chapter.futureRef && (
          <aside className="mt-12 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
              Future reference
              {chapter.updated ? ` · as of ${chapter.updated}` : ""}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              <MathText>{chapter.futureRef}</MathText>
            </p>
          </aside>
        )}

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
          built with next.js in waterloo, {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
