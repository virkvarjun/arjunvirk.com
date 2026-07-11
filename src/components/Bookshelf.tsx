import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { books } from "@/lib/books";

// Packed spine shelf in the style of adammaj.com/reading: books sit flush like
// a real shelf, titles run bottom-to-top, and hovering a spine lifts it out and
// reveals its title and author. Text-only (no cover art); scrolls horizontally.

// One color per book (cycles if more books are added). Light spines get dark text.
const SPINES = [
  { bg: "#2f3542", fg: "#f4f4f3" }, // Meditations
  { bg: "#6b2f2f", fg: "#f4f4f3" }, // The 48 Laws of Power
  { bg: "#b0894a", fg: "#241a0e" }, // Sapiens
  { bg: "#2f6b52", fg: "#f4f4f3" }, // The Psychology of Money
  { bg: "#8a6a2b", fg: "#f8f4ea" }, // Think and Grow Rich
  { bg: "#24405e", fg: "#eef2f7" }, // The Almanack of Naval Ravikant
  { bg: "#1c1c22", fg: "#ececec" }, // Elon Musk
  { bg: "#b5502a", fg: "#fdf1ea" }, // Shoe Dog
  { bg: "#e7e1d3", fg: "#2b2a26" }, // Limitless
];
const WIDTHS = [44, 40, 52, 46, 42, 48, 44, 50, 46];
const HEIGHTS = [256, 262, 250, 258, 254, 260, 252, 258, 256];

export default function Bookshelf() {
  return (
    <div className="mb-12">
      {/* pt gives headroom for the hover lift + tooltip so nothing is clipped */}
      <div className="flex items-end overflow-x-auto pb-1 pt-20">
        {books.map((book, i) => {
          const { bg, fg } = SPINES[i % SPINES.length];
          const width = WIDTHS[i % WIDTHS.length];
          const height = HEIGHTS[i % HEIGHTS.length];
          return (
            <Link
              key={book.slug}
              href={`/books/${book.slug}`}
              aria-label={`${book.title} by ${book.author}`}
              className="group relative flex shrink-0 items-center justify-center transition-transform duration-300 ease-out hover:-translate-y-5 hover:shadow-xl hover:z-10 motion-reduce:transition-none"
              style={{ width, height, background: bg }}
            >
              {/* vertical title, reading bottom-to-top */}
              <span
                className="max-h-[88%] overflow-hidden px-1 text-center text-[12px] font-semibold leading-tight tracking-tight rotate-180 [writing-mode:vertical-rl]"
                style={{ color: fg }}
              >
                {book.title}
              </span>
              {/* tooltip revealed on hover */}
              <span className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100">
                <span className="font-medium text-[var(--foreground)]">
                  {book.title}
                </span>
                <span className="text-[var(--muted)]">{"  ·  "}</span>
                <span className="text-[var(--muted)]">{book.author}</span>
              </span>
            </Link>
          );
        })}
        {/* scroll affordance */}
        <span className="ml-2 flex h-[256px] shrink-0 items-center text-[var(--muted)]">
          <ChevronRight size={22} />
        </span>
      </div>
    </div>
  );
}
