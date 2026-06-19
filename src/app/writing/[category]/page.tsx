import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { writing } from "@/lib/data";

export function generateStaticParams() {
  return writing
    .filter((category) => category.chapters && category.chapters.length > 0)
    .map((category) => ({ category: category.key }));
}

export default async function CategoryContentsPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categoryKey } = await params;

  const category = writing.find((c) => c.key === categoryKey);
  if (!category || !category.chapters || category.chapters.length === 0) {
    notFound();
  }

  const isReflections = category.kind === "reflections";

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
        <h1 className="text-3xl font-semibold tracking-tight">
          {category.title}
        </h1>
        <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
          {category.description}
        </p>
      </header>

      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] mb-4">
        Table of contents
      </p>

      <ol className="border-t border-[var(--border)]">
        {category.chapters.map((chapter) => (
          <li key={chapter.slug} className="border-b border-[var(--border)]">
            <Link
              href={`/writing/${category.key}/${chapter.slug}`}
              className="group flex items-baseline gap-4 py-3.5"
            >
              <span
                className={`text-xs font-mono text-[var(--muted)] shrink-0 ${
                  isReflections ? "w-44" : "w-20"
                }`}
              >
                {isReflections ? chapter.number : `Chapter ${chapter.number}`}
              </span>
              <span className="flex-1 text-sm font-medium group-hover:underline underline-offset-2">
                {chapter.title}
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
