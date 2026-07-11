import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { books } from "@/lib/books";

// 3D spine shelf in the style of adammaj.com/reading: books stand spine-out and
// packed; hovering a book turns it in 3D (rotateY) to reveal a generated cover
// with the title and author. Text-only, no copyrighted cover art.

// One color per book, chosen to evoke that book's cover (cycles if more added).
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
const SPINE_W = [70, 64, 78, 72, 66, 74, 68, 76, 70];
const HEIGHTS = [272, 284, 264, 280, 276, 288, 268, 282, 276];
const COVER_W = 176;

export default function Bookshelf() {
  return (
    <div className="mb-12">
      {/* pt/px give headroom so the hover turn is never clipped */}
      <div className="flex items-end overflow-x-auto pb-2 pt-16">
        {books.map((book, i) => {
          const { bg, fg } = SPINES[i % SPINES.length];
          const spineW = SPINE_W[i % SPINE_W.length];
          const height = HEIGHTS[i % HEIGHTS.length];
          return (
            <Link
              key={book.slug}
              href={`/books/${book.slug}`}
              aria-label={`${book.title} by ${book.author}`}
              className="group relative shrink-0 hover:z-10"
              style={{ width: spineW, height, perspective: "1100px" }}
            >
              {/* the 3D book: turns on hover to reveal the cover */}
              <div className="relative h-full w-full [transform-style:preserve-3d] [transform-origin:left_center] transition-transform duration-500 ease-out group-hover:[transform:translateY(-8px)_rotateY(56deg)] motion-reduce:transition-none motion-reduce:group-hover:[transform:none]">
                {/* spine face (shown on the shelf) */}
                <div
                  className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]"
                  style={{ background: bg }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 right-0 w-px bg-black/10"
                  />
                  <span
                    className="max-h-[88%] overflow-hidden px-1 text-center text-[13px] font-semibold leading-tight tracking-tight rotate-180 [writing-mode:vertical-rl]"
                    style={{ color: fg }}
                  >
                    {book.title}
                  </span>
                </div>
                {/* front cover (folded back at rest, swings into view on hover) */}
                <div
                  className="absolute left-0 top-0 h-full [transform-origin:left_center] [transform:rotateY(-90deg)] [backface-visibility:hidden]"
                  style={{ width: COVER_W, background: bg }}
                >
                  <div
                    className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center"
                    style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
                  >
                    <span
                      className="text-[15px] font-semibold leading-snug"
                      style={{ color: fg }}
                    >
                      {book.title}
                    </span>
                    <span className="text-[12px]" style={{ color: fg, opacity: 0.75 }}>
                      {book.author}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {/* scroll affordance */}
        <span className="ml-3 flex h-[272px] shrink-0 items-center text-[var(--muted)]">
          <ChevronRight size={22} />
        </span>
      </div>
    </div>
  );
}
