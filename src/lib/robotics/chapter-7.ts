import type { Chapter } from "../chapters";

// The Robotics Bible, Chapter 7. Prose is authored in
// content/robotics-bible/chapter-7-rl.md and transcribed here verbatim into the
// Chapter/section schema; figures are mounted by id and rendered from the
// diagram registry (rb-7-1 … rb-7-8).

export const chapter7: Chapter = {
  slug: "chapter-7-rl",
  number: "7",
  title: "Reinforcement Learning for Robots",
  summary:
    "Learning the policy when you can't hand-code it: MDPs, value functions, policy gradients, PPO, sim2real, and teacher-student.",
  published: "Aug 17, 2026",
  updated: "Aug 17, 2026",
  futureRef:
    "The *core* ideas here are as stable as anything in the field: the MDP, return and discounting, value functions, the Bellman recursion, the policy-gradient / actor-critic / advantage lineage, and the trust-region intuition behind PPO are settled and won't move. The *engineering* around them evolves fast: PPO is today's default but successors will come, simulators get faster and more parallel every year, and the sim-to-real recipe keeps getting sharper, so treat specific algorithm names and platform capabilities as a 2026 snapshot, not gospel. Come back to Fig 7.3 (value propagating backward through the gridworld) whenever credit assignment stops making sense. Nearly every method in this chapter is, underneath, a smarter way to answer \"which of my past actions deserves credit for what just happened?\"",
  sections: [
    {
      paragraphs: [
        "*When nobody can write the controller, when the dynamics are too messy to model and the body too complex to hand-tune, the robot learns the behavior itself, from trial, error, and reward.*",
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        "Everything in Chapters 3 through 6 shared a quiet assumption: that *you*, the engineer, know how the robot should behave, and your job is just to compute it. Kinematics gave you the hand's position from the joint angles. Control drove the joints to a commanded value. Planning found a path through configuration space. In every case the recipe was hand-designed and the math filled in the numbers. That works beautifully, *when you have a model.*",
        "Now watch it break. Ask a quadruped to sprint across loose rubble, or a five-fingered hand to reorient a screwdriver by feel. Try to write the controller. What's the equation for \"recover when your foot lands on a rock that rolls\"? What's the closed-form law for the contact forces between four fingers and a tumbling object? There isn't one you can write down. The dynamics are contact-rich, discontinuous, and higher-dimensional than any human can reason about. **The villain of this chapter is exactly that: you cannot hand-code the policy.** And there's a second, sneakier villain riding along: **the reward that tells you whether you're doing well is sparse and delayed.** You only learn you fell over *after* a hundred good steps. Which of those steps was the mistake? That's the credit-assignment problem, and it's the thing that makes learning from consequences genuinely hard.",
        "The hero this chapter is **the value function**: a learned estimate of \"how good is this situation,\" which lets us spread a delayed reward *backward in time* onto the actions that earned it. Everything else is machinery around that one idea.",
        "I'm assuming you've read Chapter 1 (the sense-plan-act loop is about to reappear wearing a new costume) and that you're comfortable with the idea of a parameterized function you can nudge with gradients, a neural net, basically. You don't need Chapters 3–6 in detail, but it helps to remember that they built the *classical* stack we're now going to reach past.",
        "Here's the road, and every stop is a fix for the one before it. First, the honest question of *when* to even reach for RL. Then the **MDP**, the formal box we put the problem in. Then **value functions** and the **Bellman equation**, the credit-assignment hero. Then **policy vs value methods** and the exploration dilemma. Then **policy gradients**, which optimize behavior directly but drown in noise. Then **actor-critic**, which fixes the noise with a value function. Then **PPO**, the workhorse that keeps the whole thing from blowing up. And finally the two tricks, **domain randomization** and **teacher-student distillation**, that carry a policy trained in simulation onto a real robot walking on real ice.",
        "Let's go.",
      ],
    },
    {
      heading: "When to reach for RL (and when not to)",
      paragraphs: [
        "Let's be honest up front, because RL is oversold and the honesty is the useful part.",
        "Reinforcement learning is not magic and it is not free. It is **sample-hungry**: a locomotion policy might need the equivalent of *years* of robot experience to train, which is only feasible because we run it in simulation at thousands of times real speed. It is **finicky about reward**: you're not writing the controller anymore, but you *are* writing the reward function, and a badly-shaped reward produces a robot that games it in ways you didn't imagine (a walking reward that rewards forward velocity, with nothing penalizing thrashing, gives you a robot that lurches forward and faceplants, technically moving forward the whole way). And it is **hard to debug**: when a learned policy misbehaves you can't step through the logic, because there is no logic, just a matrix of weights.",
        "So here's the honest framing. **If you have a good model of the dynamics, classical control usually wins.** A robot arm doing pick-and-place on a table has clean, well-understood dynamics; Chapter 4's control and Chapter 6's planning will beat RL on reliability, sample cost, and your sanity. Model-predictive control, solving a little optimization every timestep using a known dynamics model, is extraordinarily good when the model is trustworthy, and it's how Boston Dynamics made Atlas do backflips for years.",
        "**RL earns its keep precisely where the model runs out.** Contact-rich manipulation, where the physics of fingers-on-object is a nightmare of making and breaking contacts. Legged locomotion over terrain you can't predict, where the \"plan a footstep, track it\" pipeline shatters the moment a foot slips. Whole-body athletic behavior where the interactions are too coupled to decompose. In those regimes nobody can write the controller, and learning it from trial and error is not a shortcut, it's the only door.",
        "The mature view, and the one this chapter argues for: **RL and classical control are not rivals, they're a spectrum,** and the best real systems put learned policies exactly where the model is weakest and keep classical methods everywhere the model is strong.",
      ],
    },
    {
      diagram: {
        id: "rb-7-1",
        caption:
          "RL isn't better than classical control; it's the tool for when the model runs out. The worse you know the dynamics, the more learning from consequences is the only option.",
      },
    },
    {
      quiz: {
        question:
          "You're building a robot to screw caps onto bottles on an assembly line, same bottle, same cap, same position, every time. Your colleague wants to train it with RL \"because RL is state of the art.\" What's your objection?",
        answer:
          "This is exactly the regime where classical methods win. The task is repetitive, the geometry is fixed, and the dynamics of the arm are well-modeled, so kinematics plus a force-controlled insertion (Chapter 4) will be more reliable, need zero training data, and be trivial to debug. RL's strengths, coping with unpredictable, unmodelable dynamics, buy you nothing here, while its costs (sample hunger, reward engineering, opacity) are pure downside. The right question is never \"what's state of the art,\" it's \"do I have a good model?\" Here you do, so you use it. Save RL for the bottle that arrives at a random angle on a conveyor bouncing over a bump.",
      },
    },
    {
      heading: "The MDP: putting the problem in a box",
      paragraphs: [
        "Before we can learn behavior, we need a precise container for what \"behavior\" even means. That container is the **Markov Decision Process**, or **MDP**, the standard mathematical frame for sequential decision-making under uncertainty. It's five pieces, and once you see them you'll notice they're just Chapter 1's sense-plan-act loop written formally.",
        "Here they are:",
      ],
    },
    {
      list: [
        "**States, S.** The set of situations the robot can be in. For a walking robot, a state might bundle its joint angles, joint velocities, body orientation, and where its feet are. This is the *sense* beat: what the robot knows right now. We write a particular state as $s$.",
        "**Actions, A.** The things the robot can do. For a legged robot, the action is usually the target angle (or torque) for every joint, all at once. This is the *act* beat. A particular action is $a$.",
        "**Reward, R.** A single number the environment hands back after each action, saying how good that outcome was. Forward progress, +1. Falling over, −100. This is the *only* signal telling the robot what we want. We write the reward at time $t$ as $r_t$.",
        "**Transition dynamics, P.** The rule for how the world changes: given state $s$ and action $a$, which state $s'$ do you land in? Written $P(s' \\mid s, a)$, \"the probability of $s'$ given you did $a$ in $s$.\" This is the physics, and crucially, **in the hard problems we don't get to know P.** That's the whole point. If we knew P exactly, we'd use Chapter 4's control.",
        "**Discount factor, γ (gamma).** A number between 0 and 1 that says how much we care about future reward versus immediate reward. More on this in a second.",
      ],
    },
    {
      paragraphs: [
        "The word **Markov** buried in there means one specific thing: **the future depends only on the current state, not on the whole history of how you got there.** If your state captures everything relevant, position *and* velocity, say, then knowing it is enough to predict what comes next; the past is redundant. This is a modeling assumption (a \"useful lie,\" in Chapter 1's phrase), and a lot of the art of setting up an RL problem is choosing a state that makes it true enough.",
        "The loop runs like this, forever: the robot observes state $s_t$, picks an action $a_t$ according to its **policy** (its behavior, the thing we're trying to learn, written $\\pi$), the environment transitions to $s_{t+1}$ and hands back reward $r_t$. Sense, plan, act, repeat: exactly Fig 1.1, now with a scorekeeper attached.",
        "**So what's the goal?** Not \"maximize the next reward,\" that's greedy and shortsighted. The goal is to maximize the **return**, the *total* reward accumulated over time, discounted so that sooner is worth more than later:",
      ],
    },
    {
      equations: [
        String.raw`G = r_0 + \gamma\,r_1 + \gamma^2\,r_2 + \gamma^3\,r_3 + \dots = \sum_{t} \gamma^t\, r_t`,
      ],
    },
    {
      paragraphs: ["Reading the symbols:"],
    },
    {
      list: [
        "**G** is the **return**: the whole point, the number we want to make big. It's the sum of all future rewards from now on.",
        "**$r_t$** is the reward received at timestep $t$. $r_0$ is right now, $r_1$ is next step, and so on.",
        "**γ** (gamma) is the **discount factor**, between 0 and 1. Notice it's raised to the power $t$, so it shrinks as we look further ahead: a reward 10 steps away is worth only $\\gamma^{10}$ of a reward right now.",
        "**Σ** just means \"add all these up,\" over every future timestep.",
      ],
    },
    {
      paragraphs: [
        "Why discount at all? Two reasons. Practically, it keeps the sum finite for a task that never ends. Conceptually, it encodes a real preference: a reward now is worth more than the same reward later, because later is uncertain, you might fall over before you get there. A γ near 1 (say 0.99) is a patient, far-sighted robot that plans for the long haul; a γ near 0 is an impulsive robot that grabs whatever's immediately in front of it. For locomotion, 0.99 is typical: you want the robot thinking many steps ahead.",
        "Worked example. Say a robot takes three steps and gets rewards $r_0 = 1$, $r_1 = 1$, $r_2 = 1$ (three good steps), with γ = 0.9. The return from the start is $G = 1 + 0.9\\cdot1 + 0.9^2\\cdot1 = 1 + 0.9 + 0.81 = 2.71$. Now suppose the same three good steps but then it falls, $r_3 = -10$. The return becomes $2.71 + 0.9^3\\cdot(-10) = 2.71 - 7.29 = -4.58$. The fall, three steps in the future, drags the whole return negative, *and it should*, because those three \"good\" steps led somewhere bad. Hold that thought. Making the return reflect a future consequence is exactly the credit-assignment magic we're building toward.",
      ],
    },
    {
      diagram: {
        id: "rb-7-2",
        caption:
          "The MDP is Chapter 1's sense-plan-act loop with a scorekeeper. The agent never sees the dynamics P; it only sees the states and rewards the world hands back, and its job is to maximize the discounted sum of those rewards.",
      },
    },
    {
      quiz: {
        question:
          "Two robots learn the same task, one with γ = 0.5 and one with γ = 0.99. A shortcut gives a small reward now but leads to a dead end; the long way gives no reward for many steps but a big reward at the end. Which robot takes which route, and why?",
        answer:
          "The γ = 0.5 robot takes the shortcut. With a discount of 0.5, a reward $n$ steps away is worth only $0.5^n$: after ten steps that's about a thousandth of its face value, so the big delayed reward is almost invisible to it, and the immediate small reward dominates its return. The γ = 0.99 robot takes the long way: at 0.99, even a reward twenty steps out retains about 80% of its value, so the big payoff at the end outweighs the small one now. This is the discount factor doing its job: it literally sets how far into the future the robot is willing to look, and choosing it is one of the real decisions in setting up an RL problem. Too low and the robot is myopic; too high and training becomes unstable because tiny value errors compound over the long horizon.",
      },
    },
    {
      heading: "Value functions: how a delayed reward flows backward",
      paragraphs: [
        "Here's the central problem, stated plainly. The reward is sparse and delayed. You get +1 for reaching the goal and nothing along the way. So how does the robot learn that the *step three moves before the goal* was a good step? It got zero reward for it. Nothing in the immediate signal says \"well done.\"",
        "The fix is to stop asking \"what reward did I just get?\" and start asking \"**how good is it to be here?**\", to attach a number to every *situation* that summarizes all the reward you can expect from it onward. That number is the **value**, and it's the single most important object in RL.",
        "There are two flavors, and you need both.",
        "The **state-value function**, written **V(s)**, is the expected return if you start in state $s$ and follow your policy from then on:",
      ],
    },
    {
      equations: [String.raw`V(s) = \mathbb{E}\big[\,G \mid \text{starting from state } s\,\big]`],
    },
    {
      paragraphs: [
        "Reading it: $V(s)$ answers \"starting here, and behaving the way I currently behave, how much total discounted reward should I expect?\" A state one step from the goal has high value. A state teetering on the edge of a cliff has low value, even if the immediate reward there is zero, *because of where it leads.* That's the key move: **value looks past the immediate reward to the whole future the state opens onto.**",
        "The **action-value function**, written **Q(s, a)**, is almost the same but pins down the first move too:",
      ],
    },
    {
      equations: [
        String.raw`Q(s, a) = \mathbb{E}\big[\,G \mid \text{take action } a \text{ in state } s,\ \text{then follow your policy}\,\big]`,
      ],
    },
    {
      paragraphs: [
        "Reading it: $Q(s, a)$ answers \"if I do *this specific action* right now and then behave normally, how good is that?\" The difference from V is subtle but decisive: Q evaluates each *action*, so if you know Q for every action available, you can just pick the best one. That \"pick the highest-Q action\" idea is the seed of a whole family of methods, coming up next.",
        "Now, the beautiful part, the thing that makes value functions computable at all. Value is **self-consistent** in a recursive way, and that recursion is the **Bellman equation**. In words: *the value of a state equals the reward you get now, plus the discounted value of wherever you land next.*",
      ],
    },
    {
      equations: [String.raw`V(s) = r + \gamma \cdot V(s')`],
    },
    {
      paragraphs: [
        "Reading the symbols: $V(s)$ is the value of where you are, $r$ is the reward you collect on this step, $\\gamma$ is the discount, and $V(s')$ is the value of the next state you transition into. (The full equation averages over all the next-states the dynamics might produce and all the actions your policy might take, but this stripped-down version carries the whole intuition.) The value of *here* is defined in terms of the value of *there*: value is a chain, each link pinned to the next.",
        "Why does this matter? Because it tells you **how the reward propagates backward.** The state next to the goal gets its value directly from the goal's reward. The state next to *that* one gets its value from the first one, discounted. And so on, rippling outward, so that a distant reward eventually colors states many steps away, each a little dimmer, thanks to γ. **This is the credit-assignment hero doing its work:** a single reward at the goal, through repeated application of the Bellman relation, assigns credit to every state on the path that led there. The delayed reward flows backward in time until every good decision along the way is marked as good.",
        "Let's do it by hand on a tiny gridworld. Picture a 1×4 corridor of cells (call them A, B, C, Goal) where the robot moves right one cell per step. The Goal cell gives reward +10; every other step gives 0. Discount γ = 0.9. What's the value of each cell under a policy that always moves right?",
        "Start at the Goal side and work backward, which is exactly what Bellman lets us do. Cell C is one step from the Goal: $V(C) = 0 + 0.9 \\cdot V(\\text{Goal})$. Take $V(\\text{Goal}) = 10$. So $V(C) = 0.9 \\cdot 10 = 9$. Cell B: $V(B) = 0 + 0.9 \\cdot V(C) = 0.9 \\cdot 9 = 8.1$. Cell A: $V(A) = 0.9 \\cdot V(B) = 0.9 \\cdot 8.1 = 7.29$. Look at what happened: **the +10 at the goal, which the robot doesn't see until the very end, has painted a gradient of value all the way back down the corridor** (7.29, 8.1, 9, 10), each cell knowing it's a step closer to the payoff, *even though every one of those cells hands out a reward of zero.* That gradient is what lets the robot know which way to go before it ever reaches the reward. Sparse reward, solved, by value flowing backward.",
      ],
    },
    {
      diagram: {
        id: "rb-7-3",
        caption:
          "Watch credit assignment happen: one reward at the goal spreads backward through the Bellman equation, painting every cell with how-good-is-it-to-be-here, even cells that never give any reward themselves.",
      },
    },
    {
      quiz: {
        question:
          "In the corridor example, we computed $V(A) = 7.29$ even though standing in cell A earns a reward of exactly zero. In plain English, what does that 7.29 represent, and why isn't it zero?",
        answer:
          "The 7.29 is the *expected future return* from cell A, not the reward you get *at* A (which is zero), but the total discounted reward you can expect to collect *from A onward* by following the policy. Cell A is three steps from a +10 goal, so its value is $10$ discounted by $\\gamma^3 = 0.9^3 \\approx 0.729$, giving 7.29. The whole point of a value function is that it looks past the immediate reward to the future the state leads to, which is exactly why a cell handing out zero reward can still be valuable: it's on the road to something good. This is how RL solves sparse, delayed reward: the Bellman recursion propagates the distant payoff backward until even far-off states know which way leads home.",
      },
    },
    {
      heading: "Two ways to learn, and the explore-exploit dilemma",
      paragraphs: [
        "Now we have value functions. There are, broadly, **two philosophies** for turning them into behavior, and the whole field splits along this line.",
        "**Value-based methods** learn a value function (usually Q(s, a)) and then act by always picking the highest-value action. The policy is *implicit*: it's just \"look up Q for every action here, do the best one.\" You never represent the behavior directly; you represent *how good things are* and let that dictate the behavior. The classic here is **Q-learning** (Watkins, 1989): repeatedly nudge your estimate of $Q(s, a)$ toward $r + \\gamma \\cdot \\max Q(s', a')$, the Bellman equation again, now used as a learning rule. Do that enough and Q converges to the truth, and greedy action on the true Q is optimal. Q-learning powered the famous Atari-from-pixels result (DQN, Mnih et al., 2015).",
        "**Policy-based methods** skip the value function as the end product and learn the behavior *directly*: a policy $\\pi_\\theta(a \\mid s)$, a function with parameters $\\theta$ (a neural net's weights) that takes a state and outputs an action (or a probability over actions). You then adjust $\\theta$ to make good actions more likely. We'll spend the rest of the chapter here, because for robots with continuous actions (\"set this joint to 1.37 radians,\" not \"move left or right\") policy methods are the natural fit, and they're what actually runs on legged robots.",
        "But both philosophies hit the same wall, the **exploration-exploitation dilemma**, and it's worth meeting head-on because it's one of the deepest tensions in all of learning-from-experience.",
        "Here's the bind. To get reward, you should **exploit**: take the action you currently believe is best. But your beliefs are based on limited experience, and the action you *think* is best might just be the best of the few you've tried. Maybe there's a far better action you've never sampled. To find it you have to **explore**: try something that looks worse, on the gamble that it's actually better. Explore too little and you lock into a mediocre habit forever, confidently. Explore too much and you never cash in on what you've learned. Every RL algorithm needs an answer to this.",
        "The simplest answer, and a genuinely useful one, is **ε-greedy** (epsilon-greedy): most of the time (probability 1−ε) do the action you believe is best, but a small fraction of the time (probability ε) do something random. Set ε = 0.1 and the robot exploits 90% of the time and explores 10%. Often you start with ε high (explore a lot early, when you know nothing) and decay it over training (exploit more as your beliefs sharpen). It's crude (random exploration is inefficient in big spaces) but it captures the essential move: **you must deliberately do things you don't think are optimal, or you'll never discover that they are.**",
      ],
    },
    {
      quiz: {
        question:
          "A delivery robot has learned that Route A takes 10 minutes and always uses it. Route B, which it tried once early on when a road happened to be closed, took 25 minutes, so it never tries B again. Why might pure exploitation be leaving reward on the table, and how does ε-greedy help?",
        answer:
          "The robot's estimate of Route B is based on a single unlucky sample (a one-off road closure) and it has frozen that estimate by never revisiting it. Route B might normally be 6 minutes, better than A, but pure exploitation guarantees the robot will never find out, because it only ever takes the action it currently believes is best. This is the exploitation trap: converging confidently on a merely-okay choice because you stopped gathering evidence about the alternatives. ε-greedy fixes it by forcing the robot to occasionally (say 10% of the time) take a non-greedy action, so Route B eventually gets sampled again under normal conditions, its estimate corrects, and if it really is faster the robot switches. The lesson generalizes: an agent that never acts against its current beliefs can never discover those beliefs are wrong.",
      },
    },
    {
      heading: "Policy gradients: optimize the behavior directly",
      paragraphs: [
        "Let's commit to the policy-based path, because it's where robots live. We have a policy $\\pi_\\theta(a \\mid s)$, a neural net with weights $\\theta$ that reads the state and outputs a distribution over actions. We want to find the $\\theta$ that maximizes expected return. The question is: **which direction should we nudge $\\theta$?**",
        "The idea is almost embarrassingly intuitive. **Run the policy, see what happened, then make the actions that led to high return more likely and the ones that led to low return less likely.** If a rollout went well, whatever you did, do more of that. If it went badly, do less. Reinforce success, suppress failure. That's it, that's the whole instinct, and remarkably it can be made mathematically exact.",
        "The exact version is the **policy gradient theorem**, and its simplest incarnation is the **REINFORCE** algorithm (Williams, 1992). The update direction for the parameters is:",
      ],
    },
    {
      equations: [
        String.raw`\nabla_\theta J = \mathbb{E}\big[\, \nabla_\theta \log \pi_\theta(a \mid s) \cdot G \,\big]`,
      ],
    },
    {
      paragraphs: [
        "Let's read every symbol, because this little expression is the beating heart of modern robot learning:",
      ],
    },
    {
      list: [
        "**$\\nabla_\\theta J$** is the gradient of the objective $J$ (expected return) with respect to the parameters, the direction to step $\\theta$ to increase return. We climb it.",
        "**$\\mathbb{E}[\\dots]$** means \"average over many rollouts\"; we can't compute this exactly, so we estimate it by sampling episodes and averaging.",
        "**$\\nabla_\\theta \\log \\pi_\\theta(a \\mid s)$** is the gradient of the log-probability of the action we actually took. Intuitively, it's the direction in parameter space that would make *this action, in this state, more likely.* Push $\\theta$ this way and next time you're in $s$, you'll pick $a$ a bit more often.",
        "**G** is the return that followed, the same discounted return from before. It's the *weight* on the update.",
      ],
    },
    {
      paragraphs: [
        "Put the pieces together and the mechanism is gorgeous. For each action you took, you compute \"the direction that makes this action more likely\" and then **scale it by how well the episode went.** If $G$ is big and positive, you take a big step toward making that action more likely, reinforcing it. If $G$ is negative, the sign flips and you step *away*, suppressing it. Actions from good episodes get pushed up, actions from bad episodes get pushed down, all automatically, just by multiplying the \"make-it-likelier\" direction by the return. The robot bootstraps a good policy out of nothing but \"try stuff, keep what worked.\"",
        "Worked example, kept tiny. A robot in some state can go **left** or **right**, currently 50/50. It runs ten episodes. The five where it went right averaged a return of +8; the five where it went left averaged −2. REINFORCE takes the \"make-right-more-likely\" direction and scales it by +8 (a strong push up), and the \"make-left-more-likely\" direction scaled by −2 (a push *down*, because of the negative sign). Net effect: after the update, $\\pi_\\theta(\\text{right} \\mid s)$ climbs above 50% and $\\pi_\\theta(\\text{left} \\mid s)$ drops. The policy has learned, from raw experience and nothing else, that right is better here. Multiply that across millions of states and you have a walking robot.",
        "So why isn't this the end of the chapter? Because REINFORCE has a **fatal flaw: enormous variance.** The weight on each update is $G$, the *whole-episode return*, and whole-episode returns are wildly noisy. An episode might get a great return not because your action was good but because of a lucky bounce ten steps later; another might tank through no fault of the action you're crediting. You're using one very noisy number to judge every action in the episode, indiscriminately: the good actions in a bad episode get punished, the bad actions in a good episode get rewarded. The gradient estimate is correct *on average*, but any single estimate is so noisy that learning is glacially slow and unstable. You're trying to hear a whisper in a hurricane.",
      ],
    },
    {
      diagram: {
        id: "rb-7-4",
        caption:
          "Policy gradients push up the probability of whatever led to high return and push down the rest. It works, but because every action is weighted by the whole noisy episode return, the update swings from batch to batch — crank the wind and the measured spread of the update overtakes the update itself, which is REINFORCE's fatal high-variance flaw.",
      },
    },
    {
      quiz: {
        question:
          "In an episode, a robot makes a genuinely great action at step 3, then a terrible one at step 20 that causes a low overall return. What does plain REINFORCE do to the great step-3 action, and why is that a problem?",
        answer:
          "Plain REINFORCE weights *every* action in the episode by the *same* whole-episode return, so because the episode ended badly, the great step-3 action gets pushed *down* right alongside the genuinely bad step-20 action. It can't tell them apart; it has only one number, the total return, to judge the entire trajectory. That's the high-variance problem made concrete: credit (and blame) is assigned bluntly to the whole episode instead of to the individual actions that deserved it, so good actions in bad episodes get punished and vice versa. Over many episodes it averages out to the right answer, but any single update is so noisy that learning crawls. The fix, next section, is to judge each action by a *local* estimate of how good it was rather than by the whole noisy episode, which is precisely what a learned value function gives us.",
      },
    },
    {
      heading: "Actor-critic: judge each action, don't just tally the episode",
      paragraphs: [
        "The variance problem has a clean diagnosis: we're judging each action by the *entire noisy episode return* when we should be judging it by *how good that specific action was, right there.* We already built the tool for \"how good is a situation\": the value function. Time to put it to work.",
        "The move is called **actor-critic**, and it's exactly what it sounds like: two learned pieces working together.",
      ],
    },
    {
      list: [
        "The **actor** is the policy $\\pi_\\theta$; it chooses actions. It's the thing we ultimately want.",
        "The **critic** is a learned value function (V, or something like it); it doesn't choose anything; it *judges*. After the actor takes an action, the critic estimates how good that was, and the actor updates based on the critic's judgment instead of the raw episode return.",
      ],
    },
    {
      paragraphs: [
        "Why does this cut variance? Because the critic provides a **baseline**, a sense of what return was *expected* from this state, so the actor can update on the *difference* between what actually happened and what was expected, rather than on the raw, absolute return. That difference is the star of this section: the **advantage.**",
      ],
    },
    {
      equations: [String.raw`A(s, a) = Q(s, a) - V(s)`],
    },
    {
      paragraphs: [
        "Reading it: $Q(s, a)$ is how good it is to take action $a$ in state $s$ (then behave normally); $V(s)$ is how good state $s$ is *on average*, across whatever actions the policy would take. Their difference, $A(s, a)$, answers the exact question we want: **\"how much better than average was this particular action?\"** If $A > 0$, the action beat expectations, so reinforce it. If $A < 0$, it underperformed the baseline, so suppress it. If $A \\approx 0$, it was about what you'd expect, so leave it mostly alone.",
        "Now re-read the policy-gradient update with $A$ in place of $G$:",
      ],
    },
    {
      equations: [
        String.raw`\nabla_\theta J = \mathbb{E}\big[\, \nabla_\theta \log \pi_\theta(a \mid s) \cdot A(s, a) \,\big]`,
      ],
    },
    {
      paragraphs: [
        "Same shape as REINFORCE, one crucial swap: we weight the \"make-this-action-likelier\" direction by the **advantage** instead of the raw return. And this is a genuinely better signal. The raw return $G$ swings wildly with luck that has nothing to do with the action; the advantage subtracts off the state's baseline value, cancelling most of that common noise and leaving a much cleaner read on *this action's contribution.* Same unbiased direction as before, dramatically less variance. (Why is subtracting something *legal*? First principles: the \"make-it-likelier\" directions, averaged over every action the policy might pick, sum to exactly zero, because the probabilities have to keep summing to 1. So multiplying them by any number that depends only on the state, like $V(s)$, also averages to zero. Subtracting the baseline changes the noise, never the average direction.) The whisper gets louder because we turned down the hurricane.",
        "Worked example. Your robot is in a state where the critic says the expected return is $V(s) = 5$. It tries an action and things work out to an estimated $Q(s, a) = 7$. The advantage is $A = 7 - 5 = +2$: this action beat the baseline by 2, so nudge it up, but only *gently* (it was a bit better than average, not a miracle). Contrast plain REINFORCE, which might have weighted that same action by a raw return of $+7$, a much bigger, blunter push that also swept in all the value that was coming *anyway* just from being in a good state. The advantage strips out the \"anyway\" and keeps only the credit the action actually earned. That's the whole trick.",
        "One practical wrinkle worth naming, because you'll see it in every real system: we don't have true Q and V, only estimates, and how we estimate the advantage trades bias against variance. The standard tool is **GAE, Generalized Advantage Estimation** (Schulman et al., 2015), which blends short-horizon estimates (low variance, a bit biased) and long-horizon ones (low bias, higher variance) with a knob (usually written λ) to tune the mix. You don't need the derivation; you need the name and the idea: **GAE is the practical recipe for computing the advantage that goes into the update, and it's essentially universal in modern policy-gradient robotics.**",
      ],
    },
    {
      diagram: {
        id: "rb-7-5",
        caption:
          "The critic supplies a baseline, the average value of the state, and the actor updates on the advantage, the gap above or below it. Subtracting the baseline cancels the luck that's common to the whole state: the same sampled visits, reweighted by advantage instead of raw return, collapse to a measurably tighter spread — actor-critic taming policy-gradient variance.",
      },
    },
    {
      quiz: {
        question:
          "Two states, X and Y. In X, every action returns about 100 (it's just a great place to be). In Y, every action returns about 0. In state X you take an action that returns 101. Should the policy strongly reinforce that action? What does the advantage say versus the raw return?",
        answer:
          "No, it should barely nudge it. The raw return is 101, which plain REINFORCE would treat as a huge signal to reinforce the action strongly. But that 101 is almost entirely due to *being in state X*, not to the action you chose; every action there returns about 100. The advantage exposes this: with $V(X) \\approx 100$, the action's advantage is $101 - 100 = +1$, tiny. It was only marginally better than average, so it deserves only a marginal push. This is exactly the noise the baseline removes: it strips out the value that comes from the *situation* and isolates the value that comes from the *action*, so the policy learns from what it actually controlled rather than from the luck of where it happened to be.",
      },
    },
    {
      heading: "PPO: the update that refuses to blow up",
      paragraphs: [
        "Actor–critic gives us a lower-variance gradient. But there's one more villain, and it's the one that historically made policy-gradient RL a nightmare to actually run: **a single update that's too big can destroy the policy.**",
        "Here's the trap. The gradient tells you a *direction* to move $\\theta$, and it's only trustworthy *locally*, near your current policy. But if you take a big step in that direction, you can overshoot into a region where the policy is much worse, and (this is the cruel part) **because RL is on-policy, all your data was collected by the old policy.** Once you've lurched to a bad new policy, the experience you have is no longer about the policy you're now running, so you can't easily recover; you just collected a batch of garbage and stepped off a cliff. Performance collapses, sometimes irreversibly. Old policy-gradient methods were maddeningly sensitive to step size for exactly this reason.",
        "The fix is to **limit how far the policy is allowed to move in a single update**, to keep each step inside a \"trust region\" where the gradient's promise still holds. The method that made this practical, robust, and stupidly popular is **PPO, Proximal Policy Optimization** (Schulman et al., 2017), \"proximal\" as in *stay close*: never let one update carry the policy far from the one that gathered the data. PPO is, no exaggeration, **the workhorse of robot RL**, the default algorithm that trains the overwhelming majority of legged-locomotion and manipulation policies you've read about.",
        "The mechanism is a small, clever tweak to the objective. Define the **probability ratio**, how much more (or less) likely the new policy is to take the action than the old one was:",
      ],
    },
    {
      equations: [
        String.raw`\text{ratio} = \frac{\pi_{\text{new}}(a \mid s)}{\pi_{\text{old}}(a \mid s)}`,
      ],
    },
    {
      paragraphs: [
        "A ratio of 1 means the policy hasn't changed on this action; 1.3 means the new policy is 30% more likely to take it; 0.7 means 30% less likely. The plain policy-gradient objective is basically $\\text{ratio} \\cdot A$: push the ratio up when the advantage is positive, down when it's negative. The danger is that $\\text{ratio}$ can run away, the update making a good action *wildly* more likely in one step, far past where the gradient was trustworthy. Concretely: with ε = 0.2 the band is $[0.8, 1.2]$, so an action the old policy took 10% of the time can rise to at most 12% in this update; a 1.5× leap to 15% gets clipped, and the rest of the improvement has to wait for fresh data collected under the new policy.",
        "PPO's answer is the **clipped surrogate objective.** In words: **let the ratio help you, but only up to a limit; clip it so the policy can't move too far in one step.** Formally you take the *smaller* of the raw objective and a version where the ratio is clipped to a band around 1 (typically $[1-\\varepsilon,\\ 1+\\varepsilon]$ with ε ≈ 0.2):",
      ],
    },
    {
      equations: [
        String.raw`\text{objective} = \min\big(\, \text{ratio} \cdot A,\ \ \text{clip}(\text{ratio},\, 1-\varepsilon,\, 1+\varepsilon) \cdot A \,\big)`,
      ],
    },
    {
      paragraphs: [
        "Here's the intuition, which is the part that matters. Suppose the advantage is **positive**, a good action, you want to make it more likely. The objective rewards raising the ratio... but only until the ratio hits $1+\\varepsilon$. Past that, the clipped term takes over and **flattens out**: pushing the ratio higher yields *no more objective*, so the gradient goes to zero and the update stops driving the policy further in that direction. You get the improvement, then the door closes. Now suppose the advantage is **negative**, a bad action, you want to make it less likely. Symmetrically, the objective lets you lower the ratio until it hits $1-\\varepsilon$, then flattens. Either way, **the objective is flat outside the trust region, so no single update can shove the policy more than a bounded amount from where it started.** The $\\min$ is what makes it safe in both directions: it always takes the more conservative (less optimistic) of the two terms, so PPO never rewards moving too far.",
        "That's the whole idea. It's not a hard trust-region constraint like its ancestor TRPO; it's a cheap, soft, clip-based approximation that's *good enough* and vastly simpler to implement, which is exactly why it took over. Three properties make PPO the default for robots:",
      ],
    },
    {
      list: [
        "**It's stable.** The clip means you can run many gradient steps on each batch of data without the policy exploding, so it's forgiving of hyperparameters in a way older methods never were.",
        "**It's on-policy but data-efficient enough.** You collect a batch with the current policy, do several clipped updates on it, then throw it away and collect fresh; the clip is what lets you safely reuse the batch a few times instead of once.",
        "**It parallelizes ferociously.** Because it just needs lots of rollouts, you can run **thousands of simulated robots at once**, all feeding experience into one policy. This is the property that makes modern sim-based robot RL possible at all, and it's the bridge to the last two sections.",
      ],
    },
    {
      diagram: {
        id: "rb-7-6",
        caption:
          "PPO lets the policy improve, then slams a soft ceiling on how far it can move in one step: outside the clip band the objective goes flat, the gradient dies, and the update can't shove the policy off a cliff. That one trick is why PPO is stable enough to train thousands of robots in parallel.",
      },
    },
    {
      quiz: {
        question:
          "PPO clips the probability ratio to a band like [0.8, 1.2]. Suppose an action has a large positive advantage, and the new policy already makes it 1.2× as likely as the old one did. What happens if the gradient wants to push the ratio to 1.5, and why is that the desired behavior?",
        answer:
          "Nothing further happens; the update is clipped at 1.2. Once the ratio reaches the top of the band (1+ε), the clipped term in the $\\min$ takes over and the objective goes flat, so the gradient with respect to pushing that ratio higher becomes zero and the policy stops moving in that direction *for this update*. That's exactly what we want: the advantage estimate and the gradient are only trustworthy near the old policy, and a 1.5× move would be a big, extrapolated leap into territory where our data no longer describes the policy we'd be running, the on-policy trap that collapses performance. By capping the step, PPO takes the improvement it can trust and defers the rest to the next iteration, after fresh data is collected under the updated policy. Small trustworthy steps, repeated, beat one big leap off a cliff.",
      },
    },
    {
      heading: "Sim-to-real: training in a world that isn't quite ours",
      paragraphs: [
        "We now have a stable algorithm that eats parallel rollouts for breakfast. But rollouts on a *real* robot are precious and slow: you can't crash a real quadruped a million times, and even if you could, it'd take years and a warehouse of spare parts. So the entire modern approach is: **train in simulation, where you can run thousands of robots at thousands of times real speed, then transfer the policy to the real robot.** This is **sim-to-real**, and it's how essentially every impressive legged-RL result was made.",
        "The enabling technology is massively-parallel physics simulation: think **Isaac Gym-style** GPU simulators that run thousands of robot instances simultaneously on a single graphics card, each experiencing slightly different situations, all pouring experience into one shared PPO update. A locomotion policy that would take years of real-world walking trains in *hours* this way. (We'll go deep on simulators in Chapter 11; here we just need that they exist and they're fast.)",
        "But there's a villain waiting, and it's the recurring nemesis of this whole subfield: **the reality gap.** The simulator is a *model* of physics, and like every model it's wrong in a thousand small ways: the friction is a little off, the motors have unmodeled delay, the robot's true mass differs from the CAD file, the ground has give the sim doesn't capture. A policy that's *perfect in sim* can walk beautifully in the simulator and then fall flat on its face in reality, because it learned to exploit quirks of the fake physics that don't exist in the real world. This is exactly Chapter 1's Villain #2 (every measurement lies, every model is a little wrong) scaled up to an entire world.",
        "The key trick that closes the gap is **domain randomization** (Tobin et al., 2017). The idea is almost paradoxical and completely brilliant: **instead of trying to make the simulator exactly match reality, deliberately make it *vary*, randomizing the physics parameters on every episode,** so the policy is forced to work across a huge *range* of physics, and the real world just becomes one more variation it already handles. Randomize the friction between feet and ground. Randomize each link's mass. Randomize motor strength, sensor noise, control latency, terrain roughness. Every episode, roll new dice. A policy that survives *all* of that can't have overfit to any one fake physics: it had to learn something robust enough to cover the whole range, and reality lands somewhere inside that range.",
        "Think of it as the difference between studying for one specific exam versus studying so broadly that any exam is easy. Overfit to a single simulation and you're memorizing one exam; randomize aggressively and you're building genuine competence that transfers. The reality gap doesn't get *closed* so much as *swallowed*: reality becomes just another sample from the distribution the policy already masters. (Domain randomization gets its full treatment in Chapter 11; here it's the punchline of sim-to-real.)",
      ],
    },
    {
      diagram: {
        id: "rb-7-7",
        caption:
          "Don't match reality, outrun it. By randomizing masses, friction, latency, and terrain every episode, the policy is forced to handle a whole distribution of physics, and the real world becomes just one more variation it already knows how to survive.",
      },
    },
    {
      quiz: {
        question:
          "A team trains a walking policy in a simulator they've calibrated *extremely* carefully to match their specific robot (same measured masses, same measured friction) with no randomization. It walks perfectly in sim. Why might it still fail on the real robot, and how would domain randomization have helped?",
        answer:
          "Even a carefully-calibrated simulator is wrong in ways you didn't measure or can't model (motor temperature changing torque, a slightly worn foot, unmodeled cable dynamics, the exact friction of *this particular* patch of floor, small timing delays) and a policy trained on one fixed physics is free to overfit to that physics, exploiting quirks that reality doesn't share. So it walks flawlessly in the fake world and stumbles in the real one: that's the reality gap. Domain randomization would have helped by never letting the policy see a single fixed physics in the first place: with mass, friction, latency, and terrain randomized every episode, the policy is forced to learn a strategy robust across a *range* of conditions rather than tuned to one, and the real robot's true parameters (whatever they turn out to be) fall inside that range. Robustness comes from training on variation, not from perfecting a single match.",
      },
    },
    {
      heading: "Teacher-student: learning with information the real robot won't have",
      paragraphs: [
        "Domain randomization makes a policy robust, but it exposes a second, subtler problem, and the solution to it is one of the most elegant ideas in modern robotics.",
        "Here's the tension. In simulation you have access to the **ground truth of everything**: the exact friction under each foot, the precise height of the terrain around the robot, whether each foot is really in contact, the true mass of the payload. This is called **privileged information**: the simulator knows it perfectly, and it would make learning *so much easier* if the policy could use it. But **the real robot can't measure most of it.** It doesn't know the true friction of the ice it's stepping onto; it can't see the terrain height buried under its own body; it only has its onboard sensors: joint encoders, an IMU, maybe a camera. So a policy that leans on privileged information trains beautifully in sim and is useless in reality, because at deployment those inputs simply aren't there.",
        "The fix is **teacher-student learning** (also called **privileged learning**), and it's a two-stage trick:",
      ],
    },
    {
      list: [
        "**Train a teacher in simulation *with* the privileged information.** Because the teacher gets to see true friction, terrain height, and contact states, learning is fast and it reaches excellent, robust behavior: RL succeeds where it would've struggled with only noisy sensors. The teacher is a *cheat*, and that's fine, because it lives only in sim.",
        "**Distill the teacher into a student that uses only onboard sensors.** Now train a second policy, the student, that takes *only* what the real robot will actually have (a history of joint readings and IMU data, no privileged info), and train it to *imitate the teacher's actions.* The student can't see the true friction, so it has to *infer* the relevant hidden state from the pattern of its recent sensor history (the way you feel a floor is slippery from how your foot skids) and reproduce what the teacher, who could see the friction directly, would have done.",
      ],
    },
    {
      paragraphs: [
        "The student ends up with the teacher's robust behavior but running entirely on real-robot-available inputs. It's the deployable one. **The teacher's job was never to be deployed; it was to make a hard learning problem easy, so that a good policy exists to imitate.** You cheat during training precisely so you don't have to cheat at deployment.",
        "This isn't a toy idea: **it's how robust legged locomotion actually got solved.** ETH Zürich's work on the ANYmal quadruped (**Lee et al., 2020, Science Robotics**) used exactly this teacher-student, privileged-learning recipe to walk over rough, unseen terrain, and the follow-up (**Miki et al., 2022**) fused proprioception with exteroception to cross moss, mud, snow, and rubble at speed. The results are striking for a reason that falls straight out of the method: **robustness to disturbances you never explicitly trained for.** A robot trained this way, across randomized physics, distilled to infer hidden terrain from its own sensor history, will carry an unknown payload it's never felt, absorb a kick it never saw coming, and stay upright on ice it was never told about, because from its perspective those are all just more variation of the kind it learned to handle. The competence generalizes because the training *demanded* generalization.",
        "Worth situating the flagship platforms here. **Boston Dynamics' Spot and Atlas** are the most famous legged robots on Earth, and historically their jaw-dropping agility came from **model-predictive control**, the classical \"know the dynamics, solve an optimization every timestep\" approach from the top of this chapter, engineered to an extraordinary degree. That's the honest counterweight to the RL hype: hand-crafted model-based control, done superbly, produced backflipping robots years before RL locomotion matured. But the field is converging: Boston Dynamics and others are **increasingly adopting learned and RL-based policies** for the most athletic, contact-rich, hard-to-model behaviors, exactly where this chapter predicted the model would run out. The future isn't RL *replacing* control; it's each doing what it's best at, in one stack.",
      ],
    },
    {
      diagram: {
        id: "rb-7-8",
        caption:
          "Cheat in training so you don't have to cheat at deployment: a teacher learns fast using privileged ground truth the real robot can't measure, then hands its behavior to a student that runs on onboard sensors alone. This is how ANYmal learned to walk over terrain it had never seen, and why robustness to kicks, payloads, and ice falls out for free.",
      },
    },
    {
      quiz: {
        question:
          "Why not just train the student directly with RL on onboard sensors, and skip the teacher entirely? What does the teacher stage actually buy you?",
        answer:
          "You *can* train directly on onboard sensors, but it's much harder and slower, because the policy has to simultaneously (a) figure out the hidden state of the world from noisy, partial sensor history *and* (b) learn what to do about it: a brutal learning problem where the reward signal is filtered through the robot's own perceptual uncertainty. The teacher stage decouples these. By handing the teacher the privileged ground truth, you let it learn the *control* problem cleanly and fast, unencumbered by perception, so you're guaranteed a good, robust policy exists. Distilling into the student then reduces to a much easier *supervised imitation* problem: the student only has to learn to reproduce the teacher's known-good actions from its sensors, inferring the hidden state along the way, with a clear target to match instead of a sparse reward to chase. In short, the teacher converts one hard joint problem (perceive-and-control from scratch under sparse reward) into two easier sequential ones, which is why the teacher-student recipe reliably produces robust locomotion where end-to-end training struggles.",
      },
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        "Step back and look at the arc. Chapters 3 through 6 built behavior by *hand*, with math, and that's still the right move whenever you have a good model. This chapter was about what to do when you *don't*: when the dynamics are too contact-rich, too discontinuous, too high-dimensional for any human to write the controller. The answer was to **learn the policy from trial, error, and reward.**",
        "The chain of fixes, each answering the last one's flaw: we framed the problem as an **MDP** (states, actions, reward, dynamics, discount) whose goal is to maximize the **discounted return** $G = \\sum \\gamma^t r_t$. To handle sparse, delayed reward we built **value functions** ($V(s)$ and $Q(s, a)$) and the **Bellman equation** that lets a distant reward flow backward in time to credit the actions that earned it, our credit-assignment hero. We chose the **policy-gradient** path for continuous-control robots and hit its **fatal variance** flaw, fixed it with **actor-critic** and the **advantage** $A = Q - V$ (estimated in practice by **GAE**), then fixed policy-gradient's *other* flaw, catastrophic overshooting updates, with **PPO's clipped objective**, the stable, parallelizable workhorse that trains thousands of simulated robots at once. Finally we crossed from sim to reality: **domain randomization** swallows the reality gap by training across a distribution of physics, and **teacher-student distillation** lets a privileged-information teacher train a sensor-only student that inherits robust, deployable behavior, the recipe behind ANYmal's all-terrain walking and, increasingly, Spot and Atlas's athletic feats.",
        "Be clear-eyed about the costs, because the honesty is the point: RL is **sample-hungry**, **reward design is genuinely hard** (a badly-shaped reward gives you a robot that games it), and a learned policy is **hard to debug** because there's no logic to step through, just weights. Reach for it when the model runs out, not before.",
        "Where does this go next? Notice the quiet assumption we made all chapter: that the robot *has* a clean state to reason about, joint angles, terrain height, contact flags. But out in the world, that state has to come from raw pixels and point clouds, and turning an image into \"there is a mug 40 cm ahead, slightly rotated\" is its own enormous problem. That's Chapter 8, perception (vision and vision-language models), the *sense* beat of Chapter 1's loop, done with modern learning. Master perception and control-by-learning, and Chapter 9 fuses them into the vision-language-action models steering today's robots. Onward.",
      ],
    },
  ],
};
