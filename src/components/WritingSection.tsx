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

          {category.posts.length === 0 ? (
            <p className="text-xs text-[var(--muted)] italic">
              Nothing here yet — coming soon.
            </p>
          ) : (
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
          )}
        </section>
      ))}
    </div>
  );
}
