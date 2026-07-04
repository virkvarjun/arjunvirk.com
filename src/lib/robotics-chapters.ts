import type { Chapter } from "./chapters";
import { chapter2 } from "./robotics/chapter-2";
import { chapter3 } from "./robotics/chapter-3";
import { chapter4 } from "./robotics/chapter-4";
import { chapter5 } from "./robotics/chapter-5";
import { chapter6 } from "./robotics/chapter-6";

// The Robotics Bible. Prose is authored in content/robotics-bible/*.md and
// transcribed here into the same Chapter/section schema the ML Bible uses;
// figures are mounted by id and rendered from the diagram registry.

const chapter1: Chapter = {
  slug: "chapter-1-anatomy",
  number: "1",
  title: "Anatomy of a Robot",
  summary:
    "What a robot actually is: the sense–plan–act loop, joints, degrees of freedom, actuators, sensors, and why parallel parking is hard.",
  published: "Jul 6, 2026",
  updated: "Jul 6, 2026",
  futureRef:
    "The concepts here are stable — joints, DoF, the sense–plan–act loop, and the proprioceptive/exteroceptive split haven't changed in decades and won't. Specific sensor and actuator hardware improves year over year (cheaper LiDAR, stronger motors, better tactile skin), so treat any specific spec as a snapshot, but the mental model is evergreen. Come back to Fig 1.3 (configuration space) whenever planning or kinematics stops making sense — almost every later idea is a motion through that space.",
  sections: [
    {
      paragraphs: [
        "*What a robot actually is, once you strip away the sci-fi: a body that senses, decides, and moves — and the loop that ties those three together.*",
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        "Here's the uncomfortable truth that makes robotics hard and beautiful at the same time: **a neural network that's wrong just outputs a bad number, but a robot that's wrong knocks a glass off the table.** Everything in this guide is downstream of that one fact. Software gets to live in a clean world of tokens; a robot has to live in *ours* — with gravity, friction, sensor noise, and a clock that never stops.",
        "Before we can talk about the flashy stuff — the vision-language-action models steering humanoids, the reinforcement learning that teaches a quadruped to run — we have to agree on what a robot *is*. Not philosophically. Mechanically. Because every algorithm later in this guide is really just a way of answering one of three questions a robot is constantly asking: *where am I, what should I do, and how do I make my body do it?*",
        "I'm assuming you can read a bit of math and you've seen a for-loop. Everything else — joints, frames, actuators, degrees of freedom — we build from zero. Here's the road: we start with the single loop that every robot ever built runs on. Then we open up the body: the joints that let it move, the actuators that drive them, the sensors that tell it what happened. We count degrees of freedom, because that number governs everything. And we end with the one distinction — holonomic vs nonholonomic — that explains why parallel parking is annoying and why a drone isn't.",
        "Let's go.",
      ],
    },
    {
      heading: "The loop that every robot runs",
      paragraphs: [
        "Strip any robot down — a Roomba, a surgical arm, a Boston Dynamics Atlas — and you find the same three-beat loop running underneath, thousands of times a second:",
        "**Sense → Plan → Act.** Read the world. Decide what to do. Move. Repeat.",
        "That's it. That's the whole field. A Roomba senses a bump, plans a turn, acts by spinning a wheel. Atlas senses its own tilt, plans a foot placement, acts by firing actuators in its leg. The *sophistication* lives in how each beat is done, but the skeleton never changes. Everything you'll learn — SLAM, PID, PPO, VLAs — slots into exactly one of these three beats.",
        "Two things make the loop hard, and they're the villains of this entire guide:",
        "**Villain #1: the world doesn't hold still.** By the time you've finished planning, the world has moved on. So the loop has to run *fast* — often 100 to 1000 times per second — and each pass can only afford a little computation. This is why robotics obsesses over latency in a way that pure ML doesn't.",
        "**Villain #2: every measurement lies a little.** No sensor is exact. No motor moves exactly where you told it. These small errors don't stay small — they *accumulate*. Drive forward \"one meter\" a hundred times using only your wheel counts, and you'll be meters away from where you think you are. The hero that fights this — **feedback**, closing the loop by constantly re-measuring — shows up in every chapter from here on.",
      ],
    },
    {
      diagram: {
        id: "rb-1-1",
        caption:
          "Every robot is this loop. Speed fights a world that won't hold still; feedback fights measurement error that would otherwise pile up.",
      },
    },
    {
      quiz: {
        question:
          "A weather-prediction model and a walking robot both \"perceive and decide.\" Why is the robot's job fundamentally harder?",
        answer:
          "The weather model produces an output and stops; if it's wrong, the cost is a wrong number. The robot's action *changes the very world it's about to sense next*, and it has to close that loop continuously and in real time. A late or wrong decision doesn't just score poorly — it falls over, and the mistake feeds into the next measurement. The robot is coupled to a physical world with its own dynamics, no pause button, and unforgiving consequences. That coupling — action changing future observation — is the whole reason control, estimation, and feedback exist.",
      },
    },
    {
      heading: "The body: links and joints",
      paragraphs: [
        "A robot's body is a chain of rigid pieces called **links** (the \"bones\") connected by **joints** (the \"knuckles\"). The links don't bend; all the motion happens at the joints. This is a modeling choice as much as a physical one — treating the forearm as a perfectly rigid rod is a lie, but a *useful* lie that makes the math tractable. We'll keep making useful lies like this throughout the guide, and I'll flag them when they matter.",
        "There are really only two joint types you need, and almost every robot is built from them:",
      ],
    },
    {
      list: [
        "A **revolute joint** rotates, like your elbow or a door hinge. Its state is one angle, θ.",
        "A **prismatic joint** slides in a straight line, like a drawer or a hydraulic ram. Its state is one distance, d.",
      ],
    },
    {
      paragraphs: [
        "**Each joint contributes exactly one number to the robot's state.** A six-joint arm is described, completely, by six numbers. Hold onto that — it's the seed of the single most important idea in this chapter.",
      ],
    },
    {
      diagram: {
        id: "rb-1-2",
        caption:
          "Two joint types, one number each. Revolute contributes an angle; prismatic contributes a distance. Every robot body is a chain of these.",
      },
    },
    {
      heading: "Degrees of freedom: the number that governs everything",
      paragraphs: [
        "Count the joints — really, count the *independent* numbers you need to fully describe a robot's configuration — and you have its **degrees of freedom (DoF)**. It's the single most predictive number about a robot. It tells you how hard the math will be, how many motors you're paying for, and what the robot can and can't reach.",
        "A human arm has 7 DoF from shoulder to wrist. That extra one past six is why you can hold your hand perfectly still and *still* move your elbow around — there's slack in the system. Most industrial arms have 6, the magic number that lets an end-effector reach any **pose** (position *and* orientation) in its workspace. We'll prove why 6 is magic in Chapter 3; for now, just internalize that DoF is the currency of a robot body.",
        "Here's where it gets subtle, and where a lot of beginners trip: the DoF of the *body* and the DoF of the *task* are different things, and their mismatch defines two failure modes you'll meet everywhere.",
      ],
    },
    {
      list: [
        "If the robot has **more** DoF than the task needs, it's **redundant** — like your 7-DoF arm doing a 6-DoF reach. Redundancy is a gift: there are infinitely many joint configurations that put the hand in the same place, so you can pick the one that also dodges an obstacle or keeps the elbow comfortable.",
        "If it has **fewer**, it's **underactuated** — it physically cannot reach some poses, no matter how clever the software. A 2-DoF arm simply can't touch every point at every angle. Underactuation isn't always a bug, though: a walking robot is deliberately underactuated (you don't have a motor for every way your body can tip), which is exactly what makes balance hard and interesting.",
      ],
    },
    {
      diagram: {
        id: "rb-1-3",
        caption:
          "A robot's entire pose is a single point in its configuration space — one axis per degree of freedom. Planning, later, is just finding a path through this space.",
      },
    },
    {
      quiz: {
        question:
          "Your 7-DoF arm is holding a coffee cup upright over a table (a task that pins down 6 numbers: 3 for position, 3 for orientation). How many ways can your arm hold that exact cup pose, and what does the leftover degree of freedom let you do?",
        answer:
          "Infinitely many. The task fixes 6 of your 7 degrees of freedom, leaving one free — you can swing your elbow up, down, and around while the hand and cup stay perfectly still. That's redundancy: a one-dimensional family of joint configurations all achieving the same end-effector pose. It's genuinely useful — the controller can spend that free DoF avoiding an obstacle, staying away from a joint limit, or minimizing effort, all without disturbing the cup. Chapter 3's Jacobian is the tool that lets us exploit exactly this slack.",
      },
    },
    {
      heading: "Actuators: how a robot pushes on the world",
      paragraphs: [
        "A joint that can't move is furniture. **Actuators** are what convert stored energy into motion — the muscles. Three families cover almost everything:",
        "**Electric motors** dominate. They're clean, precise, and easy to control, which is why nearly every modern robot from a hobby arm to a humanoid runs on them. The catch is that a raw motor spins fast with little twisting force (**torque**), so it's almost always paired with a **gearbox** that trades speed for torque. This trade has a hidden cost we'll come back to: gears add friction and *backlash* (a tiny dead zone where the output doesn't move when the input reverses direction), and backlash is a quiet enemy of precision.",
        "**Hydraulics** push fluid to make enormous forces — this is how the early heavy Boston Dynamics machines threw their weight around. Incredible power density, but leaky, loud, and hard to control finely. The field has largely moved to electric as motors got stronger.",
        "**Pneumatics** use compressed air. Cheap and springy, great for simple grippers, but that same springiness makes precise position control a nightmare.",
        "There's a design axis hiding here that matters more than the technology: **stiff vs compliant.** A stiff actuator holds its commanded position hard and resists being pushed — great for precision, dangerous around people, because it'll happily crush what's in its way. A **compliant** actuator (via a physical spring, or via software that senses force and yields) gives when pushed. Compliance is what makes a robot safe to work next to and gentle enough to hold an egg. Modern robots increasingly use **torque-controlled** actuators — you command a *force*, not a position — precisely so they can be soft when they need to be. Keep this stiff/compliant split in mind; it comes roaring back in Chapter 4 when we do force control, and again in Chapter 12 when we talk about robots working around humans.",
      ],
    },
    {
      diagram: {
        id: "rb-1-4",
        caption:
          "A gearbox buys torque with speed. High ratios lift heavy loads slowly and precisely; that same gearing adds friction and backlash — the quiet price of precision.",
      },
    },
    {
      heading: "Sensors: how a robot learns what happened",
      paragraphs: [
        "Actuators are how a robot acts; **sensors** are how it senses. And there's one split that organizes all of them, worth burning into memory because it structures the entire estimation chapter later:",
        "**Proprioceptive** sensors measure the robot's *own* body. **Exteroceptive** sensors measure the *outside world*. Your sense of where your limbs are without looking is proprioception; your eyes are exteroception. Robots have both, and they lie in different ways, which is exactly why we fuse them.",
        "The proprioceptive crew:",
      ],
    },
    {
      list: [
        "**Encoders** count how far each joint has turned — the robot's sense of its own posture. Cheap, precise, and fast. Their weakness is that they only know the *joint*, not the *world*: perfect encoders on slipping wheels will confidently tell you you've driven forward while you spin in place.",
        "The **IMU** (inertial measurement unit) senses acceleration and rotation rate — the robot's inner ear, telling it which way is down and how it's turning. Fantastic for fast balance reactions. Its weakness is **drift**: to get position from an IMU you have to integrate its readings twice, and tiny errors compound into huge ones within seconds. (There's Villain #2 again — error that piles up.)",
        "**Force/torque sensors** feel how hard the robot is pushing or being pushed. This is the sense that lets a robot insert a key into a lock by feel, or stop when it bumps something soft.",
      ],
    },
    {
      paragraphs: ["The exteroceptive crew:"],
    },
    {
      list: [
        "**Cameras** are cheap, dense, and semantically rich — a single image carries enough to recognize a cup, read a label, or spot a person. The price is that a plain camera throws away depth; the 3D world arrives already flattened to 2D, and recovering the third dimension is its own hard problem (and most of Chapter 8).",
        "**Depth cameras** add distance per pixel (via stereo, structured light, or timing a light pulse), handing you a 3D snapshot directly.",
        "**LiDAR** sweeps laser beams to measure precise distances in every direction, building a crisp geometric map of a room. Accurate and fast, historically expensive, and — unlike a camera — it sees *shape* but not *meaning*: it'll tell you there's a flat vertical surface a meter ahead, but not that it's a person.",
      ],
    },
    {
      paragraphs: [
        "Notice the pattern: no single sensor is complete. Encoders know the joints but not slip. IMUs react fast but drift. Cameras see meaning but not depth. LiDAR sees geometry but not meaning. **The art isn't picking the best sensor — it's fusing several so each one's strengths cover another's blindness.** That fusion is Chapter 5, and it's one of the most important ideas in the whole field.",
      ],
    },
    {
      diagram: {
        id: "rb-1-5",
        caption:
          "Every sensor is blind to something. Fusion isn't about the best sensor; it's about arranging them so each one covers another's blindness.",
      },
    },
    {
      quiz: {
        question:
          "A wheeled robot uses only wheel encoders to track its position. It drives across a smooth floor, then hits a patch of spilled oil and its wheels spin. What does it *believe* about its position, and which sensor would catch the mistake?",
        answer:
          "The encoders faithfully count wheel rotations, so the robot believes it kept driving forward the whole time — it has no idea the wheels lost traction. This is the core weakness of proprioception: it measures the *body*, not the *world*, so wheel slip is invisible to it. An exteroceptive sensor that references the outside world — a camera or LiDAR watching the walls not move, or even an IMU noticing there was no actual acceleration — would catch the discrepancy. This is precisely why real robots fuse odometry with world-referenced sensing (Chapter 5): dead-reckoning alone always drifts, and only an outside reference pins it back down.",
      },
    },
    {
      heading: "Embodiments: the shapes robots come in",
      paragraphs: [
        "The same loop and the same parts assemble into wildly different bodies, and the body shape decides which problems are easy and which are brutal. A quick tour, because you'll meet all of these later:",
      ],
    },
    {
      list: [
        "**Robot arms** (manipulators) are the workhorses: a fixed base and a chain of joints ending in a hand. Bolted down, so *where they are* is trivial and *what to do with the hand* is everything. This is the cleanest setting to learn kinematics, which is why Chapter 3 starts here.",
        "**Mobile bases** roll around on wheels. Now *where you are* becomes a live, hard question (localization, Chapter 5), and how you get somewhere is planning (Chapter 6).",
        "**Legged robots** — quadrupeds and bipeds — trade wheels for legs to cross terrain wheels can't. The price is balance: they're underactuated and can fall, which makes them the poster child for reinforcement learning (Chapter 7).",
        "**Humanoids** are the maximalist bet: a human-shaped body with arms *and* legs, so it can use human tools in human spaces. They inherit every hard problem at once, which is exactly why they're the arena where the modern vision-language-action stack (Chapter 9) is being proven.",
        "**Aerial and other** — drones, soft robots, swarms — each bending the same principles to a new medium.",
      ],
    },
    {
      diagram: {
        id: "rb-1-6",
        caption:
          "Bolt the base down and position is free but the hand is everything; let it float and suddenly 'where am I' is the whole game. The body chooses your hard problems.",
      },
    },
    {
      heading: "Holonomic vs nonholonomic: why parallel parking is annoying",
      paragraphs: [
        "One last distinction, and it's the one that most surprises newcomers because it feels like it shouldn't matter — but it decides whether motion is easy or a puzzle.",
        "A robot is **holonomic** if it can move instantaneously in any direction it might want to go. A drone is holonomic-ish: it can slide left, right, up, forward at will. So is a robot on omni-wheels that can scoot sideways.",
        "A car is **nonholonomic**. It has 3 degrees of freedom in *where it can end up* (x, y, and heading) but at any instant it can only do two things: drive forward/back and steer. It **cannot** slide directly sideways. That gap — free to reach any parking spot eventually, but forbidden from moving straight into it — is the entire reason parallel parking requires that awkward back-and-forth shuffle. The constraint isn't on where you can *be*; it's on how you're allowed to *get there*.",
        "This matters enormously for planning. A holonomic robot's planner can draw a straight line to the goal. A nonholonomic one has to plan paths its wheels can actually follow — smooth curves, three-point turns — which makes Chapter 6's planning problem genuinely harder. Whenever a motion problem feels weirdly constrained, this is usually why.",
      ],
    },
    {
      diagram: {
        id: "rb-1-7",
        caption:
          "Same reachable spots, different rules for getting there. The car can end up anywhere but can't move sideways — that single constraint is why parking is a shuffle and why its planner works harder.",
      },
    },
    {
      quiz: {
        question:
          "Both a car and an omni-wheeled robot have 3 degrees of freedom in their final pose (x, y, heading). Why is planning a path for the car strictly harder?",
        answer:
          "Because the car's *velocity* is constrained even though its *position* isn't. At any instant the car can only drive along its heading and steer — it cannot translate sideways — so not every path through (x, y, heading) space is one its wheels can follow. The planner can't just connect start to goal with any curve; it must produce a path obeying the car's turning radius and no-sideways rule (a nonholonomic constraint). The omni robot has no such restriction: any direction is instantly available, so a straight line to the goal always works. Same destinations, but a shrunken set of legal motions — that's what makes nonholonomic planning the harder problem.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        "You now have the vocabulary the rest of the guide is built on. A robot is a **sense–plan–act loop** running on a body of **links and joints**, where the number of **degrees of freedom** governs everything, **actuators** push on the world (stiff or compliant), **sensors** report back (proprioceptive and exteroceptive, each blind to something), and the body's **embodiment** and **holonomy** decide which problems are hard.",
        "From here the guide follows the three beats of the loop. First we master **Act** and the math under it: Chapter 2 gives us the language of space (frames and transforms), Chapter 3 turns joint angles into hand positions (kinematics), Chapter 4 makes the body actually track a command (control). Then **Sense**: Chapter 5 fights drift with fusion and mapping (estimation and SLAM). Then **Plan**: Chapter 6 finds paths through the configuration space you met in Fig 1.3. With the classical stack in hand, we turn to learning — reinforcement learning (7), perception and vision-language models (8), the vision-language-action models running today's robots (9), how they're taught from demonstrations (10), the world models and simulators that train them (11), and finally putting a whole real system together safely (12).",
        "Every one of those is just a smarter way to do one beat of the loop you met in Fig 1.1. Onward.",
      ],
    },
  ],
};

