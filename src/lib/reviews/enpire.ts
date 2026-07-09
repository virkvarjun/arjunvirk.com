import type { Paper } from "@/lib/literature";

export const enpire: Paper = {
  slug: "enpire",
  title: "ENPIRE: Agentic Robot Policy Self-Improvement in the Real World",
  authors:
    "Wenli Xiao, Jia Xie, Tonghe Zhang, Haotian Lin, Letian Fu, Haoru Xue, Jalen Lu, Yi Yang, Cunxi Dai, Zi Wang, Jimmy Wu, Guanzhi Wang, S. Shankar Sastry, Ken Goldberg, Linxi Fan, Yuke Zhu, Guanya Shi",
  year: "2026",
  venue: "arXiv:2606.19980",
  summary:
    "A harness that turns real-world robot learning into a loop a coding agent can drive: reset the scene, roll out the policy, verify the outcome, read the logs, and rewrite the training code, letting frontier agents reach up to 99% success on dexterous manipulation with little human supervision.",
  citation: `@misc{xiao2026enpire,
  title={ENPIRE: Agentic Robot Policy Self-Improvement in the Real World},
  author={Wenli Xiao and Jia Xie and Tonghe Zhang and Haotian Lin and Letian Fu and Haoru Xue and Jalen Lu and Yi Yang and Cunxi Dai and Zi Wang and Jimmy Wu and Guanzhi Wang and S. Shankar Sastry and Ken Goldberg and Linxi Fan and Yuke Zhu and Guanya Shi},
  year={2026},
  eprint={2606.19980},
  archivePrefix={arXiv},
  primaryClass={cs.RO},
  url={https://arxiv.org/abs/2606.19980}
}`,
  sections: [
    {
      paragraphs: [
        `ENPIRE (NVIDIA, Carnegie Mellon University, and UC Berkeley, arXiv:2606.19980, June 2026) attacks the biggest hidden cost in real-world robot manipulation: the human. Getting a dexterous skill to work on hardware usually means people collecting data, resetting the scene between attempts, scoring successes and failures, tuning hyperparameters, and rewriting the training code when it breaks. ENPIRE automates that entire routine and hands it to a coding agent.`,
        `The name is the loop. ENPIRE stands for its four modules: Environment (EN), Policy Improvement (PI), Rollout (R), and Evolution (E). Together they turn real-world learning into a controllable optimization procedure. A coding agent resets the scene, runs the current policy, verifies the outcome, reads the logs, consults the literature, edits the training code, and tries again, with one or many robots running in parallel.`,
      ],
    },
    {
      heading: "The problem",
      paragraphs: [
        `Coding agents have become strong at improving software in purely digital settings, where they can run a test, read the failure, and edit the code in a tight loop. Robotics breaks that loop. Every trial needs a physical reset, a physical way to tell success from failure, and hardware that is slow, noisy, and unsafe to leave unattended. Without those pieces an agent cannot get the feedback it needs, so real-robot policy development stays bottlenecked on human labor and hand engineering. That bottleneck, the paper argues, is the central obstacle to general physical intelligence.`,
      ],
    },
    {
      heading: "The core idea: make the physical world a loop the agent can optimize",
      paragraphs: [
        `ENPIRE's contribution is a harness that supplies exactly the missing pieces: automatic reset, automatic verification, safe unattended rollout, and a structured way for the agent to edit and evaluate training code. Once those exist, improving a real policy looks like the digital coding loop the agent is already good at. The physical world becomes just another environment the agent optimizes against, and real-world learning becomes a repeatable procedure: reset the scene, execute a policy, verify the outcome, refine the next iteration.`,
      ],
    },
    {
      heading: "Module 1, Environment (EN): automatic reset and verification",
      paragraphs: [
        `The Environment module is what makes unattended operation possible. It supplies the reward and the reset so no person has to sit and watch.`,
      ],
      list: [
        `Hard safety constraints bound the robot's configuration space. A violation is treated as an immediate failure and triggers a reset, so the fleet can run without a human on standby.`,
        `Automatic verification synthesizes a binary reward from a handful of demonstrations using procedural tool calls such as visual-alignment checks, force estimates, and end-effector height. Success and failure get scored without a person in the loop.`,
        `Automatic reset runs modular manipulation skills to return the scene to its initial state, or to the start of a critical sub-action (for example, placing the arm at the pin-insertion start point).`,
        `The module exposes a fixed, Gym-compatible API, so everything downstream sees a stable environment with reward and debugging signals.`,
      ],
    },
    {
      heading: "Module 2, Policy Improvement (PI): the agent does the research",
      paragraphs: [
        `This is where the coding agent behaves like a researcher. It reviews relevant literature, forms a hypothesis about why the policy is failing, and edits the training code directly against the real-world verification results. One harness supports several learning paradigms: heuristic policies, behavior cloning, online and offline reinforcement learning, and code-based policy synthesis.`,
        `The agent logs trajectories, video, and reward signals, inspects the statistics, and uses them to decide what to change next, whether that is the algorithm, a hyperparameter such as batch size or behavior-cloning regularization, or the training infrastructure itself. The output is improved training code and configuration.`,
      ],
    },
    {
      heading: "Module 3, Rollout (R): run it on real robots",
      paragraphs: [
        `The Rollout module executes a policy on one or more physical robots at once. It feeds the policy visual and proprioceptive observations, sends action commands, and applies EN's reward and safety constraints. Its output is real trajectory data, success and failure signals, and rich debugging information for the agent to read back. Running many robots in parallel is what lets the system test many ideas per hour.`,
      ],
    },
    {
      heading: "Module 4, Evolution (E): a fleet of agents that share what works",
      paragraphs: [
        `Evolution is the multi-agent layer. N agents drive N robots to test N hypotheses asynchronously, coordinating through decentralized, Git-based collaboration. Agents share recipes by cherry-picking, copying, or merging successful training branches from their peers, and they abandon weak hypotheses based on measured average success rates. The result is a distributed hypothesis search that converges faster than a single agent and produces insights that transfer to new tasks.`,
      ],
    },
    {
      heading: "The loop, end to end",
      paragraphs: [
        `The four modules chain into one cycle. EN gives a safe, verifiable environment. PI directs the agent to change the policy. R collects real-world data from that change. E pools what every agent learned across the fleet. Then it repeats. Because each step is automated, the agent can run this loop for hours with little or no human involvement, which is the whole point: the human leaves the inner loop.`,
      ],
    },
    {
      heading: "The coding agents and their sandbox",
      paragraphs: [
        `ENPIRE is a harness, not a single model, so different frontier coding agents drop into the same slot. The paper evaluates agents built on Codex, Claude Code, and Kimi Code. Each one reads the task description, demonstration videos, proprioception logs, reward-accuracy statistics, and outside literature, and it edits the training pipeline, the behavior-cloning or reinforcement-learning algorithm, and the hyperparameters.`,
        `The agent operates inside an isolated research repository with elevated autonomy and no per-step human approval, plus open internet access for reading papers. It sees the current session's robot data, while data from prior sessions is pruned so that runs stay isolated and comparable.`,
      ],
    },
    {
      heading: "The hardware",
      paragraphs: [
        `The system runs on a fleet of up to eight bimanual robots with multi-camera depth perception (a top-down camera plus wrist-mounted cameras), each station backed by a single high-end GPU. Policies run at roughly 30 Hz inference over a 100 Hz joint-control loop, and the reward verifier is tuned to run fast enough, well under 200 ms, to keep the control loop responsive.`,
      ],
    },
    {
      heading: "Tasks and results",
      paragraphs: [
        `The headline result: powered by ENPIRE, frontier coding agents autonomously develop policies that reach about 99% success on hard, dexterous, real-world manipulation tasks, with little human supervision. The task suite spans several skills:`,
      ],
      list: [
        `Push-T, a non-prehensile alignment task where the robot must nudge a T-shaped block into place using contact rather than a grasp. Agents solved it in simulation within a couple of hours, but the real world proved much harder because of variable contact friction and non-deterministic physics.`,
        `Pin insertion into 4 mm clearance holes, targeting 50 consecutive successes. The autonomously developed policy converged to 100% success, and did so faster than a strong human-in-the-loop baseline. Scaling the fleet from one to four to eight agents cut wall-clock time from over an hour and a half to roughly forty minutes.`,
        `Zip-tie cutting, where the agent discovered a hybrid strategy that pairs a learned vision-language-action policy with a code-based routine that hovers above the object before cutting.`,
        `GPU insertion, seating a card in a thin socket, which reused insights the agent had already found on pin insertion, evidence that recipes transfer across tasks.`,
        `A simulation benchmark, where ENPIRE outperformed both an end-to-end VLA policy and a zero-shot code-as-policies tool-use baseline by discovering a detect-then-plan-then-hover strategy.`,
      ],
    },
    {
      heading: "Where the wins come from",
      paragraphs: [
        `An analysis of the pin-insertion "idea tree" shows the shape of the improvement. Adding behavior-cloning regularization contributed roughly a 10.8 point jump in success rate, while later refinements such as batch-size tuning and controller compensation each gave under 1.3 points as the policy approached 100%. Most of the gain comes from a few good algorithmic ideas, not from endless small tuning, which is a useful signal about where the agent's effort actually pays off.`,
      ],
    },
    {
      heading: "The cost of parallelism",
      paragraphs: [
        `The paper is honest about the price of a bigger fleet. Adding robots reaches success sooner in wall-clock time, roughly linearly up to four agents, but token usage grows faster than linearly and rises sharply at eight agents. Two metrics make this concrete. Mean robot utilization falls as the fleet grows, because agents spend more time reading logs, writing code, and summarizing peers' branches than actually commanding robots. Mean token utilization, meanwhile, climbs. So a larger fleet buys speed, but at a disproportionately higher token budget.`,
      ],
    },
    {
      heading: "Limitations",
      paragraphs: [
        `Two limits stand out and the authors name both. First, the robots are under-utilized: while an agent reads logs, writes code, debugs, or waits on its language-model backbone, its robot sits idle, and that imbalance worsens as the fleet scales. Second, token cost scales super-linearly with fleet size, so the wall-clock speedup from more robots comes at a growing token price. Both point at the same open problem, keeping expensive hardware busy while the agent thinks.`,
      ],
    },
    {
      heading: "Why it matters",
      paragraphs: [
        `ENPIRE reframes real-world robot learning as something a coding agent can optimize the way it already optimizes software. By making reset, verification, rollout, and cross-agent evolution automatic, it removes the human from the inner loop and lets frontier agents push dexterous manipulation to near-perfect success with little supervision. The bet is that the road to general physical intelligence runs through agents that improve robot policies autonomously, and ENPIRE is a concrete harness built to test that bet.`,
      ],
    },
  ],
};
