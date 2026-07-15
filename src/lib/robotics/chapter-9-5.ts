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
    "The generative engine inside modern robot policies, built from zero: ODEs and SDEs, probability paths, the flow matching loss, score functions, guidance, the networks and latent spaces that host it all, and why a VLA is sure about now and vague about later.",
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
        `The plan, from the ground up. First we agree on what "generate" even means, and the answer will be: sample from a probability distribution. Then we meet the machine that does the sampling, an **ordinary differential equation (ODE)** whose velocity field a neural network will learn, and its noisier sibling, the **stochastic differential equation (SDE)**. Then the real question: what should the network learn? That leads to **probability paths** (a schedule for morphing noise into data), a beautiful dead end (the loss we want is uncomputable), and the escape hatch that makes the whole field work, the **conditional flow matching loss**. After that we re-derive everything through a second lens, **score functions**, which is where diffusion models and their denoising intuition live, and we pick up **guidance**, the trick that makes a model obey a prompt.`,
        `Then, because "a neural network supplies the velocity field" is a sentence hiding a lot of decisions, we open the box: the **architectures** that host the field (and the conditioning trick that robots reuse), the **latent space** trick that makes megapixel generation affordable at all, and how **Stable Diffusion 3** and **Meta's Movie Gen** are assembled from exactly these parts. We take one detour into the **discrete** version of the whole story, because that is secretly where Chapter 9's FAST action tokens live. And we finish where a robotics guide should: taking a real **flow-matching VLA** apart, and looking at the one thing a robot's generative model does that an image generator never has to, which is tell you honestly that it knows what to do right now and has no idea what it will be doing in two seconds.`,
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
      heading: "Opening the box: what the network actually is",
      paragraphs: [
        `Up to here the neural network has been a black box that we simply call $u_t^\\theta(x \\mid y)$. Time to open it, because two of the design choices inside turn out to be exactly the choices a robot policy makes.`,
        `Start by counting inputs. The network takes **three** things: the current noisy point $x$, the time $t$, and the conditioning $y$. It returns **one** thing: a velocity of the same shape as $x$. For the toy datasets in this chapter's figures, a plain multi-layer perceptron with all three concatenated is genuinely enough. For images, video, or robot actions, it is not, and the interesting question becomes *how* the time and the prompt get inside.`,
        `**Embedding the time.** You could feed the raw scalar $t$ into the network. In practice almost nobody does, because one number among thousands of activations is a whisper the network struggles to hear, and the velocity field's dependence on $t$ is sharp (remember the $1/(1-t)$ in the CondOT field). The standard fix is **Fourier features**: expand $t$ into a bank of sines and cosines at geometrically spaced frequencies,`,
      ],
    },
    {
      equations: [
        String.raw`\mathrm{TimeEmb}(t) = \sqrt{\tfrac{2}{d}}\Big[\cos(2\pi w_1 t),\, \dots,\, \cos(2\pi w_{d/2} t),\, \sin(2\pi w_1 t),\, \dots,\, \sin(2\pi w_{d/2} t)\Big]^\top`,
      ],
    },
    {
      paragraphs: [
        `Reading the symbols: $d$ is the embedding width, and the frequencies $w_i$ are spaced geometrically from $w_{\\min}$ to $w_{\\max}$, so low frequencies carry the coarse "where are we in the schedule" signal and high frequencies resolve fine differences. The $\\sqrt{2/d}$ out front makes the embedding unit-norm, since $\\sin^2 + \\cos^2 = 1$, which is a free sanity check you can watch in Fig 9.5.7. If this smells like the positional encodings from Chapter 8's transformer section, that is because it is the same trick aimed at a different axis: there it told the model *where in the sequence* a token sat, here it tells the model *where in the noise-to-data schedule* it is.`,
        `**Embedding the prompt.** For a class label, learn one embedding vector per class and be done. For text, lean on a frozen pretrained encoder: **CLIP** (Chapter 8's contrastive model) gives one coarse vector for the whole caption, while a text transformer such as **T5-XXL** gives a *sequence* of embeddings the model can attend to piecewise. Large systems commonly concatenate several such encoders to get both the gist and the granularity.`,
        `**The two architectures.** Whatever supplies the field must map an input to an output *of the same shape*, which rules out the funnel-shaped classifier stacks you may be used to. Two designs dominate. The **U-Net** is a convolutional encoder that shrinks spatial size while growing channels, a processing block at the bottleneck, and a decoder that expands back up, with residual connections bridging matching levels; its output is image-shaped by construction. The **diffusion transformer (DiT)** is Chapter 8's ViT pointed at generation: chop the input into patches, embed them as tokens, run attention layers, then "depatchify" back to the original shape.`,
        `**And now the choice that matters for robots.** Inside a DiT block, how do $t$ and $y$ actually reach the computation? The lazy answer is to concatenate them to the input once at the front, which means the signal must survive being passed down through every layer, and it fades. The standard answer is **adaptive normalization (AdaLN)**: push the time embedding through a small MLP to produce a per-channel scale and shift, $(\\gamma, \\beta) = g(\\tilde{t})$, and use them to modulate the normalized activations *inside every block*:`,
      ],
    },
    {
      equations: [String.raw`\mathrm{AdaNorm}(x) = (1 + \gamma) \odot \mathrm{Norm}(x) + \beta`],
    },
    {
      paragraphs: [
        `Reading it: $\\mathrm{Norm}$ is the usual layer normalization, $\\odot$ is elementwise multiplication, and $\\gamma, \\beta$ are computed fresh from the timestep. Because they are injected at every block, the conditioning never has to survive a long journey. It is re-stated at every layer, so the deepest layer knows what time it is just as clearly as the first. Prompts typically enter alongside via cross-attention.`,
        `Hold onto AdaLN. When we get to π0.5 in a few sections, we will find it making exactly this choice under a slightly different name, and for exactly this reason. Fig 9.5.7 lets you watch the difference: flip to concatenation and the conditioning signal visibly decays through the stack while the readout counts it down, flip to adaptive normalization and it arrives at full strength everywhere.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-7",
        caption:
          "The vector field is a network with three inputs, and how the time and prompt get in is a real design decision: concatenating them once lets the signal fade with depth, while adaptive normalization restates it inside every block.",
      },
    },
    {
      quiz: {
        question:
          "The Fourier time embedding is built to have norm exactly 1 for every t, and the paper notes this exact form is convenient rather than necessary. Given that the CondOT velocity field contains a 1/(1−t) factor that blows up near t = 1, why would feeding the raw scalar t make the network's job harder, and what does the frequency bank buy?",
        answer:
          "The field's dependence on t is highly non-linear and gets sharper as t approaches 1, so the network must resolve small differences in t into large differences in output. A raw scalar gives it one weak, slowly-varying input from which it must synthesize that sharp dependence itself, using up capacity. The Fourier bank hands it a rich, already-non-linear code where nearby times are far apart in embedding space, especially at the high frequencies, so distinguishing t = 0.97 from t = 0.99 is easy rather than a thing to be learned. The unit norm keeps the conditioning signal at a consistent scale across the whole schedule, so no region of time silently dominates the activations. It is the same reason positional encodings beat feeding a raw token index.",
      },
    },
    {
      heading: "Working in latent space: compress first, generate second",
      paragraphs: [
        `Here is a problem you hit immediately at real resolutions. A $1024 \\times 1024$ RGB image is a vector of about **3.1 million** numbers. Our flow model's output has to be *the same size as its input*, so there is no funneling down to a small head like a classifier does. Simulating an ODE in three million dimensions, dozens of steps per sample, is not a thing you want to pay for.`,
        `The fix is the observation that real images do not fill that space. They cluster near a much lower-dimensional manifold inside it. So: **compress first, generate in the small space, decompress at the end.** Train an **autoencoder**, an encoder $\\mu_\\phi$ that maps an image to a small latent $z$ and a decoder $\\mu_\\theta$ that maps it back, with a reconstruction loss pulling $\\mu_\\theta(\\mu_\\phi(x))$ toward $x$. Downsample by a factor of 16 with 4 latent channels and those 3.1 million numbers become about **16,000**, a compression of roughly **192 times**. Now the ODE is affordable.`,
        `But a plain autoencoder has a subtle failure. Nothing constrains what the latent distribution *looks like*. You may have compressed the data and simultaneously turned it into a jagged, disconnected mess that is harder to model than what you started with. You solved the size problem and created a shape problem.`,
        `The **variational autoencoder (VAE)** fixes the shape by making the encoder probabilistic and regularizing it toward a distribution we like. The encoder outputs a Gaussian, $q_\\phi(z \\mid x) = \\mathcal{N}(\\mu_\\phi(x), \\sigma_\\phi^2(x))$, and we add a penalty pulling that Gaussian toward the standard prior $\\mathcal{N}(0, I)$, measured with the **Kullback-Leibler divergence**. The full objective is`,
      ],
    },
    {
      equations: [String.raw`\mathcal{L}_{\mathrm{VAE}}(\phi, \theta) = \mathcal{L}_{\mathrm{Recon}}(\phi, \theta) + \beta\, \mathbb{E}_{x}\big[D_{\mathrm{KL}}(q_\phi(\cdot \mid x)\, \|\, \mathcal{N}(0, I))\big]`],
    },
    {
      paragraphs: [
        `Reading the symbols: the first term says latents must decode back into the original image, and the second says the cloud of latents must look like a standard Gaussian. $\\beta$ sets the exchange rate between the two. They genuinely fight: the reconstruction term wants latents spread out and distinctive, the KL term wants them piled into a tidy Gaussian ball. Push $\\beta$ too high and you get **posterior collapse**, where the encoder gives up and outputs the prior no matter the input, so reconstructions turn to mush; a common remedy is **KL warm-up**, starting $\\beta$ at zero and easing it in. In modern image autoencoders $\\beta$ is kept very small. For diagonal Gaussians the KL has a closed form worth seeing, because it makes the "be like a Gaussian" pressure concrete: it penalizes the mean for being away from zero and the variance for being away from one.`,
        `One mechanical wrinkle: the loss takes an expectation over $z \\sim q_\\phi(z \\mid x)$, a distribution that *depends on the parameters we are differentiating*, so you cannot naively backpropagate through the sampling. The **reparameterization trick** sidesteps it by moving the randomness outside: instead of sampling $z$ directly, draw $\\epsilon \\sim \\mathcal{N}(0, I)$ and set $z = \\mu_\\phi(x) + \\sigma_\\phi(x) \\odot \\epsilon$. Now the only random quantity is $\\epsilon$, whose distribution has nothing to do with $\\phi$, and gradients flow straight through $\\mu_\\phi$ and $\\sigma_\\phi$.`,
        `Put it together and you have **latent diffusion**, the paradigm essentially every state-of-the-art image and video generator uses today: train the autoencoder first, then train the flow or diffusion model entirely inside its latent space, and at sampling time decode the result with the decoder's *mean* (not a random draw, to avoid injecting noise into the finished product). The intuition for why this works so well is that a good autoencoder strips out high-frequency detail that is perceptually irrelevant, letting the generative model spend its capacity on structure that matters. The catch, and it is a real one, is that your generator is now capped by your autoencoder: if the encoder throws something away, no amount of flow matching will bring it back.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-8",
        caption:
          "Generating a megapixel image directly means an ODE in three million dimensions, so real systems compress to a latent space first and run the flow there, with a VAE's reconstruction and KL terms fighting to keep that space both faithful and easy to model.",
      },
    },
    {
      quiz: {
        question:
          "A team trains a latent flow matching model and gets samples that are beautifully composed but consistently mushy in fine texture. They spend a month scaling the flow model and the mush persists. What did they probably misdiagnose?",
        answer:
          "Almost certainly the autoencoder, not the flow model. In latent diffusion the generator's ceiling is the decoder: the flow model can only produce latents, and whatever the decoder does with a perfect latent is the best output the system can ever emit. If the autoencoder was trained with a pixelwise Gaussian (mean-squared error) reconstruction loss, it systematically produces over-smooth reconstructions, because MSE rewards hedging on uncertain high-frequency detail. Scaling the flow model cannot fix that, since the flow is already landing on good latents and the blur is added downstream. The standard fixes live in the autoencoder: add a perceptual loss in the feature space of a pretrained network, or an adversarial loss on decoded samples, both of which the source notes flag as what practitioners actually do. Diagnostic test: encode and decode a real image without the generator in the loop at all. If that round trip is mushy, the generator was never the problem.",
      },
    },
    {
      heading: "How the big systems are actually built",
      paragraphs: [
        `Worth pausing to notice how little new machinery the frontier systems need. Two case studies from the notes, both of which you can now read end to end.`,
        `**Stable Diffusion 3.** It trains with the *same conditional flow matching objective* we derived, on a Gaussian probability path, in the latent space of a pretrained autoencoder, with classifier-free guidance trained by randomly dropping the label. Its own paper reports that the team extensively compared flow and diffusion variants and found flow matching best. The engineering on top: three different text embeddings (two CLIP variants plus the sequential output of Google's T5-XXL encoder), and a **multi-modal DiT (MM-DiT)** that extends the transformer to attend not just over image patches but over text tokens as well, so conditioning is granular rather than one squashed vector. Largest model: **8 billion** parameters. Sampling: **50 Euler steps** with a guidance weight between **2.0 and 5.0**.`,
        `**Meta's Movie Gen Video.** Videos live in $\\mathbb{R}^{T \\times C \\times H \\times W}$, with a new time axis, and almost every design choice is the image recipe adapted to that extra dimension. Same conditional flow matching objective, same straight-line CondOT schedulers $\\alpha_t = t$, $\\beta_t = 1 - t$. The autoencoder becomes a **temporal autoencoder (TAE)** compressing by a factor of 8 in time *and* height *and* width, because memory pressure is far worse for video (which is exactly why generated clips are short); long videos are handled by chopping, encoding pieces separately, and stitching the latents. The backbone is a DiT that patchifies across both space and time, with self-attention among patches and cross-attention to language. Three text embeddings again, each for a reason: UL2 for granular text reasoning, ByT5 for character-level details when a prompt demands specific letters appear, and MetaCLIP for shared text-image space. Largest model: **30 billion** parameters.`,
        `The lesson to carry: **the math stops changing and the engineering takes over.** Everything above is the conditional flow matching loss plus choices about what space to run in, what network hosts the field, and how the prompt gets in. When you meet the next 40-billion-parameter generator, those are the four questions to ask, and you now know all four.`,
      ],
    },
    {
      heading: "The discrete dialect: when your data is not a vector",
      paragraphs: [
        `Everything so far assumed the object being generated is a point in $\\mathbb{R}^d$ that we can nudge with a velocity. Text is not. A token is a symbol drawn from a vocabulary, and there is no such thing as moving 0.3 of the way from "cat" to "dog". You cannot write an SDE on a discrete set, so the machinery seems to die at the border.`,
        `It does not, and the way it survives is worth seeing, both because language models built this way are a live research direction and because Chapter 9's discrete-token VLAs are secretly in this dialect. The replacement for a differential equation is a **continuous-time Markov chain (CTMC)**: a process that sits in a state and occasionally *jumps* to another. Instead of a velocity field you specify a **rate matrix** $Q_t(y \\mid x)$, the instantaneous rate of jumping from state $x$ to state $y$. It obeys two obvious rules: off-diagonal rates are non-negative (a negative rate of jumping somewhere is meaningless), and each diagonal entry is minus the sum of its row, which just says you either stay or you leave and the books must balance. Simulation is Euler's method again, in probability rather than position: over a small step $h$, jump to $y$ with probability $h\\,Q_t(y \\mid x)$, otherwise stay.`,
        `Now the problem that nearly kills it. The state space is $S = \\mathcal{V}^d$, every possible sequence, so its size is **exponential**: vocabulary to the power of sequence length. A single column of that rate matrix could never be stored, let alone predicted. The fix is a **factorized CTMC**: forbid jumps that change more than one token at a time. The model then only has to output a rate for each (position, vocabulary word) pair, a $d \\times V$ table that grows *linearly* in sequence length. A transformer emits exactly that shape without complaint, and you update every position in parallel each step.`,
        `From there the recipe is beat-for-beat the one we already know, which is the real payoff of having learned it structurally rather than as a list of formulas. Choose a conditional probability path: the **factorized mixture path**, where each token independently either shows its true value with probability $\\kappa_t$ or shows noise, so as $\\kappa_t$ climbs from 0 to 1 information fades in per token. (Note the honest difference from the Gaussian path: nothing *moves* here, because there is nowhere to move to. One distribution fades out and another fades in.) Marginalize over the dataset to get a marginal path. Prove a **discrete marginalization trick** saying the posterior-weighted average of conditional rate matrices follows the marginal path, using the **Kolmogorov Forward Equation** exactly where the continuous story used the continuity equation. And then the punchline lands:`,
      ],
    },
    {
      equations: [String.raw`Q_t(v_i, j \mid x) = \frac{\dot{\kappa}_t}{1 - \kappa_t}\Big(p_{1 \mid t}(z_j = v_i \mid x) - \delta_{x_j}(v_i)\Big)`],
    },
    {
      paragraphs: [
        `Reading the symbols: $p_{1 \\mid t}(z_j = v_i \\mid x)$ is simply "given this partially-corrupted sequence, what is the probability that position $j$ was really the token $v_i$?", and the prefactor $\\dot{\\kappa}_t / (1 - \\kappa_t)$ is an urgency term that grows as time runs out. The entire learned content of the rate matrix is that conditional probability, which is **a classifier per token position.** So the training loss is not a regression at all, it is plain **cross-entropy**:`,
      ],
    },
    {
      equations: [
        String.raw`\mathcal{L}_{\mathrm{DFM}}(\theta) = \mathbb{E}_{z \sim p_{\text{data}},\, t \sim \mathrm{Unif},\, x \sim p_t(\cdot \mid z)}\left[\sum_{j=1}^{d} -\log p^\theta_{1 \mid t}(z_j \mid x)\right]`,
      ],
    },
    {
      paragraphs: [
        `Corrupt a sequence, ask the network to name the original tokens, take the cross-entropy. Simulation-free, exactly as before. Continuous flow matching collapses to regression; discrete flow matching collapses to classification. Same skeleton, different bones.`,
        `The most famous instance is the **masked diffusion language model (MDLM)**: add a special $[\\text{MASK}]$ token to the vocabulary, start from a fully masked sequence, and let the CTMC reveal tokens over time until $t = 1$ hands you a sentence. Generation as progressive unmasking, in any order, in parallel, rather than strictly left to right. Fig 9.5.9 runs the real path and shows the urgency prefactor exploding as $t \\to 1$.`,
        `And now the callback that makes this section earn its place in a robotics guide. Chapter 9's **FAST** tokenizer and **π0-FAST** turn continuous robot actions into *discrete tokens* and generate them autoregressively. That is not a different universe from π0's flow head. It is this dialect: a discrete state space, a probability path that corrupts tokens, and a per-position classifier trained with cross-entropy. The fork in Chapter 9 between "discrete tokens" and "continuous flow" is, from up here, a choice of which state space to build the same generative machine on.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-9",
        caption:
          "In discrete space nothing moves, it fades: tokens are revealed independently on a schedule, the learned object is just a per-position classifier, and the urgency factor explodes as the time left to reveal what remains runs out.",
      },
    },
    {
      quiz: {
        question:
          "Continuous flow matching trains with mean-squared regression onto (z − ε). Discrete flow matching trains with cross-entropy onto the original tokens. Both are called 'the same recipe.' What exactly is the same, and why does the loss change shape?",
        answer:
          "What is the same is the structure: pick a conditional probability path from noise to a single data point, find the conditional generator of that path in closed form (a velocity field, or a rate matrix), prove a marginalization trick showing the posterior-weighted average of conditional generators follows the marginal path, then train by regressing on the tractable conditional target and let least squares or maximum likelihood manufacture the intractable marginal one. Both are simulation-free for the same reason. The loss changes shape because the thing being predicted changes type. In R^d the generator is a velocity, a real vector, and the natural fit for 'predict a vector' is squared error, whose optimum is a conditional mean. On a discrete set the generator's learned content is a probability over vocabulary items, and the natural fit for 'predict a distribution over categories' is cross-entropy, whose optimum is the true conditional probability. In both cases the optimum of the loss is exactly the posterior quantity the marginalization trick needs, which is why the same skeleton supports both.",
      },
    },
    {
      heading: "Putting it in a robot: anatomy of a flow-matching VLA",
      paragraphs: [
        `Now we cash everything in. Chapter 9 told you π0 has "a flow matching action expert." You can now read that sentence completely, so let us take it apart.`,
        `**The substitution that makes it work.** Every result in this chapter was about generating an object $z \\in \\mathbb{R}^d$, and we insisted the math did not care what the object meant. Here is the payoff: let $z$ be **a chunk of 50 future actions**. That is it. That is the whole adaptation. If the robot has 14 controllable joints, a chunk is a $50 \\times 14$ array, which flattened is a point in $\\mathbb{R}^{700}$, and every theorem above applies verbatim. The data distribution $p_{\\text{data}}(z \\mid y)$ is "the chunks a human demonstrator would produce, given what the robot currently sees and was told to do." The initial distribution is a Gaussian of the same shape. Generating a motor command is integrating an ODE from noise for a handful of steps. (Side note: real systems zero-pad the action dimension to a fixed size, commonly 32, so that one model can serve robots with different numbers of joints. Chapter 10's cross-embodiment story, in one implementation detail.)`,
        `**The anatomy.** π0 (Physical Intelligence, 2024) is two pieces bolted together. A **PaliGemma** vision-language backbone, about 3 billion parameters, reads the camera images and the instruction and produces the conditioning: this is our $y$, and it is where all the semantic understanding lives. Attached to it is a much smaller **action expert**, about 300 million parameters, whose entire job is to be $u_t^\\theta(x \\mid y)$, the velocity field over action chunks. The VLM knows what a pan is; the expert knows how to move.`,
        `**The training loop is Algorithm 3 with different nouns.** Sample a demonstration chunk $z$ and an observation. Sample noise $\\epsilon$ of the same shape and a time $t \\sim \\mathrm{Unif}[0,1]$. Form the blend $x = t z + (1-t)\\epsilon$. Regress the expert's output on $z - \\epsilon$. That is the identical loss we derived, with no simulation in the loop, which is why a robot policy can be trained with ordinary supervised-learning economics.`,
        `**Where the conditioning enters, revisited.** Remember AdaLN from the architecture section. π0.5 makes precisely that choice, injecting the conditioning through **adaptive RMSNorm at every layer** rather than concatenating a timestep embedding at the input, so that (as Abhinav Jha puts it in his visualization writeup) the conditioning "is present at every layer." This is not a decorative detail. The velocity the expert must output depends violently on $t$, and a policy whose deep layers have only a faded rumor of what time it is will integrate badly.`,
        `**Why so few steps.** π0 generates a chunk in roughly **ten** integration steps. You now know exactly why that is allowed rather than lucky: the CondOT path trains the field on *straight lines* from noise to data, and Euler's error comes entirely from pretending the path is straight across a step. Train straight paths, and big steps stop lying. Count the cost honestly: **network function evaluations = integration steps**, and a 50 Hz control loop leaves 20 milliseconds per decision. Ten evaluations of a 300M expert fits. Fifty does not. This is also, concretely, why robot stacks usually leave classifier-free guidance off: CFG runs the network twice per step, doubling your NFE, and (per the earlier quiz) it distorts the very distribution whose calibrated spread you want.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-10",
        caption:
          "A flow-matching VLA is this whole chapter in one loop: a vision-language backbone turns pixels and words into conditioning, and a small action expert integrates the learned velocity field from noise into a chunk of future actions in a handful of steps.",
      },
    },
    {
      paragraphs: [
        `**And now the most interesting thing a robot's generative model does.** Ask what the *spread* of the sampled chunks means, and you get an insight that no image generator can teach you.`,
        `Abhinav Jha ran PCA on π0.5's actual denoising trajectories on a Mobile ALOHA episode and measured how much the sampled actions disagreed with each other at each point in the chunk. The result: the **immediate** action, at horizon $h = 0$, converged tightly across noise seeds (dispersion 0.27), while the action **fifty steps out**, at $h = 49$, stayed wildly spread (dispersion 1.77). Call it **temporal certainty decay**: the model is confident about now and vague about later, and the vagueness grows smoothly with the horizon.`,
        `This is not a defect, and the mechanism falls straight out of what we built. The learned distribution is the *demonstration* distribution, so the model's spread is the demonstrators' spread. Given what the camera sees right now, every reasonable human does roughly the same next thing, so the data is nearly unimodal at $h = 0$ and the posterior over chunks agrees there. Fifty steps out, the demonstrators had genuinely diverged, some going left around the obstacle and some right, some already reaching for the faucet, because the far future depends on states nobody has observed yet. The data is multimodal there, so the model's samples are too. A well-calibrated policy *should* be uncertain about the far future. As Jha frames the model's implicit reasoning: it knows exactly what to do right now, but the correct action 49 steps from now depends on future states it has not seen.`,
        `Fig 9.5.11 reproduces the mechanism from scratch so you can watch it happen. The demonstrations agree at $h = 0$ and fan into three modes later, and the figure integrates the real ODE in $\\mathbb{R}^{100}$ from twelve seeds and **measures** the spread at each horizon index. The spread grows about sixteen-fold from the first waypoint to the last, nobody drew that curve, and all three modes get hit, which is Chapter 10's "preserve the multimodality" requirement showing up as a number.`,
        `The practical consequence ties the whole guide together. This is why **receding-horizon control** is not a hack: you generate 50 actions, execute only the first handful where the model is actually confident, then throw the vague tail away and replan with fresh observations. Chapter 10's action chunking gave you the reason to predict a chunk (it kills compounding error), and this figure gives you the reason not to *trust* all of it. Both are true at once, and the tension between them is the design.`,
      ],
    },
    {
      diagram: {
        id: "rb-95-11",
        caption:
          "Measured, not asserted: because demonstrators agree about the next action and diverge about the distant one, the sampled chunks bunch tightly at h = 0 and fan out by h = 49, which is exactly why a robot executes only the confident head of its plan and replans.",
      },
    },
    {
      quiz: {
        question:
          "Your policy's sampled chunks show almost no spread at any horizon, including 50 steps out. A teammate calls this great news: the model is confident and decisive. Using what you now know about what the sampled spread represents, why should you be worried instead?",
        answer:
          "Because the spread is supposed to be the demonstration distribution's spread, and real demonstrations genuinely disagree about the far future. A chunk distribution that is tight at h = 49 is claiming certainty that the data does not contain, which means the model is not calibrated to its data. The likely culprits are all bad: it may have mode-collapsed and be averaging away valid alternatives (Chapter 10's mean-regression failure, where averaging left and right sends you into the obstacle); it may have been trained on demonstrations from a single operator with one fixed strategy, so it will shatter on any scene requiring the other one; or someone left guidance turned up, which by construction sharpens samples toward a caricature and destroys diversity. There is also a subtler tell: a policy honestly uncertain about the far future is what makes receding-horizon replanning coherent, so false confidence out at the tail suggests the model would happily commit to a stale plan. Confidence is only good news when it is earned by the data agreeing.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        `The whole chapter in six sentences. Generation means sampling from $p_{\\text{data}}$, and the sampler is a differential equation: an ODE if you like determinism, an SDE if you add noise, with a neural network supplying the velocity field. You choose a probability path (almost always the Gaussian one, often the straight-line CondOT schedule) that morphs noise into data, and the marginalization trick turns "follow that path" into a computable regression: the conditional flow matching loss, whose gradients provably equal the loss you actually wanted. The score-function dialect (denoising, noise prediction, DDPM) is the same object in different coordinates, and it unlocks the SDE extension: one trained network, a family of samplers, noise level chosen at inference time. Guidance conditions the machine on a prompt, and classifier-free guidance is the heuristic that makes conditioning forceful, trading diversity for adherence. The network hosting the field is a U-Net or a DiT that takes Fourier-embedded time through adaptive normalization at every layer, it usually runs inside a VAE's latent space because raw pixel space is too big to integrate in, and if your data is discrete the whole skeleton survives with rate matrices and cross-entropy instead of velocities and regression.`,
        `**The four questions.** That is the durable takeaway. Any generative system you meet from here, image, video, protein, or robot, is pinned down by four answers: *what space does it run in* (pixels, a VAE latent, an action chunk, a token sequence), *what probability path* (almost always Gaussian, often straight-line CondOT), *what network hosts the field* (U-Net, DiT, an action expert bolted to a VLM), and *how does the conditioning get in* (concatenation, cross-attention, adaptive normalization). Stable Diffusion 3 answers: latent space, CondOT, MM-DiT, three text encoders plus AdaLN. π0 answers: action-chunk space, CondOT, a 300M expert on a PaliGemma backbone, adaptive RMSNorm at every layer. Same four slots. The papers get much shorter once you read them this way.`,
        `Now reread the rest of the guide with new eyes. Chapter 9's π0, "a flow matching action expert that integrates a learned velocity field from noise to a 50-step action chunk in about ten steps," is now a sentence where every word has a formula behind it, including why ten steps suffice. Chapter 9's π0-FAST, which discretizes actions into tokens and generates them autoregressively, is the CTMC dialect. Chapter 10's Diffusion Policy is the score dialect, ε-prediction and all. Chapter 11's "latent world models" run the same machinery inside an autoencoder. Four systems that read as four separate inventions are one machine with different answers in the four slots.`,
        `And the one lesson that is specific to robots, the thing the image world cannot teach you: **the spread of your samples is not noise to be minimized, it is the model telling you what it does not know.** Temporal certainty decay is that spread, honestly reported, and receding-horizon control is the engineering response to it. A generative policy is not just a fancy way to output a number. It is a way to output a number *with its uncertainty attached*, and on hardware, that attachment is the difference between a robot that replans and a robot that confidently drives its plan into a wall.`,
        `**Sources and going deeper.** This chapter is built from Holderrieth & Erives, *An Introduction to Flow Matching and Diffusion Models* (2026, arXiv 2506.02070), whose lectures and hands-on labs are at diffusion.csail.mit.edu and are worth your time, especially the lab where you build a model from scratch. The VLA framing and the temporal certainty decay measurement come from Abhinav Jha's *Visualizing Flow Matching in Robotics* (2026, abhinavjha.xyz), which PCA-projects π0.5's real denoising trajectories and is the empirical companion to this chapter's theory; he is appropriately careful that projecting from high dimensions to two can mislead, and that his visualizations show on-manifold samples rather than the global field. Federico Sarrocco's *Flow Matching* writeup (federicosarrocco.com/blog/flow-matching) is a good theory-to-PyTorch companion if you want to see each equation land as code.`,
        `*Next: back to the main line. Chapter 10 asks where the demonstrations that feed all of this actually come from, and why collecting them is the real bottleneck.*`,
      ],
    },
  ],
};
