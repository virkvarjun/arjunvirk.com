import type { Chapter } from "../chapters";

// Chapter 4 of the Robotics Bible. Prose is authored in
// content/robotics-bible/chapter-4-control.md and transcribed here verbatim
// into the shared Chapter/section schema; figures are mounted by id (rb-4-M)
// and rendered from the diagram registry.

export const chapter4: Chapter = {
  slug: "chapter-4-control",
  number: "4",
  title: "Control: From PID to Whole-Body",
  summary:
    "Making the body actually track a command against gravity and friction: P, I, D, feedforward, and force/impedance control.",
  published: "Jul 27, 2026",
  updated: "Jul 27, 2026",
  futureRef:
    "PID is evergreen — the three-term law hasn't fundamentally changed since Minorsky in 1922 and it still runs the overwhelming majority of real control loops, so this chapter's core will never go stale. Come back to Fig 4.3 (the full PID tuner) whenever a robot is oscillating, sagging, or sluggish and you need to remember which knob fixes which symptom — underdamped needs D, steady-state error needs I or feedforward, sluggish needs more P. The frontier that *is* moving is whole-body control and learned control (Chapter 7): where the boundary sits between what we hand-design and what we train shifts every year, but the classical controllers here remain the floor everything else is measured against — and often the safety layer wrapped around the learned stuff.",
  sections: [
    {
      paragraphs: [
        "*Chapter 3 told you which joint angles you want. Control is how you actually get there — in a world with gravity, friction, and inertia all pushing back.*",
      ],
    },
    {
      heading: "Where we're going",
      paragraphs: [
        "Here's the gap that ruins your whole day the first time you drive a real motor: you command it to go to 90° and it doesn't. It sags to 84°, or it swings past to 97° and rings like a bell, or it just sits there humming. Chapter 3 handed you a beautiful answer — *these* are the joint angles that put the hand where you want it. But an angle on paper is a wish. A motor lives in a world with gravity pulling the arm down, friction gumming up the joints, and inertia that refuses to start or stop on command. **The command and the reality are two different things, and control is the entire discipline of closing that gap.**",
        "That gap is this chapter's villain: the space between *what you told the robot to do* and *what the robot actually did*. The world pushes back, always, and an open-loop plan that ignores the pushback falls apart the instant reality deviates from the model. Our hero is the same one Chapter 1 promised would return — **feedback**, Villain #2's nemesis, the trick of constantly re-measuring and correcting instead of commanding once and hoping.",
        "I'm assuming you've read Chapter 3, so you're comfortable with joint angles, end-effector poses, and the idea that a robot's configuration is a handful of numbers. You don't need any control theory going in — we build it from one equation, `e = setpoint − measurement`, and grow everything else out of watching simpler ideas break.",
        "Here's the road, and every stop is a fix for the one before it. We start open-loop and watch it fail the moment the world deviates. Feedback fixes that — proportional control — but P alone settles with a permanent error against gravity. Integral action kills that error but can wind up. Derivative action damps the resulting overshoot but amplifies noise. We stack all three into PID, then admit reaction is slow and add feedforward so the controller *predicts* instead of only reacting. We extend a single setpoint into a whole trajectory, then stop commanding position at all and command a force–motion *relationship* — impedance control, the callback to Chapter 1's stiff-vs-compliant actuators. And we end by looking up at whole-body control, where hand-designing all this gets so hard it makes Chapter 7's learning look tempting.",
        "Let's go.",
      ],
    },
    {
      heading: "Open-loop: command and hope",
      paragraphs: [
        "Start with the simplest possible idea. You want the joint at 90°. You know (roughly) that a certain motor voltage holds it there. So you apply that voltage and walk away. No sensing, no correcting — you computed a command from a model and sent it. This is **open-loop control**: the controller's output depends only on the desired input and a model of the plant, never on what actually happened.",
        "**Open-loop works beautifully right up until reality deviates from your model, and then it fails silently.** A microwave is open-loop: you ask for 90 seconds, it runs the magnetron for 90 seconds, and it never once checks whether your food is actually hot. That's fine, because nothing fights back — the timer is the whole job. But point the same philosophy at a robot arm and watch it crumble. Your model said \"this voltage holds 90°,\" but today the arm is carrying a slightly heavier tool, or the joint is cold and stiff, or the battery sagged. The arm settles at 84° and *the controller has no idea*, because it never looks. It's confidently, permanently wrong.",
        "The disease is that the world is never exactly your model. Loads change, friction drifts with temperature, a gust of wind hits the drone, someone leans on the arm. Open-loop has no mechanism to notice any of it. Every disturbance is invisible, so every disturbance is permanent.",
        "The cure is embarrassingly simple to state: **look at what actually happened, compare it to what you wanted, and use the difference to correct.** Measure the joint angle. Subtract it from the target. That difference is the single most important object in this entire chapter:",
      ],
    },
    {
      equations: [String.raw`e = \text{setpoint} - \text{measurement}`],
    },
    {
      paragraphs: [
        "Reading the symbols: **`e`** is the **error**, the gap we're trying to kill. The **setpoint** (often written `r`, the *reference*) is where you *want* the joint — the amber command from Chapter 1's color language. The **measurement** (often `y`) is where the joint *actually is* right now, read off an encoder — the blue signal under control. Error is just how wrong you are, with a sign that tells you which way. If the setpoint is 90° and the encoder reads 84°, then `e = 90 − 84 = +6°`: you're six degrees short, and the positive sign says \"push up.\" Read 97° instead and `e = −7°`: you overshot, push back down.",
        "The moment a controller's output depends on `e`, we've **closed the loop**. That's **closed-loop** (or **feedback**) control, and it's the foundation everything else in this chapter stands on. The controller senses the outcome and feeds it back to the input — hence *feedback* — so a disturbance that would have been invisible open-loop now shows up immediately as a nonzero error the controller is duty-bound to erase. (Side note: this is the exact hero Chapter 1 named. Feedback is how a robot fights the reality gap; every controller below is just a different rule for turning `e` into a command.)",
      ],
    },
    {
      diagram: {
        id: "rb-4-1",
        caption:
          "Open-loop trusts its model and never checks; closed-loop measures the gap and erases it. The instant the world pushes back, only the loop that looks can respond.",
      },
    },
    {
      quiz: {
        question:
          "A toaster and a cruise-control system both \"produce an output over time.\" One is open-loop and one is closed-loop. Which is which, and what specifically does the closed-loop one do that the open-loop one structurally cannot?",
        answer:
          "The toaster is open-loop and cruise control is closed-loop. The toaster runs its heating element for a set time regardless of how brown the bread actually gets — it never measures the outcome, so if the bread is stale, damp, or thin, it can't compensate; the time is the whole command. Cruise control continuously measures your actual speed, subtracts it from your target speed to form an error, and adjusts the throttle to erase that error — so when you hit a hill and slow down, it senses the drop and feeds in more gas. The structural thing cruise control can do and the toaster can't is *reject disturbances it was never told about*: the hill, the headwind, the extra passenger. That's the entire payoff of closing the loop — you don't need to predict every disturbance, you just need to notice the error it causes and correct.",
      },
    },
    {
      heading: "Proportional control: push in proportion to how wrong you are",
      paragraphs: [
        "So we'll use the error. The most natural rule imaginable: the more wrong you are, the harder you push. If you're 40° off, shove hard; if you're 2° off, nudge gently; if you're dead on, do nothing. Command in direct proportion to error. That's **proportional control**, the P in PID, and it's the honest first thing anyone tries.",
      ],
    },
    {
      equations: [String.raw`u = K_p \, e`],
    },
    {
      paragraphs: [
        "Reading the symbols: **`u`** is the **control effort** — the thing you actually send to the motor, a torque or a voltage. **`e`** is the error we just built. **`K_p`** is the **proportional gain**, a number you choose that sets how aggressively the controller reacts per unit of error. Big `K_p` means a small error produces a big shove; small `K_p` means the controller is timid. That's the whole law: effort is a scaled copy of how wrong you are.",
        "Let's work it by hand. Say `K_p = 2` (units: newton-meters of torque per degree of error). The arm is at 60°, target is 90°.",
      ],
    },
    {
      list: [
        "Error: `e = 90 − 60 = 30°`. Command: `u = 2 × 30 = 60 N·m`. Big error, big push — the arm accelerates toward the target.",
        "It swings to 85°. Now `e = 90 − 85 = 5°`, so `u = 2 × 5 = 10 N·m`. Closer, so the controller eases off. Good — this is the self-throttling behavior that makes P feel so reasonable.",
        "It reaches 90°. `e = 0`, `u = 0`. No error, no effort. It coasts.",
      ],
    },
    {
      paragraphs: [
        "Feels perfect. And on a frictionless arm floating in space with nothing pulling on it, it nearly is. But now let the villain into the room. **Hang gravity on that arm.** Suppose holding the arm level against gravity takes a steady 8 N·m — a constant disturbance that never lets up. Watch what P control does.",
        "The arm can only produce effort when there's error, because `u = K_p e`. So to generate the 8 N·m needed just to hold position, it *needs* a standing error big enough that `K_p e = 8`. With `K_p = 2`, that's `e = 8 / 2 = 4°`. The arm settles not at 90° but at **86°** — permanently four degrees short — and it parks there forever, perfectly balanced: the 4° of error produces exactly the 8 N·m that gravity is stealing. Push the gain up to `K_p = 8` and the standing error shrinks to `8/8 = 1°`, better but still not zero. Crank it higher and you buy a smaller error at the price of a twitchy, oscillation-prone controller that rings on every move.",
        "This leftover gap has a name — **steady-state error** — and it's P control's fundamental, unfixable flaw. **A pure proportional controller needs *some* error to produce *any* effort, so against a constant disturbance it can never fully close the gap.** Zero error would mean zero command, which can't hold against gravity, so it refuses to reach zero error. It's a dog chasing a car it's structurally forbidden to catch. We need a term that can produce effort even when the instantaneous error is zero.",
      ],
    },
    {
      diagram: {
        id: "rb-4-2",
        caption:
          "Proportional control against a constant disturbance always parks short of the target — it needs error to make effort. The integral term is what finally walks that last gap to zero.",
      },
    },
    {
      quiz: {
        question:
          "You're using pure P control to hold a drone at a target altitude, and it hovers steadily but always about 20 cm too low. A colleague says \"just raise the gain.\" Will that work, what's the risk, and what would actually eliminate the gap?",
        answer:
          "Raising `K_p` will *shrink* the gap but never eliminate it. The drone hovers low because holding altitude against gravity requires steady thrust, and pure P can only make thrust when there's error — so it needs a standing altitude error to generate the hover thrust. A bigger gain means less error is needed to produce the same thrust, so the gap gets smaller (maybe 5 cm instead of 20), but it's still nonzero, because zero error would mean zero thrust and the drone would fall. The risk is that as you push `K_p` up, the controller gets increasingly aggressive and twitchy — it starts to overshoot and oscillate, and eventually goes unstable, ringing itself apart. What actually kills the gap is an *integral* term, which accumulates the small standing error over time and adds effort until the error is truly zero — reaching down and holding thrust even when the instantaneous error has vanished.",
      },
    },
    {
      heading: "Integral control: remember the error you couldn't fix",
      paragraphs: [
        "The problem with P is amnesia. Every instant, it looks only at the error *right now* and forgets that it's been four degrees short for the last ten seconds. If only the controller could *notice* that a small error has been stubbornly persisting and get progressively more insistent about it — accumulate its frustration until the error finally caves.",
        "That's exactly integral control. **Add up the error over time, and let that running total drive its own contribution to the command.** A tiny error that persists integrates into a large accumulated value, which produces a large corrective effort — so the controller can generate the steady 8 N·m of gravity compensation *even when the instantaneous error is zero*, because the accumulated history is still there holding it up.",
      ],
    },
    {
      equations: [String.raw`u = K_i \int e \, dt`],
    },
    {
      paragraphs: [
        "Reading the symbols: **`∫ e dt`** is the **integral of the error** — the running sum of all past error, area under the error-versus-time curve. If you've been 4° short for a while, this term is large and growing; if the error has been zero, it stops growing and holds whatever value it reached. **`K_i`** is the **integral gain**, setting how fast the accumulator translates into effort. In code you never integrate symbolically — you just keep a variable and, every timestep of length `Δt`, do `integral += e × Δt`. That accumulator *is* the memory P was missing.",
        "By hand, with `K_i = 0.5` and a timestep `Δt = 0.1 s`, sitting at the P-controller's stuck 4° error:",
      ],
    },
    {
      list: [
        "Step 1: `integral = 0 + 4 × 0.1 = 0.4`. Integral effort: `0.5 × 0.4 = 0.2 N·m`. A small extra shove upward, on top of whatever P is doing.",
        "Step 2: still 4° short, so `integral = 0.4 + 4 × 0.1 = 0.8`. Effort: `0.5 × 0.8 = 0.4 N·m`. The push grows.",
        "...and it keeps growing, ratcheting the arm upward, shrinking the error. As the error shrinks the accumulator grows slower, and when the error finally hits zero the accumulator stops growing but *holds its value* — parked at exactly the level that produces the 8 N·m gravity needs. **Steady-state error: gone.**",
      ],
    },
    {
      paragraphs: [
        "That's the magic of I: it converts a persistent error into an ever-growing correction, so the only stable resting place is zero error. The integral term is what lets the controller hold a nonzero command at zero error.",
        "But integral has a nasty failure mode, and it's the one that bites everyone. Imagine the arm is physically blocked — someone's holding it, or it's slammed against a hard stop — so the error stays large and refuses to shrink no matter what. The integrator doesn't know it's blocked. It just keeps doing its job: accumulating, accumulating, accumulating, building up a monstrous stored value. Then you let go. The controller now has a gigantic accumulated command that takes ages to \"unwind,\" so the arm rockets past the target, massively overshoots, and has to slowly bleed off all that stored-up integral before it settles. This is **integral windup**, and it turns a helpful memory into a loaded spring. The standard fixes are *clamping* the integrator to a sane range and *anti-windup* logic that stops accumulating whenever the actuator is saturated (already commanding as hard as it can). Keep windup in mind — it's the price of memory, and it's the flaw the derivative term is *not* going to fix, because we've got a different problem to solve first.",
      ],
    },
    {
      quiz: {
        question:
          "An engineer adds integral control to a temperature controller for an oven. During a test, the oven door is propped open for two minutes (so the oven can't reach temperature), then shut. When they shut the door, the oven blows way past the target temperature before settling. What happened, and what's the fix?",
        answer:
          "That's textbook integral windup. While the door was open, the oven couldn't reach the setpoint, so the error stayed large and positive the whole time — and the integrator faithfully accumulated all two minutes of that error into an enormous stored value, demanding maximum heat. When the door shut, the oven had this huge pent-up integral term commanding full blast, and even once it hit the target temperature, the accumulated value took time to unwind, so the heater kept driving and the temperature sailed past the setpoint. The fix is anti-windup: stop (or clamp) the integrator whenever the actuator is saturated or the system can't respond — if the heater is already at 100% and the error isn't shrinking, there's no point accumulating more, because you can't push any harder anyway. Clamping the integral to a bounded range achieves the same thing more crudely. Either way you prevent the memory from becoming a loaded spring.",
      },
    },
    {
      heading: "Derivative control: watch the rate, damp the swing",
      paragraphs: [
        "P and I together will get you to the target with zero steady-state error. But *how* they get there is often ugly. A well-tuned aggressive P (or the ratcheting energy of I) tends to build up momentum charging at the setpoint, blow right through it, swing back, overshoot the other way, and oscillate — **ringing** back and forth before it finally settles. The controller is enthusiastic but reckless: it's still flooring the accelerator when it should already be braking, because it only knows *how far off* it is, not *how fast it's closing*.",
        "What's missing is anticipation of the *approach*. A good driver eases off the gas before reaching the stop sign, judging not just distance but closing speed. The signal that captures closing speed is the **rate of change of the error** — how fast `e` is shrinking. If the error is large but collapsing quickly, you're about to arrive and should back off *now* to avoid overshoot. That's derivative control: **push against the rate of change of the error, applying a braking force proportional to how fast you're closing the gap.**",
      ],
    },
    {
      equations: [String.raw`u = K_d \, \frac{de}{dt}`],
    },
    {
      paragraphs: [
        "Reading the symbols: **`de/dt`** is the **derivative of the error** — its instantaneous rate of change, positive if the gap is opening, negative if it's closing fast. **`K_d`** is the **derivative gain**, setting how strongly the controller reacts to that rate. Because `de/dt` is negative while you're rushing toward the target (error shrinking), the `K_d` term produces effort *opposing* the motion — a velocity-dependent brake that grows with speed. It's pure damping. It contributes nothing at steady state (a parked error isn't changing, so `de/dt = 0`) and nothing to the target itself — its whole job is to smooth the *approach*, killing overshoot and calming oscillation.",
        "Worked quickly, with `K_d = 0.3`. Estimate `de/dt` as the change in error over one timestep divided by `Δt`:",
      ],
    },
    {
      list: [
        "Error was 30°, one timestep (`Δt = 0.1 s`) later it's 24°. Rate: `de/dt = (24 − 30) / 0.1 = −60 °/s`. Derivative effort: `0.3 × (−60) = −18 N·m`. A hefty brake opposing the fast approach — exactly what stops the arm from charging through the target.",
        "Later the arm is barely moving: error 2° to 1.8° in a timestep, so `de/dt = −0.2/0.1 = −2 °/s`, and the derivative term is just `0.3 × (−2) = −0.6 N·m`. Nearly gone, because there's nothing left to damp.",
      ],
    },
    {
      paragraphs: [
        "So D is the calming influence. But — you saw this coming — it has its own flaw, and it's a bad one. **Derivative control amplifies noise.** Real encoder measurements are jittery: even a perfectly still joint reads 90.00, 90.03, 89.98, 90.02 as sensor noise dances on the last digit. That jitter is *tiny in position* but *huge in rate*, because you're dividing small meaningless wiggles by a small `Δt`. A 0.03° blip over a 0.001 s timestep looks like a 30 °/s velocity spike to the derivative term, which then slams the motor with a nonsense correction. Crank `K_d` up and the arm buzzes and screeches, chasing noise. The standard defenses are low-pass filtering the derivative (smoothing the rate estimate before you use it) and computing the rate on the *measurement* rather than the error to avoid a spike every time the setpoint jumps. But the core tension is permanent: **D damps real motion beautifully and amplifies fake motion just as beautifully, and it can't tell them apart.**",
        "Notice the pattern the whole chapter has been building. P reacts to error but leaves a steady-state gap. I closes the gap but can wind up. D damps the overshoot but amplifies noise. Each term fixes the previous one's flaw and introduces its own. So we don't pick one — we blend all three.",
      ],
    },
    {
      heading: "The full PID law: three views of the same error",
      paragraphs: [
        "Stack the three terms and you get the single most-used control law on Earth:",
      ],
    },
    {
      equations: [
        String.raw`u = K_p \, e \;+\; K_i \int e \, dt \;+\; K_d \, \frac{de}{dt}`,
      ],
    },
    {
      paragraphs: [
        "Read it as three simultaneous perspectives on the same error signal, each answering a different question:",
      ],
    },
    {
      list: [
        "**`K_p · e` — the present.** *How wrong am I right now?* Push in proportion to the current error. This does the bulk of the work.",
        "**`K_i · ∫e dt` — the past.** *How long have I been wrong?* Accumulate persistent error and grind out the steady-state gap that P leaves behind.",
        "**`K_d · de/dt` — the future.** *How fast am I closing?* Anticipate arrival and brake early to kill overshoot.",
      ],
    },
    {
      paragraphs: [
        "Present, past, future — one signal, three lenses, three gains to blend them. That's the whole thing. And it's genuinely ancient by software standards: the theory was worked out for **automatic ship steering by Nicolas Minorsky in 1922**, who derived the three-term law by watching how a skilled helmsman actually held a course — hard over for a big heading error (P), a little extra to counter a steady crosswind (I), and easing the wheel back as the bow swung toward the mark (D). A century later, PID still runs an estimated 90-plus percent of the industrial control loops on the planet — thermostats, cruise control, drone attitude, 3D-printer heaters, hard-drive heads. It is the workhorse, and understanding it is most of practical control.",
        "The whole art of PID is **tuning** — choosing the three gains — and the intuition lives on one axis, borrowed from how a mass-spring-damper responds to a step:",
      ],
    },
    {
      list: [
        "**Underdamped** (too much P, too little D): the system charges the target, overshoots, and oscillates before settling. Fast but reckless — it rings. You hear this as a buzzy, bouncy robot.",
        "**Overdamped** (too much D, too little P): the system crawls to the target without ever overshooting, but it's *sluggish* — it takes forever to arrive. Safe but slow.",
        "**Critically damped** (the Goldilocks blend): the fastest possible approach that has *no* overshoot. It arrives quickly and stops clean. This is what you're tuning for in almost every case.",
      ],
    },
    {
      paragraphs: [
        "A workable tuning recipe, roughly: raise `K_p` until the response is snappy but just starting to overshoot; add `K_d` to damp that overshoot back out; then add just enough `K_i` to erase any leftover steady-state error, watching for windup. There are formal methods (Ziegler–Nichols is the classic, from 1942), but honestly most real tuning is this informed twiddling, guided by watching the step response and knowing which knob fixes which symptom.",
      ],
    },
    {
      diagram: {
        id: "rb-4-3",
        caption:
          "Present, past, future — P, I, and D are three lenses on one error signal. Tuning is finding the blend that arrives fastest without ringing: critically damped, the sweet spot between twitchy and sluggish.",
      },
    },
    {
      quiz: {
        question:
          "A robot arm under PID control reaches its target quickly but overshoots and oscillates two or three times before settling. Which gain do you adjust and which way, and what regime is the system in? If instead it crept slowly to the target with no overshoot at all, what would you change?",
        answer:
          "The overshoot-and-oscillate behavior is **underdamped** — the controller is charging the target with too much momentum and not enough braking. You increase `K_d`, the derivative gain, which adds damping proportional to closing speed and brakes the arm before it blows through the setpoint; you might also back `K_p` down slightly if it's very aggressive. Push `K_d` up just until the oscillation disappears and you're at the fast, clean, critically-damped response you want. The opposite case — creeping slowly to the target with no overshoot — is **overdamped**: too much damping (or too little proportional push), so the arm is sluggish. There you'd *lower* `K_d` and/or *raise* `K_p` to make the response snappier, again stopping right at the edge of critical damping. The whole game is finding the boundary between the two: as fast as possible without ringing.",
      },
    },
    {
      heading: "Feedforward: stop reacting, start predicting",
      paragraphs: [
        "PID is purely *reactive*. Every correction it makes is a response to an error that has *already happened* — the arm has to sag before the controller notices and pushes back up. That's a structural lag: feedback is always a step behind reality, cleaning up messes rather than preventing them. Against a disturbance you can *see coming* — like gravity, which you know is there before the arm ever moves — reacting to it after the fact is leaving free performance on the table.",
        "Here's the insight. You often *have a model* of the predictable part of the world. You know the arm has mass. You know the gravitational torque needed to hold it at any angle — it's just physics, computable from the geometry Chapter 3 gave you. So why wait for gravity to cause an error and then react? **Compute the effort you know you'll need and add it in preemptively.** That's **feedforward**: a model-based command injected in *anticipation*, so feedback only has to clean up the small residual the model didn't predict.",
      ],
    },
    {
      equations: [
        String.raw`u = \underbrace{u_{\text{ff}}}_{\text{feedforward: predicted}} \;+\; \underbrace{K_p e + K_i\!\int\! e\,dt + K_d \tfrac{de}{dt}}_{\text{feedback: reactive}}`,
      ],
    },
    {
      paragraphs: [
        "Reading it: **`u_ff`** is the **feedforward term**, computed from a model of the plant — for an arm, most commonly the **gravity-compensation torque**, the exact torque needed to hold the arm up against gravity at its current pose. The feedback block is our familiar PID, now demoted to a *residual cleaner*: it only has to correct the difference between what the model predicted and what actually happened (friction, an unmodeled load, a gust). Prediction does the heavy lifting; feedback mops up.",
        "The canonical case: **gravity compensation.** For a single joint holding a link of mass `m` whose center of mass sits a distance `L` from the pivot, the gravitational torque trying to pull it down is `τ_g = m·g·L·cos(θ)`, where `g = 9.81 m/s²` and `θ` is measured from horizontal. That `cos(θ)` is the geometry: gravity's torque is maximal when the arm is horizontal (`cos 0° = 1`, full lever arm) and zero when it hangs straight down (`cos 90° = 0`, no lever arm). Work a number: `m = 2 kg`, `L = 0.3 m`, arm horizontal (`θ = 0`). Then `τ_g = 2 × 9.81 × 0.3 × 1 = 5.9 N·m`. Feed that 5.9 N·m in as `u_ff` and the arm holds itself level *with zero error* before feedback has done anything at all — you've cancelled gravity outright instead of tolerating a standing error to fight it.",
        "This is why the classic robot-arm controller is **PD plus gravity compensation**, not PID. Once feedforward cancels gravity — the constant disturbance that created the steady-state error in the first place — you no longer *need* the integral term to grind that error out, so you drop I (dodging windup entirely) and keep PD purely to damp and correct the leftover residual. Prediction handles the known; feedback handles the surprise. It's the difference between a controller that *understands its own body* and one that only ever reacts to being wrong.",
      ],
    },
    {
      diagram: {
        id: "rb-4-4",
        caption:
          "Feedback reacts to a sag that already happened; feedforward cancels gravity before it can cause one. PD plus gravity compensation is the classic arm controller: predict the known, let feedback clean up the rest.",
      },
    },
    {
      quiz: {
        question:
          "Two robot arms hold the same heavy tool level against gravity. Arm A uses pure high-gain PID; arm B uses PD with a gravity-compensation feedforward term. Both hold the pose accurately. In what important way does arm B behave better, and why?",
        answer:
          "Both hold the pose, but arm B does it with far less standing error, far lower feedback gains, and much better disturbance behavior. Arm A relies on cranking `K_p` (and `K_i`) high enough that its *reactive* correction overpowers gravity — which means high gains, a stiffer and twitchier controller more prone to instability and noise amplification, and (with pure PD) a residual sag it never fully closes. Arm B *predicts* the gravity torque from its model and injects it directly as feedforward, so gravity is cancelled before it causes any error at all; the PD feedback is then only responsible for tiny residuals (friction, model mismatch), so it can run at low, gentle gains and stay smooth and stable. The deeper point: feedback is always a step behind reality, so any disturbance you can model, you should *predict and cancel* rather than react to — feedforward turns a fight into a foregone conclusion, and leaves feedback the small job it's actually good at.",
      },
    },
    {
      heading: "Trajectory tracking: control along a whole path",
      paragraphs: [
        "Everything so far chased a *single* setpoint — hold 90°, hold this pose. But real robots rarely want to *jump* to a target; they want to *move smoothly along a path*: sweep the arm through a welding seam, follow a drawn curve, carry a full cup without sloshing. That's a whole *time-varying* reference — a **trajectory**, a function `r(t)` giving the desired position (and usually velocity and acceleration) at every instant, not just a lone endpoint.",
        "The fix is small and elegant: **make the setpoint a moving target.** Instead of a fixed `r`, feed the controller `r(t)`, the desired position *right now*, and recompute the error against it every timestep: `e(t) = r(t) − y(t)`. The controller is now chasing a point that's itself gliding along the path, and its job is to stay glued to it. This pairs perfectly with feedforward: since you *planned* the trajectory, you know the desired *velocity* and *acceleration* at every instant, so you can feed those forward — command the motor the acceleration the plan calls for (mass times desired acceleration, plus the gravity term) — and let PID clean up only the tracking error. Feedforward the plan, feed back the deviation. Trajectory tracking is where feedforward really earns its keep, because now you're anticipating not just gravity but the whole intended motion. (Where those smooth `r(t)` trajectories *come from* — planning a feasible, collision-free path through the configuration space of Chapter 1's Fig 1.3 — is the subject of Chapter 6. Here we just track one once it exists.)",
      ],
    },
    {
      heading: "Force and impedance control: command a relationship, not a position",
      paragraphs: [
        "Every controller so far has been obsessed with *position*: reach this angle, follow this path, and resist anything that pushes you off it. That obsession is exactly what you want for cutting a straight line or holding a pose. But it's a disaster the moment the robot has to *touch* something. Think about a robot pressing a peg into a hole, wiping a table, or shaking a person's hand. A stiff position controller commanded to be \"right *there*\" will fight any contact to the death — if its target is a hair inside the table surface, it will push through the table (or itself) with the full authority of its gains, because to a position controller, contact is just an error to be crushed. That's how position control snaps pegs, gouges surfaces, and hurts people.",
        "The reframe is beautiful. In a contact task you usually don't actually care about exact position — you care about a *relationship* between force and motion. \"Push on this surface with 5 newtons, and if it moves, follow it.\" \"Be rigid along the cut line but soft perpendicular to it, so you can slide without gouging.\" So stop commanding a position and start commanding that **relationship between force and position** directly. That's **impedance control** (and its close cousin *admittance control*): instead of a stiff position target, you make the robot *behave like a chosen mechanical system* — most often a **virtual spring-damper** — so that when the world pushes on it, it responds the way a spring of your chosen stiffness would.",
      ],
    },
    {
      equations: [
        String.raw`F = K(x_{\text{desired}} - x) + D(\dot{x}_{\text{desired}} - \dot{x})`,
      ],
    },
    {
      paragraphs: [
        "Reading the symbols: **`F`** is the force the robot exerts. **`x`** is the actual end-effector position, **`x_desired`** the target (the rest position of your virtual spring). **`K`** is the **stiffness** — the virtual spring constant you get to *choose* — and **`D`** is the **damping**. If you notice this looks exactly like a spring-damper from physics class, that's the entire point: the robot is *emulating* a spring of stiffness `K` and a damper `D`, in software, at whatever values you dial in. Push the end-effector away from `x_desired` and it pushes back with force `K` times the displacement — gently if `K` is small, firmly if `K` is large — exactly like a real spring, except *you* set the spring constant on the fly.",
        "The `K` knob is the whole story, and it's the callback Chapter 1 promised. Turn `K` **high** and the virtual spring is stiff: the robot resists displacement hard and behaves like a rigid position controller — precise, but unforgiving in contact. Turn `K` **low** and the spring is soft: push the end-effector and it yields, following your hand, springing gently back when released — **compliant**. This is Chapter 1's stiff-vs-compliant actuator split, now expressed not as a hardware property but as a *number you command in software*, adjustable moment to moment. A robot can be stiff while moving fast through free space and go soft the instant it makes contact.",
        "Work the number: `K = 200 N/m`, virtual rest position `x_desired`, and something pushes the end-effector 2 cm (`0.02 m`) off it. Restoring force: `F = 200 × 0.02 = 4 N`. A gentle, springy resistance — you can push it around by hand and it yields like a soft spring. Now set `K = 5000 N/m` and the same 2 cm displacement demands `F = 5000 × 0.02 = 100 N`: rigid, immovable, a position controller in all but name. Same robot, same code, one number deciding whether it's a rock or a cushion.",
        "This is *the* enabling idea for two huge domains. **Contact tasks:** peg-in-hole, polishing, assembly — anything where the robot must comply with a surface it can't perfectly localize; impedance control lets it press with a controlled force and slide along instead of jamming or snapping. **Safety around humans:** a compliant robot that yields when it bumps you is fundamentally safer than a stiff one that plows through — which is why collaborative robots (\"cobots\") that share space with people are almost always torque-controlled with low virtual stiffness (the exact reason Chapter 1 said torque-controlled actuators exist, and the theme Chapter 12 returns to for human-safe systems). Command a force–motion relationship, not a position, and the robot stops fighting the world and starts *negotiating* with it.",
      ],
    },
    {
      diagram: {
        id: "rb-4-5",
        caption:
          "Impedance control commands a relationship, not a position: the robot behaves like a spring whose stiffness you choose. Turn the knob and the same robot goes from rigid and precise to soft and human-safe — Chapter 1's compliant actuator, now a number in software.",
      },
    },
    {
      quiz: {
        question:
          "A robot must insert a slightly misaligned peg into a hole. Engineer A uses a stiff position controller aimed at the hole's center. Engineer B uses low-stiffness impedance control. Why does A's peg jam or snap while B's slides in?",
        answer:
          "Engineer A's stiff position controller treats any deviation from \"peg at the hole center\" as an error to crush with the full authority of its gains. Because the peg is slightly misaligned, its tip catches the edge of the hole, and the controller — sensing it's not where it commanded — pushes *harder* straight ahead to erase that position error, jamming the peg against the rim or snapping it. It has no notion of \"give a little sideways to find the hole\"; sideways motion is just more error to fight. Engineer B's low-stiffness impedance controller instead behaves like a soft spring: when the peg tip catches the edge, the contact force pushes the peg sideways and the compliant controller *yields* to that force, letting the peg slide along the chamfer and self-align into the hole, exerting only a gentle, bounded insertion force the whole time. By commanding a force–motion *relationship* (be soft, follow contact) instead of a rigid position, B lets the geometry of the hole guide the peg — the controller negotiates with the contact instead of fighting it.",
      },
    },
    {
      heading: "Whole-body control: when hand-designing gets too hard",
      paragraphs: [
        "One joint, one setpoint — we can hand-tune that all day. But now picture a humanoid standing on one foot, reaching for a shelf while a hand rests on a wall for balance. There is no \"the joint\" to control. There are thirty-odd joints that must move *together* to satisfy several goals *at once*: keep the reaching hand on target, keep the wall hand where it is, and — non-negotiably — keep the whole body's center of mass balanced over the supporting foot so it doesn't topple. And it must do all this under hard **constraints**: the feet in contact can't slip or pull on the floor, joints can't exceed their limits, motors can't exceed their torque. This is **whole-body control**: coordinating every joint of a high-DoF robot to achieve multiple prioritized objectives simultaneously while respecting the physics of contact and balance.",
        "The mature classical answer is genuinely impressive engineering. At every control tick — hundreds of times a second — the robot solves an *optimization problem*: find the joint torques that best achieve the prioritized tasks (balance first, then hands, then posture) subject to the contact and actuator constraints, typically as a quadratic program using the full-body dynamics model (the same physics that gave us gravity compensation, now scaled up to the whole articulated body). It's gravity compensation and feedforward and task-tracking, generalized to a whole coordinated body with a strict priority stack — and it's how the classical controllers on advanced legged robots hold balance while doing useful work.",
        "And it *works* — but you can feel the wall approaching. Every task, every constraint, every priority has to be *specified by hand*, and the model has to be *accurate*, and the contacts have to be *known*. The moment the terrain is unmodeled, the contact is uncertain, or the behavior you want is too subtle to write down as a clean objective — a natural-looking recovery stumble, a parkour leap, a dynamic whole-body throw — hand-designing the objective stack becomes brutally hard, sometimes hopeless. That difficulty is exactly the crack that learning pours into. When you can't hand-write the controller, you can often *train* one: let the robot try, reward what works, and let reinforcement learning discover the whole-body coordination you couldn't specify. That's Chapter 7, and whole-body control is precisely the frontier where hand-design gets hard enough that learning starts to look not just clever but *necessary*.",
      ],
    },
    {
      heading: "Where this leaves us",
      paragraphs: [
        "You now own the ladder that turns a commanded angle into an achieved one, each rung a fix for the last. **Open-loop** commands and hopes, and fails the instant the world deviates. **Feedback** closes the loop on `e = setpoint − measurement`, the error signal everything hangs on. **P** pushes in proportion to error but parks short against a constant disturbance; **I** accumulates the past to erase that gap but can wind up; **D** damps the approach but amplifies noise; **PID** blends present, past, and future into the workhorse law that runs most of the loops on Earth. **Feedforward** stops the controller merely reacting and lets it *predict* — gravity compensation being the classic, giving us the PD-plus-gravity-comp arm controller. **Trajectory tracking** turns a setpoint into a moving target. **Impedance control** stops commanding position and commands a force–motion *relationship*, a virtual spring whose stiffness you dial from rigid to human-safe — Chapter 1's compliant actuator made software. And **whole-body control** scales all of it to a coordinated, balancing body, right up to the point where it gets too hard to hand-design and learning takes over.",
        "This chapter completes the **Act** beat of the sense–plan–act loop. Chapter 3 said *which* joint angles you want; this chapter got you *to* them despite a world that pushes back. But everything here quietly assumed the robot *knows where it is* — every controller ate a `measurement` off a sensor and trusted it. Chapter 1 warned that every measurement lies a little and the lies pile up. So next we turn to **Sense**: Chapter 5 is estimation, localization, and SLAM — fighting Villain #2's drift by fusing many imperfect sensors into one trustworthy belief about where the robot and its world actually are. A controller is only ever as good as the measurement it's correcting toward. Let's go get an honest one.",
      ],
    },
    {
      paragraphs: [
        "*Prev: Chapter 3 — Kinematics · Next: Chapter 5 — Estimation, Localization & SLAM*",
      ],
    },
  ],
};
