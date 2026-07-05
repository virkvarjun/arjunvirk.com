import type { Chapter } from "../chapters";

// The Robotics Bible — Chapter 10. Prose is authored in
// content/robotics-bible/chapter-10-data.md and transcribed here verbatim into
// the Chapter/section schema; figures are mounted by id and rendered from the
// diagram registry (rb-10-1 … rb-10-8).

export const chapter10: Chapter = {
  slug: "chapter-10-data",
  number: "10",
  title: "Learning from Demonstration & Data Collection",
  summary:
    "Where robot data comes from: behavior cloning, action chunking (ACT), Diffusion Policy, teleop, UMI, and the LeRobot/Rerun tooling.",
  published: "Sep 7, 2026",
  updated: "Sep 7, 2026",
  futureRef:
    "The *ideas* here are durable — behavior cloning, compounding error / covariate shift, DAgger, action chunking, and diffusion-based policies are foundational and will stay relevant regardless of which specific model is state-of-the-art. The *tooling* moves faster: LeRobot, Rerun, UMI, and the specific rigs (ALOHA, YuMi, SO-100/101) are the current best-in-class as of 2026, so treat exact library APIs and hardware as a snapshot even though the roles they fill (a standard format, a synchronized visualizer, robot-free collection, cheap teleop) are here to stay. Come back to Fig 10.2 (compounding error) whenever a policy that trained fine falls apart at deployment — nine times out of ten, distribution shift is why — and to Fig 10.8 (the synchronized timeline) whenever you suspect your demonstration data itself, before you blame the model.",
  sections: [
    {
      paragraphs: [
        `*How you teach a robot by showing it — and why the demonstrations you show it are the scarcest, most expensive resource in the whole field.*`,
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        `Chapter 9 left us with a beautiful, hungry machine. A vision-language-action model takes a camera feed and a sentence — "put the mug in the sink" — and spits out motor commands, and it works, and it feels like magic. But magic has a bill, and the bill comes due here. That VLA learned everything it knows from **demonstrations**: recordings of a robot (or a human driving a robot) actually doing the task, thousands of times. And here is the uncomfortable fact that shapes this entire corner of robotics: **that data does not exist.**`,
        `Text is on the internet. Images are on the internet. You can scrape a trillion tokens and a billion pictures without leaving your chair. But there is no internet of robot trajectories — no giant scraped corpus of "wrist camera saw this, gripper did that, at 30 Hz, aligned." Every single demonstration has to be *generated*, physically, by a human spending real time on real hardware. That is the villain of this chapter: **the data problem.** Robot data is expensive, slow, and embodiment-specific, and worse — as we'll see immediately — the naive way of learning from it quietly poisons itself, compounding tiny errors into total failure. Everything in this chapter is a fix for some flavor of that.`,
        `I'm assuming you've read Chapter 9 (you know what a VLA is and that it eats demonstrations), Chapter 8 (you've seen diffusion as a generative process — we'll lean on it hard), and you remember the sense–plan–act loop and configuration space from Chapter 1. Some supervised-learning fluency helps; if you know what "fit a function to labeled examples" means, you're set.`,
        `Here's the road. We start with the dead-simple idea — **behavior cloning**: just copy the expert. We watch it break in the most important way in this chapter (**compounding error**), and let that failure hand us the fixes: **DAgger**, then **action chunking (ACT)**, then **Diffusion Policy**. Then we turn to the physical bottleneck — **how you actually collect demonstrations** (teleoperation, ALOHA, YuMi, UMI) — and why the data comes out **embodiment-specific**. We finish in the engine room: the **formats and tooling** (LeRobot, Rerun) that turn one lab's private mess into data everyone can share.`,
        `Let's go.`,
      ],
    },
    {
      heading: "Behavior cloning: just copy the expert",
      paragraphs: [
        `Start with the most obvious idea a person could have. You want the robot to do a task. So you show it the task — you record an expert doing it — and you train the robot to output whatever the expert output. That's it. That's **behavior cloning (BC)**, and despite how simple it sounds, it is the backbone of nearly every VLA you met in Chapter 9.`,
        `Here's the setup, and it's pure supervised learning. A demonstration is a stream of paired snapshots: at each instant you record what the robot **observed** (call it \`o\` — camera images, maybe joint angles) and what the expert **did** (call it \`a\` — the action, usually the next target joint positions or end-effector pose). Slice the whole demonstration into these \`(o, a)\` pairs and you have a labeled dataset, exactly like a pile of (image, label) pairs for a classifier. Then you train a network \`π\` — the **policy** — to predict the action from the observation:`,
        `**minimize  ‖ π(o) − a ‖²  over every (o, a) pair in your demonstrations.**`,
        `Reading the symbols: \`π(o)\` is the action the policy *guesses* when it sees observation \`o\`; \`a\` is the action the expert *actually took* in that situation; the \`‖ · ‖²\` is squared error — the gap between guess and truth. You nudge the network's weights to shrink that gap across the whole dataset. When you're done, you have a function that maps "what I see" straight to "what to do," and you run it in a loop: observe, feed it through \`π\`, execute the action, observe again. Sense → plan → act, where "plan" is one forward pass through a trained net.`,
        `Work a tiny example. Say the task is "reach for a red block on a table." You collect 50 demonstrations, each about 3 seconds long, recorded at 30 frames per second. That's 50 × 3 × 30 ≈ 4,500 \`(o, a)\` pairs. Each \`o\` is a camera image plus the arm's 7 joint angles; each \`a\` is the 7 target joint velocities the expert commanded. You train a net to map image+angles → velocities on those 4,500 pairs. Run it, and — genuinely — the arm reaches for the block. No physics model, no planner, no reward function. You just showed it, and it copied.`,
        `The appeal is enormous and worth stating plainly: BC needs no simulator, no reward engineering, no exploration. It converts "I can do the task" into "the robot can do the task" through nothing but recording and curve-fitting. This is *why* the field runs on it. But it has a flaw so fundamental that the next three sections exist only to patch it — and you can already feel the shape of it. The policy is only as good as the situations it saw. So what happens the first time it sees something a little off?`,
      ],
    },
    {
      diagram: {
        id: "rb-10-1",
        caption:
          "Behavior cloning is nothing exotic: slice expert demos into (observation, action) pairs and fit a function that maps what you see to what to do. Simple, no reward needed — and the entire backbone of modern VLAs.",
      },
    },
    {
      quiz: {
        question:
          "**Check your understanding.** Behavior cloning trains a policy the same way you'd train an image classifier — labeled pairs, squared-error loss, gradient descent. So why do we treat it as a robotics topic at all, instead of just \"supervised learning, applied\"?",
        answer:
          "Because a classifier's mistakes are independent — get one image wrong, the next image is unaffected — but a policy's mistakes *change its own future inputs*. The action the policy takes right now determines what it observes next, which determines its next action, and so on down the trajectory. That coupling (action changing future observation, the exact thing Chapter 1 said makes robots hard) is invisible in the training setup — you fit on static pairs — but it dominates at deployment. A supervised classifier trained and tested on the same distribution is fine; a BC policy trained on the expert's states but *running on its own states* is a fundamentally different, harder situation. That gap is the entire subject of the next section.",
      },
    },
    {
      heading: "Compounding error: the flaw that defines the field",
      paragraphs: [
        `Here's where naive imitation breaks, and it's worth slowing down because this single failure mode motivates almost every clever idea in the rest of the chapter.`,
        `Your BC policy is a copy of the expert — but an *imperfect* copy. Neural nets make small errors. So the very first time the robot acts, it does something slightly off: the expert would have moved the gripper 2 cm left, the policy moves it 1.8 cm. Tiny. Who cares? Here's who cares: that tiny error puts the robot in a state that is *slightly different* from any state the expert was ever in. And the policy was only ever trained on the expert's states. So now it's being asked a question it never studied for, and — no surprise — it answers a little worse. That slightly-worse action pushes it into a state that's *even further* from anything it saw in training. Which makes the next action worse still.`,
        `The errors don't add. They **compound.** This is the villain in its purest form, and it has a proper name: **distribution shift** (or **covariate shift**). The distribution of states the policy actually visits drifts away from the distribution it was trained on, and once it's off the map, every step drives it further off. A robot that was doing fine for two seconds suddenly spirals — reaching past the block, knocking it over, flailing at empty table. Not because any single decision was catastrophic, but because small errors got a running start.`,
        `Let's put a number on how bad this is, because the scaling is genuinely alarming. Ross and Bagnell showed (this is the analysis behind DAgger, 2011) that if a BC policy makes a mistake with some small probability ε on each step, the *total* expected error over a trajectory of length T doesn't grow like T·ε the way you'd hope — it grows like **T²·ε**. Quadratic in the horizon. Read that again: doubling the length of the task quadruples the accumulated error. A policy with a 1% per-step error rate over a 100-step task doesn't have a 1% problem; the errors have room to feed on themselves across all 100 steps, and the trajectory-level failure rate blows up. This is why a policy can ace short reaches and fall apart on anything long and multi-stage. The horizon is the enemy.`,
        `So how do you fight it? The classic first answer is **DAgger** — Dataset Aggregation (Ross, Gordon, Bagnell, 2011), and the name tells you the trick. The problem is that training data covers the expert's states, but the policy visits its own (drifted) states, and there are no labels there. Fine — go get labels there. You run the *current* policy, let it drift into its own weird states, and then you ask the expert: "here's where the robot actually ended up — what would *you* do here?" The expert labels those states, you add them to the dataset, retrain, and repeat. Each round, the training distribution creeps toward the deployment distribution, until the policy has seen — and been corrected on — exactly the recovery situations it gets itself into. DAgger provably tames the quadratic blowup back toward linear.`,
        `It works, and it's a genuinely important idea. But look at the cost, because it foreshadows the whole back half of this chapter: **DAgger needs an expert on call to label the policy's mistakes, over and over.** Every iteration is more human time on real hardware watching a half-trained robot flail and saying "no, do this instead." We fixed the error problem by spending exactly the resource that's scarcest — human demonstration effort. That tension never leaves us. So the next question is sharper: can we blunt compounding error *without* dragging the expert back for round after round of babysitting?`,
      ],
    },
    {
      diagram: {
        id: "rb-10-2",
        caption:
          "This is imitation's core flaw: a small error moves the robot to a state it never trained on, where it errs more — and error grows like T², not T. DAgger fights back by having the expert label the states the policy actually visits.",
      },
    },
    {
      quiz: {
        question:
          "**Check your understanding.** Two BC policies each make a wrong action 1% of the time per step. One runs a 20-step task; the other runs an 80-step task. Naively you'd guess the long task fails 4× more often. Why is that guess an underestimate, and what's the intuition for the real scaling?",
        answer:
          "It's an underestimate because it assumes errors are independent, but they're not — each error moves the robot to an off-distribution state that makes the *next* error more likely, so mistakes recruit more mistakes. The accumulated error scales roughly with T² rather than T, so quadrupling the horizon (20 → 80 is 4×) inflates the trajectory-level error closer to 16×, not 4×. Intuitively: on a short task the policy rarely drifts far enough to leave the states it knows, so it self-corrects; on a long task it has enough steps to wander off the map, and once off, there's no training data to pull it back. The horizon is what turns tiny, survivable per-step errors into a spiral. This is exactly why long-horizon, multi-stage manipulation is so much harder for BC than a quick reach.",
      },
    },
    {
      heading: "Action chunking: predict a whole plan, not one twitch",
      paragraphs: [
        `DAgger fixes compounding error by adding data. The next idea fixes it by changing *what the policy predicts* — no extra expert babysitting required. It comes from **ACT — the Action Chunking with Transformers** model (Zhao et al., 2023), introduced alongside a now-famous cheap robot rig called ALOHA (we'll get to the rig later; right now it's the algorithm we want).`,
        `Here's the intuition. A single-step policy is like driving while only ever thinking about the next quarter-second. Every tiny wobble in your prediction immediately becomes a new situation you have to react to, and — as we just saw — those wobbles compound. But a human demonstrator isn't thinking one twitch at a time. When they reach for a mug, they've committed to a little *plan*: "swing over, descend, close." So why force the policy to rebuild that plan from scratch, one step at a time, at every single frame?`,
        `**Action chunking** says: don't. Instead of predicting one action from the current observation, predict a whole **chunk** — a block of, say, the next 100 actions — all at once. Then execute that chunk (or most of it) before you look again and predict the next chunk. Two things get better immediately, and they're both cures for problems we've named.`,
        `First, **compounding error shrinks**, because you're closing the perception loop far less often. If you only re-decide every 100 steps instead of every step, you've cut the number of places where a fresh prediction error can be injected by 100×. The trajectory rides on committed plans instead of twitch-by-twitch reactions, so it drifts far less. Second — and this is subtle but important — chunking captures **temporal consistency** that a single-step policy structurally can't. A one-step policy is Markovian: its action depends only on the current observation, so it has no memory of the plan it was in the middle of. That makes it prone to a nasty failure where the policy *pauses* — it reaches a state where the demonstrations show the expert sometimes moving and sometimes momentarily still, the policy averages toward "stay put," and it gets stuck. Predicting a chunk sidesteps this: the chunk *is* the commitment to keep moving through the pause.`,
        `Now the mechanism, because ACT is a specific, clever architecture. It's a **transformer** — the same attention machinery from Chapter 9 — that takes in the current images (from multiple cameras) plus the arm's joint positions, and outputs a chunk of future actions in one shot. But Zhao et al. added a twist to handle the fact that human demonstrations are *noisy and multimodal* (the same start can lead to slightly different valid motions). They wrapped it in a **CVAE — a conditional variational autoencoder.** During training, an encoder compresses the demonstrated action chunk into a small "style" latent \`z\` that captures *which way* the human did it this time; the decoder (the transformer) then reproduces the chunk conditioned on the observations *and* that \`z\`. At test time you just set \`z\` to its average value and let the observations drive the chunk. The CVAE's job is to keep the model from smearing all the demonstrators' variations into one blurry average — a preview of the exact problem Diffusion Policy attacks head-on in the next section.`,
        `Work the numbers to feel the chunking payoff. Take a 500-step task. A single-step policy makes 500 independent action predictions, so there are 500 chances to inject a compounding error. Chunk it at 100 actions per prediction and you make only 5 predictions across the whole task — 5 seams instead of 500. Even if each individual prediction is no more accurate, you've slashed the number of drift-injection points by 100×, and the T² monster loses most of its runway. That's the whole trick: fewer decisions, longer commitments, less room for errors to compound.`,
        `The honest limit: chunks that are too long make the robot sluggish to react to genuine surprises — if the mug slips while you're 80 actions into a 100-action chunk, you can't respond until the chunk ends. So chunk length is a dial between reactivity (short chunks, more feedback) and stability (long chunks, less compounding). ACT typically blends overlapping chunk predictions to smooth the seams, buying some of both.`,
      ],
    },
    {
      diagram: {
        id: "rb-10-3",
        caption:
          "Predicting a whole chunk of future actions at once, instead of one step, slashes the number of places a fresh error can enter — and commits the robot to a consistent plan through pauses. This is ACT; longer chunks mean more stability but less reactivity.",
      },
    },
    {
      quiz: {
        question:
          "**Check your understanding.** Chunking reduces compounding error partly by re-planning less often. But a one-step policy also has a specific failure — it gets \"stuck\" and stops moving — that isn't obviously about error accumulation. Why does predicting chunks fix the sticking problem too?",
        answer:
          "Because a one-step policy is Markovian: its action depends only on the current frame, with no memory of what it was in the middle of doing. If the demonstrations pass through states where the expert was sometimes moving and sometimes briefly paused, the single-step policy sees conflicting labels for a similar-looking observation and averages them toward \"barely move\" — so it stalls, and once stalled it keeps seeing the same stalled observation and keeps deciding to stay put. Predicting a chunk builds the commitment to keep moving *into the output itself*: the model emits \"keep going through this region\" as a block, so there's no per-frame re-litigation of whether to move. It restores a kind of temporal memory that the Markov single-step formulation threw away. That's why ACT's chunks help even on tasks where compounding error wasn't the obvious culprit.",
      },
    },
    {
      heading: "Diffusion Policy: keep the modes, kill the mush",
      paragraphs: [
        `Chunking helped, and ACT's CVAE hinted at a deeper problem it was straining to handle. Let's name that problem, because it's the one Diffusion Policy (Chi et al., 2023) was built to solve, and it's beautifully counterintuitive: **the trouble with expert demonstrations is that experts are inconsistent — in a way that's actually correct.**`,
        `Think about walking around a pole to reach a door. Going left is fine. Going right is fine. Both are things a sensible demonstrator does, and across a dataset you'll see plenty of both. Now ask a plain squared-error policy — the BC loss from the first section — to predict "the action" here. What does it do? It minimizes average squared error, and the action that minimizes average squared error between "go left" and "go right" is... **go straight into the pole.** The average of two good answers is a terrible answer. This is the **multimodality** problem: when a task has several distinct valid solutions, a regressor that predicts one action smears them into the mean, and the mean is often exactly the one thing that fails. Every "reach for the object from the left or from the right," "grasp the pan by the handle or the rim," "stack it here or there" hides this trap.`,
        `BC's squared-error loss is the villain here — it *structurally* assumes there's one right answer and punishes the policy for the variance the data actually contains. ACT's CVAE was one dodge (the latent \`z\` lets the model pick a mode instead of averaging). Diffusion Policy's answer is cleaner and more powerful: **stop predicting the action, and start predicting a whole *distribution* over actions that you can sample from.** Multiple valid modes? Represent all of them, then draw one clean sample — commit to left *or* right — never their disastrous average.`,
        `And here's the callback that makes this a payoff instead of a new mystery: you already know how to model a rich multimodal distribution and sample from it. **Diffusion (Chapter 8).** Diffusion Policy represents the policy as a **conditional denoising diffusion model over action sequences.** The exact same machinery you saw generate images now generates action chunks. The recipe, translated from pixels to actions:`,
      ],
    },
    {
      list: [
        `Take a demonstrated action chunk and progressively add Gaussian noise until it's pure static — the forward process from Chapter 8, unchanged.`,
        `Train a network to run that backward: given a noisy action chunk *and* the current observation (images, robot state) as conditioning, predict the noise so you can subtract it. That's a **conditional** denoiser — conditioned on what the robot sees.`,
        `To act, start from pure random noise in action space and denoise it, step by step, guided by the current observation, until a clean action chunk crystallizes out. Execute it. (Note it also naturally outputs a chunk — diffusion and action chunking are friends.)`,
      ],
    },
    {
      paragraphs: [
        `Why does this dodge the averaging trap where a regressor can't? Because denoising doesn't compute a mean — it follows the noise gradient *downhill toward the nearest mode.* Start from one random seed and you fall into the "go left" basin and get a clean left trajectory; start from another and you fall into "go right" and get a clean right one. You get a crisp sample from one mode, never a blur of both. The multimodality that broke the regressor is now represented honestly, and sampling picks a lane.`,
        `Concretely, why it landed as a landmark: Chi et al. (2023) showed Diffusion Policy substantially beating prior methods across a big suite of real and simulated manipulation tasks, and it was notably *robust* — it handled tasks with genuine multimodality, high-dimensional action chunks, and idle-pause dynamics that made simpler policies stall. It also stabilized training in a way that plain regression and even GAN-style approaches struggled with. The cost, inherited straight from Chapter 8: sampling means running the denoiser for several steps per chunk, so inference is heavier than one forward pass — an active area of speedups (fewer denoising steps, distillation), but a real consideration when you need actions at 30 Hz on real hardware.`,
        `Step back and see the ladder we've climbed. BC: predict the action, average the modes, drift. Chunking (ACT): predict a block, drift less, dodge modes with a latent. Diffusion Policy: predict a *distribution* over blocks, sample a clean mode, honor the multimodality directly. Each is a fix for what broke before. But all three share one unspoken assumption — that we *have* demonstrations to learn from. Time to face the villain directly: where do the demonstrations actually come from?`,
      ],
    },
    {
      diagram: {
        id: "rb-10-4",
        caption:
          "When a task has several right answers, squared-error regression predicts their average — often the one path that fails. Diffusion Policy models the whole distribution and denoises to a single clean mode, committing to left or right instead of splitting the difference.",
      },
    },
    {
      quiz: {
        question:
          "**Check your understanding.** Someone proposes fixing the multimodality problem cheaply: just collect demonstrations more carefully so every demonstrator always goes around the obstacle the *same* way (say, always left). Now the data has one mode, and a plain regressor won't average anything. What's wrong with this plan, and what does it cost you?",
        answer:
          "It technically works for that one obstacle, but it's fighting the wrong battle and it's expensive. First, real tasks are riddled with multimodality you can't scrub out — which finger placement, which approach angle, which sub-task order — and policing every demonstrator into one canonical choice for all of it is impractical and often impossible. Second, and worse, you've thrown away useful diversity: a policy that only ever saw \"go left\" has no idea what to do if something blocks the left route at test time, whereas a multimodal policy can just sample the right route instead. You've traded robustness for a trick that only patches one axis of variation. Diffusion Policy's whole point is that you *don't have to* sanitize your data — it represents the multiple modes honestly and picks one at sampling time, keeping the diversity as a feature rather than a bug to be suppressed.",
      },
    },
    {
      heading: "Where demonstrations come from: teleoperation and its tradeoffs",
      paragraphs: [
        `Every method above assumes a pile of \`(observation, action)\` pairs from an expert. Here's the part nobody puts on the slide: **a human made every one of those pairs, in real time, by controlling a robot.** This is the physical face of the data problem, and the whole subfield of demonstration collection is a negotiation among three quantities that fight each other:`,
      ],
    },
    {
      list: [
        `**Data quality** — how clean, precise, and *embodiment-matched* the demonstrations are (does the recorded action mean exactly what it'll mean at deployment?).`,
        `**Throughput** — how many demonstrations per human-hour you can collect.`,
        `**Hardware cost** — how much robot (or rig) you need per person collecting.`,
      ],
    },
    {
      paragraphs: [
        `You cannot max all three. Every method below picks a corner, and knowing which corner explains why the method exists.`,
        `**Direct teleoperation** is the baseline: a human drives the actual robot, live, and you record what the robot sees and does. The controls vary — VR headsets and hand controllers, 3D mice, or **leader-follower arms** — but the principle is identical: the human is the policy, the robot is the body, and the recording is a perfect \`(observation, action)\` stream in the robot's *own* action space. That last point is the key virtue: because the action was executed *on the target robot*, it's exactly what the deployed policy will need to output. Highest-quality, most transferable data you can get. The catch is everything else: it's slow (one human, one robot, real time), and you need the robot — expensive hardware tied up one demonstration at a time.`,
        `**ALOHA** (Zhao et al., 2023, the rig that shipped with ACT) is the sharpest low-cost version of leader-follower teleop, and it's worth understanding concretely because it defines "good demonstration data" for a lot of the field. It's **bimanual** — two arms — because the interesting manipulation tasks (uncapping a bottle, threading a zip tie, slotting a battery) need two hands. The trick is *backdriving*: the operator physically holds two small, cheap **leader** arms and moves them around like puppet handles. Sensors read the leader arms' joint angles, and two larger **follower** arms mirror those angles in real time. The human feels like they're just moving the little arms; the big arms copy exactly. Because the follower arms are the ones actually doing the task and being recorded, the demonstration comes out perfectly in the follower robot's action space — **embodiment-matched by construction.** ALOHA's fame is that it made this cheap (off-the-shelf arms, a few thousand dollars) and showed it was enough to learn genuinely fine bimanual skills. It sits firmly in the "high quality, low throughput, robot-required" corner.`,
        `**YuMi** (ABB's dual-arm collaborative robot) is the industrial-grade cousin: a purpose-built, human-safe **bimanual** platform that's been widely used as the *follower* robot for teleoperated manipulation data collection. Same idea — a human drives two arms, you record embodiment-matched bimanual demos — but on a robust commercial robot designed to work near people. It trades ALOHA's shoestring cost for reliability and precision. Same corner of the tradeoff triangle, pricier hardware.`,
        `Now the frustration that motivates the leap. All of the above are stuck in a room, with a robot, collecting one slow stream at a time. To feed a data-hungry VLA you'd need armies of robots and operators, and even then your data only covers the handful of scenes you set up in the lab. What if you could collect demonstrations **without the robot at all** — anywhere, cheaply, in the messy real world?`,
        `**UMI — the Universal Manipulation Interface** (Chi et al., 2024) — is exactly that leap, and it's one of the cleverest ideas in this chapter. Strip a demonstration down to its essence: you need to record *what the hand saw* and *what the hand did.* UMI does that with a **handheld gripper** — a simple parallel-jaw gripper you hold in your hand, with a **GoPro** camera mounted on it (plus a fisheye lens and little mirrors to give the camera wrist-eye and side views, mimicking what a robot's wrist camera would see). You just walk up to a task — in a kitchen, a closet, a café, wherever — and *do the task with the handheld gripper.* The GoPro records the visual observation; the gripper's opening and its motion (recovered from the video and onboard sensing) give you the action. No robot in the loop. No lab. A human with a handheld tool collecting demonstrations in the wild.`,
        `The genius is the second half: **matching the interface.** UMI's handheld gripper is built to have the *same* jaw geometry and the *same* camera viewpoint as a real robot fitted with a matching gripper and wrist camera. So the observation the GoPro recorded looks like what the robot's camera will see, and the action (gripper pose + open/close) means the same thing on the robot as it did in your hand. That deliberate matching of the **observation and action interface** is what makes robot-free, in-the-wild data *transferable* to an actual robot — you can train on demonstrations collected by someone in their own kitchen and deploy on a robot arm that never left the lab. UMI sits in a completely different corner: enormous throughput and diversity, dirt-cheap "hardware" (a gripper and a GoPro), at the cost of some quality control and the requirement that the robot's gripper match the handheld one.`,
        `Two more sources round out the landscape, each cheaper and more mismatched than the last. **Human video** — ordinary footage of people doing things — is the ultimate in cheap and abundant (the internet is full of it), but it's *embodiment-mismatched* and comes with **no action labels**: you see the hand move but not the joint commands or gripper signals, and the human hand isn't the robot's gripper. It's gold for learning *what tasks look like* and priors about objects, but you can't behavior-clone from it directly. And **simulation** — teleoperating or scripting demonstrations inside a physics simulator — is nearly free to scale and gives you perfect labels, at the cost of the reality gap (does sim data transfer to the real robot?). That's a big enough topic to be its own chapter — it's Chapter 11.`,
        `Notice the throughline: as you move from ALOHA to YuMi to UMI to human video, you climb in throughput and diversity while sliding down in embodiment-match and label quality. There's no free lunch — just a menu, and every real data-collection effort mixes several items off it.`,
      ],
    },
    {
      diagram: {
        id: "rb-10-5",
        caption:
          "ALOHA: the operator backdrives two cheap leader arms and the larger follower arms mirror them, so the recorded demonstration lands exactly in the follower robot's action space — high-quality, embodiment-matched data, one slow stream at a time.",
      },
    },
    {
      diagram: {
        id: "rb-10-6",
        caption:
          "UMI decouples data collection from the robot: a human collects demonstrations anywhere with a handheld gripper and GoPro, and because the gripper geometry and camera viewpoint are built to match a real robot's, the in-the-wild data transfers. Throughput and diversity soar; the price is matching the interface.",
      },
    },
    {
      quiz: {
        question:
          "**Check your understanding.** UMI collects data with a handheld gripper and a GoPro, no robot involved, yet the data trains a real robot. Ordinary human video is even cheaper and more abundant, yet you *can't* behavior-clone from it. Both are \"a human doing a task, recorded by a camera.\" What exactly does UMI provide that raw human video doesn't?",
        answer:
          "Two things: action labels and a matched interface. Raw human video gives you an observation (pixels of a person doing something) but *no action label* — you never recorded the gripper's open/close signal or a pose command, and a human hand isn't a robot gripper, so there's nothing to imitate in the robot's action space. UMI is engineered to record precisely those actions: the handheld gripper's pose and jaw opening are captured as the demonstration's action, giving you real `(observation, action)` pairs. On top of that, UMI *matches* the observation and action interface to the target robot — same jaw geometry, same camera viewpoint — so the recorded observation looks like what the robot's camera will see and the recorded action means the same thing on the robot. Human video has neither the labels nor the matched interface, which is why it's great for learning object priors and task appearance but can't be behavior-cloned directly. UMI buys most of human video's scale and diversity while keeping the transferability of teleop.",
      },
    },
    {
      heading: "Why data is embodiment-specific",
      paragraphs: [
        `There's a quiet assumption buried in every method so far, and it's time to drag it into the light, because it's the deepest constraint on the whole enterprise: **an action recorded on one robot doesn't mean the same thing on another.**`,
        `Here's why, concretely. Suppose a demonstration records the action "set joint 3 to 45°." On the robot it was recorded on, that produces a specific hand position, because that robot has specific link lengths and a specific joint layout (Chapter 3 — kinematics turns joint angles into hand poses, and that map is unique to each body). Feed the identical "joint 3 → 45°" to a robot with different link lengths, a different number of joints, or a different gripper, and the hand ends up somewhere else entirely — or the command is meaningless because that robot doesn't *have* a joint 3 like that. The action space — the very set of numbers a policy outputs — is defined by the robot's body. Change the body, change the meaning of every action. This is why demonstrations are **embodiment-specific**: ALOHA data is in ALOHA's action space, YuMi data is in YuMi's, and they don't automatically interchange.`,
        `This is also *why* each collection method produces data in the particular format it does. Teleop on a specific robot records that robot's **proprioception** (its joint angles and gripper state — the body's own sense of itself, Chapter 1), its **camera streams** (the exact viewpoints mounted on that robot), and **actions in that robot's action space** (its joint or end-effector commands), all as time-aligned **action chunks** with timestamps. UMI records a gripper pose and open/close signal plus a GoPro view — a format deliberately shaped to be a *robot's* interface so it can cross over. Human video records pixels and nothing else, so it has no action format at all. The format isn't arbitrary; it's a fingerprint of how and on what the data was collected.`,
        `So here's the tension. Embodiment-specificity says data doesn't pool across robots — but pooling is *exactly* what we need to beat the data problem, because no single lab can collect enough on one robot. Chapter 9 met the response: **cross-embodiment training**, and its poster child **Open X-Embodiment** — a giant collaboration that pooled demonstrations from *many* different robots and trained policies across all of them at once. The obvious objection is everything we just said: the action spaces don't match. How do you pool data whose actions mean different things?`,
        `Two moves make it work. First, a **normalized action representation** — instead of raw joint commands, express actions in a more universal frame, like *relative* end-effector motion (move the gripper this far in this direction, open this much), and normalize the numbers to a common scale. Relative gripper motion means roughly the same physical thing across many arms, even when their joints don't, so a policy can learn shared structure and only the last mile stays body-specific. Second — and this is UMI's deeper contribution finally paying off — a **common gripper interface.** If many robots are fitted with the *same* gripper and the *same* camera viewpoint, then their observations and actions are already in a shared language, and data pools almost trivially. UMI's matched-interface trick wasn't just a data-collection convenience; it's a strategy for making demonstrations embodiment-*portable* in the first place. That's why it matters so much: it attacks the data problem at the format level, before a single network is trained.`,
        `The honest limits still bite. Normalized representations blur real physical differences (a big arm and a tiny arm reaching "0.1 units forward" do different things), and cross-embodiment policies pay a coordination tax for straddling many bodies. But the direction is set: the field is fighting the data problem by pooling across embodiments, and the tools that make pooling possible — normalized actions, common interfaces — are as important as the learning algorithms they feed.`,
      ],
    },
    {
      diagram: {
        id: "rb-10-7",
        caption:
          "An action recorded on one body doesn't mean the same thing on another — which is why demonstrations are embodiment-specific. Normalizing to relative end-effector motion or sharing a common gripper interface (à la UMI) puts different robots in one language, so cross-embodiment data can finally pool.",
      },
    },
    {
      quiz: {
        question:
          "**Check your understanding.** Open X-Embodiment pools demonstrations from dozens of physically different robots into one training set, even though a raw joint command on one robot is meaningless on another. What has to be true about the *action representation* for this pooling to make any sense, and what's the residual cost of forcing many bodies into one representation?",
        answer:
          "The actions have to be expressed in a representation that means roughly the same physical thing across bodies — typically a normalized, relative end-effector motion (\"move the gripper this far in this direction, open this much\") rather than raw per-robot joint commands, so that a single output has a consistent interpretation on arms with different link lengths and joint counts. (A shared physical gripper interface, as in UMI, does this even more directly by making the interfaces literally identical.) The residual cost is that a normalized representation blurs real differences: \"+0.1 forward\" is not physically identical on a large arm and a small one, and the mapping from normalized action back to each robot's actual joints still has to be handled per-body. On top of that, a policy that spans many embodiments pays a kind of generalization tax — it must learn body-agnostic structure and reconcile conflicting embodiment-specific habits — so cross-embodiment pooling trades some per-robot sharpness for the enormous benefit of learning from vastly more data.",
      },
    },
    {
      heading: "Formats and tooling: turning a lab's mess into shared data",
      paragraphs: [
        `We've collected demonstrations and understood why they're embodiment-shaped. Now the unglamorous but load-bearing question: **how is a demonstration actually stored, and how do you share it?** Get this wrong and every lab's data is a private, incompatible pile — which, for years, it was. The last piece of the data problem is *interoperability*, and it's finally being solved by conventions everyone can agree on.`,
        `Start with the anatomy of a single demonstration, because it's more than "a video." A demonstration is a **synchronized time-series**: several streams, each sampled over time, all aligned to a common clock. Concretely, one episode typically holds multiple **camera streams** (a scene camera, one or more wrist cameras — remember cameras are embodiment-mounted), the robot's **proprioception** (joint angles, gripper state), and sometimes **depth** or **force/torque** readings, all lined up against the **actions** the policy should have output, sampled at a **fixed control rate** (say 30 Hz — one frame every 33 ms). The whole thing is sliced into **episodes** (one attempt at the task), each a bundle of these aligned streams with timestamps, ready to be chopped into the \`(observation, action)\` pairs — or action chunks — that the algorithms from earlier in this chapter actually train on. Alignment is everything: if the wrist camera's frame and the joint angles and the action drift out of sync by even a few milliseconds, you're teaching the policy a lie about which observation caused which action.`,
        `For years, every lab invented its own version of this — its own directory layout, its own timestamp convention, its own way of naming the wrist camera — and cross-lab data sharing was a nightmare of one-off conversion scripts. **LeRobot** (Hugging Face, 2024) is the community's answer: an open-source library plus, crucially, a **standard format — the LeRobotDataset**. It defines one agreed-upon way to store those synchronized observation/action time-series — cameras, proprioception, actions, episodes, all laid out the same way — so a demonstration recorded in one lab loads, unmodified, in another's training code. It **standardizes the messy per-lab formats into one.** And because it lives on the Hugging Face Hub, you can **stream** datasets straight off the Hub the way you'd stream a language dataset — no more mailing hard drives. LeRobot also ships the *methods* this chapter covered, ready to run against that data: **ACT, Diffusion Policy, π0 and π0-FAST** (the VLAs from Chapter 9), and **SmolVLA**, all trainable on LeRobotDatasets. It even targets cheap, accessible hardware — the low-cost **SO-100 / SO-101** arms — so the whole loop of collect → store → train → deploy is within reach of a hobbyist, not just a funded lab. That combination — one format, streaming, the algorithms, cheap arms — is a direct assault on the data problem: it lowers the cost of *every* step.`,
        `The other half of the tooling story is *seeing* your data, and it matters more than it sounds. When a demonstration is bad — the cameras drifted out of sync, the operator fumbled, the gripper mislabeled — or when a trained policy fails a rollout, you need to *watch what the robot saw and did, synchronized, on one timeline.* That's what **Rerun** does. Rerun is an open-source visualizer and logger for multimodal robotics/CV data: you **log** time-aligned streams — camera images, point clouds, coordinate **transforms** (Chapter 2's frames!), scalar signals like joint angles or gripper force — and Rerun records them into **\`.rrd\` files** you can scrub through afterward. Everything shares one time axis, so you drag a single playhead and *every* stream jumps to that instant: this is the frame the wrist camera saw, these were the joint angles, this was the action, all at once.`,
        `Why is this essential and not just nice? Because debugging demonstrations and model rollouts is fundamentally a *temporal, multimodal* problem — the bug is almost always a mismatch *between* streams at a *particular time* (the action was right but the camera it was paired with was one frame stale; the policy stalled *exactly* when the wrist view got occluded). A wall of separate log files can't show you that; a synchronized scrubber shows it instantly. You literally watch the demonstration or the rollout play back with every sensor and command aligned, and the failure jumps out. Between LeRobotDataset giving everyone a *common format* and Rerun letting everyone *watch the data honestly*, the field finally has the plumbing to treat robot demonstrations as a shared, inspectable resource instead of a thousand private, opaque piles — which is the last, most practical front in the war on the data problem.`,
      ],
    },
    {
      diagram: {
        id: "rb-10-8",
        caption:
          "A demonstration is not a video — it's synchronized camera, proprioception, and action streams on one clock, sliced into (observation, action) pairs at a fixed rate. LeRobotDataset standardizes this format; Rerun's .rrd files let you scrub every stream together, so a few milliseconds of desync — or the exact frame a policy stalls — jumps right out.",
      },
    },
    {
      quiz: {
        question:
          "**Check your understanding.** You train a Diffusion Policy on a freshly collected LeRobotDataset and it fails badly at deployment, stalling partway through the task. Before blaming the algorithm, why is the *first* thing you should do to open the demonstrations in Rerun and scrub the timeline — and what class of bug would that catch that a validation-loss number never could?",
        answer:
          "Because a low training loss only tells you the policy fit *whatever pairs you fed it* — if those pairs are wrong, the model faithfully learned garbage and the loss looks fine. The commonest silent killer in demonstration data is a *synchronization* bug: the camera stream and the action stream are misaligned by a few frames, so every `(observation, action)` pair teaches the policy \"this image → the action that actually belonged to a *different* moment.\" No scalar loss surfaces that; the model minimizes it happily. Scrubbing the aligned timeline in Rerun catches it instantly — you drag the playhead and *see* that the wrist camera frame doesn't match the joint state or action at that instant, or you watch the exact moment the policy's training data had the gripper labeled wrong. It's the temporal, cross-stream mismatch that only a synchronized multimodal visualizer reveals, which is precisely why \"watch the data before trusting the number\" is the field's hard-won first move.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        `Pull it together. A VLA learns to act by **imitation** — behavior cloning, plain supervised learning on \`(observation, action)\` pairs — but the naive version poisons itself: tiny errors push the policy off the states it trained on, and **compounding error** grows like T², spiraling long tasks into failure. Each fix in this chapter answered the last one's weakness. **DAgger** relabels the states the policy actually visits, at the cost of dragging the expert back repeatedly. **Action chunking (ACT)** predicts a whole block of actions at once — fewer decision seams, less compounding, and temporal consistency that stops the policy stalling. **Diffusion Policy** goes further, modeling a full *distribution* over action chunks with Chapter 8's denoising machinery, so it samples one clean mode instead of averaging several valid answers into mush.`,
        `But every one of those needs demonstrations, and demonstrations don't exist until a human makes them. So the field negotiates **quality vs throughput vs hardware cost**: direct teleop and leader-follower rigs like **ALOHA** and **YuMi** buy embodiment-matched, high-quality bimanual data one slow stream at a time; **UMI** decouples collection from the robot entirely — a handheld gripper and a GoPro, used anywhere, transferable *because* its observation and action interface is built to match the robot's. That transferability is the same trick that makes **cross-embodiment** pooling (Open X-Embodiment) possible, once actions are expressed in a normalized, body-agnostic representation. And the whole enterprise finally has plumbing: **LeRobot / LeRobotDataset** standardizes the format so demonstrations pool and stream, and **Rerun**'s \`.rrd\` files let you watch every synchronized stream at once, so the mistakes that no loss number reveals become visible.`,
        `The villain never fully dies — robot data is still expensive, still physical, still embodiment-shaped. This whole chapter was a series of raids on that one cost. And there's one more raid the field is making, the one that promises data that's nearly free to scale: **generate the demonstrations in a simulator, or learn a model of the world you can practice inside.** That's Chapter 11 — world models and simulation — where we finally try to manufacture experience instead of paying a human for every second of it, and meet the reality gap that stands in the way.`,
      ],
    },
    {
      paragraphs: [
        `*Prev: Chapter 9 — Vision-Language-Action Models · Next: Chapter 11 — World Models & Simulation*`,
      ],
    },
  ],
};
