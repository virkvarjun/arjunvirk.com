import type { Chapter } from "../chapters";

// The Robotics Bible, Chapter 9. Prose is authored in
// content/robotics-bible/chapter-9-vla.md and transcribed here verbatim into
// the Chapter/section schema; figures are mounted by id and rendered from the
// diagram registry (rb-9-1 … rb-9-13).

export const chapter9: Chapter = {
  slug: "chapter-9-vla",
  number: "9",
  title: "Vision-Language-Action Models",
  summary:
    "The models running today's robots, as a lineage where each fixes the last: RT-1/2, OpenVLA, Octo, π0/π0.5, FAST, MolmoAct, GR00T, and Gemini Robotics.",
  published: "Aug 31, 2026",
  updated: "Aug 31, 2026",
  futureRef:
    "Come back to the **axes** section and the roster table whenever a new VLA drops, place it on the five axes (backbone, action representation, single vs dual-system, direct vs reasoning, single vs cross-embodiment) and you'll understand it in a minute regardless of its name. The **action-representation fork** (Fig 9.7) is the single most durable idea here; the discrete-vs-continuous-vs-compressed tension isn't going away, and most \"new\" VLA papers are re-answering exactly that question. Treat every specific parameter count, Hz, and benchmark as a dated snapshot, especially the vendor-reported numbers, but treat the lineage's *logic* (each model a fix for the last) as evergreen. Revisit Chapter 8's flow matching if the π0 / GR00T action experts stop making sense; revisit Chapter 1's sense–plan–act loop to remember that a VLA is just a very sophisticated \"plan\" beat.",
  sections: [
    {
      paragraphs: [
        `*What happens when you take a vision-language model, the thing that already knows what a mug is, and give it a body that can pick the mug up.*`,
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        `Here's the problem that this entire chapter exists to solve, and it's almost embarrassingly simple once you see it. A model trained on the internet knows an astonishing amount about the world, it knows a mug is for drinking, that the extinct animal on the table is a dinosaur, that "clean up the spill" implies grabbing a towel and not a hammer. That's **semantic knowledge**, and Chapter 8 showed you how it gets baked into a vision-language model. Meanwhile, a robot policy trained on teleoperated demonstrations knows how to *grasp*, how to close a gripper around a curved handle without knocking the mug over. That's **motor knowledge**. And the villain of this chapter is that, for most of robotics history, these two kinds of knowledge lived in **two different models that couldn't talk to each other.** The VLM could tell you what to do but had no body; the policy had a body but had never read a book. A **vision-language-action model (VLA)** is the fusion: one network that inherits the web-scale semantics of a VLM and emits robot actions out the other end.`,
        `That's the whole idea. A VLA is a VLM with its mouth rewired, instead of (or alongside) text, it outputs *actions*.`,
        `I'm assuming you've read Chapter 8, so you know what a vision-language model is: a transformer that takes an image plus a text instruction and produces text, and that "text" is really just a sequence of discrete tokens sampled one at a time. I'm assuming you remember flow matching from the tail end of that chapter, the trick where you learn a velocity field that carries noise to data along a near-straight path, because it comes roaring back here as a way to *generate actions*. And from Chapter 1, keep the sense–plan–act loop in your pocket: everything in this chapter is a fancier "plan" beat feeding the "act" beat, running against Villain #1, the world that won't hold still.`,
        `Here's the road, and it's built as a **lineage**, each model in the story exists because the previous one broke in a specific, nameable way, and fixing that break hands you the next model. We start with RT-1, a policy that could act but couldn't *think*. RT-2 gives it a brain by making a real VLM speak actions. Open X-Embodiment pools everyone's robots. OpenVLA opens the whole thing up; Octo asks whether you even need a pretrained VLM. Then we hit the deep question the whole field is really about, *how do you represent a continuous action?*, and watch three answers fight it out: crude binning, frequency-domain compression (FAST), and continuous flow (π0). We add reasoning-before-acting (ECoT), 3D reasoning (MolmoAct), and the dual-system fast/slow split (GR00T). We end by stepping back to see the five patterns that shook out of all of it. Let's go.`,
      ],
    },
    {
      heading: "What a VLA actually is, and the one design question",
      paragraphs: [
        `Strip a VLA down and it's two pieces bolted together. Up front, a **VLM backbone**: the pretrained transformer from Chapter 8 that ingests one or more camera images and a language instruction ("put the banana in the bowl") and builds a rich internal representation of the scene and the goal. Out back, an **action head**: the part that turns that representation into numbers a robot can execute, joint velocities, end-effector deltas, gripper open/close. The backbone contributes the semantics; the head contributes the motor output. Train the whole thing on robot demonstrations and, crucially, keep it exposed to web data so it doesn't forget everything it knew, and you have a VLA.`,
        `The intuition is that the VLM already did the hard, expensive part. Teaching a model from scratch what a "sponge" is, or that "the one that's not fruit" refers to the toy car sitting between two apples, would take more robot data than anyone will ever collect. But a VLM soaked in internet images and text *already knows this*. So you don't reteach it the world, you teach it, comparatively cheaply, to point its existing understanding at a gripper. Robotics gets to ride the coattails of the entire internet.`,
        `So what's the one hard design question? It's this: **a language model's whole world is discrete tokens, but a robot action is continuous.** "Move the wrist 3.7 centimeters left and rotate 12 degrees" is a smooth vector of real numbers, and a transformer's output layer is a softmax over a fixed vocabulary of symbols. These don't fit together out of the box. Every VLA is, at heart, an answer to *how do you make a fundamentally-discrete language model emit fundamentally-continuous motor commands?* And there turn out to be exactly three families of answer, which we'll meet in order as the lineage forces each one on us:`,
      ],
    },
    {
      list: [
        `**Discrete action tokens.** Chop each action dimension into, say, 256 bins and treat each bin as a "word." Now actions *are* tokens and the language model needs no surgery at all. Dead simple. It's how RT-1, RT-2, and OpenVLA work, and its cracks are exactly what motivates everything after.`,
        `**Compressed tokens (FAST).** Keep the token idea, but don't tokenize raw actions, first transform them into the *frequency domain*, throw away the parts you can't perceive, and tokenize what's left. Ten times fewer tokens, same fidelity.`,
        `**Continuous action heads (diffusion / flow).** Drop the discrete pretense entirely. Bolt a small generative head, a diffusion or flow-matching model, onto the backbone and let it *generate* a continuous action vector directly. This is Octo and π0.`,
      ],
    },
    {
      paragraphs: [
        `Hold those three in your head. The rest of the chapter is a fight over which one wins, and the answer is "it depends," which is the most honest thing anyone in this field can tell you.`,
      ],
    },
    {
      diagram: {
        id: "rb-9-1",
        caption:
          "Inside a VLA's transformer: image patches and words become one token sequence, each token projects to a query, key, and value, and multi-head attention lets the word for an object attend to that object's pixels. Blend the values, stack the block about eighteen times, and the same backbone that reads the scene drives the action expert.",
      },
    },
    {
      quiz: {
        question:
          "A vision-language model from Chapter 8 already takes an image and an instruction and outputs text. What is the *minimum* change needed to turn it into a VLA, and why is that change deceptively deep?",
        answer:
          "The minimum change is to make it output *actions* instead of (or in addition to) text, rewire the output end so its predictions map onto robot commands rather than words. Deceptively, this is deep for two reasons. First, actions are continuous and language tokens are discrete, so you can't just \"read off\" a motor command from a softmax without deciding how to bridge that gap (binning, compression, or a continuous head). Second, if you train the model hard on the narrow distribution of robot data, it tends to *forget* the web knowledge that made it valuable in the first place, so you have to co-train on both robot and web data at once. The value of a VLA is entirely in preserving the VLM's semantics while attaching a body; the engineering is all about not destroying one to get the other.",
      },
    },
    {
      heading: "RT-1: a body without a brain (2022)",
      paragraphs: [
        `Start where the modern story starts, at Google in 2022, with **RT-1** (Robotics Transformer 1, arXiv:2212.06817). RT-1 is the "act" beat done extremely well, and it's the right place to begin precisely because of what it *lacks*, the lack is what invents everything after it.`,
        `The intuition RT-1 chases: what if you treat robot control like a sequence-modeling problem? You have a history of camera images and a language instruction; you want a sequence of actions. That's structurally identical to translation, a sequence in, a sequence out, so point a transformer at it. Mechanically, RT-1 takes a short history of images, passes them through an **EfficientNet** image backbone that's been **FiLM-conditioned** on the instruction (FiLM, or feature-wise linear modulation, lets the text reach in and rescale the vision features so the network attends to the *right* objects for *this* command). That produces a big pile of visual tokens, which a module called **TokenLearner** squeezes down to a small, informative handful, because feeding a transformer hundreds of tokens per frame at real-time rates is too slow. A **Transformer** then consumes that compressed history and emits actions.`,
        `And here's the move that echoes through the whole chapter: RT-1 **discretizes** its actions. The 7 degrees of freedom of the arm, three for position, three for rotation, one for the gripper, plus a mode flag, each get chopped into **256 bins**. So "move a little left" becomes "output bin #131 on the x-axis," a discrete class the transformer predicts with a plain softmax. Work one bin by hand: 256 bins across a normalized range $[-1, 1]$ means each bin is $2/256 \\approx 0.008$ wide, so the worst-case rounding error is half a bin, about $0.004$ — invisible for coarse pick-and-place, and exactly the fidelity Fig 9.2 shows being thrown away. This is answer #1 from the last section, in its very first appearance: **actions become tokens, and control becomes classification.**`,
        `The numbers ground it: RT-1 is small by today's standards, roughly **35 million parameters**, runs its control loop at about **3 Hz**, and was trained on around **130,000 demonstrations** covering **700+ tasks** collected over months on a fleet of real robots. Within that training distribution it's genuinely good, it picks and places and opens drawers reliably.`,
        `But now name the flaw, because the flaw is the whole point. **RT-1 is not a vision-language model.** Its "language understanding" is a thin FiLM conditioning layer trained only on robot data, a few hundred instruction templates. It has never read the internet. So ask it to "pick up the extinct animal" from a table of toys and it has no idea what extinct means; that concept was never in its 130k demos. RT-1 has a superb body and essentially no brain. The semantic knowledge and the motor knowledge are, once again, in different worlds, except now the semantic side is just *missing*. The obvious fix writes itself: what if the backbone weren't a robot-only EfficientNet, but an actual VLM that had read everything?`,
      ],
    },
    {
      diagram: {
        id: "rb-9-2",
        caption:
          "Binning turns control into classification: a continuous command snaps to the center of its nearest bin (RT-1 used 256 per dimension). Simple and language-model-friendly, but the red gap is the fidelity you throw away, and it comes back to bite at high frequency.",
      },
    },
    {
      heading: "RT-2: give the body a brain (2023)",
      paragraphs: [
        `The fix arrives a year later, from Google DeepMind, and it's the first model most people would call a VLA in the full sense: **RT-2** (arXiv:2307.15818). The idea is so clean it's almost cheeky. RT-1 chopped actions into 256 bins. A large language model's vocabulary already contains integers as tokens. So, *what if you just write the action out as a string of numbers and make a real, pretrained VLM say it?*`,
        `That's literally what RT-2 does. Take a big vision-language model that has already been trained on internet-scale image-text data. Take the 7-DoF action, discretize it exactly like RT-1 did, and represent it as a short **string of integers**, "1 128 91 241 5 101 127", as if the robot command were just another sentence the model could produce. Then **co-fine-tune** the VLM on a mix of its original web data *and* robot demonstrations, so it learns to emit these action-strings when it sees a robot camera and an instruction, without unlearning what it knew about the world. The action isn't bolted on with a special head; it's spoken in the model's native tongue, as text. This is answer #1 again, discrete tokens, but now riding a backbone that has actually read the internet.`,
        `The scale jumped accordingly. RT-2 came in two variants: **RT-2-PaLI-X**, built on a vision-language model up to **55 billion parameters**, and **RT-2-PaLM-E**, up to **12 billion**. These are enormous compared to RT-1's 35 million, and the co-training on web plus robot data is the load-bearing trick, train on robot data alone and the giant model forgets its web knowledge; mix them and it keeps both.`,
        `And the payoff is the headline result of the whole early VLA era: **emergent semantic generalization.** Because the backbone genuinely understands language and images from the web, RT-2 can follow instructions that were *never in the robot data.* Ask it to "pick up the extinct animal" and it picks up the toy dinosaur, it fused "extinct" (from the internet) with "dinosaur" (from the internet) with "that plastic object over there" (from the camera) and grounded all of it in a grasp (from the robot data). RT-1 physically could not do this; the concept wasn't in its training. RT-2 can, because its brain came pre-loaded. This is the exact villain of the chapter being slain for the first time: semantic knowledge and motor knowledge, finally, in one model.`,
        `The flaw this time is subtler and it's about *scale of data*, not capability. RT-2 was trained on one lab's robots. Its motor repertoire is bounded by what that fleet did. It's a brilliant brain on a narrow body, and the next model asks the obvious question: what if every lab pooled their robots?`,
      ],
    },
    {
      diagram: {
        id: "rb-9-3",
        caption:
          "RT-2's trick: an action is just a sentence of numbers. Because the backbone read the web, it can pick 'the extinct animal' with zero such examples in the robot data, semantics and motor control, finally in one model.",
      },
    },
    {
      quiz: {
        question:
          'RT-1 and RT-2 both discretize actions into bins and both control the same kind of arm. Why can RT-2 follow the instruction "move the banana to the number 3" while RT-1 cannot, even though neither ever saw that instruction in robot data?',
        answer:
          "Because the difference isn't in the action representation, it's in the backbone. RT-1's \"language understanding\" is a thin conditioning layer trained only on the few hundred instruction templates in its robot dataset; concepts like \"the number 3\" or reasoning about which object is a banana in a novel arrangement were never in that data, so it's blind to them. RT-2's backbone is a full vision-language model pretrained on internet-scale image-text pairs, so it already knows what bananas and numerals look like and how to reason about them; co-fine-tuning taught it to *express* that knowledge as an action-string without erasing it. The generalization is emergent: it's inherited from the web pretraining and merely *routed* to the gripper, which is exactly why keeping the web data in the co-training mix is non-negotiable.",
      },
    },
    {
      heading: "Open X-Embodiment: pool everyone's robots (2023)",
      paragraphs: [
        `RT-2 had a great brain and one lab's worth of hands. The next step, the **Open X-Embodiment** project (OXE, arXiv:2310.08864, 2023), was a coordinated act of data sharing across dozens of institutions, and the question it asks is beautifully simple: **does robot data transfer across different robots?**`,
        `The intuition for why this might work: a Franka arm, a Google mobile manipulator, and a WidowX all have to solve the same underlying physics, grasp a thing, don't tip it, move it there. Maybe the *skill* of manipulation is partly shared even when the bodies differ. In language, throwing more diverse data at one model reliably makes it better; maybe robotics has been starved of exactly that because every lab's data sat siloed on its own robot.`,
        `So OXE pooled it. **22 different robot embodiments**, over **1 million trajectories**, drawn from **60 existing datasets** contributed by 30-something labs, all converted into one common format. Then they trained the RT models on this union: **RT-1-X** (the RT-1 architecture) and **RT-2-X** (the RT-2 architecture), now fed everyone's robots at once.`,
        `And the key finding is the one that made this a landmark: **positive transfer.** A model trained on the pooled multi-robot data outperformed models trained on any single robot's data *in isolation*, including on that robot's own tasks. Data from a completely different robot made your robot better. Just as importantly, **RT-2-X showed roughly 3× better performance on emergent skills** than RT-2, because the bigger, more diverse pool gave its web-inherited semantics more grounded motor examples to attach to. This is the moment robotics learned it could have a "foundation model" story like language did, pool the data, and generalization compounds.`,
        `The flaw here isn't a failure so much as a locked door. RT-2-X was, like its parents, **closed**, the weights and the recipe stayed inside Google. The field had just proven that a shared, pooled, open dataset produces a better model, and yet the best model on top of it wasn't something you could download and build on. That tension is exactly what the next model was built to break.`,
      ],
    },
    {
      diagram: {
        id: "rb-9-4",
        caption:
          "Data from a different robot makes your robot better. Pooling 22 embodiments and a million trajectories produced positive transfer, the moment robotics got its own foundation-model story.",
      },
    },
    {
      heading: "OpenVLA: open it up, and make it small (2024)",
      paragraphs: [
        `Here's the door being kicked open. **OpenVLA** (arXiv:2406.09246, 2024, from a Stanford–Berkeley–Google team) took OXE's proven insight, pooled data works, and did the thing Google hadn't: shipped a **fully open**, downloadable, fine-tunable VLA, and made it embarrassingly small while beating the giant.`,
        `The design is a clean synthesis of everything so far. The backbone is a **Prismatic VLM**: a **Llama-2 7B** language model fused with vision, but with a twist that matters, a **dual vision encoder**, running both **DINOv2** and **SigLIP** and concatenating their features. Recall from Chapter 8 that these two see differently: SigLIP is trained on image-text pairs and is strong on *semantics* ("this is a mug"), while DINOv2 is self-supervised and strong on *spatial and geometric structure* ("the mug's handle is here, angled this way"). Manipulation needs both, you have to know *what* the object is and *precisely where* its graspable parts are, so OpenVLA runs both encoders and lets the policy drink from each. For actions it uses answer #1, discrete tokens, but with a tidy hack: it maps its **256 action bins onto the 256 least-used tokens** in the Llama vocabulary, overwriting tokens the model basically never needs so it can speak actions without growing its vocabulary. It was trained on about **970,000 trajectories** from the OXE pool.`,
        `Now the punchline, and it's a good one. OpenVLA is **7 billion parameters**. RT-2-X was up to **55 billion**. And OpenVLA **beat RT-2-X by 16.5%** absolute on their shared evaluation, a **7× smaller** model outperforming the closed giant. Better vision (the dual encoder), cleaner data curation, and open iteration beat raw scale. And because it's open and modest in size, you can **LoRA-fine-tune** it on your own robot with a single GPU, LoRA being the low-rank-adapter trick that tunes a big model by training a tiny number of extra weights, so you don't need Google's compute to specialize it. OpenVLA is the model that turned VLAs from a thing three labs had into a thing anyone could build on.`,
        `Its flaw is one we've been circling the whole time and are now ready to confront head-on: those discrete action tokens. Emitting 7 numbers as 7 tokens, one autoregressive step each, is *slow*, and worse at high control rates or for dexterous multi-fingered tasks where the binning is too coarse to capture fine motion. The follow-up, **OpenVLA-OFT** (Optimized Fine-Tuning, arXiv:2502.19645, 2025), fixed exactly this: it swapped autoregressive token-by-token decoding for **parallel decoding**, added **action chunking** (predict a whole short sequence of future actions in one shot instead of one step at a time, a hero we'll meet properly with π0), and replaced discrete bins with **continuous actions trained by simple L1 regression.** The result was a large speedup and **97.1% average success on LIBERO**, a standard manipulation benchmark. OFT is the bridge: even OpenVLA's own authors walked away from pure binning. Which forces the question the whole field was avoiding, is discretizing actions the right idea at all?`,
      ],
    },
    {
      diagram: {
        id: "rb-9-5",
        caption:
          "Manipulation needs 'what' and 'where.' OpenVLA runs two encoders, SigLIP for semantics, DINOv2 for geometry, and beat a model 7× its size by seeing both. Open, small, and LoRA-tunable: the VLA anyone could build on.",
      },
    },
    {
      quiz: {
        question:
          "OpenVLA has 7B parameters and beat the 55B-parameter RT-2-X by 16.5%. What does this tell you about the relationship between model size and VLA performance, and what were the likely sources of the win?",
        answer:
          "It tells you that for VLAs, raw parameter count is not the dominant lever, architecture and data quality can beat an 8× size advantage. The likely sources of OpenVLA's win are its dual vision encoder (SigLIP for semantics *plus* DINOv2 for spatial geometry, giving it both \"what\" and \"where,\" which manipulation critically needs), careful curation of the OXE training mix, and the ability to iterate openly. It's the same lesson language modeling learned later than it should have: better data and better inductive biases often dominate scale. And because OpenVLA is small and open, that win is reusable, you can LoRA-fine-tune it yourself, which a 55B closed model doesn't let you do.",
      },
    },
    {
      heading: "Octo: do you even need a pretrained VLM? (late 2023 → 2024)",
      paragraphs: [
        `Every model so far starts from a pretrained VLM and inherits its web knowledge. **Octo** (Berkeley/Stanford, released late 2023, paper arXiv:2405.12213, 2024) asks the contrarian question that sharpens the whole picture: **what if you don't? What if you train a generalist policy from scratch on robot data alone, and give it a fundamentally better action head?**`,
        `Octo makes two bets that distinguish it. First, it's a transformer policy trained **from scratch** on robot data, it does *not* start from a pretrained language model. It's a generalist (it handles many tasks and multiple robots, trained on about **800,000 OXE trajectories**), but its intelligence is motor-shaped, not web-shaped. This is a deliberate ablation of the RT-2 thesis: it isolates how far you get from data alone.`,
        `Second, and this is the part that matters for our lineage, Octo replaces the discrete-token action head with a **diffusion head.** This is answer #3, a continuous action head, making its first appearance, and it's worth pausing on *why* it's better. Recall diffusion from Chapter 8: you learn to reverse a noising process, starting from pure noise and denoising step by step into a clean sample. Octo does exactly this but the "sample" is an **action vector**. Instead of snapping a command to one of 256 bins, the diffusion head *generates* a continuous action directly, refining noise into a precise motor command over a few denoising steps. Two payoffs fall out. It has **full continuous fidelity**, no quantization staircase, no thrown-away red gap from Fig 9.2. And it's naturally **multimodal**: if there are two equally-good ways to grasp a cup (from the left or the right), a diffusion head can represent that as two modes and commit to one, where a single regression output would smear into the useless average *between* them and miss the cup entirely. Multimodality is a quietly huge deal in manipulation, because demonstrations are full of "either of these is fine" moments.`,
        `Octo shipped in two sizes, **Octo-Small at ~27M** and **Octo-Base at ~93M** parameters, deliberately small, open, and easy to fine-tune onto a new robot. It proved you can get a strong, flexible, continuous-action generalist without a giant language backbone at all.`,
        `So now the lineage has laid two philosophies bare, side by side. RT-2/OpenVLA: **start from a pretrained VLM (great semantics), pay with clumsy discrete actions.** Octo: **train from scratch (weaker semantics), win with a continuous diffusion head (great actions).** Neither is strictly right, and the tension between them is exactly the action-representation problem we've been circling. It's time to make it explicit.`,
      ],
    },
    {
      diagram: {
        id: "rb-9-6",
        caption:
          "When two actions are equally good, averaging them is the worst answer. A diffusion head represents both modes and commits to one; a plain regression head smears into the useless middle, which is why continuous generative heads matter for manipulation.",
      },
    },
    {
      heading: "The action-representation problem, made explicit",
      paragraphs: [
        `Stop and lay the whole tension on the table, because everything from here fixes one corner of it. You have a continuous action to emit, and you've now seen the three families answer the *how*:`,
        `**(a) Naive binning, discrete tokens** (RT-1, RT-2, OpenVLA). Chop each dimension into bins, treat bins as tokens. *Strengths:* dead simple, plugs straight into existing language-model infrastructure, one softmax and you're done, and it inherits every trick the LM world already built. *Weaknesses:* poor fidelity, that quantization staircase from Fig 9.2 rounds off fine motion, which is fine for coarse pick-and-place and catastrophic for dexterity. And it's **slow at high frequency**: if you control a robot at 50 Hz with 7 dimensions, that's a torrent of tokens, and emitting them one autoregressive step at a time can't keep up. Binning's failure mode is specifically **high-frequency, high-dexterity** motion, precisely the interesting stuff.`,
        `**(b) Continuous diffusion / flow heads** (Octo, and π0 coming up). Generate the action directly with a small generative head. *Strengths:* full continuous fidelity, no staircase, and native **multimodality** (Fig 9.6), which matches how demonstrations actually look. *Weaknesses:* you pay a **sampling cost**, generating a sample means running several denoising steps per action, adding compute and latency, and it doesn't slot into language-model infrastructure as cleanly as tokens do.`,
        `**(c) Frequency-domain compression, FAST.** This is the clever third road, and it's the one that dissolves binning's worst problem instead of abandoning tokens entirely. The insight: binning is slow because **raw action sequences are wildly redundant**, consecutive timesteps are almost identical, so tokenizing them one-by-one wastes enormous length on information you could have compressed. Fix the redundancy *before* you tokenize, and tokens become viable again even at high frequency. That's FAST, and it deserves its own section.`,
        `The reason this matters so much is that it's the exact fork in the road that splits the whole field. Teams that love language-model infrastructure lean discrete (and reach for FAST to make it fast). Teams chasing maximal dexterity lean continuous (diffusion, then flow). And the smartest recent systems, as we'll see, hedge, they use *both*, one to train the brain and one to move the hand.`,
      ],
    },
    {
      diagram: {
        id: "rb-9-7",
        caption:
          "The action-representation fork: binning is simple but explodes in length at high frequency; flow is high-fidelity but adds sampling cost; FAST compresses first so tokens survive. Every model after this fixes one corner of this triangle.",
      },
    },
    {
      heading: "FAST: compress in the frequency domain (Jan 2025)",
      paragraphs: [
        `Here's the fix for binning's high-frequency failure, and it's one of the most elegant ideas in the chapter. **FAST**, Frequency-space Action Sequence Tokenization (Physical Intelligence, arXiv:2501.09747, January 2025), keeps the tokens-are-great philosophy but refuses to tokenize raw actions, because raw actions are hopelessly redundant. It borrows a fifty-year-old trick from image compression to fix it.`,
        `The intuition first. Think about what a smooth robot trajectory looks like: at 50 Hz, position at time *t* and time *t+1* are nearly identical. Tokenizing each timestep separately spends a fresh token restating almost the same number over and over, it's like compressing a video by storing every frame as a full independent picture. Wasteful. The information that actually *matters*, the overall shape of the motion, lives in a few low-frequency components, while the high-frequency components are mostly imperceptible jitter you could drop without anyone noticing. This is exactly why JPEG works on images. FAST does it for actions.`,
        `The pipeline, step by step:`,
      ],
    },
    {
      list: [
        `**Quantile-normalize** each action dimension. Rescale each dimension by its data quantiles so they're on a comparable, outlier-robust footing.`,
        `**Discrete Cosine Transform (DCT)** each dimension. This is the workhorse, the same transform inside JPEG. The DCT re-expresses a time-series as a sum of cosine waves of increasing frequency: it rewrites $T$ samples $x_t$ as $x_t = \\sum_k c_k \\cos\\!\\left[\\tfrac{\\pi}{T}\\left(t+\\tfrac{1}{2}\\right)k\\right]$, where coefficient $c_k$ says how much of frequency $k$ is present. So instead of "the position at each of 50 timesteps" you now have "how much of each frequency is present." The slow, overall shape of the motion sits in the first few coefficients; the fast wiggle sits in the last ones.`,
        `**Scale, round, and drop** the insignificant high-frequency coefficients. After the DCT, most of the high-frequency coefficients are tiny, rounding them to zero throws away jitter you couldn't feel while keeping the motion's shape intact. This is the compression step; it's where the redundancy dies.`,
        `**Flatten low-frequency-first** into a single sequence, so the important coefficients lead.`,
        `**Byte-Pair Encoding (BPE)** the result, the same subword-merging tokenizer language models use, to squeeze it into a compact token string.`,
      ],
    },
    {
      paragraphs: [
        `The result is **~10× fewer tokens** than naive per-timestep binning, the whole thing is **invertible** (you can reconstruct the action, minus the imperceptible jitter you chose to drop), and it has only **two hyperparameters** (roughly: how aggressively to round, and the BPE vocabulary size), a refreshingly simple knob-set for something this powerful. They also released **FAST+**, a *universal* tokenizer pretrained on **1 million trajectories**, so you can tokenize a new robot's actions off the shelf without fitting your own.`,
        `And the payoff ties the whole thread together. Applying FAST let them build **π0-FAST**, an autoregressive version of the π0 model (next section) that speaks compressed action tokens. It **scales to ~10,000 hours** of training data, **matches the quality of the diffusion/flow-based VLA**, and trains **up to ~5× faster.** Read that again: FAST let a *discrete-token* model match a *continuous* model's quality while training far faster. That's binning's high-frequency curse, the exact thing that pushed everyone toward diffusion, lifted. The fork in Fig 9.7 just got a lot more interesting, because now corner (a) and corner (b) can tie.`,
      ],
    },
    {
      diagram: {
        id: "rb-9-8",
        caption:
          "FAST borrows JPEG's trick for actions: DCT into the frequency domain, drop the imperceptible high-frequency jitter, tokenize what's left. Ten-times fewer tokens, invertible, two knobs, and it let a discrete-token model match a diffusion model's quality while training up to 5× faster.",
      },
    },
    {
      quiz: {
        question:
          "FAST runs each action dimension through a Discrete Cosine Transform before tokenizing, then throws away most of the high-frequency coefficients. Why does this *dramatically* shorten the token sequence without noticeably hurting the robot's motion?",
        answer:
          "Because a smooth robot trajectory is enormously redundant in the time domain, consecutive timesteps are nearly identical, so tokenizing timestep-by-timestep wastes length restating almost the same value repeatedly. The DCT re-expresses the trajectory as a sum of frequency components, and it turns out the *shape* of any real motion is captured by a handful of low-frequency coefficients, while the high-frequency coefficients are tiny and correspond to imperceptible jitter. Rounding those small high-frequency coefficients to zero removes information the robot's motion doesn't actually depend on, collapsing a long sequence into a few meaningful tokens (~10× fewer). It's the same reason JPEG compresses photos so well: concentrate the signal into a few coefficients, discard the rest, and the loss is below the threshold anyone (or any gripper) can perceive.",
      },
    },
    {
      heading: "π0: give it a flow-matching body (Oct 2024)",
      paragraphs: [
        `Now the continuous branch reaches its landmark. **π0** ("pi-zero," Physical Intelligence, arXiv:2410.24164, October 2024) is a VLA that answers the action question with **flow matching**, answer #3 at full power, and it's the model that made dexterous, general-purpose manipulation look genuinely close.`,
        `The architecture is a two-part design that's become a template. The backbone is **PaliGemma**, a ~**3B** vision-language model, providing the semantic understanding, the same "read the internet" brain we've relied on since RT-2. But instead of making the backbone *speak* actions as tokens, π0 attaches a separate, smaller **action expert** (~**300M** parameters) whose only job is to generate continuous motor commands. And the action expert is trained with a **flow-matching objective**, the direct callback to Chapter 8, so let's cash it in.`,
        `Flow matching, recall, learns a **velocity field**: a function that, at any point along the path from noise to data, tells you which direction to move and how fast. Written down, it's $\\frac{dx_\\tau}{d\\tau} = v_\\theta(x_\\tau, \\tau)$ — reading the symbols, $\\tau$ is the blend-time from 0 (pure noise) to 1 (clean sample), $x_\\tau$ is where the sample currently sits, and the network $v_\\theta$ reports the velocity to move with. Training is astonishingly plain: draw a noise sample $x_0$ and a data sample $x_1$, and regress the network toward the straight-line velocity $x_1 - x_0$ along the path between them. You start from a sample of pure noise and *integrate* the velocity field forward, and it carries you to a clean sample along a near-straight path. Diffusion does something similar but tends to need many small denoising steps because its paths are curvy; flow matching's paths are designed to be nearly straight, so you can traverse them in *few* steps. Here the "clean sample" the field carries you to is a **chunk of future actions.** The action expert learns the velocity field over action-space conditioned on the backbone's understanding of the scene and instruction, and generating a motor command means integrating that field from noise, a handful of steps, continuous output, full fidelity, and native multimodality. This is Octo's continuous-head idea, upgraded from diffusion to the straighter, faster flow-matching formulation.`,
        `Two more design choices make π0 shine. **Action chunking**: rather than predict one action and re-plan, π0 predicts **H = 50 future actions** in a single forward pass, a whole half-second-ish of motion at once. Chunking is a recurring hero because it fights compounding error (predict a coherent burst instead of drifting one myopic step at a time) and it lets the expensive backbone run at a low rate while the chunk plays out smoothly, supporting control **up to 50 Hz.** And **cross-embodiment**: π0 was trained across **8 different robots**, inheriting OXE's lesson that pooled bodies transfer.`,
        `The result: π0 **beat OpenVLA and Octo** on hard, **dexterous** tasks, the headline demos were **folding laundry** (deformable, multi-step, long-horizon) and **bussing a table** (clutter, varied objects, sequencing). These are exactly the high-dexterity, high-frequency tasks that binning choked on and that a from-scratch policy like Octo lacked the semantics to generalize on. π0 fused the strong VLM brain (from the RT-2 branch) with the continuous, chunked, flow-matching body (a refinement of Octo's branch), the two philosophies of our lineage, finally married in one model.`,
      ],
    },
    {
      diagram: {
        id: "rb-9-9",
        caption:
          "π0's body is a flow-matching action expert: integrate a velocity field from noise to a 50-step action chunk in a few near-straight steps. Same continuous fidelity as diffusion, far fewer steps, a 3B VLM brain married to a fast, dexterous, chunked hand.",
      },
    },
    {
      heading: "π0.5: open-world and hierarchy (Apr 2025)",
      paragraphs: [
        `π0 was dexterous but still fundamentally operated in environments like the ones it trained in. **π0.5** (Physical Intelligence, arXiv:2504.16054, April 2025) fixes two things at once: it generalizes to **genuinely new environments** it never trained in, and it learns to **think before it acts** in a hierarchical way.`,
        `The open-world result is the eye-catching one: π0.5 can **clean entirely new homes**, kitchens and bedrooms it has never seen, with unfamiliar layouts and objects, not just rearrangements of a lab it trained on. The mechanism is **co-training on heterogeneous data**: not only robot action trajectories, but also **subtask labels**, **verbal instructions**, and **web-scale VQA and captioning** data, all in one training mix. The web data keeps the semantic generalization broad; the subtask and instruction data teach it to decompose messy real tasks; the robot data grounds it all in motor skill. The ablation makes the point unmissable: with the full multi-environment co-training, π0.5 hit **94% on out-of-distribution tasks**, but strip out the multi-environment data and it collapses to **31%.** The diversity of the training mix *is* the generalization, the same lesson OXE taught, pushed to the level of whole environments.`,
        `The **hierarchical** part is the structural fix and it's clean. Instead of mapping image+instruction directly to actions, π0.5 first emits a **high-level subtask in text**, "pick up the pillow", and *then* runs its low-level flow-matching action expert to actually do that subtask. It's a two-level policy: a slow semantic "what should I do next" step in language, feeding a fast motor "how do I do it" step in flow. This mirrors how a person tackles "clean the bedroom", you don't compute joint torques for the whole room, you pick a next subtask, do it, pick the next. Reasoning in language before acting is a thread we're about to pull hard (it's the whole idea behind ECoT), and π0.5 is where it enters the flagship-model lineage.`,
        `There's a companion result worth flagging because it addresses a wound this chapter keeps reopening: **forgetting.** **Knowledge Insulation** (Physical Intelligence, arXiv:2505.23705, May 2025) tackles the problem that attaching a continuous action expert and training hard on robot data can degrade the VLM backbone's precious web knowledge. The trick: **protect the backbone** while training, and supervise it with **discrete FAST-token action targets** rather than letting the continuous expert's gradients wash back and corrupt it. The backbone keeps its semantics (insulated), the continuous expert still produces smooth actions, and the system both **trains faster and generalizes better.** Notice the beautiful move, FAST (the discrete-token idea) and flow (the continuous idea) aren't rivals here; one *supervises the brain* while the other *moves the hand*. The three answers stopped fighting and started cooperating.`,
      ],
    },
    {
      diagram: {
        id: "rb-9-10",
        caption:
          "π0.5 thinks in language, then acts in flow: emit a subtask ('pick up the pillow'), execute it with the flow expert, repeat, and it cleans homes it never trained in. Diverse co-training is the whole trick: 94% out-of-distribution with it, 31% without.",
      },
    },
    {
      quiz: {
        question:
          "π0.5's ablation shows 94% success on out-of-distribution tasks with multi-environment co-training and only 31% without it. Yet the action *architecture* (a flow-matching expert) is unchanged between the two. What does this tell you about where open-world generalization comes from in a VLA?",
        answer:
          "It tells you that open-world generalization comes overwhelmingly from the **data distribution**, not from the action head. The flow-matching expert determines how *precisely and smoothly* the robot moves, but it can only generalize to environments the model has learned to represent, and that breadth of representation is set by the diversity of the training mix (multiple environments, plus web VQA/captioning, subtask labels, and verbal instructions). Strip the multi-environment data and the same architecture has nothing to generalize *from*, so it collapses from 94% to 31%. This echoes the OXE lesson at a higher level: pooling diverse *robots* gave positive transfer across bodies; pooling diverse *environments and data types* gives transfer across whole homes. Architecture sets the ceiling on dexterity; data sets the ceiling on generalization.",
      },
    },
    {
      heading: "ECoT: reason before you act (Jul 2024)",
      paragraphs: [
        `π0.5 hinted that thinking in language before acting helps. **Embodied Chain-of-Thought** (ECoT, Zawalski et al., arXiv:2407.08693, July 2024, built on OpenVLA) makes it the whole thesis, and, importantly, shows that the *naive* way of doing it doesn't work, which is exactly the kind of "watch it break, then fix it" moment this guide is built on.`,
        `You've seen chain-of-thought in language models: before answering a hard question, the model writes out its reasoning step by step, and the answer gets better. The obvious idea is to bolt that onto a robot, have the VLA "think out loud" before emitting an action. But here's the break: **naive LLM-style chain-of-thought is insufficient for robots.** Free-form verbal reasoning like "I should probably move toward the cup" is ungrounded, it doesn't connect to actual pixels, actual positions, actual geometry. A robot doesn't need eloquence; it needs its reasoning *tied to the physical scene.* The fix is **visually grounded** reasoning.`,
        `ECoT's chain is a fixed, escalating ladder from abstract to physical, each step more grounded than the last:`,
      ],
    },
    {
      list: [
        `**TASK**, restate the high-level goal.`,
        `**PLAN**, a rough sequence of steps to achieve it.`,
        `**SUBTASK**, the specific next thing to do right now.`,
        `**MOVE**, the direction/motion primitive for that subtask.`,
        `**GRIPPER position**, the actual **pixel position** of the gripper in the current image. Now the reasoning has touched the image.`,
        `**OBJECT bounding boxes**, the pixel bounding boxes of the relevant objects. Now the reasoning knows *where things physically are.*`,
        `**ACTION**, finally, the motor command, conditioned on all of the above.`,
      ],
    },
    {
      paragraphs: [
        `The escalation is the point: it walks from "what am I doing" down to "here are the exact pixels," so by the time it emits an action, the reasoning is anchored in the actual scene rather than floating in language. And it works: ECoT gets **+28% over plain OpenVLA**, with **no new robot data**, purely by restructuring how the model reasons before acting. That's a free lunch that comes from grounding, not from more demonstrations.`,
        `Two bonuses make ECoT more than a benchmark bump. Because the reasoning is written out in language and pixels, a **human can correct it**, if the model reasons "the target object is the red block" and it's wrong, you can *edit that thought* mid-stream and the action follows the correction. The model's mind is legible and editable. The honest trade-off, flagged as the style guide demands: **reasoning tokens add latency.** Every thought-step is more tokens to generate before the robot moves, so you're spending time to buy correctness and interpretability. Whether that trade is worth it depends on the task, which is the recurring, honest answer this whole field keeps giving.`,
      ],
    },
    {
      diagram: {
        id: "rb-9-11",
        caption:
          "Naive 'think out loud' isn't enough for a robot, reasoning has to touch pixels. ECoT escalates from goal to plan to exact gripper pixels and object boxes before acting: +28% over OpenVLA with no new data, and because the thoughts are legible you can edit them to correct the robot mid-task.",
      },
    },
    {
      heading: "MolmoAct: reason in 3D (Aug 2025)",
      paragraphs: [
        `ECoT grounded reasoning in 2D pixels. **MolmoAct** (Ai2, arXiv:2508.07917, August 2025) pushes grounding into the third dimension and calls itself the first **"Action Reasoning Model"**, a VLA that reasons about **3D geometry and spatial plans** before it commits to an action. It's built on the **Molmo** VLM and is **fully open** (weights, code, *and* data), which matters for a field that keeps rediscovering the value of openness.`,
        `The break MolmoAct fixes: π0 and its kin map a scene more or less directly to actions, and ECoT reasons in 2D, but manipulation is a **3D** problem. Where is the handle *in depth*? What's the path through space, not just across the image? MolmoAct inserts explicit **depth and spatial-plan reasoning** before decoding actions, in three autoregressive stages:`,
      ],
    },
    {
      list: [
        `**Depth-aware perception tokens.** A **VQVAE** (a vector-quantized autoencoder, it encodes an input into a compact set of discrete "perception tokens") produces tokens that capture the scene's **geometric structure via depth.** So before reasoning about the task, the model builds an explicit, depth-aware, 3D-ish representation of the scene, not just a flat image.`,
        `**Plan in image space as waypoints.** The model then lays out a **visual reasoning trace**: a sequence of **waypoints** in image space marking the path the end-effector should follow. This is a spatial plan you can literally see drawn on the image, the reasoning trace is geometric, not verbal.`,
        `**Decode actions conditioned on the waypoints.** Finally it emits the motor commands, conditioned on the depth tokens and the waypoint plan from the first two stages.`,
      ],
    },
    {
      paragraphs: [
        `So versus π0, MolmoAct's distinguishing move is to **insert explicit depth perception and waypoint planning between seeing and acting**, reasoning about 3D structure and the spatial path *before* the action decoder ever runs. And because the plan is a visible trajectory drawn on the image, MolmoAct is **steerable**: it overlays the planned trajectory, and a user can **sketch a correction** to redirect it, the same human-in-the-loop legibility ECoT bought with editable text, but now with an editable *spatial path*.`,
        `On benchmarks, and here I'll flag these as **vendor-reported**, per the freshness protocol, because they're the authors' own numbers, MolmoAct reports **72.1% on SimplerEnv out-of-distribution** and **86.6% on LIBERO.** Treat those as claims to verify against independent evaluation, not settled fact; the useful, durable takeaway is the *architecture*, which cleanly slots explicit 3D reasoning into the lineage between "see" and "act."`,
      ],
    },
    {
      diagram: {
        id: "rb-9-12",
        caption:
          "MolmoAct inserts 3D between seeing and acting: encode depth-aware perception tokens, plan a visible waypoint path, then decode the action along it. Because the plan is a drawn trajectory you can sketch over, the robot is steerable, reasoning grounded in geometry, not just pixels. (Benchmark numbers vendor-reported.)",
      },
    },
    {
      quiz: {
        question:
          'ECoT and MolmoAct both "reason before acting," and both let a human correct the robot. What is the key difference in *what they ground their reasoning in*, and why does MolmoAct\'s choice help with manipulation specifically?',
        answer:
          "ECoT grounds its reasoning in **2D image space**, it reasons down to gripper *pixel* positions and object *bounding boxes* in the current image. MolmoAct grounds its reasoning in **3D geometry**: it first builds depth-aware perception tokens (so it has an explicit sense of depth and spatial structure), then plans a path as waypoints, and only then decodes actions. This helps manipulation specifically because grasping and placing are inherently three-dimensional, how far away the handle is, and the spatial path the gripper must take through space to reach it without collision, are depth questions that 2D pixel reasoning can only approximate. Correspondingly, the human correction differs: in ECoT you edit a *thought* (text), while in MolmoAct you sketch over a *spatial trajectory*, a more natural interface for fixing a motion that's about to go wrong in 3D.",
      },
    },
    {
      heading: "Gemini Robotics & ER: reasoning as a plug-in brain (Mar 2025 →)",
      paragraphs: [
        `Google DeepMind's entry reframes the problem in a useful way, splitting the "brain" and the "hands" into two products so roboticists can take just the part they need. **Gemini Robotics** and **Gemini Robotics-ER** (arXiv:2503.20020, March 2025, built on Gemini 2.0) come as a pair:`,
      ],
    },
    {
      list: [
        `**Gemini Robotics** is a VLA in the sense we've defined all chapter: it takes Gemini's vision-language understanding and **adds physical action as an output modality**, the model can emit robot actions directly.`,
        `**Gemini Robotics-ER** is the more novel idea. ER stands for **Embodied Reasoning**, and it's *not* a VLA, it's a **VLM specialized for the spatial reasoning a robot needs**, without emitting actions itself. It's very good at **pointing** (indicating where something is), **2D and 3D object detection**, **trajectory prediction** (where will this move), and **grasp intuition** (how you'd pick this up). The idea: a roboticist plugs Gemini Robotics-ER into **their own existing controller** as the perception-and-reasoning layer, and keeps whatever low-level control they already trust. It's the embodied brain sold separately from the hands, a pragmatic acknowledgment that many teams have good controllers and just need better spatial understanding on top.`,
      ],
    },
    {
      paragraphs: [
        `They later shipped an **on-device version** (June 2025) that runs locally on the robot and is **fine-tunable from as few as ~50 demonstrations**, a striking data-efficiency number that comes precisely from riding a strong pretrained backbone.`,
        `The update tells you where the field is heading: **Gemini Robotics 1.5 and ER 1.5** (arXiv:2510.03342, September 2025, built on Gemini 2.5) go **agentic and two-model.** ER 1.5 acts as an **orchestrator**: it plans and can **call tools**, including, notably, **web search**, to figure out how to accomplish a task, then hands low-level execution to **GR 1.5**, the action model. This is a **dual-agent** design: a high-level reasoning/planning model directing a low-level action model. Two more ideas land here: **"Embodied Thinking,"** which **interleaves actions with reasoning** (think a little, act a little, think again, rather than reasoning fully up front then acting blindly), and **Motion Transfer**, which enables **zero-shot cross-embodiment**, skills learned on one robot transfer to another without retraining. The lineage's threads, reasoning-before-acting, cross-embodiment, hierarchy, all converging into an agentic system that can go look things up on the web mid-task.`,
      ],
    },
    {
      heading: "GR00T N1: the dual-system humanoid (Mar 2025)",
      paragraphs: [
        `MolmoAct and the Gemini pair reason before acting, but reasoning is *slow* and a humanoid balancing on two legs needs *fast*. **NVIDIA Isaac GR00T N1** (arXiv:2503.14734, March 2025) resolves that tension with an architecture borrowed straight from cognitive science: **dual-system**, the fast/slow split Daniel Kahneman named "System 1 and System 2."`,
        `The intuition is one you live every day. When you catch a falling glass, you don't deliberate, a fast, reflexive system fires (Kahneman's System 1). When you plan how to cook dinner, a slow, deliberate system reasons it out (System 2). A humanoid has the exact same bind: it needs slow semantic reasoning ("that's a cup, I should pick it up") *and* fast reflexive motor control (120 times a second, or it falls over). Trying to do both in one network at one rate is the tension, reasoning is too slow to balance, and a fast reflex loop is too dumb to plan. So GR00T splits them:`,
      ],
    },
    {
      list: [
        `**System 2, the slow planner.** A **VLM** (**Eagle-2**, roughly **1.7B**, built from a SmolLM2 language model plus a SigLIP-2 vision encoder) does the semantic understanding and planning, running at about **10 Hz.** This is the brain: it looks at the scene, reads the instruction, and decides *what* to do.`,
        `**System 1, the fast actor.** A **Diffusion Transformer** trained with **flow matching** (that callback again) produces the actual motor commands at **120 Hz.** This is the reflex: it takes System 2's plan and turns it into smooth, fast, continuous joint commands fast enough to keep a bipedal body upright.`,
      ],
    },
    {
      paragraphs: [
        `Total model size: **GR00T-N1-2B is 2.2 billion parameters**, and I'll flag directly, per the freshness protocol's honesty about sources: **some third-party claims of a "34B" GR00T are wrong; the official figure is 2.2B.** Don't repeat the inflated number. It was trained on a **"data pyramid"**: a broad base of **web and human video** (cheap, plentiful, teaches general priors), a middle layer of **synthetic simulation data**, and a narrow apex of **real robot teleoperation** (expensive, scarce, but perfectly on-target), more on that data hierarchy in Chapter 10.`,
        `The follow-up **GR00T N1.5** (June 2025) sharpens it with a telling design change: they **froze the VLM** backbone during training, and the effect on language-following was dramatic, **from 46.6% up to 93.3%** on a real GR-1 humanoid benchmark. That's the *Knowledge Insulation* lesson again from a different angle: **stop the action training from corrupting the pretrained brain and the brain stays smart.** N1.5 also added the **FLARE** training objective and **DreamGen** synthetic data. The recurring wound, robot training degrading web knowledge, and its recurring cure, insulate the backbone, show up here in one of the field's most-watched humanoid systems.`,
      ],
    },
    {
      diagram: {
        id: "rb-9-13",
        caption:
          "You don't deliberate to catch a falling glass. GR00T splits the brain (a ~1.7B VLM planning at 10 Hz) from the reflex (a flow-matching transformer acting at 120 Hz), because reasoning is too slow to balance and a reflex is too dumb to plan. Freezing the brain during training took language-following from 46.6% to 93.3%.",
      },
    },
    {
      heading: "LeRobot: where these live",
      paragraphs: [
        `A quick, practical pointer before we synthesize. Much of this ecosystem is open, and a lot of it lives in one place: **LeRobot** (Hugging Face, 2024), an open library that ports and hosts many of these models and their training recipes. **π0 and π0-FAST** have been ported into it; classic policies like **ACT** and **Diffusion Policy** live there too; and it hosts **SmolVLA** (~**450M** parameters, a small VLA with a **flow-matching action expert**, the π0 pattern shrunk down for accessibility). If you want to actually *run* a VLA rather than read about one, LeRobot is the on-ramp. The full treatment of where the *data* comes from, teleoperation, the data pyramid, demonstration collection, is Chapter 10; here just note that "open VLA you can download and fine-tune" is increasingly the norm, not the exception, and LeRobot is a big reason why.`,
      ],
    },
    {
      heading: "The patterns that emerged",
      paragraphs: [
        `Step back from the lineage and the individual models blur into a small set of **axes**, design decisions every VLA makes, one way or the other. Once you see the axes, any new model that lands next month is just a point in this space, and you'll know exactly what questions to ask of it.`,
      ],
    },
    {
      list: [
        `**1. VLM backbone + action head.** Nearly every model is this shape: a pretrained vision-language backbone for semantics, plus a head that turns understanding into actions. The variety is all in *which backbone* (PaLI-X, PaLM-E, Llama-2, PaliGemma, Eagle-2, Molmo, Gemini) and *which head*. Octo is the interesting outlier, no pretrained VLM, trained from scratch, which is exactly why it's the useful control case.`,
        `**2. Discrete vs continuous actions.** The action-representation fork from Fig 9.7. Discrete tokens (RT-1, RT-2, OpenVLA) are simple and LM-native but coarse and slow at high frequency; continuous heads, diffusion (Octo) and flow (π0, GR00T System 1), are high-fidelity and multimodal but cost sampling steps; FAST is the compromise that makes tokens fast enough to compete. The frontier increasingly uses *both*: continuous for the hand, discrete FAST tokens to supervise the brain (Knowledge Insulation, π0.5).`,
        `**3. Single-model vs dual-system (fast/slow).** Does one network do everything (RT-2, OpenVLA, π0), or is there an explicit slow-planner / fast-actor split (GR00T's System 2 / System 1, Gemini's ER-1.5 orchestrator / GR-1.5 actor)? Dual-system is winning for anything that must be both smart and fast, especially humanoids that have to balance.`,
        `**4. Direct-mapping vs reasoning-before-acting.** Does the model map scene-to-action directly (RT-1, RT-2, Octo, π0), or does it produce an explicit intermediate reasoning trace first (ECoT's grounded chain, MolmoAct's depth+waypoint plan, π0.5's language subtasks, Gemini's Embodied Thinking)? Reasoning buys accuracy, interpretability, and human-correctability, and costs latency.`,
        `**5. Single-embodiment vs cross-embodiment.** Trained on one robot (RT-1, RT-2) or many (OXE, OpenVLA, π0's 8 robots, GR00T, Gemini's Motion Transfer)? Cross-embodiment reliably gives positive transfer, the OXE lesson, and is now the default for any model aiming to be a "foundation" policy.`,
      ],
    },
    {
      paragraphs: [
        `Here's the whole roster against those axes:`,
      ],
    },
    {
      table: {
        rows: [
          ["Model", "Backbone", "Action rep.", "Structure", "Reasoning?", "Embodiment", "Openness"],
          ["**RT-1** (2022)", "EfficientNet+FiLM (not a VLM)", "discrete bins", "single", "direct", "single", "closed"],
          ["**RT-2** (2023)", "PaLI-X 55B / PaLM-E 12B", "discrete (text)", "single", "direct", "single", "closed"],
          ["**RT-X / OXE** (2023)", "RT-1 / RT-2", "discrete", "single", "direct", "22 embodiments", "open data, closed model"],
          ["**OpenVLA** (2024)", "Llama-2 7B + DINOv2/SigLIP", "discrete bins (→ L1 in OFT)", "single", "direct", "cross (OXE)", "fully open"],
          ["**Octo** (2023/24)", "from scratch (~27–93M)", "diffusion (continuous)", "single", "direct", "cross (OXE)", "fully open"],
          ["**FAST / π0-FAST** (2025)", "PaliGemma 3B", "FAST tokens (compressed)", "single", "direct", "cross", "open tokenizer"],
          ["**π0** (2024)", "PaliGemma 3B + 300M expert", "flow matching", "single", "direct", "8 robots", "open (via LeRobot)"],
          ["**π0.5** (2025)", "PaliGemma-family", "flow + FAST supervision", "hierarchical", "language subtasks", "cross-environment", "partial"],
          ["**ECoT** (2024)", "OpenVLA", "discrete", "single", "grounded 2D chain", "cross", "open"],
          ["**MolmoAct** (2025)", "Molmo", "autoregressive (3 stages)", "single", "3D depth + waypoints", "cross", "fully open"],
          ["**Gemini Robotics / ER** (2025)", "Gemini 2.0 / 2.5", "action modality / (ER: none)", "dual-agent (1.5)", "Embodied Thinking", "cross (Motion Transfer)", "closed / API"],
          ["**GR00T N1/N1.5** (2025)", "Eagle-2 1.7B", "flow (System 1)", "dual-system", "System-2 planning", "humanoid, cross", "open"],
        ],
      },
    },
    {
      paragraphs: [
        `Read down any column and the lineage's logic is legible: the backbones grow up (EfficientNet → giant VLMs → right-sized 3B), the action reps swing from discrete to continuous and then reconcile via FAST, structure splits into fast/slow, reasoning gets inserted and then grounded in 3D, and everything drifts toward cross-embodiment and openness. Each model in the story fixed the previous one's specific, nameable flaw, and the table is just that story, transposed.`,
      ],
    },
    {
      heading: "STATE OF THE ROSTER (as of Jul 2026)",
      paragraphs: [
        `> **Freshness note, read this first.** VLAs are the fastest-moving area in this entire guide. The snapshot below is accurate *as of July 2026* and *will* go stale; treat it as a dated photograph, not a standing fact. Where a number is a lab's own benchmark, it's flagged **vendor-reported** and should be checked against independent evaluation before you quote it. When you come back to this chapter in six months, re-derive the landscape from the *axes* in the previous section, those are durable, not from these specific model names.`,
        `**Physical Intelligence, π0 / π0-FAST / π0.5.** The flow-matching flagship line. PaliGemma-3B backbone plus a ~300M flow-matching action expert, 50-step action chunks at up to 50 Hz, dexterous long-horizon tasks (laundry, table bussing). π0.5 adds open-world home generalization and language-subtask hierarchy; FAST and Knowledge Insulation let discrete supervision and continuous action coexist. Ported into LeRobot, so widely runnable.`,
        `**OpenVLA / OpenVLA-OFT.** The open, LoRA-tunable workhorse the community builds on. 7B, dual-encoder (DINOv2+SigLIP). OFT moved it to parallel decoding, action chunking, and continuous L1 actions (97.1% avg on LIBERO). The default starting point for a lab that wants to fine-tune its own VLA on modest hardware.`,
        `**Octo.** The open, from-scratch, diffusion-headed generalist. Small (27–93M), the useful control case proving how far continuous actions get *without* a pretrained VLM. Still a common baseline.`,
        `**NVIDIA GR00T N1 / N1.5.** The humanoid foundation model. Dual-system (Eagle-2 VLM at 10 Hz over a flow-matching Diffusion Transformer at 120 Hz), 2.2B total (*not* 34B, that claim is wrong). N1.5 froze the VLM for a big language-following jump (46.6% → 93.3%) and added FLARE + DreamGen data. The reference design for "smart and fast at once."`,
        `**Google DeepMind, Gemini Robotics 1.5 / ER 1.5.** The agentic, tool-using frontier. ER-1.5 orchestrates (plans, calls web search), GR-1.5 acts; Embodied Thinking interleaves reason and action; Motion Transfer gives zero-shot cross-embodiment. ER sold as a plug-in embodied-reasoning brain for your own controller; an on-device version fine-tunes from ~50 demos. Closed / API.`,
        `**Ai2, MolmoAct.** The fully-open 3D "Action Reasoning Model." Depth-aware perception tokens → visible waypoint plan → action; steerable by sketching over the trajectory. Benchmarks (SimplerEnv OOD 72.1%, LIBERO 86.6%) are **vendor-reported**.`,
        `**The through-line as of now:** the field has converged on *VLM backbone + action head*, is reconciling the discrete/continuous fork rather than picking a side (FAST tokens to train the brain, flow to move the hand), is adopting dual-system fast/slow structure for anything that must balance, is inserting grounded reasoning (2D → 3D → agentic tool use) before acting, and treats cross-embodiment and openness as defaults. Every one of those is an axis from the previous section, which is the point of learning the axes.`,
      ],
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        `You came in with the villain of the chapter, semantic knowledge and motor knowledge trapped in separate models, and you leave with the whole lineage that hunted it down. A **VLA takes a vision-language model and gives it a body**: a VLM backbone for what-the-world-means, an action head for how-to-move, fused into one network so the internet's knowledge reaches the gripper. RT-1 had the body and no brain; RT-2 gave it a brain by speaking actions as text; OXE pooled everyone's bodies and found positive transfer; OpenVLA opened it up and beat the giants while small; Octo asked whether you even need the pretrained brain and answered with a continuous diffusion head; the action-representation fork split the field three ways (binning, FAST, flow); FAST compressed tokens in the frequency domain so discrete could keep up; π0 married the VLM brain to a flow-matching body; π0.5 added open worlds and language hierarchy; ECoT and MolmoAct taught it to reason, in pixels, then in 3D, before acting; Gemini split the reasoning brain from the hands and went agentic; GR00T split slow-planner from fast-reflex for humanoids. Each one fixed the last one's flaw. That's the pedagogy and it's also just the history.`,
        `The honest caveat, stated plainly: this chapter's *specific models* are a snapshot of a field that reinvents itself every few months, and every vendor benchmark here is a claim to verify, not a verdict. But the *ideas*, backbone-plus-head, the discrete/continuous/compressed fork, dual-system fast/slow, reason-before-act, cross-embodiment transfer, those are the load-bearing structure, and they'll outlast the model names.`,
        `The gap you should feel now: all of this ran on *demonstrations*, teleoperated trajectories, human video, the "data pyramid." Where does that data come from, how much do you need, and how do you collect it without going bankrupt? That's the whole game, and it's Chapter 10. The best VLA in the world is only as good as the demonstrations that taught it, and demonstrations are the scarcest resource in robotics.`,
        `*Prev: Chapter 8, Perception: Vision & Vision-Language Models · Next: Chapter 10, Learning from Demonstration & Data Collection*`,
      ],
    },
  ],
};
