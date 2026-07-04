# Robotics Bible — Style Guide & Widget Design System

*This file is the single source of truth for voice, pedagogy, and interactive-diagram quality. Every chapter file references it. Read it before writing or building anything. It mirrors the conventions already used in the ML Bible so the two guides feel like one body of work.*

---

## 1. Voice & tone

Write like a sharp friend who has actually built these systems walking you through them at a whiteboard. Not a textbook, not a lecture.

Rules:

- **Second person, present tense.** "You point a camera at the world and ask..." not "One may consider...".
- **First-person plural when building.** "Let's build it," "we start with the naive thing and watch it break."
- **Motivation before mechanism, always.** Every section opens with *why this exists* / *what breaks without it* before *how it works*. The governing principle, borrowed straight from the ML Bible, is: **every step is a fix for the thing before it.** Introduce the naive approach, watch it fail, and let the failure hand you the next idea.
- **Villain / hero / punchline framing.** Name the recurring antagonist (drift, the reality gap, compounding error, the curse of dimensionality) and the recurring hero (feedback, chunking, randomization, learned priors). Call callbacks across chapters explicitly.
- **Concrete numbers over hand-waving.** "6 joints, 6 numbers, one pose" beats "a high-dimensional configuration." Work at least one example by hand per hard concept.
- **Honest about limits.** When a method is fragile, say so and say when it breaks. Cite the paper being honest about its own weaknesses.
- **Light humor, em-dashes, rhetorical questions.** "Funny name, huh?" is on-brand. Keep it human.
- **Cite papers and years inline**, in running prose, not footnotes: "RRT (LaValle, 1998)," "π0 (Physical Intelligence, 2024)." No formal bibliography.
- **Prerequisites stated up front** in each chapter's intro, plus a one-line roadmap of the fixes to come.

Voice calibration — this is the target register (from the ML Bible, Vision chapter):

> "Everything we've built so far was about sequences of words. Now we point the same machinery at the physical world, and a surprising amount carries straight over: the same vanishing-gradient villain, the same residual-connection hero, the same 'tokenize everything and let attention sort it out' punchline."

Match that rhythm: short declaratives, comma splices for pace, a payoff at the end of the paragraph.

**Do not** write in a stiff student-essay voice, do not use corporate hedging ("it is important to note that"), do not open sentences with "Furthermore" / "Moreover" / "In conclusion," and do not pad. If a word can be removed without losing meaning, remove it.

---

## 2. Chapter anatomy (the fixed skeleton)

Every chapter follows the same shape so the reader always knows where they are.

1. **Header block**: `Chapter N · Title`, a one-sentence tagline, a published date, and an "Updated" date (see the handoff README for the date table).
2. **Intro (~200–350 words)**: the villain, the prerequisites ("I'm assuming you've read Chapter X"), and the roadmap — the ordered list of fixes this chapter walks through.
3. **Sections**, each: plain-English intuition → the formula with *every symbol glossed in words* → one hand-worked numeric example → a numbered interactive figure `Fig N.M` with a takeaway-sentence caption → a **Check your understanding** collapsible.
4. **"Where this shows up"** — a short closing that connects the chapter to real systems the reader has heard of.
5. **Prev / Next** navigation and a **Future reference** aside (the "come back to this when..." note from the date table).

Recurring structural elements (match the ML Bible exactly):

- **Numbered figures**: `Fig N.M`. The caption is always a full declarative sentence stating the *takeaway* ("Feedback turns a guess into a guarantee: the error shrinks every step"), never a bare label. Each figure also has a short inner title above the interactive area.
- **Check your understanding**: a bolded question followed by a `Show answer ▸ / Hide answer ▾` collapsible with a thorough 3–5 sentence answer. Roughly one per concept.
- **Bold lead-in terms** on first definition: "**Holonomic** means...".
- **Side notes** in parentheses: "(Side note: this is why...)".
- **Cross-chapter callbacks** as a deliberate device.

---

## 3. Pedagogy checklist (per hard concept)

- [ ] Intuition in plain English first, with an analogy.
- [ ] The naive approach, then the failure that motivates the real one.
- [ ] The formula, with a "reading the symbols" gloss.
- [ ] A worked numeric example with real numbers.
- [ ] An interactive figure that lets the reader *do* the thing.
- [ ] A "Check your understanding" question that tests transfer, not recall.

Math treatment: **medium-to-light but honest.** Real equations appear (rotation matrices, the PID law, the Bellman equation, the PPO clipped objective, flow-matching velocity fields) and each is immediately unpacked in words and grounded in a number. No proofs for their own sake.

---

## 4. Widget Design System

This is the part that must not look vibe-coded. The ML Bible's figures are polished, animated, and never overlap. Match that bar. All widgets share one design system so the whole guide feels coherent.

