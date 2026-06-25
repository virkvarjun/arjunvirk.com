import type { ChapterSection } from "./chapters";
import { vista } from "./reviews/vista";

export type Paper = {
  slug: string;
  title: string;
  // Author list, displayed under the title.
  authors?: string;
  year?: string;
  // Venue or identifier, e.g. "arXiv:2507.01125".
  venue?: string;
  // One-line summary shown on the category table of contents.
  summary?: string;
  // A BibTeX entry rendered verbatim at the end of the review.
  citation?: string;
  sections: ChapterSection[];
};

export type LiteratureCategory = {
  key: string;
  title: string;
  description: string;
  papers: Paper[];
};

export const literatureReviews: LiteratureCategory[] = [
  {
    key: "robot-learning",
    title: "Robot Learning",
    description:
      "Reviews of papers on robot perception, exploration, manipulation, and policy learning.",
    papers: [vista],
  },
  {
    key: "machine-learning",
    title: "Machine Learning",
    description:
      "Reviews of papers on architectures, optimization, and representation learning.",
    papers: [],
  },
  {
    key: "reinforcement-learning",
    title: "Reinforcement Learning",
    description:
      "Reviews of papers on policy optimization, value learning, and exploration.",
    papers: [],
  },
  {
    key: "biology-medical",
    title: "Biology/Medical",
    description:
      "Reviews of papers on computational biology, medical imaging, and clinical ML.",
    papers: [],
  },
];
