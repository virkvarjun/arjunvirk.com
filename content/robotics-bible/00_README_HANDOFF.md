# Robotics Bible — Build Handoff for Claude Code

*Paste this file (and the folder it lives in) to Claude Code. It contains everything needed to add a "Robotics Bible" guide to arjunvirk.com, matching the existing ML Bible at `/writing/ml-guide`. All chapter prose is already written in the sibling `chapter-XX-*.md` files; the voice and interactive-diagram standards live in `STYLE_GUIDE.md`. Your job is to wire it into the site and build the figures to spec — not to rewrite the content.*

---

## 0. TL;DR of the task

1. Add a new **card on the main writing/landing page** that links to the Robotics Bible, styled like the existing ML Bible card.
2. Create a **table-of-contents page** at `/writing/robotics-guide` listing all 12 chapters (title + one-line description + date), matching the ML Bible TOC layout.
3. Create **one route per chapter** at `/writing/robotics-guide/chapter-N-slug`, rendering the prose from the matching `chapter-XX-*.md` file.
4. Build every **interactive figure** in each chapter to the standard in `STYLE_GUIDE.md` §4 (fixed viewBox, token colors, one control strip, no overlap, reduced-motion fallback). Each chapter file specifies its figures in `[FIG N.M]` blocks.
5. Respect the **published/updated dates** and **future-reference notes** in the table below.

Do not invent new content or change the technical claims. If a claim looks stale (this field moves monthly), flag it in a PR comment rather than silently editing — see §6.

---

## 1. Match the existing ML Bible exactly

The ML Bible lives at `/writing/ml-guide` with:
- a landing/TOC page listing chapters as a numbered list of links,
- chapter routes like `/writing/ml-guide/chapter-5-vision`,
- a branded header (`Arjun Virk · ML Bible · Chapter N Title`), Prev/Next nav, and a `built with next.js in waterloo, 2026` footer.

Mirror all of it for the Robotics Bible. Reuse the same layout components, typography, spacing, and dark theme. The two guides should be visually indistinguishable in chrome — only the content differs. If the ML Bible chapters are MDX/typed content objects, follow that same pattern; if they're React pages, follow that. **Read how a real ML Bible chapter is implemented first, then copy the pattern.**

### Card copy for the main page

```
Title:     Robotics Bible
Subtitle:  A from-scratch guide to robot learning
Blurb:     From what a robot even is — joints, frames, sensors — up through
           kinematics, control, SLAM, planning, reinforcement learning, and the
           modern vision-language-action stack that runs today's humanoids.
Href:      /writing/robotics-guide
```

Style it identically to the ML Bible card (same dimensions, hover, and accent).

### TOC page copy

Header:

```
# Robotics Bible
A from-scratch guide to robots: the body, the math, classical autonomy,
reinforcement learning, and the vision-language-action models driving the
current wave of general-purpose machines.
```

Then the numbered chapter list below (link each to its route).

---

## 2. Chapter map — routes, dates, future-reference notes

