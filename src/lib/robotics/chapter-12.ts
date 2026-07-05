import type { Chapter } from "../chapters";

export const chapter12: Chapter = {
  slug: "chapter-12-systems",
  number: "12",
  title: "Manipulation, Humanoids & Deploying Real Systems",
  summary:
    "Assembling the whole stack: grasping, dexterous hands, humanoids, ROS 2, evaluation, and safety — plus where the field goes next.",
  published: "Sep 21, 2026",
  updated: "Sep 21, 2026",
  futureRef:
    "The humanoid roster in this chapter is the fastest-decaying thing in the whole guide — treat the \"state of the roster\" box as a dated snapshot and re-check it every few months; names, companies, and approaches shift constantly, and vendor demos are not deployed products. The *principles*, though, are durable: force and form closure, antipodal grasps, and grasp quality metrics are settled geometry; the fast/slow deployment split, the ROS 2 pub/sub model, and the ZMP balance idea are stable architecture; and the hard truths — evaluation is expensive and easy to fool, sim2real still bites, and safety around people is a formal, auditable bar (ISO 10218 / ISO/TS 15066) — will outlive every model on the current leaderboard. Come back to the \"where this leaves us\" walk-through whenever the field's pace makes you lose the plot: it's all still just the sense-plan-act loop, made smarter one beat at a time.",
  sections: [
    {
      paragraphs: [
        "*Everything so far was a piece. This chapter bolts the pieces together into a working, safe, evaluated robot — and confronts the two hardest concrete problems, grasping and humanoids, plus the unglamorous reality of shipping.*",
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        "Here's a video you've seen: a humanoid folds a shirt, or a robot arm plucks a strawberry, or a quadruped backflips off a ledge. It looks solved. It is not solved. That video is a **demo** — a thing that worked once, in a known place, under a warm light, probably on take forty. The gap between *that* and a robot that works reliably, safely, and *measurably* in a stranger's kitchen at 2 a.m. is the widest, meanest gap in this entire field. It is the villain of this final chapter: **the chasm between a demo that works once and a system that works, provably, in the real world.**",
        "Every earlier chapter handed you a piece. Chapter 1 gave you the sense–plan–act loop and the body it runs on. Chapters 2 through 4 taught the loop to *act* — frames, kinematics, control. Chapter 5 taught it to *sense* through drift. Chapter 6 taught it to *plan*. Chapters 7 through 11 taught the pieces to *learn* — reinforcement learning, perception, vision-language-action models, learning from demonstration, world models and simulation. Each was a beautiful component in isolation. None of them, alone, is a robot.",
        "This chapter is the assembly. I'm assuming you've read most of the guide — I'll be calling back constantly, because that's the whole point of a capstone. Here's the road. First, **grasping** — the innocent-looking problem of picking things up, which turns out not to be solved, and the classical-then-learned arc that gets us closest. Then **dexterous manipulation**, reorienting an object *inside* the hand, the frontier of contact. Then **humanoids and whole-body control**, the maximal integration challenge that inherits every problem in this book at once. Then **putting the stack together** — the full deployment pipeline and the middleware, ROS 2, that glues it. Then **evaluation**, which is brutally, embarrassingly hard and is one of the field's biggest open problems. Then **safety and deployment**, the layer nobody puts in the highlight reel and everybody needs. And then a real closing — a walk back through the whole guide, and an honest look at the frontier.",
        "Let's finish this.",
      ],
    },
    {
      heading: "Grasping: the problem that refuses to be solved",
      paragraphs: [
        "Pick up a coffee mug. You did it without thinking, and that's the trap — because \"pick up the mug\" is one of the hardest problems in robotics, and it is *not* solved. Not for arbitrary objects, not robustly, not the way you'd bet your business on. A human toddler out-grasps every robot on Earth. Why?",
        "Because a grasp is a tiny, brittle negotiation with physics. You have to decide *where* to put the fingers, *how hard* to squeeze, and *at what angle* to approach — and get all three right at once, on an object you may never have seen, whose weight, friction, and center of mass you can only guess from a picture. Squeeze too little, it slips. Squeeze too much, you crush it. Approach wrong, you knock it over before you've touched it. And here's the cruel part: a grasp that works on a full mug fails on an empty one, works on a dry mug fails on a wet one. The physics you're negotiating with is invisible in the image.",
      ],
    },
    {
      heading: "The classical view: force closure and antipodal grasps",
      paragraphs: [
        "The old, principled way to think about grasping is **model-based** — assume you know the object's exact 3D shape, and reason about the contact geometry. The central concept is **closure**.",
        "A grasp has **force closure** if the fingers can resist *any* external force and torque you might apply to the object — push it, twist it, shake it, and the grip holds. Formally, the contact forces the fingers can exert must be able to sum to cancel any disturbance wrench (a \"wrench\" is force-plus-torque bundled into one 6-vector — remember from Chapter 4 that the physical world speaks in 6-DoF wrenches). There's a stricter cousin, **form closure**, where the geometry alone cages the object so it can't move *even with frictionless contacts* — think of a peg trapped in a hole. Form closure needs more contact points but doesn't rely on friction; force closure is looser and leans on friction to do some of the work.",
        "The cleanest special case is the **antipodal grasp**, and it's the one to burn in: two contact points on *directly opposing* sides of the object, with the line between them passing through both, roughly along the object's surface normals. Picture pinching a mug's rim with two fingers on exactly opposite sides. If the two surface normals point *at each other* along that line — and friction is enough — you have force closure with just two contacts. That \"point at each other\" condition is the whole game: it means each finger can push straight back against the other, so any sideways slip gets resisted by friction on both sides. A parallel-jaw gripper (two fingers, one squeeze) is *literally an antipodal-grasp machine* — its entire job is to find two opposing faces and pinch them.",
        "Once you can *test* a grasp for closure, you want to *rank* grasps, because usually several work and some are better. That's a **grasp quality metric** — a single number scoring how robust a grasp is. The classic one asks: what's the *smallest* external wrench that could break this grip? A grasp that resists a hard shove in every direction scores high; one that holds only if nothing perturbs it scores low. Maximize that number and you pick the grasp most likely to survive contact with reality.",
        "This is elegant, and it has one fatal dependency: **it needs a known object model.** Force closure, form closure, quality metrics — all of it assumes you have the exact geometry, the friction coefficients, the mass. In a lab with CAD models of every part, wonderful. Point the robot at a novel object it's never seen, with only a camera, and the whole classical edifice has nothing to stand on. You can't compute the contact normals of a shape you don't know.",
      ],
    },
    {
      heading: "The learned view: predict the grasp straight from a picture",
      paragraphs: [
        "So flip the problem. Instead of *reasoning* about a known shape, *learn* to predict good grasps directly from raw vision — no model required. This is where grasping actually started working on novel objects, and it's a beautiful instance of the guide's recurring hero: when you can't write the rule, learn it from data.",
        "The landmark is **Dex-Net** and its grasp-quality network, **GQ-CNN** (Mahler et al., 2017). The idea: take a depth image, propose lots of candidate grasps (positions and angles for a parallel-jaw gripper), and train a convolutional network to predict, for each one, the *probability it will successfully hold*. Crucially, the training labels came from **analytic grasp metrics computed in simulation over millions of object-and-grasp pairs** — so the classical force-closure math didn't get thrown away, it got *distilled into a network* that no longer needs the object model at test time. You feed in a depth image of something the robot has never seen, and it outputs a heat-map of where to grasp and how confident it is. The physics knowledge is baked into the weights.",
        "The modern descendant is **dense grasp prediction**, GraspNet-style: rather than scoring a handful of candidates, predict a whole *field* of 6-DoF grasp poses over the visible surface in one shot — thousands of candidate grasps ranked in a single forward pass, for full 3D approach angles, not just top-down pinches. This is where \"grasp any object in the bin from one depth image\" starts to be a thing you can actually deploy.",
        "Notice what each grasp *is*, though, because it ties straight back to the guide. A grasp is an **end-effector pose** — a position and orientation for the gripper, exactly the 6-DoF pose from Chapter 3. The grasp predictor's whole output is \"put the hand *here*, oriented *this way*.\" And once the hand is there, *how hard to squeeze* is a **force-control** problem — Chapter 4's compliant, torque-controlled grip, so you hold the egg without turning it into an omelette. Grasping isn't a new kind of problem; it's Chapter 3 (where to put the hand) married to Chapter 4 (how gently to close it), with a learned front-end deciding the where.",
      ],
    },
    {
      heading: "The gripper spectrum",
      paragraphs: [
        "The last piece of the grasping puzzle is the hardware, and there's a clean spectrum with a clean tradeoff.",
      ],
      list: [
        "**Parallel-jaw grippers** — two fingers, one degree of freedom, pinch. Simple, cheap, robust, and *well understood* (it's the antipodal-grasp machine from above). The overwhelming majority of deployed manipulation runs on these, because \"boring and reliable\" wins in production. The cost is generality: two flat fingers can't do everything a hand can.",
        "**Multi-finger dexterous hands** — three, four, five fingers, many joints, human-like. General-purpose: in principle they can grasp, reorient, and manipulate almost anything. The cost is **control** — a five-fingered hand is a high-DoF, contact-rich nightmare (the exact reason it's a frontier, next section). More capability, dramatically harder to command.",
        "**Suction** — a vacuum cup that grips by pressure, no fingers at all. Fantastic for flat, sealable, non-porous surfaces (this is why warehouse pick-and-place robots love suction — boxes and bags are suction's happy place). Useless on porous, irregular, or floppy objects.",
      ],
    },
    {
      paragraphs: [
        "The tradeoff is generality versus controllability, and the industry's dirty secret is that **most working systems pick the simplest gripper that does the job.** Parallel-jaw and suction ship; dexterous hands are where the research and the ambition live.",
      ],
    },
    {
      diagram: {
        id: "rb-12-1",
        caption:
          "An antipodal grasp works when two opposing contact points have surface normals pointing at each other inside their friction cones — then the fingers can resist any disturbance. Rotate the object and watch a holding grasp become a slipping one; that fragility is why grasping isn't solved.",
      },
    },
    {
      quiz: {
        question:
          "A classical force-closure planner needs a CAD model of the object to compute contact normals and a quality metric. A warehouse robot faces a bin of thousands of never-before-seen products. How does the learned approach (Dex-Net / GraspNet) get around the missing model, and where did its physics knowledge come from?",
        answer:
          "The learned approach never needs the object model *at test time* — it predicts grasp quality (or a dense field of grasp poses) directly from a depth image, so an unseen product is fine as long as the network has learned the general mapping from \"what a surface looks like\" to \"will a pinch here hold.\" But the physics didn't come from nowhere: systems like Dex-Net generated their *training labels* by running the classical analytic force-closure and quality metrics over millions of object-and-grasp pairs in simulation. So the model-based physics wasn't discarded — it was distilled into the network's weights during training, and the network amortizes that reasoning into a single fast forward pass. It's the guide's recurring move: when you can't run the exact computation at deploy time (no model), learn a function that approximates it from data generated by the exact computation.",
      },
    },
    {
      heading: "Dexterous manipulation: reorienting the object inside the hand",
      paragraphs: [
        "Grasping picks a thing up. **Dexterous, in-hand manipulation** is the harder sequel: once you're holding it, *move it within your grip* — spin a pen between your fingers, reorient a screwdriver to point the right way, turn a key. You do this constantly and unconsciously. For a robot it is one of the hardest things in the field, and here's why.",
        "In-hand manipulation is **contact-rich**: the object is held by many fingertips at once, and progress happens by *making, breaking, and sliding* those contacts in a carefully timed sequence. Every time a finger lifts off or a new one lands, the dynamics change discontinuously — the system is a rapid-fire sequence of different physical regimes. There's no smooth equation for \"roll the cube 90 degrees by walking my fingers around it.\" This is exactly the situation Chapter 7 flagged as the reason RL exists: the dynamics are too messy, discontinuous, and high-dimensional to hand-code. You cannot write the controller. You have to *learn* it.",
        "The landmark result is **Dactyl** (OpenAI, 2019) — a five-fingered robot hand that learned, via reinforcement learning trained massively in simulation, to reorient a block and eventually to manipulate a **Rubik's cube** one-handed. It didn't *solve* the cube (a separate algorithm did the solving); the hard part, the part that made it famous, was the *physical dexterity* — spinning and flipping the cube in-hand to hit each commanded orientation without dropping it. And the way it crossed from simulation to a real hand is the Chapter 7 recipe wearing a manipulation costume: **domain randomization**, training across thousands of randomized physics parameters (friction, mass, latency) so the policy learned a strategy robust enough to survive the reality gap. Dactyl was a proof of principle — contact-rich in-hand manipulation *is* learnable — more than a shippable product, and honestly, robust general in-hand manipulation is *still* a frontier today.",
        "There's a sense the classical stack barely uses and dexterity absolutely demands: **touch.** You reorient a pen by feel, not by looking — your fingertips sense force, slip, and contact. Robots need the same. The proprioceptive **force/torque sensing** from Chapter 1 gives coarse \"how hard am I pushing\" at the wrist. But the exciting frontier is **vision-based tactile sensing** like **GelSight** — a fingertip with a soft gel pad and a *camera inside it* watching the gel deform. When the fingertip touches something, the gel imprints the object's micro-geometry, and the internal camera reads it as an image. Suddenly touch becomes a high-resolution *picture* of the contact — you can see texture, edges, exactly where and how hard contact is happening, even tiny slip. It turns the sense of touch into something the vision machinery of Chapter 8 can chew on, which is a genuinely powerful trick.",
      ],
    },
    {
      diagram: {
        id: "rb-12-2",
        caption:
          "In-hand manipulation reorients an object by making, breaking, and sliding contacts in sequence — each switch is a discontinuous change in the dynamics. That contact-rich, unwritable-by-hand quality is exactly why it took reinforcement learning (OpenAI's Dactyl, 2019) and why it's still a frontier.",
      },
    },
    {
      quiz: {
        question:
          "Why is in-hand reorientation a poster child for reinforcement learning specifically, rather than the classical control and planning of Chapters 4 and 6? And what does vision-based tactile sensing (GelSight) add that a wrist force/torque sensor doesn't?",
        answer:
          "Classical control and planning want a model — smooth, differentiable dynamics you can write down and optimize against. In-hand manipulation has the opposite: the dynamics are *contact-rich and discontinuous*, changing abruptly every time a finger makes or breaks contact, across a high-DoF hand. There's no clean equation for \"walk my fingers around the cube to spin it,\" so you can't hand-code or cleanly plan it — which is precisely Chapter 7's trigger for reaching for RL, learning the policy from massive trial-and-error in simulation and crossing to reality with domain randomization (this is how Dactyl worked). As for tactile: a wrist force/torque sensor gives one coarse 6-vector of \"total push at the wrist,\" blind to *where* on the fingertip contact is happening. GelSight puts a camera behind a soft gel and reads the *imprint* of the contact as a high-resolution image, so you see contact location, texture, and incipient slip per-fingertip — turning touch into a dense signal the vision stack can process, which is exactly the fine-grained feedback dexterity needs.",
      },
    },
    {
      heading: "Whole-body control and humanoids: the maximal integration challenge",
      paragraphs: [
        "A robot arm is bolted down, so *where it is* is free and *what its hand does* is everything (Chapter 1). Add legs and the base starts to float — now the robot has to hold *itself* up while it works. A humanoid is the extreme: arms *and* legs *and* torso, all of which have to cooperate under two unforgiving constraints — **balance** (don't fall) and **contact** (feet on the floor, hands on the object). Coordinating all of it at once is **whole-body control**, and it's the hardest control problem in the guide (Chapter 4 built the tools; here they meet their toughest test).",
        "The intuition for balance can be captured in one idea: the **Zero-Moment Point (ZMP)**. Roughly, as a legged robot moves, there's a point on the ground where all the tipping torques cancel out — where the net moment from gravity and inertia is zero. **As long as that point stays inside the polygon under the robot's feet (its support), the robot won't tip over.** Push the ZMP to the edge of the foot and you're on the verge of toppling; push it outside and you fall. So classical humanoid walking became, in large part, the art of planning motions that keep the ZMP safely inside the support polygon — lean, step, and swing your arms so the tipping torques always cancel over solid ground. (Side note: this is why early humanoids walked with that careful, knees-bent, flat-footed shuffle — it's a gait that keeps the ZMP obediently inside a big flat support. Humans, by contrast, walk *dynamically*, constantly falling forward and catching ourselves, which is far more efficient and far harder to control.)",
        "Here's why humanoids are the maximal bet: **they inherit every problem in this guide at once.** Frames and transforms (Chapter 2) to relate dozens of links. Kinematics and the Jacobian (Chapter 3) for both arms and both legs. Whole-body control (Chapter 4) under balance and contact. State estimation and drift (Chapter 5) to know where the floating body is. Planning (Chapter 6) for footsteps and reaching. Reinforcement learning (Chapter 7) for locomotion nobody can hand-code. Perception and VLMs (Chapter 8). The vision-language-action stack (Chapter 9) for manipulation. Learning from demonstration (Chapter 10) and simulation (Chapter 11) to get the data. A humanoid is not one hard problem — it is *all* of them, stacked, running together, in real time, on a body that falls over if any of them hiccups. That's the whole reason it's the arena where the field proves itself.",
        "And here's how modern humanoids actually cope, which is the key architectural insight: **they split the problem.** Balance and locomotion — walking, staying upright, recovering from a shove — are handled by **classical control plus reinforcement learning**, exactly the Chapter 7 teacher–student recipe (train a robust locomotion policy in simulation with a privileged teacher, distill it into a student that runs from onboard sensors). Manipulation — what the hands do, guided by what the eyes see and what you asked for — is handled by **learned vision-language-action policies** (Chapter 9). The legs run one kind of intelligence, the hands another, and the torso mediates. This factorization — RL for the body's balance, VLAs for the hands' tasks — is roughly how the current generation is built, and it's genuinely clever: it puts each sub-problem where the right tool for it lives.",
      ],
    },
    {
      paragraphs: [
        "> **STATE OF THE HUMANOID ROSTER (as of Sep 2026 — a fast-moving snapshot, read the caveat)**",
        "This box describes *approaches*, not spec sheets, and it will be stale fast — the humanoid roster changes practically every quarter, companies come and go, and vendor demos are not deployed products. Treat every name here as \"a serious effort exploring this direction as of writing,\" nothing more. Do not read specific unverifiable performance claims into it.",
      ],
    },
    {
      list: [
        "**Boston Dynamics (electric Atlas).** The long-time leader in dynamic legged control pivoted its flagship humanoid from hydraulics to an all-electric platform, pairing decades of balance/locomotion expertise with a push toward learned manipulation. The story here is *dynamic whole-body control meets modern learning.*",
        "**Tesla (Optimus).** A bet that humanoids can ride the same vertically-integrated hardware-and-data machine, and the same end-to-end learning philosophy, as autonomous driving. The story is *scale the data and the manufacturing.*",
        "**Figure.** A startup pursuing general-purpose humanoids for work environments, publicly leaning into a vision-language-action-style learned control stack for manipulation. The story is *general manipulation via foundation-model policies.*",
        "**Unitree (H1 / G1).** Known for driving the *cost* of capable legged hardware down sharply, making humanoid (and quadruped) platforms broadly accessible to researchers. The story is *affordable, available hardware.*",
        "**1X (Neo).** Focused on humanoids for the *home*, emphasizing safe, quiet, human-friendly operation around people. The story is *safety and human environments.*",
        "**Agility Robotics (Digit).** A bipedal robot aimed squarely at logistics and warehouse work, with real pilots in industrial settings. The story is *legs for real, boring, deployed material handling.*",
        "**Apptronik (Apollo).** A general-purpose humanoid targeting industrial and logistics tasks, emphasizing modularity and manufacturability. The story is *build a practical, deployable industrial worker.*",
      ],
    },
    {
      paragraphs: [
        "The through-line across all of them: **classical/RL control for the body, learned policies for the hands, and an enormous unsolved question mark over reliability, safety, and data.** By the time you read this, at least one name has changed. Lean on the *principles*, not the roster.",
      ],
    },
    {
      diagram: {
        id: "rb-12-3",
        caption:
          "A humanoid inherits every problem in this guide at once, and the modern answer is to factor it: RL runs the legs, VLAs run the hands, balance control mediates the whole body, perception feeds the head. Click a region to see which chapter's method lives there.",
      },
    },
    {
      quiz: {
        question:
          "Explain the ZMP in one sentence, and then explain why modern humanoids don't try to solve balance *and* manipulation with a single monolithic policy.",
        answer:
          "The Zero-Moment Point is the point on the ground where the net tipping moment (from gravity and the robot's inertia) is zero, and as long as it stays inside the support polygon under the feet, the robot won't tip over — so classical balance is largely the art of keeping the ZMP inside that support. Modern humanoids split rather than monolith-ize because balance/locomotion and manipulation are *different kinds of problems with different best tools*: locomotion is a high-frequency, contact-rich, hand-code-resistant control problem that reinforcement learning (with teacher–student sim2real, Chapter 7) handles beautifully, while manipulation is a semantic, \"understand the instruction and the scene\" problem that vision-language-action models (Chapter 9) handle beautifully. Forcing one network to do both wastes the specialized structure each sub-problem has, is harder to train and debug, and throws away the mature, reliable locomotion controllers you already trust. Factoring the body into \"RL for the legs, VLAs for the hands, balance control mediating\" puts each piece where its right tool lives — which is exactly the systems-engineering instinct this whole chapter is about.",
      },
    },
    {
      heading: "Putting the stack together: the full deployment pipeline",
      paragraphs: [
        "You now have all the pieces. A real deployed robot is what happens when you *chain* them into one running system, and the chain is — no surprise — the sense–plan–act loop from Chapter 1, just with every beat filled in by a sophisticated component.",
        "Trace a single task, \"pick up the red cup and put it in the sink,\" through a real stack:",
      ],
      list: [
        "**Perception (Chapters 5, 8).** Cameras and depth sensors stream in; a vision model segments the scene, finds the cup, estimates its pose; state estimation tracks where the robot itself is. The loop's *sense* beat.",
        "**High-level reasoning / planning (Chapters 6, 9).** A vision-language model or VLA interprets the instruction, grounds \"the red cup\" to the detected object, and decides the sequence: approach, grasp, lift, carry, release. The *plan* beat, now semantic.",
        "**Low-level control (Chapter 4).** The chosen grasp pose becomes joint targets; a controller drives the arm there and closes the gripper with compliant force control so it doesn't crush the cup. The *act* beat.",
        "**Back to sense.** The action moved the world (and the cup), so the loop closes and re-perceives — did the grasp hold? Correct and continue.",
      ],
    },
    {
      paragraphs: [
        "That's a real robot: Chapter 1's three-beat loop, each beat now a whole chapter's worth of machinery.",
        "There's a structural pattern worth naming, because it's how the best current systems are organized: the **dual-system, fast/slow split** (this is the GR00T-style architecture from Chapter 9). A **slow** system — a big vision-language model — reasons about the task, the scene, and the instruction at a few times per second: \"what should I be doing?\" A **fast** system — a lightweight action policy — runs the actual motor control at high frequency: \"how do I move *right now* to do it?\" Slow deliberation on top, fast reaction underneath, exactly like your own deliberate-planning brain sitting on top of your spinal reflexes. It's the pragmatic answer to a hard constraint: reasoning is expensive and slow, control has to be cheap and fast, so you split them and let each run at its own clock.",
      ],
    },
    {
      heading: "ROS 2: the glue that makes it a system",
      paragraphs: [
        "Here's the unglamorous truth: a robot is a dozen programs — a camera driver, a perception node, a planner, a controller, a gripper driver, a logger — that all have to talk to each other, in real time, without you hand-wiring every connection. The thing that lets them is **middleware**, and in robotics the near-universal answer is **ROS 2** (the Robot Operating System — which, funny name, is not an operating system at all; it's a communication and tooling layer that runs *on top of* Linux).",
        "The mental model is simple and it's the whole point:",
      ],
      list: [
        "A **node** is one program doing one job — the camera driver is a node, the planner is a node, the controller is a node.",
        "Nodes communicate by **publishing** and **subscribing** to named **topics**. A topic is a channel with a name, like `/camera/image` or `/cmd_vel`. The camera node *publishes* images to `/camera/image`; the perception node *subscribes* to `/camera/image` and *publishes* detected objects to `/objects`; the planner subscribes to `/objects`, and so on.",
        "Nobody addresses anybody directly. The camera node has no idea who's listening — it just publishes. Anyone who wants the data subscribes. This **publish/subscribe (pub/sub)** decoupling is why you can swap the perception node for a better one without touching the camera or the planner: they only agreed on a topic name and a message format, not on each other.",
      ],
    },
    {
      paragraphs: [
        "The result is a **pub/sub graph** — nodes as boxes, topics as the arrows between them — and that graph *is* the sense-plan-act loop made concrete: data flows from sensor nodes, through perception and planning nodes, to controller nodes, and out to the actuators. Why does a standardized message-passing layer matter so much? Because it's what turns a pile of research demos into an assemblable *system*. Standard messages, standard tooling, standard recording and playback — a whole ecosystem builds on the agreement. (Among the things ROS hosts: the **TF tree** from Chapter 2 — the live, continuously-published tree of coordinate-frame transforms that lets any node ask \"where is the gripper in the world frame right now?\" and get a consistent answer. That frame bookkeeping, quietly running as a ROS service, is load-bearing for the entire stack.)",
      ],
    },
    {
      diagram: {
        id: "rb-12-4",
        caption:
          "A deployed robot is a graph of nodes publishing and subscribing on named topics — the sense-plan-act loop made concrete in ROS 2. Because nodes agree only on topic names, not on each other, you can swap or kill one and the rest keep running; that decoupling is what turns research demos into an assemblable system.",
      },
    },
    {
      quiz: {
        question:
          "In a ROS 2 system, the perception node publishes to `/objects` and the planner subscribes to `/objects`. You want to replace the perception node with a better model. Why can you do that without modifying the planner — and what's the one thing you *must* keep the same?",
        answer:
          "Because pub/sub is *decoupled*: the planner never referenced the perception node directly — it only ever subscribed to the *topic* `/objects`. It has no idea, and no need to know, which program is producing that data. So you can unplug the old perception node and plug in a new one, and as far as the planner is concerned nothing changed — data still arrives on `/objects`. The one thing you must preserve is the **contract**: the topic name and the message format. The new node has to publish to the same topic with the same message type (the same fields the planner expects), because that shared agreement is the *only* thing the two nodes ever coordinated on. That's the whole power of a standardized message-passing layer — components agree on interfaces, not on implementations, so you can evolve the system piece by piece. It's the same modularity principle that makes the sense-plan-act loop composable in the first place.",
      },
    },
    {
      heading: "Evaluation: the problem nobody wants to talk about",
      paragraphs: [
        "Here is the most uncomfortable fact in modern robotics, and I want to state it plainly because the field often mumbles it: **we are bad at measuring whether robots work.** Evaluation — the thing that should tell you if your method is actually better — is one of the biggest open problems in the field, and it's worth understanding exactly why.",
        "Real-world evaluation is **expensive, slow, and noisy.** In machine learning you evaluate a vision model on a fixed test set of ten thousand images in seconds, and the number is reproducible. You cannot do that with a robot. Running a real robot trial takes *physical time* — seconds to minutes each — and requires a real robot, a real human to reset the scene, real objects to grasp. You cannot run ten thousand real trials; you run maybe fifty, maybe a couple hundred if you're serious, and every one is a snapshot of a slightly different world (the lighting drifted, the object landed at a new angle, the gripper wore a little). So your success-rate estimate is *statistically thin* — the difference between \"70% success\" and \"78% success\" over fifty trials might be pure noise. The measurement itself is unreliable, which poisons every comparison downstream.",
        "The natural escape is **simulation benchmarks** — standardized simulated task suites where anyone can run thousands of trials fast and cheap and compare methods on the same footing. The field has built good ones: **LIBERO** (a benchmark for lifelong/continual manipulation learning), **SimplerEnv** (built specifically to *correlate* with real-robot performance so a sim score means something), **Meta-World** (a suite of many distinct manipulation tasks for testing multi-task and generalization), and **RoboSuite** (a modular simulation framework for building manipulation benchmarks). These are genuinely valuable — they let you iterate a hundred times faster and compare apples to apples. But they carry the villain from Chapter 11 in their pocket: the **sim2real validity gap.** A method can top a simulation leaderboard and flop on hardware, because the simulator's physics and rendering aren't reality. A high sim score is *evidence*, not proof. (SimplerEnv exists precisely to shrink this gap, and that it needed to be built tells you how real the gap is.)",
        "And then there are **vendor benchmark numbers**, which — as Chapter 9 warned — you should read with a cocked eyebrow. \"95% success on our internal benchmark\" tells you almost nothing without knowing: success on *what* task, on *which* objects, in *whose* environment, over how many trials, under whose supervision. Vendors report their best conditions. Believe demos and numbers when they come with the task distribution, the trial count, and ideally an independent replication — not before.",
        "What should you actually measure? Three things, honestly:",
      ],
      list: [
        "**Success rate** — fraction of trials the robot completes the task. The headline, but meaningless without the conditions.",
        "**Generalization** — the gap between **seen** and **unseen**. Trained-on objects versus novel objects. The lab bench versus a new kitchen. A robot that hits 90% on objects it trained on and 40% on new ones hasn't learned to grasp — it's memorized. The seen/unseen gap is often the *most* honest single number about a system, and it's the one demos hide hardest.",
        "**Robustness to perturbation** — poke it. Move the object mid-grasp, change the lighting, nudge the robot. A system that only works undisturbed is a system that only works in the demo.",
      ],
    },
    {
      paragraphs: [
        "The honest state: evaluation is *hard*, the community knows it's hard, and building trustworthy, scalable, real-world-predictive evaluation is one of the genuine frontiers. When you read a robotics result, the first question isn't \"how good is the number\" — it's \"how was it measured.\"",
      ],
    },
    {
      diagram: {
        id: "rb-12-5",
        caption:
          "A robot's success rate on trained conditions flatters; the gap to unseen conditions is the honest measure of whether it learned or memorized. Drop the trial count and watch the difference dissolve into noise — real-world evaluation is expensive, thin, and easy to fool, which is why it's one of the field's biggest open problems.",
      },
    },
    {
      quiz: {
        question:
          "A vendor reports \"92% success rate\" for their manipulation robot. List three questions you'd need answered before that number means anything, and explain why the seen-versus-unseen gap is often more informative than the headline success rate.",
        answer:
          "Three questions, at minimum: (1) *On what task and which objects?* — 92% on \"grasp a rigid box from a clean table\" is worlds apart from 92% on \"grasp arbitrary deformable objects from clutter.\" (2) *Over how many trials, and with what variation between them?* — 92% over 25 cherry-picked trials in one fixed setup is nearly meaningless; the estimate is statistically thin and the conditions may be curated. (3) *Seen or unseen conditions — were these objects and environments in the training distribution?* — 92% on trained objects tells you it can repeat, not that it can generalize. The seen/unseen gap is more informative than the headline because the headline can be inflated arbitrarily by testing only on familiar conditions, whereas the gap exposes whether the system *learned the skill* or *memorized the demo*: a small gap means genuine generalization, a large gap means the flattering number was hollow. Real robots meet unseen conditions constantly, so the unseen number — and the size of the drop — is the one that predicts field performance, which is exactly why demos foreground the seen number and bury the gap.",
      },
    },
    {
      heading: "Safety and deployment: the layer that isn't in the highlight reel",
      paragraphs: [
        "Everything to here got the robot to *work*. This section is about the thing that separates a viral clip from a product you can put in a warehouse next to a human being: it has to be **safe**, and it has to **fail gracefully.** This layer is unglamorous, it never makes the demo reel, and it is the difference between a research project and a real deployment.",
        "Start with the most physical requirement: a robot working near people **must be able to yield.** This is the stiff-versus-compliant split from Chapter 1, come roaring back exactly as promised. A stiff, position-controlled robot holds its commanded pose *hard* — push on it and it pushes back, and if a person is in the way, it does not care; it will happily crush what's between it and its target. A **compliant**, force-limited robot (Chapter 4's torque control) *gives* when it meets unexpected resistance — it senses the force and yields instead of driving through. For a robot sharing space with humans, compliance isn't a nice-to-have, it's the foundational safety property. You literally cap the force the robot is *allowed* to exert, so that even a full-speed mistake can't injure someone.",
        "On top of compliance sits a stack of safety machinery:",
      ],
      list: [
        "**Emergency stops (e-stops)** — a big red button, and its software cousins, that cut power or halt motion instantly, independent of the main control software. The point of an e-stop is that it works *even when everything else has failed* — it must not depend on the buggy stack it's protecting you from.",
        "**Collision avoidance** — the robot continuously checks its planned motion against a live model of its surroundings (and the humans in them) and refuses or reroutes motions that would hit something. Planning (Chapter 6) with safety as a hard constraint, not a preference.",
        "**Graceful failure** — when something goes wrong (and it will), the robot's job is to fail *safely*: stop, hold, drop to a stable posture, ask for help — never thrash, never keep driving into the error. A robot that fails safe is deployable; one that fails catastrophically is not.",
        "**Human-robot interaction** — the robot has to be *legible*: move predictably, signal intent, behave the way a nearby human expects. A robot that lurches unpredictably is dangerous even if it never actually touches anyone, because people around it can't reason about it.",
      ],
    },
    {
      paragraphs: [
        "And then there's the line most demos never cross: **certification.** A lab demo has to work; a *product* has to be *certified safe* against real standards. In collaborative robotics the reference points are **ISO 10218** (safety requirements for industrial robots) and **ISO/TS 15066** (the technical specification for **collaborative** robots — robots designed to share space with humans, which specifies things like allowable contact forces and speeds so a human and robot can safely work in the same cell). I'm mentioning these at a high level on purpose — the details are a career unto themselves — but the *existence* of them is the point: there is a formal, measured, auditable bar for \"safe around people,\" and clearing it is a different and harder thing than making the robot function. A demo shows the robot *can* do the task; certification proves it *won't hurt anyone* while doing it, over and over, including when it fails.",
        "This is the chapter's villain, named directly: **\"works in the demo\" is the beginning, not the end.** The demo is take forty in a controlled room. The product is ten thousand takes in a stranger's space, safe every single time, including the times it goes wrong. Everything in this section is the unglamorous engineering that lives in that gap — and it is where most of the real work of deploying robots actually happens.",
      ],
    },
    {
      diagram: {
        id: "rb-12-6",
        caption:
          "A robot sharing space with people must be able to yield: a stiff position-controlled arm drives through an obstacle and spikes the contact force into the danger zone, while a compliant force-limited arm senses the resistance and stops safely under its force cap. That single property — the ability to give way — is the foundation collaborative-robot safety standards (ISO/TS 15066) are built on.",
      },
    },
    {
      quiz: {
        question:
          "A humanoid completes a flawless demo folding laundry in a lab. Name three things that still stand between that demo and deploying the same robot into people's homes, and connect at least one of them back to the stiff/compliant idea from Chapter 1.",
        answer:
          "A flawless demo is take-forty-in-a-controlled-room; deployment demands things the demo never tested. Three examples: (1) *Safety around people* — the home is full of humans and pets, so the robot must be **compliant and force-limited** (Chapter 1's stiff-vs-compliant split, realized as Chapter 4's torque control): it has to *yield* when it meets an unexpected obstacle rather than drive through it, and its maximum exertable force must be capped so even a full-speed error can't injure someone. That's the direct callback — a stiff position-controlled robot that crushes what's in its path is a demo robot, not a home robot. (2) *Graceful failure and e-stops* — the demo showed success; deployment demands that the *failures* (which will happen) end safely — stop, hold, ask for help — via mechanisms like an e-stop that works even when the main software has crashed. (3) *Generalization and certification* — the demo folded *those* clothes on *that* table; a home has unseen garments, lighting, and layouts (the seen/unseen gap), and shipping a product legally and responsibly means clearing formal safety standards (ISO 10218 / ISO/TS 15066), an auditable bar far beyond \"it worked once.\" The demo proves capability; deployment proves reliable, certified, safe capability — a categorically harder thing.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        "Take a breath. Look back at the road we walked.",
        "We started, in Chapter 1, with a single loop: **sense, plan, act, repeat** — and the two villains that haunt it, a world that won't hold still and measurement that always lies a little. Everything after was that loop, made smarter one beat at a time. We learned the **language of space** (Chapter 2) so the robot could say where things are, and **kinematics** (Chapter 3) so it could turn joint angles into a hand in the world, and back again. We built **control** (Chapter 4) so a command became a motion, stiff or gently compliant. We fought drift with **estimation and SLAM** (Chapter 5) so the robot could know where it is despite lying sensors, and we found paths through configuration space with **planning** (Chapter 6). Then, where no engineer could write the controller, we let the robot **learn** it — **reinforcement learning** (Chapter 7) for the behaviors too messy to hand-code. We gave it eyes and language with **perception and VLMs** (Chapter 8), and then hands guided by understanding with **vision-language-action models** (Chapter 9). We taught those models from human **demonstration** (Chapter 10), and trained them at scale inside **world models and simulation** (Chapter 11). And here, in Chapter 12, we bolted it all together — **grasping, dexterity, humanoids, the deployed stack, evaluation, and safety** — into something that could stand in the real world.",
        "Here is the throughline, the one sentence the whole guide was quietly building toward: **a robot is that same sense-plan-act loop from Chapter 1, made ever smarter at each beat.** Frames and kinematics sharpened *act*. Estimation sharpened *sense*. Planning and RL and VLAs sharpened *plan*. Every fancy acronym in this book — SLAM, PPO, GAE, CLIP, GR00T, ROS — is just a more capable way to do one of three things a robot has always done: read the world, decide, and move. You didn't learn a hundred disconnected topics. You learned one loop, deepened a hundred ways.",
        "Now the honest part, because this guide promised honesty. **General-purpose robots are not solved.** Grasping a novel object still fails more than you'd like. Dexterous in-hand manipulation is a frontier. Humanoids are a magnificent integration of every hard problem, which is another way of saying every hard problem still bites. The **data** to train these systems is scarce and expensive (Chapter 10's whole struggle). **Evaluation** is thin and easy to fool. **Reliability** — working the ten-thousandth time, not just the fortieth — is the difference between a clip and a product. **Safety** around real people is a formal, unfinished bar. And **sim2real**, the reality gap, still stands between the simulator where we can train cheaply and the world where the robot has to actually live. None of these is solved. All of them are hard on purpose — they're hard because the world is hard.",
        "But — and this is the note to end on, and I mean it — **the pieces are converging, fast.** For most of this field's history the parts were separate: control people didn't talk to vision people didn't talk to learning people. What's changed, right now, in the years this guide was written, is that the pieces are *snapping together* — perception feeding language feeding action, simulation feeding learning feeding real robots, one loop from camera to motor learned end to end. The demos that used to be impossible are now merely unreliable, and \"unreliable\" is a problem you can *grind down* with data, evaluation, and engineering in a way that \"impossible\" never was. That's the real state of things: not solved, but no longer stuck. Converging.",
        "You came into this guide not knowing what a joint was. You leave it able to look at a humanoid folding a shirt and see the whole stack — the frames, the Jacobian, the force controller, the state estimate, the learned policy, the pub/sub graph, the safety cap, and the sense-plan-act loop beating under all of it, thousands of times a second, fighting a world that won't hold still.",
        "That loop is the whole field. Everything else is just making each beat smarter. Go make one of them smarter.",
      ],
    },
  ],
};
