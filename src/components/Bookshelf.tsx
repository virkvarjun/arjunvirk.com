import Link from "next/link";
import { books } from "@/lib/books";

// Interactive spine shelf, in the spirit of adammaj.com/reading: each book is a
// spine you can hover to lift it out and reveal its title and author. Rendered
// as styled CSS spines (no cover art), so it stays lightweight and text-only.

const SPINE_COLORS = [
  "#3b3a4e",
  "#6b3b3b",
  "#2f4a3f",
  "#7a5a2e",
  "#2d3e57",
  "#4a4a3a",
  "#7a3f2e",
  "#3f5560",
  "#5a3a5a",
];
// Slight per-spine variation in width and height reads like a real shelf.
const WIDTHS = [46, 40, 52, 44, 48, 42, 50, 44, 46];
const HEIGHTS = [252, 266, 242, 262, 250, 268, 246, 258, 256];

export default function Bookshelf() {
  return (
    <div className="mb-12">
      {/* pt gives headroom for the hover lift + tooltip so nothing is clipped */}
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1 pt-20">
        {books.map((book, i) => {
          const color = SPINE_COLORS[i % SPINE_COLORS.length];
          const width = WIDTHS[i % WIDTHS.length];
          const height = HEIGHTS[i % HEIGHTS.length];
          return (
            <Link
              key={book.slug}
              href={`/books/${book.slug}`}
              aria-label={`${book.title} by ${book.author}`}
              className="group relative flex shrink-0 items-center justify-center rounded-t-[3px] rounded-b-[1px] shadow-sm transition-transform duration-300 ease-out hover:-translate-y-5 hover:shadow-xl motion-reduce:transition-none"
              style={{ width, height, background: color }}
            >
              {/* pages edge */}
              <span
                aria-hidden
                className="absolute bottom-1.5 right-[3px] top-1.5 w-[3px] rounded-sm bg-white/15"
              />
              {/* vertical title running down the spine */}
              <span className="max-h-[86%] overflow-hidden px-1 text-center text-[12px] font-semibold leading-tight tracking-tight text-white/95 [writing-mode:vertical-rl]">
                {book.title}
              </span>
              {/* tooltip revealed on hover */}
              <span className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100">
                <span className="font-medium text-[var(--foreground)]">
                  {book.title}
                </span>
                <span className="text-[var(--muted)]">{"  ·  "}</span>
                <span className="text-[var(--muted)]">{book.author}</span>
              </span>
            </Link>
          );
        })}
      </div>
      {/* the shelf board the spines rest on */}
      <div className="h-2 rounded-sm bg-[var(--card)] ring-1 ring-[var(--border)]" />
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        Hover a spine, then click to open its lessons.
      </p>
    </div>
  );
}