| # | Title | Route slug | Published | Updated | Future-reference note (surface as a small aside on the chapter page) |
|---|-------|-----------|-----------|---------|--------------------------------------------------------------------|
| 1 | Anatomy of a Robot | `chapter-1-anatomy` | Jul 6, 2026 | Jul 6, 2026 | Stable foundations; sensor/actuator specifics evolve, the concepts don't. |
| 2 | The Language of Space: Frames, Rotations & Transforms | `chapter-2-frames-transforms` | Jul 13, 2026 | Jul 13, 2026 | Timeless math. Revisit quaternions whenever orientation bugs appear. |
| 3 | Kinematics: Forward, Inverse & the Jacobian | `chapter-3-kinematics` | Jul 20, 2026 | Jul 20, 2026 | Timeless. The Jacobian reappears in control, RL, and VLA action spaces. |
| 4 | Control: From PID to Whole-Body | `chapter-4-control` | Jul 27, 2026 | Jul 27, 2026 | Classical control is stable; learned control (RL) is the moving frontier. |
| 5 | Estimation, Localization & SLAM | `chapter-5-slam` | Aug 3, 2026 | Aug 3, 2026 | Filters are settled; visual/neural SLAM and 3DGS maps are advancing fast. |
| 6 | Motion Planning & Navigation | `chapter-6-planning` | Aug 10, 2026 | Aug 10, 2026 | Classical planners are stable; learned planning is where to watch. |
| 7 | Reinforcement Learning for Robots | `chapter-7-rl` | Aug 17, 2026 | Aug 17, 2026 | PPO is the workhorse; revisit sim2real recipes yearly — they churn. |
| 8 | Perception: Vision & Vision-Language Models | `chapter-8-vlms` | Aug 24, 2026 | Aug 24, 2026 | Backbones (ViT/CLIP/SigLIP) are stable anchors; refresh encoders yearly. |
| 9 | Vision-Language-Action Models | `chapter-9-vla` | Aug 31, 2026 | Aug 31, 2026 | FAST-MOVING. Model roster (π, GR00T, Gemini Robotics, MolmoAct) changes every few months — see the dated "state of the roster" box and re-check quarterly. |
| 10 | Learning from Demonstration & Data Collection | `chapter-10-data` | Sep 7, 2026 | Sep 7, 2026 | Methods (ACT, Diffusion Policy) stable; tooling (LeRobot, Rerun) versions fast. |
| 11 | World Models & Simulation | `chapter-11-world-models` | Sep 14, 2026 | Sep 14, 2026 | FAST-MOVING. Named systems are bleeding-edge; lean on the taxonomy, re-check the roster. |
| 12 | Manipulation, Humanoids & Deploying Real Systems | `chapter-12-systems` | Sep 21, 2026 | Sep 21, 2026 | Humanoid hardware roster changes constantly; principles (grasping, safety) don't. |

**Reading order** is the chapter order: the guide builds strictly, each chapter assuming the last. Chapters 8→9 are the perception→action bridge; 9, 11 are the two fastest-moving and each carries a dated "state of the roster" box so a reader knows the shelf life.

---

## 3. How the chapter files are structured

Each `chapter-XX-*.md` contains:
- The full prose, in the ML Bible voice, ready to render.
- Inline `[FIG N.M] ... ` spec blocks marking where an interactive figure goes and exactly what it must do (type, controls, interaction, animation, colors, caption). **Build each figure to `STYLE_GUIDE.md` §4.** Replace the spec block with the rendered component at that position.
- `Check your understanding` blocks — render these as the `Show answer ▸ / Hide answer ▾` collapsibles used in the ML Bible.
- A `Future reference:` line — render as the small dated aside.

Figures are numbered per chapter (`Fig 7.1`, `Fig 7.2`, ...). Keep the numbering.

---

## 4. Figure build order (so the guide never ships half-polished)

1. First build the **shared figure primitives** described in `STYLE_GUIDE.md` §4.5 (Stepper, Slider-diagram, Draggable-field, Toggle-compare, Animated-pipeline) plus the shared `.fig` CSS and design tokens. Everything else is a skin over these.
2. Then build chapter figures. Prioritize the "hero" figure per chapter (the one the section is built around).
3. Test every figure at 320 / 768 / 1200px widths for overlap before merging (STYLE_GUIDE §4.6).
4. Verify `prefers-reduced-motion` gives a static, labeled fallback for each.

---

## 5. Definition of done

- New card on the main page → TOC page → all 12 chapter routes, all navigable.
- Every `[FIG N.M]` replaced by a working, polished, non-overlapping interactive figure.
- Dates and future-reference asides rendered per the table above.
- Prev/Next wired across all 12 chapters; Chapter 1 Prev and Chapter 12 Next handled gracefully.
- Visual parity with the ML Bible chrome.
- Reduced-motion and mobile (320px) verified.

## 6. Content-freshness protocol (important for chapters 9 & 11)

Robotics foundation models move fast. Chapters 9 and 11 each contain a dated **"State of the roster"** box listing the current model landscape as of the writing date. When rebuilding or later editing:
- Keep the box's date accurate to when it was last verified.
- Treat vendor benchmark numbers as vendor-reported (they're labeled as such in the prose). Don't upgrade them to fact.
- If you add a newer model, add it with a date and source; don't delete the historical lineage — the pedagogy depends on showing how each model fixed the last.
