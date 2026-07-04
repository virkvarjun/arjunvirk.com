import type { Chapter } from "../chapters";

// The Robotics Bible — Chapter 5. Prose is authored in
// content/robotics-bible/chapter-5-slam.md and transcribed here verbatim into
// the Chapter/section schema; figures are mounted by id and rendered from the
// diagram registry (rb-5-1 … rb-5-6).

export const chapter5: Chapter = {
  slug: "chapter-5-slam",
  number: "5",
  title: "Estimation, Localization & SLAM",
  summary:
    "Fighting drift and lying sensors with probability: Bayes filters, Kalman, particle filters, mapping, and loop closure.",
  published: "Aug 3, 2026",
  updated: "Aug 3, 2026",
  futureRef:
    "The core here is bedrock and won't age — belief as a distribution, the predict/update Bayes filter, the Kalman gain as a trust dial, particle filters for multimodal belief, occupancy grids, and loop closure as the answer to drift are all decades-stable ideas you can build a career on. What *is* moving fast is the map: the shift from sparse feature or grid maps toward dense, photorealistic reconstruction via neural fields and 3D Gaussian Splatting is active frontier work (come back after Chapter 11, which treats it in full). Treat specific systems as snapshots — ORB-SLAM, Cartographer, and today's Gaussian-splat SLAM will be superseded — but the predict-widen / update-sharpen heartbeat underneath every one of them is evergreen. Come back to Fig 5.2 (the Bayes filter loop) whenever any estimation idea later in the guide stops making sense; almost all of them are that same two-beat rhythm in disguise.",
  sections: [
    {
      paragraphs: [
        `*How a robot answers "where am I?" when every sensor lies and its own wheels drift — by refusing to believe any single number and tracking a whole distribution of belief instead.*`,
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        `Back in Chapter 1 we met the villain that haunts this whole field: **dead-reckoning drifts, every measurement lies a little, and those small errors don't stay small — they pile up.** Drive "one meter" a hundred times on wheel counts alone and you'll be meters from where you think you are. And yet the robot cannot throw up its hands. It has to answer, right now, from noisy and incomplete data, the most basic question there is: *where am I?* A wheeled base that gets this wrong plans a path from the wrong start and drives into a wall. Everything downstream depends on getting it approximately right.`,
        `The hero of this chapter is a single, almost philosophical move: **stop pretending you know.** Instead of committing to one certain number — "I am at x = 3.20 meters" — you represent your **belief** as a probability distribution over where you might be. The best guess is in there, but so is a measure of how unsure you are. Then you update that belief with new evidence using **Bayes' rule**, which is just the arithmetic of changing your mind. Never a single certain number; always a distribution you keep sharpening.`,
        `I'm assuming you've read Chapter 1 (the sense–plan–act loop, the proprioceptive vs. exteroceptive sensor split, and Villain #2, compounding error) and Chapter 4 (feedback, and the idea that a model of your own motion is imperfect). You'll want to be comfortable with the idea of a mean and a variance, but I'll build everything else from zero — Gaussians, Bayes, filters, maps.`,
        `Here's the road, and each stop is a fix for the last. We start by representing belief as a distribution instead of a point. We give that belief a two-beat heartbeat — **predict** (motion spreads it out) and **update** (measurement sharpens it) — the Bayes filter. We solve it exactly for the nice linear-Gaussian case: the **Kalman filter**. Real robots are nonlinear, so we linearize: the **EKF**. When belief can't be a single blob at all — "I'm at one of three identical doorways" — we switch to a cloud of samples: the **particle filter**. Then we need something to localize *against*, so we build **maps** (occupancy grids). Then the chicken-and-egg twist: build the map and localize *at the same time* — **SLAM** — watch its error grow, and fix it with the single best trick in the field, **loop closure**. We end on the modern flavors. Let's go.`,
      ],
    },
    {
      heading: "Belief is a distribution, not a point",
      paragraphs: [
        `Here's the mistake every beginner makes, and it feels so reasonable: track the robot's position as a number. Store \`x = 3.20\`. Update it as the robot moves. Simple.`,
        `It's a disaster, and Chapter 1 already told you why. That \`3.20\` is a lie told with false confidence. Your wheel encoders might be off. The floor might be slick. The number *looks* exact, but it carries no memory of how much you should doubt it — so when a measurement disagrees, you have no principled way to decide who's right. A point can't argue back.`,
        `The fix is to stop storing a point and start storing a **belief**: a probability distribution over every place the robot *might* be. Where the distribution is tall, you think you probably are; where it's flat, probably not. This one shift — **belief = distribution, not point** — is the intellectual spine of the entire chapter. It sounds abstract; it's the most practical idea in robotics.`,
        `The workhorse distribution is the **Gaussian** (the bell curve — funny how it shows up everywhere, huh?). A Gaussian is fully described by just two numbers in one dimension:`,
      ],
      equations: [String.raw`\mathcal{N}(x;\ \mu,\ \sigma^2)`],
    },
    {
      paragraphs: [
        `Reading the symbols: **μ (mu)** is the **mean** — the peak of the bell, your single best guess for where you are. **σ² (sigma-squared)** is the **variance** — how wide the bell is, i.e., *how unsure you are.* A tiny variance is a tall narrow spike ("I'm quite sure I'm right here"); a huge variance is a low wide hump ("could be anywhere in this whole region"). The mean answers "where?"; the variance answers "how much should you trust that?" That second number is the one dead-reckoning throws away, and it's the one that saves you.`,
        `In more than one dimension — a robot on a floor has at least (x, y, heading) — the variance becomes a **covariance matrix** Σ (capital sigma), which stores not just the spread along each axis but how the uncertainties correlate (maybe you're confident about x but fuzzy about y, or the two are tangled together). The mental picture is an **uncertainty ellipse** drawn around your best guess: small tight ellipse = confident, big sprawling ellipse = lost. Everything from here is a story about that ellipse growing and shrinking.`,
        `**Worked example.** Suppose you believe you're at μ = 3.0 m with variance σ² = 0.04 m² — that's a standard deviation of σ = 0.2 m. In plain terms: your best guess is 3.0 m, and you'd be unsurprised to be anywhere from about 2.8 to 3.2 m (one σ on each side), and quite surprised to be outside 2.6–3.4 m (two σ). Same best guess "3.0" as the naive approach — but now the belief also honestly reports a 20 cm cloud of doubt around it. Hold onto these numbers; we'll push this exact belief through the machinery in a moment.`,
      ],
    },
    {
      diagram: {
        id: "rb-5-1",
        caption:
          "A belief is a bell curve: the mean is your best guess, the width is your doubt. Motion widens it, measurement sharpens it — that rhythm is the whole chapter.",
      },
    },
    {
      quiz: {
        question:
          "Two robots both report \"I'm at x = 3.0 m.\" Robot A's belief has σ = 0.05 m; robot B's has σ = 0.8 m. They then get a measurement saying x = 3.4 m. Which robot should move its estimate more toward the measurement, and why?",
        answer:
          "Robot B. Its huge σ means it barely trusts its own current guess — the belief is a wide, flat hump, so a measurement carries a lot of relative weight and pulls the estimate strongly toward 3.4. Robot A's tiny σ means it's very confident in 3.0; the same measurement should nudge it only slightly. The whole point of carrying the variance is exactly this: it tells you *how much to move* when evidence arrives. The naive point-estimate has no way to make this call — it would either ignore the measurement or lurch to it, with nothing in between. Distributions let you compromise in proportion to your confidence.",
      },
    },
    {
      heading: "The Bayes filter: predict, then correct — forever",
      paragraphs: [
        `Now that belief is a distribution, we need rules for changing it over time. There are exactly two things that ever happen to a robot: **it moves**, and **it senses**. So we need two operations, and the loop that alternates them is the **Bayes filter** — the beating heart of everything in this chapter and, honestly, one of the most beautiful ideas in robotics.`,
        `Beat one is **PREDICT** (also called the *motion update* or *time update*). The robot commands a motion — "drive forward 0.5 m" — and applies its **motion model**: its best physical guess of what that command does to its state. The key insight is what happens to the uncertainty. The command isn't executed perfectly (wheels slip, motors overshoot), so predicting *adds* uncertainty. **Your belief spreads out. The ellipse grows.** You knew where you were; now you know where you *were* plus a fuzzy idea of how far you moved, and fuzz on fuzz is fuzzier. This is dead-reckoning, and left alone it's Villain #2 in slow motion — predict, predict, predict, and the belief balloons until it's useless.`,
        `Beat two is **UPDATE** (also called the *measurement update* or *correction*). A sensor reports something about the world — a wall 2 m ahead, a landmark bearing. The robot folds this in using its **measurement model** (what reading it *expected* to get given each possible position) and Bayes' rule. Because a measurement is evidence, it *removes* uncertainty. **Your belief sharpens. The ellipse shrinks.** The two beats are opposites: predict widens, update sharpens. Run them in a loop and you get a belief that breathes — puffing out every time the robot moves, snapping back in every time it senses.`,
        `The engine underneath is **Bayes' rule**, which is just the arithmetic of updating a belief with evidence:`,
      ],
      equations: [
        String.raw`\underbrace{p(x \mid z)}_{\text{posterior}} \ \propto\ \underbrace{p(z \mid x)}_{\text{likelihood}} \ \cdot\ \underbrace{p(x)}_{\text{prior}}`,
      ],
    },
    {
      paragraphs: [
        `Reading the symbols: **p(x)**, the **prior**, is what you believed about your position x *before* the new measurement. **p(z | x)**, the **likelihood**, reads "the probability of getting sensor reading z if you were actually at x" — it scores each candidate position by how well it explains what you saw. **p(x | z)**, the **posterior**, is your updated belief *after* folding in the measurement. The **∝** ("proportional to") hides a normalizing constant that just rescales everything so it sums to 1. In words: *new belief = old belief, reweighted by how well each spot explains the evidence.* That's the entire update step. Predict pushes the prior forward through the motion model; update multiplies it by the likelihood. Loop forever.`,
        `**Worked example (the intuition, no matrices yet).** You believe you're near a hallway with a door at 5.0 m. Your prior belief is centered at 4.5 m — you think you're roughly a half-meter short of the door. You take a step forward (PREDICT): the motion model says +0.4 m, so your belief moves to ~4.9 m, but it also widens because that step was imperfect. Now your camera sees the door dead ahead (UPDATE): the likelihood is sharply peaked at 5.0 m. Bayes multiplies your ~4.9 m prior by that 5.0 m likelihood, and the posterior lands between them, at maybe 4.97 m — closer to the door, and *narrower* than before, because two independent hints agreeing makes you more sure than either alone. Predict nudged and blurred; update pulled and sharpened. That's the whole rhythm.`,
      ],
    },
    {
      diagram: {
        id: "rb-5-2",
        caption:
          "Two beats forever: predict widens the belief (motion adds doubt), update sharpens it (measurement removes doubt). Turn measurements off and watch dead-reckoning drift blow the ellipse up without limit.",
      },
    },
    {
      quiz: {
        question:
          "A robot runs its Bayes filter but its exteroceptive sensor (camera) fails, so only the PREDICT step keeps firing. Describe what happens to its belief over the next minute, and connect it to a villain from Chapter 1.",
        answer:
          "With only PREDICT running, the belief gets pushed forward by the motion model every cycle and *widens every single time*, because each imperfect motion command injects a little more uncertainty and nothing ever removes it. Within a minute the uncertainty ellipse sprawls out so far the estimate is worthless — the robot's best guess might still be roughly right, but its confidence has correctly collapsed to \"could be anywhere around here.\" This is exactly Villain #2 from Chapter 1: dead-reckoning error that compounds without bound. The UPDATE step is the only thing that fights it, which is precisely why Chapter 1 insisted no robot survives on proprioception alone — you need a world-referencing measurement to keep snapping the belief back.",
      },
    },
    {
      heading: "The Kalman filter: the exact answer when the world is linear and Gaussian",
      paragraphs: [
        `The Bayes filter is a recipe, not a formula — it tells you *what* to compute but not *how*, and in general "multiply two arbitrary distributions and renormalize" is nasty. But there's one gorgeous special case where the whole thing collapses into a handful of clean equations: when your motion and measurement models are **linear** and all your noise is **Gaussian**. In that case the belief stays Gaussian forever — a Gaussian pushed through a linear map and multiplied by another Gaussian is *still* a Gaussian — so you never track a whole curve, just its mean and covariance. That's the **Kalman filter** (Kalman, 1960), and it is the exact, optimal solution to the Bayes filter under those assumptions. Optimal isn't a marketing word here; it provably minimizes expected squared error. It's also what flew Apollo to the Moon, so it's earned some respect.`,
        `I'm going to skip the full matrix derivation on purpose — the STYLE_GUIDE and I agree that the *intuition* of the Kalman filter matters far more than pushing symbols around, and the intuition lives in one quantity: the **Kalman gain**, K.`,
        `Here's the picture. At the UPDATE step you have two sources of information that disagree: your **prediction** (where the motion model thinks you are) and your **measurement** (where the sensor thinks you are). Each comes with its own uncertainty. The Kalman gain is a **trust dial** between them. Its job, informally:`,
      ],
      equations: [
        String.raw`K \ \approx\ \frac{\text{uncertainty in your prediction}}{\text{uncertainty in your prediction} + \text{uncertainty in your measurement}}`,
      ],
    },
    {
      paragraphs: [
        `Read it as a knob between 0 and 1. If your prediction is rock-solid and the sensor is garbage, the denominator is dominated by the measurement noise, K drops toward 0, and you barely move toward the measurement — you trust yourself. If your prediction is a fuzzy mess and the sensor is razor-sharp, K climbs toward 1 and you snap almost all the way to the measurement — you trust the sensor. Then the new estimate is just:`,
      ],
      equations: [
        String.raw`\text{new estimate} \ =\ \text{prediction} \ +\ K \cdot (\text{measurement} - \text{prediction})`,
      ],
    },
    {
      paragraphs: [
        `That parenthesized term is the **innovation** — the surprise, the gap between what you saw and what you expected. The Kalman gain decides what fraction of the surprise you believe. (Notice this is the exact same shape as the feedback law from Chapter 4: new = old + gain × error. The Kalman gain is feedback, but with the gain *derived* from uncertainties instead of hand-tuned. Nice callback, right?)`,
        `**Worked example — fusing two noisy 1D estimates.** This is the toy that makes it click. You have two independent guesses of your position along a line:`,
      ],
      list: [
        `Estimate A (say, from odometry): mean **μ_A = 3.0 m**, variance **σ²_A = 0.09** (so σ_A = 0.30 m).`,
        `Estimate B (say, from a landmark): mean **μ_B = 3.6 m**, variance **σ²_B = 0.04** (so σ_B = 0.20 m).`,
      ],
    },
    {
      paragraphs: [
        `The optimal fusion of two Gaussians has a clean closed form. The fused variance is:`,
      ],
      equations: [
        String.raw`\sigma^2_{\text{fused}} \ =\ \frac{1}{\tfrac{1}{\sigma^2_A} + \tfrac{1}{\sigma^2_B}} \ =\ \frac{1}{\tfrac{1}{0.09} + \tfrac{1}{0.04}} \ =\ \frac{1}{11.11 + 25.0} \ =\ \frac{1}{36.11} \ \approx\ 0.0277.`,
      ],
    },
    {
      paragraphs: [
        `Look at that number. **The fused variance, 0.0277, is smaller than *either* input variance (0.09 and 0.04).** That's the miracle of fusion in one line: combining two noisy estimates gives you an answer *more* certain than the better of the two. Two blurry photos, stacked, come out sharper than either. The fused mean is the confidence-weighted average — the more-certain estimate B pulls harder:`,
      ],
      equations: [
        String.raw`\mu_{\text{fused}} \ =\ \sigma^2_{\text{fused}} \left(\frac{\mu_A}{\sigma^2_A} + \frac{\mu_B}{\sigma^2_B}\right) = 0.0277\left(\frac{3.0}{0.09} + \frac{3.6}{0.04}\right) = 0.0277\,(33.33 + 90.0) \approx 3.42\ \text{m}.`,
      ],
    },
    {
      paragraphs: [
        `So the fused estimate is **3.42 m with σ ≈ 0.166 m** — pulled toward the sharper landmark reading (3.6) but not all the way, and tighter than both inputs. Equivalently, the Kalman gain here is K = σ²_A / (σ²_A + σ²_B) = 0.09 / 0.13 ≈ 0.69: you trusted the measurement about 69% of the way. That's the entire Kalman update, worked by hand, no matrices.`,
      ],
    },
    {
      diagram: {
        id: "rb-5-3",
        caption:
          "Fusion beats its own ingredients: combine two noisy Gaussians and the result is sharper than either one, pulled toward whichever you trust more. The Kalman gain is that trust, computed from the variances.",
      },
    },
    {
      quiz: {
        question:
          "In the fusion above, suppose estimate B (the landmark) suddenly becomes very uncertain — its σ_B balloons to 2.0 m. Without recomputing exactly, what happens to the fused mean and to the Kalman gain, and why?",
        answer:
          "The fused mean slides back toward estimate A (near 3.0 m) and the Kalman gain toward the measurement collapses toward 0. When σ_B is huge, estimate B is saying \"I basically have no idea,\" so the fusion should — and does — mostly ignore it and lean on the more confident estimate A. Mechanically, a large σ²_B makes the term 1/σ²_B tiny, so B contributes almost nothing to the confidence-weighted average, and the fused variance ends up only slightly smaller than σ²_A alone. This is the trust dial doing its job: the gain automatically shrinks when the incoming information is unreliable. It's the same lesson as the earlier check — how much you move depends on relative confidence — now with the arithmetic to prove it.",
      },
    },
    {
      heading: "The Extended Kalman Filter: linearize, because real robots bend",
      paragraphs: [
        `The Kalman filter is exact and beautiful, but it made a promise real robots can't keep: that everything is **linear**. Reality laughs at this. A robot's heading enters its motion through sines and cosines (turn 30° and your x-displacement scales by cos 30° — pure nonlinearity). A range-and-bearing sensor sees landmarks through arctangents and square roots. Push a Gaussian through a curved (nonlinear) function and it comes out *bent* — no longer a clean bell — and the Kalman machinery, which assumes bells in and bells out, breaks.`,
        `The fix is pragmatic to the point of being cheeky: if the function is curved, just pretend it's a straight line *right where you currently are*. The **Extended Kalman Filter (EKF)** takes the nonlinear motion and measurement models and **linearizes** them around the current best estimate — it computes the tangent (the local slope, formally the Jacobian, the same matrix-of-partial-derivatives you met in Chapter 3) and treats the world as linear in the small neighborhood of your belief. Then it runs the ordinary Kalman equations on that local linear approximation. Predict, linearize, update, repeat. For decades the EKF was *the* workhorse of robot localization and the original engine of EKF-SLAM.`,
        `But that pretending has a cost, and honesty demands we name it. The tangent line only matches the real curve *near the point of contact*; the farther your true state is from where you linearized, the worse the approximation, and that **linearization error** quietly biases the estimate. Worse, if your uncertainty is large — a fat ellipse — then "the small neighborhood of your belief" isn't small at all, the straight-line lie spans a region where the function genuinely curves, and the EKF can grow overconfident or even diverge, marching off with a tight, wrong ellipse. The EKF works beautifully when nonlinearity is mild and uncertainty is modest, and it fails ugly when either gets large. That failure mode — a Gaussian that simply *can't* represent the true belief — is exactly what motivates the next tool.`,
      ],
    },
    {
      quiz: {
        question:
          "Why does a *large* uncertainty (a fat covariance ellipse) make the EKF's linearization especially dangerous, whereas a *small* one is usually fine?",
        answer:
          "Linearization replaces a curved function with its tangent line at your current estimate, and a tangent only hugs the curve *near the point of contact*. If your uncertainty is small, the belief lives in a tiny neighborhood where even a curved function looks essentially straight, so the approximation is excellent. If your uncertainty is large, the belief spreads across a wide region where the real function bends significantly away from its tangent — the straight-line lie no longer holds across the whole ellipse, so the propagated Gaussian is systematically wrong. The EKF can then report a confident, tight estimate that is actually biased or flat-out incorrect, and in the worst case it diverges. In short: linearization error scales with how far your belief reaches from the linearization point, and a fat ellipse reaches far.",
      },
    },
    {
      heading: "Particle filters: when belief can't be a single blob",
      paragraphs: [
        `The EKF's deepest limitation isn't linearization error — it's that a Gaussian is *one hump*. It can only ever say "I'm probably around here, give or take." But sometimes the honest belief is multi-humped. Picture the **kidnapped robot**: someone picks up your robot, blindfolds it, and sets it down somewhere new in a building of identical hallways. Its camera sees a doorway. The truthful belief is "I'm at *one of these three* identical doorways — I can't tell which yet." No single Gaussian can express that; a bell has one peak, and the truth has three. **Multimodal** beliefs break the Kalman family entirely.`,
        `The fix throws away the formula and goes brute-force in the best way. Represent the belief not with a mean and covariance but with a **cloud of samples** — thousands of little guesses called **particles**, each one a complete hypothesis "maybe I'm *right here*, at this exact pose." Where particles cluster densely, the belief is high; where they're sparse, low. A cloud can have three clusters as easily as one — it can represent *any* shape of distribution, Gaussian or not. This is **Monte Carlo Localization (MCL)**, and the general tool is the **particle filter** (Dellaert et al., 1999, brought it to robotics). It runs the exact same Bayes-filter heartbeat — predict, update — but on the particles directly.`,
        `The two beats, translated to particles:`,
      ],
      list: [
        `**PREDICT:** push *every* particle forward through the motion model, each with its own dash of random noise. The cloud drifts and spreads out — same "motion adds uncertainty" as always, now enacted by scattering the samples.`,
        `**UPDATE (reweight):** for each particle, ask the measurement model "if I really were here, how likely is the reading I just got?" That likelihood becomes the particle's **weight**. Particles that explain the measurement well get heavy; particles that don't get light. No particle moves — you just re-score them.`,
        `**RESAMPLE:** draw a fresh set of particles from the old set *in proportion to weight* — survival of the fittest. Heavy particles get copied (often several times); light ones vanish. The cloud **concentrates** where the evidence points. Do this over and over and a cloud that started sprinkled across the whole map collapses onto the true pose, cluster by cluster, as measurements rule out the impostor doorways.`,
      ],
    },
    {
      paragraphs: [
        `There's the whole algorithm. Notice it needs no linear assumption and no Gaussian — it'll happily track a belief shaped like a banana, a ring, or three separate blobs. The price is compute: you're simulating thousands of hypotheses in parallel instead of updating two numbers, and in high-dimensional state spaces you need exponentially many particles to cover the volume (an echo of the curse of dimensionality). But for global localization and the kidnapped-robot problem, nothing beats it.`,
        `**Worked example.** Start with 1000 particles spread uniformly across a 10 m hallway with identical doors at 2 m, 5 m, and 8 m — so ~333 particles per meter, belief effectively flat. The robot sees a door. UPDATE: particles sitting near 2, 5, or 8 m get high weight (they'd expect to see a door); everyone else gets near-zero weight. RESAMPLE: the cloud snaps into three tight clusters at 2, 5, 8 — still ambiguous, but now the belief is honestly "one of three," which a Gaussian could never say. The robot drives 3 m forward and sees *another* door. PREDICT shifts every cluster +3 m (to 5, 8, 11); the cluster from 2→5 and 5→8 still land on real doors and survive, but 8→11 lands on a wall, gets zero weight, and dies at the next resample. Two clusters left. One more distinctive landmark and the cloud collapses to a single spike — the robot is found.`,
      ],
    },
    {
      diagram: {
        id: "rb-5-4",
        caption:
          "A cloud of guesses can believe what a bell curve can't: 'I'm at one of these three doors.' Measurements reweight the particles, resampling concentrates them, and the cloud collapses onto the truth.",
      },
    },
    {
      quiz: {
        question:
          "In the kidnapped-robot scenario, why does the particle filter recover gracefully while an EKF would likely fail outright?",
        answer:
          "The kidnapped robot's honest belief right after being moved is multimodal — \"I could be at any of several identical-looking places\" — and an EKF represents belief with a single Gaussian, which has exactly one peak. It literally cannot encode \"three equally likely spots\"; it would have to pick one hump and place it somewhere, almost certainly wrong, and then stubbornly refine that wrong hump. The particle filter represents belief as a free-form cloud, so it can hold several distinct clusters at once, keep all the hypotheses alive, and let incoming measurements gradually kill the false ones until a single cluster survives. Its ability to represent *any* distribution shape — not just a bell — is exactly what lets it recover from a total loss of localization. That flexibility is the particle filter's whole reason to exist.",
      },
    },
    {
      heading: "Maps: something to localize against",
      paragraphs: [
        `Everything so far quietly assumed the robot had *something* to measure against — doors at known positions, landmarks at known coordinates. That "something" is a **map**, and we've been taking it for granted. Time to build one. Also, let's pin down a distinction the field is strict about:`,
      ],
      list: [
        `**Localization** = **known map, estimate pose.** You have a floor plan; figure out where you are on it. Everything above — Kalman, EKF, MCL — was localization.`,
        `**Mapping** = **known pose, build map.** You know exactly where you are (say, a perfect overhead tracker); record what the world looks like from there.`,
      ],
    },
    {
      paragraphs: [
        `For localization, the most common map representation for a mobile robot is the **occupancy grid** (Moravec & Elfes, 1985). Chop the world into a grid of small square cells — say 5 cm each — and store, per cell, **the probability that the cell is occupied** by an obstacle. Not a yes/no, a probability, because — say it with me — every sensor lies, so the map itself is a belief. A cell near 1.0 is almost surely a wall; near 0.0 is almost surely free space you can drive through; near 0.5 is unknown, unexplored. The grid is just a big field of little Bayes filters, one per cell, each fusing every laser ray that ever passed through or stopped in it.`,
        `Building it is mechanical. Each time the LiDAR fires a ray, the ray *passes through* free space and *stops* at a surface. So every cell the ray crosses gets its occupancy probability nudged *down* (evidence of free space), and the cell where the ray terminates gets nudged *up* (evidence of a surface). Sweep the sensor around, integrate thousands of rays, and the walls of a room emerge crisply from the fog of 0.5-grey as cells accumulate consistent evidence. (In practice you do this update in log-odds so the arithmetic is just addition — a tidy trick, but the idea is exactly Bayes per cell.)`,
        `**Worked example.** A cell starts at occupancy 0.5 (unknown). A laser ray passes straight through it and hits a wall beyond — evidence this cell is free — so its probability drops, say to 0.38. Next sweep, another ray passes through: down to 0.28. Ten consistent free-space observations later it's at 0.05: confidently open floor. Meanwhile the cell where those rays *terminate* climbs 0.5 → 0.65 → 0.78 → ... → 0.95: confidently wall. No single reading is trusted; consensus across many is. That's the occupancy grid — a map that is itself a probability distribution, drift-resistant precisely because it's built from evidence, not assertion.`,
      ],
    },
    {
      diagram: {
        id: "rb-5-5",
        caption:
          "A map is a belief too: each cell holds the probability it's occupied, updated by every ray that crosses or stops in it. No single scan is trusted — the walls emerge from consensus.",
      },
    },
    {
      heading: "SLAM: the chicken and the egg",
      paragraphs: [
        `Here's the trap the whole chapter has been walking toward. Localization needs a known map. Mapping needs a known pose. But when a robot rolls into a *building it has never seen*, it has **neither**. No map to localize against, no ground-truth pose to build a map from. You need a map to know where you are, and you need to know where you are to build a map. Chicken, meet egg.`,
        `The resolution is audacious: **do both at once.** **SLAM — Simultaneous Localization and Mapping** — jointly estimates the robot's trajectory *and* the map, each bootstrapping the other. Roughly: use your current best pose to place the latest scan into the map; use the now-slightly-better map to refine your pose; nudge both a little each step so they stay mutually consistent. It's two blind people describing a room to each other and slowly agreeing on its shape. SLAM is the problem that turns a mobile robot from "follows a pre-surveyed route" into "walks into anywhere and figures it out," and it's the technical heart of every self-driving car, warehouse robot, and AR headset you've heard of.`,
        `But there's a villain baked in, and it's our oldest one wearing a new coat. As the robot explores, **error accumulates.** Every pose estimate is relative to the last, riding on imperfect odometry and noisy scans, so each new bit of map is glued onto the previous bit with a tiny error — and those errors, being one robot's consistent little biases, don't cancel. They **compound.** Drive a long straight hall and it comes out slightly bent in your map. Turn a few corners and the map skews. Explore a big building and by the time you're deep inside, your estimated position might be several meters and many degrees off from truth — even though *locally*, every single step looked perfectly consistent. This is Villain #2 (compounding dead-reckoning error) scaled up to an entire trajectory and an entire map. Local consistency, global disaster. SLAM's central drama is fighting this accumulation.`,
      ],
    },
    {
      quiz: {
        question:
          "A SLAM robot drives down a 50 m corridor, and each 1 m step it takes adds a tiny random heading error averaging just 0.2°. Intuitively, why does the *far end* of the corridor end up meters off in the map even though every individual step looked nearly perfect?",
        answer:
          "Because heading errors don't just add — they *lever*. A 0.2° error early in the corridor rotates everything that comes after it, so by the far end that small angular slip has been amplified by ~50 m of arm length into a large sideways displacement (roughly 50 m × sin of the accumulated angle). And the errors accumulate: fifty steps each contributing a fraction of a degree can sum to several degrees of total heading drift, and several degrees over 50 m is meters of position error. Each step is individually tiny and locally consistent — nothing looks wrong up close — but the compounding of relative estimates means the *global* map bends and skews. This is exactly why SLAM cannot rely on stitching relative poses alone; it needs some way to catch and correct the accumulated drift, which is the next section.",
      },
    },
    {
      heading: "Loop closure: the single best trick in SLAM",
      paragraphs: [
        `So drift is inevitable — as long as the robot only ever glues new pose onto old pose, error grows without bound. What could possibly break the chain? Only one thing: **an absolute reference, a moment where the robot recognizes a place it has been before.**`,
        `That's **loop closure**, and it is the most important trick in all of SLAM. The robot, deep into a long exploration with a badly drifted estimate, comes back around and *recognizes* a spot it visited an hour ago — "wait, I've *seen* this exact corner before." That recognition is a golden constraint: it says the pose *here-and-now* and the pose *back-then* are actually the **same physical place**, even though the drifted trajectory has them meters apart on the map. Enforcing that single "these two must coincide" constraint lets you **redistribute the accumulated error backward across the entire loop** — the whole bent, skewed trajectory snaps into alignment at once, and the map corrects globally. One recognition heals an hour of drift. It's genuinely one of the most satisfying things to watch in robotics.`,
        `The dominant modern framing that makes this precise is **graph-based SLAM** (pose-graph optimization). Model the problem as a **graph**:`,
      ],
      list: [
        `**Nodes** are robot poses (and sometimes landmarks) — where the robot was at each moment.`,
        `**Edges** are **constraints** between nodes. Consecutive poses are linked by odometry edges ("I moved about this far between these two"). A loop closure adds a special edge linking two *non-consecutive* nodes ("these two are the same place").`,
      ],
    },
    {
      paragraphs: [
        `Each edge is a soft, noisy constraint, and they contradict each other slightly (that's the drift). SLAM's **back-end** then solves one big **optimization**: find the arrangement of all poses that best satisfies *all* the constraints at once — minimize the total disagreement across every edge. Before a loop closure, the graph is a chain that can drift freely; the moment you add a loop-closure edge, that chain becomes a loop that's *pinned at both ends*, and the optimizer pulls the accumulated error taut and spreads it evenly around the loop. That's the snap.`,
        `This exposes the two halves every SLAM system is built from, a split worth memorizing:`,
      ],
      list: [
        `The **front-end** does **data association** (perception): turning raw sensor data into constraints, and crucially *recognizing places* to propose loop closures. "Is this the same corner I saw before?" is a front-end question, and getting it wrong is catastrophic — a **false loop closure** welds two genuinely different places together and warps the whole map irreparably. The front-end is where SLAM systems most often fail.`,
        `The **back-end** does **optimization** (geometry): given the constraints, find the globally most consistent poses and map. This is the pose-graph solver — big, sparse, nonlinear least-squares, and remarkably well-behaved once the front-end feeds it good edges.`,
      ],
    },
    {
      diagram: {
        id: "rb-5-6",
        caption:
          "Recognizing a place you've been before is the master key: one loop-closure constraint pins the drifted loop at both ends, and the optimizer redistributes an hour of accumulated error in a single snap.",
      },
    },
    {
      quiz: {
        question:
          "A SLAM front-end mistakenly decides two different-but-similar hallways are the same place and adds a loop-closure edge between them. What happens when the back-end optimizes, and why is this failure so much worse than simply missing a real loop closure?",
        answer:
          "The back-end treats every edge as a constraint to satisfy, and it has no way to know this one is a lie — so it dutifully tries to make two genuinely different places coincide, dragging and warping the entire surrounding map to honor the false constraint. Because the optimizer spreads error globally, one bad edge doesn't stay local; it can corrupt large regions of an otherwise-good map, folding real geometry on top of itself. Missing a *true* loop closure is far less damaging: you simply keep the drift you already had, which is bad but bounded and recoverable — the next correct closure can still fix it. A *false* closure actively destroys correct information. This asymmetry is exactly why front-end place-recognition is engineered to be conservative and heavily validated: in SLAM, a wrong \"I've been here before\" is more dangerous than a missed one.",
      },
    },
    {
      heading: "Flavors: visual SLAM, LiDAR SLAM, and where it's heading",
      paragraphs: [
        `The Bayes-filter heartbeat and the pose-graph back-end are universal, but the **front-end sensor** splits SLAM into families with very different personalities.`,
        `**LiDAR SLAM** builds the map from laser range scans. It sees precise geometry directly — crisp walls, exact distances — so its maps are metrically excellent and it's robust in the dark or in texture-less rooms where cameras struggle. Classic scan-matching methods and modern systems like **Cartographer** and **LOAM** live here. The catch is the one from Chapter 1: LiDAR sees *shape but not meaning*, historically costs more, and a bare geometric scan of a bland corridor can be hard to recognize for loop closure (one stretch of hallway looks like any other).`,
        `**Visual SLAM** builds the map from cameras. Cameras are cheap, light, and semantically rich, and visual features make **place recognition** for loop closure far easier — you can tell one corner from another by how it *looks*, not just its shape. The landmark system here is **ORB-SLAM** (Mur-Artal, Montiel & Tardós, 2015), which tracks ORB feature points across frames, maintains a keyframe pose-graph, and does robust loop closure by recognizing revisited scenes from their features — a genuinely complete, real-time visual SLAM system that became the reference everyone compares against. Visual SLAM's weaknesses are the camera's: it hates the dark, motion blur, and blank textureless walls, and recovering metric scale from a single camera is its own headache (which is why visual-inertial SLAM fuses in an IMU — Chapter 1's fast-but-drifting inner ear — to nail down scale and survive fast motion). The families increasingly merge: the best modern systems fuse camera, LiDAR, and IMU, letting each cover another's blindness, exactly the fusion lesson from Chapter 1.`,
        `And here's the forward-looking part. Everything above builds *sparse* maps — a scatter of feature points, or a grid of occupancy cells — enough to localize and avoid obstacles, but nothing you'd call a picture of the room. The frontier is **dense, photorealistic mapping**: instead of a point cloud, reconstruct a continuous, view-able model of the whole scene. Two ideas are driving this. **Neural fields** (NeRF-style) encode the scene in the weights of a small neural network you can render novel views from. And **3D Gaussian Splatting** represents the scene as millions of little colored, semi-transparent 3D blobs that render fast and gorgeously — and it's rapidly being folded into SLAM systems that localize *and* build a photorealistic map in one loop. This is a big enough deal that it gets a full treatment in **Chapter 11**; for now, just register the trajectory: SLAM is moving from "a grid of maybe-occupied cells" toward "a living, photorealistic reconstruction the robot can *look around* inside." The predict-widen / update-sharpen heartbeat stays; what it sharpens is getting a lot richer.`,
      ],
    },
    {
      quiz: {
        question:
          "Why does loop closure — the trick that saves SLAM from drift — tend to be *easier* for visual SLAM than for LiDAR SLAM, and what does that tell you about why real systems fuse both?",
        answer:
          "Loop closure hinges on *place recognition*: reliably deciding \"I've been here before.\" Cameras carry rich, distinctive appearance information — the color, texture, and layout of a specific corner — so two views of the same place look unmistakably alike and two different places usually look different, which makes proposing correct loop closures (and rejecting false ones) much easier. A bare LiDAR scan captures only geometry, and lots of places share similar geometry — one straight corridor's scan looks like any other's — so recognizing a revisit from shape alone is genuinely ambiguous. But LiDAR wins on metric precision and works in the dark where cameras fail. So each family is strong exactly where the other is weak: LiDAR nails geometry, vision nails recognition. Fusing them lets the camera propose confident loop closures while the LiDAR keeps the map metrically sharp — the same \"arrange sensors so each covers another's blindness\" principle from Chapter 1, now operating at the level of a whole mapping system.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        `The robot walked in unable to trust a single number, and it walks out with a disciplined way to *not* trust — and to be right anyway. The through-line was one idea repeated at every scale: **represent what you know as a probability distribution, and update it with Bayes' rule.** A belief is a Gaussian (mean = best guess, covariance = doubt), driven by the two-beat **Bayes filter** — **predict** widens it as the robot moves, **update** sharpens it as the robot senses. The **Kalman filter** solves that exactly for linear-Gaussian worlds, with the **Kalman gain** as a trust dial between prediction and measurement; the **EKF** linearizes it for the nonlinear real world, at the cost of linearization error; the **particle filter** abandons the Gaussian entirely for a cloud of samples when belief goes multimodal — the kidnapped robot at one of three doors. Give the robot a **map** (an occupancy grid, itself a belief), and pose-estimation becomes localization. Take the map away and you get **SLAM** — localize and map at once — whose built-in villain is accumulating drift, defeated by the master trick of **loop closure** and the **pose-graph** back-end that redistributes the error, split into a **front-end** that recognizes places and a **back-end** that optimizes geometry.`,
        `This chapter finished the **Sense** beat of Chapter 1's loop: the robot now knows, with honest uncertainty, where it is and what the world around it looks like. That's exactly the input the next beat needs. In **Chapter 6 — Motion Planning & Navigation**, we take this pose and this map and finally answer the second question the robot keeps asking: *where do I go, and how do I get there?* We'll be planning paths through the very configuration space you first met in Fig 1.3 — and every plan will start from the belief this chapter taught the robot to hold.`,
      ],
    },
    {
      paragraphs: [
        `*Prev: Chapter 4 — Control · Next: Chapter 6 — Motion Planning & Navigation*`,
      ],
    },
  ],
};