### 4.1 Non-negotiables

- **Fixed, deliberate layout.** Every widget lives in a container with a known aspect ratio. Nothing is absolutely-positioned by eyeball. Use CSS grid / flexbox, or an SVG `viewBox` with a coordinate system you control. **Elements must never overlap unless overlap is the point** (e.g. two bounding boxes for IOU).
- **One canvas size, responsive down.** Design at 720×440 logical units inside an SVG `viewBox="0 0 720 440"`, then let it scale to container width with `width:100%; height:auto`. This guarantees no reflow-induced overlap on mobile.
- **A control strip, not scattered buttons.** All controls (play/pause/step/reset, sliders, toggles) live in one horizontal strip below the canvas, evenly spaced, same height. Label every control.
- **Legible at a glance.** Minimum 13px text inside figures. Never rely on color alone — pair color with shape or a label (accessibility + it reads better).
- **Motion has purpose and is calm.** Animations ease in/out (`cubic-bezier(0.4, 0, 0.2, 1)`), run 300–800ms, and loop only when illustrating a cycle. Provide a pause. Respect `prefers-reduced-motion` — fall back to a static labeled diagram.
- **Deterministic.** No random layout jitter. Seed any randomness so the figure looks the same on every load.

### 4.2 Design tokens (use these exact variables)

Define once in a shared stylesheet; every widget consumes them so recoloring the guide is one edit.

```css
:root {
  --bg:        #0f1117;   /* figure background, dark  */
  --bg-soft:   #171a22;   /* panel / card             */
  --grid:      #2a2f3a;   /* gridlines, axes          */
  --ink:       #e6e8ee;   /* primary text             */
  --ink-soft:  #9aa1b1;   /* secondary text, captions */
  --accent:    #6ea8fe;   /* primary highlight (blue) */
  --accent-2:  #f0a45f;   /* secondary (amber)        */
  --good:      #5bd6a0;   /* success / target         */
  --bad:       #ff6b6b;   /* error / danger           */
  --track:     #3a4150;   /* slider track             */
  --radius:    14px;
  --pad:       20px;
  --font:      'Inter', system-ui, sans-serif;
  --mono:      'JetBrains Mono', ui-monospace, monospace;
}
```

Semantic color use, kept consistent across the whole guide so the reader learns the language: **blue = the thing under control / the signal**, **amber = the command / the plan**, **green = the goal or ground truth**, **red = error or the reality gap**, **grey = the world / static structure**.

### 4.3 Anatomy of a figure component

```
┌─────────────────────────────────────────┐
│  Fig N.M · inner title                    │  ← 14px, --ink-soft
│                                           │
│         [ SVG / canvas stage ]            │  ← the viewBox="0 0 720 440" area
│                                           │
├─────────────────────────────────────────┤
│  ▶ play   ⏭ step   ↺ reset   [slider]     │  ← control strip, one row
├─────────────────────────────────────────┤
│  Caption: full takeaway sentence.         │  ← 14px italic, --ink-soft
└─────────────────────────────────────────┘
```

### 4.4 Reference implementation (the quality bar)

A self-contained React component. Every widget in the guide should be built to this standard: token-driven colors, an SVG stage with a fixed viewBox, a single control strip, reduced-motion fallback, and no overlap. Use it as the skeleton — copy it, swap the stage contents.

```jsx
import { useState, useEffect, useRef } from "react";

// Fig template — a joint tracking a target under P-control.
// Demonstrates the house style: fixed viewBox, token colors,
// one control strip, deterministic motion, reduced-motion safe.
export default function FigTemplate() {
  const [target, setTarget] = useState(220);   // amber: the command
  const [angle, setAngle]   = useState(60);     // blue:  the controlled thing
  const [gain, setGain]     = useState(0.15);
  const [playing, setPlaying] = useState(true);
  const raf = useRef();

  const reduced = typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!playing || reduced) return;
    const tick = () => {
      setAngle(a => a + gain * (target - a));   // the PID punchline: error shrinks
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, gain, target, reduced]);

  const cx = 360, cy = 300, L = 180;
  const rad = (d) => (d * Math.PI) / 180;
  const tip = (deg) => [cx + L * Math.cos(rad(-deg)), cy + L * Math.sin(rad(-deg))];
  const [ax, ay] = tip(angle);
  const [tx, ty] = tip(target);
  const err = Math.round(target - angle);

  return (
    <figure className="fig">
      <div className="fig-title">Fig N.M · A joint chasing its target</div>
      <svg viewBox="0 0 720 440" className="fig-stage" role="img"
           aria-label={`Joint at ${Math.round(angle)} degrees, target ${target}, error ${err}`}>
        {/* baseline + hub */}
        <line x1="120" y1={cy} x2="600" y2={cy} stroke="var(--grid)" strokeWidth="2"/>
        {/* target arm (amber, dashed) */}
        <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="var(--accent-2)"
              strokeWidth="4" strokeDasharray="6 6" opacity="0.8"/>
        {/* controlled arm (blue) */}
        <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="var(--accent)"
              strokeWidth="8" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="12" fill="var(--ink)"/>
        <circle cx={ax} cy={ay} r="9" fill="var(--accent)"/>
        {/* error readout, never overlapping the arm */}
        <text x="120" y="70" fill="var(--ink)" fontSize="15" fontFamily="var(--mono)">
          error = {err}°
        </text>
      </svg>
      <div className="fig-controls">
        <button onClick={() => setPlaying(p => !p)}>{playing ? "⏸ pause" : "▶ play"}</button>
        <button onClick={() => { setAngle(60); }}>↺ reset</button>
        <label>target
          <input type="range" min="20" max="330" value={target}
                 onChange={e => setTarget(+e.target.value)}/>
        </label>
        <label>gain
          <input type="range" min="0.02" max="0.5" step="0.01" value={gain}
                 onChange={e => setGain(+e.target.value)}/>
        </label>
      </div>
      <figcaption className="fig-cap">
        Feedback turns a guess into a guarantee: each step the arm closes a
        fraction of the remaining error, so the gap shrinks toward zero.
      </figcaption>
    </figure>
  );
}
```

