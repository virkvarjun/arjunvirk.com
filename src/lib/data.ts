import {
  type Chapter,
  mlGuideChapters,
  roboticsGuideChapters,
} from "./chapters";

export const profile = {
  name: "Arjun Virk",
  tagline: "software engineering @ university of waterloo",
  bio: "I build things at the intersection of systems and product. Currently studying at the University of Waterloo.",
  location: "Waterloo, ON",
  socials: {
    github: "https://github.com/virkvarjun",
    linkedin: "https://linkedin.com/in/virkvarjun",
    twitter: "https://x.com/virkvarjun",
    email: "a23virk@uwaterloo.ca",
  },
};

export type RichSegment = string | { text: string; href: string };

export const landing = {
  bullets: [
    "Software Engineering @ UWaterloo",
    "Robotics Research Engineer @ BracketBot Founding Team",
    "Computational Oncology Researcher @ Top Global AI Cancer Lab UCLA BAIR",
    "Prev. Data Infrastructure and Transformer Research Engineer @ Triage Technologies",
    "Named Top ML Researcher in Canada (0.1%)",
    "ML Agents and Research Consulting Business",
  ],
  subtitle:
    "Software engineering at the University of Waterloo, building at the intersection of systems and product.",
  more: [
    [
      "I build things at the intersection of systems and product. Currently studying at the ",
      { text: "University of Waterloo", href: "https://uwaterloo.ca" },
      ", based in Waterloo, ON.",
    ],
    [
      "I like writing and learning in public — long-form guides on machine learning and robotics, plus a running ",
      { text: "ML dictionary", href: "/writing/ml-dictionary" },
      ".",
    ],
  ] as RichSegment[][],
  links: [
    { label: "linkedin", href: profile.socials.linkedin },
    { label: "github", href: profile.socials.github },
    { label: "twitter", href: profile.socials.twitter },
    { label: "writing", href: "/writing/ml-dictionary" },
    { label: "mail", href: `mailto:${profile.socials.email}` },
  ],
};

export type WorkItem = {
  company: string;
  role: string;
  period: string;
  description: string;
  link?: string;
};

export const work: WorkItem[] = [
  {
    company: "Company A",
    role: "Software Engineering Intern",
    period: "Summer 2025",
    description: "Placeholder — add your work experience here.",
  },
  {
    company: "Company B",
    role: "Software Engineering Intern",
    period: "Winter 2025",
    description: "Placeholder — add your work experience here.",
  },
];

export type ProjectItem = {
  name: string;
  description: string;
  tags: string[];
  link?: string;
  github?: string;
  year: string;
};

export const projects: ProjectItem[] = [
  {
    name: "Project Alpha",
    description: "Placeholder — describe your project here.",
    tags: ["TypeScript", "Next.js"],
    year: "2025",
  },
  {
    name: "Project Beta",
    description: "Placeholder — describe your project here.",
    tags: ["Python", "ML"],
    year: "2024",
  },
  {
    name: "Project Gamma",
    description: "Placeholder — describe your project here.",
    tags: ["Rust", "Systems"],
    year: "2024",
  },
];

export type WritingItem = {
  title: string;
  description: string;
  date: string;
  link: string;
};

export type WritingCategory = {
  key: string;
  title: string;
  description: string;
  chapters?: Chapter[];
  posts?: WritingItem[];
  link?: { label: string; href: string };
};

export const writing: WritingCategory[] = [
  {
    key: "ml-guide",
    title: "ML Guide",
    description: "Notes and walkthroughs on machine learning concepts.",
    chapters: mlGuideChapters,
  },
  {
    key: "ml-dictionary",
    title: "ML Dictionary",
    description: "A running glossary of machine learning terms and definitions.",
    link: { label: "Browse glossary", href: "/writing/ml-dictionary" },
  },
  {
    key: "robotics-guide",
    title: "Robotics Guide",
    description: "Hands-on robotics learnings, from kinematics to control.",
    chapters: roboticsGuideChapters,
  },
  {
    key: "personal-reflections",
    title: "Personal Reflections",
    description: "Essays and thoughts on life, work, and everything between.",
    posts: [],
  },
];
