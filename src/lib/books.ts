import type { ChapterSection } from "./chapters";

// A book on the reading list. Format inspired by Adam Majmudar's reading page
// (https://adammaj.com/reading). Each book gets its own page with the lessons
// taken from it; those are authored per book over time.
export type Book = {
  slug: string;
  title: string;
  author: string;
  // Optional metadata to fill in later (year, date read, rating, etc.).
  year?: string;
  sections: ChapterSection[];
};

// Placeholder body until the per-book lessons are written.
const soon = (): ChapterSection[] => [
  {
    heading: "Lessons from the book",
    paragraphs: ["*Notes and lessons coming soon.*"],
  },
];

export const books: Book[] = [
  {
    slug: "meditations",
    title: "Meditations",
    author: "Marcus Aurelius",
    sections: soon(),
  },
  {
    slug: "48-laws-of-power",
    title: "The 48 Laws of Power",
    author: "Robert Greene",
    sections: soon(),
  },
  {
    slug: "sapiens",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    sections: soon(),
  },
  {
    slug: "psychology-of-money",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    sections: soon(),
  },
  {
    slug: "think-and-grow-rich",
    title: "Think and Grow Rich",
    author: "Napoleon Hill",
    sections: soon(),
  },
  {
    slug: "almanack-of-naval-ravikant",
    title: "The Almanack of Naval Ravikant",
    author: "Eric Jorgenson",
    sections: soon(),
  },
  {
    slug: "elon-musk",
    title: "Elon Musk",
    author: "Walter Isaacson",
    sections: soon(),
  },
];
