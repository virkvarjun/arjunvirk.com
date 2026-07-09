import type { Paper } from "@/lib/literature";

export const aspire: Paper = {
  slug: "aspire",
  title: "ASPIRE: Agentic Skills Discovery for Robotics",
  authors:
    "Runyu Lu, Yubo Wu, Ethan Kou, Letian Fu, Wenli Xiao, Ajay Mandlekar, Yinzhen Xu, Guanya Shi, Ken Goldberg, Ang Chen, Mosharaf Chowdhury, Yuke Zhu, Linxi Fan, Guanzhi Wang",
  year: "2026",
  venue: "arXiv:2607.00272",
  summary:
    "A continual-learning robotics system where coding agents write and repair code-as-policy programs against fine-grained execution traces, distill every validated fix into a growing skill library, and search evolutionarily over programs, so the agent solving its hundredth task is far more capable than the one solving its first.",
  citation: `@misc{lu2026aspire,
  title={ASPIRE: Agentic Skill Programming through Iterative Robot Exploration},
  author={Runyu Lu and Yubo Wu and Ethan Kou and Letian Fu and Wenli Xiao and Ajay Mandlekar and Yinzhen Xu and Guanya Shi and Ken Goldberg and Ang Chen and Mosharaf Chowdhury and Yuke Zhu and Linxi Fan and Guanzhi Wang},
  year={2026},
  eprint={2607.00272},
  archivePrefix={arXiv},
  primaryClass={cs.RO},
  url={https://research.nvidia.com/labs/gear/aspire/}
}`,
  sections: [
    {
      paragraphs: [
        `ASPIRE (NVIDIA, University of Michigan, UIUC, UC Berkeley, and CMU, arXiv:2607.00272, June 2026) is a self-improving, continual-learning robotics system. The acronym unpacks to Agentic Skill Programming through Iterative Robot Exploration, and that is exactly what it does: a coding agent autonomously writes and refines robot control programs in a code-as-policy paradigm, and every validated fix is compounded into a reusable skill library that makes the next task easier.`,
        `The motivating observation is a gap between how software agents and human robot engineers improve. A robotic coding agent today, solving its hundredth task, is effectively no more experienced than when it solved its first, because fixes and recovery strategies get discarded once a task is done. A human robotics engineer instead accumulates transferable debugging knowledge, grasp-recovery heuristics, navigation strategies, prompting recipes, and gets steadily better. ASPIRE is built to accumulate like the human.`,
      ],
    },
    {
      heading: "The problem",
      paragraphs: [
        `Code-as-policy systems let a language model compose perception, planning, and control primitives into an executable robot program, which is attractive because the behavior is explicit and can be inspected, edited, and debugged. But existing robotic coding agents are limited by naive execution environments that return only coarse, task-level feedback. A failed rollout tells the agent the task did not succeed, but not whether the cause was bad perception, an unstable grasp, a planning error, or a downstream recovery failure. Without fine-grained diagnostic traces the agent cannot localize the failure or choose a repair. And because nothing is remembered across tasks, the same failures get rediscovered again and again.`,
      ],
    },
    {
      heading: "The core idea: an open-ended learning loop",
      paragraphs: [
        `ASPIRE replaces the fixed perceive-plan-execute pipeline with an open-ended learning loop, built from three components: a closed-loop robot execution engine that exposes fine-grained traces, a continually growing skill library that stores validated repairs, and an evolutionary search that explores diverse programs rather than endlessly patching one. Together they form a system whose performance scales with experience. The more tasks it sees, the larger its skill library, and the more it transfers to new tasks, longer horizons, and even real robots.`,
        `The system is organized as a coordinator and actors. A central coordinator owns the shared skill library and dispatches actor coding agents to individual tasks, so many tasks are learned in parallel. Each actor writes, executes, diagnoses, and repairs programs inside the execution engine. Actors do not swap full chat histories or raw trajectories; only distilled, transferable experience goes into the skill library, which keeps each actor's context focused on its own task, program, and failure traces.`,
      ],
    },
    {
      heading: "Component 1: the closed-loop robot execution engine",
      paragraphs: [
        `This is the key to good debugging. Prior methods expose execution evidence through fixed, human-designed interfaces (a scene summary, or a preset set of observations), which forces a bad trade-off: too little evidence hides the failing primitive, too much raw video distracts the agent from the causal chain. ASPIRE instead records a per-primitive multimodal trace for every perception, planning, and control call. For each call the trace stores the invoked API, its inputs and outputs, the return status, and relevant evidence such as RGB keyframes, overlays, grasp candidates, object poses, and motion-planning results. Crucially the agent does not get the full video; the engine keeps the frames immediately before and after each call, with their overlays and return values, so the agent inspects evidence localized to the calls the failure implicates.`,
        `A worked example makes it concrete. On a BEHAVIOR-1K task, navigate and pick up a radio, the robot keeps finding the radio but failing to approach it. The primitive trace localizes the cause: perception succeeds and returns a radio pose, but repeated navigate_to_pose calls return PLANNING_ERROR because the generated navigation goal sits about 20 centimeters from the table edge, inside the table's collision-avoidance buffer, so the planner fails. The failure is not perception or grasping, it is an infeasible target pose. The agent then writes a multi-angle approach routine that samples alternative navigation targets around the radio and approaches from a direction that clears the collision buffer, and it works. That validated repair is admitted to the library as a reusable Multi-Angle Approach skill.`,
      ],
    },
    {
      heading: "Component 2: the skill library",
      paragraphs: [
        `This is where experience compounds. Program failures recur across tasks, but the reusable knowledge is rarely an entire task program; it is a heuristic, a prompt, a grasping constraint, a navigation-recovery pattern, a motion primitive, a scene-understanding routine, or a debugging workflow. ASPIRE does not prescribe this taxonomy in advance. Skills are induced from validated repairs: the agent diagnoses a failure from traces, patches the program, validates the fix on debugging configurations, and the coordinator admits only reusable patterns.`,
        `Each skill is stored as compact in-context guidance: a failure signature, a when-to-apply condition, a repair strategy, and, when useful, a small representative code sketch. Storing repairs this way lets future actors reuse validated fixes instead of rediscovering them through expensive test-time reasoning, supports zero-shot transfer to harder tasks, and is the mechanism by which simulation-discovered skills can generalize across embodiments to real robots. The coordinator audits each reported finding, checks it against the allowed API policy, and promotes only repairs that passed debug validation into the shared library.`,
      ],
    },
    {
      heading: "Component 3: evolutionary search over programs",
      paragraphs: [
        `This exists to stop the agent from getting stuck. Trace-guided debugging alone can collapse into a local repair loop, where the agent keeps patching the same failing strategy instead of trying a fundamentally different approach. So in each round the agent proposes a population of K candidate programs, conditioned on the best-performing previous programs and their remaining failure traces. Every candidate is executed in the engine, producing outcomes and fresh diagnostic traces, and the next round conditions on the survivors plus their residual failures, which pushes the search toward distinct strategies rather than one over-refined solution.`,
        `The search target is the robot program itself. Candidates are selected by closed-loop execution, and validated repairs are admitted to the skill library once the search concludes, provided they generalize across environment variations. The loop terminates when a candidate solves the debugging configurations or the search budget runs out. In short, the execution engine tells the agent what broke, the skill library tells it what has worked before, and evolutionary search keeps it from tunnel-visioning on a single fix.`,
      ],
    },
    {
      heading: "The setup",
      paragraphs: [
        `For the simulation benchmarks the coding agent is Claude Code running Claude Opus 4.6 with a one-million-token context window, writing executable Python in CaP-X, an open-source code-as-policy framework on MuJoCo Playground with APIs for perception, geometry, and motion planning. For the real-robot study the agent is OpenAI Codex on GPT-5.5 in a high-reasoning mode, driving a bimanual YAM manipulation station. The agent, environment, and API set are held fixed across all experiments.`,
      ],
    },
    {
      heading: "Results",
      paragraphs: [
        `The gains are large and consistent. On LIBERO-Pro, a short-horizon robustness suite with object, goal, and spatial perturbations, averaging the position and task axes, ASPIRE improves over the strongest baseline by about 77 points on Object, 41.5 on Goal, and 42.5 on Spatial. On Robosuite's contact-rich tasks it keeps near-saturated performance on the easy ones and lifts the bimanual handover from 20% to 92%. On BEHAVIOR-1K long-horizon household mobile manipulation it beats both human-written programs and the coding-agent baseline, with the biggest task-level jump on navigate-and-pick-up-radio, from 56% to 88%.`,
        `The baselines are strong: a coding agent (CaP-Agent0, which uses visual differencing, a predefined skill library, and per-episode test-time retries) and end-to-end vision-language-action policies OpenVLA, π0, and π0.5. The VLAs largely collapse under task paraphrases, where ASPIRE holds up, and several ASPIRE results even surpass programs written by human experts.`,
      ],
    },
    {
      heading: "Zero-shot transfer, and scaling with the library",
      paragraphs: [
        `The most telling result is transfer. Skills accumulated on the LIBERO-90 tasks transfer zero-shot to held-out LIBERO-Pro Long tasks, with no additional debugging or retries. The full 90-task library reaches about 31% success (23% on position perturbations and 38% on task perturbations), while prior methods saturate near 4% despite their heavy reliance on test-time reasoning and retries. And the effect scales with the library: growing it from 0 to 25 to 50 to 90 source tasks steadily raises zero-shot success. That is the paper's central claim made measurable. Validated repairs from short-horizon tasks are genuinely reusable knowledge for longer-horizon compositions, so more experience really does make the agent better.`,
      ],
    },
    {
      heading: "Sim-to-real",
      paragraphs: [
        `Finally, ASPIRE gives initial evidence of sim-to-real transfer. Three skills discovered in simulation, soda-can pickup, bowl-on-plate placement, and drawer push and pull, are handed to the real-robot agent as in-context guidance. Even though the real setup uses a different embodiment and API from simulation, retrieving these skills reduces the real-world reasoning tokens the agent needs and enables successful programs in cases where naive debugging from scratch fails entirely.`,
      ],
    },
    {
      heading: "Why it matters",
      paragraphs: [
        `ASPIRE's bet is that the way to make robot coding agents genuinely improve is not a bigger model or a fixed pipeline, but the two things human engineers have: rich diagnostic feedback and an accumulating memory of what fixes work. By pairing a per-primitive execution engine with a skill library that compounds validated repairs, and by using evolutionary search to keep exploration honest, it turns robot programming into an open-ended loop that gets better with every task, and begins to carry that improvement from simulation into the real world. It pairs naturally with ENPIRE from the same lab: where ENPIRE automates the physical loop (reset, rollout, verify) so an agent can learn on real hardware, ASPIRE focuses on accumulating and reusing the repair knowledge that makes each new task cheaper to solve.`,
      ],
    },
  ],
};
