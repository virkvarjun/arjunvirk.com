import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { books } from "@/lib/books";

export default function BooksPage() {
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

      <header className="pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Books</h1>
        <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
          Books I have read, with the lessons I took from each.
        </p>
        <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
          Format inspired by{" "}
          <a
            href="https://adammaj.com/reading"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
          >
            Adam Majmudar&apos;s reading list
          </a>
          .
        </p>
      </header>

      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] mb-4">
        Reading list
      </p>

      <ol className="border-t border-[var(--border)]">
        {books.map((book) => (
          <li key={book.slug} className="border-b border-[var(--border)]">
            <Link
              href={`/books/${book.slug}`}
              className="group flex items-baseline gap-4 py-3.5"
            >
              <span className="flex-1 text-sm font-medium group-hover:underline underline-offset-2">
                {book.title}
              </span>
              <span className="shrink-0 text-xs font-mono text-[var(--muted)]">
                {book.author}
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
