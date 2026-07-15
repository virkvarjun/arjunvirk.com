import type { Chapter } from "../chapters";

// The Robotics Bible, Chapter 9.5: an interlude on flow matching and
// diffusion models, written from Holderrieth & Erives, "An Introduction to
// Flow Matching and Diffusion Models" (arXiv 2506.02070). Per the author's
// request this chapter uses a plainer, student-style register: each section
// opens with the high-level idea, then walks into the technical details.
// House rule for this chapter: no em dashes.

export const chapter95: Chapter = {
  slug: "chapter-9-5-flow-matching-diffusion",
  number: "9.5",
  title: "Interlude: Flow Matching & Diffusion Models, From Scratch",
  summary:
    "The generative engine inside modern robot policies, built from zero: ODEs and SDEs, probability paths, the flow matching loss, score functions, and classifier-free guidance.",
  published: "Jul 15, 2026",
  updated: "Jul 15, 2026",
  futureRef:
    "The mathematics in this chapter is settled: probability paths, the marginalization trick, the equivalence of the conditional and marginal losses, and the SDE extension are theorems, not fashions, and the source notes (Holderrieth & Erives, arXiv 2506.02070) will stay a reliable reference. What churns is everything around the math: noise schedules, samplers and step-count tricks, guidance heuristics, and which architecture hosts the vector field. When a new robot policy paper says it uses a 'flow head' or a 'diffusion head', come back here, find which probability path and which sampler it chose, and the paper will usually collapse into one page of actual novelty.",
  sections: [
    {
      paragraphs: [
        `*Chapter 8 waved at diffusion and flow matching. Chapter 9 leaned on them: π0 generates its action chunks with a flow head, and half the policies in Chapter 10 will too. This interlude stops waving and actually builds the machinery, from a single ordinary differential equation up to classifier-free guidance, following the MIT course notes by Holderrieth and Erives (2026).*`,
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        `Here is the one-sentence version of this whole chapter: **modern generative models turn noise into data by following a velocity field, and training them is just regression on that field.** Everything else is detail. But the details are exactly what you need when Chapter 9's π0 says "flow matching action expert" or Chapter 10's Diffusion Policy says "denoising", so let's do this properly.`,
        `The plan, from the ground up. First we agree on what "generate" even means, and the answer will be: sample from a probability distribution. Then we meet the machine that does the sampling, an **ordinary differential equation (ODE)** whose velocity field a neural network will learn, and its noisier sibling, the **stochastic differential equation (SDE)**. Then the real question: what should the network learn? That leads to **probability paths** (a schedule for morphing noise into data), a beautiful dead end (the loss we want is uncomputable), and the escape hatch that makes the whole field work, the **conditional flow matching loss**. After that we re-derive everything through a second lens, **score functions**, which is where diffusion models and their denoising intuition live. And we close with **guidance**, the trick that makes a generative model actually obey a prompt.`,
        `One promise before we start: nothing in this chapter is specific to images. The "objects" we generate are just vectors. For Stable Diffusion the vector is an image. For π0 the vector is a chunk of fifty robot actions. Same math, same training loop, different meaning attached to the numbers.`,
        `I am assuming you have read Chapter 8 (you know what a neural network and a training loss are, and you have seen the words diffusion and flow matching used in anger). Everything else we build here.`,
      ],
    },
    {
      heading: "Generation is sampling",
      paragraphs: [
        `Start at the highest level: what does it mean for a model to "generate" something?`,
        `Think about asking for a picture of a dog. There is no single correct answer. There are billions of acceptable dog pictures, some more dog-like than others. Machine learning formalizes this spread of acceptable answers as a **probability distribution over objects**, written $p_{\\text{data}}$. An object $z$ that looks very dog-like gets high probability; a smear of static gets essentially zero. "Generate a dog picture" then becomes a precise request: **draw a sample $z \\sim p_{\\text{data}}$.** That is the entire definition of generative modeling. A generative model is an algorithm that returns samples from $p_{\\text{data}}$, or at least a good approximation of it.`,
        `Two details matter for everything downstream. First, we never actually know $p_{\\text{data}}$. We only have a **dataset**: a finite pile of examples $z_1, \\dots, z_N$ drawn from it. Every training recipe in this chapter consumes only those samples. Second, objects are **vectors**. An image is a vector of pixel values. A protein structure is a vector of atom coordinates. A robot action chunk is a vector of joint targets stacked over time, which is exactly how Chapters 9 and 10 use all of this. So from here on, $z \\in \\mathbb{R}^d$, and you can mentally substitute "50 future actions" wherever you like.`,
        `Often we also want to generate **conditioned on something**: an image given a caption, an action chunk given a camera view and an instruction. That is sampling from $p_{\\text{data}}(z \\mid y)$, where $y$ is the prompt. Hold that thought; it is the guidance section at the end. For now we build the unconditional machine, because conditioning turns out to be a small modification of it.`,
      ],
    },
    {
      quiz: {
        question:
          `A friend says: "A robot policy isn't a generative model. It's not making art, it's picking an action." Using Chapter 10's preview that demonstrations are multimodal (a demonstrator sometimes goes left around an obstacle and sometimes right), explain why treating action selection as sampling from a distribution is not just legal but necessary.`,
        answer:
          `Because the "correct answer" to an observation is not unique, exactly like the dog picture. Given the same scene, expert demonstrations contain going left AND going right, both valid. A model that outputs one deterministic "best" action tends to average the valid answers, and the average of left and right is straight into the obstacle. Framing the policy as a distribution over actions, and action selection as drawing a sample from it, lets the model keep both modes and commit to one at execution time. That is precisely why Chapter 9's π0 and Chapter 10's Diffusion Policy bolt a generative sampler onto a robot: the sampler is doing the committing.`,
      },
    },
    {
      heading: "Flow models: follow the arrows",
      paragraphs: [
        `High-level idea first. Imagine space filled with little arrows, and imagine dropping a leaf into that space. The leaf drifts wherever the local arrow points, moment after moment, tracing out a smooth path. If someone arranged the arrows cleverly, every leaf you drop, no matter where, ends its journey sitting on your data distribution. That arrow arrangement is the entire model. Generation is: drop a leaf at random, let it drift, collect it at the end.`,
        `Now the same idea with its real names. The arrows are a **vector field** $u_t(x)$: a function that takes a location $x$ and a time $t$ between 0 and 1 and returns a velocity, which way to move and how fast. The leaf's journey is a **trajectory** $X_t$, and "drift wherever the arrow points" is an **ordinary differential equation**:`,
      ],
    },
    {
      equations: [String.raw`\frac{\mathrm{d}}{\mathrm{d}t} X_t = u_t(X_t), \qquad X_0 = x_0`],
    },
    {
      paragraphs: [
        `Reading the symbols: $\\frac{\\mathrm{d}}{\\mathrm{d}t}X_t$ is the velocity of the point at time $t$, and the equation says that velocity must equal what the field $u_t$ prescribes at the point's current location. $X_0 = x_0$ just says where the leaf was dropped. Under mild conditions (which neural networks always satisfy) this equation has exactly one solution per starting point: drop the leaf in the same spot, get the same path, every time. The function that maps a starting point to its position at time $t$ is called the **flow**, which is where "flow model" gets its name.`,
        `**How do you actually compute the path?** You almost never solve the ODE with pen and paper. You simulate it with the **Euler method**, the most honest algorithm in numerical analysis: chop time into $n$ small steps of size $h = 1/n$ and repeatedly take a small step in the arrow's direction,`,
      ],
    },
    {
      equations: [String.raw`X_{t+h} = X_t + h \, u_t(X_t)`],
    },
    {
      paragraphs: [
        `That is it. Look at the arrow where you are, walk a tiny bit that way, look again. Small steps track the true path closely; big steps cut corners and drift off. Fig 9.5.1 lets you feel this: set the step count to 4 and watch particles land sloppily, then set it to 96 and watch them snap onto the targets.`,
        `**And where does learning enter?** A **flow model** makes one substitution: the vector field is a neural network, $u_t^\\theta(x)$, with parameters $\\theta$. Generation then has a fixed recipe. Draw a random starting point $X_0 \\sim p_{\\text{init}}$, where $p_{\\text{init}}$ is a distribution chosen to be trivially easy to sample, almost always a standard Gaussian $\\mathcal{N}(0, I_d)$ (this randomness is what makes an otherwise deterministic ODE produce different samples each run). Then simulate the ODE from $t = 0$ to $t = 1$ with Euler steps, and return $X_1$. The training goal, which we have not yet earned, is to pick $\\theta$ so that $X_1 \\sim p_{\\text{data}}$: noise in, data out.`,
        `(Side note: the network parameterizes the vector field, not the flow itself. To get a sample you must actually run the simulation, step by step. This is why sampling speed is counted in "number of function evaluations" and why Chapter 9 cared that flow-based action heads need only a handful of integration steps.)`,
      ],
    },
    {
      diagram: {
        id: "rb-95-1",
        caption:
          "A vector field is a complete instruction manual for motion: particles just follow the arrows, and with the right field, following the arrows carries pure noise onto the data. Fewer Euler steps means sloppier landings, which you can measure in the readout.",
      },
    },
    {
      quiz: {
        question:
          "The Euler method with n = 4 steps needs only 4 network evaluations per sample, and n = 96 needs 96. A robot control loop gives you a tight compute budget. What exactly do you sacrifice by running the sampler at n = 4, and why does the flow matching literature (and π0's designers) care so much about fields whose trajectories are nearly straight?",
        answer:
          "Euler's error comes from pretending the arrow is constant across each step: it walks a straight segment while the true path curves. The sacrifice at n = 4 is integration accuracy, so samples land near, but not on, the distribution the field was trained to produce, and quality degrades. But if the field's true trajectories are nearly straight lines, a straight-segment approximation is barely an approximation at all, so even 4 big steps land almost exactly right. That is why straight-path training targets matter: they buy you cheap, few-step sampling, which is the difference between a policy that can act at control-loop rates and one that cannot.",
      },
    },
    {
      heading: "Diffusion models: add noise on purpose",
      paragraphs: [
        `Big picture: a flow model is a leaf drifting in a perfectly still pond. A **diffusion model** is the same leaf in a pond with wind. The drift is still there, pushing the leaf where the arrows point, but every instant also adds a random shove. Surprisingly, this randomness is not a defect. It gives the model different failure modes and, as we will see later, you can add it or remove it after training, for free.`,
        `To make "random shove" precise we need the fundamental noisy process, **Brownian motion** $W_t$. Think of it as a continuous random walk: it starts at zero, its increments over disjoint time intervals are independent, and each increment is Gaussian with variance proportional to elapsed time, $W_t - W_s \\sim \\mathcal{N}(0, (t - s) I_d)$. You can simulate it with one line: at each step of size $h$, add $\\sqrt{h}$ times a fresh standard Gaussian. The $\\sqrt{h}$ is the signature of diffusion; variances add linearly in time, so standard deviations grow like the square root.`,
        `A **stochastic differential equation (SDE)** is an ODE with a Brownian term stapled on. In the standard notation,`,
      ],
    },
    {
      equations: [String.raw`\mathrm{d}X_t = u_t(X_t)\,\mathrm{d}t + \sigma_t\,\mathrm{d}W_t`],
    },
    {
      paragraphs: [
        `Reading the symbols: the first term is the same old drift, "walk where the arrow points". The second term says "then get shoved by noise", with the **diffusion coefficient** $\\sigma_t$ setting the shove's strength at time $t$. Set $\\sigma_t = 0$ and you recover the ODE exactly, so flows are a special case of diffusions. The simulation recipe, called **Euler-Maruyama**, is Euler plus the shove: $X_{t+h} = X_t + h\\,u_t(X_t) + \\sigma_t \\sqrt{h}\\,\\epsilon_t$ with $\\epsilon_t \\sim \\mathcal{N}(0, I_d)$ drawn fresh each step.`,
        `A worked miniature you can check by eye in Fig 9.5.2: take drift $u(x) = -\\theta x$, which always points back toward zero, plus noise $\\sigma$. This is the **Ornstein-Uhlenbeck process**. With $\\sigma = 0$ every trajectory decays smoothly to zero, a pure flow. With $\\sigma > 0$ trajectories jitter around zero forever and settle into a permanent cloud whose width is exactly $\\sigma / \\sqrt{2\\theta}$. The figure measures the spread of its twelve trajectories and prints it next to that formula, so you can watch a theorem come true.`,
        `A **diffusion model**, then, is the generative recipe with the network in the drift seat: draw $X_0 \\sim p_{\\text{init}}$, simulate $\\mathrm{d}X_t = u_t^\\theta(X_t)\\mathrm{d}t + \\sigma_t \\mathrm{d}W_t$ to $t = 1$, return $X_1$. The open question is unchanged, and it is the important one: **what should $u_t^\\theta$ be trained to equal?** Neither the ODE nor the SDE picture answers that. The next two sections do.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-2",
        caption:
          "One knob separates a flow from a diffusion: with σ = 0 the drift produces smooth, repeatable trajectories, and every increase of σ pours in Brownian jitter whose stationary spread lands exactly on the σ/√(2θ) the theory predicts.",
      },
    },
    {
      quiz: {
        question:
          "Your teammate simulates an SDE and, hunting a bug, replaces the noise term σ√h·ε with σh·ε (h instead of √h). The simulation looks fine for h = 0.1 but the noise mysteriously vanishes as they refine the step size. What happened?",
        answer:
          "Brownian increments have variance proportional to elapsed time, so over a step of length h the shove must have standard deviation σ√h. With the correct √h scaling, the total injected variance across the run is σ² regardless of how finely you chop time. With the buggy h scaling, each step's variance is σ²h², so the total variance across n = 1/h steps is σ²h, which shrinks to zero as h does. The bug silently turns the diffusion back into a flow in the small-step limit, which is exactly what they observed.",
      },
    },
    {
      heading: "The probability path: deciding what the in-between looks like",
      paragraphs: [
        `Step back and look at what we are asking the model to do: start at noise ($t = 0$) and end at data ($t = 1$). We have said nothing about the middle. The insight that unlocks training is to **choose the middle ourselves**. We will write down, explicitly, a family of distributions $p_t$ that starts at $p_{\\text{init}}$, ends at $p_{\\text{data}}$, and morphs smoothly in between. That family is called a **probability path**, and once we have one, "train the model" becomes "make the model's trajectories march along this path", a concrete target instead of a vague wish.`,
        `The construction happens in two moves, and the first one looks weird until it doesn't. **Move one: solve the problem for a single data point.** Fix one example $z$ from the dataset and define the **conditional probability path** $p_t(\\cdot \\mid z)$: a morph that starts at noise and ends collapsed onto that single point $z$. The standard choice, used by essentially every large model, is the **Gaussian probability path**:`,
      ],
    },
    {
      equations: [String.raw`p_t(\cdot \mid z) = \mathcal{N}\!\left(\alpha_t z,\; \beta_t^2 I_d\right)`],
    },
    {
      paragraphs: [
        `Reading the symbols: $\\alpha_t$ and $\\beta_t$ are the **noise schedulers**, two smooth increasing/decreasing dials with $\\alpha_0 = 0, \\beta_0 = 1$ (at $t = 0$ you have pure noise) and $\\alpha_1 = 1, \\beta_1 = 0$ (at $t = 1$ you have exactly $z$). Sampling from this path is one line: draw noise $\\epsilon \\sim \\mathcal{N}(0, I_d)$ and output $x = \\alpha_t z + \\beta_t \\epsilon$, a weighted blend of the data point and the noise. The simplest scheduler, $\\alpha_t = t$ and $\\beta_t = 1 - t$, is called the **CondOT path**, and it is the one π0 uses: $x = t z + (1-t)\\epsilon$, literally a straight line from noise to data. Every figure in this chapter runs on it.`,
        `**Move two: average over the dataset.** The **marginal probability path** is what you get when the data point itself is random: first draw $z \\sim p_{\\text{data}}$, then sample from $p_t(\\cdot \\mid z)$. At $t = 0$ this is still pure noise; at $t = 1$ it is the full data distribution, because "pick a data point, then collapse onto it" is exactly sampling from the data. The marginal path is the thing we actually want our model to follow. Notice the asymmetry that will drive the whole next section: the conditional path is simple and fully known, while the marginal path is easy to *sample* from but impossible to write down (its density is an integral over the entire dataset).`,
        `Fig 9.5.3 shows both, side by side, computed from the same formula: the left cloud collapses onto one chosen point, the right cloud resolves into the whole dataset, and the $\\alpha_t, \\beta_t$ dials tick in the readout as you scrub $t$.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-3",
        caption:
          "The same interpolation x = t·z + (1−t)·ε, seen two ways: conditioned on one data point it collapses to that point, and averaged over the dataset it morphs noise into the entire data distribution. Training targets come from the left panel; the behavior we want comes from the right.",
      },
    },
    {
      quiz: {
        question:
          "At t = 0 the conditional path p_t(·|z) is N(0, I) for every single data point z. So at t = 0 the marginal path is also N(0, I), no matter what the dataset is. Why is this boring-sounding fact load-bearing for the whole enterprise?",
        answer:
          "Because it guarantees that the starting distribution of the generative process is something we can actually sample at inference time without knowing anything about the data. The entire recipe is: draw X0 from p_init and integrate to t = 1. If the t = 0 end of the path depended on the dataset, we would need the data distribution just to start sampling, which is circular. The scheduler conditions α0 = 0, β0 = 1 are exactly what pins the start of every conditional path, and hence the marginal path, to the same known Gaussian. The interesting, unknown structure all lives at the t = 1 end, which is precisely the end the model must learn to reach.",
      },
    },
    {
      heading: "Flow matching: regression on velocities",
      paragraphs: [
        `Now the payoff section. High level: we know where trajectories should be at every time (the probability path). Training should therefore be "make the network's velocity field push points along that path". That is a regression problem. The only obstacle is that the regression target seems uncomputable, and the escape from that obstacle is the single most important trick in this chapter.`,
        `First, the target. For the Gaussian conditional path there is an explicit velocity field that carries noise onto the single point $z$; you can derive it with two lines of calculus, and for the CondOT schedule it is wonderfully simple. If $x$ sits somewhere at time $t$, the velocity that keeps it on the straight noise-to-$z$ line is`,
      ],
    },
    {
      equations: [String.raw`u_t^{\text{target}}(x \mid z) = \frac{z - x}{1 - t}`],
    },
    {
      paragraphs: [
        `Reading it: aim directly at $z$, with speed scaled so you arrive exactly at $t = 1$. This is the **conditional vector field**, and it is fully known, no learning required. Of course, on its own it is useless: it regenerates the data point you already had.`,
        `The magic is the **marginalization trick** (Theorem 9 in the notes): if you average the conditional fields of every data point, weighting each by the posterior probability that $x$ came from that point (a Bayes' rule weighting, "given that I am at $x$ at time $t$, which $z$ was I probably headed to?"), you get the **marginal vector field**, and its ODE provably transports $p_{\\text{init}}$ into $p_{\\text{data}}$ along the marginal path. (The proof runs through the **continuity equation**, the same conservation law that governs fluid flow: probability mass is conserved, so the rate of change of density equals the negative divergence of the probability flux. It is three lines of algebra once you have that language, and the notes spell it out.) The figures in this chapter can draw exact fields precisely because, for a small point dataset, this posterior average is directly computable.`,
        `So the ideal training loss writes itself: the **flow matching loss**. Sample a time and a point along the marginal path, and regress the network onto the marginal field,`,
      ],
    },
    {
      equations: [
        String.raw`\mathcal{L}_{\mathrm{FM}}(\theta) = \mathbb{E}_{t,\, x \sim p_t}\left[\left\| u_t^\theta(x) - u_t^{\text{target}}(x) \right\|^2\right]`,
      ],
    },
    {
      paragraphs: [
        `And here is the dead end: for a real dataset, $u_t^{\\text{target}}(x)$ is that posterior-weighted average over the *entire dataset*, recomputed for every training point. Uncomputable at scale. It looks like the whole plan collapses.`,
        `The escape (Theorem 12 in the notes, and the reason the field exists) is to regress on the **conditional** field instead, the one we can write in closed form. Define the **conditional flow matching loss**:`,
      ],
    },
    {
      equations: [
        String.raw`\mathcal{L}_{\mathrm{CFM}}(\theta) = \mathbb{E}_{t,\, z \sim p_{\text{data}},\, x \sim p_t(\cdot \mid z)}\left[\left\| u_t^\theta(x) - u_t^{\text{target}}(x \mid z) \right\|^2\right]`,
      ],
    },
    {
      paragraphs: [
        `The theorem says: $\\mathcal{L}_{\\mathrm{FM}}$ and $\\mathcal{L}_{\\mathrm{CFM}}$ differ by a constant that does not depend on $\\theta$, so **their gradients are identical**. Training on the cheap conditional loss is *exactly* training on the impossible marginal loss. The network, forced to output one velocity per location while being fed many conflicting conditional targets there, settles on their posterior-weighted average, which is precisely the marginal field. Nobody tells it to average; least squares does that automatically.`,
        `Written out for the CondOT path, the whole training loop is embarrassingly small. Sample a data point $z$, noise $\\epsilon$, and a time $t$. Form the blend $x = t z + (1 - t)\\epsilon$. Compute the loss $\\| u_t^\\theta(x) - (z - \\epsilon) \\|^2$ and take a gradient step. That is the entire algorithm behind Stable Diffusion 3, Meta's Movie Gen, and π0's action expert. The target velocity is just $z - \\epsilon$, the straight-line direction from the noise you drew to the data you drew.`,
        `A worked number, one dimension, so nothing hides: say the data point is $z = 4$ and the noise draw is $\\epsilon = -2$. Then the training pair at $t = 0.5$ is the input $x = 0.5 \\cdot 4 + 0.5 \\cdot (-2) = 1$, with regression target $z - \\epsilon = 6$. And a sanity check shows why 6 is right: a point traveling at constant velocity 6 starting from $-2$ covers distance 6 in unit time and lands at $4 = z$, exactly on the data. One Euler step of size 1 gets there in a single jump because the path is straight.`,
        `Notice what is absent from that loop: simulation. Training never integrates the ODE, never runs the sampler, never generates anything. People call this **simulation-free** training, and it is why the method scales: each training step costs one forward pass, like ordinary supervised learning. Fig 9.5.4 makes all of this concrete by actually doing it in your browser: a 150-parameter model, real SGD on the real conditional flow matching loss, and you can watch the loss fall, the field organize itself, and samples start landing on the data.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-4",
        caption:
          "Flow matching training, actually running: every step regresses the model's field toward (z − ε) on a random blend point, and the posterior-averaging behavior of least squares assembles the marginal field on its own. The loss curve, the field arrows, and the sample landings are all computed live.",
      },
    },
    {
      quiz: {
        question:
          "At a location x where two data points are both plausible origins, the conditional targets z₁ − ε and z₂ − ε disagree, sometimes wildly. The CFM loss feeds the network both targets at the same input. Why doesn't this contradiction wreck training, and what does the network end up outputting there?",
        answer:
          "A least-squares regressor fed conflicting targets for the same input does not oscillate or break; its optimum is the conditional mean of the targets. Here that mean is the posterior-weighted average of the conditional velocities, weighted by how likely each data point is as the origin of x at time t. That average is, by the marginalization trick, exactly the marginal vector field, which is the thing we actually wanted but could not compute. So the contradiction is the mechanism: the impossible target is manufactured, at every point in space, by the statistics of the noisy conditional targets. Early in the path, where many data points are plausible, the field points at a blur of the dataset; late in the path the posterior sharpens and the field commits to one mode.",
      },
    },
    {
      heading: "Scores, denoising, and where 'diffusion model' comes from",
      paragraphs: [
        `Everything so far trained a velocity field and sampled with a deterministic ODE. But the papers that started this field (and Chapter 10's Diffusion Policy) speak a different dialect: noise prediction, denoising, score functions, stochastic samplers. High-level reassurance first: **it is the same machinery in different clothes.** This section is the translation guide, plus one genuinely new capability.`,
        `The central object of the diffusion dialect is the **score function**, $\\nabla \\log p_t(x)$: the gradient of the log-density of the probability path. Intuition: at every point, the score is an arrow pointing "uphill" toward higher probability. Noised-up samples sit downhill; the score tells you which way clean data lies. For the Gaussian conditional path the score has a tiny closed form, $\\nabla \\log p_t(x \\mid z) = -(x - \\alpha_t z)/\\beta_t^2$, which points straight from $x$ back toward (the scaled) $z$. And the marginal score obeys the same posterior-averaging rule as the marginal velocity field, so everything we just learned transfers.`,
        `Train it the same way too: **denoising score matching** regresses a network $s_t^\\theta(x)$ onto the conditional score, and the identical constant-difference theorem holds, so the cheap conditional loss has the same gradients as the impossible marginal one. Plug in the Gaussian formula and the target becomes $-\\epsilon / \\beta_t$: the network is literally being trained to point away from the noise that was added, which is why people say diffusion models "learn to denoise". The numerically stable variant drops the $1/\\beta_t$ and predicts the noise itself, $\\epsilon_t^\\theta(x) \\approx \\epsilon$; that choice, made in the DDPM paper (Ho et al., 2020), is the "noise prediction network" you will see in every diffusion codebase, including robot ones.`,
        `Here is the punchline that unifies the dialects. For Gaussian paths, the marginal velocity field and the marginal score are two linear functions of the same underlying quantity (the posterior mean of $z$ given $x$), so **each is recoverable from the other with a one-line formula** (Proposition 1 in the notes). Learn a flow, get the score for free. Learn a denoiser, get the flow for free. Velocity-prediction, noise-prediction, score-prediction, denoiser-prediction: four parameterizations of one object.`,
        `And the new capability the score buys: the **SDE extension trick** (Theorem 17). Take the trained ODE and add any amount of noise, compensated by a score-following correction term,`,
      ],
    },
    {
      equations: [
        String.raw`\mathrm{d}X_t = \left[u_t^{\text{target}}(X_t) + \frac{\sigma_t^2}{2} \nabla \log p_t(X_t)\right] \mathrm{d}t + \sigma_t\, \mathrm{d}W_t`,
      ],
    },
    {
      paragraphs: [
        `and the marginal distributions $p_t$ are *unchanged*, for **any** noise level $\\sigma_t \\geq 0$ you pick after training. Reading the correction term: the injected noise constantly kicks samples downhill off the path, and the extra $\\frac{\\sigma_t^2}{2}\\nabla\\log p_t$ drift constantly herds them back uphill, in exact balance. (Set the path to be constant in time and this becomes **Langevin dynamics**, the classic sampler that MCMC and molecular dynamics run on. Diffusion sampling is Langevin dynamics sliding along a moving target.)`,
        `So "flow model versus diffusion model" is not a training decision at all; it is a *sampling* decision, one dial you can turn at inference time. In theory every $\\sigma_t$ gives the same distribution; in practice the model is imperfect, and noise can help shake samples off errors (at the price of needing more, smaller steps). Fig 9.5.5 draws both samplers from the same exact field in 3D, space horizontal and time rising upward: the ODE paths are smooth ribbons, the SDE paths are jagged threads, and both funnels land on the same data.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-5",
        caption:
          "One trained object, two samplers: deterministic ODE ribbons and jagged SDE threads climb from the noise floor at t = 0 to the same data points at t = 1, because the score-correction term exactly cancels the injected noise in distribution. The measured path lengths differ; the destinations do not.",
      },
    },
    {
      quiz: {
        question:
          "Your lab trained a flow matching policy (velocity prediction, ODE sampling). A reviewer asks for 'the diffusion version' as a baseline. How much retraining does that actually require, and what is the honest answer about which will perform better?",
        answer:
          "Zero retraining, for Gaussian paths. The velocity field and the score are interconvertible by a linear formula, so the trained network already contains the score. 'The diffusion version' is just the SDE extension: add σ dW and the (σ²/2)·score correction at sampling time, using any σ you like. In exact theory both samplers produce identical marginals, so neither is better; in practice they differ only through approximation and simulation error. The ODE needs fewer steps (great for control rates); the SDE's noise can average out model bias and sometimes samples more robustly, but demands smaller steps as σ grows. The right answer is an empirical sweep over σ, and the reviewer's 'two different methods' are really one model with a knob.",
      },
    },
    {
      heading: "Guidance: making the model listen",
      paragraphs: [
        `Everything so far generates *something* from the data distribution. Almost always you want *something specific*: an image matching a caption, an action chunk for the current camera view and instruction. High level: conditioning is easy to bolt on, and then there is one strange, load-bearing trick, classifier-free guidance, that makes conditioning actually bite.`,
        `The easy part is **vanilla guidance**: hand the prompt $y$ to the network as an extra input, $u_t^\\theta(x \\mid y)$, and train exactly as before with (data, prompt) pairs sampled together. Nothing else changes; the conditional flow matching loss just carries $y$ along. For a robot policy, $y$ is the observation and the language command, which is precisely how the VLA heads of Chapter 9 consume it.`,
        `The strange part: models trained this way empirically under-obey the prompt. The fix comes from a Bayes' rule decomposition of the guided score: $\\nabla \\log p_t(x \\mid y) = \\nabla \\log p_t(x) + \\nabla \\log p_t(y \\mid x)$, an unconditional term plus a "does $x$ match the prompt" term. If the model under-weights the prompt, amplify that second term with a **guidance scale** $w > 1$. Early systems trained a separate noised-data classifier to supply $\\nabla \\log p_t(y \\mid x)$ (**classifier guidance**); the modern move eliminates it with algebra. Substituting the decomposition back into itself gives **classifier-free guidance** (Ho & Salimans, 2022):`,
      ],
    },
    {
      equations: [
        String.raw`\tilde{u}_t(x \mid y) = (1 - w)\, u_t^{\text{target}}(x \mid \varnothing) + w\, u_t^{\text{target}}(x \mid y)`,
      ],
    },
    {
      paragraphs: [
        `Reading the symbols: $u_t(x \\mid y)$ is the prompted field, $u_t(x \\mid \\varnothing)$ is the unprompted field ($\\varnothing$ means "no prompt"), and $w$ linearly extrapolates *past* the prompted field, away from the unprompted one. At $w = 1$ this is exactly vanilla conditioning. At $w > 1$ it exaggerates whatever the prompt contributes. And you do not need two networks: during training, randomly replace the prompt with $\\varnothing$ some fraction of the time (10 percent is typical), so one network learns both fields. At sampling time, run it twice per step (once with the prompt, once without) and blend.`,
        `Be clear about what CFG is: a **heuristic**. For $w > 1$ the samples no longer follow the true conditional distribution; adherence to the prompt goes up while diversity goes down, and pushed hard it collapses variety entirely. Essentially every image you have seen from a modern generator used $w \\geq 4$, cheerfully trading distributional correctness for "does what I asked". Fig 9.5.6 puts the tradeoff on instruments: crank $w$ and watch the measured adherence climb toward 100 percent while the measured diversity of the sample cloud shrinks.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-6",
        caption:
          "Classifier-free guidance is a volume knob on the prompt: w = 0 ignores it, w = 1 is honest conditioning, and w > 1 extrapolates past the conditional field, buying measured adherence at a measured cost in diversity.",
      },
    },
    {
      quiz: {
        question:
          "Image generators run classifier-free guidance at w = 4 or higher. Robot action heads like π0's typically run at w = 1 (plain conditioning) or skip the unconditional pass entirely. Using what w > 1 actually does to the sampling distribution, argue why cranking guidance is the right call for art and a dubious one for actions.",
        answer:
          "At w > 1 the sampler no longer draws from the learned conditional distribution; it exaggerates the prompt direction and collapses diversity toward stereotyped, high-adherence outputs. For images that is usually the point: the user wants an unmistakable corgi, and losing the weird tails of the distribution reads as quality. For a robot, the learned conditional distribution IS the calibrated policy: its spread encodes the demonstrators' valid strategies and the model's honest uncertainty. Extrapolating past it produces action chunks from a distribution nobody trained or validated, sharpening toward a caricature of the average demonstration, and on hardware that means confidently wrong motions rather than vivid ones. There is also a cost argument: CFG doubles network evaluations per step, which a control loop can rarely afford. So the knob that flatters pixels degrades physical trust, and robot stacks mostly leave it at 1.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        `The whole chapter in five sentences. Generation means sampling from $p_{\\text{data}}$, and the sampler is a differential equation: an ODE if you like determinism, an SDE if you add noise, with a neural network supplying the velocity field. You choose a probability path (almost always the Gaussian one, often the straight-line CondOT schedule) that morphs noise into data, and the marginalization trick turns "follow that path" into a computable regression: the conditional flow matching loss, whose gradients provably equal the loss you actually wanted. The score-function dialect (denoising, noise prediction, DDPM) is the same object in different coordinates, and it unlocks the SDE extension: one trained network, a family of samplers, noise level chosen at inference time. Guidance conditions the whole machine on a prompt, and classifier-free guidance is the heuristic that makes conditioning forceful, trading diversity for adherence.`,
        `Now reread two things from earlier chapters with new eyes. Chapter 9's π0: "a flow matching action expert that integrates a learned velocity field from noise to a 50-step action chunk in about ten steps" is now a sentence where every word has a formula behind it, including why ten steps suffice (straight CondOT paths forgive big Euler steps). Chapter 10's Diffusion Policy, coming next: "denoising diffusion over trajectories" is the score dialect of the same machine, ε-prediction and all. The two-page appendix of most robot-learning papers just became readable.`,
        `What we skipped, honestly: the source notes (Holderrieth & Erives, 2026, arXiv 2506.02070, with lectures and labs at diffusion.csail.edu) go on to cover the engineering of large-scale image and video generators (U-Net and DiT architectures, latent-space VAEs, the Stable Diffusion 3 and Movie Gen recipes) and discrete diffusion for language. None of that changes the math above; it changes what the vector field's network looks like and what space it runs in. When a robotics paper says "latent diffusion", it means this same machinery running inside an autoencoder's compressed space.`,
        `*Next: back to the main line. Chapter 10 asks where the demonstrations that feed all of this actually come from, and why collecting them is the real bottleneck.*`,
      ],
    },
  ],
};
