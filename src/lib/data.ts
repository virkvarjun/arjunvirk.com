import { type Chapter, mlGuideChapters } from "./chapters";

export const profile = {
  name: "Arjun Virk",
  tagline: "software engineering @ university of waterloo",
  bio: "I build things at the intersection of systems and product. Currently studying at the University of Waterloo.",
  location: "Waterloo, ON",
  socials: {
    github: "https://github.com/arjunvirk",
    linkedin: "https://linkedin.com/in/arjunvirk",
    twitter: "https://x.com/arjunvirk",
    email: "a23virk@uwaterloo.ca",
  },
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
};

export const writing: WritingCategory[] = [
  {
    key: "ml-guide",
    title: "ML Guide",
    description: "Notes and walkthroughs on machine learning concepts.",
    chapters: mlGuideChapters,
  },
  {
    key: "robotics-guide",
    title: "Robotics Guide",
    description: "Hands-on robotics learnings, from kinematics to control.",
    posts: [],
  },
  {
    key: "personal-reflections",
    title: "Personal Reflections",
    description: "Essays and thoughts on life, work, and everything between.",
    posts: [],
  },
];