// Chapters 2–12: full prose and figures are transcribed chapter by chapter.
// Until each lands, a dated stub keeps the route, TOC entry, and Prev/Next
// wiring live. These carry the real title, tagline, dates, and future-reference
// note from the handoff; only the body is pending.
const STUBS: Array<{
  slug: string;
  number: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  futureRef: string;
}> = [
  {
    slug: "chapter-2-frames-transforms",
    number: "2",
    title: "The Language of Space: Frames, Rotations & Transforms",
    summary:
      "Coordinate frames, rotation matrices, gimbal lock, quaternions, and the 4×4 transforms that let a robot translate between everything it sees.",
    published: "Jul 13, 2026",
    updated: "Jul 13, 2026",
    futureRef:
      "Timeless math. Revisit quaternions whenever orientation bugs appear.",
  },
  {
    slug: "chapter-3-kinematics",
    number: "3",
    title: "Kinematics: Forward, Inverse & the Jacobian",
    summary:
      "Turning joint angles into hand positions and back again; why inverse kinematics is hard, why 6 DoF is magic, and what the Jacobian buys you.",
    published: "Jul 20, 2026",
    updated: "Jul 20, 2026",
    futureRef:
      "Timeless. The Jacobian reappears in control, RL, and VLA action spaces.",
  },
  {
    slug: "chapter-4-control",
    number: "4",
    title: "Control: From PID to Whole-Body",
    summary:
      "Making the body actually track a command against gravity and friction: P, I, D, feedforward, and force/impedance control.",
    published: "Jul 27, 2026",
    updated: "Jul 27, 2026",
    futureRef:
      "Classical control is stable; learned control (RL) is the moving frontier.",
  },
  {
    slug: "chapter-5-slam",
    number: "5",
    title: "Estimation, Localization & SLAM",
    summary:
      "Fighting drift and lying sensors with probability: Bayes filters, Kalman, particle filters, mapping, and loop closure.",
    published: "Aug 3, 2026",
    updated: "Aug 3, 2026",
    futureRef:
      "Filters are settled; visual/neural SLAM and 3DGS maps are advancing fast.",
  },
  {
    slug: "chapter-6-planning",
    number: "6",
    title: "Motion Planning & Navigation",
    summary:
      "Finding a path through configuration space: Dijkstra, A*, RRT and RRT*, trajectory optimization, and the global/local planner split.",
    published: "Aug 10, 2026",
    updated: "Aug 10, 2026",
    futureRef:
      "Classical planners are stable; learned planning is where to watch.",
  },
  {
    slug: "chapter-7-rl",
    number: "7",
    title: "Reinforcement Learning for Robots",
    summary:
      "Learning the policy when you can't hand-code it: MDPs, value functions, policy gradients, PPO, sim2real, and teacher–student.",
    published: "Aug 17, 2026",
    updated: "Aug 17, 2026",
    futureRef:
      "PPO is the workhorse; revisit sim2real recipes yearly — they churn.",
  },
  {
    slug: "chapter-8-vlms",
    number: "8",
    title: "Perception: Vision & Vision-Language Models",
    summary:
      "The eyes of a modern robot: attention and Q/K/V, ViT, CLIP, SigLIP, and the diffusion/flow-matching machinery that generates behavior.",
    published: "Aug 24, 2026",
    updated: "Aug 24, 2026",
    futureRef:
      "Backbones (ViT/CLIP/SigLIP) are stable anchors; refresh encoders yearly.",
  },
  {
    slug: "chapter-9-vla",
    number: "9",
    title: "Vision-Language-Action Models",
    summary:
      "The models running today's robots, as a lineage where each fixes the last: RT-1/2, OpenVLA, Octo, π0/π0.5, FAST, MolmoAct, GR00T, and Gemini Robotics.",
    published: "Aug 31, 2026",
    updated: "Aug 31, 2026",
    futureRef:
      "FAST-MOVING. Model roster (π, GR00T, Gemini Robotics, MolmoAct) changes every few months — see the dated \"state of the roster\" box and re-check quarterly.",
  },
  {
    slug: "chapter-10-data",
    number: "10",
    title: "Learning from Demonstration & Data Collection",
    summary:
      "Where robot data comes from: behavior cloning, action chunking (ACT), Diffusion Policy, teleop, UMI, and the LeRobot/Rerun tooling.",
    published: "Sep 7, 2026",
    updated: "Sep 7, 2026",
    futureRef:
      "Methods (ACT, Diffusion Policy) stable; tooling (LeRobot, Rerun) versions fast.",
  },
  {
    slug: "chapter-11-world-models",
    number: "11",
    title: "World Models & Simulation",
    summary:
      "Escaping the data bottleneck: learned world models, Dreamer, video-generation models, Gaussian splatting, sim2real, and phys2real.",
    published: "Sep 14, 2026",
    updated: "Sep 14, 2026",
    futureRef:
      "FAST-MOVING. Named systems are bleeding-edge; lean on the taxonomy, re-check the roster.",
  },
  {
    slug: "chapter-12-systems",
    number: "12",
    title: "Manipulation, Humanoids & Deploying Real Systems",
    summary:
      "Assembling the whole stack: grasping, dexterous hands, humanoids, ROS 2, evaluation, and safety — plus where the field goes next.",
    published: "Sep 21, 2026",
    updated: "Sep 21, 2026",
    futureRef:
      "Humanoid hardware roster changes constantly; principles (grasping, safety) don't.",
  },
];

// Real, fully-built chapters. Add each here as it lands; stubs fill the gaps.
const realChapters: Chapter[] = [
  chapter1,
  chapter2,
  chapter3,
  chapter4,
  chapter5,
  chapter6,
];
const built = new Set(realChapters.map((c) => c.number));

const stubChapters: Chapter[] = STUBS.filter((s) => !built.has(s.number)).map(
  (s) => ({
    slug: s.slug,
    number: s.number,
    title: s.title,
    summary: s.summary,
    published: s.published,
    updated: s.updated,
    futureRef: s.futureRef,
    sections: [
      {
        paragraphs: [
          `*${s.summary}*`,
          "**This chapter is being written.** The full prose and its interactive figures are in progress and will appear here shortly. Chapter 1 shows the finished format.",
        ],
      },
    ],
  }),
);

export const roboticsGuideChapters: Chapter[] = [
  ...realChapters,
  ...stubChapters,
].sort((a, b) => Number(a.number) - Number(b.number));
