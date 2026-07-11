import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { books } from "@/lib/books";
import ArticleSections from "@/components/ArticleSections";

export function generateStaticParams() {
  return books.map((b) => ({ book: b.slug }));
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ book: string }>;
}) {
  const { book: slug } = await params;
  const book = books.find((b) => b.slug === slug);
  if (!book) notFound();

  return (
    <main className="max-w-2xl mx-auto px-6 w-full">
      <div className="pt-12 pb-6">
        <Link
          href="/books"
          className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={12} />
          Books
        </Link>
      </div>

      <article>
        <p className="text-xs text-[var(--muted)] font-mono mb-2">Books</p>
        <h1 className="text-3xl font-semibold tracking-tight leading-tight">
          {book.title}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
          {book.author}
        </p>

        <ArticleSections sections={book.sections} />
      </article>

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo, {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
