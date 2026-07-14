"use client";

import { useMemo, useReducer, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  R,
  MONO,
  Btn,
  Slider,
  Tabs,
  Stage,
  useRafLoop,
  usePrefersReducedMotion,
  useStageVisibility,
  svgArrow,
  svgPoint,
  approach,
  clamp,
  lerp,
  mulberry32,
  Legend,
  Readout,
  Transport,
  type V3,
  type Prim3D,
  type Camera3D,
  v3,
  quat,
  seg3,
  dot3,
  label3,
  grid3,
  box3,
  Scene3D,
  useOrbit,
  groundDrag,
  project,
} from "./shared";

// ===========================================================================
// Robotics Bible, Chapter 9 · Vision-Language-Action Models (13 figures).
// Every figure is a skin over ./shared: a fixed 720×440 stage, one Controls
// strip, a Readout lane top-left, a Legend lane top-right, a takeaway hint at
// y≈424, calm delta-timed motion gated on inView && !reduced, seeded
// randomness (mulberry32), and a static fully labeled state under
// prefers-reduced-motion. The FAST figures run a real DCT on a real seeded
// trajectory; the flow figure integrates a real velocity field; the MolmoAct
// figure is true orbitable 3D over the shared Scene3D engine.
// ===========================================================================

const smooth = (t: number) => t * t * (3 - 2 * t);

// --- A deterministic toy action trajectory + a real DCT --------------------
// One seeded 1-D action signal (a wrist angle over a 1 s chunk), built from a
// few low-frequency sinusoids. Both FAST figures compress THIS signal with an
// actual orthonormal DCT-II, so every token count and error shown is computed,
// not asserted.

const TRAJ = (() => {
  const rng = mulberry32(2025);
  const modes = Array.from({ length: 4 }, (_, m) => ({
    f: m + 1,
    a: (m === 0 ? 0.55 : 0.5 / (m + 1)) * (0.75 + rng() * 0.5),
    p: rng() * Math.PI * 2,
  }));
  return (u: number) =>
    modes.reduce((s, md) => s + md.a * Math.sin(2 * Math.PI * md.f * u + md.p), 0) / 1.35;
})();

// Orthonormal DCT-II of a length-T signal.
function dct2(x: number[]): number[] {
  const T = x.length;
  return Array.from({ length: T }, (_, k) => {
    const a = k === 0 ? Math.sqrt(1 / T) : Math.sqrt(2 / T);
    let s = 0;
    for (let t = 0; t < T; t++) s += x[t] * Math.cos((Math.PI / T) * (t + 0.5) * k);
    return a * s;
  });
}

// Inverse DCT keeping only the first `keep` (lowest-frequency) coefficients.
function idct2(c: number[], keep: number): number[] {
  const T = c.length;
  const K = Math.min(keep, T);
  return Array.from({ length: T }, (_, t) => {
    let s = 0;
    for (let k = 0; k < K; k++) {
      const a = k === 0 ? Math.sqrt(1 / T) : Math.sqrt(2 / T);
      s += a * c[k] * Math.cos((Math.PI / T) * (t + 0.5) * k);
    }
    return s;
  });
}

function rmse(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / a.length);
}

// Sample TRAJ at T evenly spaced points.
function sampleTraj(T: number): number[] {
  return Array.from({ length: T }, (_, i) => TRAJ(T === 1 ? 0 : i / (T - 1)));
}

// Quantize a value in [-1, 1] to the center of the nearest of `bins` bins.
function quantize(v: number, bins: number) {
  const w = 2 / bins;
  const idx = clamp(Math.floor((v + 1) / w), 0, bins - 1);
  return -1 + (idx + 0.5) * w;
}

// ===========================================================================
// Fig 9.1 · Inside the VLA forward pass  (stepper)
// Walk the transformer that runs a VLA: image patches and words become tokens,
// each token projects to a query, key, and value, multi-head attention lets a
// word attend to the pixels it names, the values are blended, and the
// contextualized tokens drive the action expert. Step through, or pick a head.
// ===========================================================================

type Tok = { label: string; img: boolean };
// 4 image-patch tokens then 3 text tokens; "cup" (index 5) is the query token.
const FP_TOKENS: Tok[] = [
  { label: "img A", img: true },
  { label: "img B", img: true },
  { label: "img C", img: true },
  { label: "img D", img: true },
  { label: "put", img: false },
  { label: "cup", img: false },
  { label: "sink", img: false },
];
const FP_Q = 5; // the query token we trace: the word "cup"
// Per-head attention weights from "cup" to every token (each row sums to 1).
// img B holds the cup, so the semantic head grounds the word on that patch.
const FP_HEADS: { name: string; role: string; w: number[] }[] = [
  { name: "head 1", role: "semantic: the word grounds on the cup pixels", w: [0.05, 0.55, 0.05, 0.05, 0.05, 0.2, 0.05] },
  { name: "head 2", role: "local: attend to neighboring words", w: [0.04, 0.06, 0.04, 0.04, 0.34, 0.16, 0.32] },
  { name: "head 3", role: "syntax: bind to the verb it is an object of", w: [0.03, 0.05, 0.03, 0.03, 0.68, 0.12, 0.06] },
];
const FP_N = 6; // number of steps
const FP_STEPNAME = [
  "inputs: an image and an instruction",
  "tokenize: patches and words become one sequence",
  "project: every token becomes a query, key, and value",
  "attention: scores = softmax(Q Kᵀ / √d)",
  "blend: new token = Σ (weight × value)",
  "act: contextualized tokens drive the action expert",
];

export function RbVlaForwardPass() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [step, setStep] = useState(0);
  const [head, setHead] = useState(0);
  const [playing, toggle] = useReducer((p) => !p, false);
  const [, setClk] = useState(0);

  useRafLoop(
    (dt) =>
      setClk((c) => {
        const n = c + dt;
        if (n > 1.3) {
          setStep((s) => (s + 1) % FP_N);
          return 0;
        }
        return n;
      }),
    { playing: playing && inView && !reduced },
  );

  const sd = reduced ? FP_N - 1 : step; // reduced motion: the labeled final state

  // token lane geometry
  const N = FP_TOKENS.length;
  const x0 = 70;
  const x1 = 650;
  const tx = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
  const rowY = 150;
  const bw = 62;
  const bh = 30;

  const w = FP_HEADS[head].w;
  const maxW = Math.max(...w);
  const argmax = w.indexOf(maxW);

  const tokBox = (i: number, y: number, highlight: boolean) => {
    const t = FP_TOKENS[i];
    const col = t.img ? R.signal : R.plan;
    const fill = t.img ? R.fillBlue : R.fillAmber;
    return (
      <g key={i}>
        <rect
          x={tx(i) - bw / 2}
          y={y}
          width={bw}
          height={bh}
          rx={6}
          fill={highlight ? fill : "var(--background)"}
          stroke={col}
          strokeWidth={highlight ? 3 : 2}
        />
        <text x={tx(i)} y={y + bh / 2 + 4} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>
          {t.label}
        </text>
      </g>
    );
  };

  return (
    <Stage
      innerRef={ref}
      title={"Fig 9.1 · Inside the VLA forward pass"}
      ariaLabel={"Stepping through a vision-language-action transformer forward pass, step " + (sd + 1) + " of " + FP_N}
      controls={
        <>
          <Btn onClick={() => setStep((s) => (s + FP_N - 1) % FP_N)}>◀ back</Btn>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setStep((s) => (s + 1) % FP_N)}>step ▶</Btn>
          <Btn onClick={() => { setStep(0); setHead(0); }}>↺ reset</Btn>
          <Tabs
            options={FP_HEADS.map((h, i) => ({ id: String(i), label: h.name }))}
            value={String(head)}
            onChange={(v) => setHead(Number(v))}
          />
        </>
      }
    >
      <Readout
        rows={[
          { label: "step", value: `${sd + 1} / ${FP_N}`, color: R.ink },
          { label: "query token", value: '"cup"', color: R.plan },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "image token" },
          { color: R.plan, label: "text token" },
          { color: R.goal, label: "action output" },
        ]}
      />

      {/* Step 0: raw inputs */}
      {sd === 0 && (
        <g>
          <text x={168} y={128} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>image</text>
          {Array.from({ length: 16 }).map((_, idx) => {
            const r = Math.floor(idx / 4);
            const c = idx % 4;
            return (
              <rect key={idx} x={100 + c * 36} y={142 + r * 36} width={34} height={34}
                fill={r === 1 && c === 1 ? R.fillBlue : "#efefec"} stroke={R.line} strokeWidth={1.5} />
            );
          })}
          <text x={153} y={183} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>cup</text>
          <text x={470} y={158} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>instruction</text>
          <rect x={320} y={172} width={300} height={44} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
          <text x={470} y={199} textAnchor="middle" fontFamily={MONO} fontSize={15} fill={R.ink}>&quot;put the cup in the sink&quot;</text>
          <text x={360} y={340} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>a patch encoder and a tokenizer turn both into vectors</text>
        </g>
      )}

      {/* Steps 1+ : the token sequence lives in a fixed lane */}
      {sd >= 1 && (
        <g>
          <text x={x0 - bw / 2} y={rowY - 12} fontFamily={MONO} fontSize={12} fill={R.world}>{N} tokens (image · text)</text>
          {FP_TOKENS.map((_, i) => tokBox(i, rowY, sd === 1 || i === FP_Q))}
        </g>
      )}

      {/* Step 2: Q K V projection under each token */}
      {sd === 2 && (
        <g>
          {FP_TOKENS.map((_, i) => (
            <g key={i}>
              {["Q", "K", "V"].map((lab, k) => {
                const cols = [R.signal, R.goal, R.plan];
                return (
                  <rect key={lab} x={tx(i) - 21 + k * 15} y={rowY + 46} width={12} height={26}
                    rx={2} fill={cols[k]} opacity={0.85} />
                );
              })}
            </g>
          ))}
          <text x={60} y={rowY + 110} fontFamily={MONO} fontSize={13} fill={R.world}>
            q = x·W_Q (blue), k = x·W_K (green), v = x·W_V (amber)
          </text>
          <text x={60} y={rowY + 132} fontFamily={MONO} fontSize={13} fill={R.world}>
            three learned projections per token, one set per head
          </text>
        </g>
      )}

      {/* Step 3: attention from the query token to all keys (bars below the row) */}
      {sd === 3 && (
        <g>
          {svgArrow(tx(FP_Q), rowY + 34, tx(argmax), rowY + 34 + 8, R.signal, 2, 7)}
          {FP_TOKENS.map((_, i) => {
            const hgt = 90 * w[i];
            const strong = w[i] === maxW;
            return (
              <g key={i}>
                <rect x={tx(i) - 16} y={rowY + 48} width={32} height={hgt}
                  rx={2} fill={strong ? R.signal : R.fillBlue} stroke={strong ? R.signal : R.line} strokeWidth={1.5} />
                <text x={tx(i)} y={rowY + 64 + hgt} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
                  {w[i].toFixed(2)}
                </text>
              </g>
            );
          })}
          <text x={60} y={rowY + 188} fontFamily={MONO} fontSize={13} fill={R.ink}>
            {FP_HEADS[head].name + ": " + FP_HEADS[head].role}
          </text>
          <text x={60} y={rowY + 210} fontFamily={MONO} fontSize={12} fill={R.world}>
            softmax( q·kⱼ / √d ) over all tokens — each head learns a different pattern
          </text>
        </g>
      )}

      {/* Step 4: weighted sum of values */}
      {sd === 4 && (
        <g>
          {FP_TOKENS.map((_, i) => (
            <g key={i} opacity={0.3 + 0.7 * (w[i] / maxW)}>
              <rect x={tx(i) - 6} y={rowY + 46} width={12} height={26} rx={2} fill={R.plan} />
            </g>
          ))}
          {svgArrow(tx(FP_Q), rowY + 84, 360, rowY + 140, R.plan, 2.5, 9)}
          <rect x={290} y={rowY + 146} width={140} height={34} rx={6} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          <text x={360} y={rowY + 168} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>new &quot;cup&quot; token</text>
          <text x={60} y={rowY + 214} fontFamily={MONO} fontSize={13} fill={R.world}>
            the updated token = Σ (weight × value): it now carries where the cup is
          </text>
          <text x={60} y={rowY + 236} fontFamily={MONO} fontSize={12} fill={R.world}>
            stack this block ~18 times and the sequence is fully contextualized
          </text>
        </g>
      )}

      {/* Step 5: action expert */}
      {sd === 5 && (
        <g>
          {svgArrow(360, rowY + 40, 360, rowY + 74, R.world, 2.5, 9)}
          <rect x={250} y={rowY + 78} width={220} height={40} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={3} />
          <text x={360} y={rowY + 103} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.ink}>action expert (flow / FAST)</text>
          {svgArrow(360, rowY + 118, 360, rowY + 152, R.world, 2.5, 9)}
          <rect x={280} y={rowY + 156} width={160} height={36} rx={6} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
          <text x={360} y={rowY + 179} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>action chunk → robot</text>
          <text x={360} y={rowY + 230} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
            the same backbone that reads the scene now writes the motion
          </text>
        </g>
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13.5} fill={R.ink} fontWeight={600}>
        {FP_STEPNAME[sd]}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.2 · RT-1's action tokens  (slider-driven diagram)
