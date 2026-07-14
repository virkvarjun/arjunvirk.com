import type { Chapter } from "../chapters";

// Chapter 3 of the Robotics Bible. Prose is authored in
// content/robotics-bible/chapter-3-kinematics.md and transcribed here into the
// same Chapter/section schema the ML Bible uses; figures are mounted by id and
// rendered from the diagram registry.

export const chapter3: Chapter = {
  slug: "chapter-3-kinematics",
  number: "3",
  title: "Kinematics: Forward, Inverse & the Jacobian",
  summary:
    "Turning joint angles into hand positions and back again; why inverse kinematics is hard, why 6 DoF is magic, and what the Jacobian buys you.",
  published: "Jul 20, 2026",
  updated: "Jul 20, 2026",
  futureRef:
    "This chapter is timeless. Forward kinematics, DH parameters, IK's ill-posedness, the Jacobian, singularities, and null-space redundancy are settled math that hasn't moved in decades and won't. Denavit & Hartenberg (1955) is still the convention. Come back to the Jacobian specifically whenever a later chapter mentions \"action space,\" \"task-space control,\" or \"velocity command\": it's the same $\\dot{x} = J\\dot{q}$ gearing every time, whether it's a classical controller or a learned policy commanding the hand. And return to Fig 3.5's ellipsoid whenever a robot behaves strangely near the edge of its reach; nine times out of ten you're near a singularity.",
  sections: [
    {
      paragraphs: [
        "*The pure geometry of an arm: the map between the angles at the joints and where the hand ends up, with gravity and forces deliberately switched off until Chapter 4.*",
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        "Here's the deal we're making for this whole chapter: **we pretend forces don't exist.** No gravity pulling the arm down, no motor torque, no momentum, no friction. Just shapes and angles and where things are in space. That sounds like cheating, and in a sense it is, but it's the *useful* kind of cheating, the same rigid-rod lie we told in Chapter 1. Kinematics is the geometry of motion with the physics stripped out, and getting it clean first is what lets Chapter 4 add the forces back in without everything collapsing into a mess.",
        "The one question this chapter answers, in both directions, is: **what's the relationship between the joint angles and the position of the hand?** If I tell you the six numbers at the joints, where's the end-effector? And, the harder one, if I tell you where I want the hand, what six numbers get it there?",
        "I'm assuming you've read Chapter 2, because the entire forward direction is just chaining the homogeneous transforms you built there down the length of the arm. If \"homogeneous transform\" and \"frame attached to a link\" don't ring a bell, go back: this chapter is Chapter 2 applied. I'm also assuming Chapter 1's vocabulary: links, revolute joints, degrees of freedom, and that itch I left you with about why 6 is the magic number. We pay that off here.",
        "The villain of this chapter is **ill-posedness**. Forward kinematics is a dream: one input, one answer, always. Then we flip it around and the dream curdles: the inverse can have no answers, one, two, a handful, or infinitely many, and there's no single formula that hands them to you. Here's the road. First, forward kinematics: chain the transforms, done. Then DH parameters, the bookkeeping that lets anyone describe any arm. Then the workspace, what's even reachable. Then inverse kinematics, the hard direction, where all the trouble lives. We finally prove why 6 DoF is magic. Then the Jacobian, the gearing between joint motion and hand motion, which quietly solves the inverse problem *and* sets up all of control. Then singularities, where that gearing breaks. And we close on redundancy: spending extra joints on a second goal, the coffee-cup slack from Chapter 1 made concrete.",
        "Let's go.",
      ],
    },
    {
      heading: "Forward kinematics: the easy direction",
      paragraphs: [
        "Start with the question that's almost too easy: **given the angle at every joint, where is the hand?**",
        "The intuition is a chain of instructions you already know how to follow. Stand at the base. Rotate by the first joint angle, then walk out along the first link. Rotate by the second joint angle, walk out along the second link. Keep going until you run out of joints. Wherever you're standing when you finish, that's the end-effector. Your own arm does this without thinking: shoulder angle, then upper arm, then elbow angle, then forearm, and your fingertip lands somewhere definite. It *has* to land somewhere definite, because each instruction has exactly one outcome.",
        "That \"walk out and rotate\" is precisely a homogeneous transform from Chapter 2: a rotation glued to a translation, packed into one 4×4 matrix that moves you from the frame at one joint to the frame at the next. Call the transform across joint *i* the matrix ${}^{i-1}T_i$: it takes coordinates in link *i*'s frame and expresses them in link *(i−1)*'s frame. **Forward kinematics is nothing but multiplying these together, base to tip:**",
      ],
    },
    {
      equations: [String.raw`{}^{0}T_n = {}^{0}T_1 \, {}^{1}T_2 \, {}^{2}T_3 \cdots {}^{n-1}T_n`],
    },
    {
      paragraphs: [
        "Reading the symbols: ${}^{0}T_n$ is the full transform from the base frame (frame 0) to the end-effector frame (frame *n*). It packs both the hand's **position** (where the tip is) and its **orientation** (which way the hand is pointing) into one matrix. Each ${}^{i-1}T_i$ depends on that joint's variable: the angle θᵢ for a revolute joint, the extension dᵢ for a prismatic one. Feed in the joint values, do the matrix multiplies, read the answer off the last column. That's the entire algorithm. There's no cleverness and no ambiguity: **given the joints, the hand's pose is unique.** One input, one output, every time. Hold onto how good this feels, because it does not last.",
        "Let's not hide behind matrices. Let's grind one out by hand for the workhorse of this whole chapter, the **2-link planar arm**. Two revolute joints, two links of length L₁ and L₂, everything flat on a tabletop so we only care about (x, y). The base joint sits at the origin and turns by θ₁, measured from the x-axis. At the end of the first link there's a second joint that turns by θ₂, *measured relative to the first link*.",
        "The first link's tip is easy: go out a distance L₁ at angle θ₁:",
      ],
    },
    {
      equations: [String.raw`x_1 = L_1 \cos\theta_1, \qquad y_1 = L_1 \sin\theta_1`],
    },
    {
      paragraphs: [
        "Now the crucial move. The second link points in the direction (θ₁ + θ₂), because θ₂ is measured relative to the already-rotated first link, so the angles *add*. So from the elbow we go out another L₂ at total angle (θ₁ + θ₂), and the hand lands at:",
      ],
    },
    {
      equations: [
        String.raw`x = L_1 \cos\theta_1 + L_2 \cos(\theta_1 + \theta_2)`,
        String.raw`y = L_1 \sin\theta_1 + L_2 \sin(\theta_1 + \theta_2)`,
      ],
    },
    {
      paragraphs: [
        "That's the classic 2-link FK equation, and it's worth memorizing because you'll see it a hundred times. Every term is a link, laid nose to tail, each pointing in the *accumulated* angle up to that point. Chaining transforms and adding angles are the same operation seen two ways.",
        "Let's put numbers on it. Say L₁ = 3, L₂ = 2, and we command θ₁ = 30°, θ₂ = 45°. Then:",
      ],
    },
    {
      list: [
        "cos 30° ≈ 0.866, sin 30° = 0.5",
        "θ₁ + θ₂ = 75°, cos 75° ≈ 0.259, sin 75° ≈ 0.966",
        "x = 3(0.866) + 2(0.259) = 2.598 + 0.518 = **3.12**",
        "y = 3(0.5) + 2(0.966) = 1.5 + 1.932 = **3.43**",
      ],
    },
    {
      paragraphs: [
        "The hand is at (3.12, 3.43). No guessing, no iteration, no second answer lurking. Change either angle and the point moves smoothly and predictably. This is why Chapter 1 said the arm is the cleanest place to learn: bolt the base down, and *where the hand is* reduces to arithmetic.",
        "And nothing about this is stuck in flatland. Add a base joint that yaws the whole plane about the vertical and the same chain runs in 3D: the figure below composes three joint rotations (as quaternions, Chapter 2's tool of choice) and the hand still lands in exactly one place. Grab the scene and orbit it; the readout is the chain being multiplied live.",
      ],
    },
    {
      diagram: {
        id: "rb-3-1",
        caption:
          "Forward kinematics is chaining links nose to tail: each joint hands its rotation down the chain, and however you set the angles the hand lands in exactly one place.",
      },
    },
    {
      quiz: {
        question:
          "You command a 3-joint arm to a specific set of angles, run the forward-kinematics multiply, and get a hand pose. A friend insists there might be *another* hand pose consistent with those same angles. Are they right? Why does this get so much worse when you run the problem backwards?",
        answer:
          "Your friend is wrong. Forward kinematics is a function: plug in the joint angles and the matrix multiply produces exactly one transform, hence exactly one hand pose. There is no ambiguity in this direction: a rigid chain with pinned-down joint values can only end up in one place. The trouble is that a function can be many-to-one: *different* joint sets can land the hand in the *same* place (think elbow-up versus elbow-down reaching the same target). Going forward, that's harmless: you picked the angles, you get your one answer. Going backward, from a desired hand pose to the angles, you're inverting a many-to-one map, so a single target can correspond to several joint solutions, or none at all. That inversion is inverse kinematics, and it's where every hard problem in this chapter lives.",
      },
    },
    {
      heading: "DH parameters: how to describe any arm without arguing about it",
      paragraphs: [
        "Before we go further we hit a boring-sounding problem that's secretly important: **how do you even write down an arm so someone else can reproduce it?** I've been sloppy, saying \"link of length L,\" \"joint turns by θ,\" and for a flat 2-link toy that's fine. But a real arm has joints whose axes point in different directions, links that are offset and twisted relative to each other, wrists where three axes stab through a single point. If you and I each attach coordinate frames to the links however we feel like it, our transforms won't match, our code won't be portable, and we'll spend an afternoon arguing about whose z-axis points where.",
        "The fix is a **convention**: an agreed-upon recipe for placing the frames so that describing any joint takes exactly four numbers, no more, no fewer, with no freedom to be sloppy. That recipe is the **Denavit–Hartenberg parameters** (Denavit & Hartenberg, 1955; yes, this bookkeeping is over seventy years old and still runs in every robotics toolbox). Funny name, huge payoff. The point isn't the specific table; the point is that a convention *exists*, so any arm on earth can be handed to any software as a clean list of numbers.",
        "The four numbers per joint, in plain English:",
      ],
    },
    {
      list: [
        "**Link length (a)**: how far apart consecutive joint axes are, measured along their common perpendicular. The \"how long is this bone.\"",
        "**Link twist (α)**: the angle between consecutive joint axes. This is what lets an arm bend out of a single plane; α = 90° is how you turn a flat arm into a 3D one.",
        "**Link offset (d)**: how far along the joint axis you slide to line things up. For a prismatic joint, *this* is the variable that moves.",
        "**Joint angle (θ)**: the rotation about the joint axis. For a revolute joint, *this* is the variable that moves.",
      ],
    },
    {
      paragraphs: [
        "Notice the elegance: for any given joint, three of the four numbers are fixed by the arm's construction (they're baked into the metal), and exactly *one* is the free variable that the motor controls: θ for a revolute joint, d for a prismatic one. That's Chapter 1's \"each joint contributes exactly one number\" showing up again, now with a rigorous home. Each row of a DH table becomes one homogeneous transform ${}^{i-1}T_i$, you chain them exactly as we did above, and forward kinematics falls out mechanically for an arm of any shape.",
        "You do not need to memorize the table or the exact frame-placement rules to use this guide. Most engineers look them up every time, and I won't pretend otherwise. What you need to carry forward is the *idea*: **four numbers per joint, three fixed and one free, is a complete and unambiguous description of a kinematic chain.** That's the whole reason a robot you've never seen can be simulated by software nobody wrote specifically for it.",
      ],
    },
    {
      diagram: {
        id: "rb-3-2",
        caption:
          "A convention buys portability: four numbers per joint — three fixed by the metal, one free to move — describe any arm unambiguously, so anyone's software can chain the transforms.",
      },
    },
    {
      quiz: {
        question:
          "Of a revolute joint's four DH parameters (a, α, d, θ), which one is the *variable* the motor changes as the robot moves, and which three are constants? What flips if the joint is prismatic instead?",
        answer:
          "For a revolute joint, **θ (the joint angle)** is the variable, literally the rotation the motor commands, while a, α, and d are constants baked into the physical link. For a prismatic joint it flips: **d (the offset)** becomes the variable, since the joint slides along its axis, and now θ is one of the fixed constants. That's the clean payoff of the convention: every joint contributes exactly one moving number (Chapter 1's DoF-per-joint rule), and the DH table makes it explicit which number that is. Everything else in the row is geometry you measured once and never touch again, which is exactly why the description is portable.",
      },
    },
    {
      heading: "The workspace: what the arm can actually reach",
      paragraphs: [
        "Before we try to invert the problem, we should ask a blunter question: **which poses are even possible?** Sweep every joint through its full range, record every place the hand can land, and the set of all those places is the arm's **workspace**. It's the arm's territory; everything outside it is simply unreachable, no matter how clever your software gets.",
        "For our 2-link arm the workspace has a shape you can reason out by hand. Fully stretched, the hand reaches a distance L₁ + L₂ from the base. Folded back on itself, the shortest it can reach is |L₁ − L₂|. In between, it can hit anything. So the reachable set is an **annulus** (a ring) with outer radius L₁ + L₂ and inner radius |L₁ − L₂|. With our L₁ = 3, L₂ = 2 arm, that's a ring from radius 1 out to radius 5. Anything closer than 1 or farther than 5 is off the table, literally.",
        "But \"can the hand get there at all\" isn't the only question, and here's a distinction that trips people up. There are two workspaces:",
      ],
    },
    {
      list: [
        "The **reachable workspace** is every point the hand can touch *in some orientation*. Just get the tip there, don't care which way the hand faces.",
        "The **dexterous workspace** is the smaller set of points the hand can reach in *every* orientation: arrive there facing any direction you like.",
      ],
    },
    {
      paragraphs: [
        "The dexterous workspace is always a subset of the reachable one, and often much smaller. Out at the very edge of reach, the arm is stretched nearly straight and has no freedom left to reorient the hand. It can *touch* the point but only one way, so that point is reachable but not dexterous. This isn't academic: when you're choosing where to mount a robot over a workbench, you place the actual work inside the dexterous workspace, because that's where the arm can approach a part from whatever angle the task demands. The edges are for reaching, not for working.",
        "(To make \"orientation\" visible on our 2-link toy, Fig 3.3 bolts a short tool onto the wrist. The fan at the probe shows every approach direction the arm can actually deliver to that point: a full green circle deep inside the workspace, a thinning sliver near the edge, nothing outside. Same idea as a real arm's wrist, one link smaller.)",
      ],
    },
    {
      diagram: {
        id: "rb-3-3",
        caption:
          "The workspace is the arm's territory: a big ring the tool can touch somehow, and a smaller core it can approach from every direction — the edges reach but can't reorient, so put the real work in the dexterous core.",
      },
    },
    {
      heading: "Inverse kinematics: the hard direction, where it all breaks",
      paragraphs: [
        "Now we flip the arrow, and the dream ends. **Inverse kinematics (IK) asks: given a desired hand pose, what joint angles get you there?** This is the question you actually care about in practice (you know where you want the gripper, you need the motor commands) and it's genuinely hard in a way forward kinematics never was.",
        "Here's why the difficulty is fundamental, not just annoying. Forward kinematics is a clean function: angles in, one pose out. Inverting it means asking \"which inputs produce *this* output,\" and that inverse can misbehave in four distinct ways, all of which you will hit:",
      ],
    },
    {
      list: [
        "**Zero solutions.** The target is outside the workspace. Ask the L₁ = 3, L₂ = 2 arm to touch a point 6 units away and there is simply no answer: you can't stretch past 5. The equations have no real solution and any solver has to detect this and give up gracefully rather than spit out nonsense.",
        "**Exactly one solution.** Right at the edge of reach, fully outstretched, there's a single way to get there. (This \"only one way\" is a warning sign: it's a singularity, which we'll get to, and it's where IK gets numerically nasty.)",
        "**Multiple solutions.** The common case. For most reachable targets our 2-link arm has *two* answers: **elbow-up** and **elbow-down**. Same hand position, two genuinely different arm configurations, and the software has to *choose*, usually the one that dodges an obstacle or moves least from where the arm already is.",
        "**Infinitely many solutions.** When the arm has more DoF than the task needs, the **redundant** case from Chapter 1, a whole continuous family of joint configurations hits the same target. The 7-DoF arm holding the coffee cup: infinitely many elbow positions, one cup pose. We come back to this at the end.",
      ],
    },
    {
      paragraphs: [
        "Zero, one, several, or infinite, from a single well-defined question. That's what \"ill-posed\" means, and it's the villain of the chapter made concrete. Forward kinematics has none of these pathologies; every one of them is born the instant you turn the problem around.",
        "For simple arms you can sometimes solve IK **analytically**, an exact closed-form formula, and the 2-link arm is the perfect example because the two-solution structure falls right out of high-school trigonometry. We want the joint angles (θ₁, θ₂) that put the hand at a target (x, y).",
        "Start with the elbow angle θ₂, and use the **law of cosines**. The straight-line distance from base to target is $r = \\sqrt{x^2 + y^2}$. The two links plus that straight line form a triangle with sides L₁, L₂, and r. The law of cosines relates the interior angle at the elbow to those three sides:",
      ],
    },
    {
      equations: [String.raw`\cos\theta_2 = \frac{x^2 + y^2 - L_1^2 - L_2^2}{2 L_1 L_2}`],
    },
    {
      paragraphs: [
        "Reading the symbols: the triangle's interior angle at the elbow is actually 180° − θ₂ (θ₂ is measured from the *extension* of link 1), and that sign flip is already folded into the formula. The numerator compares the squared distance to the target against the squared link lengths: push the target out to full stretch and cos θ₂ → 1, so θ₂ → 0 (elbow straight); pull it all the way in and cos θ₂ → −1 (elbow fully folded). Now the crucial fact: to recover θ₂ you take an inverse cosine, **and cosine is even**: cos(θ₂) and cos(−θ₂) are identical. So both +θ₂ and −θ₂ satisfy the equation. *That is the elbow-up and elbow-down solution, dropping straight out of the algebra.* The two ways to fold a triangle onto the same base, the elbow poking up or poking down, are the ± of one arccosine. This is the whole \"multiple solutions\" story in one sign.",
        "With θ₂ in hand, θ₁ comes from lining up the first link so the chain lands on target:",
      ],
    },
    {
      equations: [
        String.raw`\theta_1 = \operatorname{atan2}(y, x) - \operatorname{atan2}\!\big(L_2 \sin\theta_2,\; L_1 + L_2 \cos\theta_2\big)`,
      ],
    },
    {
      paragraphs: [
        "The first term, atan2(y, x), points the whole arm toward the target; the second term backs off by however much the bent elbow throws the hand sideways. (We use atan2, the two-argument arctangent, because it gets the quadrant right; plain arctan can't tell (1,1) from (−1,−1).) Each choice of ±θ₂ gives its own θ₁, so you get two complete, valid configurations.",
        "Numbers. Same arm, L₁ = 3, L₂ = 2, and let's aim the hand at the (3.12, 3.43) we computed forward earlier. We should recover θ₁ = 30°, θ₂ = 45°, plus its elbow-flipped twin.",
      ],
    },
    {
      list: [
        "r² = 3.12² + 3.43² = 9.73 + 11.76 = 21.49",
        "cos θ₂ = (21.49 − 9 − 4) / (2·3·2) = 8.49 / 12 = 0.707 → θ₂ = ±45°. The +45° branch is exactly our elbow-down original; −45° is elbow-up.",
        "Take θ₂ = +45°: L₂ sin θ₂ = 2(0.707) = 1.414, and L₁ + L₂ cos θ₂ = 3 + 2(0.707) = 4.414.",
        "θ₁ = atan2(3.43, 3.12) − atan2(1.414, 4.414) = 47.7° − 17.7° = **30°**. ✓",
      ],
    },
    {
      paragraphs: [
        "We recovered the original angles, and the −45° branch would give a second, equally valid arm pose reaching the identical point. Two answers, both correct: you have to pick.",
        "Analytic IK is lovely when you can get it, but for a general 6- or 7-DoF arm the equations are a nightmare, and for many arms no closed form exists at all. So we fall back on **numeric IK**: don't solve it, *chase* it. Start from the arm's current angles, run forward kinematics to see where the hand actually is, measure the error to the target, and nudge the joints in the direction that shrinks the error. Repeat until you're close enough. It's the sense–plan–act loop from Chapter 1 wearing a math costume (guess, measure the gap, correct, repeat) and the tool that tells you *which way* to nudge the joints is the Jacobian. Which is exactly where we're headed. But first we owe you a promise from Chapter 1.",
      ],
    },
    {
      diagram: {
        id: "rb-3-4",
        caption:
          "Invert the map and it turns ill-posed: most targets give two arms (elbow-up and elbow-down), the reach circle gives exactly one, and beyond it there are none — the arm stretches red toward a point no joint angles can deliver.",
      },
    },
    {
      quiz: {
        question:
          "You drag the IK target of the 2-link arm slowly outward from the base toward the edge of reach. Trace what happens to the *number* of solutions along the way, and explain why the count changes at the boundary.",
        answer:
          "Near the base (but outside the tiny inner hole) the target is comfortably reachable and there are **two** solutions, elbow-up and elbow-down, the ±θ₂ from the arccosine. As you drag outward they stay at two, but the two elbow positions swing closer together as the arm straightens. Right at the outer ring, radius L₁ + L₂, the two solutions **merge into one**: the only way to reach maximum extension is a single fully-straight configuration, so +θ₂ and −θ₂ both collapse to zero and the two branches become the same arm. Push one pixel past the ring and there are **zero** solutions: the equation's cosine argument exceeds 1, the arccosine has no real answer, and the target is simply unreachable. The count going 2 → 1 → 0 as you cross the boundary is the whole ill-posedness story in one drag, and the \"1\" point is a singularity, which is why IK gets numerically twitchy right at the edge.",
      },
    },
    {
      heading: "Why 6 is the magic number",
      paragraphs: [
        "Chapter 1 kept promising to explain why industrial arms have six joints, and why six is \"magic.\" Time to pay up, and it's satisfyingly simple once you count carefully.",
        "**How many numbers does it take to fully specify where a rigid hand is in space?** Not just its position, but its *pose*, position and orientation together, which is everything you need to grab something correctly. Count them:",
      ],
    },
    {
      list: [
        "**3 for position.** Where the hand is: x, y, z. Three numbers.",
        "**3 for orientation.** Which way the hand is facing: roll, pitch, yaw (or any of the equivalents from Chapter 2: three numbers to pin down an orientation in 3D, no getting around it).",
      ],
    },
    {
      paragraphs: [
        "**3 + 3 = 6.** A full pose in 3D space is exactly six independent numbers. There's no fourth position and no fourth orientation to specify; six is the complete count. (Side note: this is why a pose is sometimes called a \"6-DoF pose\"; it's the same six.)",
        "Now the arm side. Each joint contributes exactly one number to the arm's configuration, Chapter 1's rule, made rigorous by DH above. So if you want to independently control all six numbers of the hand's pose, you need **at least six independent joints**. With six, the arm can generally place its hand at *any position AND any orientation* within its workspace, reaching any point *and* facing any direction there. That's the magic: **six joints, six pose numbers, a matched set.** Fewer than six and you're underactuated: some poses are flat-out impossible, like a 5-DoF arm that can reach a spot but can't tilt the gripper the way you need. More than six and you're redundant, with extra slack to spend, which we'll cash in shortly.",
        "I said \"generally,\" and the hedge matters. Six joints *matched* to six pose numbers works only when the six are genuinely independent, when the arm isn't in a **singularity**, a configuration where two joints have momentarily lined up to do the same thing and you've secretly lost one. That's the next villain, and it's the fine print on \"magic.\" But the headline is clean and it's the one to remember: a full pose is six numbers, so six joints is the minimum to hit any pose. That's why the classic industrial arm has six, no coincidence at all.",
      ],
    },
    {
      quiz: {
        question:
          "A pick-and-place robot only ever needs to move its gripper to an (x, y, z) position and point it straight down, and the yaw around the vertical doesn't matter for the round parts it handles. How many degrees of freedom does that task actually require, and what does that let the designer do?",
        answer:
          "The task needs **4**: three for position (x, y, z) and one for the single orientation that matters (pitch to point down), while yaw is irrelevant for round parts and roll is fixed by pointing down. So the task lives in a 4-dimensional pose space, not the full 6. That means a designer can get away with a cheaper 4-DoF arm (the famous SCARA configuration is built for exactly this) and it'll hit every pose the task demands without wasted joints. It's the flip side of the magic number: match your joints to the *task's* pose dimension, not to the full six, and you don't pay for freedom you'll never use. Under-provisioning is only \"underactuated\" relative to a task; for a task that genuinely needs four, four DoF is exactly right.",
      },
    },
    {
      heading: "The Jacobian: the gearing between joints and hand",
      paragraphs: [
        "We keep needing the same thing: forward kinematics tells us where the hand *is* for given angles, but numeric IK, velocity control, and everything in Chapter 4 need to know how the hand *moves* when the joints move. Not position, but the *relationship between the speeds*. That relationship has a name and it's the most important matrix in robotics: the **Jacobian**.",
        "The intuition is gearing. Turn joint 1 a little; the hand sweeps some amount. Turn joint 2 the same little bit; the hand sweeps a *different* amount, in a *different* direction. The Jacobian is the machine that takes \"how fast each joint is turning\" and tells you \"how fast, and in which direction, the hand is moving.\" Like the gear ratio of Chapter 1's gearbox, but a whole matrix of them at once, one ratio for every joint's effect on every direction of hand motion, and, crucially, **the ratios change depending on where the arm is.** A joint that swings the hand a long way when the arm is outstretched barely nudges it when the arm is folded up, because the hand is closer to that joint's pivot. Same motor motion, wildly different hand motion, depending on configuration.",
        "Written down, it's disarmingly clean:",
      ],
    },
    {
      equations: [String.raw`\dot{x} = J(q)\, \dot{q}`],
    },
    {
      paragraphs: [
        "Reading the symbols: $\\dot{q}$ (q-dot) is the vector of **joint velocities**, how fast each joint is turning right now. $\\dot{x}$ (x-dot) is the resulting **end-effector velocity**, how fast the hand is moving and in what direction (and, in full 3D, how it's rotating). $J(q)$ is the **Jacobian matrix**, and that \"(q)\" is the whole point: it *depends on the current configuration q*. Move the arm and the Jacobian changes. Each entry of J is a partial derivative, literally \"how much does hand-coordinate *i* change when joint *j* moves a hair,\" but you don't need the calculus to use it. Read the equation as: **joint velocities in, hand velocity out, through a gearing that depends on the pose.**",
        "This one little equation is a workhorse, and it pays off in two directions:",
        "**Velocity control.** You want the hand to move in a straight line at 10 cm/s toward a bolt. That's a desired $\\dot{x}$. Solve $\\dot{x} = J\\dot{q}$ for the joint velocities $\\dot{q}$ (invert the Jacobian) and you get the motor speeds that produce exactly that hand motion. This is how you command a robot in *task space* (\"move the hand there\") instead of fussing over each joint.",
        "**Inverse kinematics, finally solved for real arms.** Remember numeric IK: guess, measure the error, nudge the joints toward the target. The Jacobian *is* the nudge direction. Compute the error $\\Delta x$ = (target − current hand position), then take $\\Delta q = J^{-1} \\Delta x$ (or, when J isn't square or nicely invertible, the **pseudo-inverse** $J^{+}$, or even just the transpose $J^{T}$ for a cheap-and-cheerful version). Apply that small joint change, run FK again, and you've stepped the hand closer to the target. Iterate and it converges. That's it: that's how a 7-DoF arm solves IK when no formula exists. It descends the error using the Jacobian as its map — the exact same close-a-fraction-of-the-gap feedback loop from Chapter 1, just running in joint space. The Jacobian turns the ill-posed inverse problem into a solvable one-step-at-a-time chase.",
        "Let's ground it on the 2-link arm. The Jacobian is the 2×2 matrix of how (x, y) change with (θ₁, θ₂):",
      ],
    },
    {
      equations: [
        String.raw`J = \begin{bmatrix} -L_1 s_1 - L_2 s_{12} & -L_2 s_{12} \\ \; L_1 c_1 + L_2 c_{12} & \; L_2 c_{12} \end{bmatrix}`,
      ],
    },
    {
      paragraphs: [
        "where I've written s₁ = sin θ₁, c₁ = cos θ₁, and s₁₂ = sin(θ₁+θ₂), c₁₂ = cos(θ₁+θ₂) to keep it readable. Each column is one joint's effect on the hand: the first column is how the hand moves when *only* θ₁ turns, the second when *only* θ₂ turns. Notice those are exactly the derivatives of the FK equations from the start of the chapter: the Jacobian is just FK differentiated. With L₁ = 3, L₂ = 2 at θ₁ = 30°, θ₂ = 45° (so θ₁+θ₂ = 75°, s₁₂ = 0.966, c₁₂ = 0.259):",
      ],
    },
    {
      equations: [
        String.raw`J = \begin{bmatrix} -3(0.5) - 2(0.966) & -2(0.966) \\ \; 3(0.866) + 2(0.259) & \; 2(0.259) \end{bmatrix} = \begin{bmatrix} -3.43 & -1.93 \\ \; 3.12 & \; 0.52 \end{bmatrix}`,
      ],
    },
    {
      paragraphs: [
        "Read a column: turning θ₂ at unit speed moves the hand at velocity (−1.93, 0.52). Turn *both* joints and you add the columns, scaled by their speeds, and the matrix does the bookkeeping. That first column, (−3.43, 3.12), is exactly perpendicular to the line from the base to the hand at (3.12, 3.43): turning the base joint whips the whole arm around, so the hand moves *sideways* to its reach, as it must. The math and the physical picture agree.",
        "One more picture before the figure, because it's the best one in robotics. Feed J every joint-velocity combination of unit size — the unit sphere in joint space — and collect the outputs. They sweep out an ellipsoid in hand-velocity space: the **manipulability ellipsoid**. Its long axis is the direction the hand moves easily (lots of hand speed per joint speed); its short axis is the direction the hand struggles. It's the Jacobian's gearing drawn as a shape you can look at, and its shape *changes as the arm moves*, because J does. Keep your eye on the shortest axis in Fig 3.5: when it shrinks toward zero, a whole direction of motion is about to vanish.",
      ],
    },
    {
      diagram: {
        id: "rb-3-5",
        caption:
          "The Jacobian is configuration-dependent gearing: a fat, round ellipsoid means the hand moves freely in every direction, and as the arm straightens the ellipsoid flattens to a pancake — a whole degree of freedom draining away in front of you.",
      },
    },
    {
      quiz: {
        question:
          "You solve $\\dot{x} = J\\dot{q}$ to make a hand move at a steady 10 cm/s in a straight line across the workspace. Why can't you compute the joint velocities once and hold them fixed for the whole trajectory?",
        answer:
          "Because J depends on the configuration q, and q is changing every instant as the arm moves. The Jacobian you'd invert at the start describes the gearing *only at the starting pose*; a step later the arm is elsewhere, the ratios between joint speed and hand speed have shifted, and the old joint velocities would send the hand off in the wrong direction or at the wrong speed. So you have to recompute J and re-solve $\\dot{q} = J^{-1}\\dot{x}$ continuously, thousands of times a second, re-linearizing around the current pose each tick. It's the same reason feedback exists in Chapter 1: the world (here, the arm's own geometry) won't hold still, so you can't precompute and coast; you have to keep re-measuring and re-solving. That constant recomputation is exactly what a real robot controller does.",
      },
    },
    {
      heading: "Singularities: where the gearing breaks",
      paragraphs: [
        "That collapsing ellipsoid in Fig 3.5 was a preview of the nastiest thing in this chapter, the fine print on the magic number: **singularities**. A singularity is a configuration where the Jacobian **loses rank**, where two or more joints momentarily gang up to do the same thing, so the arm secretly has fewer effective degrees of freedom than it has joints. The hand loses the ability to move in some direction *at all*, no matter how you spin the motors.",
        "The cleanest example is our 2-link arm stretched dead straight (θ₂ = 0). Both links point the same way. Turning either joint now swings the hand along the same arc, perpendicular to the arm, so *both joints do the same thing* and there's no combination of them that moves the hand *outward*, along the line of the arm. The arm can go sideways but not out. In Jacobian terms, the two columns have become parallel, the matrix is rank-deficient, and its determinant is zero. That flat, collapsed ellipsoid is the picture of it: a whole direction of hand motion has vanished. This is exactly the \"exactly one IK solution\" point from before: full stretch is a singularity, which is *why* the solutions merged there.",
        "Now the part that actually bites you in code. Numeric IK and velocity control both need to *invert* the Jacobian: $\\dot{q} = J^{-1}\\dot{x}$. Near a singularity, J is nearly rank-deficient, which means its inverse **blows up**: to make the hand move even a hair in the direction that's going scarce, the formula demands enormous joint velocities. Ask the outstretched arm to move its hand outward by a centimeter and the math politely replies \"sure, spin your joints at ten thousand degrees per second.\" That's not a metaphor; it's a real failure mode where a robot near a singularity suddenly whips its joints at dangerous speed because the pseudo-inverse divided by something near zero. **Singularity = rank-deficient Jacobian = a lost degree of freedom = exploding inverse.** Burn that chain into memory; it's the same phenomenon described four ways.",
        "The engineering response is to *see it coming*. The **manipulability ellipsoid** (the shape you watched collapse in Fig 3.5) is the visual early-warning system: fat and round means the hand moves freely in every direction, comfortably far from trouble; long and thin means you're near a singularity and one direction is going scarce; collapsed to a pancake means you've hit it. Its volume is a single number, **manipulability**, that controllers watch and steer away from, deliberately choosing configurations well inside the workspace where the ellipsoid is round. This is also, circling back, exactly why the dexterous workspace is smaller than the reachable one: the edges of reach *are* singular, so the arm loses dexterity precisely where the ellipsoid flattens. Every thread in this chapter meets at the singularity.",
      ],
    },
    {
      diagram: {
        id: "rb-3-6",
        caption:
          "As the arm straightens, manipulability drains to zero and the joint speed that IK demands explodes off the chart: the same event seen three ways — a flattening ellipsoid, a vanishing determinant, and an inverse blowing up.",
      },
    },
    {
      heading: "Redundancy: spending extra joints on a second goal",
      paragraphs: [
        "We close where Chapter 1 started teasing: **what do you do with a seventh joint?** If six is the minimum to hit any pose, a 7-DoF arm has one to spare, and that spare is a gift, but only if you know how to spend it. This is **redundancy resolution**, and it's the payoff of the whole chapter.",
        "Recall the setup: your 7-DoF arm holds a coffee cup at a fixed pose over the table. The task pins down six numbers (3 position + 3 orientation of the cup), the arm has seven, so **one degree of freedom is left completely free.** You can swing your elbow up, down, and around in a full arc while the cup stays *perfectly still*. There's a whole one-dimensional family of joint configurations, infinitely many, all holding the identical cup pose. That's the \"infinitely many IK solutions\" case from earlier, and now we're going to *use* it.",
        "The Jacobian hands us the tool. Recall $\\dot{x} = J\\dot{q}$: joint velocities produce hand motion. Now ask the reverse question: **which joint motions produce *zero* hand motion?** Those are the joint velocities $\\dot{q}$ for which $J\\dot{q} = 0$: the arm's joints are moving, but the hand isn't. This set has a name from linear algebra, the **null space** of the Jacobian, and for our redundant arm it's exactly that elbow-swinging freedom made precise. Any joint velocity in the null space reshuffles the arm's internal posture while leaving the end-effector *frozen*.",
        "You can even count it. For the 7-DoF arm, J is a 6×7 matrix: six rows (the task's pose numbers), seven columns (the joints). Seven unknowns constrained by six equations always leaves at least a one-dimensional family of solutions to $J\\dot{q} = 0$ — one spare dimension of motion the task cannot see. That one dimension *is* the elbow arc in Fig 3.7.",
        "So here's the move that runs on real robots every day. Split the arm's motion into two pieces that don't fight each other:",
      ],
    },
    {
      list: [
        "Use the ordinary Jacobian-inverse to make the hand track its task: hold the cup, follow the trajectory, whatever the six task numbers demand.",
        "**Project a *second* goal into the null space** so it costs the hand nothing. Want to keep the elbow away from an obstacle? Away from a joint limit? At a comfortable, low-effort posture? Compute the joint motion that improves *that* secondary goal, then filter it through the null-space projection $(I - J^{+}J)$ so only the component that leaves the hand undisturbed survives. The elbow drifts toward safety; the cup doesn't spill.",
      ],
    },
    {
      paragraphs: [
        "That projection matrix, $(I - J^{+}J)$, is worth reading in words: it takes any desired joint motion and *strips out* the part that would move the hand, keeping only the part that lives in the null space. It's a bouncer that only lets through motions the task won't notice. The arm gets to pursue two objectives at once, the task with its main joints, a secondary preference with its slack, and the secondary one is *free* because it hides in the Jacobian's blind spot.",
        "This is why redundant arms, and, not coincidentally, human arms with their 7 DoF, feel so capable. They can hold a precise pose *and* dodge, comply, or relax at the same time. It's Chapter 1's promise delivered in full: the leftover degree of freedom isn't waste, it's the budget you spend on everything the task didn't ask for but you still want. The Jacobian, one last time, is what lets you spend it without disturbing the job.",
      ],
    },
    {
      diagram: {
        id: "rb-3-7",
        caption:
          "Redundancy is a second budget: the null space of the Jacobian is the joint motion that moves nothing at the hand, so the elbow can dodge an obstacle while the fingertip stays frozen — the coffee-cup slack from Chapter 1, finally spent.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        "We made a clean deal at the top, ignore forces, keep only geometry, and it bought us the entire relationship between joint angles and hand pose, in both directions. **Forward kinematics** is the easy half: chain the Chapter 2 transforms base to tip, and the hand's pose falls out, unique and unambiguous, every time. **DH parameters** are how you write any arm down so anyone's software can do that chaining: four numbers per joint, three fixed, one free. The **workspace** is the arm's territory, a ring you can reach with a smaller dexterous core you can work in.",
        "Then we flipped the arrow and met the villain. **Inverse kinematics** is ill-posed, with zero, one, several, or infinitely many solutions from one honest question, solvable in closed form for simple arms (elbow-up and elbow-down, straight out of the law of cosines' ±) and only numerically for the rest. That numeric solver runs on the **Jacobian**, the configuration-dependent gearing $\\dot{x} = J\\dot{q}$ between joint speeds and hand speed, which also proved why **six DoF** is magic (six pose numbers, six joints) and, at its rank-deficient configurations, gave us **singularities**: lost degrees of freedom where the inverse explodes and the manipulability ellipsoid flattens to a pancake. And the Jacobian's **null space** let us spend a redundant arm's extra joints on a second goal for free, delivering Chapter 1's coffee-cup promise.",
        "But notice what we never once did: we never asked how hard the motors have to push. We commanded angles and velocities and *assumed* the arm obediently went there, frictionless and gravity-free. Real arms sag, overshoot, and fight momentum. Chapter 4 tears up our deal and puts the forces back: it takes the poses and velocities kinematics hands it and asks the harder question of how to actually *make the body track them*, from the humble PID loop up to whole-body torque control. Every target we computed here becomes a setpoint there. And the Jacobian doesn't retire: it reappears in control to map forces between joint and task space, in reinforcement learning as the action-space geometry, and in the vision-language-action stack as the thing standing between a predicted motion and a moving motor. It's the most reused matrix in the book.",
        "Onward.",
      ],
    },
  ],
};
