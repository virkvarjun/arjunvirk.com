import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { books } from "@/lib/books";

// Packed spine shelf in the style of adammaj.com/reading: books sit flush like
// a real shelf, titles run bottom-to-top, and hovering a spine lifts it out and
// reveals its title and author. Text-only (no cover art); scrolls horizontally.

// One color per book, chosen to evoke that book's actual cover (cycles if more
// books are added). Light spines get dark text.
const SPINES = [
  { bg: "#e7dfcf", fg: "#26251f" }, // Meditations — classical parchment
  { bg: "#151515", fg: "#d9b45b" }, // The 48 Laws of Power — black + gold
  { bg: "#f1eee6", fg: "#262521" }, // Sapiens — white with red thumbprint
  { bg: "#e6e7e3", fg: "#262521" }, // The Psychology of Money — light
  { bg: "#1f2a44", fg: "#dcc17a" }, // Think and Grow Rich — navy + gold
  { bg: "#9fbfd4", fg: "#1c2b36" }, // The Almanack of Naval Ravikant — sky blue
  { bg: "#d7d9dd", fg: "#26262a" }, // Elon Musk — silver/white
  { bg: "#c0562a", fg: "#fdf1ea" }, // Shoe Dog — burnt orange
  { bg: "#2f7fbf", fg: "#eef6fb" }, // Limitless — bright blue
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
              {/* hairline seam between adjacent spines */}
              <span
                aria-hidden
                className="absolute inset-y-0 right-0 w-px bg-black/10"
              />
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