// One continuous action value snapped to the nearest of N bins; the red gap
// shows the real quantization error. Bin-count tabs make the staircase coarse.
// ===========================================================================

const BINX0 = 60;
const BINX1 = 660;
const BIN_OPTS = [4, 16, 64, 256] as const;

export function RbActionTokens() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [value, setValue] = useState(0.37); // true action in [-1, 1]
  const [bins, setBins] = useState(16);
  const [disp, setDisp] = useState(0.37);

  useRafLoop(
    (dt) => setDisp((v) => approach(v, value, 0.3, dt)),
    { playing: inView && !reduced },
  );

  const v = reduced ? value : disp;
  const t = (v + 1) / 2; // 0..1
  const binW = 2 / bins;
  const binIdx = clamp(Math.floor((v + 1) / binW), 0, bins - 1);
  const quant = -1 + (binIdx + 0.5) * binW;
  const err = Math.abs(v - quant);

  const trueX = lerp(BINX0, BINX1, t);
  const quantX = lerp(BINX0, BINX1, (quant + 1) / 2);
  const drawn = Math.min(bins, 64); // legible tick cap

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.2 · RT-1's action tokens"
      ariaLabel={`A continuous action of ${v.toFixed(2)} snapped to bin ${binIdx} of ${bins}, quantization error ${err.toFixed(3)}`}
      controls={
        <>
          <Slider label="action" min={-1} max={1} step={0.01} value={value} onChange={setValue} fmt={(x) => x.toFixed(2)} />
          <Tabs
            options={BIN_OPTS.map((b) => ({ id: String(b), label: `${b} bins` }))}
            value={String(bins)}
            onChange={(x) => setBins(Number(x))}
          />
        </>
      }
    >
      <Readout
        rows={[
          { label: "true action", value: v.toFixed(3), color: R.signal },
          { label: "token", value: `bin #${binIdx} → ${quant.toFixed(3)}`, color: R.plan },
          { label: "bin width", value: binW.toFixed(3), color: R.world },
          { label: "error", value: err.toFixed(3), color: err > binW / 4 ? R.error : R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "true action" },
          { color: R.plan, label: "quantized token" },
          { color: R.error, label: "rounding gap" },
        ]}
      />

      {/* bin strip */}
      <rect x={BINX0} y={180} width={BINX1 - BINX0} height={54} rx={4} fill="#f2f2ef" stroke={R.line} strokeWidth={1.5} />
      {Array.from({ length: drawn }).map((_, i) => {
        const bx = lerp(BINX0, BINX1, i / drawn);
        const bx2 = lerp(BINX0, BINX1, (i + 1) / drawn);
        const on = t >= i / drawn && t < (i + 1) / drawn;
        return (
          <g key={i}>
            {on && <rect x={bx} y={180} width={bx2 - bx} height={54} fill={R.fillAmber} />}
            <line x1={bx} y1={180} x2={bx} y2={234} stroke={R.line} strokeWidth={0.8} opacity={0.6} />
          </g>
        );
      })}
      <text x={BINX0} y={256} fontFamily={MONO} fontSize={12} fill={R.world}>−1</text>
      <text x={BINX1 - 8} y={256} fontFamily={MONO} fontSize={12} fill={R.world}>+1</text>
      <text x={(BINX0 + BINX1) / 2} y={256} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {bins} bins{bins > 64 ? " (every 4th tick drawn)" : ""}
      </text>

      {/* true value marker (blue), above the strip */}
      <line x1={trueX} y1={140} x2={trueX} y2={180} stroke={R.signal} strokeWidth={3} />
      <circle cx={trueX} cy={140} r={7} fill={R.signal} />
      <text x={trueX} y={128} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>true</text>

      {/* quantized value marker (amber), below the strip */}
      <line x1={quantX} y1={234} x2={quantX} y2={282} stroke={R.plan} strokeWidth={3} />
      <circle cx={quantX} cy={282} r={7} fill={R.plan} />
      <text x={quantX} y={306} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>robot gets</text>

      {/* the red quantization gap between true and quantized, drawn on the strip */}
      {Math.abs(trueX - quantX) > 1 && (
        <>
          <line x1={trueX} y1={207} x2={quantX} y2={207} stroke={R.error} strokeWidth={5} strokeLinecap="round" />
          <text x={clamp((trueX + quantX) / 2, 120, 600)} y={352} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error} fontWeight={600}>
            thrown-away fidelity
          </text>
        </>
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        {reduced
          ? "Reduced motion: the slider still snaps the value into a bin and shows the error."
          : "fewer bins → coarser staircase → bigger red gap"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.3 · RT-2 speaks actions as text  (toggle-compare, animated stream)
// Same backbone, two tabs: "Ask a question" streams a word answer; "Command
// the robot" streams an integer action-string and a real two-link arm (law-of-
// cosines IK) reaches the dinosaur as the tokens land.
// ===========================================================================

const QA_TOKENS = ["A:", "dino", "saur"];
const ACT_TOKENS = ["1", "128", "91", "241", "5", "101", "127"];

// Two-link IK (elbow-up) on the stage plane; the same law-of-cosines from Ch3.
function ik2(bx: number, by: number, txx: number, tyy: number, L1: number, L2: number) {
  const dx = txx - bx;
  const dy = tyy - by;
  const d = clamp(Math.hypot(dx, dy), 1, L1 + L2 - 1e-3);
  const a = Math.atan2(dy, dx);
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const th = a - Math.acos(cosA); // minus lifts the elbow on a y-down stage
  const ex = bx + L1 * Math.cos(th);
  const ey = by + L1 * Math.sin(th);
  const scale = d / Math.hypot(dx, dy);
  return { ex, ey, wx: bx + dx * scale, wy: by + dy * scale };
}

export function RbSpeakActions() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<"text" | "action">("action");
  const [shown, setShown] = useState(ACT_TOKENS.length);
  const [playing, toggle] = useReducer((p) => !p, false);
  const [, setClk] = useState(0);

  const toks = tab === "text" ? QA_TOKENS : ACT_TOKENS;

  useRafLoop(
    (dt) =>
      setClk((c) => {
        const n = c + dt;
        if (n > 0.55) {
          setShown((s) => (s >= toks.length ? 0 : s + 1));
          return 0;
        }
        return n;
      }),
    { playing: playing && inView && !reduced },
  );

  const nShown = reduced ? toks.length : Math.min(shown, toks.length);
  const done = nShown >= toks.length;
  const frac = smooth(nShown / toks.length);

  const switchTab = (vv: "text" | "action") => {
    setTab(vv);
    setShown((vv === "text" ? QA_TOKENS : ACT_TOKENS).length);
  };

  // the arm: base, two links, reaching the dino as the action string completes
  const base = { x: 215, y: 392 };
  const rest = { x: 330, y: 300 };
  const grasp = { x: 532, y: 358 };
  const target = { x: lerp(rest.x, grasp.x, frac), y: lerp(rest.y, grasp.y, frac) };
  const arm = ik2(base.x, base.y, target.x, target.y, 170, 160);

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.3 · RT-2 speaks actions as text"
      ariaLabel={`The same VLM backbone: on the ${tab} tab it emits ${tab === "text" ? "a word answer" : "an integer action-string"}, ${nShown} of ${toks.length} tokens shown`}
      controls={
        <>
          <Tabs
            options={[
              { id: "text", label: "Ask a question" },
              { id: "action", label: "Command the robot" },
            ]}
            value={tab}
            onChange={switchTab}
          />
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => setShown((s) => (s >= toks.length ? 0 : s + 1))}
            stepLabel="token"
            onReset={() => setShown(0)}
          />
        </>
      }
    >
      <Readout
        rows={[
          { label: "output", value: tab === "text" ? "words" : "action string", color: R.plan },
          { label: "tokens", value: `${nShown} / ${toks.length}`, color: R.ink },
          {
            label: "result",
            value: tab === "text" ? (done ? '"dinosaur"' : "…") : done ? "grasped ✓" : "reaching…",
            color: done ? R.goal : R.world,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "vocabulary tokens" },
          { color: R.signal, label: "the arm" },
          { color: R.goal, label: "the goal" },
        ]}
      />

      {/* shared backbone box */}
      <rect x={290} y={40} width={160} height={54} rx={10} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
      <text x={370} y={64} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.ink}>
        same VLM
      </text>
      <text x={370} y={82} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        backbone
      </text>
      {svgArrow(370, 94, 370, 128, R.line, 3, 9)}

      {/* streaming tokens */}
      <text x={60} y={152} fontFamily={MONO} fontSize={13} fill={R.world}>
        {tab === "text" ? "Q: what animal is extinct?" : 'instr: "pick up the extinct animal"'}
      </text>
      {toks.map((tok, i) => {
        const on = i < nShown;
        const bx = 60 + i * (tab === "text" ? 96 : 82);
        return (
          <g key={i} opacity={on ? 1 : 0.15}>
            <rect x={bx} y={168} width={tab === "text" ? 84 : 70} height={34} rx={7} fill={R.fillAmber} stroke={R.plan} strokeWidth={on ? 2.5 : 1} />
            <text x={bx + (tab === "text" ? 42 : 35)} y={190} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>
              {tok}
            </text>
          </g>
        );
      })}
      <text x={60} y={224} fontFamily={MONO} fontSize={12} fill={R.plan}>
        {tab === "text" ? "words (same vocabulary)" : "action integers (same vocabulary)"}
      </text>

      {/* action-tab outcome: a real two-link arm reaches the dinosaur */}
      {tab === "action" && (
        <g>
          <line x1={130} y1={392} x2={660} y2={392} stroke={R.line} strokeWidth={2} />
          <circle cx={560} cy={358} r={20} fill={done ? R.fillGreen : "#eeeeec"} stroke={done ? R.goal : R.world} strokeWidth={3} />
          <text x={560} y={364} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>🦕</text>
          <text x={615} y={340} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={done ? R.goal : R.world}>
            {done ? "grasped ✓" : "toy dinosaur"}
          </text>
          <line x1={base.x} y1={base.y} x2={arm.ex} y2={arm.ey} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
          <line x1={arm.ex} y1={arm.ey} x2={arm.wx} y2={arm.wy} stroke={R.signal} strokeWidth={7} strokeLinecap="round" />
          <circle cx={base.x} cy={base.y} r={8} fill={R.ink} />
          <circle cx={arm.ex} cy={arm.ey} r={6} fill={R.ink} />
          <circle cx={arm.wx} cy={arm.wy} r={6} fill={R.signal} />
        </g>
      )}
      {tab === "text" && (
        <text x={60} y={300} fontFamily={MONO} fontSize={15} fill={R.goal} fontWeight={600}>
          {done ? '→ "dinosaur"' : "…"}
        </text>
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        {reduced
          ? "Reduced motion: the full token stream and outcome are shown; tabs still switch."
          : "same weights, same softmax over one vocabulary — only the strings differ"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.4 · Positive transfer across embodiments  (toggle-compare)
// Three robots each with a success bar; a "solo vs pooled" toggle raises every
// bar under pooling, keeps the solo level as a dashed baseline, and fades in
// transfer arrows between the robots.
// ===========================================================================

type Emb = "franka" | "widowx" | "mobile";
const EMB: { id: Emb; label: string; x: number; solo: number; pooled: number }[] = [
  { id: "franka", label: "Franka arm", x: 175, solo: 0.42, pooled: 0.63 },
  { id: "widowx", label: "WidowX", x: 360, solo: 0.38, pooled: 0.58 },
  { id: "mobile", label: "mobile manip.", x: 545, solo: 0.34, pooled: 0.55 },
];
const EMB_SOLO_MEAN = EMB.reduce((s, e) => s + e.solo, 0) / EMB.length;
const EMB_POOL_MEAN = EMB.reduce((s, e) => s + e.pooled, 0) / EMB.length;

export function RbPositiveTransfer() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [pooled, setPooled] = useState(true);
  const [focus, setFocus] = useState<Emb | "all">("all");
  const [h, setH] = useState<Record<Emb, number>>({ franka: 0.63, widowx: 0.58, mobile: 0.55 });

  useRafLoop(
    (dt) =>
      setH((s) => ({
        franka: approach(s.franka, pooled ? EMB[0].pooled : EMB[0].solo, 0.2, dt),
        widowx: approach(s.widowx, pooled ? EMB[1].pooled : EMB[1].solo, 0.2, dt),
        mobile: approach(s.mobile, pooled ? EMB[2].pooled : EMB[2].solo, 0.2, dt),
      })),
    { playing: inView && !reduced },
  );

  const val = (e: Emb) =>
    reduced ? (pooled ? EMB.find((x) => x.id === e)!.pooled : EMB.find((x) => x.id === e)!.solo) : h[e];

  const baseY = 370;
  const maxH = 230;
  const mean = pooled ? EMB_POOL_MEAN : EMB_SOLO_MEAN;

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.4 · Positive transfer across embodiments"
      ariaLabel={`Three robot success bars, ${pooled ? "trained on pooled OXE data" : "trained solo"}; mean success ${Math.round(mean * 100)} percent`}
      controls={
        <>
          <Btn onClick={() => setPooled((v) => !v)} active={pooled}>
            {pooled ? "✓ pooled (OXE)" : "solo → pool it"}
          </Btn>
          <Tabs
            options={[
              { id: "all", label: "all" },
              ...EMB.map((e) => ({ id: e.id, label: e.label })),
            ]}
            value={focus}
            onChange={setFocus}
          />
        </>
      }
    >
      <Readout
        rows={[
          { label: "solo mean", value: `${Math.round(EMB_SOLO_MEAN * 100)}%`, color: R.signal },
          { label: "pooled mean", value: `${Math.round(EMB_POOL_MEAN * 100)}%`, color: R.goal },
          {
            label: "gain",
            value: pooled ? `+${Math.round((EMB_POOL_MEAN - EMB_SOLO_MEAN) * 100)} pts` : "—",
            color: pooled ? R.goal : R.world,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "solo baseline", dash: true },
          { color: R.goal, label: "pooled (OXE)" },
          { color: R.plan, label: "cross-robot data" },
        ]}
      />

      {/* transfer arrows (only when pooled) */}
      {pooled &&
        EMB.map((e) =>
          EMB.filter((o) => o.id !== e.id && (focus === "all" || focus === e.id)).map((o) => (
            <g key={`${e.id}-${o.id}`} opacity={0.5}>
              {svgArrow(o.x, 118, e.x, 118, R.plan, 2, 7)}
            </g>
          )),
        )}
      {pooled && (
        <text x={360} y={104} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
          data flows between bodies
        </text>
      )}

      {/* bars, each with its solo level as a dashed baseline */}
      {EMB.map((e) => {
        const vv = val(e.id);
        const dim = focus !== "all" && focus !== e.id;
        const bh = vv * maxH;
        const soloY = baseY - e.solo * maxH;
        return (
          <g key={e.id} opacity={dim ? 0.3 : 1}>
            <rect x={e.x - 34} y={baseY - maxH} width={68} height={maxH} rx={4} fill="#f2f2ef" />
            <rect x={e.x - 34} y={baseY - bh} width={68} height={bh} rx={4} fill={pooled ? R.fillGreen : R.fillBlue} stroke={pooled ? R.goal : R.signal} strokeWidth={2} />
            <line x1={e.x - 40} y1={soloY} x2={e.x + 40} y2={soloY} stroke={R.signal} strokeWidth={2} strokeDasharray="5 4" />
            <text x={e.x} y={baseY - bh - 8} textAnchor="middle" fontFamily={MONO} fontSize={14} fontWeight={600} fill={pooled ? R.goal : R.signal}>
              {Math.round(vv * 100)}%
            </text>
            <text x={e.x} y={baseY + 20} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              {e.label}
            </text>
          </g>
        );
      })}
      <line x1={110} y1={baseY} x2={620} y2={baseY} stroke={R.line} strokeWidth={2} />

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={pooled ? R.goal : R.world}>
        {pooled ? "positive transfer — and RT-2-X showed ~3× on emergent skills" : "data siloed on each robot: every bar sits at its dashed baseline"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.5 · OpenVLA's dual vision encoder  (toggle-compare)
// One image → two encoders. SigLIP (semantics) is vague on the handle; DINOv2
// (geometry) nails parts but not meaning; "both" fuses into a grasp point.
// ===========================================================================

type EncTab = "siglip" | "dino" | "both";

export function RbDualEncoder() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<EncTab>("both");
  const [t, setT] = useState(0);
  useRafLoop((dt) => setT((v) => v + dt), { playing: inView && !reduced });
  const pulse = reduced ? 0.5 : (Math.sin(t * 1.8) + 1) / 2;

  const mug = { x: 400, y: 255 };
  const sig = tab === "siglip" || tab === "both";
  const dino = tab === "dino" || tab === "both";
  const fused = tab === "both";

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5 · OpenVLA's dual vision encoder"
      ariaLabel={`One image through the ${tab} encoder path; ${fused ? "grasp point committed" : "grasp blocked"}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "siglip", label: "SigLIP only" },
              { id: "dino", label: "DINOv2 only" },
              { id: "both", label: "both fused" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </>
      }
    >
      <Readout
        rows={[
          { label: "what (SigLIP)", value: sig ? '"a mug" ✓' : "—", color: sig ? R.plan : R.world },
          { label: "where (DINOv2)", value: dino ? "handle px ✓" : "—", color: dino ? R.signal : R.world },
          { label: "grasp", value: fused ? "committed ✓" : "blocked", color: fused ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "semantics: what" },
          { color: R.signal, label: "geometry: where" },
          { color: R.goal, label: "grasp point" },
        ]}
      />

      {/* the two encoder boxes feeding the scene */}
      <rect x={60} y={160} width={116} height={38} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.5} opacity={sig ? 1 : 0.3} />
      <text x={118} y={184} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>SigLIP</text>
      <rect x={60} y={320} width={116} height={38} rx={8} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} opacity={dino ? 1 : 0.3} />
      <text x={118} y={344} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>DINOv2</text>
      {sig && svgArrow(176, 179, 300, 220, R.plan, 2, 8)}
      {dino && svgArrow(176, 339, 300, 290, R.signal, 2, 8)}

      {/* the raw mug (grey structure) */}
      <ellipse cx={mug.x} cy={mug.y + 26} rx={44} ry={14} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <rect x={mug.x - 40} y={mug.y - 30} width={80} height={60} rx={8} fill="#f2f2ef" stroke={R.world} strokeWidth={2.5} />
      <path d={`M ${mug.x + 40} ${mug.y - 14} q 34 4 34 30 q 0 26 -34 30`} fill="none" stroke={R.world} strokeWidth={7} />
      <text x={mug.x} y={mug.y + 66} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        raw image
      </text>

      {/* SigLIP semantic blob (amber, whole object) */}
      {sig && (
        <ellipse cx={mug.x} cy={mug.y} rx={64} ry={54} fill={R.fillAmber} opacity={0.4 + pulse * 0.15} stroke={R.plan} strokeWidth={2} />
      )}
      {/* DINOv2 geometric heat on handle/rim (blue, precise parts) */}
      {dino && (
        <>
          <circle cx={mug.x + 62} cy={mug.y + 16} r={14} fill={R.fillBlue} opacity={0.5 + pulse * 0.2} stroke={R.signal} strokeWidth={2} />
          <line x1={mug.x - 40} y1={mug.y - 30} x2={mug.x + 40} y2={mug.y - 30} stroke={R.signal} strokeWidth={3} opacity={0.7} />
        </>
      )}
      {/* the fused grasp point */}
      {(fused || reduced) && (
        <>
          <circle cx={mug.x + 62} cy={mug.y + 16} r={9} fill={R.goal} />
          <text x={mug.x + 62} y={mug.y + 68} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal} fontWeight={600}>
            grasp point ✓
          </text>
        </>
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={fused ? R.goal : R.error}>
        {tab === "siglip"
          ? 'knows "mug", but the handle is a vague blob — nowhere precise to grip'
          : tab === "dino"
            ? "nails the handle geometry, but has no idea what the object is for"
            : "what + where = a confident grasp: manipulation needs both encoders"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.6 · Why diffusion actions handle ambiguity  (toggle-compare)
// A cup with two valid grasps. Regression lands in the dead middle and misses;
// diffusion denoises along a real seeded trail and commits to one side
// (resample re-rolls left/right).
// ===========================================================================

const DA_CUP = { x: 400, y: 250 };
const DA_LEFT = { x: DA_CUP.x - 90, y: DA_CUP.y };
const DA_RIGHT = { x: DA_CUP.x + 90, y: DA_CUP.y };
const DA_STEPS = 26;

// Deterministic denoising trail for a given seed: noise start → chosen mode,
// with jitter that decays as τ → 1 (what a reverse process looks like).
function daTrail(seed: number) {
  const rng = mulberry32(seed);
  const goLeft = rng() < 0.5;
  const target = goLeft ? DA_LEFT : DA_RIGHT;
  const start = {
    x: DA_CUP.x + (rng() - 0.5) * 160,
    y: DA_CUP.y - 90 - rng() * 40,
  };
  const pts = Array.from({ length: DA_STEPS + 1 }, (_, i) => {
    const u = i / DA_STEPS;
    const decay = (1 - u) ** 1.5;
    return {
      x: lerp(start.x, target.x, smooth(u)) + (rng() - 0.5) * 56 * decay,
      y: lerp(start.y, target.y, smooth(u)) + (rng() - 0.5) * 56 * decay,
    };
  });
  return { goLeft, pts };
}

export function RbDiffusionAmbiguity() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<"regression" | "diffusion">("diffusion");
  const [seed, setSeed] = useState(3);
  const [prog, setProg] = useState(1); // 0..1 denoising progress

  useRafLoop(
    (dt) => setProg((p) => (p >= 1 ? 1 : Math.min(1, p + dt * 0.55))),
    { playing: inView && !reduced && tab === "diffusion" && prog < 1 },
  );

  const trail = useMemo(() => daTrail(seed), [seed]);
  const p = reduced ? 1 : prog;
  const idx = Math.round(p * DA_STEPS);
  const cur = trail.pts[idx];
  const committed = p >= 1;

  const resample = () => {
    setSeed((s) => s + 1);
    setProg(0);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.6 · Why diffusion actions handle ambiguity"
      ariaLabel={`A cup with two valid grasps; the ${tab} head ${tab === "regression" ? "lands in the useless middle" : `commits to the ${trail.goLeft ? "left" : "right"} grasp`}`}
      controls={
        <>
          <Tabs
            options={[
              { id: "regression", label: "single regression" },
              { id: "diffusion", label: "diffusion" },
            ]}
            value={tab}
            onChange={(v) => {
              setTab(v);
              setProg(v === "diffusion" ? 0 : 1);
            }}
          />
          {tab === "diffusion" && <Btn onClick={resample}>↺ resample</Btn>}
        </>
      }
    >
      <Readout
        rows={[
          { label: "head", value: tab === "regression" ? "regression" : "diffusion", color: R.ink },
          { label: "τ (denoise)", value: tab === "diffusion" ? p.toFixed(2) : "—", color: R.signal },
          {
            label: "lands on",
            value:
              tab === "regression"
                ? "the dead middle ✗"
                : committed
                  ? `${trail.goLeft ? "left" : "right"} grasp ✓`
                  : "…denoising",
            color: tab === "regression" ? R.error : committed ? R.goal : R.world,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.goal, label: "valid grasps", dash: true },
          { color: R.signal, label: "denoising sample" },
          { color: R.error, label: "averaged output" },
        ]}
      />

      {/* the cup */}
      <ellipse cx={DA_CUP.x} cy={DA_CUP.y + 30} rx={40} ry={12} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <rect x={DA_CUP.x - 36} y={DA_CUP.y - 26} width={72} height={56} rx={8} fill="#f2f2ef" stroke={R.world} strokeWidth={2.5} />
      <text x={DA_CUP.x} y={DA_CUP.y + 62} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        cup, two valid grasps
      </text>

      {/* the two valid approaches (green, dashed) */}
      {[DA_LEFT, DA_RIGHT].map((g, i) => (
        <g key={i} opacity={0.6}>
          <circle cx={g.x} cy={g.y} r={12} fill="none" stroke={R.goal} strokeWidth={2} strokeDasharray="4 4" />
        </g>
      ))}

      {/* diffusion: the actual denoising trail so far */}
      {tab === "diffusion" && (
        <>
          <polyline
            points={trail.pts.slice(0, idx + 1).map((q) => `${q.x},${q.y}`).join(" ")}
            fill="none"
            stroke={R.signal}
            strokeWidth={2}
            opacity={0.55}
          />
          <circle cx={trail.pts[0].x} cy={trail.pts[0].y} r={6} fill="none" stroke={R.world} strokeWidth={2} />
          <text x={trail.pts[0].x + 10} y={trail.pts[0].y - 8} fontFamily={MONO} fontSize={11.5} fill={R.world}>noise</text>
          <circle cx={cur.x} cy={cur.y} r={12} fill={committed ? R.fillAmber : R.fillBlue} stroke={committed ? R.plan : R.signal} strokeWidth={3} />
          {committed && (
            <text x={cur.x} y={cur.y - 22} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal} fontWeight={600}>
              committed ✓
            </text>
          )}
        </>
      )}

      {/* regression: the smeared average */}
      {tab === "regression" && (
        <>
          <line x1={DA_LEFT.x} y1={DA_LEFT.y} x2={DA_RIGHT.x} y2={DA_RIGHT.y} stroke={R.error} strokeWidth={1.5} strokeDasharray="3 4" opacity={0.6} />
          <circle cx={DA_CUP.x} cy={DA_CUP.y} r={13} fill={R.fillRed} stroke={R.error} strokeWidth={3} />
          <text x={DA_CUP.x} y={DA_CUP.y - 40} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error} fontWeight={600}>
            average of both modes: misses
          </text>
        </>
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={tab === "regression" ? R.error : R.goal}>
        {tab === "regression"
          ? "one output smears into the dead middle between two modes"
          : reduced
            ? "Reduced motion: a committed grasp is shown; resample re-rolls the side."
            : "denoises to one valid mode — resample re-rolls which side it picks"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.7 · Three ways to represent an action  (toggle-compare, real math)
// The same seeded 1-D action chunk three ways. Binning actually quantizes the
// samples into 256 bins (one token per timestep, per dimension); FAST runs a
// real DCT and keeps 8 coefficients; flow generates directly. Token counts,
// fidelity, and decode passes are computed, not asserted.
// ===========================================================================

type RepTab = "binning" | "fast" | "flow";
const REP_KEEP = 8; // FAST keeps this many DCT coefficients
const REP_FLOW_STEPS = 5; // flow integration steps

export function RbThreeReps() {
  const { ref } = useStageVisibility();
  const [tab, setTab] = useState<RepTab>("binning");
  const [freq, setFreq] = useState(10); // control frequency (Hz) = samples per 1 s chunk

  // real signal, real quantization, real DCT — all deterministic
  const { xs, recon, fid, tokens, passes } = useMemo(() => {
    const T = Math.max(5, Math.round(freq));
    const raw = sampleTraj(T);
    const reps: Record<RepTab, number[]> = {
      binning: raw.map((v) => quantize(v, 256)),
      fast: idct2(dct2(raw), Math.min(REP_KEEP, T)),
      flow: raw,
    };
    const rec = reps[tab];
    const e = rmse(rec, raw);
    return {
      xs: raw,
      recon: rec,
      fid: 1 - e / 2, // range of the action space is 2
      tokens: tab === "binning" ? T : tab === "fast" ? Math.min(REP_KEEP, T) : 0,
      passes: tab === "binning" ? T : tab === "fast" ? Math.min(REP_KEEP, T) : REP_FLOW_STEPS,
    };
  }, [tab, freq]);

  const T = xs.length;
  const overflow = tab === "binning" && T > 40;
  const px = (i: number) => 60 + (T === 1 ? 0 : (i / (T - 1)) * 600);
  const py = (v: number) => 290 - v * 78;
  const pathOf = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(v)}`).join(" ");

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.7 · Three ways to represent an action"
      ariaLabel={`The same action chunk as ${tab}; ${tokens} tokens per dimension, fidelity ${Math.round(fid * 1000) / 10} percent`}
      controls={
        <>
          <Tabs
            options={[
              { id: "binning", label: "binning" },
              { id: "fast", label: "FAST" },
              { id: "flow", label: "flow" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <Slider label="control freq" min={5} max={50} step={1} value={freq} onChange={setFreq} fmt={(v) => `${v} Hz`} />
        </>
      }
    >
      <Readout
        rows={[
          {
            label: "tokens / dim",
            value: tab === "flow" ? "0 (generated)" : `${tokens}${tab === "binning" ? ` (×7 DoF = ${tokens * 7})` : ""}`,
            color: overflow ? R.error : R.plan,
          },
          { label: "fidelity", value: `${(fid * 100).toFixed(1)}%`, color: fid > 0.97 ? R.goal : R.error },
          {
            label: "decode passes",
            value: tab === "flow" ? `${REP_FLOW_STEPS} (integrate)` : `${passes} (autoregressive)`,
            color: passes > 20 ? R.error : R.ink,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "true chunk", dash: true },
          { color: R.goal, label: "reconstruction" },
          { color: R.plan, label: "tokens" },
        ]}
      />

      {/* token strip lane */}
      <text x={60} y={122} fontFamily={MONO} fontSize={12} fill={R.world}>
        token representation (one action dimension)
      </text>
      {tab === "flow" ? (
        <g>
          <rect x={60} y={132} width={170} height={30} rx={7} fill={R.fillGreen} stroke={R.goal} strokeWidth={2} />
          <text x={145} y={152} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
            integrate v_θ ×{REP_FLOW_STEPS}
          </text>
        </g>
      ) : (
        <>
          {Array.from({ length: Math.min(tokens, 40) }).map((_, i) => (
            <rect key={i} x={60 + i * 15} y={132} width={12} height={30} rx={3} fill={R.fillAmber} stroke={R.plan} strokeWidth={1.5} />
          ))}
          {tokens > 40 && (
            <text x={665} y={152} textAnchor="end" fontFamily={MONO} fontSize={12} fill={R.error}>
              +{tokens - 40} more…
            </text>
          )}
          {tab === "fast" && (
            <text x={60 + tokens * 15 + 10} y={152} fontFamily={MONO} fontSize={12} fill={R.world}>
              DCT top-{tokens}, then BPE
            </text>
          )}
        </>
      )}

      {/* reconstruction lane: true (dashed blue) vs computed reconstruction */}
      <text x={60} y={196} fontFamily={MONO} fontSize={12} fill={R.world}>
        reconstruction of the chunk
      </text>
      <line x1={60} y1={290} x2={660} y2={290} stroke={R.line} strokeWidth={1} strokeDasharray="3 5" />
      <path d={pathOf(xs)} fill="none" stroke={R.signal} strokeWidth={2} opacity={0.55} strokeDasharray="4 4" />
      <path d={pathOf(recon)} fill="none" stroke={fid > 0.97 ? R.goal : R.error} strokeWidth={2.5} />
      {xs.map((v, i) => (
        <circle key={i} cx={px(i)} cy={py(recon[i])} r={T > 30 ? 2 : 3} fill={fid > 0.97 ? R.goal : R.error} />
      ))}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        {tab === "binning"
          ? "raise the frequency → one token per timestep per DoF: the strip explodes"
          : tab === "fast"
            ? `FAST compresses first: ${tokens} coefficients carry the chunk at any frequency`
            : "flow generates the chunk directly: no tokens, but it pays integration steps"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.8 · FAST tokenization: compress, drop, reconstruct  (stepper, real DCT)
// Four stages on one real seeded 48-step trajectory: raw samples → its actual
// orthonormal DCT-II spectrum → drop all but the first k coefficients →
// reconstruct by inverse DCT and measure the real RMSE.
// ===========================================================================

const FAST_STAGES = ["raw trajectory", "DCT spectrum", "drop high-freq", "reconstruct"];
const F8_T = 48;
const F8_X = sampleTraj(F8_T);
const F8_C = dct2(F8_X);
const F8_ENERGY = F8_C.reduce((s, c) => s + c * c, 0);

export function RbFastTokenize() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [stage, setStage] = useState(0);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [keep, setKeep] = useState(8);
  const [, setT] = useState(0); // stage-advance timer (value unused for render)

  useRafLoop(
    (dt) => {
      setT((tt) => {
        const nt = tt + dt;
        if (nt > 1.6) {
          setStage((s) => (s + 1) % 4);
          return 0;
        }
        return nt;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const sd = reduced ? 3 : stage;

  // the real compression: inverse DCT from the kept coefficients
  const { recon, err, energyKept } = useMemo(() => {
    const rec = idct2(F8_C, keep);
    const kept = F8_C.slice(0, keep).reduce((s, c) => s + c * c, 0);
    return { recon: rec, err: rmse(rec, F8_X), energyKept: kept / F8_ENERGY };
  }, [keep]);

  const px = (i: number) => 60 + (i / (F8_T - 1)) * 600;
  const py = (v: number) => 275 - v * 88;
  const pathOf = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(v)}`).join(" ");
  const step = (d: number) => setStage((s) => clamp(s + d, 0, 3));

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.8 · FAST tokenization: compress, drop, reconstruct"
      ariaLabel={`FAST stage ${sd + 1} of 4: ${FAST_STAGES[sd]}; keeping ${keep} of ${F8_T} DCT coefficients, reconstruction RMSE ${err.toFixed(3)}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => step(-1)}>◂ back</Btn>
          <Btn onClick={() => step(1)}>step ▸</Btn>
          <Slider label="keep coeffs" min={2} max={16} step={1} value={keep} onChange={setKeep} fmt={(v) => `${v}`} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "stage", value: `${sd + 1}/4 ${FAST_STAGES[sd]}`, color: R.plan },
          { label: "tokens", value: `${F8_T} raw → ${keep}`, color: R.goal },
          { label: "energy kept", value: `${(energyKept * 100).toFixed(1)}%`, color: R.ink },
          { label: "RMSE", value: err.toFixed(3), color: err > 0.06 ? R.error : R.goal },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "raw trajectory" },
          { color: R.plan, label: "DCT coefficient" },
          { color: R.goal, label: "reconstruction" },
          { color: R.error, label: "dropped" },
        ]}
      />

      {/* stage 1: raw trajectory, one dot per timestep = one naive token */}
      {sd === 0 && (
        <g>
          <path d={pathOf(F8_X)} fill="none" stroke={R.signal} strokeWidth={2.5} />
          {F8_X.map((v, i) => (
            <circle key={i} cx={px(i)} cy={py(v)} r={2.5} fill={R.signal} />
          ))}
          <text x={360} y={385} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={R.world}>
            {F8_T} timesteps → {F8_T} naive tokens per dimension; neighbors nearly identical
          </text>
        </g>
      )}

      {/* stages 2 + 3: the actual DCT spectrum */}
      {(sd === 1 || sd === 2) && (
        <g>
          {F8_C.map((c, i) => {
            const bx = 62 + i * 12.4;
            const hgt = Math.min(Math.abs(c) * 60, 200);
            const dropped = sd === 2 && i >= keep;
            return (
              <g key={i}>
                <rect
                  x={bx}
                  y={352 - hgt}
                  width={9.5}
                  height={Math.max(hgt, 1)}
                  rx={2}
                  fill={dropped ? "#e2e2df" : R.fillAmber}
                  stroke={dropped ? R.world : R.plan}
                  strokeWidth={1}
                />
                {dropped && hgt > 3 && <line x1={bx} y1={352 - hgt} x2={bx + 9.5} y2={352} stroke={R.error} strokeWidth={1.2} />}
              </g>
            );
          })}
          {sd === 2 && <line x1={62 + keep * 12.4 - 2} y1={150} x2={62 + keep * 12.4 - 2} y2={352} stroke={R.error} strokeWidth={1.5} strokeDasharray="5 4" />}
          <line x1={58} y1={352} x2={662} y2={352} stroke={R.line} strokeWidth={2} />
          <text x={62} y={374} fontFamily={MONO} fontSize={12} fill={R.world}>
            low freq (the motion&apos;s shape)
          </text>
          <text x={660} y={374} textAnchor="end" fontFamily={MONO} fontSize={12} fill={sd === 2 ? R.error : R.world}>
            high freq {sd === 2 ? "(dropped)" : "(jitter)"}
          </text>
        </g>
      )}

      {/* stage 4: reconstruction overlay, computed by inverse DCT */}
      {sd === 3 && (
        <g>
          <path d={pathOf(F8_X)} fill="none" stroke={R.signal} strokeWidth={2} opacity={0.5} strokeDasharray="4 4" />
          <path d={pathOf(recon)} fill="none" stroke={err > 0.06 ? R.error : R.goal} strokeWidth={2.5} />
          <text x={360} y={385} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={err > 0.06 ? R.error : R.goal}>
            {err > 0.06
              ? `over-dropped: RMSE ${err.toFixed(3)} — the motion visibly rounds off`
              : `inverse DCT from ${keep} coefficients: RMSE ${err.toFixed(3)} ≈ imperceptible`}
          </text>
        </g>
      )}

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        {reduced
          ? "Reduced motion: the final reconstruction is shown; the slider still trades coefficients for error."
          : `${F8_T} tokens in, ${keep} out — same trick as JPEG, run on a real trajectory`}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.9 · Flow matching an action chunk  (velocity field + real integration)
// A noise sample is transported to a whole action chunk by Euler-integrating a
// velocity field dx/dτ = v_θ(x, τ) in 2-D action space. Flow's field is
// near-straight, so a few steps land; diffusion's curved field needs many.
// ===========================================================================

const FM_S: [number, number] = [140, 320]; // noise start (in stage px)
const FM_T: [number, number] = [430, 150]; // target (the demonstrated chunk)

function fmIntegrate(tab: "flow" | "diffusion", steps: number): [number, number][] {
  const pts: [number, number][] = [[FM_S[0], FM_S[1]]];
  let x = FM_S[0];
  let y = FM_S[1];
  const h = 1 / steps;
  for (let k = 0; k < steps; k++) {
    const tau = k * h;
    let vx: number;
    let vy: number;
    if (tab === "flow") {
      vx = FM_T[0] - FM_S[0];
      vy = FM_T[1] - FM_S[1];
    } else {
      const sw = Math.sin(tau * 6.5) * 0.9;
      vx = (FM_T[0] - x) * 1.4 - (FM_T[1] - y) * sw;
      vy = (FM_T[1] - y) * 1.4 + (FM_T[0] - x) * sw;
    }
    x += vx * h;
    y += vy * h;
    pts.push([x, y]);
  }
  return pts;
}

export function RbFlowChunk() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<"flow" | "diffusion">("flow");
  const [steps, setSteps] = useState(5);
  const [p, setP] = useState(0);
  const [playing, toggle] = useReducer((pl) => !pl, true);

  useRafLoop(
    (dt) => setP((v) => (v >= 1 ? 0 : Math.min(1, v + dt * 0.3))),
    { playing: playing && inView && !reduced },
  );

  const prog = reduced ? 1 : p;
  const path = useMemo(() => fmIntegrate(tab, steps), [tab, steps]);
  const drawn = Math.max(1, Math.round(prog * steps));
  const cur = path[Math.min(drawn, steps)];
  const landing = path[steps];
  const missPx = Math.hypot(landing[0] - FM_T[0], landing[1] - FM_T[1]);
  const span = Math.hypot(FM_T[0] - FM_S[0], FM_T[1] - FM_S[1]);
  const lands = missPx < 26;

  // velocity-field arrows on a grid (direction of v at tau = prog)
  const field = useMemo(() => {
    const out: { x: number; y: number; dx: number; dy: number }[] = [];
    for (let gx = 110; gx <= 450; gx += 60) {
      for (let gy = 110; gy <= 360; gy += 50) {
        let vx: number;
        let vy: number;
        if (tab === "flow") {
          vx = FM_T[0] - FM_S[0];
          vy = FM_T[1] - FM_S[1];
        } else {
          const sw = Math.sin(prog * 6.5) * 0.9;
          vx = (FM_T[0] - gx) * 1.4 - (FM_T[1] - gy) * sw;
          vy = (FM_T[1] - gy) * 1.4 + (FM_T[0] - gx) * sw;
        }
        const m = Math.hypot(vx, vy) || 1;
        out.push({ x: gx, y: gy, dx: (vx / m) * 15, dy: (vy / m) * 15 });
      }
    }
    return out;
  }, [tab, prog]);

  // right inset: the action chunk (H waypoints) resolving noise -> smooth motion
  const H = 8;
  const chunk = useMemo(() => {
    const rng = mulberry32(7);
    const noiseY = Array.from({ length: H }, () => (rng() - 0.5) * 70);
    return Array.from({ length: H }, (_, i) => {
      const smoothY = Math.sin((i / (H - 1)) * Math.PI) * 46;
      const y = lerp(noiseY[i], -smoothY, smooth(prog));
      return { x: 512 + (i / (H - 1)) * 168, y: 265 + y };
    });
  }, [prog]);

  return (
    <Stage
      innerRef={ref}
      title={"Fig 9.9 · Flow matching an action chunk"}
      ariaLabel={"Transporting a noise sample to an action chunk by Euler-integrating a velocity field via " + tab + ", step " + drawn + " of " + steps}
      controls={
        <>
          <Tabs
            options={[
              { id: "flow", label: "flow" },
              { id: "diffusion", label: "diffusion" },
            ]}
            value={tab}
            onChange={(v) => { setTab(v); setP(0); }}
          />
          <Slider label="steps" min={2} max={40} value={steps} onChange={(v) => { setSteps(v); setP(0); }} />
          <Btn onClick={toggle} active={playing}>{playing ? "⏸ pause" : "▶ play"}</Btn>
          <Btn onClick={() => setP(0)}>↺ reset</Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "τ", value: prog.toFixed(2), color: R.ink },
          { label: "Euler step", value: `${drawn} / ${steps}`, color: tab === "flow" ? R.signal : R.plan },
          { label: "landing miss", value: `${((missPx / span) * 100).toFixed(1)}%`, color: lands ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "flow path" },
          { color: R.plan, label: "diffusion path" },
          { color: R.goal, label: "target chunk" },
          { color: R.line, label: "velocity field" },
        ]}
      />

      {/* velocity field over 2-D action space */}
      {field.map((f, i) => (
        <g key={i} opacity={0.5}>
          {svgArrow(f.x, f.y, f.x + f.dx, f.y + f.dy, R.line, 1.4, 5)}
        </g>
      ))}
      <text x={255} y={400} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        2-D action space · dx/dτ = v_θ(x, τ)
      </text>

      {/* integrated path so far */}
      <polyline
        points={path.slice(0, drawn + 1).map((q) => q[0] + "," + q[1]).join(" ")}
        fill="none"
        stroke={tab === "flow" ? R.signal : R.plan}
        strokeWidth={3}
      />
      {path.slice(0, drawn + 1).map((q, i) => (
        <circle key={i} cx={q[0]} cy={q[1]} r={3.5} fill={tab === "flow" ? R.signal : R.plan} />
      ))}

      {/* noise start, current sample, target */}
      <circle cx={FM_S[0]} cy={FM_S[1]} r={7} fill="none" stroke={R.world} strokeWidth={2} />
      <text x={FM_S[0]} y={FM_S[1] + 26} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>noise x₀</text>
      <circle cx={cur[0]} cy={cur[1]} r={8} fill={tab === "flow" ? R.signal : R.plan} />
      <circle cx={FM_T[0]} cy={FM_T[1]} r={11} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
      <text x={FM_T[0] + 18} y={FM_T[1] + 4} fontFamily={MONO} fontSize={12} fill={R.goal}>target chunk</text>

      {/* divider + action-chunk inset */}
      <line x1={488} y1={120} x2={488} y2={370} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={596} y={148} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>the sample IS an action chunk</text>
      <line x1={512} y1={265} x2={680} y2={265} stroke={R.line} strokeWidth={1} strokeDasharray="3 5" />
      <polyline points={chunk.map((c) => c.x + "," + c.y).join(" ")} fill="none" stroke={R.goal} strokeWidth={2.5} />
      {chunk.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill={R.goal} />
      ))}
      <text x={596} y={355} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {prog < 0.5 ? "noise" : "→ smooth H-step motion"}
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={lands ? R.goal : R.error}>
        {tab === "flow"
          ? "flow: near-straight field — a handful of Euler steps lands exactly"
          : lands
            ? "diffusion: enough steps to track the curve, lands"
            : "diffusion: too few steps for the curved field — Euler error misses"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.10 · Hierarchical action: think, then move  (stepper)
// Two lanes: a text-plan lane emits a subtask, then the flow-execution lane
// runs it. Step through subtasks; "hide the plan" drops the OOD-success meter.
// ===========================================================================

const H_SUBTASKS = ["pick up the pillow", "put the book on the shelf", "toss the sock in the bin"];

export function RbHierarchical() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [idx, setIdx] = useState(0);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [showPlan, setShowPlan] = useState(true);
  const [t, setT] = useState(0);

  useRafLoop(
    (dt) => {
      setT((tt) => {
        const nt = tt + dt;
        if (nt > 1.8) {
          setIdx((i) => (i + 1) % H_SUBTASKS.length);
          return 0;
        }
        return nt;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const armP = reduced ? 1 : smooth(clamp(t / 1.8, 0, 1));
  const ood = showPlan ? 94 : 31;
  const step = (d: number) => setIdx((i) => (i + d + H_SUBTASKS.length) % H_SUBTASKS.length);

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.10 · Hierarchical action: think, then move"
      ariaLabel={`Subtask ${idx + 1}: ${H_SUBTASKS[idx]}; out-of-distribution success ${ood} percent`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => step(-1)}>◂ back</Btn>
          <Btn onClick={() => step(1)}>next ▸</Btn>
          <Btn onClick={() => setShowPlan((v) => !v)} active={showPlan}>
            {showPlan ? "✓ show the plan" : "hide the plan"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "goal", value: '"clean the bedroom"', color: R.ink },
          { label: "subtask", value: `${idx + 1} / ${H_SUBTASKS.length}`, color: R.plan },
          { label: "OOD success", value: `${ood}%`, color: ood > 50 ? R.goal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "language plan" },
          { color: R.signal, label: "flow execution" },
          { color: R.goal, label: "subtask done" },
        ]}
      />

      {/* plan lane (top) */}
      <text x={40} y={148} fontFamily={MONO} fontSize={12} fill={R.world}>
        plan (language)
      </text>
      {showPlan ? (
        <g>
          <rect x={175} y={122} width={340} height={36} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.5} />
          <text x={345} y={145} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>
            subtask: &quot;{H_SUBTASKS[idx]}&quot;
          </text>
        </g>
      ) : (
        <g>
          <rect x={175} y={122} width={340} height={36} rx={8} fill="none" stroke={R.error} strokeWidth={2} strokeDasharray="5 5" />
          <text x={345} y={145} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error}>
            no plan, direct scene→action
          </text>
        </g>
      )}
      {showPlan && svgArrow(345, 162, 345, 206, R.line, 2.5, 8)}

      {/* execution lane (bottom) */}
      <text x={40} y={246} fontFamily={MONO} fontSize={12} fill={R.world}>
        execute (flow)
      </text>
      <line x1={150} y1={360} x2={620} y2={360} stroke={R.line} strokeWidth={2} />
      {/* the object being handled */}
      <rect x={520} y={330} width={40} height={30} rx={5} fill={armP >= 1 ? R.fillGreen : "#eeeeec"} stroke={armP >= 1 ? R.goal : R.world} strokeWidth={2.5} />
      {/* the flow-execution arm */}
      <line x1={200} y1={360} x2={lerp(280, 520, armP)} y2={lerp(300, 345, armP)} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
      <circle cx={200} cy={360} r={8} fill={R.ink} />
      <text x={540} y={392} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={armP >= 1 ? R.goal : R.world}>
        {armP >= 1 ? "subtask done ✓" : "executing…"}
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={showPlan ? R.goal : R.error}>
        {showPlan
          ? "think in language, act in flow: 94% out-of-distribution with diverse co-training"
          : "31% without the plan and multi-environment data — diversity is the whole trick"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.11 · An embodied chain of thought  (stepper)
// Seven-stage ladder TASK→PLAN→SUBTASK→MOVE→GRIPPER pixel→OBJECT boxes→ACTION.
// A target toggle re-grounds the boxes and redirects the final action.
// ===========================================================================

const ECOT_STAGES = ["TASK", "PLAN", "SUBTASK", "MOVE", "GRIPPER", "OBJECT", "ACTION"];
const ECOT_TEXT = [
  "restate the goal",
  "rough step sequence",
  "next thing to do now",
  "motion primitive",
  "gripper pixel position",
  "object bounding boxes",
  "the motor command",
];

export function RbEmbodiedCoT() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [stage, setStage] = useState(0);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [targetBlue, setTargetBlue] = useState(false);
  const [, setT] = useState(0); // stage-advance timer (value unused for render)

  useRafLoop(
    (dt) => {
      setT((tt) => {
        const nt = tt + dt;
        if (nt > 0.9) {
          setStage((s) => (s + 1) % 7);
          return 0;
        }
        return nt;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const sd = reduced ? 6 : stage;
  const red = { x: 480, y: 290 };
  const blue = { x: 620, y: 290 };
  const target = targetBlue ? blue : red;
  const gripper = { x: 552, y: 180 };
  const step = (d: number) => setStage((s) => clamp(s + d, 0, 6));

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.11 · An embodied chain of thought"
      ariaLabel={`ECoT ladder stage ${sd + 1}: ${ECOT_STAGES[sd]}, target ${targetBlue ? "blue" : "red"} block`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => step(-1)}>◂ back</Btn>
          <Btn onClick={() => step(1)}>step ▸</Btn>
          <Btn onClick={() => setTargetBlue((v) => !v)} active={targetBlue} title="edit the thought">
            {targetBlue ? "target: blue" : "target: red"}
          </Btn>
        </>
      }
    >
      <Readout
        rows={[
          { label: "stage", value: `${sd + 1}/7 ${ECOT_STAGES[sd]}`, color: sd >= 4 ? R.signal : R.plan },
          { label: "target", value: targetBlue ? "blue block" : "red block", color: targetBlue ? R.signal : R.error },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "language stages" },
          { color: R.signal, label: "pixel-grounded" },
          { color: R.goal, label: "the action" },
        ]}
      />

      {/* ladder on the left (fixed lane) */}
      {ECOT_STAGES.map((s, i) => {
        const on = i <= sd;
        const cur = i === sd;
        return (
          <g key={s} opacity={on ? 1 : 0.25}>
            <rect x={40} y={106 + i * 40} width={24} height={24} rx={5} fill={cur ? R.fillAmber : on ? "#f2f2ef" : "var(--background)"} stroke={cur ? R.plan : R.world} strokeWidth={cur ? 2.5 : 1.5} />
            <text x={78} y={123 + i * 40} fontFamily={MONO} fontSize={13} fontWeight={cur ? 600 : 400} fill={i >= 4 ? R.signal : R.plan}>
              {s}
            </text>
            <text x={185} y={123 + i * 40} fontFamily={MONO} fontSize={12} fill={R.world}>
              {ECOT_TEXT[i]}
            </text>
          </g>
        );
      })}

      {/* the scene, right side */}
      <line x1={408} y1={96} x2={408} y2={400} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <line x1={425} y1={330} x2={690} y2={330} stroke={R.line} strokeWidth={2} />
      {/* two blocks */}
      <rect x={red.x - 20} y={red.y - 20} width={40} height={40} rx={5} fill={R.fillRed} stroke={R.error} strokeWidth={2.5} />
      <rect x={blue.x - 20} y={blue.y - 20} width={40} height={40} rx={5} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} />
      <text x={red.x} y={red.y + 38} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        red
      </text>
      <text x={blue.x} y={blue.y + 38} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        blue
      </text>

      {/* GRIPPER pixel marker at stage >= 4 */}
      {sd >= 4 && (
        <>
          <circle cx={gripper.x} cy={gripper.y} r={9} fill="none" stroke={R.signal} strokeWidth={2.5} />
          <line x1={gripper.x - 6} y1={gripper.y} x2={gripper.x + 6} y2={gripper.y} stroke={R.signal} strokeWidth={2} />
          <line x1={gripper.x} y1={gripper.y - 6} x2={gripper.x} y2={gripper.y + 6} stroke={R.signal} strokeWidth={2} />
          <text x={gripper.x} y={gripper.y - 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
            gripper px
          </text>
        </>
      )}

      {/* OBJECT bounding box at stage >= 5 */}
      {sd >= 5 && (
        <rect x={target.x - 26} y={target.y - 26} width={52} height={52} rx={4} fill="none" stroke={targetBlue ? R.signal : R.error} strokeWidth={2.5} strokeDasharray="5 4" />
      )}

      {/* ACTION arrow at stage 6 */}
      {sd >= 6 && svgArrow(gripper.x, gripper.y, target.x, target.y - 30, R.goal, 3, 10)}

      <text x={556} y={378} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={sd >= 5 ? (targetBlue ? R.signal : R.error) : R.world}>
        {sd >= 5 ? `grounded on the ${targetBlue ? "blue" : "red"} block` : "reasoning escalates to pixels…"}
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        the thought is legible — flip the target and the grounded action follows the edit
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.12 · MolmoAct reasons in 3D, then plans a path  (TRUE 3D, orbitable)
// A real 3D tabletop over Scene3D: depth-aware perception tokens (dots sized
// by their true distance from the robot's camera), a waypoint plan arcing over
// an obstacle (Catmull-Rom through draggable waypoints), and an end-effector
// executing the path in chunks that light up green. Drag a waypoint to
// re-route; drag empty space to orbit.
// ===========================================================================

const MA_A: V3 = [-0.95, -0.35, 0.12]; // start end-effector pose
const MA_B: V3 = [0.9, 0.4, 0.06]; // the target object
const MA_W0: V3[] = [
  [-0.35, -0.05, 0.55],
  [0.35, 0.2, 0.55],
];
const MA_CAM_POS: V3 = [1.6, -1.6, 1.2]; // the robot's (fixed) depth camera
const MA_CHUNKS = 4;
const MA_SEGS = 48;

// Uniform Catmull-Rom spline through [A, ...waypoints, B].
function maSpline(w: V3[], t: number): V3 {
  const P = [MA_A, ...w, MA_B];
  const n = P.length - 1;
  const s = clamp(t, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(s));
  const u = s - i;
  const p0 = P[Math.max(0, i - 1)];
  const p1 = P[i];
  const p2 = P[i + 1];
  const p3 = P[Math.min(n, i + 2)];
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])];
}

function maPathLength(w: V3[]) {
  let acc = 0;
  for (let i = 0; i < MA_SEGS; i++) {
    acc += v3.len(v3.sub(maSpline(w, (i + 1) / MA_SEGS), maSpline(w, i / MA_SEGS)));
  }
  return acc;
}

// The scene points the depth head tokenizes: a ground grid + the obstacle top.
const MA_TOKEN_PTS: V3[] = (() => {
  const pts: V3[] = [];
  for (let gx = -1; gx <= 1; gx += 0.5) {
    for (let gy = -1; gy <= 1; gy += 0.5) {
      pts.push([gx, gy, 0]);
    }
  }
  pts.push([-0.1, -0.1, 0.44], [0.2, -0.1, 0.44], [-0.1, 0.2, 0.44], [0.2, 0.2, 0.44]);
  return pts;
})();
const MA_DEPTHS = MA_TOKEN_PTS.map((p) => v3.len(v3.sub(p, MA_CAM_POS)));
const MA_DMIN = Math.min(...MA_DEPTHS);
const MA_DMAX = Math.max(...MA_DEPTHS);

const MA_STAGENAME = ["encode depth-aware perception tokens", "plan a waypoint path over the obstacle", "execute the chunked action along it"];

export function RbMolmoAct3D() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const orbit = useOrbit(-32, 24);
  const [stage, setStage] = useState(0);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [wps, setWps] = useState<V3[]>(MA_W0);
  const [t, setT] = useState(0);
  const dragIdx = useRef<number | null>(null);
  const lastPt = useRef<[number, number] | null>(null);

  useRafLoop(
    (dt) => {
      if (dragIdx.current !== null) return; // hold the tour while dragging
      setT((tt) => {
        const nt = tt + dt;
        const dur = stage === 2 ? 4.2 : 1.7;
        if (nt > dur) {
          setStage((s) => (s + 1) % 3);
          return 0;
        }
        return nt;
      });
    },
    { playing: playing && inView && !reduced },
  );

  const sd = reduced ? 2 : stage;
  const execP = reduced ? 1 : sd === 2 ? smooth(clamp(t / 4.2, 0, 1)) : 0;
  const chunkIdx = Math.min(MA_CHUNKS - 1, Math.floor(execP * MA_CHUNKS));
  const pathLen = useMemo(() => maPathLength(wps), [wps]);

  const cam: Camera3D = { yawDeg: orbit.yawDeg, pitchDeg: orbit.pitchDeg, dist: 4.6, zoom: 148 };

  const prims: Prim3D[] = [
    ...grid3(1.1, 0.55),
    // the obstacle the plan must clear
    ...box3([0.05, 0.05, 0.22], quat.id, 0.42, 0.42, 0.44, R.world),
    label3([0.05, 0.05, 0.5], "obstacle", R.world, { anchor: "middle", dy: -6, size: 12 }),
    // start pose and target object
    dot3(MA_A, R.signal, { r: 6 }),
    label3(MA_A, "start", R.signal, { dx: -10, dy: 18, anchor: "end", size: 12 }),
    seg3(MA_B, v3.add(MA_B, [0, 0, 0.18]), R.goal, { width: 5 }),
    dot3(v3.add(MA_B, [0, 0, 0.2]), R.goal, { r: 6.5 }),
    label3(v3.add(MA_B, [0, 0, 0.32]), "target", R.goal, { anchor: "middle", dy: -2, size: 12 }),
  ];

  // stage 0+: depth tokens (real distances from the fixed robot camera)
  if (sd === 0 || reduced) {
    MA_TOKEN_PTS.forEach((p, i) => {
      const d = (MA_DEPTHS[i] - MA_DMIN) / (MA_DMAX - MA_DMIN);
      prims.push(dot3(v3.add(p, [0, 0, 0.03]), R.signal, { r: 2.5 + 4.5 * (1 - d) }));
    });
    prims.push(
      seg3(MA_CAM_POS, [0, 0, 0.2], R.world, { width: 1, dash: "2 5", opacity: 0.7 }),
      dot3(MA_CAM_POS, R.world, { r: 4 }),
      label3(MA_CAM_POS, "depth cam", R.world, { dx: 8, dy: -6, size: 11.5 }),
    );
  }

  // stage 1+: the waypoint plan and (stage 2) the chunked execution
  if (sd >= 1) {
    for (let i = 0; i < MA_SEGS; i++) {
      const a = maSpline(wps, i / MA_SEGS);
      const b = maSpline(wps, (i + 1) / MA_SEGS);
      const done = (i + 1) / MA_SEGS <= execP;
      prims.push(
        done
          ? seg3(a, b, R.goal, { width: 3.5 })
          : seg3(a, b, R.plan, { width: 2, dash: "5 4" }),
      );
    }
    // chunk boundary markers
    for (let c = 1; c < MA_CHUNKS; c++) {
      prims.push(dot3(maSpline(wps, c / MA_CHUNKS), R.ink, { r: 2.5 }));
    }
    wps.forEach((p, i) => {
      prims.push(dot3(p, R.plan, { r: 7 }));
      prims.push(label3(p, `w${i + 1}`, R.plan, { dx: 10, dy: -8, size: 12 }));
      // drop line so the waypoint's height reads in 3D
      prims.push(seg3([p[0], p[1], 0], p, R.plan, { width: 1, dash: "2 4", opacity: 0.6 }));
    });
  }
  if (sd === 2 || reduced) {
    const ee = maSpline(wps, execP);
    prims.push(dot3(ee, R.signal, { r: 8 }));
    prims.push(label3(ee, "EE", R.signal, { dx: 10, dy: -8, size: 12 }));
  }

  const svgProps = {
    ...orbit.svgProps,
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (dragIdx.current !== null) {
        const [sx, sy] = svgPoint(e);
        if (lastPt.current) {
          const i = dragIdx.current;
          const np = groundDrag(cam, wps[i], sx - lastPt.current[0], sy - lastPt.current[1]);
          setWps((w) => w.map((p, j) => (j === i ? [clamp(np[0], -1.05, 1.05), clamp(np[1], -1.05, 1.05), p[2]] : p)));
        }
        lastPt.current = [sx, sy];
        return;
      }
      orbit.svgProps.onPointerMove?.(e);
    },
    onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => {
      dragIdx.current = null;
      lastPt.current = null;
      orbit.svgProps.onPointerUp?.(e);
    },
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.12 · MolmoAct reasons in 3D, then plans a path"
      ariaLabel={`MolmoAct stage ${sd + 1} of 3: ${MA_STAGENAME[sd]}. A 3D scene with depth tokens, a waypoint plan over an obstacle, and a chunked end-effector path. Drag to orbit; drag a waypoint to re-route.`}
      svgProps={svgProps}
      controls={
        <>
          <Transport
            playing={playing}
            onPlay={toggle}
            onStep={() => { setStage((s) => (s + 1) % 3); setT(0); }}
            stepLabel="stage"
            onReset={() => {
              setStage(0);
              setT(0);
              setWps(MA_W0);
              orbit.reset();
            }}
          />
          <span className="font-mono text-[13px] text-[var(--muted)]">drag a waypoint · drag empty space to orbit</span>
        </>
      }
    >
      <Scene3D cam={cam} prims={prims} />
      {/* generous invisible hit-targets over the waypoints for dragging */}
      {sd >= 1 &&
        wps.map((p, i) => {
          const sp = project(cam, p);
          return (
            <circle
              key={i}
              cx={sp.x}
              cy={sp.y}
              r={20}
              fill="transparent"
              style={{ cursor: "grab" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                dragIdx.current = i;
                lastPt.current = null;
              }}
            />
          );
        })}
      <Readout
        rows={[
          { label: "stage", value: `${sd + 1} / 3`, color: R.plan },
          { label: "chunk", value: sd === 2 || reduced ? `${chunkIdx + 1} / ${MA_CHUNKS}` : "—", color: R.goal },
          { label: "path length", value: `${pathLen.toFixed(2)} m`, color: R.ink },
        ]}
      />
      <Legend
        items={[
          { color: R.signal, label: "depth tokens · EE" },
          { color: R.plan, label: "waypoint plan", dash: true },
          { color: R.goal, label: "executed chunk" },
          { color: R.world, label: "obstacle" },
        ]}
      />
      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill={sd === 2 && execP >= 1 ? R.goal : R.world}>
        {reduced
          ? "Reduced motion: the executed 3D path is shown; drag a waypoint to re-route it."
          : sd === 0
            ? "closer points → bigger tokens: the VQVAE encodes real depth, not a flat image"
            : sd === 1
              ? "the plan is a visible 3D trajectory — sketch a correction by dragging w1 or w2"
              : execP >= 1
                ? "action decoded along the (corrected) path ✓ — chunk by chunk"
                : MA_STAGENAME[2]}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.13 · Dual-system control: slow brain, fast reflex  (animated pipeline)
// Two lanes: System 2 (VLM) ticks at 10 Hz emitting a plan; System 1 (flow
// transformer) ticks at 120 Hz streaming motor commands. Rate sliders: slow
// System 1 → the humanoid wobbles; slow System 2 → stale plan.
// ===========================================================================

export function RbDualSystem() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [playing, toggle] = useReducer((p) => !p, true);
  const [s2Rate, setS2Rate] = useState(10);
  const [s1Rate, setS1Rate] = useState(120);
  // accumulators for the two clocks + a plan-freshness age
  const [st, setSt] = useState({ s2acc: 0, s1acc: 0, planAge: 0, s2Tick: 0, s1Tick: 0, phase: 0 });

  useRafLoop(
    (dt) => {
      setSt((s) => {
        let { s2acc, s1acc, planAge, s2Tick, s1Tick, phase } = s;
        s2acc += dt * s2Rate;
        s1acc += dt * s1Rate;
        planAge += dt;
        while (s2acc >= 1) {
          s2acc -= 1;
          s2Tick += 1;
          planAge = 0; // fresh plan
        }
        while (s1acc >= 1) {
          s1acc -= 1;
          s1Tick += 1;
        }
        phase += dt * (s1Rate / 120); // reflex idle sway speed
        return { s2acc, s1acc, planAge, s2Tick, s1Tick, phase };
      });
    },
    { playing: playing && inView && !reduced },
  );

  // balance quality: needs fast System 1; wobble grows as s1Rate drops
  const balanced = s1Rate >= 60;
  const stale = s2Rate < 3;
  const sway = reduced ? 0 : Math.sin(st.phase * 3) * (balanced ? 4 : 22);
  const cx = 555;
  const cy = 262;

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.13 · Dual-system control: slow brain, fast reflex"
      ariaLabel={`System 2 at ${s2Rate} Hz over System 1 at ${s1Rate} Hz; ${!balanced ? "falling" : stale ? "stale plan" : "balanced"}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Slider label="System 2" min={1} max={20} step={1} value={s2Rate} onChange={setS2Rate} fmt={(v) => `${v} Hz`} />
          <Slider label="System 1" min={10} max={120} step={5} value={s1Rate} onChange={setS1Rate} fmt={(v) => `${v} Hz`} />
        </>
      }
    >
      <Readout
        rows={[
          { label: "plan age", value: reduced ? "0.0 s" : `${st.planAge.toFixed(1)} s`, color: stale ? R.error : R.plan },
          { label: "tick ratio", value: `≈ ${Math.max(1, Math.round(s1Rate / s2Rate))} : 1`, color: R.ink },
          {
            label: "status",
            value: !balanced ? "falling" : stale ? "stale plan" : "balanced",
            color: balanced && !stale ? R.goal : R.error,
          },
        ]}
      />
      <Legend
        items={[
          { color: R.plan, label: "System 2: plan" },
          { color: R.signal, label: "System 1: reflex" },
          { color: R.error, label: "failure mode" },
        ]}
      />

      {/* System 2 lane (slow) */}
      <rect x={40} y={122} width={210} height={46} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.5} opacity={reduced || st.s2acc < 0.25 ? 1 : 0.6} />
      <text x={145} y={142} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.ink}>
        System 2 (VLM) · {s2Rate} Hz
      </text>
      <text x={145} y={160} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={stale ? R.error : R.world}>
        {stale ? "plan stale — replan too rare" : "semantic plan"}
      </text>
      {svgArrow(145, 168, 145, 216, R.line, 2.5, 8)}

      {/* System 1 lane (fast stream of commands) */}
      <text x={40} y={240} fontFamily={MONO} fontSize={12} fill={R.world}>
        System 1 (flow) · {s1Rate} Hz motor stream
      </text>
      {Array.from({ length: 10 }).map((_, i) => {
        const on = reduced ? i < 8 : (st.s1Tick + i) % 10 < (s1Rate / 120) * 10 + 1;
        return (
          <rect
            key={i}
            x={40 + i * 26}
            y={252}
            width={18}
            height={26}
            rx={3}
            fill={on ? R.fillBlue : "#f2f2ef"}
            stroke={on ? R.signal : R.line}
            strokeWidth={on ? 2 : 1}
          />
        );
      })}
      {svgArrow(300, 265, 460, 265, R.signal, 2.5, 9)}
      <text x={380} y={252} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        joint commands
      </text>

      {/* the humanoid on the right */}
      <line x1={470} y1={380} x2={660} y2={380} stroke={R.line} strokeWidth={2} />
      <g stroke={balanced ? R.signal : R.error} strokeWidth={8} strokeLinecap="round" fill="none" transform={`translate(${sway} 0)`}>
        <circle cx={cx} cy={cy - 40} r={16} fill={balanced ? R.fillBlue : R.fillRed} />
        <line x1={cx} y1={cy - 24} x2={cx} y2={cy + 50} />
        <line x1={cx} y1={cy} x2={cx - 30} y2={cy + 34} />
        <line x1={cx} y1={cy} x2={cx + 30} y2={cy + 34} />
        <line x1={cx} y1={cy + 50} x2={cx - 22} y2={380} />
        <line x1={cx} y1={cy + 50} x2={cx + 22} y2={380} />
      </g>
      <text x={cx} y={402} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={balanced ? R.goal : R.error}>
        {balanced ? "upright" : "wobbling — reflex too slow"}
      </text>

      <text x={360} y={424} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>
        {reduced
          ? "Reduced motion: a balanced humanoid is shown; the rate sliders still drive the outcome."
          : "reasoning is too slow to balance and a reflex is too dumb to plan — so split them"}
      </text>
    </Stage>
  );
}
