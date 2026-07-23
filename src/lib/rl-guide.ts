import fs from "fs";
import path from "path";

export type RlChapter = {
  /** Route segment, e.g. "chapter-1-what-reinforcement-learning-is" */
  slug: string;
  /** "Chapter 1" … or "Appendix A" … */
  label: string;
  title: string;
  /** One-sentence lede shown under the title, muted. */
  description: string;
  /** Part heading shown in the table of contents. */
  part: string;
};

export const RL_PARTS = [
  "Part 0 — Foundations",
  "Part I — Tabular Methods",
  "Part II — Approximation & Deep RL",
  "Part III — The Modern RL Toolbox",
  "Part IV — RL for Robotics",
  "Appendices",
] as const;

export const rlGuideChapters: RlChapter[] = [
  // ---------------------------------------------------------------- Part 0
  {
    slug: "chapter-1-what-reinforcement-learning-is",
    label: "Chapter 1",
    title: "What Reinforcement Learning Is",
    description:
      "The problem of learning from interaction: agents, environments, rewards, and a map of the entire field.",
    part: RL_PARTS[0],
  },
  {
    slug: "chapter-2-bandits-and-exploration",
    label: "Chapter 2",
    title: "Bandits & the Exploration Problem",
    description:
      "k-armed bandits, action-value estimation, ε-greedy, UCB, gradient bandits, Thompson sampling, and regret.",
    part: RL_PARTS[0],
  },
  {
    slug: "chapter-3-markov-decision-processes",
    label: "Chapter 3",
    title: "Markov Decision Processes",
    description:
      "The formal model of sequential decision making: returns, policies, value functions, and the Bellman equations.",
    part: RL_PARTS[0],
  },
  // ---------------------------------------------------------------- Part I
  {
    slug: "chapter-4-dynamic-programming",
    label: "Chapter 4",
    title: "Dynamic Programming",
    description:
      "Policy iteration, value iteration, and a proof that the Bellman operator is a contraction.",
    part: RL_PARTS[1],
  },
  {
    slug: "chapter-5-monte-carlo-methods",
    label: "Chapter 5",
    title: "Monte Carlo Methods",
    description:
      "Learning value functions from complete episodes: prediction, control, and importance sampling.",
    part: RL_PARTS[1],
  },
  {
    slug: "chapter-6-temporal-difference-learning",
    label: "Chapter 6",
    title: "Temporal-Difference Learning",
    description:
      "The TD error, SARSA, Q-learning, Expected SARSA, and Double Q-learning — the heart of modern RL.",
    part: RL_PARTS[1],
  },
  {
    slug: "chapter-7-nstep-and-eligibility-traces",
    label: "Chapter 7",
    title: "n-step Bootstrapping & Eligibility Traces",
    description:
      "The bias–variance dial between TD and Monte Carlo: n-step methods, the λ-return, and TD(λ).",
    part: RL_PARTS[1],
  },
  {
    slug: "chapter-8-planning-and-tabular-models",
    label: "Chapter 8",
    title: "Planning & Learning with Tabular Models",
    description:
      "Dyna-Q, prioritized sweeping, and Monte Carlo Tree Search — the bridge from tabular RL to AlphaGo.",
    part: RL_PARTS[1],
  },
  // ---------------------------------------------------------------- Part II
  {
    slug: "chapter-9-value-function-approximation",
    label: "Chapter 9",
    title: "Value-Function Approximation",
    description:
      "From tables to parameterized functions: semi-gradient TD, linear methods, and the deadly triad.",
    part: RL_PARTS[2],
  },
  {
    slug: "chapter-10-deep-q-networks",
    label: "Chapter 10",
    title: "Deep Q-Networks & the Value-Based Family",
    description:
      "DQN, Double DQN, dueling networks, prioritized replay, distributional RL, and Rainbow.",
    part: RL_PARTS[2],
  },
  {
    slug: "chapter-11-policy-gradients",
    label: "Chapter 11",
    title: "Policy Gradients",
    description:
      "The policy gradient theorem derived in full, REINFORCE, baselines, actor-critic, and GAE.",
    part: RL_PARTS[2],
  },
  {
    slug: "chapter-12-advanced-policy-optimization",
    label: "Chapter 12",
    title: "Advanced Policy Optimization",
    description:
      "Natural gradients, TRPO's monotonic improvement bound, and PPO — the practical workhorse.",
    part: RL_PARTS[2],
  },
  {
    slug: "chapter-13-continuous-control-and-max-entropy",
    label: "Chapter 13",
    title: "Continuous Control & Maximum-Entropy RL",
    description:
      "Deterministic policy gradients, DDPG, TD3, and Soft Actor-Critic for continuous action spaces.",
    part: RL_PARTS[2],
  },
  {
    slug: "chapter-14-model-based-rl",
    label: "Chapter 14",
    title: "Model-Based RL",
    description:
      "Learning dynamics models and planning with them: PILCO, PETS, MBPO, and AlphaGo to MuZero.",
    part: RL_PARTS[2],
  },
  // ---------------------------------------------------------------- Part III
  {
    slug: "chapter-15-exploration-in-deep-rl",
    label: "Chapter 15",
    title: "Exploration in Deep RL",
    description:
      "Count-based bonuses, curiosity, Random Network Distillation, and Go-Explore for hard exploration.",
    part: RL_PARTS[3],
  },
  {
    slug: "chapter-16-imitation-and-inverse-rl",
    label: "Chapter 16",
    title: "Imitation Learning & Inverse RL",
    description:
      "Behavioral cloning and covariate shift, DAgger, maximum-entropy IRL, and adversarial imitation.",
    part: RL_PARTS[3],
  },
  {
    slug: "chapter-17-offline-rl",
    label: "Chapter 17",
    title: "Offline (Batch) RL",
    description:
      "Learning from fixed datasets: extrapolation error, BCQ, TD3+BC, CQL, IQL, and model-based offline RL.",
    part: RL_PARTS[3],
  },
  {
    slug: "chapter-18-rl-as-sequence-modeling",
    label: "Chapter 18",
    title: "RL as Sequence Modeling",
    description:
      "Decision Transformer, Trajectory Transformer, and Diffuser: treating control as conditional generation.",
    part: RL_PARTS[3],
  },
  {
    slug: "chapter-19-goals-hierarchy-meta-and-multi-agent",
    label: "Chapter 19",
    title: "Goal-Conditioned, Hierarchical, Meta & Multi-Agent RL",
    description:
      "Universal value functions, HER, options, meta-RL, and the game theory of many learning agents.",
    part: RL_PARTS[3],
  },
  {
    slug: "chapter-20-rl-for-large-language-models",
    label: "Chapter 20",
    title: "RL for Large Language Models",
    description:
      "RLHF and the InstructGPT recipe, DPO, RLAIF, and RL with verifiable rewards for reasoning.",
    part: RL_PARTS[3],
  },
  {
    slug: "chapter-21-theory-and-foundations",
    label: "Chapter 21",
    title: "Theory & Foundations",
    description:
      "Sample complexity, regret bounds, convergence guarantees, and what is actually proven — the qualifying exam.",
    part: RL_PARTS[3],
  },
  // ---------------------------------------------------------------- Part IV
  {
    slug: "chapter-22-classical-and-deep-rl-for-robots",
    label: "Chapter 22",
    title: "Classical & Deep RL for Robots",
    description:
      "Why robots are hard: QT-Opt, HER in manipulation, domain randomization, and OpenAI's Dactyl.",
    part: RL_PARTS[4],
  },
  {
    slug: "chapter-23-world-models",
    label: "Chapter 23",
    title: "World Models",
    description:
      "Learning a model of the world and dreaming inside it: PlaNet, Dreamer, TD-MPC, IRIS, and Genie.",
    part: RL_PARTS[4],
  },
  {
    slug: "chapter-24-vision-language-action-models",
    label: "Chapter 24",
    title: "Vision-Language-Action Models",
    description:
      "Generalist robot policies: RT-1, RT-2, Open X-Embodiment, Octo, OpenVLA, π0, Diffusion Policy, and ACT.",
    part: RL_PARTS[4],
  },
  {
    slug: "chapter-25-frontier-synthesis-open-problems",
    label: "Chapter 25",
    title: "Frontier, Synthesis & Open Problems",
    description:
      "How the pieces fit together, what remains unsolved, and how to start doing research in RL for robotics.",
    part: RL_PARTS[4],
  },
  // ---------------------------------------------------------------- Appendices
  {
    slug: "notation",
    label: "Appendix A",
    title: "Notation & Conventions",
    description: "Every symbol used in this book, in one place.",
    part: RL_PARTS[5],
  },
  {
    slug: "math-refresher",
    label: "Appendix B",
    title: "Math Refresher",
    description:
      "Probability, expectation, gradients, optimization, and information theory as used in this book.",
    part: RL_PARTS[5],
  },
  {
    slug: "environments",
    label: "Appendix C",
    title: "Environments & Code Setup",
    description:
      "Gymnasium, the book's Gridworld, CartPole, and continuous control — how to run every code sample.",
    part: RL_PARTS[5],
  },
  {
    slug: "bibliography",
    label: "Appendix D",
    title: "Annotated Bibliography",
    description: "Every paper in the book, grouped by topic, with why it matters.",
    part: RL_PARTS[5],
  },
];

const CONTENT_DIR = path.join(process.cwd(), "content", "rl-guide");

export function rlContentPath(slug: string): string {
  return path.join(CONTENT_DIR, `${slug}.mdx`);
}

export function rlChapterExists(slug: string): boolean {
  return fs.existsSync(rlContentPath(slug));
}

export function getRlChapter(slug: string): RlChapter | undefined {
  return rlGuideChapters.find((c) => c.slug === slug);
}

/** Prev/next in curriculum order. */
export function rlNeighbors(slug: string): {
  prev: RlChapter | null;
  next: RlChapter | null;
} {
  const i = rlGuideChapters.findIndex((c) => c.slug === slug);
  return {
    prev: i > 0 ? rlGuideChapters[i - 1] : null,
    next:
      i >= 0 && i < rlGuideChapters.length - 1 ? rlGuideChapters[i + 1] : null,
  };
}
