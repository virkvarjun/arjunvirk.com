# Robotics Bible — video assets

Rendered clips for the guide walkthrough video. All 1920×1080, H.264, white or
site-themed backgrounds. These are source assets to drop into a video editor;
they are **not** served by the site (they live outside `public/`).

## Contents

- `scroll/scroll.mp4` — a 10.0s continuous, equal-pace scroll that flows through
  three chapters (Flow Matching → Data → World Models) stitched into one live
  DOM, so pages change with no visible cut. 60 fps.
- `sections/*.mp4` — twelve 2.6s animations, one per section of the Flow
  Matching & Diffusion chapter, on a white background. 30 fps. Order:
  `sampling, flow, diffusion, path, cfm, score, guidance, arch, latent,
  discrete, vla, decay`.

## Regenerating

Deterministic: same input always produces the same frames.

```bash
cd video
npm i                       # playwright-core (browser is the cached headless shell)
node render.mjs sections    # -> sections/*.mp4   (no server needed)
# for the scroll, start the dev server first (npm run dev -- --port 3111):
node render.mjs scroll      # -> scroll/scroll.mp4
```

Frames are screenshotted one at a time in headless Chromium and encoded with
ffmpeg, so duration and smoothness are exact (no dropped frames). The section
animations are authored in `_src/anim.html`, driven by `window.renderScene(u)`.
