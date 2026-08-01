import {
  type Chapter,
  mlGuideChapters,
  becomingReflections,
  livingReflections,
  thinkingReflections,
  manifestoTwoReflections,
} from "./chapters";
import { roboticsGuideChapters } from "./robotics-chapters";

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
    orcid: "https://orcid.org/0009-0003-5922-7285",
  },
};

export type RichSegment = string | { text: string; href: string };

export const landing = {
  bullets: [
    "Software Engineering @ UWaterloo",
    "Robotics Research Engineer @ BracketBot",
    "Computational Oncology Researcher @ UCLA BAIR",
    "Prev. Data and Transformer Researcher @ Triage Technologies ($50M)",
    "Silver Medalist at Canada’s National Science Fair",
    "ML Agents and Research Consulting Business",
    "Worked with Google, Microsoft, Verizon, Interac for ML/Datacentre Consulting",
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
      "I like writing and learning in public, long-form guides on machine learning and robotics.",
    ],
  ] as RichSegment[][],
  links: [
    { label: "linkedin", href: profile.socials.linkedin },
    { label: "github", href: profile.socials.github },
    { label: "twitter", href: profile.socials.twitter },
    { label: "writing", href: "/writing" },
    { label: "mail", href: `mailto:${profile.socials.email}` },
  ],
};

export type WorkProject = {
  title: string;
  category: string;
  date: string;
  description: string;
  href: string;
  image?: string;
  imagePosition?: string;
  // When true, render the image with object-contain + padding (for logos)
  // instead of the default object-cover crop.
  imageContain?: boolean;
  // When true, render the image at its natural aspect ratio with no card
  // background, ring, or padding (the image is the whole tile).
  imageBare?: boolean;
};

