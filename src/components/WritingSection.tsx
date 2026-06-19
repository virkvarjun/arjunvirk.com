import Link from "next/link";
import { writing } from "@/lib/data";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export default function WritingSection() {
  return (
    <div className="space-y-10">
      {writing.map((category) => {
        const reflections = category.kind === "reflections";
        const chapters = category.chapters ?? [];
        const collapsed =
          reflections && category.collapseSingle && chapters.length === 1;

        // Collapsed single reflection (e.g. Becoming): show just its title.
        if (collapsed) {
          const r = chapters[0];
          return (
            <section key={category.key}>
              <Link
                href={`/writing/${category.key}/${r.slug}`}
                className="group inline-flex items-baseline gap-2 hover:opacity-80 transition-opacity"
              >
                <h2 className="text-sm font-semibold tracking-tight group-hover:underline underline-offset-2">
                  {r.title}
                </h2>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {r.number}
                </span>
                <ArrowRight size={13} className="text-[var(--muted)]" />
              </Link>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {category.description}
              </p>
            </section>
          );
        }

        return (
          <section key={category.key}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold tracking-tight">
                {category.title}
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {category.description}
              </p>
            </div>

            {chapters.length > 0 ? (
              reflections ? (
                // Reflections: list each entry, linking straight to the piece.
                <div className="space-y-2">
                  {chapters.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/writing/${category.key}/${r.slug}`}
                      className="group flex items-baseline gap-3 text-sm font-medium hover:opacity-80 transition-opacity"
                    >
                      <span className="font-mono text-xs text-[var(--muted)] w-40 shrink-0">
                        {r.number}
                      </span>
                      <span className="group-hover:underline underline-offset-2">
                        {r.title}
                      </span>
                      <ArrowRight
                        size={13}
                        className="text-[var(--muted)] shrink-0"
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                // Guides: a table of contents.
                <Link
                  href={`/writing/${category.key}`}
                  className="group inline-flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  <span className="group-hover:underline underline-offset-2">
                    Table of contents
                  </span>
                  <span className="font-mono text-xs text-[var(--muted)]">
                    {chapters.length}{" "}
                    {chapters.length === 1 ? "chapter" : "chapters"}
                  </span>
                  <ArrowRight size={13} className="text-[var(--muted)]" />
                </Link>
              )
            ) : category.link ? (
              <Link
                href={category.link.href}
                className="group inline-flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
              >
                <span className="group-hover:underline underline-offset-2">
                  {category.link.label}
                </span>
                <ArrowUpRight size={13} className="text-[var(--muted)]" />
              </Link>
            ) : category.posts && category.posts.length > 0 ? (
              <div className="space-y-4">
                {category.posts.map((post, i) => (
                  <a
                    key={i}
                    href={post.link}
                    className="group flex items-start justify-between gap-4 hover:opacity-80 transition-opacity"
                  >
                    <div>
                      <p className="text-sm font-medium group-hover:underline underline-offset-2">
                        {post.title}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--muted)]">
                        {post.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <span className="text-xs text-[var(--muted)]">
                        {post.date}
                      </span>
                      <ArrowUpRight size={13} className="text-[var(--muted)]" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)] italic">
                Nothing here yet, coming soon.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
