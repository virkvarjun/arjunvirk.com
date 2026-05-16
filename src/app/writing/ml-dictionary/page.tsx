import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { mlDictionary } from "@/lib/dictionary";

function slugify(term: string) {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function MLDictionaryPage() {
  const sorted = [...mlDictionary].sort((a, b) =>
    a.term.localeCompare(b.term),
  );

  const groups = sorted.reduce<Record<string, typeof sorted>>((acc, t) => {
    const letter = t.term[0].toUpperCase();
    (acc[letter] ||= []).push(t);
    return acc;
  }, {});

  const letters = Object.keys(groups).sort();

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
          Writing &middot; Glossary
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">ML Dictionary</h1>
        <p className="mt-3 text-base text-[var(--muted)] leading-relaxed">
          A running glossary of machine learning terms. {sorted.length} entries.
        </p>

        <nav className="mt-8 flex flex-wrap gap-2">
          {letters.map((l) => (
            <a
              key={l}
              href={`#letter-${l}`}
              className="font-mono text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-neutral-300 transition-colors"
            >
              {l}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-10">
          {letters.map((letter) => (
            <section key={letter} id={`letter-${letter}`} className="scroll-mt-8">
              <h2 className="text-xs font-mono text-[var(--muted)] mb-4 pb-1 border-b border-[var(--border)]">
                {letter}
              </h2>
              <dl className="space-y-5">
                {groups[letter].map((entry) => (
                  <div
                    key={entry.term}
                    id={slugify(entry.term)}
                    className="scroll-mt-8"
                  >
                    <dt className="text-sm font-semibold">{entry.term}</dt>
                    <dd className="mt-1 text-sm text-[var(--muted)] leading-relaxed">
                      {entry.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </article>

      <footer className="py-10 mt-16 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)]">
          built with next.js in waterloo &mdash; {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