export const workSection = {
  heading: "Work",
  subtitle: "Writing, research, and projects.",
  projects: [
    {
      title: "OpenPi-GPU SHARDER",
      category: "Research",
      date: "Jun 2026",
      description:
        "An implementation of a multi-node FSDP for the OpenPI repo.",
      href: "https://virkvarjun.github.io/OpenPI-GPU/",
      image: "/projects/openpi-gpu-sharder.png",
      imageBare: true,
    },
    {
      title: "Machine Learning Bible",
      category: "Writing",
      date: "May 2026",
      description:
        "A 200-page handwritten guide breaking down the math, intuition, and architectures behind modern machine learning and deep learning systems.",
      href: "/writing/ml-guide",
      image: "/projects/ml-bible.png",
      imagePosition: "30% center",
    },
    {
      title: "KhemKernel: Transformer from Scratch in numpy + Custom CUDA Kernels",
      category: "Research",
      date: "Apr 2026",
      description:
        "Built an encoder-decoder Transformer from scratch in NumPy and C++, using 5,000+ handwritten lines and custom CUDA kernels for FlashAttention to translate SMILES into IUPAC names.",
      href: "https://virkvarjun.github.io/KhemKernel/",
      image: "/projects/picochem.png",
    },
    {
      title: "Robotics Bible",
      category: "Writing",
      date: "Jul 2026",
      description: "A full guide of ML in Robotics.",
      href: "/writing/robotics-guide",
      image: "/projects/robotics-bible.webp",
      imagePosition: "center 40%",
    },
    {
      title: "RL Bible",
      category: "Writing",
      date: "Jul 2026",
      description:
        "A from-scratch guide to reinforcement learning: bandits, Bellman equations, deep RL, offline RL, world models, and the vision-language-action policies driving robots.",
      href: "/writing/rl-guide",
      image: "/projects/rl-bible.png",
      imageContain: true,
    },
    {
      title: "LoRA VLA Research @ BracketBot",
      category: "Research",
      date: "May 2026",
      description:
        "Developing novel LoRA and DoRA adapter architectures for efficient VLA fine-tuning, robotic manipulation, and continual learning under Isaac Bautista at BracketBot. (more soon)",
      href: "https://www.bracketbot.com/",
      image: "/projects/lora.png",
    },
    {
      title: "ECE 657: Course Collaborator",
      category: "Teaching",
      date: "Jun 2026",
      description:
        "Collaborating with Prof. Amir-Hossein Karimi on Machine Learning Fundamentals at UWaterloo Graduate ECE Department. More soon.",
      href: "#",
      image: "/projects/uwaterloo-logo.png",
      imageContain: true,
    },
    {
      title: "Failure-Aware ACT (FAACT)",
      category: "Research",
      date: "Mar 2026",
      description:
        "Built a failure-aware action chunking Transformer that detects trajectory failures with minimal pretraining and autonomously recovers through a self-correction algorithm.",
      href: "https://x.com/virkvarjun/status/2030850380502831463",
      image: "/projects/faact.png",
    },
    {
      title: "Sweep JEPA",
      category: "Research",
      date: "Jun 2025",
      description:
        "Worked with Dr. William Speier and Ashwath Radhachandran, PhD, on JEPA and ViT-based models to improve thyroid cancer risk stratification beyond ACR TI-RADS. (more soon)",
      href: "https://bair.seas.ucla.edu/",
      image: "/projects/ucla.png",
    },
    {
      title: "SOTA Pan-Cancer Immunotherapy Quantification",
      category: "Research",
      date: "Apr 2024",
      description:
        "Developed RL PPO system to predict immunotherapy efficacy and recommend ICI inhibitors across cancer types from 15% to 80%. Silver Medal at Canada’s National Science Fair.",
      href: "https://partner.projectboard.world/ysc/project/using-machine-learning-to-quantify-pan-cancer-immunotherapy-response-and-optimizing-treatments",
      image: "/projects/immuno.png",
    },
    {
      title: "Inference Engineering: A Deep Dive",
      category: "Writing",
      date: "Jun 2026",
      description:
        "A deep dive into LLM inference and GPU architecture.",
      href: "/inference-engineering.html",
      image: "/projects/inference-engineering.png",
      imageContain: true,
    },
    {
      title: "Explanation Tuning Research (Triage)",
      category: "Engineering",
      date: "Jun 2024",
      description:
        "Worked under Mat Kallada from the Mila Institute to organize medical sequence data pipelines and research explanation-guided tuning for medical vision-language transformers. (more soon)",
      href: "https://github.com/triagemd",
      image: "/projects/triage.png",
    },
    {
      title: "BigBrother: First Autonomous Interactive Agentic Browser",
      category: "Engineering",
      date: "Jan 2026",
      description:
        "Built an autonomous agentic browser extension that completes web tasks from natural-language prompts. Awarded $200 in prizes.",
      href: "https://devpost.com/software/big-bro-tsv0i9",
      image: "/projects/bigbrother.png",
    },
    {
      title: "Wisp: Custom MCP for Daily Notion and Google Workspace",
      category: "Engineering",
      date: "Nov 2025",
      description:
        "Led the implementation of a custom MCP server that exposes Notion and Google Workspace as structured, machine-readable tools instead of unstructured text context.",
      href: "https://drive.google.com/file/d/1iY6WqhUoQef0hN14b8RVFlftUAU0BiyM/view?usp=sharing",
      image: "/projects/wisp.png",
    },
    {
      title: "Meridian",
      category: "Engineering",
      date: "Jul 2026",
      description:
        "An app that logs what you are doing every ten minutes, learns your peak productivity hours, and builds a dynamic daily schedule around them.",
      href: "/projects/meridian-demo.mp4",
      image: "/projects/meridian-poster.png",
    },
    {
      title: "Dancing Humanoid (1st Place Provincially)",
      category: "Engineering",
      date: "Jul 2022",
      description:
        "Designed the CAD, wiring schematics, and C++ control system for a music-synced humanoid robot that performed a choreographed dance routine. Awarded $200 in prizes.",
      href: "https://www.youtube.com/watch?v=To6ZkVqr8FM",
      image: "/projects/dancing.png",
    },
    {
      title: "Backtracking",
      category: "Engineering",
      date: "Jul 2026",
      description:
        "An app that fights the forgetting curve by tracking what you have learned and tuning the questions it asks each day so the material sticks.",
      href: "https://recall-delta-two.vercel.app/",
      image: "/projects/backtracking.svg",
      imageContain: true,
    },
    {
      title: "Hack49: 700K Reached, $13K Funding",
      category: "Leadership",
      date: "Jun 2024",
      description:
        "Led a 13-person team to reach 700K+ students, secure $13K in funding, recruit judges from Amazon, Elegoo, and Dell, and scale Hack49 into a global student hackathon.",
      href: "https://www.youtube.com/@hack_49",
      image: "/projects/hack49.png",
    },
    {
      title: "Daybreak",
      category: "Engineering",
      date: "Jul 2026",
      description:
        "A personal daily digest of paper recommendations, relevant news, and takes from the leaders you follow on X, built as a calmer replacement for endless scrolling.",
      href: "/projects/daybreak-demo.mp4",
      image: "/projects/daybreak-poster.png",
    },
    {
      title: "Robot See, Robot Do",
      category: "Writing",
      date: "Feb 2026",
      description:
        "Wrote a viral technical article explaining the math behind imitation learning, Action Chunking Transformers, and DAgger for robotics learning.",
      href: "https://x.com/virkvarjun/status/2018586817327489435",
      image: "/projects/robot-see-robot-do.png",
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
    description: "Placeholder, add your work experience here.",
  },
  {
    company: "Company B",
    role: "Software Engineering Intern",
    period: "Winter 2025",
    description: "Placeholder, add your work experience here.",
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
    description: "Placeholder, describe your project here.",
    tags: ["TypeScript", "Next.js"],
    year: "2025",
  },
  {
    name: "Project Beta",
    description: "Placeholder, describe your project here.",
    tags: ["Python", "ML"],
    year: "2024",
  },
  {
    name: "Project Gamma",
    description: "Placeholder, describe your project here.",
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
  // "guide" (chapters numbered Chapter N) or "reflections" (entries labelled
  // with a date/time stamp). Defaults to a guide when omitted.
  kind?: "guide" | "reflections";
  // For a reflections category with a single entry: collapse it to just that
  // entry's title on the index (no category wrapper). Otherwise the category
  // shows as a section heading with its entries listed underneath.
  collapseSingle?: boolean;
  chapters?: Chapter[];
  posts?: WritingItem[];
  link?: { label: string; href: string };
};

export const writing: WritingCategory[] = [
  {
    key: "ml-guide",
    title: "ML Bible",
    description:
      "A from-scratch guide to machine learning, classical algorithms, neural networks, transformers, vision, and agents.",
    chapters: mlGuideChapters,
  },
  {
    key: "robotics-guide",
    title: "Robotics Bible",
    description:
      "A from-scratch guide to robots: the body, the math, classical autonomy, reinforcement learning, and the vision-language-action models driving the current wave of general-purpose machines.",
    chapters: roboticsGuideChapters,
  },
  {
    key: "rl-guide",
    title: "RL Bible",
    description:
      "A from-scratch guide to reinforcement learning — bandits, Bellman equations, deep RL, offline RL, world models, and vision-language-action policies for robots.",
    link: { label: "Table of contents", href: "/writing/rl-guide" },
  },
  {
    key: "becoming",
    title: "Becoming",
    description: "Reflections, raw and unedited.",
    kind: "reflections",
    collapseSingle: true,
    chapters: becomingReflections,
  },
  {
    key: "living",
    title: "Living According to Evolution",
    description: "Reflections, raw and unedited.",
    kind: "reflections",
    collapseSingle: true,
    chapters: livingReflections,
  },
  {
    key: "thinking",
    title: "Thinking by Derivations",
    description: "Reflections, raw and unedited.",
    kind: "reflections",
    collapseSingle: true,
    chapters: thinkingReflections,
  },
  {
    key: "manifesto-ii",
    title: "Manifesto on Becoming Section II",
    description: "Reflections, raw and unedited.",
    kind: "reflections",
    collapseSingle: true,
    chapters: manifestoTwoReflections,
  },
];
