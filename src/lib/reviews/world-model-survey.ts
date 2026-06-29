import type { Paper } from "@/lib/literature";

// `String.raw` lets us write LaTeX (and inline `$...$` math) without escaping
// every backslash. Avoid any literal "${" sequence inside these templates.
const r = String.raw;

export const worldModelSurvey: Paper = {
  slug: "world-model-survey",
  title: "World Model for Robot Learning: A Comprehensive Survey",
  authors:
    "Bohan Hou, Gen Li, Jindou Jia, Tuo An, Xinying Guo, Sicong Leng, Haoran Geng, Yanjie Ze, Tatsuya Harada, Philip Torr, Oier Mees, Marc Pollefeys, Zhuang Liu, Jiajun Wu, Pieter Abbeel, Jitendra Malik, Yilun Du, Jianfei Yang (18 authors)",
  year: "2026",
  venue: "arXiv:2605.00080",
  summary:
    "A survey of world models — predictive representations of how environments evolve under actions — across robot learning: coupling with policies, learned simulators for RL and evaluation, the progression of robotic video world models from imagination to foundation scale, applications to navigation and driving, and the benchmarks that measure them.",
  citation: `@misc{hou2026worldmodel,
  title={World Model for Robot Learning: A Comprehensive Survey},
  author={Bohan Hou and Gen Li and Jindou Jia and Tuo An and Xinying Guo and Sicong Leng and Haoran Geng and Yanjie Ze and Tatsuya Harada and Philip Torr and Oier Mees and Marc Pollefeys and Zhuang Liu and Jiajun Wu and Pieter Abbeel and Jitendra Malik and Yilun Du and Jianfei Yang},
  year={2026},
  eprint={2605.00080},
  archivePrefix={arXiv},
  primaryClass={cs.RO},
  url={https://arxiv.org/abs/2605.00080},
}`,
  sections: [
    {
      paragraphs: [
        r`A world model is a predictive representation of how an environment evolves under actions. Hand it the current observation (or a latent state) and a candidate action, and it predicts what comes next: the next observation, the next state, sometimes a reward. This survey (18 authors spanning NTU, Berkeley, Stanford, Oxford, ETH, and more) argues that this one capability — a learned simulator of consequences — has become a central component of modern robot learning. It feeds policy learning, planning, simulation, evaluation, and data generation, and it has accelerated sharply on the back of foundation models and large-scale video generation.`,
        r`The review organizes the field along four questions: how world models *couple with* robot policies, how they act as *learned simulators* for reinforcement learning and evaluation, how *robotic video world models* have progressed from raw imagination to controllable and foundation-scale systems, and how all of this transfers to *navigation and autonomous driving*. It closes with the datasets, benchmarks, and open problems that will decide whether the idea keeps scaling.`,
      ],
    },
    {
      heading: "Background: world models, video models, and policies",
      paragraphs: [
        r`Formally, a world model learns a transition that predicts the next observation from the history of observations and the chosen action,`,
      ],
      equations: [
        r`\hat{o}_{t+1} = f_\theta(o_{\le t},\, a_t),`,
      ],
    },
    {
      paragraphs: [
        r`or, more commonly at scale, it predicts in a compressed *latent* space, $\hat{z}_{t+1} = f_\theta(z_t, a_t)$, with an encoder mapping observations to $z$ and a decoder reconstructing observations when needed. The survey carefully separates a *world model* (action-conditioned, used to roll the future forward for control) from a *video generation model* (which may produce realistic frames but need not be conditioned on, or faithful to, actions). The interesting recent story is the two converging: video generators are increasingly used as the backbone of world models.`,
        r`On the policy side, the two archetypes are the **visuomotor policy** (pixels and proprioception in, low-level actions out) and the **vision-language-action (VLA)** policy (a vision-language model fine-tuned to also emit actions, so language instructions condition behavior). World models slot underneath both.`,
      ],
    },
    {
      heading: "World model for policy",
      paragraphs: [
        r`The first major axis is using a world model to *help learn the policy itself*. The survey's argument for why this helps: predicting the future forces the representation to capture dynamics, affordances, and the consequences of actions — exactly the structure a controller needs — and it lets you pretrain on enormous amounts of action-free video before ever touching robot data. It then catalogs several couplings:`,
      ],
      list: [
        r`**Inverse-dynamics policies.** Predict (or imagine) a future goal observation with a world/video model, then recover the action that bridges the present and that future via an inverse-dynamics model. The world model proposes *what should happen*; inverse dynamics answers *what to do to make it happen*.`,
        r`**Unified policies with a single world-model backbone.** One shared predictive backbone serves both future prediction and action generation, rather than bolting a separate policy head onto a frozen model.`,
        r`**MoE / MoT-style policies with expert world-model backbones.** Mixture-of-experts (or mixture-of-transformers) designs route between specialized predictive experts, decoupling capacity from per-step compute while keeping the world-model prior.`,
        r`**Unified vision-language-action models.** Fold prediction and action into one VLA so that language, future imagination, and control share a representation.`,
        r`**Latent-space world modeling.** Do all the prediction in latent space (JEPA-style joint-embedding prediction, Dreamer-style latent rollouts) and never pay for pixel reconstruction in the control loop — the efficient default for closed-loop robotics.`,
      ],
    },
    {
      heading: "World model as simulator",
      paragraphs: [
        r`The second axis treats the world model as a *learned simulator* you can run instead of the real robot or a hand-built physics engine. Two uses:`,
      ],
      list: [
        r`**For reinforcement learning.** Train the policy by rolling out *inside* the world model ("learning in imagination," the Dreamer lineage). Imagined rollouts are cheap, parallel, and safe, so you can collect orders of magnitude more experience than real hardware allows — provided the model is accurate enough that policies trained in it transfer.`,
        r`**For evaluation.** Use the world model as a neural simulator to score candidate policies without expensive, slow, or unsafe real-world rollouts. This is appealing and dangerous in equal measure: a model that looks plausible but mispredicts the dynamics that matter will happily rank a bad policy first.`,
      ],
    },
    {
      heading: "World model for robotic video generation",
      paragraphs: [
        r`The richest part of the survey traces how video-generation models grew into robotic world models, as a clear technical progression:`,
      ],
      list: [
        r`**Imagination for policy learning.** Early work generates future video as raw "imagination" to supervise or augment policies — visually compelling, but only weakly tied to actions.`,
        r`**Toward action-controllable video world models.** The next step conditions generation on actions so the same start state produces different, correct futures under different commands. Controllability is what turns a video model into a usable world model.`,
        r`**Structure-aware generation with interaction and geometry priors.** Inject physical structure — contacts, object interactions, 3D geometry — so the predicted futures respect how the world actually behaves rather than merely looking real.`,
        r`**From video backbones to foundation world models.** Foundation-scale, broadly pretrained generators are adapted into general world models that transfer across embodiments and tasks.`,
      ],
    },
    {
      paragraphs: [
        r`The survey is candid about the open challenges this progression exposes: long-horizon temporal consistency (errors compound frame to frame), faithful action controllability, physical plausibility, and the gap between visual realism and *control usefulness* — a model can generate beautiful frames that are useless for planning.`,
      ],
    },
    {
      heading: "Other applications: navigation and driving",
      paragraphs: [
        r`The same machinery generalizes beyond manipulation. In **navigation**, a world model predicts future egocentric observations conditioned on motion, so an agent can plan by imagining where a path leads before committing to it. In **autonomous driving**, driving-specific world models generate future scenes conditioned on ego-actions and other agents, supporting planning, simulation, and the generation of rare, safety-critical scenarios that are hard to collect on the road. The survey uses both to show that "predict the future under an action" is a single idea wearing different sensor suites.`,
      ],
    },
    {
      heading: "Benchmarks, datasets, and results",
      paragraphs: [
        r`A survey is only as useful as the yardsticks it collects. This one catalogs three things: **benchmarks** that evaluate world models on both raw prediction quality and downstream policy success; **datasets** for training, spanning large-scale robot interaction data and internet-scale video; and **representative results** comparing methods on common benchmarks. The recurring caution is that prediction-quality metrics (pixel or perceptual fidelity) and task-success metrics often disagree, so a model that wins on one can lose on the other.`,
      ],
    },
    {
      heading: "Challenges and future directions",
      paragraphs: [
        r`The closing chapter is the most useful for picking a research direction. The authors group the open problems as:`,
      ],
      list: [
        r`**Causal conditioning gaps.** Models latch onto correlations in the data instead of the true causal effect of actions, so they predict confidently wrong futures off-distribution.`,
        r`**Efficiency bottlenecks.** High-fidelity video world models are slow — often far too slow to run inside a real-time control loop — which is the practical wall between an impressive demo and a deployed controller.`,
        r`**Multi-modal perception bottlenecks.** Fusing vision with touch, proprioception, audio, and language into one predictive model remains hard and under-explored.`,
        r`**Classical control integration.** Marrying learned world models with the classical control and planning stack (MPC, optimal control) that already works, rather than replacing it wholesale.`,
        r`**Symbolic structure integration.** Bringing in symbolic and structured priors for compositional, long-horizon reasoning the pixel models lack.`,
        r`**Evaluation metrics.** The field still lacks metrics that reliably predict whether a world model will be *useful for control*, not just whether it looks good.`,
      ],
    },
    {
      paragraphs: [
        r`My takeaway: the survey's most valuable move is insisting on the split between *visual fidelity* and *control usefulness*. It's easy to be seduced by a model that renders gorgeous futures; what matters for robot learning is whether rolling that model forward under an action produces consequences accurate enough to plan or train against. Most of the open problems above are really restatements of that one gap.`,
      ],
    },
    {
      heading: "Key vocabulary",
      definitions: [
        { term: "World model", definition: r`An action-conditioned predictive model of how an environment evolves: given state and action, predict the next state/observation.` },
        { term: "Video generation model", definition: r`A model that produces realistic future frames; becomes a world model when conditioned on, and faithful to, actions.` },
        { term: "Visuomotor policy", definition: r`A policy mapping raw observations (pixels, proprioception) directly to low-level actions.` },
        { term: "Vision-Language-Action (VLA)", definition: r`A vision-language model fine-tuned to also output actions, letting language instructions condition robot behavior.` },
        { term: "Inverse dynamics", definition: r`A model that recovers the action connecting a current observation to a desired next/goal observation.` },
        { term: "Latent imagination", definition: r`Rolling the world model forward in a compressed latent space (Dreamer-style) to train or plan without rendering pixels.` },
        { term: "JEPA", definition: r`Joint-embedding predictive architecture; predicts in representation space rather than reconstructing observations.` },
        { term: "Action controllability", definition: r`The property that a generative world model produces different, correct futures for different conditioning actions.` },
        { term: "Neural simulator", definition: r`Using a learned world model in place of real rollouts or a physics engine, for RL training or policy evaluation.` },
        { term: "Foundation world model", definition: r`A broadly pretrained, foundation-scale generator adapted into a general world model that transfers across embodiments and tasks.` },
      ],
    },
  ],
};
