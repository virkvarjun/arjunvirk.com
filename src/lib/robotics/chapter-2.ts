import type { Chapter } from "../chapters";

// The Robotics Bible, Chapter 2. Prose is authored in
// content/robotics-bible/chapter-2-frames-transforms.md and transcribed here
// verbatim into the Chapter/section schema; figures are mounted by id and
// rendered from the diagram registry (rb-2-1 … rb-2-6).

export const chapter2: Chapter = {
  slug: "chapter-2-frames-transforms",
  number: "2",
  title: "The Language of Space: Frames, Rotations & Transforms",
  summary:
    "Coordinate frames, rotation matrices, gimbal lock, quaternions, and the 4×4 transforms that let a robot translate between everything it sees.",
  published: "Jul 13, 2026",
  updated: "Jul 13, 2026",
  futureRef:
    "The math here is bedrock and won't age: SO(3), quaternions, and homogeneous transforms have been settled for well over a century (Hamilton's quaternions date to 1843, and the gimbal-lock lesson is as old as Apollo). The *tooling* evolves. tf2 is today's standard in ROS, and specific conventions differ between libraries (some quaternions are ordered `(x, y, z, w)` instead of `(w, x, y, z)`; some Euler stacks use a different axis order), so always check a library's convention before trusting its numbers, because a swapped order is a silent, vicious bug. Come back to Fig 2.5 (transform composition) whenever a later chapter's frame bookkeeping stops making sense; nearly every spatial computation in the guide is a walk through that chain.",
  sections: [
    {
      paragraphs: [
        `*A position number is a lie until you say what it's relative to. This chapter is the machinery that lets a robot juggle a dozen coordinate frames at once without losing its mind.*`,
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        `Ask a robot "where is the cup?" and the honest answer is: *the question is malformed.* Not because the robot can't see the cup; it can, plainly, sitting in the middle of its camera image. The problem is the word "where." Where **relative to what?** The camera sees the cup at one set of numbers. The gripper that has to grab it needs a completely different set. The map the robot is navigating uses a third. There is no such thing as *the* position of the cup. There are only positions relative to a chosen frame, and a robot is drowning in frames.`,
        `That's the villain of this chapter, and it's a sneaky one because it doesn't announce itself. It hides inside every "obvious" coordinate. You write down \`(0.4, 0.1, 0.7)\` for the cup, feel good about yourself, and three functions later something reaches half a meter to the left of it because that number was in camera coordinates and the arm thinks in base coordinates. **A number without a frame is not a position. It's a rumor.**`,
        `I'm assuming you've read Chapter 1: you know a robot is a **sense–plan–act** loop on a body of links and joints, and you remember that a **pose** is position *and* orientation (six numbers, from Fig 1.3's world). Everything else we build from zero. Here's the road, and every step fixes the one before it. First we make "where" mean something by pinning down **frames**, and the points and vectors that live in them. Then orientation: we rotate things in 2D, then 3D, and meet **rotation matrices** and why they're so clean. Rotation matrices are correct but bulky, so we try the intuitive shortcut, **Euler angles** (roll, pitch, yaw), and watch it detonate on **gimbal lock**. That failure hands us **quaternions**, the weird four-number fix that professionals actually ship. Then we pack rotation and translation together into one object, the **homogeneous transform**, so that "move a point through five frames" becomes "multiply five matrices." And finally we assemble the whole robot into a **transform tree** (the thing ROS calls **tf2**) and answer the question we opened with: the cup, in the base frame, at last.`,
        `Let's go.`,
      ],
    },
    {
      heading: `Frames: why "where is the cup?" has no answer yet`,
      paragraphs: [
        `Start with the naive picture, the one in your head right now: space is just *there*, and a point has *a* position. That works fine when there's one observer. It falls apart the instant there are two, and a robot is always at least five observers wearing one body.`,
        `A **frame** (short for coordinate frame, or *reference frame*) is a chosen origin plus a chosen set of axes: an agreed-upon "here is (0,0,0), and here's which way is x, y, z." It's the ruler you measure with. The cup doesn't move when you switch frames; the *numbers* do. Bolt a frame to the robot's base and the cup is at one triple. Bolt a frame to the camera lens and the same cup is at another. Both are completely correct. Neither is "the" answer, because there is no "the."`,
        `A real robot carries a whole zoo of these, and it's worth naming the usual suspects because you'll see them for the rest of the guide:`,
      ],
    },
    {
      list: [
        `The **world frame** (sometimes *map* frame) is the one nailed to the room. It doesn't move. This is where "the table is at the north wall" lives.`,
        `The **base frame** is bolted to the robot's body: the base of the arm, the center of the mobile platform. When the robot drives, the base frame moves through the world frame.`,
        `The **camera frame** sits at the lens. Everything a camera reports is naturally in *this* frame, because that's literally the only viewpoint it has.`,
        `The **end-effector frame** (or *tool* frame, or *gripper* frame) rides on the hand. This is the frame that actually has to line up with the cup to grab it.`,
      ],
    },
    {
      paragraphs: [
        `Now the villain is visible. The camera says "cup at these numbers." The gripper needs the cup in *its* frame. Those two frames are in different places, pointed different ways, and separated by an entire moving arm. Getting from one to the other, cleanly, reliably, without a sign error that sends the hand into the table, is the whole job of this chapter.`,
        `One more distinction before we can compute anything, and it trips up nearly everyone once: **points versus vectors.** A **point** is a location, *where* something is. A **vector** is a displacement, a direction and a distance, *how to get from here to there*. They look identical on paper (both are a triple of numbers) but they behave differently when you change frames. Move to a new frame whose origin is shifted three meters over, and every **point** picks up that three-meter shift: its coordinates change. A **vector** does *not*: "two meters to the left" is two meters to the left no matter where you put the origin. Vectors care about rotation but ignore translation; points care about both. (Side note: this is the real reason we'll later bolt an extra "1" onto points and a "0" onto vectors: that single digit is what tells the transform machinery whether to apply the translation. Hold that thought until the homogeneous-transform section; it pays off there.)`,
      ],
    },
    {
      diagram: {
        id: "rb-2-1",
        caption:
          "One cup, three frames, three completely correct answers: a coordinate is meaningless until you name the frame it lives in.",
      },
    },
    {
      quiz: {
        question:
          "A camera reports the cup at `(0.0, 0.0, 0.6)`, dead center, 60 cm away. A beginner passes that triple straight to the arm controller and the gripper misses badly. Nothing is broken in the code. What went wrong?",
        answer:
          "The number is fine; the frame is wrong. `(0.0, 0.0, 0.6)` is the cup in the **camera** frame: centered in the image, 60 cm down the lens axis. The arm controller thinks in the **base** frame, where the cup is somewhere else entirely, because the camera and the base sit in different places pointed different ways. Handing a camera-frame coordinate to a base-frame controller is exactly the \"a number without a frame is a rumor\" failure. The fix is to *transform* the point from the camera frame into the base frame first, which requires knowing the pose of the camera relative to the base, i.e. the transform between them. That transform is what the rest of this chapter builds.",
      },
    },
    {
      heading: "Rotation: in 2D first, then 3D",
      paragraphs: [
        `Position is the easy half of a pose: to move a point, you add. Orientation is the hard half, and it's where all the subtlety of this chapter lives, so we sneak up on it in 2D where you can see everything.`,
        `**The intuition.** Rotating a point about the origin doesn't change how far it is from the origin; it just swings it around, like a clock hand. So whatever the operation is, it has to preserve length. In 2D there's exactly one number that describes it: the angle θ you rotate by. The question is how to turn "spin by θ" into arithmetic on the coordinates.`,
        `Here's the trick, and it's the whole idea of a rotation matrix. Ask a simpler question: *where do the axes themselves land?* The x-axis unit arrow \`(1, 0)\`, rotated by θ, points to \`(cos θ, sin θ)\`. The y-axis unit arrow \`(0, 1)\`, rotated by θ, points to \`(−sin θ, cos θ)\`. Every other point is just a combination of those two axes, so if you know where the axes go, you know where *everything* goes. Stack those two rotated axes as the columns of a matrix and you have the **2D rotation matrix**:`,
      ],
    },
    {
      equations: [
        String.raw`R(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix}`,
      ],
    },
    {
      paragraphs: [
        `**Reading the symbols.** \`θ\` (theta) is the rotation angle, counterclockwise, in radians. \`cos θ\` and \`sin θ\` are the ordinary cosine and sine. The matrix is a little table that, when multiplied by a point's column \`(x, y)\`, hands you back where that point lands after the spin. The *first column* \`(cos θ, sin θ)\` is where the x-axis went; the *second column* \`(−sin θ, cos θ)\` is where the y-axis went. That "columns are the rotated axes" reading is not a coincidence; it's the most useful thing to know about any rotation matrix, and it stays true in 3D.`,
        `**Worked example: rotate a point 90°.** Take the point \`p = (2, 0)\`, two units out along the x-axis, and rotate it a quarter turn counterclockwise, θ = 90°. Then cos 90° = 0 and sin 90° = 1, so:`,
      ],
    },
    {
      equations: [
        String.raw`R(90°)\,p = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}\begin{bmatrix} 2 \\ 0 \end{bmatrix} = \begin{bmatrix} 0\cdot 2 + (-1)\cdot 0 \\ 1\cdot 2 + 0\cdot 0 \end{bmatrix} = \begin{bmatrix} 0 \\ 2 \end{bmatrix}`,
      ],
    },
    {
      paragraphs: [
        `The point that was two units *east* is now two units *north*. Exactly what a 90° counterclockwise turn should do, and notice it's still a distance of 2 from the origin: length preserved, as promised.`,
        `**Into 3D.** In three dimensions a rotation is a 3×3 matrix, and the same story holds: its three columns are where the x, y, and z axes land after the rotation. A rotation about the z-axis, for instance, just does the 2D rotation in the x–y plane and leaves z alone:`,
      ],
    },
    {
      equations: [
        String.raw`R_z(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta & 0 \\ \sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{bmatrix}`,
      ],
    },
    {
      paragraphs: [
        `You get $R_x$ and $R_y$ the same way, rotating in the other two planes. But rather than memorize three tables, learn the two properties that make *any* valid rotation matrix special, because these are what you'll actually use.`,
        `**Property one: the columns are orthonormal.** *Ortho* means the three columns are mutually perpendicular (they're a rotated set of axes, and axes are perpendicular). *Normal* means each column has length 1 (rotating a unit axis leaves it a unit axis). Perpendicular *and* unit-length is exactly what "a clean, non-distorting rotation" means: no stretching, no shearing, no scaling. A matrix whose columns are orthonormal represents a pure rotation, and only a pure rotation.`,
        `**Property two, the payoff: the inverse is the transpose.** For a rotation matrix,`,
      ],
    },
    {
      equations: [String.raw`R^{-1} = R^{\top}`],
    },
    {
      paragraphs: [
        `Reading it: to *undo* a rotation, you don't have to do the expensive general-purpose matrix inversion you learned in linear algebra; you just flip the matrix across its diagonal (that's the transpose, $R^{\top}$, swapping rows and columns). This is a small miracle and you use it constantly: "camera-to-base" and "base-to-camera" rotations are transposes of each other, free of charge. It falls straight out of the columns being orthonormal.`,
        `**Property three: the determinant is +1.** A rotation preserves volume and doesn't flip handedness (it won't turn a right hand into a left hand). Mathematically that pins the determinant to exactly +1. If you ever compute a "rotation" matrix and get determinant −1, you've accidentally built a *reflection* (a mirror), and it will quietly ruin everything downstream.`,
        `The set of all 3×3 matrices with orthonormal columns and determinant +1 has a name you'll see everywhere: **SO(3)**, the *special orthogonal group* in 3 dimensions. "Orthogonal" is the orthonormal-columns part, "special" is the determinant-+1 part, and "group" just means you can compose two rotations and get another rotation. Whenever someone says "the rotation lives in SO(3)," they mean exactly these three properties. Funny name, but it's just "the set of clean 3D rotations."`,
      ],
    },
    {
      diagram: {
        id: "rb-2-2",
        caption:
          "A rotation matrix is just a record of where the axes go: read its columns and you read the rotation; length is preserved, handedness is preserved.",
      },
    },
    {
      quiz: {
        question:
          "You have a rotation matrix `R` that takes points from the camera frame into the base frame. You now need the reverse: base frame back into camera frame. Why don't you need to run a full matrix inversion, and what do you do instead?",
        answer:
          "Because `R` is a rotation matrix, and rotation matrices are orthonormal, which means their inverse *equals their transpose*: `R⁻¹ = Rᵀ`. So to reverse the direction of the transform you just transpose `R` (swap its rows and columns), which is a trivial, exact, no-arithmetic-error operation. General matrix inversion is expensive and numerically touchy; the transpose is free and perfect. This is one of the everyday reasons rotations are represented as matrices at all: undoing them is essentially free. (It's also a good sanity check: if `Rᵀ` is *not* the inverse, your matrix wasn't a real rotation in the first place, likely because its determinant wasn't +1.)",
      },
    },
    {
      heading: "Euler angles: intuitive, composable, and quietly broken",
      paragraphs: [
        `Nine numbers to describe an orientation feels like overkill, and it is: a 3×3 rotation matrix has nine entries but only three real degrees of freedom (you need exactly three numbers to say which way something faces). So the natural human move is: just use three numbers. Spin about one axis, then another, then the third. That's **Euler angles**, and in robotics they usually go by the pilot's names: **roll, pitch, and yaw.**`,
        `**The intuition.** Imagine you're flying a plane. **Yaw** is turning left/right (nose swings side to side, rotation about the vertical axis). **Pitch** is nose up/down. **Roll** is tipping the wings, banking. Any orientation you can imagine, you can reach by some combination of those three, applied in order. It's wonderfully intuitive (you can *feel* roll, pitch, and yaw in your body), which is exactly why it's the representation people reach for first.`,
        `**How they compose.** Applying three rotations in sequence is just multiplying their matrices. To rotate by yaw (about z), then pitch (about y), then roll (about x), you build:`,
      ],
    },
    {
      equations: [
        String.raw`R = R_z(\text{yaw}) \, R_y(\text{pitch}) \, R_x(\text{roll})`,
      ],
    },
    {
      paragraphs: [
        `**Reading the symbols.** Each \`R\` with a subscript is one of the single-axis rotation matrices from the last section. You read the product **right to left**: the point gets rolled first, then pitched, then yawed. That right-to-left ordering matters: matrix multiplication doesn't commute, so yaw-then-pitch is a *different* final orientation than pitch-then-yaw. (This non-commuting is itself worth internalizing: rotations, unlike positions, do not add up in any order you like. Turn a book 90° about two different axes in two different orders and it ends up facing two different ways. Try it with an actual book; it's the fastest way to feel why orientation is genuinely harder than position.)`,
        `**The fatal flaw: gimbal lock.** Here's where it breaks, and it breaks catastrophically. Because the three rotations are applied in sequence about *body-relative* axes, there are orientations where two of the three axes line up, and when two axes point the same way, they do the same job. You've got three knobs but only two of them still do anything independent. **You've silently lost a degree of freedom.**`,
        `The classic trigger: pitch the nose straight up, 90°. Now the roll axis and the yaw axis are pointing in the same direction. Rolling and yawing both just spin the plane about the same vertical line. You wanted three independent controls over orientation and you're down to two, right when a plane pointed straight up most needs full control. That's **gimbal lock**, and the name is literal: it comes from mechanical gimbals, nested rings that can physically fold flat against each other. Near the lock, small desired motions demand wild, sudden swings in the angle values (the math tries to "unlock" by spinning a full axis instantly), which shows up as a visible flip or jerk.`,
        `This isn't a textbook curiosity. **It nearly bit Apollo 11.** The guidance computer used a gimballed platform, and its designers had to warn astronauts away from orientations that would lock it. Michael Collins famously grumbled about the "gimbal lock" restriction and joked about adding a fourth gimbal that never got built. Every flight-controls and robotics engineer since has inherited that lesson: **Euler angles are great for talking to humans and treacherous for doing math.** They're perfect for a readout ("pitch is 12 degrees"), and a trap the moment you interpolate or integrate them.`,
      ],
    },
    {
      diagram: {
        id: "rb-2-3",
        caption:
          "Pitch to 90° and two of the three rings align: you still have three knobs but only two independent motions, the lost degree of freedom that doomed Euler angles for real math.",
      },
    },
    {
      quiz: {
        question:
          "Euler angles use the minimum three numbers and are easy to read off (\"yaw is 30 degrees\"). Given how convenient that is, why do serious systems refuse to *store or interpolate* orientation as Euler angles?",
        answer:
          "Because of gimbal lock. At certain orientations (pitch = 90° in the roll-pitch-yaw convention) two of the three rotation axes align, collapsing three independent controls down to two: the representation loses a degree of freedom exactly when you might need it most. Near that singularity the angle values also blow up: a small, smooth change in actual orientation demands a huge, discontinuous jump in the stored numbers, so anything that interpolates or integrates them (a controller, an animation, an estimator) produces a visible flip or a numerical explosion. Euler angles are perfectly fine as a human-facing *readout* (three interpretable numbers), but as the internal representation you compute with, they're a landmine. That's the whole reason the next section exists.",
      },
    },
    {
      heading: "Axis–angle and quaternions: the fix professionals actually ship",
      paragraphs: [
        `Gimbal lock came from forcing orientation into three sequential turns. The fix is to stop doing that. Instead of three chained rotations, describe an orientation as **one single rotation**: pick an axis in space, and rotate by some angle about it. That's **axis–angle**, and it's the cleanest mental model of a rotation there is.`,
        `**The intuition.** Any orientation whatsoever, no matter how tumbled, can be reached from "facing forward" by a *single* rotation about *one* well-chosen axis. (This is Euler's rotation theorem, and it's genuinely surprising the first time you meet it: you never need to compound turns; one turn about the right axis always suffices.) So an orientation is fully captured by a unit vector **n** (the axis, "which way the screw points") and an angle **θ** (how far to turn about it). Four numbers, no sequence, no ordering trap. And crucially, no gimbal lock: there's no "second axis" to line up with, because there's only ever one axis.`,
        `Axis–angle is beautiful for intuition but slightly awkward for arithmetic (composing two of them is fiddly). So we massage it into the form that's actually stored and shipped in every serious robotics and graphics system on earth: the **quaternion.**`,
        `**What a quaternion is, honestly.** A quaternion is four numbers, usually written \`(w, x, y, z)\`, that encode an orientation. Under the hood they're built from the axis–angle: roughly, the angle goes into \`w\` via a cosine of half the angle, and the axis goes into \`(x, y, z)\` scaled by a sine of half the angle. Hamilton invented them in 1843 (the story goes that he carved the defining rule into a Dublin bridge because it hit him mid-walk), and for a century they were a mathematical curiosity before robotics and computer graphics discovered they were the perfect tool. **I'll be honest with you: the algebra of multiplying quaternions is fiddly and non-intuitive, and I'm not going to make you derive it.** What matters is *why they win* and the three facts you actually use.`,
        `**Why they exist: the payoff.** Two reasons, both practical:`,
      ],
    },
    {
      list: [
        `**No gimbal lock.** Because a quaternion is essentially the single-axis idea in disguise, it has no sequential axes to collapse. There is no orientation where it silently loses a degree of freedom. This alone is why flight software and robot estimators store orientation as quaternions.`,
        `**Smooth interpolation.** If you want to blend from orientation A to orientation B (a camera swinging to look at something, a gripper reorienting), quaternions give you a clean, constant-rate shortest path. Euler angles, blended naively, take bizarre detours and can flip near a lock; quaternions glide.`,
      ],
    },
    {
      paragraphs: [`**The three facts you actually use:**`],
    },
    {
      list: [
        `**They're unit vectors.** A valid orientation quaternion has length 1: $w^2 + x^2 + y^2 + z^2 = 1$. It lives on the surface of a 4D unit sphere. If yours drifts off length-1 after a bunch of multiplications (it will, from floating-point rounding), you just re-normalize (divide by the length) and it's clean again. This is far kinder than a rotation matrix, which drifts *off* of SO(3) into a distorted near-rotation and is annoying to re-clean.`,
        `**Double cover: q and −q are the same rotation.** This one surprises everyone. The quaternion \`q\` and its negation \`−q\` describe the *identical* physical orientation. The 4D sphere covers the space of rotations *twice*, hence "double cover." It's harmless once you know it, but it's why interpolation code has to check whether to flip the sign of one endpoint first (otherwise your camera takes the 359° long way around instead of the 1° short way).`,
        `**Slerp for smooth blends.** The interpolation you use is **slerp**, *spherical linear interpolation.* Ordinary linear interpolation would cut a straight chord through the inside of the 4D sphere and off the surface, breaking the unit-length rule and giving uneven speed. Slerp instead sweeps along the sphere's *surface* at constant angular rate: the great-circle, shortest, constant-speed path between two orientations. That's the smooth camera move, the clean gripper reorient. Whenever you see a robot or a game character rotate perfectly evenly between two poses, that's slerp.`,
      ],
    },
    {
      paragraphs: [
        `So the honest summary: axis–angle is the clearest way to *think* about a rotation, quaternions are the awkward-but-superb way to *store and blend* them, rotation matrices are the way to *apply* them to points, and Euler angles are the way to *show them to a human.* Different tools, same underlying object, and any real system converts between them constantly.`,
      ],
    },
    {
      diagram: {
        id: "rb-2-4",
        caption:
          "Same start, same end: Euler interpolation lurches and can flip, quaternion slerp sweeps the short even arc; that clean glide is the whole reason quaternions won.",
      },
    },
    {
      quiz: {
        question:
          "Your teammate stores a robot's orientation as a quaternion and, debugging, notices that after a maneuver it reads `(−0.71, 0, 0.71, 0)` when they expected `(0.71, 0, −0.71, 0)`, every sign flipped. They panic that the orientation is wrong. Are they right to?",
        answer:
          "No, those two quaternions are the *same orientation*. A quaternion and its negation, `q` and `−q`, always represent the identical physical rotation; this is the \"double cover,\" the fact that the 4D unit sphere wraps the space of real orientations exactly twice. So a wholesale sign flip is not a bug and doesn't change where the robot is pointing at all. Where it *does* matter is interpolation: when you slerp between two quaternions you have to check the sign and possibly negate one endpoint, or you'll blend along the long way around the sphere (a nearly-full turn) instead of the short way. So the teammate is right to notice it and right to handle it in blending code, but wrong to think the stored orientation is incorrect. It's a feature of the representation, not an error.",
      },
    },
    {
      heading: "Homogeneous transforms: rotation and translation in one box",
      paragraphs: [
        `We can rotate points and we can (trivially) translate them by adding. A real frame change does *both* at once: the camera frame is both turned *and* shifted relative to the base. Doing them as two separate steps (rotate, then add a translation) works, but it gets miserable fast: chain five frames together and you're juggling five rotations and five additions in careful order, and the additions and multiplications don't combine into one clean object. We want a single thing that captures a full pose change and *composes by multiplication*, so that "go through five frames" is just "multiply five of them." That single thing is the **homogeneous transform.**`,
        `**The trick.** Take a 3D rotation \`R\` (3×3) and a translation \`t\` (the 3-vector saying how far the new frame's origin is shifted), and pack them into a **4×4** matrix like this:`,
      ],
    },
    {
      equations: [
        String.raw`T = \begin{bmatrix} R & t \\ 0\ \ 0\ \ 0 & 1 \end{bmatrix}`,
      ],
    },
    {
      paragraphs: [
        `**Reading the symbols.** The top-left 3×3 block is the rotation \`R\`, the orientation part. The top-right column \`t\` is the translation, where the new frame's origin sits. The bottom row is a fixed \`[0 0 0 1]\`, padding that makes the sizes work and does one clever job: it's what lets translation ride along inside a *multiplication*. To transform a point, you tack a \`1\` onto its bottom to make it a 4-vector \`(x, y, z, 1)\`. Remember the "points get a 1" promise from the frames section? Here's the payoff: that \`1\` picks up the translation column \`t\`. A **vector** (a pure displacement) gets a \`0\` on the bottom instead, so it picks up the rotation but *ignores* the translation: exactly the points-vs-vectors behavior from earlier, now enforced automatically by one digit.`,
        `Why this is the whole game: two frame changes back-to-back become one matrix multiply. If $T_{AB}$ takes points from frame B into frame A, and $T_{BC}$ takes points from frame C into frame B, then`,
      ],
    },
    {
      equations: [String.raw`T_{AC} = T_{AB}\,T_{BC}`],
    },
    {
      paragraphs: [
        `takes points straight from C into A. **The subscripts chain like dominoes:** the inner B's cancel, leaving A←C. This is the punchline of the entire chapter: *transforming a point through a chain of frames is just multiplying the transforms along the chain.* Order matters (it's still matrix multiplication, right-to-left), but the bookkeeping is now automatic.`,
        `**Worked example: compose two transforms.** Keep it 2D-flavored so we can do it by hand. Say frame B is the base, and frame C (the camera) is rotated 90° about z relative to the base *and* shifted 2 units along base-x. Its transform into the base is:`,
      ],
    },
    {
      equations: [
        String.raw`T_{BC} = \begin{bmatrix} 0 & -1 & 0 & 2 \\ 1 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}`,
      ],
    },
    {
      paragraphs: [
        `(The top-left 2×2 is our familiar 90° rotation; the \`2\` in the translation column is the shift along x; z is untouched.) Now the camera sees a cup one unit straight ahead of *itself*, at camera-frame coordinates \`(1, 0, 0)\`. Where is the cup in the base frame? Tack a 1 on the point and multiply:`,
      ],
    },
    {
      equations: [
        String.raw`T_{BC}\begin{bmatrix} 1 \\ 0 \\ 0 \\ 1 \end{bmatrix} = \begin{bmatrix} 0\cdot1 + (-1)\cdot0 + 0\cdot0 + 2\cdot1 \\ 1\cdot1 + 0\cdot0 + 0\cdot0 + 0\cdot1 \\ 0 \\ 1 \end{bmatrix} = \begin{bmatrix} 2 \\ 1 \\ 0 \\ 1 \end{bmatrix}`,
      ],
    },
    {
      paragraphs: [
        `So the cup is at \`(2, 1, 0)\` in the base frame. Sanity check: the camera was shifted 2 along base-x (that's the \`2\`), and because it's rotated 90°, the cup that was "ahead" of the camera lands off to the side in the base frame (that's the \`1\`). The rotation *and* the translation both got applied, in one multiply, from one matrix. That's the payoff, and it's exactly the machinery that answers the cup question we opened the chapter with.`,
      ],
    },
    {
      diagram: {
        id: "rb-2-5",
        caption:
          "Walk a point down a chain of frames and it's nothing but a running product of 4×4 transforms: rotation and translation carried together, one multiply per edge.",
      },
    },
    {
      quiz: {
        question:
          "You have `T_base_camera`, the transform that takes points from the camera frame into the base frame. A point comes in already expressed in the *base* frame, and you need it in the *camera* frame. Two questions: which matrix do you use, and is there a shortcut given that the top-left block is a rotation?",
        answer:
          "You need the *inverse* transform, `T_camera_base = (T_base_camera)⁻¹`, because you're going the opposite direction along the edge (base → camera instead of camera → base). And yes, there's a shortcut, though it's a touch more involved than the pure-rotation case. For a homogeneous transform you don't do a general 4×4 inversion: the new rotation block is just the transpose `Rᵀ` (from the last section, rotations invert by transposing), and the new translation is `−Rᵀt`. So the inverse is `[[Rᵀ, −Rᵀt], [0 0 0 1]]`. The `Rᵀ` reuses the free rotation-inverse trick, and the `−Rᵀt` un-shifts the origin in the correctly-rotated direction. Fast, exact, no general matrix solver, which is why transforms are stored this way in the first place.",
      },
    },
    {
      heading: "The transform tree: a whole robot as frames, and ROS's tf2",
      paragraphs: [
        `Now assemble everything. A real robot isn't two frames. It's dozens: world, base, each joint along the arm, the wrist, the gripper, every camera, every sensor mount. Each one is a frame, and each *connection* between a frame and its parent is a homogeneous transform. Draw that out and you get a **transform tree**: nodes are frames, edges are the transforms that relate them, and the whole robot's spatial state is that tree, updated every tick as the joints move.`,
        `**Why a tree, specifically?** Because the relationships nest. The gripper is mounted on the wrist, which rides on the forearm, which hangs off the shoulder, which sits on the base, which sits in the world. Each thing has exactly one parent it's rigidly-or-not attached to, and that's the definition of a tree. Some transforms are *static*: the camera bolted to the base never moves relative to it, so that edge is a fixed matrix. Others are *dynamic*: every joint edge changes as the robot moves, recomputed from the live encoder readings (there's the proprioception from Chapter 1 earning its keep).`,
        `**Walking the tree is how you answer "where is the cup, really."** Here's the whole chapter paying off. The camera reports the cup in the *camera* frame. You want it in the *base* frame so the arm can grab it. You find the path through the tree from camera to base (camera → mount → base, say) and you *multiply the transforms along that path*, using an inverse for any edge you traverse against its arrow. Out pops the cup in the base frame. Need it in the world frame instead? Keep walking up to the world node and multiply one more edge. **"Cup in camera frame" → "cup in base frame" is a walk up the tree, and the walk is a chain of matrix multiplies**, exactly the composition rule from the last section, now applied to a real graph.`,
        `This is common enough that there's a standard piece of software everyone uses for it: **tf2**, the transform library in **ROS** (the Robot Operating System). You don't hand-multiply matrices in practice; you publish each edge's transform as the robot runs, and you *ask* tf2 questions like "give me the pose of the cup in the base frame at time t." It finds the path through the tree, chains the transforms, handles the inverses, and even interpolates transforms across time so you can line up a camera frame from 30 milliseconds ago with where the arm is *now*. (That time-alignment is quietly essential: sensors and joints report at different instants, and comparing a stale camera reading against a fresh arm pose without accounting for the delay is a classic, maddening bug.) When a roboticist says "just look it up in tf," this tree is what they mean, and it's one of the most-used tools in the whole ecosystem.`,
        `**One transform you can't just measure: hand–eye calibration.** Almost every edge in the tree you know from the design (the camera is bolted 5 cm above and 10 cm forward of the base, measure it once, done) or from encoders (the joint edges). But the transform from the camera to the gripper, the one you desperately need, because it's what turns "I see the cup" into "reach *here* to grab it," is brutally hard to measure with a ruler. A camera's true optical center is buried inside the lens, and a millimeter of error becomes a centimeter of miss at arm's length. So you *solve* for it: you move the arm to many poses while the camera watches a known calibration target, collect the "where the arm thinks it is" and "where the camera sees the target" pairs, and compute the single fixed camera-to-gripper transform that makes all of them consistent. That's **hand–eye calibration**, and it's the unglamorous step that decides whether a vision-guided robot actually touches what it's looking at or clumsily misses by a centimeter every time.`,
      ],
    },
    {
      diagram: {
        id: "rb-2-6",
        caption:
          "A robot is a tree of frames joined by transforms; answering 'where is the cup in the base frame' is just walking the tree and multiplying the edges, exactly what ROS's tf2 does for you.",
      },
    },
    {
      quiz: {
        question:
          "Every edge in a robot's transform tree is either \"static\" or \"dynamic,\" and tf2 makes a point of timestamping the dynamic ones. Why does the timestamp matter? What breaks if you ignore it and just use the latest value of every edge?",
        answer:
          "Because the different edges are measured at different instants, and the robot is moving. A camera frame is captured at, say, time t, but by the time you process it the arm has swung to a new pose reported at t + 30 ms. If you resolve \"cup in base frame\" by combining the camera's *old* view of the cup with the arm's *current* joint angles, you're stitching together two different moments (the cup you saw *then* against where the arm is *now*), and the answer is wrong by however far things moved in that gap. That error is exactly Chapter 1's \"the world doesn't hold still\" villain sneaking into the geometry. tf2 timestamps every dynamic transform and can interpolate each edge to a common instant, so you can ask \"where was the cup relative to the base *at the moment the image was taken*\" and get a consistent chain. Ignore the timestamps on a fast-moving robot and you get a persistent, direction-dependent miss that's maddening to debug because every individual number looks correct.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        `You started the chapter unable to answer "where is the cup?" and you can now answer it precisely, in any frame you like, on a real robot. That's a real upgrade. Along the way you picked up the entire language the rest of the guide speaks in space:`,
        `A **frame** is the ruler that makes a coordinate mean something; **points** carry translation and rotation, **vectors** carry only rotation. Orientation is captured by a **rotation matrix** in **SO(3)**: orthonormal columns that *are* the rotated axes, inverse-equals-transpose, determinant +1. **Euler angles** (roll/pitch/yaw) are the human-readable three-number form, lovely for a display and lethal for math thanks to **gimbal lock**. **Quaternions** are the four-number fix the professionals ship: no lock, unit-length, double-cover (\`q\` and \`−q\` are the same), and **slerp** for smooth blends. A **homogeneous transform** is the 4×4 box \`[[R, t],[0,0,0,1]]\` that carries rotation and translation together so that composing frame changes is just multiplying matrices, \`T_A_C = T_A_B · T_B_C\`. And a whole robot is a **transform tree** (ROS's **tf2**) where answering any "where is X relative to Y" is a walk up the tree multiplying edges, with **hand–eye calibration** solving the one edge you can't measure.`,
        `This chapter is pure *plumbing*, and that's the point: it's the plumbing every later chapter runs on. Chapter 3 (Kinematics) is the immediate payoff: it stacks exactly these transforms, one per joint, to answer "given the six joint angles, where is the hand?" The forward-kinematics chain is a product of the homogeneous transforms you just met, one per link. Chapter 5's estimation and SLAM live and die on frames (the whole game is figuring out the base-to-world transform when it's unknown and drifting). Chapter 8's perception hands you objects in the camera frame that you'll transform into the base frame with tf2 to act on them. You'll be composing transforms for the rest of this guide; now you know what they are.`,
        `Onward.`,
      ],
    },
  ],
};