Shared figure CSS (define once, every figure inherits it — this is what keeps them from ever looking sloppy or overlapping):

```css
.fig { background: var(--bg-soft); border: 1px solid var(--grid);
       border-radius: var(--radius); padding: var(--pad); margin: 2rem 0;
       max-width: 760px; }
.fig-title { font: 600 14px var(--font); color: var(--ink-soft); margin-bottom: 12px; }
.fig-stage { width: 100%; height: auto; display: block;
             background: var(--bg); border-radius: 10px; }
.fig-controls { display: flex; flex-wrap: wrap; gap: 14px; align-items: center;
                margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--grid); }
.fig-controls button { background: var(--bg); color: var(--ink);
   border: 1px solid var(--track); border-radius: 8px; padding: 6px 12px;
   font: 500 13px var(--font); cursor: pointer; }
.fig-controls button:hover { border-color: var(--accent); }
.fig-controls label { display: flex; align-items: center; gap: 8px;
   font: 500 13px var(--font); color: var(--ink-soft); }
.fig-controls input[type=range] { accent-color: var(--accent); }
.fig-cap { margin-top: 14px; font: italic 14px/1.5 var(--font); color: var(--ink-soft); }
@media (prefers-reduced-motion: reduce) { .fig-stage * { transition: none !important; } }
```

### 4.5 Widget patterns to reuse

Build these once as shared components; most figures are a skin over one of them.

- **Stepper** — play / pause / step / reset over a discrete sequence (algorithm traces, denoising steps, convolution slides). Always show step `k / N`.
- **Slider-driven diagram** — one or two sliders drive a live recomputation (gain, horizon, noise, learning rate). Show the governing number changing.
- **Draggable element on a field** — drag a target, an obstacle, a robot; everything else recomputes (IK reach, planning around an obstacle, IOU).
- **Toggle/tab compare** — A/B or 3-way tabs to compare methods (Dijkstra vs A*, diffusion vs flow matching, discrete vs FAST tokens).
- **Animated pipeline** — boxes light up in sequence as data flows through a stack (the VLA forward pass, SLAM loop, sense-plan-act).

### 4.6 Overlap-proofing rules (read this, it is the thing the author asked for)

1. Lay out on a grid or explicit coordinates — never eyeball absolute positions.
2. Reserve label lanes: text goes in fixed regions (top-left readouts, bottom captions), never floating over moving art.
3. Give moving elements bounded ranges so they cannot exit the stage or collide with UI.
4. Test at 320px, 768px, and 1200px container widths before shipping a figure.
5. If two things must be near each other, add a leader line, not overlap.
6. Keep a consistent 20px internal padding; nothing touches the figure border.

---

## 5. Diagram spec format used in the chapter files

Inside each chapter, every figure is specified in a fenced block like this so Claude Code knows exactly what to build:

```
[FIG 4.2] title: "A joint chasing its target"
type: slider-driven diagram
shows: a single revolute joint under proportional control converging to a target angle
controls: target angle slider, gain slider, play/pause, reset
interaction: dragging the target or moving the slider restarts convergence; the error readout updates live
animation: the arm eases toward the target each frame; error text counts down to 0
color: blue = current angle, amber = target, red = live error magnitude
caption: "Feedback turns a guess into a guarantee: each step closes a fraction of the error, so the gap shrinks toward zero."
```

Build every one of them to the §4 standard.
