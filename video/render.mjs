// Deterministic MP4 renderer. Screenshots one frame at a time (headless
// Chromium) and encodes with ffmpeg. No video-recording API needed, so it
// works with the cached headless shell and gives exact, reproducible clips.
//
//   node render.mjs sections     -> video/sections/*.mp4  (12 clips, ~2.6s)
//   node render.mjs scroll       -> video/scroll/scroll.mp4 (1 clip, 10.0s)
//
// The scroll clip stitches several chapters into one live DOM and scrolls it
// at constant velocity, so pages change without any visible cut.

import { chromium } from "playwright-core";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXE =
  process.env.HOME +
  "/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const W = 1920,
  H = 1080;

const SECTIONS = [
  "sampling", "flow", "diffusion", "path", "cfm", "score",
  "guidance", "arch", "latent", "discrete", "vla", "decay",
];

function encode(frameDir, pattern, fps, out, crf = 18) {
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-framerate", String(fps), "-i", path.join(frameDir, pattern),
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(crf),
     "-vf", `scale=${W}:${H}:flags=lanczos`, "-movflags", "+faststart", out],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  if (r.status !== 0) throw new Error("ffmpeg failed for " + out);
}

async function renderSections(browser) {
  const outDir = path.join(HERE, "sections");
  mkdirSync(outDir, { recursive: true });
  const FPS = 30, DUR = 2.6, N = Math.round(FPS * DUR); // 78 frames
  const url = "file://" + path.join(HERE, "_src", "anim.html");
  for (const scene of SECTIONS) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.goto(`${url}?scene=${scene}`, { waitUntil: "load" });
    await page.waitForFunction("window.__ready === true");
    const tmp = mkdtempSync(path.join(tmpdir(), "sec-"));
    for (let i = 0; i < N; i++) {
      // hold the first and last 4 frames so the clip reads cleanly on loop
      const raw = (i - 4) / (N - 9);
      const u = Math.max(0, Math.min(1, raw));
      await page.evaluate((u) => window.renderScene(u), u);
      await page.screenshot({ path: path.join(tmp, `f_${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
    }
    await page.close();
    encode(tmp, "f_%04d.jpg", FPS, path.join(outDir, `${scene}.mp4`));
    rmSync(tmp, { recursive: true, force: true });
    console.log("  ✓ sections/" + scene + ".mp4");
  }
}

async function renderScroll(browser) {
  const outDir = path.join(HERE, "scroll");
  mkdirSync(outDir, { recursive: true });
  const FPS = 60, DUR = 10, N = FPS * DUR; // 600 frames
  const base = "http://localhost:3111/writing/robotics-guide/";
  // Chapters stitched, in reading order, so the scroll flows continuously.
  const stitch = ["chapter-9-5-flow-matching-diffusion", "chapter-10-data", "chapter-11-world-models"];

  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(base + stitch[0], { waitUntil: "networkidle" });

  // Fetch the remaining chapters and append their <article> into the live
  // <main>, so it becomes one tall document sharing all the loaded CSS.
  await page.evaluate(async (slugs) => {
    const main = document.querySelector("main");
    for (const s of slugs) {
      const html = await (await fetch("/writing/robotics-guide/" + s)).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const art = doc.querySelector("article");
      if (art) {
        const sep = document.createElement("div");
        sep.style.height = "80px";
        main.appendChild(sep);
        main.appendChild(art);
      }
    }
    // kill any sticky/nav chrome that could reveal a boundary, and stop
    // figure animations from jumping while we scroll
    document.documentElement.style.scrollBehavior = "auto";
    // hide the Next.js dev-mode indicator badge so it never shows on film
    const css = document.createElement("style");
    css.textContent =
      "nextjs-portal,[data-nextjs-toast],#__next-build-watcher,[data-next-mark]{display:none !important}";
    document.head.appendChild(css);
  }, stitch.slice(1));

  await page.waitForTimeout(400);
  const docMax = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
  // Cap the travel to a calm, readable pace rather than the whole document, so
  // the 10s clip glides instead of blurring past.
  const PACE = 1000; // pixels per second
  const maxScroll = Math.min(docMax, PACE * DUR);
  const tmp = mkdtempSync(path.join(tmpdir(), "scroll-"));
  for (let i = 0; i < N; i++) {
    const y = Math.round((i / (N - 1)) * maxScroll); // linear, equal pace
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.screenshot({ path: path.join(tmp, `f_${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 90 });
  }
  await page.close();
  encode(tmp, "f_%04d.jpg", FPS, path.join(outDir, "scroll.mp4"), 20);
  rmSync(tmp, { recursive: true, force: true });
  console.log("  ✓ scroll/scroll.mp4  (" + maxScroll + "px over 10s, " + PACE + " px/s)");
}

const mode = process.argv[2] || "sections";
const browser = await chromium.launch({ executablePath: EXE, headless: true });
try {
  if (mode === "sections") await renderSections(browser);
  else if (mode === "scroll") await renderScroll(browser);
  else throw new Error("usage: node render.mjs sections|scroll");
} finally {
  await browser.close();
}
console.log("done:", mode);
