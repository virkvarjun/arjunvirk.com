import type { Chapter } from "../chapters";

// The Robotics Bible — Chapter 11. Prose is authored in
// content/robotics-bible/chapter-11-world-models.md and transcribed here
// verbatim into the Chapter/section schema; figures are mounted by id and
// rendered from the diagram registry (rb-11-1 … rb-11-8).

export const chapter11: Chapter = {
  slug: "chapter-11-world-models",
  number: "11",
  title: "World Models & Simulation",
  summary:
    "Escaping the data bottleneck: learned world models, Dreamer, video-generation models, Gaussian splatting, sim2real, and phys2real.",
  published: "Sep 14, 2026",
  updated: "Sep 14, 2026",
  futureRef:
    "The *concepts* here are stable — the definition of a world model, the four uses, the reality gap, domain randomization, the implicit-vs-explicit split between NeRF and 3DGS, and above all \"reliability beats realism\" — and won't change. The *systems* are moving fast: Dreamer, UniPi, GR-1/GR-2, Genie, V-JEPA 2, MuJoCo, Isaac, and 3DGS are the established anchors to trust, while Phys2Real, DreamGen, EmbodieDreamer, RoboGSim, and DreMa are recent and bleeding-edge — treat the specific results as a 2025–2026 snapshot, not gospel. Come back to Fig 11.1 (the dreaming loop) whenever a learning method later confuses you about *where the experience is coming from*, and to Fig 11.8 (drift) whenever a system's demo looks too good — the question is never \"is it realistic?\" but \"how far can I trust it?\"",
  sections: [
    {
      paragraphs: [
        "*Robot data is scarce and expensive, so we stop begging the real world for it: we build a fake world to practice in, or we teach the robot to dream one — and then we spend the whole chapter fighting the gap between the dream and reality.*",
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        "Chapter 10 ended on a bill we couldn't pay. Robot data is *expensive* — every demonstration costs a human, a robot, a workspace, and wall-clock time, and none of it scales the way a web scrape of text does. A language model gets to feast on the internet. A robot policy gets teleoperated one careful trajectory at a time. That mismatch is the whole reason this chapter exists.",
        "There are only two ways out of a data famine. Either you **build a world** to practice in — a simulator, cheap and fast and infinitely repeatable — or you **learn a world** from the data you already have and let the robot practice inside its own imagination. Both are attempts to manufacture experience that the real world charges too much for. And both walk straight into the same villain.",
        "That villain is the **reality gap**: a policy that's brilliant in the fake world falls on its face in the real one, because the fake world's physics, textures, and timing never quite match ours. Its partner-in-crime is the one we're escaping — **data scarcity** — because if the fake world were free *and* perfect we'd never touch a real robot again. The heroes we'll recruit against them are old friends and new ones: **domain randomization** (make the fake world so varied that reality is just one more sample), **learned world models** (dream the future instead of rendering it), and **physics-grounded twins** (measure the real world instead of guessing it).",
        "I'm assuming you've read Chapter 7 (reinforcement learning, the MDP loop, massively-parallel sim), Chapter 9 (the vision-language-action stack, GR00T, FLARE), and Chapter 10 (why demonstrations are scarce). We build everything else from zero.",
        "Here's the road, and every stop is a fix for the one before it. We define what a world model actually *is*, then why a robot wants one. We meet the classic latent-imagination line (Dreamer), then the video-generation models that predict the future as pixels, then the latent/JEPA models that predict *embeddings* instead of pixels because pixels are too expensive. We switch to hand-built simulators, cross the reality gap with sim-to-real, then learn to build worlds from a phone with 3D Gaussian Splatting, ground them in real physics with Phys2Real, and end on the honest truth: for a world model, **reliability beats realism**, and drift is the thing that eats you alive.",
        "Let's go.",
      ],
    },
    {
      heading: "What a world model actually is",
      paragraphs: [
        "Start with the intuition, because the phrase \"world model\" gets thrown around until it means nothing. Close your eyes and imagine reaching for a coffee cup. You can *see* your hand approaching it before you move a muscle. Nudge the cup left in your mind's eye and your imagined hand adjusts. That predictive movie — \"if I do *this*, the world will become *that*\" — is a world model. Cognitive scientists have called this an **internal model** for decades: the brain's running simulation of its own body and surroundings, used to predict the consequences of action before committing to it.",
        "Now the precise version. A **world model** is a predictive model of agent–environment dynamics: given the current state or observation and a proposed action, it predicts the future state(s). The NTU MARS survey (*World Model for Robot Learning: A Comprehensive Survey*, 2025) frames it as learning",
      ],
    },
    {
      equations: [String.raw`p(x_{t+1:t+H} \mid x_t,\; a_{t:t+H-1},\; \text{goal})`],
    },
    {
      paragraphs: [
        "and let's read every symbol out loud, because the notation is doing real work. $x_t$ is what the robot knows right now — a camera frame, a joint-state vector, a latent code, whatever \"state\" means for this system. $a_{t:t+H-1}$ is a *sequence* of actions the robot is considering taking, from now until $H$ steps ahead. $H$ is the **horizon** — how far into the future we're predicting. $x_{t+1:t+H}$ is the predicted future, one state per step. And the whole thing is conditioned on a **goal**, because a robot rarely predicts the future for its own sake; it predicts in service of getting somewhere. The model is a probability distribution — a \"$p$\" — because the future is uncertain and honest models say so.",
        "Here's the part beginners miss, and it's the whole definition: a world model is **not** just a fancy video generator. A model that produces plausible-looking future frames but ignores what the robot *does* is useless for control — it's a daydream, not a plan. The defining property is that it predicts how the future changes **under the robot's actions**, in a way that supports **decision-making**. Change the action, get a different future. That action-conditioning is what separates a world model from a pretty movie.",
        "That one property buys three capabilities, and they're the reason the rest of this chapter exists:",
      ],
    },
    {
      list: [
        "**Foresight** — see the consequence of an action before paying for it in the real world.",
        "**Imagination-driven planning** — roll out many candidate action sequences in the model, compare their imagined outcomes, pick the best. (Look ahead — this is planning-as-search over dreamed futures.)",
        "**Data amplification** — generate synthetic experience, so the scarce real data of Chapter 10 goes further.",
      ],
    },
    {
      paragraphs: [
        "The modern resurgence of all this traces to one paper: Ha & Schmidhuber's **\"World Models\" (2018)**, which showed an agent could learn a compact model of a game environment and then train its policy almost entirely *inside* that learned model — dreaming, then acting. Everything downstream in this chapter is a descendant of that idea, scaled up and pointed at robots.",
      ],
    },
    {
      diagram: {
        id: "rb-11-1",
        caption:
          "A world model swaps the expensive real world for a cheap imagined one: the same policy loop from Chapter 7, but now the environment is dreamed, so the robot can practice thousands of times for the price of one real step.",
      },
    },
    {
      quiz: {
        question:
          "Someone shows you a neural network that takes a robot's camera frame and generates a gorgeous, photorealistic video of what happens next. They call it a world model. What single question tells you whether they're right?",
        answer:
          "Ask: *does it condition on the robot's action?* A world model must predict a **different** future when you feed it a different action — that action-conditioning is the defining property, because the entire point is decision-making (\"if I do this, what happens?\"). A network that generates one plausible future regardless of what the robot does is a passive video predictor, not a world model; you can't plan with it, because planning means comparing the outcomes of *candidate actions*. Beauty of the frames is irrelevant. Controllability under action is the test.",
      },
    },
    {
      heading: "Why a robot wants one",
      paragraphs: [
        "We've said a world model buys foresight, imagination, and data. Now let's cash those out into the four concrete jobs a world model does in a robotics stack — the survey's taxonomy of *uses*, and each one is a direct answer to a pain you've already met.",
        "**Use 1 — model-based RL.** Chapter 7 trained policies by having them act, over and over, in an environment. If that environment is real hardware, you're wearing out motors and waiting for wall-clock time. The fix: learn a world model, then train the policy **inside the model**. The policy proposes actions, the model predicts what happens, the policy gets a reward signal — all without touching a real robot. This is what \"model-based\" means: a learned model of the dynamics stands in for the real dynamics. It's the direct sequel to Chapter 7, and it's why Ha & Schmidhuber's title became a rallying cry.",
        "**Use 2 — planning.** Instead of training a reactive policy, sometimes you just want to *think ahead at decision time*. Imagine a handful of candidate action sequences, roll each one forward in the world model, and pick the sequence whose imagined outcome is best. If you re-plan every step — commit to the first action, then re-imagine from the new state — you've turned the world model into the dynamics for **Model Predictive Control (MPC)**, the same MPC that shows up in classical control, but with a *learned* model of the world instead of a hand-derived one.",
        "**Use 3 — data generation and augmentation.** This is the one that pays Chapter 10's bill directly. A world model can **synthesize demonstrations** — dream up new trajectories the robot never actually performed — and if you can recover executable actions from those dreams, you've amplified a scarce dataset into a large one. We'll see a concrete data engine (DreamGen) doing exactly this later.",
        "**Use 4 — evaluation.** Before you deploy a policy on real hardware, you'd like to know if it's any good, without risking a $100,000 robot on a bad one. A world model gives you an **imagined world to test in** — a safe, fast proving ground. (Side note: this use is quietly one of the most valuable, because real-robot evaluation is nearly as expensive as real-robot training.)",
        "Notice the through-line: model-based RL, planning, data generation, evaluation — every one of them is a way to *not spend real-world resources*. That's the whole pitch. The world model is a money-printer for experience, and the reality gap is the counterfeit-detector we spend the back half of the chapter appeasing.",
      ],
    },
    {
      quiz: {
        question:
          "You have a decent learned world model and a real robot. Give one reason you might use the world model for *evaluation* even after your policy is trained and deployed.",
        answer:
          "Because real-robot evaluation is expensive and slow — every test run costs hardware time, human supervision, and risk of breakage — so you'd like to catch regressions cheaply before they hit the metal. An imagined test environment lets you run a policy against many scenarios (rare edge cases, adversarial layouts, long horizons) in seconds, at zero physical risk. It won't be a perfect stand-in — the reality gap applies to evaluation too — but as a first filter it saves your real-robot budget for the policies that already look good in the dream. Evaluation is the fourth use precisely because testing is as costly as training.",
      },
    },
    {
      heading: "The classic line: Dreamer and latent imagination",
      paragraphs: [
        "So we want to train a policy inside a learned model. The naive way is obvious and doomed: predict the raw future *pixels*. Feed the model the current camera frame and an action, have it generate the next frame, then the next, and let the policy learn from that dreamed video. Watch it break. Predicting every pixel is astronomically expensive — a single 256×256 RGB frame is ~200,000 numbers — and worse, it's *unstable*: tiny per-pixel errors compound over a rollout until the dreamed video dissolves into mush. You'd spend all your model's capacity rendering the exact texture of the tablecloth, none of it on the thing that matters — the *dynamics*.",
        "The fix is the central idea of the **Dreamer** family (Hafner et al.): don't predict pixels — predict a compact **latent state**. A **latent state** is a small vector (a few hundred numbers, not 200,000) that captures *what matters* about the scene for predicting the future: where the objects are, how they're moving, what the robot is doing. You learn an encoder that compresses each observation into this latent, and a **latent dynamics model** that predicts the *next latent* from the current latent and the action. Then — here's the beautiful part — you never leave latent space. The policy \"dreams\" by rolling the latent dynamics forward, step after step, entirely in this compact space, never rendering a single pixel during imagination.",
        "Why is this so much better? Two reasons, and they're the same two that killed the pixel approach. It's **cheaper**: rolling forward a 300-number vector is trivial compared to generating a 200,000-number image every step, so you can dream thousands of trajectories fast. And it's **more stable**: a compact latent throws away the high-frequency pixel detail that was compounding into garbage, keeping only the coarse structure the dynamics actually depend on. You predict the *gist* of the future, not its every freckle.",
        "The training loop, in one breath: collect some real experience, learn the encoder + latent dynamics from it, then train the policy by dreaming long rollouts in latent space and rewarding good imagined outcomes — occasionally going back to reality to collect more experience and correct the model. **DreamerV3** (Hafner et al., 2023) turned this into a *general* result: the same algorithm, the same hyperparameters, learning across a huge range of domains — from Atari to continuous control to, famously, collecting diamonds in Minecraft from scratch — without per-task tuning. That generality is why Dreamer is the anchor of the whole learned-world-model line. It showed latent imagination isn't a trick for one environment; it's a recipe.",
      ],
    },
    {
      diagram: {
        id: "rb-11-2",
        caption:
          "Predicting every pixel is expensive and drifts into mush; predicting a compact latent is cheap and stable, so you dream long rollouts and only render at the end — the core Dreamer idea.",
      },
    },
    {
      quiz: {
        question:
          "Dreamer trains its policy almost entirely inside a learned latent model, yet it still periodically collects fresh experience from the real environment. Why can't it just dream forever?",
        answer:
          "Because the world model is only accurate near the data it was trained on, and as the policy improves it visits *new* states the model has never seen — regions where the model's predictions are unreliable or plain wrong. Dream forever and the policy will happily exploit the model's *errors*, learning to succeed in a fantasy that reality won't honor (the model hallucinates a reward, the policy chases it, the real robot fails). Periodically collecting real experience corrects the model in exactly the regions the current policy cares about, keeping the dream tethered to reality. It's the same tether we'll name explicitly at the end of the chapter: a world model is only as useful as it is *reliable* over the horizon you trust it.",
      },
    },
    {
      heading: "Video-generation world models",
      paragraphs: [
        "Latent dreaming is powerful, but there's a second, more visually literal family, and it's exploded alongside the rise of video-generation models. The idea: predict the future **as video**, conditioned on an action or a goal. Feed the model the current frame and \"pick up the red block,\" and it generates the frames showing the block being picked up. It's a world model in the fullest sense — a controllable movie of the future — and because it lives in pixel space, it can ride the coattails of every advance in text-to-video generation.",
        "But a video isn't an action. If the model dreams a beautiful clip of the block being lifted, the robot still needs *joint commands*. This is where **UniPi** (Du et al., 2023) introduced the pattern worth memorizing — call it **decoupled predict-then-act**. Step one: generate a **video plan** — a sequence of future frames showing the task getting done, conditioned on a goal. Step two: hand consecutive frames to a separate **inverse-dynamics model** that answers \"what action turns *this* frame into *that* frame?\" and out come the executable actions. The world model does the imagining; a small inverse-dynamics head does the translating. Decoupling the two lets each be trained on the data it's cheapest to get — video is abundant, action labels are scarce.",
        "The next move is to stop decoupling and predict actions *and* frames together. **GR-1 / GR-2** (Wu et al., 2023–2024) are GPT-style transformers that, given the history, jointly predict the **next action** and the **future frames** in one shared model. Learning to predict the future frames turns out to be a fantastic auxiliary task — it forces the model to understand the scene's dynamics, which makes its action predictions better. One backbone, two outputs, mutually reinforcing.",
        "A few more anchors, kept light:",
      ],
    },
    {
      list: [
        "**Genie** (Bruce et al., 2024) and its **Genie Envisioner** descendants learn *interactive* environments — you can act inside the generated world and it responds, frame by frame, like a playable game learned purely from video. A learned world you can drive.",
        "**DreamGen** (2025, recent) is a **data engine**: it synthesizes neural trajectories — dreamed rollouts — and recovers *executable* actions from them, manufacturing training data for policies. This is Use 3 (data generation) made concrete, and it plugs straight into the GR00T stack from Chapter 9: dream the demonstrations you couldn't afford to collect.",
      ],
    },
    {
      paragraphs: [
        "Now, the survey organizes this zoo, and it's worth seeing the shape at a high level (don't memorize it — just feel the axes). It splits world models into **world-model-for-policy** (the model is part of how you produce actions — arranged as *decoupled* like UniPi → *single-backbone* like GR-1 → *unified-VLA* → *latent* like Dreamer) versus **world-model-as-simulator** (the model is a stand-in environment, for RL and for evaluation). And under it all sits a clean probabilistic view of who predicts what:",
      ],
    },
    {
      table: {
        rows: [
          ["Role", "Distribution", "Reads as"],
          ["Policy", "$p(a \\mid o)$", "given an observation, what action?"],
          [
            "Passive / video world model",
            "$p(o' \\mid o)$",
            "given an observation, what comes next?",
          ],
          [
            "Controllable world model",
            "$p(o' \\mid o, a)$",
            "given an observation **and an action**, what comes next?",
          ],
          [
            "Inverse dynamics",
            "$p(a \\mid o, o')$",
            "given two observations, what action bridged them?",
          ],
        ],
      },
    },
    {
      paragraphs: [
        "That third row — $p(o' \\mid o, a)$, the *controllable* one — is the world model in the strict sense, and you can see the whole chapter in this table: the policy picks $a$, the controllable model predicts $o'$, and inverse dynamics (UniPi's second stage) recovers the $a$ that a passive video model left implicit.",
      ],
    },
    {
      diagram: {
        id: "rb-11-3",
        caption:
          "A world model earns the name only when the action changes the future: feed the same frame two different actions and you get two different rollouts — controllable prediction, p(o' | o, a), not a fixed movie.",
      },
    },
    {
      quiz: {
        question:
          "UniPi generates a video of the task getting done, but a video can't drive motors. What does its second stage do, and why is splitting the problem this way clever about data?",
        answer:
          "The second stage is an **inverse-dynamics model**: it looks at two consecutive generated frames and infers \"what action turns the first into the second,\" producing the executable commands the video plan implied. Splitting it this way is clever because the two halves need different, differently-abundant data. Generating a plausible future *video* can be learned from huge amounts of ordinary video (no action labels needed), while learning the frame→frame→action mapping needs far less action-labeled data because it's a narrow, local problem. So you spend your scarce action labels only where they're unavoidable and let cheap video carry the heavy lifting of imagining the plan — a direct hedge against Chapter 10's data scarcity.",
      },
    },
    {
      heading: "Predict embeddings, not pixels: JEPA-style world models",
      paragraphs: [
        "Video-generation world models are seductive because you can *watch* them, but that's also their weakness — the same one that first killed pixel-Dreamer. To generate a future frame, the model has to commit to every pixel: the exact grain of the wood, the precise glint on the gripper, the shadow under the block. Almost none of that matters for deciding what to do, and predicting it burns compute and invites drift. There's a nagging suspicion here: *why are we predicting things we're going to throw away?*",
        "The **JEPA** answer (Joint-Embedding Predictive Architecture) is to predict the **future in embedding space** instead of pixel space. Encode the current observation into an embedding, encode the future observation into an embedding, and train the model to predict the *future embedding* from the current one and the action — never reconstructing a single pixel. You're predicting a *representation* of the future, not the future's appearance. All the unpredictable, decision-irrelevant detail (exact textures, lighting speckle) simply isn't in the embedding, so the model isn't punished for failing to hallucinate it. It can hedge on the stuff that doesn't matter and focus its capacity on the stuff that does — the geometry and dynamics that actually decide the outcome.",
        "**V-JEPA 2** (Meta, 2025, recent) is the anchor: a video model trained to predict future latent representations, which then supports **zero-shot planning** for robot manipulation — plan in the learned representation space, on tasks it wasn't explicitly trained to control. And this should ring a bell from Chapter 9: GR00T N1.5's **FLARE** objective did a *future-latent alignment* trick in exactly this spirit — align what the policy predicts with the embedding of the actual future, so the policy learns a predictive representation of what's about to happen without ever rendering it. Same insight, different home: **the useful part of \"imagining the future\" is imagining its *representation*, not its picture.**",
        "The trade to be honest about: you lose the ability to *look at* the prediction. A pixel world model gives you an inspectable movie you can eyeball for sanity; a JEPA model gives you a vector you have to trust. You've traded interpretability and fidelity for efficiency and stability. For *planning and control* — where all you need is \"which action leads to a better future-state\" — that's usually the right trade. For *data generation*, where you actually want renderable demonstrations, the pixel models keep their seat at the table. Different jobs, different families.",
      ],
    },
    {
      diagram: {
        id: "rb-11-4",
        caption:
          "Predicting every pixel wastes capacity on detail you'll discard; predicting the future *embedding* keeps only what decides the action — cheaper, steadier, and the idea behind V-JEPA 2 and GR00T's FLARE.",
      },
    },
    {
      heading: "Simulators: the hand-built world",
      paragraphs: [
        "Everything so far *learned* a world from data. But there's an older, brute-force escape from data scarcity: don't learn a world — **write one down**. A **simulator** is a hand-built physics engine that computes what happens when bodies collide, joints torque, and gravity pulls, from first principles and measured parameters. It's the opposite philosophy to a learned world model — engineered, not trained — and its virtues are exactly the ones a real robot lacks: it's **cheap** (no hardware to wear out), **safe** (a simulated robot falling costs nothing), **fast** (run faster than real time), and **infinite** (spin up as many episodes as compute allows). It's the fire hose of experience that Chapter 7's reinforcement learning drinks from.",
        "The main characters:",
      ],
    },
    {
      list: [
        "**MuJoCo** (Multi-Joint dynamics with Contact) is the workhorse of research, prized for **fast, accurate contact physics** — the hard part, because contact (a foot hitting the ground, a finger pressing a block) is where naive physics engines get jittery and wrong. Once commercial, it's now **open-source**, which cemented it as the default for control and RL research.",
        "**NVIDIA Isaac Sim / Isaac Lab** is the industrial-scale answer: **GPU-parallel** and **photorealistic**, able to simulate **thousands of robots at once** on a single GPU. This is the direct enabler of Chapter 7's massively-parallel RL — when you can run 4,096 quadrupeds learning to walk simultaneously, a policy that would take months on one robot trains in *minutes* of wall-clock time.",
        "**Genesis** and a growing crowd of others push on speed, differentiability, and generative scene creation — the field is moving fast here.",
      ],
    },
    {
      paragraphs: [
        "The pitch is simple: a simulator turns the data famine of Chapter 10 into a data flood. But — and you knew there was a but — the flood is made of *fake* water. Which brings us to the villain we've been circling the whole chapter.",
      ],
    },
    {
      quiz: {
        question:
          "Chapter 7's parallel RL trained a quadruped by running thousands of copies at once. Which property of a simulator makes that possible, and why can't you do the same on real hardware?",
        answer:
          "The property is that a simulator is **cheap, fast, and infinitely parallel** — a GPU-parallel engine like Isaac Lab spins up thousands of independent simulated robots on one machine and runs them faster than real time, so the millions of environment steps RL demands get collected in minutes instead of months. You can't do this on real hardware for the obvious physical reasons: you'd need thousands of physical robots, thousands of workspaces, real-time-limited clocks, and you'd destroy motors and break things as the untrained policy flails through its early garbage actions. Simulation removes the cost, the risk, and the wall-clock limit all at once — that's the entire reason RL for robots happens in sim first.",
      },
    },
    {
      heading: "Crossing the reality gap: sim-to-real done properly",
      paragraphs: [
        "Here's the villain, named plainly. Train a policy in simulation, deploy it on the real robot, and it *fails* — sometimes spectacularly. Why? Because the simulator is a **lie**, the same kind of useful lie we've been telling since Chapter 1's rigid links. Sim friction isn't real friction. Sim mass is a guess. Sim latency is zero; real latency isn't. Sim textures are clean; real lighting is a mess. Every one of these mismatches is a crack, and the policy — which overfit to the sim's exact quirks — falls through the crack. This is the **reality gap**, and it's the single biggest obstacle between \"works in sim\" and \"works on the robot.\"",
        "There are three families of fixes, and the first one is a genuinely counterintuitive hero.",
        "**Domain randomization** (Tobin et al., 2017) doesn't try to make the simulator *match* reality. It gives up on that — and does something smarter. It **randomizes** the simulator every episode: different textures, different lighting, different masses, different frictions, different sensor latencies, all sampled from wide ranges. Train across this chaos and the policy is forced to become *robust to variation* — it can't overfit to any single set of parameters because the parameters never sit still. The punchline is beautiful: **if you train across a wide enough distribution of fake worlds, the real world looks like just one more sample from that distribution.** You don't close the reality gap by aiming at reality; you close it by making your policy indifferent to which world it's in. (Tobin's original result — training a vision system on randomized non-photorealistic sim images that transferred to real object detection — is still the cleanest demonstration.)",
        "**Domain adaptation** takes the complementary route: instead of ignoring the gap, **align** the sim and real distributions. Learn a mapping so sim images look like real images (or vice versa), or **fine-tune** the sim-trained policy on a small amount of real data to pull it across the gap. Where randomization says \"be robust to everything,\" adaptation says \"let me *see* a little reality and adjust.\"",
        "**System identification** is the most literal: **measure** the real robot's actual physical parameters — its true mass, friction, motor constants, latency — and plug them into the simulator so the sim is genuinely more accurate. Less \"cover all possibilities\" or \"learn the mapping,\" more \"just get the numbers right.\"",
        "In practice, real systems blend all three: randomize the things you can't measure, adapt with a little real data, and identify the parameters you can pin down. Hold onto that blend — the last two sections of this chapter are really about doing the *third* one (system identification) much, much better, because blind randomization is wasteful and measured physics is precise.",
      ],
    },
    {
      diagram: {
        id: "rb-11-5",
        caption:
          "Domain randomization doesn't aim at reality — it makes reality just one sample: vary textures, lighting, mass, and friction every episode so the policy can't overfit to any single world, and the real one becomes one more draw from the distribution.",
      },
    },
    {
      quiz: {
        question:
          "Domain randomization deliberately makes the simulation *less* like any particular reality — random textures, random masses, wild lighting. How can making the sim *less* realistic make the policy work *better* on the real robot?",
        answer:
          "Because the failure mode is *overfitting to the sim's exact quirks*, not insufficient realism. A policy trained on one fixed simulation latches onto that sim's specific friction, mass, and appearance, and shatters when the real robot differs even slightly. Randomizing those parameters every episode denies the policy anything fixed to overfit to — it's forced to learn behavior that works across the *whole range* of frictions, masses, and looks. If the real robot's true parameters fall inside that range (the trick is choosing wide-enough ranges), then reality is just another sample the policy already knows how to handle. You trade per-world optimality for robustness, and robustness is what survives the reality gap. It's the randomization hero from Chapter 7, doing its defining job.",
      },
    },
    {
      heading: "Building worlds from a phone: 3D Gaussian Splatting",
      paragraphs: [
        "Domain randomization and hand-built simulators share a hidden cost: *someone has to build the world*. Modeling a real kitchen in a simulator — every cabinet, the exact geometry, photorealistic materials — is painstaking manual labor. What if you could just *photograph* a real scene and get a renderable, physically usable 3D world back? That's the promise of a technique that's rapidly reshaping robot world-building, and it deserves a proper primer.",
        "First, the thing it's replacing. **NeRF** (Neural Radiance Fields, 2020) reconstructs a 3D scene from photos by training a neural network — an MLP — to answer, for any point in space and any viewing direction, \"what color and how opaque is it here?\" The scene lives *implicitly*, baked into the network's weights. To render a pixel you march a ray through the scene, sampling the MLP at dozens of points along the ray and integrating — **volume rendering**. It's gorgeous, and it's *slow*: every pixel is dozens of neural-network queries, so training takes hours and rendering is far from real time. For a robot that needs to see the world *now*, that's a dealbreaker.",
        "**3D Gaussian Splatting** (Kerbl et al., 2023) throws out the implicit MLP for an **explicit** representation, and the speedup is dramatic. Represent the scene as a big cloud of **3D anisotropic Gaussians** — little translucent blobs. Each Gaussian carries a handful of parameters: a **position** (where it sits), a **covariance** (its shape and orientation — \"anisotropic\" means it can be a stretched ellipsoid, not just a round ball, so it can hug a thin surface), an **opacity** (how see-through it is), and a **view-dependent color** encoded with **spherical harmonics** (so a surface can look different from different angles — a glossy highlight that moves as you orbit). A scene is a few million of these blobs.",
        "To render, you **splat** them: project each 3D Gaussian onto the image plane — it becomes a 2D fuzzy ellipse — and blend the overlapping ellipses front-to-back with a fast **differentiable rasterizer**. No per-ray MLP sampling, no marching. Just project and blend, which GPUs are extraordinarily good at. The payoffs: **real-time rendering** (≥30 fps at 1080p), **fast training** from ordinary photos (minutes, not hours), and photorealism that matches or beats NeRF. And because the rasterizer is *differentiable*, you fit the Gaussians to your photos by gradient descent, the same optimization machinery as everything else in this guide.",
      ],
    },
    {
      table: {
        rows: [
          ["", "NeRF", "3D Gaussian Splatting"],
          [
            "Representation",
            "**Implicit** — an MLP field",
            "**Explicit** — millions of 3D Gaussians",
          ],
          [
            "How you render",
            "March rays, sample the MLP, volume-integrate",
            "Project (\"splat\") Gaussians, blend front-to-back",
          ],
          [
            "Speed",
            "Slow — dozens of net queries per pixel",
            "Real-time — ≥30 fps at 1080p",
          ],
          ["Training", "Hours", "Minutes"],
          [
            "Edit the scene",
            "Hard — it's baked in weights",
            "Easier — move/delete individual Gaussians",
          ],
        ],
      },
    },
    {
      paragraphs: [
        "Now, why a robotics chapter cares. **Fast photorealistic reconstruction from ordinary photos** means you can build a **digital twin** of a real workspace — from a *phone video* — in minutes. Three things follow. You can **convert the splats into collision geometry** and hand it to a physics engine, so the twin isn't just pretty, it's *physical* — the robot can push things in it. You can **train and plan in the twin**, then transfer to the real robot, with a much smaller reality gap because the twin was built *from* reality. And the recent systems make this concrete: **RoboGSim** uses splatting in a **Real2Sim2Real** loop (capture real → build a Gaussian sim → train → deploy), and **DreMa** combines 3DGS with a physics simulator to make a *manipulable* digital twin — one you can rearrange to **generate new demonstrations**, cashing out Use 3 again. Photograph the world, get a world model back.",
      ],
    },
    {
      diagram: {
        id: "rb-11-6",
        caption:
          "NeRF hides the scene in a slow implicit MLP you must ray-march; 3DGS makes it explicit — millions of little Gaussians you project and blend in real time — so you can rebuild a workspace from phone photos and use it as a robot's world.",
      },
    },
    {
      quiz: {
        question:
          "Both NeRF and 3D Gaussian Splatting reconstruct a photorealistic 3D scene from photos and both are trained by gradient descent. Give the one architectural difference that makes 3DGS real-time, and one extra thing that difference buys a roboticist.",
        answer:
          "The difference is **implicit vs explicit**. NeRF stores the scene *implicitly* in an MLP's weights, so rendering a pixel requires marching a ray and querying that network dozens of times — inherently slow. 3DGS stores the scene *explicitly* as millions of 3D Gaussians and renders by projecting (\"splatting\") and blending them with a fast differentiable rasterizer — no per-ray network queries — which is why it hits real-time (≥30 fps at 1080p). The extra thing that explicit representation buys a roboticist is *manipulability of the geometry*: because the scene is literal 3D primitives (not opaque network weights), you can convert Gaussians into collision geometry for a physics engine, move or delete objects to generate new scenarios, and build a manipulable digital twin (as DreMa does) — none of which is easy when the scene is baked into an MLP.",
      },
    },
    {
      heading: "Grounding the twin in real physics: Phys2Real",
      paragraphs: [
        "We have a twin that *looks* right. But looks aren't physics. A digital twin of a hammer can be photorealistic and still be *wrong about where its mass is* — and for manipulation, mass distribution is everything. Domain randomization's answer, recall, was \"randomize the physical parameters and hope the real one falls in range.\" That works, but it's *wasteful*: you're covering a huge range of possibilities when reality has exactly *one* answer, and if you randomize too wide the policy gets mushy and conservative, too narrow and you miss the truth. There's a smarter move hiding in plain sight: **stop guessing, and measure.**",
        "This is **physics-grounded Real2Sim2Real**, and it's the precise, targeted cousin of domain randomization. Instead of randomizing blindly, you **infer or measure the real physical parameters** so the simulator genuinely matches the real object's dynamics. Get the friction right, the mass right, the center of mass right — then you barely need randomization, because your sim isn't a wide guess, it's a tight fit.",
        "**Phys2Real** (2025, recent) is the clean instance, and its trick is a lovely fusion of two ideas we've built. It **fuses a VLM's prior on a physical property** — ask a vision-language model (Chapter 8) \"where's the center of mass of this hammer?\" and it gives a sensible prior from all the hammers it's seen — **with uncertainty-aware online adaptation** in a real→sim→real loop. The VLM gets you in the right ballpark from a single look; then the robot *interacts* with the real object, watches how it actually behaves, and refines the physical estimate online, weighting the update by how uncertain it is. Prior plus correction — a Bayesian-flavored move you've seen echoes of since Chapter 5's sensor fusion. The VLM supplies the guess, reality supplies the fix.",
        "Related work sharpens the theme. **EmbodieDreamer's PhysAligner** *optimizes* control gains and friction to make the simulated dynamics match observed real dynamics — literally tuning the sim's knobs until sim behavior lines up with real behavior. And **differentiable physics engines** go all the way: because the whole simulator is differentiable, you can *learn* its physical parameters directly from real data by gradient descent, backpropagating the mismatch between predicted and observed motion into the parameters themselves.",
        "The unifying idea: **targeted physics grounding as a complement to domain randomization, not a replacement.** Randomize the parameters you genuinely can't pin down; *measure* the ones you can. A blind fire hose of randomized worlds wastes the policy's capacity on possibilities that will never occur; a physics-grounded twin spends that capacity where reality actually lives. It's system identification (from the last section) grown up — automated, learned, and fused with a foundation-model prior.",
      ],
    },
    {
      diagram: {
        id: "rb-11-7",
        caption:
          "Don't randomize physics blindly — measure it: capture the real object, build a twin, then ground its physical parameters (a VLM prior refined by real interaction) before training and deploying, so the sim fits reality instead of merely spanning it.",
      },
    },
    {
      quiz: {
        question:
          "You need your simulated hammer to behave like the real one. Domain randomization would randomize its mass and center-of-mass over wide ranges; Phys2Real instead asks a VLM and then refines with real interaction. What does the physics-grounded approach gain, and what does it still borrow from randomization?",
        answer:
          "It gains **precision and sample-efficiency**: reality has exactly one center of mass, so measuring it (VLM prior → refined by watching the real hammer move) fits the sim tightly to the truth instead of forcing the policy to be robust across a wide, mostly-irrelevant range. That means the policy doesn't waste capacity on masses the hammer will never have, and it doesn't go mushy-conservative from over-wide randomization. What it still borrows: you *can't* measure everything, and even measured values carry uncertainty — so you still randomize (lightly) over the parameters you genuinely can't pin down and over the residual uncertainty in the ones you can. Grounding and randomization are complements: measure what you can, randomize what you must.",
      },
    },
    {
      heading: "The honest challenge: reliability beats realism",
      paragraphs: [
        "We've built an arsenal — latent dreams, video worlds, JEPA embeddings, simulators, splatted twins, physics grounding. Time for the survey's most important and most sobering point, the one that should reframe how you judge every system above. The question that matters for a world model is **not \"how realistic is it?\"** It's **\"how reliable is it?\"** — and those are very different things.",
        "Here's why the distinction is the whole ballgame. The entire value of a world model is that you *trust its predictions* enough to plan, train, or evaluate inside them. The moment those predictions go wrong, you're not just getting worse data — you're getting *poisoned* data, and the policy learns to exploit the model's mistakes. Two failure modes do the poisoning. **Hallucination**: the model invents things that wouldn't happen — an object teleports, a grasp succeeds that physically couldn't — and a policy trained against that hallucination learns a skill that reality refuses to honor. **Long-horizon drift**: small per-step prediction errors compound (there's Chapter 1's Villain #2 again, error piling up) until, several seconds into a dreamed rollout, the future has quietly diverged into nonsense. A model can render *beautiful* frames the whole way down and still be *wrong* the whole way down. Realism without reliability is a trap — it makes you trust a prediction you shouldn't.",
        "So the survey lays out what a world model actually needs to be, and it's a demanding list. Futures must be:",
      ],
    },
    {
      list: [
        "**Causally aligned with actions** — the *right* future for the action taken, not just *a* plausible future. (This is the definition from section one, restated as a requirement: change the action, get the correct different outcome.)",
        "**Physically self-consistent over long horizons** — objects don't pass through each other or violate conservation ten steps in; the physics holds up as the rollout lengthens.",
        "**Coherent across views** — the same scene predicted from different camera angles agrees with itself; no contradictions between viewpoints.",
        "**Executable enough to actually improve a policy** — the ultimate test. If a policy trained or planned in the model doesn't get *better on the real robot*, the model has failed, however lovely its output.",
      ],
    },
    {
      paragraphs: [
        "That last bullet is the honest north star for this entire chapter. All the machinery — Dreamer's latents, UniPi's videos, splatted twins, Phys2Real's grounding — is in service of one thing: producing imagined experience *reliable enough over the horizon you trust it* that a policy trained on it transfers to reality. The reality gap and data scarcity were the villains we opened with; **drift and hallucination are the reality gap wearing a learned-model costume.** A perfect-looking dream that drifts is just a new, subtler way for the fake world to lie to you — and the field's frontier is not making the dreams prettier, but making them *trustworthy for longer*.",
      ],
    },
    {
      diagram: {
        id: "rb-11-8",
        caption:
          "A world model's job is reliability, not beauty: predictions start coherent and drift into hallucination over a long horizon, so the real question is how far you can trust the rollout — and grounding buys you a longer trustworthy horizon, not prettier frames.",
      },
    },
    {
      quiz: {
        question:
          "Two world models produce equally photorealistic 20-step rollouts. Model A stays physically consistent and correctly action-conditioned throughout; Model B looks just as sharp but, by step 10, objects have subtly teleported and the physics no longer holds. Why is Model B not just \"slightly worse\" but potentially *dangerous* to train a policy in?",
        answer:
          "Because a policy trained inside Model B will *learn to exploit its hallucinations*. If Model B invents a grasp that succeeds where physics says it can't, or teleports an object into reach, the policy discovers those free wins and optimizes toward them — building a skill that depends on events reality will never produce. That's worse than merely-lower-quality data; it's actively *misleading* data, and it transfers as confident failure on the real robot. The sharpness of Model B's frames makes it more dangerous, not less, because it *looks* trustworthy right up to the point it lies. This is the chapter's punchline: reliability (causal, physically-consistent, executable prediction over the horizon you trust) is what matters, and realism without it is a trap. The fix — grounding, shorter trusted horizons, periodic correction from real data — is about making the dream *honest* over the range you use it, not making it *pretty*.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        "We came in owing a debt: robot data is scarce and expensive (Chapter 10). We leave with two ways to pay it, and a clear-eyed view of their interest rate.",
        "A **world model** is a predictive, *action-conditioned* model of dynamics — $p(x_{t+1:t+H} \\mid x_t, a_{t:t+H-1}, \\text{goal})$ — and its defining property is foresight *under action*, which buys model-based RL, planning, data generation, and evaluation. The **learned** line runs from Ha & Schmidhuber (2018) through Dreamer's cheap, stable latent imagination, to video-generation worlds (UniPi's decoupled predict-then-act, GR-1/GR-2's joint action-and-frame prediction, Genie's interactive environments, DreamGen's data engine), to JEPA-style models (V-JEPA 2, GR00T's FLARE) that predict *representations* instead of pixels because pixels are too expensive to be worth predicting. The **built** line runs through simulators (MuJoCo's contact physics, Isaac Sim/Lab's GPU-parallel thousands-at-once), across the reality gap via domain randomization (Tobin, 2017), domain adaptation, and system identification, and into a new generation of worlds captured from photos — 3D Gaussian Splatting (Kerbl et al., 2023) rebuilding a workspace from a phone in real time, then grounded in *real* physics by Phys2Real's VLM-prior-plus-online-adaptation. And over all of it hangs the honest verdict: **reliability beats realism**, because a beautiful dream that drifts or hallucinates poisons the very policy it was meant to teach.",
        "Every technique here is an answer to the same question the whole guide keeps asking: *how does a robot get enough experience without paying the real world's price for all of it?* Learn a world, or build one — but never forget it's a copy, and the gap between the copy and reality is where robots go to fail.",
        "That gap is exactly what Chapter 12 confronts head-on. We've been manufacturing experience; now we put a *whole real system together* — manipulation, humanoids, and the unglamorous, essential work of deploying something that has to survive contact with our world, safely, for real. Everything we've dreamed has to finally wake up.",
      ],
    },
  ],
};
