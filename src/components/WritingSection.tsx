import Link from "next/link";
import { writing } from "@/lib/data";
import { ArrowUpRight } from "lucide-react";

export default function WritingSection() {
  return (
    <div className="space-y-10">
      {writing.map((category) => (
        <section key={category.key}>
          <div className="mb-3">
            <h2 className="text-sm font-semibold tracking-tight">
              {category.title}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {category.description}
            </p>
          </div>

          {category.chapters && category.chapters.length > 0 ? (
            <ul className="space-y-1.5">
              {category.chapters.map((chapter) => (
                <li key={chapter.slug}>
                  <Link
                    href={`/writing/${category.key}/${chapter.slug}`}
                    className="group flex items-baseline gap-3 text-sm hover:opacity-80 transition-opacity"
                  >
                    <span className="text-xs font-mono text-[var(--muted)] w-16 shrink-0">
                      Chapter {chapter.number}
                    </span>
                    <span className="font-medium group-hover:underline underline-offset-2">
                      {chapter.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
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
              Nothing here yet — coming soon.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
