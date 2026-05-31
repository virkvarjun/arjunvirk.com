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
    "Computational Oncology Researcher @ UCLA BAIR",
    "Prev. Data and Transformer Researcher @ Triage Technologies",
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

export type WorkProject = {
  title: string;
  category: string;
  date: string;
  description: string;
  href: string;
};

export const workSection = {
  heading: "Work",
  subtitle: "Writing, research, and projects.",
  projects: [
    {
      title: "Machine Learning Bible",
      category: "Writing",
      date: "May 2026",
      description:
        "Placeholder description. A living reference covering core machine learning concepts from first principles.",
      href: "#",
    },
    {
      title: "PicoChem: Transformer from Scratch in numpy + Custom CUDA Kernels",
      category: "Research",
      date: "Apr 2026",
      description:
        "Placeholder description. A minimal transformer implemented from the ground up in numpy with custom CUDA kernels.",
      href: "#",
    },
    {
      title: "LoRA VLA Research @ BracketBot",
      category: "Research",
      date: "May 2026",
      description:
        "Placeholder description. Exploring low-rank adaptation for vision-language-action models on real robots.",
      href: "#",
    },
    {
      title: "Failure-Aware ACT (FAACT)",
      category: "Research",
      date: "Mar 2026",
      description:
        "Placeholder description. An action-chunking policy that reasons about and recovers from its own failures.",
      href: "#",
    },
    {
      title: "SOTA Pan-Cancer Immunotherapy Quantification",
      category: "Research",
      date: "Apr 2024",
      description:
        "Placeholder description. Quantifying immunotherapy response signals across cancer types from multi-omic data.",
      href: "#",
    },
    {
      title: "Novel Thyroid Cancer Risk Stratification System (UCLA BAIR)",
      category: "Research",
      date: "Jun 2025",
      description:
        "Placeholder description. Modeling patient risk to stratify thyroid cancer outcomes from clinical features.",
      href: "#",
    },
    {
      title: "Explanation Tuning Research (Triage)",
      category: "Engineering",
      date: "Jun 2024",
      description:
        "Placeholder description. Investigating how explanation-guided fine-tuning improves model reasoning.",
      href: "#",
    },
    {
      title: "BigBrother: First Autonomous Interactive Agentic Browser",
      category: "Engineering",
      date: "Jan 2026",
      description:
        "Placeholder description. An autonomous agentic browser that interactively navigates and acts on the web on your behalf.",
      href: "#",
    },
    {
      title: "Wisp: Custom MCP for Daily Notion and Google Workspace",
      category: "Engineering",
      date: "Nov 2026",
      description:
        "Placeholder description. A custom MCP server that automates daily Notion workflows from natural language.",
      href: "#",
    },
    {
      title: "Dancing Humanoid (1st Place Provincially)",
      category: "Engineering",
      date: "Jul 2022",
      description:
        "Placeholder description. A choreographed humanoid robot routine that took first place provincially.",
      href: "#",
    },
  ] as WorkProject[],
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
