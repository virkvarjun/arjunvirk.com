"use client";

import { useReducer, useState } from "react";
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
} from "./shared";

// ===========================================================================
// Robotics Bible, Chapter 9 · Vision-Language-Action Models (13 figures).
// Every figure is a skin over ./shared: a fixed 720×440 stage, one Controls
// strip, calm delta-timed motion gated on inView && !reduced, seeded
// randomness, fixed readout lanes so nothing overlaps, and a static fully
// labeled final state under prefers-reduced-motion.
// ===========================================================================

const smooth = (t: number) => t * t * (3 - 2 * t);

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
  const [step, setStep] = useState(reduced ? 5 : 0);
  const [head, setHead] = useState(0);
  const [playing, toggle] = useReducer((p) => !p, false);
  const [, setClk] = useState(0);

  useRafLoop(
    (dt) =>
      setClk((c) => {
        const n = c + dt;
        if (n > 1.1) {
          setStep((s) => (s + 1) % FP_N);
          return 0;
        }
        return n;
      }),
    { playing: playing && inView && !reduced },
  );

  // token x positions
  const N = FP_TOKENS.length;
  const x0 = 70;
  const x1 = 650;
  const tx = (i: number) => x0 + (i / (N - 1)) * (x1 - x0);
  const rowY = 118;
  const bw = 62;
  const bh = 30;

  const w = FP_HEADS[head].w;
  const maxW = Math.max(...w);

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
      ariaLabel={"Stepping through a vision-language-action transformer forward pass, step " + (step + 1) + " of " + FP_N}
      controls={
        <>
          <Btn onClick={() => setStep((s) => (s + FP_N - 1) % FP_N)}>◀ back</Btn>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => setStep((s) => (s + 1) % FP_N)}>step ▶</Btn>
          <Btn onClick={() => { setStep(0); setHead(0); }}>↺ reset</Btn>
          {step === 3 && (
            <Tabs
              options={FP_HEADS.map((h, i) => ({ id: String(i), label: h.name }))}
              value={String(head)}
              onChange={(v) => setHead(Number(v))}
            />
          )}
        </>
      }
    >
      {/* step indicator, fixed top lane */}
      <text x={40} y={34} fontFamily={MONO} fontSize={13} fill={R.world}>
        {"step " + (step + 1) + " / " + FP_N}
      </text>
      <text x={40} y={56} fontFamily={MONO} fontSize={15} fill={R.ink} fontWeight={600}>
        {FP_STEPNAME[step]}
      </text>

      {/* Step 0: raw inputs */}
      {step === 0 && (
        <g>
          <text x={150} y={110} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>image</text>
          {Array.from({ length: 16 }).map((_, idx) => {
            const r = Math.floor(idx / 4);
            const c = idx % 4;
            return (
              <rect key={idx} x={70 + c * 40} y={130 + r * 40} width={38} height={38}
                fill={r === 1 && c === 1 ? R.fillBlue : "#efefec"} stroke={R.line} strokeWidth={1.5} />
            );
          })}
          <text x={130} y={175} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>cup</text>
          <text x={470} y={110} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>instruction</text>
          <rect x={320} y={150} width={300} height={44} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={2} />
          <text x={470} y={177} textAnchor="middle" fontFamily={MONO} fontSize={15} fill={R.ink}>&quot;put the cup in the sink&quot;</text>
          <text x={360} y={260} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.world}>a patch encoder and a tokenizer turn both into vectors</text>
        </g>
      )}

      {/* Steps 1+ : the token sequence lives in a fixed lane */}
      {step >= 1 && (
        <g>
          <text x={40} y={rowY - 12} fontFamily={MONO} fontSize={12} fill={R.world}>{N} tokens (image · text)</text>
          {FP_TOKENS.map((_, i) => tokBox(i, rowY, step === 1 || i === FP_Q))}
        </g>
      )}

      {/* Step 2: Q K V projection under each token */}
      {step === 2 && (
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
          <text x={40} y={rowY + 100} fontFamily={MONO} fontSize={13} fill={R.world}>
            q = x·W_Q (blue), k = x·W_K (green), v = x·W_V (amber)
          </text>
          <text x={40} y={rowY + 122} fontFamily={MONO} fontSize={13} fill={R.world}>
            three learned projections per token, one per head
          </text>
        </g>
      )}

      {/* Step 3: attention from the query token to all keys */}
      {step === 3 && (
        <g>
          {/* query marker */}
          <text x={tx(FP_Q)} y={rowY + 48} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>query</text>
          {/* weight bars above each token */}
          {FP_TOKENS.map((_, i) => {
            const bh2 = 70 * w[i];
            const strong = w[i] === maxW;
            return (
              <g key={i}>
                <rect x={tx(i) - 16} y={rowY - 24 - bh2} width={32} height={bh2}
                  rx={2} fill={strong ? R.signal : R.fillBlue} stroke={strong ? R.signal : R.line} strokeWidth={1.5} />
                <text x={tx(i)} y={rowY - 30 - bh2} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={R.world}>
                  {w[i].toFixed(2)}
                </text>
              </g>
            );
          })}
          {/* connect query to strongest key */}
          {svgArrow(tx(FP_Q), rowY + 34, tx(w.indexOf(maxW)), rowY + 12, R.signal, 2, 8)}
          <text x={40} y={rowY + 110} fontFamily={MONO} fontSize={13} fill={R.ink}>
            {FP_HEADS[head].name + ": " + FP_HEADS[head].role}
          </text>
          <text x={40} y={rowY + 132} fontFamily={MONO} fontSize={12} fill={R.world}>
            softmax( q·kⱼ / √d ) over all tokens, each head learns a different pattern
          </text>
        </g>
      )}

      {/* Step 4: weighted sum of values */}
      {step === 4 && (
        <g>
          {FP_TOKENS.map((_, i) => (
            <g key={i} opacity={0.35 + 0.65 * (w[i] / maxW)}>
              <rect x={tx(i) - 6} y={rowY + 48} width={12} height={26} rx={2} fill={R.plan} />
            </g>
          ))}
          {svgArrow(tx(FP_Q), rowY + 90, 360, rowY + 150, R.plan, 2.5, 9)}
          <rect x={300} y={rowY + 156} width={120} height={34} rx={6} fill={R.fillBlue} stroke={R.signal} strokeWidth={3} />
          <text x={360} y={rowY + 178} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>new &quot;cup&quot; token</text>
          <text x={40} y={rowY + 224} fontFamily={MONO} fontSize={13} fill={R.world}>
            the updated token = Σ (weight × value): it now carries where the cup is
          </text>
          <text x={40} y={rowY + 246} fontFamily={MONO} fontSize={12} fill={R.world}>
            stack this block ~18 times and the sequence is fully contextualized
          </text>
        </g>
      )}

      {/* Step 5: action expert */}
      {step === 5 && (
        <g>
          {svgArrow(360, rowY + 46, 360, rowY + 84, R.world, 2.5, 9)}
          <rect x={250} y={rowY + 88} width={220} height={40} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={3} />
          <text x={360} y={rowY + 113} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={R.ink}>action expert (flow / FAST)</text>
          {svgArrow(360, rowY + 128, 360, rowY + 166, R.world, 2.5, 9)}
          <rect x={280} y={rowY + 170} width={160} height={36} rx={6} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
          <text x={360} y={rowY + 193} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>action chunk → robot</text>
          <text x={40} y={rowY + 240} fontFamily={MONO} fontSize={13} fill={R.world}>
            the same backbone that reads the scene now writes the motion
          </text>
        </g>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 9.2 · RT-1's action tokens  (slider-driven diagram)
// One continuous action value snapped to the nearest of N bins; the red gap
// shows the quantization error. A bin-count slider makes the staircase coarse.
// ===========================================================================

const BINX0 = 60;
const BINX1 = 660;

export function RbActionTokens() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [value, setValue] = useState(0.37); // true action in [-1, 1]
  const [bins, setBins] = useState(256);
  const [disp, setDisp] = useState(0.37);

  useRafLoop(
    (dt) => setDisp((v) => approach(v, value, 0.3, dt)),
    { playing: inView && !reduced },
  );

  const v = reduced ? value : disp;
  const t = (v + 1) / 2; // 0..1
  // quantize
  const binW = 2 / bins;
  const binIdx = clamp(Math.floor((v + 1) / binW), 0, bins - 1);
  const quant = -1 + (binIdx + 0.5) * binW;
  const err = Math.abs(v - quant);

  const trueX = lerp(BINX0, BINX1, t);
  const quantX = lerp(BINX0, BINX1, (quant + 1) / 2);

  // draw a manageable number of bin ticks (cap at 64 for legibility)
  const drawn = Math.min(bins, 64);

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.2 · RT-1's action tokens"
      ariaLabel={`A continuous action of ${v.toFixed(2)} snapped to bin ${binIdx} of ${bins}`}
      controls={
        <>
          <Slider label="action" min={-1} max={1} step={0.01} value={value} onChange={setValue} fmt={(x) => x.toFixed(2)} />
          <Slider label="bins" min={4} max={256} step={1} value={bins} onChange={(x) => setBins([4, 16, 64, 256].reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a)))} fmt={(x) => `${x}`} />
        </>
      }
    >
      {/* readout lane, top */}
      <text x={60} y={42} fontFamily={MONO} fontSize={14} fill={R.signal}>
        true {v.toFixed(3)}
      </text>
      <text x={230} y={42} fontFamily={MONO} fontSize={14} fill={R.plan}>
        → bin #{binIdx} = {quant.toFixed(3)}
      </text>
      <text x={470} y={42} fontFamily={MONO} fontSize={14} fill={R.error}>
        error {err.toFixed(3)}
      </text>

      {/* bin strip */}
      <rect x={BINX0} y={150} width={BINX1 - BINX0} height={54} rx={4} fill="#f2f2ef" stroke={R.line} strokeWidth={1.5} />
      {Array.from({ length: drawn }).map((_, i) => {
        const bx = lerp(BINX0, BINX1, i / drawn);
        const bx2 = lerp(BINX0, BINX1, (i + 1) / drawn);
        // which drawn cell holds the quantized value
        const on = t >= i / drawn && t < (i + 1) / drawn;
        return (
          <g key={i}>
            {on && <rect x={bx} y={150} width={bx2 - bx} height={54} fill={R.fillAmber} />}
            <line x1={bx} y1={150} x2={bx} y2={204} stroke={R.line} strokeWidth={0.8} opacity={0.6} />
          </g>
        );
      })}
      <text x={BINX0} y={226} fontFamily={MONO} fontSize={12} fill={R.world}>
        −1
      </text>
      <text x={BINX1 - 8} y={226} fontFamily={MONO} fontSize={12} fill={R.world}>
        +1
      </text>
      <text x={(BINX0 + BINX1) / 2} y={226} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {bins} bins (staircase)
      </text>

      {/* true value marker (blue) */}
      <line x1={trueX} y1={110} x2={trueX} y2={150} stroke={R.signal} strokeWidth={3} />
      <circle cx={trueX} cy={110} r={7} fill={R.signal} />
      <text x={trueX} y={100} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
        true
      </text>

      {/* quantized value marker (amber) + red gap */}
      <line x1={quantX} y1={204} x2={quantX} y2={250} stroke={R.plan} strokeWidth={3} />
      <circle cx={quantX} cy={250} r={7} fill={R.plan} />
      <text x={quantX} y={272} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
        robot gets
      </text>

      {/* the red quantization gap between true and quantized, drawn on the strip */}
      {Math.abs(trueX - quantX) > 1 && (
        <>
          <line x1={trueX} y1={177} x2={quantX} y2={177} stroke={R.error} strokeWidth={5} strokeLinecap="round" />
          <text x={(trueX + quantX) / 2} y={330} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error} fontWeight={600}>
            thrown-away fidelity
          </text>
        </>
      )}

      <text x={60} y={400} fontFamily={MONO} fontSize={13} fill={R.world}>
        {reduced
          ? "Reduced motion: the slider still snaps the value into a bin and shows the error."
          : "fewer bins → coarser staircase → bigger red gap"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.3 · RT-2 speaks actions as text  (toggle-compare)
// Same backbone, two tabs: "Ask a question" streams a word answer; "Command
// the robot" streams an integer action-string and the arm reaches the dinosaur.
// A step button reveals tokens one at a time.
// ===========================================================================

const QA_TOKENS = ["A:", "dino", "saur"];
const ACT_TOKENS = ["1", "128", "91", "241", "5", "101", "127"];

export function RbSpeakActions() {
  const reduced = usePrefersReducedMotion();
  const { ref } = useStageVisibility();
  const [tab, setTab] = useState<"text" | "action">("action");
  const toks = tab === "text" ? QA_TOKENS : ACT_TOKENS;
  const [shown, setShown] = useState(toks.length);

  const nShown = reduced ? toks.length : shown;
  const done = nShown >= toks.length;

  const switchTab = (v: "text" | "action") => {
    setTab(v);
    setShown(v === "text" ? QA_TOKENS.length : ACT_TOKENS.length);
  };
  const step = () => setShown((s) => (s >= toks.length ? 0 : s + 1));

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.3 · RT-2 speaks actions as text"
      ariaLabel={`The same VLM backbone: on the ${tab} tab it emits ${tab === "text" ? "a word answer" : "an integer action-string"}`}
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
          <Btn onClick={step} title="reveal one token">
            ▸ step token
          </Btn>
        </>
      }
    >
      {/* shared backbone box */}
      <rect x={280} y={70} width={160} height={54} rx={10} fill="#eeeeec" stroke={R.world} strokeWidth={2.5} />
      <text x={360} y={94} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.ink}>
        same VLM
      </text>
      <text x={360} y={112} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        backbone
      </text>
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.signal}>
        image features →
      </text>
      {svgArrow(360, 124, 360, 160, R.line, 3, 9)}

      {/* streaming tokens */}
      <text x={40} y={190} fontFamily={MONO} fontSize={13} fill={R.world}>
        {tab === "text" ? "Q: what animal is extinct?" : 'instr: "pick up the extinct animal"'}
      </text>
      {toks.map((tok, i) => {
        const on = i < nShown;
        const bx = 60 + i * (tab === "text" ? 96 : 82);
        return (
          <g key={i} opacity={on ? 1 : 0.15}>
            <rect x={bx} y={210} width={tab === "text" ? 84 : 70} height={34} rx={7} fill={R.fillAmber} stroke={R.plan} strokeWidth={on ? 2.5 : 1} />
            <text x={bx + (tab === "text" ? 42 : 35)} y={232} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>
              {tok}
            </text>
          </g>
        );
      })}
      <text x={60} y={266} fontFamily={MONO} fontSize={12} fill={R.plan}>
        {tab === "text" ? "words (same vocabulary)" : "action integers (same vocabulary)"}
      </text>

      {/* action-tab outcome: the arm reaches the dinosaur */}
      {tab === "action" && (
        <g>
          <line x1={130} y1={390} x2={640} y2={390} stroke={R.line} strokeWidth={2} />
          {/* a toy dinosaur target */}
          <circle cx={560} cy={360} r={20} fill={done ? R.fillGreen : "#eeeeec"} stroke={done ? R.goal : R.world} strokeWidth={3} />
          <text x={560} y={366} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>
            🦕
          </text>
          <text x={560} y={410} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={done ? R.goal : R.world}>
            {done ? "grasped ✓" : "toy dinosaur"}
          </text>
          {/* arm */}
          <line x1={210} y1={390} x2={done ? 540 : 320} y2={done ? 360 : 330} stroke={R.signal} strokeWidth={9} strokeLinecap="round" />
          <circle cx={210} cy={390} r={8} fill={R.ink} />
        </g>
      )}
      {tab === "text" && (
        <text x={40} y={330} fontFamily={MONO} fontSize={14} fill={R.goal} fontWeight={600}>
          {done ? '→ "dinosaur"' : "…"}
        </text>
      )}

      {reduced && (
        <text x={40} y={424} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: the full token stream and outcome are shown; tabs still switch.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 9.4 · Positive transfer across embodiments  (toggle-compare)
// Three robots each with a success bar; a "solo vs pooled" toggle raises every
// bar under pooling and fades in transfer arrows between the robots.
// ===========================================================================

type Emb = "franka" | "widowx" | "mobile";
const EMB: { id: Emb; label: string; x: number; solo: number; pooled: number }[] = [
  { id: "franka", label: "Franka arm", x: 175, solo: 0.42, pooled: 0.63 },
  { id: "widowx", label: "WidowX", x: 360, solo: 0.38, pooled: 0.58 },
  { id: "mobile", label: "mobile manip.", x: 545, solo: 0.34, pooled: 0.55 },
];

export function RbPositiveTransfer() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [pooled, setPooled] = useState(true);
  const [focus, setFocus] = useState<Emb | "all">("all");
  const [h, setH] = useState<Record<Emb, number>>({ franka: 0.42, widowx: 0.38, mobile: 0.34 });

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

  const baseY = 360;
  const maxH = 220;

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.4 · Positive transfer across embodiments"
      ariaLabel={`Three robot success bars, ${pooled ? "trained on pooled OXE data" : "trained solo"}`}
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
      {/* readout lane */}
      <text x={40} y={40} fontFamily={MONO} fontSize={14} fill={R.ink}>
        {pooled ? "trained on pooled multi-robot data" : "each trained solo on its own data"}
      </text>

      {/* transfer arrows (only when pooled) */}
      {pooled &&
        EMB.map((e) =>
          EMB.filter((o) => o.id !== e.id && (focus === "all" || focus === e.id)).map((o) => (
            <g key={`${e.id}-${o.id}`} opacity={0.5}>
              {svgArrow(o.x, 90, e.x, 90, R.plan, 2, 7)}
            </g>
          )),
        )}
      {pooled && (
        <text x={360} y={78} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
          data flows between bodies
        </text>
      )}

      {/* bars */}
      {EMB.map((e) => {
        const v = val(e.id);
        const dim = focus !== "all" && focus !== e.id;
        const bh = v * maxH;
        return (
          <g key={e.id} opacity={dim ? 0.3 : 1}>
            <rect x={e.x - 34} y={baseY - maxH} width={68} height={maxH} rx={4} fill="#f2f2ef" />
            <rect x={e.x - 34} y={baseY - bh} width={68} height={bh} rx={4} fill={pooled ? R.fillGreen : R.fillBlue} stroke={pooled ? R.goal : R.signal} strokeWidth={2} />
            <text x={e.x} y={baseY - bh - 8} textAnchor="middle" fontFamily={MONO} fontSize={14} fontWeight={600} fill={pooled ? R.goal : R.signal}>
              {Math.round(v * 100)}%
            </text>
            <text x={e.x} y={baseY + 20} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
              {e.label}
            </text>
          </g>
        );
      })}
      <line x1={110} y1={baseY} x2={620} y2={baseY} stroke={R.line} strokeWidth={2} />

      <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={pooled ? R.goal : R.world}>
        {pooled ? "positive transfer, and RT-2-X showed ~3× on emergent skills" : "data siloed on each robot"}
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

  const mug = { x: 360, y: 250 };

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.5 · OpenVLA's dual vision encoder"
      ariaLabel={`One image through the ${tab} encoder path`}
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
      {/* the raw mug (grey structure) */}
      <ellipse cx={mug.x} cy={mug.y + 26} rx={44} ry={14} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <rect x={mug.x - 40} y={mug.y - 30} width={80} height={60} rx={8} fill="#f2f2ef" stroke={R.world} strokeWidth={2.5} />
      {/* handle */}
      <path d={`M ${mug.x + 40} ${mug.y - 14} q 34 4 34 30 q 0 26 -34 30`} fill="none" stroke={R.world} strokeWidth={7} />
      <text x={mug.x} y={mug.y + 66} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        raw image
      </text>

      {/* SigLIP semantic blob (amber, whole object) */}
      {(tab === "siglip" || tab === "both") && (
        <ellipse cx={mug.x} cy={mug.y} rx={64} ry={54} fill={R.fillAmber} opacity={0.4 + pulse * 0.15} stroke={R.plan} strokeWidth={2} />
      )}
      {/* DINOv2 geometric heat on handle/rim (blue, precise parts) */}
      {(tab === "dino" || tab === "both") && (
        <>
          <circle cx={mug.x + 62} cy={mug.y + 16} r={14} fill={R.fillBlue} opacity={0.5 + pulse * 0.2} stroke={R.signal} strokeWidth={2} />
          <line x1={mug.x - 40} y1={mug.y - 30} x2={mug.x + 40} y2={mug.y - 30} stroke={R.signal} strokeWidth={3} opacity={0.7} />
        </>
      )}

      {/* labels + blind spots (fixed lanes) */}
      <text x={40} y={44} fontFamily={MONO} fontSize={14} fill={R.plan}>
        SigLIP, semantics: what it is
      </text>
      <text x={40} y={410} fontFamily={MONO} fontSize={14} fill={R.signal}>
        DINOv2, geometry: where its parts are
      </text>

      {tab === "siglip" && (
        <text x={470} y={110} fontFamily={MONO} fontSize={13} fill={R.error}>
          knows &quot;mug&quot;, handle vague
        </text>
      )}
      {tab === "dino" && (
        <text x={470} y={110} fontFamily={MONO} fontSize={13} fill={R.error}>
          nails geometry, no meaning
        </text>
      )}
      {(tab === "both" || reduced) && (
        <>
          <circle cx={mug.x + 62} cy={mug.y + 16} r={9} fill={R.goal} />
          <text x={mug.x + 62} y={mug.y + 68} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal} fontWeight={600}>
            grasp point ✓
          </text>
          <text x={470} y={110} fontFamily={MONO} fontSize={13} fill={R.goal}>
            what + where = confident grasp
          </text>
        </>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 9.6 · Why diffusion actions handle ambiguity  (toggle-compare)
// A cup with two valid grasps. Regression lands in the dead middle and misses;
// diffusion commits to one side (resample re-rolls left/right).
// ===========================================================================

export function RbDiffusionAmbiguity() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [tab, setTab] = useState<"regression" | "diffusion">("diffusion");
  const [seed, setSeed] = useState(3);
  const [prog, setProg] = useState(1); // 0..1 denoising progress

  useRafLoop(
    (dt) => setProg((p) => (p >= 1 ? 1 : Math.min(1, p + dt * 0.8))),
    { playing: inView && !reduced && tab === "diffusion" && prog < 1 },
  );

  const rng = mulberry32(seed);
  const goLeft = rng() < 0.5;
  const cup = { x: 360, y: 250 };
  const leftG = { x: cup.x - 70, y: cup.y };
  const rightG = { x: cup.x + 70, y: cup.y };
  const mid = { x: cup.x, y: cup.y };

  const p = reduced ? 1 : prog;
  const committed = goLeft ? leftG : rightG;
  const cx = tab === "diffusion" ? lerp(mid.x, committed.x, smooth(p)) : mid.x;

  const resample = () => {
    setSeed((s) => s + 1);
    setProg(0);
  };

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.6 · Why diffusion actions handle ambiguity"
      ariaLabel={`A cup with two valid grasps; the ${tab} head ${tab === "regression" ? "lands in the useless middle" : "commits to one side"}`}
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
      {/* the cup */}
      <ellipse cx={cup.x} cy={cup.y + 30} rx={40} ry={12} fill="#eeeeec" stroke={R.world} strokeWidth={2} />
      <rect x={cup.x - 36} y={cup.y - 26} width={72} height={56} rx={8} fill="#f2f2ef" stroke={R.world} strokeWidth={2.5} />
      <text x={cup.x} y={cup.y + 62} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        cup, two valid grasps
      </text>

      {/* the two valid approaches (green, faint) */}
      {[leftG, rightG].map((g, i) => (
        <g key={i} opacity={0.5}>
          <circle cx={g.x} cy={g.y} r={12} fill="none" stroke={R.goal} strokeWidth={2} strokeDasharray="4 4" />
        </g>
      ))}

      {/* diffusion noise cloud while denoising */}
      {tab === "diffusion" && p < 1 && !reduced && (
        <g>
          {Array.from({ length: 14 }).map((_, i) => {
            const r = mulberry32(seed * 31 + i);
            const spread = (1 - p) * 80;
            return (
              <circle
                key={i}
                cx={cx + (r() - 0.5) * spread}
                cy={cup.y + (r() - 0.5) * spread}
                r={4}
                fill={R.signal}
                opacity={0.4}
              />
            );
          })}
        </g>
      )}

      {/* the committed / averaged action */}
      {tab === "regression" ? (
        <>
          <circle cx={mid.x} cy={mid.y} r={13} fill={R.fillRed} stroke={R.error} strokeWidth={3} />
          <text x={mid.x} y={mid.y - 24} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.error} fontWeight={600}>
            average, misses
          </text>
        </>
      ) : (
        <>
          <circle cx={cx} cy={cup.y} r={13} fill={p >= 1 ? R.fillAmber : R.fillBlue} stroke={p >= 1 ? R.plan : R.signal} strokeWidth={3} />
          {p >= 1 && (
            <text x={cx} y={cup.y - 24} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal} fontWeight={600}>
              committed ✓
            </text>
          )}
        </>
      )}

      {/* readout lane, bottom */}
      <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={tab === "regression" ? R.error : R.goal}>
        {tab === "regression"
          ? "one output smears into the dead middle between two modes"
          : reduced
            ? "Reduced motion: a committed grasp is shown; resample re-rolls the side."
            : "denoises to one valid mode, resample picks a different valid side"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.7 · Three ways to represent an action  (toggle-compare)
// The same 7-DoF chunk three ways: binning (long strip, coarse), FAST (short
// strip, smooth), flow (no tokens, smooth). A frequency slider explodes the
// binning count while FAST/flow stay compact.
// ===========================================================================

type RepTab = "binning" | "fast" | "flow";

export function RbThreeReps() {
  const { ref } = useStageVisibility();
  const [tab, setTab] = useState<RepTab>("binning");
  const [freq, setFreq] = useState(10); // control frequency (Hz)

  const binTokens = Math.round(freq * 5.2); // grows with frequency
  const fastTokens = 6;
  const tokenCount = tab === "binning" ? binTokens : tab === "fast" ? fastTokens : 0;
  const fidelity = tab === "binning" ? 0.62 : tab === "fast" ? 0.95 : 0.98;
  const overflow = tab === "binning" && binTokens > 60;

  // sample a smooth wiggle for the reconstruction curve (deterministic shape)
  const pts = Array.from({ length: 40 }, (_, i) => {
    const x = 60 + (i / 39) * 600;
    const base = 300 + Math.sin(i * 0.35) * 34 + Math.sin(i * 0.11) * 20;
    return { x, y: base };
  });
  const recon = pts.map((pt) => {
    if (tab === "binning") {
      // staircase: quantize to coarse steps
      const step = 24;
      return { x: pt.x, y: Math.round(pt.y / step) * step };
    }
    return pt; // smooth for FAST/flow
  });
  const path = (arr: { x: number; y: number }[], stair: boolean) =>
    arr
      .map((pt, i) => {
        if (i === 0) return `M ${pt.x} ${pt.y}`;
        if (stair) return `H ${pt.x} V ${pt.y}`;
        return `L ${pt.x} ${pt.y}`;
      })
      .join(" ");

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.7 · Three ways to represent an action"
      ariaLabel={`The same action chunk as ${tab}; token count ${tokenCount}, fidelity ${Math.round(fidelity * 100)} percent`}
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
      {/* readout lane, top */}
      <text x={60} y={40} fontFamily={MONO} fontSize={14} fill={R.plan}>
        tokens: {tab === "flow" ? "0 (generated)" : tokenCount}
        {overflow ? " ⚠ overflow" : ""}
      </text>
      <text x={430} y={40} fontFamily={MONO} fontSize={14} fill={fidelity > 0.9 ? R.goal : R.error}>
        fidelity: {Math.round(fidelity * 100)}%
      </text>

      {/* token strip */}
      <text x={60} y={90} fontFamily={MONO} fontSize={12} fill={R.world}>
        token representation
      </text>
      {tab === "flow" ? (
        <g>
          <rect x={60} y={100} width={130} height={30} rx={7} fill={R.fillGreen} stroke={R.goal} strokeWidth={2} />
          <text x={125} y={120} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.ink}>
            generate step
          </text>
        </g>
      ) : (
        Array.from({ length: Math.min(tokenCount, 40) }).map((_, i) => {
          const bx = 60 + i * 15;
          const red = overflow && bx > 620;
          return <rect key={i} x={bx} y={100} width={12} height={30} rx={3} fill={red ? R.fillRed : R.fillAmber} stroke={red ? R.error : R.plan} strokeWidth={1.5} />;
        })
      )}
      {overflow && (
        <text x={640} y={122} textAnchor="end" fontFamily={MONO} fontSize={12} fill={R.error}>
          … off the edge
        </text>
      )}

      {/* reconstruction curve */}
      <text x={60} y={170} fontFamily={MONO} fontSize={12} fill={R.world}>
        reconstruction
      </text>
      <path d={path(pts, false)} fill="none" stroke={R.signal} strokeWidth={2} opacity={0.5} strokeDasharray="4 4" />
      <path d={path(recon, tab === "binning")} fill="none" stroke={fidelity > 0.9 ? R.goal : R.error} strokeWidth={2.5} />
      <text x={60} y={392} fontFamily={MONO} fontSize={12} fill={R.signal} opacity={0.7}>
       , true trajectory (dashed)
      </text>

      <text x={60} y={414} fontFamily={MONO} fontSize={13} fill={R.world}>
        {tab === "binning"
          ? "raise frequency → the token strip explodes; staircase rounds off motion"
          : tab === "fast"
            ? "FAST compresses first, few tokens, smooth curve, frequency barely matters"
            : "flow generates directly, no tokens, smooth, but pays a sampling step"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.8 · FAST tokenization: compress, drop, reconstruct  (stepper)
// Four stages: raw trajectory → DCT spectrum → drop high-freq → reconstruct.
// A drop-threshold slider zeros more coefficients (fewer tokens, red error).
// ===========================================================================

const FAST_STAGES = ["raw trajectory", "DCT spectrum", "drop high-freq", "reconstruct"];

export function RbFastTokenize() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [stage, setStage] = useState(reduced ? 3 : 0);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [drop, setDrop] = useState(8); // keep this many coefficients
  const [, setT] = useState(0); // stage-advance timer (value unused for render)

  useRafLoop(
    (dt) => {
      setT((tt) => {
        const nt = tt + dt;
        if (nt > 1.4) {
          setStage((s) => (s + 1) % 4);
          return 0;
        }
        return nt;
      });
    },
    { playing: playing && inView && !reduced },
  );

  // 16 DCT-style coefficients, big at low freq
  const coeffs = Array.from({ length: 16 }, (_, i) => Math.exp(-i * 0.42) * 90 + (i < 3 ? 20 : 0));
  const kept = Math.round(drop);
  const rawTokens = 52;
  const outTokens = Math.max(3, Math.round(kept * 0.8));
  const err = Math.max(0, (14 - kept) / 14); // reconstruction error grows as we drop more

  // reconstruction curves
  const xs = Array.from({ length: 44 }, (_, i) => 60 + (i / 43) * 600);
  const trueY = (i: number) => 300 + Math.sin(i * 0.4) * 40 + Math.sin(i * 0.13) * 22;
  const reconY = (i: number) => 300 + Math.sin(i * 0.4) * 40 * (kept > 4 ? 1 : 0.7) + Math.sin(i * 0.13) * 22 * (kept > 8 ? 1 : 0.3);
  const line = (fy: (i: number) => number) =>
    xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${fy(i)}`).join(" ");

  const step = (d: number) => setStage((s) => clamp(s + d, 0, 3));

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.8 · FAST tokenization: compress, drop, reconstruct"
      ariaLabel={`FAST stage ${stage + 1} of 4: ${FAST_STAGES[stage]}`}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => step(-1)}>◂ back</Btn>
          <Btn onClick={() => step(1)}>step ▸</Btn>
          <Slider label="keep coeffs" min={2} max={14} step={1} value={drop} onChange={setDrop} fmt={(v) => `${v}`} />
        </>
      }
    >
      {/* stage caption lane */}
      <text x={60} y={40} fontFamily={MONO} fontSize={14} fill={R.ink}>
        stage {stage + 1}/4:
      </text>
      <text x={180} y={40} fontFamily={MONO} fontSize={14} fill={R.plan} fontWeight={600}>
        {FAST_STAGES[stage]}
      </text>
      <text x={470} y={40} fontFamily={MONO} fontSize={14} fill={R.goal}>
        {rawTokens} raw → {outTokens} tokens
      </text>

      {/* stage 1: raw trajectory */}
      {(stage === 0 || reduced) && (
        <path d={line(trueY)} fill="none" stroke={R.signal} strokeWidth={2.5} />
      )}

      {/* stage 2 + 3: DCT bars */}
      {(stage === 1 || stage === 2 || (reduced && false)) && (
        <g>
          {coeffs.map((c, i) => {
            const bx = 70 + i * 38;
            const dropped = stage === 2 && i >= kept;
            return (
              <g key={i}>
                <rect x={bx} y={360 - c} width={26} height={c} rx={3} fill={dropped ? "#e2e2df" : R.fillAmber} stroke={dropped ? R.world : R.plan} strokeWidth={1.5} />
                {dropped && <line x1={bx} y1={360 - c} x2={bx + 26} y2={360} stroke={R.error} strokeWidth={1.5} />}
              </g>
            );
          })}
          <line x1={60} y1={360} x2={670} y2={360} stroke={R.line} strokeWidth={2} />
          <text x={70} y={382} fontFamily={MONO} fontSize={12} fill={R.world}>
            low freq
          </text>
          <text x={640} y={382} textAnchor="end" fontFamily={MONO} fontSize={12} fill={R.world}>
            high freq {stage === 2 ? "(dropped)" : ""}
          </text>
        </g>
      )}

      {/* stage 4: reconstruction overlay */}
      {(stage === 3 || reduced) && (
        <g>
          <path d={line(trueY)} fill="none" stroke={R.signal} strokeWidth={2} opacity={0.5} strokeDasharray="4 4" />
          <path d={line(reconY)} fill="none" stroke={err > 0.4 ? R.error : R.goal} strokeWidth={2.5} />
          <text x={60} y={392} fontFamily={MONO} fontSize={12} fill={err > 0.4 ? R.error : R.goal}>
            {err > 0.4 ? "over-dropped, visible error" : "reconstruction ≈ original"}
          </text>
        </g>
      )}

      {reduced && (
        <text x={60} y={414} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: final reconstruction shown; the slider still trades coeffs for error.
        </text>
      )}
    </Stage>
  );
}

// ===========================================================================
// Fig 9.9 · Flow matching an action chunk  (velocity field + integration)
// A noise sample is transported to a whole action chunk by following a learned
// velocity field dx/dτ = v_θ(x, τ). Flow learns near-straight paths, so a few
// Euler steps land on target; diffusion's curved field needs many, and too few
// steps miss. The right inset shows the chunk resolve from noise to motion.
// ===========================================================================

const FM_S: [number, number] = [140, 320]; // noise start
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
  const [p, setP] = useState(reduced ? 1 : 0);
  const [playing, toggle] = useReducer((pl) => !pl, true);

  useRafLoop(
    (dt) => setP((v) => (v >= 1 ? 0 : Math.min(1, v + dt * 0.3))),
    { playing: playing && inView && !reduced },
  );

  const prog = reduced ? 1 : p;
  const path = fmIntegrate(tab, steps);
  const drawn = Math.max(1, Math.round(prog * steps));
  const cur = path[Math.min(drawn, steps)];
  const landing = path[steps];
  const miss = Math.hypot(landing[0] - FM_T[0], landing[1] - FM_T[1]);
  const lands = miss < 26;

  // velocity-field arrows on a grid (direction of v at tau = prog)
  const field: { x: number; y: number; dx: number; dy: number }[] = [];
  for (let gx = 110; gx <= 450; gx += 60) {
    for (let gy = 95; gy <= 365; gy += 54) {
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
      field.push({ x: gx, y: gy, dx: (vx / m) * 15, dy: (vy / m) * 15 });
    }
  }

  // right inset: the action chunk (H waypoints) resolving noise -> smooth motion
  const H = 8;
  const rng = mulberry32(7);
  const noiseY = Array.from({ length: H }, () => (rng() - 0.5) * 70);
  const chunk = Array.from({ length: H }, (_, i) => {
    const smoothY = Math.sin((i / (H - 1)) * Math.PI) * 46;
    const y = lerp(noiseY[i], -smoothY, smooth(prog));
    return { x: 512 + (i / (H - 1)) * 168, y: 240 + y };
  });

  return (
    <Stage
      innerRef={ref}
      title={"Fig 9.9 · Flow matching an action chunk"}
      ariaLabel={"Transporting a noise sample to an action chunk by integrating a velocity field via " + tab}
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
      {/* readout lane */}
      <text x={40} y={34} fontFamily={MONO} fontSize={13} fill={R.world}>
        {"dx/dτ = v_θ(x, τ)     τ = " + prog.toFixed(2) + "     Euler step " + drawn + " / " + steps}
      </text>

      {/* velocity field */}
      {field.map((f, i) => (
        <g key={i} opacity={0.5}>
          {svgArrow(f.x, f.y, f.x + f.dx, f.y + f.dy, R.line, 1.4, 5)}
        </g>
      ))}

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

      {/* noise start, current sample + its velocity, target */}
      <circle cx={FM_S[0]} cy={FM_S[1]} r={7} fill="none" stroke={R.world} strokeWidth={2} />
      <text x={FM_S[0]} y={FM_S[1] + 26} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>noise x₀</text>
      <circle cx={cur[0]} cy={cur[1]} r={8} fill={tab === "flow" ? R.signal : R.plan} />
      <circle cx={FM_T[0]} cy={FM_T[1]} r={11} fill={R.fillGreen} stroke={R.goal} strokeWidth={3} />
      <text x={FM_T[0] + 18} y={FM_T[1] + 4} fontFamily={MONO} fontSize={12} fill={R.goal}>target chunk</text>

      {/* landing verdict */}
      <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={lands ? R.goal : R.error}>
        {tab === "flow"
          ? "flow: near-straight field, a handful of steps lands exactly"
          : lands
            ? "diffusion: enough steps to track the curve, lands"
            : "diffusion: too few steps for the curved field, Euler error misses"}
      </text>

      {/* divider + action-chunk inset */}
      <line x1={488} y1={60} x2={488} y2={360} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <text x={596} y={110} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>the sample IS an action chunk</text>
      <line x1={512} y1={240} x2={680} y2={240} stroke={R.line} strokeWidth={1} strokeDasharray="3 5" />
      <polyline points={chunk.map((c) => c.x + "," + c.y).join(" ")} fill="none" stroke={R.goal} strokeWidth={2.5} />
      {chunk.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill={R.goal} />
      ))}
      <text x={596} y={330} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        {prog < 0.5 ? "noise" : "→ smooth H-step motion"}
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
      {/* goal lane */}
      <text x={40} y={40} fontFamily={MONO} fontSize={14} fill={R.ink}>
        goal: &quot;clean up&quot; the bedroom
      </text>
      <text x={470} y={40} fontFamily={MONO} fontSize={14} fill={ood > 50 ? R.goal : R.error} fontWeight={600}>
        OOD success {ood}%
      </text>

      {/* plan lane (top) */}
      <text x={40} y={96} fontFamily={MONO} fontSize={12} fill={R.world}>
        plan (language)
      </text>
      {showPlan ? (
        <g>
          <rect x={200} y={78} width={340} height={34} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.5} />
          <text x={370} y={100} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.ink}>
            subtask: &quot;{H_SUBTASKS[idx]}&quot;
          </text>
        </g>
      ) : (
        <g>
          <rect x={200} y={78} width={340} height={34} rx={8} fill="none" stroke={R.error} strokeWidth={2} strokeDasharray="5 5" />
          <text x={370} y={100} textAnchor="middle" fontFamily={MONO} fontSize={13} fill={R.error}>
            no plan, direct scene→action
          </text>
        </g>
      )}
      {showPlan && svgArrow(370, 116, 370, 160, R.line, 2.5, 8)}

      {/* execution lane (bottom) */}
      <text x={40} y={200} fontFamily={MONO} fontSize={12} fill={R.world}>
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

      <text x={40} y={414} fontFamily={MONO} fontSize={13} fill={showPlan ? R.goal : R.error}>
        {showPlan
          ? "think in language, act in flow, 94% out-of-distribution with diverse co-training"
          : "31% without multi-environment data, diversity is the whole trick"}
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
  const [stage, setStage] = useState(reduced ? 6 : 0);
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

  const red = { x: 300, y: 300 };
  const blue = { x: 500, y: 300 };
  const target = targetBlue ? blue : red;
  const gripper = { x: 200, y: 180 };
  const step = (d: number) => setStage((s) => clamp(s + d, 0, 6));

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.11 · An embodied chain of thought"
      ariaLabel={`ECoT ladder stage ${stage + 1}: ${ECOT_STAGES[stage]}, target ${targetBlue ? "blue" : "red"} block`}
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
      {/* ladder on the left (fixed lane) */}
      {ECOT_STAGES.map((s, i) => {
        const on = i <= stage;
        const cur = i === stage;
        return (
          <g key={s} opacity={on ? 1 : 0.25}>
            <rect x={40} y={70 + i * 44} width={26} height={26} rx={5} fill={cur ? R.fillAmber : on ? "#f2f2ef" : "var(--background)"} stroke={cur ? R.plan : R.world} strokeWidth={cur ? 2.5 : 1.5} />
            <text x={80} y={88 + i * 44} fontFamily={MONO} fontSize={13} fontWeight={cur ? 600 : 400} fill={i >= 4 ? R.signal : R.plan}>
              {s}
            </text>
            <text x={185} y={88 + i * 44} fontFamily={MONO} fontSize={12} fill={R.world}>
              {ECOT_TEXT[i]}
            </text>
          </g>
        );
      })}

      {/* the scene, right side */}
      <line x1={400} y1={40} x2={400} y2={410} stroke={R.line} strokeWidth={1.5} strokeDasharray="4 6" />
      <line x1={430} y1={340} x2={680} y2={340} stroke={R.line} strokeWidth={2} />
      {/* two blocks */}
      <rect x={red.x - 20} y={red.y - 20} width={40} height={40} rx={5} fill={R.fillRed} stroke={R.error} strokeWidth={2.5} />
      <rect x={blue.x - 20} y={blue.y - 20} width={40} height={40} rx={5} fill={R.fillBlue} stroke={R.signal} strokeWidth={2.5} />
      <text x={red.x} y={red.y + 40} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        red
      </text>
      <text x={blue.x} y={blue.y + 40} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        blue
      </text>

      {/* GRIPPER pixel marker at stage >= 4 */}
      {stage >= 4 && (
        <>
          <circle cx={gripper.x + 250} cy={gripper.y} r={9} fill="none" stroke={R.signal} strokeWidth={2.5} />
          <line x1={gripper.x + 244} y1={gripper.y} x2={gripper.x + 256} y2={gripper.y} stroke={R.signal} strokeWidth={2} />
          <line x1={gripper.x + 250} y1={gripper.y - 6} x2={gripper.x + 250} y2={gripper.y + 6} stroke={R.signal} strokeWidth={2} />
          <text x={gripper.x + 250} y={gripper.y - 16} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
            gripper px
          </text>
        </>
      )}

      {/* OBJECT bounding box at stage >= 5 */}
      {stage >= 5 && (
        <rect x={target.x - 26} y={target.y - 26} width={52} height={52} rx={4} fill="none" stroke={targetBlue ? R.signal : R.error} strokeWidth={2.5} strokeDasharray="5 4" />
      )}

      {/* ACTION arrow at stage 6 */}
      {stage >= 6 &&
        svgArrow(gripper.x + 250, gripper.y, target.x, target.y - 26, R.goal, 3, 10)}

      <text x={430} y={400} fontFamily={MONO} fontSize={13} fill={R.error}>
        {stage >= 5 ? `grounded on the ${targetBlue ? "blue" : "red"} block, editable` : "reasoning escalates to pixels…"}
      </text>
    </Stage>
  );
}

// ===========================================================================
// Fig 9.12 · MolmoAct reasons in 3D, then plans a path  (stepper)
// Three stages: VQVAE depth tokens → waypoint plan → action along it. A
// "sketch correction" mode drags a waypoint and re-routes the executed motion.
// ===========================================================================

const M_WAYPOINTS = [
  { x: 250, y: 300 },
  { x: 360, y: 180 },
  { x: 470, y: 210 },
  { x: 580, y: 300 },
];

export function RbMolmoAct3D() {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useStageVisibility();
  const [stage, setStage] = useState(reduced ? 2 : 0);
  const [playing, toggle] = useReducer((p) => !p, true);
  const [wps, setWps] = useState(M_WAYPOINTS);
  const [drag, setDrag] = useState<number | null>(null);
  const [t, setT] = useState(0);

  useRafLoop(
    (dt) => {
      setT((tt) => {
        const nt = tt + dt;
        if (nt > 1.5) {
          setStage((s) => (s + 1) % 3);
          return 0;
        }
        return nt;
      });
    },
    { playing: playing && inView && !reduced && drag === null },
  );

  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (drag === null) return;
    const [x, y] = svgPoint(e);
    setWps((w) => w.map((p, i) => (i === drag ? { x: clamp(x, 210, 620), y: clamp(y, 90, 320) } : p)));
  };

  const armP = reduced ? 1 : smooth(clamp(t / 1.5, 0, 1));
  const pathD = wps.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  // arm position along the waypoint path
  const segF = armP * (wps.length - 1);
  const si = Math.min(wps.length - 2, Math.floor(segF));
  const sf = segF - si;
  const armPos = { x: lerp(wps[si].x, wps[si + 1].x, sf), y: lerp(wps[si].y, wps[si + 1].y, sf) };
  const step = (d: number) => setStage((s) => clamp(s + d, 0, 2));

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.12 · MolmoAct reasons in 3D, then plans a path"
      ariaLabel={`MolmoAct stage ${stage + 1} of 3: ${["depth tokens", "waypoint plan", "action"][stage]}`}
      svgProps={{
        onPointerMove: onMove,
        onPointerUp: () => setDrag(null),
        onPointerLeave: () => setDrag(null),
      }}
      controls={
        <>
          <Btn onClick={toggle} active={playing}>
            {playing ? "⏸ pause" : "▶ play"}
          </Btn>
          <Btn onClick={() => step(-1)}>◂ back</Btn>
          <Btn onClick={() => step(1)}>step ▸</Btn>
          <Btn onClick={() => setWps(M_WAYPOINTS)}>↺ reset path</Btn>
          <span className="font-mono text-[13px] text-[var(--muted)]">drag a waypoint to correct</span>
        </>
      }
    >
      {/* stage caption */}
      <text x={40} y={40} fontFamily={MONO} fontSize={14} fill={R.ink}>
        stage {stage + 1}/3:
      </text>
      <text x={160} y={40} fontFamily={MONO} fontSize={14} fill={R.plan} fontWeight={600}>
        {["encode depth-aware perception tokens", "plan a waypoint path", "decode action along the path"][stage]}
      </text>

      {/* stage 1: depth-aware perception tokens (blue grid) */}
      {stage >= 0 && (
        <g opacity={stage === 0 ? 1 : 0.35}>
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 10 }).map((_, c) => {
              const depth = ((r + c) % 5) / 5;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={210 + c * 46}
                  y={90 + r * 40}
                  width={44}
                  height={38}
                  fill={R.fillBlue}
                  opacity={0.15 + depth * 0.4}
                  stroke={R.signal}
                  strokeWidth={0.5}
                />
              );
            }),
          )}
          {stage === 0 && (
            <text x={430} y={360} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.signal}>
              depth-aware perception tokens (VQVAE)
            </text>
          )}
        </g>
      )}

      {/* obstacle */}
      <rect x={400} y={250} width={40} height={70} rx={4} fill="#e2e2df" stroke={R.world} strokeWidth={2} />
      <text x={420} y={340} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.world}>
        obstacle
      </text>

      {/* stage 2+3: waypoint path */}
      {stage >= 1 && (
        <>
          <path d={pathD} fill="none" stroke={R.plan} strokeWidth={2.5} strokeDasharray="6 5" />
          {wps.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={10}
              fill={drag === i ? R.fillRed : R.fillAmber}
              stroke={drag === i ? R.error : R.plan}
              strokeWidth={2.5}
              style={{ cursor: "grab" }}
              onPointerDown={(e) => {
                e.preventDefault();
                setDrag(i);
              }}
            />
          ))}
          {stage === 1 && (
            <text x={430} y={360} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.plan}>
              waypoint plan (image space)
            </text>
          )}
        </>
      )}

      {/* stage 3: action follows the path */}
      {(stage >= 2 || reduced) && (
        <>
          <circle cx={armPos.x} cy={armPos.y} r={11} fill={armP >= 1 ? R.fillGreen : R.fillBlue} stroke={armP >= 1 ? R.goal : R.signal} strokeWidth={3} />
          <text x={430} y={360} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={R.goal}>
            {armP >= 1 ? "action followed the (corrected) path ✓" : "decoding action along waypoints…"}
          </text>
        </>
      )}

      <text x={40} y={410} fontFamily={MONO} fontSize={13} fill={R.world}>
        {reduced
          ? "Reduced motion: the 3D path and final action shown; drag a waypoint to steer."
          : "3D between seeing and acting, the drawn path is steerable"}
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
  const cx = 560;
  const cy = 250;

  return (
    <Stage
      innerRef={ref}
      title="Fig 9.13 · Dual-system control: slow brain, fast reflex"
      ariaLabel={`System 2 at ${s2Rate} Hz over System 1 at ${s1Rate} Hz; ${balanced ? "balanced" : "falling"}`}
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
      {/* readout lane */}
      <text x={40} y={40} fontFamily={MONO} fontSize={14} fill={R.plan}>
        System 2 (VLM) {s2Rate} Hz
      </text>
      <text x={280} y={40} fontFamily={MONO} fontSize={14} fill={R.signal}>
        System 1 (flow) {s1Rate} Hz
      </text>
      <text x={560} y={40} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={balanced && !stale ? R.goal : R.error} fontWeight={600}>
        {!balanced ? "falling" : stale ? "stale plan" : "balanced"}
      </text>

      {/* System 2 lane (slow) */}
      <rect x={40} y={90} width={200} height={44} rx={8} fill={R.fillAmber} stroke={R.plan} strokeWidth={2.5} opacity={st.s2acc < 0.25 ? 1 : 0.6} />
      <text x={140} y={110} textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={R.ink}>
        plan (semantic)
      </text>
      <text x={140} y={126} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={stale ? R.error : R.world}>
        {stale ? "stale, replan too rare" : `fresh, age ${st.planAge.toFixed(1)}s`}
      </text>

      {/* System 1 lane (fast stream of commands) */}
      <text x={40} y={200} fontFamily={MONO} fontSize={12} fill={R.world}>
        motor stream
      </text>
      {Array.from({ length: 10 }).map((_, i) => {
        const on = !reduced && (st.s1Tick + i) % 10 < (s1Rate / 120) * 10 + 1;
        return (
          <rect
            key={i}
            x={40 + i * 26}
            y={216}
            width={18}
            height={26}
            rx={3}
            fill={on ? R.fillBlue : "#f2f2ef"}
            stroke={on ? R.signal : R.line}
            strokeWidth={on ? 2 : 1}
          />
        );
      })}
      {svgArrow(140, 138, 140, 208, R.line, 2.5, 8)}

      {/* rate ratio */}
      <text x={40} y={280} fontFamily={MONO} fontSize={13} fill={R.world}>
        tick ratio ≈ {Math.max(1, Math.round(s1Rate / s2Rate))}:1
      </text>

      {/* the humanoid on the right */}
      <line x1={470} y1={370} x2={660} y2={370} stroke={R.line} strokeWidth={2} />
      <g stroke={balanced ? R.signal : R.error} strokeWidth={8} strokeLinecap="round" fill="none" transform={`translate(${sway} 0)`}>
        <circle cx={cx} cy={cy - 40} r={16} fill={balanced ? R.fillBlue : R.fillRed} />
        <line x1={cx} y1={cy - 24} x2={cx} y2={cy + 50} />
        <line x1={cx} y1={cy} x2={cx - 30} y2={cy + 34} />
        <line x1={cx} y1={cy} x2={cx + 30} y2={cy + 34} />
        <line x1={cx} y1={cy + 50} x2={cx - 22} y2={370} />
        <line x1={cx} y1={cy + 50} x2={cx + 22} y2={370} />
      </g>
      <text x={cx} y={396} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={balanced ? R.goal : R.error}>
        {balanced ? "upright" : "wobbling, reflex too slow"}
      </text>

      {reduced && (
        <text x={40} y={414} fontFamily={MONO} fontSize={13} fill={R.world}>
          Reduced motion: a balanced humanoid is shown; the rate sliders still drive the outcome.
        </text>
      )}
    </Stage>
  );
}
